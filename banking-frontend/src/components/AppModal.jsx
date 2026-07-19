function AppModal({
  isOpen,
  eyebrow = 'Notice',
  title,
  description,
  confirmLabel = 'Close',
  cancelLabel = 'Cancel',
  showCancel = false,
  onConfirm,
  onClose,
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
        aria-labelledby="app-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <p className="hero-card__eyebrow">{eyebrow}</p>
            <h3 id="app-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            x
          </button>
        </div>
        <p className="modal-card__text">{description}</p>
        <div className="modal-card__actions">
          {showCancel ? (
            <button
              type="button"
              className="button-link button-link--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="button-link button-link--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AppModal
