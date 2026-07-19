import { Link } from 'react-router-dom'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import { formatCurrency, formatDate, useCustomerDashboard } from '../dashboard/customerDashboard.js'

function DashboardPage() {
  const {
    dashboard,
    isLoading,
    error,
    success,
    storedUser,
    handleLogout,
  } = useCustomerDashboard()

  const profile = dashboard?.profile
  const summary = dashboard?.summary
  const accounts = dashboard?.accounts || []
  const transactions = dashboard?.recent_transactions || []
  const cards = dashboard?.cards || []
  const loans = dashboard?.loans || []
  const transfers = dashboard?.recent_transfers || []

  return (
    <CustomerDashboardLayout
      dashboard={dashboard}
      storedUser={storedUser}
      error={error}
      success={success}
      isLoading={isLoading}
      onLogout={handleLogout}
      title={profile ? `${profile.first_name} ${profile.last_name}` : 'Your banking workspace'}
      description="Overview of linked accounts, recent transactions, transfers, cards, loans, and customer profile data backed by the schema in `dbSyntax.txt`."
      actions={
        <>
          <Link className="button-link button-link--primary" to="/dashboard/profile">
            Update Profile
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/transactions">
            View Activity
          </Link>
        </>
      }
    >
      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>Total Balance</span>
          <strong>{formatCurrency(summary?.total_balance)}</strong>
          <p>{summary?.active_accounts || 0} active accounts currently available.</p>
        </article>
        <article className="dashboard-card">
          <span>Recent Credits</span>
          <strong>{formatCurrency(summary?.total_monthly_credits)}</strong>
          <p>Latest credits across your most recent transactions.</p>
        </article>
        <article className="dashboard-card">
          <span>Recent Debits</span>
          <strong>{formatCurrency(summary?.total_monthly_debits)}</strong>
          <p>Spending and outgoing movement from the latest activity.</p>
        </article>
        <article className="dashboard-card">
          <span>Cards</span>
          <strong>{summary?.active_cards || 0}</strong>
          <p>Active debit or credit cards linked to your accounts.</p>
        </article>
        <article className="dashboard-card">
          <span>Loan Exposure</span>
          <strong>{formatCurrency(summary?.loan_exposure)}</strong>
          <p>Outstanding amount across active or historical loans.</p>
        </article>
        <article className="dashboard-card">
          <span>Transactions</span>
          <strong>{summary?.recent_transaction_count || 0}</strong>
          <p>Most recent entries loaded into your activity feed.</p>
        </article>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Accounts</p>
                <h3>Linked accounts and branch details</h3>
              </div>
              <Link className="dashboard-panel__link" to="/dashboard/accounts">
                See all accounts
              </Link>
            </div>
            <div className="dashboard-stack">
              {accounts.length ? (
                accounts.slice(0, 2).map((account) => (
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
                      <p>Interest: {account.annual_interest_rate ? `${account.annual_interest_rate}%` : 'Not applicable'}</p>
                      <p>Branch: {account.branch_name}</p>
                      <p>IFSC: {account.ifsc_code}</p>
                      <p>Location: {account.branch_city}, {account.branch_state}</p>
                      <p>Opened: {formatDate(account.opened_date)}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No linked accounts were found for this customer.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Transactions</p>
                <h3>Recent transaction activity</h3>
              </div>
              <Link className="dashboard-panel__link" to="/dashboard/transactions">
                Open ledger
              </Link>
            </div>
            <div className="dashboard-table dashboard-table--wide">
              <div className="dashboard-table__row dashboard-table__row--head dashboard-table__row--transactions">
                <span>Reference</span>
                <span>Account</span>
                <span>Type</span>
                <span>Channel</span>
                <span>Amount</span>
                <span>Date</span>
              </div>
              {transactions.length ? (
                transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.transaction_id} className="dashboard-table__row dashboard-table__row--transactions">
                    <span>{transaction.reference_number}</span>
                    <span>{transaction.account_number}</span>
                    <span className={transaction.transaction_type === 'Credit' ? 'text-credit' : 'text-debit'}>
                      {transaction.transaction_type}
                    </span>
                    <span>{transaction.transaction_channel}</span>
                    <span>{formatCurrency(transaction.transaction_amount)}</span>
                    <span>{formatDate(transaction.transaction_date, { timeStyle: 'short' })}</span>
                  </div>
                ))
              ) : (
                <p className="dashboard-empty">No recent transactions were found.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Transfers</p>
                <h3>Incoming and outgoing transfers</h3>
              </div>
              <Link className="dashboard-panel__link" to="/dashboard/transfers">
                View transfers
              </Link>
            </div>
            <div className="dashboard-stack">
              {transfers.length ? (
                transfers.slice(0, 3).map((transfer) => (
                  <article key={transfer.transfer_id} className="dashboard-transfer-card">
                    <div className="dashboard-transfer-card__top">
                      <strong>{transfer.transfer_direction}</strong>
                      <span>{formatCurrency(transfer.transfer_amount)}</span>
                    </div>
                    <p>
                      {transfer.sender_account_number} to {transfer.receiver_account_number}
                    </p>
                    <p>
                      {transfer.transfer_mode} · {transfer.reference_number} · {transfer.transfer_status}
                    </p>
                    <p>{transfer.transfer_remarks || 'No remarks provided.'}</p>
                    <p>Initiated {formatDate(transfer.initiated_at, { timeStyle: 'short' })}</p>
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
                <p className="hero-card__eyebrow">Cards</p>
                <h3>Card portfolio</h3>
              </div>
              <Link className="dashboard-panel__link" to="/dashboard/cards">
                Open cards
              </Link>
            </div>
            <div className="dashboard-stack">
              {cards.length ? (
                cards.slice(0, 3).map((card) => (
                  <article key={card.card_id} className="dashboard-mini-card">
                    <strong>{card.card_network} {card.card_type}</strong>
                    <span>{card.account_number}</span>
                    <p>Holder: {card.card_holder_name}</p>
                    <p>Status: {card.card_status}</p>
                    <p>Expires: {formatDate(card.expiry_date)}</p>
                    <p>
                      Outstanding: {formatCurrency(card.outstanding_amount)}
                      {card.credit_limit ? ` / Limit ${formatCurrency(card.credit_limit)}` : ''}
                    </p>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No cards are linked to this customer yet.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Loans</p>
                <h3>Loan summary</h3>
              </div>
              <Link className="dashboard-panel__link" to="/dashboard/loans">
                Open loans
              </Link>
            </div>
            <div className="dashboard-stack">
              {loans.length ? (
                loans.slice(0, 3).map((loan) => (
                  <article key={loan.loan_id} className="dashboard-mini-card">
                    <strong>{loan.loan_type} loan</strong>
                    <span>{loan.branch_name}</span>
                    <p>Principal: {formatCurrency(loan.principal_amount)}</p>
                    <p>Outstanding: {formatCurrency(loan.outstanding_amount)}</p>
                    <p>EMI: {formatCurrency(loan.emi_amount)}</p>
                    <p>Interest: {loan.annual_interest_rate}%</p>
                    <p>Status: {loan.loan_status}</p>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No loans are currently linked to this customer.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Profile</p>
                <h3>Customer details at a glance</h3>
              </div>
              <Link className="dashboard-panel__link" to="/dashboard/profile">
                Edit profile
              </Link>
            </div>

            {profile ? (
              <div className="dashboard-profile">
                <div className="dashboard-profile__summary">
                  <p>KYC Status: <strong>{profile.kyc_status}</strong></p>
                  <p>Date of birth: <strong>{formatDate(profile.date_of_birth)}</strong></p>
                  <p>Gender: <strong>{profile.gender}</strong></p>
                  <p>PAN: <strong>{profile.pan_number}</strong></p>
                  <p>Aadhaar: <strong>{profile.aadhaar_number}</strong></p>
                  <p>Customer since: <strong>{formatDate(profile.created_at, { timeStyle: 'short' })}</strong></p>
                </div>
              </div>
            ) : (
              <p className="dashboard-empty">Customer profile information is not available.</p>
            )}
          </article>
        </div>
      </div>
    </CustomerDashboardLayout>
  )
}

export default DashboardPage
