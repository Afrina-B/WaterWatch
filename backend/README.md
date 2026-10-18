# WaterWatch — Backend REST Architecture & Ingestion Service

Modular Python Flask backend with SQLAlchemy persistence, automated threshold screening, anomaly detection, and optional MQTT bridging.

---

## Architecture Overview

```text
backend/
├── app.py                  # Application factory (Flask, CORS, DB, routes)
├── config.py               # Environment configuration (SQLite, CORS, MQTT)
├── database.py             # SQLAlchemy instance
├── models.py               # Node, Reading, and Alert database entities
├── routes/
│   ├── __init__.py
│   └── api.py              # REST API endpoints (/api/readings, /api/nodes, /api/alerts)
├── services/
│   ├── __init__.py
│   ├── ingestion.py        # Ingestion pipeline, schema validation, separation rules
│   ├── threshold_engine.py # Screening thresholds, alert lifecycle & deduplication
│   ├── anomaly_engine.py   # Statistical (MAD Z-Score), sudden shift, multivariate detection
│   ├── simulator.py        # Simulated feeder for Node 2 & Node 3
│   └── mqtt_service.py     # Optional Paho MQTT client
├── seed.py                 # Idempotent database seeder
├── requirements.txt        # Python dependency declarations
└── .env.example            # Environment variables template
```

---

## Running the Backend

### 1. Install Dependencies
```powershell
python -m pip install -r backend/requirements.txt
```

### 2. Run Test Suite
```powershell
python -m pytest tests/
```

### 3. Start Development Server
```powershell
python -m backend.app
```
Backend will listen at `http://0.0.0.0:5000`.
Health endpoint: `http://localhost:5000/api/health`.
