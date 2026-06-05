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
 * Global session-expiry handling. If any request comes back 401 (the Laravel
 * session has expired or the user isn't authenticated), bounce to /login so the
 * user isn't stranded on a page making silently-failing calls.
 *
 * Exclusions:
 *  - the public /api/me hydration probe (returns 200 + null, never 401, but
 *    guarded anyway), and
 *  - the auth pages themselves, to avoid a redirect loop.
 */
const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password', '/first-login']
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url ?? ''
    if (status === 401 && !url.includes('/api/me')) {
      const onAuthPage = AUTH_PATHS.some((p) => window.location.pathname.startsWith(p))
      if (!onAuthPage) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Pre-flight call to fetch the CSRF cookie. Must run once before any
 * state-changing request (POST/PATCH/DELETE/PUT).
 */
export async function ensureCsrf() {
  await api.get('/sanctum/csrf-cookie')
}

export default api
