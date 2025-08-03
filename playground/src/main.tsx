import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import VaneUI styles directly from node_modules
import '@vaneui/ui/vars'
import '@vaneui/ui/css'
// Import only our MD styles
import '../../src/styles/md.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)