import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Cpu,
  Database,
  Droplets,
  HelpCircle,
  History,
  LayoutDashboard,
  MapPin,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useMonitoring } from '../context/MonitoringContext.jsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/map', label: 'Map View', icon: MapPin },
  { to: '/nodes', label: 'Sensor Nodes', icon: Cpu },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle, hasBadge: true },
  { to: '/history', label: 'Historical Data', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  const {
    dataMode,
    connectionStatus,
    alerts,
    soundMuted,
    setSoundMuted,
    searchTerm,
    setSearchTerm,
    selectedNodeId,
    nodes,
  } = useMonitoring()

  const [currentTime, setCurrentTime] = useState(new Date())
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const activeAlerts = alerts.filter((a) => a.status === 'active')
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]

  const getSourceBadgeText = () => {
    if (dataMode === 'api') return 'API LIVE'
    if (dataMode === 'mqtt') return 'MQTT BROKER'
    return 'SIMULATED'
  }

  return (
    <div className="waterwatch-shell">
      {/* Sidebar Navigation */}
      <aside className={`waterwatch-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-wrap">
            <Waves size={26} className="brand-icon" />
          </div>
          <div className="brand-text-wrap">
            <h2>WaterWatch</h2>
            <span className="brand-tagline">Sensor Network (Hybrid)</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">MONITORING</div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="link-icon" />
                <span className="link-label">{item.label}</span>
                {item.hasBadge && activeAlerts.length > 0 && (
                  <span className="link-badge">{Math.min(activeAlerts.length, 99)}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="node-active-badge">
            <div className="node-active-indicator">
              <span className={`status-dot ${selectedNode?.status === 'online' ? 'online' : 'offline'}`} />
            </div>
            <div className="node-active-info">
              <span className="node-active-name">{selectedNode?.id}</span>
              <span className="node-active-sub">
                {selectedNode?.isHardware ? 'Physical ESP32' : 'Simulated'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="waterwatch-main-viewport">
        {/* Top Header */}
        <header className="waterwatch-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle Navigation"
            >
              <Waves size={20} />
            </button>

            {/* Search field for nodes or locations */}
            <div className="header-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search nodes, streams, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="header-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchTerm('')}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="header-right">
            {/* Live Clock */}
            <div className="header-time-pill">
              <span className="time-text">
                {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="time-clock">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Connection Indicator */}
            <div className="header-status-pill">
              <span className={`connection-dot status-${connectionStatus}`} />
              <span className="status-label">{getSourceBadgeText()}</span>
            </div>

            {/* Audio Mute Toggle */}
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => setSoundMuted((v) => !v)}
              title={soundMuted ? 'Unmute alert audio' : 'Mute alert audio'}
            >
              {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Alerts Dropdown Quick Link */}
            <NavLink to="/alerts" className="header-icon-btn alert-btn" title="View Alerts">
              <Bell size={18} />
              {activeAlerts.length > 0 && (
                <span className="header-alert-counter">{activeAlerts.length}</span>
              )}
            </NavLink>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="waterwatch-content-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
