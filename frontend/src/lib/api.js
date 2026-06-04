import axios from 'axios'

/**
 * Axios instance for our Laravel backend.
 * - withCredentials: sends Laravel session cookie
 * - X-XSRF-TOKEN header is automatically added by axios when cookie is present
 *
 * Vite dev server proxies /api and /sanctum to http://localhost:8000.
 */
const api = axios.create({
  baseURL: '',                            // we'll prefix /api per call
  withCredentials: true,
  withXSRFToken: true,                    // axios v1.x: opt-in
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Pre-flight call to fetch the CSRF cookie. Must run once before any
 * state-changing request (POST/PATCH/DELETE/PUT).
 */
export async function ensureCsrf() {
  await api.get('/sanctum/csrf-cookie')
}

export default api
