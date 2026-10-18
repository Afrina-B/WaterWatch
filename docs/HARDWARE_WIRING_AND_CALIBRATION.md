# WaterWatch — ESP32 Hardware Wiring, Electrical Safety & Sensor Calibration Guide

## 1. Hardware Architecture Overview

WaterWatch integrates a **classic ESP32 DevKit** microcontroller with three analog environmental sensor modules to create **Node 1 (Physical Hardware)**:
1. **Analog pH Sensor Module** (e.g., PH-4502C or Gravity Analog pH)
2. **Analog TDS (Total Dissolved Solids) Sensor Module** (e.g., Gravity Analog TDS)
3. **Analog Turbidity Sensor Module** (e.g., TSW-20M / TSW-30 / Gravity Turbidity)

The firmware performs median-filtered ADC sampling, standardizes conversion curves, constructs a JSON telemetry payload, and transmits records via HTTP REST to `POST /api/readings` on the Flask backend.

---

## 2. Microcontroller Pin Mapping (ESP32 DevKit)

| Sensor Module | Module Pin | ESP32 GPIO | ESP32 ADC Channel | Electrical Characteristic |
| :--- | :--- | :--- | :--- | :--- |
| **pH Sensor** | **PO** (Analog Output) | **GPIO 34** | ADC1_CH6 | Input-only pin, no internal pull-up |
| **pH Sensor** | **TO** (Temp Output) | *Not Connected* | — | Unused on typical PH-4502C modules |
| **pH Sensor** | **DO** (Digital Output)| *Not Connected* | — | Unused threshold comparator pin |
| **pH Sensor** | **GND** | **GND** | — | Common ground |
| **pH Sensor** | **VCC** | **5V / External**| — | See electrical safety notes below |
| **TDS Sensor** | **AO** (Analog Output) | **GPIO 32** | ADC1_CH4 | Analog input (ADC1) |
| **TDS Sensor** | **GND** | **GND** | — | Common ground |
| **TDS Sensor** | **VCC** | **3.3V or 5V** | — | See electrical safety notes below |
| **Turbidity Sensor**| **AO** (Analog Output)| **GPIO 35** | ADC1_CH7 | Input-only pin (ADC1) |
| **Turbidity Sensor**| **DO** (Digital Output)| *Not Connected*| — | Unused trigger pin |
| **Turbidity Sensor**| **GND** | **GND** | — | Common ground |
| **Turbidity Sensor**| **VCC** | **5V** | — | Sensor IR emitter requires 5V |

> [!IMPORTANT]
> **Why ADC1 Pins (GPIO 32, 34, 35) are Required:**
> On the ESP32, **ADC2 is shared with the Wi-Fi subsystem**. Whenever the Wi-Fi transceiver transmits or listens, ADC2 reads fail or throw errors. GPIO 32, 34, and 35 belong to **ADC1**, guaranteeing safe, non-blocking sampling while Wi-Fi is active.

---

## 3. Electrical Safety & 3.3V Voltage Limits

> [!CAUTION]
> **ESP32 GPIO pins are NOT 5V tolerant!**
> Applying any voltage greater than **3.6V** directly to an ESP32 GPIO pin can permanently damage the silicon.

### Verification Steps:
1. **Turbidity Module Output Voltage Check:**
   - Turbidity sensor boards typically require **5V VCC** for the optical photodiode and LED.
   - When placed in crystal clear distilled water, the analog output voltage ($V_{out}$) can reach **4.2V - 4.5V**.
   - **Do not connect this directly to GPIO 35!**
   - **Required Solution:** Connect a simple resistive voltage divider:
     $$V_{esp32} = V_{sensor} \times \frac{R_2}{R_1 + R_2}$$
     Use $R_1 = 10\text{ k}\Omega$ and $R_2 = 20\text{ k}\Omega$ (or a $10\text{ k}\Omega$ trimpot) to scale $4.5\text{V} \rightarrow 3.0\text{V}$.
2. **pH Sensor Module (PH-4502C):**
   - Often powered from 5V. On PH-4502C, the internal potentiometer $R_{pot}$ shifts the analog offset at pH 7.0.
   - Adjust the onboard potentiometer using a small screwdriver so that when the BNC connector is shorted (or probe is in pH 7.0 buffer), the voltage at **PO** is **2.50V** (or 1.65V if powered by 3.3V).
3. **Common Ground:**
   - Ensure the ground (GND) of all sensor modules and the external power supply is tied directly to the ESP32 **GND**.

---

## 4. Multi-Sample Filtering & ADC Noise Reduction

