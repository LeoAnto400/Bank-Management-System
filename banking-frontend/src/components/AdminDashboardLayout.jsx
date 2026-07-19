import { getInitials } from '../dashboard/customerDashboard.js'

function AdminDashboardLayout({
  dashboard,
  storedUser,
  error,
  success,
  isLoading,
  onLogout,
  title,
  description,
  children,
}) {
  const profile = dashboard?.profile

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar dashboard-sidebar--admin">
        <div className="dashboard-sidebar__brand">
          <p className="hero-card__eyebrow">Branch Operations</p>
          <h2>BlueCrest Admin</h2>
          <span className="dashboard-sidebar__subtext">
            Restricted access to branch accounts, branch customers, branch transactions, and
            lending exposure.
          </span>
        </div>

        <div className="dashboard-note-card">
          <strong>{profile?.branch_name || 'Assigned branch'}</strong>
          <p>
            {profile?.branch_city}, {profile?.branch_state}
          </p>
          <p>{profile?.ifsc_code || 'IFSC unavailable'}</p>
        </div>

        <div className="dashboard-note-card">
          <strong>Access boundary</strong>
          <p>Only accounts, customers, loans, and transactions from this branch are shown.</p>
        </div>

        <div className="dashboard-sidebar__footer">
          <button type="button" className="dashboard-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="hero-card__eyebrow">Admin Dashboard</p>
            <h1 className="dashboard-title">{title}</h1>
            <p className="dashboard-topbar__text">{description}</p>
          </div>

          <div className="dashboard-user">
            <div className="dashboard-user__meta">
              <strong>{storedUser.accountant_email || profile?.accountant_email || 'Admin account'}</strong>
              <span>{profile?.employee_role || 'Accountant access'}</span>
            </div>
            <div className="dashboard-user__avatar dashboard-user__avatar--admin">
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
                <h2>Preparing branch operations data.</h2>
                <p>Fetching branch accounts, customers, transactions, and active loans.</p>
              </div>
            </article>
          </section>
        ) : (
          <section className="dashboard-content">
            <article className="dashboard-hero dashboard-hero--admin">
              <div>
                <p className="hero-card__eyebrow">Branch Snapshot</p>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>

            {children}
          </section>
        )}
      </section>
    </main>
  )
}

export default AdminDashboardLayout
