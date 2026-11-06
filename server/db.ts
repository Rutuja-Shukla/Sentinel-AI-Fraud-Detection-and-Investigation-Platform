import fs from 'fs';
import path from 'path';
import {
  AuditEvent,
  CaseNote,
  CustomerProfile,
  GeoLocation,
  InvestigationCase,
  RiskAssessment,
  SystemUser,
  Transaction,
  UserRole,
} from './models.ts';
import { RulesEngine } from './rules.ts';
import { AnomalyEngine } from './anomaly.ts';
import { ScoringEngine } from './scoring.ts';

// Known world financial hub locations with exact coordinates
export const CITIES: GeoLocation[] = [
  { city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { city: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
  { city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
  { city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { city: 'Frankfurt', country: 'Germany', latitude: 50.1109, longitude: 8.6821 },
  { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
  { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
  { city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  { city: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194 },
  { city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708 },
  { city: 'Hong Kong', country: 'Hong Kong', latitude: 22.3193, longitude: 114.1694 },
  { city: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417 },
];

export const MERCHANTS_BY_CATEGORY: Record<string, string[]> = {
  GROCERY: ['Whole Foods Market', 'Kroger Fresh', 'Trader Joe’s', 'Sainsbury’s Superstore', 'Tesco Express'],
  ELECTRONICS: ['Apple Store Fifth Ave', 'Best Buy Megastore', 'B&H Photo Video', 'Micro Center'],
  AIRLINE: ['Delta Air Lines', 'British Airways', 'Singapore Airlines', 'Lufthansa Systems'],
  CRYPTO_EXCHANGE: ['Binance Global Portal', 'Coinbase Pro Prime', 'Kraken OTC Desk', 'Bitfinex Gateway'],
  FOREIGN_WIRE: ['Apex Global Swift Wire', 'Euroclear Remittance', 'Pan-Asia Settlement Hub'],
  ONLINE_RETAIL: ['Amazon Marketplace', 'Target Online', 'Walmart.com Direct', 'ASOS Fashion Online'],
  DINING: ['Nobu Downtown', 'Starbucks Reserve', 'Pret A Manger', 'Chipotle Mexican Grill'],
  LUXURY_JEWELRY: ['Cartier New York', 'Tiffany & Co. Flagship', 'Rolex Boutique Geneve'],
};

export class Database {
  public users: SystemUser[] = [];
  public customers: Map<string, CustomerProfile> = new Map();
  public transactions: Transaction[] = [];
  public assessments: Map<string, RiskAssessment> = new Map();
  public cases: Map<string, InvestigationCase> = new Map();
  public auditEvents: AuditEvent[] = [];

  public rulesEngine: RulesEngine;
  public anomalyEngine: AnomalyEngine;
  public scoringEngine: ScoringEngine;

  private deviceToCustomerMap: Map<string, Set<string>> = new Map();
  private dataFilePath: string;

  constructor(storageDir?: string) {
    this.rulesEngine = new RulesEngine();
    this.anomalyEngine = new AnomalyEngine();
    this.scoringEngine = new ScoringEngine();

    const dir = storageDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.warn('Could not create data dir, using ephemeral memory:', e);
      }
    }
    this.dataFilePath = path.join(dir, 'sentinel_store.json');

    this.initializeDefaultUsers();
    const loaded = this.loadFromFile();
    if (!loaded || this.transactions.length === 0) {
      this.seedInitialData();
    }
  }

  public getDeviceCustomerMap(): Map<string, Set<string>> {
    return this.deviceToCustomerMap;
  }

  public getDataFilePath(): string {
    return this.dataFilePath;
  }

  public persist(): void {
    this.saveToFile();
  }

  public saveToFile(): void {
    try {
      const payload = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        customers: Array.from(this.customers.values()),
        transactions: this.transactions,
        assessments: Array.from(this.assessments.entries()),
        cases: Array.from(this.cases.values()),
        auditEvents: this.auditEvents,
        deviceToCustomer: Array.from(this.deviceToCustomerMap.entries()).map(([d, set]) => [d, Array.from(set)]),
        rules: this.rulesEngine.getRules(),
        scoringWeights: this.scoringEngine.getWeights(),
      };
      const tmpPath = `${this.dataFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dataFilePath);
    } catch (err) {
      console.warn('[Database] Failed to persist data to disk:', err);
    }
  }

  public loadFromFile(): boolean {
    try {
      if (!fs.existsSync(this.dataFilePath)) return false;
      const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
      if (!raw || !raw.trim()) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.transactions) || !Array.isArray(data.customers)) return false;

      this.customers.clear();
      for (const c of data.customers) {
        this.customers.set(c.customerId, c);
      }

      this.transactions = data.transactions;

      this.assessments.clear();
      if (Array.isArray(data.assessments)) {
        for (const [k, v] of data.assessments) {
          this.assessments.set(k, v);
        }
      }

      this.cases.clear();
      if (Array.isArray(data.cases)) {
        for (const c of data.cases) {
          this.cases.set(c.id, c);
        }
      }

      this.auditEvents = Array.isArray(data.auditEvents) ? data.auditEvents : [];

      this.deviceToCustomerMap.clear();
      if (Array.isArray(data.deviceToCustomer)) {
        for (const [d, custs] of data.deviceToCustomer) {
          this.deviceToCustomerMap.set(d, new Set(custs));
        }
      }

      if (Array.isArray(data.rules)) {
        for (const r of data.rules) {
          this.rulesEngine.updateRule(r.id, r);
        }
      }

      if (data.scoringWeights) {
        this.scoringEngine.setWeights(data.scoringWeights);
      }

      return true;
    } catch (err) {
      console.warn('[Database] Failed to load store from disk, falling back to seed:', err);
      return false;
    }
  }

  private initializeDefaultUsers() {
    this.users = [
      {
        id: 'USR-ANALYST-1',
        name: 'Sarah Chen',
        email: 's.chen@sentinel.fintech.bank',
        role: 'FRAUD_ANALYST',
        badgeNumber: 'FA-4891',
      },
      {
        id: 'USR-SR-INV-1',
        name: 'Marcus Vance',
        email: 'm.vance@sentinel.fintech.bank',
        role: 'SENIOR_INVESTIGATOR',
        badgeNumber: 'SI-1024',
      },
      {
        id: 'USR-ADMIN-1',
        name: 'Elena Rostova',
        email: 'e.rostova@sentinel.fintech.bank',
        role: 'ADMINISTRATOR',
        badgeNumber: 'AD-0001',
      },
      {
        id: 'USR-AUDITOR-1',
        name: 'David K. O’Connor',
        email: 'd.oconnor@sentinel.fintech.bank',
        role: 'AUDITOR',
        badgeNumber: 'AU-9912',
      },
    ];
  }

  public recordAudit(
    actor: { id: string; name: string; role: UserRole },
    action: string,
    entityType: 'TRANSACTION' | 'CASE' | 'RULE' | 'CUSTOMER' | 'SYSTEM' | 'AUDIT',
    entityId: string,
    details?: { previousState?: any; newState?: any; reason?: string }
  ): AuditEvent {
    const event: AuditEvent = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      previousState: details?.previousState,
      newState: details?.newState,
      reason: details?.reason,
      ipAddress: '10.240.14.82', // Sentinel internal gateway
    };

    // Append-only
    this.auditEvents.unshift(event);
    if (this.auditEvents.length > 5000) {
      this.auditEvents.pop();
    }
    this.persist();
    return event;
  }

  /**
   * Seed realistic enterprise dataset: 120 customers, 1,200+ transactions
   */
  public seedInitialData(): void {
    this.customers.clear();
    this.transactions = [];
    this.assessments.clear();
    this.cases.clear();
    this.auditEvents = [];
    this.deviceToCustomerMap.clear();

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Generate 120 realistic synthetic customers
    for (let i = 1; i <= 120; i++) {
      const custId = `CUST-${(1000 + i).toString()}`;
      const primaryCity = CITIES[i % CITIES.length];
      const secondaryCity = CITIES[(i + 3) % CITIES.length];
      const tier: 'STANDARD' | 'PREMIUM' | 'COMMERCIAL' =
        i % 8 === 0 ? 'COMMERCIAL' : i % 3 === 0 ? 'PREMIUM' : 'STANDARD';

      const avgAmount = tier === 'COMMERCIAL' ? 4200 : tier === 'PREMIUM' ? 850 : 160;
      const stdDev = avgAmount * 0.45;
      const deviceId = `DEV-${(10000 + (i % 70)).toString(16).toUpperCase()}-${(i * 31) % 999}`;

      const customer: CustomerProfile = {
        customerId: custId,
        accountNumber: `ACCT-${(7000 + i).toString()}-****-${(4000 + i).toString()}`,
        accountAgeDays: 120 + (i * 23) % 1800,
        tier,
        historicalTxnCount: 45 + (i * 7) % 350,
        averageTxnAmount: Math.round(avgAmount),
        stdDevTxnAmount: Math.round(stdDev),
        maxTxnAmount: Math.round(avgAmount * 3.8),
        knownDevices: [deviceId, `DEV-SEC-${(20000 + i).toString(16).toUpperCase()}`],
        frequentLocations: [
          { city: primaryCity.city, country: primaryCity.country },
          { city: secondaryCity.city, country: secondaryCity.country },
        ],
        topMerchants: [
          MERCHANTS_BY_CATEGORY.GROCERY[i % MERCHANTS_BY_CATEGORY.GROCERY.length],
          MERCHANTS_BY_CATEGORY.ONLINE_RETAIL[i % MERCHANTS_BY_CATEGORY.ONLINE_RETAIL.length],
          MERCHANTS_BY_CATEGORY.DINING[i % MERCHANTS_BY_CATEGORY.DINING.length],
        ],
        historicalAlertCount: i % 11 === 0 ? 3 : i % 5 === 0 ? 1 : 0,
        openCasesCount: 0,
        totalVolumeUSD: Math.round(avgAmount * (45 + ((i * 7) % 350))),
        lastActive: new Date(now - ((i * 47) % 86400000)).toISOString(),
      };

      this.customers.set(custId, customer);

      // Track device association
      for (const d of customer.knownDevices) {
        if (!this.deviceToCustomerMap.has(d)) {
          this.deviceToCustomerMap.set(d, new Set());
        }
        this.deviceToCustomerMap.get(d)!.add(custId);
      }
    }

    // Add deliberate multi-account device syndicate for RULE_DEVICE_FINGERPRINT
    const syndicateDeviceId = 'DEV-SYNDICATE-X89';
    const syndicateCustomers = ['CUST-1002', 'CUST-1014', 'CUST-1033', 'CUST-1051'];
    this.deviceToCustomerMap.set(syndicateDeviceId, new Set(syndicateCustomers));
    for (const cId of syndicateCustomers) {
      const c = this.customers.get(cId);
      if (c && !c.knownDevices.includes(syndicateDeviceId)) {
        c.knownDevices.push(syndicateDeviceId);
      }
    }

    // Now generate 1,200 transactions across the 30-day window
    let txCounter = 1000;
    const allTxns: Transaction[] = [];

    // Helper to generate transaction
    const createTxn = (
      params: Partial<Transaction> & {
        customerId: string;
        amount: number;
        timestamp: string;
        merchantName: string;
        merchantCategory: string;
        location: GeoLocation;
        type: Transaction['transactionType'];
        channel: Transaction['channel'];
        deviceId: string;
        status: Transaction['status'];
      }
    ): Transaction => {
      txCounter++;
      const cust = this.customers.get(params.customerId)!;
      return {
        id: `TXN-2026-${txCounter}`,
        customerId: params.customerId,
        accountNumber: cust.accountNumber,
        amount: Number(params.amount.toFixed(2)),
        currency: 'USD',
        timestamp: params.timestamp,
        merchantName: params.merchantName,
        merchantCategory: params.merchantCategory,
        transactionType: params.type,
        channel: params.channel,
        sourceLocation: params.location,
        destinationLocation: params.destinationLocation,
        deviceId: params.deviceId,
        deviceType:
          params.channel === 'MOBILE_APP'
            ? 'IOS'
            : params.channel === 'WEB'
            ? 'MACOS'
            : 'WINDOWS',
        status: params.status,
        isUploaded: false,
        isGroundTruthFraud: params.isGroundTruthFraud ?? false,
        groundTruthReason: params.groundTruthReason,
      };
    };

    // 1. Generate regular baseline transactions for all customers (1,050 normal transactions)
    for (let day = 29; day >= 0; day--) {
      const dayStartTime = now - day * DAY_MS;

      for (let cIdx = 1; cIdx <= 120; cIdx++) {
        // Probability of transaction on this day
        if ((cIdx + day) % 3 === 0 || day === 0) {
          const custId = `CUST-${(1000 + cIdx).toString()}`;
          const cust = this.customers.get(custId)!;
          const loc = CITIES[cIdx % CITIES.length];
          const mCatKeys = Object.keys(MERCHANTS_BY_CATEGORY);
          const cat = mCatKeys[(cIdx + day) % (mCatKeys.length - 2)]; // normal categories
          const merchant = MERCHANTS_BY_CATEGORY[cat][day % MERCHANTS_BY_CATEGORY[cat].length];

          // Amount with normal distribution variation around average
          const variance = (Math.sin(cIdx * 17 + day * 13) * 0.4 + 1.0);
          const amount = Math.max(12, cust.averageTxnAmount * variance);
          const txTime = new Date(dayStartTime + ((cIdx * 73921) % 75000000)).toISOString();

          allTxns.push(
            createTxn({
              customerId: custId,
              amount,
              timestamp: txTime,
              merchantName: merchant,
              merchantCategory: cat,
              location: loc,
              type: amount > 1500 ? 'WIRE_TRANSFER' : 'CARD_PURCHASE',
              channel: cIdx % 2 === 0 ? 'MOBILE_APP' : 'WEB',
              deviceId: cust.knownDevices[0],
              status: 'APPROVED',
              isGroundTruthFraud: false,
            })
          );
        }
      }
    }

    // 2. Add realistic, labelled fraud patterns for evaluation ground-truth dataset (150 high-fidelity attack transactions)
    // Pattern A: Impossible Geographic Leap Attack (e.g., London to Singapore in 35 mins)
    {
      const victim = 'CUST-1005';
      const cust = this.customers.get(victim)!;
      const baseTime = now - 2 * DAY_MS;

      // Legitimate transaction in London
      allTxns.push(
        createTxn({
          customerId: victim,
          amount: 85.5,
          timestamp: new Date(baseTime).toISOString(),
          merchantName: 'Tesco Express London',
          merchantCategory: 'GROCERY',
          location: CITIES[1], // London
          type: 'POS_PAYMENT',
          channel: 'POS_TERMINAL',
          deviceId: cust.knownDevices[0],
          status: 'APPROVED',
          isGroundTruthFraud: false,
        })
      );

      // Fraudulent leap to Singapore 45 minutes later with high value
      allTxns.push(
        createTxn({
          customerId: victim,
          amount: 4850.0,
          timestamp: new Date(baseTime + 45 * 60 * 1000).toISOString(),
          merchantName: 'Binance Global Portal',
          merchantCategory: 'CRYPTO_EXCHANGE',
          location: CITIES[2], // Singapore (6,700 miles away in 45 min)
          type: 'CRYPTO_PURCHASE',
          channel: 'WEB',
          deviceId: 'DEV-UNKNOWN-TOR-77',
          status: 'APPROVED',
          isGroundTruthFraud: true,
          groundTruthReason: 'GEO_LEAP_ATTACK: Implied 14,000+ km/h impossible travel to crypto exchange',
        })
      );
    }

    // Pattern B: Card Testing / Brute Force Burst (Preceding declines followed by large purchase)
    {
      const victim = 'CUST-1018';
      const cust = this.customers.get(victim)!;
      const baseTime = now - 1 * DAY_MS + 2 * 3600 * 1000;

      // 3 failed authentication declines
      for (let f = 1; f <= 3; f++) {
        allTxns.push(
          createTxn({
            customerId: victim,
            amount: 10.0 * f,
            timestamp: new Date(baseTime + f * 3 * 60 * 1000).toISOString(),
            merchantName: 'Online Retail Gateway Test',
            merchantCategory: 'ONLINE_RETAIL',
            location: CITIES[0],
            type: 'ONLINE_PAYMENT',
            channel: 'WEB',
            deviceId: 'DEV-BOTNET-A89',
            status: 'DECLINED',
            isGroundTruthFraud: true,
            groundTruthReason: 'CARD_TESTING: Automated low-value CVV probe attempt',
          })
        );
      }

      // Successful high-value extraction right after
      allTxns.push(
        createTxn({
          customerId: victim,
          amount: 3250.0,
          timestamp: new Date(baseTime + 18 * 60 * 1000).toISOString(),
          merchantName: 'Apple Store Fifth Ave',
          merchantCategory: 'ELECTRONICS',
          location: CITIES[0],
          type: 'ONLINE_PAYMENT',
          channel: 'WEB',
          deviceId: 'DEV-BOTNET-A89',
          status: 'APPROVED',
          isGroundTruthFraud: true,
          groundTruthReason: 'CARD_TESTING_EXPLOITATION: Successful high-value purchase following brute-force declines',
        })
      );
    }

    // Pattern C: Rapid Mule Drain (Large deposit followed by rapid transfer drain)
    {
      const victim = 'CUST-1042';
      const baseTime = now - 12 * 3600 * 1000;

      allTxns.push(
        createTxn({
          customerId: victim,
          amount: 9800.0,
          timestamp: new Date(baseTime).toISOString(),
          merchantName: 'Inbound Corporate Settlement',
          merchantCategory: 'FOREIGN_WIRE',
          location: CITIES[4], // Frankfurt
          type: 'WIRE_TRANSFER',
          channel: 'API_INTEGRATION',
          deviceId: 'DEV-INBOUND-SYSTEM',
          status: 'APPROVED',
          isGroundTruthFraud: false,
        })
      );

      // Rapid drain within 15 minutes
      allTxns.push(
        createTxn({
          customerId: victim,
          amount: 9400.0,
          timestamp: new Date(baseTime + 14 * 60 * 1000).toISOString(),
          merchantName: 'Apex Global Swift Wire',
          merchantCategory: 'FOREIGN_WIRE',
          location: CITIES[9], // Dubai
          type: 'WIRE_TRANSFER',
          channel: 'WEB',
          deviceId: 'DEV-UNKNOWN-PROXY-42',
          status: 'APPROVED',
          isGroundTruthFraud: true,
          groundTruthReason: 'MONEY_MULE_DRAIN: 96% balance liquidation within 15 minutes of deposit',
        })
      );
    }

    // Pattern D: High-Frequency Velocity Burst
    {
      const victim = 'CUST-1065';
      const baseTime = now - 6 * 3600 * 1000;

      for (let v = 0; v < 5; v++) {
        allTxns.push(
          createTxn({
            customerId: victim,
            amount: 450.0,
            timestamp: new Date(baseTime + v * 90 * 1000).toISOString(),
            merchantName: 'Micro Center High-Tech',
            merchantCategory: 'ELECTRONICS',
            location: CITIES[0],
            type: 'ONLINE_PAYMENT',
            channel: 'WEB',
            deviceId: 'DEV-VELOCITY-BURST-1',
            status: 'APPROVED',
            isGroundTruthFraud: true,
            groundTruthReason: 'HIGH_VELOCITY_BURST: 5 transactions within 6 minutes for identical amounts',
          })
        );
      }
    }

    // Pattern E: Syndicate Device Account Takeover (Same device hopping across victim accounts)
    {
      const baseTime = now - 3 * 3600 * 1000;
      syndicateCustomers.forEach((cust, idx) => {
        allTxns.push(
          createTxn({
            customerId: cust,
            amount: 2400.0 + idx * 300,
            timestamp: new Date(baseTime + idx * 12 * 60 * 1000).toISOString(),
            merchantName: 'Rolex Boutique Geneve',
            merchantCategory: 'LUXURY_JEWELRY',
            location: CITIES[11], // Zurich
            type: 'CARD_PURCHASE',
            channel: 'WEB',
            deviceId: syndicateDeviceId,
            status: 'APPROVED',
            isGroundTruthFraud: true,
            groundTruthReason: 'SYNDICATE_DEVICE_HOPPING: Multiple customer accounts manipulated from identical device fingerprint',
          })
        );
      });
    }

    // Pattern F: Off-Hours Extreme Amount Outlier
    {
      const victim = 'CUST-1088';
      const baseTime = now - 18 * 3600 * 1000; // early morning

      allTxns.push(
        createTxn({
          customerId: victim,
          amount: 14500.0,
          timestamp: new Date(baseTime).toISOString(),
          merchantName: 'Kraken OTC Desk',
          merchantCategory: 'CRYPTO_EXCHANGE',
          location: CITIES[3], // Tokyo
          type: 'WIRE_TRANSFER',
          channel: 'WEB',
          deviceId: 'DEV-OFFHOURS-NEW',
          status: 'APPROVED',
          isGroundTruthFraud: true,
          groundTruthReason: 'UNUSUAL_OUTLIER: $14.5k crypto transfer at 03:00 UTC, 12x above customer standard volume',
        })
      );
    }

    // Sort all transactions chronologically
    allTxns.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this.transactions = allTxns;

    // Run detection engine over all transactions to generate assessments
    this.recalculateAllAssessments();

    // Automatically create initial investigation cases for top critical/high flagged transactions
    this.seedInitialCases();

    // Record system initialization audit
    this.recordAudit(
      { id: 'SYS-INIT', name: 'Sentinel Core Engine', role: 'ADMINISTRATOR' },
      'SYSTEM_INITIALIZED',
      'SYSTEM',
      'SYS-STORE',
      {
        reason: `Initialized ${this.transactions.length} synthetic transactions, ${this.customers.size} customer profiles, and ${this.cases.size} baseline cases.`,
      }
    );
  }

  public recalculateAllAssessments(): void {
    this.assessments.clear();
    const sorted = [...this.transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group history by customer
    const customerHistoryMap = new Map<string, Transaction[]>();

    for (const txn of sorted) {
      const cust = this.customers.get(txn.customerId) || {
        customerId: txn.customerId,
        accountNumber: txn.accountNumber,
        accountAgeDays: 180,
        tier: 'STANDARD',
        historicalTxnCount: 50,
        averageTxnAmount: 200,
        stdDevTxnAmount: 100,
        maxTxnAmount: 1000,
        knownDevices: [txn.deviceId],
        frequentLocations: [txn.sourceLocation],
        topMerchants: [txn.merchantName],
        historicalAlertCount: 0,
        openCasesCount: 0,
        totalVolumeUSD: 10000,
        lastActive: txn.timestamp,
      };

      const history = customerHistoryMap.get(txn.customerId) || [];

      // 1. Evaluate deterministic rules
      const matchedRules = this.rulesEngine.evaluate(
        txn,
        cust,
        history,
        this.deviceToCustomerMap
      );

      // 2. Evaluate statistical anomaly
      const anomalyDetails = this.anomalyEngine.evaluate(txn, cust, history);

      // 3. Score risk
      const assessment = this.scoringEngine.assess(txn, matchedRules, anomalyDetails);

      this.assessments.set(txn.id, assessment);

      // Append to history for subsequent evaluations
      history.push(txn);
      customerHistoryMap.set(txn.customerId, history);
    }
  }

  private seedInitialCases(): void {
    // Find high & critical risk transactions that warrant active cases
    const criticalTxns = this.transactions
      .filter((t) => {
        const assessment = this.assessments.get(t.id);
        return assessment && assessment.overallScore >= 75;
      })
      .slice(-12); // take the 12 most recent critical events

    criticalTxns.forEach((txn, idx) => {
      const assessment = this.assessments.get(txn.id)!;
      const caseId = `CASE-2026-${(101 + idx).toString().padStart(4, '0')}`;
      const statuses: InvestigationCase['status'][] = [
        'NEW',
        'UNDER_INVESTIGATION',
        'ESCALATED',
        'AWAITING_INFO',
        'CONFIRMED_FRAUD',
        'RESOLVED_LEGITIMATE',
      ];
      const status = statuses[idx % statuses.length];
      const investigator =
        idx % 2 === 0 ? 'Marcus Vance (Senior Investigator)' : 'Sarah Chen (Fraud Analyst)';

      const notes: CaseNote[] = [
        {
          id: `NOTE-${caseId}-1`,
          caseId,
          authorName: 'Sentinel Automated Detection',
          authorRole: 'SYSTEM',
          timestamp: txn.timestamp,
          content: `Automated case generated upon transaction risk score reaching ${assessment.overallScore}/100. Matched rules: ${assessment.matchedRules.map((r) => r.ruleName).join(', ')}.`,
        },
      ];

      if (status !== 'NEW') {
        notes.push({
          id: `NOTE-${caseId}-2`,
          caseId,
          authorName: investigator,
          authorRole: idx % 2 === 0 ? 'SENIOR_INVESTIGATOR' : 'FRAUD_ANALYST',
          timestamp: new Date(new Date(txn.timestamp).getTime() + 15 * 60 * 1000).toISOString(),
          content: `Initiated forensic review. Cross-checked device IP ASN against geolocation database. Anomaly score verified at ${assessment.anomalyScore}/100.`,
        });
      }

      const caseObj: InvestigationCase = {
        id: caseId,
        transactionIds: [txn.id],
        customerId: txn.customerId,
        riskScore: assessment.overallScore,
        severity: assessment.riskClassification,
        fraudCategory: assessment.matchedRules[0]?.ruleId || 'SUSPICIOUS_ANOMALY',
        assignedInvestigator: investigator,
        status,
        createdAt: txn.timestamp,
        updatedAt: new Date(new Date(txn.timestamp).getTime() + 25 * 60 * 1000).toISOString(),
        evidenceSummary: assessment.contributingFactors,
        notes,
        resolution:
          status === 'CONFIRMED_FRAUD'
            ? {
                resolvedAt: new Date(new Date(txn.timestamp).getTime() + 45 * 60 * 1000).toISOString(),
                resolvedBy: 'Marcus Vance',
                resolutionReason:
                  'Cardholder confirmed unauthorized takeover. Credentials revoked and temporary card freeze enacted.',
                actionTaken: 'ACCOUNT_RESTRICTED',
              }
            : status === 'RESOLVED_LEGITIMATE'
            ? {
                resolvedAt: new Date(new Date(txn.timestamp).getTime() + 35 * 60 * 1000).toISOString(),
                resolvedBy: 'Sarah Chen',
                resolutionReason:
                  'Customer authenticated via out-of-band mobile challenge. Verified high-value holiday travel purchase.',
                actionTaken: 'FALSE_POSITIVE_WHITELIST',
              }
            : undefined,
      };

      this.cases.set(caseId, caseObj);

      // Increment customer open case counter if active
      if (!['RESOLVED_LEGITIMATE', 'CONFIRMED_FRAUD', 'CLOSED'].includes(status)) {
        const cust = this.customers.get(txn.customerId);
        if (cust) {
          cust.openCasesCount++;
        }
      }
    });
  }

  // --- QUERY APIS ---

  public getTransactions(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    riskClassification?: string;
    minAmount?: number;
    maxAmount?: number;
    transactionType?: string;
    channel?: string;
    customerId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): {
    transactions: (Transaction & { riskAssessment?: RiskAssessment })[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const page = params.page || 1;
    const pageSize = params.pageSize || 25;

    let filtered = [...this.transactions];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customerId.toLowerCase().includes(q) ||
          t.merchantName.toLowerCase().includes(q) ||
          t.sourceLocation.city.toLowerCase().includes(q) ||
          t.deviceId.toLowerCase().includes(q)
      );
    }

    if (params.customerId) {
      filtered = filtered.filter((t) => t.customerId === params.customerId);
    }

    if (params.transactionType) {
      filtered = filtered.filter((t) => t.transactionType === params.transactionType);
    }

    if (params.channel) {
      filtered = filtered.filter((t) => t.channel === params.channel);
    }

    if (params.status) {
      filtered = filtered.filter((t) => t.status === params.status);
    }

    if (params.minAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount >= params.minAmount!);
    }

    if (params.maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount <= params.maxAmount!);
    }

    if (params.riskClassification) {
      filtered = filtered.filter((t) => {
        const ass = this.assessments.get(t.id);
        return ass && ass.riskClassification === params.riskClassification;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (params.sortBy === 'amount') {
        return params.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (params.sortBy === 'riskScore') {
        const scoreA = this.assessments.get(a.id)?.overallScore || 0;
        const scoreB = this.assessments.get(b.id)?.overallScore || 0;
        return params.sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      }
      // default: timestamp desc
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return params.sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const sliced = filtered.slice(startIndex, startIndex + pageSize);

    const enriched = sliced.map((t) => ({
      ...t,
      riskAssessment: this.assessments.get(t.id),
    }));

    return {
      transactions: enriched,
      total,
      page,
      pageSize,
    };
  }

  public getTransactionById(id: string): {
    transaction: Transaction;
    riskAssessment: RiskAssessment;
    customer: CustomerProfile;
    recentTransactions: Transaction[];
    relatedCases: InvestigationCase[];
  } | null {
    const transaction = this.transactions.find((t) => t.id === id);
    if (!transaction) return null;

    let riskAssessment = this.assessments.get(id);
    if (!riskAssessment) {
      // assess on the fly
      const cust = this.customers.get(transaction.customerId);
      if (cust) {
        const history = this.transactions.filter(
          (t) => t.customerId === transaction.customerId && t.id !== transaction.id
        );
        const rules = this.rulesEngine.evaluate(transaction, cust, history, this.deviceToCustomerMap);
        const anomaly = this.anomalyEngine.evaluate(transaction, cust, history);
        riskAssessment = this.scoringEngine.assess(transaction, rules, anomaly);
        this.assessments.set(id, riskAssessment);
      }
    }

    const customer = this.customers.get(transaction.customerId)!;
    const recentTransactions = this.transactions
      .filter((t) => t.customerId === transaction.customerId)
      .slice(-10);

    const relatedCases = Array.from(this.cases.values()).filter(
      (c) => c.transactionIds.includes(id) || c.customerId === transaction.customerId
    );

    return {
      transaction,
      riskAssessment: riskAssessment!,
      customer,
      recentTransactions,
      relatedCases,
    };
  }

  /**
   * Ingest a single transaction with validation, duplicate detection, and automated scoring
   */
  public ingestTransaction(
    txnInput: Omit<Transaction, 'id'> & { id?: string },
    actor: { id: string; name: string; role: UserRole }
  ): { transaction: Transaction; assessment: RiskAssessment } {
    // 1. Strict Validation
    if (!txnInput.customerId || typeof txnInput.customerId !== 'string' || !txnInput.customerId.trim()) {
      throw new Error('Validation Error: Valid customer ID is required.');
    }

    if (
      txnInput.amount === undefined ||
      txnInput.amount === null ||
      typeof txnInput.amount !== 'number' ||
      isNaN(txnInput.amount) ||
      !isFinite(txnInput.amount) ||
      txnInput.amount <= 0
    ) {
      throw new Error('Validation Error: A positive finite numerical amount is required.');
    }

    if (txnInput.amount > 10000000) {
      throw new Error('Validation Error: Transaction amount exceeds single transaction velocity ceiling ($10,000,000).');
    }

    if (txnInput.timestamp && isNaN(new Date(txnInput.timestamp).getTime())) {
      throw new Error('Validation Error: Timestamp must be a valid ISO 8601 date string.');
    }

    if (txnInput.sourceLocation) {
      const { latitude, longitude } = txnInput.sourceLocation;
      if (
        typeof latitude !== 'number' ||
        isNaN(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        typeof longitude !== 'number' ||
        isNaN(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error('Validation Error: Geographic coordinates out of valid range (-90 to 90 lat, -180 to 180 lon).');
      }
    }

    const txTimeStr = txnInput.timestamp || new Date().toISOString();
    const txTime = new Date(txTimeStr).getTime();

    // 2. Duplicate Detection (Idempotency)
    const duplicate = this.transactions.find(
      (t) =>
        t.customerId === txnInput.customerId &&
        Math.abs(t.amount - txnInput.amount) < 0.001 &&
        t.merchantName === txnInput.merchantName &&
        Math.abs(new Date(t.timestamp).getTime() - txTime) < 3000 // within 3s
    );

    if (duplicate) {
      throw new Error(
        `Idempotency Conflict: Potential duplicate transaction detected. Matches existing ${duplicate.id} (${duplicate.amount} USD at ${duplicate.timestamp}).`
      );
    }

    const id = txnInput.id || `TXN-2026-${(this.transactions.length + 1001).toString()}`;
    const txn: Transaction = {
      ...txnInput,
      id,
      accountNumber: txnInput.accountNumber || `ACCT-${txnInput.customerId.replace('CUST-', '')}-****-9900`,
      currency: txnInput.currency || 'USD',
      timestamp: txTimeStr,
      channel: txnInput.channel || 'WEB',
      transactionType: txnInput.transactionType || 'CARD_PURCHASE',
      status: txnInput.status || 'APPROVED',
      sourceLocation: txnInput.sourceLocation || CITIES[0],
      deviceId: txnInput.deviceId || `DEV-${Math.floor(Math.random() * 90000 + 10000)}`,
      deviceType: txnInput.deviceType || 'MACOS',
    };

    // Ensure customer exists or auto-register synthetic baseline
    let customer = this.customers.get(txn.customerId);
    if (!customer) {
      customer = {
        customerId: txn.customerId,
        accountNumber: txn.accountNumber,
        accountAgeDays: 60,
        tier: 'STANDARD',
        historicalTxnCount: 12,
        averageTxnAmount: Math.round(txn.amount * 0.8),
        stdDevTxnAmount: Math.round(txn.amount * 0.3),
        maxTxnAmount: Math.round(txn.amount * 2),
        knownDevices: [txn.deviceId],
        frequentLocations: [txn.sourceLocation],
        topMerchants: [txn.merchantName],
        historicalAlertCount: 0,
        openCasesCount: 0,
        totalVolumeUSD: Math.round(txn.amount * 12),
        lastActive: txn.timestamp,
      };
      this.customers.set(txn.customerId, customer);
    }

    // Dynamic customer behavioral baseline telemetry update
    customer.historicalTxnCount += 1;
    customer.totalVolumeUSD += txn.amount;
    customer.averageTxnAmount = Math.round(customer.totalVolumeUSD / customer.historicalTxnCount);
    customer.maxTxnAmount = Math.max(customer.maxTxnAmount, Math.round(txn.amount));
    customer.lastActive = txn.timestamp;

    if (txn.deviceId && !customer.knownDevices.includes(txn.deviceId)) {
      customer.knownDevices.push(txn.deviceId);
    }
    if (txn.sourceLocation && !customer.frequentLocations.some((l) => l.city === txn.sourceLocation.city)) {
      customer.frequentLocations.push({ city: txn.sourceLocation.city, country: txn.sourceLocation.country });
    }
    if (txn.merchantName && !customer.topMerchants.includes(txn.merchantName)) {
      customer.topMerchants.push(txn.merchantName);
    }

    // Device map update
    if (!this.deviceToCustomerMap.has(txn.deviceId)) {
      this.deviceToCustomerMap.set(txn.deviceId, new Set());
    }
    this.deviceToCustomerMap.get(txn.deviceId)!.add(txn.customerId);

    // Historical context for evaluation
    const history = this.transactions.filter((t) => t.customerId === txn.customerId);

    // Run rules & anomaly engines
    const matchedRules = this.rulesEngine.evaluate(txn, customer, history, this.deviceToCustomerMap);
    const anomalyDetails = this.anomalyEngine.evaluate(txn, customer, history);
    const assessment = this.scoringEngine.assess(txn, matchedRules, anomalyDetails);

    // Save
    this.transactions.unshift(txn);
    this.assessments.set(txn.id, assessment);

    // Audit log
    this.recordAudit(
      actor,
      'TRANSACTION_INGESTED',
      'TRANSACTION',
      txn.id,
      {
        newState: {
          amount: txn.amount,
          riskScore: assessment.overallScore,
          classification: assessment.riskClassification,
          ruleMatches: matchedRules.length,
        },
      }
    );

    // If critical risk, auto-create case
    if (assessment.overallScore >= 75) {
      this.createCase(
        {
          customerId: txn.customerId,
          transactionIds: [txn.id],
          fraudCategory: matchedRules[0]?.ruleId || 'ANOMALY_SPIKE',
          severity: assessment.riskClassification,
          notes: [
            {
              id: `NOTE-AUTO-${Date.now()}`,
              caseId: '',
              authorName: 'Sentinel Sentinel-Guard Engine',
              authorRole: 'SYSTEM',
              timestamp: new Date().toISOString(),
              content: `Auto-generated case for critical risk alert (${assessment.overallScore}/100). Contributing factors: ${assessment.contributingFactors.join('; ')}`,
            },
          ],
        },
        { id: 'SYSTEM', name: 'Sentinel Automated Ingestion', role: 'ADMINISTRATOR' }
      );
    }

    this.persist();
    return { transaction: txn, assessment };
  }

  /**
   * Batch / CSV Ingestion
   */
  public ingestBatch(
    items: (Omit<Transaction, 'id'> & { id?: string })[],
    actor: { id: string; name: string; role: UserRole }
  ): {
    totalIngested: number;
    duplicatesSkipped: number;
    errors: { row: number; error: string }[];
  } {
    let totalIngested = 0;
    let duplicatesSkipped = 0;
    const errors: { row: number; error: string }[] = [];

    items.forEach((item, index) => {
      try {
        this.ingestTransaction({ ...item, isUploaded: true }, actor);
        totalIngested++;
      } catch (err: any) {
        if (err.message && err.message.includes('Idempotency Conflict')) {
          duplicatesSkipped++;
        } else {
          errors.push({ row: index + 1, error: err.message || 'Unknown ingestion error' });
        }
      }
    });

    this.recordAudit(
      actor,
      'BATCH_INGESTION_COMPLETED',
      'TRANSACTION',
      `BATCH-${Date.now()}`,
      {
        newState: { totalIngested, duplicatesSkipped, errorCount: errors.length },
      }
    );

    return { totalIngested, duplicatesSkipped, errors };
  }

  // --- CASE MANAGEMENT APIS ---

  public getCases(params: {
    status?: string;
    severity?: string;
    assignedInvestigator?: string;
    customerId?: string;
  }): InvestigationCase[] {
    let list = Array.from(this.cases.values());

    if (params.status) {
      list = list.filter((c) => c.status === params.status);
    }
    if (params.severity) {
      list = list.filter((c) => c.severity === params.severity);
    }
    if (params.customerId) {
      list = list.filter((c) => c.customerId === params.customerId);
    }
    if (params.assignedInvestigator) {
      list = list.filter((c) =>
        c.assignedInvestigator.toLowerCase().includes(params.assignedInvestigator!.toLowerCase())
      );
    }

    // Sort by updated timestamp desc
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getCaseById(id: string): InvestigationCase | null {
    return this.cases.get(id) || null;
  }

  public createCase(
    input: {
      customerId: string;
      transactionIds: string[];
      fraudCategory?: string;
      severity?: InvestigationCase['severity'];
      assignedInvestigator?: string;
      notes?: CaseNote[];
    },
    actor: { id: string; name: string; role: UserRole }
  ): InvestigationCase {
    const id = `CASE-2026-${(this.cases.size + 101).toString().padStart(4, '0')}`;
    const primaryTxnId = input.transactionIds[0];
    const assessment = primaryTxnId ? this.assessments.get(primaryTxnId) : undefined;

    const newCase: InvestigationCase = {
      id,
      transactionIds: input.transactionIds,
      customerId: input.customerId,
      riskScore: assessment ? assessment.overallScore : 75,
      severity: input.severity || assessment?.riskClassification || 'HIGH',
      fraudCategory: input.fraudCategory || assessment?.matchedRules[0]?.ruleId || 'SUSPICIOUS_ACTIVITY',
      assignedInvestigator: input.assignedInvestigator || actor.name,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceSummary: assessment?.contributingFactors || [
        `Case created by ${actor.name} (${actor.role})`,
      ],
      notes: input.notes || [
        {
          id: `NOTE-${id}-${Date.now()}`,
          caseId: id,
          authorName: actor.name,
          authorRole: actor.role,
          timestamp: new Date().toISOString(),
          content: 'Investigation case opened.',
        },
      ],
    };

    this.cases.set(id, newCase);

    const cust = this.customers.get(input.customerId);
    if (cust) {
      cust.openCasesCount++;
    }

    this.recordAudit(actor, 'CASE_CREATED', 'CASE', id, {
      newState: { customerId: input.customerId, severity: newCase.severity },
    });

    return newCase;
  }

  public updateCaseStatus(
    caseId: string,
    newStatus: InvestigationCase['status'],
    actor: { id: string; name: string; role: UserRole },
    reason?: string
  ): InvestigationCase {
    const caseObj = this.cases.get(caseId);
    if (!caseObj) {
      throw new Error(`Case ${caseId} not found.`);
    }

    // Role-Based Access Control checks
    if (actor.role === 'AUDITOR') {
      throw new Error('Permission Denied: Auditors have read-only access and cannot alter case status.');
    }

    if (
      (newStatus === 'CONFIRMED_FRAUD' || newStatus === 'RESOLVED_LEGITIMATE') &&
      actor.role === 'FRAUD_ANALYST'
    ) {
      throw new Error(
        'Permission Denied: Final fraud confirmation or legitimate closure requires Senior Investigator or Administrator approval.'
      );
    }

    // State machine transitions: Prevent reopening CLOSED cases without admin override
    if (caseObj.status === 'CLOSED' && actor.role !== 'ADMINISTRATOR') {
      throw new Error('Illegal Transition: Closed cases cannot be modified without Administrator override.');
    }

    const previousStatus = caseObj.status;
    caseObj.status = newStatus;
    caseObj.updatedAt = new Date().toISOString();

    // Add note
    caseObj.notes.push({
      id: `NOTE-${caseId}-${Date.now()}`,
      caseId,
      authorName: actor.name,
      authorRole: actor.role,
      timestamp: new Date().toISOString(),
      content: `Status changed from ${previousStatus} to ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
    });

    // If resolving, decrement customer open count
    if (
      ['RESOLVED_LEGITIMATE', 'CONFIRMED_FRAUD', 'CLOSED'].includes(newStatus) &&
      !['RESOLVED_LEGITIMATE', 'CONFIRMED_FRAUD', 'CLOSED'].includes(previousStatus)
    ) {
      const cust = this.customers.get(caseObj.customerId);
      if (cust && cust.openCasesCount > 0) {
        cust.openCasesCount--;
      }
    }

    this.recordAudit(actor, 'CASE_STATUS_CHANGED', 'CASE', caseId, {
      previousState: { status: previousStatus },
      newState: { status: newStatus },
      reason,
    });

    return caseObj;
  }

  public addCaseNote(
    caseId: string,
    content: string,
    actor: { id: string; name: string; role: UserRole }
  ): CaseNote {
    const caseObj = this.cases.get(caseId);
    if (!caseObj) throw new Error(`Case ${caseId} not found.`);

    if (actor.role === 'AUDITOR') {
      throw new Error('Permission Denied: Auditors cannot post case notes.');
    }

    const note: CaseNote = {
      id: `NOTE-${caseId}-${Date.now()}`,
      caseId,
      authorName: actor.name,
      authorRole: actor.role,
      timestamp: new Date().toISOString(),
      content,
    };

    caseObj.notes.push(note);
    caseObj.updatedAt = new Date().toISOString();

    this.recordAudit(actor, 'CASE_NOTE_ADDED', 'CASE', caseId, {
      newState: { noteId: note.id, excerpt: content.substring(0, 80) },
    });

    return note;
  }

  public assignInvestigator(
    caseId: string,
    investigatorName: string,
    actor: { id: string; name: string; role: UserRole }
  ): InvestigationCase {
    const caseObj = this.cases.get(caseId);
    if (!caseObj) throw new Error(`Case ${caseId} not found.`);

    if (actor.role === 'AUDITOR') {
      throw new Error('Permission Denied: Auditors cannot assign investigators.');
    }

    const prev = caseObj.assignedInvestigator;
    caseObj.assignedInvestigator = investigatorName;
    caseObj.updatedAt = new Date().toISOString();

    caseObj.notes.push({
      id: `NOTE-${caseId}-${Date.now()}`,
      caseId,
      authorName: actor.name,
      authorRole: actor.role,
      timestamp: new Date().toISOString(),
      content: `Investigator assigned: ${investigatorName} (previously: ${prev}).`,
    });

    this.recordAudit(actor, 'INVESTIGATOR_ASSIGNED', 'CASE', caseId, {
      previousState: { assignedInvestigator: prev },
      newState: { assignedInvestigator: investigatorName },
    });

    return caseObj;
  }

  public resolveCase(
    caseId: string,
    resolution: {
      actionTaken: InvestigationCase['resolution'] extends undefined ? never : NonNullable<InvestigationCase['resolution']>['actionTaken'];
      resolutionReason: string;
      finalStatus: 'CONFIRMED_FRAUD' | 'RESOLVED_LEGITIMATE' | 'CLOSED';
    },
    actor: { id: string; name: string; role: UserRole }
  ): InvestigationCase {
    const caseObj = this.cases.get(caseId);
    if (!caseObj) throw new Error(`Case ${caseId} not found.`);

    if (actor.role === 'AUDITOR' || actor.role === 'FRAUD_ANALYST') {
      throw new Error(
        'Permission Denied: Case resolution and sanctions require Senior Investigator or Administrator authorization.'
      );
    }

    caseObj.status = resolution.finalStatus;
    caseObj.updatedAt = new Date().toISOString();
    caseObj.resolution = {
      resolvedAt: new Date().toISOString(),
      resolvedBy: `${actor.name} (${actor.role})`,
      resolutionReason: resolution.resolutionReason,
      actionTaken: resolution.actionTaken,
    };

    caseObj.notes.push({
      id: `NOTE-${caseId}-${Date.now()}`,
      caseId,
      authorName: actor.name,
      authorRole: actor.role,
      timestamp: new Date().toISOString(),
      content: `CASE RESOLVED [${resolution.finalStatus}]: Action: ${resolution.actionTaken}. Reason: ${resolution.resolutionReason}`,
    });

    this.recordAudit(actor, 'CASE_RESOLVED', 'CASE', caseId, {
      newState: {
        status: resolution.finalStatus,
        actionTaken: resolution.actionTaken,
        reason: resolution.resolutionReason,
      },
    });

    return caseObj;
  }

  // --- OVERVIEW AGGREGATIONS ---

  public getOverviewMetrics(): {
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
    recentFlaggedTransactions: (Transaction & { riskAssessment?: RiskAssessment })[];
    recentAuditActivity: AuditEvent[];
  } {
    const totalTransactions = this.transactions.length;
    let suspiciousTransactions = 0;
    let highRiskTransactions = 0;
    let totalMonitoredVolumeUSD = 0;

    const riskCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const categoryVolumeMap = new Map<string, { count: number; volume: number }>();
    const timeSeriesMap = new Map<string, { normal: number; suspicious: number; volume: number }>();
    const geoMap = new Map<string, { city: string; country: string; txCount: number; alertCount: number }>();

    for (const txn of this.transactions) {
      totalMonitoredVolumeUSD += txn.amount;
      const ass = this.assessments.get(txn.id);

      if (ass) {
        riskCounts[ass.riskClassification] = (riskCounts[ass.riskClassification] || 0) + 1;
        if (ass.overallScore >= 30) suspiciousTransactions++;
        if (ass.overallScore >= 60) highRiskTransactions++;

        // Category breakdown
        const cat = txn.merchantCategory || 'OTHER';
        const currCat = categoryVolumeMap.get(cat) || { count: 0, volume: 0 };
        currCat.count++;
        currCat.volume += txn.amount;
        categoryVolumeMap.set(cat, currCat);

        // Time series by day
        const dateKey = txn.timestamp.substring(0, 10);
        const currTime = timeSeriesMap.get(dateKey) || { normal: 0, suspicious: 0, volume: 0 };
        if (ass.overallScore >= 60) {
          currTime.suspicious++;
        } else {
          currTime.normal++;
        }
        currTime.volume += txn.amount;
        timeSeriesMap.set(dateKey, currTime);

        // Geo map
        const geoKey = txn.sourceLocation.city;
        const currGeo = geoMap.get(geoKey) || {
          city: txn.sourceLocation.city,
          country: txn.sourceLocation.country,
          txCount: 0,
          alertCount: 0,
        };
        currGeo.txCount++;
        if (ass.overallScore >= 60) currGeo.alertCount++;
        geoMap.set(geoKey, currGeo);
      }
    }

    const confirmedFraudCases = Array.from(this.cases.values()).filter(
      (c) => c.status === 'CONFIRMED_FRAUD'
    ).length;

    const openInvestigationCases = Array.from(this.cases.values()).filter((c) =>
      ['NEW', 'UNDER_INVESTIGATION', 'ESCALATED', 'AWAITING_INFO'].includes(c.status)
    ).length;

    const fraudRatePercentage = totalTransactions > 0
      ? Number(((highRiskTransactions / totalTransactions) * 100).toFixed(2))
      : 0;

    const riskDistribution = [
      { name: 'Low (0-29)', count: riskCounts.LOW || 0, color: '#10B981' },
      { name: 'Medium (30-59)', count: riskCounts.MEDIUM || 0, color: '#F59E0B' },
      { name: 'High (60-79)', count: riskCounts.HIGH || 0, color: '#F97316' },
      { name: 'Critical (80-100)', count: riskCounts.CRITICAL || 0, color: '#EF4444' },
    ];

    const categoryBreakdown = Array.from(categoryVolumeMap.entries())
      .map(([category, val]) => ({
        category,
        count: val.count,
        volumeUSD: Math.round(val.volume),
      }))
      .sort((a, b) => b.volumeUSD - a.volumeUSD);

    const timeSeriesActivity = Array.from(timeSeriesMap.entries())
      .map(([date, val]) => ({
        date: date.substring(5), // MM-DD
        normal: val.normal,
        suspicious: val.suspicious,
        volume: Math.round(val.volume),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const geographicDistribution = Array.from(geoMap.values()).sort(
      (a, b) => b.alertCount - a.alertCount
    );

    const recentFlaggedTransactions = this.transactions
      .filter((t) => {
        const ass = this.assessments.get(t.id);
        return ass && ass.overallScore >= 60;
      })
      .slice(0, 8)
      .map((t) => ({ ...t, riskAssessment: this.assessments.get(t.id) }));

    const recentAuditActivity = this.auditEvents.slice(0, 10);

    return {
      totalTransactions,
      suspiciousTransactions,
      highRiskTransactions,
      confirmedFraudCases,
      openInvestigationCases,
      totalMonitoredVolumeUSD: Math.round(totalMonitoredVolumeUSD),
      fraudRatePercentage,
      riskDistribution,
      categoryBreakdown,
      timeSeriesActivity,
      geographicDistribution,
      recentFlaggedTransactions,
      recentAuditActivity,
    };
  }
}

// Singleton database instance
export const db = new Database();
