import { Link } from 'react-router-dom'
import AppModal from '../components/AppModal.jsx'
import PasswordConfirmationModal from '../components/PasswordConfirmationModal.jsx'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import {
  accountStatusOptions,
  accountTypeOptions,
  formatCurrency,
  formatDate,
  useCustomerDashboard,
} from '../dashboard/customerDashboard.js'

function AccountsPage() {
  const {
    dashboard,
    isLoading,
    isCreatingAccount,
    isUpdatingAccountStatus,
    isSubmittingTransfer,
    passwordModal,
    accountCreationModal,
    error,
    success,
    storedUser,
    handleLogout,
    accountForm,
    transferForm,
    handleAccountFormChange,
    handleCreateAccount,
    handleAccountStatusChange,
    handleTransferFormChange,
    handleTransferSubmit,
    handlePasswordChange,
    handlePasswordModalConfirm,
    closePasswordModal,
    handleAccountCreationModalConfirm,
    closeAccountCreationModal,
  } = useCustomerDashboard()

  const accounts = dashboard?.accounts || []
  const cards = dashboard?.cards || []
  const loans = dashboard?.loans || []
  const frozenAccounts = accounts.filter((account) => account.account_status === 'Frozen').length
  const senderAccount = accounts.find(
    (account) => String(account.account_id) === String(transferForm.sender_account_id)
  )
  const destinationAccount = accounts.find(
    (account) => account.account_number === transferForm.destination_account_number
  )

  const title = dashboard?.profile
    ? `${dashboard.profile.first_name}'s Accounts`
    : 'Your accounts'

  const description =
    'Detailed account portfolio built from the Accounts and Branches tables, with linked card and loan context pulled from your customer dashboard.'

  return (
    <CustomerDashboardLayout
      dashboard={dashboard}
      storedUser={storedUser}
      error={error}
      success={success}
      isLoading={isLoading}
      onLogout={handleLogout}
      title={title}
      description={description}
      actions={
        <>
          <Link className="button-link button-link--primary" to="/dashboard/transactions">
            Review Transactions
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/profile">
            Open Profile
          </Link>
        </>
      }
    >
      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>Linked Accounts</span>
          <strong>{accounts.length}</strong>
          <p>Total customer accounts mapped from the `Accounts` table.</p>
        </article>
        <article className="dashboard-card">
          <span>Total Balance</span>
          <strong>{formatCurrency(dashboard?.summary?.total_balance)}</strong>
          <p>Combined `account_balance` across all linked accounts.</p>
        </article>
        <article className="dashboard-card">
          <span>Frozen Accounts</span>
          <strong>{frozenAccounts}</strong>
          <p>Frozen accounts cannot submit new transactions until reactivated.</p>
        </article>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Accounts</p>
                <h3>Account registry and branch assignment</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              {accounts.length ? (
                accounts.map((account) => (
                  <article key={account.account_id} className="dashboard-product-card">
                    <div className="dashboard-product-card__head">
                      <div>
                        <strong>{account.account_type}</strong>
                        <span>{account.account_number}</span>
                      </div>
                      <span className={`dashboard-badge dashboard-badge--${String(account.account_status || '').toLowerCase()}`}>
                        {account.account_status}
                      </span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Balance: {formatCurrency(account.account_balance, account.account_currency || 'INR')}</p>
                      <p>Available to transact: {account.account_status === 'Active' ? 'Yes' : 'No'}</p>
                      <p>Currency: {account.account_currency}</p>
                      <p>Interest rate: {account.annual_interest_rate ? `${account.annual_interest_rate}%` : 'Not applicable'}</p>
                      <p>Opened date: {formatDate(account.opened_date)}</p>
                      <p>Closed date: {formatDate(account.closed_date)}</p>
                      <p>Branch: {account.branch_name}</p>
                      <p>IFSC code: {account.ifsc_code}</p>
                      <p>City: {account.branch_city}</p>
                      <p>State: {account.branch_state}</p>
                    </div>
                    <form
                      className="dashboard-inline-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        const nextStatus = new FormData(event.currentTarget).get('account_status')
                        handleAccountStatusChange(account.account_id, nextStatus)
                      }}
                    >
                      <label className="field-group">
                        <span>Update account status</span>
                        <select
                          name="account_status"
                          defaultValue={account.account_status}
                          disabled={isUpdatingAccountStatus || account.account_status === 'Closed'}
                        >
                          {accountStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="button-link button-link--secondary dashboard-inline-button"
                        disabled={isUpdatingAccountStatus || account.account_status === 'Closed'}
                      >
                        {account.account_status === 'Closed'
                          ? 'Account Closed'
                          : isUpdatingAccountStatus
                            ? 'Saving...'
                            : 'Save Status'}
                      </button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No linked accounts were found for this customer.</p>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Open Account</p>
                <h3>Create a new customer account</h3>
              </div>
            </div>
            <form className="auth-form dashboard-profile__form" onSubmit={handleCreateAccount}>
              <label className="field-group">
                <span>Account type</span>
                <select
                  name="account_type"
                  value={accountForm.account_type}
                  onChange={handleAccountFormChange}
                  disabled={isCreatingAccount}
                >
                  {accountTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <article className="dashboard-mini-card">
                <strong>Opening balance</strong>
                <p>Every new account starts at {formatCurrency(0)} and cannot be edited during creation.</p>
              </article>
              <button type="submit" className="button-link button-link--primary auth-submit" disabled={isCreatingAccount}>
                {isCreatingAccount ? 'Creating Account...' : 'Create New Account'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Own Account Transfer</p>
                <h3>Move money between your own accounts</h3>
              </div>
            </div>
            <form className="auth-form dashboard-profile__form" onSubmit={handleTransferSubmit}>
              <div className="form-grid">
                <label className="field-group">
                  <span>From account</span>
                  <select
                    name="sender_account_id"
                    value={transferForm.sender_account_id}
                    onChange={handleTransferFormChange}
                    disabled={isSubmittingTransfer || accounts.length === 0}
                  >
                    <option value="">Select source account</option>
                    {accounts.map((account) => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_number} · {account.account_type} · {account.account_status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-group">
                  <span>To account</span>
                  <select
                    name="destination_account_number"
                    value={transferForm.destination_account_number}
                    onChange={handleTransferFormChange}
                    disabled={isSubmittingTransfer || accounts.length < 2}
                  >
                    <option value="">Select destination account</option>
                    {accounts
                      .filter((account) => String(account.account_id) !== String(transferForm.sender_account_id))
                      .map((account) => (
                        <option key={account.account_id} value={account.account_number}>
                          {account.account_number} · {account.account_type} · {account.account_status}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field-group">
                  <span>Amount</span>
                  <input
                    name="transfer_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transferForm.transfer_amount}
                    onChange={handleTransferFormChange}
                    disabled={isSubmittingTransfer}
                    placeholder="0.00"
                  />
                </label>
              </div>
              <label className="field-group">
                <span>Description</span>
                <input
                  name="transfer_remarks"
                  type="text"
                  value={transferForm.transfer_remarks}
                  onChange={handleTransferFormChange}
                  disabled={isSubmittingTransfer}
                  placeholder="Example: Move savings into new account"
                />
              </label>
              <div className="dashboard-profile__summary dashboard-profile__summary--cards">
                <div className="dashboard-mini-card">
                  <strong>Source balance</strong>
                  <p>
                    {senderAccount
                      ? formatCurrency(senderAccount.account_balance, senderAccount.account_currency)
                      : 'Select a source account'}
                  </p>
                </div>
                <div className="dashboard-mini-card">
                  <strong>Destination status</strong>
                  <p>{destinationAccount?.account_status || 'Select a destination account'}</p>
                </div>
              </div>
              <p className="auth-helper auth-helper--muted">
                You will confirm this transfer in a secure password modal before it is submitted.
              </p>
              <button
                type="submit"
                className="button-link button-link--primary auth-submit"
                disabled={
                  isSubmittingTransfer ||
                  !senderAccount ||
                  !destinationAccount ||
                  senderAccount.account_status !== 'Active' ||
                  destinationAccount.account_status !== 'Active'
                }
              >
                {isSubmittingTransfer ? 'Processing Transfer...' : 'Transfer Between My Accounts'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Cards</p>
                <h3>Cards linked to each account</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              {cards.length ? (
                cards.map((card) => (
                  <article key={card.card_id} className="dashboard-mini-card">
                    <strong>{card.card_network} {card.card_type}</strong>
                    <span>{card.account_number}</span>
                    <p>Holder name: {card.card_holder_name}</p>
                    <p>Issued: {formatDate(card.issue_date)}</p>
                    <p>Expires: {formatDate(card.expiry_date)}</p>
                    <p>Status: {card.card_status}</p>
                    <p>
                      Outstanding: {formatCurrency(card.outstanding_amount)}
                      {card.credit_limit ? ` / Limit ${formatCurrency(card.credit_limit)}` : ''}
                    </p>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No cards are linked to these accounts yet.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Loans</p>
                <h3>Borrowing exposure connected to this customer</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              {loans.length ? (
                loans.map((loan) => (
                  <article key={loan.loan_id} className="dashboard-mini-card">
                    <strong>{loan.loan_type} loan</strong>
                    <span>{loan.branch_name}</span>
                    <p>Principal amount: {formatCurrency(loan.principal_amount)}</p>
                    <p>Outstanding amount: {formatCurrency(loan.outstanding_amount)}</p>
                    <p>Tenure: {loan.tenure_months} months</p>
                    <p>EMI amount: {formatCurrency(loan.emi_amount)}</p>
                    <p>Interest rate: {loan.annual_interest_rate}%</p>
                    <p>Status: {loan.loan_status}</p>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No loans are currently linked to this customer.</p>
              )}
            </div>
          </article>
        </div>
      </div>

      <PasswordConfirmationModal
        isOpen={passwordModal.isOpen}
        title={passwordModal.title}
        description={passwordModal.description}
        password={passwordModal.password}
        onPasswordChange={handlePasswordChange}
        onClose={closePasswordModal}
        onConfirm={handlePasswordModalConfirm}
        confirmLabel={passwordModal.confirmLabel}
        isSubmitting={isSubmittingTransfer}
      />

      <AppModal
        isOpen={accountCreationModal.isOpen}
        eyebrow="Account Setup"
        title={accountCreationModal.title}
        description={accountCreationModal.description}
        confirmLabel={accountCreationModal.confirmLabel}
        cancelLabel={accountCreationModal.cancelLabel}
        showCancel={accountCreationModal.showCancel}
        onConfirm={handleAccountCreationModalConfirm}
        onClose={closeAccountCreationModal}
      />
    </CustomerDashboardLayout>
  )
}

export default AccountsPage
