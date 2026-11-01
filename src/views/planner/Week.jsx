import { useColl, useSettings, useRec } from '../../store/store.js'
import { eventsOn, classesOn } from '../../engine/scheduler.js'
import { weekStart, addDays, parseYmd, WD, fmtTime, today, fmtDur } from '../../engine/date.js'
import { holiday } from '../../engine/holidays.js'
import { openDetail, Check, AutoText } from '../../components/ui.jsx'
import { toggleTask, dayRec, setDay } from '../../store/actions.js'
import { go, setParams } from '../../nav.js'
import { spanOn } from '../tasks/filter.js'
import { layerAlpha } from './Month.jsx'

export default function Week({ date }) {
  const st = useSettings()
  const events = useColl('events')
  const blocks = useColl('blocks')
  const tasks = useColl('tasks')
  const sessions = useColl('sessions')
  const subjects = useColl('subjects')
  const ws = weekStart(date, st.weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const color = (id) => subjects.find((s) => s.id === id)?.color
  useRec('days', ws); const memo = dayRec(ws)
  return (
    <div className="week">
      {days.map((d) => {
        const evs = eventsOn(d, events)
        const cls = classesOn(d)
        const bl = blocks.filter((b) => b.date === d && !(b.carriedTo && b.carriedTo !== 'done')).sort((a, b) => a.start - b.start)
        const due = tasks.filter((t) => t.due === d && !t.archived)
        const spans = tasks.filter((t) => !t.done && spanOn(t, d))
        const mins = sessions.filter((s) => s.date === d).reduce((a, s) => a + s.dur, 0)
        const hol = holiday(d)
        const wd = parseYmd(d).getDay()
        return (
          <div key={d} className={'card wday' + (d === today() ? ' is-today' : '')}>
            <button className="wday-h" onClick={() => { setParams('planner', { date: d }); go('planner', 'today') }}>
              <span className={wd === 0 || hol ? 'sun' : wd === 6 ? 'sat' : ''}>{WD[wd]} <b>{parseYmd(d).getDate()}</b></span>
              {hol && <span className="tiny hol">{hol}</span>}
              {mins > 0 && <span className="tiny muted" style={{ marginLeft: 'auto' }}>{fmtDur(mins)}</span>}
            </button>
            <div className="wday-b">
              {spans.map((t) => <button key={'s' + t.id} className="wev span" style={{ '--c': color(t.subjectId) || 'var(--accent)' }} onClick={() => openDetail('task', t.id)}><span className="tiny">▸</span> <span className="ellipsis">{t.title}</span></button>)}
              {cls.length > 0 && (
                <button className="wev cls" onClick={() => go('planner', 'timetable')}>
                  <span className="tiny">{fmtTime(cls[0].start)}</span> <span className="ellipsis">수업 {cls.length} · ~{fmtTime(cls.at(-1).end)}</span>
                </button>
              )}
              {evs.map((e) => (
                <button key={e.id} className="wev" style={{ '--c': e.color || 'var(--accent)', opacity: layerAlpha(st, e) }} onClick={() => openDetail('event', e.id, { occ: d })}>
                  <span className="tiny">{e.start != null ? fmtTime(e.start) : '종일'}</span> <span className="ellipsis">{e.title}</span>
                </button>
              ))}
              {bl.map((b) => {
                const t = b.taskId && tasks.find((x) => x.id === b.taskId)
                return (
                  <button key={b.id} className="wev block" style={{ '--c': color(b.subjectId || t?.subjectId) || 'var(--c2)' }} onClick={() => openDetail('block', b.id)}>
                    <span className="tiny">{fmtTime(b.start)}</span> <span className={'ellipsis' + (t?.done ? ' muted' : '')}>{t?.title || b.title}</span>
                  </button>
                )
              })}
              {due.map((t) => (
                <div key={t.id} className="row wtask">
                  <Check on={t.done} onClick={() => toggleTask(t.id)} color={color(t.subjectId)} />
                  <button className={'ellipsis grow' + (t.done ? ' muted' : '')} style={{ textAlign: 'left' }} onClick={() => openDetail('task', t.id)}>{t.title}</button>
                </div>
              ))}
              {!spans.length && !cls.length && !evs.length && !bl.length && !due.length && <div className="tiny muted" style={{ padding: '4px 0' }}>—</div>}
            </div>
          </div>
        )
      })}
      {/* 이번 주 메모: 주간 지면 맨 아래 (A4 인쇄의 NOTES 칸에도 들어감) */}
      <div className="card wday week-memo">
        <div className="tiny muted" style={{ marginBottom: 4 }}>이번 주 메모 · 한 문장</div>
        <AutoText className="np-memo" value={memo.weekMemo || ''} placeholder="이번 주에 남길 말" onChange={(v) => setDay(ws, { weekMemo: v })} />
      </div>
    </div>
  )
}
