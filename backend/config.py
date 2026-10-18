import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "waterwatch-dev-secret-change-in-prod")
    
    # SQLite default database path in backend/instance/waterwatch.db
    INSTANCE_PATH = BASE_DIR / "instance"
    INSTANCE_PATH.mkdir(parents=True, exist_ok=True)
    DEFAULT_DB_PATH = INSTANCE_PATH / "waterwatch.db"
    
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    
    # Simulator
    SIMULATOR_ENABLED = os.getenv("SIMULATOR_ENABLED", "true").lower() in ("true", "1", "yes")
    SIMULATOR_INTERVAL_SECONDS = int(os.getenv("SIMULATOR_INTERVAL_SECONDS", "4"))
    
    # MQTT
    MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() in ("true", "1", "yes")
    MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com")
    MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "waterwatch")


class TestConfig(Config):
    """Testing configuration using an in-memory SQLite database."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SIMULATOR_ENABLED = False
    MQTT_ENABLED = False
