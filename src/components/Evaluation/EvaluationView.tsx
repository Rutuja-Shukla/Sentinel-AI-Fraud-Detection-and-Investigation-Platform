import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Info,
  Activity,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { EvaluationReport, TestResult, api } from '../../services/api.ts';

export const EvaluationView: React.FC = () => {
  const [threshold, setThreshold] = useState(60);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [testResults, setTestResults] = useState<{
    summary: { total: number; passed: number; failed: number };
    tests: TestResult[];
  } | null>(null);

  useEffect(() => {
    runSuite(threshold);
  }, []);

  const runSuite = async (th: number) => {
    setLoading(true);
    try {
      const res = await api.runEvaluation(th);
      setTestResults(res.testResults);
      setReport(res.modelReport);
    } catch (err: any) {
      console.error('Failed to run evaluation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (newTh: number) => {
    setThreshold(newTh);
    runSuite(newTh);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Automated Testing &amp; Model Evaluation Suite
            <span className="text-[11px] font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              CI/CD &amp; Heuristic Validation
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical evaluation against labelled ground-truth test fixtures and deterministic invariants.
          </p>
        </div>

        <button
          onClick={() => runSuite(threshold)}
          disabled={loading}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Evaluating...' : 'Re-run Evaluation Suite'}</span>
        </button>
      </div>

      {/* Section 1: Automated Unit & Invariant Tests */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Automated Regression &amp; Invariant Test Suite
            </h2>
            <p className="text-[11px] text-slate-400">
              Deterministic validation of transaction validation, duplicate idempotency, geo leap rules, and RBAC permissions.
            </p>
          </div>
          {testResults && (
            <div className="text-xs font-mono">
              <span className="text-emerald-400 font-bold">{testResults.summary.passed} Passed</span>
              <span className="text-slate-500 mx-2">/</span>
              <span className="text-slate-400">{testResults.summary.total} Total</span>
            </div>
          )}
        </div>

        {testResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {testResults.tests.map((test, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start space-x-3 text-xs"
              >
                <div className="mt-0.5 shrink-0">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{test.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{test.durationMs}ms</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{test.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">Running tests...</div>
        )}
      </div>

      {/* Section 2: Machine Learning Evaluation against Ground-Truth Dataset */}
      {report && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Detection Engine Performance &amp; Confusion Matrix
              </h2>
              <p className="text-[11px] text-slate-400">
                Labelled synthetic ground-truth dataset ({report.datasetSize.toLocaleString()} total transactions evaluated)
              </p>
            </div>

            {/* Interactive Threshold Slider */}
            <div className="flex items-center space-x-3 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs">
              <span className="font-mono text-slate-400">Alert Cutoff Threshold:</span>
              <input
                type="range"
                min={20}
                max={90}
                step={5}
                value={threshold}
                onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
                className="w-28 accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-emerald-400 text-sm w-12">
                &ge; {threshold} pts
              </span>
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* Precision */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Precision</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {(report.metrics.precision * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">TP / (TP + FP)</div>
            </div>

            {/* Recall */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Recall (Sensitivity)</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {(report.metrics.recall * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">TP / (TP + FN)</div>
            </div>

            {/* F1 Score */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">F1 Score</div>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                {(report.metrics.f1Score * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Harmonic Mean</div>
            </div>

            {/* False Positive Rate */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">False Positive Rate</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {(report.metrics.falsePositiveRate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">FP / (FP + TN)</div>
            </div>

            {/* Accuracy */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Overall Accuracy</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {(report.metrics.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">(TP + TN) / Total</div>
            </div>

            {/* Specificity */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Specificity</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {(report.metrics.specificity * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">TN / (TN + FP)</div>
            </div>
          </div>

          {/* Confusion Matrix Visual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="font-bold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
                2x2 Contingency Confusion Matrix (Cutoff &ge; {threshold} pts)
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* True Positives */}
                <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-center space-y-1">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                    True Positives (TP)
                  </span>
                  <span className="text-2xl font-bold font-mono text-white">
                    {report.confusionMatrix.truePositives}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Actual Fraud Caught</span>
                </div>

                {/* False Positives */}
                <div className="p-3 rounded bg-amber-950/40 border border-amber-800 text-center space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                    False Positives (FP)
                  </span>
                  <span className="text-2xl font-bold font-mono text-white">
                    {report.confusionMatrix.falsePositives}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Legitimate Flagged</span>
                </div>

                {/* False Negatives */}
                <div className="p-3 rounded bg-red-950/40 border border-red-800 text-center space-y-1">
                  <span className="text-[10px] font-mono uppercase text-red-400 font-bold block">
                    False Negatives (FN)
                  </span>
                  <span className="text-2xl font-bold font-mono text-white">
                    {report.confusionMatrix.falseNegatives}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Fraud Missed</span>
                </div>

                {/* True Negatives */}
                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    True Negatives (TN)
                  </span>
                  <span className="text-2xl font-bold font-mono text-white">
                    {report.confusionMatrix.trueNegatives}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Legitimate Cleared</span>
                </div>
              </div>
            </div>

            {/* ROC / Threshold Sensitivity Curve */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="font-bold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
                Trade-off Trajectory Across Alert Cutoff Thresholds
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.rocCurvePoints} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="threshold" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Threshold', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        fontSize: '11px',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="recall" stroke="#38bdf8" name="Recall (Catch Rate)" strokeWidth={2} />
                    <Line type="monotone" dataKey="falsePositiveRate" stroke="#f59e0b" name="False Positive Rate" strokeWidth={2} />
                    <Line type="monotone" dataKey="f1" stroke="#a855f7" name="F1 Score" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Caveat & Methodology Notice */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-300">Methodology &amp; Engineering Caveat:</span>
              <p className="leading-relaxed">
                {report.limitations} The confusion matrix above reflects empirical execution against 1,200 synthetic banking
                transactions with known adversarial patterns (geographic impossible velocity, card testing decline bursts, rapid mule drains, and device syndicates).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
