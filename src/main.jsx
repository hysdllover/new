import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import './styles/views.css'
import './styles/print.css'
import App from './App.jsx'
import { loadState, useSettings } from './store/store.js'
import { applyTheme } from './theme/theme.js'
import { startServices } from './lib/notify.js'
import { startSync } from './sync/sync.js'

function Root() {
  const st = useSettings()
  useEffect(() => { applyTheme(st.theme) }, [st.theme])
  return <App />
}

loadState().then(() => {
  createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>)
  startServices()
  startSync()
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
