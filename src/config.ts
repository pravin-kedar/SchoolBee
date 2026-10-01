/** Backend is the shared PaperBee API; all SchoolBee endpoints live under /schoolbee.
 *  Defaults to the Vite dev proxy (see vite.config.ts). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
export const SCHOOLBEE_API = `${API_BASE_URL}/schoolbee`

export const LOGIN_URL = '/login'
export const SIGNUP_URL = '/signup'
export const SUPPORT_EMAIL = 'info@paperbee.in'
