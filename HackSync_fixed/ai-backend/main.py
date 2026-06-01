"""
AI Backend - Port 8000
ONLY handles AI/LLM calls and event configuration via conversational AI.
ALL data storage is in PostgreSQL via the Node backend (port 5000).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os, json

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
# EVENTS (stored in localStorage on frontend)
# ═══════════════════════════════════════════════

@app.get("/events")
def get_events(organizer_id: int = 1):
    """Returns demo event - real events are stored in localStorage"""
    return {"events": [{
        "id": 1,
        "name": "48-Hour Hackathon",
        "event_type": "hackathon",
        "status": "active",
        "participant_count": 0,
        "team_count": 0,
        "created_at": "2025-06-01T00:00:00",
        "config": {
            "event_name": "48-Hour Hackathon",
            "event_type": "hackathon",
            "team_size": 3,
            "stages": ["Registration", "Team Formation", "Hacking Phase", "Round 1 Eval", "Final Demo", "Winners"],
            "num_judges": 5,
            "scoring_criteria": ["innovation", "technical execution", "presentation"],
            "advancement_rule": "top 5 teams advance to finals",
            "communication_touchpoints": ["welcome email", "team assignment", "evaluation reminder", "results"]
        }
    }]}

@app.post("/events")
def create_event(data: dict):
    config = data.get("config", {})
    name = config.get("event_name", "New Event")
    return {"success": True, "event_id": 1, "name": name}

@app.put("/events/{event_id}")
def update_event(event_id: int, data: dict):
    return {"success": True}

@app.delete("/events/{event_id}")
def delete_event(event_id: int):
    return {"success": True}

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