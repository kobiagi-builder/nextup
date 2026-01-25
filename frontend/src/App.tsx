/**
 * App.tsx - Main Application Entry Point
 *
 * Sets up:
 * - React Router for client-side routing
 * - ThemeProvider for dark/light mode
 * - React Query for server state management
 * - AppShell layout with sidebar navigation
 *
 * Routes:
 * - / : Home dashboard
 * - /portfolio : Portfolio (combined content + AI research)
 * - /topics : Topic backlog (kanban)
 * - /profile : User profile/context (includes Skills section)
 * - /settings : User preferences
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Pages
import { HomePage } from '@/features/portfolio/pages/HomePage'
import { PortfolioPage } from '@/features/portfolio/pages/PortfolioPage'
import { ArtifactPage } from '@/features/portfolio/pages/ArtifactPage'
import { ProfilePage } from '@/features/portfolio/pages/ProfilePage'
import { SettingsPage } from '@/features/portfolio/pages/SettingsPage'

// Create React Query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Refetch on window focus (useful for multi-tab)
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

/**
 * Main App Component
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <BrowserRouter>
            <Routes>
              {/* All routes use AppShell layout */}
              <Route element={<AppShell />}>
                {/* Home Dashboard */}
                <Route path="/" element={<HomePage />} />

                {/* Portfolio (Combined Content + AI Research) */}
                <Route path="/portfolio" element={<PortfolioPage />} />

                {/* Artifact Editor */}
                <Route path="/portfolio/artifacts/:id" element={<ArtifactPage />} />

                {/* User Profile */}
                <Route path="/profile" element={<ProfilePage />} />

                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>

          {/* Toast notifications */}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
