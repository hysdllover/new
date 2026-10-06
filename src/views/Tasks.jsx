import { useMemo, useState } from 'react'
import { useColl, patch, put, remove, batch } from '../store/store.js'
import { addTask, toggleTask, moveTasks, updateTask, QUICK_DATES } from '../store/actions.js'
import TaskQuickInput from '../components/TaskQuickInput.jsx'
import { AddInput, Empty, Icon, openSheet, openMenu, toast, openDetail, Check } from '../components/ui.jsx'
import TaskItem from '../components/TaskItem.jsx'
import { WeekGoalsCard } from '../components/WeekGoals.jsx'
import { SMART, applyFilter, quadrant, openCount } from './tasks/filter.js'
import { setParams } from '../nav.js'
import { longPress } from '../lib/drag.js'
import { dropTaskOnTimeline } from './planner/timeline.js'
import { useRef } from 'react'
import { today, tsToYmd, tsToMin, weekStart, fmtDate, fmtTime, fmtDur, addDays, parseYmd, WD } from '../engine/date.js'
import { useSettings } from '../store/store.js'
import { doneToday, spanOn, spanInfo } from './tasks/filter.js'
import { useTidy, setTidy } from '../lib/tidy.js'
import Gantt from './tasks/Gantt.jsx'
import Archive from './tasks/Archive.jsx'
import DBView from './tasks/DBView.jsx'

export default function Tasks({ seg, params }) {
  if (seg === 'matrix') return <Matrix />
  if (seg === 'kanban') return <Kanban />
  if (seg === 'gantt') return <Gantt />
  if (seg === 'table') return <DBView />
  if (seg === 'archive') return <Archive />
  if (seg === 'list') return <TaskList params={params} />
  if (seg === 'board') return <WeekBoard />
  return <DayView params={params} />
}

