import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../config/api'

function LoginPage() {
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
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please try again.')
      }

      if (!data.token) {
        throw new Error('Login succeeded but no token was returned.')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('bank_user', JSON.stringify(data.user || {}))
      navigate('/dashboard')
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
          <p className="hero-card__eyebrow">Login</p>
          <h1>Welcome back to your banking workspace.</h1>
          <p className="hero-card__text">
            Customer login now uses email-based authentication backed by the
            `Customer_Login` table in your database schema.
          </p>

          <div className="hero-card__actions">
            <Link className="button-link button-link--secondary" to="/signup">
              Sign up
            </Link>
          </div>
        </article>

        <aside className="form-card">
          <h2>Customer Login</h2>
          <p>Enter your customer email and password to access the dashboard.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field-group" htmlFor="email">
              <span>Email</span>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="manager@bank.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field-group" htmlFor="password">
              <span>Password</span>
              <input
                id="password"
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
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <p className="auth-helper">
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </p>
            <p className="auth-helper auth-helper--muted">
              Admin user? <Link to="/admin-login">Admin login</Link>
            </p>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default LoginPage
