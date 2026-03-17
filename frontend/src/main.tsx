import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('Starting React app...')

try {
  const root = createRoot(document.getElementById('root')!)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('React app rendered successfully')
} catch (error) {
  console.error('React app error:', error)
}
