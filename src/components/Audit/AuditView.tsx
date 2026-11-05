import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Shield,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Terminal,
} from 'lucide-react';
import { AuditEvent, api } from '../../services/api.ts';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [entityType, actorRole, actionSearch]);

  const loadLogs = () => {
    setLoading(true);
    api
      .getAuditLogs({
        entityType: entityType || undefined,
        actorRole: actorRole || undefined,
        action: actionSearch || undefined,
        limit: 150,
      })
      .then((res) => {
        setLogs(res.logs);
        setTotal(res.total);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Audit Trail &amp; Compliance Ledger
            <span className="text-[11px] font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              {total} immutable events
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Append-only tamper-evident compliance log capturing every system and investigator state change.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Append-Only Integrity Guard: ACTIVE</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2.5 text-xs">
        <div className="md:col-span-4 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            placeholder="Search action name or keyword..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200"
          >
            <option value="">All Entity Types</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="CASE">Investigation Case</option>
            <option value="RULE">Detection Rule</option>
            <option value="CUSTOMER">Customer Profile</option>
            <option value="SYSTEM">System Engine</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            value={actorRole}
            onChange={(e) => setActorRole(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200"
          >
            <option value="">All Actor Roles</option>
            <option value="FRAUD_ANALYST">Fraud Analyst</option>
            <option value="SENIOR_INVESTIGATOR">Senior Investigator</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor &amp; Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Justification Reason</th>
                <th className="py-2.5 px-3 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Querying audit ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No audit records match the current filter parameters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="hover:bg-slate-800/50 transition cursor-pointer"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200">{log.actorName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{log.actorRole}</div>
                        </td>

                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                          {log.action}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {log.entityType}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {log.entityId}
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px] text-[11px]">
                          {log.reason || '—'}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button className="text-slate-400 hover:text-white transition">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 ml-auto" />
                            ) : (
                              <ChevronRight className="w-4 h-4 ml-auto" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded State Payload Diff */}
                      {isExpanded && (
                        <tr className="bg-slate-950">
                          <td colSpan={7} className="p-4 space-y-2 border-b border-slate-800">
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span>Event Record: {log.id}</span>
                              <span>Gateway Origin: {log.ipAddress}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {log.previousState && (
                                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-[10px] font-mono uppercase text-slate-500">
                                    Previous State:
                                  </span>
                                  <pre className="text-[11px] font-mono text-amber-300/80 overflow-x-auto">
                                    {JSON.stringify(log.previousState, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newState && (
                                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-[10px] font-mono uppercase text-slate-500">
                                    Committed New State:
                                  </span>
                                  <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto">
                                    {JSON.stringify(log.newState, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
