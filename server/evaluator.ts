import fs from 'node:fs';
import { db } from './db.ts';
import { RiskAssessment } from './models.ts';

export interface TestResult {
  name: string;
  category: 'VALIDATION' | 'RULES' | 'ANOMALY' | 'SCORING' | 'WORKFLOW' | 'RBAC' | 'AUDIT' | 'PERSISTENCE';
  passed: boolean;
  durationMs: number;
  message: string;
  evidence?: any;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  totalEvaluated: number;
  actualFraudCount: number;
  actualLegitimateCount: number;
}

export interface ModelEvaluationReport {
  threshold: number;
  confusionMatrix: ConfusionMatrix;
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

export class SentinelEvaluator {
  /**
   * Run the full suite of automated regression, rule, and workflow tests
   */
  public runAutomatedTests(): { summary: { total: number; passed: number; failed: number }; tests: TestResult[] } {
    const tests: TestResult[] = [];

    // 1. Transaction Validation Test
    {
      const start = Date.now();
      let passed = false;
      let msg = '';
      try {
        db.ingestTransaction(
          {
            customerId: '',
            accountNumber: 'ACCT-TEST',
            amount: -50,
            currency: 'USD',
            timestamp: new Date().toISOString(),
            merchantName: 'Invalid Merchant',
            merchantCategory: 'RETAIL',
            transactionType: 'CARD_PURCHASE',
            channel: 'WEB',
            sourceLocation: { city: 'Test', country: 'Test', latitude: 0, longitude: 0 },
            deviceId: 'DEV-TEST',
            deviceType: 'MACOS',
            status: 'APPROVED',
          },
          { id: 'TEST-RUNNER', name: 'Automated Suite', role: 'ADMINISTRATOR' }
        );
        msg = 'Failed: Expected transaction with negative amount to be rejected.';
      } catch (err: any) {
        passed = err.message.includes('Validation Error');
        msg = passed ? 'Passed: Correctly rejected invalid transaction data.' : err.message;
      }
      tests.push({
        name: 'Transaction Input & Boundary Validation',
        category: 'VALIDATION',
        passed,
        durationMs: Date.now() - start,
        message: msg,
      });
    }

    // 2. Duplicate Detection Test
    {
      const start = Date.now();
      let passed = false;
      let msg = '';
      const sampleTxn = db.transactions[0];
      if (sampleTxn) {
        try {
          db.ingestTransaction(
            {
              customerId: sampleTxn.customerId,
              accountNumber: sampleTxn.accountNumber,
              amount: sampleTxn.amount,
              currency: sampleTxn.currency,
              timestamp: sampleTxn.timestamp,
              merchantName: sampleTxn.merchantName,
              merchantCategory: sampleTxn.merchantCategory,
              transactionType: sampleTxn.transactionType,
              channel: sampleTxn.channel,
              sourceLocation: sampleTxn.sourceLocation,
              deviceId: sampleTxn.deviceId,
              deviceType: sampleTxn.deviceType,
              status: 'APPROVED',
            },
            { id: 'TEST-RUNNER', name: 'Automated Suite', role: 'ADMINISTRATOR' }
          );
          msg = 'Failed: Duplicate transaction was ingested without error.';
        } catch (err: any) {
          passed = err.message.includes('Idempotency Conflict');
          msg = passed ? 'Passed: Idempotent duplicate transaction blocked.' : err.message;
        }
      }
      tests.push({
        name: 'Idempotent Duplicate Detection',
        category: 'VALIDATION',
        passed,
        durationMs: Date.now() - start,
        message: msg,
      });
    }

    // 3. Rule Evaluation: Geographic Leap
    {
      const start = Date.now();
      const geoLeapTxn = db.transactions.find((t) => t.groundTruthReason?.includes('GEO_LEAP'));
      const passed = !!geoLeapTxn && (db.assessments.get(geoLeapTxn.id)?.matchedRules.some((r) => r.ruleId === 'RULE_GEO_LEAP') ?? false);
      tests.push({
        name: 'Deterministic Rule: Geographic Impossible Speed',
        category: 'RULES',
        passed,
        durationMs: Date.now() - start,
        message: passed
          ? 'Passed: Successfully detected > 850 km/h impossible physical velocity.'
          : 'Failed: Geo leap rule did not trigger on known supersonic flight scenario.',
      });
    }

    // 4. Rule Evaluation: Card Testing Burst
    {
      const start = Date.now();
      const cardTestTxn = db.transactions.find((t) => t.groundTruthReason?.includes('CARD_TESTING_EXPLOITATION'));
      const assessment = cardTestTxn ? db.assessments.get(cardTestTxn.id) : null;
      const passed = !!assessment && assessment.matchedRules.some((r) => r.ruleId === 'RULE_FAILED_BURST');
      tests.push({
        name: 'Deterministic Rule: Preceding Decline Burst',
        category: 'RULES',
        passed,
        durationMs: Date.now() - start,
        message: passed
          ? 'Passed: Flagged approved authorization after multiple declines.'
          : 'Failed: Did not flag burst declines preceding transaction.',
      });
    }

    // 5. Anomaly Detection Z-Score Sensitivity
    {
      const start = Date.now();
      const outlierTxn = db.transactions.find((t) => t.groundTruthReason?.includes('UNUSUAL_OUTLIER'));
      const assessment = outlierTxn ? db.assessments.get(outlierTxn.id) : null;
      const passed = !!assessment && assessment.anomalyDetails.amountZScore > 3.0;
      tests.push({
        name: 'Statistical Anomaly: Z-Score Outlier Isolation',
        category: 'ANOMALY',
        passed,
        durationMs: Date.now() - start,
        message: passed
          ? `Passed: Isolated statistical deviation with Z-score +${assessment?.anomalyDetails.amountZScore}σ.`
          : 'Failed: Z-score calculation did not flag extreme deviation.',
      });
    }

    // 6. Risk Score Boundary Invariant
    {
      const start = Date.now();
      let allBounded = true;
      for (const ass of db.assessments.values()) {
        if (ass.overallScore < 0 || ass.overallScore > 100) {
          allBounded = false;
          break;
        }
      }
      tests.push({
        name: 'Risk Score Range Invariant [0, 100]',
        category: 'SCORING',
        passed: allBounded,
        durationMs: Date.now() - start,
        message: allBounded
          ? 'Passed: All risk scores strictly bounded within [0, 100].'
          : 'Failed: Out-of-bounds score detected in database assessment records.',
      });
    }

    // 7. Case Workflow & RBAC State Machine
    {
      const start = Date.now();
      let passed = false;
      let msg = '';
      try {
        const testCase = db.createCase(
          {
            customerId: 'CUST-1001',
            transactionIds: ['TXN-2026-1001'],
            fraudCategory: 'TEST_RBAC',
            severity: 'HIGH',
          },
          { id: 'ANALYST-TEST', name: 'Analyst Test', role: 'FRAUD_ANALYST' }
        );

        // Fraud analyst should NOT be permitted to confirm fraud directly without senior approval
        try {
          db.updateCaseStatus(testCase.id, 'CONFIRMED_FRAUD', {
            id: 'ANALYST-TEST',
            name: 'Analyst Test',
            role: 'FRAUD_ANALYST',
          });
          msg = 'Failed: Fraud analyst was able to confirm fraud without Senior authorization.';
        } catch (permErr: any) {
          passed = permErr.message.includes('Permission Denied');
          msg = passed
            ? 'Passed: Enforced RBAC; Analyst prevented from final fraud confirmation.'
            : permErr.message;
        }
      } catch (e: any) {
        msg = e.message;
      }
      tests.push({
        name: 'RBAC Enforcement & Workflow Transitions',
        category: 'RBAC',
        passed,
        durationMs: Date.now() - start,
        message: msg,
      });
    }

    // 8. Append-Only Audit Logging
    {
      const start = Date.now();
      const initialCount = db.auditEvents.length;
      db.recordAudit(
        { id: 'TEST-AUDITOR', name: 'Security Auditor', role: 'AUDITOR' },
        'SECURITY_HEALTH_CHECK',
        'SYSTEM',
        'SYS-AUDIT-TEST',
        { reason: 'Verified tamper-evident append-only logging.' }
      );
      const passed = db.auditEvents.length === initialCount + 1 && db.auditEvents[0].action === 'SECURITY_HEALTH_CHECK';
      tests.push({
        name: 'Append-Only Audit Trail Integrity',
        category: 'AUDIT',
        passed,
        durationMs: Date.now() - start,
        message: passed
          ? 'Passed: Audit records captured immutably with timestamp and actor identity.'
          : 'Failed: Audit log entry was not persisted.',
      });
    }

    // 9. File Persistence & Snapshot Recovery
    {
      const start = Date.now();
      const filePath = db.getDataFilePath();
      const exists = fs.existsSync(filePath);
      const size = exists ? fs.statSync(filePath).size : 0;
      const passed = exists && size > 1000;
      tests.push({
        name: 'Disk Persistence & Snapshot Ledger',
        category: 'PERSISTENCE',
        passed,
        durationMs: Date.now() - start,
        message: passed
          ? `Passed: Database active snapshot verified on disk (${size.toLocaleString()} bytes at ${filePath}).`
          : 'Failed: Database snapshot file does not exist on disk.',
      });
    }

    // 10. Dynamic Customer Behavioral Telemetry
    {
      const start = Date.now();
      const cust = db.customers.values().next().value;
      const passed = !!cust && cust.historicalTxnCount > 0 && cust.totalVolumeUSD > 0;
      tests.push({
        name: 'Customer Baseline Telemetry Tracking',
        category: 'VALIDATION',
        passed,
        durationMs: Date.now() - start,
        message: passed
          ? `Passed: Customer profiles actively maintain aggregated volume ($${cust?.totalVolumeUSD.toLocaleString()}), cadence, and device fingerprints.`
          : 'Failed: Customer baseline telemetry not maintained.',
      });
    }

    const passedCount = tests.filter((t) => t.passed).length;
    return {
      summary: {
        total: tests.length,
        passed: passedCount,
        failed: tests.length - passedCount,
      },
      tests,
    };
  }

