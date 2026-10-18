import { Activity, AlertTriangle, Droplets, GaugeCircle, ThermometerSun } from 'lucide-react'
import { useMonitoring } from '../context/MonitoringContext.jsx'

const formatTime = (timestamp) => {
  if (!timestamp) return 'No data'
  const diff = Date.now() - Number(timestamp)
  if (diff < 60000) return `${Math.max(1, Math.round(diff / 1000))}s ago`
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const metricConfig = [
  { key: 'ph', label: 'pH', icon: GaugeCircle },
  { key: 'turbidity', label: 'Turbidity', icon: Droplets },
  { key: 'tds', label: 'TDS', icon: Activity },
  { key: 'temperature', label: 'Temp', icon: ThermometerSun },
]

export function NodeCard({ node, latestReadings, selectedNodeId, onSelect }) {
  const { alerts } = useMonitoring()
  const latest = latestReadings[node.id]
  const nodeAlerts = alerts.filter((alert) => alert.nodeId === node.id && alert.status === 'active')
  const severity = nodeAlerts.length ? nodeAlerts.reduce((worst, alert) => (alert.severity === 'critical' ? 'critical' : worst === 'warning' || alert.severity === 'warning' ? 'warning' : worst), 'normal') : 'normal'
  const anomalyScore = Math.min(100, Math.round((nodeAlerts.filter((alert) => alert.type === 'anomaly').length * 25) || 0))

  return (
    <article className={`node-card severity-${severity} ${selectedNodeId === node.id ? 'selected' : ''}`} onClick={() => onSelect(node.id)} role="button" tabIndex={0}>
      <div className="node-card-header">
        <div>
          <div className="node-role">{node.role}</div>
          <h3>{node.name}</h3>
        </div>
        <span className={`status-badge ${severity}`}>{severity === 'normal' ? 'Normal' : severity === 'warning' ? 'Warning' : 'Critical'}</span>
      </div>
      <div className="metrics-grid">
        {metricConfig.map(({ key, label, icon: Icon }) => (
          <div key={key} className="metric-pill">
            <Icon size={14} />
            <span>{label}</span>
            <strong>{latest ? Number(latest[key]).toFixed(key === 'tds' ? 0 : 1) : '--'}</strong>
          </div>
        ))}
      </div>
      <div className="node-footer">
        <div>
          <div className="mini-label">Health</div>
          <span className="node-health">{latest ? 'Online' : 'Offline'}</span>
        </div>
        <div>
          <div className="mini-label">Last updated</div>
          <span>{formatTime(latest?.timestamp)}</span>
        </div>
      </div>
      <div className="anomaly-block">
        <div className="mini-label">Anomaly score</div>
        <div className="anomaly-score-row">
          <div className="score-bar"><span style={{ width: `${anomalyScore}%` }} /></div>
          <span>{anomalyScore}%</span>
        </div>
      </div>
    </article>
  )
}

export default NodeCard
