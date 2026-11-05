import React, { useState } from 'react';
import {
  Settings,
  Server,
  Database,
  Shield,
  RotateCcw,
  Terminal,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';

interface SettingsViewProps {
  currentUserRole: string;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUserRole,
  onResetDemo,
  isResetting,
}) => {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const isAdmin = currentUserRole === 'ADMINISTRATOR';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          System Architecture &amp; Platform Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Fintech microservice topology, server-side Gemini configuration, and operational RBAC matrix.
        </p>
      </div>

      {/* Architecture Topology Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backend & Runtime */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Application Runtime</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Service:</span>
              <span className="text-white">Sentinel Core Express</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Port / Host:</span>
              <span className="text-white">3000 / 0.0.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dev Bundler:</span>
              <span className="text-white">Vite Middlewares</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Node Environment:</span>
              <span className="text-emerald-400">Node.js ES2022</span>
            </div>
          </div>
        </div>

        {/* Database & Persistence */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Persistence &amp; Storage</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Engine:</span>
              <span className="text-white">In-Memory ACID Store</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">File Snapshot:</span>
              <span className="text-white">data/sentinel_store.json</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">RDBMS Target:</span>
              <span className="text-slate-400">PostgreSQL (Production)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ORM Adapter:</span>
              <span className="text-slate-400">SQLAlchemy / Drizzle</span>
            </div>
          </div>
        </div>

        {/* AI & GenAI Engine */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Explainable AI Engine</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">SDK:</span>
              <span className="text-white">@google/genai (Server-Side)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span className="text-indigo-400">gemini-3.8-flash</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Schema Enforcement:</span>
              <span className="text-emerald-400">Strict JSON (Type.OBJECT)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Advisory Guard:</span>
              <span className="text-white">Non-Altering Scoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* RBAC Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 shadow-xl">
        <div className="border-b border-slate-800 pb-2">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Role-Based Access Control (RBAC) Entitlements Matrix
          </h2>
          <p className="text-[11px] text-slate-400">
            Permission boundaries enforced at backend API routes and client interface.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Permission / Capability</th>
                <th className="py-2.5 px-3 text-center">Fraud Analyst</th>
                <th className="py-2.5 px-3 text-center">Senior Investigator</th>
                <th className="py-2.5 px-3 text-center">Administrator</th>
                <th className="py-2.5 px-3 text-center">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-[11px]">
              <tr>
                <td className="py-2 px-3 font-medium text-slate-200">View Telemetry &amp; Alerts</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-200">Log Case Notes &amp; Triage</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-200">Confirm Fraud &amp; Enforce Sanctions</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-200">Tune Detection Rule Thresholds</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-200">Execute Model Test &amp; CI/CD Evaluation</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-200">Inspect Append-Only Audit Logs</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-slate-600">&times;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">&check;</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset & Disaster Recovery */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Demo Dataset Management &amp; Synthetic Re-seed
            </h2>
            <p className="text-[11px] text-slate-400">
              Restore the pristine benchmark synthetic dataset (120 synthetic customers, 1,200 transactions, attack vectors).
            </p>
          </div>

          <button
            onClick={() => setResetConfirmOpen(true)}
            disabled={!isAdmin || isResetting}
            className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-40"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo State</span>
          </button>
        </div>

        {!isAdmin && (
          <p className="text-[11px] text-amber-400">
            Note: Switch to the Administrator persona in the top navigation bar to reset the database.
          </p>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Confirm Synthetic Dataset Re-seed
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will re-initialize the in-memory database with 120 synthetic customers, 1,200 multi-scenario banking
              transactions, and ground-truth evaluation attack fixtures. Any custom ingested transactions will be cleared.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setResetConfirmOpen(false);
                  onResetDemo();
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium cursor-pointer"
              >
                Confirm Re-seed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
