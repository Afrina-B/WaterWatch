import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { nodes as initialNodes } from '../config/nodes.js'
import { CONFIG } from '../config/thresholds.js'
import { simulatorSource } from '../services/simulatorSource.js'
import { mqttSource } from '../services/mqttSource.js'
import { apiSource } from '../services/apiSource.js'
import { startDataSource, stopDataSource } from '../services/common.js'
import apiClient from '../services/apiClient.js'
import { summarizeNodeStatus, buildAlert } from '../utils/alertEngine.js'
import {
  computeNodeAnomalyScore,
  detectAnomalies,
  detectMultivariate,
  detectSpatial,
  detectSuddenChange,
} from '../utils/anomalyEngine.js'

const MonitoringContext = createContext(null)

const dataSourceMap = {
  api: apiSource,
  simulator: simulatorSource,
  mqtt: mqttSource,
}

const getNodeLatest = (history, nodeId) =>
  [...history]
    .filter((reading) => reading.nodeId === nodeId)
    .sort((a, b) => b.timestamp - a.timestamp)[0] || null

export function MonitoringProvider({ children }) {
  const [nodes, setNodes] = useState(initialNodes)
  const [readingsByNode, setReadingsByNode] = useState(() =>
    Object.fromEntries(initialNodes.map((node) => [node.id, []])),
  )
  const [alerts, setAlerts] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState('NODE-01')
  const [dataMode, setDataMode] = useState(import.meta.env.VITE_DATA_MODE || 'api')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [soundMuted, setSoundMuted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [simulatorScenario, setSimulatorScenarioState] = useState('normal')
  const [backendSummary, setBackendSummary] = useState(null)
  const sourceRef = useRef(null)

  // 1. Initial load from backend (if available)
  useEffect(() => {
    let mounted = true

    async function loadInitialBackendData() {
      try {
        const [nodesData, readingsData, alertsData, summaryData] = await Promise.all([
          apiClient.getNodes().catch(() => null),
          apiClient.getReadings({ limit: 120 }).catch(() => null),
          apiClient.getAlerts({ limit: 40 }).catch(() => null),
          apiClient.getSummaryStats().catch(() => null),
        ])

        if (!mounted) return

        if (Array.isArray(nodesData) && nodesData.length > 0) {
          setNodes(nodesData)
        }

        if (Array.isArray(readingsData) && readingsData.length > 0) {
          const grouped = Object.fromEntries(initialNodes.map((n) => [n.id, []]))
          readingsData.forEach((r) => {
            const id = r.nodeId
            if (!grouped[id]) grouped[id] = []
            grouped[id].push({
              ...r,
              timestamp: r.timestamp || (r.receivedAt ? new Date(r.receivedAt).getTime() : Date.now()),
            })
          })
          setReadingsByNode(grouped)
        }

        if (Array.isArray(alertsData)) {
          setAlerts(alertsData)
        }

        if (summaryData) {
          setBackendSummary(summaryData)
        }
      } catch (err) {
        console.info('Backend initial sync notice:', err.message)
      }
    }

    loadInitialBackendData()
    return () => {
      mounted = false
    }
  }, [])

  // 2. Latest readings per node
  const latestReadings = useMemo(() => {
    const latest = {}
    nodes.forEach((node) => {
      latest[node.id] = getNodeLatest(Object.values(readingsByNode).flat(), node.id)
    })
    return latest
  }, [nodes, readingsByNode])

  const history = useMemo(
    () => Object.values(readingsByNode).flat().slice(-300),
    [readingsByNode],
  )

  const updateReadingHistory = (reading) => {
    const next = { ...reading, timestamp: reading.timestamp || Date.now() }
    setReadingsByNode((current) => {
      const list = current[next.nodeId] || []
      // Avoid duplicate timestamp entries
      if (list.length > 0 && list[list.length - 1].timestamp === next.timestamp) {
        return current
      }
      const merged = [...list, next].slice(-250)
      return { ...current, [next.nodeId]: merged }
    })
  }

  // 3. Connect to selected data source (API Live / Simulator / MQTT)
  useEffect(() => {
    if (sourceRef.current) {
      stopDataSource(sourceRef.current)
    }

    const activeSource = dataSourceMap[dataMode] || dataSourceMap.api
    sourceRef.current = activeSource

    setConnectionStatus('connecting')

    startDataSource(activeSource, {
      onReading: (reading) => {
        updateReadingHistory(reading)
      },
      onDeviceAlert: (alert) => {
        setAlerts((current) => {
          const existingIdx = current.findIndex((a) => a.id === alert.id)
          if (existingIdx >= 0) {
            const updated = [...current]
            updated[existingIdx] = { ...updated[existingIdx], ...alert }
            return updated
          }
          return [alert, ...current].slice(0, 80)
        })
      },
      onStatus: (status) => setConnectionStatus(status),
    })

    return () => {
      if (sourceRef.current) stopDataSource(sourceRef.current)
    }
  }, [dataMode])

  // 4. Acknowledge or Resolve Alert via API
  const patchAlertStatus = async (alertId, newStatus) => {
    try {
      if (dataMode === 'api') {
        await apiClient.patchAlert(alertId, newStatus)
      }
      setAlerts((current) =>
        current.map((a) =>
          a.id === alertId ? { ...a, status: newStatus, resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : a.resolvedAt } : a,
        ),
      )
    } catch (err) {
      console.error('Failed to update alert status:', err)
    }
  }

  // 5. Change Simulator Scenario
  const setSimulatorScenario = async (scenario) => {
    setSimulatorScenarioState(scenario)
    try {
      if (dataMode === 'api') {
        await apiClient.setSimulatorScenario(scenario)
      } else if (dataMode === 'simulator') {
        if (scenario === 'critical') simulatorSource.injectContamination('NODE-02')
        else if (scenario === 'warning') simulatorSource.injectSubtleAnomaly('NODE-02')
        else simulatorSource.reset()
      }
    } catch (err) {
      console.warn('Could not set simulator scenario:', err)
    }
  }

  // 6. Node Statuses
  const nodeStatuses = useMemo(() => {
    return Object.fromEntries(
      nodes.map((node) => {
        const latest = latestReadings[node.id]
        const active = alerts.filter((alert) => alert.nodeId === node.id && alert.status === 'active')
        const status = active.length
          ? active.reduce((best, alert) => {
              const order = { normal: 0, warning: 1, critical: 2 }
              return order[alert.severity] > order[best] ? alert.severity : best
            }, 'normal')
          : 'normal'

        const isOnline = latest && Date.now() - latest.timestamp < CONFIG.OFFLINE_AFTER_MS
        const isStale = latest && !isOnline && Date.now() - latest.timestamp < 60000
        const health = isOnline ? 'Online' : isStale ? 'Stale' : 'Offline'

        return [node.id, { status, health }]
      }),
    )
  }, [nodes, alerts, latestReadings])

  const activeAlertCount = useMemo(
    () => alerts.filter((a) => a.status === 'active').length,
    [alerts],
  )

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes
    const term = searchTerm.toLowerCase()
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(term) ||
        n.id.toLowerCase().includes(term) ||
        (n.location && n.location.toLowerCase().includes(term)),
    )
  }, [nodes, searchTerm])

  const value = useMemo(
    () => ({
      nodes: filteredNodes,
      allNodes: nodes,
      readingsByNode,
      latestReadings,
      alerts,
      activeAlertCount,
      selectedNodeId,
      setSelectedNodeId,
      dataMode,
      setDataMode,
      connectionStatus,
      soundMuted,
      setSoundMuted,
      searchTerm,
      setSearchTerm,
      simulatorScenario,
      setSimulatorScenario,
      nodeStatuses,
      history,
      backendSummary,
      patchAlertStatus,
    }),
    [
      filteredNodes,
      nodes,
      readingsByNode,
      latestReadings,
      alerts,
      activeAlertCount,
      selectedNodeId,
      dataMode,
      connectionStatus,
      soundMuted,
      searchTerm,
      simulatorScenario,
      nodeStatuses,
      history,
      backendSummary,
    ],
  )

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}

export function useMonitoring() {
  const context = useContext(MonitoringContext)
  if (!context) throw new Error('useMonitoring must be used within MonitoringProvider')
  return context
}

export default MonitoringContext
