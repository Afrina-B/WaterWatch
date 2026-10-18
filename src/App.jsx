import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MonitoringProvider } from './context/MonitoringContext.jsx'
import { Layout } from './components/Layout.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { MapPage } from './pages/MapPage.jsx'
import { NodesPage } from './pages/NodesPage.jsx'
import { AnalyticsPage } from './pages/AnalyticsPage.jsx'
import { AlertsPage } from './pages/AlertsPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'

export function App() {
  return (
    <BrowserRouter>
      <MonitoringProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/nodes" element={<NodesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </MonitoringProvider>
    </BrowserRouter>
  )
}

export default App
