import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface RequestOptions extends RequestInit {
  token?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token: explicitToken, ...fetchOptions } = options

    // Auto-inject token from Supabase session if not explicitly provided
    let token = explicitToken
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token ?? undefined
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Merge existing headers if provided
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>
      Object.assign(headers, existingHeaders)
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Request failed' }))

      // Handle 401: redirect to login.
      // Supabase SDK auto-refreshes tokens via onAuthStateChange before they
      // expire. A 401 means the token is genuinely invalid, so redirect.
      if (response.status === 401) {
        window.location.href = '/auth/login'
        throw new Error('Session expired')
      }

      // Tag Supabase connectivity errors for better UX handling
      if (response.status === 503 && body.code === 'SUPABASE_UNAVAILABLE') {
        const err = new Error(body.error || 'Database service unavailable')
        ;(err as Error & { code?: string }).code = 'SUPABASE_UNAVAILABLE'
        throw err
      }

      throw new Error(body.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient(API_URL)

// Example usage:
// import { api } from '@/lib/api'
//
// // Without auth
// const health = await api.get('/api/health')
//
// // With auth token
// const data = await api.get('/api/users', { token: accessToken })
