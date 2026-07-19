import { Link } from 'react-router-dom'
import CustomerDashboardLayout from '../components/CustomerDashboardLayout.jsx'
import { formatDate, useCustomerDashboard } from '../dashboard/customerDashboard.js'

function ProfilePage() {
  const {
    dashboard,
    profileForm,
    isLoading,
    isSaving,
    error,
    success,
    storedUser,
    handleLogout,
    handleProfileChange,
    handleProfileSubmit,
  } = useCustomerDashboard()

  const profile = dashboard?.profile

  return (
    <CustomerDashboardLayout
      dashboard={dashboard}
      storedUser={storedUser}
      error={error}
      success={success}
      isLoading={isLoading}
      onLogout={handleLogout}
      title={profile ? `${profile.first_name} ${profile.last_name}` : 'Your profile'}
      description="Customer profile details mapped from the `Customers` table, including identity data, contact information, address records, KYC status, and editable fields."
      actions={
        <>
          <Link className="button-link button-link--primary" to="/dashboard/accounts">
            View Accounts
          </Link>
          <Link className="button-link button-link--secondary" to="/dashboard/transactions">
            Review Activity
          </Link>
        </>
      }
    >
      <div className="dashboard-layout dashboard-layout--profile">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Profile</p>
                <h3>Identity and KYC details</h3>
              </div>
            </div>

            {profile ? (
              <div className="dashboard-profile">
                <div className="dashboard-profile__summary dashboard-profile__summary--cards">
                  <article className="dashboard-mini-card">
                    <strong>KYC status</strong>
                    <p>{profile.kyc_status}</p>
                  </article>
                  <article className="dashboard-mini-card">
                    <strong>Date of birth</strong>
                    <p>{formatDate(profile.date_of_birth)}</p>
                  </article>
                  <article className="dashboard-mini-card">
                    <strong>Gender</strong>
                    <p>{profile.gender}</p>
                  </article>
                  <article className="dashboard-mini-card">
                    <strong>Customer since</strong>
                    <p>{formatDate(profile.created_at, { timeStyle: 'short' })}</p>
                  </article>
                </div>

                <div className="dashboard-profile__summary">
                  <p>PAN number: <strong>{profile.pan_number}</strong></p>
                  <p>Aadhaar number: <strong>{profile.aadhaar_number}</strong></p>
                  <p>Phone: <strong>{profile.customer_phone}</strong></p>
                  <p>Email: <strong>{profile.customer_email}</strong></p>
                  <p>Address: <strong>{profile.customer_address}</strong></p>
                  <p>City: <strong>{profile.customer_city}</strong></p>
                  <p>State: <strong>{profile.customer_state}</strong></p>
                  <p>Pincode: <strong>{profile.pincode}</strong></p>
                </div>
              </div>
            ) : (
              <p className="dashboard-empty">Customer profile information is not available.</p>
            )}
          </article>
        </div>

        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <p className="hero-card__eyebrow">Update Profile</p>
                <h3>Edit contact and address information</h3>
              </div>
            </div>

            <form className="auth-form dashboard-profile__form" onSubmit={handleProfileSubmit}>
              <div className="form-grid">
                <label className="field-group">
                  <span>First name</span>
                  <input name="first_name" value={profileForm.first_name} onChange={handleProfileChange} required />
                </label>
                <label className="field-group">
                  <span>Last name</span>
                  <input name="last_name" value={profileForm.last_name} onChange={handleProfileChange} required />
                </label>
                <label className="field-group">
                  <span>Phone</span>
                  <input name="customer_phone" value={profileForm.customer_phone} onChange={handleProfileChange} required />
                </label>
                <label className="field-group">
                  <span>Email</span>
                  <input type="email" name="customer_email" value={profileForm.customer_email} onChange={handleProfileChange} required />
                </label>
                <label className="field-group field-group--full">
                  <span>Address</span>
                  <input name="customer_address" value={profileForm.customer_address} onChange={handleProfileChange} required />
                </label>
                <label className="field-group">
                  <span>City</span>
                  <input name="customer_city" value={profileForm.customer_city} onChange={handleProfileChange} required />
                </label>
                <label className="field-group">
                  <span>State</span>
                  <input name="customer_state" value={profileForm.customer_state} onChange={handleProfileChange} required />
                </label>
                <label className="field-group">
                  <span>Pincode</span>
                  <input name="pincode" value={profileForm.pincode} onChange={handleProfileChange} required />
                </label>
              </div>

              <button className="button-link button-link--primary auth-submit" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving changes...' : 'Save profile changes'}
              </button>
            </form>
          </article>
        </div>
      </div>
    </CustomerDashboardLayout>
  )
}

export default ProfilePage
