export const startDataSource = (source, callbacks) => {
  if (source && typeof source.start === 'function') {
    source.start(callbacks.onReading, callbacks.onDeviceAlert, callbacks.onStatus)
  }
}

export const stopDataSource = (source) => {
  if (source && typeof source.stop === 'function') source.stop()
}
