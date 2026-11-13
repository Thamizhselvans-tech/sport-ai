import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Volume2, 
  VolumeX, 
  Share2, 
  Trophy,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Database,
  Wifi
} from 'lucide-react';
import { getSoundMuted, setSoundMuted } from '../utils/audio';
import { HardwareStatus } from '../types';

interface HeaderProps {
  onResetData: () => void;
  onOpenHardwareGuide: () => void;
  availableCount: number;
  borrowedCount: number;
  overdueCount: number;
  hardwareStatus?: HardwareStatus;
  backendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHardwareGuide,
  availableCount,
  borrowedCount,
  overdueCount,
  hardwareStatus,
  backendConnected = true,
}) => {
  const [muted, setMuted] = useState(getSoundMuted());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const presentationUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-t66slivharimixyygq2gkr-322922586017.asia-northeast1.run.app';

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const newMuted = !muted;
    setSoundMuted(newMuted);
    setMuted(newMuted);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(presentationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#0a0c10]/95 backdrop-blur-md px-4 lg:px-8 py-3.5 shadow-lg shadow-black/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Project Info */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.35)] text-black">
              <Trophy className="w-6 h-6 stroke-[2.2]" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-[#0a0c10] ${backendConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent font-['Plus_Jakarta_Sans']">
                  SPORTSYNC AI
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  CKCET IoT Hackathon 2026
                </span>

                {/* Live SQLite Backend & ESP32 Status Pill */}
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>SQLite API: Online</span>
                </span>

                <span
                  className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    hardwareStatus?.connected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900/90 text-slate-400 border-slate-700'
                  }`}
                  title={
                    hardwareStatus?.lastSeenAt
                      ? `Last ESP32 scan at ${new Date(hardwareStatus.lastSeenAt).toLocaleTimeString()}`
                      : 'Waiting for physical ESP32 POST /api/rfid/scan request'
                  }
                >
                  <Wifi className={`w-3 h-3 ${hardwareStatus?.connected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  <span>
                    {hardwareStatus?.connected
                      ? `ESP32 Connected (${hardwareStatus.totalHardwareScans} scans)`
                      : 'ESP32: Listening on /api/rfid/scan'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Smart Sports Equipment Management System <span className="text-slate-600">|</span> <span className="text-amber-400/90">PET Portal</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics & Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
            {/* Live Counts Pills */}
            <div className="hidden lg:flex items-center gap-2 bg-[#121620] border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{availableCount} Available</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{borrowedCount} Borrowed</span>
              </div>
              {overdueCount > 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{overdueCount} Overdue</span>
                  </div>
                </>
              )}
            </div>

            {/* Time */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141824] border border-amber-500/20 text-xs font-mono text-amber-300/90">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              {currentTime || '--:--:--'}
            </div>

            {/* Hardware Guide & Pinout button */}
            <button
              onClick={onOpenHardwareGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="View ESP32 Pinout & IoT Arduino Code"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>ESP32 Hookup</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-[#181d2c] border border-slate-800 transition cursor-pointer"
              title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Presentation URL Share Modal */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)] transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share & API URL</span>
            </button>
          </div>
        </div>
      </header>

      {/* Share / Presentation Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#10141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-black relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-slate-100">CKCET IoT Hackathon 2026 Live Deployment</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-xl bg-[#161b28] border border-amber-500/20 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Live Cloud Server & ESP32 API Endpoint
                </p>
                Use this URL for your PowerPoint presentation and configure your ESP32 firmware with <code className="text-amber-300 font-mono">{presentationUrl}/api/rfid/scan</code>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Live Deployed App URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={presentationUrl}
                    className="w-full bg-[#0a0c12] border border-amber-500/30 rounded-lg px-3 py-2 text-xs font-mono text-amber-200 focus:outline-none"
                  />
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition whitespace-nowrap cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded-lg bg-[#0e121a] border border-slate-800">
                  <span className="text-amber-400 font-semibold block">RFID POST Endpoint:</span>
                  <span className="text-slate-300 font-mono">/api/rfid/scan</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e121a] border border-slate-800">
                  <span className="text-amber-400 font-semibold block">Database Engine:</span>
                  <span className="text-slate-300">Persistent SQLite (WAL)</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <a
                  href={presentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline font-medium"
                >
                  Open in New Tab <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
