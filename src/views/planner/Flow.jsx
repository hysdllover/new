// 하루 흐름: 수업 · 일정 · 블록 · 시간 있는 할 일을 세로 선 위 동그라미로 이어 보기 (사이 빈 시간도 한 줄)
import { useColl, useSettings } from '../../store/store.js'
import { toggleTask } from '../../store/actions.js'
import { eventsOn, classesOn } from '../../engine/scheduler.js'
import { fmtTime, fmtDur, today, nowMin } from '../../engine/date.js'
import { Icon, Check, openDetail } from '../../components/ui.jsx'

export default function Flow({ date }) {
  useSettings(); useColl('events')
  const tasks = useColl('tasks'), blocks = useColl('blocks'), subjects = useColl('subjects')
  const col = (id) => subjects.find((s) => s.id === id)?.color
  const items = [
    ...classesOn(date).map((c) => ({ k: 'c' + c.id, s: c.start, e: c.end, t: c.title, ic: 'book', c: c.color || 'var(--muted)', on: () => {} })),
    ...eventsOn(date).filter((e) => e.start != null).map((e) => ({ k: 'e' + e.id, s: e.start, e: e.end ?? e.start + 60, t: e.title, ic: 'calendar', c: e.color || 'var(--accent)', sub: e.location, on: () => openDetail('event', e.id, { occ: date }) })),
    ...blocks.filter((b) => b.date === date && !(b.carriedTo && b.carriedTo !== 'done')).map((b) => { const t = b.taskId && tasks.find((x) => x.id === b.taskId); return { k: 'b' + b.id, s: b.start, e: b.start + b.dur, t: t?.title || b.title || '블록', ic: b.kind === 'break' ? 'leaf' : 'clock', c: b.kind === 'break' ? 'var(--muted)' : col(b.subjectId || t?.subjectId) || 'var(--c2)', task: t, on: () => openDetail('block', b.id) } }),
    ...tasks.filter((t) => !t.archived && t.due === date && t.dueTime != null).map((t) => ({ k: 't' + t.id, s: t.dueTime, e: t.dueTime + (t.estimate || 0), t: t.title, ic: 'tasks', c: col(t.subjectId) || 'var(--accent)', task: t, on: () => openDetail('task', t.id) })),
  ].sort((a, b) => a.s - b.s || a.e - b.e)
  const loose = tasks.filter((t) => !t.archived && t.due === date && t.dueTime == null)
  const now = date === today() ? nowMin() : null
  const rows = []
  items.forEach((x, i) => {
    const prevEnd = i ? Math.max(...items.slice(0, i).map((y) => y.e)) : null
    if (prevEnd != null && x.s - prevEnd >= 30) rows.push(<div key={'g' + i} className="fl-gap"><span className="fl-rail dash" /><span className="tiny muted">{fmtDur(x.s - prevEnd)} 비어 있음</span></div>)
    const past = now != null && x.e <= now, cur = now != null && x.s <= now && x.e > now
    rows.push(
      <div key={x.k} className={'fl-row' + (past ? ' past' : '') + (cur ? ' cur' : '')}>
        <span className="fl-time tiny">{fmtTime(x.s)}</span>
        <span className="fl-rail"><span className="fl-node" style={{ '--c': x.c }}><Icon name={x.ic} size={13} /></span></span>
        <button className="fl-body" onClick={x.on}>
          <span className={'fl-t' + (x.task?.done ? ' done' : '')}>{x.t}</span>
          <span className="tiny muted">{x.e > x.s ? `${fmtTime(x.s)}–${fmtTime(x.e)} · ${fmtDur(x.e - x.s)}` : ''}{x.sub ? ' · ' + x.sub : ''}</span>
        </button>
        {x.task && <Check on={x.task.done} onClick={() => toggleTask(x.task.id)} color={col(x.task.subjectId)} />}
      </div>
    )
  })
  return (
    <div className="flow">
      {rows}
      {!items.length && <div className="tiny muted" style={{ padding: '8px 0' }}>시간이 정해진 일정이 없어요</div>}
      {loose.length > 0 && <div className="fl-loose">
        <div className="tiny muted" style={{ margin: '10px 0 4px' }}>시간 없는 할 일</div>
        {loose.map((t) => <div key={t.id} className="fl-row"><span className="fl-time" /><span className="fl-rail"><span className="fl-node sm" style={{ '--c': col(t.subjectId) || 'var(--accent)' }} /></span><button className="fl-body" onClick={() => openDetail('task', t.id)}><span className={'fl-t' + (t.done ? ' done' : '')}>{t.title}</span></button><Check on={t.done} onClick={() => toggleTask(t.id)} color={col(t.subjectId)} /></div>)}
      </div>}
    </div>
  )
}
