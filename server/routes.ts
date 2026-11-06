import express, { Request, Response } from 'express';
import { db } from './db.ts';
import { generateInvestigationExplanation } from './gemini.ts';
import { evaluator } from './evaluator.ts';
import { UserRole } from './models.ts';

const router = express.Router();

// Current active session mock user (defaults to FRAUD_ANALYST, switchable via UI header)
let activeUser = {
  id: 'USR-ANALYST-1',
  name: 'Sarah Chen',
  role: 'FRAUD_ANALYST' as UserRole,
  badgeNumber: 'FA-4891',
};

// 1. Auth & Role Switcher
router.get('/auth/current-user', (req: Request, res: Response) => {
  res.json({
    user: activeUser,
    availableRoles: [
      { role: 'FRAUD_ANALYST', title: 'Fraud Analyst (Sarah Chen)', description: 'Triage alerts, log investigative notes, recommend case progression' },
      { role: 'SENIOR_INVESTIGATOR', title: 'Senior Investigator (Marcus Vance)', description: 'Confirm fraud, restrict accounts, manage escalations' },
      { role: 'ADMINISTRATOR', title: 'System Administrator (Elena Rostova)', description: 'Tune detection rule thresholds, weights, and run regression tests' },
      { role: 'AUDITOR', title: 'Compliance Auditor (David K. O’Connor)', description: 'Read-only access to transaction telemetry and tamper-evident audit logs' },
    ],
  });
});

router.post('/auth/switch-role', (req: Request, res: Response) => {
  const { role } = req.body;
  const targetUser = db.users.find((u) => u.role === role);
  if (targetUser) {
    activeUser = {
      id: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
      badgeNumber: targetUser.badgeNumber,
    };
    db.recordAudit(activeUser, 'USER_SWITCHED_ROLE', 'SYSTEM', activeUser.id, {
      newState: { newRole: activeUser.role },
      reason: 'User toggled active operational role in platform header.',
    });
    return res.json({ success: true, user: activeUser });
  }
  return res.status(400).json({ error: `Invalid role specified: ${role}` });
});

// 2. Executive Overview
router.get('/overview', (req: Request, res: Response) => {
  try {
    const metrics = db.getOverviewMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to aggregate overview' });
  }
});

