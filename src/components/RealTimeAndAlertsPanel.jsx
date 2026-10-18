import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Droplets, Gauge, ShieldAlert, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { classifyParameter } from '../utils/alertEngine.js'

function getTrendIndicator(history, param) {
  if (history.length < 2) return null
  const curr = history[history.length - 1][param]
  const prev = history[history.length - 2][param]
  if (curr === undefined || prev === undefined) return null
  const diff = curr - prev
  if (Math.abs(diff) < 0.02) return <span className="trend-neutral">--</span>
  if (diff > 0) {
    return (
      <span className="trend-up">
        <ArrowUpRight size={14} /> +{diff.toFixed(2)}
      </span>
    )
  }
  return (
    <span className="trend-down">
      <ArrowDownRight size={14} /> {diff.toFixed(2)}
    </span>
  )
}

export function RealTimeAndAlertsPanel({ selectedNode, latestReading, alerts, history, onPatchAlert }) {
  const nodeHistory = history.filter((r) => r.nodeId === selectedNode?.id)

  const phVal = latestReading?.ph !== undefined ? Number(latestReading.ph) : null
  const turbVal = latestReading?.turbidity !== undefined ? Number(latestReading.turbidity) : null
  const tdsVal = latestReading?.tds !== undefined ? Number(latestReading.tds) : null
  const tempVal = latestReading?.temperature !== undefined ? Number(latestReading.temperature) : 25.0

  const phStatus = phVal !== null ? classifyParameter('ph', phVal) : 'unavailable'
  const turbStatus = turbVal !== null ? classifyParameter('turbidity', turbVal) : 'unavailable'
  const tdsStatus = tdsVal !== null ? classifyParameter('tds', tdsVal) : 'unavailable'

  const activeAlerts = alerts.filter((a) => a.status === 'active').slice(0, 5)

  return (
    <div className="telemetry-alerts-grid">
      {/* Real-Time Live Readings Card */}
      <article className="live-readings-card">
        <div className="card-header-row">
          <div>
            <span className="card-eyebrow">Real-Time Telemetry</span>
            <h3>{selectedNode?.name || 'Selected Node'}</h3>
          </div>
          <span className={`node-type-pill ${selectedNode?.isHardware ? 'hw' : 'sim'}`}>
            {selectedNode?.isHardware ? 'Physical ESP32 Node' : 'Simulated Node'}
          </span>
        </div>

        <div className="readings-list">
          {/* pH */}
          <div className={`reading-item status-border-${phStatus}`}>
            <div className="reading-icon-box ph">
              <Gauge size={18} />
            </div>
            <div className="reading-details">
              <span className="param-name">pH Level</span>
              <div className="param-value-wrap">
                <strong className="param-val">{phVal !== null ? phVal.toFixed(2) : '--'}</strong>
                <span className="param-unit">pH</span>
              </div>
            </div>
            <div className="reading-status-col">
              <span className={`status-badge ${phStatus}`}>{phStatus.toUpperCase()}</span>
              {getTrendIndicator(nodeHistory, 'ph')}
            </div>
          </div>

          {/* Turbidity */}
          <div className={`reading-item status-border-${turbStatus}`}>
            <div className="reading-icon-box turb">
              <Droplets size={18} />
            </div>
            <div className="reading-details">
              <span className="param-name">Turbidity</span>
              <div className="param-value-wrap">
                <strong className="param-val">{turbVal !== null ? turbVal.toFixed(2) : '--'}</strong>
                <span className="param-unit">NTU</span>
              </div>
            </div>
            <div className="reading-status-col">
              <span className={`status-badge ${turbStatus}`}>{turbStatus.toUpperCase()}</span>
              {getTrendIndicator(nodeHistory, 'turbidity')}
            </div>
          </div>

          {/* TDS */}
          <div className={`reading-item status-border-${tdsStatus}`}>
            <div className="reading-icon-box tds">
              <Activity size={18} />
            </div>
            <div className="reading-details">
              <span className="param-name">Total Dissolved Solids</span>
              <div className="param-value-wrap">
                <strong className="param-val">{tdsVal !== null ? Math.round(tdsVal) : '--'}</strong>
                <span className="param-unit">ppm</span>
              </div>
            </div>
            <div className="reading-status-col">
              <span className={`status-badge ${tdsStatus}`}>{tdsStatus.toUpperCase()}</span>
              {getTrendIndicator(nodeHistory, 'tds')}
            </div>
          </div>
        </div>

        <div className="live-footer">
          <span>Last Seen:</span>
          <strong>
            {latestReading?.timestamp
              ? new Date(latestReading.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Waiting for stream...'}
          </strong>
        </div>
      </article>

      {/* Latest Alerts Panel */}
      <article className="latest-alerts-card">
        <div className="card-header-row">
          <div>
            <span className="card-eyebrow">Active Incidents</span>
            <h3>Alert Engine & Anomaly Feed</h3>
          </div>
          <Link to="/alerts" className="view-all-link">
            View All ({alerts.length})
          </Link>
        </div>

        <div className="alerts-feed-list">
          {activeAlerts.length === 0 ? (
            <div className="alerts-empty-state">
              <Check size={28} className="icon-success" />
              <p>All water quality screening limits are normal.</p>
              <span>No active threshold breaches or statistical anomalies.</span>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <div key={alert.id} className={`alert-card-item alert-${alert.severity}`}>
                <div className="alert-top">
                  <div className="alert-badge-group">
                    <span className={`severity-tag ${alert.severity}`}>
                      {alert.severity === 'critical' ? <ShieldAlert size={12} /> : <AlertTriangle size={12} />}
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="alert-type-tag">{alert.type || alert.alertType}</span>
                    <span className="alert-node-tag">{alert.nodeId}</span>
                  </div>
                  <span className="alert-time">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </span>
                </div>
                <h4 className="alert-title">{alert.title}</h4>
                <p className="alert-desc">{alert.description || alert.message}</p>
                <div className="alert-actions">
                  <button
                    type="button"
                    className="alert-btn ack"
                    onClick={() => onPatchAlert?.(alert.id, 'acknowledged')}
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    className="alert-btn resolve"
                    onClick={() => onPatchAlert?.(alert.id, 'resolved')}
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  )
}

export default RealTimeAndAlertsPanel
