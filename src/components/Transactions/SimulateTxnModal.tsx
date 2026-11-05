import React, { useState } from 'react';
import { PlusCircle, Zap, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.ts';

interface SimulateTxnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTxnId: string) => void;
}

export const SimulateTxnModal: React.FC<SimulateTxnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [customerId, setCustomerId] = useState('CUST-1002');
  const [amount, setAmount] = useState('3500.00');
  const [merchantName, setMerchantName] = useState('Binance Global Portal');
  const [merchantCategory, setMerchantCategory] = useState('CRYPTO_EXCHANGE');
  const [transactionType, setTransactionType] = useState('CRYPTO_PURCHASE');
  const [channel, setChannel] = useState('WEB');
  const [city, setCity] = useState('Singapore');
  const [country, setCountry] = useState('Singapore');
  const [deviceId, setDeviceId] = useState('DEV-UNRECOGNIZED-99');
  const [status, setStatus] = useState<'APPROVED' | 'DECLINED' | 'FLAGGED' | 'BLOCKED'>('APPROVED');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Presets
  const applyPreset = (type: 'GEO_LEAP' | 'CARD_TESTING' | 'MULE_DRAIN' | 'NORMAL') => {
    if (type === 'GEO_LEAP') {
      setCustomerId('CUST-1005');
      setAmount('4950.00');
      setMerchantName('Singapore Airlines Luxury');
      setMerchantCategory('AIRLINE');
      setTransactionType('CARD_PURCHASE');
      setChannel('WEB');
      setCity('Singapore');
      setCountry('Singapore');
      setDeviceId('DEV-PROXY-SINGAPORE-9');
      setStatus('APPROVED');
    } else if (type === 'CARD_TESTING') {
      setCustomerId('CUST-1018');
      setAmount('3200.00');
      setMerchantName('Apple Store Fifth Ave');
      setMerchantCategory('ELECTRONICS');
      setTransactionType('ONLINE_PAYMENT');
      setChannel('WEB');
      setCity('New York');
      setCountry('United States');
      setDeviceId('DEV-BOTNET-A89');
      setStatus('APPROVED');
    } else if (type === 'MULE_DRAIN') {
      setCustomerId('CUST-1042');
      setAmount('8900.00');
      setMerchantName('Apex Global Swift Wire');
      setMerchantCategory('FOREIGN_WIRE');
      setTransactionType('WIRE_TRANSFER');
      setChannel('WEB');
      setCity('Dubai');
      setCountry('United Arab Emirates');
      setDeviceId('DEV-MULE-DRAIN-42');
      setStatus('APPROVED');
    } else {
      setCustomerId('CUST-1001');
      setAmount('64.50');
      setMerchantName('Whole Foods Market');
      setMerchantCategory('GROCERY');
      setTransactionType('CARD_PURCHASE');
      setChannel('POS_TERMINAL');
      setCity('New York');
      setCountry('United States');
      setDeviceId('DEV-10000-0');
      setStatus('APPROVED');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.createTransaction({
        customerId,
        amount: parseFloat(amount),
        currency: 'USD',
        timestamp: new Date().toISOString(),
        merchantName,
        merchantCategory,
        transactionType,
        channel,
        sourceLocation: {
          city,
          country,
          latitude: city === 'Singapore' ? 1.3521 : city === 'Dubai' ? 25.2048 : 40.7128,
          longitude: city === 'Singapore' ? 103.8198 : city === 'Dubai' ? 55.2708 : -74.006,
        },
        deviceId,
        deviceType: channel === 'MOBILE_APP' ? 'IOS' : 'MACOS',
        status,
      });

      onSuccess(res.transaction.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Simulate &amp; Ingest Financial Transaction
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Attack Scenario Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Select Test Scenario Preset:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => applyPreset('GEO_LEAP')}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-red-700 hover:text-red-300 text-slate-300 transition text-left cursor-pointer truncate"
            >
              Impossible Speed
            </button>
            <button
              type="button"
              onClick={() => applyPreset('CARD_TESTING')}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-700 hover:text-amber-300 text-slate-300 transition text-left cursor-pointer truncate"
            >
              Card Testing Exploit
            </button>
            <button
              type="button"
              onClick={() => applyPreset('MULE_DRAIN')}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-purple-700 hover:text-purple-300 text-slate-300 transition text-left cursor-pointer truncate"
            >
              Mule Rapid Drain
            </button>
            <button
              type="button"
              onClick={() => applyPreset('NORMAL')}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-emerald-700 hover:text-emerald-300 text-slate-300 transition text-left cursor-pointer truncate"
            >
              Normal Grocery
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Customer ID</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Merchant Name</label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Category</label>
              <select
                value={merchantCategory}
                onChange={(e) => setMerchantCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
              >
                <option value="GROCERY">GROCERY</option>
                <option value="ELECTRONICS">ELECTRONICS</option>
                <option value="AIRLINE">AIRLINE</option>
                <option value="CRYPTO_EXCHANGE">CRYPTO_EXCHANGE</option>
                <option value="FOREIGN_WIRE">FOREIGN_WIRE</option>
                <option value="ONLINE_RETAIL">ONLINE_RETAIL</option>
                <option value="LUXURY_JEWELRY">LUXURY_JEWELRY</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
              >
                <option value="CARD_PURCHASE">Card Purchase</option>
                <option value="WIRE_TRANSFER">Wire Transfer</option>
                <option value="CRYPTO_PURCHASE">Crypto Purchase</option>
                <option value="ONLINE_PAYMENT">Online Payment</option>
                <option value="ATM_WITHDRAWAL">ATM Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
              >
                <option value="WEB">Web Browser</option>
                <option value="MOBILE_APP">Mobile App</option>
                <option value="POS_TERMINAL">POS Terminal</option>
                <option value="ATM">ATM Terminal</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Origin City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Device ID Fingerprint</label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
              >
                <option value="APPROVED">APPROVED</option>
                <option value="DECLINED">DECLINED</option>
                <option value="FLAGGED">FLAGGED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Analyzing...' : 'Ingest & Run Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
