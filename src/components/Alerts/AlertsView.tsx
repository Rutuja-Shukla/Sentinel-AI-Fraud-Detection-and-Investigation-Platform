import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  FolderPlus,
  Filter,
} from 'lucide-react';
import { Transaction } from '../../services/api.ts';

interface AlertsViewProps {
  alerts: Transaction[];
  loading: boolean;
  onSelectTransaction: (txn: Transaction) => void;
  onCreateCase: (txnId: string, customerId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  loading,
  onSelectTransaction,
  onCreateCase,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');

  const filtered = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.riskAssessment?.riskClassification === filterSeverity;
  });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Priority Fraud Alerts Queue
            <span className="text-[11px] font-mono font-normal bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
              {alerts.length} High &amp; Critical Alerts
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time queue of transactions exceeding high-risk threshold (&ge; 60 pts) requiring analyst triage.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterSeverity(lvl)}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                filterSeverity === lvl
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid / Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-mono text-xs">
          Loading active fraud alerts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-500 font-mono text-xs">
          No alerts matching current severity filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const score = alert.riskAssessment?.overallScore || 0;
            const classification = alert.riskAssessment?.riskClassification || 'HIGH';
            const matchedRules = alert.riskAssessment?.matchedRules || [];
            const primaryRule = matchedRules[0];

            return (
              <div
                key={alert.id}
                className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Summary Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        score >= 80
                          ? 'bg-red-950 text-red-300 border border-red-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}
                    >
                      RISK {score}/100 — {classification}
                    </span>
                    <span className="font-mono font-bold text-white text-xs">{alert.id}</span>
                    <span className="text-slate-500 text-xs">&bull;</span>
                    <span className="font-mono text-slate-300 text-xs">{alert.customerId}</span>
                    <span className="text-slate-500 text-xs">&bull;</span>
                    <span className="font-mono text-white text-xs font-bold">${alert.amount.toFixed(2)}</span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <strong>Merchant:</strong> {alert.merchantName} ({alert.merchantCategory.replace('_', ' ')}) |{' '}
                    <strong>Location:</strong> {alert.sourceLocation.city}, {alert.sourceLocation.country}
                  </div>

                  {primaryRule && (
                    <div className="text-[11px] text-amber-400 font-mono bg-slate-950/80 p-2 rounded border border-slate-800/80">
                      <strong>Trigger [{primaryRule.ruleId}]:</strong> {primaryRule.description}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => onCreateCase(alert.id, alert.customerId)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Open Case</span>
                  </button>
                  <button
                    onClick={() => onSelectTransaction(alert)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Investigate</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
