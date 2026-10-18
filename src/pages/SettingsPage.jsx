import { useState } from 'react'
import { useMonitoring } from '../context/MonitoringContext.jsx'
import { Check, Cpu, Database, Flame, HelpCircle, Radio, Settings, ShieldAlert, Sparkles, Wifi } from 'lucide-react'
import { thresholds } from '../config/thresholds.js'

export function SettingsPage() {
  const { dataMode, setDataMode, simulatorScenario, setSimulatorScenario } = useMonitoring()
  const [savedNotice, setSavedNotice] = useState(false)

  const handleModeChange = (mode) => {
    setDataMode(mode)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const handleScenarioChange = (scenario) => {
    setSimulatorScenario(scenario)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  return (
    <div className="settings-page-wrapper">
      <div className="page-header-row">
        <div>
          <span className="page-eyebrow">System Configuration & Test Environment</span>
          <h2>Platform Settings & Demo Controls</h2>
          <p className="page-description">
            Configure telemetry data sources, simulate hydrological event scenarios, and review threshold standards.
          </p>
        </div>

        {savedNotice && (
          <div className="saved-notification">
            <Check size={16} />
            <span>Settings Updated</span>
          </div>
        )}
      </div>

      <div className="settings-grid">
        {/* Data Source Selector */}
        <section className="settings-card">
          <div className="card-header-clean">
            <Database size={20} className="icon-teal" />
            <div>
              <h3>Active Data Transport Source</h3>
              <p className="card-subtitle">Select how the dashboard receives incoming sensor telemetry</p>
            </div>
          </div>

          <div className="source-options-list">
            <label className={`source-option-box ${dataMode === 'api' ? 'active' : ''}`}>
              <input
                type="radio"
                name="dataMode"
                value="api"
                checked={dataMode === 'api'}
                onChange={() => handleModeChange('api')}
              />
              <div className="option-text">
                <div className="option-title">
                  <strong>Flask REST API (Persistent SQLite)</strong>
                  <span className="source-pill live">Default / Primary</span>
                </div>
                <p>
                  Connects to the Python Flask backend at <code>http://localhost:5000/api</code>.
                  Ingests real ESP32 DevKit readings for Node 1 and backend-simulated readings for Nodes 2 & 3.
                </p>
              </div>
            </label>

            <label className={`source-option-box ${dataMode === 'simulator' ? 'active' : ''}`}>
              <input
                type="radio"
                name="dataMode"
                value="simulator"
                checked={dataMode === 'simulator'}
                onChange={() => handleModeChange('simulator')}
              />
              <div className="option-text">
                <div className="option-title">
                  <strong>In-Browser Simulator (Standalone)</strong>
                  <span className="source-pill sim">Demo Mode</span>
                </div>
                <p>
                  Runs self-contained browser simulation if the backend is stopped or offline.
                  Generates realistic water kinetics for rapid UI presentation.
                </p>
              </div>
            </label>

            <label className={`source-option-box ${dataMode === 'mqtt' ? 'active' : ''}`}>
              <input
                type="radio"
                name="dataMode"
                value="mqtt"
                checked={dataMode === 'mqtt'}
                onChange={() => handleModeChange('mqtt')}
              />
              <div className="option-text">
                <div className="option-title">
                  <strong>MQTT Broker (WebSocket / Paho)</strong>
                  <span className="source-pill mqtt">Optional</span>
                </div>
                <p>
                  Subscribes to <code>waterwatch/nodes/+/readings</code> on the configured MQTT broker.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Demo Scenario Injector */}
        <section className="settings-card">
          <div className="card-header-clean">
            <Flame size={20} className="icon-amber" />
            <div>
              <h3>Hydrological Demonstration Scenarios</h3>
              <p className="card-subtitle">Inject safe test conditions into simulated stream nodes (Node 2 & 3)</p>
            </div>
          </div>

          <div className="scenario-buttons-grid">
            <button
              type="button"
              className={`scenario-btn normal ${simulatorScenario === 'normal' ? 'selected' : ''}`}
              onClick={() => handleScenarioChange('normal')}
            >
              <div className="btn-indicator" />
              <div className="btn-body">
                <strong>Normal Clean Flow</strong>
                <span>pH 7.0–7.4, Turbidity 2–4 NTU, TDS 220–300 ppm</span>
              </div>
            </button>

            <button
              type="button"
              className={`scenario-btn warning ${simulatorScenario === 'warning' ? 'selected' : ''}`}
              onClick={() => handleScenarioChange('warning')}
            >
              <div className="btn-indicator" />
              <div className="btn-body">
                <strong>Warning Screening Drift</strong>
                <span>Slight pH drop (6.2) and elevated Turbidity (7.8 NTU)</span>
              </div>
            </button>

            <button
              type="button"
              className={`scenario-btn critical ${simulatorScenario === 'critical' ? 'selected' : ''}`}
              onClick={() => handleScenarioChange('critical')}
            >
              <div className="btn-indicator" />
              <div className="btn-body">
                <strong>Critical Contamination Spike</strong>
                <span>Severe industrial spill: pH 5.2, Turbidity &gt; 18 NTU, TDS &gt; 1100 ppm</span>
              </div>
            </button>
          </div>
        </section>

        {/* Configured Water Quality Thresholds Table */}
        <section className="settings-card full-col">
          <div className="card-header-clean">
            <ShieldAlert size={20} className="icon-emerald" />
            <div>
              <h3>Configured Screening Thresholds & Standards</h3>
              <p className="card-subtitle">Reference screening ranges according to WHO & national guidelines</p>
            </div>
          </div>

          <div className="table-responsive-wrap">
            <table className="ww-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Unit</th>
                  <th>Normal Range</th>
                  <th>Warning Threshold</th>
                  <th>Critical Threshold</th>
                  <th>Evaluation Standard</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>pH Level</strong>
                  </td>
                  <td>pH</td>
                  <td>
                    <span className="badge-normal">6.50 – 8.50 pH</span>
                  </td>
                  <td>
                    <span className="badge-warning">6.00 – 6.50 / 8.50 – 9.00</span>
                  </td>
                  <td>
                    <span className="badge-critical">&lt; 6.00 or &gt; 9.00</span>
                  </td>
                  <td>WHO Guidelines for Drinking-Water Quality</td>
                </tr>
                <tr>
                  <td>
                    <strong>Turbidity</strong>
                  </td>
                  <td>NTU</td>
                  <td>
                    <span className="badge-normal">&le; 5.0 NTU</span>
                  </td>
                  <td>
                    <span className="badge-warning">5.0 – 10.0 NTU</span>
                  </td>
                  <td>
                    <span className="badge-critical">&gt; 10.0 NTU</span>
                  </td>
                  <td>Aesthetic & filtration screening limit</td>
                </tr>
                <tr>
                  <td>
                    <strong>Total Dissolved Solids</strong>
                  </td>
                  <td>ppm (mg/L)</td>
                  <td>
                    <span className="badge-normal">&le; 500 ppm</span>
                  </td>
                  <td>
                    <span className="badge-warning">500 – 1000 ppm</span>
                  </td>
                  <td>
                    <span className="badge-critical">&gt; 1000 ppm</span>
                  </td>
                  <td>Palatability & mineral content standard</td>
                </tr>
                <tr>
                  <td>
                    <strong>Temperature</strong>
                  </td>
                  <td>°C</td>
                  <td>
                    <span className="badge-normal">&le; 30.0 °C</span>
                  </td>
                  <td>
                    <span className="badge-warning">30.0 – 35.0 °C</span>
                  </td>
                  <td>
                    <span className="badge-critical">&gt; 35.0 °C</span>
                  </td>
                  <td>Thermal shock & biological activity threshold</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ESP32 Hardware Integration Guide */}
        <section className="settings-card full-col">
          <div className="card-header-clean">
            <Cpu size={20} className="icon-teal" />
            <div>
              <h3>ESP32 Physical Hardware Setup Guide</h3>
              <p className="card-subtitle">Connect your classic ESP32 DevKit to stream physical sensor readings</p>
            </div>
          </div>

          <div className="guide-content-grid">
            <div className="guide-step">
              <span className="step-num">1</span>
              <h4>Sensor Wiring</h4>
              <p>
                Connect pH module <strong>PO to GPIO 34</strong>, TDS module <strong>AO to GPIO 32</strong>, and Turbidity module <strong>AO to GPIO 35</strong>.
                Connect all ground lines (GND) common to the ESP32.
              </p>
            </div>

            <div className="guide-step">
              <span className="step-num">2</span>
              <h4>3.3V Voltage Safety</h4>
              <p>
                ESP32 analog GPIO pins accept a <strong>maximum of 3.3V</strong>.
                If sensor boards operate at 5V VCC, verify their analog outputs stay &le; 3.3V, or use a voltage divider.
              </p>
            </div>

            <div className="guide-step">
              <span className="step-num">3</span>
              <h4>Network Address</h4>
              <p>
                In <code>firmware/esp32_waterwatch/config.h</code>, configure your laptop's local LAN IP (e.g. <code>192.168.1.100</code>).
                Do not use <code>localhost</code> from the microcontroller.
              </p>
            </div>

            <div className="guide-step">
              <span className="step-num">4</span>
              <h4>Compile & Flash</h4>
              <p>
                Open <code>firmware/esp32_waterwatch/esp32_waterwatch.ino</code> in Arduino IDE.
                Select board <strong>ESP32 Dev Module</strong>, choose your COM port, and upload.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
