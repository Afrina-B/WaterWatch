import time
import threading
import random
import logging
from datetime import datetime, timezone
from backend.services.ingestion import ingest_reading

logger = logging.getLogger("waterwatch.simulator")

# Simulated nodes state
SIMULATOR_STATE = {
    "running": False,
    "scenario": "normal",  # 'normal', 'warning', 'critical'
    "thread": None,
    "interval": 4,  # seconds
}

BASELINES = {
    "NODE-02": {"ph": 7.10, "turbidity": 3.2, "tds": 290.0, "temp": 26.5},
    "NODE-03": {"ph": 7.35, "turbidity": 2.5, "tds": 240.0, "temp": 26.2},
}


def _simulation_loop(app):
    """Background worker that pushes simulated readings through ingest_reading."""
    logger.info("WaterWatch Node 2 & 3 Simulator background thread started.")
    
    while SIMULATOR_STATE["running"]:
        try:
            with app.app_context():
                scenario = SIMULATOR_STATE["scenario"]
                
                for node_id, base in BASELINES.items():
                    if scenario == "critical" and node_id == "NODE-02":
                        # Severe industrial contamination spike
                        ph = round(5.2 + random.uniform(-0.2, 0.2), 2)
                        turbidity = round(18.5 + random.uniform(-1.5, 1.5), 2)
                        tds = round(1150.0 + random.uniform(-40.0, 40.0), 1)
                    elif scenario == "warning" and node_id == "NODE-02":
                        # Moderate screening threshold warning
                        ph = round(6.25 + random.uniform(-0.1, 0.1), 2)
                        turbidity = round(7.8 + random.uniform(-0.5, 0.5), 2)
                        tds = round(650.0 + random.uniform(-20.0, 20.0), 1)
                    else:
                        # Normal clean baseline with minor natural fluctuation
                        ph = round(base["ph"] + random.uniform(-0.12, 0.12), 2)
                        turbidity = round(max(0.4, base["turbidity"] + random.uniform(-0.35, 0.35)), 2)
                        tds = round(base["tds"] + random.uniform(-8.0, 8.0), 1)

                    temp = round(base["temp"] + random.uniform(-0.2, 0.2), 1)

                    payload = {
                        "node_id": node_id,
                        "ph": ph,
                        "turbidity": turbidity,
                        "tds": tds,
                        "temperature": temp,
                        "source": "simulated",
                        "calibration_status": "simulated",
                        "rssi": -60.0 + random.uniform(-4, 4),
                        "uptime": int(time.time() % 86400),
                    }

                    try:
                        ingest_reading(payload)
                    except Exception as exc:
                        logger.warning(f"Error ingesting simulated reading for {node_id}: {exc}")

        except Exception as e:
            logger.error(f"Simulator error in loop: {e}")

        # Sleep for configured interval
        for _ in range(int(SIMULATOR_STATE["interval"] * 2)):
            if not SIMULATOR_STATE["running"]:
                break
            time.sleep(0.5)

    logger.info("WaterWatch Node 2 & 3 Simulator background thread stopped.")


def start_simulator(app, interval=4):
    """Starts the simulated nodes background thread if not already running."""
    if SIMULATOR_STATE["running"]:
        return

    SIMULATOR_STATE["running"] = True
    SIMULATOR_STATE["interval"] = interval
    thread = threading.Thread(target=_simulation_loop, args=(app,), daemon=True)
    SIMULATOR_STATE["thread"] = thread
    thread.start()


def stop_simulator():
    """Stops the simulator thread."""
    SIMULATOR_STATE["running"] = False
    if SIMULATOR_STATE["thread"]:
        SIMULATOR_STATE["thread"].join(timeout=2)
        SIMULATOR_STATE["thread"] = None


def set_simulator_scenario(scenario: str):
    """Changes scenario: 'normal', 'warning', 'critical'."""
    if scenario in ("normal", "warning", "critical"):
        SIMULATOR_STATE["scenario"] = scenario
        return True
    return False


def get_simulator_status():
    return {
        "running": SIMULATOR_STATE["running"],
        "scenario": SIMULATOR_STATE["scenario"],
        "interval": SIMULATOR_STATE["interval"],
    }
