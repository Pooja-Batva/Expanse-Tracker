import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { transactionAPI, categoryAPI } from '../services/api'
import { fmt, getErrorMessage } from '../utils/helpers'
import { Modal, ConfirmModal, Spinner, EmptyState, Amount, CategoryBadge } from '../components/ui'

const EMPTY_FORM = {
  amount: '', type: 'expense', category: '',
  note: '', date: fmt.inputDate(new Date()), tags: ''
}
const ROW_HEIGHT   = 53
const TABLE_CHROME = 44 + 52 + 20
const MIN_LIMIT    = 5
const MAX_LIMIT    = 50

export default function Transactions() {
  const tableAnchorRef = useRef(null)
  const [limit, setLimit] = useState(15)

  const calcLimit = useCallback(() => {
    if (!tableAnchorRef.current) return
    const top = tableAnchorRef.current.getBoundingClientRect().top
    const available = window.innerHeight - top - TABLE_CHROME
    setLimit(Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.floor(available / ROW_HEIGHT))))
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(calcLimit)
    window.addEventListener('resize', calcLimit)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', calcLimit) }
  }, [calcLimit])

  const [txs, setTxs]               = useState([])
  const [cats, setCats]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [summary, setSummary]       = useState({ totalIncome: 0, totalExpense: 0, net: 0 })
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [useRange, setUseRange]     = useState(false)
  const [searchNote, setSearchNote] = useState('')
  const [filters, setFilters]       = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    category: '', type: '', startDate: '', endDate: '',
    sortBy: 'date_desc', page: 1,
  })

  const setF     = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }))
  const setForm_ = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const loadCats = useCallback(async () => {
    try { const { data } = await categoryAPI.getAll(); setCats(data.data) } catch (_) {}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { sortBy: filters.sortBy, page: filters.page, limit }
      if (useRange && filters.startDate && filters.endDate) {
        params.startDate = filters.startDate
        params.endDate   = filters.endDate
      } else {
        params.month = filters.month
        params.year  = filters.year
      }
      if (filters.category) params.category = filters.category
      if (filters.type)     params.type     = filters.type
      const { data } = await transactionAPI.getAll(params)
      let list = data.data.transactions
      if (searchNote) list = list.filter(t => t.note?.toLowerCase().includes(searchNote.toLowerCase()))
      setTxs(list)
      setPagination(data.data.pagination)
      setSummary(data.data.summary)
    } catch (_) {}
    finally { setLoading(false) }
  }, [filters, useRange, searchNote, limit])

  useEffect(() => { loadCats() }, [loadCats])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const raf = requestAnimationFrame(calcLimit)
    return () => cancelAnimationFrame(raf)
  }, [useRange, calcLimit])

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }

  const openEdit = (tx) => {
    setEditing(tx)
    setForm({
      amount:   tx.amount,
      type:     tx.type,
      category: tx.category?._id || tx.category,
      note:     tx.note || '',
      date:     fmt.inputDate(tx.date),
      tags:     tx.tags?.join(', ') || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        ...form, amount: Number(form.amount),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      if (editing) { await transactionAPI.update(editing._id, payload); toast.success('Transaction updated!') }
      else         { await transactionAPI.create(payload);               toast.success('Transaction added!') }
      setShowModal(false); load()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await transactionAPI.delete(id); toast.success('Transaction deleted'); load() }
    catch (err) { toast.error(getErrorMessage(err)) }
  }

  const filteredCats = cats.filter(c => c.type === form.type)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const years  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="section-gap animate-in">

      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            {pagination.total} total · {fmt.currency(summary.totalIncome)} in · {fmt.currency(summary.totalExpense)} out
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Transaction</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card income" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Income</div>
          <div className="stat-value income" style={{ fontSize: 20 }}>{fmt.currency(summary.totalIncome)}</div>
        </div>
        <div className="stat-card expense" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Expense</div>
          <div className="stat-value expense" style={{ fontSize: 20 }}>{fmt.currency(summary.totalExpense)}</div>
        </div>
        <div className="stat-card balance" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Net</div>
          <div className={`stat-value ${summary.net >= 0 ? 'income' : 'expense'}`} style={{ fontSize: 20 }}>
            {fmt.currency(summary.net)}
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginRight: 'auto' }}>
          <label className="toggle-wrap" style={{ fontSize: 13 }}>
            <div className={`toggle ${useRange ? 'on' : ''}`} onClick={() => setUseRange(u => !u)} />
            Custom range
          </label>
          {useRange ? (
            <>
              <input type="date" className="form-input" style={{ width: 140 }} value={filters.startDate} onChange={setF('startDate')} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
              <input type="date" className="form-input" style={{ width: 140 }} value={filters.endDate} onChange={setF('endDate')} />
            </>
          ) : (
            <>
              <select className="form-select" style={{ width: 100 }} value={filters.month} onChange={setF('month')}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="form-select" style={{ width: 90 }} value={filters.year} onChange={setF('year')}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          <select className="form-select" style={{ width: 120 }} value={filters.type} onChange={setF('type')}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className="form-select" style={{ width: 150 }} value={filters.category} onChange={setF('category')}>
            <option value="">All categories</option>
            {cats.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 150 }} value={filters.sortBy} onChange={setF('sortBy')}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
          </select>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search note…" style={{ paddingLeft: 30, width: 160 }}
            value={searchNote} onChange={e => setSearchNote(e.target.value)} />
        </div>
      </div>

      <div ref={tableAnchorRef}>
        {loading ? (
          <Spinner center />
        ) : txs.length === 0 ? (
          <div className="card">
            <EmptyState icon="📋" title="No transactions found" description="Try adjusting your filters or add a new transaction"
              action={<button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Transaction</button>} />
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Category</th><th>Note</th>
                  <th>Type</th><th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => (
                  <tr key={tx._id}>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt.date(tx.date)}</td>
                    <td><CategoryBadge category={tx.category} /></td>
                    <td style={{ maxWidth: 180 }}>
                      <span className="truncate" style={{ display: 'block', fontSize: 13 }}>{tx.note || '—'}</span>
                    </td>
                    <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                    <td style={{ textAlign: 'right' }}><Amount value={tx.amount} type={tx.type} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(tx)} title="Edit"><Pencil size={14} /></button>
                        <button className="btn-icon" onClick={() => setDeleting(tx._id)} title="Delete"
                          style={{ color: 'var(--expense)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Page {filters.page} of {pagination.totalPages}
            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {limit}/page</span>
          </span>
          <button className="btn btn-ghost btn-sm" disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="tabs">
              <button type="button" className={`tab-btn ${form.type === 'expense' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: 'expense', category: '' }))}>Expense</button>
              <button type="button" className={`tab-btn ${form.type === 'income' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: 'income', category: '' }))}>Income</button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount} onChange={setForm_('amount')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={setForm_('date')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={setForm_('category')} required>
              <option value="">Select category…</option>
              {filteredCats.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-input" placeholder="What was this for?" value={form.note} onChange={setForm_('note')} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" placeholder="food, work, travel" value={form.tags} onChange={setForm_('tags')} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : editing ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} danger
        title="Delete transaction?" message="This action cannot be undone."
        onConfirm={() => handleDelete(deleting)} />
    </div>
  )
}