function TaskList({ params }) {
  const tasks = useColl('tasks')
  const subjects = useColl('subjects')
  const projects = useColl('projects')
  const views = useColl('views')
  const view = params.viewId && views.find((v) => v.id === params.viewId)
  const f = view ? { ...view.filter, ...(params.q != null ? { q: params.q } : null) } : params
  const set = (p) => setParams('tasks', { ...p, viewId: null })
  const items = useMemo(() => applyFilter(tasks, { smart: 'all', sort: 'manual', ...f }), [tasks, f])
  const manual = (f.sort || 'manual') === 'manual'
  const sel = useSel()
  const nFilter = [f.subjectId, f.projectId, f.sort && f.sort !== 'manual'].filter(Boolean).length

  const dragFor = (t) => longPress(() => ({
    label: t.title,
    onDrop: (zone, pt) => {
      if (dropTaskOnTimeline(t, zone, pt)) return
      if (!manual) return
      const target = zone.dataset.drop
      if (!target.startsWith('task:')) return
      const tid = target.slice(5)
      if (tid === t.id) return
      const idx = items.findIndex((x) => x.id === tid)
      const r = zone.getBoundingClientRect()
      const before = pt.y < r.top + r.height / 2
      const nb = before ? items[idx - 1] : items[idx + 1]
      const o = items[idx].order ?? 0
      const other = nb && nb.id !== t.id ? (nb.order ?? 0) : o + (before ? -1000 : 1000)
      patch('tasks', t.id, { order: (o + other) / 2 })
    },
  }))

  const saveView = () => {
    const name = prompt('저장할 뷰 이름', '')
    if (!name) return
    const v = put('views', { name, filter: { smart: f.smart, subjectId: f.subjectId, projectId: f.projectId, priority: f.priority, sort: f.sort } })
    setParams('tasks', { viewId: v.id })
    toast('뷰 저장됨 · 사이드바에 고정')
  }

  return (
    <div className="col">
      <WeekGoalsCard />
      <TaskQuickInput key={f.smart + (f.subjectId || '')} defaultDate={f.smart === 'today' ? 'today' : f.smart === 'tomorrow' ? 'tomorrow' : ''} defaults={{ subjectId: f.subjectId || null, projectId: f.projectId || null, ...(f.smart === 'inbox' ? { inbox: true } : null) }} />
      <div className="scroll-x"><div className="row" style={{ gap: 6, paddingBottom: 2 }}>
        {SMART.map(([k, l]) => <button key={k} className={'chip' + ((f.smart || 'all') === k && !view ? ' on' : '')} onClick={() => set({ smart: k })}>{l} <span className="muted tiny cnt">{k === 'done' ? applyFilter(tasks, { smart: k }).length : openCount(applyFilter(tasks, { smart: k }))}</span></button>)}
      </div></div>
      {views.length > 0 && (
        <div className="scroll-x"><div className="row" style={{ gap: 6 }}>
          {views.map((v) => (
            <button key={v.id} className={'chip' + (view?.id === v.id ? ' on' : '')} onClick={() => setParams('tasks', { viewId: view?.id === v.id ? null : v.id })}
              onContextMenu={(e) => { e.preventDefault(); openMenu(e, [{ label: '뷰 삭제', icon: 'trash', danger: true, onClick: () => remove('views', v.id) }]) }}>
              <Icon name="flag" size={12} />{v.name}
            </button>
          ))}
        </div></div>
      )}
      <div className="row" style={{ gap: 6 }}>
        <input className="input grow" placeholder="검색" value={f.q || ''} onChange={(e) => setParams('tasks', { q: e.target.value })} />
        <button className={'btn' + (nFilter ? ' on-acc' : '')} onClick={() => setParams('tasks', { showFilter: !params.showFilter })}>필터{nFilter ? ' ' + nFilter : ''}</button>
        {f.smart !== 'done' && <button className={'btn' + (sel.mode ? ' on-acc' : '')} onClick={sel.toggleMode}>선택</button>}
        <button className="btn" onClick={openSeries}>시리즈</button>
      </div>
      {params.showFilter && (
        <div className="row wrap" style={{ gap: 6 }}>
          <select className="input" style={{ flex: 1, minWidth: 110 }} value={f.subjectId || ''} onChange={(e) => set({ ...f, subjectId: e.target.value || null })}>
            <option value="">모든 과목</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" style={{ flex: 1, minWidth: 110 }} value={f.projectId || ''} onChange={(e) => set({ ...f, projectId: e.target.value || null })}>
            <option value="">모든 프로젝트</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input" style={{ flex: 1, minWidth: 110 }} value={f.sort || 'manual'} onChange={(e) => set({ ...f, sort: e.target.value })}>
            <option value="manual">수동 정렬</option><option value="due">마감순</option><option value="priority">우선순위</option><option value="subject">과목</option><option value="created">최근 추가</option>
          </select>
          <button className="btn" onClick={saveView} title="현재 필터를 뷰로 저장"><Icon name="flag" size={15} />뷰 저장</button>
        </div>
      )}
      {(f.smart === 'today' || f.smart === 'overdue') && openCount(items) > 0 && <BulkMove ids={items.filter((t) => !t.done).map((t) => t.id)} />}
      {f.smart === 'done' ? <DoneTimeline items={items} subjects={subjects} /> : (
      <div className="card" style={{ padding: '2px 12px' }}>
        <div className="list">
          {items.map((t) => (
            <div key={t.id} data-drop={'task:' + t.id}><TaskItem t={t} subjects={subjects} projects={projects} drag={dragFor(t)} sel={sel.of(t)}
              extra={f.smart === 'inbox' && <span className="inbox-acts" data-nodrag onClick={(e) => e.stopPropagation()}>{[['today', '오늘'], ['tomorrow', '내일'], ['weekend', '주말']].map(([k, l]) => <button key={k} className="chip sm" onClick={() => moveTasks([t.id], k)}>{l}</button>)}<button className="chip sm" onClick={() => patch('tasks', t.id, { inbox: false })}>정리됨</button></span>} /></div>
          ))}
          {!items.length && <Empty>{f.smart === 'inbox' ? '받은 편지함이 비었어요' : '할 일이 없어요'}</Empty>}
        </div>
      </div>)}
      {manual && items.length > 1 && !sel.mode && <div className="tiny muted center">길게 눌러 순서를 바꿀 수 있어요</div>}
      {sel.mode && <SelBar sel={sel} all={items} />}
    </div>
  )
}

