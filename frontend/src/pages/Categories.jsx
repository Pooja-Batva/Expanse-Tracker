import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { categoryAPI } from '../services/api'
import { getErrorMessage } from '../utils/helpers'
import { Modal, ConfirmModal, Spinner, EmptyState } from '../components/ui'

const COLORS = ['#0066ff','#00c853','#ff3d00','#ffab00','#9c27b0','#00bcd4','#e91e63','#4caf50','#ff9800','#607d8b']
const ICONS  = ['🍔','🛒','🚗','🏠','💊','🎮','✈️','📚','💼','👗','💡','🎵','🏋️','🐾','☕','🎁','💰','📈','🏦','🧾']

const EMPTY = { name: '', type: 'expense', icon: '📁', color: '#0066ff' }

export default function Categories() {
  const [cats, setCats]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [activeTab, setActiveTab] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await categoryAPI.getAll()
      setCats(data.data)
    } catch (_) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, type: c.type, icon: c.icon, color: c.color })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await categoryAPI.update(editing._id, form)
        toast.success('Category updated!')
      } else {
        await categoryAPI.create(form)
        toast.success('Category created!')
      }
      setShowModal(false)
      load()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await categoryAPI.delete(id)
      toast.success('Category deleted')
      load()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const filtered = activeTab === 'all' ? cats : cats.filter(c => c.type === activeTab)
  const expenseCount = cats.filter(c => c.type === 'expense').length
  const incomeCount  = cats.filter(c => c.type === 'income').length

  return (
    <div className="section-gap animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{expenseCount} expense · {incomeCount} income</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New Category</button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ maxWidth: 320 }}>
        {['all','expense','income'].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t !== 'all' && <span style={{ marginLeft: 6, background: 'var(--border)', borderRadius: 99, padding: '1px 7px', fontSize: 11 }}>
              {t === 'expense' ? expenseCount : incomeCount}
            </span>}
          </button>
        ))}
      </div>

      {loading ? <Spinner center /> : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon="📂" title="No categories yet" description="Create categories to organise your transactions"
            action={<button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Create Category</button>} />
        </div>
      ) : (
        <div className="three-col">
          {filtered.map(cat => (
            <div key={cat._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
              {/* Icon */}
              <div style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                background: cat.color + '22', border: `2px solid ${cat.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
              }}>
                {cat.icon}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }} className="truncate">{cat.name}</div>
                <span className={`badge badge-${cat.type}`} style={{ marginTop: 4 }}>{cat.type}</span>
              </div>

              {/* Color dot */}
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn-icon" onClick={() => openEdit(cat)} title="Edit"><Pencil size={13} /></button>
                <button className="btn-icon" onClick={() => setDeleting(cat._id)} title="Delete"
                  style={{ color: 'var(--expense)' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSave} className="modal-form">
          {/* Type */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="tabs">
              <button type="button" className={`tab-btn ${form.type === 'expense' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: 'expense' }))}>Expense</button>
              <button type="button" className={`tab-btn ${form.type === 'income' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: 'income' }))}>Income</button>
            </div>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" placeholder="e.g. Groceries" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required minLength={2} maxLength={30} />
          </div>

          {/* Icon picker */}
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: 20, border: '2px solid',
                    borderColor: form.icon === ic ? 'var(--accent)' : 'var(--border)',
                    background: form.icon === ic ? 'var(--accent-dim)' : 'var(--bg-input)',
                    cursor: 'pointer', transition: 'var(--transition)'
                  }}>
                  {ic}
                </button>
              ))}
              {/* Custom icon input */}
              <input className="form-input" style={{ width: 60, textAlign: 'center', fontSize: 20 }}
                value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={2} />
            </div>
          </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: '3px solid',
                    borderColor: form.color === c ? 'var(--text-primary)' : 'transparent',
                    cursor: 'pointer', transition: 'var(--transition)'
                  }} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 28, height: 28, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none' }} />
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: form.color + '22', border: `2px solid ${form.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {form.icon}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{form.name || 'Category name'}</div>
              <span className={`badge badge-${form.type}`}>{form.type}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : editing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting} onClose={() => setDeleting(null)} danger
        title="Delete category?"
        message="This will fail if the category has transactions. Reassign them first."
        onConfirm={() => handleDelete(deleting)}
      />
    </div>
  )
}
