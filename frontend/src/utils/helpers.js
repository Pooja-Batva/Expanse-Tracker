import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'

export const fmt = {
  currency: (n = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n),
  number: (n = 0) =>
    new Intl.NumberFormat('en-IN').format(n),
  date: (d) => format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy'),
  dateShort: (d) => format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM'),
  month: (d) => format(typeof d === 'string' ? parseISO(d) : d, 'MMM yyyy'),
  inputDate: (d) => format(typeof d === 'string' ? parseISO(d) : (d || new Date()), 'yyyy-MM-dd'),
  monthYear: (m, y) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[m - 1]} ${y}`
  },
}

export const getMonthRange = (monthOffset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + monthOffset)
  return {
    startDate: fmt.inputDate(startOfMonth(d)),
    endDate:   fmt.inputDate(endOfMonth(d)),
  }
}

export const progressClass = (pct) => {
  if (pct >= 100) return 'danger'
  if (pct >= 75)  return 'warning'
  return 'safe'
}

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong'
