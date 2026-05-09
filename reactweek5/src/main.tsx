import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ConsentBanner from './components/ConsentBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ConsentBanner />
  </StrictMode>,
)
