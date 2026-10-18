const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const error = new Error(errorBody.error || `HTTP error ${response.status}`)
    error.status = response.status
    error.body = errorBody
    throw error
  }
  return response.json()
}

export const apiClient = {
  // Health
  getHealth: () => request('/api/health'),

  // Nodes
  getNodes: () => request('/api/nodes'),
  getNode: (nodeId) => request(`/api/nodes/${encodeURIComponent(nodeId)}`),

  // Readings
  getLatestReadings: (nodeId) => {
    const q = nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : ''
    return request(`/api/readings/latest${q}`)
  },
  getReadings: ({ nodeId, limit = 50, hours = 24 } = {}) => {
    const params = new URLSearchParams()
    if (nodeId) params.append('node_id', nodeId)
    if (limit) params.append('limit', limit)
    if (hours) params.append('hours', hours)
    return request(`/api/readings?${params.toString()}`)
  },
  getNodeReadings: (nodeId, { limit = 50, hours = 24 } = {}) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit)
    if (hours) params.append('hours', hours)
    return request(`/api/nodes/${encodeURIComponent(nodeId)}/readings?${params.toString()}`)
  },
  postReading: (payload) =>
    request('/api/readings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Alerts
  getAlerts: ({ status, nodeId, severity, limit = 50 } = {}) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (nodeId) params.append('node_id', nodeId)
    if (severity) params.append('severity', severity)
    if (limit) params.append('limit', limit)
    return request(`/api/alerts?${params.toString()}`)
  },
  patchAlert: (alertId, status) =>
    request(`/api/alerts/${encodeURIComponent(alertId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Statistics
  getSummaryStats: () => request('/api/statistics/summary'),
  getTrends: (nodeId = 'NODE-01', hours = 24) =>
    request(`/api/statistics/trends?node_id=${encodeURIComponent(nodeId)}&hours=${hours}`),

  // Simulator Controls
  getSimulatorStatus: () => request('/api/simulator/status'),
  setSimulatorScenario: (scenario) =>
    request('/api/simulator/scenario', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),
}

export default apiClient
