import React, { useState } from 'react';
import {
  FolderKanban,
  AlertTriangle,
  User,
  Clock,
  PlusCircle,
  CheckCircle2,
  ShieldAlert,
  Send,
  ExternalLink,
  X,
  FileCheck,
} from 'lucide-react';
import { InvestigationCase, api } from '../../services/api.ts';

interface CasesViewProps {
  cases: InvestigationCase[];
  loading: boolean;
  onRefreshCases: () => void;
  onSelectTransactionId: (txnId: string) => void;
  currentUserRole: string;
}

const CASE_STATUSES = [
  { id: '', label: 'All Cases' },
  { id: 'NEW', label: 'New' },
  { id: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
  { id: 'ESCALATED', label: 'Escalated' },
  { id: 'AWAITING_INFO', label: 'Awaiting Info' },
  { id: 'CONFIRMED_FRAUD', label: 'Confirmed Fraud' },
  { id: 'RESOLVED_LEGITIMATE', label: 'Resolved Legitimate' },
  { id: 'CLOSED', label: 'Closed' },
];

export const CasesView: React.FC<CasesViewProps> = ({
  cases,
  loading,
  onRefreshCases,
  onSelectTransactionId,
  currentUserRole,
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Resolution modal state
  const [resolvingModalOpen, setResolvingModalOpen] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'CONFIRMED_FRAUD' | 'RESOLVED_LEGITIMATE' | 'CLOSED'>('CONFIRMED_FRAUD');
  const [actionTaken, setActionTaken] = useState<'ACCOUNT_RESTRICTED' | 'FUNDS_HELD' | 'MERCHANT_DISPUTE' | 'FALSE_POSITIVE_WHITELIST' | 'NO_ACTION'>('ACCOUNT_RESTRICTED');
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  const filteredCases = statusFilter
    ? cases.filter((c) => c.status === statusFilter)
    : cases;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newNote.trim()) return;
    setNoteSubmitting(true);
    try {
      const { note } = await api.addCaseNote(selectedCase.id, newNote);
      setSelectedCase({
        ...selectedCase,
        notes: [...selectedCase.notes, note],
      });
      setNewNote('');
      onRefreshCases();
    } catch (err: any) {
      alert(`Error adding note: ${err.message}`);
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!selectedCase) return;
    try {
      const res = await api.updateCaseStatus(selectedCase.id, newStatus, 'Investigator triage update');
      setSelectedCase(res.case);
      onRefreshCases();
    } catch (err: any) {
      alert(err.message || 'Failed to update case status');
    }
  };

  const handleAssign = async (investigator: string) => {
    if (!selectedCase) return;
    try {
      const res = await api.assignInvestigator(selectedCase.id, investigator);
      setSelectedCase(res.case);
      onRefreshCases();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !resolutionReason.trim()) return;
    setResolveSubmitting(true);
    try {
      const res = await api.resolveCase(selectedCase.id, {
        finalStatus,
        actionTaken,
        resolutionReason,
      });
      setSelectedCase(res.case);
      setResolvingModalOpen(false);
      onRefreshCases();
    } catch (err: any) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setResolveSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Investigation Case Management
            <span className="text-[11px] font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              {cases.length} cases
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-compliant case triage, evidence chain-of-custody, and multi-party investigative notes.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
        {CASE_STATUSES.map((tab) => {
          const count = tab.id ? cases.filter((c) => c.status === tab.id).length : cases.length;
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-950/60 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cases Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedCase(c)}
            className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-3 shadow-lg group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-white group-hover:text-emerald-400 transition">
                {c.id}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  c.status === 'CONFIRMED_FRAUD'
                    ? 'bg-red-950 text-red-300 border border-red-700'
                    : c.status === 'RESOLVED_LEGITIMATE'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : c.status === 'ESCALATED'
                    ? 'bg-purple-950 text-purple-300 border border-purple-700'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {c.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Customer:</span>
                <span className="font-mono text-slate-200">{c.customerId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Category:</span>
                <span className="text-slate-300 font-mono text-[11px] truncate max-w-[150px]">
                  {c.fraudCategory}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Investigator:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{c.assignedInvestigator}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>{c.transactionIds.length} tx evidence</span>
              <span>Score: {c.riskScore}/100</span>
            </div>
          </div>
        ))}
      </div>

      {/* Case Detail Slide-over / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl overflow-hidden animate-in slide-in-from-right">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-base text-white">{selectedCase.id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedCase.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Opened: {new Date(selectedCase.createdAt).toLocaleString()} | Customer: {selectedCase.customerId}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {currentUserRole !== 'AUDITOR' && (
                  <button
                    onClick={() => setResolvingModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer"
                  >
                    Resolve Case
                  </button>
                )}
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Assignment Quick Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Update Status</label>
                  <select
                    value={selectedCase.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={currentUserRole === 'AUDITOR'}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                  >
                    <option value="NEW">NEW</option>
                    <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                    <option value="ESCALATED">ESCALATED</option>
                    <option value="AWAITING_INFO">AWAITING INFO</option>
                    <option value="CONFIRMED_FRAUD">CONFIRMED FRAUD</option>
                    <option value="RESOLVED_LEGITIMATE">RESOLVED LEGITIMATE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Assigned Investigator</label>
                  <select
                    value={selectedCase.assignedInvestigator}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={currentUserRole === 'AUDITOR'}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                  >
                    <option value="Sarah Chen (Fraud Analyst)">Sarah Chen (Fraud Analyst)</option>
                    <option value="Marcus Vance (Senior Investigator)">Marcus Vance (Senior Investigator)</option>
                    <option value="Elena Rostova (Administrator)">Elena Rostova (Administrator)</option>
                  </select>
                </div>
              </div>

              {/* Attached Evidence Transactions */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Attached Transaction Evidence ({selectedCase.transactionIds.length})</span>
                </div>
                <div className="space-y-1.5">
                  {selectedCase.transactionIds.map((txId) => (
                    <div
                      key={txId}
                      className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-medium text-emerald-400">{txId}</span>
                      <button
                        onClick={() => {
                          setSelectedCase(null);
                          onSelectTransactionId(txId);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Telemetry</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Case Resolution Banner if resolved */}
              {selectedCase.resolution && (
                <div className="p-4 rounded-lg bg-slate-950 border border-purple-800/60 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-purple-400 font-bold uppercase text-[11px]">
                    <FileCheck className="w-4 h-4" />
                    <span>Formal Case Resolution Recorded</span>
                  </div>
                  <div className="text-slate-300">
                    <strong>Action:</strong> {selectedCase.resolution.actionTaken}
                  </div>
                  <div className="text-slate-300">
                    <strong>Reason:</strong> {selectedCase.resolution.resolutionReason}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Resolved by {selectedCase.resolution.resolvedBy} at{' '}
                    {new Date(selectedCase.resolution.resolvedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Notes Thread */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Investigative Notes &amp; Audit Trail ({selectedCase.notes.length})
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {selectedCase.notes.map((note) => (
                    <div key={note.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-200">
                          {note.authorName}{' '}
                          <span className="text-slate-500 font-mono text-[10px]">({note.authorRole})</span>
                        </span>
                        <span className="font-mono text-slate-500 text-[10px]">
                          {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Input */}
                {currentUserRole !== 'AUDITOR' && (
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add timestamped investigative note (e.g. Cardholder contacted via SMS, verified IP CIDR)..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[60px]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={noteSubmitting || !newNote.trim()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>Post Note</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Resolution Dialog Modal */}
      {resolvingModalOpen && selectedCase && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Formal Case Resolution &amp; Enforcement
              </h3>
              <button
                onClick={() => setResolvingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Final Finding Status</label>
                <select
                  value={finalStatus}
                  onChange={(e: any) => setFinalStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                >
                  <option value="CONFIRMED_FRAUD">CONFIRMED FRAUD (Enforce account action)</option>
                  <option value="RESOLVED_LEGITIMATE">RESOLVED LEGITIMATE (False positive verification)</option>
                  <option value="CLOSED">CLOSED (Administrative closure)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Remedial Action Applied</label>
                <select
                  value={actionTaken}
                  onChange={(e: any) => setActionTaken(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                >
                  <option value="ACCOUNT_RESTRICTED">ACCOUNT RESTRICTED (Revoke credentials, block cards)</option>
                  <option value="FUNDS_HELD">FUNDS HELD (Place 72-hour administrative hold)</option>
                  <option value="MERCHANT_DISPUTE">MERCHANT DISPUTE (Initiate chargeback)</option>
                  <option value="FALSE_POSITIVE_WHITELIST">FALSE POSITIVE WHITELIST (Update customer profile)</option>
                  <option value="NO_ACTION">NO ACTION (Normal monitoring)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Resolution Justification (Required for Audit)</label>
                <textarea
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="State evidence justifying this finding (e.g. Cardholder submitted written affidavit of unauthorized usage)..."
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[80px]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveSubmitting || !resolutionReason.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-40"
                >
                  {resolveSubmitting ? 'Recording...' : 'Commit Finding & Audit Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
