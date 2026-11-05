export interface GeoLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  ipAddress?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MatchedRule {
  ruleId: string;
  ruleName: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreContribution: number;
  description: string;
  evidence: Record<string, any>;
}

export interface AnomalyDetails {
  anomalyScore: number;
  amountZScore: number;
  amountDeviationRatio: number;
  historicalAvgAmount: number;
  timeSinceLastTxnMinutes: number;
  isNewMerchant: boolean;
  isNewDevice: boolean;
  geoDistanceKm: number;
  travelVelocityKmH: number;
  isolationTreeAnomalyFactor: number;
  subFactors: {
    amountRisk: number;
    velocityRisk: number;
    geoRisk: number;
    deviceRisk: number;
    merchantRisk: number;
  };
}

export interface RiskAssessment {
  transactionId: string;
  overallScore: number;
  riskClassification: RiskLevel;
  ruleScore: number;
  anomalyScore: number;
  matchedRules: MatchedRule[];
  anomalyDetails: AnomalyDetails;
  contributingFactors: string[];
  rulesetVersion: string;
  assessedAt: string;
  requiresReview: boolean;
}

export interface Transaction {
  id: string;
  customerId: string;
  accountNumber: string;
  amount: number;
  currency: string;
  timestamp: string;
  merchantName: string;
  merchantCategory: string;
  transactionType: string;
  channel: string;
  sourceLocation: GeoLocation;
  destinationLocation?: GeoLocation;
  deviceId: string;
  deviceType: string;
  status: 'APPROVED' | 'DECLINED' | 'FLAGGED' | 'BLOCKED';
  isUploaded?: boolean;
  isGroundTruthFraud?: boolean;
  groundTruthReason?: string;
  riskAssessment?: RiskAssessment;
}

export interface CustomerProfile {
  customerId: string;
  accountNumber: string;
  accountAgeDays: number;
  tier: 'STANDARD' | 'PREMIUM' | 'COMMERCIAL';
  historicalTxnCount: number;
  averageTxnAmount: number;
  stdDevTxnAmount: number;
  maxTxnAmount: number;
  knownDevices: string[];
  frequentLocations: { city: string; country: string }[];
  topMerchants: string[];
  historicalAlertCount: number;
  openCasesCount: number;
  totalVolumeUSD: number;
  lastActive: string;
}

export interface CaseNote {
  id: string;
  caseId: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  content: string;
}

export interface AIInvestigationSummary {
  executiveSummary: string;
  flaggedReasons: string[];
  patternAnalysis: string;
  supportingEvidence: string[];
  benignExplanations: string[];
  recommendedSteps: string[];
  missingInformation: string[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  limitations: string;
  generatedAt: string;
  model: string;
  disclaimer: string;
}

export interface InvestigationCase {
  id: string;
  transactionIds: string[];
  customerId: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fraudCategory: string;
  assignedInvestigator: string;
  status:
    | 'NEW'
    | 'UNDER_INVESTIGATION'
    | 'ESCALATED'
    | 'AWAITING_INFO'
    | 'RESOLVED_LEGITIMATE'
    | 'CONFIRMED_FRAUD'
    | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  evidenceSummary: string[];
  notes: CaseNote[];
  aiSummary?: AIInvestigationSummary;
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolutionReason: string;
    actionTaken: 'NO_ACTION' | 'ACCOUNT_RESTRICTED' | 'FUNDS_HELD' | 'MERCHANT_DISPUTE' | 'FALSE_POSITIVE_WHITELIST';
  };
}

export interface FraudRuleConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defaultWeight: number;
  enabled: boolean;
  thresholds: Record<string, any>;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress: string;
}

export interface OverviewMetrics {
  totalTransactions: number;
  suspiciousTransactions: number;
  highRiskTransactions: number;
  confirmedFraudCases: number;
  openInvestigationCases: number;
  totalMonitoredVolumeUSD: number;
  fraudRatePercentage: number;
  riskDistribution: { name: string; count: number; color: string }[];
  categoryBreakdown: { category: string; count: number; volumeUSD: number }[];
  timeSeriesActivity: { date: string; normal: number; suspicious: number; volume: number }[];
  geographicDistribution: { city: string; country: string; txCount: number; alertCount: number }[];
  recentFlaggedTransactions: Transaction[];
  recentAuditActivity: AuditEvent[];
}

export interface EvaluationReport {
  threshold: number;
  confusionMatrix: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    totalEvaluated: number;
    actualFraudCount: number;
    actualLegitimateCount: number;
  };
  metrics: {
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
    accuracy: number;
    specificity: number;
  };
  rocCurvePoints: { threshold: number; recall: number; falsePositiveRate: number; f1: number }[];
  limitations: string;
  evaluatedAt: string;
  datasetSize: number;
}

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  message: string;
}

// Client API wrapper
export const api = {
  // Auth
  async getCurrentUser() {
    const res = await fetch('/api/auth/current-user');
    return res.json();
  },
  async switchRole(role: string) {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Overview
  async getOverview(): Promise<OverviewMetrics> {
    const res = await fetch('/api/overview');
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  // Transactions
  async getTransactions(params: Record<string, any>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) query.append(k, String(v));
    });
    const res = await fetch(`/api/transactions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async getTransactionById(id: string) {
    const res = await fetch(`/api/transactions/${id}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Transaction not found');
    return res.json();
  },

  async createTransaction(txn: any) {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async uploadTransactionsBatch(transactions: any[]) {
    const res = await fetch('/api/transactions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Fraud Rules
  async getRules(): Promise<{ rules: FraudRuleConfig[]; scoringWeights: any }> {
    const res = await fetch('/api/fraud/rules');
    return res.json();
  },

  async updateRule(id: string, updates: any) {
    const res = await fetch(`/api/fraud/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Customers
  async getCustomers(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/customers${query}`);
    return res.json();
  },

  async getCustomerById(id: string) {
    const res = await fetch(`/api/customers/${id}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Cases
  async getCases(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) query.append(k, String(v));
    });
    const res = await fetch(`/api/cases?${query.toString()}`);
    return res.json();
  },

  async getCaseById(id: string) {
    const res = await fetch(`/api/cases/${id}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async createCase(caseData: any) {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async updateCaseStatus(id: string, status: string, reason?: string) {
    const res = await fetch(`/api/cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async addCaseNote(caseId: string, content: string) {
    const res = await fetch(`/api/cases/${caseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async assignInvestigator(caseId: string, investigatorName: string) {
    const res = await fetch(`/api/cases/${caseId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investigatorName }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async resolveCase(caseId: string, payload: { actionTaken: string; resolutionReason: string; finalStatus: string }) {
    const res = await fetch(`/api/cases/${caseId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Explainable AI
  async generateAISummary(transactionId: string): Promise<AIInvestigationSummary> {
    const res = await fetch('/api/ai/investigation-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate AI summary');
    const data = await res.json();
    return data.summary;
  },

  // Audit Logs
  async getAuditLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) query.append(k, String(v));
    });
    const res = await fetch(`/api/audit-logs?${query.toString()}`);
    return res.json();
  },

  // Evaluation & Tests
  async runEvaluation(threshold: number = 60): Promise<{
    testResults: { summary: { total: number; passed: number; failed: number }; tests: TestResult[] };
    modelReport: EvaluationReport;
  }> {
    const res = await fetch('/api/evaluation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Reset Demo
  async resetDemo() {
    const res = await fetch('/api/system/reset', { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};
