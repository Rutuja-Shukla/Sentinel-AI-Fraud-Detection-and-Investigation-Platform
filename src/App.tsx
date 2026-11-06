import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { OverviewView } from './components/Overview/OverviewView.tsx';
import { TransactionsView } from './components/Transactions/TransactionsView.tsx';
import { AlertsView } from './components/Alerts/AlertsView.tsx';
import { CasesView } from './components/Cases/CasesView.tsx';
import { CustomersView } from './components/Customers/CustomersView.tsx';
import { RulesView } from './components/Rules/RulesView.tsx';
import { EvaluationView } from './components/Evaluation/EvaluationView.tsx';
import { AuditView } from './components/Audit/AuditView.tsx';
import { SettingsView } from './components/Settings/SettingsView.tsx';
import { TransactionDetailDrawer } from './components/TransactionDetail/TransactionDetailDrawer.tsx';
import { SimulateTxnModal } from './components/Transactions/SimulateTxnModal.tsx';
import { UploadCsvModal } from './components/Transactions/UploadCsvModal.tsx';
import {
  InvestigationCase,
  OverviewMetrics,
  Transaction,
  api,
} from './services/api.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [currentUser, setCurrentUser] = useState({
    id: 'USR-ANALYST-1',
    name: 'Sarah Chen',
    role: 'FRAUD_ANALYST',
    badgeNumber: 'FA-4891',
  });

  // Overview metrics
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [txnPage, setTxnPage] = useState(1);
  const [txnPageSize, setTxnPageSize] = useState(25);
  const [txnFilters, setTxnFilters] = useState<any>({});
  const [txnLoading, setTxnLoading] = useState(false);

  // Priority Alerts state
  const [alerts, setAlerts] = useState<Transaction[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Cases state
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);

  // Drawer & Modals
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial Data Load
  useEffect(() => {
    // Current user
    api.getCurrentUser().then((res) => {
      if (res.user) setCurrentUser(res.user);
    });

    loadOverview();
    loadTransactions(1, txnFilters);
    loadAlerts();
    loadCases();
  }, []);

  const loadOverview = () => {
    setOverviewLoading(true);
    api
      .getOverview()
      .then((data) => setOverviewMetrics(data))
      .catch((err) => console.error(err))
      .finally(() => setOverviewLoading(false));
  };

  const loadTransactions = (page: number, filters: any) => {
    setTxnLoading(true);
    api
      .getTransactions({ page, pageSize: txnPageSize, ...filters })
      .then((res) => {
        setTransactions(res.transactions);
        setTotalTransactions(res.total);
        setTxnPage(res.page);
      })
      .catch((err) => console.error(err))
      .finally(() => setTxnLoading(false));
  };

  const loadAlerts = () => {
    setAlertsLoading(true);
    api
      .getAlerts()
      .then((res) => setAlerts(res.alerts || []))
      .catch((err) => console.error(err))
      .finally(() => setAlertsLoading(false));
  };

  const loadCases = () => {
    setCasesLoading(true);
    api
      .getCases()
      .then((res) => setCases(res.cases || []))
      .catch((err) => console.error(err))
      .finally(() => setCasesLoading(false));
  };

  const handleSwitchRole = async (role: string) => {
    try {
      const res = await api.switchRole(role);
      setCurrentUser(res.user);
      showToast(`Switched active persona to ${res.user.role.replace('_', ' ')} (${res.user.name})`);
    } catch (err: any) {
      alert(`Role switch failed: ${err.message}`);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.resetDemo();
      loadOverview();
      loadTransactions(1, {});
      loadAlerts();
      loadCases();
      showToast('Synthetic dataset successfully re-seeded with 1,200 pristine benchmark transactions.');
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateCaseFromTxn = async (txnId: string, customerId: string) => {
    try {
      const res = await api.createCase({
        customerId,
        transactionIds: [txnId],
        assignedInvestigator: currentUser.name,
      });
      loadCases();
      loadOverview();
      showToast(`Created new Investigation Case ${res.case.id} for Customer ${customerId}`);
      setActiveTab('cases');
    } catch (err: any) {
      alert(`Case creation failed: ${err.message}`);
    }
  };

  const handleSimulateSuccess = (newTxnId: string) => {
    loadOverview();
    loadTransactions(1, txnFilters);
    loadAlerts();
    showToast(`Transaction ${newTxnId} successfully ingested and evaluated by Sentinel.`);
    setSelectedTxnId(newTxnId);
  };

  const handleUploadSuccess = () => {
    loadOverview();
    loadTransactions(1, txnFilters);
    loadAlerts();
    showToast('Batch transactions ingested and evaluated.');
  };

  const handleRulesUpdated = () => {
    loadOverview();
    loadTransactions(txnPage, txnFilters);
    loadAlerts();
    showToast('Detection rules updated. Entire database re-evaluated.');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden select-text">
      {/* Platform Header */}
      <Header
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenSimulate={() => setSimulateModalOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          openCasesCount={overviewMetrics?.openInvestigationCases}
          highRiskCount={overviewMetrics?.highRiskTransactions}
        />

        {/* Dynamic Workspace View */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {activeTab === 'overview' && (
            <OverviewView
              metrics={overviewMetrics}
              loading={overviewLoading}
              onSelectTransaction={(txn) => setSelectedTxnId(txn.id)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              total={totalTransactions}
              page={txnPage}
              pageSize={txnPageSize}
              loading={txnLoading}
              onPageChange={(p) => {
                setTxnPage(p);
                loadTransactions(p, txnFilters);
              }}
              onFilterChange={(filters) => {
                setTxnFilters(filters);
                setTxnPage(1);
                loadTransactions(1, filters);
              }}
              onSelectTransaction={(txn) => setSelectedTxnId(txn.id)}
              onOpenSimulate={() => setSimulateModalOpen(true)}
              onOpenUpload={() => setUploadModalOpen(true)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              loading={alertsLoading}
              onSelectTransaction={(txn) => setSelectedTxnId(txn.id)}
              onCreateCase={handleCreateCaseFromTxn}
            />
          )}

          {activeTab === 'cases' && (
            <CasesView
              cases={cases}
              loading={casesLoading}
              onRefreshCases={loadCases}
              onSelectTransactionId={(txId) => setSelectedTxnId(txId)}
              currentUserRole={currentUser.role}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              onSelectTransaction={(txn) => setSelectedTxnId(txn.id)}
              initialCustomerId={selectedCustomerId}
            />
          )}

          {activeTab === 'rules' && (
            <RulesView
              currentUserRole={currentUser.role}
              onRulesUpdated={handleRulesUpdated}
            />
          )}

          {activeTab === 'evaluation' && <EvaluationView />}

          {activeTab === 'audit' && <AuditView />}

          {activeTab === 'settings' && (
            <SettingsView
              currentUserRole={currentUser.role}
              onResetDemo={handleResetDemo}
              isResetting={isResetting}
            />
          )}
        </main>
      </div>

      {/* Slide-over Transaction Investigation Detail Drawer */}
      <TransactionDetailDrawer
        transactionId={selectedTxnId}
        onClose={() => setSelectedTxnId(null)}
        onCreateCase={handleCreateCaseFromTxn}
        onNavigateToCustomer={(cId) => {
          setSelectedTxnId(null);
          setSelectedCustomerId(cId);
          setActiveTab('customers');
        }}
      />

      {/* Transaction Simulation Modal */}
      <SimulateTxnModal
        isOpen={simulateModalOpen}
        onClose={() => setSimulateModalOpen(false)}
        onSuccess={handleSimulateSuccess}
      />

      {/* CSV Batch Upload Modal */}
      <UploadCsvModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-70 bg-slate-900 border border-emerald-500/60 text-slate-100 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
