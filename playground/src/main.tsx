import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import VaneUI styles directly from node_modules
import '@vaneui/ui/vars'
import '@vaneui/ui/css'
// @vaneui/md's prose rhythm (rules-only; relies on the vaneui CSS above)
import '@vaneui/md/styles'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)