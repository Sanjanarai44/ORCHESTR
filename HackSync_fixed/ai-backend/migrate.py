import sqlite3
import json
import hashlib

conn = sqlite3.connect('eventflow.db')
c = conn.cursor()

c.executescript("""
CREATE TABLE IF NOT EXISTS organizers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organizer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    event_type TEXT DEFAULT 'hackathon',
    config TEXT DEFAULT '{}',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES organizers(id)
);

CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL DEFAULT 1,
    name TEXT,
    email TEXT,
    skill TEXT,
    institution TEXT,
    stage TEXT DEFAULT 'roster',
    UNIQUE(event_id, email)
);

CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL DEFAULT 1,
    name TEXT,
    rationale TEXT,
    status TEXT DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    participant_id INTEGER
);

CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL DEFAULT 1,
    team_id INTEGER,
    judge_name TEXT,
    score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL DEFAULT 1,
    action TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL DEFAULT 1,
    response_type TEXT,
    content TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

conn.commit()

# ── Seed demo organizer ──────────────────────────────────────────────────────
password_hash = hashlib.sha256("admin123".encode()).hexdigest()
c.execute("""
    INSERT OR IGNORE INTO organizers (id, name, email, password_hash)
    VALUES (1, 'Event Admin', 'admin@wiseti.com', ?)
""", (password_hash,))

# ── Seed demo hackathon event ─────────────────────────────────────────────────
hackathon_config = json.dumps({
    "event_name": "48-Hour Hackathon",
    "event_type": "hackathon",
    "team_size": 3,
    "stages": ["Registration", "Team Formation", "Hacking Phase", "Round 1 Eval", "Final Demo", "Winners"],
    "num_judges": 5,
    "scoring_criteria": ["innovation", "technical execution", "presentation"],
    "advancement_rule": "top 5 teams advance to finals",
    "communication_touchpoints": ["welcome email", "team assignment", "evaluation reminder", "results"]
})

c.execute("""
    INSERT OR IGNORE INTO events (id, organizer_id, name, event_type, config, status)
    VALUES (1, 1, '48-Hour Hackathon', 'hackathon', ?, 'active')
""", (hackathon_config,))

# ── Seed demo participants for event 1 ────────────────────────────────────────
demo_participants = [
    (1, "Alice Roy",      "alice@mnnit.ac.in",   "Frontend",  "MNNIT Allahabad",  "team_formation"),
    (1, "Bob Singh",      "bob@iitd.ac.in",       "Backend",   "IIT Delhi",        "team_formation"),
    (1, "Carol Das",      "carol@nitk.ac.in",     "Design",    "NIT Karnataka",    "team_formation"),
    (1, "Dev Sharma",     "dev@iitb.ac.in",       "Frontend",  "IIT Bombay",       "team_formation"),
    (1, "Eva Patel",      "eva@bits.ac.in",       "Backend",   "BITS Pilani",      "team_formation"),
    (1, "Farhan Khan",    "farhan@vit.ac.in",     "Design",    "VIT Vellore",      "team_formation"),
    (1, "Gita Nair",      "gita@iisc.ac.in",      "Frontend",  "IISc Bangalore",   "team_formation"),
    (1, "Harsh Gupta",    "harsh@nsit.ac.in",     "Backend",   "NSIT Delhi",       "team_formation"),
    (1, "Isha Mehta",     "isha@dtu.ac.in",       "Design",    "DTU Delhi",        "team_formation"),
]

for p in demo_participants:
    c.execute("""
        INSERT OR IGNORE INTO participants (event_id, name, email, skill, institution, stage)
        VALUES (?, ?, ?, ?, ?, ?)
    """, p)

conn.commit()

# ── Verify ────────────────────────────────────────────────────────────────────
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", [t[0] for t in tables])

org = c.execute("SELECT name, email FROM organizers").fetchall()
print("Organizers:", [(o[0], o[1]) for o in org])

events = c.execute("SELECT id, name, status FROM events").fetchall()
print("Events:", [(e[0], e[1], e[2]) for e in events])

parts = c.execute("SELECT COUNT(*) FROM participants WHERE event_id=1").fetchone()
print(f"Demo participants: {parts[0]}")

conn.close()
print("\n✅ Migration complete!")
print("   Demo login: admin@wiseti.com / admin123")