import { mockApi, mockUpload } from './mock-api'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Demo mode: active when backend API URL is not configured
const DEMO_MODE = !import.meta.env.VITE_API_URL

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

function getToken(): string | null {
  const raw = localStorage.getItem('session')
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    return session.access_token || null
  } catch {
    return null
  }
}

export async function api<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (DEMO_MODE) {
    return mockApi<T>(endpoint, options)
  }

  const { method = 'GET', body, headers = {} } = options

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(error.message || `Erro ${response.status}`)
  }

  return response.json()
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  if (DEMO_MODE) {
    return mockUpload<T>(endpoint, formData)
  }

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(error.message || `Erro ${response.status}`)
  }

  return response.json()
}
