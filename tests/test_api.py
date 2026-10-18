import json
import pytest
from backend.models import Node, Reading, Alert


def test_health_endpoint(client):
    """Verify health endpoint returns 200 and healthy database status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "WaterWatch REST Backend"
    assert data["database"]["connected"] is True
    assert data["database"]["totalNodes"] == 3


def test_database_initialization_and_nodes(client):
    """Verify nodes are seeded correctly with Node 1 physical and Nodes 2 & 3 simulated."""
    response = client.get("/api/nodes")
    assert response.status_code == 200
    nodes = response.get_json()
    assert len(nodes) == 3

    node_map = {n["id"]: n for n in nodes}
    assert "NODE-01" in node_map
    assert "NODE-02" in node_map
    assert "NODE-03" in node_map

    # Node 1 must be physical hardware
    assert node_map["NODE-01"]["isHardware"] is True
    assert node_map["NODE-01"]["sourceType"] == "hardware"

    # Nodes 2 & 3 must be simulated
    assert node_map["NODE-02"]["isHardware"] is False
    assert node_map["NODE-02"]["sourceType"] == "simulated"
    assert node_map["NODE-03"]["isHardware"] is False
    assert node_map["NODE-03"]["sourceType"] == "simulated"


def test_node_detail_endpoint(client):
    """Test retrieving node detail and handling 404 for missing node."""
    res = client.get("/api/nodes/NODE-01")
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == "NODE-01"
    assert data["sourceType"] == "hardware"

    res404 = client.get("/api/nodes/NON_EXISTENT")
    assert res404.status_code == 404


def test_valid_reading_ingestion(client):
    """Test POST /api/readings with valid payload from physical ESP32 node."""
    payload = {
        "node_id": "NODE-01",
        "ph": 7.35,
        "turbidity": 2.10,
        "tds": 210.0,
        "temperature": 25.5,
        "source": "hardware",
        "calibration_status": "calibrated",
        "raw_adc_ph": 2210,
        "raw_adc_tds": 1280,
        "raw_adc_turbidity": 2950,
        "rssi": -64.0,
        "uptime": 120,
    }
    response = client.post("/api/readings", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data["status"] == "success"
    reading = data["reading"]
    assert reading["nodeId"] == "NODE-01"
    assert reading["ph"] == 7.35
    assert reading["turbidity"] == 2.10
    assert reading["tds"] == 210.0
    assert reading["isHardware"] is True
    assert reading["source"] == "hardware"

    # Verify node is marked online
    node_res = client.get("/api/nodes/NODE-01")
    assert node_res.get_json()["status"] == "online"


def test_invalid_readings_and_node_ids(client):
    """Test rejection of non-existent nodes, missing fields, and out-of-range sensor values."""
    # 1. Non-existent node ID
    res = client.post("/api/readings", json={"node_id": "UNKNOWN", "ph": 7.0, "turbidity": 1.0, "tds": 200.0})
    assert res.status_code == 404

    # 2. Missing required sensor measurement (tds missing)
    res = client.post("/api/readings", json={"node_id": "NODE-01", "ph": 7.0, "turbidity": 1.0})
    assert res.status_code == 400

    # 3. Non-numeric sensor value
    res = client.post("/api/readings", json={"node_id": "NODE-01", "ph": "invalid_ph", "turbidity": 1.0, "tds": 200.0})
    assert res.status_code == 400

    # 4. Out of physical pH range (e.g. 15.5)
    res = client.post("/api/readings", json={"node_id": "NODE-01", "ph": 15.5, "turbidity": 1.0, "tds": 200.0})
    assert res.status_code == 422

    # 5. Negative turbidity
    res = client.post("/api/readings", json={"node_id": "NODE-01", "ph": 7.0, "turbidity": -2.0, "tds": 200.0})
    assert res.status_code == 422


def test_latest_and_historical_readings(client):
    """Test querying latest readings and chronological historical readings."""
    # Ingest 2 distinct readings
    client.post("/api/readings", json={"node_id": "NODE-01", "ph": 7.20, "turbidity": 2.0, "tds": 180.0})
    client.post("/api/readings", json={"node_id": "NODE-01", "ph": 7.25, "turbidity": 2.2, "tds": 185.0})

    # Latest readings endpoint
    res_latest = client.get("/api/readings/latest?node_id=NODE-01")
    assert res_latest.status_code == 200
    latest_data = res_latest.get_json()
    assert len(latest_data) >= 1
    assert latest_data[0]["ph"] == 7.25

    # Node readings endpoint
    res_history = client.get("/api/nodes/NODE-01/readings?limit=10")
    assert res_history.status_code == 200
    history_data = res_history.get_json()
    assert len(history_data) >= 2


def test_threshold_alert_creation_and_deduplication(client):
    """Verify threshold breaches create alerts and repeated readings do not create duplicate spam."""
    # Ingest critical pH reading (5.2 is < 6.0 critical threshold)
    payload = {"node_id": "NODE-02", "ph": 5.20, "turbidity": 3.0, "tds": 250.0}
    res1 = client.post("/api/readings", json=payload)
    assert res1.status_code == 201
    alerts1 = res1.get_json()["alerts"]
    assert len(alerts1) > 0
    assert any(a["parameter"] == "ph" and a["severity"] == "critical" for a in alerts1)

    # Ingest another violation reading for the same parameter
    payload2 = {"node_id": "NODE-02", "ph": 5.10, "turbidity": 3.1, "tds": 255.0}
    res2 = client.post("/api/readings", json=payload2)
    assert res2.status_code == 201

    # Check alerts list: should only have ONE active threshold alert for NODE-02 pH
    res_alerts = client.get("/api/alerts?node_id=NODE-02&status=active")
    active_alerts = res_alerts.get_json()
    ph_threshold_active = [a for a in active_alerts if a["parameter"] == "ph" and a["alertType"] == "threshold"]
    assert len(ph_threshold_active) == 1, "Threshold alert deduplication failed: multiple active threshold alerts found"

    ph_anomaly_active = [a for a in active_alerts if a["parameter"] == "ph" and a["alertType"] == "anomaly"]
    assert len(ph_anomaly_active) <= 1, "Anomaly alert deduplication failed: multiple active anomaly alerts found"



def test_alert_patch_status(client):
    """Test acknowledging and resolving an alert via PATCH /api/alerts/<id>."""
    # Create violation
    client.post("/api/readings", json={"node_id": "NODE-02", "ph": 5.0, "turbidity": 3.0, "tds": 200.0})
    res_alerts = client.get("/api/alerts?node_id=NODE-02&status=active")
    alerts = res_alerts.get_json()
    assert len(alerts) > 0
    alert_id = alerts[0]["id"]

    # PATCH acknowledge
    patch_res = client.patch(f"/api/alerts/{alert_id}", json={"status": "acknowledged"})
    assert patch_res.status_code == 200
    assert patch_res.get_json()["alert"]["status"] == "acknowledged"

    # PATCH resolve
    patch_res2 = client.patch(f"/api/alerts/{alert_id}", json={"status": "resolved"})
    assert patch_res2.status_code == 200
    assert patch_res2.get_json()["alert"]["status"] == "resolved"


def test_statistics_endpoints(client):
    """Verify statistics summary and trends endpoints."""
    res_summary = client.get("/api/statistics/summary")
    assert res_summary.status_code == 200
    summary = res_summary.get_json()
    assert "totalNodes" in summary
    assert "hardwareNodes" in summary
    assert "simulatedNodes" in summary
    assert "activeAlerts" in summary
    assert summary["hardwareNodes"] == 1
    assert summary["simulatedNodes"] == 2

    res_trends = client.get("/api/statistics/trends?node_id=NODE-01&hours=24")
    assert res_trends.status_code == 200
    trends = res_trends.get_json()
    assert trends["nodeId"] == "NODE-01"
    assert "data" in trends


def test_hardware_vs_simulator_separation(client):
    """
    Verify that Node 1 is strictly hardware and Nodes 2 & 3 are strictly simulated.
    Even if an incoming payload attempts to mark Node 2 as 'hardware', it must be enforced as 'simulated'.
    """
    # Attempt to spoof hardware on Node 2
    spoofed_payload = {
        "node_id": "NODE-02",
        "ph": 7.2,
        "turbidity": 2.5,
        "tds": 280.0,
        "source": "hardware",  # invalid claim for Node 2
    }
    res = client.post("/api/readings", json=spoofed_payload)
    assert res.status_code == 201
    reading = res.get_json()["reading"]
    assert reading["source"] == "simulated", "Simulator separation failed: Node 2 was allowed to claim hardware source"
    assert reading["isHardware"] is False
