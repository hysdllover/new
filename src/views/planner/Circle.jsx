import { useColl } from '../../store/store.js'
import { eventsOn } from '../../engine/scheduler.js'
import { fmtTime, fmtDur, today, nowMin, tsToMin } from '../../engine/date.js'
import { Card, openDetail, useNow } from '../../components/ui.jsx'

const C = 200
const pt = (min, r) => { const a = (min / 1440) * 2 * Math.PI - Math.PI / 2; return [C + r * Math.cos(a), C + r * Math.sin(a)] }
function arc(s, e, r1, r2) {
  e = Math.min(e, s + 1439.9)
  const large = e - s > 720 ? 1 : 0
  const [a, b] = pt(s, r2), [c, d] = pt(e, r2), [f, g] = pt(e, r1), [h, i] = pt(s, r1)
  return `M${a} ${b} A${r2} ${r2} 0 ${large} 1 ${c} ${d} L${f} ${g} A${r1} ${r1} 0 ${large} 0 ${h} ${i}Z`
}

// 원형 24시간 계획표: 바깥 = 일정, 가운데 = 타임블록, 안쪽 = 실제 공부 기록
export default function Circle({ date }) {
  const events = useColl('events'), blocks = useColl('blocks'), tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects')
  useNow(60000)
  const color = (id) => subjects.find((s) => s.id === id)?.color
  const evs = eventsOn(date, events).filter((e) => e.start != null)
  const bl = blocks.filter((b) => b.date === date && !(b.carriedTo && b.carriedTo !== 'done'))
  const ss = sessions.filter((s) => s.date === date)
  const planned = bl.reduce((a, b) => a + b.dur, 0)
  const actual = ss.reduce((a, s) => a + s.dur, 0)
  const items = [
    ...evs.map((e) => ({ id: e.id, t: 'event', s: e.start, e: e.end ?? e.start + 60, title: e.title, c: e.color || 'var(--accent)' })),
    ...bl.map((b) => { const t = tasks.find((x) => x.id === b.taskId); return { id: b.id, t: 'block', s: b.start, e: b.start + b.dur, title: t?.title || b.title, c: color(b.subjectId || t?.subjectId) || 'var(--c2)' } }),
  ].sort((a, b) => a.s - b.s)
  const n = nowMin()
  return (
    <div className="today-grid">
      <Card>
        <svg viewBox="0 0 400 400" className="circle-plan">
          <circle cx={C} cy={C} r={188} fill="none" stroke="var(--line)" />
          <circle cx={C} cy={C} r={112} fill="var(--surface-2)" />
          {Array.from({ length: 24 }, (_, h) => {
            const [x1, y1] = pt(h * 60, h % 6 ? 184 : 178), [x2, y2] = pt(h * 60, 188), [lx, ly] = pt(h * 60, 100)
            return <g key={h}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth={h % 6 ? .6 : 1.2} />{h % 3 === 0 && <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fill="var(--muted)">{h}</text>}</g>
          })}
          {evs.map((e) => <path key={e.id} d={arc(e.start - (e.bufferBefore || 0), (e.end ?? e.start + 60) + (e.bufferAfter || 0), 160, 184)} fill={`color-mix(in srgb, ${e.color || 'var(--accent)'} 20%, transparent)`} />)}
          {items.map((it) => (
            <path key={it.id} d={it.t === 'event' ? arc(it.s, it.e, 162, 182) : arc(it.s, it.e, 134, 156)} fill={it.c} opacity={it.t === 'event' ? .9 : .7} stroke="var(--surface)" strokeWidth="1"
              onClick={() => openDetail(it.t === 'event' ? 'event' : 'block', it.id, { occ: date })} style={{ cursor: 'pointer' }} />
          ))}
          {ss.filter((s) => s.start != null).map((s) => { const a = tsToMin(s.start); return <path key={s.id} d={arc(a, a + s.dur, 116, 128)} fill={color(s.subjectId) || 'var(--accent)'} /> })}
          {date === today() && (() => { const [x, y] = pt(n, 192), [x0, y0] = pt(n, 112); return <line x1={x0} y1={y0} x2={x} y2={y} stroke="var(--c4)" strokeWidth="1.5" strokeLinecap="round" /> })()}
          <text x={C} y={C - 16} textAnchor="middle" fontSize="11" fill="var(--muted)">계획</text>
          <text x={C} y={C + 2} textAnchor="middle" fontSize="15" fill="var(--text)">{fmtDur(planned)}</text>
          <text x={C} y={C + 24} textAnchor="middle" fontSize="11" fill="var(--muted)">실제 {fmtDur(actual)}</text>
        </svg>
        <div className="row small muted" style={{ justifyContent: 'center', gap: 14 }}>
          <span>바깥: 일정</span><span>가운데: 타임블록</span><span>안쪽: 실제 공부</span>
        </div>
      </Card>
      <Card title="하루 흐름">
        <div className="list">
          {items.map((it) => (
            <button key={it.id} className="item" style={{ textAlign: 'left', alignItems: 'center' }} onClick={() => openDetail(it.t === 'event' ? 'event' : 'block', it.id, { occ: date })}>
              <span className="dot" style={{ background: it.c }} />
              <span className="small muted nowrap" style={{ width: 88 }}>{fmtTime(it.s)}–{fmtTime(it.e)}</span>
              <span className="t ellipsis">{it.title}</span>
            </button>
          ))}
          {!items.length && <div className="empty">오늘 계획이 비어 있어요</div>}
        </div>
      </Card>
    </div>
  )
}
