import statistics
from datetime import datetime, timezone
from backend.models import Alert, Reading
from backend.database import db

NOISE_FLOORS = {
    "ph": 0.05,
    "turbidity": 0.2,
    "tds": 5.0,
    "temperature": 0.2,
}

RATE_LIMITS = {
    "ph": 0.5,
    "turbidity": 4.0,
    "tds": 120.0,
}


def compute_median(values):
    if not values:
        return 0.0
    return statistics.median(values)


def compute_mad(values, center):
    if not values:
        return 0.0
    devs = [abs(x - center) for x in values]
    return statistics.median(devs)


def modified_z_score(val, series, noise_floor=0.1):
    if len(series) < 3:
        return 0.0
    med = compute_median(series)
    mad = compute_mad(series, med)
    spread = max(mad, noise_floor)
    return 0.6745 * (val - med) / spread


def evaluate_anomalies(reading):
    """
    Evaluates reading against historical series for statistical,
    sudden rate-of-change, multivariate, and spatial anomalies.
    Returns list of Alert objects created.
    """
    now = datetime.now(timezone.utc)
    alerts_created = []

    # Fetch last 20 readings for this node
    recent_readings = (
        Reading.query.filter_by(node_id=reading.node_id)
        .order_by(Reading.received_at.desc())
        .limit(25)
        .all()
    )

    if len(recent_readings) >= 10:
        # Check statistical outlier for pH, turbidity, tds
        for param in ["ph", "turbidity", "tds"]:
            series = [getattr(r, param) for r in recent_readings if getattr(r, param) is not None]
            if len(series) >= 10:
                cur_val = getattr(reading, param)
                z = modified_z_score(cur_val, series, NOISE_FLOORS.get(param, 0.1))
                if abs(z) > 3.5:
                    # Check if active anomaly alert already exists
                    existing = Alert.query.filter_by(
                        node_id=reading.node_id,
                        parameter=param,
                        alert_type="anomaly",
                        status="active"
                    ).first()
                    if not existing:
                        med = compute_median(series)
                        alert = Alert(
                            node_id=reading.node_id,
                            reading_id=reading.id,
                            alert_type="anomaly",
                            parameter=param,
                            severity="warning",
                            title=f"{reading.node_id} - Statistical Anomaly ({param.upper()})",
                            description=(
                                f"{param.upper()} ({cur_val}) deviates significantly ({abs(z):.1f} MAD std devs) "
                                f"from node baseline median ({med:.2f})."
                            ),
                            observed_value=cur_val,
                            threshold_value=f"Z-Score > 3.5 (observed {z:.1f})",
                            status="active",
                            created_at=now,
                        )
                        db.session.add(alert)
                        alerts_created.append(alert)

    # Check sudden rate of change over last 3 readings
    if len(recent_readings) >= 3:
        for param, limit in RATE_LIMITS.items():
            prev = getattr(recent_readings[1], param, None) if len(recent_readings) > 1 else None
            curr = getattr(reading, param, None)
            if prev is not None and curr is not None:
                delta = abs(curr - prev)
                if delta > limit:
                    existing = Alert.query.filter_by(
                        node_id=reading.node_id,
                        parameter=param,
                        alert_type="anomaly",
                        status="active"
                    ).first()
                    if not existing:
                        alert = Alert(
                            node_id=reading.node_id,
                            reading_id=reading.id,
                            alert_type="anomaly",
                            parameter=param,
                            severity="warning",
                            title=f"{reading.node_id} - Sudden Rapid Shift ({param.upper()})",
                            description=f"{param.upper()} shifted abruptly by {delta:.2f} within consecutive readings (limit: {limit}).",
                            observed_value=curr,
                            threshold_value=f"Delta > {limit}",
                            status="active",
                            created_at=now,
                        )
                        db.session.add(alert)
                        alerts_created.append(alert)

    # Multivariate check: pH dropping while Turbidity rising
    if reading.turbidity is not None and reading.ph is not None:
        if reading.turbidity > 8.0 and reading.ph < 6.4:
            existing = Alert.query.filter_by(
                node_id=reading.node_id,
                parameter="turbidity",
                alert_type="anomaly",
                title=f"{reading.node_id} - Multivariate Contamination Signal",
                status="active"
            ).first()
            if not existing:
                alert = Alert(
                    node_id=reading.node_id,
                    reading_id=reading.id,
                    alert_type="anomaly",
                    parameter="turbidity",
                    severity="critical",
                    title=f"{reading.node_id} - Multivariate Contamination Signal",
                    description=(
                        f"Simultaneous elevated turbidity ({reading.turbidity:.1f} NTU) and depressed pH ({reading.ph:.2f}) "
                        f"indicates probable chemical or industrial runoff signature."
                    ),
                    observed_value=reading.turbidity,
                    threshold_value="pH < 6.4 and Turbidity > 8.0 NTU",
                    status="active",
                    created_at=now,
                )
                db.session.add(alert)
                alerts_created.append(alert)

    return alerts_created
