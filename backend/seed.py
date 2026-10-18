from datetime import datetime, timezone, timedelta
import random
from backend.models import Node, Reading, Alert
from backend.database import db

INITIAL_NODES = [
    {
        "id": "NODE-01",
        "name": "Node 1 - Upstream (ESP32 DevKit)",
        "source_type": "hardware",
        "role": "Upstream Intake",
        "location": "Upstream Intake - Physical ESP32 DevKit Node",
        "latitude": 11.0183,
        "longitude": 76.9614,
    },
    {
        "id": "NODE-02",
        "name": "Node 2 - Pollution Area (Simulated)",
        "source_type": "simulated",
        "role": "Pollution Screening",
        "location": "Industrial Effluent Confluence (Software Simulated)",
        "latitude": 11.0192,
        "longitude": 76.9631,
    },
    {
        "id": "NODE-03",
        "name": "Node 3 - Downstream (Simulated)",
        "source_type": "simulated",
        "role": "Downstream Distribution",
        "location": "Community Reservoir Outlet (Software Simulated)",
        "latitude": 11.0201,
        "longitude": 76.9648,
    },
]


def seed_database(app=None):
    """
    Idempotently seeds nodes into SQLite.
    Creates initial historical readings for simulated nodes if empty.
    """
    now = datetime.now(timezone.utc)

    # 1. Ensure nodes exist
    for node_info in INITIAL_NODES:
        existing = db.session.get(Node, node_info["id"])
        if not existing:
            node = Node(
                id=node_info["id"],
                name=node_info["name"],
                source_type=node_info["source_type"],
                role=node_info["role"],
                location=node_info["location"],
                latitude=node_info["latitude"],
                longitude=node_info["longitude"],
                status="online" if node_info["source_type"] == "simulated" else "offline",
                created_at=now,
                updated_at=now,
                last_seen_at=now if node_info["source_type"] == "simulated" else None,
            )
            db.session.add(node)
    db.session.commit()

    # 2. If no readings exist, generate 24h baseline data for simulated nodes
    readings_count = Reading.query.count()
    if readings_count == 0:
        print("[WaterWatch Seeder] Populating initial baseline readings...")
        base_configs = {
            "NODE-02": {"ph": 7.1, "turbidity": 3.2, "tds": 290.0, "temp": 26.8},
            "NODE-03": {"ph": 7.3, "turbidity": 2.8, "tds": 240.0, "temp": 26.5},
        }

        # Generate readings spaced every 15 minutes for past 24 hours
        for minutes_ago in range(1440, 0, -15):
            t = now - timedelta(minutes=minutes_ago)
            for node_id, cfg in base_configs.items():
                ph_val = round(cfg["ph"] + random.uniform(-0.15, 0.15), 2)
                turb_val = round(max(0.2, cfg["turbidity"] + random.uniform(-0.4, 0.4)), 2)
                tds_val = round(cfg["tds"] + random.uniform(-10.0, 10.0), 1)
                temp_val = round(cfg["temp"] + random.uniform(-0.3, 0.3), 1)

                reading = Reading(
                    node_id=node_id,
                    device_timestamp=t,
                    received_at=t,
                    ph=ph_val,
                    turbidity=turb_val,
                    tds=tds_val,
                    temperature=temp_val,
                    source="simulated",
                    calibration_status="simulated",
                    rssi=-62.0 + random.uniform(-5, 5),
                    uptime=1000 + minutes_ago * 60,
                )
                db.session.add(reading)

        # Also add a single initial pre-deployment reference reading for NODE-01 clearly labeled as baseline
        node_1 = db.session.get(Node, "NODE-01")
        if node_1:
            baseline_reading = Reading(
                node_id="NODE-01",
                device_timestamp=now - timedelta(minutes=5),
                received_at=now - timedelta(minutes=5),
                ph=7.20,
                turbidity=2.10,
                tds=185.0,
                temperature=25.0,
                source="hardware",
                calibration_status="pre-deployment-reference",
                raw_adc_ph=2150,
                raw_adc_tds=1180,
                raw_adc_turbidity=2890,
                rssi=-55.0,
                uptime=60,
            )
            db.session.add(baseline_reading)
            node_1.last_seen_at = now - timedelta(minutes=5)
            node_1.status = "online"

        db.session.commit()
        print("[WaterWatch Seeder] Initial baseline populated successfully.")
