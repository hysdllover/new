import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import './styles/views.css'
import './styles/print.css'
import App from './App.jsx'
import { loadState, useSettings, settings } from './store/store.js'
import { applyTheme } from './theme/theme.js'
import { initFonts } from './lib/fonts.js'
import { TABS, EXTRA, go } from './nav.js'
import { addTask } from './store/actions.js'
import { toast } from './components/ui.jsx'
import { startServices } from './lib/notify.js'
import { startSync, restoreSync } from './sync/sync.js'

function Root() {
  const st = useSettings()
  useEffect(() => { applyTheme(st.theme) }, [st.theme])
  return <App />
}

Promise.all([loadState(), initFonts(), restoreSync()]).then(async () => {
  if (location.search.includes('demo')) (await import('./dev/seed.js')).seed()
  // 홈 화면 위젯에서 연 링크: ?go=탭.세그먼트
  const target = new URLSearchParams(location.search).get('go')
  // 위젯 링크(?go=탭.세그먼트) 또는 설정의 시작 화면
  const start = target || (settings().startTab && settings().startTab !== 'last' ? settings().startTab : null)
  if (start) {
    const [tab, seg] = start.split('.')
    if ([...TABS, ...EXTRA].some((t) => t.id === tab)) go(tab, seg)
  }
  // 공유(단축어)로 들어온 할 일: ?add=내용&url=링크 → 받은 편지함
  const q = new URLSearchParams(location.search)
  const added = q.get('add')?.trim(), link = q.get('url')?.trim()
  if ((added || link) && q.get('note') == null) {
    let title = added || link
    const urlIn = link || (added?.match(/https?:\/\/\S+/) || [])[0]
    if (urlIn && title.includes(urlIn) && title.trim() !== urlIn) title = title.replace(urlIn, '').trim()
    addTask({ title: title.slice(0, 200), inbox: true, links: urlIn ? [{ url: urlIn, title: '' }] : [] })
    go('tasks', 'list', { smart: 'inbox' })
    setTimeout(() => toast('받은 편지함에 추가했어요'), 600)
  }
  // 공유(단축어)로 들어온 노트: ?note=내용&url=링크&title=제목 → 새 노트 열기
  const noteIn = q.get('note'), noteTitleIn = q.get('title') || ''
  if (noteIn != null && (noteIn.trim() || link)) {
    const { noteFromShare } = await import('./lib/notes.js')
    const { openNote } = await import('./nav.js')
    const n = noteFromShare({ text: noteIn, url: link || '', title: noteTitleIn })
    openNote(n.id)
    setTimeout(() => toast('노트로 저장했어요'), 600)
  }
  if (target || added || link || noteIn != null) history.replaceState(null, '', location.pathname + location.hash)
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
