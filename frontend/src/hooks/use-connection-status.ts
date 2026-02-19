/**
 * Connection Status Hook
 *
 * Polls the backend health endpoint to detect when Supabase
 * or the API is unreachable. Provides state for UI banners.
 */

import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  services: {
    api: 'healthy'
    supabase: 'healthy' | 'paused' | 'unreachable' | 'auth_failed' | 'unhealthy'
  }
  supabaseError?: string
}

export type ConnectionState =
  | 'connected'       // Everything is fine
  | 'api_down'        // Backend is unreachable
  | 'supabase_down'   // Backend is up but Supabase is down

export interface ConnectionStatus {
  state: ConnectionState
  supabaseStatus?: string
  errorMessage?: string
  lastChecked: Date | null
}

export function useConnectionStatus() {
  const { data, error, isError } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/health`, {
        signal: AbortSignal.timeout(10000),
      })
      // Even 503 responses have useful JSON data
      return response.json()
    },
    // Poll every 30 seconds normally, faster when unhealthy
    refetchInterval: (query) => {
      const health = query.state.data
      if (!health || health.status !== 'ok') return 10000 // 10s when unhealthy
      return 30000 // 30s when healthy
    },
    // Don't retry too aggressively
    retry: 1,
    retryDelay: 2000,
    // Keep stale data to avoid flashing
    staleTime: 15000,
  })

  // Determine connection state
  let status: ConnectionStatus

  if (isError || !data) {
    // Can't reach the backend at all
    status = {
      state: error ? 'api_down' : 'connected',
      errorMessage: error instanceof Error
        ? 'Cannot reach the server. Please check if the backend is running.'
        : undefined,
      lastChecked: new Date(),
    }
  } else if (data.services.supabase !== 'healthy') {
    // Backend is up but Supabase is down
    status = {
      state: 'supabase_down',
      supabaseStatus: data.services.supabase,
      errorMessage: data.supabaseError || 'Database service is unavailable.',
      lastChecked: new Date(data.timestamp),
    }
  } else {
    status = {
      state: 'connected',
      lastChecked: new Date(data.timestamp),
    }
  }

  return status
}
