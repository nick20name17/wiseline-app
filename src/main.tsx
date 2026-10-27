import { App } from '@/app/app'
import '@/index.css'
import { createRoot } from 'react-dom/client'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

createRoot(rootEl).render(<App />)