// 일별 보기: 날짜를 넘기며 그날 할 일만 (시간 있는 것은 시간순, 나머지는 내가 정한 순서)
function DayView({ params }) {
  const tasks = useColl('tasks'), subjects = useColl('subjects'), projects = useColl('projects')
  const st = useSettings()
  const t0 = today(), date = params.day || t0
  const go = (d) => setParams('tasks', { day: d === t0 ? null : d })
  const isToday = date === t0
  const live = tasks.filter((t) => !t.archived)
  const ofDay = (d) => live.filter((t) => t.due === d) // 완료한 것도 줄 그은 채 제자리
  const order = (a, b) => (a.dueTime == null) - (b.dueTime == null) || (a.dueTime ?? 0) - (b.dueTime ?? 0) || (a.order ?? 0) - (b.order ?? 0)
  const tidy = useTidy(), sel = useSel()
  const all = ofDay(date).sort(order)
  const items = tidy ? all.filter((t) => !t.done) : all
  const spans = live.filter((t) => !t.done && spanOn(t, date))
  // 오늘: 지난 날짜의 남은 할 일 (오늘 완료한 것은 줄 그은 채 제자리)
  const overdue = isToday ? live.filter((t) => t.due && t.due < t0 && (!t.done || (!tidy && doneToday(t)))).sort((a, b) => a.due.localeCompare(b.due) || order(a, b)) : []
  const ws = weekStart(date, st.weekStart ?? 1)
  const strip = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const dragFor = (t) => longPress(() => ({
    label: t.title,
    onDrop: (zone, pt) => {
      if (dropTaskOnTimeline(t, zone, pt)) return // 아이패드 2단 · 오늘 일정 타임라인으로
      if (t.dueTime != null) return
      const target = zone.dataset.drop
      if (!target?.startsWith('task:')) return
      const tid = target.slice(5)
      if (tid === t.id) return
      const idx = items.findIndex((x) => x.id === tid)
      if (idx < 0) return
      const r = zone.getBoundingClientRect(), before = pt.y < r.top + r.height / 2
      const nb = before ? items[idx - 1] : items[idx + 1]
      const o = items[idx].order ?? 0
      const other = nb && nb.id !== t.id ? (nb.order ?? 0) : o + (before ? -1000 : 1000)
      patch('tasks', t.id, { order: (o + other) / 2 })
    },
  }))
  // 좌우로 밀어 날짜 넘기기
  const sw = useRef(null)
  const onTouchStart = (e) => { const p = e.touches[0]; sw.current = { x: p.clientX, y: p.clientY } }
  const onTouchEnd = (e) => {
    const s = sw.current; sw.current = null
    if (!s) return
    const p = e.changedTouches[0], dx = p.clientX - s.x, dy = p.clientY - s.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) go(addDays(date, dx < 0 ? 1 : -1))
  }
  const rel = (d) => { const n = Math.round((parseYmd(d) - parseYmd(t0)) / 86400000); return n === 0 ? '오늘' : n === 1 ? '내일' : n === -1 ? '어제' : n === 2 ? '모레' : null }
  const left = items.filter((t) => !t.done).length
  const row = (t) => <div key={t.id} data-drop={'task:' + t.id}><TaskItem t={t} subjects={subjects} projects={projects} drag={dragFor(t)} sel={sel.of(t)} /></div>
  return (
    <div className="col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="row between">
        <div className="row">
          <button className="icon-btn" onClick={() => go(addDays(date, -1))} aria-label="전날"><Icon name="back" /></button>
          <label className="date-label day-title">
            <b>{rel(date) || fmtDate(date, { wd: false })}</b><span className="muted small"> {rel(date) ? fmtDate(date) : WD[parseYmd(date).getDay()] + '요일'}</span>
            <input type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)} />
          </label>
          <button className="icon-btn" onClick={() => go(addDays(date, 1))} aria-label="다음날"><Icon name="next" /></button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={'btn sm' + (sel.mode ? ' on-acc' : '')} onClick={sel.toggleMode}>선택</button>
          <button className={'btn sm' + (tidy ? ' on-acc' : '')} onClick={() => setTidy(!tidy)}>{tidy ? '모두 보기' : '끝난 것 접기'}</button>
          {!isToday && <button className="btn sm" onClick={() => go(t0)}>오늘</button>}
        </div>
      </div>
      <div className="day-strip">
        {strip.map((d) => {
          const n = ofDay(d).filter((t) => !t.done).length + (d === t0 ? live.filter((t) => t.due && t.due < t0 && !t.done).length : 0)
          const wd = parseYmd(d).getDay()
          return (
            <button key={d} className={'day-cell' + (d === date ? ' on' : '') + (d === t0 ? ' today' : '')} onClick={() => go(d)}>
              <span className={'tiny' + (wd === 0 ? ' sun' : wd === 6 ? ' sat' : '')}>{WD[wd]}</span>
              <b>{parseYmd(d).getDate()}</b>
              <span className="day-n cnt">{n || ''}</span>
            </button>
          )
        })}
      </div>
      <TaskQuickInput key={date} fixedDate={date} />
      {overdue.length > 0 && (
        <div className="card" style={{ padding: '6px 12px' }}>
          <div className="row between" style={{ padding: '4px 0' }}><span className="small muted">지난 할 일 <span className="cnt">{overdue.filter((t) => !t.done).length}</span></span>
            {overdue.some((t) => !t.done) && <button className="chip sm" onClick={() => { const ids = overdue.filter((t) => !t.done).map((t) => t.id); moveTasks(ids, 'today'); toast(`${ids.length}개를 오늘로 옮겼어요`) }}>모두 오늘로</button>}
          </div>
          <div className="list">{overdue.map((t) => <div key={t.id}><TaskItem t={t} subjects={subjects} projects={projects} sel={sel.of(t)} /></div>)}</div>
        </div>
      )}
      {spans.length > 0 && (
        <div className="card" style={{ padding: '6px 12px' }}>
          <div className="small muted" style={{ padding: '4px 0' }}>진행 중 · 기간 할 일</div>
          {spans.map((t) => { const s = spanInfo(t, date); return (
            <button key={t.id} className="span-row" onClick={() => openDetail('task', t.id)} style={{ '--c': subjects.find((x) => x.id === t.subjectId)?.color || 'var(--accent)' }}>
              <span className="ellipsis grow">{t.title}</span><span className="tiny muted nowrap">{s.n}/{s.total}일 · 마감 {t.due.slice(5).replace('-', '/')}</span>
              <i style={{ width: (s.n / s.total) * 100 + '%' }} />
            </button>) })}
        </div>
      )}
      <div className="card" style={{ padding: '2px 12px' }}>
        <div className="row between" style={{ padding: '8px 0 2px' }}><span className="small muted">{rel(date) || fmtDate(date)} 할 일 {all.length ? `${all.filter((t) => t.done).length}/${all.length}` : ''}{tidy && all.length > items.length ? ` · 완료 ${all.length - items.length}개 접음` : ''}</span></div>
        <div className="list">
          {items.map(row)}
          {!items.length && <Empty>{all.length ? '모두 끝냈어요' : isToday ? '오늘 할 일이 없어요' : '이날 할 일이 없어요'}</Empty>}
        </div>
      </div>
      {left > 0 && !sel.mode && <BulkMove ids={items.filter((t) => !t.done).map((t) => t.id)} />}
      {sel.mode ? <SelBar sel={sel} all={[...overdue, ...items]} /> : <div className="tiny muted center">좌우로 밀어 날짜 이동 · 길게 눌러 순서 변경 (시간 있는 할 일은 시간순)</div>}
    </div>
  )
}

