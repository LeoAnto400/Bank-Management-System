import AdminDashboardLayout from '../components/AdminDashboardLayout.jsx'
import PasswordConfirmationModal from '../components/PasswordConfirmationModal.jsx'
import {
  adminAccountStatusOptions,
  adminAccountTypeOptions,
  adminKycStatusOptions,
  adminTabs,
  adminTransactionTypeOptions,
  useAdminDashboard,
} from '../dashboard/adminDashboard.js'
import { formatCurrency, formatDate } from '../dashboard/customerDashboard.js'

function AdminDashboardPage() {
  const {
    activeTab,
    dashboard,
    transactionForm,
    loanReviewForms,
    accountEditForms,
    customerEditForms,
    isLoading,
    isSubmittingTransaction,
    isReviewingLoanId,
    isUpdatingAccountId,
    isUpdatingCustomerId,
    passwordModal,
    error,
    success,
    storedUser,
    setActiveTab,
    handleLogout,
    handleTransactionFormChange,
    handleTransactionSubmit,
    handleLoanReviewFieldChange,
    handleLoanReviewAction,
    handleAccountEditFieldChange,
    handleCustomerEditFieldChange,
    handleAccountUpdate,
    handleCustomerUpdate,
    handlePasswordChange,
    handlePasswordModalConfirm,
    closePasswordModal,
  } = useAdminDashboard()

  const profile = dashboard?.profile
  const summary = dashboard?.summary
  const accounts = dashboard?.accounts || []
  const customers = dashboard?.customers || []
  const recentTransactions = dashboard?.recent_transactions || []
  const activeLoans = dashboard?.active_loans || []
  const auditLogs = dashboard?.audit_logs || []
  const pendingLoanApplications = dashboard?.pending_loan_applications || []
  const selectedAccount = accounts.find(
    (account) => String(account.account_id) === String(transactionForm.account_id)
  )

  const renderCashTab = () => (
    <div className="dashboard-layout">
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Counter Service</p>
              <h3>Deposit or withdraw at the branch counter</h3>
            </div>
          </div>
          <form className="auth-form dashboard-profile__form" onSubmit={handleTransactionSubmit}>
            <div className="form-grid">
              <label className="field-group">
                <span>Account</span>
                <select
                  name="account_id"
                  value={transactionForm.account_id}
                  onChange={handleTransactionFormChange}
                  disabled={isSubmittingTransaction || accounts.length === 0}
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.account_id} value={account.account_id}>
                      {account.account_number} · {account.customer_name} · {account.account_status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group">
                <span>Transaction Type</span>
                <select
                  name="transaction_type"
                  value={transactionForm.transaction_type}
                  onChange={handleTransactionFormChange}
                  disabled={isSubmittingTransaction}
                >
                  {adminTransactionTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type === 'Credit' ? 'Deposit money' : 'Withdraw money'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group">
                <span>Amount</span>
                <input
                  name="transaction_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.transaction_amount}
                  onChange={handleTransactionFormChange}
                  disabled={isSubmittingTransaction}
                  placeholder="0.00"
                />
              </label>
              <label className="field-group">
                <span>Remark</span>
                <input
                  name="transaction_desc"
                  type="text"
                  value={transactionForm.transaction_desc}
                  onChange={handleTransactionFormChange}
                  disabled={isSubmittingTransaction}
                  placeholder="Example: Cash deposit received at teller desk"
                />
              </label>
            </div>
            <div className="dashboard-profile__summary dashboard-profile__summary--cards">
              <div className="dashboard-mini-card">
                <strong>Selected account</strong>
                <p>{selectedAccount?.account_number || 'Choose an account'}</p>
                <p>{selectedAccount?.customer_name || 'Customer will appear here'}</p>
              </div>
              <div className="dashboard-mini-card">
                <strong>Available balance</strong>
                <p>
                  {selectedAccount
                    ? formatCurrency(selectedAccount.account_balance, selectedAccount.account_currency || 'INR')
                    : 'Select an account first'}
                </p>
                <p>Status: {selectedAccount?.account_status || 'Unknown'}</p>
              </div>
            </div>
            <button
              type="submit"
              className="button-link button-link--primary auth-submit"
              disabled={isSubmittingTransaction || !transactionForm.account_id}
            >
              {isSubmittingTransaction
                ? 'Recording Transaction...'
                : transactionForm.transaction_type === 'Credit'
                  ? 'Record Cash Deposit'
                  : 'Record Cash Withdrawal'}
            </button>
          </form>
        </article>
      </div>
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Recent Transactions</p>
              <h3>Latest activity in this branch</h3>
            </div>
          </div>
          <div className="dashboard-table dashboard-table--wide">
            <div className="dashboard-table__row dashboard-table__row--head dashboard-table__row--transactions-extended">
              <span>Reference</span>
              <span>Account</span>
              <span>Type</span>
              <span>Channel</span>
              <span>Status</span>
              <span>Amount</span>
              <span>Balance After</span>
              <span>Date</span>
            </div>
            {recentTransactions.length ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.transaction_id} className="dashboard-table__row dashboard-table__row--transactions-extended">
                  <span>{transaction.reference_number}</span>
                  <span>
                    {transaction.account_number}
                    <small className="dashboard-inline-note">{transaction.customer_name}</small>
                  </span>
                  <span className={transaction.transaction_type === 'Credit' ? 'text-credit' : 'text-debit'}>
                    {transaction.transaction_type}
                  </span>
                  <span>{transaction.transaction_channel}</span>
                  <span>{transaction.transaction_status}</span>
                  <span>{formatCurrency(transaction.transaction_amount)}</span>
                  <span>{formatCurrency(transaction.balance_after_txn)}</span>
                  <span>{formatDate(transaction.transaction_date, { timeStyle: 'short' })}</span>
                </div>
              ))
            ) : (
              <p className="dashboard-empty">No branch transactions were found yet.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )

  const renderLoansTab = () => (
    <div className="dashboard-layout">
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Pending Loans</p>
              <h3>Pending loan applications for this branch</h3>
            </div>
          </div>
          <div className="dashboard-stack">
            {pendingLoanApplications.length ? (
              pendingLoanApplications.map((application) => {
                const reviewForm = loanReviewForms[String(application.loan_application_id)] || {}
                return (
                  <article key={application.loan_application_id} className="dashboard-product-card">
                    <div className="dashboard-product-card__head">
                      <div>
                        <strong>{application.first_name} {application.last_name}</strong>
                        <span>{application.loan_type} loan request · Submitted {formatDate(application.created_at, { timeStyle: 'short' })}</span>
                      </div>
                      <span className="dashboard-badge dashboard-badge--pending">Pending</span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Requested amount: {formatCurrency(application.requested_amount)}</p>
                      <p>Suggested rate: {application.annual_interest_rate}%</p>
                      <p>Estimated EMI: {formatCurrency(application.estimated_emi)}</p>
                      <p>Tenure: {application.tenure_months} months</p>
                      <p>Linked account: {application.linked_account_number}</p>
                      <p>Linked balance: {formatCurrency(application.linked_account_balance)}</p>
                    </div>
                    <label className="field-group">
                      <span>Approved Amount</span>
                      <input name="approved_amount" type="number" min="0.01" step="0.01" value={reviewForm.approved_amount || ''} onChange={(event) => handleLoanReviewFieldChange(application.loan_application_id, event)} disabled={isReviewingLoanId === application.loan_application_id} />
                    </label>
                    <label className="field-group">
                      <span>Annual Interest Rate</span>
                      <input name="annual_interest_rate" type="number" min="0" step="0.01" value={reviewForm.annual_interest_rate || ''} onChange={(event) => handleLoanReviewFieldChange(application.loan_application_id, event)} disabled={isReviewingLoanId === application.loan_application_id} />
                    </label>
                    <label className="field-group">
                      <span>Review Notes</span>
                      <textarea name="review_notes" rows="3" value={reviewForm.review_notes || ''} onChange={(event) => handleLoanReviewFieldChange(application.loan_application_id, event)} disabled={isReviewingLoanId === application.loan_application_id} />
                    </label>
                    <div className="dashboard-button-row">
                      <button type="button" className="button-link button-link--primary" disabled={isReviewingLoanId === application.loan_application_id} onClick={() => handleLoanReviewAction(application.loan_application_id, 'approve')}>
                        {isReviewingLoanId === application.loan_application_id ? 'Reviewing...' : 'Approve And Credit Account'}
                      </button>
                      <button type="button" className="button-link button-link--secondary" disabled={isReviewingLoanId === application.loan_application_id} onClick={() => handleLoanReviewAction(application.loan_application_id, 'reject')}>
                        Reject Application
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <p className="dashboard-empty">No pending loan applications are waiting in this branch.</p>
            )}
          </div>
        </article>
      </div>
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Active Loans</p>
              <h3>Current branch lending exposure</h3>
            </div>
          </div>
          <div className="dashboard-stack">
            {activeLoans.length ? (
              activeLoans.map((loan) => (
                <article key={loan.loan_id} className="dashboard-mini-card">
                  <strong>{loan.loan_type} loan</strong>
                  <span>{loan.customer_name}</span>
                  <p>Principal: {formatCurrency(loan.principal_amount)}</p>
                  <p>Outstanding: {formatCurrency(loan.outstanding_amount)}</p>
                  <p>EMI: {formatCurrency(loan.emi_amount)}</p>
                  <p>Disbursed: {formatDate(loan.disbursement_date)}</p>
                </article>
              ))
            ) : (
              <p className="dashboard-empty">There are no active loans in this branch right now.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )

  const renderAccountsTab = () => (
    <div className="dashboard-layout">
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Accounts</p>
              <h3>Edit branch accounts</h3>
            </div>
          </div>
          <div className="dashboard-stack">
            {accounts.length ? (
              accounts.map((account) => {
                const form = accountEditForms[String(account.account_id)] || {}
                return (
                  <article key={account.account_id} className="dashboard-product-card">
                    <div className="dashboard-product-card__head">
                      <div>
                        <strong>{account.account_number}</strong>
                        <span>{account.customer_name}</span>
                      </div>
                      <span className={`dashboard-badge dashboard-badge--${String(account.account_status || '').toLowerCase()}`}>
                        {account.account_status}
                      </span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Current Type: {account.account_type}</p>
                      <p>Balance: {formatCurrency(account.account_balance)}</p>
                      <p>Opened: {formatDate(account.opened_date)}</p>
                    </div>
                    <label className="field-group">
                      <span>Account Type</span>
                      <select name="account_type" value={form.account_type || account.account_type} onChange={(event) => handleAccountEditFieldChange(account.account_id, event)} disabled={isUpdatingAccountId === account.account_id}>
                        {adminAccountTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="field-group">
                      <span>Account Status</span>
                      <select name="account_status" value={form.account_status || account.account_status} onChange={(event) => handleAccountEditFieldChange(account.account_id, event)} disabled={isUpdatingAccountId === account.account_id}>
                        {adminAccountStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="field-group">
                      <span>Annual Interest Rate</span>
                      <input name="annual_interest_rate" type="number" min="0" step="0.01" value={form.annual_interest_rate ?? ''} onChange={(event) => handleAccountEditFieldChange(account.account_id, event)} disabled={isUpdatingAccountId === account.account_id} />
                    </label>
                    <button type="button" className="button-link button-link--primary" disabled={isUpdatingAccountId === account.account_id} onClick={() => handleAccountUpdate(account.account_id)}>
                      {isUpdatingAccountId === account.account_id ? 'Saving...' : 'Save Account Changes'}
                    </button>
                  </article>
                )
              })
            ) : (
              <p className="dashboard-empty">No branch accounts are available.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )

  const renderAuditTab = () => (
    <div className="dashboard-layout">
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Audit Trail</p>
              <h3>Branch accountant audit logs</h3>
            </div>
          </div>
          <div className="dashboard-stack">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <article key={log.audit_log_id} className="dashboard-product-card">
                  <div className="dashboard-product-card__head">
                    <div>
                      <strong>{log.audit_action}</strong>
                      <span>{log.target_table_name} #{log.target_record_id} · {formatDate(log.performed_at, { timeStyle: 'short' })}</span>
                    </div>
                    <span className="dashboard-badge dashboard-badge--active">{log.employee_role || 'Accountant'}</span>
                  </div>
                  <div className="dashboard-product-card__grid">
                    <p>Accountant: {log.accountant_name}</p>
                    <p>IP Address: {log.ip_address || 'Not captured'}</p>
                  </div>
                  <p>Remarks: {log.audit_remarks || 'No remarks recorded.'}</p>
                  <p>Old Value: {log.old_value || 'N/A'}</p>
                  <p>New Value: {log.new_value || 'N/A'}</p>
                </article>
              ))
            ) : (
              <p className="dashboard-empty">No audit logs are available for this branch yet.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )

  const renderCustomersTab = () => (
    <div className="dashboard-layout">
      <div className="dashboard-column">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <p className="hero-card__eyebrow">Customers</p>
              <h3>Customers linked to branch accounts</h3>
            </div>
          </div>
          <div className="dashboard-stack">
            {customers.length ? (
              customers.map((customer) => {
                const form = customerEditForms[String(customer.customer_id)] || {}
                return (
                  <article key={customer.customer_id} className="dashboard-product-card">
                    <div className="dashboard-product-card__head">
                      <div>
                        <strong>{customer.first_name} {customer.last_name}</strong>
                        <span>{customer.customer_email}</span>
                      </div>
                      <span className="dashboard-badge dashboard-badge--active">{customer.kyc_status}</span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Phone: {customer.customer_phone}</p>
                      <p>City: {customer.customer_city}</p>
                      <p>State: {customer.customer_state}</p>
                      <p>Joined: {formatDate(customer.created_at, { timeStyle: 'short' })}</p>
                    </div>
                    <label className="field-group"><span>First Name</span><input name="first_name" value={form.first_name || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>Last Name</span><input name="last_name" value={form.last_name || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>Phone</span><input name="customer_phone" value={form.customer_phone || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>Email</span><input name="customer_email" value={form.customer_email || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>Address</span><input name="customer_address" value={form.customer_address || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>City</span><input name="customer_city" value={form.customer_city || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>State</span><input name="customer_state" value={form.customer_state || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group"><span>Pincode</span><input name="pincode" value={form.pincode || ''} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id} /></label>
                    <label className="field-group">
                      <span>KYC Status</span>
                      <select name="kyc_status" value={form.kyc_status || customer.kyc_status} onChange={(event) => handleCustomerEditFieldChange(customer.customer_id, event)} disabled={isUpdatingCustomerId === customer.customer_id}>
                        {adminKycStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <button type="button" className="button-link button-link--primary" disabled={isUpdatingCustomerId === customer.customer_id} onClick={() => handleCustomerUpdate(customer.customer_id)}>
                      {isUpdatingCustomerId === customer.customer_id ? 'Saving...' : 'Save Customer Changes'}
                    </button>
                  </article>
                )
              })
            ) : (
              <p className="dashboard-empty">No linked customers were found.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )

  return (
    <AdminDashboardLayout
      dashboard={dashboard}
      storedUser={storedUser}
      error={error}
      success={success}
      isLoading={isLoading}
      onLogout={handleLogout}
      title={profile ? `${profile.branch_name} Branch` : 'Branch operations'}
      description="Branch accountants can manage cash operations, accounts, loans, audits, and linked customers from one workspace."
    >
      <div className="dashboard-stats">
        <article className="dashboard-card"><span>Total Accounts In Branch</span><strong>{summary?.total_accounts || 0}</strong><p>Accounts currently mapped to this branch.</p></article>
        <article className="dashboard-card"><span>Total Deposits</span><strong>{formatCurrency(summary?.total_deposits)}</strong><p>Current sum of balances across branch accounts.</p></article>
        <article className="dashboard-card"><span>Transactions Today</span><strong>{summary?.total_transactions_today || 0}</strong><p>Branch transaction count for the current day.</p></article>
        <article className="dashboard-card"><span>Active Loans</span><strong>{summary?.active_loans || 0}</strong><p>Open loan accounts handled by this branch.</p></article>
        <article className="dashboard-card"><span>Pending Loan Requests</span><strong>{summary?.pending_loan_applications || 0}</strong><p>Applications waiting for accountant review.</p></article>
        <article className="dashboard-card"><span>Branch Audit Logs</span><strong>{summary?.branch_audit_logs || 0}</strong><p>Recent audit entries recorded by branch accountants.</p></article>
      </div>

      <div className="dashboard-button-row">
        {adminTabs.map((tab) => (
          <button key={tab.id} type="button" className={`button-link ${activeTab === tab.id ? 'button-link--primary' : 'button-link--secondary'}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'cash' && renderCashTab()}
      {activeTab === 'accounts' && renderAccountsTab()}
      {activeTab === 'loans' && renderLoansTab()}
      {activeTab === 'audit' && renderAuditTab()}
      {activeTab === 'customers' && renderCustomersTab()}

      <PasswordConfirmationModal
        isOpen={passwordModal.isOpen}
        title={passwordModal.title}
        description={passwordModal.description}
        password={passwordModal.password}
        onPasswordChange={handlePasswordChange}
        onClose={closePasswordModal}
        onConfirm={handlePasswordModalConfirm}
        confirmLabel={passwordModal.confirmLabel}
        isSubmitting={
          isSubmittingTransaction ||
          isReviewingLoanId !== null ||
          isUpdatingAccountId !== null ||
          isUpdatingCustomerId !== null
        }
      />
    </AdminDashboardLayout>
  )
}

export default AdminDashboardPage
