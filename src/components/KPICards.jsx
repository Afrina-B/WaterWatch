import { Activity, AlertCircle, CheckCircle, Droplets, Gauge, Radio, ShieldAlert } from 'lucide-react'
import { classifyParameter } from '../utils/alertEngine.js'

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'No data'
  const seconds = Math.floor((Date.now() - Number(timestamp)) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function KPICards({ selectedNode, latestReading, allNodes, activeAlertCount, connectionStatus }) {
  const phVal = latestReading?.ph !== undefined ? Number(latestReading.ph) : null
  const turbVal = latestReading?.turbidity !== undefined ? Number(latestReading.turbidity) : null
  const tdsVal = latestReading?.tds !== undefined ? Number(latestReading.tds) : null
  const tempVal = latestReading?.temperature !== undefined ? Number(latestReading.temperature) : null

  const phStatus = phVal !== null ? classifyParameter('ph', phVal) : 'unavailable'
  const turbStatus = turbVal !== null ? classifyParameter('turbidity', turbVal) : 'unavailable'
  const tdsStatus = tdsVal !== null ? classifyParameter('tds', tdsVal) : 'unavailable'

  const onlineNodes = allNodes.filter((n) => n.status === 'online').length
  const totalNodes = allNodes.length
  const hardwareNode = allNodes.find((n) => n.sourceType === 'hardware' || n.isHardware)
  const hardwareOnline = hardwareNode?.status === 'online'

  const lastUpdated = latestReading?.timestamp

  return (
    <section className="kpi-grid">
      {/* pH Card */}
      <article className={`kpi-card status-${phStatus}`}>
        <div className="kpi-header">
          <div className="kpi-title-group">
            <div className="kpi-icon-wrap icon-ph">
              <Gauge size={20} />
            </div>
            <div>
              <span className="kpi-label">pH Level</span>
              <span className="kpi-sub">{selectedNode?.name || 'Selected Node'}</span>
            </div>
          </div>
          <span className={`kpi-badge badge-${phStatus}`}>
            {phStatus === 'normal' && <CheckCircle size={12} />}
            {phStatus === 'warning' && <AlertCircle size={12} />}
            {phStatus === 'critical' && <ShieldAlert size={12} />}
            {phStatus.toUpperCase()}
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-value-row">
            <span className="kpi-value">{phVal !== null ? phVal.toFixed(2) : '--'}</span>
            <span className="kpi-unit">pH</span>
          </div>
          <div className="kpi-meta">
            <div className="kpi-range">
              <span>Acceptable:</span>
              <strong>6.50 – 8.50 pH</strong>
            </div>
            <div className="kpi-time">{formatTimeAgo(lastUpdated)}</div>
          </div>
        </div>
      </article>

      {/* Turbidity Card */}
      <article className={`kpi-card status-${turbStatus}`}>
        <div className="kpi-header">
          <div className="kpi-title-group">
            <div className="kpi-icon-wrap icon-turb">
              <Droplets size={20} />
            </div>
            <div>
              <span className="kpi-label">Turbidity</span>
              <span className="kpi-sub">{selectedNode?.name || 'Selected Node'}</span>
            </div>
          </div>
          <span className={`kpi-badge badge-${turbStatus}`}>
            {turbStatus === 'normal' && <CheckCircle size={12} />}
            {turbStatus === 'warning' && <AlertCircle size={12} />}
            {turbStatus === 'critical' && <ShieldAlert size={12} />}
            {turbStatus.toUpperCase()}
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-value-row">
            <span className="kpi-value">{turbVal !== null ? turbVal.toFixed(2) : '--'}</span>
            <span className="kpi-unit">NTU</span>
          </div>
          <div className="kpi-meta">
            <div className="kpi-range">
              <span>Screening Limit:</span>
              <strong>&le; 5.0 NTU</strong>
            </div>
            <div className="kpi-time">{formatTimeAgo(lastUpdated)}</div>
          </div>
        </div>
      </article>

      {/* TDS Card */}
      <article className={`kpi-card status-${tdsStatus}`}>
        <div className="kpi-header">
          <div className="kpi-title-group">
            <div className="kpi-icon-wrap icon-tds">
              <Activity size={20} />
            </div>
            <div>
              <span className="kpi-label">Total Dissolved Solids</span>
              <span className="kpi-sub">{selectedNode?.name || 'Selected Node'}</span>
            </div>
          </div>
          <span className={`kpi-badge badge-${tdsStatus}`}>
            {tdsStatus === 'normal' && <CheckCircle size={12} />}
            {tdsStatus === 'warning' && <AlertCircle size={12} />}
            {tdsStatus === 'critical' && <ShieldAlert size={12} />}
            {tdsStatus.toUpperCase()}
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-value-row">
            <span className="kpi-value">{tdsVal !== null ? Math.round(tdsVal) : '--'}</span>
            <span className="kpi-unit">ppm (mg/L)</span>
          </div>
          <div className="kpi-meta">
            <div className="kpi-range">
              <span>Normal Standard:</span>
              <strong>&le; 500 ppm</strong>
            </div>
            <div className="kpi-time">{formatTimeAgo(lastUpdated)}</div>
          </div>
        </div>
      </article>

      {/* Active Monitoring Nodes Card */}
      <article className="kpi-card node-summary-kpi">
        <div className="kpi-header">
          <div className="kpi-title-group">
            <div className="kpi-icon-wrap icon-nodes">
              <Radio size={20} />
            </div>
            <div>
              <span className="kpi-label">Monitoring Network</span>
              <span className="kpi-sub">Sensor Nodes</span>
            </div>
          </div>
          <span className={`connection-pill ${connectionStatus}`}>
            <span className="pulse-dot" />
            {connectionStatus.toUpperCase()}
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-value-row">
            <span className="kpi-value">{onlineNodes}</span>
            <span className="kpi-unit">/ {totalNodes} Active</span>
          </div>
          <div className="kpi-node-breakdown">
            <div className="breakdown-item">
              <span className="dot hardware" />
              <span>Node 1 Physical (ESP32):</span>
              <strong>{hardwareOnline ? 'Online' : 'Awaiting DevKit'}</strong>
            </div>
            <div className="breakdown-item">
              <span className="dot simulated" />
              <span>Nodes 2 & 3 (Simulated):</span>
              <strong>Active Feeder</strong>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

export default KPICards
