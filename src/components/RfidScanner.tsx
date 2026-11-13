import React, { useState } from 'react';
import { 
  Radio, 
  Cpu, 
  Wifi, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Terminal, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info,
  Trash2,
  Database,
  Send
} from 'lucide-react';
import { Equipment, Student, RfidScanLog, HardwareStatus } from '../types';
import { postRfidScan, RfidScanResponse } from '../utils/api';
import { playRfidBeep, playSuccessChime, playErrorBuzzer } from '../utils/audio';

interface RfidScannerProps {
  equipment: Equipment[];
  students: Student[];
  scanLogs: RfidScanLog[];
  hardwareStatus?: HardwareStatus;
  onRefreshState: () => Promise<void>;
  onClearLogs: () => Promise<void>;
  onOpenHardwareGuide: () => void;
}

export const RfidScanner: React.FC<RfidScannerProps> = ({
  equipment,
  students,
  scanLogs,
  hardwareStatus,
  onRefreshState,
  onClearLogs,
  onOpenHardwareGuide,
}) => {
  const [scanMode, setScanMode] = useState<'issue' | 'return'>('issue');
  const [rfidTagInput, setRfidTagInput] = useState('');
  const [studentRegInput, setStudentRegInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live API Response inspection
  const [lastApiResponse, setLastApiResponse] = useState<{
    httpStatus: number;
    payload: RfidScanResponse;
    timestamp: string;
  } | null>(null);

  const apiEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/rfid/scan`
      : 'https://ais-pre-t66slivharimixyygq2gkr-322922586017.asia-northeast1.run.app/api/rfid/scan';

  const handleExecuteApiScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const tag = rfidTagInput.trim().toUpperCase();
    const reg = studentRegInput.trim().toUpperCase();

    setIsSubmitting(true);
    playRfidBeep();

    try {
      const { httpStatus, data } = await postRfidScan({
        rfidTag: tag,
        mode: scanMode,
        studentReg: scanMode === 'issue' ? reg : reg || undefined,
        source: 'WEB_API_TERMINAL',
      });

      setLastApiResponse({
        httpStatus,
        payload: data,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (data.success) {
        playSuccessChime();
      } else {
        playErrorBuzzer();
      }

      await onRefreshState();
    } catch (err) {
      playErrorBuzzer();
      setLastApiResponse({
        httpStatus: 500,
        payload: {
          success: false,
          status: 'error',
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to reach /api/rfid/scan backend.',
        },
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const setSampleEquipment = (eq: Equipment) => {
    setRfidTagInput(eq.rfidTag);
    if (eq.currentBorrowerRegNo) {
      setStudentRegInput(eq.currentBorrowerRegNo);
    }
  };

  const setSampleStudent = (st: Student) => {
    setStudentRegInput(st.registerNumber);
  };

  const isHardwareConnected = Boolean(hardwareStatus?.connected);

  return (
    <div className="space-y-6">
      {/* Live Backend & ESP32 Hardware Status Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121724] via-[#161c2c] to-[#11141e] border-2 border-amber-500/40 p-4 lg:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl border ${
                isHardwareConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <Wifi className={`w-5 h-5 ${isHardwareConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Real-Time RFID Hardware Receiver & REST API Terminal
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  POST /api/rfid/scan Active
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isHardwareConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {isHardwareConnected
                    ? `ESP32 Connected (${hardwareStatus?.lastIp || 'WiFi'})`
                    : 'No Physical ESP32 Detected Yet — Listening for WiFi Scans'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                Connected directly to the persistent SQLite database. Physical <strong>ESP32-WROOM-32 + RC522</strong> readers over WiFi send JSON payloads to{' '}
                <code className="text-amber-300 bg-black/50 px-1.5 py-0.5 rounded font-mono">{apiEndpointUrl}</code>. The dashboard and logs update automatically in real time upon every scan.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenHardwareGuide}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer self-start lg:self-auto whitespace-nowrap active:scale-95"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>ESP32 Wiring & C++ Firmware</span>
          </button>
        </div>

        {/* 2-Step Pending Student Card Banner if a student tapped their ID card on ESP32 */}
        {hardwareStatus?.pendingStudentScan && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-ping" />
              <span>
                <strong>Student Card Verified on Reader:</strong> {hardwareStatus.pendingStudentScan.name} (
                <span className="font-mono">{hardwareStatus.pendingStudentScan.registerNumber}</span>). Tap Equipment RFID tag within 60s to complete checkout!
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase bg-black/40 px-2 py-0.5 rounded">Awaiting Equipment UID</span>
          </div>
        )}
      </div>

      {/* Main Grid: Live API Request Dispatcher & Real Database Scan Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live API POST /api/rfid/scan Console (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#11141e] border border-amber-500/30 p-6 shadow-xl space-y-6">
          {/* Header & Mode Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Execute Live POST /api/rfid/scan Request</span>
              </h3>
              <p className="text-xs text-slate-400">
                Dispatches a real HTTP POST request to the Express + SQLite backend
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex p-1 rounded-xl bg-[#161a26] border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setScanMode('issue');
                  setLastApiResponse(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  scanMode === 'issue'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Issue Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanMode('return');
                  setLastApiResponse(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  scanMode === 'return'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Return Mode</span>
              </button>
            </div>
          </div>

          {/* Hardware Receiver Status Indicator */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141926] to-[#0c0f17] border border-amber-500/30 p-6 text-center flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center w-28 h-28">
              <div className={`absolute inset-0 rounded-full border border-amber-500/20 ${isSubmitting ? 'animate-ping' : ''}`}></div>
              <div className="absolute -inset-3 rounded-full border border-amber-500/10"></div>

              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-amber-400 text-black scale-105 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                    : isHardwareConnected
                    ? 'bg-emerald-950/60 text-emerald-400 border-2 border-emerald-500/50'
                    : 'bg-[#181d2a] text-amber-400 border-2 border-amber-500/40 shadow-inner'
                }`}
              >
                <Radio className={`w-10 h-10 ${isSubmitting ? 'animate-bounce' : ''}`} />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-xs font-mono font-bold text-amber-300/90 tracking-wider">
                {isHardwareConnected
                  ? `ESP32-WROOM-32 ONLINE • LAST TAG: ${hardwareStatus?.lastScannedTag || 'READY'}`
                  : 'LISTENING FOR ESP32 WIFI POST /api/rfid/scan'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                {isHardwareConnected && hardwareStatus?.lastSeenAt
                  ? `Last hardware packet received at ${new Date(hardwareStatus.lastSeenAt).toLocaleTimeString()} (${hardwareStatus.totalHardwareScans} total scans)`
                  : 'Scan an RFID tag on your physical ESP32 reader or send a live API test below'}
              </p>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]"></span>
                <span>SQLITE DB: CONNECTED</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-slate-600'}`}></span>
                <span>ESP32 WIFI: {isHardwareConnected ? 'ACTIVE' : 'STANDBY'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]"></span>
                <span>DEBOUNCE: 2.5s</span>
              </div>
            </div>
          </div>

          {/* API Payload Inputs */}
          <form onSubmit={handleExecuteApiScan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>Equipment RFID Tag UID ("rfidTag") *</span>
                <span className="text-[10px] text-slate-500 font-mono">Registered MIFARE UID</span>
              </label>
              <div className="relative">
                <Radio className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. E2003411B802"
                  value={rfidTagInput}
                  onChange={(e) => setRfidTagInput(e.target.value.toUpperCase())}
                  className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl pl-9 pr-3 py-2.5 font-mono text-amber-300 text-xs focus:outline-none uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>
                  Student Register No or RFID Card UID ("studentReg") {scanMode === 'issue' ? '*' : '(Optional verification on Return)'}
                </span>
                <span className="text-[10px] text-amber-400/90 font-medium">
                  Matches registerNumber or rfidCardId
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 910423104001 or STU_CARD_9104A1"
                  value={studentRegInput}
                  onChange={(e) => setStudentRegInput(e.target.value.toUpperCase())}
                  className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2.5 font-mono text-amber-300 text-xs focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Live JSON Request Preview */}
            <div className="p-3 rounded-xl bg-[#0b0e15] border border-slate-800 font-mono text-[11px] text-slate-300">
              <div className="flex items-center justify-between text-[10px] text-amber-400 mb-1">
                <span>POST /api/rfid/scan Request Body</span>
                <span>application/json</span>
              </div>
              <pre className="text-emerald-300 overflow-x-auto">
{JSON.stringify(
  {
    rfidTag: rfidTagInput || 'E2003411B802',
    mode: scanMode,
    ...(studentRegInput || scanMode === 'issue' ? { studentReg: studentRegInput || '910423104001' } : {}),
  },
  null,
  2
)}
              </pre>
            </div>

            {/* Send HTTP POST Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-95 ${
                scanMode === 'issue'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Sending POST /api/rfid/scan...'
                  : `Send Real POST /api/rfid/scan (${scanMode.toUpperCase()})`}
              </span>
            </button>
          </form>

          {/* Registered Database Tag Selector for Fast API Testing */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Registered Equipment RFID Tags in SQLite:</span>
              <span className="text-[10px] text-amber-400 font-mono">Click to Autofill UID</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {equipment.slice(0, 5).map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setSampleEquipment(eq)}
                  className={`p-2 rounded-xl text-left border transition text-[11px] cursor-pointer ${
                    rfidTagInput === eq.rfidTag
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-[#151926] border-slate-800 hover:border-amber-500/40 text-slate-300'
                  }`}
                >
                  <p className="font-bold truncate">{eq.name}</p>
                  <p className="font-mono text-[10px] text-amber-400/80">{eq.rfidTag}</p>
                  <span
                    className={`text-[9px] uppercase font-bold ${
                      eq.status === 'available' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    Status: {eq.status}
                  </span>
                </button>
              ))}

              {/* Unregistered Tag Button to test 404 rejection */}
              <button
                type="button"
                onClick={() => setRfidTagInput('E200DEADBEEF')}
                className={`p-2 rounded-xl text-left border transition text-[11px] cursor-pointer ${
                  rfidTagInput === 'E200DEADBEEF'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-[#151926] border-slate-800 hover:border-rose-500/40 text-rose-300'
                }`}
              >
                <p className="font-bold text-rose-400">Unauthorized Tag</p>
                <p className="font-mono text-[10px] text-slate-400">E200DEADBEEF</p>
                <span className="text-[9px] text-rose-400 font-medium">Tests HTTP 404 Block</span>
              </button>
            </div>

            <div className="mt-3">
              <span className="text-xs font-bold text-slate-300 block mb-1.5">Registered Student IDs / Smart Cards:</span>
              <div className="flex flex-wrap gap-1.5">
                {students.slice(0, 4).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSampleStudent(st)}
                    className="px-2.5 py-1 rounded-lg bg-[#161a26] hover:bg-[#1f2537] border border-slate-800 text-[11px] text-slate-300 hover:text-amber-300 font-mono transition cursor-pointer"
                  >
                    {st.registerNumber} ({st.name.split(' ')[0]})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStudentRegInput('910499999999')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-[11px] text-rose-300 font-mono transition cursor-pointer"
                >
                  Unregistered Student (910499999999)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Server JSON Response & Persistent SQLite Scan Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          {/* Backend JSON Response Card */}
          {lastApiResponse ? (
            <div
              className={`p-5 rounded-2xl border text-xs shadow-xl animate-in zoom-in-95 duration-150 ${
                lastApiResponse.payload.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : lastApiResponse.payload.status === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 font-bold text-sm">
                <div className="flex items-center gap-2">
                  {lastApiResponse.payload.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : lastApiResponse.payload.status === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  )}
                  <span>HTTP {lastApiResponse.httpStatus} — {lastApiResponse.payload.code}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-300">{lastApiResponse.timestamp}</span>
              </div>

              <p className="mt-2.5 text-xs text-slate-100 leading-relaxed font-semibold">
                {lastApiResponse.payload.message}
              </p>

              <div className="mt-3 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] text-amber-300 overflow-x-auto">
                <div className="text-slate-400 mb-1">Raw JSON Response sent to ESP32:</div>
                <pre>{JSON.stringify(lastApiResponse.payload, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#11141e] border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                Ready for hardware or API requests. When your ESP32 posts to <code className="text-amber-300 font-mono">/api/rfid/scan</code>, the server response and database log appear here automatically.
              </span>
            </div>
          )}

          {/* Persistent SQLite RFID Scan Audit Log */}
          <div className="rounded-2xl bg-[#090b10] border border-amber-500/20 p-4 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-300">
                    Persistent SQLite RFID Scan Log ({scanLogs.length})
                  </span>
                </div>
                {scanLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear DB Logs</span>
                  </button>
                )}
              </div>

              {/* Real Database Logs */}
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                {scanLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
                    No RFID scans recorded in SQLite yet. Scan a tag on your ESP32 or dispatch a POST request on the left.
                  </div>
                ) : (
                  scanLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border font-mono text-[11px] ${
                        log.status === 'success'
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : log.status === 'warning'
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-80">
                        <span className="font-bold uppercase">{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="mt-1 text-slate-200 font-sans text-xs">{log.message}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>UID: {log.rfidTag} ({log.rawHex})</span>
                        <span>SRC: {log.source || 'ESP32_API'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Hardware API Contract Reference */}
            <div className="mt-3 p-2.5 rounded-xl bg-[#121622] border border-slate-800 text-[10px] text-slate-400">
              <div className="flex items-center justify-between text-amber-400 font-bold font-mono">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" /> Endpoint: POST /api/rfid/scan
                </span>
                <span className="text-emerald-400">CORS Enabled (*)</span>
              </div>
              <p className="mt-1 font-mono text-slate-300 break-all">
                {`{"rfidTag": "E2003411B802", "mode": "issue", "studentReg": "910423104001"}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
