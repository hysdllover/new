import { useEffect, useMemo, useRef } from 'react'
import { useColl } from '../../store/store.js'
import { updateTask, projectProgress, taskProgress } from '../../store/actions.js'
import { openDetail, Empty } from '../../components/ui.jsx'
import { today, addDays, diffDays, weekStart, parseYmd, dow } from '../../engine/date.js'
import { holiday } from '../../engine/holidays.js'

const DW = 30, RH = 36, LW = 150

export default function Gantt() {
  const tasks = useColl('tasks').filter((t) => !t.archived && (t.due || t.start))
  const projects = useColl('projects')
  const subjects = useColl('subjects')
  const scroller = useRef(null)
  const from = addDays(weekStart(today()), -7)
  const days = 56
  const groups = useMemo(() => {
    const g = projects.map((p) => ({ p, items: tasks.filter((t) => t.projectId === p.id) })).filter((x) => x.items.length)
    const rest = tasks.filter((t) => !t.projectId || !projects.some((p) => p.id === t.projectId))
    if (rest.length) g.push({ p: { id: null, name: '기타', color: 'var(--muted)' }, items: rest })
    for (const x of g) x.items.sort((a, b) => (a.start || a.due).localeCompare(b.start || b.due))
    return g
  }, [tasks, projects])

  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = 7 * DW - 10 }, [])
  const rows = []
  for (const g of groups) { rows.push({ type: 'group', g }); for (const t of g.items) rows.push({ type: 'task', t }) }
  const pos = {}
  rows.forEach((r, i) => { if (r.type === 'task') pos[r.t.id] = i })
  const xOf = (d) => diffDays(d, from) * DW

  const dragBar = (e, t) => {
    const x0 = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
    const el = e.currentTarget
    const mv = (ev) => { el.style.transform = `translateX(${ev.clientX - x0}px)` }
    const up = (ev) => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up)
      el.style.transform = ''
      const n = Math.round((ev.clientX - x0) / DW)
      if (Math.abs(ev.clientX - x0) < 4) return openDetail('task', t.id)
      if (n) updateTask(t.id, { start: t.start ? addDays(t.start, n) : null, due: t.due ? addDays(t.due, n) : null })
    }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up)
  }

  if (!tasks.length) return <Empty>마감일이나 시작일이 있는 할 일이 간트에 표시돼요</Empty>
  const W = days * DW
  return (
    <div className="card gantt" style={{ padding: 0 }}>
      <div className="gantt-scroll" ref={scroller}>
        <div style={{ width: LW + W, position: 'relative' }}>
          <div className="gantt-head" style={{ paddingLeft: LW }}>
            {Array.from({ length: days }, (_, i) => {
              const d = addDays(from, i)
              const dd = parseYmd(d)
              return (
                <div key={d} className={'gantt-day' + (d === today() ? ' today' : '') + (dow(d) === 0 || holiday(d) ? ' sun' : '')} style={{ width: DW }}>
                  {dd.getDate() === 1 || i === 0 ? <b>{dd.getMonth() + 1}/</b> : null}{dd.getDate()}
                </div>
              )
            })}
          </div>
          <div style={{ position: 'relative' }}>
            <div className="gantt-today" style={{ left: LW + xOf(today()) + DW / 2 }} />
            <svg className="gantt-links" width={LW + W} height={rows.length * RH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
              {rows.filter((r) => r.type === 'task').flatMap((r) => (r.t.dependsOn || []).filter((d) => pos[d] != null).map((d) => {
                const p = rows[pos[d]].t
                const x1 = LW + xOf(p.due || p.start) + DW, y1 = pos[d] * RH + RH / 2
                const x2 = LW + xOf(r.t.start || r.t.due), y2 = pos[r.t.id] * RH + RH / 2
                return <path key={d + r.t.id} d={`M${x1} ${y1} C${x1 + 14} ${y1}, ${x2 - 14} ${y2}, ${x2} ${y2}`} fill="none" stroke={x2 < x1 ? 'var(--danger)' : 'var(--muted)'} strokeWidth="1.2" markerEnd="url(#arr)" />
              }))}
              <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--muted)" /></marker></defs>
            </svg>
            {rows.map((r, i) => r.type === 'group' ? (
              <div key={'g' + (r.g.p.id || 'etc')} className="gantt-row group" style={{ height: RH }}>
                <div className="gantt-label" style={{ width: LW }}>
                  <span className="dot" style={{ background: r.g.p.color }} /><b className="ellipsis">{r.g.p.name}</b>
                  {r.g.p.id && <span className="tiny muted">{Math.round(projectProgress(r.g.p.id) * 100)}%</span>}
                </div>
              </div>
            ) : (
              <div key={r.t.id} className="gantt-row" style={{ height: RH }}>
                <button className="gantt-label ellipsis" style={{ width: LW }} onClick={() => openDetail('task', r.t.id)}>
                  <span className={r.t.done ? 'muted' : ''} style={r.t.done ? { textDecoration: 'line-through' } : null}>{r.t.title}</span>
                </button>
                {(() => {
                  const s = r.t.start || r.t.due, e = r.t.due || r.t.start
                  const left = LW + xOf(s), w = (diffDays(e, s) + 1) * DW - 4
                  const c = subjects.find((x) => x.id === r.t.subjectId)?.color || r.g?.p.color || 'var(--accent)'
                  return (
                    <div className="gantt-bar" onPointerDown={(ev) => dragBar(ev, r.t)} style={{ left: left + 2, width: Math.max(w, DW - 4), background: `color-mix(in srgb, ${c} 25%, var(--surface))`, borderColor: c, opacity: r.t.done ? .5 : 1 }}>
                      <span style={{ width: taskProgress(r.t) * 100 + '%', background: c }} />
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tiny muted" style={{ padding: '8px 12px' }}>막대를 좌우로 끌어 날짜 이동 · 선행 작업이 늦어지면 뒤 작업이 자동으로 밀려요</div>
    </div>
  )
}
