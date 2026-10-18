import { CONFIG } from '../config/thresholds.js'
import { nodes } from '../config/nodes.js'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const median = (values) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

const mad = (values, center) => {
  if (!values.length) return 0
  return median(values.map((value) => Math.abs(value - center)))
}

const modifiedZScore = (value, series, noiseFloor = 0.01) => {
  if (series.length < 3) return 0
  const center = median(series)
  const deviation = mad(series, center) || noiseFloor
  if (deviation <= 0) return 0
  return 0.6745 * ((value - center) / Math.max(deviation, noiseFloor))
}

const getSeriesForNode = (history, nodeId, parameter) =>
  history
    .filter((reading) => reading.nodeId === nodeId && reading[parameter] !== undefined && Number.isFinite(reading[parameter]))
    .map((reading) => Number(reading[parameter]))

export const computeNodeAnomalyScore = (history, nodeId) => {
  const series = HISTORY_BY_NODE_AND_PARAM(history, nodeId)
  const scores = []
  Object.entries(series).forEach(([param, values]) => {
    if (!values.length) return
    const z = Math.abs(modifiedZScore(values.at(-1), values.slice(-20), CONFIG.ANOMALY.NOISE_FLOOR[param] || 1))
    if (z > 0.1) scores.push(Math.min(100, z * 15))
  })
  return scores.length ? Math.max(...scores) : 0
}

const HISTORY_BY_NODE_AND_PARAM = (history, nodeId) => {
  const byParam = {}
  history.forEach((reading) => {
    if (reading.nodeId !== nodeId) return
    Object.keys(CONFIG.ANOMALY.NOISE_FLOOR).forEach((param) => {
      if (reading[param] !== undefined && Number.isFinite(reading[param])) {
        byParam[param] = byParam[param] || []
        byParam[param].push(Number(reading[param]))
      }
    })
  })
  return byParam
}

export const detectAnomalies = (history, nodeId, parameter, reading) => {
  const series = getSeriesForNode(history, nodeId, parameter)
  if (series.length < 20) return []
  const latest = Number(reading[parameter])
  const ref = series.slice(-Math.min(series.length, CONFIG.ANOMALY.BASELINE_WINDOW))
  const center = median(ref)
  const robust = mad(ref, center) || CONFIG.ANOMALY.NOISE_FLOOR[parameter]
  const z = 0.6745 * ((latest - center) / Math.max(robust, CONFIG.ANOMALY.NOISE_FLOOR[parameter]))
  if (Math.abs(z) > CONFIG.ANOMALY.MZ_THRESHOLD) {
    return [{
      nodeId,
      parameter,
      subtype: 'statistical',
      score: clamp(Math.abs(z) * 15, 0, 100),
      explanation: `${parameter.toUpperCase()} ${latest} is ${Math.abs(z).toFixed(1)} robust standard deviations from its recent median (${center.toFixed(2)}). Still inside the normal limit, but unusual for this node.`,
      values: { latest, median: center, mad: robust, z },
    }]
  }
  return []
}

export const detectSuddenChange = (history, nodeId, parameter, reading) => {
  const series = getSeriesForNode(history, nodeId, parameter)
  if (series.length < 3) return []
  const recent = series.slice(-3)
  const baseline = recent.slice(0, 2)
  const delta = Math.abs(recent.at(-1) - baseline.at(-1))
  const threshold = CONFIG.ANOMALY.RATE_LIMITS[parameter]
  if (delta > threshold) {
    return [{
      nodeId,
      parameter,
      subtype: 'sudden-change',
      score: clamp((delta / threshold) * 25, 0, 100),
      explanation: `${parameter.toUpperCase()} changed by ${delta.toFixed(2)} over the last 3 readings, exceeding the rate limit of ${threshold}.`,
      values: { delta, threshold },
    }]
  }
  return []
}

export const detectMultivariate = (history, nodeId, reading) => {
  const paramSet = ['ph', 'turbidity']
  const relevant = history.filter((item) => item.nodeId === nodeId).slice(-20)
  if (relevant.length < 5) return []
  const last = relevant.at(-1)
  const phSeries = relevant.map((item) => item.ph)
  const turbSeries = relevant.map((item) => item.turbidity)
  const phMad = mad(phSeries, median(phSeries)) || CONFIG.ANOMALY.NOISE_FLOOR.ph
  const turbMad = mad(turbSeries, median(turbSeries)) || CONFIG.ANOMALY.NOISE_FLOOR.turbidity
  const phZ = 0.6745 * ((reading.ph - median(phSeries)) / Math.max(phMad, CONFIG.ANOMALY.NOISE_FLOOR.ph))
  const turbZ = 0.6745 * ((reading.turbidity - median(turbSeries)) / Math.max(turbMad, CONFIG.ANOMALY.NOISE_FLOOR.turbidity))
  if (reading.turbidity > 10 && reading.ph < 6.2 && Math.abs(phZ) > 2.5 && Math.abs(turbZ) > 2.5) {
    return [{
      nodeId,
      parameter: 'turbidity',
      subtype: 'multi-parameter',
      score: 92,
      explanation: 'Possible contamination event: turbidity rising while pH falling.',
      values: { phZ, turbZ },
    }]
  }
  return []
}

export const detectSpatial = (history, nodeId, reading) => {
  const upstream = history.filter((item) => item.nodeId === 'NODE-01').at(-1)
  const current = history.filter((item) => item.nodeId === nodeId).at(-1)
  if (!upstream || !current) return []
  const params = ['ph', 'turbidity', 'tds']
  const alerts = []
  params.forEach((parameter) => {
    const deltas = history
      .filter((item) => item.nodeId === 'NODE-01' || item.nodeId === nodeId)
      .slice(-30)
      .map((item) => item[parameter])
    const ref = deltas.slice(0, 1)
    const value = Number(current[parameter]) - Number(upstream[parameter])
    const z = modifiedZScore(value, deltas, CONFIG.ANOMALY.NOISE_FLOOR[parameter])
    if (Math.abs(z) > CONFIG.ANOMALY.MZ_THRESHOLD) {
      alerts.push({
        nodeId,
        parameter,
        subtype: 'spatial',
        score: clamp(Math.abs(z) * 15, 0, 100),
        explanation: `${parameter.toUpperCase()} is elevated relative to upstream flow, consistent with a spatial contamination signal.`,
        values: { diff: value, z },
      })
    }
  })
  return alerts
}

export default {
  computeNodeAnomalyScore,
  detectAnomalies,
  detectSuddenChange,
  detectMultivariate,
  detectSpatial,
}
