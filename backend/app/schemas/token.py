from pydantic import BaseModel
from uuid import UUID

class EvaluatorTokenRequest(BaseModel):
    evaluator_email: str
    event_id: UUID
    sandbox_delivery_email: str | None = None


class ParticipantTokenRequest(BaseModel):
    participant_email: str
    team_id: UUID
    participant_id: UUID    
    event_id: UUID 
