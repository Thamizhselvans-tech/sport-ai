/**
 * ======================================================================================
 * SPORTSYNC AI - SMART SPORTS EQUIPMENT MANAGEMENT SYSTEM
 * ESP32-WROOM-32 + MFRC522 RC522 RFID HARDWARE FIRMWARE
 * ======================================================================================
 * 
 * Target Hardware:
 *   - ESP32-WROOM-32 Development Board
 *   - MFRC522 13.56MHz RFID Reader Module
 *   - Mifare Classic 1K RFID Cards / Keyfobs
 *   - Optional: Active Buzzer (GPIO 4), Mode Button (GPIO 15)
 * 
 * RC522 Pin Wiring to ESP32:
 *   --------------------------------------------------
 *   MFRC522 Pin    | ESP32 GPIO Pin      | Wire Color
 *   --------------------------------------------------
 *   3.3V           | 3.3V (DO NOT USE 5V)| Red
 *   RST            | GPIO 22             | Orange
 *   GND            | GND                 | Black
 *   MISO           | GPIO 19             | Yellow
 *   MOSI           | GPIO 23             | Green
 *   SCK            | GPIO 18             | Blue
 *   SDA (SS)       | GPIO 5              | White / Purple
 *   --------------------------------------------------
 *   Optional Peripherals:
 *   Status LED     | GPIO 2 (Built-in)   | Visual Feedback
 *   Active Buzzer  | GPIO 4              | Acoustic Chime
 *   Mode Toggle Btn| GPIO 15 (PULLUP)    | Toggle ISSUE / RETURN
 *   --------------------------------------------------
 * 
 * Required Arduino Libraries (Install via Arduino Library Manager):
 *   1. "MFRC522" by GithubCommunity (v1.4.10 or newer)
 *   2. "ArduinoJson" by Benoit Blanchon (v6.x or v7.x)
 * ======================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ======================================================================================
// 1. NETWORK & API CONFIGURATION (EDIT THESE)
// ======================================================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";         // Replace with your WiFi network name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // Replace with your WiFi password

// Live Render Cloud HTTPS Endpoint (Tested & Active)
const char* SERVER_URL    = "https://sport-ai-pkzc.onrender.com/api/rfid/scan";

// Optional Hardware API Key (leave empty or match IOT_API_KEY in .env)
const char* IOT_API_KEY   = "";

// Default Student Register Number for Issue Mode
String currentStudentReg  = "420723104053";

// Operation Mode: "issue" or "return" (can be switched dynamically via button on GPIO 15)
String currentMode        = "issue"; 

// ======================================================================================
// 2. HARDWARE PIN DEFINITIONS
// ======================================================================================
#define SS_PIN          5   // MFRC522 SDA (Slave Select)
#define RST_PIN        22   // MFRC522 RST (Reset)
#define STATUS_LED_PIN  2   // ESP32 Onboard LED (GPIO 2)
#define BUZZER_PIN      4   // Active Buzzer pin
#define MODE_BTN_PIN   15   // Push button to toggle between ISSUE and RETURN

MFRC522 rfid(SS_PIN, RST_PIN);

// State tracking & cooldown debounce
unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN_MS = 2500; // 2.5s cooldown between consecutive reads
String lastScannedUID = "";

// ======================================================================================
// 3. SOUND & LIGHT FEEDBACK UTILITIES
// ======================================================================================
void indicateSuccess() {
  // Double-beep & double-blink
  for (int i = 0; i < 2; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(STATUS_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    delay(80);
  }
}

void indicateError() {
  // Long buzz & continuous blink
  digitalWrite(STATUS_LED_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(600);
  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}

void indicateModeChange() {
  // 3 short mode switch chirps
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(40);
    digitalWrite(BUZZER_PIN, LOW);
    delay(40);
  }
}

// ======================================================================================
// 4. WIFI CONNECTION MANAGER
// ======================================================================================
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Flash while connecting
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println();
    Serial.println("[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Signal RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println();
    Serial.println("[WiFi] Failed to connect! Check SSID and Password.");
  }
}

// ======================================================================================
// 5. SEND RFID DATA TO BACKEND API (POST /api/rfid/scan)
// ======================================================================================
void sendRfidScan(String rfidUid, String mode, String studentReg) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi not connected. Reconnecting...");
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      indicateError();
      return;
    }
  }

  Serial.println();
  Serial.println("==================================================");
  Serial.println(">>> TRANSMITTING RFID SCAN TO SPORTSYNC AI");
  Serial.println("==================================================");
  Serial.print("Target URL : "); Serial.println(SERVER_URL);
  Serial.print("RFID Tag   : "); Serial.println(rfidUid);
  Serial.print("Mode       : "); Serial.println(mode);
  Serial.print("Student Reg: "); Serial.println(studentReg);

  HTTPClient http;
  
  // Choose client based on HTTP vs HTTPS
  if (String(SERVER_URL).startsWith("https://")) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Skip SSL certificate verification for IoT ease
    http.begin(secureClient, SERVER_URL);
  } else {
    WiFiClient client;
    http.begin(client, SERVER_URL);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  if (strlen(IOT_API_KEY) > 0) {
    http.addHeader("x-api-key", IOT_API_KEY);
  }
  http.setTimeout(8000); // 8 second timeout

  // Build JSON Payload
  StaticJsonDocument<256> doc;
  doc["rfidTag"] = rfidUid;
  doc["mode"] = mode;
  if (mode == "issue" || studentReg.length() > 0) {
    doc["studentReg"] = studentReg;
  }
  doc["source"] = "ESP32_RC522";

  String requestJson;
  serializeJson(doc, requestJson);
  Serial.print("Payload    : "); Serial.println(requestJson);

  // Send HTTP POST request
  int httpResponseCode = http.POST(requestJson);
  String responseText  = http.getString();

  Serial.print("HTTP Code  : "); Serial.println(httpResponseCode);
  Serial.print("Response   : "); Serial.println(responseText);

  // Parse Server JSON Response
  StaticJsonDocument<512> responseDoc;
  DeserializationError err = deserializeJson(responseDoc, responseText);

  if (err) {
    Serial.print("[JSON] Parse failed: ");
    Serial.println(err.c_str());
    if (responseText.indexOf("<html") != -1 || responseText.indexOf("<!DOCTYPE") != -1) {
      Serial.println("[ERROR] Server returned HTML instead of JSON! Check your SERVER_URL endpoint path.");
    }
    indicateError();
  } else {
    bool success = responseDoc["success"] | false;
    const char* message = responseDoc["message"] | "No message";
    const char* tag     = responseDoc["rfidTag"] | rfidUid.c_str();

    if (success && (httpResponseCode >= 200 && httpResponseCode < 300)) {
      Serial.println("--------------------------------------------------");
      Serial.println("[SUCCESS] ACTION CONFIRMED BY SERVER!");
      Serial.print("Message    : "); Serial.println(message);
      Serial.print("RFID Tag   : "); Serial.println(tag);
      Serial.print("Mode       : "); Serial.println(mode);
      Serial.println("--------------------------------------------------");
      indicateSuccess();
    } else {
      Serial.println("--------------------------------------------------");
      Serial.println("[REJECTED] SERVER RETURNED AN ERROR!");
      Serial.print("Message    : "); Serial.println(message);
      Serial.println("--------------------------------------------------");
      indicateError();
    }
  }

  http.end();
  Serial.println("==================================================\n");
}

// ======================================================================================
// 6. SETUP ROUTINE
// ======================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n");
  Serial.println("==================================================");
  Serial.println(" SPORTSYNC AI - SMART SPORTS EQUIPMENT SYSTEM     ");
  Serial.println(" ESP32 + MFRC522 RC522 RFID CLIENT BOOTING        ");
  Serial.println("==================================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MODE_BTN_PIN, INPUT_PULLUP);

  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize SPI Bus for RC522
  SPI.begin(); // Uses default VSPI: SCK=18, MISO=19, MOSI=23, SS=5
  rfid.PCD_Init();
  delay(50);

  // Verify RC522 reader version
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print("[RC522] Firmware Version: 0x");
  Serial.println(version, HEX);

  if (version == 0x00 || version == 0xFF) {
    Serial.println("[WARNING] RC522 Reader NOT detected! Verify 3.3V/GND and SPI wiring.");
  } else {
    Serial.println("[RC522] RFID Reader successfully initialized and ready.");
  }

  // Connect to WiFi
  connectToWiFi();

  Serial.println("\n[SYSTEM] Ready for scanning!");
  Serial.print("[SYSTEM] Default Student Reg : "); Serial.println(currentStudentReg);
  Serial.print("[SYSTEM] Active Mode         : "); Serial.println(currentMode);
  Serial.println("[SYSTEM] Press button on GPIO 15 to toggle ISSUE / RETURN.");
  Serial.println("--------------------------------------------------\n");

  indicateSuccess(); // 2 short beeps to signal boot complete
}

// ======================================================================================
// 7. MAIN LOOP ROUTINE
// ======================================================================================
void loop() {
  // Check Mode Toggle Button (Active LOW with internal pullup)
  static unsigned long lastBtnPress = 0;
  if (digitalRead(MODE_BTN_PIN) == LOW && (millis() - lastBtnPress > 400)) {
    lastBtnPress = millis();
    if (currentMode == "issue") {
      currentMode = "return";
    } else {
      currentMode = "issue";
    }
    Serial.print("[MODE TOGGLED] Now in: ");
    Serial.println(currentMode);
    indicateModeChange();
  }

  // Ensure WiFi remains connected
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // Look for new RFID Cards
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }

  // Select one card
  if (!rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Convert UID bytes to 8-character Uppercase Hex String (e.g. "44B7F506")
  String scannedUid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      scannedUid += "0";
    }
    scannedUid += String(rfid.uid.uidByte[i], HEX);
  }
  scannedUid.toUpperCase();

  // Debounce check: ignore if scanned card within cooldown window
  unsigned long now = millis();
  if (scannedUid == lastScannedUID && (now - lastScanTime < SCAN_COOLDOWN_MS)) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastScannedUID = scannedUid;
  lastScanTime = now;

  Serial.println();
  Serial.print("[RFID DETECTED] Tag UID: ");
  Serial.println(scannedUid);

  // Transmit scan to backend API
  sendRfidScan(scannedUid, currentMode, currentStudentReg);

  // Halt PICC and stop encryption on PCD
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  delay(200);
}
