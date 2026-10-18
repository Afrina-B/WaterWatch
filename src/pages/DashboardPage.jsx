import { useMonitoring } from '../context/MonitoringContext.jsx'
import { KPICards } from '../components/KPICards.jsx'
import { NetworkMap } from '../components/NetworkMap.jsx'
import { RealTimeAndAlertsPanel } from '../components/RealTimeAndAlertsPanel.jsx'
import { HistoricalCharts } from '../components/HistoricalCharts.jsx'
import { DataTablePanel } from '../components/DataTablePanel.jsx'

export function DashboardPage() {
  const {
    nodes,
    latestReadings,
    alerts,
    selectedNodeId,
    setSelectedNodeId,
    connectionStatus,
    activeAlertCount,
    history,
    patchAlertStatus,
  } = useMonitoring()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]
  const currentReading = latestReadings[selectedNode?.id]

  return (
    <div className="dashboard-page-flow">
      {/* 1. Top KPI Summary Cards */}
      <KPICards
        selectedNode={selectedNode}
        latestReading={currentReading}
        allNodes={nodes}
        activeAlertCount={activeAlertCount}
        connectionStatus={connectionStatus}
      />

      {/* 2. Middle Row: Interactive Map + Real-Time & Alert Feed */}
      <section className="dashboard-middle-section">
        <div className="map-panel-card">
          <div className="card-header-clean">
            <div>
              <span className="card-eyebrow">GIS Spatial Network</span>
              <h3>Monitoring Node Locations & Catchment</h3>
            </div>
            <div className="map-legend">
              <span className="legend-item">
                <span className="dot hw" /> Physical ESP32
              </span>
              <span className="legend-item">
                <span className="dot sim" /> Simulated Node
              </span>
            </div>
          </div>
          <NetworkMap
            nodes={nodes}
            latestReadings={latestReadings}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            height="390px"
          />
        </div>

        {/* Real-time Readings & Alert Engine Feed */}
        <RealTimeAndAlertsPanel
          selectedNode={selectedNode}
          latestReading={currentReading}
          alerts={alerts}
          history={history}
          onPatchAlert={patchAlertStatus}
        />
      </section>

      {/* 3. Historical Time-Series Charts with Configurable Windows & Threshold Lines */}
      <section className="dashboard-charts-section">
        <HistoricalCharts
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          history={history}
        />
      </section>

      {/* 4. Tables: Node Status & Persisted Measurements */}
      <section className="dashboard-tables-section">
        <DataTablePanel
          nodes={nodes}
          latestReadings={latestReadings}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          history={history}
        />
      </section>
    </div>
  )
}

export default DashboardPage
