import { useMemo, useState } from 'react'
import { useColl, useSettings, put } from '../../store/store.js'
import { eventsOn } from '../../engine/scheduler.js'
import { monthStart, weekStart, addDays, addMonths, parseYmd, WD, today, fmtDate, fmtTime, fmtDur } from '../../engine/date.js'
import { holiday } from '../../engine/holidays.js'
import { Icon, openDetail, Check, Card, Empty } from '../../components/ui.jsx'
import { toggleTask } from '../../store/actions.js'
import { go, setParams } from '../../nav.js'

const LAYERS = [['events', '일정'], ['tasks', '할 일'], ['study', '공부기록'], ['habits', '습관'], ['meds', '약']]
const loadLayers = () => { try { return JSON.parse(localStorage.getItem('layers')) || { events: 1, tasks: 1, study: 1 } } catch { return { events: 1, tasks: 1, study: 1 } } }

export default function Month({ date, setDate }) {
  const st = useSettings()
  const [layers, setLayers] = useState(loadLayers)
  const toggle = (k) => { const n = { ...layers, [k]: !layers[k] }; setLayers(n); try { localStorage.setItem('layers', JSON.stringify(n)) } catch {} }
  const events = useColl('events'), tasks = useColl('tasks'), sessions = useColl('sessions'), habits = useColl('habits')
  const meds = useColl('meds'), medLogs = useColl('medLogs'), subjects = useColl('subjects')
  const ms = monthStart(date)
  const start = weekStart(ms, st.weekStart)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const month = parseYmd(ms).getMonth()
  const studyBy = useMemo(() => { const m = {}; for (const s of sessions) m[s.date] = (m[s.date] || 0) + s.dur; return m }, [sessions])
  const activeMeds = meds.filter((m) => m.active)
  const medTotal = activeMeds.reduce((a, m) => a + (m.times?.length || 0), 0)
  const wdOrder = Array.from({ length: 7 }, (_, i) => (i + st.weekStart) % 7)
  const sel = date

  const selEvents = eventsOn(sel, events)
  const selTasks = tasks.filter((t) => t.due === sel && !t.archived)
  const selStudy = sessions.filter((s) => s.date === sel)

  return (
    <div className="col">
      <div className="row between">
        <div className="row">
          <button className="icon-btn" onClick={() => setDate(addMonths(ms, -1))} aria-label="이전 달"><Icon name="back" /></button>
          <b style={{ fontSize: '1.15em' }}>{parseYmd(ms).getFullYear()}년 {month + 1}월</b>
          <button className="icon-btn" onClick={() => setDate(addMonths(ms, 1))} aria-label="다음 달"><Icon name="next" /></button>
        </div>
        {ms !== monthStart(today()) && <button className="btn sm" onClick={() => setDate(today())}>오늘</button>}
      </div>
      <div className="scroll-x no-print"><div className="row" style={{ gap: 6 }}>
        <Icon name="layers" size={16} />
        {LAYERS.map(([k, l]) => <button key={k} className={'chip' + (layers[k] ? ' on' : '')} onClick={() => toggle(k)}>{l}</button>)}
      </div></div>
      <div className="card month" style={{ padding: 6 }}>
        <div className="mgrid">
          {wdOrder.map((w) => <div key={w} className={'mhead' + (w === 0 ? ' sun' : w === 6 ? ' sat' : '')}>{WD[w]}</div>)}
          {cells.map((d) => {
            const inM = parseYmd(d).getMonth() === month
            const hol = holiday(d)
            const wd = parseYmd(d).getDay()
            const evs = layers.events ? eventsOn(d, events) : []
            const due = layers.tasks ? tasks.filter((t) => t.due === d && !t.archived) : []
            const mins = studyBy[d] || 0
            const heat = layers.study && mins ? Math.min(1, mins / (st.goalDaily || 240)) : 0
            const hDone = layers.habits ? habits.filter((h) => h.days?.[d]).length : 0
            const medDone = layers.meds && medTotal ? medLogs.filter((l) => l.date === d && l.taken).length : 0
            return (
              <button key={d} className={'mcell' + (inM ? '' : ' out') + (d === today() ? ' is-today' : '') + (d === sel ? ' sel' : '')}
                onClick={() => d === sel ? (setParams('planner', { date: d }), go('planner', 'today')) : setDate(d)}
                style={heat ? { background: `color-mix(in srgb, var(--c2) ${Math.round(heat * 32)}%, var(--surface))` } : null}>
                <div className="mnum"><span className={wd === 0 || hol ? 'sun' : wd === 6 ? 'sat' : ''}>{parseYmd(d).getDate()}</span>
                </div>
                {hol && <div className="mhol ellipsis">{hol}</div>}
                <div className="mitems">
                  {evs.slice(0, 3).map((e) => <div key={e.id} className="mev ellipsis" style={{ '--c': e.color || 'var(--accent)' }}>{e.title}</div>)}
                  {evs.length > 3 && <div className="tiny muted">+{evs.length - 3}</div>}
                  {due.length > 0 && <div className="mtask tiny">☐ {due.filter((t) => !t.done).length}/{due.length}</div>}
                </div>
                <div className="mfoot">
                  {layers.study && mins > 0 && <span className="tiny">{Math.round(mins / 6) / 10}h</span>}
                  {hDone > 0 && <span className="tiny" style={{ color: 'var(--c2)' }}>●{hDone}</span>}
                  {medDone > 0 && <span className="tiny" style={{ color: medDone >= medTotal ? 'var(--ok)' : 'var(--muted)' }}>💊{medDone >= medTotal ? '✓' : medDone}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Card title={fmtDate(sel)} action={
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm" onClick={() => { const e = put('events', { title: '새 일정', date: sel, start: 9 * 60, end: 10 * 60 }); openDetail('event', e.id) }}><Icon name="plus" size={14} />일정</button>
          <button className="btn sm" onClick={() => { setParams('planner', { date: sel }); go('planner', 'today') }}>하루 보기</button>
        </div>
      }>
        <div className="list">
          {selEvents.map((e) => (
            <button key={e.id} className="item" style={{ textAlign: 'left' }} onClick={() => openDetail('event', e.id, { occ: sel })}>
              <span className="dot" style={{ background: e.color || 'var(--accent)', marginTop: 6 }} />
              <div className="t"><div>{e.title}</div><div className="meta">{e.start != null ? `${fmtTime(e.start)}–${fmtTime(e.end)}` : '하루 종일'}{e.location ? ' · ' + e.location : ''}</div></div>
            </button>
          ))}
          {selTasks.map((t) => (
            <div key={t.id} className={'item' + (t.done ? ' done' : '')}>
              <Check on={t.done} onClick={() => toggleTask(t.id)} />
              <button className="t title" style={{ textAlign: 'left' }} onClick={() => openDetail('task', t.id)}>{t.title}</button>
            </div>
          ))}
          {selStudy.length > 0 && <div className="small muted" style={{ padding: '8px 0' }}>공부 {fmtDur(selStudy.reduce((a, s) => a + s.dur, 0))} · {[...new Set(selStudy.map((s) => subjects.find((x) => x.id === s.subjectId)?.name).filter(Boolean))].join(', ')}</div>}
          {!selEvents.length && !selTasks.length && !selStudy.length && <Empty>기록이 없어요</Empty>}
        </div>
      </Card>
    </div>
  )
}