The internal ESP32 SAR ADC exhibits non-linear behavior near $0\text{V}$ and above $3.1\text{V}$, along with RF switching noise.
The WaterWatch firmware in `firmware/esp32_waterwatch/esp32_waterwatch.ino` implements:
1. **Pin Attenuation:** Configured to `ADC_11db` to enable a full $0\text{V} - 3.3\text{V}$ dynamic range.
2. **12-bit Resolution:** 4096 discrete levels ($0 - 4095$).
3. **Median Filtering (`sampleFilteredADC`):**
   - Collects 30 consecutive samples per cycle with a $10\text{ ms}$ interval.
   - Sorts the sample array and extracts the true statistical median, eliminating electrical spikes caused by pump induction or RF ripples.

---

## 5. Sensor Conversion & Calibration Formulas

### 5.1. pH Sensor Conversion
The standard linear model relating probe voltage $V_{measured}$ to pH:
$$\text{pH} = 7.00 + (V_{measured} - V_{\text{pH}7}) \times \text{Slope}$$

#### Calibration Protocol:
1. Rinse the glass electrode in distilled water and dry with lens paper.
2. Immerse the probe in **pH 7.00 buffer solution**. Measure voltage $V_{\text{pH}7}$ (default: $2.50\text{V}$). Update `PH_VOLTAGE_AT_PH7` in `config.h`.
3. Rinse and immerse in **pH 4.01 buffer solution**. Measure voltage $V_{\text{pH}4}$.
4. Calculate slope:
   $$\text{Slope} = \frac{4.01 - 7.00}{V_{\text{pH}4} - V_{\text{pH}7}}$$
5. Update `PH_SLOPE` in `config.h` (typically $\approx -5.70\text{ pH/V}$).

---

### 5.2. TDS (Total Dissolved Solids) Conversion
TDS measures dissolved minerals in ppm ($\text{mg/L}$). The board measures electrical conductivity, which is temperature-dependent.

#### Temperature Compensation:
$$V_{\text{comp}} = \frac{V_{measured}}{1.0 + 0.02 \times (T_{\text{water}} - 25.0)}$$

#### Polynomial Conversion Formula:
$$\text{TDS} = (133.42 \times V_{\text{comp}}^3 - 255.86 \times V_{\text{comp}}^2 + 857.39 \times V_{\text{comp}}) \times 0.5 \times K_{\text{factor}}$$

- $K_{\text{factor}}$: Calibration multiplier (default: $1.0$).
- Standard reference: $1413\ \mu\text{S/cm}$ calibration solution ($\approx 707\text{ ppm}$).

---

### 5.3. Turbidity Sensor Conversion
Optical turbidity sensors emit infrared light and detect scattering:
- **Clean, clear water:** High infrared transmission $\rightarrow$ High analog voltage ($\ge 3.0\text{V}$).
- **Turbid, muddy water:** Low transmission $\rightarrow$ Low voltage ($< 2.0\text{V}$).

#### Characteristic Response Curve:
- When $V \ge V_{\text{clear}}$ (default: $3.0\text{V}$):
  $$\text{Turbidity} = 0.5\text{ NTU}$$
- When $2.0\text{V} \le V < 3.0\text{V}$:
  $$\text{Turbidity} = -1120.4 \times V^2 + 5742.3 \times V - 4352.9\text{ (NTU)}$$
- When $V < 2.0\text{V}$:
  $$\text{Turbidity} = 100.0 + (2.0 - V) \times 150.0\text{ (NTU)}$$

---

## 6. Serial Diagnostics & Raw ADC Mode

When `DIAGNOSTIC_SERIAL` is set to `true` in `config.h`, the ESP32 outputs diagnostic information over the serial terminal at **115200 baud**:

```text
========================================================
   WATERWATCH - Real-Time Water Quality Node (ESP32)
========================================================
Node ID:          NODE-01 (Physical Hardware Node)
pH Analog Pin:    GPIO 34 (ADC1_CH6)
TDS Analog Pin:   GPIO 32 (ADC1_CH4)
Turb Analog Pin:  GPIO 35 (ADC1_CH7)
Backend Host:     http://192.168.1.100:5000/api/readings
========================================================

[Wi-Fi] Connecting to SSID: 'Home_WiFi'....
[Wi-Fi] Connected successfully!
[Wi-Fi] ESP32 IP Address: 192.168.1.145
[Wi-Fi] Signal Strength:  -62 dBm

--- [Sensor Measurement Cycle] ---
  pH:         7.24 pH   | Raw ADC: 2180 | Voltage: 1.76V
  TDS:       215.0 ppm  | Raw ADC: 1240 | Voltage: 1.00V
  Turbidity:  2.10 NTU  | Raw ADC: 3650 | Voltage: 2.94V
  RSSI:      -62 dBm    | Uptime:  48 sec
  [POST] Reading successfully transmitted to backend.
```
