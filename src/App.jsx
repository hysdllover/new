import { useEffect, useState, lazy, Suspense } from 'react'
import { Icon, UiLayer, useUi, closeDetail, openSheet, openMenu, useMedia } from './components/ui.jsx'
import { TABS, EXTRA, SEGMENTS, useNav, go, segOf, tabOpt, DEFAULT_TABBAR } from './nav.js'
import { useColl, useSettings, setSettings } from './store/store.js'
import { useSyncStatus, syncNow } from './sync/sync.js'
import { isStandalone } from './lib/push.js'
import { fmtDate, today, fmtClock } from './engine/date.js'
import { useTimerState, useTick, elapsed, remaining } from './lib/timer.js'
import QuickAdd from './components/QuickAdd.jsx'
import { useResume } from './lib/resume.js'
import CommandPalette from './components/CommandPalette.jsx'
import TaskEditor from './components/TaskEditor.jsx'
import EventEditor from './components/EventEditor.jsx'
import BlockEditor from './components/BlockItemEditor.jsx'
import Home from './views/Home.jsx'
import Health from './views/Health.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// 홈·건강(홈 위젯이 씀) 말고는 처음 열 때 받음 · 앱이 뜬 뒤 쉬는 시간에 미리 받아 둠(오프라인 대비)
const LOAD = { planner: () => import('./views/Planner.jsx'), tasks: () => import('./views/Tasks.jsx'), study: () => import('./views/Study.jsx'), notes: () => import('./views/Notes.jsx'), settings: () => import('./views/Settings.jsx') }
const VIEWS = { home: Home, health: Health, ...Object.fromEntries(Object.entries(LOAD).map(([k, f]) => [k, lazy(f)])) }
const prefetch = () => Object.values(LOAD).forEach((f) => f().catch(() => {}))
if (typeof window !== 'undefined') (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(prefetch, { timeout: 4000 })
// 아이패드 가로 2단: 오른쪽에 함께 띄울 화면 (설정 › 디자인)
export const SPLIT = { planner: ['planner', 'today', '오늘 일정'], timer: ['study', 'timer', '타이머'], tasks: ['tasks', 'day', '오늘 할 일'], notes: ['notes', 'daily', '데일리 노트'] }
const TITLES = { home: null, planner: '캘린더', tasks: '할 일', study: '공부 기록', notes: '노트', health: '건강', settings: '설정' }

// 위젯을 누르면 Safari 로 열림(iOS 제한) → 연결 안 된 Safari 에서만 안내
function SafariNote() {
  const [x, setX] = useState(() => { try { return sessionStorage.getItem('safari_note') } catch { return null } })
  if (x) return null
  return (
    <div className="safari-note small">
      <span className="grow">Safari 에서 열렸어요. 홈 화면 앱과 데이터가 따로라 동기화가 안 돼요. 홈 화면 앱 › 설정 › 동기화 › <b>Safari 연결 링크</b>를 복사해 이 주소창에 한 번 붙여 넣으면 같이 써요.</span>
      <button className="icon-btn" aria-label="닫기" onClick={() => { try { sessionStorage.setItem('safari_note', '1') } catch {} setX('1') }}>×</button>
    </div>
  )
}

export default function App() {
  const nav = useNav()
  const st = useSettings()
  const ui = useUi()
  const sync = useSyncStatus()
  const wide = useMedia('(min-width: 1024px)')
  const views = useColl('views')
  const projects = useColl('projects')
  const tab = nav.tab
  const View = VIEWS[tab] || Home
  const segs = (SEGMENTS[tab] || []).filter((s) => !s[2] || st.modules[s[2]] !== false)
  const seg0 = segOf(tab)
  const seg = segs.length && !segs.some((x) => x[0] === seg0) ? segs[0][0] : seg0
  const pins = (st.sidebarPins || []).map(tabOpt).filter(Boolean)
  const [sbOpen, setSbOpen] = useState(() => { try { return JSON.parse(localStorage.getItem('sb_open') || '{}') } catch { return {} } })
  const toggleSb = (k) => { const v = { ...sbOpen, [k]: !(k === 'all' ? sbOpen.all : sbOpen[k] !== false) }; setSbOpen(v); try { localStorage.setItem('sb_open', JSON.stringify(v)) } catch {} }
  const sp = SPLIT[st.splitPane], pane = sp && !(sp[0] === tab && sp[1] === seg) ? { V: VIEWS[sp[0]], seg: sp[1] } : null

  // 스크롤: 맨 위면 큰 제목, 내리면 제목 작게 · 탭바 작게 (올리면 다시 크게)
  useEffect(() => {
    const el = document.getElementById('content'), root = document.documentElement
    if (!el) return
    let last = el.scrollTop, raf = 0
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const y = el.scrollTop; root.classList.toggle('sc-away', y > 24); if (Math.abs(y - last) > 6) { root.classList.toggle('sc-down', y > last && y > 60); last = y } }) }
    el.addEventListener('scroll', on, { passive: true })
    return () => { el.removeEventListener('scroll', on); root.classList.remove('sc-away', 'sc-down') }
  }, [tab])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openQuick() }
      if (e.key === 'Escape') closeDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const extra = EXTRA.filter((x) => !x.module || st.modules[x.module] !== false)
  // 하단 탭: 설정에서 고른 화면 (순서·숨기기)
  const bar = (st.tabBar?.length ? st.tabBar : DEFAULT_TABBAR).map(tabOpt).filter(Boolean)
  const hiddenTabs = TABS.filter((t) => !bar.some((b) => b.tab === t.id))
  // 같은 탭의 특정 화면(예: 타이머)이 따로 있으면, 그냥 탭은 그 화면이 아닌 곳으로
  const freeSeg = (tb) => { const claimed = bar.filter((b) => b.tab === tb && b.seg).map((b) => b.seg); if (!claimed.includes(segOf(tb))) return undefined; return (SEGMENTS[tb] || []).map((x) => x[0]).find((x) => !claimed.includes(x)) }
  const moreMenu = (e) => openMenu(e, [
    ...hiddenTabs.map((x) => ({ label: x.label, icon: x.icon, onClick: () => go(x.id) })),
    ...extra.filter((x) => !bar.some((b) => b.tab === x.id)).map((x) => ({ label: x.label, icon: x.icon, onClick: () => go(x.id) })),
    { label: '기록에 물어보기', icon: 'search', onClick: () => import('./components/AskSheet.jsx').then((m) => openSheet(() => <m.default />, { title: '내 기록에 물어보기' })) },
    { label: '사진 넣기', icon: 'upload', onClick: () => import('./components/PhotoPaste.jsx').then((m) => openSheet((c) => <m.default close={c} />, { title: '사진 넣기' })) },
    { label: '리포트', icon: 'check', onClick: () => import('./components/DaySummary.jsx').then((m) => openSheet(() => <m.default />, { title: '리포트' })) },
    { label: '보관함·휴지통', icon: 'archive', onClick: () => go('tasks', 'archive') },
    { label: '인쇄 (A4)', icon: 'print', onClick: () => window.print() },
  ])

  const detail = ui.detail && (
    ui.detail.type === 'task' ? <TaskEditor id={ui.detail.id} /> :
    ui.detail.type === 'event' ? <EventEditor id={ui.detail.id} occ={ui.detail.occ} /> :
    ui.detail.type === 'block' ? <BlockEditor id={ui.detail.id} /> : null
  )

  return (
    <div className="app">
      <nav className="sidebar no-print">
        {/* 아이패드 사이드바: 고정한 화면을 위에, 나머지는 접기 (설정 › 아이패드 사이드바) */}
        {pins.map((o) => (
          <button key={o.key} className={'nav' + (tab === o.tab && (!o.seg || seg === o.seg) && !(o.seg == null && pins.some((p) => p.tab === o.tab && p.seg === seg)) ? ' on' : '')} onClick={() => go(o.tab, o.seg)} title={o.label}>
            <Icon name={o.icon} /><span>{o.label}</span>
          </button>
        ))}
        {pins.length > 0 && <button className="sec sec-btn" onClick={() => toggleSb('all')}>{sbOpen.all ? '▾' : '▸'} 전체</button>}
        {(!pins.length || sbOpen.all) && [...TABS, ...extra].filter((t) => !pins.some((p) => p.tab === t.id && !p.seg)).map((t) => (
          <button key={t.id} className={'nav' + (tab === t.id && !pins.some((p) => p.tab === t.id) ? ' on' : '')} onClick={() => go(t.id)} title={t.label}>
            <Icon name={t.icon} /><span>{t.label}</span>
          </button>
        ))}
        {views.length > 0 && <button className="sec sec-btn" onClick={() => toggleSb('views')}>{sbOpen.views !== false ? '▾' : '▸'} 저장된 뷰</button>}
        {sbOpen.views !== false && views.map((v) => (
          <button key={v.id} className="sub" onClick={() => go('tasks', 'list', { viewId: v.id })}><Icon name="flag" size={14} />{v.name}</button>
        ))}
        {projects.length > 0 && <button className="sec sec-btn" onClick={() => toggleSb('proj')}>{sbOpen.proj !== false ? '▾' : '▸'} 프로젝트</button>}
        {sbOpen.proj !== false && projects.map((p) => (
          <button key={p.id} className="sub" onClick={() => go('notes', 'hub', { hubId: 'p:' + p.id })}><span className="dot" style={{ background: p.color }} />{p.name}</button>
        ))}
      </nav>

      <div className="main">
        <header className="topbar no-print">
          <div className="title ellipsis">{TITLES[tab] || fmtDate(today())}</div>
          <button className="icon-btn" onClick={() => syncNow()} title={sync.error || '동기화'} aria-label="동기화 상태">
            <span className={'sync-dot ' + sync.state} />
          </button>
          <button className="icon-btn" onClick={openSearch} aria-label="검색"><Icon name="search" /></button>
          <button className="icon-btn" onClick={moreMenu} aria-label="더보기"><Icon name="more" size={20} stroke={2.4} /></button>
        </header>
        {segs.length > 0 && (
          <div className="segbar no-print">
            <div className="seg">
              {segs.map(([v, l]) => <button key={v} className={seg === v ? 'on' : ''} onClick={() => go(tab, v)}>{l}</button>)}
            </div>
          </div>
        )}
        <StatusLine sync={sync} />
        <ResumeBanner />
        <main className="content" id="content">
          <div className="content-inner">{sync.state === 'off' && !isStandalone() && /iP(hone|ad)|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 0 && <SafariNote />}<ErrorBoundary where={'view:' + tab + '.' + seg} reset={tab + seg} big><Suspense fallback={null}><View seg={seg} params={nav.params[tab] || {}} /></Suspense></ErrorBoundary></div>
        </main>
      </div>

      {detail && wide && <aside className="detail open">{detail}</aside>}
      {!detail && wide && pane && <aside className="split-pane no-print">
        <div className="row between" style={{ marginBottom: 8 }}><span className="small muted">{SPLIT[st.splitPane][2]}</span><button className="icon-btn" aria-label="2단 닫기" onClick={() => setSettings({ splitPane: null })}><Icon name="close" size={14} /></button></div>
        <Suspense fallback={null}><pane.V seg={pane.seg} params={{}} /></Suspense>
      </aside>}
      {detail && !wide && (
        <>
          <div className="sheet-bg" onClick={closeDetail} />
          <div className="sheet full">
            <div className="sheet-grab" />
            {detail}
          </div>
        </>
      )}

      <nav className="tabbar no-print">
        {bar.map((t) => (
          <button key={t.key} className={tab === t.tab && (t.seg ? seg === t.seg : !bar.some((b) => b.tab === t.tab && b.seg && b.seg === seg)) ? 'on' : ''} onClick={() => go(t.tab, t.seg || freeSeg(t.tab))}>
            <Icon name={t.icon} size={22} stroke={1.4} /><span className="tb-l">{t.label}</span>
          </button>
        ))}
      </nav>
      <button className="fab no-print" {...fabPress} aria-label="빠른 추가 (길게 누르면 공부 기록)"><Icon name="plus" size={24} stroke={1.8} /></button>
      <UiLayer />
    </div>
  )
}

