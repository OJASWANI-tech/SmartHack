import os
import ssl
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Grab environment credentials
broker_url = os.getenv('CELERY_BROKER_URL') or os.getenv('REDIS_URL') or 'redis://localhost:6379/0'
result_backend = os.getenv('CELERY_RESULT_BACKEND') or os.getenv('REDIS_URL') or 'redis://localhost:6379/0'

# 🛡️ Automatically inject SSL configurations if using a secure rediss:// connection string
ssl_options = None
if broker_url.startswith('rediss://'):
    ssl_options = {
        'ssl_cert_reqs': ssl.CERT_NONE  # Safe fallback for typical cloud test/sandbox instances
    }

celery_app = Celery(
    'event_orchestration',
    broker=broker_url,
    backend=result_backend,
    include=[
        'ai_app.tasks.llm_tasks',
        'ai_app.tasks.stage_tasks',
        'ai_app.tasks.anti_cheat_tasks',  # Loaded and discovered cleanly
    ]
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    result_expires=3600,

    # =====================================================================
    # 🛰️ CLOUD REDIS LABS CONNECTION POOL & ANTI-DROP TUNING
    # =====================================================================
    
    # 1. Limit connection pools to prevent max client limit exhaustion on free tiers
    broker_pool_limit=10,
    redis_max_connections=10,
    
    # 2. Connection establishment limits
    broker_connection_timeout=20,
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    
    # 3. Transport configuration options for BOTH the broker and backend queues
    broker_transport_options={
        'visibility_timeout': 3600,
        'socket_timeout': 30,          # Give the cloud database up to 30s to respond
        'socket_connect_timeout': 30,
        'socket_keepalive': True,       # 👈 CRITICAL: Fires regular TCP heartbeats to stop 10054 drops
        **({'ssl': ssl_options} if ssl_options else {})
    },
    
    redis_backend_transport_options={
        'visibility_timeout': 3600,
        'socket_timeout': 30,
        'socket_connect_timeout': 30,
        'socket_keepalive': True,       # 👈 CRITICAL: Keeps result channel pipelines alive
        **({'ssl': ssl_options} if ssl_options else {})
    }
)

# Pass fallback SSL properties direct to backend client handlers if needed
if ssl_options:
    celery_app.conf.update(
        redis_backend_use_ssl=ssl_options,
    )

# =====================================================================
# 🧭 DYNAMIC TASK QUEUE ROUTING MATCHES YOUR WORKER BLUEPRINT
# =====================================================================
celery_app.conf.task_routes = {
    'ai_app.tasks.llm_tasks.*': {'queue': 'llm_queue'},
    'ai_app.tasks.stage_tasks.*': {'queue': 'celery'},
    
    # 🌟 FIXED: Route anti-cheat tasks directly to the active 'llm_queue' channel 
    # so your current running worker catches and builds the matrix immediately!
    'ai_app.tasks.anti_cheat_tasks.*': {'queue': 'llm_queue'},
}