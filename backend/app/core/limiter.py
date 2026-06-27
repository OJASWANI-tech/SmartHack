from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

# Global Limiter instance
# Rate limiting is disabled if ENVIRONMENT == "development" to avoid disrupting local developer workflows
limiter = Limiter(
    key_func=get_remote_address,
    enabled=(settings.ENVIRONMENT != "development")
)
