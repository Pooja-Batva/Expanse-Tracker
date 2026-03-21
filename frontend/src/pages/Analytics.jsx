import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { transactionAPI } from '../services/api'
import { fmt } from '../utils/helpers'
import { Spinner, EmptyState, SectionCard } from '../components/ui'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', minWidth: 140 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color || p.fill, fontFamily: 'var(--font-mono)' }}>
          {p.name}: {fmt.currency(p.value)}
        </p>
      ))}
    </div>
  )
}

const PIE_COLORS = ['#0066ff','#00c853','#ff3d00','#ffab00','#9c27b0','#00bcd4','#e91e63','#ff9800']

export default function Analytics() {
  const [trendData, setTrendData]   = useState([])
  const [expCatData, setExpCatData] = useState([])
  const [incCatData, setIncCatData] = useState([])
  const [loading, setLoading]       = useState(true)
  const [months, setMonths]         = useState(6)
  const [dateRange, setDateRange]   = useState({
    startDate: fmt.inputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    endDate:   fmt.inputDate(new Date())
  })

  const loadTrend = useCallback(async () => {
    try {
      const { data } = await transactionAPI.monthlySummary({ months })
      const raw = data.data
      const arr = []
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const m = d.getMonth() + 1; const y = d.getFullYear()
        const label = fmt.monthYear(m, y)
        const income  = raw.find(r => r._id.month === m && r._id.year === y && r._id.type === 'income')?.total  || 0
        const expense = raw.find(r => r._id.month === m && r._id.year === y && r._id.type === 'expense')?.total || 0
        arr.push({ label, income, expense, net: income - expense })
      }
      setTrendData(arr)
    } catch (_) {}
  }, [months])

  const loadCategories = useCallback(async () => {
    try {
      const [exp, inc] = await Promise.all([
        transactionAPI.byCategory({ ...dateRange, type: 'expense' }),
        transactionAPI.byCategory({ ...dateRange, type: 'income' }),
      ])
      setExpCatData(exp.data.data.slice(0, 8).map(c => ({ name: c.category?.name, value: c.total, icon: c.category?.icon, count: c.count })))
      setIncCatData(inc.data.data.slice(0, 8).map(c => ({ name: c.category?.name, value: c.total, icon: c.category?.icon, count: c.count })))
    } catch (_) {}
  }, [dateRange])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadTrend(), loadCategories()])
    setLoading(false)
  }, [loadTrend, loadCategories])

  useEffect(() => { load() }, [load])

  const totalExp = expCatData.reduce((s, c) => s + c.value, 0)
  const totalInc = incCatData.reduce((s, c) => s + c.value, 0)
  const avgIncome  = trendData.length ? trendData.reduce((s, d) => s + d.income, 0) / trendData.length : 0
  const avgExpense = trendData.length ? trendData.reduce((s, d) => s + d.expense, 0) / trendData.length : 0
  const bestMonth  = trendData.reduce((best, d) => d.net > (best?.net ?? -Infinity) ? d : best, null)
  const worstMonth = trendData.reduce((worst, d) => d.net < (worst?.net ?? Infinity) ? d : worst, null)

  if (loading) return <Spinner center />

  return (
    <div className="section-gap animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Visualise your financial patterns</p>
        </div>
      </div>

      {/* Controls */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Trend:</span>
          {[3, 6, 12].map(m => (
            <button key={m} className={`btn btn-sm ${months === m ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMonths(m)}>{m}M</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Category range:</span>
          <input type="date" className="form-input" style={{ width: 140 }} value={dateRange.startDate}
            onChange={e => setDateRange(d => ({ ...d, startDate: e.target.value }))} />
          <span style={{ color: 'var(--text-muted)' }}>—</span>
          <input type="date" className="form-input" style={{ width: 140 }} value={dateRange.endDate}
            onChange={e => setDateRange(d => ({ ...d, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Quick insight cards */}
      <div className="stats-grid">
        <div className="stat-card income" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Avg Monthly Income</div>
          <div className="stat-value income" style={{ fontSize: 20 }}>{fmt.currency(avgIncome)}</div>
        </div>
        <div className="stat-card expense" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Avg Monthly Expense</div>
          <div className="stat-value expense" style={{ fontSize: 20 }}>{fmt.currency(avgExpense)}</div>
        </div>
        <div className="stat-card balance" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Best Month</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginTop: 4 }}>{bestMonth?.label || '—'}</div>
          {bestMonth && <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--income)', fontSize: 14, fontWeight: 700 }}>{fmt.currency(bestMonth.net)}</div>}
        </div>
        <div className="stat-card expense" style={{ padding: '14px 18px' }}>
          <div className="stat-label">Worst Month</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginTop: 4 }}>{worstMonth?.label || '—'}</div>
          {worstMonth && <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--expense)', fontSize: 14, fontWeight: 700 }}>{fmt.currency(worstMonth.net)}</div>}
        </div>
      </div>

      {/* Income vs Expense Bar Chart */}
      <SectionCard title={`Monthly Overview — Last ${months} Months`}>
        {trendData.length === 0 ? <EmptyState icon="📊" title="No data" description="Add transactions to see trends" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={4}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income"  name="Income"  fill="var(--income)"  radius={[4,4,0,0]} maxBarSize={32} />
              <Bar dataKey="expense" name="Expense" fill="var(--expense)" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Net Savings Line Chart */}
      <SectionCard title="Net Savings Trend">
        {trendData.length === 0 ? <EmptyState icon="📈" title="No data" description="Add transactions to see trend" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="net" name="Net Savings" stroke="var(--accent)"
                fill="url(#netGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Category Breakdowns */}
      <div className="two-col">
        {/* Expense pie */}
        <SectionCard title="Expense Breakdown">
          {expCatData.length === 0 ? <EmptyState icon="🍩" title="No expense data" description="Add expense transactions" /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expCatData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value">
                    {expCatData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.currency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {expCatData.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span>{c.icon} {c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--expense)', fontWeight: 700 }}>{fmt.currency(c.value)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{totalExp > 0 ? ((c.value / totalExp) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* Income pie */}
        <SectionCard title="Income Breakdown">
          {incCatData.length === 0 ? <EmptyState icon="🍩" title="No income data" description="Add income transactions" /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={incCatData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value">
                    {incCatData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.currency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {incCatData.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span>{c.icon} {c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--income)', fontWeight: 700 }}>{fmt.currency(c.value)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{totalInc > 0 ? ((c.value / totalInc) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Top categories bar chart — most to least */}
      <SectionCard title="Top Expense Categories (Most → Least)">
        {expCatData.length === 0 ? <EmptyState icon="📊" title="No data" description="Add expense transactions" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={expCatData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 60 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Spent" fill="var(--expense)" radius={[0,4,4,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  )
}
