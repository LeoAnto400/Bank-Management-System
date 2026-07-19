import { Link } from 'react-router-dom'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import { formatCurrency, formatDate, useCustomerDashboard } from '../dashboard/customerDashboard.js'

function CardsPage() {
  const {
    dashboard,
    isLoading,
    error,
    success,
    storedUser,
    handleLogout,
  } = useCustomerDashboard()

  const cards = dashboard?.cards || []
  const accounts = dashboard?.accounts || []

  const creditCards = cards.filter((card) => card.card_type === 'Credit')
  const debitCards = cards.filter((card) => card.card_type === 'Debit')
  const blockedCards = cards.filter((card) => card.card_status === 'Blocked')
  const totalOutstanding = creditCards.reduce(
    (sum, card) => sum + Number(card.outstanding_amount || 0),
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
      title="Cards Portfolio"
      description="A dedicated card view based on the `Cards` table, showing card type, network, holder name, issue and expiry dates, credit limits, outstanding amount, linked account number, and current card status."
      actions={
        <>
          <Link className="button-link button-link--primary" to="/dashboard/accounts">
            View Accounts
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/transfers">
            Open Transfers
          </Link>
        </>
      }
    >
      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>Total Cards</span>
          <strong>{cards.length}</strong>
          <p>All card records linked to the customer from the `Cards` table.</p>
        </article>
        <article className="dashboard-card">
          <span>Debit / Credit</span>
          <strong>{debitCards.length} / {creditCards.length}</strong>
          <p>Split across `card_type` values in the schema.</p>
        </article>
        <article className="dashboard-card">
          <span>Outstanding Amount</span>
          <strong>{formatCurrency(totalOutstanding)}</strong>
          <p>Total active credit dues using `outstanding_amount`.</p>
        </article>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Cards</p>
                <h3>Linked debit and credit cards</h3>
              </div>
            </div>
            <div className="dashboard-grid-cards">
              {cards.length ? (
                cards.map((card) => (
                  <article key={card.card_id} className="dashboard-mini-card dashboard-mini-card--emphasis">
                    <div className="dashboard-product-card__head">
                      <div>
                        <strong>{card.card_network} {card.card_type}</strong>
                        <span>{card.account_number}</span>
                      </div>
                      <span className={`dashboard-badge dashboard-badge--${String(card.card_status || '').toLowerCase()}`}>
                        {card.card_status}
                      </span>
                    </div>
                    <div className="dashboard-product-card__grid">
                      <p>Holder name: {card.card_holder_name}</p>
                      <p>Issue date: {formatDate(card.issue_date)}</p>
                      <p>Expiry date: {formatDate(card.expiry_date)}</p>
                      <p>Card type: {card.card_type}</p>
                      <p>Network: {card.card_network}</p>
                      <p>Outstanding: {formatCurrency(card.outstanding_amount)}</p>
                      <p>Credit limit: {card.credit_limit ? formatCurrency(card.credit_limit) : 'Not applicable'}</p>
                      <p>Linked account: {card.account_number}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No cards are linked to this customer yet.</p>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Card Summary</p>
                <h3>Portfolio overview</h3>
              </div>
            </div>
            <div className="dashboard-stack">
              <article className="dashboard-mini-card">
                <strong>Blocked cards</strong>
                <p>{blockedCards.length} card{blockedCards.length === 1 ? '' : 's'} currently blocked or restricted.</p>
              </article>
              <article className="dashboard-mini-card">
                <strong>Active accounts with cards</strong>
                <p>{new Set(cards.map((card) => card.account_number)).size} accounts currently have at least one card attached.</p>
              </article>
              <article className="dashboard-mini-card">
                <strong>Accounts on file</strong>
                <p>{accounts.length} linked account{accounts.length === 1 ? '' : 's'} available to map cards against.</p>
              </article>
            </div>
          </article>
        </div>
      </div>
    </CustomerDashboardLayout>
  )
}

export default CardsPage
