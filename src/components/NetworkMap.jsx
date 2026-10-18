import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet'
import { Cpu, Radio, ShieldAlert } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const flowPath = [
  [11.0183, 76.9614], // Node 1 Upstream
  [11.0192, 76.9631], // Node 2 Pollution Zone
  [11.0201, 76.9648], // Node 3 Downstream
]

export function NetworkMap({ nodes, latestReadings, selectedNodeId, onSelectNode, height = '420px' }) {
  const mapCenter = [11.0192, 76.9631]

  return (
    <div className="network-map-container" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', borderRadius: '14px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* River/Flow indication polyline */}
        <Polyline
          positions={flowPath}
          pathOptions={{
            color: '#0d9488',
            weight: 5,
            opacity: 0.75,
            dashArray: '6, 8',
          }}
        />

        {nodes.map((node) => {
          const latest = latestReadings[node.id]
          const isHardware = node.sourceType === 'hardware' || node.isHardware
          const isSelected = selectedNodeId === node.id

          // Node status color
          let markerColor = '#16a34a' // Green normal
          if (!latest) markerColor = '#94a3b8' // Grey offline
          else if (latest.ph < 6.0 || latest.ph > 9.0 || latest.turbidity > 10.0 || latest.tds > 1000.0) {
            markerColor = '#dc2626' // Red critical
          } else if (
            latest.ph < 6.5 ||
            latest.ph > 8.5 ||
            latest.turbidity > 5.0 ||
            latest.tds > 500.0
          ) {
            markerColor = '#d97706' // Amber warning
          }

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lng]}
              radius={isSelected ? 14 : 11}
              pathOptions={{
                color: isSelected ? '#042f2e' : markerColor,
                fillColor: markerColor,
                fillOpacity: 0.9,
                weight: isSelected ? 4 : 2,
              }}
              eventHandlers={{
                click: () => onSelectNode?.(node.id),
              }}
            >
              <Popup>
                <div className="map-popup-card">
                  <div className="popup-header">
                    <h4>{node.name}</h4>
                    <span className={`popup-tag ${isHardware ? 'hw' : 'sim'}`}>
                      {isHardware ? 'Physical ESP32 DevKit' : 'Software Simulated'}
                    </span>
                  </div>
                  <p className="popup-loc">{node.location}</p>

                  <div className="popup-metrics-grid">
                    <div className="popup-metric">
                      <span>pH Level</span>
                      <strong>{latest?.ph !== undefined ? Number(latest.ph).toFixed(2) : '--'}</strong>
                    </div>
                    <div className="popup-metric">
                      <span>Turbidity</span>
                      <strong>{latest?.turbidity !== undefined ? Number(latest.turbidity).toFixed(2) + ' NTU' : '--'}</strong>
                    </div>
                    <div className="popup-metric">
                      <span>TDS</span>
                      <strong>{latest?.tds !== undefined ? Math.round(latest.tds) + ' ppm' : '--'}</strong>
                    </div>
                    <div className="popup-metric">
                      <span>Temp</span>
                      <strong>{latest?.temperature !== undefined ? Number(latest.temperature).toFixed(1) + ' °C' : '25.0 °C'}</strong>
                    </div>
                  </div>

                  <div className="popup-footer">
                    <span>Last Seen:</span>
                    <strong>
                      {latest?.timestamp
                        ? new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'No Data'}
                    </strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default NetworkMap
