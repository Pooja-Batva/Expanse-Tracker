import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Target, Plus, ArrowRight } from 'lucide-react'
import { transactionAPI, budgetAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmt, progressClass } from '../utils/helpers'
import { Spinner, Amount, CategoryBadge, EmptyState, SectionCard } from '../components/ui'

// ── Themed chart colours pulled from CSS vars at render time ─────────────────
const getVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)' }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.color, fontFamily: 'var(--font-mono)' }}>
          {p.name}: {fmt.currency(p.value)}
        </p>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fmt.currency(d.value)}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [monthData, setMonthData]   = useState(null)
  const [trendData, setTrendData]   = useState([])
  const [catData, setCatData]       = useState([])
  const [budgets, setBudgets]       = useState([])
  const [recentTx, setRecentTx]     = useState([])
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      const [txRes, trendRes, catRes, budgetRes] = await Promise.all([
        transactionAPI.getAll({ month: now.getMonth() + 1, year: now.getFullYear(), limit: 5 }),
        transactionAPI.monthlySummary({ months: 6 }),
        transactionAPI.byCategory({ type: 'expense' }),
        budgetAPI.getAll({ active: true }),
      ])

      const tx = txRes.data.data
      setMonthData(tx.summary)
      setRecentTx(tx.transactions)

      // Build 6-month trend array
      const raw = trendRes.data.data
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const m = d.getMonth() + 1; const y = d.getFullYear()
        const label = fmt.monthYear(m, y)
        const inc = raw.find(r => r._id.month === m && r._id.year === y && r._id.type === 'income')?._id
        const incVal = raw.find(r => r._id.month === m && r._id.year === y && r._id.type === 'income')?.total || 0
        const expVal = raw.find(r => r._id.month === m && r._id.year === y && r._id.type === 'expense')?.total || 0
        months.push({ label, income: incVal, expense: expVal })
      }
      setTrendData(months)
      setCatData(catRes.data.data.slice(0, 6))
      setBudgets(budgetRes.data.data.slice(0, 4))
    } catch (_) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner center />

  const income  = monthData?.totalIncome  || 0
  const expense = monthData?.totalExpense || 0
  const net     = monthData?.net          || 0

  const PIE_COLORS = ['#0066ff','#00c853','#ff3d00','#ffab00','#9c27b0','#00bcd4']

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="section-gap animate-in">

      {/* Greeting */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Here's what's happening with your money this month.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-icon income"><TrendingUp size={18} /></div>
          <div className="stat-label">Total Income</div>
          <div className="stat-value income">{fmt.currency(income)}</div>
          <div className="stat-sub">{monthData?.incomeCount || 0} transactions</div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon expense"><TrendingDown size={18} /></div>
          <div className="stat-label">Total Expense</div>
          <div className="stat-value expense">{fmt.currency(expense)}</div>
          <div className="stat-sub">{monthData?.expenseCount || 0} transactions</div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon balance"><Wallet size={18} /></div>
          <div className="stat-label">Net Balance</div>
          <div className={`stat-value ${net >= 0 ? 'income' : 'expense'}`}>{fmt.currency(net)}</div>
          <div className="stat-sub">{net >= 0 ? 'You are saving 🎉' : 'Over budget ⚠️'}</div>
        </div>
        <div className="stat-card budget">
          <div className="stat-icon budget"><Target size={18} /></div>
          <div className="stat-label">Active Budgets</div>
          <div className="stat-value accent">{budgets.length}</div>
          <div className="stat-sub">
            {budgets.filter(b => (b.spent / b.amount) >= 0.8).length} near limit
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="chart-grid">
        <SectionCard title="Income vs Expense (6 months)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--income)"  stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--income)"  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--expense)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--expense)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income"  name="Income"  stroke="var(--income)"  fill="url(#incomeGrad)"  strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expense" name="Expense" stroke="var(--expense)" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Spending by Category">
          {catData.length === 0 ? (
            <EmptyState icon="🍩" title="No data yet" description="Add transactions to see breakdown" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={catData.map(c => ({ name: c.category?.name, value: c.total }))}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value"
                >
                  {catData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Bottom Row */}
      <div className="two-col">
        {/* Recent Transactions */}
        <SectionCard
          title="Recent Transactions"
          action={<Link to="/transactions" className="btn btn-ghost btn-sm">View all <ArrowRight size={13} /></Link>}
        >
          {recentTx.length === 0 ? (
            <EmptyState icon="📋" title="No transactions yet" description="Add your first transaction"
              action={<Link to="/transactions" className="btn btn-primary btn-sm"><Plus size={14} /> Add</Link>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentTx.map((tx) => (
                <div key={tx._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 8px', borderRadius: 8, transition: 'var(--transition)'
                }} className="card-hover">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: tx.type === 'income' ? 'var(--income-dim)' : 'var(--expense-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {tx.category?.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{tx.note || tx.category?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt.date(tx.date)}</div>
                    </div>
                  </div>
                  <Amount value={tx.amount} type={tx.type} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Active Budgets */}
        <SectionCard
          title="Active Budgets"
          action={<Link to="/budgets" className="btn btn-ghost btn-sm">View all <ArrowRight size={13} /></Link>}
        >
          {budgets.length === 0 ? (
            <EmptyState icon="🎯" title="No active budgets" description="Set a budget to stay on track"
              action={<Link to="/budgets" className="btn btn-primary btn-sm"><Plus size={14} /> Add Budget</Link>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {budgets.map((b) => {
                const pct = Math.min(100, Math.round((b.spent / b.amount) * 100))
                return (
                  <div key={b._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                        {b.category?.icon} {b.category?.name}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {fmt.currency(b.spent)} / {fmt.currency(b.amount)}
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${progressClass(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                      {pct}% used · {fmt.currency(Math.max(0, b.amount - b.spent))} left
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