function openQuick(initial) { openSheet((close) => <QuickAdd close={close} initial={initial} />, { title: '빠른 추가' }) }

// + 버튼: 탭 = 빠른 추가, 길게 누르기 = 공부 기록 입력
let pressTimer = null, longFired = false
const fabPress = {
  onPointerDown: () => { longFired = false; pressTimer = setTimeout(() => { longFired = true; try { navigator.vibrate?.(15) } catch {} openQuick('record') }, 450) },
  onPointerUp: () => clearTimeout(pressTimer),
  onPointerLeave: () => clearTimeout(pressTimer),
  onClick: () => { if (!longFired) openQuick() },
  onContextMenu: (e) => e.preventDefault(),
}
function openSearch() { openSheet((close) => <CommandPalette close={close} />, { title: null, full: true }) }

// 다른 기기에서 보던 화면 이어 보기
function ResumeBanner() {
  const r = useResume()
  if (!r) return null
  return (
    <div className="resume-bar no-print">
      <button className="grow ellipsis" style={{ textAlign: 'left' }} onClick={r.open}><span className="muted">{r.dev}에서 보던</span> <b>{r.label}</b> <span className="muted">이어 보기 →</span></button>
      <button className="icon-btn" aria-label="닫기" onClick={r.dismiss}><Icon name="close" size={12} /></button>
    </div>
  )
}

