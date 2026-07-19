import { Link } from 'react-router-dom'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import {
  formatCurrency,
  formatDate,
  useCustomerDashboard,
} from '../dashboard/customerDashboard.js'

function LoansPage() {
  const {
    dashboard,
    loanApplicationForm,
    repaymentForm,
    isLoading,
    isSubmittingLoanApplication,
    isSubmittingRepayment,
    error,
    success,
    storedUser,
    handleLogout,
    handleLoanApplicationFormChange,
    handleLoanApplicationSubmit,
    handleRepaymentFormChange,
    handleLoanRepaymentSubmit,
  } = useCustomerDashboard()

  const loans = dashboard?.loans || []
  const applications = dashboard?.loan_applications || []
  const loanPayments = dashboard?.loan_payments || []
  const loanTypes = dashboard?.loan_types || []
  const paymentMethods = dashboard?.loan_payment_methods || []
  const accounts = dashboard?.accounts || []
  const activeAccounts = accounts.filter((account) => account.account_status === 'Active')
  const activeLoans = loans.filter((loan) => loan.loan_status === 'Active')
  const selectedLoan = activeLoans.find((loan) => String(loan.loan_id) === String(repaymentForm.loan_id))
  const selectedRepaymentAccount = activeAccounts.find(
    (account) => String(account.account_id) === String(repaymentForm.source_account_id)
  )

  const totalPrincipal = loans.reduce((sum, loan) => sum + Number(loan.principal_amount || 0), 0)
  const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstanding_amount || 0), 0)
  const pendingApplications = applications.filter(
    (application) => application.application_status === 'Pending'
  ).length

  const linkedApplicationByLoanId = applications.reduce((map, application) => {
    if (application.created_loan_id) {
      map[String(application.created_loan_id)] = application
    }

    return map
  }, {})

  return (
    <CustomerDashboardLayout
      dashboard={dashboard}
      storedUser={storedUser}
      error={error}
      success={success}
      isLoading={isLoading}
      onLogout={handleLogout}
      title="Loans Overview"
      description="Apply for a new loan, track review status, repay active loans, and inspect every sanctioned amount, EMI, payment, and linked account in one place."
      actions={
        <>
          <Link className="button-link button-link--primary" to="/dashboard/accounts">
            Open Accounts
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/profile">
            View Profile
          </Link>
        </>
      }
    >
      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>Total Loans</span>
          <strong>{loans.length}</strong>
          <p>{activeLoans.length} currently active across all sanctioned loans.</p>
        </article>
        <article className="dashboard-card">
          <span>Principal Amount</span>
          <strong>{formatCurrency(totalPrincipal)}</strong>
          <p>Total sanctioned principal across the customer portfolio.</p>
        </article>
        <article className="dashboard-card">
          <span>Outstanding Amount</span>
          <strong>{formatCurrency(totalOutstanding)}</strong>
          <p>{pendingApplications} application{pendingApplications === 1 ? '' : 's'} still awaiting review.</p>
        </article>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Apply</p>
                <h3>Submit a fresh loan request</h3>
              </div>
            </div>

            <form className="auth-form dashboard-profile__form" onSubmit={handleLoanApplicationSubmit}>
              <div className="form-grid">
                <label className="field-group">
                  <span>Loan Type</span>
                  <select
                    name="loan_type"
                    value={loanApplicationForm.loan_type}
                    onChange={handleLoanApplicationFormChange}
                    disabled={isSubmittingLoanApplication || loanTypes.length === 0}
                  >
                    <option value="">Select loan type</option>
                    {loanTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Linked Account</span>
                  <select
                    name="linked_account_id"
                    value={loanApplicationForm.linked_account_id}
                    onChange={handleLoanApplicationFormChange}
                    disabled={isSubmittingLoanApplication || activeAccounts.length === 0}
                  >
                    <option value="">Select destination account</option>
                    {activeAccounts.map((account) => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_number} · {account.account_type} · {formatCurrency(account.account_balance)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Requested Amount</span>
                  <input
                    name="requested_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={loanApplicationForm.requested_amount}
                    onChange={handleLoanApplicationFormChange}
                    disabled={isSubmittingLoanApplication}
                    placeholder="0.00"
                  />
                </label>

                <label className="field-group">
                  <span>Tenure In Months</span>
                  <input
                    name="tenure_months"
                    type="number"
                    min="1"
                    step="1"
                    value={loanApplicationForm.tenure_months}
                    onChange={handleLoanApplicationFormChange}
                    disabled={isSubmittingLoanApplication}
                    placeholder="Example: 60"
                  />
                </label>

                <label className="field-group field-group--full">
                  <span>Purpose</span>
                  <textarea
                    name="purpose"
                    value={loanApplicationForm.purpose}
                    onChange={handleLoanApplicationFormChange}
                    disabled={isSubmittingLoanApplication}
                    placeholder="Explain why you need the loan and how it will be used."
                    rows="4"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="button-link button-link--primary auth-submit"
                disabled={isSubmittingLoanApplication || !loanApplicationForm.loan_type || !loanApplicationForm.linked_account_id}
              >
                {isSubmittingLoanApplication ? 'Submitting Loan Request...' : 'Apply For Loan'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Repay</p>
                <h3>Repay an active loan from your account</h3>
              </div>
            </div>

            <form className="auth-form dashboard-profile__form" onSubmit={handleLoanRepaymentSubmit}>
              <div className="form-grid">
                <label className="field-group">
                  <span>Loan</span>
                  <select
                    name="loan_id"
                    value={repaymentForm.loan_id}
                    onChange={handleRepaymentFormChange}
                    disabled={isSubmittingRepayment || activeLoans.length === 0}
                  >
                    <option value="">Select active loan</option>
                    {activeLoans.map((loan) => (
                      <option key={loan.loan_id} value={loan.loan_id}>
                        {loan.loan_type} · Outstanding {formatCurrency(loan.outstanding_amount)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Repayment Account</span>
                  <select
                    name="source_account_id"
                    value={repaymentForm.source_account_id}
                    onChange={handleRepaymentFormChange}
                    disabled={isSubmittingRepayment || activeAccounts.length === 0}
                  >
                    <option value="">Select repayment account</option>
                    {activeAccounts.map((account) => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_number} · {formatCurrency(account.account_balance)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Repayment Amount</span>
                  <input
                    name="repayment_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={repaymentForm.repayment_amount}
                    onChange={handleRepaymentFormChange}
                    disabled={isSubmittingRepayment}
                    placeholder={selectedLoan ? `${selectedLoan.emi_amount}` : '0.00'}
                  />
                </label>

                <label className="field-group">
                  <span>Payment Method</span>
                  <select
                    name="payment_method"
                    value={repaymentForm.payment_method}
                    onChange={handleRepaymentFormChange}
                    disabled={isSubmittingRepayment}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="dashboard-profile__summary dashboard-profile__summary--cards">
                <div className="dashboard-mini-card">
                  <strong>Selected loan</strong>
                  <p>{selectedLoan ? `${selectedLoan.loan_type} loan` : 'Choose a loan to repay'}</p>
                  <p>Outstanding: {selectedLoan ? formatCurrency(selectedLoan.outstanding_amount) : 'N/A'}</p>
                  <p>EMI: {selectedLoan ? formatCurrency(selectedLoan.emi_amount) : 'N/A'}</p>
                </div>
                <div className="dashboard-mini-card">
                  <strong>Repayment account</strong>
                  <p>{selectedRepaymentAccount?.account_number || 'Choose an account'}</p>
                  <p>Available balance: {selectedRepaymentAccount ? formatCurrency(selectedRepaymentAccount.account_balance) : 'N/A'}</p>
                  <p>Status: {selectedRepaymentAccount?.account_status || 'Unknown'}</p>
                </div>
              </div>

              <button
                type="submit"
                className="button-link button-link--primary auth-submit"
                disabled={isSubmittingRepayment || !repaymentForm.loan_id || !repaymentForm.source_account_id}
              >
                {isSubmittingRepayment ? 'Recording Repayment...' : 'Repay Loan'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Payment History</p>
                <h3>Latest repayments and component split</h3>
              </div>
            </div>
            <div className="dashboard-table dashboard-table--wide">
              <div className="dashboard-table__row dashboard-table__row--head dashboard-table__row--transactions-extended">
                <span>Loan</span>
                <span>Reference</span>
                <span>Method</span>
                <span>Status</span>
                <span>Paid</span>
                <span>Principal</span>
                <span>Interest</span>
                <span>Date</span>
              </div>
              {loanPayments.length ? (
                loanPayments.map((payment) => (
                  <div key={payment.payment_id} className="dashboard-table__row dashboard-table__row--transactions-extended">
                    <span>{payment.loan_type}</span>
                    <span>{payment.reference_number}</span>
                    <span>{payment.payment_method}</span>
                    <span>{payment.payment_status}</span>
                    <span>{formatCurrency(payment.amount_paid)}</span>
                    <span>{formatCurrency(payment.principal_component)}</span>
                    <span>{formatCurrency(payment.interest_component)}</span>
                    <span>{formatDate(payment.payment_date)}</span>
                  </div>
                ))
              ) : (
                <p className="dashboard-empty">No loan repayments have been recorded yet.</p>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Applications</p>
                <h3>Loan request tracking</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              {applications.length ? (
                applications.map((application) => (
                  <article key={application.loan_application_id} className="dashboard-product-card">
                    <div className="dashboard-product-card__head">
                      <div>
                        <strong>{application.loan_type} loan request</strong>
                        <span>Applied {formatDate(application.created_at, { timeStyle: 'short' })}</span>
                      </div>
                      <span className={`dashboard-badge dashboard-badge--${String(application.application_status || '').toLowerCase()}`}>
                        {application.application_status}
                      </span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Requested: {formatCurrency(application.requested_amount)}</p>
                      <p>Approved: {application.approved_amount ? formatCurrency(application.approved_amount) : 'Pending review'}</p>
                      <p>Rate: {application.annual_interest_rate}%</p>
                      <p>Estimated EMI: {formatCurrency(application.estimated_emi)}</p>
                      <p>Tenure: {application.tenure_months} months</p>
                      <p>Branch: {application.branch_name}</p>
                      <p>Linked account: {application.linked_account_number}</p>
                      <p>Linked balance: {formatCurrency(application.linked_account_balance)}</p>
                    </div>
                    <p>Purpose: {application.purpose}</p>
                    <p>
                      Review notes:{' '}
                      {application.review_notes || 'Still waiting for accountant review.'}
                    </p>
                    {application.reviewed_by_name ? (
                      <p>
                        Reviewed by {application.reviewed_by_name} on{' '}
                        {formatDate(application.reviewed_at, { timeStyle: 'short' })}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">You have not submitted any loan applications yet.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Sanctioned Loans</p>
                <h3>Current loans and maturity position</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              {loans.length ? (
                loans.map((loan) => {
                  const linkedApplication = linkedApplicationByLoanId[String(loan.loan_id)]

                  return (
                    <article key={loan.loan_id} className="dashboard-product-card">
                      <div className="dashboard-product-card__head">
                        <div>
                          <strong>{loan.loan_type} loan</strong>
                          <span>{loan.branch_name}</span>
                        </div>
                        <span className={`dashboard-badge dashboard-badge--${String(loan.loan_status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                          {loan.loan_status}
                        </span>
                      </div>
                      <div className="dashboard-product-card__grid">
                        <p>Principal: {formatCurrency(loan.principal_amount)}</p>
                        <p>Outstanding: {formatCurrency(loan.outstanding_amount)}</p>
                        <p>EMI: {formatCurrency(loan.emi_amount)}</p>
                        <p>Rate: {loan.annual_interest_rate}%</p>
                        <p>Tenure: {loan.tenure_months} months</p>
                        <p>Disbursed: {formatDate(loan.disbursement_date)}</p>
                        <p>Maturity: {formatDate(loan.maturity_date)}</p>
                        <p>
                          Destination account:{' '}
                          {linkedApplication?.linked_account_number || 'Legacy loan record'}
                        </p>
                      </div>
                    </article>
                  )
                })
              ) : (
                <p className="dashboard-empty">No loans are currently linked to this customer.</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </CustomerDashboardLayout>
  )
}

export default LoansPage
