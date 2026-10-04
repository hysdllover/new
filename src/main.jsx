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
  // 조용한 모드: 숫자·지연 강조·이월 표시 숨김
  useEffect(() => { document.documentElement.toggleAttribute('data-calm', !!st.calm) }, [st.calm])
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
  // 위젯에서 누른 할 일: ?done=할일id → 완료 확인
  const doneIn = q.get('done')
  if (doneIn) {
    const { find } = await import('./store/store.js')
    const tk = find('tasks', doneIn)
    if (q.get('quick') && tk && !tk.deleted) {
      // 위젯에서 바로 완료 (확인 창 없이) — 잘못 눌렀으면 되돌리기
      const { toggleTask } = await import('./store/actions.js')
      if (!tk.done) toggleTask(doneIn)
      setTimeout(() => toast(`완료 · ${tk.title}`, { label: '되돌리기', fn: () => toggleTask(doneIn) }), 500)
    } else {
      const [{ default: DoneConfirm }, { openSheet }] = await Promise.all([import('./components/DoneConfirm.jsx'), import('./components/ui.jsx')])
      setTimeout(() => openSheet((c) => <DoneConfirm id={doneIn} close={c} />, { title: '할 일' }), 300)
    }
  }
  // 위젯 '바로 시작': ?timer=과목id → 스톱워치 시작 (이미 도는 중이면 그대로) · ?new=task|event|record|memo → 빠른 추가
  const timerIn = q.get('timer'), newIn = q.get('new')
  if (timerIn != null) {
    const tm = await import('./lib/timer.js')
    if (!tm.getTimer()) { const { list } = await import('./store/store.js'); const sid = list('subjects').some((s) => s.id === timerIn) ? timerIn : list('subjects')[0]?.id; tm.startStopwatch(sid); setTimeout(() => toast('타이머를 시작했어요'), 600) }
    go('study', 'timer')
  }
  if (newIn && ['task', 'event', 'record', 'memo'].includes(newIn)) {
    const [{ default: QuickAdd }, { openSheet }] = await Promise.all([import('./components/QuickAdd.jsx'), import('./components/ui.jsx')])
    setTimeout(() => openSheet((c) => <QuickAdd close={c} initial={newIn} />, { title: '빠른 추가' }), 300)
  }
  // 공유 시트 사진: ?photo=1 → 붙여넣기 시트 (단축어가 사진을 클립보드에 복사해 둠)
  const photoIn = q.get('photo') != null
  if (photoIn) {
    const [{ default: PhotoPaste }, { openSheet }] = await Promise.all([import('./components/PhotoPaste.jsx'), import('./components/ui.jsx')])
    setTimeout(() => openSheet((c) => <PhotoPaste close={c} />, { title: '사진 넣기' }), 300)
  }
  // 단축어(애플 인텔리전스)가 돌려준 답: ?ai=답
  const aiIn = q.get('ai')
  if (aiIn != null) {
    let pending = null
    try { pending = JSON.parse(localStorage.getItem('aiPending') || 'null'); localStorage.setItem('aiAnswer', JSON.stringify({ q: pending?.q || '', a: aiIn, at: Date.now() })); localStorage.removeItem('aiPending') } catch {}
    const [{ default: AskSheet }, { openSheet }] = await Promise.all([import('./components/AskSheet.jsx'), import('./components/ui.jsx')])
    setTimeout(() => openSheet(() => <AskSheet initial={pending?.q || ''} />, { title: '내 기록에 물어보기' }), 300)
  }
  // 건강 앱(단축어 자동화): ?health=1&sleep=..&steps=..
  const healthIn = q.get('health') != null
  if (healthIn) {
    const { importHealth } = await import('./lib/health.js')
    const r = importHealth(q)
    if (r) { go('health'); setTimeout(() => toast(`건강 기록 · ${[r.sleep != null && `수면 ${r.sleep}시간`, r.steps != null && `걸음 ${r.steps.toLocaleString()}`].filter(Boolean).join(' · ')}`), 600) }
  }
  if (target || added || link || noteIn != null || healthIn || aiIn != null || doneIn || timerIn != null || newIn || photoIn) history.replaceState(null, '', location.pathname + location.hash)
  createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>)
  startServices()
  import('./lib/resume.js').then((m) => m.startResume())
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
