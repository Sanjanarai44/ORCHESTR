from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, UploadFile, File, WebSocket, WebSocketDisconnect
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import json
import csv
import io
import math
import sqlite3
from jose import jwt, JWTError
from src.core.database import get_db
from src.core.config import JWT_SECRET, JWT_ALGORITHM, FRONTEND_URL, JWT_EXPIRY_HOURS
from src.core.security import get_judge_from_cookie, build_magic_link, verify_judge_token, generate_judge_token
from src.core.websocket import ws_manager
from src.schemas.common import *
from src.api.routers.evaluations import call_llm

router = APIRouter()
@router.get("/api/admin/anomaly-flags")
def get_anomaly_flags(status_filter: Optional[str] = None):
    conn = get_db()
    if status_filter and status_filter in ("PENDING", "RESOLVED"):
        rows = conn.execute("SELECT * FROM anomaly_flags WHERE status=? ORDER BY created_at DESC",
                            (status_filter,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM anomaly_flags ORDER BY created_at DESC").fetchall()

    flags = []
    for r in rows:
        team = conn.execute("SELECT name FROM teams WHERE id=?", (r["team_id"],)).fetchone()
        judge = conn.execute("SELECT name FROM judges WHERE id=?", (r["judge_id"],)).fetchone()
        flags.append({
            "id": r["id"], "teamId": r["team_id"],
            "teamName": team["name"] if team else "Unknown",
            "judgeId": r["judge_id"],
            "judgeName": judge["name"] if judge else "Unknown",
            "newScore": r["new_score"], "panelAvg": r["panel_avg"],
            "deviation": r["deviation"], "llmExplanation": r["llm_explanation"],
            "status": r["status"], "resolution": r["resolution"],
            "createdAt": r["created_at"],
        })
    conn.close()
    return {"flags": flags}


@router.get("/api/admin/settings/anomaly-threshold")
def get_threshold():
    conn = get_db()
    row = conn.execute("SELECT value FROM event_settings WHERE key='anomaly_threshold'").fetchone()
    conn.close()
    return {"threshold": float(row["value"]) if row else 2.5}


@router.put("/api/admin/settings/anomaly-threshold")
def set_threshold(body: ThresholdBody):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO event_settings (key, value, updated_at) VALUES ('anomaly_threshold',?,datetime('now'))",
                 (str(body.threshold),))
    conn.commit()
    conn.close()
    return {"success": True, "threshold": body.threshold}


@router.get("/api/admin/judge-calibration-report")
def calibration_report():
    conn = get_db()
    judges = conn.execute("SELECT * FROM judges").fetchall()
    all_evals = conn.execute("SELECT score_code,score_innovation,score_presentation FROM evaluations WHERE discarded=0").fetchall()
    global_avg = (sum((r["score_code"]+r["score_innovation"]+r["score_presentation"])/3
                      for r in all_evals) / len(all_evals)) if all_evals else 5.0

    report = []
    for j in judges:
        evals = conn.execute(
            "SELECT score_code,score_innovation,score_presentation FROM evaluations WHERE judge_id=? AND discarded=0",
            (j["id"],)
        ).fetchall()
        if not evals:
            report.append({"id": j["id"], "name": j["name"], "email": j["email"],
                           "avg": None, "stdDev": None, "bias": "No data"})
            continue
        scores = [(r["score_code"]+r["score_innovation"]+r["score_presentation"])/3 for r in evals]
        avg = sum(scores)/len(scores)
        variance = sum((s-avg)**2 for s in scores)/len(scores)
        std_dev = math.sqrt(variance)
        bias = "Harsh" if avg < global_avg-1.5 else ("Lenient" if avg > global_avg+1.5 else "Neutral")
        report.append({"id": j["id"], "name": j["name"], "email": j["email"],
                       "avg": round(avg, 2), "stdDev": round(std_dev, 2), "bias": bias})
    conn.close()
    return {"globalAvg": round(global_avg, 2), "judges": report}


@router.get("/api/admin/judges")
def list_judges():
    conn = get_db()
    rows = conn.execute("SELECT * FROM judges ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"judges": [{"id": r["id"], "name": r["name"], "email": r["email"],
                        "tokenUsed": bool(r["token_used"]),
                        "assignedTeamsCount": len(json.loads(r["assigned_teams"] or "[]")),
                        "createdAt": r["created_at"]} for r in rows]}


