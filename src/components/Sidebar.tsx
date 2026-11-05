import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  AlertTriangle,
  FolderKanban,
  Users,
  Sliders,
  CheckCircle2,
  FileCheck,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'transactions'
  | 'alerts'
  | 'cases'
  | 'customers'
  | 'rules'
  | 'evaluation'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openCasesCount?: number;
  highRiskCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  openCasesCount = 0,
  highRiskCount = 0,
}) => {
  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Executive Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'transactions' as NavTab,
      label: 'Transaction Monitor',
      icon: ArrowLeftRight,
    },
    {
      id: 'alerts' as NavTab,
      label: 'Fraud Alerts',
      icon: AlertTriangle,
      badge: highRiskCount > 0 ? highRiskCount : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      id: 'cases' as NavTab,
      label: 'Case Management',
      icon: FolderKanban,
      badge: openCasesCount > 0 ? openCasesCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'customers' as NavTab,
      label: 'Customer Profiles',
      icon: Users,
    },
    {
      id: 'rules' as NavTab,
      label: 'Detection Rules',
      icon: Sliders,
    },
    {
      id: 'evaluation' as NavTab,
      label: 'Evaluation & Tests',
      icon: CheckCircle2,
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit & Compliance',
      icon: FileCheck,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & Architecture',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Navigation Links */}
      <div className="py-4 px-2 space-y-1 flex-1">
        <div className="px-3 pb-2 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Financial Crime Ops
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 font-semibold border-l-2 border-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Telemetry Footer */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/80 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase">
          <span>Environment</span>
          <span className="text-emerald-400 font-bold">Node/Vite Full-Stack</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Rules Engine:</span>
          <span className="font-mono text-slate-200">10 Active Rules</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Anomaly Engine:</span>
          <span className="font-mono text-slate-200">Isolation Proxy v2.4</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Storage:</span>
          <span className="font-mono text-slate-200">In-Memory ACID</span>
        </div>
      </div>
    </aside>
  );
};
