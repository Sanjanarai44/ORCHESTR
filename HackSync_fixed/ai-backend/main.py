"""
AI Backend - Port 8000
ONLY handles AI/LLM calls and event configuration via conversational AI.
ALL data storage is in PostgreSQL via the Node backend (port 5000).
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os, json, sqlite3, re
from typing import Union, Optional

# Initialize Mentor History DB
def init_mentor_db():
    conn = sqlite3.connect("eventflow.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS mentor_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT,
            team_id TEXT,
            role TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS mentor_context (
            team_id TEXT PRIMARY KEY,
            event_id TEXT,
            problem_description TEXT,
            session_notes TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_mentor_db()

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

def call_llm(prompt: str, fallback: str) -> str:
    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"LLM error: {e}")
        return fallback

@app.get("/")
def home():
    return {"message": "ORCHESTR AI Backend running", "port": 8000, "purpose": "AI/LLM only"}

# ═══════════════════════════════════════════════
# ORGANIZER AUTH (simple - stored in localStorage)
# ═══════════════════════════════════════════════

@app.post("/auth/login")
def login(data: dict):
    """Demo auth — in production replace with real DB check via Node"""
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    # Demo credentials
    if email == "admin@wiseti.com" and password == "admin123":
        return {"success": True, "organizer": {"id": 1, "name": "Event Admin", "email": email}}
    return {"success": False, "error": "Invalid email or password"}

@app.post("/auth/register")
def register(data: dict):
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    if not name or not email:
        return {"success": False, "error": "Name and email required"}
    # Return success with id=1 for demo
    return {"success": True, "organizer": {"id": 1, "name": name, "email": email}}

# ═══════════════════════════════════════════════
# EVENTS — stored in PostgreSQL via Node backend
# ═══════════════════════════════════════════════
import httpx

NODE_URL = os.getenv("NODE_URL", "https://orchestr-backend-8u5k.onrender.com")

@app.get("/events")
async def get_events(organizer_id: str = "1"):
    """Fetch events from PostgreSQL via Node backend"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"{NODE_URL}/api/admin/events?organizer_id={organizer_id}")
            data = res.json()
            return data
    except Exception as e:
        print(f"Events fetch error: {e}")
        return {"events": [], "success": False}

@app.post("/events")
async def create_event(data: dict):
    """Create event in PostgreSQL via Node backend"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                f"{NODE_URL}/api/admin/events",
                json=data,
                headers={"Content-Type": "application/json"},
            )
            return res.json()
    except Exception as e:
        print(f"Event create error: {e}")
        return {"success": False, "error": str(e)}

@app.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete event and all related data via Node backend"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.delete(f"{NODE_URL}/api/admin/events/{event_id}")
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

# ═══════════════════════════════════════════════
# AI ENDPOINTS
# ═══════════════════════════════════════════════

@app.post("/generate-rationale")
def generate_rationale(team: dict):
    members = team.get("members", [])
    members_text = "\n".join([f"- {m.get('name','?')}: {m.get('skill','?')} from {m.get('college','?')}" for m in members])
    prompt = f"""Write a 2-3 sentence rationale explaining why this team is strong and well-balanced. Be specific about skills and diversity.
Team members:\n{members_text}\nReturn only the rationale, no preamble."""
    result = call_llm(prompt, "This team brings complementary skills that cover the full stack with diverse institutional backgrounds.")
    return {"rationale": result}

@app.post("/draft-email")
def draft_email(data: dict):
    stage = data.get("stage", "Team Assignment")
    team_name = data.get("team_name", "Your Team")
    participant_name = data.get("participant_name", "Participant")
    prompt = f"""Draft a warm, professional 3-4 sentence email for the "{stage}" stage.
Team: {team_name}, Participant: {participant_name}.
Return only the email body, no subject line."""
    result = call_llm(prompt, f"Dear {participant_name}, we're excited to share an update about {team_name}.")
    return {"email": result}

@app.post("/generate-rubric")
def generate_rubric(data: dict):
    team_name = data.get("team_name", "Team")
    challenge = data.get("challenge", "General evaluation")
    prompt = f"""Generate a structured judging rubric for evaluating team '{team_name}' on: {challenge}.
Format as 4 criteria, each with: name, what to look for, score range 0-10.
Be concise and practical. Return only the rubric."""
    result = call_llm(prompt, "1. Innovation (0-10): Originality of solution\n2. Technical (0-10): Code quality\n3. Impact (0-10): Real-world value\n4. Presentation (0-10): Clarity of demo")
    return {"rubric": result}

@app.post("/explain-anomaly")
def explain_anomaly(data: dict):
    team_name = data.get("team_name", "Team")
    judge_name = data.get("judge_name", "Judge")
    judge_score = data.get("judge_score", 0)
    panel_average = data.get("panel_average", 5)
    threshold = data.get("threshold", 2.0)
    deviation = abs(judge_score - panel_average)
    prompt = f"""A scoring anomaly was detected: Judge {judge_name} scored {judge_score}/10 for {team_name}, but the panel average is {panel_average:.1f}/10 (deviation: {deviation:.1f} pts, threshold: {threshold}).
