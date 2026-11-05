import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  User,
  ShieldAlert,
  Calendar,
  CreditCard,
  MapPin,
  Smartphone,
  Store,
  FolderKanban,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { CustomerProfile, Transaction, InvestigationCase, api } from '../../services/api.ts';

interface CustomersViewProps {
  onSelectTransaction: (txn: Transaction) => void;
  initialCustomerId?: string | null;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onSelectTransaction,
  initialCustomerId,
}) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Selected customer profile state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [profileData, setProfileData] = useState<{
    customer: CustomerProfile;
    transactions: Transaction[];
    cases: InvestigationCase[];
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getCustomers(search)
      .then((res) => setCustomers(res.customers))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setProfileData(null);
      return;
    }
    setProfileLoading(true);
    api
      .getCustomerById(selectedCustomerId)
      .then((res) => setProfileData(res))
      .catch((err) => console.error(err))
      .finally(() => setProfileLoading(false));
  }, [selectedCustomerId]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Customer Risk Profiling &amp; Behavioral Baseline
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synthetic account telemetry, behavioral baseline distributions, and historical threat timeline.
          </p>
        </div>

        {selectedCustomerId && (
          <button
            onClick={() => setSelectedCustomerId(null)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
          >
            &larr; Back to Customer Directory
          </button>
        )}
      </div>

      {!selectedCustomerId ? (
        // Directory View
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Customer ID, Account Number, Tier..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Customer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customers.map((c) => (
              <div
                key={c.customerId}
                onClick={() => setSelectedCustomerId(c.customerId)}
                className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-3 shadow-lg group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-white group-hover:text-emerald-400 transition">
                      {c.customerId}
                    </span>
                    <div className="text-[10px] font-mono text-slate-500">{c.accountNumber}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      c.tier === 'COMMERCIAL'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : c.tier === 'PREMIUM'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {c.tier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Avg Amount</span>
                    <span className="font-mono font-bold text-white">${c.averageTxnAmount}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Account Age</span>
                    <span className="font-mono text-slate-300">{c.accountAgeDays} days</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{c.historicalTxnCount} txns monitored</span>
                  {c.openCasesCount > 0 ? (
                    <span className="text-amber-400 font-bold">{c.openCasesCount} active cases</span>
                  ) : (
                    <span className="text-emerald-500">Good Standing</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : profileLoading || !profileData ? (
        <div className="py-20 text-center text-slate-400 font-mono text-xs">
          Loading customer telemetry and baseline history...
        </div>
      ) : (
        // Detailed Customer Risk Profile View
        <div className="space-y-6">
          {/* Top Profile Summary Banner */}
          <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-lg font-mono">
                  {profileData.customer.customerId.substring(5)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold font-mono text-white">
                      {profileData.customer.customerId}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {profileData.customer.tier} TIER
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Account: {profileData.customer.accountNumber} | Age: {profileData.customer.accountAgeDays} days
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL MONITORED</span>
                  <span className="text-white font-bold text-sm">${profileData.customer.totalVolumeUSD.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AVG TRANSACTION</span>
                  <span className="text-white font-bold text-sm">${profileData.customer.averageTxnAmount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">OPEN CASES</span>
                  <span className="text-amber-400 font-bold text-sm">{profileData.customer.openCasesCount}</span>
                </div>
              </div>
            </div>

            {/* Behavioral Baselines Detail */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
              {/* Known Devices */}
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold text-[11px]">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Authorized Devices ({profileData.customer.knownDevices.length})</span>
                </div>
                <div className="space-y-0.5 text-slate-300 font-mono text-[10px]">
                  {profileData.customer.knownDevices.map((d) => (
                    <div key={d} className="truncate">{d}</div>
                  ))}
                </div>
              </div>

              {/* Frequent Locations */}
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Frequent Locations</span>
                </div>
                <div className="space-y-0.5 text-slate-300 font-mono text-[10px]">
                  {profileData.customer.frequentLocations.map((loc, i) => (
                    <div key={i}>{loc.city}, {loc.country}</div>
                  ))}
                </div>
              </div>

              {/* Top Merchants */}
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                  <Store className="w-3.5 h-3.5" />
                  <span>Routine Merchants</span>
                </div>
                <div className="space-y-0.5 text-slate-300 font-mono text-[10px]">
                  {profileData.customer.topMerchants.map((m) => (
                    <div key={m} className="truncate">{m}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Transactions History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Transaction Activity Timeline ({profileData.transactions.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Transaction ID</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Merchant</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Score</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {profileData.transactions.map((txn) => {
                    const score = txn.riskAssessment?.overallScore || 0;
                    return (
                      <tr key={txn.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                          {new Date(txn.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-200">
                          {txn.id}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-white">
                          ${txn.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-slate-300">{txn.merchantName}</td>
                        <td className="py-2 px-3 text-slate-400">{txn.sourceLocation.city}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              score >= 60 ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'
                            }`}
                          >
                            {score}/100
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => onSelectTransaction(txn)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium transition cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