@router.post("/api/admin/judges")
def create_judge(body: JudgeCreate):
    conn = get_db()
    if conn.execute("SELECT id FROM judges WHERE email=?", (body.email,)).fetchone():
        conn.close()
        raise HTTPException(409, f"Judge with email {body.email} already exists.")
    judge_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO judges (id, name, email, assigned_teams) VALUES (?,?,?,?)",
        (judge_id, body.name, body.email, json.dumps(body.assignedTeams))
    )
    conn.commit()
    conn.close()
    return {"success": True, "judgeId": judge_id}


@router.post("/api/admin/send-judge-links")
def send_judge_links():
    """Generate JWT tokens for all judges, generate AI email content, and push to BullMQ."""
    import subprocess
    import json
    
    conn = get_db()
    judges = conn.execute("SELECT * FROM judges").fetchall()
    if not judges:
        conn.close()
        raise HTTPException(404, "No judges found. Add judges first.")

    results = []
    for j in judges:
        token = generate_judge_token(j["id"])
        magic_link = build_magic_link(token)
        conn.execute("UPDATE judges SET jwt_token=?, token_used=0 WHERE id=?", (token, j["id"]))

        # 1. Generate AI email content
        try:
            prompt = f"Draft a welcome email for Judge {j['name']} to the AlgoRythm EventFlow hackathon. Include this magic link for them to access the portal: {magic_link}. Keep it under 100 words, enthusiastic and professional. Return it as HTML."
            fallback = f"<p>Hello {j['name']}, welcome to AlgoRythm. Access your portal here: <a href='{magic_link}'>{magic_link}</a></p>"
            html_body = call_llm(prompt, fallback)
            
            ai_content_id = str(uuid.uuid4())
            conn.execute(
                """INSERT INTO AiEmailContent (id, recipientId, emailType, subject, htmlBody)
                   VALUES (?,?,?,?,?)""",
                (ai_content_id, j["id"], "magic_link", "Your Judge Portal Access — AlgoRythm", html_body)
            )
        except Exception as e:
            print(f"[AI Draft Error] {e}")

        # 2. Log email as PENDING
        log_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO email_logs (id, recipient_id, recipient_email, recipient_name,
               email_type, status, job_id) VALUES (?,?,?,?,'magic_link','PENDING',?)""",
            (log_id, j["id"], j["email"], j["name"], log_id)
        )
        
        # 3. Push to BullMQ via node bridge
        job_payload = {
            "jobId": log_id,
            "recipientId": j["id"],
            "recipientEmail": j["email"],
            "recipientName": j["name"],
            "emailType": "magic_link",
            "templateData": {
                "judgeName": j["name"],
                "magicLink": magic_link,
                "expiryHours": 48
            }
        }
        
        try:
            subprocess.run(["node", "src/scripts/queue_job.js", json.dumps(job_payload)], check=True)
            print(f"[Real Email Send] Queued for {j['email']}")
        except Exception as e:
            print(f"[Real Email Send] Failed to queue for {j['email']}: {e}")
            conn.execute("UPDATE email_logs SET status='FAILED', error_message=? WHERE id=?", (str(e), log_id))

        results.append({"judgeId": j["id"], "email": j["email"], "magicLink": magic_link})

    conn.commit()
    conn.close()
    return {"success": True, "linksSent": len(results), "links": results}


@router.get("/api/admin/leaderboard")
def get_leaderboard():
    conn = get_db()
    teams = conn.execute("SELECT * FROM teams").fetchall()
    leaderboard = []
    for team in teams:
        evals = conn.execute(
            "SELECT score_code, score_innovation, score_presentation, override_score FROM evaluations WHERE team_id=? AND discarded=0",
            (team["id"],)
        ).fetchall()
        if not evals:
            avg = None
            judge_count = 0
        else:
            totals = []
            for e in evals:
                if e["override_score"] is not None:
                    totals.append(e["override_score"])
                else:
                    totals.append((e["score_code"]+e["score_innovation"]+e["score_presentation"])/3)
            avg = round(sum(totals)/len(totals), 2)
            judge_count = len(evals)
        leaderboard.append({
            "teamId": team["id"], "teamName": team["name"],
            "avgScore": avg, "judgeCount": judge_count,
            "resultsHeld": bool(team["results_held"])
        })
    conn.close()
    leaderboard.sort(key=lambda x: x["avgScore"] if x["avgScore"] is not None else -1, reverse=True)
    for i, row in enumerate(leaderboard):
        row["rank"] = i + 1
    return {"leaderboard": leaderboard}


@router.get("/api/admin/email-logs")
def get_email_logs(type: str = "all", status: str = "all", search: str = "", page: int = 1, limit: int = 20):
    conn = get_db()
    query = "SELECT * FROM email_logs WHERE 1=1"
    params = []
    if type != "all":
        query += " AND email_type=?"; params.append(type)
    if status != "all":
        query += " AND status=?"; params.append(status.upper())
    if search:
        query += " AND (recipient_email LIKE ? OR recipient_name LIKE ?)"; params += [f"%{search}%", f"%{search}%"]
    total = conn.execute(f"SELECT COUNT(*) FROM ({query})", params).fetchone()[0]
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params += [limit, (page-1)*limit]
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"total": total, "page": page, "limit": limit, "logs": [dict(r) for r in rows]}


@router.post("/api/admin/emails/{log_id}/retry")
def retry_email(log_id: str):
    conn = get_db()
    log = conn.execute("SELECT * FROM email_logs WHERE id=?", (log_id,)).fetchone()
    if not log:
        conn.close()
        raise HTTPException(404, "Log not found.")
    if log["status"] != "FAILED":
        conn.close()
        raise HTTPException(400, "Only FAILED emails can be retried.")
    new_job_id = str(uuid.uuid4())
    conn.execute("UPDATE email_logs SET status='PENDING', job_id=?, error_message=NULL WHERE id=?",
                 (new_job_id, log_id))
    conn.commit()
    conn.close()
    return {"success": True, "newJobId": new_job_id}


@router.get("/api/admin/teams")
def admin_get_teams():
    conn = get_db()
    teams = conn.execute("SELECT * FROM teams ORDER BY created_at DESC").fetchall()
    result = []
    for team in teams:
        members = conn.execute("SELECT * FROM team_members WHERE team_id=?", (team["id"],)).fetchall()
        result.append({**dict(team), "members": [dict(m) for m in members]})
    conn.close()
    return {"teams": result}


@router.post("/api/admin/teams")
def admin_create_team(body: TeamCreate):
    conn = get_db()
    team_id = str(uuid.uuid4())
    # Generate evaluation guide via LLM
    guide = call_llm(
        f"Generate a concise 2-sentence judging guide for evaluating a hackathon project called: {body.name}. "
        "Focus on code quality, innovation, and presentation.",
        "Evaluate code quality, innovation of the solution, and clarity of presentation."
    )
    conn.execute(
        "INSERT INTO teams (id, name, problem_statement, evaluation_guide) VALUES (?,?,?,?)",
        (team_id, body.name, body.problemStatement, guide)
    )
    conn.commit()
    conn.close()
    return {"success": True, "teamId": team_id, "evaluationGuide": guide}


@router.post("/api/admin/team-members")
def add_team_member(body: TeamMemberCreate):
    conn = get_db()
    member_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO team_members (id, team_id, name, email, skill, college) VALUES (?,?,?,?,?,?)",
        (member_id, body.teamId, body.name, body.email, body.skill, body.college)
    )
    conn.commit()
    conn.close()
    return {"success": True, "memberId": member_id}


@router.put("/api/admin/judges/{judge_id}/assign")
def assign_teams(judge_id: str, body: dict):
    conn = get_db()
    team_ids = body.get("teamIds", [])
    conn.execute("UPDATE judges SET assigned_teams=? WHERE id=?", (json.dumps(team_ids), judge_id))
    conn.commit()
    conn.close()
    return {"success": True}


@router.get("/api/admin/mentor-logs")
def mentor_logs():
    conn = get_db()
    teams = conn.execute("SELECT * FROM teams").fetchall()
    result = []
    for t in teams:
        msgs = conn.execute(
            "SELECT role, content, timestamp FROM mentor_conversations WHERE team_id=? ORDER BY timestamp ASC",
            (t["id"],)
        ).fetchall()
        result.append({
            "teamId": t["id"], "teamName": t["name"], "messageCount": len(msgs),
            "messages": [dict(m) for m in msgs]
        })
    conn.close()
    return {"teams": result}


@router.get("/api/admin/participants")
def get_participants():
    conn = get_db()
    teams = conn.execute("SELECT * FROM teams").fetchall()
    members = conn.execute("SELECT * FROM team_members").fetchall()
    conn.close()
    
    # Structure them
    participants_list = []
    for m in members:
        team = next((t for t in teams if t["id"] == m["team_id"]), None)
        participants_list.append({
            "id": m["id"],
            "name": m["name"],
            "email": m["email"],
            "skill": m["skill"],
            "college": m["college"],
            "team_id": m["team_id"],
            "team_name": team["name"] if team else "Unknown"
        })
    return {"participants": participants_list}


@router.post("/api/admin/upload-roster")
async def upload_roster(file: UploadFile = File(...)):
    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    # Make headers lower case and stripped
    if reader.fieldnames:
        reader.fieldnames = [str(f).strip().lower() for f in reader.fieldnames]
    
    conn = get_db()
    teams_created = 0
    members_added = 0
    
    for row in reader:
        team_name = row.get("team", "").strip()
        name = row.get("name", "").strip()
        email = row.get("email", "").strip()
        skill = row.get("skill", "").strip()
        college = row.get("college", "").strip()
        
        if not name:
            continue
        if not team_name:
            team_name = f"Team {name}"
            
        # Get or create team
        team = conn.execute("SELECT id FROM teams WHERE name = ?", (team_name,)).fetchone()
        if team:
            team_id = team["id"]
        else:
            team_id = str(uuid.uuid4())
            conn.execute("INSERT INTO teams (id, name) VALUES (?, ?)", (team_id, team_name))
            teams_created += 1
            
        # Insert member
        member_id = str(uuid.uuid4())
        conn.execute("INSERT INTO team_members (id, team_id, name, email, skill, college) VALUES (?, ?, ?, ?, ?, ?)",
                     (member_id, team_id, name, email, skill, college))
        members_added += 1
        
    conn.commit()
    conn.close()
    
    return {"success": True, "message": f"Added {members_added} participants and {teams_created} teams."}


@router.post("/api/admin/upload-judges")
async def upload_judges(file: UploadFile = File(...)):
    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    # Make headers lower case and stripped
    if reader.fieldnames:
        reader.fieldnames = [str(f).strip().lower() for f in reader.fieldnames]
    
    conn = get_db()
    judges_added = 0
    
    for row in reader:
        name = row.get("name", "").strip()
        email = row.get("email", "").strip()
        
        if not name or not email:
            continue
            
        # Check if exists
        existing = conn.execute("SELECT id FROM judges WHERE email = ?", (email,)).fetchone()
        if not existing:
            judge_id = str(uuid.uuid4())
            conn.execute("INSERT INTO judges (id, name, email) VALUES (?, ?, ?)", (judge_id, name, email))
            judges_added += 1
            
    conn.commit()
    conn.close()
    
    return {"success": True, "message": f"Added {judges_added} new judges."}


@router.post("/api/admin/assign-round-robin")
def assign_teams_round_robin():
    import json
    conn = get_db()
    judges = conn.execute("SELECT id FROM judges").fetchall()
    teams = conn.execute("SELECT id FROM teams").fetchall()
    
    if not judges or not teams:
        conn.close()
        raise HTTPException(400, "Need both judges and teams to assign.")
        
    # Reset assignments
    for j in judges:
        conn.execute("UPDATE judges SET assigned_teams = '[]' WHERE id = ?", (j["id"],))
        
    judge_assignments = {j["id"]: [] for j in judges}
    judge_ids = [j["id"] for j in judges]
    
    # Assign each team to exactly 3 judges, or however many we have if < 3
    judges_per_team = min(3, len(judges))
    
    judge_idx = 0
    for t in teams:
        for _ in range(judges_per_team):
            judge_assignments[judge_ids[judge_idx]].append(t["id"])
            judge_idx = (judge_idx + 1) % len(judges)
            
    # Save back
    for j_id, t_ids in judge_assignments.items():
        conn.execute("UPDATE judges SET assigned_teams = ? WHERE id = ?", (json.dumps(t_ids), j_id))
        
    conn.commit()
    conn.close()
    
    return {"success": True, "message": f"Assigned {len(teams)} teams to {len(judges)} judges."}


@router.post("/api/admin/send-team-links")
def send_team_links():
    import subprocess
    import json
    
    conn = get_db()
    members = conn.execute("SELECT * FROM team_members").fetchall()
    if not members:
        conn.close()
        raise HTTPException(404, "No participants found.")

    results = []
    for m in members:
        token = jwt.encode({
            "sub": m["id"],
            "participantId": m["id"],
            "type": "participant_magic_link",
            "exp": datetime.utcnow() + timedelta(hours=24)
        }, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        magic_link = f"{FRONTEND_URL}/participant/verify?token={token}"
        
        # 1. Generate AI email content
        try:
            prompt = f"Draft a welcome email for {m['name']} to the AlgoRythm EventFlow hackathon. Include this login link for them to access their participant dashboard: {magic_link}. Keep it under 100 words, enthusiastic and professional. Return it as HTML."
            fallback = f"<p>Hello {m['name']}, welcome to AlgoRythm. Access your dashboard here: <a href='{magic_link}'>{magic_link}</a></p>"
            html_body = call_llm(prompt, fallback)
            
            ai_content_id = str(uuid.uuid4())
            conn.execute(
                """INSERT INTO AiEmailContent (id, recipientId, emailType, subject, htmlBody)
                   VALUES (?,?,?,?,?)""",
                (ai_content_id, m["id"], "welcome", "Welcome to AlgoRythm EventFlow!", html_body)
            )
        except Exception as e:
            print(f"[AI Draft Error] {e}")

        # 2. Log email
        log_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO email_logs (id, recipient_id, recipient_email, recipient_name,
               email_type, status, job_id) VALUES (?,?,?,?,'welcome','PENDING',?)""",
            (log_id, m["id"], m["email"], m["name"], log_id)
        )
        
        # 3. Push to BullMQ via node bridge
        job_payload = {
            "jobId": log_id,
            "recipientId": m["id"],
            "recipientEmail": m["email"],
            "recipientName": m["name"],
            "emailType": "welcome",
            "templateData": {
                "participantName": m["name"],
                "teamName": "Your Team",
                "portalLink": magic_link
            }
        }
        
        try:
            subprocess.run(["node", "src/scripts/queue_job.js", json.dumps(job_payload)], check=True)
            print(f"[Real Email Send] Queued for {m['email']}")
        except Exception as e:
            print(f"[Real Email Send] Failed to queue for {m['email']}: {e}")
            conn.execute("UPDATE email_logs SET status='FAILED', error_message=? WHERE id=?", (str(e), log_id))

        results.append({"participantId": m["id"], "email": m["email"], "magicLink": magic_link})

    conn.commit()
    conn.close()
    return {"success": True, "sentCount": len(results)}
