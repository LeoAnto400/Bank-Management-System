import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../config/api'

function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    pan_number: '',
    aadhaar_number: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    pincode: '',
    password: '',
  })
  const [adminForm, setAdminForm] = useState({
    branch_id: '',
    first_name: '',
    last_name: '',
    employee_code: '',
    employee_role: '',
    accountant_phone: '',
    accountant_email: '',
    joining_date: '',
    password: '',
  })

  const handleRoleChange = (nextRole) => {
    setRole(nextRole)
    setError('')
    setSuccess('')
  }

  const handleCustomerChange = (event) => {
    const { name, value } = event.target
    setCustomerForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleAdminChange = (event) => {
    const { name, value } = event.target
    setAdminForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const payload =
      role === 'customer'
        ? { role, ...customerForm }
        : { role, ...adminForm, branch_id: Number(adminForm.branch_id) }

    try {
      const response = await fetch(`${apiBaseUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed. Please try again.')
      }

      setSuccess(data.message || 'Signup successful.')

      if (role === 'customer') {
        setCustomerForm({
          first_name: '',
          last_name: '',
          date_of_birth: '',
          gender: '',
          pan_number: '',
          aadhaar_number: '',
          customer_phone: '',
          customer_email: '',
          customer_address: '',
          customer_city: '',
          customer_state: '',
          pincode: '',
          password: '',
        })
        setTimeout(() => navigate('/'), 900)
      } else {
        setAdminForm({
          branch_id: '',
          first_name: '',
          last_name: '',
          employee_code: '',
          employee_role: '',
          accountant_phone: '',
          accountant_email: '',
          joining_date: '',
          password: '',
        })
        setTimeout(() => navigate('/admin-login'), 900)
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while signing up.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="page-columns">
        <article className="hero-card">
          <p className="hero-card__eyebrow">Signup</p>
          <h1>Create a new account for banking access.</h1>
          <p className="hero-card__text">
            Choose whether you are signing up as a customer or an admin. The form
            writes to the main schema table and the matching login table.
          </p>

          <div className="hero-card__actions">
            <Link className="button-link button-link--primary" to="/">
              Back to Login
            </Link>
            <Link className="button-link button-link--secondary" to="/admin-login">
              Admin Login
            </Link>
          </div>
        </article>

        <aside className="form-card">
          <h2>Signup Page</h2>
          <p>Complete the fields required by your database schema.</p>

          <div className="role-switch">
            <button
              type="button"
              className={role === 'customer' ? 'role-switch__button is-active' : 'role-switch__button'}
              onClick={() => handleRoleChange('customer')}
            >
              Customer
            </button>
            <button
              type="button"
              className={role === 'admin' ? 'role-switch__button is-active' : 'role-switch__button'}
              onClick={() => handleRoleChange('admin')}
            >
              Admin
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {role === 'customer' ? (
              <div className="form-grid">
                <label className="field-group">
                  <span>First name</span>
                  <input name="first_name" value={customerForm.first_name} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Last name</span>
                  <input name="last_name" value={customerForm.last_name} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Date of birth</span>
                  <input type="date" name="date_of_birth" value={customerForm.date_of_birth} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Gender</span>
                  <select name="gender" value={customerForm.gender} onChange={handleCustomerChange} required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>PAN number</span>
                  <input name="pan_number" value={customerForm.pan_number} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Aadhaar number</span>
                  <input name="aadhaar_number" value={customerForm.aadhaar_number} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Phone</span>
                  <input name="customer_phone" value={customerForm.customer_phone} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Email</span>
                  <input type="email" name="customer_email" value={customerForm.customer_email} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group field-group--full">
                  <span>Address</span>
                  <input name="customer_address" value={customerForm.customer_address} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>City</span>
                  <input name="customer_city" value={customerForm.customer_city} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>State</span>
                  <input name="customer_state" value={customerForm.customer_state} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group">
                  <span>Pincode</span>
                  <input name="pincode" value={customerForm.pincode} onChange={handleCustomerChange} required />
                </label>
                <label className="field-group field-group--full">
                  <span>Password</span>
                  <input type="password" name="password" value={customerForm.password} onChange={handleCustomerChange} required />
                </label>
              </div>
            ) : (
              <div className="form-grid">
                <label className="field-group">
                  <span>Branch ID</span>
                  <input type="number" min="1" name="branch_id" value={adminForm.branch_id} onChange={handleAdminChange} required />
                </label>
                <label className="field-group">
                  <span>Employee code</span>
                  <input name="employee_code" value={adminForm.employee_code} onChange={handleAdminChange} required />
                </label>
                <label className="field-group">
                  <span>First name</span>
                  <input name="first_name" value={adminForm.first_name} onChange={handleAdminChange} required />
                </label>
                <label className="field-group">
                  <span>Last name</span>
                  <input name="last_name" value={adminForm.last_name} onChange={handleAdminChange} required />
                </label>
                <label className="field-group field-group--full">
                  <span>Employee role</span>
                  <select name="employee_role" value={adminForm.employee_role} onChange={handleAdminChange} required>
                    <option value="">Select</option>
                    <option value="Junior Accountant">Junior Accountant</option>
                    <option value="Senior Accountant">Senior Accountant</option>
                    <option value="Branch Manager">Branch Manager</option>
                    <option value="Audit Officer">Audit Officer</option>
                    <option value="Compliance Officer">Compliance Officer</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Phone</span>
                  <input name="accountant_phone" value={adminForm.accountant_phone} onChange={handleAdminChange} required />
                </label>
                <label className="field-group">
                  <span>Email</span>
                  <input type="email" name="accountant_email" value={adminForm.accountant_email} onChange={handleAdminChange} required />
                </label>
                <label className="field-group">
                  <span>Joining date</span>
                  <input type="date" name="joining_date" value={adminForm.joining_date} onChange={handleAdminChange} required />
                </label>
                <label className="field-group">
                  <span>Password</span>
                  <input type="password" name="password" value={adminForm.password} onChange={handleAdminChange} required />
                </label>
              </div>
            )}

            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}

            <button className="button-link button-link--primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : role === 'customer' ? 'Create Customer Account' : 'Create Admin Account'}
            </button>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default SignupPage
