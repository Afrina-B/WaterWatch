import { CONFIG } from '../config/thresholds.js'

const THRESHOLDS = {
  ph: { normal: [6.5, 8.5], warning: [6.0, 6.5, 8.5, 9.0], critical: [0, 6.0, 9.0, 14] },
  turbidity: { normal: 5, warning: 10, critical: 10 },
  tds: { normal: 500, warning: 1000, critical: 1000 },
  temperature: { normal: 30, warning: 35, critical: 35 },
}

const severityRank = { normal: 0, warning: 1, critical: 2 }

const paramStatus = (parameter, value) => {
  if (parameter === 'ph') {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 14) return 'critical'
    if (value >= 6.5 && value <= 8.5) return 'normal'
    if ((value >= 6.0 && value < 6.5) || (value > 8.5 && value <= 9.0)) return 'warning'
    return 'critical'
  }

  if (parameter === 'turbidity' || parameter === 'tds') {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return 'critical'
    const limitNormal = parameter === 'turbidity' ? 5 : 500
    const limitWarning = parameter === 'turbidity' ? 10 : 1000
    if (value <= limitNormal) return 'normal'
    if (value <= limitWarning) return 'warning'
    return 'critical'
  }

  if (parameter === 'temperature') {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'critical'
    if (value <= 30) return 'normal'
    if (value <= 35) return 'warning'
    return 'critical'
  }

  return 'normal'
}

const buildThresholdText = (parameter, value) => {
  if (parameter === 'ph') return `pH ${value.toFixed(2)} outside screening limits`
  if (parameter === 'turbidity') return `Turbidity ${value.toFixed(2)} NTU outside screening limits`
  if (parameter === 'tds') return `TDS ${value.toFixed(0)} ppm outside screening limits`
  if (parameter === 'temperature') return `Temperature ${value.toFixed(1)}°C outside screening limits`
  return `${parameter} ${value} outside screening limits`
}

const validateReading = (reading) => {
  if (!reading || typeof reading !== 'object') return { valid: false, type: 'sensor-fault', message: 'Missing reading' }
  const keys = ['ph', 'turbidity', 'tds', 'temperature']
  for (const key of keys) {
    const current = Number(reading[key])
    if (!Number.isFinite(current)) {
      return { valid: false, type: 'sensor-fault', parameter: key, message: `${key} value is invalid` }
    }
    if (key === 'ph' && (current < 0 || current > 14)) {
      return { valid: false, type: 'sensor-fault', parameter: key, message: `${key} value is outside valid range` }
    }
    if ((key === 'turbidity' || key === 'tds') && current < 0) {
      return { valid: false, type: 'sensor-fault', parameter: key, message: `${key} value is negative` }
    }
  }
  return { valid: true }
}

export const classifyParameter = (parameter, value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'critical'
  return paramStatus(parameter, value)
}

export const buildAlert = ({ nodeId, parameter, value, severity = 'warning', type = 'threshold', subtype = null, message, thresholdText, explanation, startedAt, status = 'active', source = 'dashboard', id, resolvedAt, raw }) => ({
  id: id || `${nodeId}-${parameter}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  nodeId,
  parameter,
  value,
  severity,
  type,
  subtype,
  message: message || 'Outside screening limits',
  thresholdText: thresholdText || buildThresholdText(parameter, value),
  explanation: explanation || 'Reading triggers the monitoring rule.',
  startedAt: startedAt || Date.now(),
  resolvedAt: resolvedAt || null,
  status,
  source,
  raw,
})

export const evaluateThresholdAlert = (reading, priorState = {}) => {
  const validation = validateReading(reading)
  if (!validation.valid) {
    return buildAlert({
      nodeId: reading.nodeId,
      parameter: validation.parameter || 'sensor',
      value: reading[validation.parameter] ?? null,
      severity: 'critical',
      type: 'sensor-fault',
      subtype: 'invalid-reading',
      message: validation.message,
      thresholdText: 'Sensor fault reported',
      explanation: 'The reading is invalid and cannot be treated as a contamination event.',
      startedAt: reading.timestamp || Date.now(),
      status: 'active',
      source: 'dashboard',
    })
  }

  const params = ['ph', 'turbidity', 'tds']
  const results = []
  params.forEach((key) => {
    const value = Number(reading[key])
    const status = classifyParameter(key, value)
    if (status === 'normal') return
    const severity = status === 'warning' ? 'warning' : 'critical'
    results.push({
      nodeId: reading.nodeId,
      parameter: key,
      value,
      severity,
      type: 'threshold',
      subtype: 'screening-limit',
      message: 'Outside screening limits',
      thresholdText: buildThresholdText(key, value),
      explanation: `${buildThresholdText(key, value)}. This value is outside the screening range for this parameter.`,
      startedAt: reading.timestamp || Date.now(),
      source: 'dashboard',
    })
  })

  return results[0] || null
}

export const getNodeHealth = (node, latestReading, activeAlerts) => {
  const lastSeen = latestReading?.timestamp || 0
  const now = Date.now()
  if (!latestReading) return 'Offline'
  if (now - lastSeen > CONFIG.OFFLINE_AFTER_MS) return 'Offline'
  if (now - lastSeen > CONFIG.STALE_AFTER_MS) return 'Stale'
  return 'Online'
}

export const summarizeNodeStatus = (nodeId, alerts) => {
  const active = alerts.filter((alert) => alert.nodeId === nodeId && alert.status === 'active')
  if (active.length === 0) return 'normal'
  return active.reduce((worst, next) => (severityRank[next.severity] > severityRank[worst] ? next.severity : worst), 'normal')
}

export default {
  evaluateThresholdAlert,
  classifyParameter,
  buildAlert,
  getNodeHealth,
  summarizeNodeStatus,
}
