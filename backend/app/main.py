import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import Base, engine
from app.limiter import limiter
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.history import router as history_router
from app.routers.inference import router as inference_router
from app.routers.remedy import router as remedy_router

# Initialize database tables (supports both local SQLite and Neon PostgreSQL)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time Plant Disease Identification & Treatment Recommendation System REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# SlowAPI Rate Limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS Middleware
cors_origins_raw = getattr(settings, "CORS_ORIGINS", "*")
if cors_origins_raw != "*" and cors_origins_raw.strip():
    allow_origins = [orig.strip() for orig in cors_origins_raw.split(",") if orig.strip()]
    allow_origin_regex = None
else:
    # Default to supporting localhost, Hugging Face Spaces, and all Vercel deployments
    allow_origins = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]
    allow_origin_regex = r"https://.*\.vercel\.app|https://.*\.hf\.space|http://localhost:.*|http://127\.0\.0\.1:.*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount static route
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register Canonical Routers (displayed in Swagger UI under /api)
app.include_router(auth_router, prefix="/api/auth")
app.include_router(admin_router, prefix="/api")
app.include_router(remedy_router, prefix="/api")
app.include_router(history_router, prefix="/api/history")
app.include_router(inference_router, prefix="/api/inference")

# Backwards-compatibility aliases (hidden from Swagger UI)
app.include_router(auth_router, prefix="/auth", include_in_schema=False)
app.include_router(admin_router, include_in_schema=False)
app.include_router(remedy_router, include_in_schema=False)
app.include_router(history_router, prefix="/history", include_in_schema=False)
app.include_router(inference_router, prefix="/inference", include_in_schema=False)


@app.get("/", tags=["System"])
def root():
    return {
        "status": "online",
        "system": settings.APP_NAME,
        "version": "1.0.0",
        "documentation": "/docs",
    }


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"], include_in_schema=False)
def health_check():
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        pass
    return {"status": "healthy"}
