import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Core system connectivity and model imports
from app.db.session import get_db
from app.models.chat import ChatMessage  
from app.schemas.chat import MessageCreate  

router = APIRouter()

# =====================================================================
# TRANSMIT MESSAGE: PERSIST MESSAGE PAYLOAD TO POSTGRESQL
# =====================================================================
@router.post("/chat/send")
async def send_chat_message(
    payload: MessageCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Persists a dynamic live tracking communication packet straight into PostgreSQL.
    Converts incoming payload string IDs to match structural relational types natively.
    """
    try:
        # Convert incoming string token safely into a real Python UUID format matching finalized_teams
        parsed_team_id = uuid.UUID(payload.team_id) if isinstance(payload.team_id, str) else payload.team_id

        new_message = ChatMessage(
            event_id=payload.event_id,
            team_id=parsed_team_id,  
            participant_id=payload.participant_id,
            channel=payload.channel,
            sender_name=payload.sender_name,
            sender_email=payload.sender_email,
            text=payload.message, 
            
            # 🎯 FIXED: Extract directly from the fixed snake_case validation property
            audio_url=payload.audio_url ,
            file_url=payload.file_url,
            file_type=payload.file_type,
            file_name=payload.file_name
        )
        
        # Stage inside database transactional memory layer
        db.add(new_message)
        
        # Explicitly commit tracking modifications down to PostgreSQL disk block tables
        await db.commit()
        
        # Refresh local state context attributes
        await db.refresh(new_message)
        
        return {"status": "success", "message_id": new_message.id}
        
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid UUID formatting encountered on team allocation context: {str(ve)}"
        )
    except Exception as e:
        await db.rollback()  # Safely roll back transaction pool state contexts upon connection failures
        print(f"DATABASE WRITE ERROR LOG: {str(e)}") 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database write operation failed: {str(e)}"
        )


# =====================================================================
# FETCH HISTORY: RETRIEVE HISTORICAL ROOM TIMELINE 
# =====================================================================
@router.get("/chat/messages")
async def fetch_chat_messages(
    event_id: str, 
    team_id: str, 
    channel: str, 
    db: AsyncSession = Depends(get_db)
):
    """
    Queries and builds the absolute chronological history array for the specified 
    room parameters using SQLAlchemy 2.0 select statement architectures.
    """
    try:
        # Convert incoming filter tracking parameters safely
        parsed_team_id = uuid.UUID(team_id) if isinstance(team_id, str) else team_id

        stmt = (
            select(ChatMessage)
            .where(
                ChatMessage.event_id == event_id,
                ChatMessage.team_id == parsed_team_id,
                ChatMessage.channel == channel
            )
            .order_by(ChatMessage.timestamp.asc())
        )
        
        # Execute query statement non-blockingly across AsyncSession pipeline
        query_result = await db.execute(stmt)
        messages = query_result.scalars().all()
        
        # Format rows cleanly into payload structures matching React components
        formatted_messages = []
        for msg in messages:
            time_str = msg.timestamp.strftime("%I:%M %p") if msg.timestamp else ""
            
            formatted_messages.append({
                "id": msg.id,
                "sender": f"{msg.sender_name} (You)" if msg.sender_email == msg.participant_id else msg.sender_name,
                "text": msg.text,  
                "email": msg.sender_email,
                "timestamp": time_str,
                "avatar": "🦁" if "Karan" in msg.sender_name else "👤",
                
                # 🎯 STRATEGY DEFENSE: Provide BOTH keys back to the frontend payload response 
                # so that no matter what your React component targets, it will play the audio.
                "audioUrl": msg.audio_url,
                "audio_url": msg.audio_url ,
                "file_url": msg.file_url,
                 "file_url": msg.file_url,
                "fileUrl": msg.file_url,
                "file_type": msg.file_type,
                "fileType": msg.file_type,
                "file_name": msg.file_name or "Attachment",
                "fileName": msg.file_name or "Attachment"
            })
        
        return {"messages": formatted_messages}
        
    except Exception as e:
        print(f"DATABASE READ ERROR LOG: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query database context: {str(e)}"
        )