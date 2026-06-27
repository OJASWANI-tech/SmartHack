import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.event_venue import EventVenue

router = APIRouter()


class VenueUpsert(BaseModel):
    name: str
    address: Optional[str] = None
    floor: Optional[str] = None
    room_map_url: Optional[str] = None
    parking_info: Optional[str] = None
    wifi_ssid: Optional[str] = None
    wifi_password: Optional[str] = None
    check_in_info: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None


def serialize_venue(venue: EventVenue) -> dict:
    return {
        "id": str(venue.id),
        "event_id": str(venue.event_id),
        "name": venue.name,
        "address": venue.address,
        "floor": venue.floor,
        "room_map_url": venue.room_map_url,
        "parking_info": venue.parking_info,
        "wifi_ssid": venue.wifi_ssid,
        "wifi_password": venue.wifi_password,
        "check_in_info": venue.check_in_info,
        "contact_name": venue.contact_name,
        "contact_phone": venue.contact_phone,
        "created_at": venue.created_at.isoformat() if venue.created_at else None,
    }


@router.get("/events/{event_id}/venue")
async def get_event_venue(
    event_id: uuid.UUID,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    venue = (
        await db.execute(select(EventVenue).where(EventVenue.event_id == event_id))
    ).scalar_one_or_none()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not set.")
    return serialize_venue(venue)


@router.put("/events/{event_id}/venue")
async def upsert_event_venue(
    event_id: uuid.UUID,
    body: VenueUpsert,
    user=Depends(require_role("committee")),
    db: AsyncSession = Depends(get_db),
):
    venue = (
        await db.execute(select(EventVenue).where(EventVenue.event_id == event_id))
    ).scalar_one_or_none()
    if not venue:
        venue = EventVenue(event_id=event_id)
        db.add(venue)

    for field, value in body.model_dump().items():
        setattr(venue, field, value)

    await db.commit()
    await db.refresh(venue)
    return serialize_venue(venue)
