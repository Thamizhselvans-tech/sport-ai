import React, { useState } from 'react';
import { 
  Cpu, 
  X, 
  Copy, 
  Check, 
  Zap, 
  AlertTriangle 
} from 'lucide-react';

interface HardwareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareGuideModal: React.FC<HardwareGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-t66slivharimixyygq2gkr-322922586017.asia-northeast1.run.app';

  const endpointSample = `POST ${baseUrl}/api/rfid/scan HTTP/1.1
Content-Type: application/json
x-api-key: 7d75696ebdcadb7de24c4672e47a2bb7f37763174d156a178d8b1a09129d6215

{
  "rfidTag": "E2003411B802",
  "mode": "issue",
  "studentReg": "910423104001"
}`;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#10141e] border border-amber-500/40 rounded-3xl p-6 lg:p-7 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Cpu className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                ESP32-WROOM-32 + RC522 Hardware Integration Guide
              </h3>
              <p className="text-xs text-slate-400">
                CKCET IoT Hackathon 2026 • Live Express + SQLite REST API Specification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1">
          {/* Hardware Components List */}
          <div>
            <h4 className="font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 1. Bill of Materials (BOM)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#161a26] border border-slate-800">
                <span className="font-bold text-white block">ESP32-WROOM-32</span>
                <span className="text-[11px] text-slate-400">Dual-core 240MHz, 2.4GHz WiFi</span>
              </div>
              <div className="p-3 rounded-xl bg-[#161a26] border border-slate-800">
                <span className="font-bold text-white block">MFRC522 RC522 Reader</span>
                <span className="text-[11px] text-slate-400">13.56 MHz SPI RFID module</span>
              </div>
              <div className="p-3 rounded-xl bg-[#161a26] border border-slate-800">
                <span className="font-bold text-white block">13.56MHz RFID Tags</span>
                <span className="text-[11px] text-slate-400">Equipment tags & Student ID cards</span>
              </div>
              <div className="p-3 rounded-xl bg-[#161a26] border border-slate-800">
                <span className="font-bold text-white block">5V Active Buzzer</span>
                <span className="text-[11px] text-slate-400">GPIO 4 audio feedback</span>
              </div>
            </div>
          </div>

          {/* Pin Connections */}
          <div>
            <h4 className="font-bold text-amber-300 uppercase tracking-wider mb-2">
              2. SPI Hardware Wiring Schematic
            </h4>
            <div className="p-4 rounded-xl bg-[#141824] border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-[11px] pb-2 border-b border-slate-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>CRITICAL: Connect RC522 VCC to 3.3V ONLY! Connecting to 5V will damage the MFRC522 chip.</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded bg-black/40">RC522 VCC ➔ <span className="text-amber-300 font-bold">ESP32 3V3</span></div>
                <div className="p-2 rounded bg-black/40">RC522 GND ➔ <span className="text-slate-300">ESP32 GND</span></div>
                <div className="p-2 rounded bg-black/40">RC522 RST ➔ <span className="text-slate-300">GPIO 22</span></div>
                <div className="p-2 rounded bg-black/40">RC522 SDA/SS ➔ <span className="text-slate-300">GPIO 5</span></div>
                <div className="p-2 rounded bg-black/40">RC522 MOSI ➔ <span className="text-slate-300">GPIO 23</span></div>
                <div className="p-2 rounded bg-black/40">RC522 MISO ➔ <span className="text-slate-300">GPIO 19</span></div>
                <div className="p-2 rounded bg-black/40">RC522 SCK ➔ <span className="text-slate-300">GPIO 18</span></div>
                <div className="p-2 rounded bg-black/40">Buzzer (+) ➔ <span className="text-emerald-400">GPIO 4</span></div>
                <div className="p-2 rounded bg-black/40">Mode Button ➔ <span className="text-cyan-400">GPIO 15</span></div>
              </div>
            </div>
          </div>

          {/* API Webhook Documentation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider">
                3. Live REST API Endpoint (POST /api/rfid/scan)
              </h4>
              <button
                onClick={copyEndpoint}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Payload!' : 'Copy HTTP Request'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-black/80 border border-slate-800 font-mono text-[11px] text-emerald-400 leading-relaxed overflow-x-auto">
              <pre>{endpointSample}</pre>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              When the ESP32 sends this JSON payload to <code className="text-amber-300">/api/rfid/scan</code>, the Express server validates the RFID UID and student in SQLite, prevents duplicate/unauthorized scans, records the transaction, and broadcasts a live update to all connected dashboards.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer shadow-md"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
