import React, { useState } from 'react';
import { 
  Settings, 
  Cpu, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  Check, 
  Code, 
  ShieldAlert, 
  Trophy,
  Zap
} from 'lucide-react';
import { Equipment, Student, Transaction, HardwareStatus } from '../types';

interface SettingsHardwareProps {
  equipment: Equipment[];
  students: Student[];
  transactions: Transaction[];
  hardwareStatus?: HardwareStatus;
  onResetDemoData: () => Promise<void>;
}

export const SettingsHardware: React.FC<SettingsHardwareProps> = ({
  equipment,
  students,
  transactions,
  hardwareStatus,
  onResetDemoData,
}) => {
  const [activeTab, setActiveTab] = useState<'hardware' | 'storage' | 'presentation'>('hardware');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const originUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-t66slivharimixyygq2gkr-322922586017.asia-northeast1.run.app';

  const scanEndpointUrl = `${originUrl}/api/rfid/scan`;

  const arduinoCode = `/*
 * SPORTSYNC AI - Production ESP32-WROOM-32 + MFRC522 RC522 Firmware
 * CKCET IoT Hackathon 2026
 *
 * Hardware:
 *   - ESP32-WROOM-32 Development Board
 *   - MFRC522 13.56MHz SPI RFID Reader (VCC->3.3V, RST->22, GND->GND, MISO->19, MOSI->23, SCK->18, SS->5)
 *   - Active Buzzer on GPIO 4
 *   - Mode Toggle Pushbutton on GPIO 15 (HIGH/Open = ISSUE, LOW/Pressed = RETURN)
 *
 * Endpoint:
 *   POST ${scanEndpointUrl}
 *   Payload: {"rfidTag": "E2003411B802", "mode": "issue", "studentReg": "910423104001"}
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#define SS_PIN      5
#define RST_PIN     22
#define BUZZER_PIN  4
#define MODE_BTN    15

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Deployed SPORTSYNC AI Cloud API Endpoint
const char* SERVER_URL    = "${scanEndpointUrl}";
const char* IOT_API_KEY   = "7d75696ebdcadb7de24c4672e47a2bb7f37763174d156a178d8b1a09129d6215";

// Default student Register Number (or tap Student RFID Smart Card first for 2-tap mode!)
String activeStudentReg   = "910423104001";
String currentMode        = "issue"; // "issue" or "return"

MFRC522 mfrc522(SS_PIN, RST_PIN);

void beep(int durationMs, int count = 1) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i + 1 < count) delay(80);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MODE_BTN, INPUT_PULLUP);

  SPI.begin(18, 19, 23, 5); // SCK, MISO, MOSI, SS
  mfrc522.PCD_Init();

  Serial.println("\\n========================================");
  Serial.println("SPORTSYNC AI - ESP32 RFID Terminal Boot");
  Serial.println("========================================");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());
  Serial.println("Target API: " + String(SERVER_URL));
  beep(100, 2); // Ready double-beep
}

void loop() {
  // Check mode toggle button (optional hardware switch)
  if (digitalRead(MODE_BTN) == LOW) {
    currentMode = (currentMode == "issue") ? "return" : "issue";
    Serial.println("[MODE SWITCH] Current Mode: " + currentMode);
    beep(60, 1);
    delay(400);
  }

  // Allow changing studentReg or mode via Serial Monitor (e.g. type REG:910423104042 or MODE:return)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    if (cmd.startsWith("REG:")) {
      activeStudentReg = cmd.substring(4);
      activeStudentReg.trim();
      Serial.println("[CONFIG] Active Student Reg set to: " + activeStudentReg);
    } else if (cmd.startsWith("MODE:")) {
      currentMode = cmd.substring(5);
      currentMode.trim();
      currentMode.toLowerCase();
      Serial.println("[CONFIG] Mode set to: " + currentMode);
    }
  }

  // Wait for RFID card/tag on RC522 antenna
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Read actual hardware UID in uppercase hex
  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();

  Serial.println("\\n[RC522] Scanned RFID UID: " + uidStr);
  beep(90, 1);

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Accept Cloud Run SSL certificate

    HTTPClient http;
    if (http.begin(client, SERVER_URL)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", IOT_API_KEY);

      // Construct exact JSON payload required by POST /api/rfid/scan
      String jsonPayload = "{";
      jsonPayload += "\\"rfidTag\\":\\"" + uidStr + "\\",";
      jsonPayload += "\\"mode\\":\\"" + currentMode + "\\",";
      jsonPayload += "\\"studentReg\\":\\"" + activeStudentReg + "\\"";
      jsonPayload += "}";

      Serial.println("[HTTP POST] Sending: " + jsonPayload);
      int httpCode = http.POST(jsonPayload);
      String response = http.getString();

      Serial.println("[HTTP STATUS] " + String(httpCode));
      Serial.println("[SERVER JSON] " + response);

      if (httpCode == 200) {
        // Success chime (2 crisp beeps)
        beep(80, 2);
      } else {
        // Error / Already Borrowed / Duplicate / Unauthorized buzzer (long low tone)
        beep(450, 1);
      }
      http.end();
    }
  } else {
    Serial.println("[ERR] WiFi Disconnected!");
    beep(300, 2);
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1500);
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(originUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleConfirmReset = async () => {
    await onResetDemoData();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>System Settings, SQLite Database & ESP32 Firmware</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hardware wiring schematics, production ESP32 HTTPS Arduino firmware, and SQLite database controls
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex p-1 rounded-xl bg-[#11141e] border border-amber-500/30">
          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'hardware' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ESP32 Hardware</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'storage' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQLite Database</span>
          </button>

          <button
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'presentation' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>PPT & API URL</span>
          </button>
        </div>
      </div>

      {resetSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>SQLite database successfully reset with official CKCET Hackathon equipment and students!</span>
        </div>
      )}

      {/* TAB 1: ESP32 HARDWARE INTEGRATION */}
      {activeTab === 'hardware' && (
        <div className="space-y-6">
          {/* Architecture Status Table */}
          <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Full-Stack Architecture & Hardware Endpoint Specification</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">System Module</th>
                    <th className="pb-3">Operational Status</th>
                    <th className="pb-3">Implementation Details</th>
                    <th className="pb-3 pr-2">API / Storage Layer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="py-3 pl-2 font-bold text-white">RFID Hardware Endpoint</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        LIVE EXPRESS API
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      Validates equipment UID, student register no / card UID, availability, and 2.5s duplicate scan cooldown.
                    </td>
                    <td className="py-3 pr-2 text-amber-300 font-mono text-[11px]">POST /api/rfid/scan</td>
                  </tr>

                  <tr>
                    <td className="py-3 pl-2 font-bold text-white">Persistent Database</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        SQLITE3 (WAL MODE)
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      Stores equipment, students, transactions, and RFID scan logs in server-side SQLite (<code className="text-amber-300">sportsync.db</code>).
                    </td>
                    <td className="py-3 pr-2 text-slate-400 font-mono text-[11px]">GET /api/state</td>
                  </tr>

                  <tr>
                    <td className="py-3 pl-2 font-bold text-white">Real-Time Dashboard Sync</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        SSE + AUTO-POLLING
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      Server-Sent Events push every ESP32 scan immediately to open browsers with 3s fallback polling.
                    </td>
                    <td className="py-3 pr-2 text-slate-400 font-mono text-[11px]">GET /api/events</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ESP32 Pinout & Wiring Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>ESP32-WROOM-32 & MFRC522 Wiring Map</span>
              </h3>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="pb-2">MFRC522 Pin</th>
                      <th className="pb-2">ESP32 Pin</th>
                      <th className="pb-2">Function</th>
                      <th className="pb-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 text-amber-300 font-bold">3.3V (VCC)</td>
                      <td className="py-2 text-rose-400 font-bold">3V3 (NOT 5V!)</td>
                      <td className="py-2 text-slate-400">Power</td>
                      <td className="py-2 text-rose-400 font-sans text-[10px]">3.3V only — 5V damages RC522</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-amber-300">RST</td>
                      <td className="py-2 text-slate-200">GPIO 22</td>
                      <td className="py-2 text-slate-400">Reset</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Digital Reset</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-amber-300">GND</td>
                      <td className="py-2 text-slate-200">GND</td>
                      <td className="py-2 text-slate-400">Ground</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Common ground</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-amber-300">MISO</td>
                      <td className="py-2 text-slate-200">GPIO 19</td>
                      <td className="py-2 text-slate-400">SPI MISO</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Master In Slave Out</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-amber-300">MOSI</td>
                      <td className="py-2 text-slate-200">GPIO 23</td>
                      <td className="py-2 text-slate-400">SPI MOSI</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Master Out Slave In</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-amber-300">SCK</td>
                      <td className="py-2 text-slate-200">GPIO 18</td>
                      <td className="py-2 text-slate-400">SPI Clock</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Serial Clock</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-amber-300">SDA (SS)</td>
                      <td className="py-2 text-slate-200">GPIO 5</td>
                      <td className="py-2 text-slate-400">SPI Chip Select</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Slave Select</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-emerald-300">Buzzer (+)</td>
                      <td className="py-2 text-slate-200">GPIO 4</td>
                      <td className="py-2 text-slate-400">Audio Tone</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">2 beeps = 200 OK, 1 long = Error</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-cyan-300">Mode Btn</td>
                      <td className="py-2 text-slate-200">GPIO 15</td>
                      <td className="py-2 text-slate-400">Issue/Return</td>
                      <td className="py-2 text-slate-400 font-sans text-[10px]">Toggles issue vs return mode</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Arduino Code Box */}
            <div className="rounded-2xl bg-[#0b0e15] border border-amber-500/20 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Code className="w-4 h-4 text-amber-400" />
                    <span>ESP32 Production Firmware (.ino)</span>
                  </h3>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Sketch'}</span>
                  </button>
                </div>

                <div className="mt-3 bg-black/80 rounded-xl p-3 max-h-72 overflow-y-auto font-mono text-[11px] text-amber-300/90 leading-relaxed border border-slate-800/80">
                  <pre>{arduinoCode}</pre>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-3">
                Uses <code className="text-amber-400">WiFiClientSecure</code> + <code className="text-amber-400">HTTPClient</code> to post directly to the deployed HTTPS endpoint <code className="text-emerald-400">{scanEndpointUrl}</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SQLITE DATABASE & RESET */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Persistent SQLite Database Engine (sportsync.db)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block">Cataloged Equipment</span>
                <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">
                  {equipment.length} Items
                </span>
                <span className="text-[10px] text-slate-500">SQLite equipment table</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block">Registered Students</span>
                <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
                  {students.length} Students
                </span>
                <span className="text-[10px] text-slate-500">SQLite students table</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block">Transactions History</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
                  {transactions.length} Records
                </span>
                <span className="text-[10px] text-slate-500">SQLite transactions table</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block">Hardware RFID Scans</span>
                <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-1 block">
                  {hardwareStatus?.totalHardwareScans || 0} Scans
                </span>
                <span className="text-[10px] text-slate-500">Received via /api/rfid/scan</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#161a26] border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <h4 className="font-bold text-amber-300">Server-Side SQLite Persistence:</h4>
              <p>
                All sports equipment, student registrations, issue/return timestamps, and RFID scan logs are stored in a persistent server-side SQLite database (<code className="text-amber-400">sportsync.db</code> in Write-Ahead Logging mode). Both the web application and external ESP32 hardware read and write to the same centralized database.
              </p>
            </div>

            {/* Reset Demo Data Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">Reset SQLite Database to Default CKCET Seed Data</h4>
                <p className="text-xs text-slate-400">
                  Restores default equipment (Football, Cricket Bat, Badminton, etc.) and student records in SQLite
                </p>
              </div>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset SQLite DB</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PPT & PRESENTATION READY */}
      {activeTab === 'presentation' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Hackathon Pitch & Live Cloud Endpoint</span>
              </h3>
              <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                CKCET IoT 2026
              </span>
            </div>

            {/* Share URL Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#171a24] to-[#121620] border border-amber-500/30 space-y-2">
              <label className="block text-xs font-bold text-amber-300">
                Deployed Web App & ESP32 API Base URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={originUrl}
                  className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-200 focus:outline-none"
                />
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-md"
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                ESP32 POST Endpoint: <code className="text-emerald-400 font-mono">{scanEndpointUrl}</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#11141e] border border-rose-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-rose-400 pb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Reset SQLite Database?</h3>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              This will reset the SQLite database tables (<code className="text-amber-300">equipment</code>, <code className="text-amber-300">students</code>, <code className="text-amber-300">transactions</code>, and <code className="text-amber-300">scan_logs</code>) to the initial CKCET Hackathon dataset.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Reset SQLite DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
