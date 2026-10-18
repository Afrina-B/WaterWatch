import { nodes } from '../config/nodes.js'

const baselines = {
  'NODE-01': { ph: 7.1, turbidity: 2, tds: 180, temperature: 27 },
  'NODE-02': { ph: 7.0, turbidity: 3, tds: 300, temperature: 27 },
  'NODE-03': { ph: 7.3, turbidity: 3, tds: 250, temperature: 27 },
}

const noise = { ph: 0.03, turbidity: 0.15, tds: 4, temperature: 0.1 }
const offline = new Set()
const state = {
  interval: null,
  contaminationStart: null,
  subtleStart: null,
  docExample: false,
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const randomNoise = (value, sigma) => {
  const n = (Math.random() - 0.5) * sigma * 2
  return Number((value + n).toFixed(2))
}

const makeReading = (nodeId, override = {}) => {
  const base = baselines[nodeId] || baselines['NODE-01']
  const reading = {
    nodeId,
    timestamp: Date.now(),
    ph: randomNoise(base.ph, noise.ph),
    turbidity: randomNoise(base.turbidity, noise.turbidity),
    tds: randomNoise(base.tds, noise.tds),
    temperature: randomNoise(base.temperature, noise.temperature),
    rssi: -58 - Math.random() * 18,
    uptime: Math.floor(Math.random() * 5000) + 100,
  }

  return { ...reading, ...override }
}

const buildContaminationFlow = (now, nodeId) => {
  if (nodeId === 'NODE-02') {
    return {
      ph: 5.5 + Math.sin((now - state.contaminationStart) / 1200) * 0.2,
      turbidity: 18 + Math.sin((now - state.contaminationStart) / 900) * 1.2,
      tds: 320 + Math.sin((now - state.contaminationStart) / 1500) * 25,
      temperature: 27,
    }
  }
  if (nodeId === 'NODE-03') {
    const delta = now - state.contaminationStart
    if (delta > 10000) {
      const strength = 0.45 + Math.sin((delta - 10000) / 1000) * 0.12
      return {
        ph: 6.9 - (0.8 * strength),
        turbidity: 9 + (12 * strength),
        tds: 310 + (40 * strength),
        temperature: 27,
      }
    }
  }
  return null
}

const buildSubtleAnomaly = (nodeId, now) => {
  if (nodeId !== 'NODE-02' || !state.subtleStart) return null
  const elapsed = now - state.subtleStart
  if (elapsed >= 60000) return null
  const phases = { ph: 6.6, turbidity: 4.8, tds: 480, temperature: 27 }
  return phases
}

const emitReadings = ({ onReading, onDeviceAlert, onStatus }) => {
  const tick = () => {
    const now = Date.now()
    nodes.forEach((node) => {
      if (offline.has(node.id)) return

      let override = null
      if (state.docExample) {
        override = {
          ph: node.id === 'NODE-01' ? 7.1 : node.id === 'NODE-02' ? 5.2 : 7.4,
          turbidity: node.id === 'NODE-01' ? 2 : node.id === 'NODE-02' ? 18 : 45,
          tds: node.id === 'NODE-01' ? 180 : node.id === 'NODE-02' ? 320 : 600,
          temperature: 27,
        }
      } else if (state.contaminationStart && now - state.contaminationStart < 30000) {
        override = buildContaminationFlow(now, node.id)
      } else if (state.subtleStart && now - state.subtleStart < 40000) {
        const anomaly = buildSubtleAnomaly(node.id, now)
        if (anomaly) override = anomaly
      }

      const reading = makeReading(node.id, override || {})
      onReading(reading)
    })

    if (state.contaminationStart && Date.now() - state.contaminationStart > 30000) {
      state.contaminationStart = null
    }
    if (state.subtleStart && Date.now() - state.subtleStart > 40000) {
      state.subtleStart = null
    }

    onStatus?.('connected')
  }

  state.interval = setInterval(tick, 3000)
  tick()
}

export const simulatorSource = {
  start(onReading, onDeviceAlert, onStatus) {
    emitReadings({ onReading, onDeviceAlert, onStatus })
  },
  stop() {
    if (state.interval) {
      clearInterval(state.interval)
      state.interval = null
    }
    state.contaminationStart = null
    state.subtleStart = null
    state.docExample = false
    offline.clear()
  },
  injectContamination(nodeId) {
    if (nodeId === 'NODE-02') {
      state.contaminationStart = Date.now()
      if (state.subtleStart) state.subtleStart = null
    }
  },
  injectSubtleAnomaly(nodeId) {
    if (nodeId === 'NODE-02') {
      state.subtleStart = Date.now()
      if (state.contaminationStart) state.contaminationStart = null
    }
  },
  loadDocExample() {
    state.docExample = true
  },
  setNodeOffline(nodeId, isOffline) {
    if (isOffline) offline.add(nodeId)
    else offline.delete(nodeId)
  },
  reset() {
    state.contaminationStart = null
    state.subtleStart = null
    state.docExample = false
    offline.clear()
  },
}

export default simulatorSource
