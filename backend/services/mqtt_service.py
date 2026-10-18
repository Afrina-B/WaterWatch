import json
import logging
from backend.services.ingestion import ingest_reading

logger = logging.getLogger("waterwatch.mqtt")

try:
    import paho.mqtt.client as mqtt
    PAHO_AVAILABLE = True
except ImportError:
    PAHO_AVAILABLE = False
    logger.warning("paho-mqtt is not installed. MQTT client will remain disabled.")

_mqtt_client = None


def init_mqtt(app):
    """Initializes the optional Paho MQTT client if enabled in configuration."""
    global _mqtt_client
    
    if not PAHO_AVAILABLE or not app.config.get("MQTT_ENABLED", False):
        logger.info("MQTT integration is disabled or Paho MQTT is unavailable.")
        return None

    broker_host = app.config.get("MQTT_BROKER_HOST", "broker.hivemq.com")
    broker_port = app.config.get("MQTT_BROKER_PORT", 1883)
    prefix = app.config.get("MQTT_TOPIC_PREFIX", "waterwatch")

    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            logger.info(f"Connected to MQTT broker at {broker_host}:{broker_port}")
            topic = f"{prefix}/nodes/+/readings"
            client.subscribe(topic)
            logger.info(f"Subscribed to MQTT topic: {topic}")
        else:
            logger.warning(f"Failed to connect to MQTT broker, return code: {rc}")

    def on_message(client, userdata, msg):
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)
            # If nodeId is not in payload, parse from topic: waterwatch/nodes/<nodeId>/readings
            if "node_id" not in data and "nodeId" not in data:
                parts = msg.topic.split("/")
                if len(parts) >= 3:
                    data["node_id"] = parts[2]

            with app.app_context():
                ingest_reading(data)
                logger.debug(f"Ingested MQTT reading from topic {msg.topic}")
        except Exception as e:
            logger.error(f"Error handling MQTT message on topic {msg.topic}: {e}")

    try:
        # Paho MQTT 2.x callback API version compatibility
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="waterwatch-backend-server")
        except AttributeError:
            client = mqtt.Client(client_id="waterwatch-backend-server")

        client.on_connect = on_connect
        client.on_message = on_message
        client.connect_async(broker_host, broker_port, keepalive=60)
        client.loop_start()
        _mqtt_client = client
        logger.info(f"Started MQTT background client for {broker_host}:{broker_port}")
        return client
    except Exception as e:
        logger.warning(f"Could not connect to MQTT broker ({broker_host}:{broker_port}): {e}")
        return None


def stop_mqtt():
    """Stops the MQTT client loop."""
    global _mqtt_client
    if _mqtt_client:
        try:
            _mqtt_client.loop_stop()
            _mqtt_client.disconnect()
            _mqtt_client = None
        except Exception as e:
            logger.warning(f"Error stopping MQTT client: {e}")
