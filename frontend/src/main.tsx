// Import logger FIRST to intercept all console output
import './lib/logger'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeColorPalette } from './lib/inject-palette'

// Initialize color palette based on VITE_COLOR_PALETTE env variable
initializeColorPalette()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