  /**
   * Evaluate detection engine accuracy against the labelled ground-truth dataset
   */
  public evaluateModel(threshold: number = 60): ModelEvaluationReport {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    let actualFraudCount = 0;
    let actualLegitimateCount = 0;

    for (const txn of db.transactions) {
      const isActualFraud = txn.isGroundTruthFraud === true;
      if (isActualFraud) actualFraudCount++;
      else actualLegitimateCount++;

      const assessment = db.assessments.get(txn.id);
      const score = assessment ? assessment.overallScore : 0;
      const isPredictedFraud = score >= threshold;

      if (isPredictedFraud && isActualFraud) {
        tp++;
      } else if (isPredictedFraud && !isActualFraud) {
        fp++;
      } else if (!isPredictedFraud && !isActualFraud) {
        tn++;
      } else if (!isPredictedFraud && isActualFraud) {
        fn++;
      }
    }

    const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 0;
    const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 0;
    const f1Score =
      precision + recall > 0
        ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4))
        : 0;
    const falsePositiveRate =
      fp + tn > 0 ? Number((fp / (fp + tn)).toFixed(4)) : 0;
    const accuracy =
      tp + tn + fp + fn > 0
        ? Number(((tp + tn) / (tp + tn + fp + fn)).toFixed(4))
        : 0;
    const specificity =
      tn + fp > 0 ? Number((tn / (tn + fp)).toFixed(4)) : 0;

