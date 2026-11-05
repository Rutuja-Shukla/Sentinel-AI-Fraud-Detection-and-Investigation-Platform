import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  PlusCircle,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { Transaction } from '../../services/api.ts';

interface TransactionsViewProps {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onFilterChange: (filters: any) => void;
  onSelectTransaction: (txn: Transaction) => void;
  onOpenSimulate: () => void;
  onOpenUpload: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onFilterChange,
  onSelectTransaction,
  onOpenSimulate,
  onOpenUpload,
}) => {
  const [search, setSearch] = useState('');
  const [riskClassification, setRiskClassification] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [channel, setChannel] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const applyFilters = () => {
    onFilterChange({
      search,
      riskClassification,
      transactionType,
      channel,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      sortBy,
      sortOrder,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters();
  };

  const clearFilters = () => {
    setSearch('');
    setRiskClassification('');
    setTransactionType('');
    setChannel('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('timestamp');
    setSortOrder('desc');
    onFilterChange({});
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Transaction Surveillance &amp; Audit Explorer
            <span className="text-[11px] font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              {total.toLocaleString()} records indexed
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full telemetry audit stream with automated deterministic rule evaluation and multi-variate anomaly scoring.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenSimulate}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate / Ingest Txn</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Batch CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search ID, Customer, Merchant, City, Device..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Risk Level Pills */}
          <div className="md:col-span-3 flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
            {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setRiskClassification(lvl);
                  onFilterChange({
                    search,
                    riskClassification: lvl,
                    transactionType,
                    channel,
                    minAmount: minAmount ? parseFloat(minAmount) : undefined,
                    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
                    sortBy,
                    sortOrder,
                  });
                }}
                className={`flex-1 py-1 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                  riskClassification === lvl
                    ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl || 'ALL'}
              </button>
            ))}
          </div>

          {/* Transaction Type */}
          <div className="md:col-span-2">
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Types</option>
              <option value="CARD_PURCHASE">Card Purchase</option>
              <option value="WIRE_TRANSFER">Wire Transfer</option>
              <option value="CRYPTO_PURCHASE">Crypto Purchase</option>
              <option value="P2P_TRANSFER">P2P Transfer</option>
              <option value="ATM_WITHDRAWAL">ATM Withdrawal</option>
              <option value="ONLINE_PAYMENT">Online Payment</option>
            </select>
          </div>

          {/* Channel */}
          <div className="md:col-span-2">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Channels</option>
              <option value="WEB">Web Browser</option>
              <option value="MOBILE_APP">Mobile App</option>
              <option value="ATM">ATM Terminal</option>
              <option value="POS_TERMINAL">POS Terminal</option>
              <option value="API_INTEGRATION">API Integration</option>
            </select>
          </div>

          {/* Filter action buttons */}
          <div className="md:col-span-1 flex items-center space-x-1">
            <button
              onClick={applyFilters}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer text-center"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="p-1.5 text-slate-500 hover:text-slate-300 rounded transition cursor-pointer"
              title="Reset filters"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800 select-none">
              <tr>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    const nextOrder = sortBy === 'timestamp' && sortOrder === 'desc' ? 'asc' : 'desc';
                    setSortBy('timestamp');
                    setSortOrder(nextOrder);
                    onFilterChange({ sortBy: 'timestamp', sortOrder: nextOrder });
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Timestamp</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">Customer ID</th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    const nextOrder = sortBy === 'amount' && sortOrder === 'desc' ? 'asc' : 'desc';
                    setSortBy('amount');
                    setSortOrder(nextOrder);
                    onFilterChange({ sortBy: 'amount', sortOrder: nextOrder });
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Merchant</th>
                <th className="py-2.5 px-3">Type &amp; Channel</th>
                <th className="py-2.5 px-3">Geo Origin</th>
                <th className="py-2.5 px-3">Device</th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    const nextOrder = sortBy === 'riskScore' && sortOrder === 'desc' ? 'asc' : 'desc';
                    setSortBy('riskScore');
                    setSortOrder(nextOrder);
                    onFilterChange({ sortBy: 'riskScore', sortOrder: nextOrder });
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Fraud Score</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Investigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Retrieving transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No transactions match current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const score = txn.riskAssessment?.overallScore ?? 0;
                  const classification = txn.riskAssessment?.riskClassification ?? 'LOW';
                  const matchedRuleCount = txn.riskAssessment?.matchedRules.length ?? 0;

                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                      onClick={() => onSelectTransaction(txn)}
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(txn.timestamp).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{txn.id}</span>
                          {txn.isUploaded && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                              CSV
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer ID */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {txn.customerId}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                        ${txn.amount.toFixed(2)}
                      </td>

                      {/* Merchant */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200 truncate max-w-[150px]">
                          {txn.merchantName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {txn.merchantCategory.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Type & Channel */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-slate-300 text-[11px]">
                          {txn.transactionType.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {txn.channel.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Geo Origin */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-slate-200">{txn.sourceLocation.city}</div>
                        <div className="text-[10px] text-slate-500">{txn.sourceLocation.country}</div>
                      </td>

                      {/* Device */}
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                        {txn.deviceId}
                      </td>

                      {/* Risk Score */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                              score >= 80
                                ? 'bg-red-950 text-red-300 border border-red-700'
                                : score >= 60
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : score >= 30
                                ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-800'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {score}/100 {classification}
                          </span>
                          {matchedRuleCount > 0 && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({matchedRuleCount} rules)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTransaction(txn);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded text-[11px] font-medium transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{(page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-white">{Math.min(total, page * pageSize)}</strong> of{' '}
            <strong className="text-white">{total.toLocaleString()}</strong> transactions
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
