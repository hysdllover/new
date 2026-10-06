import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useColl, useSettings, put, find } from '../../store/store.js'
import { Sticker, TAPES } from '../../components/Stickers.jsx'
import { eventsOn } from '../../engine/scheduler.js'
import { monthStart, weekStart, addDays, addMonths, parseYmd, WD, today, fmtDate, fmtTime, fmtDur } from '../../engine/date.js'
import { holiday } from '../../engine/holidays.js'
import { Icon, openDetail, Check, openSheet } from '../../components/ui.jsx'
import { dayRec } from '../../store/actions.js'
import { toggleTask } from '../../store/actions.js'
import { go, setParams } from '../../nav.js'

const LAYERS = [['events', '일정'], ['academy', '학원'], ['tasks', '할 일'], ['study', '공부기록'], ['habits', '습관'], ['meds', '약']]
const loadLayers = () => { try { const v = JSON.parse(localStorage.getItem('layers')) || { events: 1, tasks: 1, study: 1 }; return { academy: 1, ...v } } catch { return { events: 1, academy: 1, tasks: 1, study: 1 } } }

export default function Month({ date, setDate }) {
  const st = useSettings()
  const [layers, setLayers] = useState(loadLayers)
  const toggle = (k) => { const n = { ...layers, [k]: !layers[k] }; setLayers(n); try { localStorage.setItem('layers', JSON.stringify(n)) } catch {} }
  const events = useColl('events'), tasks = useColl('tasks'), sessions = useColl('sessions'), habits = useColl('habits')
  useColl('days')
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
  const [peek, setPeek] = useState(false)
  const selRow = Math.floor(cells.indexOf(sel) / 7)


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
          {cells.map((d, ci) => {
            const inM = parseYmd(d).getMonth() === month
            const hol = holiday(d)
            const wd = parseYmd(d).getDay()
            const evs = eventsOn(d, events).filter((e) => (e.layer === 'academy' ? layers.academy : layers.events))
            const due = layers.tasks ? tasks.filter((t) => t.due === d && !t.archived) : []
            const mins = studyBy[d] || 0
            const heat = layers.study && mins ? Math.min(1, mins / (st.goalDaily || 240)) : 0
            const hDone = layers.habits ? habits.filter((h) => h.days?.[d]).length : 0
            const medDone = layers.meds && medTotal ? medLogs.filter((l) => l.date === d && l.taken).length : 0
            return (
              <Fragment key={d}>
              <button className={'mcell' + (inM ? '' : ' out') + (d === today() ? ' is-today' : '') + (d === sel ? ' sel' : '')}
                onClick={() => { if (d === sel) setPeek(!peek); else { setDate(d); setPeek(true) } }}
                style={heat ? { background: `color-mix(in srgb, var(--c2) ${Math.round(heat * 32)}%, var(--surface))` } : null}>
                <div className="mnum"><span className={wd === 0 || hol ? 'sun' : wd === 6 ? 'sat' : ''}>{parseYmd(d).getDate()}</span>
                </div>
                {hol && <div className="mhol ellipsis">{hol}</div>}
                {(() => { const k = (find('days', d)?.deco || []).find((x) => !TAPES[x.k]); return k ? <span className="mcell-stk"><Sticker k={k.k} color={k.c} size={16} /></span> : null })()}
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
              {peek && ci % 7 === 6 && Math.floor(ci / 7) === selRow && <DayPeek date={sel} subjects={subjects} close={() => setPeek(false)} />}
              </Fragment>
            )
          })}
        </div>
      </div>

      {!peek && <div className="tiny muted center">날짜를 누르면 그날을 미리 볼 수 있어요</div>}
    </div>
  )
}

// 날짜 미리보기: 고른 주 바로 아래에 펼쳐지는 작은 카드
function DayPeek({ date, subjects, close }) {
  const tasks = useColl('tasks').filter((t) => t.due === date && !t.archived).sort((a, b) => (a.dueTime == null) - (b.dueTime == null) || (a.dueTime ?? 0) - (b.dueTime ?? 0) || (a.order ?? 0) - (b.order ?? 0))
  const sess = useColl('sessions').filter((x) => x.date === date)
  const evs = eventsOn(date)
  const mins = sess.reduce((a, x) => a + (x.dur || 0), 0)
  const by = subjects.map((sb) => ({ sb, m: sess.filter((x) => x.subjectId === sb.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const memo = dayRec(date).comment, hol = holiday(date)
  const open = () => { setParams('planner', { date }); go('planner', 'today') }
  const ref = useRef(null)
  useEffect(() => { try { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) } catch {} }, [date])
  return (
    <div className="mpeek" ref={ref} onClick={(e) => e.stopPropagation()}>
      <div className="row between">
        <span className="mpeek-d">{fmtDate(date)}{hol && <span className="tiny muted"> · {hol}</span>}</span>
        <button className="icon-btn" onClick={close} aria-label="닫기"><Icon name="close" size={14} /></button>
      </div>
      {mins > 0 && <div className="col" style={{ gap: 5 }}>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="mpeek-big">{Math.floor(mins / 60)}:{String(mins % 60).padStart(2, '0')}</span><span className="tiny muted">{by.map((x) => x.sb.name).join(' · ')}</span></div>
        <div className="rp-stack">{by.map((x) => <i key={x.sb.id} style={{ flex: x.m, background: x.sb.color || 'var(--muted)' }} />)}</div>
      </div>}
      {evs.length > 0 && <div className="col" style={{ gap: 2 }}>{evs.slice(0, 4).map((e) => <button key={e.id + e.occ} className="mpeek-row" onClick={() => openDetail('event', e.id, { occ: date })}><span className="mpeek-bar" style={{ background: e.color || 'var(--accent)' }} /><span className="tiny muted mpeek-t">{e.start != null ? fmtTime(e.start) : '종일'}</span><span className="ellipsis">{e.title}</span></button>)}{evs.length > 4 && <span className="tiny muted">+{evs.length - 4}</span>}</div>}
      {tasks.length > 0 && <div className="col" style={{ gap: 2 }}>{tasks.slice(0, 5).map((t) => <div key={t.id} className={'mpeek-row' + (t.done ? ' done' : '')}><Check on={t.done} onClick={() => toggleTask(t.id)} color={subjects.find((x) => x.id === t.subjectId)?.color} /><button className="ellipsis grow" style={{ textAlign: 'left' }} onClick={() => openDetail('task', t.id)}>{t.title}</button></div>)}{tasks.length > 5 && <span className="tiny muted">+{tasks.length - 5}</span>}</div>}
      {memo && <div className="small muted mpeek-memo">{memo}</div>}
      {!mins && !evs.length && !tasks.length && !memo && <div className="tiny muted">비어 있는 날이에요</div>}
      <div className="row" style={{ gap: 6 }}>
        <button className="btn ghost sm" onClick={() => { const e = put('events', { title: '새 일정', date, start: 9 * 60, end: 10 * 60 }); openDetail('event', e.id) }}><Icon name="plus" size={13} />일정</button>
        <button className="btn ghost sm" onClick={() => import('../../components/DaySummary.jsx').then((m) => openSheet(() => <m.default initial={date} />, { title: '리포트' }))}>리포트</button>
        <span className="grow" />
        <button className="btn sm" onClick={open}>하루 보기</button>
      </div>
    </div>
  )
}
