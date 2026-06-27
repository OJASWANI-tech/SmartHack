from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime

# =====================================================================
# 📋 ROSTER & MATRIX RESPONSE READ SCHEMAS
# =====================================================================

class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    email: str
    domain: Optional[str] = None


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    name: str
    challenge: Optional[str] = None
    llm_rationale: Optional[str] = None
    final_score: Optional[float] = None
    approval_status: Optional[str] = "approved"
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    # Mentor Columns
    mentor_name: Optional[str] = None
    mentor_company: Optional[str] = None
    mentor_email: Optional[str] = None
    next_session_datetime: Optional[datetime] = None

    # The array property key your React frontend component loops over
    members: List[MemberRead] = [] 

    @model_validator(mode="before")
    @classmethod
    def map_snapshot_to_members(cls, data):
        if hasattr(data, "__dict__"):
            snapshot = getattr(data, "members_snapshot", [])
            data.members = snapshot if isinstance(snapshot, list) else []
        elif isinstance(data, dict):
            data["members"] = data.get("members_snapshot", []) or data.get("members", [])
            
        return data


# =====================================================================
# 🔧 NESTED CONFIGURATION SCHEMAS WITH DICTIONARY EMULATION GET METHODS
# =====================================================================

class SkillsConfigSchema(BaseModel):
    enabled: bool = True
    minDevelopers: int = 0
    minDesigners: int = 0
    minBusiness: int = 0

    # 💡 DEFENSIVE SAFEGUARD: Emulate dictionary .get() to prevent engine crashes
    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


class ExperienceConfigSchema(BaseModel):
    enabled: bool = True
    maxExperts: int = 4
    minBeginners: int = 0

    # 💡 DEFENSIVE SAFEGUARD: Emulate dictionary .get() to prevent engine crashes
    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


class TeamFormationConfig(BaseModel):
    # Set config to populate fields by alias to handle camelCase/snake_case seamlessly
    model_config = ConfigDict(populate_by_name=True)

    team_size: int = Field(default=4, alias="team_size")
    institutionLimitEnabled: bool = False
    max_per_institution: Optional[int] = Field(default=None, alias="max_per_institution")
    label: str = "Committee Custom Run"
    
    # Nested configurations parsing your React objects cleanly
    skills: SkillsConfigSchema = Field(default_factory=SkillsConfigSchema)
    experience: ExperienceConfigSchema = Field(default_factory=ExperienceConfigSchema)

    # Allow top-level .get() just in case the engine requests it from config directly
    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


# =====================================================================
# 👥 MENTOR SCHEMAS
# =====================================================================

class MentorAssignRequest(BaseModel):
    mentor_name: Optional[str] = None
    mentor_company: Optional[str] = None
    mentor_email: Optional[EmailStr] = None