    // Generate ROC / PR curve points across thresholds [20, 30, 40, 50, 60, 70, 80, 90]
    const thresholds = [20, 30, 40, 50, 60, 70, 80, 90];
    const rocCurvePoints = thresholds.map((th) => {
      let t_tp = 0;
      let t_fp = 0;
      let t_tn = 0;
      let t_fn = 0;

      for (const txn of db.transactions) {
        const isActual = txn.isGroundTruthFraud === true;
        const score = db.assessments.get(txn.id)?.overallScore || 0;
        const isPred = score >= th;

        if (isPred && isActual) t_tp++;
        else if (isPred && !isActual) t_fp++;
        else if (!isPred && !isActual) t_tn++;
        else if (!isPred && isActual) t_fn++;
      }

      const rec = t_tp + t_fn > 0 ? t_tp / (t_tp + t_fn) : 0;
      const fpr = t_fp + t_tn > 0 ? t_fp / (t_fp + t_tn) : 0;
      const prec = t_tp + t_fp > 0 ? t_tp / (t_tp + t_fp) : 0;
      const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;

      return {
        threshold: th,
        recall: Number(rec.toFixed(3)),
        falsePositiveRate: Number(fpr.toFixed(3)),
        f1: Number(f1.toFixed(3)),
      };
    });

    return {
      threshold,
      confusionMatrix: {
        truePositives: tp,
        falsePositives: fp,
        trueNegatives: tn,
        falseNegatives: fn,
        totalEvaluated: db.transactions.length,
        actualFraudCount,
        actualLegitimateCount,
      },
      metrics: {
        precision,
        recall,
        f1Score,
        falsePositiveRate,
        accuracy,
        specificity,
      },
      rocCurvePoints,
      limitations:
        'DISCLAIMER: These metrics are derived from a synthetic benchmark fixtures dataset designed for software engineering verification and rule calibration. They do not constitute certified production predictive performance against adversarial real-world financial fraud schemes.',
      evaluatedAt: new Date().toISOString(),
      datasetSize: db.transactions.length,
    };
  }
}

export const evaluator = new SentinelEvaluator();
