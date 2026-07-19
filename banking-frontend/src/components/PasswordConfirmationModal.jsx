function PasswordConfirmationModal({
  isOpen,
  title,
  description,
  password,
  onPasswordChange,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  isSubmitting = false,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={isSubmitting ? undefined : onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-confirmation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <p className="hero-card__eyebrow">Security Check</p>
            <h3 id="password-confirmation-title">{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close confirmation window"
          >
            x
          </button>
        </div>
        <p className="modal-card__text">{description}</p>
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            onConfirm()
          }}
        >
          <label className="field-group">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isSubmitting}
              autoFocus
            />
          </label>
          <div className="modal-card__actions">
            <button
              type="button"
              className="button-link button-link--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="button-link button-link--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Confirming...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordConfirmationModal
