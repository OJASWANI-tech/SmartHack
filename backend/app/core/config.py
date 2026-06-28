from pydantic_settings import BaseSettings
from pydantic import field_validator
from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # points to backend/
backend_env = BASE_DIR / ".env"
root_env = BASE_DIR.parent / ".env"
for env_path in (backend_env, root_env):
    if env_path.exists():
        load_dotenv(str(env_path), override=True)

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    RESEND_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    GROQ_API_KEY: str = "dummy_key"
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_EMBEDDING_MODEL: str = "nomic-embed-text-v1_5"
    FRONTEND_URL: str = "http://localhost:5173"
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_CALLBACK_URL: str = "http://localhost:8000/auth/google/callback"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


    @field_validator("JWT_SECRET_KEY")
    def secret_must_be_strong(cls, v):
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v

settings = Settings()
