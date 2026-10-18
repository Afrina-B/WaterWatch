import { useState, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMonitoring } from '../context/MonitoringContext.jsx'
import { Activity, BarChart2, Droplets, Gauge, ShieldAlert, Sparkles } from 'lucide-react'

export function AnalyticsPage() {
  const { nodes, selectedNodeId, setSelectedNodeId, history, alerts } = useMonitoring()
  const [timeRange, setTimeRange] = useState(24) // hours

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]

  // Filter history for selected node
  const chartData = useMemo(() => {
    const cutoff = Date.now() - timeRange * 3600 * 1000
    const filtered = history
      .filter((r) => r.nodeId === selectedNodeId && r.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp)

    return filtered.map((entry) => {
      const d = new Date(entry.timestamp)
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: entry.timestamp,
        ph: Number(entry.ph || 0),
        turbidity: Number(entry.turbidity || 0),
        tds: Number(entry.tds || 0),
        temperature: Number(entry.temperature || 25),
      }
    })
  }, [history, selectedNodeId, timeRange])

  // Summary statistics for selected node
  const stats = useMemo(() => {
    if (!chartData.length) return null
    const phVals = chartData.map((d) => d.ph).filter((v) => v > 0)
    const turbVals = chartData.map((d) => d.turbidity)
    const tdsVals = chartData.map((d) => d.tds)

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const min = (arr) => (arr.length ? Math.min(...arr) : 0)
    const max = (arr) => (arr.length ? Math.max(...arr) : 0)

    return {
      ph: { avg: avg(phVals).toFixed(2), min: min(phVals).toFixed(2), max: max(phVals).toFixed(2) },
      turb: { avg: avg(turbVals).toFixed(2), min: min(turbVals).toFixed(2), max: max(turbVals).toFixed(2) },
      tds: { avg: Math.round(avg(tdsVals)), min: Math.round(min(tdsVals)), max: Math.round(max(tdsVals)) },
      count: chartData.length,
    }
  }, [chartData])

  return (
    <div className="analytics-page-wrapper">
      <div className="page-header-row">
        <div>
          <span className="page-eyebrow">Hydrological Analytics & Statistical Modeling</span>
          <h2>Water Quality Trends & Anomaly Distribution</h2>
          <p className="page-description">
            Evaluate time-series distributions, statistical variance, and multivariate trends across monitoring nodes.
          </p>
        </div>

        <div className="analytics-control-bar">
          <div className="segmented-control node-selector">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`control-btn ${selectedNodeId === node.id ? 'active' : ''}`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                {node.id}
              </button>
            ))}
          </div>

          <div className="segmented-control range-selector">
            {[6, 12, 24, 72].map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={`control-btn ${timeRange === hrs ? 'active' : ''}`}
                onClick={() => setTimeRange(hrs)}
              >
                {hrs}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      {stats && (
        <div className="analytics-summary-strip">
          <div className="analytics-stat-card">
            <div className="stat-card-title">
              <Gauge size={16} className="icon-ph" />
              <span>pH Statistics</span>
            </div>
            <div className="stat-card-val">{stats.ph.avg} pH</div>
            <div className="stat-card-sub">
              Min: <strong>{stats.ph.min}</strong> | Max: <strong>{stats.ph.max}</strong>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="stat-card-title">
              <Droplets size={16} className="icon-turb" />
              <span>Turbidity Statistics</span>
            </div>
            <div className="stat-card-val">{stats.turb.avg} NTU</div>
            <div className="stat-card-sub">
              Min: <strong>{stats.turb.min}</strong> | Max: <strong>{stats.turb.max}</strong>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="stat-card-title">
              <Activity size={16} className="icon-tds" />
              <span>TDS Statistics</span>
            </div>
            <div className="stat-card-val">{stats.tds.avg} ppm</div>
            <div className="stat-card-sub">
              Min: <strong>{stats.tds.min}</strong> | Max: <strong>{stats.tds.max}</strong>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="stat-card-title">
              <BarChart2 size={16} className="icon-teal" />
              <span>Samples Analyzed</span>
            </div>
            <div className="stat-card-val">{stats.count}</div>
            <div className="stat-card-sub">
              Station: <strong>{selectedNode?.name.split(' - ')[0]}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* pH Area Chart */}
        <div className="chart-card-box full-width">
          <div className="chart-box-header">
            <h3>pH Screening Range Profile ({selectedNode?.name})</h3>
            <span className="chart-tag">Normal Baseline: 6.50 - 8.50 pH</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="phAnalyticsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" vertical={false} />
              <XAxis dataKey="time" stroke="#627d71" tick={{ fontSize: 12 }} />
              <YAxis domain={[5.0, 9.5]} stroke="#627d71" tick={{ fontSize: 12 }} unit=" pH" />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #cce3d8' }} />
              <Area type="monotone" dataKey="ph" stroke="#0d9488" strokeWidth={2.5} fill="url(#phAnalyticsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Turbidity vs TDS Dual Chart */}
        <div className="chart-card-box">
          <div className="chart-box-header">
            <h3>Turbidity Trendline (NTU)</h3>
            <span className="chart-tag">Screening Limit: &le; 5.0 NTU</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" vertical={false} />
              <XAxis dataKey="time" stroke="#627d71" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 'auto']} stroke="#627d71" tick={{ fontSize: 11 }} unit=" NTU" />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #cce3d8' }} />
              <Line type="monotone" dataKey="turbidity" stroke="#0284c7" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TDS Bar Distribution */}
        <div className="chart-card-box">
          <div className="chart-box-header">
            <h3>Total Dissolved Solids (ppm)</h3>
            <span className="chart-tag">Drinking Standard: &le; 500 ppm</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData.slice(-30)} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" vertical={false} />
              <XAxis dataKey="time" stroke="#627d71" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 'auto']} stroke="#627d71" tick={{ fontSize: 11 }} unit=" ppm" />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #cce3d8' }} />
              <Bar dataKey="tds" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
