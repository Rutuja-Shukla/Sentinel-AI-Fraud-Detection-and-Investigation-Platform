import { FraudRuleConfig, MatchedRule, Transaction, CustomerProfile } from './models.ts';

// Default rule configurations with tunable thresholds and weights
export const DEFAULT_RULES: FraudRuleConfig[] = [
  {
    id: 'RULE_HIGH_AMOUNT',
    name: 'Unusual High Amount vs Baseline',
    description: 'Flags transactions exceeding 3.5 standard deviations or 4x above the customer historical average.',
    category: 'AMOUNT_ANOMALY',
    severity: 'HIGH',
    defaultWeight: 35,
    enabled: true,
    thresholds: {
      multiplierThreshold: 3.5,
      absoluteMinThreshold: 1000,
    },
  },
  {
    id: 'RULE_VELOCITY',
    name: 'High-Frequency Velocity Burst',
    description: 'Detects excessive transactions within a short time window (e.g. > 3 transactions within 10 minutes).',
    category: 'VELOCITY',
    severity: 'HIGH',
    defaultWeight: 30,
    enabled: true,
    thresholds: {
      windowMinutes: 10,
      maxCountInWindow: 3,
    },
  },
  {
    id: 'RULE_GEO_LEAP',
    name: 'Geographic Impossible Speed',
    description: 'Calculates physical distance and elapsed time between consecutive transactions; flags implied speed > 850 km/h.',
    category: 'GEOGRAPHY',
    severity: 'CRITICAL',
    defaultWeight: 45,
    enabled: true,
    thresholds: {
      maxSpeedKmH: 850,
      minDistanceKm: 150,
    },
  },
  {
    id: 'RULE_FAILED_BURST',
    name: 'Preceding Decline Authentication Burst',
    description: 'Detects approved high-value transaction preceded by 2 or more declined/failed authorization attempts within 30 minutes.',
    category: 'CARD_TESTING',
    severity: 'CRITICAL',
    defaultWeight: 40,
    enabled: true,
    thresholds: {
      windowMinutes: 30,
      failedAttemptsThreshold: 2,
    },
  },
  {
    id: 'RULE_RAPID_DRAIN',
    name: 'Rapid Fund Depletion / Mule Drain',
    description: 'Identifies immediate outbound transfer/withdrawal representing > 80% of customer balance or recent deposit within 30 minutes.',
    category: 'MONEY_MULE',
    severity: 'CRITICAL',
    defaultWeight: 45,
    enabled: true,
    thresholds: {
      drainPercentage: 80,
      windowMinutes: 30,
      minAmount: 1500,
    },
  },
  {
    id: 'RULE_FREQUENCY_SURGE',
    name: 'Daily Activity Volume Surge',
    description: 'Flags when the daily transaction count surges to more than 3.5x the customer’s typical daily frequency.',
    category: 'BEHAVIORAL',
    severity: 'MEDIUM',
    defaultWeight: 25,
    enabled: true,
    thresholds: {
      dailyCountMultiplier: 3.5,
      minDailyCount: 5,
    },
  },
  {
    id: 'RULE_NEW_MERCHANT_BURST',
    name: 'High-Risk Unseen Merchant Ingestion',
    description: 'Flags high-value transactions (> $1,200) routed to brand new merchants in high-risk categories (Crypto, Foreign Wire, Gaming).',
    category: 'MERCHANT_RISK',
    severity: 'MEDIUM',
    defaultWeight: 25,
    enabled: true,
    thresholds: {
      minAmount: 1200,
    },
  },
  {
    id: 'RULE_IDENTICAL_AMOUNTS',
    name: 'Repeated Identical Amount Probing',
    description: 'Identifies 3 or more identical transaction amounts within 15 minutes, indicative of automated card testing or retry script.',
    category: 'AUTOMATION',
    severity: 'HIGH',
    defaultWeight: 35,
    enabled: true,
    thresholds: {
      windowMinutes: 15,
      identicalCountThreshold: 3,
    },
  },
  {
    id: 'RULE_OFF_HOURS_ANOMALY',
    name: 'Off-Hours High-Value Deviation',
    description: 'Detects high-value transactions executed between 01:00 and 05:00 local time that deviate from customer normal activity.',
    category: 'TEMPORAL',
    severity: 'LOW',
    defaultWeight: 20,
    enabled: true,
    thresholds: {
      startHour: 1,
      endHour: 5,
      minAmount: 800,
    },
  },
  {
    id: 'RULE_DEVICE_FINGERPRINT',
    name: 'Suspicious Device Multi-Account Sharing',
    description: 'Flags transactions originating from a device ID previously linked to 3 or more distinct customer accounts within 7 days.',
    category: 'DEVICE_HOPPING',
    severity: 'CRITICAL',
    defaultWeight: 40,
    enabled: true,
    thresholds: {
      maxAccountsPerDevice: 2,
    },
  },
];

