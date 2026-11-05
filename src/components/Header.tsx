import React, { useState } from 'react';
import {
  ShieldAlert,
  UserCheck,
  Upload,
  PlusCircle,
  Database,
  Terminal,
  Activity,
  ChevronDown,
  Check,
} from 'lucide-react';

interface HeaderProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
    badgeNumber: string;
  };
  onSwitchRole: (role: string) => void;
  onOpenUpload: () => void;
  onOpenSimulate: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

const ROLES = [
  {
    role: 'FRAUD_ANALYST',
    title: 'Fraud Analyst (Sarah Chen)',
    desc: 'Triage alerts, log case notes, flag anomalies',
    badge: 'bg-blue-900/60 text-blue-300 border-blue-700',
  },
  {
    role: 'SENIOR_INVESTIGATOR',
    title: 'Senior Investigator (Marcus Vance)',
    desc: 'Confirm fraud, restrict accounts, resolve cases',
    badge: 'bg-purple-900/60 text-purple-300 border-purple-700',
  },
  {
    role: 'ADMINISTRATOR',
    title: 'Administrator (Elena Rostova)',
    desc: 'Configure rules, tune weights, execute test suite',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700',
  },
  {
    role: 'AUDITOR',
    title: 'Compliance Auditor (David O’Connor)',
    desc: 'Read-only audit trail and compliance inspection',
    badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  },
];

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchRole,
  onOpenUpload,
  onOpenSimulate,
  onResetDemo,
  isResetting,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const currentRoleConfig =
    ROLES.find((r) => r.role === currentUser.role) || ROLES[0];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Platform Tag */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-9 h-9 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white">
                SENTINEL
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                AI Fraud Ops
              </span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE MONITORING
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Financial Crime Detection &amp; Explainable Investigation System
            </p>
          </div>
        </div>

        {/* Center operational status */}
        <div className="hidden lg:flex items-center space-x-6 text-xs text-slate-300">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="font-mono text-cyan-300">Hybrid Rules + ML Isolation</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">AI Model:</span>
            <span className="font-mono text-indigo-300">Gemini 3.8 Flash (Server-Side)</span>
          </div>
        </div>

        {/* Right side actions & User Role selector */}
        <div className="flex items-center space-x-2.5">
          {/* Quick Action: Ingest / Simulate */}
          <button
            onClick={onOpenSimulate}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium transition cursor-pointer"
            title="Inject a realistic synthetic or custom transaction"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ingest Transaction</span>
          </button>

          {/* Quick Action: Upload CSV */}
          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer"
            title="Upload CSV transaction batches"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>

          {/* Role Switcher Dropdown (RBAC demonstration) */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-700 rounded text-xs transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <div className="text-left">
                <span className="text-slate-400 text-[10px] block leading-none">Role:</span>
                <span className="text-white font-medium text-xs leading-tight">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50 text-xs"
                onMouseLeave={() => setRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                  SELECT ACTIVE RBAC PERSONA
                </div>
                {ROLES.map((r) => {
                  const isCurrent = r.role === currentUser.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        onSwitchRole(r.role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start space-x-2 hover:bg-slate-800 transition ${
                        isCurrent ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {isCurrent ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug">
                          {r.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reset Demo State Button */}
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded transition cursor-pointer"
            title="Reset & re-seed 1,200 synthetic demo transactions"
          >
            <Database className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
