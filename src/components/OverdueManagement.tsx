import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Search, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Download, 
  Send, 
  Dumbbell, 
  User, 
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Equipment, Student, Transaction, EquipmentCondition } from '../types';
import { exportOverdueToCsv } from '../utils/exportCsv';
import { playSuccessChime } from '../utils/audio';

interface OverdueManagementProps {
  equipment: Equipment[];
  students: Student[];
  transactions: Transaction[];
  onReturnEquipment: (transactionId: string, updatedEquipment: Equipment, condition: EquipmentCondition, notes?: string) => void;
}

export const OverdueManagement: React.FC<OverdueManagementProps> = ({
  equipment,
  students,
  transactions,
  onReturnEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  // Return modal
  const [returningItem, setReturningItem] = useState<{ eq: Equipment; tx?: Transaction } | null>(null);
  const [returnCondition, setReturnCondition] = useState<EquipmentCondition>('Good');
  const [returnNotes, setReturnNotes] = useState('');

  // Find all overdue equipment
  const overdueEquipment = equipment.filter((eq) => {
    if (eq.status === 'overdue') return true;
    if (eq.status === 'borrowed' && eq.dueDate && new Date(eq.dueDate).getTime() < Date.now()) {
      return true;
    }
    return false;
  });

  const nowMs = Date.now();

  const handleSendReminder = (eq: Equipment) => {
    setReminderSentId(eq.id);
    setTimeout(() => setReminderSentId(null), 3000);
  };

  const openReturnDialog = (eq: Equipment) => {
    const activeTx = transactions.find(
      (t) => t.equipmentId === eq.id && (t.status === 'active' || t.status === 'overdue')
    );
    setReturningItem({ eq, tx: activeTx });
    setReturnCondition(eq.condition);
    setReturnNotes('Late return cleared by PET');
  };

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
    setReturningItem(null);
  };

  // Filter
  const filteredOverdue = overdueEquipment.filter((eq) => {
    const q = searchQuery.toLowerCase();
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
      {/* Top Header & Alert Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Overdue Equipment Tracker</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              {overdueEquipment.length} Overdue
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time identification of athletic equipment not returned within agreed borrowing period
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportOverdueToCsv(transactions, equipment)}
            disabled={overdueEquipment.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              overdueEquipment.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-[#141824] hover:bg-[#1a2030] text-slate-200 border border-slate-700'
            }`}
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Overdue List (CSV)</span>
          </button>
        </div>
      </div>

      {/* Overdue Warning Callout */}
      {overdueEquipment.length > 0 ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#18131d] to-[#121622] border border-rose-500/40 shadow-xl flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex-shrink-0 animate-bounce">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-white text-sm">
              Urgent PET Attention: {overdueEquipment.length} Equipment Item(s) Past Due Date
            </h4>
            <p className="text-slate-300 mt-1 leading-relaxed">
              Items listed below have exceeded their scheduled return deadline based on the current system time ({new Date().toLocaleString()}). Physical Education staff can send a simulated reminder SMS or clear the item upon physical handover.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-emerald-300">All Checked-out Equipment is On Schedule</h4>
            <p className="text-slate-300 mt-0.5">There are currently no overdue sports equipment items in the CKCET sports room.</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-amber-500/20 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search overdue items by equipment name, ID, or student register number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161a26] border border-slate-800 focus:border-rose-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Overdue Items List */}
      <div className="space-y-4">
        {filteredOverdue.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-[#11141e] border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">No overdue items matching your search</p>
          </div>
        ) : (
          filteredOverdue.map((eq) => {
            const borrower = students.find(
              (s) => s.registerNumber.toLowerCase() === (eq.currentBorrowerRegNo || '').toLowerCase()
            );

            const dueMs = eq.dueDate ? new Date(eq.dueDate).getTime() : nowMs;
            const diffMs = nowMs - dueMs;
            const hoursOverdue = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
            const daysOverdue = Math.floor(hoursOverdue / 24);

            return (
              <div
                key={eq.id}
                className="rounded-2xl bg-gradient-to-r from-[#17121b] via-[#121622] to-[#121520] border-2 border-rose-500/50 p-5 shadow-xl hover:border-rose-500 transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Item Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex-shrink-0">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base text-white">{eq.name}</h3>
                        <span className="font-mono text-xs text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                          {eq.id}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                          RFID: {eq.rfidTag}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          {daysOverdue > 0 ? `Overdue by ${daysOverdue} day(s)` : `Overdue by ${hoursOverdue} hour(s)`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Category: <strong className="text-slate-200">{eq.category}</strong> • Storage: <span className="text-amber-300">{eq.rackLocation}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleSendReminder(eq)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        reminderSentId === eq.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#181d2c] hover:bg-[#20273a] text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>{reminderSentId === eq.id ? 'Reminder Sent (SMS)!' : 'Send Reminder Alert'}</span>
                    </button>

                    <button
                      onClick={() => openReturnDialog(eq)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-md transition cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black stroke-[2.5]" />
                      <span>Record Return Now</span>
                    </button>
                  </div>
                </div>

                {/* Student Borrower Card & Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  {/* Student details */}
                  <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        {eq.currentBorrowerName || 'Student'}
                      </span>
                      <span className="font-mono text-amber-400 font-bold">
                        {eq.currentBorrowerRegNo}
                      </span>
                    </div>

                    {borrower && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {borrower.department} (Year {borrower.year})
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {borrower.phone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Due timeline */}
                  <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Checkout Time:</span>
                      <span className="text-slate-200">
                        {eq.issueDate ? new Date(eq.issueDate).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-semibold">
                      <span>Agreed Return Deadline:</span>
                      <span>
                        {eq.dueDate ? new Date(eq.dueDate).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Return Dialog */}
      {returningItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#11141e] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-emerald-400 pb-3 border-b border-slate-800">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Clear Overdue Status</h3>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <p className="text-slate-300">
                You are recording the return of <strong className="text-white">{returningItem.eq.name}</strong> from <strong className="text-amber-300">{returningItem.eq.currentBorrowerName}</strong>.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Equipment Condition on Return</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as EquipmentCondition)}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Remarks</label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold cursor-pointer"
                >
                  Confirm Return & Mark Available
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
