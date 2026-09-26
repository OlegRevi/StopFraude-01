import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.alerts import router as alerts_router
from app.routes.contacts import router as contacts_router
from app.routes.stripe_routes import router as stripe_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("stopfrauda.main")

app = FastAPI(
    title="StopFrauda Cloud Run API",
    description="Backend services for StopFrauda Android Anti-Fraud App: Call screening alerts, Twilio SMS, and Stripe.",
    version="1.0.0"
)

# CORS configuration for Expo mobile app and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(alerts_router)
app.include_router(contacts_router)
app.include_router(stripe_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Service health check endpoint for Cloud Run container liveness probe."""
    return {
        "status": "healthy",
        "service": "stopfrauda-backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "twilio_configured": settings.is_twilio_configured,
        "stripe_configured": settings.is_stripe_configured
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
