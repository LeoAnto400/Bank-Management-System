const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')
