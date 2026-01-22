from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.api.routes import router
from app.config import get_settings
from app.logging_config import setup_logging, get_logger

# Initialize logging
setup_logging(level="INFO")
logger = get_logger("app.main")

app = FastAPI(title="Chart Agent API")
logger.info("Starting Chart Agent API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],  # Vite dev server ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure charts directory exists
settings = get_settings()
Path(settings.charts_dir).mkdir(parents=True, exist_ok=True)

# Serve static files (generated charts)
app.mount("/static", StaticFiles(directory="static"), name="static")

# API routes
app.include_router(router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}
