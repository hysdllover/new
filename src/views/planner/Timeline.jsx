import { useEffect, useRef, useState } from 'react'
import { useColl, useSettings, put } from '../../store/store.js'
import { scheduleTask } from '../../store/actions.js'
import { eventsOn } from '../../engine/scheduler.js'
import { fmtTime, today, nowMin, tsToMin } from '../../engine/date.js'
import { openDetail, openSheet, useNow, Field } from '../../components/ui.jsx'
import { SubjectSelect } from '../../components/common.jsx'
import { applyCascadeChange } from './timeline.js'
import { lockScroll } from '../../lib/drag.js'

const PX = 1 // 1분 = 1px
const snap = (m) => Math.round(m / 10) * 10

// 겹치는 항목을 가로 레인으로 나눔
function lanes(items) {
  const sorted = [...items].sort((a, b) => a.s - b.s || b.e - a.e)
  let cluster = [], end = -1
  const flush = () => { const n = Math.max(...cluster.map((x) => x.lane)) + 1; cluster.forEach((x) => { x.n = n }); cluster = [] }
  for (const it of sorted) {
    if (it.s >= end && cluster.length) flush()
    const used = cluster.filter((c) => c.e > it.s).map((c) => c.lane)
    let l = 0; while (used.includes(l)) l++
    it.lane = l; cluster.push(it); end = Math.max(end, it.e)
  }
  if (cluster.length) flush()
  return sorted
}

export default function Timeline({ date, showActual = true, dropTarget = true }) {
  const st = useSettings()
  const events = useColl('events')
  const blocks = useColl('blocks')
  const tasks = useColl('tasks')
  const subjects = useColl('subjects')
  const sessions = useColl('sessions')
  const now = useNow(60000)
  const ref = useRef(null)
  const [drag, setDrag] = useState(null)
  const startH = Math.floor(Math.min(st.dayStart, 24 * 60 - 60) / 60) * 60
  const endH = Math.ceil(Math.max(st.dayEnd, startH + 60) / 60) * 60
  const H = (endH - startH) * PX
  const y = (m) => (m - startH) * PX

  const evs = eventsOn(date, events)
  const items = lanes([
    ...evs.filter((e) => e.start != null).map((e) => ({ id: e.id, type: 'event', s: e.start, e: e.end ?? e.start + 60, title: e.title, color: e.color || 'var(--accent)', rec: e, bb: e.bufferBefore || 0, ba: e.bufferAfter || 0 })),
    ...blocks.filter((b) => b.date === date && !(b.carriedTo && b.carriedTo !== 'done')).map((b) => {
      const t = b.taskId && tasks.find((x) => x.id === b.taskId)
      const sub = subjects.find((s) => s.id === (b.subjectId || t?.subjectId))
      return { id: b.id, type: 'block', s: b.start, e: b.start + b.dur, title: t?.title || b.title || '블록', color: b.kind === 'break' ? 'var(--muted)' : sub?.color || 'var(--c2)', rec: b, done: t?.done }
    }),
  ].map((x) => (drag?.id === x.id ? { ...x, s: drag.start, e: drag.start + drag.dur } : x)))
  const actual = showActual ? sessions.filter((s) => s.date === date) : []
  const allDay = evs.filter((e) => e.start == null)

  useEffect(() => {
    // 오늘이면 현재 시각 근처로 스크롤
    const c = ref.current?.closest('.tl-scroll')
    if (!c) return
    c.scrollTop = Math.max(0, y(date === today() ? nowMin() : st.dayStart + 120) - 120)
  }, [date]) // eslint-disable-line

  const onItemDown = (e, it, resize) => {
    if (it.type === 'event' && it.rec.repeat) return
    if (e.button > 0) return
    e.stopPropagation()
    const y0 = e.clientY, base = { start: it.s, dur: it.e - it.s }
    let moving = !!resize || e.pointerType === 'mouse', moved = false, timer = null
    const target = e.currentTarget
    const begin = () => { moving = true; lockScroll(true); try { navigator.vibrate?.(10) } catch {} ; setDrag({ id: it.id, ...base }) }
    if (resize) begin()
    else if (e.pointerType !== 'mouse') timer = setTimeout(begin, 300)
    const mv = (ev) => {
      const dy = ev.clientY - y0
      if (!moving) { if (Math.abs(dy) > 8) cleanup(); return }
      if (Math.abs(dy) > 3) moved = true
      const dm = dy / PX
      setDrag(resize ? { id: it.id, start: base.start, dur: Math.max(10, snap(base.dur + dm)) } : { id: it.id, start: Math.max(0, snap(base.start + dm)), dur: base.dur })
    }
    const up = (ev) => {
      const dy = ev.clientY - y0
      cleanup()
      if (!moved) { setDrag(null); if (!resize) openDetail(it.type === 'event' ? 'event' : 'block', it.id, { occ: date }); return }
      const dm = dy / PX
      const next = resize ? { start: base.start, dur: Math.max(10, snap(base.dur + dm)) } : { start: Math.max(0, snap(base.start + dm)), dur: base.dur }
      setDrag(null)
      applyCascadeChange({ ...it.rec, id: it.id, date, ...next, isEvent: it.type === 'event' })
    }
    const cleanup = () => { clearTimeout(timer); lockScroll(false); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cleanup); target.style.touchAction = '' }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cleanup)
  }

  const onBgClick = (e) => {
    if (e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const m = snap(startH + (e.clientY - r.top) / PX - 15)
    openSheet((close) => <NewBlock date={date} start={m} close={close} />, { title: `${fmtTime(m)} 블록 추가` })
  }

  const n = nowMin()
  return (
    <div>
      {allDay.length > 0 && (
        <div className="row wrap allday" style={{ gap: 6, marginBottom: 8 }}>
          {allDay.map((e) => <button key={e.id} className="tag" style={{ background: (e.color || '#4a5a78') + '26', color: e.color || 'var(--accent)', padding: '2px 8px' }} onClick={() => openDetail('event', e.id, { occ: date })}>{e.kind === 'anniv' ? '🎂 ' : ''}{e.title}</button>)}
        </div>
      )}
      <div className="timeline" style={{ height: H }} ref={ref}>
        {Array.from({ length: (endH - startH) / 60 + 1 }, (_, i) => (
          <div key={i} className="tl-hour" style={{ top: i * 60 * PX }}><span>{String((startH / 60 + i) % 24).padStart(2, '0')}</span></div>
        ))}
        <div className="tl-body" data-drop={dropTarget ? 'timeline:' + date : undefined} data-start={startH} onClick={onBgClick}>
          {items.map((it) => {
            const w = 100 / it.n
            return (
              <div key={it.id} className="tl-wrap" style={{ top: y(it.s - (it.bb || 0)), height: (it.e - it.s + (it.bb || 0) + (it.ba || 0)) * PX, left: `calc(${it.lane * w}% + 2px)`, width: `calc(${w}% - ${showActual ? 12 : 4}px)` }}>
                {it.bb > 0 && <div className="tl-buffer" style={{ height: it.bb * PX }} title="이동·준비" />}
                <div className={'tl-item ' + it.type + (it.done ? ' done' : '') + (drag?.id === it.id ? ' lifting' : '')}
                  style={{ height: Math.max(18, (it.e - it.s) * PX - 2), '--c': it.color }}
                  onPointerDown={(e) => onItemDown(e, it)}>
                  <div className="ellipsis tl-title">{it.title}</div>
                  {(it.e - it.s) >= 35 && <div className="tiny tl-time">{fmtTime(it.s)}–{fmtTime(it.e)}{it.rec.location ? ' · ' + it.rec.location : ''}</div>}
                  {it.type === 'block' && <div className="tl-resize" onPointerDown={(e) => onItemDown(e, it, true)} />}
                </div>
                {it.ba > 0 && <div className="tl-buffer" style={{ height: it.ba * PX }} />}
              </div>
            )
          })}
          {actual.map((s) => {
            const a = tsToMin(s.start), b = a + s.dur
            return <div key={s.id} className="tl-actual" title={`실제 ${s.dur}분`} style={{ top: y(a), height: Math.max(3, (b - a) * PX), background: subjects.find((x) => x.id === s.subjectId)?.color || 'var(--accent)' }} />
          })}
          {date === today() && n >= startH && n <= endH && <div className="tl-now" style={{ top: y(n) }} data-t={now} />}
        </div>
      </div>
    </div>
  )
}

