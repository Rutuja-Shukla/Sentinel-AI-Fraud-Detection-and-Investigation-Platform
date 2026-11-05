import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { FraudRuleConfig, api } from '../../services/api.ts';

interface RulesViewProps {
  currentUserRole: string;
  onRulesUpdated: () => void;
}

export const RulesView: React.FC<RulesViewProps> = ({
  currentUserRole,
  onRulesUpdated,
}) => {
  const [rules, setRules] = useState<FraudRuleConfig[]>([]);
  const [scoringWeights, setScoringWeights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'ADMINISTRATOR';

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = () => {
    setLoading(true);
    api
      .getRules()
      .then((res) => {
        setRules(res.rules);
        setScoringWeights(res.scoringWeights);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleToggleRule = async (rule: FraudRuleConfig) => {
    if (!isAdmin) {
      alert('Permission Denied: Only Administrators can toggle detection rules.');
      return;
    }
    try {
      await api.updateRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !rule.enabled } : r))
      );
      onRulesUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveThresholds = async (rule: FraudRuleConfig) => {
    if (!isAdmin) {
      alert('Permission Denied: Only Administrators can tune rule thresholds.');
      return;
    }
    setSavingRuleId(rule.id);
    try {
      await api.updateRule(rule.id, {
        thresholds: rule.thresholds,
        defaultWeight: rule.defaultWeight,
        severity: rule.severity,
      });
      setSaveSuccess(rule.id);
      setTimeout(() => setSaveSuccess(null), 3000);
      onRulesUpdated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRuleId(null);
    }
  };

  const handleThresholdChange = (
    ruleId: string,
    key: string,
    val: number | string
  ) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          return {
            ...r,
            thresholds: {
              ...r.thresholds,
              [key]: val,
            },
          };
        }
        return r;
      })
    );
  };

  const handleWeightChange = (ruleId: string, val: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, defaultWeight: val } : r))
    );
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Detection Rules Engine &amp; Heuristics Configuration
            <span className="text-[11px] font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              10 active rules
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Independently testable deterministic financial crime heuristics with dynamic threshold tuning.
          </p>
        </div>

        {!isAdmin && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only: Switch to Administrator Persona to modify thresholds</span>
          </div>
        )}
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-mono text-xs">
          Loading detection ruleset...
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const isSaving = savingRuleId === rule.id;
            const isSuccess = saveSuccess === rule.id;

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-lg bg-slate-900 border transition shadow-lg space-y-3 ${
                  rule.enabled ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
                }`}
              >
                {/* Rule Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {rule.id}
                      </span>
                      <h3 className="font-bold text-sm text-white">{rule.name}</h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          rule.severity === 'CRITICAL'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : rule.severity === 'HIGH'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {rule.description}
                    </p>
                  </div>

                  {/* Toggle & Actions */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule)}
                        disabled={!isAdmin}
                        className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-300 font-bold">
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </label>

                    {isAdmin && (
                      <button
                        onClick={() => handleSaveThresholds(rule)}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                          isSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Recalculating...' : 'Apply & Recalculate'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tunable Thresholds & Score Contribution */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  {/* Contribution Points Slider */}
                  <div className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Score Contribution:</span>
                      <span className="text-amber-400 font-bold">+{rule.defaultWeight} pts</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={5}
                      value={rule.defaultWeight}
                      onChange={(e) => handleWeightChange(rule.id, parseInt(e.target.value))}
                      disabled={!isAdmin}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Threshold Parameter Inputs */}
                  {Object.entries(rule.thresholds).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1"
                    >
                      <label className="block text-[10px] font-mono text-slate-400 uppercase">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleThresholdChange(rule.id, key, parseFloat(e.target.value))}
                        disabled={!isAdmin}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
