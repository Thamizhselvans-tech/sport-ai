import React from 'react';
import { 
  LayoutDashboard, 
  Dumbbell, 
  Users, 
  ArrowLeftRight, 
  Radio, 
  AlertTriangle, 
  BrainCircuit, 
  FileSpreadsheet, 
  Settings,
  Sparkles
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'issue-return'
  | 'rfid-scanner'
  | 'equipment'
  | 'students'
  | 'overdue'
  | 'ai-insights'
  | 'reports'
  | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  overdueCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  overdueCount,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number; highlight?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'issue-return', label: 'Issue / Return', icon: ArrowLeftRight },
    { id: 'rfid-scanner', label: 'RFID Scanner', icon: Radio, highlight: true },
    { id: 'equipment', label: 'Equipment', icon: Dumbbell },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'overdue', label: 'Overdue Tracker', icon: AlertTriangle, badge: overdueCount },
    { id: 'ai-insights', label: 'AI Usage Insights', icon: BrainCircuit },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings & Hardware', icon: Settings },
  ];

  return (
    <div className="w-full bg-[#0d1017] border-b border-amber-500/20 px-4 lg:px-8 overflow-x-auto scrollbar-none py-2 sticky top-[69px] z-20 backdrop-blur-md">
      <div className="flex items-center gap-1.5 min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824] border border-transparent'
              } ${item.highlight && !isActive ? 'hover:border-amber-500/30 text-amber-300/80' : ''}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>

              {item.highlight && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-none shadow-sm shadow-rose-900 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
