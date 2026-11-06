import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { Database, db } from '../server/db.ts';
import { RulesEngine, calculateHaversineDistanceKm } from '../server/rules.ts';
import { AnomalyEngine } from '../server/anomaly.ts';
import { ScoringEngine } from '../server/scoring.ts';
import { CustomerProfile, Transaction, UserRole } from '../server/models.ts';

interface TestReport {
  passed: number;
  failed: number;
  results: { suite: string; name: string; passed: boolean; error?: string; durationMs: number }[];
}

const report: TestReport = { passed: 0, failed: 0, results: [] };

async function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    report.passed++;
    report.results.push({ suite, name, passed: true, durationMs });
    console.log(`  ✓ [${suite}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    report.failed++;
    report.results.push({ suite, name, passed: false, error: err.message || String(err), durationMs });
    console.error(`  ✗ [${suite}] ${name} (${durationMs}ms): ${err.message}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('   SENTINEL ENTERPRISE ARCHITECTURE VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // --- SUITE 1: TRANSACTION INGESTION & VALIDATION ---
  console.log('--- Suite 1: Transaction Ingestion & Validation ---');

  await runTest('Validation', 'Rejects transaction with empty or missing customerId', () => {
    assert.throws(
      () => {
        db.ingestTransaction(
          {
            customerId: '',
            accountNumber: 'ACCT-TEST',
            amount: 150,
            currency: 'USD',
            timestamp: new Date().toISOString(),
            merchantName: 'Test Merchant',
            merchantCategory: 'GROCERY',
            transactionType: 'CARD_PURCHASE',
            channel: 'WEB',
            sourceLocation: { city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
            deviceId: 'DEV-TEST-1',
            deviceType: 'MACOS',
            status: 'APPROVED',
          },
          { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
        );
      },
      /Valid customer ID is required/,
      'Should throw validation error for empty customerId'
    );
  });

  await runTest('Validation', 'Rejects negative or zero amount', () => {
    assert.throws(
      () => {
        db.ingestTransaction(
          {
            customerId: 'CUST-TEST-VAL',
            accountNumber: 'ACCT-TEST',
            amount: -50,
            currency: 'USD',
            timestamp: new Date().toISOString(),
            merchantName: 'Test Merchant',
            merchantCategory: 'GROCERY',
            transactionType: 'CARD_PURCHASE',
            channel: 'WEB',
            sourceLocation: { city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
            deviceId: 'DEV-TEST-1',
            deviceType: 'MACOS',
            status: 'APPROVED',
          },
          { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
        );
      },
      /positive finite numerical amount is required/,
      'Should throw validation error for negative amount'
    );
  });

  await runTest('Validation', 'Rejects amounts exceeding velocity ceiling ($10,000,000)', () => {
    assert.throws(
      () => {
        db.ingestTransaction(
          {
            customerId: 'CUST-TEST-VAL',
            accountNumber: 'ACCT-TEST',
            amount: 25000000,
            currency: 'USD',
            timestamp: new Date().toISOString(),
            merchantName: 'Offshore Escrow',
            merchantCategory: 'FOREIGN_WIRE',
            transactionType: 'WIRE_TRANSFER',
            channel: 'WEB',
            sourceLocation: { city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
            deviceId: 'DEV-TEST-1',
            deviceType: 'MACOS',
            status: 'APPROVED',
          },
          { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
        );
      },
      /velocity ceiling/,
      'Should throw validation error for excessive amount'
    );
  });

  await runTest('Validation', 'Rejects out-of-bounds geographic coordinates', () => {
    assert.throws(
      () => {
        db.ingestTransaction(
          {
            customerId: 'CUST-TEST-VAL',
            accountNumber: 'ACCT-TEST',
            amount: 250,
            currency: 'USD',
            timestamp: new Date().toISOString(),
            merchantName: 'Test Merchant',
            merchantCategory: 'GROCERY',
            transactionType: 'CARD_PURCHASE',
            channel: 'WEB',
            sourceLocation: { city: 'Invalid City', country: 'Invalid Country', latitude: 195.4, longitude: -220.1 },
            deviceId: 'DEV-TEST-1',
            deviceType: 'MACOS',
            status: 'APPROVED',
          },
          { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
        );
      },
      /Geographic coordinates out of valid range/,
      'Should reject invalid coordinates'
    );
  });

  // --- SUITE 2: IDEMPOTENCY & DUPLICATE DETECTION ---
  console.log('\n--- Suite 2: Idempotency & Duplicate Detection ---');

  await runTest('Idempotency', 'Blocks identical duplicate transactions within 3-second window', () => {
    const custId = 'CUST-IDEMP-TEST';
    const amount = 312.45;
    const nowIso = new Date().toISOString();

    // First ingestion
    const { transaction } = db.ingestTransaction(
      {
        customerId: custId,
        accountNumber: 'ACCT-IDEMP',
        amount,
        currency: 'USD',
        timestamp: nowIso,
        merchantName: 'Idempotency Merchant Test',
        merchantCategory: 'ONLINE_RETAIL',
        transactionType: 'ONLINE_PAYMENT',
        channel: 'WEB',
        sourceLocation: { city: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
        deviceId: 'DEV-IDEMP-1',
        deviceType: 'MACOS',
        status: 'APPROVED',
      },
      { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
    );

    assert.ok(transaction.id, 'First transaction should succeed');

    // Immediate second duplicate
    assert.throws(
      () => {
        db.ingestTransaction(
          {
            customerId: custId,
            accountNumber: 'ACCT-IDEMP',
            amount,
            currency: 'USD',
            timestamp: nowIso,
            merchantName: 'Idempotency Merchant Test',
            merchantCategory: 'ONLINE_RETAIL',
            transactionType: 'ONLINE_PAYMENT',
            channel: 'WEB',
            sourceLocation: { city: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
            deviceId: 'DEV-IDEMP-1',
            deviceType: 'MACOS',
            status: 'APPROVED',
          },
          { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
        );
      },
      /Idempotency Conflict/,
      'Second identical transaction within 3s must be rejected as duplicate'
    );
  });

  // --- SUITE 3: DYNAMIC CUSTOMER PROFILE TELEMETRY ---
  console.log('\n--- Suite 3: Dynamic Customer Profile Telemetry ---');

  await runTest('Customer Profile', 'Updates customer volume, average, count, and lastActive upon ingestion', () => {
    const custId = 'CUST-DYN-TEST';
    const initialAmount = 200;

    const res1 = db.ingestTransaction(
      {
        customerId: custId,
        accountNumber: 'ACCT-DYN-01',
        amount: initialAmount,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        merchantName: 'First Test Shop',
        merchantCategory: 'GROCERY',
        transactionType: 'CARD_PURCHASE',
        channel: 'WEB',
        sourceLocation: { city: 'Frankfurt', country: 'Germany', latitude: 50.1109, longitude: 8.6821 },
        deviceId: 'DEV-DYN-1',
        deviceType: 'MACOS',
        status: 'APPROVED',
      },
      { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
    );

    const cust = db.customers.get(custId);
    assert.ok(cust, 'Customer must exist in registry');
    const prevCount = cust.historicalTxnCount;
    const prevVol = cust.totalVolumeUSD;

    // Ingest second transaction with distinct amount 10 seconds later
    const secondAmount = 400;
    const futureTime = new Date(Date.now() + 10000).toISOString();

    db.ingestTransaction(
      {
        customerId: custId,
        accountNumber: 'ACCT-DYN-01',
        amount: secondAmount,
        currency: 'USD',
        timestamp: futureTime,
        merchantName: 'Second Unique Shop',
        merchantCategory: 'ELECTRONICS',
        transactionType: 'CARD_PURCHASE',
        channel: 'MOBILE_APP',
        deviceId: 'DEV-DYN-2',
        deviceType: 'IOS',
        sourceLocation: { city: 'Frankfurt', country: 'Germany', latitude: 50.1109, longitude: 8.6821 },
        status: 'APPROVED',
      },
      { id: 'TESTER', name: 'Unit Tester', role: 'ADMINISTRATOR' }
    );

    const updatedCust = db.customers.get(custId)!;
    assert.strictEqual(updatedCust.historicalTxnCount, prevCount + 1, 'Transaction count should increment');
    assert.strictEqual(updatedCust.totalVolumeUSD, prevVol + secondAmount, 'Total volume should accumulate');
    assert.ok(updatedCust.knownDevices.includes('DEV-DYN-2'), 'New device should be registered');
    assert.ok(updatedCust.topMerchants.includes('Second Unique Shop'), 'New merchant should be registered');
  });

  // --- SUITE 4: DETERMINISTIC FRAUD RULES EVALUATION ---
  console.log('\n--- Suite 4: Deterministic Fraud Rules Evaluation ---');

  const rulesEngine = new RulesEngine();

  await runTest('Rules Engine', 'RULE_GEO_LEAP triggers on implied speed > 850 km/h', () => {
    const cust: CustomerProfile = {
      customerId: 'CUST-GEO-TEST',
      accountNumber: 'ACCT-GEO',
      accountAgeDays: 300,
      tier: 'STANDARD',
      historicalTxnCount: 100,
      averageTxnAmount: 150,
      stdDevTxnAmount: 50,
      maxTxnAmount: 500,
      knownDevices: ['DEV-GEO-1'],
      frequentLocations: [{ city: 'London', country: 'United Kingdom' }],
      topMerchants: ['Tesco'],
      historicalAlertCount: 0,
      openCasesCount: 0,
      totalVolumeUSD: 15000,
      lastActive: new Date().toISOString(),
    };

    const priorTime = new Date('2026-11-06T10:00:00Z').toISOString();
    const currTime = new Date('2026-11-06T10:45:00Z').toISOString(); // 45 minutes later

    const priorTxn: Transaction = {
      id: 'TXN-PRIOR-GEO',
      customerId: cust.customerId,
      accountNumber: cust.accountNumber,
      amount: 45,
      currency: 'USD',
      timestamp: priorTime,
      merchantName: 'Tesco London',
      merchantCategory: 'GROCERY',
      transactionType: 'POS_PAYMENT',
      channel: 'POS_TERMINAL',
      sourceLocation: { city: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
      deviceId: 'DEV-GEO-1',
      deviceType: 'IOS',
      status: 'APPROVED',
    };

    const currentTxn: Transaction = {
      id: 'TXN-CURR-GEO',
      customerId: cust.customerId,
      accountNumber: cust.accountNumber,
      amount: 2500,
      currency: 'USD',
      timestamp: currTime,
      merchantName: 'Singapore Duty Free',
      merchantCategory: 'LUXURY_JEWELRY',
      transactionType: 'CARD_PURCHASE',
      channel: 'WEB',
      sourceLocation: { city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198 }, // 10,800 km away in 45m
      deviceId: 'DEV-GEO-2',
      deviceType: 'MACOS',
      status: 'APPROVED',
    };

    const matches = rulesEngine.evaluate(currentTxn, cust, [priorTxn], new Map());
    const geoMatch = matches.find((m) => m.ruleId === 'RULE_GEO_LEAP');
    assert.ok(geoMatch, 'RULE_GEO_LEAP must be triggered for London -> Singapore in 45 mins');
    assert.strictEqual(geoMatch?.severity, 'CRITICAL');
  });

  await runTest('Rules Engine', 'RULE_HIGH_AMOUNT triggers when amount > 3.5x customer baseline', () => {
    const cust: CustomerProfile = {
      customerId: 'CUST-AMT-TEST',
      accountNumber: 'ACCT-AMT',
      accountAgeDays: 180,
      tier: 'STANDARD',
      historicalTxnCount: 40,
      averageTxnAmount: 100,
      stdDevTxnAmount: 25,
      maxTxnAmount: 300,
      knownDevices: ['DEV-AMT-1'],
      frequentLocations: [{ city: 'New York', country: 'United States' }],
      topMerchants: ['Groceries'],
      historicalAlertCount: 0,
      openCasesCount: 0,
      totalVolumeUSD: 4000,
      lastActive: new Date().toISOString(),
    };

    const txn: Transaction = {
      id: 'TXN-HIGH-AMT',
      customerId: cust.customerId,
      accountNumber: cust.accountNumber,
      amount: 4200, // 42x average, Z-score (4200-100)/25 = 164
      currency: 'USD',
      timestamp: new Date().toISOString(),
      merchantName: 'High Value Electronics',
      merchantCategory: 'ELECTRONICS',
      transactionType: 'CARD_PURCHASE',
      channel: 'WEB',
      sourceLocation: { city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
      deviceId: 'DEV-AMT-1',
      deviceType: 'MACOS',
      status: 'APPROVED',
    };

    const matches = rulesEngine.evaluate(txn, cust, [], new Map());
    const match = matches.find((m) => m.ruleId === 'RULE_HIGH_AMOUNT');
    assert.ok(match, 'RULE_HIGH_AMOUNT must trigger for $4200 vs $100 average');
    assert.strictEqual(match?.severity, 'HIGH');
  });

  await runTest('Rules Engine', 'RULE_FAILED_BURST triggers on success following multiple declines', () => {
    const cust: CustomerProfile = {
      customerId: 'CUST-BURST-TEST',
      accountNumber: 'ACCT-BURST',
      accountAgeDays: 100,
      tier: 'STANDARD',
      historicalTxnCount: 20,
      averageTxnAmount: 200,
      stdDevTxnAmount: 50,
      maxTxnAmount: 600,
      knownDevices: ['DEV-BURST-1'],
      frequentLocations: [{ city: 'Toronto', country: 'Canada' }],
      topMerchants: ['Local Store'],
      historicalAlertCount: 0,
      openCasesCount: 0,
      totalVolumeUSD: 4000,
      lastActive: new Date().toISOString(),
    };

    const baseTime = Date.now();
    const history: Transaction[] = [
      {
        id: 'TXN-FAIL-1',
        customerId: cust.customerId,
        accountNumber: cust.accountNumber,
        amount: 50,
        currency: 'USD',
        timestamp: new Date(baseTime - 12 * 60 * 1000).toISOString(),
        merchantName: 'Gateway Probing',
        merchantCategory: 'ONLINE_RETAIL',
        transactionType: 'ONLINE_PAYMENT',
        channel: 'WEB',
        sourceLocation: { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
        deviceId: 'DEV-ATTACK',
        deviceType: 'MACOS',
        status: 'DECLINED',
      },
      {
        id: 'TXN-FAIL-2',
        customerId: cust.customerId,
        accountNumber: cust.accountNumber,
        amount: 150,
        currency: 'USD',
        timestamp: new Date(baseTime - 8 * 60 * 1000).toISOString(),
        merchantName: 'Gateway Probing',
        merchantCategory: 'ONLINE_RETAIL',
        transactionType: 'ONLINE_PAYMENT',
        channel: 'WEB',
        sourceLocation: { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
        deviceId: 'DEV-ATTACK',
        deviceType: 'MACOS',
        status: 'DECLINED',
      },
    ];

    const approvedTxn: Transaction = {
      id: 'TXN-BURST-SUCCESS',
      customerId: cust.customerId,
      accountNumber: cust.accountNumber,
      amount: 1800,
      currency: 'USD',
      timestamp: new Date(baseTime).toISOString(),
      merchantName: 'Target Online',
      merchantCategory: 'ONLINE_RETAIL',
      transactionType: 'ONLINE_PAYMENT',
      channel: 'WEB',
      sourceLocation: { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
      deviceId: 'DEV-ATTACK',
      deviceType: 'MACOS',
      status: 'APPROVED',
    };

    const matches = rulesEngine.evaluate(approvedTxn, cust, history, new Map());
    const burstMatch = matches.find((m) => m.ruleId === 'RULE_FAILED_BURST');
    assert.ok(burstMatch, 'RULE_FAILED_BURST must trigger after 2 preceding declines');
  });

  // --- SUITE 5: STATISTICAL ANOMALY & ISOLATION ENGINE ---
  console.log('\n--- Suite 5: Statistical Anomaly & Isolation Engine ---');

  const anomalyEngine = new AnomalyEngine();

  await runTest('Anomaly Engine', 'Computes accurate Z-score and velocity risk factors', () => {
    const cust: CustomerProfile = {
      customerId: 'CUST-ANOM-TEST',
      accountNumber: 'ACCT-ANOM',
      accountAgeDays: 365,
      tier: 'STANDARD',
      historicalTxnCount: 50,
      averageTxnAmount: 100,
      stdDevTxnAmount: 20,
      maxTxnAmount: 300,
      knownDevices: ['DEV-KNOWN-1'],
      frequentLocations: [{ city: 'Sydney', country: 'Australia' }],
      topMerchants: ['Woolworths'],
      historicalAlertCount: 0,
      openCasesCount: 0,
      totalVolumeUSD: 5000,
      lastActive: new Date().toISOString(),
    };

    const txn: Transaction = {
      id: 'TXN-ANOM-1',
      customerId: cust.customerId,
      accountNumber: cust.accountNumber,
      amount: 500, // Z-score = (500-100)/20 = 20.0
      currency: 'USD',
      timestamp: new Date().toISOString(),
      merchantName: 'Novel High Risk Desk',
      merchantCategory: 'CRYPTO_EXCHANGE',
      transactionType: 'CRYPTO_PURCHASE',
      channel: 'WEB',
      sourceLocation: { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
      deviceId: 'DEV-UNKNOWN-XYZ',
      deviceType: 'WINDOWS',
      status: 'APPROVED',
    };

    const details = anomalyEngine.evaluate(txn, cust, []);
    assert.strictEqual(details.amountZScore, 20.0, 'Z-score must equal 20.0');
    assert.strictEqual(details.amountDeviationRatio, 5.0, 'Deviation ratio must equal 5.0x');
    assert.strictEqual(details.isNewDevice, true, 'Device must be marked as novel');
    assert.strictEqual(details.isNewMerchant, true, 'Merchant must be marked as novel');
    assert.ok(details.isolationTreeAnomalyFactor > 0 && details.isolationTreeAnomalyFactor <= 1.0, 'Isolation factor must be in (0, 1]');
    assert.ok(details.anomalyScore >= 50, 'Composite anomaly score must be elevated for novel crypto large purchase');
  });

  // --- SUITE 6: TRANSPARENT RISK SCORING ENGINE ---
  console.log('\n--- Suite 6: Transparent Risk Scoring Engine ---');

  const scoringEngine = new ScoringEngine();

  await runTest('Scoring Engine', 'Strictly bounds scores to [0, 100] and maps classifications', () => {
    const txn: Transaction = {
      id: 'TXN-SCORE-TEST',
      customerId: 'CUST-SCORE',
      accountNumber: 'ACCT-SCORE',
      amount: 1000,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      merchantName: 'Test Merchant',
      merchantCategory: 'RETAIL',
      transactionType: 'CARD_PURCHASE',
      channel: 'WEB',
      sourceLocation: { city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
      deviceId: 'DEV-1',
      deviceType: 'MACOS',
      status: 'APPROVED',
    };

    // Assessment with critical rule
    const criticalRules = [
      {
        ruleId: 'RULE_GEO_LEAP',
        ruleName: 'Geographic Impossible Speed',
        severity: 'CRITICAL' as const,
        scoreContribution: 45,
        description: 'Test critical rule',
        evidence: {},
      },
    ];

    const anomalyDetails = {
      anomalyScore: 85,
      amountZScore: 5.2,
      amountDeviationRatio: 4.5,
      historicalAvgAmount: 200,
      timeSinceLastTxnMinutes: 2,
      isNewMerchant: true,
      isNewDevice: true,
      geoDistanceKm: 4500,
      travelVelocityKmH: 1200,
      isolationTreeAnomalyFactor: 0.85,
      subFactors: { amountRisk: 30, velocityRisk: 25, geoRisk: 25, deviceRisk: 10, merchantRisk: 10 },
    };

    const assessment = scoringEngine.assess(txn, criticalRules, anomalyDetails);
    assert.ok(assessment.overallScore >= 75 && assessment.overallScore <= 100, 'Critical rule enforces score floor >= 75');
    assert.ok(['HIGH', 'CRITICAL'].includes(assessment.riskClassification), 'Classification must be HIGH or CRITICAL');
    assert.strictEqual(assessment.requiresReview, true, 'requiresReview must be true for high/critical scores');
    assert.ok(assessment.contributingFactors.length > 0, 'Contributing factors must be documented');
  });

  // --- SUITE 7: CASE MANAGEMENT & RBAC STATE MACHINE ---
  console.log('\n--- Suite 7: Case Management & RBAC State Machine ---');

  await runTest('Case Management', 'Enforces RBAC: Fraud Analyst cannot confirm fraud or close case directly', () => {
    const testCase = db.createCase(
      {
        customerId: 'CUST-1002',
        transactionIds: ['TXN-2026-1002'],
        fraudCategory: 'TEST_RBAC',
        severity: 'HIGH',
      },
      { id: 'ANALYST-1', name: 'Sarah Chen', role: 'FRAUD_ANALYST' }
    );

    assert.throws(
      () => {
        db.updateCaseStatus(testCase.id, 'CONFIRMED_FRAUD', {
          id: 'ANALYST-1',
          name: 'Sarah Chen',
          role: 'FRAUD_ANALYST',
        });
      },
      /Permission Denied/,
      'Fraud Analyst must be prevented from confirming fraud'
    );
  });

  await runTest('Case Management', 'Senior Investigator can confirm fraud and record formal sanction', () => {
    const testCase = db.createCase(
      {
        customerId: 'CUST-1002',
        transactionIds: ['TXN-2026-1002'],
        fraudCategory: 'ACCOUNT_TAKEOVER',
        severity: 'CRITICAL',
      },
      { id: 'ANALYST-1', name: 'Sarah Chen', role: 'FRAUD_ANALYST' }
    );

    const resolved = db.resolveCase(
      testCase.id,
      {
        finalStatus: 'CONFIRMED_FRAUD',
        actionTaken: 'ACCOUNT_RESTRICTED',
        resolutionReason: 'Investigator confirmed unauthorized password reset and IP hijacking.',
      },
      { id: 'SR-INV-1', name: 'Marcus Vance', role: 'SENIOR_INVESTIGATOR' }
    );

    assert.strictEqual(resolved.status, 'CONFIRMED_FRAUD');
    assert.strictEqual(resolved.resolution?.actionTaken, 'ACCOUNT_RESTRICTED');
    assert.ok(resolved.resolution?.resolutionReason.includes('unauthorized password reset'));
  });

  await runTest('Case Management', 'Closed cases cannot be modified without Administrator override', () => {
    const testCase = db.createCase(
      {
        customerId: 'CUST-1003',
        transactionIds: ['TXN-2026-1003'],
        fraudCategory: 'TEST_CLOSED',
        severity: 'LOW',
      },
      { id: 'ADMIN-1', name: 'Elena Rostova', role: 'ADMINISTRATOR' }
    );

    // Close the case
    db.updateCaseStatus(testCase.id, 'CLOSED', {
      id: 'ADMIN-1',
      name: 'Elena Rostova',
      role: 'ADMINISTRATOR',
    });

    // Fraud Analyst attempting to modify closed case
    assert.throws(
      () => {
        db.updateCaseStatus(testCase.id, 'UNDER_INVESTIGATION', {
          id: 'ANALYST-1',
          name: 'Sarah Chen',
          role: 'FRAUD_ANALYST',
        });
      },
      /Illegal Transition/,
      'Analyst cannot modify a closed case'
    );
  });

  // --- SUITE 8: APPEND-ONLY AUDIT LEDGER ---
  console.log('\n--- Suite 8: Append-Only Audit Ledger ---');

  await runTest('Audit Ledger', 'Records immutable audit trail with actor, entity, and diff payload', () => {
    const initialCount = db.auditEvents.length;
    const testReason = 'Compliance audit check for ISO/IEC financial integrity.';

    const event = db.recordAudit(
      { id: 'AUDITOR-1', name: 'David O’Connor', role: 'AUDITOR' },
      'COMPLIANCE_REVIEW_COMPLETED',
      'AUDIT',
      'AUD-TEST-REC',
      {
        previousState: { complianceStatus: 'PENDING' },
        newState: { complianceStatus: 'PASSED' },
        reason: testReason,
      }
    );

    assert.strictEqual(db.auditEvents.length, initialCount + 1, 'Audit log count must increase by 1');
    assert.strictEqual(db.auditEvents[0].id, event.id, 'New event must be prepended');
    assert.strictEqual(db.auditEvents[0].action, 'COMPLIANCE_REVIEW_COMPLETED');
    assert.strictEqual(db.auditEvents[0].reason, testReason);
  });

  // --- SUITE 9: DATABASE FILE PERSISTENCE & RECOVERY ---
  console.log('\n--- Suite 9: Database File Persistence & Snapshot Recovery ---');

  await runTest('Persistence', 'Persists records to disk and reloads identical state into fresh Database instance', () => {
    const dataFilePath = db.getDataFilePath();
    assert.ok(fs.existsSync(dataFilePath), `Snapshot file must exist at ${dataFilePath}`);

    // Verify file size > 0
    const stats = fs.statSync(dataFilePath);
    assert.ok(stats.size > 1000, `Snapshot file size must be substantial (actual: ${stats.size} bytes)`);

    // Ingest a unique sentinel transaction
    const uniqueTxId = `TXN-PERSIST-TEST-${Date.now()}`;
    db.ingestTransaction(
      {
        id: uniqueTxId,
        customerId: 'CUST-PERSIST',
        accountNumber: 'ACCT-PERSIST',
        amount: 876.54,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        merchantName: 'Persistence Check Depot',
        merchantCategory: 'ELECTRONICS',
        transactionType: 'CARD_PURCHASE',
        channel: 'WEB',
        sourceLocation: { city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
        deviceId: 'DEV-PERSIST-1',
        deviceType: 'MACOS',
        status: 'APPROVED',
      },
      { id: 'SYSTEM', name: 'System Persistence Tester', role: 'ADMINISTRATOR' }
    );

    // Instantiate a separate secondary Database instance loading from the same directory
    const secondaryDb = new Database(path.dirname(dataFilePath));
    const recoveredTxn = secondaryDb.transactions.find((t) => t.id === uniqueTxId);
    assert.ok(recoveredTxn, 'Secondary Database instance must recover transaction from disk');
    assert.strictEqual(recoveredTxn?.amount, 876.54, 'Amount must match exactly');
    assert.strictEqual(recoveredTxn?.merchantName, 'Persistence Check Depot');
  });

  // --- SUITE 10: INTEGRATION TESTS WITH LIVE REST API ENDPOINTS ---
  console.log('\n--- Suite 10: Integration Tests with Live REST API Endpoints ---');

  const BASE_URL = 'http://localhost:3000';

  await runTest('REST API', 'GET /health returns 200 and service identifier', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'Sentinel Fraud Detection Engine');
  });

  await runTest('REST API', 'GET /api/overview aggregates calculated financial crime metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/overview`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.totalTransactions > 1000, 'Must have > 1,000 transactions');
    assert.ok(data.totalMonitoredVolumeUSD > 500000, 'Must have significant monitored volume');
    assert.ok(Array.isArray(data.riskDistribution), 'Must include risk distribution breakdown');
    assert.ok(Array.isArray(data.timeSeriesActivity), 'Must include time-series activity');
  });

  await runTest('REST API', 'GET /api/transactions supports search, filter, and pagination', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions?page=1&pageSize=10`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.transactions.length, 10);
    assert.ok(data.total > 1000);
    assert.strictEqual(data.page, 1);
  });

  await runTest('REST API', 'POST /api/fraud/analyze validates payload and returns deterministic assessment', async () => {
    // Valid analyze call
    const res = await fetch(`${BASE_URL}/api/fraud/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-1002',
        amount: 5500.0,
        merchantName: 'Binance OTC Gateway',
        merchantCategory: 'CRYPTO_EXCHANGE',
        transactionType: 'CRYPTO_PURCHASE',
        channel: 'WEB',
        sourceLocation: { city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
        deviceId: 'DEV-UNKNOWN-ANALYZE',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.assessment.overallScore >= 0 && data.assessment.overallScore <= 100);
    assert.ok(Array.isArray(data.matchedRules));
    assert.ok(data.anomaly.anomalyScore !== undefined);

    // Invalid analyze call (missing amount)
    const errRes = await fetch(`${BASE_URL}/api/fraud/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: 'CUST-1002', amount: -50 }),
    });
    assert.strictEqual(errRes.status, 400);
  });

  await runTest('REST API', 'POST /api/evaluation/run calculates confusion matrix, precision, and recall', async () => {
    const res = await fetch(`${BASE_URL}/api/evaluation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 60 }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.testResults.summary.failed, 0, 'All in-app invariant tests must pass');
    assert.ok(data.modelReport.metrics.precision > 0, 'Precision must be > 0');
    assert.ok(data.modelReport.metrics.recall > 0, 'Recall must be > 0');
    assert.ok(data.modelReport.confusionMatrix.truePositives > 0, 'Must identify true positives');
  });

  // --- FINAL SUMMARY REPORT ---
  console.log('\n======================================================');
  console.log(`   TEST EXECUTION SUMMARY: ${report.passed} PASSED, ${report.failed} FAILED`);
  console.log('======================================================\n');

  if (report.failed > 0) {
    console.error(`FAILED: ${report.failed} tests failed.`);
    process.exit(1);
  } else {
    console.log(`SUCCESS: All ${report.passed} tests passed cleanly.`);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
