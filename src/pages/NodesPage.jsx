import { useMonitoring } from '../context/MonitoringContext.jsx'
import { Activity, CheckCircle, Cpu, Droplets, Gauge, MapPin, Radio, ShieldCheck, Wifi } from 'lucide-react'

export function NodesPage() {
  const { nodes, latestReadings, selectedNodeId, setSelectedNodeId } = useMonitoring()

  return (
    <div className="nodes-page">
      <div className="page-header-row">
        <div>
          <span className="page-eyebrow">Hardware & Telemetry Architecture</span>
          <h2>Sensor Monitoring Nodes</h2>
          <p className="page-description">
            Inspect physical hardware pin configurations, analog-to-digital sampling, and simulated nodes.
          </p>
        </div>
      </div>

      <div className="nodes-card-grid">
        {nodes.map((node) => {
          const latest = latestReadings[node.id]
          const isHw = node.sourceType === 'hardware' || node.isHardware
          const isSelected = selectedNodeId === node.id

          return (
            <article
              key={node.id}
              className={`station-node-card ${isHw ? 'hw-node' : 'sim-node'} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedNodeId(node.id)}
            >
              <div className="station-card-header">
                <div>
                  <div className="station-type-tag">
                    {isHw ? <Cpu size={14} /> : <Radio size={14} />}
                    {isHw ? 'Physical ESP32 DevKit' : 'Software Simulated'}
                  </div>
                  <h3>{node.name}</h3>
                  <p className="station-location">
                    <MapPin size={13} /> {node.location}
                  </p>
                </div>
                <span className={`station-status-pill ${latest ? 'online' : 'offline'}`}>
                  {latest ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Hardware Specific Details */}
              {isHw ? (
                <div className="hw-pin-configuration-box">
                  <h4>ESP32 Hardware Pin Mapping</h4>
                  <div className="pin-grid">
                    <div className="pin-item">
                      <span className="pin-num">GPIO 34</span>
                      <span className="pin-label">pH Analog (PO)</span>
                      <span className="pin-adc">ADC1_CH6</span>
                    </div>
                    <div className="pin-item">
                      <span className="pin-num">GPIO 32</span>
                      <span className="pin-label">TDS Analog (AO)</span>
                      <span className="pin-adc">ADC1_CH4</span>
                    </div>
                    <div className="pin-item">
                      <span className="pin-num">GPIO 35</span>
                      <span className="pin-label">Turbidity (AO)</span>
                      <span className="pin-adc">ADC1_CH7</span>
                    </div>
                  </div>
                  <div className="hw-notes">
                    <span>* Safe ADC1 channels utilized to prevent Wi-Fi RF conflict. 3.3V maximum voltage limit.</span>
                  </div>
                </div>
              ) : (
                <div className="sim-details-box">
                  <h4>Simulated Stream Model</h4>
                  <p>
                    Mathematical feeder injecting continuous hydrological readings with configured noise,
                    flow kinetics, and scenario testing capabilities.
                  </p>
                </div>
              )}

              {/* Latest Readings Box */}
              <div className="station-telemetry-box">
                <h4>Latest Measurements</h4>
                <div className="station-metrics-grid">
                  <div className="stat-metric-pill">
                    <span className="m-label">pH Level</span>
                    <strong className="m-val">{latest?.ph !== undefined ? Number(latest.ph).toFixed(2) : '--'}</strong>
                  </div>
                  <div className="stat-metric-pill">
                    <span className="m-label">Turbidity</span>
                    <strong className="m-val">
                      {latest?.turbidity !== undefined ? Number(latest.turbidity).toFixed(2) + ' NTU' : '--'}
                    </strong>
                  </div>
                  <div className="stat-metric-pill">
                    <span className="m-label">TDS</span>
                    <strong className="m-val">
                      {latest?.tds !== undefined ? Math.round(latest.tds) + ' ppm' : '--'}
                    </strong>
                  </div>
                  <div className="stat-metric-pill">
                    <span className="m-label">Temp</span>
                    <strong className="m-val">
                      {latest?.temperature !== undefined ? Number(latest.temperature).toFixed(1) + ' °C' : '25.0 °C'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Diagnostics Box */}
              <div className="station-footer-box">
                <div className="footer-metric">
                  <span>RSSI:</span>
                  <strong>{latest?.rssi ? `${Math.round(latest.rssi)} dBm` : '-60 dBm'}</strong>
                </div>
                <div className="footer-metric">
                  <span>Calibration:</span>
                  <strong>{latest?.calibrationStatus || 'Calibrated'}</strong>
                </div>
                <div className="footer-metric">
                  <span>Last Seen:</span>
                  <strong>
                    {latest?.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : 'Awaiting data'}
                  </strong>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default NodesPage