// Helper Haversine formula
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class RulesEngine {
  private rules: Map<string, FraudRuleConfig> = new Map();

  constructor(customRules?: FraudRuleConfig[]) {
    const list = customRules || DEFAULT_RULES;
    for (const rule of list) {
      this.rules.set(rule.id, { ...rule });
    }
  }

  public getRules(): FraudRuleConfig[] {
    return Array.from(this.rules.values());
  }

  public updateRule(id: string, updates: Partial<FraudRuleConfig>): FraudRuleConfig | null {
    const existing = this.rules.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.rules.set(id, updated);
    return updated;
  }

  public evaluate(
    txn: Transaction,
    customer: CustomerProfile,
    recentHistory: Transaction[], // past transactions in chronological order
    deviceToCustomerMap: Map<string, Set<string>>
  ): MatchedRule[] {
    const matches: MatchedRule[] = [];
    const txTime = new Date(txn.timestamp).getTime();

    // 1. RULE_HIGH_AMOUNT
    const highAmountRule = this.rules.get('RULE_HIGH_AMOUNT');
    if (highAmountRule && highAmountRule.enabled) {
      const mult = Number(highAmountRule.thresholds.multiplierThreshold) || 3.5;
      const minAbs = Number(highAmountRule.thresholds.absoluteMinThreshold) || 1000;
      const avg = customer.averageTxnAmount || 150;
      const std = customer.stdDevTxnAmount || 80;
      const zScore = std > 0 ? (txn.amount - avg) / std : (txn.amount - avg) / avg;

      if (txn.amount >= minAbs && (zScore > mult || txn.amount > avg * mult)) {
        matches.push({
          ruleId: highAmountRule.id,
          ruleName: highAmountRule.name,
          severity: highAmountRule.severity,
          scoreContribution: highAmountRule.defaultWeight,
          description: `Amount of $${txn.amount.toFixed(2)} is ${(txn.amount / avg).toFixed(1)}x historical customer average ($${avg.toFixed(2)}) with Z-score of ${zScore.toFixed(2)}.`,
          evidence: {
            amount: txn.amount,
            customerAverage: avg,
            zScore: Number(zScore.toFixed(2)),
            thresholdMultiplier: mult,
          },
        });
      }
    }

    // 2. RULE_VELOCITY
    const velocityRule = this.rules.get('RULE_VELOCITY');
    if (velocityRule && velocityRule.enabled) {
      const windowMinutes = Number(velocityRule.thresholds.windowMinutes) || 10;
      const maxCount = Number(velocityRule.thresholds.maxCountInWindow) || 3;
      const windowMs = windowMinutes * 60 * 1000;

      const priorInWindow = recentHistory.filter((t) => {
        const tTime = new Date(t.timestamp).getTime();
        return tTime < txTime && txTime - tTime <= windowMs && t.id !== txn.id;
      });

      if (priorInWindow.length >= maxCount) {
        matches.push({
          ruleId: velocityRule.id,
          ruleName: velocityRule.name,
          severity: velocityRule.severity,
          scoreContribution: velocityRule.defaultWeight,
          description: `Detected ${priorInWindow.length + 1} transactions within ${windowMinutes} minutes (threshold: ${maxCount}).`,
          evidence: {
            priorCount: priorInWindow.length,
            windowMinutes,
            priorTxnIds: priorInWindow.map((p) => p.id),
          },
        });
      }
    }

    // 3. RULE_GEO_LEAP
    const geoRule = this.rules.get('RULE_GEO_LEAP');
    if (geoRule && geoRule.enabled && txn.sourceLocation) {
      const maxSpeed = Number(geoRule.thresholds.maxSpeedKmH) || 850;
      const minDistance = Number(geoRule.thresholds.minDistanceKm) || 150;

      // Find the most recent preceding transaction with valid location
      const priorTxn = [...recentHistory]
        .reverse()
        .find((t) => t.id !== txn.id && new Date(t.timestamp).getTime() < txTime && t.sourceLocation);

      if (priorTxn && priorTxn.sourceLocation) {
        const priorTime = new Date(priorTxn.timestamp).getTime();
        const diffHours = (txTime - priorTime) / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours < 12) {
          const distanceKm = calculateHaversineDistanceKm(
            priorTxn.sourceLocation.latitude,
            priorTxn.sourceLocation.longitude,
            txn.sourceLocation.latitude,
            txn.sourceLocation.longitude
          );

          const impliedSpeed = distanceKm / diffHours;

          if (distanceKm >= minDistance && impliedSpeed > maxSpeed) {
            matches.push({
              ruleId: geoRule.id,
              ruleName: geoRule.name,
              severity: geoRule.severity,
              scoreContribution: geoRule.defaultWeight,
              description: `Impossible geographic transition: ${distanceKm.toFixed(0)} km in ${(diffHours * 60).toFixed(0)} mins (${impliedSpeed.toFixed(0)} km/h implied speed from ${priorTxn.sourceLocation.city} to ${txn.sourceLocation.city}).`,
              evidence: {
                fromCity: priorTxn.sourceLocation.city,
                toCity: txn.sourceLocation.city,
                distanceKm: Math.round(distanceKm),
                elapsedMinutes: Math.round(diffHours * 60),
                impliedSpeedKmH: Math.round(impliedSpeed),
              },
            });
          }
        }
      }
    }

    // 4. RULE_FAILED_BURST
    const failedBurstRule = this.rules.get('RULE_FAILED_BURST');
    if (failedBurstRule && failedBurstRule.enabled) {
      const windowMs = (Number(failedBurstRule.thresholds.windowMinutes) || 30) * 60 * 1000;
      const failThreshold = Number(failedBurstRule.thresholds.failedAttemptsThreshold) || 2;

      const failedPrior = recentHistory.filter((t) => {
        const tTime = new Date(t.timestamp).getTime();
        return (
          tTime < txTime &&
          txTime - tTime <= windowMs &&
          (t.status === 'DECLINED' || t.status === 'BLOCKED') &&
          t.id !== txn.id
        );
      });

      if (failedPrior.length >= failThreshold && txn.status === 'APPROVED') {
        matches.push({
          ruleId: failedBurstRule.id,
          ruleName: failedBurstRule.name,
          severity: failedBurstRule.severity,
          scoreContribution: failedBurstRule.defaultWeight,
          description: `Successful authorization following ${failedPrior.length} declined attempts within 30 minutes.`,
          evidence: {
            failedCount: failedPrior.length,
            declinedTxnIds: failedPrior.map((f) => f.id),
          },
        });
      }
    }

    // 5. RULE_RAPID_DRAIN
    const rapidDrainRule = this.rules.get('RULE_RAPID_DRAIN');
    if (rapidDrainRule && rapidDrainRule.enabled && (txn.transactionType === 'WIRE_TRANSFER' || txn.transactionType === 'CRYPTO_PURCHASE' || txn.transactionType === 'ATM_WITHDRAWAL')) {
      const minAmount = Number(rapidDrainRule.thresholds.minAmount) || 1500;
      const windowMs = (Number(rapidDrainRule.thresholds.windowMinutes) || 30) * 60 * 1000;

      // Check if there was an inbound transfer or deposit in recent history, or amount is large drain
      const recentDeposits = recentHistory.filter((t) => {
        const tTime = new Date(t.timestamp).getTime();
        return (
          tTime < txTime &&
          txTime - tTime <= windowMs &&
          t.amount >= minAmount &&
          (t.transactionType === 'WIRE_TRANSFER' || t.transactionType === 'P2P_TRANSFER')
        );
      });

      if (txn.amount >= minAmount && (recentDeposits.length > 0 || txn.amount > customer.averageTxnAmount * 5)) {
        matches.push({
          ruleId: rapidDrainRule.id,
          ruleName: rapidDrainRule.name,
          severity: rapidDrainRule.severity,
          scoreContribution: rapidDrainRule.defaultWeight,
          description: `High-value rapid fund outflow ($${txn.amount.toFixed(2)}) via ${txn.transactionType.replace('_', ' ')} within close temporal proximity of recent fund movements.`,
          evidence: {
            drainAmount: txn.amount,
            drainChannel: txn.channel,
            transactionType: txn.transactionType,
          },
        });
      }
    }

    // 6. RULE_FREQUENCY_SURGE
    const freqSurgeRule = this.rules.get('RULE_FREQUENCY_SURGE');
    if (freqSurgeRule && freqSurgeRule.enabled) {
      const mult = Number(freqSurgeRule.thresholds.dailyCountMultiplier) || 3.5;
      const minDaily = Number(freqSurgeRule.thresholds.minDailyCount) || 5;

      const oneDayMs = 24 * 60 * 60 * 1000;
      const txnsInPast24h = recentHistory.filter((t) => {
        const tTime = new Date(t.timestamp).getTime();
        return tTime <= txTime && txTime - tTime <= oneDayMs;
      }).length + 1;

      const baselineDaily = Math.max(1, customer.historicalTxnCount / Math.max(1, customer.accountAgeDays));
      if (txnsInPast24h >= minDaily && txnsInPast24h > baselineDaily * mult) {
        matches.push({
          ruleId: freqSurgeRule.id,
          ruleName: freqSurgeRule.name,
          severity: freqSurgeRule.severity,
          scoreContribution: freqSurgeRule.defaultWeight,
          description: `24-hour transaction frequency surged to ${txnsInPast24h} transactions (${(txnsInPast24h / baselineDaily).toFixed(1)}x baseline of ${baselineDaily.toFixed(1)}/day).`,
          evidence: {
            countPast24h: txnsInPast24h,
            baselineDailyRate: Number(baselineDaily.toFixed(2)),
          },
        });
      }
    }

    // 7. RULE_NEW_MERCHANT_BURST
    const merchantRule = this.rules.get('RULE_NEW_MERCHANT_BURST');
    if (merchantRule && merchantRule.enabled) {
      const minAmount = Number(merchantRule.thresholds.minAmount) || 1200;
      const isKnown = customer.topMerchants?.includes(txn.merchantName);
      const isHighRiskCategory = ['CRYPTO_EXCHANGE', 'FOREIGN_WIRE', 'GAMBLING', 'LUXURY_JEWELRY'].includes(
        txn.merchantCategory
      );

      if (!isKnown && (txn.amount >= minAmount || isHighRiskCategory)) {
        matches.push({
          ruleId: merchantRule.id,
          ruleName: merchantRule.name,
          severity: merchantRule.severity,
          scoreContribution: merchantRule.defaultWeight,
          description: `High-value payment ($${txn.amount.toFixed(2)}) to previously unseen merchant "${txn.merchantName}" in category ${txn.merchantCategory}.`,
          evidence: {
            merchant: txn.merchantName,
            category: txn.merchantCategory,
            amount: txn.amount,
          },
        });
      }
    }

    // 8. RULE_IDENTICAL_AMOUNTS
    const identicalRule = this.rules.get('RULE_IDENTICAL_AMOUNTS');
    if (identicalRule && identicalRule.enabled) {
      const windowMs = (Number(identicalRule.thresholds.windowMinutes) || 15) * 60 * 1000;
      const identicalThreshold = Number(identicalRule.thresholds.identicalCountThreshold) || 3;

      const identicalMatches = recentHistory.filter((t) => {
        const tTime = new Date(t.timestamp).getTime();
        return (
          tTime <= txTime &&
          txTime - tTime <= windowMs &&
          Math.abs(t.amount - txn.amount) < 0.01 &&
          t.id !== txn.id
        );
      });

      if (identicalMatches.length + 1 >= identicalThreshold) {
        matches.push({
          ruleId: identicalRule.id,
          ruleName: identicalRule.name,
          severity: identicalRule.severity,
          scoreContribution: identicalRule.defaultWeight,
          description: `Detected ${identicalMatches.length + 1} transactions with identical amount of $${txn.amount.toFixed(2)} within 15 minutes.`,
          evidence: {
            identicalCount: identicalMatches.length + 1,
            matchedAmount: txn.amount,
          },
        });
      }
    }

    // 9. RULE_OFF_HOURS_ANOMALY
    const offHoursRule = this.rules.get('RULE_OFF_HOURS_ANOMALY');
    if (offHoursRule && offHoursRule.enabled) {
      const minAmount = Number(offHoursRule.thresholds.minAmount) || 800;
      const hour = new Date(txn.timestamp).getUTCHours(); // or local estimate

      if (hour >= 1 && hour <= 5 && txn.amount >= minAmount) {
        matches.push({
          ruleId: offHoursRule.id,
          ruleName: offHoursRule.name,
          severity: offHoursRule.severity,
          scoreContribution: offHoursRule.defaultWeight,
          description: `High-value activity ($${txn.amount.toFixed(2)}) executed during off-peak hours (0${hour}:00 UTC).`,
          evidence: {
            hour,
            amount: txn.amount,
          },
        });
      }
    }

    // 10. RULE_DEVICE_FINGERPRINT
    const deviceRule = this.rules.get('RULE_DEVICE_FINGERPRINT');
    if (deviceRule && deviceRule.enabled && txn.deviceId) {
      const maxAccounts = Number(deviceRule.thresholds.maxAccountsPerDevice) || 2;
      const linkedCustomers = deviceToCustomerMap.get(txn.deviceId);

      if (linkedCustomers && linkedCustomers.size > maxAccounts) {
        matches.push({
          ruleId: deviceRule.id,
          ruleName: deviceRule.name,
          severity: deviceRule.severity,
          scoreContribution: deviceRule.defaultWeight,
          description: `Device fingerprint "${txn.deviceId}" is associated with ${linkedCustomers.size} distinct customer accounts.`,
          evidence: {
            deviceId: txn.deviceId,
            linkedAccountCount: linkedCustomers.size,
          },
        });
      }
    }

    return matches;
  }
}