// 여러 개 골라 한 번에: 완료 · 날짜 옮기기 · 삭제
function useSel() {
  const [mode, setMode] = useState(false), [ids, setIds] = useState(() => new Set())
  const toggle = (id) => setIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return {
    mode, ids, setIds,
    toggleMode: () => { setMode(!mode); setIds(new Set()) },
    off: () => { setMode(false); setIds(new Set()) },
    of: (t) => (mode ? { on: ids.has(t.id), toggle: () => toggle(t.id) } : undefined),
  }
}
function SelBar({ sel, all }) {
  const ids = [...sel.ids].filter((id) => all.some((t) => t.id === id)), n = ids.length
  const allOn = n > 0 && n === all.length
  const done = () => { const open = ids.filter((id) => !all.find((t) => t.id === id)?.done); batch(() => open.forEach((id) => toggleTask(id))); toast(`${open.length}개 완료`); sel.off() }
  const move = (k, l) => { moveTasks(ids, k); toast(`${n}개를 ${l}(으)로 옮겼어요`); sel.off() }
  const del = () => { if (!confirm(`${n}개를 삭제할까요?`)) return; batch(() => ids.forEach((id) => remove('tasks', id))); toast(`${n}개 삭제`); sel.off() }
  return (
    <div className="sel-bar">
      <div className="row between"><span className="small">{n}개 선택</span>
        <span className="row" style={{ gap: 6 }}><button className="chip" onClick={() => sel.setIds(new Set(allOn ? [] : all.map((t) => t.id)))}>{allOn ? '선택 해제' : '전체'}</button><button className="chip" onClick={sel.off}>닫기</button></span></div>
      <div className="row wrap" style={{ gap: 6, opacity: n ? 1 : .45, pointerEvents: n ? 'auto' : 'none' }}>
        <button className="chip on" onClick={done}>완료</button>
        {QUICK_DATES.map(([k, l]) => <button key={k} className="chip" onClick={() => move(k, l)}>{l}</button>)}
        <label className="chip date-chip">날짜…<input type="date" onChange={(e) => e.target.value && move(e.target.value, fmtDate(e.target.value))} /></label>
        <button className="chip" style={{ color: 'var(--danger, #b0605f)' }} onClick={del}>삭제</button>
      </div>
    </div>
  )
}

