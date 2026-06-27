import os
import sys

backend_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, os.path.abspath(backend_path))

from ai_app.celery_app import celery_app

@celery_app.task(name='ai_app.tasks.stage_tasks.activate_build_stage')
def activate_build_stage(event_id: str):
    import app.models
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.stage import Stage
    from app.models.event import Event
    from app.utils.stages_utils import activate_stage, complete_stage, create_system_announcement_c_specific
    from app.core.config import settings

    sync_url = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://")

    engine = create_engine(sync_url, pool_pre_ping=False)
    SessionLocal = sessionmaker(bind=engine)

    try:
        with SessionLocal() as db:
            event = db.query(Event).filter(Event.id == event_id).first()
            # Complete Mentor Connect stage (sequence_order == 2)
            mentor_stage = db.query(Stage).filter(
                Stage.event_id == event_id,
                Stage.sequence_order == 2,
                Stage.is_committee_visible == False
            ).first()
            
            if mentor_stage:
                complete_stage(mentor_stage, db)

                create_system_announcement_c_specific(
                    db=db,
                    event_id=event_id,
                    title="Mentor Connection Complete 🤝",
                    message=f"Your mentor connection stage is complete. Continue collaborating for guidance and feedback.",
                    type="info"
                )

            build_stage = db.query(Stage).filter(
                Stage.event_id == event_id,
                Stage.sequence_order == 3,
                Stage.is_committee_visible == False
            ).first()

            if build_stage and event:
                activate_stage(build_stage, db)
                event.current_participant_stage = build_stage.name

                create_system_announcement_c_specific(
                    db=db,
                    event_id=event_id,
                    title="Build Phase Started 🛠️",
                    message=f"The development phase is now live. Start building your solution and track your progress carefully.",
                    type="info"
                )

            db.commit()
            
    finally:
        engine.dispose()