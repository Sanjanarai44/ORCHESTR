import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///dev.db" # Celery uses this for SQLAlchemy async connection
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET: str = "secret"
    JWT_EXPIRY_HOURS: int = 48
    ADMIN_SECRET: str = ""
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # SQLAlchemy requires sqlite+aiosqlite instead of file:./ for sqlite
        if self.DATABASE_URL.startswith("file:./"):
            self.DATABASE_URL = "sqlite+aiosqlite:///" + self.DATABASE_URL.replace("file:./", "")

settings = Settings()
