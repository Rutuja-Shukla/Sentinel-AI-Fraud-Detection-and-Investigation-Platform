import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Cpu,
  User,
  MapPin,
  Smartphone,
  CreditCard,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  FolderPlus,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  AIInvestigationSummary,
  CustomerProfile,
  InvestigationCase,
  RiskAssessment,
  Transaction,
  api,
} from '../../services/api.ts';

interface TransactionDetailDrawerProps {
  transactionId: string | null;
  onClose: () => void;
  onCreateCase: (txnId: string, customerId: string) => void;
  onNavigateToCustomer: (customerId: string) => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transactionId,
  onClose,
  onCreateCase,
  onNavigateToCustomer,
}) => {
  const [data, setData] = useState<{
    transaction: Transaction;
    riskAssessment: RiskAssessment;
    customer: CustomerProfile;
    recentTransactions: Transaction[];
    relatedCases: InvestigationCase[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<AIInvestigationSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setData(null);
      setAiSummary(null);
      return;
    }

    setLoading(true);
    setError(null);
    setAiSummary(null);

    api
      .getTransactionById(transactionId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load transaction telemetry');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [transactionId]);

  const handleGenerateAI = async () => {
    if (!transactionId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const summary = await api.generateAISummary(transactionId);
      setAiSummary(summary);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI investigation brief');
    } finally {
      setAiLoading(false);
    }
  };

  if (!transactionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-white">
                  {transactionId}
                </span>
                {data?.riskAssessment && (
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      data.riskAssessment.overallScore >= 80
                        ? 'bg-red-950 text-red-300 border border-red-700'
                        : data.riskAssessment.overallScore >= 60
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : data.riskAssessment.overallScore >= 30
                        ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-800'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    RISK {data.riskAssessment.overallScore}/100 — {data.riskAssessment.riskClassification}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Deterministic Forensic Telemetry &amp; Explainable AI Assessment
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {data && (
              <button
                onClick={() => onCreateCase(data.transaction.id, data.transaction.customerId)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create Case</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Running detection pipeline &amp; fetching audit record...</p>
            </div>
          ) : error || !data ? (
            <div className="p-4 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
              {error || 'Unable to load transaction.'}
            </div>
          ) : (
            <>
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Gross Amount</div>
                  <div className="text-lg font-bold font-mono text-white">
                    ${data.transaction.amount.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-400">{data.transaction.currency}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Status: {data.transaction.status}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Customer</div>
                  <div className="text-sm font-bold font-mono text-emerald-400 flex items-center justify-between">
                    <span>{data.transaction.customerId}</span>
                    <button
                      onClick={() => onNavigateToCustomer(data.transaction.customerId)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title="Inspect Customer Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">{data.customer.accountNumber}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Merchant</div>
                  <div className="text-xs font-bold text-white truncate">{data.transaction.merchantName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{data.transaction.merchantCategory.replace('_', ' ')}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Channel &amp; Type</div>
                  <div className="text-xs font-bold text-white">{data.transaction.transactionType.replace('_', ' ')}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{data.transaction.channel.replace('_', ' ')}</div>
                </div>
              </div>

              {/* Forensic Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Location & Network */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Origin Geolocation &amp; Routing</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">City / Country:</span>
                      <span className="text-white">{data.transaction.sourceLocation.city}, {data.transaction.sourceLocation.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinates:</span>
                      <span className="text-slate-300">
                        {data.transaction.sourceLocation.latitude.toFixed(4)}, {data.transaction.sourceLocation.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP Origin Address:</span>
                      <span className="text-slate-300">{data.transaction.sourceLocation.ipAddress || '198.51.100.44'}</span>
                    </div>
                  </div>
                </div>

                {/* Device Fingerprint */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Client Device Telemetry</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware ID:</span>
                      <span className="text-white truncate max-w-[180px]">{data.transaction.deviceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client Platform:</span>
                      <span className="text-slate-300">{data.transaction.deviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Customer Device Known:</span>
                      <span className={data.riskAssessment.anomalyDetails.isNewDevice ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {data.riskAssessment.anomalyDetails.isNewDevice ? 'NO (Unrecognized Fingerprint)' : 'YES (Known Customer Device)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deterministic Rules & Score Composition */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Deterministic Fraud Rules Evaluation
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Rule Score Contribution: <strong className="text-white">{data.riskAssessment.ruleScore} pts</strong> (Ruleset {data.riskAssessment.rulesetVersion})
                  </span>
                </div>

                {data.riskAssessment.matchedRules.length === 0 ? (
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No deterministic rule violations triggered. Transaction passed all baseline financial heuristics.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.riskAssessment.matchedRules.map((rule) => (
                      <div
                        key={rule.ruleId}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          rule.severity === 'CRITICAL'
                            ? 'bg-red-950/40 border-red-800'
                            : rule.severity === 'HIGH'
                            ? 'bg-amber-950/40 border-amber-800'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white flex items-center space-x-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                rule.severity === 'CRITICAL'
                                  ? 'bg-red-900 text-red-200'
                                  : 'bg-amber-900 text-amber-200'
                              }`}
                            >
                              {rule.severity}
                            </span>
                            <span>[{rule.ruleId}] {rule.ruleName}</span>
                          </span>
                          <span className="font-mono font-bold text-amber-400 text-xs">
                            +{rule.scoreContribution} pts
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {rule.description}
                        </p>
                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 font-mono text-[10px] text-slate-400">
                          <span className="text-slate-500 uppercase font-sans">Evidence Payload: </span>
                          {JSON.stringify(rule.evidence)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statistical Anomaly Detection Breakdown */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Statistical Anomaly Model Breakdown
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">
                    Anomaly Score: <strong className="text-white">{data.riskAssessment.anomalyDetails.anomalyScore}/100</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Amount Z-Score</div>
                    <div className="text-sm font-bold font-mono text-white mt-1">
                      +{data.riskAssessment.anomalyDetails.amountZScore}&sigma;
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {data.riskAssessment.anomalyDetails.amountDeviationRatio}x customer avg (${data.riskAssessment.anomalyDetails.historicalAvgAmount})
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Cadence Interval</div>
                    <div className="text-sm font-bold font-mono text-white mt-1">
                      {data.riskAssessment.anomalyDetails.timeSinceLastTxnMinutes} min
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Elapsed since prior activity</div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Travel Velocity</div>
                    <div className={`text-sm font-bold font-mono mt-1 ${data.riskAssessment.anomalyDetails.travelVelocityKmH > 800 ? 'text-red-400' : 'text-white'}`}>
                      {data.riskAssessment.anomalyDetails.travelVelocityKmH} km/h
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {data.riskAssessment.anomalyDetails.geoDistanceKm} km spatial delta
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Unseen Merchant</div>
                    <div className="text-sm font-bold font-mono text-white mt-1">
                      {data.riskAssessment.anomalyDetails.isNewMerchant ? 'YES' : 'NO'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">First-time transaction</div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Isolation Tree Factor</div>
                    <div className="text-sm font-bold font-mono text-white mt-1">
                      {data.riskAssessment.anomalyDetails.isolationTreeAnomalyFactor}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Partitioning depth proxy</div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Investigation Trigger</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                      {data.riskAssessment.requiresReview ? 'RECOMMENDED' : 'ROUTINE'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Threshold cutoff: &ge; 60 pts</div>
                  </div>
                </div>
              </div>

              {/* Explainable AI Investigation Assistant (Server-Side Gemini 3.8 Flash) */}
              <div className="p-4 rounded-lg bg-slate-950 border border-indigo-900/50 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-950 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Explainable AI Investigation Assistant (Gemini 3.8 Flash)
                      </h3>
                    </div>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      Server-side structured reasoning generating evidence synthesis and benign counter-hypotheses.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                    <span>{aiSummary ? 'Regenerate Brief' : 'Generate AI Brief'}</span>
                  </button>
                </div>

                {/* AI Advisory Banner */}
                <div className="flex items-start space-x-2 p-2.5 rounded bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-300">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Investigator Notice:</strong> AI suggestions are purely advisory. Sentinel’s deterministic
                    scoring and human investigator approval govern all formal account freezes and case outcomes.
                  </span>
                </div>

                {aiLoading ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-indigo-300 font-mono">
                      Querying server-side Gemini 3.8 Flash with structured schema...
                    </p>
                  </div>
                ) : aiError ? (
                  <div className="p-3 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                    {aiError}
                  </div>
                ) : aiSummary ? (
                  <div className="space-y-4 text-xs">
                    {/* Executive Summary */}
                    <div className="space-y-1">
                      <div className="font-semibold text-indigo-300 text-[11px] uppercase tracking-wider">
                        Executive Summary
                      </div>
                      <p className="text-slate-200 leading-relaxed bg-slate-900/90 p-3 rounded border border-slate-800">
                        {aiSummary.executiveSummary}
                      </p>
                    </div>

                    {/* Behavioral Pattern Analysis */}
                    <div className="space-y-1">
                      <div className="font-semibold text-indigo-300 text-[11px] uppercase tracking-wider">
                        Behavioral Pattern Analysis
                      </div>
                      <p className="text-slate-300 leading-relaxed bg-slate-900/90 p-3 rounded border border-slate-800">
                        {aiSummary.patternAnalysis}
                      </p>
                    </div>

                    {/* Supporting Evidence vs Benign Explanations (2 columns) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Evidence */}
                      <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <div className="font-semibold text-red-400 text-[11px] uppercase flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Key Threat Evidence
                        </div>
                        <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                          {aiSummary.supportingEvidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Benign Explanations */}
                      <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <div className="font-semibold text-emerald-400 text-[11px] uppercase flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Plausible Benign Explanations
                        </div>
                        <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                          {aiSummary.benignExplanations.map((be, i) => (
                            <li key={i}>{be}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommended Investigation Checklist */}
                    <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="font-semibold text-cyan-300 text-[11px] uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Recommended Next Steps for Investigator
                      </div>
                      <div className="space-y-1 text-slate-300 text-[11px]">
                        {aiSummary.recommendedSteps.map((step, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <span className="font-mono text-cyan-400 font-bold">{i + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Model Metadata Footer */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Model: {aiSummary.model}</span>
                      <span>Confidence: {aiSummary.confidenceLevel}</span>
                      <span>{new Date(aiSummary.generatedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded bg-slate-900/60 border border-dashed border-slate-800 space-y-2">
                    <Sparkles className="w-6 h-6 text-indigo-400 mx-auto" />
                    <p className="text-xs text-slate-300">
                      Click &quot;Generate AI Brief&quot; to synthesize evidence and receive an automated investigative breakdown.
                    </p>
                  </div>
                )}
              </div>

              {/* Related Cases Section */}
              {data.relatedCases.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-white uppercase text-[11px] tracking-wider">
                    Associated Investigation Cases ({data.relatedCases.length})
                  </div>
                  <div className="space-y-1.5">
                    {data.relatedCases.map((c) => (
                      <div key={c.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-200">{c.id}</span>
                          <span className="text-slate-400 ml-2">({c.fraudCategory})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
