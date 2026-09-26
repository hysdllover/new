import { useEffect } from 'react'
import { Icon, UiLayer, useUi, closeDetail, openSheet, openMenu, useMedia } from './components/ui.jsx'
import { TABS, EXTRA, SEGMENTS, useNav, go, segOf } from './nav.js'
import { useColl, useSettings } from './store/store.js'
import { useSyncStatus, syncNow } from './sync/sync.js'
import { fmtDate, today } from './engine/date.js'
import QuickAdd from './components/QuickAdd.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import TaskEditor from './components/TaskEditor.jsx'
import EventEditor from './components/EventEditor.jsx'
import BlockEditor from './components/BlockItemEditor.jsx'
import Home from './views/Home.jsx'
import Planner from './views/Planner.jsx'
import Tasks from './views/Tasks.jsx'
import Study from './views/Study.jsx'
import Notes from './views/Notes.jsx'
import Health from './views/Health.jsx'
import Settings from './views/Settings.jsx'

const VIEWS = { home: Home, planner: Planner, tasks: Tasks, study: Study, notes: Notes, health: Health, settings: Settings }
const TITLES = { home: null, planner: '플래너', tasks: '할 일', study: '공부', notes: '노트', health: '건강', settings: '설정' }

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
  const seg = segOf(tab)

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
  const moreMenu = (e) => openMenu(e, [
    ...extra.map((x) => ({ label: x.label, icon: x.icon, onClick: () => go(x.id) })),
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
        {[...TABS, ...extra].map((t) => (
          <button key={t.id} className={'nav' + (tab === t.id ? ' on' : '')} onClick={() => go(t.id)} title={t.label}>
            <Icon name={t.icon} /><span>{t.label}</span>
          </button>
        ))}
        {views.length > 0 && <div className="sec">저장된 뷰</div>}
        {views.map((v) => (
          <button key={v.id} className="sub" onClick={() => go('tasks', 'list', { viewId: v.id })}><Icon name="flag" size={14} />{v.name}</button>
        ))}
        {projects.length > 0 && <div className="sec">프로젝트</div>}
        {projects.map((p) => (
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
        <main className="content" id="content">
          <div className="content-inner"><View seg={seg} params={nav.params[tab] || {}} /></div>
        </main>
      </div>

      {detail && wide && <aside className="detail open">{detail}</aside>}
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
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>
            <Icon name={t.icon} size={22} stroke={1.4} />{t.label}
          </button>
        ))}
      </nav>
      <button className="fab no-print" onClick={openQuick} aria-label="빠른 추가"><Icon name="plus" size={24} stroke={1.8} /></button>
      <UiLayer />
    </div>
  )
}

function openQuick() { openSheet((close) => <QuickAdd close={close} />, { title: '빠른 추가' }) }
function openSearch() { openSheet((close) => <CommandPalette close={close} />, { title: null, full: true }) }
