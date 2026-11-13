import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  User, 
  Dumbbell, 
  Calendar, 
  Radio, 
  ShieldAlert,
  Sparkles,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Equipment, Student, Transaction, EquipmentCondition } from '../types';
import { generateId } from '../utils/storage';
import { playSuccessChime, playErrorBuzzer } from '../utils/audio';

interface IssueReturnProps {
  equipment: Equipment[];
  students: Student[];
  transactions: Transaction[];
  onIssueEquipment: (transaction: Transaction, updatedEquipment: Equipment) => void;
  onReturnEquipment: (transactionId: string, updatedEquipment: Equipment, condition: EquipmentCondition, notes?: string) => void;
  preselectedEquipmentId?: string;
  preselectedStudentRegNo?: string;
}

export const IssueReturn: React.FC<IssueReturnProps> = ({
  equipment,
  students,
  transactions,
  onIssueEquipment,
  onReturnEquipment,
  preselectedEquipmentId,
  preselectedStudentRegNo,
}) => {
  const [activeTab, setActiveTab] = useState<'issue' | 'return'>('issue');

  // Issue Form State
  const [selectedStudentReg, setSelectedStudentReg] = useState(preselectedStudentRegNo || '');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(preselectedEquipmentId || '');
  const [durationHours, setDurationHours] = useState('2');
  const [customDueDateTime, setCustomDueDateTime] = useState('');
  const [petStaffName, setPetStaffName] = useState('Mr. R. Shanmugam (PET)');
  const [issueNotes, setIssueNotes] = useState('');

  // Notifications / Alerts
  const [alertState, setAlertState] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Return Flow State
  const [returnSearch, setReturnSearch] = useState('');
  const [returningItem, setReturningItem] = useState<{ eq: Equipment; tx?: Transaction } | null>(null);
  const [returnCondition, setReturnCondition] = useState<EquipmentCondition>('Good');
  const [returnNotes, setReturnNotes] = useState('');

  // Sync if preselected props change
  useEffect(() => {
    if (preselectedEquipmentId) {
      setSelectedEquipmentId(preselectedEquipmentId);
      const eq = equipment.find((e) => e.id === preselectedEquipmentId);
      if (eq && (eq.status === 'borrowed' || eq.status === 'overdue')) {
        setActiveTab('return');
        setReturnSearch(eq.id);
      } else {
        setActiveTab('issue');
      }
    }
  }, [preselectedEquipmentId, equipment]);

  useEffect(() => {
    if (preselectedStudentRegNo) {
      setSelectedStudentReg(preselectedStudentRegNo);
    }
  }, [preselectedStudentRegNo]);

  // Available equipment
  const availableEquipment = equipment.filter((e) => e.status === 'available');

  // Currently borrowed equipment (borrowed or overdue)
  const borrowedEquipment = equipment.filter((e) => e.status === 'borrowed' || e.status === 'overdue');

  const selectedStudent = students.find(
    (s) => s.registerNumber.toLowerCase() === selectedStudentReg.trim().toLowerCase()
  );

  const selectedEquipment = equipment.find((e) => e.id === selectedEquipmentId);

  // Handle Issue Submit
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertState(null);

    if (!selectedStudentReg.trim()) {
      setAlertState({ type: 'error', message: 'Please select or enter a valid Student Register Number.' });
      playErrorBuzzer();
      return;
    }

    if (!selectedStudent) {
      setAlertState({
        type: 'error',
        message: `Student with Register Number "${selectedStudentReg}" was not found in the directory. Please register the student first.`,
      });
      playErrorBuzzer();
      return;
    }

    if (!selectedEquipmentId) {
      setAlertState({ type: 'error', message: 'Please select an equipment item to issue.' });
      playErrorBuzzer();
      return;
    }

    if (!selectedEquipment) {
      setAlertState({ type: 'error', message: 'Selected equipment was not found.' });
      playErrorBuzzer();
      return;
    }

    // Critical Requirement: Validate that equipment is available
    if (selectedEquipment.status !== 'available') {
      setAlertState({
        type: 'warning',
        message: `Issue Blocked: "${selectedEquipment.name}" (${selectedEquipment.id}) is already ${selectedEquipment.status.toUpperCase()} by ${selectedEquipment.currentBorrowerName || 'another student'}. It must be returned first.`,
      });
      playErrorBuzzer();
      return;
    }

    // Compute Due Date
    const issueDate = new Date();
    let dueDate: Date;
    if (durationHours === 'custom' && customDueDateTime) {
      dueDate = new Date(customDueDateTime);
    } else {
      const hours = parseFloat(durationHours) || 2;
      dueDate = new Date(issueDate.getTime() + hours * 60 * 60 * 1000);
    }

    const newTxId = `TXN-${issueDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTransaction: Transaction = {
      id: newTxId,
      type: 'issue',
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      rfidTag: selectedEquipment.rfidTag,
      studentId: selectedStudent.id,
      studentRegisterNumber: selectedStudent.registerNumber,
      studentName: selectedStudent.name,
      studentDepartment: selectedStudent.department,
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'active',
      issuedBy: petStaffName || 'PET Teacher',
      notes: issueNotes.trim() || undefined,
    };

    const updatedEquipment: Equipment = {
      ...selectedEquipment,
      status: 'borrowed',
      currentBorrowerId: selectedStudent.id,
      currentBorrowerName: selectedStudent.name,
      currentBorrowerRegNo: selectedStudent.registerNumber,
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      totalBorrowsCount: selectedEquipment.totalBorrowsCount + 1,
    };

    onIssueEquipment(newTransaction, updatedEquipment);
    playSuccessChime();

    setAlertState({
      type: 'success',
      message: `SUCCESS: "${selectedEquipment.name}" has been issued to ${selectedStudent.name} (${selectedStudent.registerNumber}). Due at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    });

    // Reset inputs
    setSelectedEquipmentId('');
    setIssueNotes('');
  };

  // Open Return Dialog for specific item
  const openReturnModal = (eq: Equipment) => {
    // Find active transaction for this equipment
    const activeTx = transactions.find(
      (t) => t.equipmentId === eq.id && (t.status === 'active' || t.status === 'overdue')
    );
    setReturningItem({ eq, tx: activeTx });
    setReturnCondition(eq.condition);
    setReturnNotes('');
  };

  // Confirm Return Submit
  const handleConfirmReturn = () => {
    if (!returningItem) return;

    const { eq, tx } = returningItem;
    const txId = tx ? tx.id : `TXN-RET-${Date.now()}`;

    const updatedEquipment: Equipment = {
      ...eq,
      status: 'available',
      condition: returnCondition,
      currentBorrowerId: undefined,
      currentBorrowerName: undefined,
      currentBorrowerRegNo: undefined,
      issueDate: undefined,
      dueDate: undefined,
    };

    onReturnEquipment(txId, updatedEquipment, returnCondition, returnNotes);
    playSuccessChime();

    setAlertState({
      type: 'success',
      message: `RETURN CONFIRMED: "${eq.name}" (${eq.id}) is now marked AVAILABLE and stored in ${eq.rackLocation}.`,
    });

    setReturningItem(null);
  };

  // Filter borrowed items for return search
  const filteredBorrowed = borrowedEquipment.filter((eq) => {
    const q = returnSearch.toLowerCase();
    return (
      eq.name.toLowerCase().includes(q) ||
      eq.id.toLowerCase().includes(q) ||
      eq.rfidTag.toLowerCase().includes(q) ||
      (eq.currentBorrowerName && eq.currentBorrowerName.toLowerCase().includes(q)) ||
      (eq.currentBorrowerRegNo && eq.currentBorrowerRegNo.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Workflow Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
            <span>Sports Equipment Issue & Return Desk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical Education Department student equipment checkout & return verification
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-xl bg-[#121622] border border-amber-500/30">
          <button
            onClick={() => { setActiveTab('issue'); setAlertState(null); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'issue'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>Issue Equipment</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {availableEquipment.length} Avail
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('return'); setAlertState(null); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'return'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Return Equipment</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              borrowedEquipment.length > 0 ? 'bg-black/30 font-bold' : 'bg-black/10'
            }`}>
              {borrowedEquipment.length} Out
            </span>
          </button>
        </div>
      </div>

      {/* Global Alert Banner */}
      {alertState && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
          alertState.type === 'success'
            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
            : alertState.type === 'warning'
            ? 'bg-amber-950/60 text-amber-200 border border-amber-500/50'
            : 'bg-rose-950/60 text-rose-200 border border-rose-500/50'
        }`}>
          <div className="flex items-center gap-2.5">
            {alertState.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : alertState.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{alertState.message}</span>
          </div>
          <button
            onClick={() => setAlertState(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: ISSUE WORKFLOW */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Issue Form */}
          <div className="lg:col-span-2 rounded-2xl bg-[#11141e] border border-amber-500/30 p-6 shadow-xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              <span>Equipment Checkout Form</span>
            </h3>

            <form onSubmit={handleIssueSubmit} className="mt-5 space-y-4 text-xs">
              {/* Step 1: Student Selection */}
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>1. Student Register Number *</span>
                  <span className="text-[11px] text-amber-400 font-normal">
                    Enter or pick from registered students
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 910423104001"
                      value={selectedStudentReg}
                      onChange={(e) => setSelectedStudentReg(e.target.value.toUpperCase())}
                      className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl pl-9 pr-3 py-2.5 font-mono text-amber-300 focus:outline-none uppercase"
                    />
                  </div>

                  <select
                    value={selectedStudentReg}
                    onChange={(e) => setSelectedStudentReg(e.target.value)}
                    className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Quick Pick Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.registerNumber}>
                        {st.registerNumber} - {st.name} ({st.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Student Card confirmation */}
                {selectedStudent ? (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-emerald-300">{selectedStudent.name}</p>
                      <p className="text-[11px] text-slate-400">
                        Dept: <span className="text-white">{selectedStudent.department}</span> • Year {selectedStudent.year} • Smart Card: <span className="font-mono text-amber-300">{selectedStudent.rfidCardId}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      VERIFIED STUDENT
                    </span>
                  </div>
                ) : selectedStudentReg ? (
                  <p className="mt-1.5 text-[11px] text-amber-400">
                    ⚠ Student register number not yet matched. Make sure to use the exact registered number.
                  </p>
                ) : null}
              </div>

              {/* Step 2: Equipment Selection */}
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>2. Select Equipment to Issue *</span>
                  <span className="text-[11px] text-emerald-400 font-normal">
                    {availableEquipment.length} Available in Sports Room
                  </span>
                </label>

                <select
                  required
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none text-xs font-medium"
                >
                  <option value="">-- Choose Available Equipment --</option>
                  {equipment.map((eq) => {
                    const isAvail = eq.status === 'available';
                    return (
                      <option 
                        key={eq.id} 
                        value={eq.id}
                        disabled={!isAvail}
                        className={!isAvail ? 'text-slate-600 bg-slate-900' : ''}
                      >
                        {eq.name} [{eq.id}] - {eq.category} {isAvail ? `(Available - ${eq.rackLocation})` : `(BORROWED by ${eq.currentBorrowerName || 'student'})`}
                      </option>
                    );
                  })}
                </select>

                {/* Selected Equipment Preview */}
                {selectedEquipment && (
                  <div className={`mt-2.5 p-3 rounded-xl border text-xs ${
                    selectedEquipment.status === 'available'
                      ? 'bg-[#151926] border-amber-500/30'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{selectedEquipment.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedEquipment.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {selectedEquipment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-[11px] text-slate-400">
                      <div>ID: <span className="font-mono text-amber-300 font-semibold">{selectedEquipment.id}</span></div>
                      <div>RFID: <span className="font-mono text-amber-300">{selectedEquipment.rfidTag}</span></div>
                      <div>Location: <span className="text-white">{selectedEquipment.rackLocation}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Return Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    3. Return Expected Duration
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="1">1 Hour (PT Period Practice)</option>
                    <option value="2">2 Hours (Evening Sports Match)</option>
                    <option value="4">4 Hours (Inter-college Tournament)</option>
                    <option value="8">End of Day (By 5:30 PM)</option>
                    <option value="24">1 Day (Special Permission)</option>
                    <option value="custom">Custom Date & Time</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    PET Staff In-Charge
                  </label>
                  <input
                    type="text"
                    value={petStaffName}
                    onChange={(e) => setPetStaffName(e.target.value)}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {durationHours === 'custom' && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Custom Return Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={customDueDateTime}
                    onChange={(e) => setCustomDueDateTime(e.target.value)}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Purpose / Match Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Zone-4 Volleyball selection trials / practice"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={!selectedEquipment || selectedEquipment.status !== 'available'}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer ${
                    !selectedEquipment || selectedEquipment.status !== 'available'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  <FileCheck className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Authorize & Issue Equipment</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side Info & Quick Available Gear Cards */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#11141e] border border-amber-500/20 text-xs">
              <h4 className="font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                PET Instructions
              </h4>
              <ul className="space-y-2 text-slate-400 leading-relaxed list-disc list-inside">
                <li>Check student ID before handing over equipment.</li>
                <li>Equipment RFID tag will be automatically bound to the checkout record.</li>
                <li>System automatically flags overdue items past the return deadline.</li>
                <li>To test instant hardware tap, switch to the <strong className="text-amber-300">RFID Scanner</strong> tab.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#11141e] border border-slate-800 text-xs">
              <h4 className="font-bold text-white mb-2 flex items-center justify-between">
                <span>Fast Issue Selector</span>
                <span className="text-[10px] text-slate-500 font-mono">1-Click</span>
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">Click any available item below to immediately load it into the form:</p>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {availableEquipment.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setSelectedEquipmentId(eq.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition text-xs flex items-center justify-between cursor-pointer ${
                      selectedEquipmentId === eq.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#151926] border-slate-800 hover:border-amber-500/40 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{eq.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{eq.id} • {eq.category}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">Available</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RETURN WORKFLOW */}
      {activeTab === 'return' && (
        <div className="rounded-2xl bg-[#11141e] border border-emerald-500/30 p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Return Verification & Check-in</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify student, inspect physical equipment condition, and mark available
              </p>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search borrowed gear or student reg no..."
                value={returnSearch}
                onChange={(e) => setReturnSearch(e.target.value)}
                className="w-full bg-[#161a26] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Currently Borrowed Table / List */}
          {filteredBorrowed.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-[#141824] border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-2" />
              <h4 className="font-bold text-base text-white">All Sports Equipment Accounted For</h4>
              <p className="text-xs text-slate-400 mt-1">
                {borrowedEquipment.length === 0 
                  ? 'There are currently zero equipment items checked out by students.'
                  : 'No items match your return search criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Equipment Details</th>
                    <th className="pb-3">RFID Tag</th>
                    <th className="pb-3">Current Borrower</th>
                    <th className="pb-3">Reg Number</th>
                    <th className="pb-3">Issued Time</th>
                    <th className="pb-3">Due Deadline</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBorrowed.map((eq) => {
                    const isOverdue = eq.status === 'overdue';

                    return (
                      <tr key={eq.id} className="hover:bg-[#151a26] transition">
                        <td className="py-3.5 pl-2">
                          <div className="font-bold text-white">{eq.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{eq.id} • {eq.category}</div>
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono text-amber-300 font-semibold bg-[#161b28] px-2 py-0.5 rounded border border-slate-800">
                            {eq.rfidTag}
                          </span>
                        </td>

                        <td className="py-3.5 font-semibold text-slate-200">
                          {eq.currentBorrowerName || 'Unknown Student'}
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono text-amber-400 font-bold">{eq.currentBorrowerRegNo}</span>
                        </td>

                        <td className="py-3.5 text-slate-400">
                          {eq.issueDate ? new Date(eq.issueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>

                        <td className="py-3.5">
                          <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {eq.dueDate ? new Date(eq.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                          {isOverdue && (
                            <span className="block text-[10px] text-rose-500 font-bold animate-pulse">LATE RETURN</span>
                          )}
                        </td>

                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {eq.status}
                          </span>
                        </td>

                        <td className="py-3.5 pr-2 text-right">
                          <button
                            onClick={() => openReturnModal(eq)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
                          >
                            Return Gear
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Return Assessment Modal */}
      {returningItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#11141e] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-emerald-400 pb-3 border-b border-slate-800">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Confirm Return & Inspect Condition</h3>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[#151926] border border-slate-800">
                <p className="font-bold text-white text-sm">{returningItem.eq.name}</p>
                <div className="flex items-center justify-between text-slate-400 mt-1">
                  <span>ID: <strong className="text-amber-300 font-mono">{returningItem.eq.id}</strong></span>
                  <span>Borrower: <strong className="text-white">{returningItem.eq.currentBorrowerName}</strong></span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Reg No: {returningItem.eq.currentBorrowerRegNo} • RFID: {returningItem.eq.rfidTag}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Returned Physical Condition</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as EquipmentCondition)}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="Excellent">Excellent (No damage / clean)</option>
                  <option value="Good">Good (Normal match wear)</option>
                  <option value="Fair">Fair (Needs inspection/cleaning)</option>
                  <option value="Damaged">Damaged (Requires repair/maintenance)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Return Notes / Comments</label>
                <input
                  type="text"
                  placeholder="e.g. Returned with full air pressure, grip intact"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                Restoring to shelf: <strong>{returningItem.eq.rackLocation}</strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturningItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReturn}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-md cursor-pointer"
                >
                  Confirm & Mark Available
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
