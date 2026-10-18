# WaterWatch — REST API Specification & Response Contracts

The WaterWatch Python Flask backend provides a RESTful API serving sensor telemetry, node health, threshold evaluation, and alert management.

**Base URL:** `http://localhost:5000/api`

---

## 1. Health & Diagnostics

### `GET /api/health`
Returns backend service availability, database status, and system uptime.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "service": "WaterWatch REST Backend",
  "version": "1.0.0",
  "uptimeSeconds": 1420,
  "database": {
    "connected": true,
    "totalNodes": 3,
    "totalReadings": 284,
    "activeAlerts": 0
  },
  "timestamp": "2026-10-18T10:00:00.000000+00:00"
}
```

---

## 2. Monitoring Nodes

### `GET /api/nodes`
Returns the list of configured monitoring nodes with their latest telemetry snapshot and online/offline status.

#### Response `200 OK`
```json
[
  {
    "id": "NODE-01",
    "name": "Node 1 - Upstream (ESP32 DevKit)",
    "sourceType": "hardware",
    "isHardware": true,
    "role": "Upstream Intake",
    "location": "Upstream Intake - Physical ESP32 DevKit Node",
    "lat": 11.0183,
    "lng": 76.9614,
    "status": "online",
    "health": "Online",
    "latestReading": {
      "id": 154,
      "nodeId": "NODE-01",
      "timestamp": 1729245600000,
      "ph": 7.35,
      "tds": 210.0,
      "turbidity": 2.10,
      "temperature": 25.0,
      "source": "hardware",
      "isHardware": true,
      "calibrationStatus": "calibrated"
    }
  },
  {
    "id": "NODE-02",
    "name": "Node 2 - Pollution Area (Simulated)",
    "sourceType": "simulated",
    "isHardware": false,
    "role": "Pollution Screening",
    "location": "Industrial Effluent Confluence (Software Simulated)",
    "lat": 11.0192,
    "lng": 76.9631,
    "status": "online",
    "health": "Online",
    "latestReading": { ... }
  }
]
```

### `GET /api/nodes/<node_id>`
Retrieves complete details, active alerts, and latest measurements for a specific node.

#### Response `200 OK`
```json
{
  "id": "NODE-01",
  "name": "Node 1 - Upstream (ESP32 DevKit)",
  "sourceType": "hardware",
  "isHardware": true,
  "location": "Upstream Intake - Physical ESP32 DevKit Node",
  "lat": 11.0183,
  "lng": 76.9614,
  "status": "online",
  "health": "Online",
  "latestReading": { ... },
  "activeAlerts": []
}
```

---

## 3. Sensor Readings & Ingestion

### `POST /api/readings`
Primary ingestion endpoint for ESP32 hardware and simulated nodes. Validates payload, verifies physical boundaries, updates node liveness, persists to SQLite, and runs threshold & anomaly evaluations.

#### Request Headers
`Content-Type: application/json`

#### Request Body
```json
{
  "node_id": "NODE-01",
  "source": "hardware",
  "calibration_status": "calibrated",
  "ph": 7.35,
  "turbidity": 2.10,
  "tds": 210.0,
  "temperature": 25.5,
  "raw_adc_ph": 2210,
  "raw_adc_tds": 1280,
  "raw_adc_turbidity": 2950,
  "rssi": -64.0,
  "uptime": 120
}
```

#### Response `201 Created`
```json
{
  "status": "success",
  "message": "Reading ingested and persisted successfully",
  "reading": {
    "id": 185,
    "nodeId": "NODE-01",
    "timestamp": 1729245640000,
    "ph": 7.35,
    "tds": 210.0,
    "turbidity": 2.10,
    "temperature": 25.5,
    "source": "hardware",
    "isHardware": true,
    "calibrationStatus": "calibrated",
    "units": {
      "ph": "pH",
      "tds": "ppm",
      "turbidity": "NTU",
      "temperature": "°C"
    }
  },
  "alerts": []
}
```

#### Error Responses
- `400 Bad Request`: Missing required fields, non-numeric sensor reading, or malformed JSON.
- `404 Not Found`: Unregistered `node_id`.
- `422 Unprocessable Entity`: Value violates physical laws (e.g. pH < 0 or > 14; negative turbidity).

---

### `GET /api/readings/latest`
Returns the latest reading for each active node. Compatible with dashboard polling adapters.

#### Query Parameters
- `node_id` (optional): Filter to a single node ID.

---

### `GET /api/readings`
Queries historical measurements across the network.

#### Query Parameters
- `node_id` (optional): Filter by node ID.
- `limit` (default: 100, max: 500): Number of rows.
- `hours` (optional): Time window in hours.

---

### `GET /api/nodes/<node_id>/readings`
Queries chronological historical readings for a specific station.

---

## 4. Alert Engine & Incidents

### `GET /api/alerts`
Lists alert records.

#### Query Parameters
- `status`: `'active'`, `'acknowledged'`, or `'resolved'`.
- `node_id`: Filter by node.
- `severity`: `'warning'` or `'critical'`.
- `limit`: Number of alerts (default: 50).

#### Response `200 OK`
```json
[
  {
    "id": "c1f7b09b-6483-490f-bdc7-872f23b2dc95",
    "nodeId": "NODE-02",
    "alertType": "threshold",
    "parameter": "turbidity",
    "severity": "critical",
    "title": "NODE-02 - TURBIDITY Critical Alert",
    "description": "TURBIDITY measured at 18.20 NTU, which violates screening threshold.",
    "observedValue": 18.2,
    "thresholdValue": "Screening limit: <= 5.0 NTU (Warning > 5.0, Critical > 10.0 NTU)",
    "status": "active",
    "startedAt": 1729245600000,
    "createdAt": "2026-10-18T10:00:00.000000+00:00"
  }
]
```

### `PATCH /api/alerts/<alert_id>`
Acknowledges or resolves an incident.

#### Request Body
```json
{
  "status": "acknowledged"
}
```

---

## 5. Summary & Trends Statistics

### `GET /api/statistics/summary`
Returns high-level KPI counts for dashboard summary badges.

#### Response `200 OK`
```json
{
  "totalNodes": 3,
  "onlineNodes": 3,
  "offlineNodes": 0,
  "hardwareNodes": 1,
  "simulatedNodes": 2,
  "activeAlerts": 1,
  "criticalAlerts": 0,
  "warningAlerts": 1,
  "readingsLast24h": 96,
  "overallStatus": "warning"
}
```

### `GET /api/statistics/trends`
Returns time-bucketed trend points for charting.
- `node_id`: Node ID (default: `'NODE-01'`)
- `hours`: Time window in hours (default: `24`)

---

## 6. Simulator Control Endpoints

### `GET /api/simulator/status`
Returns background simulator feeder status and active scenario.

### `POST /api/simulator/scenario`
Injects demonstration test scenario.
```json
{
  "scenario": "critical"
}
```
*Options:* `"normal"`, `"warning"`, `"critical"`.
