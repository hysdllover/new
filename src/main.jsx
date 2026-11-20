import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import './styles/pencil.css'
import App from './App.jsx'
import { loadState, find } from './store/store.js'
import { seedDemo } from './lib/seed.js'
import { go } from './lib/nav.js'
import { toggleTask } from './store/actions.js'
import { toast } from './components/toast.js'

async function boot() {
  await loadState()
  const q = new URLSearchParams(location.search)
  if (q.has('demo')) seedDemo()
  // 위젯 링크: ?go=탭.세그먼트 · ?done=할일id (누르면 바로 체크 · 다시 누르면 취소)
  const g = q.get('go'); if (g) { const [tab, seg] = g.split('.'); go(tab, seg) }
  const dn = q.get('done')
  if (dn) { const t = find('tasks', dn); if (t) { toggleTask(dn, { quiet: true }); setTimeout(() => toast((t.done ? '완료 취소 · ' : '끝냄 · ') + t.title, { label: '되돌리기', fn: () => toggleTask(dn, { quiet: true }) }), 400) } }
  if (q.toString()) history.replaceState(null, '', location.pathname)
  createRoot(document.getElementById('root')).render(<App />)
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {})
}
boot()
