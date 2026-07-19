import { Link } from 'react-router-dom'
import PasswordConfirmationModal from '../components/PasswordConfirmationModal.jsx'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import { formatCurrency, formatDate, useCustomerDashboard } from '../dashboard/customerDashboard.js'

function TransfersPage() {
  const {
    dashboard,
    isLoading,
    isSubmittingTransfer,
    passwordModal,
    error,
    success,
    storedUser,
    handleLogout,
    transferForm,
    handleTransferFormChange,
    handleTransferSubmit,
    handlePasswordChange,
    handlePasswordModalConfirm,
    closePasswordModal,
  } = useCustomerDashboard()

  const transfers = dashboard?.recent_transfers || []
  const accounts = dashboard?.accounts || []
  const senderAccount = accounts.find(
    (account) => String(account.account_id) === String(transferForm.sender_account_id)
  )
  const outgoingTransfers = transfers.filter((transfer) => transfer.transfer_direction === 'Outgoing')
  const incomingTransfers = transfers.filter((transfer) => transfer.transfer_direction === 'Incoming')
  const totalOutgoing = outgoingTransfers.reduce(
    (sum, transfer) => sum + Number(transfer.transfer_amount || 0),
    0
  )
  const totalIncoming = incomingTransfers.reduce(
    (sum, transfer) => sum + Number(transfer.transfer_amount || 0),
    0
  )

  return (
    <CustomerDashboardLayout
      dashboard={dashboard}
      storedUser={storedUser}
      error={error}
      success={success}
      isLoading={isLoading}
      onLogout={handleLogout}
      title="Transfers Activity"
      description="Move money between accounts with a secure confirmation modal. Successful transfers update the Transfers table, create matching debit and credit transaction rows, and refresh both account balances atomically."
      actions={
        <>
          <Link className="button-link button-link--primary" to="/dashboard/transactions">
            Open Transactions
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/accounts">
            View Accounts
          </Link>
        </>
      }
    >
      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>Recent Transfers</span>
          <strong>{transfers.length}</strong>
          <p>Transfers where the customer is sender or receiver.</p>
        </article>
        <article className="dashboard-card">
          <span>Total Outgoing</span>
          <strong>{formatCurrency(totalOutgoing)}</strong>
          <p>Successful outgoing movement from customer-linked accounts.</p>
        </article>
        <article className="dashboard-card">
          <span>Transfer Balance</span>
          <strong>
            {senderAccount
              ? formatCurrency(senderAccount.account_balance, senderAccount.account_currency)
              : formatCurrency(0)}
          </strong>
          <p>
            {senderAccount
              ? `${senderAccount.account_number} is ${senderAccount.account_status}.`
              : 'Select a source account to review its current balance.'}
          </p>
        </article>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Send Money</p>
                <h3>Create a customer transfer</h3>
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
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_number} · {account.account_type} · {account.account_status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-group">
                  <span>Destination account no</span>
                  <input
                    name="destination_account_number"
                    type="text"
                    value={transferForm.destination_account_number}
                    onChange={handleTransferFormChange}
                    disabled={isSubmittingTransfer}
                    placeholder="Enter account number"
                  />
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
                  placeholder="What is this transfer for?"
                />
              </label>
              <div className="dashboard-profile__summary dashboard-profile__summary--cards">
                <div className="dashboard-mini-card">
                  <strong>From account status</strong>
                  <p>{senderAccount?.account_status || 'No account selected'}</p>
                </div>
                <div className="dashboard-mini-card">
                  <strong>Available balance</strong>
                  <p>
                    {senderAccount
                      ? formatCurrency(senderAccount.account_balance, senderAccount.account_currency)
                      : 'Select an account first'}
                  </p>
                </div>
              </div>
              {senderAccount && senderAccount.account_status !== 'Active' ? (
                <p className="form-error">
                  This account is {senderAccount.account_status.toLowerCase()}, so outgoing transfers are blocked.
                </p>
              ) : null}
              <p className="auth-helper auth-helper--muted">
                You will confirm this transfer in a secure password modal before it is submitted.
              </p>
              <button
                type="submit"
                className="button-link button-link--primary auth-submit"
                disabled={isSubmittingTransfer || !senderAccount || senderAccount.account_status !== 'Active'}
              >
                {isSubmittingTransfer ? 'Processing Transfer...' : 'Transfer Money'}
              </button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Transfers</p>
                <h3>Detailed transfer feed</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              {transfers.length ? (
                transfers.map((transfer) => (
                  <article key={transfer.transfer_id} className="dashboard-transfer-card">
                    <div className="dashboard-transfer-card__top">
                      <strong>{transfer.transfer_direction}</strong>
                      <span>{formatCurrency(transfer.transfer_amount)}</span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Sender account: {transfer.sender_account_number}</p>
                      <p>Receiver account: {transfer.receiver_account_number}</p>
                      <p>Transfer mode: {transfer.transfer_mode}</p>
                      <p>Status: {transfer.transfer_status}</p>
                      <p>Reference number: {transfer.reference_number}</p>
                      <p>Initiated at: {formatDate(transfer.initiated_at, { timeStyle: 'short' })}</p>
                      <p>Completed at: {formatDate(transfer.completed_at, { timeStyle: 'short' })}</p>
                      <p>Remarks: {transfer.transfer_remarks || 'No remarks provided'}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No recent transfers were found.</p>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Direction Mix</p>
                <h3>Incoming vs outgoing</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              <article className="dashboard-mini-card">
                <strong>Outgoing transfers</strong>
                <p>{outgoingTransfers.length} transfer{outgoingTransfers.length === 1 ? '' : 's'} initiated from customer-linked accounts.</p>
              </article>
              <article className="dashboard-mini-card">
                <strong>Incoming transfers</strong>
                <p>{incomingTransfers.length} transfer{incomingTransfers.length === 1 ? '' : 's'} received into customer-linked accounts.</p>
              </article>
              <article className="dashboard-mini-card">
                <strong>Total incoming</strong>
                <p>{formatCurrency(totalIncoming)} has been received across the current feed.</p>
              </article>
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
    </CustomerDashboardLayout>
  )
}

export default TransfersPage
