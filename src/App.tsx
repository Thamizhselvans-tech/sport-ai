/**
 * SPORTSYNC AI - Smart Sports Equipment Management System
 * Built for CKCET IoT Hackathon 2026
 * Full-Stack Express.js + Persistent SQLite Database + ESP32 RC522 RFID API
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { EquipmentManagement } from './components/EquipmentManagement';
import { StudentManagement } from './components/StudentManagement';
import { IssueReturn } from './components/IssueReturn';
import { RfidScanner } from './components/RfidScanner';
import { OverdueManagement } from './components/OverdueManagement';
import { AiInsights } from './components/AiInsights';
import { Reports } from './components/Reports';
import { SettingsHardware } from './components/SettingsHardware';
import { HardwareGuideModal } from './components/HardwareGuideModal';

import {
  Equipment,
  Student,
  Transaction,
  RfidScanLog,
  EquipmentCondition,
  HardwareStatus,
  FullSystemState,
} from './types';
import {
  fetchSystemState,
  apiAddEquipment,
  apiEditEquipment,
  apiDeleteEquipment,
  apiAddStudent,
  apiEditStudent,
  apiDeleteStudent,
  apiManualIssue,
  apiManualReturn,
  apiClearScanLogs,
  apiResetDatabase,
} from './utils/api';
import { playSuccessChime, playErrorBuzzer } from './utils/audio';
import { Radio, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scanLogs, setScanLogs] = useState<RfidScanLog[]>([]);
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus | undefined>();
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [liveScanToast, setLiveScanToast] = useState<RfidScanLog | null>(null);

  // Navigation and quick routing state
  const [preselectedEquipmentId, setPreselectedEquipmentId] = useState<string | undefined>();
  const [preselectedStudentRegNo, setPreselectedStudentRegNo] = useState<string | undefined>();
  const [isHardwareGuideOpen, setIsHardwareGuideOpen] = useState(false);

  const lastLogIdRef = useRef<string | null>(null);

  const applyServerState = useCallback((state: FullSystemState) => {
    setEquipment(state.equipment || []);
    setStudents(state.students || []);
    setTransactions(state.transactions || []);
    setScanLogs(state.scanLogs || []);
    setHardwareStatus(state.hardwareStatus);
    setBackendConnected(true);

    // Detect new incoming ESP32 RFID scan log for real-time audio & toast notification
    const newestLog = state.scanLogs?.[0];
    if (newestLog && lastLogIdRef.current && newestLog.id !== lastLogIdRef.current) {
      lastLogIdRef.current = newestLog.id;
      if (newestLog.source === 'ESP32_RC522') {
        setLiveScanToast(newestLog);
        if (newestLog.status === 'success') {
          playSuccessChime();
        } else {
          playErrorBuzzer();
        }
        setTimeout(() => {
          setLiveScanToast((prev) => (prev?.id === newestLog.id ? null : prev));
        }, 6000);
      }
    } else if (newestLog && !lastLogIdRef.current) {
      lastLogIdRef.current = newestLog.id;
    }
  }, []);

  const loadFromBackend = useCallback(async () => {
    try {
      const state = await fetchSystemState();
      applyServerState(state);
    } catch (err) {
      console.error('Backend sync error:', err);
      setBackendConnected(false);
    }
  }, [applyServerState]);

  // Initial load + Server-Sent Events (SSE) real-time push + 3-second polling fallback
  useEffect(() => {
    loadFromBackend();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.state) {
            applyServerState(parsed.state);
          }
        } catch (e) {
          console.debug('SSE parse error:', e);
        }
      };
      eventSource.onerror = () => {
        // Fallback polling continues seamlessly
      };
    } catch {
      // Ignore if EventSource unavailable
    }

    const pollTimer = setInterval(() => {
      loadFromBackend();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadFromBackend, applyServerState]);

  // Dynamic counts
  const availableCount = equipment.filter((e) => e.status === 'available').length;
  const borrowedCount = equipment.filter((e) => e.status === 'borrowed').length;
  const overdueCount = equipment.filter((e) => {
    if (e.status === 'overdue') return true;
    if (e.status === 'borrowed' && e.dueDate && new Date(e.dueDate).getTime() < Date.now()) {
      return true;
    }
    return false;
  }).length;

  // Equipment CRUD handlers backed by SQLite
  const handleAddEquipment = async (item: Omit<Equipment, 'createdAt' | 'totalBorrowsCount'>) => {
    try {
      const state = await apiAddEquipment(item);
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditEquipment = async (updatedItem: Equipment) => {
    try {
      const state = await apiEditEquipment(updatedItem);
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      const state = await apiDeleteEquipment(id);
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  // Student CRUD handlers backed by SQLite
  const handleAddStudent = async (studentData: Omit<Student, 'createdAt' | 'activeBorrowsCount'>) => {
    try {
      const state = await apiAddStudent(studentData);
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditStudent = async (updatedStudent: Student) => {
    try {
      const state = await apiEditStudent(updatedStudent);
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const state = await apiDeleteStudent(id);
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  // Issue / Return handlers backed by SQLite
  const handleIssueEquipment = async (newTx: Transaction, _updatedEq: Equipment) => {
    try {
      const state = await apiManualIssue({
        equipmentId: newTx.equipmentId,
        studentRegisterNumber: newTx.studentRegisterNumber,
        dueDate: newTx.dueDate,
        issuedBy: newTx.issuedBy,
        notes: newTx.notes,
      });
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReturnEquipment = async (
    _transactionId: string,
    updatedEq: Equipment,
    condition: EquipmentCondition,
    notes?: string
  ) => {
    try {
      const state = await apiManualReturn({
        equipmentId: updatedEq.id,
        condition,
        notes,
      });
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearLogs = async () => {
    try {
      const state = await apiClearScanLogs();
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetData = async () => {
    try {
      const state = await apiResetDatabase();
      applyServerState(state);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick navigation shortcuts
  const handleFastIssue = (eqId?: string) => {
    setPreselectedEquipmentId(eqId);
    setCurrentTab('issue-return');
  };

  const handleFastReturn = (eqId: string) => {
    setPreselectedEquipmentId(eqId);
    setCurrentTab('issue-return');
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header */}
      <Header
        onResetData={handleResetData}
        onOpenHardwareGuide={() => setIsHardwareGuideOpen(true)}
        availableCount={availableCount}
        borrowedCount={borrowedCount}
        overdueCount={overdueCount}
        hardwareStatus={hardwareStatus}
        backendConnected={backendConnected}
      />

      {/* Main Tab Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setPreselectedEquipmentId(undefined);
          setPreselectedStudentRegNo(undefined);
        }}
        overdueCount={overdueCount}
      />

      {/* Live Incoming ESP32 Hardware Scan Notification Toast */}
      {liveScanToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-[#111522] border-2 border-amber-500 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              {liveScanToast.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : liveScanToast.status === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div className="text-xs flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  ESP32 RFID Scan: {liveScanToast.action}
                </span>
                <button
                  onClick={() => setLiveScanToast(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-200 mt-1">{liveScanToast.message}</p>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                UID: {liveScanToast.rfidTag} • {new Date(liveScanToast.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto">
        {currentTab === 'dashboard' && (
          <Dashboard
            equipment={equipment}
            students={students}
            transactions={transactions}
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAddEquipment={() => setCurrentTab('equipment')}
            onFastIssue={handleFastIssue}
            onFastReturn={handleFastReturn}
          />
        )}

        {currentTab === 'issue-return' && (
          <IssueReturn
            equipment={equipment}
            students={students}
            transactions={transactions}
            onIssueEquipment={handleIssueEquipment}
            onReturnEquipment={handleReturnEquipment}
            preselectedEquipmentId={preselectedEquipmentId}
            preselectedStudentRegNo={preselectedStudentRegNo}
          />
        )}

        {currentTab === 'rfid-scanner' && (
          <RfidScanner
            equipment={equipment}
            students={students}
            scanLogs={scanLogs}
            hardwareStatus={hardwareStatus}
            onRefreshState={loadFromBackend}
            onClearLogs={handleClearLogs}
            onOpenHardwareGuide={() => setIsHardwareGuideOpen(true)}
          />
        )}

        {currentTab === 'equipment' && (
          <EquipmentManagement
            equipment={equipment}
            onAddEquipment={handleAddEquipment}
            onEditEquipment={handleEditEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onQuickIssue={handleFastIssue}
            onQuickReturn={handleFastReturn}
          />
        )}

        {currentTab === 'students' && (
          <StudentManagement
            students={students}
            transactions={transactions}
            onAddStudent={handleAddStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}

        {currentTab === 'overdue' && (
          <OverdueManagement
            equipment={equipment}
            students={students}
            transactions={transactions}
            onReturnEquipment={handleReturnEquipment}
          />
        )}

        {currentTab === 'ai-insights' && (
          <AiInsights
            equipment={equipment}
            students={students}
            transactions={transactions}
            onNavigateToEquipment={() => setCurrentTab('equipment')}
          />
        )}

        {currentTab === 'reports' && (
          <Reports
            equipment={equipment}
            students={students}
            transactions={transactions}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsHardware
            equipment={equipment}
            students={students}
            transactions={transactions}
            hardwareStatus={hardwareStatus}
            onResetDemoData={handleResetData}
          />
        )}
      </main>

      {/* Hardware Guide Pinout Modal */}
      <HardwareGuideModal
        isOpen={isHardwareGuideOpen}
        onClose={() => setIsHardwareGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-amber-500/20 bg-[#0a0c10] py-5 px-4 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-amber-400">SPORTSYNC AI</span>
            <span>•</span>
            <span>CKCET | IoT Hackathon 2026</span>
            <span>•</span>
            <span className="text-slate-400">Express.js + Persistent SQLite Backend</span>
          </div>

          <div className="text-slate-500">
            PET Sports Equipment Management System • Department of Physical Education
          </div>
        </div>
      </footer>
    </div>
  );
}
