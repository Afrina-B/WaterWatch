from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from backend.models import Node, Reading, Alert
from backend.database import db
from backend.services.ingestion import ingest_reading, IngestionError

api_bp = Blueprint("api", __name__, url_prefix="/api")

START_TIME = datetime.now(timezone.utc)


def check_node_liveness(node):
    """Computes whether a node is online, stale, or offline."""
    if not node.last_seen_at:
        return "offline"
    now = datetime.now(timezone.utc)
    # Ensure timezone aware
    last_seen = node.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    diff = (now - last_seen).total_seconds()
    if diff > 60:
        return "offline"
    elif diff > 20:
        return "stale"
    return "online"


@api_bp.route("/health", methods=["GET"])
def health_check():
    """Health status and diagnostic endpoint."""
    now = datetime.now(timezone.utc)
    uptime_sec = int((now - START_TIME).total_seconds())

    # Check database query
    db_ok = True
    try:
        total_nodes = Node.query.count()
        total_readings = Reading.query.count()
        active_alerts = Alert.query.filter_by(status="active").count()
    except Exception as e:
        db_ok = False
        total_nodes = 0
        total_readings = 0
        active_alerts = 0

    return jsonify({
        "status": "healthy" if db_ok else "degraded",
        "service": "WaterWatch REST Backend",
        "version": "1.0.0",
        "uptimeSeconds": uptime_sec,
        "database": {
            "connected": db_ok,
            "totalNodes": total_nodes,
            "totalReadings": total_readings,
            "activeAlerts": active_alerts,
        },
        "timestamp": now.isoformat(),
    }), 200 if db_ok else 503


@api_bp.route("/nodes", methods=["GET"])
def list_nodes():
    """List all configured monitoring nodes with their latest readings and health."""
    nodes = Node.query.all()
    results = []
    for node in nodes:
        computed_health = check_node_liveness(node)
        # Update if changed
        if node.status != computed_health:
            node.status = computed_health
            db.session.commit()

        node_dict = node.to_dict()
        latest_reading = (
            Reading.query.filter_by(node_id=node.id)
            .order_by(Reading.received_at.desc())
            .first()
        )
        node_dict["latestReading"] = latest_reading.to_dict() if latest_reading else None
        node_dict["health"] = computed_health.capitalize()
        results.append(node_dict)

    return jsonify(results), 200


@api_bp.route("/nodes/<node_id>", methods=["GET"])
def get_node(node_id):
    """Retrieve details for a specific node."""
    node = db.session.get(Node, node_id)
    if not node:
        return jsonify({"error": f"Node '{node_id}' not found"}), 404

    computed_health = check_node_liveness(node)
    node_dict = node.to_dict()
    node_dict["health"] = computed_health.capitalize()
    
    latest_reading = (
        Reading.query.filter_by(node_id=node.id)
        .order_by(Reading.received_at.desc())
        .first()
    )
    node_dict["latestReading"] = latest_reading.to_dict() if latest_reading else None
    
    active_alerts = Alert.query.filter_by(node_id=node.id, status="active").all()
    node_dict["activeAlerts"] = [a.to_dict() for a in active_alerts]

    return jsonify(node_dict), 200


@api_bp.route("/readings/latest", methods=["GET"])
def get_latest_readings():
    """
    Returns the latest reading for each node.
    Compatible with frontend polling adapter.
    """
    node_id_filter = request.args.get("node_id") or request.args.get("nodeId")
    
    if node_id_filter:
        reading = (
            Reading.query.filter_by(node_id=node_id_filter)
            .order_by(Reading.received_at.desc())
            .first()
        )
        if not reading:
            return jsonify([]), 200
        return jsonify([reading.to_dict()]), 200

    # For each node, find its latest reading
    nodes = Node.query.all()
    latest_list = []
    for node in nodes:
        reading = (
            Reading.query.filter_by(node_id=node.id)
            .order_by(Reading.received_at.desc())
            .first()
        )
        if reading:
            latest_list.append(reading.to_dict())

    return jsonify(latest_list), 200


@api_bp.route("/readings", methods=["GET"])
def list_readings():
    """
    Query historical readings with filtering by node_id, time window, limit.
    """
    node_id = request.args.get("node_id") or request.args.get("nodeId")
    limit = min(int(request.args.get("limit", 100)), 500)
    hours = request.args.get("hours", type=float)

    query = Reading.query
    if node_id:
        query = query.filter_by(node_id=node_id)
    if hours:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = query.filter(Reading.received_at >= since)

    readings = query.order_by(Reading.received_at.desc()).limit(limit).all()
    # Reverse to return chronological order
    readings.reverse()
    return jsonify([r.to_dict() for r in readings]), 200


@api_bp.route("/nodes/<node_id>/readings", methods=["GET"])
def get_node_readings(node_id):
    """Get chronological readings for a specific node."""
    node = db.session.get(Node, node_id)
    if not node:
        return jsonify({"error": f"Node '{node_id}' not found"}), 404

    limit = min(int(request.args.get("limit", 100)), 500)
    hours = request.args.get("hours", type=float)

    query = Reading.query.filter_by(node_id=node_id)
    if hours:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = query.filter(Reading.received_at >= since)

    readings = query.order_by(Reading.received_at.desc()).limit(limit).all()
    readings.reverse()
    return jsonify([r.to_dict() for r in readings]), 200


