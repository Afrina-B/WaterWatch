from datetime import datetime, timezone
from backend.models import Alert
from backend.database import db


THRESHOLDS = {
    "ph": {
        "normal": (6.5, 8.5),
        "warning_low": (6.0, 6.5),
        "warning_high": (8.5, 9.0),
        "critical_low": 6.0,
        "critical_high": 9.0,
        "unit": "pH",
        "threshold_text": "Normal range: 6.50 - 8.50 pH (WHO standard)",
    },
    "turbidity": {
        "normal": 5.0,
        "warning": 10.0,
        "unit": "NTU",
        "threshold_text": "Screening limit: <= 5.0 NTU (Warning > 5.0, Critical > 10.0 NTU)",
    },
    "tds": {
        "normal": 500.0,
        "warning": 1000.0,
        "unit": "ppm",
        "threshold_text": "Screening limit: <= 500 ppm (Warning > 500, Critical > 1000 ppm)",
    },
    "temperature": {
        "normal": 30.0,
        "warning": 35.0,
        "unit": "°C",
        "threshold_text": "Screening limit: <= 30.0 °C (Warning > 30.0, Critical > 35.0 °C)",
    },
}


def classify_parameter(parameter: str, value: float) -> str:
    """Classifies a parameter value as 'normal', 'warning', or 'critical'."""
    if value is None:
        return "critical"
    
    if parameter == "ph":
        if value < 0 or value > 14:
            return "critical"
        if 6.5 <= value <= 8.5:
            return "normal"
        if (6.0 <= value < 6.5) or (8.5 < value <= 9.0):
            return "warning"
        return "critical"

    if parameter == "turbidity":
        if value < 0:
            return "critical"
        if value <= 5.0:
            return "normal"
        if value <= 10.0:
            return "warning"
        return "critical"

    if parameter == "tds":
        if value < 0:
            return "critical"
        if value <= 500.0:
            return "normal"
        if value <= 1000.0:
            return "warning"
        return "critical"

    if parameter == "temperature":
        if value <= 30.0:
            return "normal"
        if value <= 35.0:
            return "warning"
        return "critical"

    return "normal"


def evaluate_reading_thresholds(reading):
    """
    Evaluates a reading against configured thresholds.
    Deduplicates active alerts and resolves cleared alerts.
    Returns list of newly generated or updated Alert objects.
    """
    now = datetime.now(timezone.utc)
    parameters = ["ph", "turbidity", "tds"]
    if reading.temperature is not None:
        parameters.append("temperature")

    generated_alerts = []

    for param in parameters:
        val = getattr(reading, param, None)
        status = classify_parameter(param, val)
        config = THRESHOLDS.get(param, {})
        unit = config.get("unit", "")
        threshold_text = config.get("threshold_text", "")

        # Find any currently active alert for this node & parameter
        active_alert = Alert.query.filter_by(
            node_id=reading.node_id,
            parameter=param,
            status="active"
        ).order_by(Alert.created_at.desc()).first()

        if status == "normal":
            # If an alert was active and value is now normal, auto-resolve it
            if active_alert:
                active_alert.status = "resolved"
                active_alert.resolved_at = now
                active_alert.description = f"{active_alert.description} [Auto-resolved: {param.upper()} returned to normal ({val} {unit})]"
            continue

        # Breach condition: 'warning' or 'critical'
        severity = "critical" if status == "critical" else "warning"
        title = f"{reading.node_id} - {param.upper()} {severity.capitalize()} Alert"
        description = f"{param.upper()} measured at {val:.2f} {unit}, which violates screening threshold ({threshold_text})."

        if active_alert:
            # Deduplication: already active.
            # If severity escalated, update the active alert
            if active_alert.severity != severity:
                active_alert.severity = severity
                active_alert.title = title
                active_alert.description = description
                active_alert.observed_value = val
                active_alert.reading_id = reading.id
            else:
                # Update latest observed reading without creating a duplicate record
                active_alert.observed_value = val
                active_alert.reading_id = reading.id
            generated_alerts.append(active_alert)
        else:
            # Create new persistent alert
            new_alert = Alert(
                node_id=reading.node_id,
                reading_id=reading.id,
                alert_type="threshold",
                parameter=param,
                severity=severity,
                title=title,
                description=description,
                observed_value=val,
                threshold_value=threshold_text,
                status="active",
                created_at=now,
            )
            db.session.add(new_alert)
            generated_alerts.append(new_alert)

    return generated_alerts
