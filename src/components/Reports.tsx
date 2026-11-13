import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Dumbbell,
  Clock,
  Printer
} from 'lucide-react';
import { Equipment, Student, Transaction } from '../types';
import { 
  exportEquipmentToCsv, 
  exportTransactionsToCsv, 
  exportOverdueToCsv, 
  exportStudentsToCsv 
} from '../utils/exportCsv';

interface ReportsProps {
  equipment: Equipment[];
  students: Student[];
  transactions: Transaction[];
}

export const Reports: React.FC<ReportsProps> = ({
  equipment,
  students,
  transactions,
}) => {
  const [reportType, setReportType] = useState<'inventory' | 'issues' | 'returns' | 'overdue'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Filter transactions by date
  const now = Date.now();
  const filterByDate = (dateStr: string) => {
    if (dateRange === 'all') return true;
    const time = new Date(dateStr).getTime();
    if (dateRange === 'today') {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      return time >= todayStart;
    }
    if (dateRange === '7days') {
      return now - time <= 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === '30days') {
      return now - time <= 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  };

  // 1. Inventory Report Data
  const filteredEquipment = equipment.filter((eq) => {
    const q = searchQuery.toLowerCase();
    return (
      eq.name.toLowerCase().includes(q) ||
      eq.id.toLowerCase().includes(q) ||
      eq.category.toLowerCase().includes(q) ||
      eq.rfidTag.toLowerCase().includes(q)
    );
  });

  // 2. Issue History Data
  const issueTxns = transactions
    .filter((t) => t.type === 'issue')
    .filter((t) => filterByDate(t.issueDate))
    .filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        t.equipmentName.toLowerCase().includes(q) ||
        t.studentName.toLowerCase().includes(q) ||
        t.studentRegisterNumber.toLowerCase().includes(q) ||
        t.equipmentId.toLowerCase().includes(q) ||
        t.rfidTag.toLowerCase().includes(q)
      );
    });

  // 3. Return History Data
  const returnTxns = transactions
    .filter((t) => t.status === 'returned')
    .filter((t) => filterByDate(t.returnDate || t.issueDate))
    .filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        t.equipmentName.toLowerCase().includes(q) ||
        t.studentName.toLowerCase().includes(q) ||
        t.studentRegisterNumber.toLowerCase().includes(q) ||
        t.equipmentId.toLowerCase().includes(q) ||
        t.rfidTag.toLowerCase().includes(q)
      );
    });

  // 4. Overdue Report Data
  const overdueTxns = transactions
    .filter((t) => t.status === 'overdue')
    .filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        t.equipmentName.toLowerCase().includes(q) ||
        t.studentName.toLowerCase().includes(q) ||
        t.studentRegisterNumber.toLowerCase().includes(q) ||
        t.equipmentId.toLowerCase().includes(q)
      );
    });

  const handleExportCsv = () => {
    if (reportType === 'inventory') {
      exportEquipmentToCsv(filteredEquipment);
    } else if (reportType === 'issues') {
      exportTransactionsToCsv(issueTxns);
    } else if (reportType === 'returns') {
      exportTransactionsToCsv(returnTxns);
    } else if (reportType === 'overdue') {
      exportOverdueToCsv(overdueTxns, equipment);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <span>Sports Department Official Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs, student checkout registers, return receipts, and CSV export
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrint}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#141824] hover:bg-[#1a2030] text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print View</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Export Active Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Sub-Navigation Tabs */}
      <div className="flex p-1 rounded-2xl bg-[#11141e] border border-amber-500/20 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setReportType('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            reportType === 'inventory'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Equipment Inventory Report ({equipment.length})</span>
        </button>

        <button
          onClick={() => setReportType('issues')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            reportType === 'issues'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Borrowing History</span>
        </button>

        <button
          onClick={() => setReportType('returns')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            reportType === 'returns'
              ? 'bg-emerald-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Return History</span>
        </button>

        <button
          onClick={() => setReportType('overdue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            reportType === 'overdue'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Overdue Audit Report ({overdueTxns.length})</span>
        </button>
      </div>

      {/* Search and Date Filter Controls */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-amber-500/20 shadow-md flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search records by student name, reg number, equipment ID, or RFID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {reportType !== 'inventory' && (
          <div className="w-full sm:w-48">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        )}
      </div>

      {/* Report Data Table */}
      <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-5 shadow-xl overflow-x-auto">
        {/* 1. Inventory View */}
        {reportType === 'inventory' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Equipment ID</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">RFID Tag UID</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Condition</th>
                <th className="pb-3">Borrows</th>
                <th className="pb-3 pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredEquipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-[#151a26] transition">
                  <td className="py-3 pl-2 font-mono text-amber-300 font-bold">{eq.id}</td>
                  <td className="py-3 font-bold text-white">{eq.name}</td>
                  <td className="py-3 text-slate-300">{eq.category}</td>
                  <td className="py-3 font-mono text-slate-400">{eq.rfidTag}</td>
                  <td className="py-3 text-slate-300">{eq.rackLocation}</td>
                  <td className="py-3 text-slate-400">{eq.condition}</td>
                  <td className="py-3 font-mono text-amber-400">{eq.totalBorrowsCount}x</td>
                  <td className="py-3 pr-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      eq.status === 'available'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : eq.status === 'overdue'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/10 text-amber-300'
                    }`}>
                      {eq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. Issue History View */}
        {reportType === 'issues' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Transaction ID</th>
                <th className="pb-3">Equipment</th>
                <th className="pb-3">Student Name</th>
                <th className="pb-3">Register Number</th>
                <th className="pb-3">Dept</th>
                <th className="pb-3">Issue Date</th>
                <th className="pb-3">Due Deadline</th>
                <th className="pb-3 pr-2">Current State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {issueTxns.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#151a26] transition">
                  <td className="py-3 pl-2 font-mono text-slate-400">{tx.id}</td>
                  <td className="py-3 font-bold text-white">{tx.equipmentName}</td>
                  <td className="py-3 text-slate-200">{tx.studentName}</td>
                  <td className="py-3 font-mono text-amber-300">{tx.studentRegisterNumber}</td>
                  <td className="py-3 text-slate-400">{tx.studentDepartment}</td>
                  <td className="py-3 text-slate-400">{new Date(tx.issueDate).toLocaleString()}</td>
                  <td className="py-3 text-slate-400">{new Date(tx.dueDate).toLocaleString()}</td>
                  <td className="py-3 pr-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      tx.status === 'returned'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : tx.status === 'overdue'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/10 text-amber-300'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 3. Return History View */}
        {reportType === 'returns' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Transaction ID</th>
                <th className="pb-3">Equipment</th>
                <th className="pb-3">Returned By Student</th>
                <th className="pb-3">Register Number</th>
                <th className="pb-3">Issue Date</th>
                <th className="pb-3">Returned Date</th>
                <th className="pb-3">Condition</th>
                <th className="pb-3 pr-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {returnTxns.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#151a26] transition">
                  <td className="py-3 pl-2 font-mono text-slate-400">{tx.id}</td>
                  <td className="py-3 font-bold text-white">{tx.equipmentName}</td>
                  <td className="py-3 text-slate-200">{tx.studentName}</td>
                  <td className="py-3 font-mono text-amber-300">{tx.studentRegisterNumber}</td>
                  <td className="py-3 text-slate-400">{new Date(tx.issueDate).toLocaleDateString()}</td>
                  <td className="py-3 text-emerald-400 font-semibold">
                    {tx.returnDate ? new Date(tx.returnDate).toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-3 text-slate-300">{tx.returnCondition || 'Good'}</td>
                  <td className="py-3 pr-2 text-slate-400 italic">{tx.notes || 'Normal return'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 4. Overdue Report View */}
        {reportType === 'overdue' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Equipment</th>
                <th className="pb-3">ID & RFID</th>
                <th className="pb-3">Defaulting Student</th>
                <th className="pb-3">Register Number</th>
                <th className="pb-3">Dept</th>
                <th className="pb-3">Expected Return</th>
                <th className="pb-3 pr-2">PET In-Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {overdueTxns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No overdue equipment items recorded in the audit log.
                  </td>
                </tr>
              ) : (
                overdueTxns.map((tx) => (
                  <tr key={tx.id} className="hover:bg-rose-950/20 transition">
                    <td className="py-3 pl-2 font-bold text-white">{tx.equipmentName}</td>
                    <td className="py-3 font-mono text-slate-400">{tx.equipmentId} • {tx.rfidTag}</td>
                    <td className="py-3 text-rose-300 font-semibold">{tx.studentName}</td>
                    <td className="py-3 font-mono text-amber-300 font-bold">{tx.studentRegisterNumber}</td>
                    <td className="py-3 text-slate-400">{tx.studentDepartment}</td>
                    <td className="py-3 text-rose-400 font-bold">{new Date(tx.dueDate).toLocaleString()}</td>
                    <td className="py-3 pr-2 text-slate-300">{tx.issuedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
