/**
 * WaterWatch ESP32 DevKit - Configuration File
 * 
 * Update with your local Wi-Fi SSID and backend server IP address.
 */

#ifndef WATERWATCH_CONFIG_H
#define WATERWATCH_CONFIG_H

#define WIFI_SSID             "YOUR_WIFI_SSID"
#define WIFI_PASSWORD         "YOUR_WIFI_PASSWORD"
#define WIFI_TIMEOUT_MS       15000

#define SERVER_HOST           "192.168.1.100"
#define SERVER_PORT           5000
#define API_ENDPOINT          "/api/readings"
#define HTTP_TIMEOUT_MS       5000
#define REPORT_INTERVAL_MS    4000
#define NODE_ID               "NODE-01"

#define PIN_PH_ANALOG         34    // GPIO 34 (ADC1_CH6)
#define PIN_TDS_ANALOG        32    // GPIO 32 (ADC1_CH4)
#define PIN_TURB_ANALOG       35    // GPIO 35 (ADC1_CH7)

#define ADC_RESOLUTION_BITS   12
#define ADC_VREF_VOLTS        3.3f
#define SAMPLES_PER_READING   30
#define SAMPLE_INTERVAL_MS    10
#define DIAGNOSTIC_SERIAL     true
#define DIAGNOSTIC_RAW_ADC    true

#define PH_VOLTAGE_AT_PH7     2.50f
#define PH_SLOPE              -5.70f

#define TDS_REFERENCE_TEMP_C  25.0f
#define TDS_TEMP_COEFF        0.02f
#define TDS_K_FACTOR          1.0f

#define TURB_CLEAR_VOLTAGE    3.0f

#endif // WATERWATCH_CONFIG_H
