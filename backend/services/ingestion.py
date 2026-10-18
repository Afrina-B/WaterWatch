from datetime import datetime, timezone
from backend.models import Node, Reading, Alert
from backend.database import db
from backend.services.threshold_engine import evaluate_reading_thresholds
from backend.services.anomaly_engine import evaluate_anomalies


class IngestionError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def validate_reading_payload(payload):
    """
    Validates incoming reading payload.
    Supports both camelCase and snake_case field names.
    """
    if not isinstance(payload, dict):
        raise IngestionError("Payload must be a JSON object", 400)

    node_id = payload.get("node_id") or payload.get("nodeId")
    if not node_id or not isinstance(node_id, str):
        raise IngestionError("Missing or invalid 'node_id'", 400)

    node_id = node_id.strip()

    # Extract required numeric sensor values
    fields = ["ph", "turbidity", "tds"]
    extracted = {}
    for f in fields:
        val = payload.get(f)
        if val is None:
            raise IngestionError(f"Missing required sensor measurement: '{f}'", 400)
        try:
            extracted[f] = float(val)
        except (ValueError, TypeError):
            raise IngestionError(f"Field '{f}' must be a numeric value, received: {val}", 400)

    # Optional temperature
    temp_val = payload.get("temperature") or payload.get("temp")
    if temp_val is not None:
        try:
            extracted["temperature"] = float(temp_val)
        except (ValueError, TypeError):
            extracted["temperature"] = 25.0
    else:
        extracted["temperature"] = 25.0

    # Sensor physical bounds check
    if extracted["ph"] < 0 or extracted["ph"] > 14:
        raise IngestionError(f"pH value {extracted['ph']} is outside physical range [0, 14]", 422)

    if extracted["turbidity"] < 0:
        raise IngestionError(f"Turbidity value {extracted['turbidity']} cannot be negative", 422)

    if extracted["tds"] < 0:
        raise IngestionError(f"TDS value {extracted['tds']} cannot be negative", 422)

    # Device timestamp (epoch ms or ISO string)
    device_ts = payload.get("timestamp") or payload.get("device_timestamp")
    parsed_device_ts = None
    if device_ts is not None:
        try:
            if isinstance(device_ts, (int, float)):
                # If milliseconds (e.g. > 1e11), convert from ms
                if device_ts > 1e11:
                    parsed_device_ts = datetime.fromtimestamp(device_ts / 1000.0, tz=timezone.utc)
                else:
                    parsed_device_ts = datetime.fromtimestamp(device_ts, tz=timezone.utc)
            elif isinstance(device_ts, str):
                parsed_device_ts = datetime.fromisoformat(device_ts.replace("Z", "+00:00"))
        except Exception:
            parsed_device_ts = None

    # Metadata & raw ADC diagnostics
    source = payload.get("source")
    calibration_status = payload.get("calibration_status") or payload.get("calibrationStatus") or "calibrated"
    raw_adc_ph = payload.get("raw_adc_ph") or payload.get("rawAdc", {}).get("ph") if isinstance(payload.get("rawAdc"), dict) else None
    raw_adc_tds = payload.get("raw_adc_tds") or payload.get("rawAdc", {}).get("tds") if isinstance(payload.get("rawAdc"), dict) else None
    raw_adc_turbidity = payload.get("raw_adc_turbidity") or payload.get("rawAdc", {}).get("turbidity") if isinstance(payload.get("rawAdc"), dict) else None
    rssi = payload.get("rssi")
    uptime = payload.get("uptime")

    return {
        "node_id": node_id,
        "ph": extracted["ph"],
        "turbidity": extracted["turbidity"],
        "tds": extracted["tds"],
        "temperature": extracted["temperature"],
        "device_timestamp": parsed_device_ts,
        "source": source,
        "calibration_status": calibration_status,
        "raw_adc_ph": int(raw_adc_ph) if raw_adc_ph is not None else None,
        "raw_adc_tds": int(raw_adc_tds) if raw_adc_tds is not None else None,
        "raw_adc_turbidity": int(raw_adc_turbidity) if raw_adc_turbidity is not None else None,
        "rssi": float(rssi) if rssi is not None else None,
        "uptime": int(uptime) if uptime is not None else None,
    }


def ingest_reading(payload):
    """
    Ingests, validates, persists a reading, updates node status,
    and runs threshold and anomaly evaluations.
    """
    data = validate_reading_payload(payload)
    node_id = data["node_id"]

    # Verify node exists
    node = db.session.get(Node, node_id)
    if not node:
        raise IngestionError(f"Node '{node_id}' is not registered in the system", 404)

    # Strictly enforce hardware vs simulator separation
    if node.id == "NODE-01":
        # Node 1 is the physical ESP32 node.
        # If payload source is not specified or says hardware, mark hardware
        final_source = "hardware" if data["source"] in (None, "hardware", "esp32") else data["source"]
    else:
        # Nodes 2 and 3 are simulated nodes.
        # Even if a payload erroneously claims 'hardware', enforce 'simulated'
        final_source = "simulated"

    now = datetime.now(timezone.utc)

    reading = Reading(
        node_id=node.id,
        device_timestamp=data["device_timestamp"],
        received_at=now,
        ph=data["ph"],
        turbidity=data["turbidity"],
        tds=data["tds"],
        temperature=data["temperature"],
        source=final_source,
        calibration_status=data["calibration_status"],
        raw_adc_ph=data["raw_adc_ph"],
        raw_adc_tds=data["raw_adc_tds"],
        raw_adc_turbidity=data["raw_adc_turbidity"],
        rssi=data["rssi"],
        uptime=data["uptime"],
    )

    db.session.add(reading)
    db.session.flush()  # populate reading.id

    # Update node last seen and status
    node.last_seen_at = now
    node.status = "online"
    node.updated_at = now

    # Run Threshold Evaluation
    threshold_alerts = evaluate_reading_thresholds(reading)

    # Run Anomaly Detection
    anomaly_alerts = evaluate_anomalies(reading)

    db.session.commit()

    return {
        "reading": reading.to_dict(),
        "alertsTriggered": [a.to_dict() for a in (threshold_alerts + anomaly_alerts)],
    }
