export const thresholds = {
  ph: { normal: [6.5, 8.5], warning: [6.0, 6.5, 8.5, 9.0], critical: [0, 6.0, 9.0, 14] },
  turbidity: { normal: 5, warning: 10, critical: 10 },
  tds: { normal: 500, warning: 1000, critical: 1000 },
  temperature: { normal: 25, warning: 30, critical: 35 },
}

export const CONFIG = {
  CONFIRM_COUNT: 2,
  CLEAR_COUNT: 3,
  STALE_AFTER_MS: 15000,
  OFFLINE_AFTER_MS: 30000,
  READING_INTERVAL_MS: 3000,
  ANOMALY: {
    MIN_BASELINE: 20,
    BASELINE_WINDOW: 60,
    MZ_THRESHOLD: 3.5,
    CONFIRM: 2,
    CLEAR: 3,
    BASELINE_FREEZE_MAX_MS: 120000,
    NOISE_FLOOR: { ph: 0.03, turbidity: 0.15, tds: 4, temperature: 0.1 },
    RATE_LIMITS: { ph: 0.5, turbidity: 3, tds: 100 },
    SPATIAL_WINDOW_MS: 60000,
  },
}

export default thresholds
