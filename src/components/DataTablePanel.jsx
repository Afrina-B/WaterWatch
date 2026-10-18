import { useState } from 'react'
import { Cpu, Database, Server } from 'lucide-react'

export function DataTablePanel({ nodes, latestReadings, selectedNodeId, onSelectNode, history }) {
  const [activeTab, setActiveTab] = useState('nodes') // 'nodes' | 'readings'

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]
  const recentReadings = history
    .filter((r) => r.nodeId === selectedNodeId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15)

  return (
    <article className="data-table-panel-card">
      <div className="table-panel-header">
        <div className="table-tab-group">
          <button
            type="button"
            className={`table-tab-btn ${activeTab === 'nodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('nodes')}
          >
            <Server size={16} />
            <span>Node Network Status ({nodes.length})</span>
          </button>
          <button
            type="button"
            className={`table-tab-btn ${activeTab === 'readings' ? 'active' : ''}`}
            onClick={() => setActiveTab('readings')}
          >
            <Database size={16} />
            <span>Persisted Readings ({selectedNode?.id})</span>
          </button>
        </div>
      </div>

      <div className="table-responsive-wrap">
        {activeTab === 'nodes' ? (
          <table className="ww-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Type & Source</th>
                <th>Role & Location</th>
                <th>Connection</th>
                <th>Last Update</th>
                <th>pH</th>
                <th>Turbidity</th>
                <th>TDS</th>
                <th>Temp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => {
                const latest = latestReadings[node.id]
                const isHw = node.sourceType === 'hardware' || node.isHardware
                const isSelected = selectedNodeId === node.id

                return (
                  <tr
                    key={node.id}
                    className={`table-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelectNode(node.id)}
                  >
                    <td>
                      <div className="node-id-cell">
                        <span className="node-id-badge">{node.id}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`source-tag ${isHw ? 'tag-hardware' : 'tag-simulated'}`}>
                        {isHw ? <Cpu size={12} /> : null}
                        {isHw ? 'Physical ESP32' : 'Software Simulated'}
                      </span>
                    </td>
                    <td>
                      <div className="location-cell">
                        <strong>{node.role || node.name}</strong>
                        <span className="location-text">{node.location}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`health-pill ${latest ? 'online' : 'offline'}`}>
                        <span className="dot" />
                        {latest ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="time-cell">
                      {latest?.timestamp
                        ? new Date(latest.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : 'No Data'}
                    </td>
                    <td>
                      <span className="metric-cell-val">
                        {latest?.ph !== undefined ? Number(latest.ph).toFixed(2) : '--'}
                      </span>
                    </td>
                    <td>
                      <span className="metric-cell-val">
                        {latest?.turbidity !== undefined ? Number(latest.turbidity).toFixed(2) + ' NTU' : '--'}
                      </span>
                    </td>
                    <td>
                      <span className="metric-cell-val">
                        {latest?.tds !== undefined ? Math.round(latest.tds) + ' ppm' : '--'}
                      </span>
                    </td>
                    <td>
                      <span className="metric-cell-val">
                        {latest?.temperature !== undefined ? Number(latest.temperature).toFixed(1) + ' °C' : '25.0 °C'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`select-btn ${isSelected ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectNode(node.id)
                        }}
                      >
                        {isSelected ? 'Viewing' : 'Select'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="ww-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Node ID</th>
                <th>pH</th>
                <th>Turbidity</th>
                <th>TDS</th>
                <th>Temperature</th>
                <th>Source</th>
                <th>Calibration Status</th>
                <th>Raw ADC (pH/TDS/Turb)</th>
              </tr>
            </thead>
            <tbody>
              {recentReadings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    No persisted measurements recorded yet for {selectedNode?.id}.
                  </td>
                </tr>
              ) : (
                recentReadings.map((r, idx) => (
                  <tr key={r.id || r.timestamp || idx}>
                    <td className="time-cell">
                      {new Date(r.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <span className="node-id-badge">{r.nodeId}</span>
                    </td>
                    <td>
                      <strong>{Number(r.ph).toFixed(2)} pH</strong>
                    </td>
                    <td>
                      <strong>{Number(r.turbidity).toFixed(2)} NTU</strong>
                    </td>
                    <td>
                      <strong>{Math.round(r.tds)} ppm</strong>
                    </td>
                    <td>{Number(r.temperature || 25).toFixed(1)} °C</td>
                    <td>
                      <span className={`source-tag ${r.source === 'hardware' ? 'tag-hardware' : 'tag-simulated'}`}>
                        {r.source === 'hardware' ? 'Physical ESP32' : 'Simulated'}
                      </span>
                    </td>
                    <td>
                      <span className="cal-tag">{r.calibrationStatus || 'calibrated'}</span>
                    </td>
                    <td className="raw-adc-cell">
                      {r.rawAdc ? (
                        <span>
                          {r.rawAdc.ph ?? '--'} / {r.rawAdc.tds ?? '--'} / {r.rawAdc.turbidity ?? '--'}
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </article>
  )
}

export default DataTablePanel
