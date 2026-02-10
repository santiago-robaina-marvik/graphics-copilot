from flask import Flask, jsonify
from flask_cors import CORS
from pathlib import Path

from app.api.routes import bp
from app.config import get_settings
from app.logging_config import setup_logging, get_logger

# Initialize logging
setup_logging(level="INFO")
logger = get_logger("app.main")

app = Flask(__name__, static_folder="../static", static_url_path="/static")
logger.info("Starting Chart Agent API")

# CORS for frontend
CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    supports_credentials=True,
)

# Ensure charts directory exists
settings = get_settings()
Path(settings.charts_dir).mkdir(parents=True, exist_ok=True)

# API routes
app.register_blueprint(bp, url_prefix="/api")


@app.get("/health")
def health_check():
    return jsonify({"status": "ok"})


# JSON error handlers
@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(error):
    response = jsonify({"error": getattr(error, "description", str(error))})
    response.status_code = error.code if hasattr(error, "code") else 500
    return response