function NewBlock({ date, start, close }) {
  const tasks = useColl('tasks').filter((t) => !t.done && !t.archived)
  const [title, setTitle] = useState('')
  const [dur, setDur] = useState(50)
  const [kind, setKind] = useState('study')
  const [subjectId, setSubjectId] = useState(null)
  return (
    <div className="form">
      <Field label="할 일에서 선택">
        <select className="input" value="" onChange={(e) => { if (e.target.value) { scheduleTask(e.target.value, date, start); close() } }}>
          <option value="">— 할 일 선택 —</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <div className="divider" />
      <input className="input" placeholder="또는 새 블록 이름" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="row">
        <Field label="길이(분)"><input className="input" type="number" step="10" value={dur} onChange={(e) => setDur(+e.target.value)} /></Field>
        <Field label="종류"><select className="input" value={kind} onChange={(e) => setKind(e.target.value)}><option value="study">공부</option><option value="break">휴식</option><option value="custom">기타</option></select></Field>
      </div>
      <SubjectSelect value={subjectId} onChange={setSubjectId} />
      <div className="row">
        <button className="btn grow" onClick={() => { if (!title) return; put('events', { title, date, start, end: start + dur }); close() }}>일정으로 추가</button>
        <button className="btn primary grow" onClick={() => { if (!title) return; put('blocks', { title, date, start, dur, kind, subjectId }); close() }}>블록 추가</button>
      </div>
    </div>
  )
}
