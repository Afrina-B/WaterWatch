import apiClient from './apiClient.js'

export const apiSource = {
  _timer: null,
  _alertTimer: null,
  start(onReading, onDeviceAlert, onStatus) {
    // 1. Initial fetch
    this.pollReadings(onReading, onStatus)
    this.pollAlerts(onDeviceAlert)

    // 2. Poll readings every 2.5 seconds
    this._timer = setInterval(() => {
      this.pollReadings(onReading, onStatus)
    }, 2500)

    // 3. Poll alerts every 4 seconds
    this._alertTimer = setInterval(() => {
      this.pollAlerts(onDeviceAlert)
    }, 4000)
  },

  async pollReadings(onReading, onStatus) {
    try {
      const readings = await apiClient.getLatestReadings()
      const items = Array.isArray(readings) ? readings : []
      items.forEach((raw) => {
        const reading = {
          nodeId: raw.nodeId || raw.node_id,
          timestamp: raw.timestamp || (raw.receivedAt ? new Date(raw.receivedAt).getTime() : Date.now()),
          ph: raw.ph,
          turbidity: raw.turbidity,
          tds: raw.tds,
          temperature: raw.temperature ?? 25.0,
          source: raw.source,
          isHardware: raw.isHardware ?? (raw.source === 'hardware'),
          calibrationStatus: raw.calibrationStatus,
          rawAdc: raw.rawAdc,
          rssi: raw.rssi,
          uptime: raw.uptime,
        }
        onReading(reading)
      })
      onStatus?.('connected')
    } catch (error) {
      console.warn('[API Source] Failed to poll readings:', error.message)
      onStatus?.('error')
    }
  },

  async pollAlerts(onDeviceAlert) {
    try {
      const alerts = await apiClient.getAlerts({ status: 'active', limit: 20 })
      if (Array.isArray(alerts) && onDeviceAlert) {
        alerts.forEach((alert) => {
          onDeviceAlert(alert)
        })
      }
    } catch (err) {
      // Quiet fail on alert polling
    }
  },

  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
    if (this._alertTimer) {
      clearInterval(this._alertTimer)
      this._alertTimer = null
    }
  },
}

export default apiSource
