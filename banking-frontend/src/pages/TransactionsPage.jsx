import { Link } from 'react-router-dom'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import { formatCurrency, formatDate, useCustomerDashboard } from '../dashboard/customerDashboard.js'

function TransactionsPage() {
  const {
    dashboard,
    isLoading,
    error,
    success,
    storedUser,
    handleLogout,
  } = useCustomerDashboard()

  const transactions = dashboard?.recent_transactions || []
  const transfers = dashboard?.recent_transfers || []

  const title = 'Transactions & Transfer Activity'
  const description =
    'A focused activity ledger using fields from the Transactions and Transfers tables, including channel, reference number, status, and post-transaction balance.'

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
          <Link className="button-link button-link--primary" to="/dashboard/transfers">
            Transfer Money
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/profile">
            Update Profile
          </Link>
        </>
      }
    >
      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>Recent Transactions</span>
          <strong>{dashboard?.summary?.recent_transaction_count || 0}</strong>
          <p>The latest entries fetched from the `Transactions` table.</p>
        </article>
        <article className="dashboard-card">
          <span>Credits</span>
          <strong>{formatCurrency(dashboard?.summary?.total_monthly_credits)}</strong>
          <p>Total recent incoming movement across linked accounts.</p>
        </article>
        <article className="dashboard-card">
          <span>Transfers in Feed</span>
          <strong>{transfers.length}</strong>
          <p>Use the Transfer Money button to move funds between accounts.</p>
        </article>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Transactions</p>
                <h3>Transaction ledger</h3>
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
              {transactions.length ? (
                transactions.map((transaction) => (
                  <div key={transaction.transaction_id} className="dashboard-table__row dashboard-table__row--transactions-extended">
                    <span>{transaction.reference_number}</span>
                    <span>
                      {transaction.account_number}
                      <small className="dashboard-inline-note">{transaction.account_type}</small>
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
                <p className="dashboard-empty">No recent transactions were found.</p>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Transfers</p>
                <h3>Recent money movement between accounts</h3>
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
                    <p>
                      {transfer.sender_account_number} to {transfer.receiver_account_number}
                    </p>
                    <p>
                      {transfer.transfer_mode} · {transfer.reference_number}
                    </p>
                    <p>Status: {transfer.transfer_status}</p>
                    <p>{transfer.transfer_remarks || 'No remarks provided.'}</p>
                    <p>Initiated: {formatDate(transfer.initiated_at, { timeStyle: 'short' })}</p>
                    <p>Completed: {formatDate(transfer.completed_at, { timeStyle: 'short' })}</p>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No recent transfers were found.</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </CustomerDashboardLayout>
  )
}

export default TransactionsPage
