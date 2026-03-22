import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
});


// ── Request interceptor: attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return api(original)
          })
          .catch((e) => Promise.reject(e))
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken = data.data.accessToken
        localStorage.setItem('accessToken', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (d) => api.post('/auth/register', d),
  verifyEmail:    (d) => api.post('/auth/verify-email', d),
  resendOtp:      (d) => api.post('/auth/resend-otp', d),
  loginRequest:   (d) => api.post('/auth/login', d),
  loginVerify:    (d) => api.post('/auth/login/verify-otp', d),
  logout:         ()  => api.post('/auth/logout'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
  resetPassword:  (d) => api.post('/auth/reset-password', d),
  getMe:          ()  => api.get('/auth/me'),
}

// ── Categories ───────────────────────────────────────────────────────────────
export const categoryAPI = {
  getAll:  (params) => api.get('/categories', { params }),
  create:  (d)      => api.post('/categories', d),
  update:  (id, d)  => api.put(`/categories/${id}`, d),
  delete:  (id)     => api.delete(`/categories/${id}`),
}

// ── Transactions ─────────────────────────────────────────────────────────────
export const transactionAPI = {
  getAll:          (params) => api.get('/transactions', { params }),
  getOne:          (id)     => api.get(`/transactions/${id}`),
  create:          (d)      => api.post('/transactions', d),
  update:          (id, d)  => api.put(`/transactions/${id}`, d),
  delete:          (id)     => api.delete(`/transactions/${id}`),
  byCategory:      (params) => api.get('/transactions/by-category', { params }),
  monthlySummary:  (params) => api.get('/transactions/monthly-summary', { params }),
}

// ── Budgets ──────────────────────────────────────────────────────────────────
export const budgetAPI = {
  getAll:          (params) => api.get('/budgets', { params }),
  getOne:          (id)     => api.get(`/budgets/${id}`),
  create:          (d)      => api.post('/budgets', d),
  update:          (id, d)  => api.put(`/budgets/${id}`, d),
  delete:          (id)     => api.delete(`/budgets/${id}`),
  getTransactions: (id)     => api.get(`/budgets/${id}/transactions`),
}

export default api
