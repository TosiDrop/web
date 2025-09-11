import { Buffer } from 'buffer'
globalThis.Buffer = Buffer
window.Buffer = Buffer

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <App />
)