// 남은 할 일 한 번에 옮기기
function BulkMove({ ids }) {
  return (
    <div className="row wrap bulk-move" style={{ gap: 6 }}>
      <span className="small muted">남은 {ids.length}개 옮기기</span>
      {QUICK_DATES.filter(([k]) => k !== 'today').map(([k, l]) => <button key={k} className="chip" onClick={() => { const d = moveTasks(ids, k); toast(`${ids.length}개를 ${d ? l : '날짜 없음'}으로 옮겼어요`) }}>{l}</button>)}
    </div>
  )
}

// 완료 기록 타임라인: 날짜별·시간순
function DoneTimeline({ items, subjects }) {
  const sessions = useColl('sessions')
  const done = items.filter((t) => t.doneAt).sort((a, b) => b.doneAt - a.doneAt)
  const groups = []
  for (const t of done) { const d = tsToYmd(t.doneAt); let g = groups[groups.length - 1]; if (!g || g.d !== d) groups.push(g = { d, list: [] }); g.list.push(t) }
  const ws = weekStart(today(), 1)
  const week = done.filter((t) => tsToYmd(t.doneAt) >= ws).length
  return (
    <div className="col">
      <div className="small muted">이번 주 완료 <b>{week}</b>개 · 전체 {done.length}개</div>
      {groups.slice(0, 30).map((g) => {
        const mins = sessions.filter((x) => x.date === g.d).reduce((a, x) => a + x.dur, 0)
        return (
          <div key={g.d} className="card" style={{ padding: '10px 14px' }}>
            <div className="row between small" style={{ marginBottom: 6 }}><b>{g.d === today() ? '오늘' : fmtDate(g.d)}</b><span className="tiny muted">완료 {g.list.length}개{mins ? ` · 공부 ${fmtDur(mins)}` : ''}</span></div>
            <div className="tl">
              {g.list.map((t) => { const sub = subjects.find((s) => s.id === t.subjectId); return (
                <div key={t.id} className="tl-row">
                  <span className="tiny muted tl-time">{fmtTime(tsToMin(t.doneAt))}</span>
                  <span className="tl-dot" style={{ background: sub?.color || 'var(--accent)' }} />
                  <button className="grow ellipsis small" style={{ textAlign: 'left' }} onClick={() => openDetail('task', t.id)}>{t.title}</button>
                  <button className="tiny muted" onClick={() => toggleTask(t.id)}>되돌리기</button>
                </div>
              ) })}
            </div>
          </div>
        )
      })}
      {!groups.length && <Empty>완료한 할 일이 없어요</Empty>}
    </div>
  )
}

