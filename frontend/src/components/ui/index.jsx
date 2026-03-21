import { X, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'

// ── Portal wrapper — renders children directly into document.body ─────────────
// This guarantees the modal is always centered on the true viewport,
// never clipped or offset by a scrollable ancestor.
function ModalPortal({ children }) {
  return createPortal(children, document.body)
}

// ── Lock body scroll while any modal is open ──────────────────────────────────
function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = '' }) {
  useLockBodyScroll(open)
  if (!open) return null

  return (
    <ModalPortal>
      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={`modal ${size}`} role="dialog" aria-modal="true">
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmModal({ open, onClose, onConfirm, title, message, danger = false }) {
  useLockBodyScroll(open)
  if (!open) return null

  return (
    <ModalPortal>
      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal" style={{ maxWidth: 400 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: danger ? 'var(--expense-dim)' : 'var(--warning-dim)',
              color: danger ? 'var(--expense)' : 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                {title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => { onConfirm(); onClose() }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, center = false }) {
  const el = (
    <div
      style={{
        width: size, height: size,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
  if (!center) return el
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      {el}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

// ── Amount display ────────────────────────────────────────────────────────────
export function Amount({ value, type, prefix = '₹' }) {
  const cls = type === 'income' ? 'amount-income' : type === 'expense' ? 'amount-expense' : 'amount-neutral'
  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : ''
  return (
    <span className={cls}>
      {sign}{prefix}{Math.abs(value).toLocaleString('en-IN')}
    </span>
  )
}

// ── Category badge ────────────────────────────────────────────────────────────
export function CategoryBadge({ category }) {
  return (
    <span className="cat-dot">
      <span className="cat-dot-circle" style={{ background: category?.color || '#888' }} />
      {category?.icon} {category?.name}
    </span>
  )
}

// ── Type tabs ─────────────────────────────────────────────────────────────────
export function TypeTabs({ value, onChange }) {
  return (
    <div className="tabs">
      <button className={`tab-btn ${value === 'expense' ? 'active' : ''}`} onClick={() => onChange('expense')}>
        Expense
      </button>
      <button className={`tab-btn ${value === 'income' ? 'active' : ''}`} onClick={() => onChange('income')}>
        Income
      </button>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
export function SectionCard({ title, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-16">
          {title && (
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}