Write 2 sentences explaining the anomaly and what the committee should do. Be direct."""
    result = call_llm(prompt, f"Judge {judge_name} scored significantly {'above' if judge_score > panel_average else 'below'} the panel average of {panel_average:.1f}/10. The committee should review this evaluation before publishing results.")
    return {"explanation": result}

@app.post("/compatibility-summary")
def compatibility_summary(data: dict):
    team_name = data.get("team_name", "Team")
    members = data.get("members", [])
    members_text = "\n".join([f"- {m.get('name','?')}: {m.get('skill','?')}" for m in members])
    prompt = f"""Write a 2-sentence team compatibility summary for {team_name}:\n{members_text}\nFocus on how their skills complement each other."""
    result = call_llm(prompt, "This team brings strong complementary skills across frontend, backend, and design.")
    return {"summary": result}

@app.post("/configure-event")
def configure_event(data: dict):
    description = data.get("description", "")
    conversation_history = data.get("history", [])
    messages = [
        {"role": "system", "content": """You are an event configuration assistant. Extract event structure from natural language descriptions.

If you have enough information, return ONLY this JSON (no other text):
{"event_name":"name","event_type":"hackathon/case competition/sports/coding/other","team_size":3,"stages":["Stage 1","Stage 2","Stage 3"],"num_judges":3,"scoring_criteria":["criterion1","criterion2"],"advancement_rule":"top X teams advance","communication_touchpoints":["welcome email","team assignment"],"clarification_needed":null}

If information is incomplete or ambiguous, return ONLY:
{"clarification_needed":"Your specific question here"}

Return ONLY valid JSON. No markdown, no explanation."""}
    ]
    for msg in conversation_history:
        messages.append(msg)
    messages.append({"role": "user", "content": description})

    try:
        response = client.chat.completions.create(model="openai/gpt-4o-mini", messages=messages)
        result = response.choices[0].message.content.strip()
        # Strip markdown if present
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        parsed = json.loads(result.strip())
        status = "complete" if not parsed.get("clarification_needed") else "needs_clarification"
        return {"config": parsed, "status": status}
    except Exception as e:
        return {"config": None, "status": "error", "error": str(e)}

# ═══════════════════════════════════════════════
# STAGE MANAGEMENT (proxies to Node/PostgreSQL via frontend)
# ═══════════════════════════════════════════════

@app.get("/event-stages")
def get_event_stages(event_id: int = 1):
    """Placeholder - frontend calls Node backend directly for stage data"""
    return {"stages": []}

@app.post("/advance-stage")
def advance_stage(data: dict):
    """Placeholder - handled by Node backend"""
    return {"success": True, "affected": 0}

@app.get("/activity-log")
def get_activity_log(event_id: int = 1):
    """Placeholder - handled by Node backend"""
    return {"logs": []}

# ═══════════════════════════════════════════════
# ANOMALY FLAGS (read from PostgreSQL via Node)
# ═══════════════════════════════════════════════

@app.get("/api/admin/anomaly-flags")
def get_anomaly_flags(status_filter: str = "PENDING", event_id: int = 1):
    """Returns empty - real anomaly flags are in PostgreSQL, fetched by Node"""
    return {"flags": [], "total": 0}

@app.post("/api/anomalies/{flag_id}/override")
def override_anomaly(flag_id: str, data: dict):
    return {"success": True}

@app.post("/api/anomalies/{flag_id}/dismiss")
def dismiss_anomaly(flag_id: str):
    return {"success": True}

# ═══════════════════════════════════════════════
# AI MENTOR
# ═══════════════════════════════════════════════

class MentorRequest(BaseModel):
    event_id: Union[str, int]
    team_id: Union[str, int]
    participant_id: Optional[str] = None
    message: str

@app.post("/ai-mentor")
def ai_mentor(req: MentorRequest):
    conn = sqlite3.connect("eventflow.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Fetch event and team context
        c.execute("SELECT name, config FROM events WHERE id = ?", (req.event_id,))
        event = c.fetchone()
        
        c.execute("SELECT name FROM teams WHERE id = ?", (req.team_id,))
        team = c.fetchone()
        
        event_name = event["name"] if event else "Unknown Event"
        event_config = json.loads(event["config"]) if event and event["config"] else {}
        team_name = team["name"] if team else f"Team {req.team_id}"
        
        # Save user message
        c.execute(
            "INSERT INTO mentor_history (event_id, team_id, role, content) VALUES (?, ?, ?, ?)",
            (req.event_id, req.team_id, "user", req.message)
        )
        conn.commit()

        # Get history
        c.execute(
            "SELECT role, content FROM mentor_history WHERE event_id = ? AND team_id = ? ORDER BY id ASC",
            (req.event_id, req.team_id)
        )
        history = c.fetchall()

        # Get context to check for problem_description
        c.execute("SELECT problem_description FROM mentor_context WHERE team_id = ?", (req.team_id,))
        context_row = c.fetchone()
        problem_description = context_row["problem_description"] if context_row and context_row["problem_description"] else ""

        if not problem_description or not problem_description.strip() or problem_description.lower() == "none":
            reply = "I cannot provide guidance without knowing your project's problem description. Please provide a problem description or explain the specific problem you are trying to solve in your team context first."
            c.execute(
                "INSERT INTO mentor_history (event_id, team_id, role, content) VALUES (?, ?, ?, ?)",
                (req.event_id, req.team_id, "assistant", reply)
            )
            conn.commit()
            return {"reply": reply}

        system_prompt = f"""You are an AI mentor for the event '{event_name}'.
