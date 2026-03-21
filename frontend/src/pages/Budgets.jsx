import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Target, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { budgetAPI, categoryAPI } from '../services/api'
import { fmt, getErrorMessage, progressClass } from '../utils/helpers'
import { Modal, ConfirmModal, Spinner, EmptyState, Amount } from '../components/ui'

const EMPTY = {
  category: '', amount: '', startDate: fmt.inputDate(new Date()),
  endDate: '', label: '', alertThreshold: 80
}

export default function Budgets() {
  const [budgets, setBudgets]       = useState([])
  const [cats, setCats]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [deleting, setDeleting]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [showActive, setShowActive] = useState(true)
  const [expanded, setExpanded]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetRes, catRes] = await Promise.all([
        budgetAPI.getAll(),
        categoryAPI.getAll({ type: 'expense' })
      ])
      setBudgets(budgetRes.data.data)
      setCats(catRes.data.data)
    } catch (_) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const now = new Date()
  const activeBudgets   = budgets.filter(b => new Date(b.startDate) <= now && new Date(b.endDate) >= now)
  const inactiveBudgets = budgets.filter(b => new Date(b.endDate) < now || new Date(b.startDate) > now)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await budgetAPI.create({ ...form, amount: Number(form.amount), alertThreshold: Number(form.alertThreshold) })
      toast.success('Budget created!')
      setShowModal(false)
      setForm(EMPTY)
      load()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await budgetAPI.delete(id)
      toast.success('Budget deleted')
      load()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleExpand = (id) => setExpanded(ex => ({ ...ex, [id]: !ex[id] }))

  const BudgetCard = ({ budget }) => {
    const pct = Math.min(100, Math.round((budget.spent / budget.amount) * 100))
    const cls = progressClass(pct)
    const isOver = pct >= 100
    const isWarning = pct >= budget.alertThreshold && pct < 100

    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: isOver ? 'var(--expense-dim)' : isWarning ? 'var(--warning-dim)' : 'var(--accent-dim)',
              color: isOver ? 'var(--expense)' : isWarning ? 'var(--warning)' : 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
            }}>
              {budget.category?.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{budget.category?.name}</div>
              {budget.label && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{budget.label}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmt.date(budget.startDate)} → {fmt.date(budget.endDate)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(isWarning || isOver) && (
              <div style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: isOver ? 'var(--expense-dim)' : 'var(--warning-dim)',
                color: isOver ? 'var(--expense)' : 'var(--warning)',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <AlertTriangle size={12} />
                {isOver ? 'Over!' : `${pct}%`}
              </div>
            )}
            <button className="btn-icon" onClick={() => setDeleting(budget._id)} style={{ color: 'var(--expense)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Amounts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Spent</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: isOver ? 'var(--expense)' : 'var(--text-primary)' }}>
              {fmt.currency(budget.spent)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Budget</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}>
              {fmt.currency(budget.amount)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="progress-bar" style={{ height: 8, marginBottom: 6 }}>
            <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{pct}% used</span>
            <span style={{ color: isOver ? 'var(--expense)' : 'var(--income)' }}>
              {isOver ? `${fmt.currency(budget.spent - budget.amount)} over` : `${fmt.currency(budget.amount - budget.spent)} left`}
            </span>
          </div>
        </div>

        {/* Alert threshold line */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Alert at {budget.alertThreshold}%</span>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
            onClick={() => toggleExpand(budget._id)}
          >
            Transactions {expanded[budget._id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Expanded transactions */}
        {expanded[budget._id] && <BudgetTransactions budgetId={budget._id} />}
      </div>
    )
  }

  return (
    <div className="section-gap animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">{activeBudgets.length} active · {inactiveBudgets.length} past</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowModal(true) }}>
          <Plus size={16} /> New Budget
        </button>
      </div>

      {loading ? <Spinner center /> : budgets.length === 0 ? (
        <div className="card">
          <EmptyState icon="🎯" title="No budgets yet" description="Set spending limits to stay on track"
            action={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Plus size={14} /> Create Budget</button>} />
        </div>
      ) : (
        <>
          {activeBudgets.length > 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} style={{ color: 'var(--accent)' }} /> Active Budgets
              </h2>
              <div className="three-col">
                {activeBudgets.map(b => <BudgetCard key={b._id} budget={b} />)}
              </div>
            </div>
          )}
          {inactiveBudgets.length > 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>
                Past Budgets
              </h2>
              <div className="three-col">
                {inactiveBudgets.map(b => <BudgetCard key={b._id} budget={b} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Budget">
        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group">
            <label className="form-label">Category (expense only)</label>
            <select className="form-select" value={form.category} onChange={setF('category')} required>
              <option value="">Select category…</option>
              {cats.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Budget Amount (₹)</label>
              <input className="form-input" type="number" step="1" min="1" placeholder="5000"
                value={form.amount} onChange={setF('amount')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Label (optional)</label>
              <input className="form-input" placeholder="e.g. March 2025" value={form.label} onChange={setF('label')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.startDate} onChange={setF('startDate')} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={form.endDate} onChange={setF('endDate')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alert Threshold — {form.alertThreshold}%</label>
            <input type="range" min="10" max="100" step="5" value={form.alertThreshold}
              onChange={setF('alertThreshold')}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <div className="form-hint">Get an email alert when you reach {form.alertThreshold}% of this budget</div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting} onClose={() => setDeleting(null)} danger
        title="Delete budget?" message="This only removes the budget limit, not the transactions."
        onConfirm={() => handleDelete(deleting)}
      />
    </div>
  )
}

function BudgetTransactions({ budgetId }) {
  const [txs, setTxs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    budgetAPI.getTransactions(budgetId)
      .then(({ data }) => setTxs(data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [budgetId])

  if (loading) return <div style={{ padding: '8px 0' }}><Spinner size={16} /></div>
  if (txs.length === 0) return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No transactions in this period.</p>

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {txs.slice(0, 5).map(tx => (
        <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{fmt.dateShort(tx.date)} · {tx.note || tx.category?.name}</span>
          <Amount value={tx.amount} type="expense" />
        </div>
      ))}
      {txs.length > 5 && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{txs.length - 5} more</p>}
    </div>
  )
}
