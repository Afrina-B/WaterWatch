import mqtt from 'mqtt'

export const mqttSource = {
  client: null,
  subscriptions: [],
  start(onReading, onDeviceAlert, onStatus) {
    const url = import.meta.env.VITE_MQTT_URL || ''
    const prefix = import.meta.env.VITE_MQTT_PREFIX || 'waterwatch'
    if (!url) {
      onStatus?.('error')
      return
    }

    this.client = mqtt.connect(url)
    this.client.on('connect', () => {
      onStatus?.('connected')
      const topics = [`${prefix}/nodes/+/readings`, `${prefix}/alerts`]
      this.client.subscribe(topics, (err) => {
        if (err) onStatus?.('error')
      })
    })

    this.client.on('reconnect', () => onStatus?.('reconnecting'))
    this.client.on('error', () => onStatus?.('error'))

    this.client.on('message', (topic, payload) => {
      try {
        const parsed = JSON.parse(payload.toString())
        const safe = parsed && typeof parsed === 'object' ? parsed : null
        if (!safe) return

        if (topic.includes('/readings')) {
          const reading = {
            nodeId: safe.nodeId || topic.split('/').at(-2),
            timestamp: safe.timestamp || Date.now(),
            ph: safe.ph,
            turbidity: safe.turbidity,
            tds: safe.tds,
            temperature: safe.temperature,
            rssi: safe.rssi,
            uptime: safe.uptime,
          }
          onReading(reading)
        }

        if (topic.endsWith('/alerts')) {
          const alert = {
            nodeId: safe.nodeId || 'unknown',
            parameter: safe.parameter || 'device',
            value: safe.value ?? null,
            severity: safe.severity || 'warning',
            message: safe.message || 'Node reported an alert',
            type: safe.type || 'device',
            score: safe.score,
            timestamp: safe.timestamp || Date.now(),
          }
          onDeviceAlert(alert)
        }
      } catch (error) {
        return
      }
    })
  },
  stop() {
    if (this.client) {
      this.client.end(true)
      this.client = null
    }
  },
}

export default mqttSource
