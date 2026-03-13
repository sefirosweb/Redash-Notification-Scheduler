import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

/**
 * Extracts a human-readable message from an axios error.
 * Handles FastAPI 422 validation errors (detail is an array of {loc, msg}).
 */
export function errorMessage(err) {
  const detail = err.response?.data?.detail
  if (!detail) return err.message
  if (Array.isArray(detail)) return detail.map(d => `${d.loc?.slice(-1)[0] ?? 'field'}: ${d.msg}`).join('; ')
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}

export default client
