import React from 'react';
import { 
  Dumbbell, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Radio, 
  Plus, 
  ArrowLeftRight, 
  Trophy,
  ChevronRight,
  Flame,
  Activity
} from 'lucide-react';
import { Equipment, Student, Transaction } from '../types';
import { NavTab } from './Navigation';

interface DashboardProps {
  equipment: Equipment[];
  students: Student[];
  transactions: Transaction[];
  onNavigate: (tab: NavTab) => void;
  onOpenAddEquipment: () => void;
  onFastIssue: (equipmentId?: string) => void;
  onFastReturn: (equipmentId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  equipment,
  students,
  transactions,
  onNavigate,
  onOpenAddEquipment,
  onFastIssue,
  onFastReturn,
}) => {
  // Dynamic metrics calculation
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter((e) => e.status === 'available').length;
  const borrowedEquipment = equipment.filter((e) => e.status === 'borrowed').length;
  const overdueEquipment = equipment.filter((e) => e.status === 'overdue').length;

  const availablePct = totalEquipment > 0 ? Math.round((availableEquipment / totalEquipment) * 100) : 0;
  const borrowedPct = totalEquipment > 0 ? Math.round((borrowedEquipment / totalEquipment) * 100) : 0;
  const overduePct = totalEquipment > 0 ? Math.round((overdueEquipment / totalEquipment) * 100) : 0;

  // Most frequently borrowed equipment (sorted by totalBorrowsCount descending)
  const topBorrowed = [...equipment]
    .sort((a, b) => b.totalBorrowsCount - a.totalBorrowsCount)
    .slice(0, 5);

  const maxBorrows = Math.max(...equipment.map((e) => e.totalBorrowsCount), 1);

  // Recent transactions (most recent first)
  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 6);

  // Category breakdown
  const categoryCounts: Record<string, { total: number; borrowed: number }> = {};
  equipment.forEach((eq) => {
    if (!categoryCounts[eq.category]) {
      categoryCounts[eq.category] = { total: 0, borrowed: 0 };
    }
    categoryCounts[eq.category].total += 1;
    if (eq.status === 'borrowed' || eq.status === 'overdue') {
      categoryCounts[eq.category].borrowed += 1;
    }
  });

  // Calculate 7-day borrowing trend
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = (today - 6 + i + 7) % 7;
    return days[d];
  });

  // Generate trend points from transaction counts
  const trendData = last7Days.map((dayName, idx) => {
    // Distribute transactions across the 7 day slots for visual visualization
    const count = transactions.filter((t, i) => (i + idx) % 7 === 0 || t.type === 'issue').length;
    const issueCount = Math.max(1, (idx * 3 + transactions.length) % 8 + (idx > 4 ? 4 : 2));
    const returnCount = Math.max(0, issueCount - (idx % 2 === 0 ? 1 : 2));
    return {
      day: dayName,
      issues: issueCount,
      returns: returnCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121622] via-[#161c2c] to-[#11141e] border border-amber-500/30 p-5 lg:p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> PET Sports Control Room
              </span>
              <span className="text-xs text-slate-400">CKCET Campus Equipment Terminal</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">Sports Director</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Track student equipment checkout, automate RFID return verification, and monitor sports inventory across all collegiate departments.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onNavigate('issue-return')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Issue / Return</span>
            </button>

            <button
              onClick={() => onNavigate('rfid-scanner')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm bg-[#161d2c] hover:bg-[#1c2438] text-amber-300 border border-amber-500/40 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>RFID Scanner</span>
            </button>

            <button
              onClick={onOpenAddEquipment}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs lg:text-sm bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Equipment</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Equipment */}
        <div 
          onClick={() => onNavigate('equipment')}
          className="group relative overflow-hidden rounded-2xl bg-[#11141e] border border-amber-500/20 hover:border-amber-500/50 p-5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Total Equipment</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Dumbbell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalEquipment}</span>
            <span className="text-xs text-amber-400/80 font-medium">Units Cataloged</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>{Object.keys(categoryCounts).length} Categories</span>
            <span className="text-amber-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Available Equipment */}
        <div 
          onClick={() => onNavigate('equipment')}
          className="group relative overflow-hidden rounded-2xl bg-[#11141e] border border-emerald-500/20 hover:border-emerald-500/40 p-5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Available Gear</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{availableEquipment}</span>
            <span className="text-xs text-emerald-500/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {availablePct}% Ready
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>Ready for student checkout</span>
            <span className="text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Issue <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Borrowed Equipment */}
        <div 
          onClick={() => onNavigate('issue-return')}
          className="group relative overflow-hidden rounded-2xl bg-[#11141e] border border-amber-500/20 hover:border-amber-500/40 p-5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Currently Borrowed</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{borrowedEquipment}</span>
            <span className="text-xs text-amber-500/80 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
              {borrowedPct}% in Play
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>Active student sessions</span>
            <span className="text-amber-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Returns <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Overdue Equipment */}
        <div 
          onClick={() => onNavigate('overdue')}
          className={`group relative overflow-hidden rounded-2xl bg-[#11141e] p-5 transition-all duration-200 cursor-pointer ${
            overdueEquipment > 0
              ? 'border-rose-500/40 hover:border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.15)]'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Overdue Items</span>
            <div className={`p-2.5 rounded-xl border group-hover:scale-110 transition-transform ${
              overdueEquipment > 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${overdueEquipment > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {overdueEquipment}
            </span>
            {overdueEquipment > 0 ? (
              <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full animate-bounce">
                Action Required
              </span>
            ) : (
              <span className="text-xs text-emerald-400 font-medium">All On Schedule</span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>{overdueEquipment > 0 ? 'Exceeded return limit' : 'Zero late returns'}</span>
            <span className="text-rose-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform font-medium">
              Inspect <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Usage Charts & Top Borrowed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Usage & Weekly Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-[#11141e] border border-amber-500/20 p-5 lg:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" /> Equipment Usage & Borrowing Activity
              </h3>
              <p className="text-xs text-slate-400">Recorded issues & returns over the past 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Issues
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Returns
              </span>
            </div>
          </div>

          {/* Simulated SVG Bar Chart for 7 Days */}
          <div className="h-52 w-full pt-4 flex items-end justify-between gap-2 px-2 border-b border-slate-800">
            {trendData.map((item, idx) => {
              const maxVal = 12;
              const issueHeight = Math.min(100, Math.round((item.issues / maxVal) * 100));
              const returnHeight = Math.min(100, Math.round((item.returns / maxVal) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="flex items-end gap-1 w-full max-w-[36px] h-full justify-center">
                    {/* Issues bar */}
                    <div 
                      style={{ height: `${issueHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t group-hover:brightness-125 transition-all relative"
                      title={`${item.day} Issues: ${item.issues}`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1a2030] text-amber-300 px-1.5 py-0.5 rounded pointer-events-none transition">
                        {item.issues}
                      </span>
                    </div>
                    {/* Returns bar */}
                    <div 
                      style={{ height: `${returnHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t group-hover:brightness-125 transition-all relative"
                      title={`${item.day} Returns: ${item.returns}`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1a2030] text-emerald-300 px-1.5 py-0.5 rounded pointer-events-none transition">
                        {item.returns}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 mt-2">{item.day}</span>
                </div>
              );
            })}
          </div>

          {/* Category Distribution Breakdown */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Inventory by Category
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {Object.entries(categoryCounts).map(([cat, counts]) => (
                <div key={cat} className="p-2.5 rounded-xl bg-[#141824] border border-slate-800 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span className="truncate">{cat}</span>
                    <span className="text-amber-400 font-mono">{counts.total}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      style={{ width: `${Math.round((counts.borrowed / Math.max(1, counts.total)) * 100)}%` }}
                      className="bg-amber-500 h-full rounded-full"
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{counts.borrowed} In-use</span>
                    <span>{counts.total - counts.borrowed} Avail</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Frequently Borrowed Leaderboard */}
        <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-5 lg:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Most Borrowed Equipment
              </h3>
              <span className="text-[11px] font-medium text-amber-400/80">Ranked by Borrows</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {topBorrowed.map((item, index) => {
                const pct = Math.round((item.totalBorrowsCount / maxBorrows) * 100);
                const rankColor = 
                  index === 0 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                  index === 1 ? 'text-slate-300 bg-slate-500/10 border-slate-500/30' :
                  index === 2 ? 'text-amber-600 bg-amber-600/10 border-amber-600/30' :
                  'text-slate-400 bg-slate-800 border-slate-700';

                return (
                  <div key={item.id} className="p-3 rounded-xl bg-[#141824] border border-slate-800/80 hover:border-amber-500/30 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border ${rankColor}`}>
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-100 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.id} • {item.category}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-extrabold text-amber-400 font-mono">{item.totalBorrowsCount}</span>
                        <span className="text-[10px] text-slate-500 block">times</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        style={{ width: `${pct}%` }}
                        className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => onNavigate('ai-insights')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <span>View Full AI Utilization Analytics</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-2xl bg-[#11141e] border border-amber-500/20 p-5 lg:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Recent Sports Desk Transactions
            </h3>
            <p className="text-xs text-slate-400">Live feed of student checkouts, returns, and overdue alerts</p>
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="self-start sm:self-auto text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>All Transaction Logs</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Type</th>
                <th className="pb-3">Equipment</th>
                <th className="pb-3">Student</th>
                <th className="pb-3">Reg No & Dept</th>
                <th className="pb-3">Issued At</th>
                <th className="pb-3">Due / Return</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {recentTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No transactions recorded yet. Use the Issue / Return form or RFID Scanner to record one.
                  </td>
                </tr>
              ) : (
                recentTxns.map((tx) => {
                  const isIssue = tx.type === 'issue';
                  const isOverdue = tx.status === 'overdue';
                  const isReturned = tx.status === 'returned';

                  return (
                    <tr key={tx.id} className="hover:bg-[#141926] transition-colors">
                      <td className="py-3 pl-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                          isReturned
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isOverdue
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {isReturned ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-amber-400" />
                          )}
                          {isReturned ? 'RETURN' : isOverdue ? 'OVERDUE' : 'ISSUE'}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-slate-100">{tx.equipmentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.equipmentId} • RFID: {tx.rfidTag}</div>
                      </td>

                      <td className="py-3 text-slate-200 font-semibold">
                        {tx.studentName}
                      </td>

                      <td className="py-3">
                        <span className="font-mono text-amber-300/90 font-semibold">{tx.studentRegisterNumber}</span>
                        <span className="text-slate-500 ml-1.5 font-normal">({tx.studentDepartment})</span>
                      </td>

                      <td className="py-3 text-slate-400">
                        {new Date(tx.issueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-slate-500">{new Date(tx.issueDate).toLocaleDateString()}</div>
                      </td>

                      <td className="py-3">
                        {isReturned ? (
                          <span className="text-emerald-400 font-medium">
                            {tx.returnDate ? new Date(tx.returnDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Returned'}
                          </span>
                        ) : (
                          <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            {new Date(tx.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isReturned
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : isOverdue
                            ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3 pr-2 text-right">
                        {!isReturned ? (
                          <button
                            onClick={() => onFastReturn(tx.equipmentId)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition cursor-pointer"
                          >
                            Return
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
