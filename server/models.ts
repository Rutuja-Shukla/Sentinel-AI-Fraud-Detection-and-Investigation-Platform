export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TransactionType =
  | 'WIRE_TRANSFER'
  | 'CARD_PURCHASE'
  | 'ATM_WITHDRAWAL'
  | 'P2P_TRANSFER'
  | 'CRYPTO_PURCHASE'
  | 'ONLINE_PAYMENT'
  | 'POS_PAYMENT';

export type TransactionChannel = 'WEB' | 'MOBILE_APP' | 'ATM' | 'POS_TERMINAL' | 'API_INTEGRATION';

export type TransactionStatus = 'APPROVED' | 'DECLINED' | 'FLAGGED' | 'BLOCKED';

export interface GeoLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  ipAddress?: string;
}

export interface Transaction {
  id: string; // e.g., "TXN-2026-0891"
  customerId: string; // e.g., "CUST-4182"
  accountNumber: string; // synthetic e.g. "ACCT-****-9821"
  amount: number;
  currency: string;
  timestamp: string; // ISO 8601
  merchantName: string;
  merchantCategory: string; // e.g. "ELECTRONICS", "AIRLINE", "CRYPTO_EXCHANGE", "GROCERY"
  transactionType: TransactionType;
  channel: TransactionChannel;
  sourceLocation: GeoLocation;
  destinationLocation?: GeoLocation;
  deviceId: string;
  deviceType: 'IOS' | 'ANDROID' | 'MACOS' | 'WINDOWS' | 'UNKNOWN';
  status: TransactionStatus;
  isUploaded?: boolean;
  isGroundTruthFraud?: boolean; // For evaluation dataset only
  groundTruthReason?: string;
}

export interface MatchedRule {
  ruleId: string;
  ruleName: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreContribution: number;
  description: string;
  evidence: Record<string, any>;
}

export interface AnomalyDetails {
  anomalyScore: number; // 0 - 100
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
  overallScore: number; // 0 - 100
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

export type CaseStatus =
  | 'NEW'
  | 'UNDER_INVESTIGATION'
  | 'ESCALATED'
  | 'AWAITING_INFO'
  | 'RESOLVED_LEGITIMATE'
  | 'CONFIRMED_FRAUD'
  | 'CLOSED';

export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CaseNote {
  id: string;
  caseId: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  content: string;
}

export interface InvestigationCase {
  id: string; // e.g. "CASE-2026-0104"
  transactionIds: string[];
  customerId: string;
  riskScore: number;
  severity: CaseSeverity;
  fraudCategory: string; // e.g. "ACCOUNT_TAKEOVER", "CARD_TESTING", "GEO_LEAP", "SUSPICIOUS_HIGH_VALUE"
  assignedInvestigator: string;
  status: CaseStatus;
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

export type UserRole = 'ADMINISTRATOR' | 'FRAUD_ANALYST' | 'SENIOR_INVESTIGATOR' | 'AUDITOR';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  badgeNumber: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // e.g., "CASE_STATUS_CHANGED", "RULE_MODIFIED", "TXN_EVALUATED", "NOTE_ADDED", "INVESTIGATOR_ASSIGNED"
  entityType: 'TRANSACTION' | 'CASE' | 'RULE' | 'CUSTOMER' | 'SYSTEM' | 'AUDIT';
  entityId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress: string;
}

export interface FraudRuleConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defaultWeight: number; // Contribution points to risk score
  enabled: boolean;
  thresholds: Record<string, number | string>;
}
