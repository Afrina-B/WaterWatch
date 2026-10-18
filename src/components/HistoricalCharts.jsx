import { useState, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Clock, Filter, LineChart as ChartIcon } from 'lucide-react'

const TIME_WINDOWS = [
  { label: '1 Hour', value: 1 },
  { label: '6 Hours', value: 6 },
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
]

export function HistoricalCharts({ nodes, selectedNodeId, onSelectNode, history }) {
  const [activeWindow, setActiveWindow] = useState(24)
  const [activeTab, setActiveTab] = useState('ph') // 'ph', 'turbidity', 'tds', 'multi'

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]

  // Filter history for selected node and active time window
  const chartData = useMemo(() => {
    const cutoff = Date.now() - activeWindow * 3600 * 1000
    const nodeItems = history
      .filter((r) => r.nodeId === selectedNodeId && r.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp)

    return nodeItems.map((entry) => {
      const d = new Date(entry.timestamp)
      const timeStr =
        activeWindow <= 24
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

      return {
        timestamp: entry.timestamp,
        time: timeStr,
        ph: entry.ph !== undefined ? Number(entry.ph) : null,
        turbidity: entry.turbidity !== undefined ? Number(entry.turbidity) : null,
        tds: entry.tds !== undefined ? Number(entry.tds) : null,
        temperature: entry.temperature !== undefined ? Number(entry.temperature) : 25.0,
      }
    })
  }, [history, selectedNodeId, activeWindow])

  return (
    <article className="chart-panel-card">
      <div className="chart-panel-header">
        <div className="chart-panel-title">
          <ChartIcon size={20} className="icon-accent" />
          <div>
            <h3>Water Quality Time-Series Telemetry</h3>
            <p className="chart-subtitle">
              Timestamped measurements for <strong>{selectedNode?.name}</strong>{' '}
              {selectedNode?.isHardware ? '(Physical ESP32)' : '(Simulated Node)'}
            </p>
          </div>
        </div>

        <div className="chart-controls">
          {/* Node Picker */}
          <div className="segmented-control node-selector">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`control-btn ${selectedNodeId === node.id ? 'active' : ''}`}
                onClick={() => onSelectNode(node.id)}
              >
                {node.id}
              </button>
            ))}
          </div>

          {/* Time Window Picker */}
          <div className="segmented-control window-selector">
            <Clock size={14} className="control-icon" />
            {TIME_WINDOWS.map((win) => (
              <button
                key={win.value}
                type="button"
                className={`control-btn ${activeWindow === win.value ? 'active' : ''}`}
                onClick={() => setActiveWindow(win.value)}
              >
                {win.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="chart-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'ph' ? 'active' : ''}`}
          onClick={() => setActiveTab('ph')}
        >
          pH Level (6.5 - 8.5)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'turbidity' ? 'active' : ''}`}
          onClick={() => setActiveTab('turbidity')}
        >
          Turbidity (&le; 5 NTU)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'tds' ? 'active' : ''}`}
          onClick={() => setActiveTab('tds')}
        >
          TDS (&le; 500 ppm)
        </button>
      </div>

      <div className="chart-canvas-wrap">
        {chartData.length === 0 ? (
          <div className="chart-empty-state">
            <Filter size={32} />
            <p>No historical telemetry available for this node in the selected time window.</p>
            <span>Readings will populate as the sensor node streams telemetry.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {activeTab === 'ph' ? (
              <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" vertical={false} />
                <XAxis dataKey="time" stroke="#627d71" tick={{ fontSize: 12 }} />
                <YAxis domain={[4.5, 10.0]} stroke="#627d71" tick={{ fontSize: 12 }} unit=" pH" />
                <Tooltip
                  formatter={(val) => [`${Number(val).toFixed(2)} pH`, 'pH Level']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cce3d8', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                {/* Standard Threshold Reference Lines */}
                <ReferenceLine y={8.5} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'Upper Limit (8.50 pH)', fill: '#d97706', fontSize: 11 }} />
                <ReferenceLine y={6.5} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'Lower Limit (6.50 pH)', fill: '#d97706', fontSize: 11 }} />
                <ReferenceLine y={7.0} stroke="#16a34a" strokeDasharray="2 2" opacity={0.5} label={{ value: 'Neutral (7.00)', fill: '#16a34a', fontSize: 10 }} />
                <Area type="monotone" dataKey="ph" stroke="#0d9488" strokeWidth={2.5} fill="url(#phGradient)" />
              </AreaChart>
            ) : activeTab === 'turbidity' ? (
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" vertical={false} />
                <XAxis dataKey="time" stroke="#627d71" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 'auto']} stroke="#627d71" tick={{ fontSize: 12 }} unit=" NTU" />
                <Tooltip
                  formatter={(val) => [`${Number(val).toFixed(2)} NTU`, 'Turbidity']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cce3d8', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                <ReferenceLine y={5.0} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'Warning Limit (5.0 NTU)', fill: '#d97706', fontSize: 11 }} />
                <ReferenceLine y={10.0} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Critical Limit (10.0 NTU)', fill: '#dc2626', fontSize: 11 }} />
                <Line type="monotone" dataKey="turbidity" stroke="#0284c7" strokeWidth={2.5} dot={chartData.length < 30} />
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="tdsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" vertical={false} />
                <XAxis dataKey="time" stroke="#627d71" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 'auto']} stroke="#627d71" tick={{ fontSize: 12 }} unit=" ppm" />
                <Tooltip
                  formatter={(val) => [`${Math.round(val)} ppm`, 'Total Dissolved Solids']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cce3d8', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                <ReferenceLine y={500} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'Standard (500 ppm)', fill: '#d97706', fontSize: 11 }} />
                <ReferenceLine y={1000} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Critical (1000 ppm)', fill: '#dc2626', fontSize: 11 }} />
                <Area type="monotone" dataKey="tds" stroke="#2563eb" strokeWidth={2.5} fill="url(#tdsGradient)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </article>
  )
}

export default HistoricalCharts
