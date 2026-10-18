import { useMonitoring } from '../context/MonitoringContext.jsx'
import { NetworkMap } from '../components/NetworkMap.jsx'
import { Cpu, Info, MapPin, Navigation, Radio } from 'lucide-react'

export function MapPage() {
  const { nodes, latestReadings, selectedNodeId, setSelectedNodeId } = useMonitoring()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]
  const currentReading = latestReadings[selectedNode?.id]

  return (
    <div className="map-view-page">
      <div className="page-header-row">
        <div>
          <span className="page-eyebrow">GIS Geographical Network</span>
          <h2>Spatial Water Quality Catchment Map</h2>
          <p className="page-description">
            Geographic distribution of monitoring stations across the stream catchment basin.
            Node 1 represents the physical ESP32 DevKit hardware station.
          </p>
        </div>

        <div className="map-stat-strip">
          <div className="map-stat-pill">
            <Radio size={16} className="icon-teal" />
            <span>3 Configured Stations</span>
          </div>
          <div className="map-stat-pill">
            <Cpu size={16} className="icon-emerald" />
            <span>1 Physical Hardware (ESP32)</span>
          </div>
        </div>
      </div>

      <div className="map-page-layout">
        <div className="map-main-column">
          <div className="map-card-wrapper">
            <NetworkMap
              nodes={nodes}
              latestReadings={latestReadings}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              height="600px"
            />
          </div>
        </div>

        <aside className="map-sidebar-column">
          <div className="selected-node-detail-card">
            <div className="detail-card-header">
              <span className={`node-source-badge ${selectedNode?.isHardware ? 'hw' : 'sim'}`}>
                {selectedNode?.isHardware ? 'Physical ESP32 Node' : 'Simulated Node'}
              </span>
              <h3>{selectedNode?.name}</h3>
              <p className="node-location-label">
                <MapPin size={14} /> {selectedNode?.location}
              </p>
            </div>

            <div className="node-coordinates-box">
              <div className="coord-row">
                <span>Latitude:</span>
                <strong>{selectedNode?.lat}° N</strong>
              </div>
              <div className="coord-row">
                <span>Longitude:</span>
                <strong>{selectedNode?.lng}° E</strong>
              </div>
              <div className="coord-row">
                <span>Catchment Role:</span>
                <strong>{selectedNode?.role || 'Monitoring Station'}</strong>
              </div>
            </div>

            <div className="node-live-metrics">
              <h4>Current Calibrated Telemetry</h4>
              <div className="metric-row">
                <span>pH Value:</span>
                <strong>
                  {currentReading?.ph !== undefined ? Number(currentReading.ph).toFixed(2) + ' pH' : '--'}
                </strong>
              </div>
              <div className="metric-row">
                <span>Turbidity:</span>
                <strong>
                  {currentReading?.turbidity !== undefined ? Number(currentReading.turbidity).toFixed(2) + ' NTU' : '--'}
                </strong>
              </div>
              <div className="metric-row">
                <span>TDS:</span>
                <strong>
                  {currentReading?.tds !== undefined ? Math.round(currentReading.tds) + ' ppm' : '--'}
                </strong>
              </div>
              <div className="metric-row">
                <span>Temperature:</span>
                <strong>
                  {currentReading?.temperature !== undefined ? Number(currentReading.temperature).toFixed(1) + ' °C' : '25.0 °C'}
                </strong>
              </div>
            </div>

            <div className="node-device-health">
              <div className="health-row">
                <span>Status:</span>
                <span className={`health-tag ${currentReading ? 'online' : 'offline'}`}>
                  {currentReading ? 'Online & Streaming' : 'Offline'}
                </span>
              </div>
              <div className="health-row">
                <span>Last Telemetry:</span>
                <strong>
                  {currentReading?.timestamp
                    ? new Date(currentReading.timestamp).toLocaleTimeString()
                    : 'Awaiting signal'}
                </strong>
              </div>
            </div>
          </div>

          <div className="catchment-info-card">
            <h4>Stream Hydrodynamics</h4>
            <p>
              Flow proceeds from <strong>Node 1 (Upstream Intake)</strong> past the{' '}
              <strong>Node 2 (Industrial Confluence)</strong> discharge point to the{' '}
              <strong>Node 3 (Downstream Reservoir)</strong>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default MapPage
