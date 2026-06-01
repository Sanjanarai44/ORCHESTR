import sqlite3
from src.core.config import DB_FILE

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS judges (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            jwt_token TEXT,
            token_used INTEGER DEFAULT 0,
            assigned_teams TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            problem_statement TEXT,
            evaluation_guide TEXT,
            results_held INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS team_members (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            skill TEXT,
            college TEXT,
            FOREIGN KEY(team_id) REFERENCES teams(id)
        );

        CREATE TABLE IF NOT EXISTS evaluations (
            id TEXT PRIMARY KEY,
            judge_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            score_code INTEGER,
            score_innovation INTEGER,
            score_presentation INTEGER,
            star_rating INTEGER DEFAULT 0,
            comment TEXT,
            discarded INTEGER DEFAULT 0,
            override_score REAL,
            submitted_at TEXT DEFAULT (datetime('now')),
            UNIQUE(judge_id, team_id),
            FOREIGN KEY(judge_id) REFERENCES judges(id),
            FOREIGN KEY(team_id) REFERENCES teams(id)
        );

        CREATE TABLE IF NOT EXISTS anomaly_flags (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            judge_id TEXT NOT NULL,
            new_score REAL,
            panel_avg REAL,
            deviation REAL,
            llm_explanation TEXT,
            status TEXT DEFAULT 'PENDING',
            resolution TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(team_id) REFERENCES teams(id),
            FOREIGN KEY(judge_id) REFERENCES judges(id)
        );

        CREATE TABLE IF NOT EXISTS email_logs (
            id TEXT PRIMARY KEY,
            recipient_id TEXT,
            recipient_email TEXT,
            recipient_name TEXT,
            email_type TEXT,
            status TEXT DEFAULT 'PENDING',
            sent_at TEXT,
            error_message TEXT,
            attempts INTEGER DEFAULT 0,
            job_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS mentor_conversations (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(team_id) REFERENCES teams(id)
        );

        CREATE TABLE IF NOT EXISTS event_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS activity_log (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            metadata TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS AiEmailContent (
            id TEXT PRIMARY KEY,
            recipientId TEXT NOT NULL,
            emailType TEXT NOT NULL,
            subject TEXT NOT NULL,
            htmlBody TEXT NOT NULL,
            createdAt TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.execute("INSERT OR IGNORE INTO event_settings (key, value) VALUES ('anomaly_threshold', '2.5');")
    conn.commit()
    conn.close()
