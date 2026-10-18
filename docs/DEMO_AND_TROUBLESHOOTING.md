# WaterWatch — Demonstration Scenarios, MQTT & Troubleshooting Guide

---

## 1. Demonstration Modes (No ESP32 Hardware Required)

WaterWatch supports zero-hardware demonstrations using two flexible mechanisms:

### Mode A: Full-Stack Demo (Recommended)
1. Start the Flask backend (`python -m backend.app`).
2. Start the React frontend (`npm run dev`).
3. The backend automatically launches a background feeder for **Node 2 (Pollution Area)** and **Node 3 (Downstream Outlet)**.
4. Telemetry is persisted directly to SQLite and screened by the backend Alert Engine.
5. In the UI, navigate to **Settings** (`/settings`):
   - Click **Normal Clean Flow**: Injects clean baseline values.
   - Click **Warning Screening Drift**: Induces slight pH drop (6.25) and elevated turbidity (7.8 NTU).
   - Click **Critical Contamination Spike**: Triggers severe chemical runoff (pH 5.20, Turbidity 18.5 NTU, TDS 1150 ppm).
6. Observe real-time KPI updates, alert triggers, and time-series line spikes on the Dashboard.

### Mode B: Standalone In-Browser Simulation
If the Python backend is stopped or unavailable:
1. Open the WaterWatch Dashboard.
2. Go to **Settings** (`/settings`).
3. Under **Active Data Transport Source**, select **In-Browser Simulator (Standalone)**.
4. The dashboard will switch to an in-memory simulation without network dependencies.

---

## 2. End-to-End Hardware Verification Checklist

When your physical ESP32 DevKit arrives:

1. **Find Laptop LAN IP Address:**
   In Windows PowerShell, run:
   ```powershell
   ipconfig
   ```
   Locate your **IPv4 Address** (e.g., `192.168.1.145`).

2. **Update Firmware Settings:**
   Open `firmware/esp32_waterwatch/config.h`:
   ```c
   #define WIFI_SSID     "Your_WiFi_Network"
   #define WIFI_PASSWORD "Your_WiFi_Password"
   #define SERVER_HOST   "192.168.1.145" // Your actual LAN IP
   #define SERVER_PORT   5000
   ```

3. **Verify Flask Backend is Listening:**
   Ensure `python -m backend.app` is running. Note that it listens on `0.0.0.0:5000`, accepting incoming Wi-Fi requests from your LAN.

4. **Verify Windows Firewall:**
   Ensure Windows Firewall allows inbound connections to Python on port 5000 for private networks.

5. **Flash the ESP32:**
   - In Arduino IDE, open `firmware/esp32_waterwatch/esp32_waterwatch.ino`.
   - Select Board: **ESP32 Dev Module**.
   - Select your USB COM port.
   - Open Serial Monitor at **115200 baud**.
   - Press the `EN` (Reset) button on the ESP32.

6. **Confirm Transmission in Serial Monitor:**
   Look for:
   ```text
   [Wi-Fi] Connected successfully! IP: 192.168.1.190
   [POST] Reading successfully transmitted to backend.
   ```

7. **Verify Database Insertion:**
   In your browser, visit `http://localhost:5000/api/readings/latest?node_id=NODE-01`.
   You will see your physical ESP32 measurements with `"source": "hardware"` and `"isHardware": true`.

8. **Verify Dashboard:**
   On `http://localhost:5173`, Node 1 will display **Online**, showing live readings from the physical sensors.

---

## 3. Optional MQTT Integration Setup (Mosquitto)

WaterWatch provides an optional Paho MQTT bridge.

### Free Local Mosquitto Broker Setup:
1. Download and install Eclipse Mosquitto from [mosquitto.org](https://mosquitto.org/download/).
2. Start Mosquitto in Windows PowerShell:
   ```powershell
   & "C:\Program Files\mosquitto\mosquitto.exe" -v
   ```
3. Enable MQTT in `backend/.env`:
   ```ini
   MQTT_ENABLED=true
   MQTT_BROKER_HOST=localhost
   MQTT_BROKER_PORT=1883
   MQTT_TOPIC_PREFIX=waterwatch
   ```
4. Telemetry published to `waterwatch/nodes/<node_id>/readings` will automatically route to the shared ingestion pipeline and persist in SQLite.

---

## 4. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **ESP32 cannot connect to Wi-Fi** | 5GHz network or incorrect credentials | ESP32 only supports **2.4GHz Wi-Fi**. Connect your laptop and ESP32 to a 2.4GHz SSID. |
| **ESP32 HTTP POST fails with timeout** | Used `localhost` or firewall blocked port 5000 | Never use `localhost` in ESP32 firmware. Use your laptop's LAN IP (`192.168.1.X`). Ensure Windows Firewall allows port 5000. |
| **Node 1 shows 'Awaiting DevKit'** | No physical readings received within 60s | Expected when physical hardware is not connected. The system deliberately does not fake physical connection. |
| **pH reading stuck near 0 or 14** | Probe BNC disconnected or dirty electrode | Ensure BNC connector is tightened. Check potentiometer offset on PH-4502C module. |
| **Turbidity shows extremely high NTU in clean water** | Sensor output is inverted or voltage exceeds 3.3V | Check voltage divider scaling. Ensure optical tube is shielded from ambient indoor lighting. |
| **Backend port 5000 already in use** | Stale Python or AirPlay process | Change `PORT=5001` in `backend/.env` and update `VITE_API_URL=http://localhost:5001` in frontend `.env`. |
