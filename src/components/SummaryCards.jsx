import { Activity, BellRing, Radio, ShieldAlert } from 'lucide-react'

export function SummaryCards({ latestReadings, alerts, nodeCount, connectionStatus }) {
  const activeAlerts = alerts.filter((alert) => alert.status === 'active')
  const onlineCount = Object.values(latestReadings).filter(Boolean).length
  const worst = activeAlerts.reduce((current, alert) => {
    if (alert.severity === 'critical') return 'critical'
    if (alert.severity === 'warning' && current !== 'critical') return 'warning'
    return current
  }, 'normal')

  const cards = [
    { label: 'Nodes online', value: `${onlineCount}/${nodeCount}`, icon: Radio },
    { label: 'Active alerts', value: String(activeAlerts.length), icon: BellRing },
    { label: 'Overall status', value: worst === 'normal' ? 'Stable' : worst.toUpperCase(), icon: ShieldAlert },
    { label: 'Connection', value: connectionStatus.toUpperCase(), icon: Activity },
  ]

  return (
    <section className="summary-grid">
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="summary-card">
          <div className="summary-icon"><Icon size={18} /></div>
          <div>
            <div className="summary-label">{label}</div>
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </section>
  )
}

export default SummaryCards
