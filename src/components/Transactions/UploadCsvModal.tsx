import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, X, Download } from 'lucide-react';
import { api } from '../../services/api.ts';

interface UploadCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_CSV = `customerId,amount,merchantName,merchantCategory,transactionType,channel,city,country,deviceId
CUST-1008,125.00,Target Online,ONLINE_RETAIL,ONLINE_PAYMENT,WEB,New York,United States,DEV-SAMPLE-1
CUST-1015,3400.00,Coinbase Pro Prime,CRYPTO_EXCHANGE,CRYPTO_PURCHASE,WEB,Tokyo,Japan,DEV-SAMPLE-2
CUST-1022,45.80,Trader Joe's,GROCERY,CARD_PURCHASE,POS_TERMINAL,London,United Kingdom,DEV-SAMPLE-3
CUST-1030,2800.00,Delta Air Lines,AIRLINE,CARD_PURCHASE,WEB,Frankfurt,Germany,DEV-SAMPLE-4`;

export const UploadCsvModal: React.FC<UploadCsvModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    totalIngested: number;
    duplicatesSkipped: number;
    errors: { row: number; error: string }[];
  } | null>(null);

  if (!isOpen) return null;

  const handleParseAndUpload = async () => {
    if (!csvContent.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain a header and at least one data row.');

      const headers = lines[0].split(',').map((h) => h.trim());
      const txns = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(',').map((v) => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx];
        });

        txns.push({
          customerId: row.customerId || 'CUST-UPLOADED',
          amount: parseFloat(row.amount) || 100,
          currency: 'USD',
          timestamp: new Date().toISOString(),
          merchantName: row.merchantName || 'Uploaded Merchant',
          merchantCategory: row.merchantCategory || 'ONLINE_RETAIL',
          transactionType: row.transactionType || 'CARD_PURCHASE',
          channel: row.channel || 'WEB',
          sourceLocation: {
            city: row.city || 'New York',
            country: row.country || 'United States',
            latitude: 40.7128,
            longitude: -74.006,
          },
          deviceId: row.deviceId || 'DEV-UPLOADED-1',
          deviceType: 'MACOS',
          status: 'APPROVED',
        });
      }

      const res = await api.uploadTransactionsBatch(txns);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      alert(`CSV Upload Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent((event.target?.result as string) || '');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Batch CSV Transaction Ingestion
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer transition">
            <span>Select .CSV File</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setCsvContent(SAMPLE_CSV)}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Load Sample CSV Template</span>
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
            CSV Content (Header: customerId, amount, merchantName, merchantCategory, transactionType, channel, city, country, deviceId)
          </label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Paste raw CSV lines here..."
            className="w-full h-36 p-2.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Upload Summary Output */}
        {result && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Batch Ingestion Completed</span>
            </div>
            <div className="text-slate-300">
              Successfully Ingested: <strong className="text-white">{result.totalIngested}</strong> records
            </div>
            {result.duplicatesSkipped > 0 && (
              <div className="text-amber-400">
                Idempotency Filter: <strong className="text-white">{result.duplicatesSkipped}</strong> duplicates safely skipped
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="text-red-400">
                Validation Errors: {result.errors.length} rows rejected
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleParseAndUpload}
            disabled={loading || !csvContent.trim()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium cursor-pointer flex items-center space-x-1.5 disabled:opacity-40"
          >
            <span>{loading ? 'Processing...' : 'Upload & Process Batch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
