import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database import db
from backend.routes.api import api_bp
from backend.seed import seed_database
from backend.services.simulator import start_simulator
from backend.services.mqtt_service import init_mqtt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("waterwatch")


def create_app(config_class=Config):
    """Application factory for WaterWatch backend."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
    )

    # Register blueprints
    app.register_blueprint(api_bp)

    # Custom JSON error handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"status": "error", "error": "Resource not found"}), 404

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({"status": "error", "error": "Bad request"}), 400

    @app.errorhandler(500)
    def handle_server_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"status": "error", "error": "Internal server error"}), 500

    # Ensure tables exist and seed database
    with app.app_context():
        db.create_all()
        seed_database(app)

        # Start simulated nodes background feeder if enabled and not in test mode
        if app.config.get("SIMULATOR_ENABLED", True) and not app.config.get("TESTING", False):
            interval = app.config.get("SIMULATOR_INTERVAL_SECONDS", 4)
            start_simulator(app, interval=interval)

        # Initialize optional MQTT client
        if app.config.get("MQTT_ENABLED", False) and not app.config.get("TESTING", False):
            init_mqtt(app)

    return app


# Root application instance for WSGI/development servers
app = create_app()

if __name__ == "__main__":

    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting WaterWatch backend on http://{host}:{port}")
    # Development runner; debug is set to False for safety
    app.run(host=host, port=port, debug=False)