// 상단 상태 줄 (설정 › 디자인 세부): 진행 중 타이머 · 동기화 상태를 한 줄로
function StatusLine({ sync }) {
  const st = useSettings(), tm = useTimerState(), subjects = useColl('subjects')
  useTick(!!tm && !tm.paused && !!st.statusLine)
  if (!st.statusLine) return null
  const sb = tm && subjects.find((x) => x.id === tm.subjectId)
  const ago = sync.last ? Math.round((Date.now() - sync.last) / 60000) : null
  const syncTxt = sync.state === 'off' ? '동기화 꺼짐' : sync.state === 'syncing' ? '동기화 중' : sync.state === 'error' ? '동기화 대기' : ago == null ? '' : ago < 1 ? '방금 동기화' : ago < 60 ? `${ago}분 전 동기화` : `${Math.round(ago / 60)}시간 전 동기화`
  return (
    <div className="status-line no-print">
      {tm ? <button className="sl-timer" onClick={() => go('study', 'timer')}><i style={{ background: sb?.color || 'var(--accent)' }} className={tm.paused ? 'paused' : ''} />{sb?.name || '공부'} <b>{fmtClock((tm.mode === 'countdown' ? remaining(tm) : elapsed(tm)) / 1000)}</b>{tm.paused ? ' · 일시정지' : ''}</button> : <span>{fmtDate(today())}</span>}
      <span className="grow" />
      <span className={'sl-sync ' + sync.state}>{syncTxt}</span>
    </div>
  )
}
