import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../config/api'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Admin login failed. Please try again.')
      }

      if (!data.token) {
        throw new Error('Admin login succeeded but no token was returned.')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('bank_user', JSON.stringify(data.user || {}))
      navigate('/admin-dashboard')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while logging in.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="page-columns">
        <article className="hero-card">
          <p className="hero-card__eyebrow">Admin Login</p>
          <h1>Restricted access for accountants and administrators.</h1>
          <p className="hero-card__text">
            Admin authentication is handled separately through the `Admin_Login`
            table and accountant email records.
          </p>

          <div className="hero-card__actions">
            <Link className="button-link button-link--secondary" to="/">
              Back to Customer Login
            </Link>
          </div>
        </article>

        <aside className="form-card">
          <h2>Admin Login</h2>
          <p>Use your accountant email and password to continue.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field-group" htmlFor="admin-email">
              <span>Email</span>
              <input
                id="admin-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@bank.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field-group" htmlFor="admin-password">
              <span>Password</span>
              <input
                id="admin-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="button-link button-link--primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Admin Login'}
            </button>

            <p className="auth-helper">
              Customer user? <Link to="/">Back to customer login</Link>
            </p>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default AdminLoginPage