Event details: {json.dumps(event_config)}
You are mentoring '{team_name}'.
Their problem description: '{problem_description}'

CRITICAL INSTRUCTIONS:
1. CONTEXT AWARENESS: You must ONLY reply to questions related to their specific problem description. Refuse to answer ANY out-of-context or off-topic questions (e.g. random Leetcode problems, unrelated algorithms). Remind them to stay focused on their specific project.
2. EXPLANATORY SOCRATIC MODE: You must act as a guide. You ARE allowed to explain architectural concepts, algorithms, and theory clearly to help them understand. However, you MUST NEVER give direct answers. You MUST ALWAYS end your response with a guiding question to provoke their own critical thinking process.
3. NO DIRECT CODE: You are STRICTLY FORBIDDEN from providing direct solutions, commands, or raw code snippets. If they ask for code, explain the concept conceptually and ask them how they might implement it.
"""
        messages = [{"role": "system", "content": system_prompt}]
        for row in history:
            messages.append({"role": row["role"], "content": row["content"]})

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=messages
        )
        reply = response.choices[0].message.content

        # Post-Generation Check: RegEx layer
        code_regex = re.compile(
            r"```|`|^\s*(def|class|function|const|let|var|import|export|if|for|while|return)\b",
            re.IGNORECASE | re.MULTILINE
        )
        if code_regex.search(reply):
            reply = "I noticed you might be looking for a direct solution. How might you approach this problem conceptually instead?"

        # Save AI response
        c.execute(
            "INSERT INTO mentor_history (event_id, team_id, role, content) VALUES (?, ?, ?, ?)",
            (req.event_id, req.team_id, "assistant", reply)
        )
        conn.commit()
        
        return {"reply": reply}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

class ContextRequest(BaseModel):
    event_id: Union[str, int]
    team_id: Union[str, int]
    participant_id: Optional[str] = None
    problem_description: str = None
    session_notes: str = None

@app.get("/ai-mentor/init")
def ai_mentor_init(event_id: str, team_id: str):
    conn = sqlite3.connect("eventflow.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        # Get history
        c.execute("SELECT role, content FROM mentor_history WHERE event_id = ? AND team_id = ? ORDER BY id ASC", (event_id, team_id))
        history = [dict(row) for row in c.fetchall()]

        # Get context
        c.execute("SELECT problem_description, session_notes FROM mentor_context WHERE team_id = ?", (team_id,))
        context = c.fetchone()
        
        return {
            "history": history,
            "problem_description": context["problem_description"] if context else "",
            "session_notes": context["session_notes"] if context else ""
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@app.post("/ai-mentor/context")
def update_ai_mentor_context(req: ContextRequest):
    conn = sqlite3.connect("eventflow.db")
    c = conn.cursor()
    try:
        c.execute("SELECT 1 FROM mentor_context WHERE team_id = ?", (req.team_id,))
        exists = c.fetchone()
        
        if exists:
            if req.problem_description is not None:
                c.execute("UPDATE mentor_context SET problem_description = ?, updated_at = CURRENT_TIMESTAMP WHERE team_id = ?", (req.problem_description, req.team_id))
            if req.session_notes is not None:
                c.execute("UPDATE mentor_context SET session_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE team_id = ?", (req.session_notes, req.team_id))
        else:
            c.execute("INSERT INTO mentor_context (team_id, event_id, problem_description, session_notes) VALUES (?, ?, ?, ?)", 
                      (req.team_id, req.event_id, req.problem_description or "", req.session_notes or ""))
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()