const QUAD = [
  [1, '지금 하기', '긴급·중요', 'var(--c4)'], [2, '계획하기', '중요', 'var(--accent)'],
  [3, '빨리 끝내기', '긴급', 'var(--c3)'], [4, '나중에', '여유', 'var(--c2)'],
]
function Matrix() {
  const tasks = useColl('tasks').filter((t) => !t.archived)
  const subjects = useColl('subjects')
  return (
    <div className="matrix-wrap">
      <div className="mx-axis-top"><span>긴급</span><span>여유</span></div>
      <div className="mx-body">
        <div className="mx-axis-left"><span>중요</span><span>덜 중요</span></div>
        <div className="matrix">
          {QUAD.map(([q, l, hint, c]) => {
            const items = tasks.filter((t) => quadrant(t) === q)
            return (
              <div key={q} className="quad" data-drop={'q:' + q} style={{ '--qc': c }}>
                <div className="quad-h"><b>{l}</b><span className="tiny muted">{hint} {items.length}</span></div>
                <div className="quad-list">
                  {items.map((t) => <TaskItem key={t.id} t={t} subjects={subjects} compact drag={longPress(() => ({ label: t.title, onDrop: (z) => z.dataset.drop.startsWith('q:') && patch('tasks', t.id, { q: +z.dataset.drop.slice(2) }) }))} />)}
                  {!items.length && <div className="tiny muted" style={{ padding: 6 }}>비어 있음</div>}
                </div>
                <form className="quad-add" onSubmit={(e) => { e.preventDefault(); const v = e.target.t.value.trim(); if (v) { addTask({ title: v, q, priority: q <= 2 ? 2 : 0, due: q === 1 || q === 3 ? today() : null }); e.target.reset() } }}>
                  <input name="t" className="input bare" placeholder="+ 추가" />
                </form>
              </div>
            )
          })}
        </div>
      </div>
      <div className="tiny muted center">길게 눌러 다른 칸으로 옮기기</div>
    </div>
  )
}

const COLS = [['todo', '할 일'], ['doing', '진행 중'], ['done', '완료']]
function Kanban() {
  const tasks = useColl('tasks').filter((t) => !t.archived)
  const subjects = useColl('subjects')
  const projects = useColl('projects')
  const move = (t, status) => {
    if ((status === 'done') !== !!t.done) toggleTask(t.id)
    patch('tasks', t.id, { status })
  }
  return (
    <div className="kanban">
      {COLS.map(([s, l]) => {
        const items = tasks.filter((t) => (t.done ? 'done' : t.status || 'todo') === s).sort((a, b) => s === 'done' ? (b.doneAt || 0) - (a.doneAt || 0) : (a.order ?? 0) - (b.order ?? 0)).slice(0, s === 'done' ? 30 : 999)
        return (
          <div key={s} className="kcol" data-drop={'s:' + s}>
            <div className="card-h" style={{ padding: '0 4px' }}><h3>{l}</h3><span className="badge">{items.length}</span></div>
            {items.map((t) => (
              <div key={t.id} className="card kcard">
                <TaskItem t={t} subjects={subjects} projects={projects} drag={longPress(() => ({ label: t.title, onDrop: (z) => z.dataset.drop.startsWith('s:') && move(t, z.dataset.drop.slice(2)) }))} />
              </div>
            ))}
            {s === 'todo' && <AddInput placeholder="+ 추가" onAdd={(title) => addTask({ title })} />}
          </div>
        )
      })}
    </div>
  )
}