@api_bp.route("/readings", methods=["POST"])
def post_reading():
    """
    Primary ingestion endpoint for ESP32 hardware and simulator nodes.
    Validates payload, enforces hardware/simulated status, persists to SQLite,
    evaluates thresholds and alerts.
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid or missing JSON payload in request body"}), 400

    try:
        result = ingest_reading(payload)
        return jsonify({
            "status": "success",
            "message": "Reading ingested and persisted successfully",
            "reading": result["reading"],
            "alerts": result["alertsTriggered"],
        }), 201
    except IngestionError as e:
        return jsonify({"status": "error", "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "error": f"Server ingestion failure: {str(e)}"}), 500


@api_bp.route("/alerts", methods=["GET"])
def list_alerts():
    """List alerts with filtering by status, node_id, severity, limit."""
    status = request.args.get("status")
    node_id = request.args.get("node_id") or request.args.get("nodeId")
    severity = request.args.get("severity")
    limit = min(int(request.args.get("limit", 50)), 200)

    query = Alert.query
    if status:
        query = query.filter_by(status=status)
    if node_id:
        query = query.filter_by(node_id=node_id)
    if severity:
        query = query.filter_by(severity=severity)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    return jsonify([a.to_dict() for a in alerts]), 200


@api_bp.route("/alerts/<alert_id>", methods=["GET"])
def get_alert(alert_id):
    """Retrieve details for a single alert."""
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({"error": f"Alert '{alert_id}' not found"}), 404
    return jsonify(alert.to_dict()), 200


@api_bp.route("/alerts/<alert_id>", methods=["PATCH"])
def patch_alert(alert_id):
    """
    Update alert status ('acknowledged' or 'resolved').
    """
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({"error": f"Alert '{alert_id}' not found"}), 404

    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")
    if new_status not in ("active", "acknowledged", "resolved"):
        return jsonify({
            "error": "Invalid status. Allowed values: 'active', 'acknowledged', 'resolved'"
        }), 400

    now = datetime.now(timezone.utc)
    alert.status = new_status
    if new_status == "acknowledged":
        alert.acknowledged_at = now
    elif new_status == "resolved":
        alert.resolved_at = now

    db.session.commit()
    return jsonify({
        "status": "success",
        "message": f"Alert '{alert_id}' marked as {new_status}",
        "alert": alert.to_dict(),
    }), 200


@api_bp.route("/statistics/summary", methods=["GET"])
def statistics_summary():
    """Aggregate KPI statistics for dashboard summary cards."""
    nodes = Node.query.all()
    now = datetime.now(timezone.utc)
    
    online_count = 0
    hardware_count = 0
    simulated_count = 0

    for node in nodes:
        if node.source_type == "hardware":
            hardware_count += 1
        else:
            simulated_count += 1
        if check_node_liveness(node) == "online":
            online_count += 1

    active_alerts = Alert.query.filter_by(status="active").all()
    critical_alerts = sum(1 for a in active_alerts if a.severity == "critical")
    warning_alerts = sum(1 for a in active_alerts if a.severity == "warning")

    # Read readings from last 24h
    since_24h = now - timedelta(hours=24)
    readings_24h = Reading.query.filter(Reading.received_at >= since_24h).count()

    overall_status = "normal"
    if critical_alerts > 0:
        overall_status = "critical"
    elif warning_alerts > 0:
        overall_status = "warning"

    return jsonify({
        "totalNodes": len(nodes),
        "onlineNodes": online_count,
        "offlineNodes": len(nodes) - online_count,
        "hardwareNodes": hardware_count,
        "simulatedNodes": simulated_count,
        "activeAlerts": len(active_alerts),
        "criticalAlerts": critical_alerts,
        "warningAlerts": warning_alerts,
        "readingsLast24h": readings_24h,
        "overallStatus": overall_status,
        "timestamp": now.isoformat(),
    }), 200


@api_bp.route("/statistics/trends", methods=["GET"])
def statistics_trends():
    """
    Returns time-bucketed trend points for analytics.
    """
    node_id = request.args.get("node_id") or "NODE-01"
    hours = request.args.get("hours", default=24, type=float)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    readings = (
        Reading.query.filter(Reading.node_id == node_id, Reading.received_at >= since)
        .order_by(Reading.received_at.asc())
        .all()
    )

    data_points = []
    for r in readings:
        data_points.append({
            "timestamp": int(r.received_at.timestamp() * 1000),
            "isoTimestamp": r.received_at.isoformat(),
            "ph": r.ph,
            "tds": r.tds,
            "turbidity": r.turbidity,
            "temperature": r.temperature,
        })

    return jsonify({
        "nodeId": node_id,
        "hours": hours,
        "count": len(data_points),
        "data": data_points,
    }), 200


@api_bp.route("/simulator/status", methods=["GET"])
def get_sim_status():
    """Get current background simulator status and scenario."""
    from backend.services.simulator import get_simulator_status
    return jsonify(get_simulator_status()), 200


@api_bp.route("/simulator/scenario", methods=["POST"])
def set_sim_scenario():
    """Inject scenario into simulated nodes (normal, warning, critical)."""
    from backend.services.simulator import set_simulator_scenario
    payload = request.get_json(silent=True) or {}
    scenario = payload.get("scenario", "normal")
    success = set_simulator_scenario(scenario)
    if not success:
        return jsonify({"error": "Invalid scenario. Choose 'normal', 'warning', or 'critical'"}), 400
    return jsonify({"status": "success", "scenario": scenario}), 200

