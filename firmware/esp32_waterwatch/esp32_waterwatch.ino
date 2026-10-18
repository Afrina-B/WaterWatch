/**
 * ============================================================================
 * WATERWATCH - ESP32 DevKit Physical Sensor Node Firmware
 * ============================================================================
 * 
 * Hardware Platform: ESP32 DevKit V1 (30 or 36 pins)
 * Sensors:
 *   - Analog pH Sensor Module (Analog PO -> GPIO 34)
 *   - Analog TDS Sensor Module (Analog AO -> GPIO 32)
 *   - Analog Turbidity Sensor Module (Analog AO -> GPIO 35)
 * 
 * Communications:
 *   - 2.4GHz 802.11 b/g/n Wi-Fi
 *   - HTTP REST POST to /api/readings
 * 
 * Electrical Safety Note:
 *   ESP32 GPIO pins tolerate a MAXIMUM of 3.3V. If using 5V sensor modules,
 *   ensure the analog signal output does not exceed 3.3V (use a resistive
 *   voltage divider or level shifter if necessary).
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

// Forward declarations
uint16_t sampleFilteredADC(uint8_t pin);
float calculatePH(uint16_t rawAdc);
float calculateTDS(uint16_t rawAdc, float tempC);
float calculateTurbidity(uint16_t rawAdc);
void connectToWiFi();
bool sendReadingHTTP(float ph, float tds, float turb, float tempC, uint16_t rawPh, uint16_t rawTds, uint16_t rawTurb);

// Timing trackers
unsigned long lastReadingTime = 0;
unsigned long bootTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("   WATERWATCH - Real-Time Water Quality Node (ESP32)");
  Serial.println("========================================================");
  Serial.printf("Node ID:          %s (Physical Hardware Node)\n", NODE_ID);
  Serial.printf("pH Analog Pin:    GPIO %d (ADC1_CH6)\n", PIN_PH_ANALOG);
  Serial.printf("TDS Analog Pin:   GPIO %d (ADC1_CH4)\n", PIN_TDS_ANALOG);
  Serial.printf("Turb Analog Pin:  GPIO %d (ADC1_CH7)\n", PIN_TURB_ANALOG);
  Serial.printf("Backend Host:     http://%s:%d%s\n", SERVER_HOST, SERVER_PORT, API_ENDPOINT);
  Serial.println("========================================================\n");

  // Configure ADC resolution and pin attenuation
  analogReadResolution(ADC_RESOLUTION_BITS);
  analogSetPinAttenuation(PIN_PH_ANALOG, ADC_11db);
  analogSetPinAttenuation(PIN_TDS_ANALOG, ADC_11db);
  analogSetPinAttenuation(PIN_TURB_ANALOG, ADC_11db);

  // Set input modes
  pinMode(PIN_PH_ANALOG, INPUT);
  pinMode(PIN_TDS_ANALOG, INPUT);
  pinMode(PIN_TURB_ANALOG, INPUT);

  // Connect to Wi-Fi network
  connectToWiFi();
  bootTime = millis();
}

void loop() {
  // Ensure Wi-Fi remains connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Connection lost. Attempting reconnection...");
    connectToWiFi();
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastReadingTime >= REPORT_INTERVAL_MS) {
    lastReadingTime = currentMillis;

    // 1. Sample raw ADC values with multi-sample median filtering
    uint16_t rawPh = sampleFilteredADC(PIN_PH_ANALOG);
    uint16_t rawTds = sampleFilteredADC(PIN_TDS_ANALOG);
    uint16_t rawTurb = sampleFilteredADC(PIN_TURB_ANALOG);

    // 2. Perform calibration and conversion calculations
    float phValue = calculatePH(rawPh);
    float tdsValue = calculateTDS(rawTds, TDS_REFERENCE_TEMP_C);
    float turbValue = calculateTurbidity(rawTurb);
    float tempC = TDS_REFERENCE_TEMP_C;

    // 3. Serial Diagnostics Output
    if (DIAGNOSTIC_SERIAL) {
      float vPh = (rawPh * ADC_VREF_VOLTS) / 4095.0f;
      float vTds = (rawTds * ADC_VREF_VOLTS) / 4095.0f;
      float vTurb = (rawTurb * ADC_VREF_VOLTS) / 4095.0f;

      Serial.println("\n--- [Sensor Measurement Cycle] ---");
      Serial.printf("  pH:        %5.2f pH   | Raw ADC: %4u | Voltage: %4.2fV\n", phValue, rawPh, vPh);
      Serial.printf("  TDS:       %5.1f ppm  | Raw ADC: %4u | Voltage: %4.2fV\n", tdsValue, rawTds, vTds);
      Serial.printf("  Turbidity: %5.2f NTU  | Raw ADC: %4u | Voltage: %4.2fV\n", turbValue, rawTurb, vTurb);
      Serial.printf("  RSSI:      %d dBm     | Uptime:  %lu sec\n", WiFi.RSSI(), (currentMillis - bootTime) / 1000);
    }

    // 4. Send telemetry payload to WaterWatch backend
    if (WiFi.status() == WL_CONNECTED) {
      bool ok = sendReadingHTTP(phValue, tdsValue, turbValue, tempC, rawPh, rawTds, rawTurb);
      if (ok) {
        Serial.println("  [POST] Reading successfully transmitted to backend.");
      } else {
        Serial.println("  [POST] Transmit failed! Check backend connectivity.");
      }
    } else {
      Serial.println("  [Wi-Fi] Not connected. Reading queued/skipped.");
    }
  }

  // Brief yield for RTOS scheduler
  delay(20);
}

// ============================================================================
// Helper: Wi-Fi Connection
// ============================================================================
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[Wi-Fi] Connecting to SSID: '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.printf("[Wi-Fi] ESP32 IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[Wi-Fi] Signal Strength:  %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("\n[Wi-Fi] Failed to connect within timeout.");
    Serial.println("[Wi-Fi] Will retry on next sampling cycle.");
  }
}

// ============================================================================
// Helper: Multi-Sample Median Filtered ADC Read
// Removes electrical spikes and transient noise from ADC1
// ============================================================================
uint16_t sampleFilteredADC(uint8_t pin) {
  uint16_t samples[SAMPLES_PER_READING];

  // Collect samples
  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    samples[i] = analogRead(pin);
    delay(SAMPLE_INTERVAL_MS);
  }

  // Bubble sort to extract median
  for (int i = 0; i < SAMPLES_PER_READING - 1; i++) {
    for (int j = 0; j < SAMPLES_PER_READING - i - 1; j++) {
      if (samples[j] > samples[j + 1]) {
        uint16_t temp = samples[j];
        samples[j] = samples[j + 1];
        samples[j + 1] = temp;
      }
    }
  }

  // Return median sample
  return samples[SAMPLES_PER_READING / 2];
}

// ============================================================================
// Conversion: pH Calculation
// Standard linear conversion based on 2-point buffer calibration
// ============================================================================
float calculatePH(uint16_t rawAdc) {
  float voltage = (rawAdc * ADC_VREF_VOLTS) / 4095.0f;
  float ph = 7.00f + (voltage - PH_VOLTAGE_AT_PH7) * PH_SLOPE;
  
  // Constrain to physical pH boundaries
  if (ph < 0.0f) ph = 0.0f;
  if (ph > 14.0f) ph = 14.0f;
  return ph;
}

// ============================================================================
// Conversion: TDS Calculation (ppm)
// Temperature-compensated polynomial conversion
// ============================================================================
float calculateTDS(uint16_t rawAdc, float tempC) {
  float voltage = (rawAdc * ADC_VREF_VOLTS) / 4095.0f;
  
  // Temperature compensation formula (standard 2% per °C)
  float compensationCoefficient = 1.0f + TDS_TEMP_COEFF * (tempC - 25.0f);
  float compensationVoltage = voltage / compensationCoefficient;

  // Convert voltage to TDS value in ppm (mg/L)
  float tds = (133.42f * compensationVoltage * compensationVoltage * compensationVoltage
              - 255.86f * compensationVoltage * compensationVoltage
              + 857.39f * compensationVoltage) * 0.5f * TDS_K_FACTOR;

  if (tds < 0.0f) tds = 0.0f;
  return tds;
}

// ============================================================================
// Conversion: Turbidity Calculation (NTU)
// Inverse voltage relationship with clear water calibration
// ============================================================================
float calculateTurbidity(uint16_t rawAdc) {
  float voltage = (rawAdc * ADC_VREF_VOLTS) / 4095.0f;
  float ntu = 0.0f;

  if (voltage >= TURB_CLEAR_VOLTAGE) {
    // Clear water threshold
    ntu = 0.5f;
  } else if (voltage < 2.0f) {
    // High turbidity region
    ntu = 100.0f + (2.0f - voltage) * 150.0f;
  } else {
    // Characteristic quadratic curve: NTU = -1120.4*V^2 + 5742.3*V - 4352.9
    ntu = -1120.4f * (voltage * voltage) + 5742.3f * voltage - 4352.9f;
  }

  if (ntu < 0.0f) ntu = 0.0f;
  return ntu;
}

// ============================================================================
// Network: HTTP POST Reading to WaterWatch Backend
// ============================================================================
bool sendReadingHTTP(float ph, float tds, float turb, float tempC, uint16_t rawPh, uint16_t rawTds, uint16_t rawTurb) {
  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + API_ENDPOINT;

  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload matching the backend schema
  unsigned long uptimeSec = (millis() - bootTime) / 1000;
  char payload[380];
  snprintf(payload, sizeof(payload),
    "{"
      "\"node_id\":\"%s\","
      "\"source\":\"hardware\","
      "\"calibration_status\":\"calibrated\","
      "\"ph\":%.2f,"
      "\"turbidity\":%.2f,"
      "\"tds\":%.1f,"
      "\"temperature\":%.1f,"
      "\"raw_adc_ph\":%u,"
      "\"raw_adc_tds\":%u,"
      "\"raw_adc_turbidity\":%u,"
      "\"rssi\":%d,"
      "\"uptime\":%lu"
    "}",
    NODE_ID,
    ph, turb, tds, tempC,
    rawPh, rawTds, rawTurb,
    WiFi.RSSI(),
    uptimeSec
  );

  int httpResponseCode = http.POST((uint8_t*)payload, strlen(payload));
  bool success = (httpResponseCode == 200 || httpResponseCode == 201);

  if (success) {
    String response = http.getString();
    // Successfully ingested
  } else {
    Serial.printf("  [HTTP Error] Code: %d | Host: %s\n", httpResponseCode, SERVER_HOST);
  }

  http.end();
  return success;
}
