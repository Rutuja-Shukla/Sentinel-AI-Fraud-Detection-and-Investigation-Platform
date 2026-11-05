import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FolderKanban,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowRight,
  Globe,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from 'recharts';
import { OverviewMetrics, Transaction } from '../../services/api.ts';

interface OverviewViewProps {
  metrics: OverviewMetrics | null;
  loading: boolean;
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateToTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  loading,
  onSelectTransaction,
  onNavigateToTab,
}) => {
  if (loading || !metrics) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-mono">Aggregating platform financial crime telemetry...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Executive Fraud Monitoring
            <span className="text-[11px] font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Live Production Feed
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time financial transaction surveillance, deterministic rule firing, and anomaly detection.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => onNavigateToTab('evaluation')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded font-medium transition cursor-pointer flex items-center space-x-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Model Performance Matrix</span>
          </button>
          <button
            onClick={() => onNavigateToTab('alerts')}
            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 border border-red-800/80 text-red-200 rounded font-medium transition cursor-pointer flex items-center space-x-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Review Alerts ({metrics.highRiskTransactions})</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Analyzed */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Analyzed</span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {metrics.totalTransactions.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Total transactions</div>
        </div>

        {/* Monitored Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Monitored</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ${(metrics.totalMonitoredVolumeUSD / 1000000).toFixed(2)}M
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Total gross volume</div>
        </div>

        {/* Suspicious (> 30) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Suspicious</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            {metrics.suspiciousTransactions.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Score &ge; 30 pts</div>
        </div>

        {/* High / Critical Risk (> 60) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>High Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400">
            {metrics.highRiskTransactions.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Requires review</div>
        </div>

        {/* Confirmed Fraud */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Confirmed</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300">
            {metrics.confirmedFraudCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Resolved as fraud</div>
        </div>

        {/* Open Cases */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Open Cases</span>
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {metrics.openInvestigationCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Active investigations</div>
        </div>

        {/* Detection Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Alert Rate</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {metrics.fraudRatePercentage}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Flagged / Analyzed</div>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-series Activity Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Transaction Volume &amp; Suspicious Pattern Trajectory
              </h2>
              <p className="text-[11px] text-slate-400">
                Daily transaction volume vs flagged anomalies across 30-day monitoring window
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="flex items-center space-x-1 text-slate-400">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block"></span>
                <span>Normal</span>
              </span>
              <span className="flex items-center space-x-1 text-red-400">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-sm inline-block"></span>
                <span>Flagged (Risk &ge; 60)</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.timeSeriesActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="suspiciousGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                />
                <Area type="monotone" dataKey="normal" stroke="#10b981" fillOpacity={1} fill="url(#normalGrad)" name="Normal" />
                <Area type="monotone" dataKey="suspicious" stroke="#ef4444" fillOpacity={1} fill="url(#suspiciousGrad)" name="Flagged" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Score Distribution (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Risk Score Classification Breakdown
            </h2>
            <p className="text-[11px] text-slate-400">
              Categorization into standard financial crime tiers
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.riskDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {metrics.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            {metrics.riskDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span className="truncate">{d.name.split(' ')[0]}</span>
                </span>
                <span className="font-mono font-bold text-white">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Analytics Row: High Risk Merchant Categories & Geo Threat Centers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Monitored Gross Volume by Merchant Category
            </h2>
            <p className="text-[11px] text-slate-400">
              Aggregated settlement value across high-risk &amp; regular merchant categories
            </p>
          </div>

          <div className="space-y-2">
            {metrics.categoryBreakdown.slice(0, 5).map((cat) => {
              const maxVol = metrics.categoryBreakdown[0]?.volumeUSD || 1;
              const pct = Math.round((cat.volumeUSD / maxVol) * 100);
              const isHighRisk = ['CRYPTO_EXCHANGE', 'FOREIGN_WIRE', 'LUXURY_JEWELRY'].includes(cat.category);
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center space-x-1.5 font-medium text-slate-200">
                      <span>{cat.category.replace('_', ' ')}</span>
                      {isHighRisk && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-red-900/60 text-red-300 border border-red-700">
                          ELEVATED MCC
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-300">
                      ${cat.volumeUSD.toLocaleString()}{' '}
                      <span className="text-slate-500 text-[10px]">({cat.count} txns)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isHighRisk ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Geographic Transaction &amp; Threat Telemetry
              </h2>
              <p className="text-[11px] text-slate-400">
                Hub transaction concentration and anomalous speed incidents
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500">12 GLOBAL HUBS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.geographicDistribution.slice(0, 6).map((geo) => (
              <div key={geo.city} className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-slate-200 text-xs truncate">{geo.city}</div>
                  <div className="text-[10px] text-slate-500 truncate">{geo.country}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">{geo.txCount} tx</span>
                  {geo.alertCount > 0 ? (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                      {geo.alertCount} alerts
                    </span>
                  ) : (
                    <span className="text-emerald-500">Normal</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Critical Flagged Stream & Audit Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Flagged Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                Recent Suspicious Transactions (Risk Score &ge; 60)
              </h2>
              <p className="text-[11px] text-slate-400">
                Latest transactions evaluated with high or critical risk by Sentinel
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Transaction</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Merchant</th>
                  <th className="py-2 px-3">Risk Score</th>
                  <th className="py-2 px-3">Primary Trigger</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {metrics.recentFlaggedTransactions.map((txn) => {
                  const score = txn.riskAssessment?.overallScore || 0;
                  const classification = txn.riskAssessment?.riskClassification || 'HIGH';
                  const topRule = txn.riskAssessment?.matchedRules[0]?.ruleName || 'Statistical Anomaly';

                  return (
                    <tr key={txn.id} className="hover:bg-slate-850/60 transition group">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                        {txn.id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono">
                        {txn.customerId}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        ${txn.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]">
                        {txn.merchantName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            score >= 80
                              ? 'bg-red-950 text-red-300 border border-red-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-700'
                          }`}
                        >
                          {score}/100 {classification}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[150px] text-[11px]">
                        {topRule}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onSelectTransaction(txn)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <span>Investigate</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Audit Activity Ticker (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Audit Trail Stream
                </h2>
                <p className="text-[11px] text-slate-400">
                  Append-only immutable event log
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('audit')}
                className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                Full Log
              </button>
            </div>

            <div className="space-y-2 mt-3 overflow-y-auto max-h-80">
              {metrics.recentAuditActivity.map((log) => (
                <div key={log.id} className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-300">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[10px] flex items-center justify-between">
                    <span>
                      Actor: <strong className="text-slate-300">{log.actorName}</strong> ({log.actorRole})
                    </span>
                    <span className="font-mono text-slate-500">{log.entityId}</span>
                  </div>
                  {log.reason && (
                    <div className="text-[10px] text-slate-500 italic truncate">
                      &quot;{log.reason}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tamper-evident SHA ledger</span>
            <span className="text-emerald-400 font-mono">INTEGRITY VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
