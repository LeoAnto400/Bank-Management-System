import { Link, NavLink } from 'react-router-dom'
import { getInitials, sidebarItems } from '../dashboard/customerDashboard.js'

function CustomerDashboardLayout({
  dashboard,
  storedUser,
  error,
  success,
  isLoading,
  onLogout,
  title,
  description,
  actions,
  children,
}) {
  const profile = dashboard?.profile

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand">
          <p className="hero-card__eyebrow">Customer Banking</p>
          <h2>BlueCrest Bank</h2>
          <span className="dashboard-sidebar__subtext">
            Unified view of your accounts, cards, loans, transfers, and profile.
          </span>
        </div>

        <nav className="dashboard-sidebar__nav" aria-label="Dashboard navigation">
          {sidebarItems.map((item) =>
            item.disabled ? (
              <button key={item.id} type="button" className="dashboard-nav__link dashboard-nav__link--disabled" disabled>
                {item.label}
              </button>
            ) : (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  isActive ? 'dashboard-nav__link is-active' : 'dashboard-nav__link'
                }
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="dashboard-sidebar__footer">
          <Link className="button-link button-link--secondary dashboard-side-button" to="/signup">
            Open another profile
          </Link>
          <button type="button" className="dashboard-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="hero-card__eyebrow">Customer Dashboard</p>
            <h1 className="dashboard-title">{title}</h1>
            <p className="dashboard-topbar__text">{description}</p>
          </div>

          <div className="dashboard-user">
            <div className="dashboard-user__meta">
              <strong>{storedUser.customer_email || profile?.customer_email || 'Customer account'}</strong>
              <span>{profile?.kyc_status ? `KYC ${profile.kyc_status}` : 'Customer Account'}</span>
            </div>
            <div className="dashboard-user__avatar">
              {getInitials(profile?.first_name, profile?.last_name)}
            </div>
          </div>
        </header>

        {error ? <p className="form-error dashboard-notice">{error}</p> : null}
        {success ? <p className="form-success dashboard-notice">{success}</p> : null}

        {isLoading ? (
          <section className="dashboard-content">
            <article className="dashboard-hero">
              <div>
                <p className="hero-card__eyebrow">Loading</p>
                <h2>Preparing your banking snapshot.</h2>
                <p>Fetching accounts, transactions, cards, loans, transfers, and profile details.</p>
              </div>
            </article>
          </section>
        ) : (
          <section className="dashboard-content">
            {actions ? (
              <article className="dashboard-hero">
                <div>
                  <p className="hero-card__eyebrow">Financial Snapshot</p>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
                <div className="dashboard-hero__actions">{actions}</div>
              </article>
            ) : null}

            {children}
          </section>
        )}
      </section>
    </main>
  )
}

export default CustomerDashboardLayout
