export function AlertFeed({ alerts }) {
  const recent = [...alerts].slice(-5).reverse()

  return (
    <aside className="alert-feed">
      <div className="panel-header">
        <h3>Recent alerts</h3>
      </div>
      {recent.map((alert) => (
        <div key={alert.id} className={`alert-item ${alert.severity}`}>
          <strong>{alert.nodeId}</strong>
          <span>{alert.parameter}</span>
          <em>{alert.message}</em>
        </div>
      ))}
    </aside>
  )
}

export default AlertFeed
