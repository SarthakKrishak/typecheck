import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { OverlayView } from './components/Overlay.tsx'

const isOverlay = window.location.pathname.replace(/\/$/, "").endsWith("/overlay");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isOverlay ? <OverlayView /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
