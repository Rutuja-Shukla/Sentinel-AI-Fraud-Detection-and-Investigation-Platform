import {
  AnomalyDetails,
  MatchedRule,
  RiskAssessment,
  RiskLevel,
  Transaction,
} from './models.ts';

export interface ScoringWeights {
  rulesWeight: number; // e.g. 0.60
  anomalyWeight: number; // e.g. 0.40
  reviewThreshold: number; // score >= 60 triggers case recommendation
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  rulesWeight: 0.65,
  anomalyWeight: 0.35,
  reviewThreshold: 60,
};

export class ScoringEngine {
  private weights: ScoringWeights;
  private rulesetVersion = 'v2.4.0-sentinel-core';

  constructor(weights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...weights };
  }

  public getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  public setWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Computes a deterministic, explainable risk assessment bounded to [0, 100].
   */
  public assess(
    txn: Transaction,
    matchedRules: MatchedRule[],
    anomalyDetails: AnomalyDetails
  ): RiskAssessment {
    // 1. Calculate Rule Component Score (0 - 100)
    // Avoid unbounded accumulation: take primary maximum rule contribution + discounted secondary contributions
    let ruleScore = 0;
    if (matchedRules.length > 0) {
      // Sort desc by score contribution
      const sorted = [...matchedRules].sort(
        (a, b) => b.scoreContribution - a.scoreContribution
      );
      const primary = sorted[0].scoreContribution;
      const secondaries = sorted.slice(1).reduce((acc, r) => acc + r.scoreContribution * 0.5, 0);
      ruleScore = Math.min(100, Math.round(primary + secondaries));
    }

    // 2. Anomaly Component Score (0 - 100)
    const anomalyScore = anomalyDetails.anomalyScore;

    // 3. Fused Score with Correlation Damping
    // If a rule already matched high amount and anomaly detected high amount, dampen overlap
    let correlationAdjustment = 0;
    const hasHighAmountRule = matchedRules.some((r) => r.ruleId === 'RULE_HIGH_AMOUNT');
    if (hasHighAmountRule && anomalyDetails.subFactors.amountRisk >= 20) {
      correlationAdjustment += 5; // prevent overcounting amount
    }
    const hasGeoRule = matchedRules.some((r) => r.ruleId === 'RULE_GEO_LEAP');
    if (hasGeoRule && anomalyDetails.subFactors.geoRisk >= 20) {
      correlationAdjustment += 5; // prevent overcounting geo leap
    }

    const rawFused =
      ruleScore * this.weights.rulesWeight +
      anomalyScore * this.weights.anomalyWeight -
      correlationAdjustment;

    // Critical rule boost: If any CRITICAL rule matched, minimum score floor is 75
    const hasCriticalRule = matchedRules.some((r) => r.severity === 'CRITICAL');
    const floorScore = hasCriticalRule ? 75 : 0;

    const overallScore = Math.min(
      100,
      Math.max(floorScore, Math.max(0, Math.round(rawFused)))
    );

    // 4. Classification
    let riskClassification: RiskLevel = 'LOW';
    if (overallScore >= 80) {
      riskClassification = 'CRITICAL';
    } else if (overallScore >= 60) {
      riskClassification = 'HIGH';
    } else if (overallScore >= 30) {
      riskClassification = 'MEDIUM';
    } else {
      riskClassification = 'LOW';
    }

    // 5. Contributing Factors Explanations
    const contributingFactors: string[] = [];

    matchedRules.forEach((rule) => {
      contributingFactors.push(`Matched Rule [${rule.ruleName}]: +${rule.scoreContribution}pts (${rule.severity})`);
    });

    if (anomalyDetails.amountZScore > 2.0) {
      contributingFactors.push(
        `Statistical Amount Outlier: Z-score +${anomalyDetails.amountZScore}σ vs customer history`
      );
    }
    if (anomalyDetails.travelVelocityKmH > 500) {
      contributingFactors.push(
        `High Travel Velocity: ${anomalyDetails.travelVelocityKmH} km/h between locations`
      );
    }
    if (anomalyDetails.isNewMerchant) {
      contributingFactors.push(`Unseen Merchant: First-time engagement with ${txn.merchantName}`);
    }
    if (anomalyDetails.isNewDevice) {
      contributingFactors.push(`Unrecognized Device Fingerprint: ${txn.deviceId}`);
    }
    if (anomalyDetails.timeSinceLastTxnMinutes < 5 && anomalyDetails.timeSinceLastTxnMinutes > 0) {
      contributingFactors.push(
        `Velocity Warning: Transaction executed ${anomalyDetails.timeSinceLastTxnMinutes}m after previous activity`
      );
    }

    if (contributingFactors.length === 0) {
      contributingFactors.push('Routine customer activity aligned with historical behavioral baseline.');
    }

    return {
      transactionId: txn.id,
      overallScore,
      riskClassification,
      ruleScore,
      anomalyScore,
      matchedRules,
      anomalyDetails,
      contributingFactors,
      rulesetVersion: this.rulesetVersion,
      assessedAt: new Date().toISOString(),
      requiresReview: overallScore >= this.weights.reviewThreshold,
    };
  }
}