// 3. Transactions
router.get('/transactions', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const search = req.query.search as string;
    const riskClassification = req.query.riskClassification as string;
    const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined;
    const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined;
    const transactionType = req.query.transactionType as string;
    const channel = req.query.channel as string;
    const customerId = req.query.customerId as string;
    const status = req.query.status as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = db.getTransactions({
      page,
      pageSize,
      search,
      riskClassification,
      minAmount,
      maxAmount,
      transactionType,
      channel,
      customerId,
      status,
      sortBy,
      sortOrder,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions/:id', (req: Request, res: Response) => {
  const result = db.getTransactionById(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Transaction ${req.params.id} not found.` });
  }
  res.json(result);
});

router.post('/transactions', (req: Request, res: Response) => {
  try {
    const result = db.ingestTransaction(req.body, activeUser);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// CSV / Batch Upload
router.post('/transactions/upload', (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Expected JSON payload with a non-empty transactions array.' });
    }
    const result = db.ingestBatch(transactions, activeUser);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Fraud Detection & Alerts
router.get('/fraud/alerts', (req: Request, res: Response) => {
  try {
    const result = db.getTransactions({
      riskClassification: (req.query.level as string) || undefined,
      pageSize: 50,
      sortBy: 'riskScore',
      sortOrder: 'desc',
    });
    // Filter alerts >= 60 score
    const alertsOnly = result.transactions.filter(
      (t) => t.riskAssessment && t.riskAssessment.overallScore >= 60
    );
    res.json({ alerts: alertsOnly, total: alertsOnly.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fraud/analyze', (req: Request, res: Response) => {
  try {
    const txn = req.body;
    if (!txn || !txn.customerId || typeof txn.customerId !== 'string' || !txn.customerId.trim()) {
      return res.status(400).json({ error: 'Validation Error: customerId is required.' });
    }
    if (
      txn.amount === undefined ||
      txn.amount === null ||
      typeof txn.amount !== 'number' ||
      isNaN(txn.amount) ||
      !isFinite(txn.amount) ||
      txn.amount <= 0
    ) {
      return res.status(400).json({ error: 'Validation Error: amount must be a positive finite number.' });
    }

    const cust = db.customers.get(txn.customerId) || {
      customerId: txn.customerId,
      accountNumber: txn.accountNumber || 'ACCT-DEMO-991',
      accountAgeDays: 90,
      tier: 'STANDARD',
      historicalTxnCount: 20,
      averageTxnAmount: 250,
      stdDevTxnAmount: 120,
      maxTxnAmount: 1500,
      knownDevices: txn.deviceId ? [txn.deviceId] : [],
      frequentLocations: txn.sourceLocation ? [txn.sourceLocation] : [],
      topMerchants: txn.merchantName ? [txn.merchantName] : [],
      historicalAlertCount: 0,
      openCasesCount: 0,
      totalVolumeUSD: 5000,
      lastActive: new Date().toISOString(),
    };

    const history = db.transactions.filter((t) => t.customerId === txn.customerId);
    const matchedRules = db.rulesEngine.evaluate(txn, cust, history, db.getDeviceCustomerMap());
    const anomaly = db.anomalyEngine.evaluate(txn, cust, history);
    const assessment = db.scoringEngine.assess(txn, matchedRules, anomaly);

    res.json({ assessment, matchedRules, anomaly });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 5. Fraud Rules Configuration
router.get('/fraud/rules', (req: Request, res: Response) => {
  res.json({ rules: db.rulesEngine.getRules(), scoringWeights: db.scoringEngine.getWeights() });
});

router.patch('/fraud/rules/:id', (req: Request, res: Response) => {
  if (activeUser.role !== 'ADMINISTRATOR') {
    return res.status(403).json({
      error: 'Permission Denied: Only Administrators can modify detection rule logic, weights, and thresholds.',
    });
  }

  const updated = db.rulesEngine.updateRule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `Rule ${req.params.id} not found.` });
  }

  db.recordAudit(activeUser, 'RULE_MODIFIED', 'RULE', req.params.id, {
    newState: updated,
    reason: req.body.reason || 'Administrator tuned rule thresholds.',
  });

  // Re-evaluate database
  db.recalculateAllAssessments();

  res.json({ rule: updated });
});

// 6. Customers
router.get('/customers', (req: Request, res: Response) => {
  const search = (req.query.search as string || '').toLowerCase();
  let list = Array.from(db.customers.values());
  if (search) {
    list = list.filter(
      (c) =>
        c.customerId.toLowerCase().includes(search) ||
        c.accountNumber.toLowerCase().includes(search) ||
        c.tier.toLowerCase().includes(search)
    );
  }
  res.json({ customers: list.slice(0, 100), total: list.length });
});

router.get('/customers/:id', (req: Request, res: Response) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: `Customer ${req.params.id} not found.` });
  }

  const transactions = db.transactions
    .filter((t) => t.customerId === req.params.id)
    .map((t) => ({ ...t, riskAssessment: db.assessments.get(t.id) }));

  const cases = Array.from(db.cases.values()).filter((c) => c.customerId === req.params.id);

  res.json({ customer, transactions, cases });
});

// 7. Investigation Cases
router.get('/cases', (req: Request, res: Response) => {
  const { status, severity, assignedInvestigator, customerId } = req.query;
  const cases = db.getCases({
    status: status as string,
    severity: severity as string,
    assignedInvestigator: assignedInvestigator as string,
    customerId: customerId as string,
  });
  res.json({ cases, total: cases.length });
});

router.get('/cases/:id', (req: Request, res: Response) => {
  const caseObj = db.getCaseById(req.params.id);
  if (!caseObj) {
    return res.status(404).json({ error: `Case ${req.params.id} not found.` });
  }

  // Enrich with transaction details
  const enrichedTransactions = caseObj.transactionIds.map((id) => {
    const txn = db.transactions.find((t) => t.id === id);
    return {
      transaction: txn,
      riskAssessment: db.assessments.get(id),
    };
  });

  const customer = db.customers.get(caseObj.customerId);

  res.json({ case: caseObj, transactions: enrichedTransactions, customer });
});

router.post('/cases', (req: Request, res: Response) => {
  if (activeUser.role === 'AUDITOR') {
    return res.status(403).json({ error: 'Permission Denied: Auditors cannot create cases.' });
  }
  try {
    const newCase = db.createCase(req.body, activeUser);
    res.status(201).json({ case: newCase });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/cases/:id', (req: Request, res: Response) => {
  try {
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    const updated = db.updateCaseStatus(req.params.id, status, activeUser, reason);
    res.json({ case: updated });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

router.post('/cases/:id/notes', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required.' });
    }
    const note = db.addCaseNote(req.params.id, content, activeUser);
    res.status(201).json({ note });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

router.post('/cases/:id/assign', (req: Request, res: Response) => {
  try {
    const { investigatorName } = req.body;
    if (!investigatorName) {
      return res.status(400).json({ error: 'investigatorName is required.' });
    }
    const updated = db.assignInvestigator(req.params.id, investigatorName, activeUser);
    res.json({ case: updated });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

router.post('/cases/:id/resolve', (req: Request, res: Response) => {
  try {
    const { actionTaken, resolutionReason, finalStatus } = req.body;
    if (!actionTaken || !resolutionReason || !finalStatus) {
      return res.status(400).json({
        error: 'Missing required resolution fields: actionTaken, resolutionReason, finalStatus.',
      });
    }
    const resolved = db.resolveCase(
      req.params.id,
      { actionTaken, resolutionReason, finalStatus },
      activeUser
    );
    res.json({ case: resolved });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

// 8. Explainable AI Investigation (Server-Side Gemini 3.8 Flash)
router.post('/ai/investigation-summary', async (req: Request, res: Response) => {
  const { transactionId } = req.body;
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId is required.' });
  }

  const txnDetail = db.getTransactionById(transactionId);
  if (!txnDetail) {
    return res.status(404).json({ error: `Transaction ${transactionId} not found.` });
  }

  try {
    const summary = await generateInvestigationExplanation(
      txnDetail.transaction,
      txnDetail.customer,
      txnDetail.riskAssessment,
      txnDetail.recentTransactions
    );

    // Audit log
    db.recordAudit(activeUser, 'AI_INVESTIGATION_SUMMARY_GENERATED', 'TRANSACTION', transactionId, {
      newState: { confidence: summary.confidenceLevel, model: summary.model },
      reason: 'Investigator requested explainable AI advisory assessment.',
    });

    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate AI explanation' });
  }
});

// 9. Audit Logs
router.get('/audit-logs', (req: Request, res: Response) => {
  const { entityType, actorRole, action, limit } = req.query;
  let logs = [...db.auditEvents];

  if (entityType) {
    logs = logs.filter((l) => l.entityType === entityType);
  }
  if (actorRole) {
    logs = logs.filter((l) => l.actorRole === actorRole);
  }
  if (action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes((action as string).toLowerCase()));
  }

  const max = parseInt(limit as string) || 100;
  res.json({ logs: logs.slice(0, max), total: logs.length });
});

// 10. Automated Tests & ML Evaluation
router.post('/evaluation/run', (req: Request, res: Response) => {
  try {
    const threshold = req.body.threshold ? parseInt(req.body.threshold) : 60;
    const testResults = evaluator.runAutomatedTests();
    const modelReport = evaluator.evaluateModel(threshold);

    db.recordAudit(activeUser, 'EVALUATION_SUITE_EXECUTED', 'SYSTEM', 'EVAL-RUN', {
      newState: {
        testsPassed: testResults.summary.passed,
        f1Score: modelReport.metrics.f1Score,
        precision: modelReport.metrics.precision,
        recall: modelReport.metrics.recall,
      },
      reason: 'Administrator triggered model evaluation and automated regression test suite.',
    });

    res.json({ testResults, modelReport });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. System Reset / Re-seed Demo
router.post('/system/reset', (req: Request, res: Response) => {
  if (activeUser.role !== 'ADMINISTRATOR') {
    return res.status(403).json({ error: 'Permission Denied: Only Administrators can reset demo state.' });
  }
  db.seedInitialData();
  res.json({ success: true, message: 'Synthetic dataset re-seeded successfully.' });
});

export default router;
