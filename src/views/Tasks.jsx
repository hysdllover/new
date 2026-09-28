import { useMemo } from 'react'
import { useColl, patch, put, remove } from '../store/store.js'
import { addTask, toggleTask } from '../store/actions.js'
import TaskQuickInput from '../components/TaskQuickInput.jsx'
import { AddInput, Empty, Icon, openSheet, openMenu, toast } from '../components/ui.jsx'
import TaskItem from '../components/TaskItem.jsx'
import { SMART, applyFilter, quadrant, doneToday, openCount } from './tasks/filter.js'
import { setParams } from '../nav.js'
import { longPress } from '../lib/drag.js'
import { today } from '../engine/date.js'
import Gantt from './tasks/Gantt.jsx'
import Archive from './tasks/Archive.jsx'
import DBView from './tasks/DBView.jsx'

export default function Tasks({ seg, params }) {
  if (seg === 'matrix') return <Matrix />
  if (seg === 'kanban') return <Kanban />
  if (seg === 'gantt') return <Gantt />
  if (seg === 'table') return <DBView />
  if (seg === 'archive') return <Archive />
  return <TaskList params={params} />
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
  const nFilter = [f.subjectId, f.projectId, f.sort && f.sort !== 'manual'].filter(Boolean).length

  const dragFor = (t) => manual ? longPress(() => ({
    label: t.title,
    onDrop: (zone, pt) => {
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
  })) : {}

  const saveView = () => {
    const name = prompt('저장할 뷰 이름', '')
    if (!name) return
    const v = put('views', { name, filter: { smart: f.smart, subjectId: f.subjectId, projectId: f.projectId, priority: f.priority, sort: f.sort } })
    setParams('tasks', { viewId: v.id })
    toast('뷰 저장됨 · 사이드바에 고정')
  }

  return (
    <div className="col">
      <TaskQuickInput key={f.smart + (f.subjectId || '')} defaultDate={f.smart === 'today' ? 'today' : f.smart === 'tomorrow' ? 'tomorrow' : ''} defaults={{ subjectId: f.subjectId || null, projectId: f.projectId || null }} />
      <div className="scroll-x"><div className="row" style={{ gap: 6, paddingBottom: 2 }}>
        {SMART.map(([k, l]) => <button key={k} className={'chip' + ((f.smart || 'all') === k && !view ? ' on' : '')} onClick={() => set({ smart: k })}>{l} <span className="muted tiny">{k === 'done' ? applyFilter(tasks, { smart: k }).length : openCount(applyFilter(tasks, { smart: k }))}</span></button>)}
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
      <div className="card" style={{ padding: '2px 12px' }}>
        <div className="list">
          {items.map((t) => (
            <div key={t.id} data-drop={'task:' + t.id}><TaskItem t={t} subjects={subjects} projects={projects} drag={dragFor(t)} /></div>
          ))}
          {!items.length && <Empty>할 일이 없어요</Empty>}
        </div>
      </div>
      {manual && items.length > 1 && <div className="tiny muted center">길게 눌러 순서를 바꿀 수 있어요</div>}
    </div>
  )
}

const QUAD = [
  [1, '지금 하기', '긴급·중요', 'var(--c4)'], [2, '계획하기', '중요', 'var(--accent)'],
  [3, '빨리 끝내기', '긴급', 'var(--c3)'], [4, '나중에', '여유', 'var(--c2)'],
]
function Matrix() {
  const tasks = useColl('tasks').filter((t) => !t.archived && (!t.done || doneToday(t))).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
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

