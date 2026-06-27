from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

class MatchDetail(BaseModel):
    file_A: str
    file_B: str
    similarity_score: float
    severity: str

class AntiCheatResponse(BaseModel):
    status: str
    total_flagged_pairs: int = 0
    matches: List[MatchDetail] = Field(default_factory=list)
    task_id: str
    event_id: str
    created_at: datetime

    @field_validator("matches", mode="before")
    @classmethod
    def normalize_matches(cls, value):
        if value is None:
            return []
        # If the DB returns a raw dict wrapping the list, extract the list cleanly
        if isinstance(value, dict):
            return value.get("matches", [])
        return value

    class Config:
        from_attributes = True