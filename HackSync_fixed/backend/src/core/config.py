import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "file:./dev.db")
# Extract just the filename for sqlite3 (e.g., 'dev.db' from 'file:./dev.db' or 'sqlite:///dev.db')
if DATABASE_URL.startswith("file:./"):
    DB_FILE = DATABASE_URL.replace("file:./", "")
elif DATABASE_URL.startswith("sqlite+aiosqlite:///"):
    DB_FILE = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
elif DATABASE_URL.startswith("sqlite:///"):
    DB_FILE = DATABASE_URL.replace("sqlite:///", "")
else:
    DB_FILE = "dev.db"
JWT_SECRET = os.getenv("JWT_SECRET", "shraddha_secret_key_change_in_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 168
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
ANOMALY_DEFAULT_THRESHOLD = 2.5

from openai import OpenAI
ai_client = OpenAI(base_url='https://openrouter.ai/api/v1', api_key=OPENROUTER_API_KEY)
