import { useState, useMemo } from 'react'
import { useMonitoring } from '../context/MonitoringContext.jsx'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Filter,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

export function AlertsPage() {
  const { alerts, nodes, patchAlertStatus } = useMonitoring()
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'acknowledged', 'resolved'
  const [severityFilter, setSeverityFilter] = useState('all') // 'all', 'warning', 'critical'
  const [nodeFilter, setNodeFilter] = useState('all')

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (nodeFilter !== 'all' && a.nodeId !== nodeFilter) return false
      return true
    })
  }, [alerts, statusFilter, severityFilter, nodeFilter])

  const counts = useMemo(() => {
    return {
      active: alerts.filter((a) => a.status === 'active').length,
      acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      critical: alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length,
    }
  }, [alerts])

  return (
    <div className="alerts-page-wrapper">
      <div className="page-header-row">
        <div>
          <span className="page-eyebrow">Incident & Exception Management</span>
          <h2>Alert Engine & Quality Incidents</h2>
          <p className="page-description">
            Track, acknowledge, and resolve threshold breaches, sensor faults, and statistical anomalies across the network.
          </p>
        </div>

        <div className="alerts-stats-row">
          <div className="alert-count-pill critical">
            <ShieldAlert size={16} />
            <span>{counts.critical} Critical Active</span>
          </div>
          <div className="alert-count-pill warning">
            <AlertTriangle size={16} />
            <span>{counts.active} Total Active</span>
          </div>
          <div className="alert-count-pill resolved">
            <CheckCircle size={16} />
            <span>{counts.resolved} Resolved</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="alerts-toolbar">
        <div className="filter-group">
          <span className="filter-label">
            <Filter size={14} /> Status:
          </span>
          <div className="segmented-control">
            {['all', 'active', 'acknowledged', 'resolved'].map((st) => (
              <button
                key={st}
                type="button"
                className={`control-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Severity:</span>
          <div className="segmented-control">
            {['all', 'warning', 'critical'].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`control-btn ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Node:</span>
          <select
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Monitoring Nodes</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} ({n.name.split(' - ')[0]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-feed-container">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty-box">
            <ShieldCheck size={48} className="icon-emerald" />
            <h3>No Incidents Found</h3>
            <p>No alerts match the selected status and severity filter criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <article key={alert.id} className={`incident-card severity-${alert.severity} status-${alert.status}`}>
              <div className="incident-card-header">
                <div className="incident-badge-row">
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity === 'critical' ? <ShieldAlert size={13} /> : <AlertTriangle size={13} />}
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="incident-node-id">{alert.nodeId}</span>
                  <span className="incident-type-tag">{alert.type || alert.alertType}</span>
                  <span className={`status-pill ${alert.status}`}>
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <div className="incident-time">
                  {alert.createdAt
                    ? new Date(alert.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent'}
                </div>
              </div>

              <h3 className="incident-title">{alert.title}</h3>
              <p className="incident-description">{alert.description || alert.message}</p>

              <div className="incident-meta-grid">
                {alert.observedValue !== undefined && alert.observedValue !== null && (
                  <div className="meta-item">
                    <span>Observed Value:</span>
                    <strong>{Number(alert.observedValue).toFixed(2)}</strong>
                  </div>
                )}
                {alert.thresholdValue && (
                  <div className="meta-item">
                    <span>Configured Limit:</span>
                    <strong>{alert.thresholdValue}</strong>
                  </div>
                )}
                {alert.acknowledgedAt && (
                  <div className="meta-item">
                    <span>Acknowledged At:</span>
                    <strong>{new Date(alert.acknowledgedAt).toLocaleTimeString()}</strong>
                  </div>
                )}
                {alert.resolvedAt && (
                  <div className="meta-item">
                    <span>Resolved At:</span>
                    <strong>{new Date(alert.resolvedAt).toLocaleTimeString()}</strong>
                  </div>
                )}
              </div>

              {alert.status === 'active' && (
                <div className="incident-action-row">
                  <button
                    type="button"
                    className="action-btn ack"
                    onClick={() => patchAlertStatus(alert.id, 'acknowledged')}
                  >
                    Acknowledge Incident
                  </button>
                  <button
                    type="button"
                    className="action-btn resolve"
                    onClick={() => patchAlertStatus(alert.id, 'resolved')}
                  >
                    Mark as Resolved
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}

export default AlertsPage
