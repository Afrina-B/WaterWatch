import { useState, useMemo } from 'react'
import { useMonitoring } from '../context/MonitoringContext.jsx'
import { Download, Filter, History, Search } from 'lucide-react'

export function HistoryPage() {
  const { nodes, history, selectedNodeId, setSelectedNodeId } = useMonitoring()
  const [limit, setLimit] = useState(50)
  const [filterNode, setFilterNode] = useState(selectedNodeId || 'all')

  const filteredHistory = useMemo(() => {
    let list = [...history]
    if (filterNode !== 'all') {
      list = list.filter((r) => r.nodeId === filterNode)
    }
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  }, [history, filterNode, limit])

  const exportCSV = () => {
    if (!filteredHistory.length) return
    const headers = ['Timestamp', 'Node ID', 'Source', 'pH', 'Turbidity (NTU)', 'TDS (ppm)', 'Temperature (°C)', 'Calibration']
    const rows = filteredHistory.map((r) => [
      new Date(r.timestamp).toISOString(),
      r.nodeId,
      r.source || (r.isHardware ? 'hardware' : 'simulated'),
      r.ph !== undefined ? Number(r.ph).toFixed(2) : '',
      r.turbidity !== undefined ? Number(r.turbidity).toFixed(2) : '',
      r.tds !== undefined ? Math.round(r.tds) : '',
      r.temperature !== undefined ? Number(r.temperature).toFixed(1) : '',
      r.calibrationStatus || 'calibrated',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `waterwatch_telemetry_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="history-page-wrapper">
      <div className="page-header-row">
        <div>
          <span className="page-eyebrow">Data Retention & Audit Trail</span>
          <h2>Historical Sensor Telemetry Database</h2>
          <p className="page-description">
            Complete timestamped persistent measurements retrieved from the local database.
          </p>
        </div>

        <button type="button" className="csv-export-btn" onClick={exportCSV} disabled={!filteredHistory.length}>
          <Download size={16} />
          <span>Export Records (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="history-filter-bar">
        <div className="filter-item">
          <span className="filter-label">Monitoring Node:</span>
          <select value={filterNode} onChange={(e) => setFilterNode(e.target.value)} className="filter-select">
            <option value="all">All Monitoring Nodes ({history.length} records)</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} - {n.name.split(' - ')[0]} ({n.isHardware ? 'Physical ESP32' : 'Simulated'})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <span className="filter-label">Row Display Limit:</span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="filter-select">
            <option value={25}>Latest 25 Rows</option>
            <option value={50}>Latest 50 Rows</option>
            <option value={100}>Latest 100 Rows</option>
            <option value={250}>Latest 250 Rows</option>
          </select>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="history-table-card">
        <div className="table-responsive-wrap">
          <table className="ww-table">
            <thead>
              <tr>
                <th>Record Timestamp</th>
                <th>Node ID</th>
                <th>Source Type</th>
                <th>pH Value</th>
                <th>Turbidity</th>
                <th>TDS</th>
                <th>Temperature</th>
                <th>Calibration</th>
                <th>Raw ADC Readings</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    No historical telemetry records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((r, i) => (
                  <tr key={r.id || r.timestamp || i}>
                    <td className="time-cell">
                      {new Date(r.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <span className="node-id-badge">{r.nodeId}</span>
                    </td>
                    <td>
                      <span className={`source-tag ${r.source === 'hardware' || r.isHardware ? 'tag-hardware' : 'tag-simulated'}`}>
                        {r.source === 'hardware' || r.isHardware ? 'Physical ESP32' : 'Simulated'}
                      </span>
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
                      <span className="cal-tag">{r.calibrationStatus || 'calibrated'}</span>
                    </td>
                    <td className="raw-adc-cell">
                      {r.rawAdc ? (
                        <span>
                          pH:{r.rawAdc.ph ?? '--'} | TDS:{r.rawAdc.tds ?? '--'} | Turb:{r.rawAdc.turbidity ?? '--'}
                        </span>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default HistoryPage