// 시리즈 할 일 만들기 시트
const openSeries = () => import('../components/SeriesSheet.jsx').then((m) => openSheet((c) => <m.default close={c} />, { title: '시리즈 할 일 만들기' }))

// 주간 배치판: 날짜 없는 할 일 + 이번 주 7일 칸 — 길게 눌러 끌어다 놓으면 그날로
function WeekBoard() {
  const st = useSettings()
  const [ws, setWs] = useState(() => weekStart(today(), st.weekStart ?? 1))
  const tasks = useColl('tasks').filter((t) => !t.archived)
  const subjects = useColl('subjects')
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)), t0 = today()
  const ord = (a, b) => (a.done - b.done) || (a.dueTime == null) - (b.dueTime == null) || (a.dueTime ?? 0) - (b.dueTime ?? 0) || (a.order ?? 0) - (b.order ?? 0)
  const loose = tasks.filter((t) => !t.done && !t.due).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 40)
  const drop = (t) => (z) => { const k = z.dataset.drop; if (!k?.startsWith('wd:')) return; const due = k.slice(3) || null; if ((t.due || null) === due) return; updateTask(t.id, due ? { due } : { due: null, dueTime: null }); toast(due ? `${fmtDate(due)}로 옮겼어요` : '날짜를 뺐어요') }
  const Card = ({ t }) => {
    const sb = subjects.find((x) => x.id === t.subjectId)
    return (
      <div className={'wkb-item' + (t.done ? ' done' : '')} style={sb?.color ? { '--sbc': sb.color } : null} {...longPress(() => ({ label: t.title, onDrop: drop(t) }))} onClick={() => openDetail('task', t.id)}>
        <Check on={t.done} onClick={() => toggleTask(t.id)} color={sb?.color} />
        {t.seriesId && <i className="wkb-sd" style={{ background: st.seriesColors?.[t.seriesId] || sb?.color || 'var(--muted)' }} />}
        <span className="wkb-t">{t.title}</span>
        {t.dueTime != null && <span className="tiny muted">{fmtTime(t.dueTime)}</span>}
      </div>
    )
  }
  const col = (key, head, list, cls = '') => (
    <div key={key} className={'wkb-col' + cls} data-drop={'wd:' + key}>
      <div className="wkb-h">{head}<span className="tiny muted">{list.filter((t) => !t.done).length || ''}</span></div>
      {list.map((t) => <Card key={t.id} t={t} />)}
      {!list.length && <div className="wkb-empty">여기로 끌어 놓기</div>}
    </div>
  )
  return (
    <div className="col">
      <div className="row between">
        <div className="row" style={{ gap: 2 }}>
          <button className="icon-btn" onClick={() => setWs(addDays(ws, -7))} aria-label="지난주"><Icon name="back" size={16} /></button>
          <b style={{ fontWeight: 'var(--fw)' }}>{fmtDate(ws, { wd: false })} – {fmtDate(addDays(ws, 6), { wd: false })}</b>
          <button className="icon-btn" onClick={() => setWs(addDays(ws, 7))} aria-label="다음 주"><Icon name="next" size={16} /></button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {ws !== weekStart(t0, st.weekStart ?? 1) && <button className="btn sm" onClick={() => setWs(weekStart(t0, st.weekStart ?? 1))}>이번 주</button>}
          <button className="btn sm" onClick={openSeries}>시리즈</button>
        </div>
      </div>
      <div className="tiny muted">할 일을 길게 눌러 원하는 날 칸으로 끌어다 놓으세요</div>
      <div className="wkb">
        {col('', '날짜 없음', loose, ' loose')}
        {days.map((d) => col(d, <span>{WD[parseYmd(d).getDay()]} <b>{parseYmd(d).getDate()}</b></span>, tasks.filter((t) => t.due === d).sort(ord), d === t0 ? ' now' : d < t0 ? ' past' : ''))}
      </div>
      <AddInput placeholder="+ 날짜 없는 할 일 추가" onAdd={(title) => addTask({ title, inbox: true })} />
    </div>
  )
}
