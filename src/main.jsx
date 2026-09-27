import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import './styles/views.css'
import './styles/print.css'
import App from './App.jsx'
import { loadState, useSettings } from './store/store.js'
import { applyTheme } from './theme/theme.js'
import { initFonts } from './lib/fonts.js'
import { TABS, EXTRA, go } from './nav.js'
import { startServices } from './lib/notify.js'
import { startSync } from './sync/sync.js'

function Root() {
  const st = useSettings()
  useEffect(() => { applyTheme(st.theme) }, [st.theme])
  return <App />
}

Promise.all([loadState(), initFonts()]).then(async () => {
  if (location.search.includes('demo')) (await import('./dev/seed.js')).seed()
  // 홈 화면 위젯에서 연 링크: ?go=탭.세그먼트
  const target = new URLSearchParams(location.search).get('go')
  if (target) {
    const [tab, seg] = target.split('.')
    if ([...TABS, ...EXTRA].some((t) => t.id === tab)) go(tab, seg)
    history.replaceState(null, '', location.pathname + location.hash)
  }
  createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>)
  startServices()
  startSync()
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => null)
    // 새 버전 배포 확인: 앱으로 돌아올 때마다 index.html 을 새로 받아 스크립트가 바뀌었으면 새로고침
    const current = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/'))
    const check = async () => {
      reg?.update().catch(() => {})
      try {
        const html = await (await fetch('./?v=' + Date.now(), { cache: 'no-store' })).text()
        const m = html.match(/assets\/index-[\w-]+\.js/)
        if (m && current && !current.includes(m[0])) location.reload()
      } catch {}
    }
    check()
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  })
}
