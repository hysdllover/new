// 하루 리포트: 구성(켜기·순서)을 직접 정함 — 공유(텍스트)·A4 인쇄도 같은 구성
import { useState } from 'react'
import { useColl, useSettings, setSettings, find } from '../store/store.js'
import { eventsOn } from '../engine/scheduler.js'
import { today, addDays, fmtDate, fmtDur, fmtTime, tsToMin } from '../engine/date.js'
import { dayRec } from '../store/actions.js'
import { toast } from './ui.jsx'
import { focusLabel } from './StudyWrap.jsx'

export const SECTIONS = [
  ['study', '공부 시간'], ['subjects', '과목별·메모'], ['hours', '시간대'], ['done', '끝낸 일'], ['left', '남은 할 일'],
  ['events', '일정'], ['tomorrow', '내일'], ['condition', '컨디션'], ['comment', '한 줄 코멘트'],
]
const DEFAULT = ['study', 'subjects', 'done', 'events']
const secsOf = (st) => (st.reportSections?.length ? st.reportSections : DEFAULT).filter((k) => SECTIONS.some(([x]) => x === k))

export function daySummary(date, { tasks, sessions, subjects, goal }) {
  const sub = (id) => subjects.find((s) => s.id === id)
  const ss = sessions.filter((s) => s.date === date)
  const mins = ss.reduce((a, s) => a + (s.dur || 0), 0)
  const bySub = {}
  for (const s of ss) { const k = s.subjectId || '-'; (bySub[k] ||= { sub: sub(s.subjectId), m: 0, notes: [] }).m += s.dur || 0; if (s.note) bySub[k].notes.push(s.note + (s.focus ? ` (집중 ${focusLabel(s.focus)})` : '')) }
  // 시간대: 6시~24시 한 시간 칸마다 공부한 분
  const hours = Array(18).fill(0)
  for (const s of ss) if (s.start != null) { let a = tsToMin(s.start), b = a + (s.dur || 0); for (let h = 6; h < 24; h++) { const o = Math.max(0, Math.min(b, (h + 1) * 60) - Math.max(a, h * 60)); hours[h - 6] += o } }
  const live = tasks.filter((t) => !t.archived)
  const sameDay = (ts) => ts && new Date(ts).toDateString() === new Date(date + 'T00:00').toDateString()
  const done = live.filter((t) => t.done && sameDay(t.doneAt))
  const left = live.filter((t) => !t.done && t.due && t.due <= date)
  const tmr = addDays(date, 1)
  const cond = find('conditions', date), comment = dayRec(date).comment || ''
  return { date, mins, goal, subs: Object.values(bySub).sort((a, b) => b.m - a.m), hours, done, left, evs: eventsOn(date), tmr: { tasks: live.filter((t) => !t.done && t.due === tmr), evs: eventsOn(tmr) }, cond, comment }
}

const condTxt = (c) => c ? [c.sleep != null && `수면 ${c.sleep}시간`, c.steps != null && `걸음 ${Number(c.steps).toLocaleString()}`, c.mood != null && `기분 ${c.mood}/5`, c.energy != null && `에너지 ${c.energy}/5`].filter(Boolean).join(' · ') : ''
// 섹션별 줄 (텍스트·인쇄 공용)
function lines(k, d) {
  if (k === 'study') return [`공부 ${fmtDur(d.mins)} / 목표 ${fmtDur(d.goal)}`]
  if (k === 'subjects') return d.subs.map((x) => `${x.sub?.name || '과목 없음'} ${fmtDur(x.m)}${x.notes.length ? ' — ' + x.notes.join(' / ') : ''}`)
  if (k === 'hours') { const hs = d.hours.map((m, i) => [i + 6, m]).filter(([, m]) => m > 0); return hs.length ? [hs.map(([h, m]) => `${h}시 ${m}분`).join(' · ')] : [] }
  if (k === 'done') return d.done.map((t) => '✓ ' + t.title)
  if (k === 'left') return d.left.map((t) => '– ' + t.title)
  if (k === 'events') return d.evs.map((e) => (e.start != null ? fmtTime(e.start) + ' ' : '') + e.title)
  if (k === 'tomorrow') return [...d.tmr.evs.map((e) => (e.start != null ? fmtTime(e.start) + ' ' : '종일 ') + e.title), ...d.tmr.tasks.map((t) => '– ' + t.title)]
  if (k === 'condition') return condTxt(d.cond) ? [condTxt(d.cond)] : []
  if (k === 'comment') return d.comment ? [d.comment] : []
  return []
}
const title = (k, d) => ({ done: `끝낸 일 ${d.done.length}`, left: `남은 할 일 ${d.left.length}` })[k] || SECTIONS.find(([x]) => x === k)[1]

const asText = (d, secs) => [`${fmtDate(d.date)} 하루 리포트`, ...secs.flatMap((k) => { const l = lines(k, d); return l.length ? ['', `[${title(k, d)}]`, ...l] : [] })].join('\n')

function printA4(d, secs) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  const el = document.createElement('div'); el.id = 'print-area'
  el.innerHTML = `<h2 style="font-weight:400;margin:0 0 6mm">${esc(fmtDate(d.date))} · 하루 리포트</h2>` + secs.map((k) => {
    const l = lines(k, d)
    if (k === 'hours') { const mx = Math.max(60, ...d.hours); return `<h3 style="font-weight:500;margin:5mm 0 2mm">시간대</h3><div style="display:flex;gap:1.5mm;align-items:flex-end;height:22mm">${d.hours.map((m, i) => `<div style="flex:1;text-align:center;font-size:7pt;color:#888"><div style="background:#8a8f98;height:${Math.round((m / mx) * 18)}mm;margin-bottom:1mm"></div>${i + 6}</div>`).join('')}</div>` }
    return l.length ? `<h3 style="font-weight:500;margin:5mm 0 2mm">${esc(title(k, d))}</h3><ul style="margin:0;padding-left:5mm">${l.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''
  }).join('')
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 50)
}

export default function DaySummary({ initial = today() }) {
  const [date, setDate] = useState(initial), [edit, setEdit] = useState(false)
  const tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects'), st = useSettings()
  useColl('days'); useColl('conditions')
  const secs = secsOf(st)
  const d = daySummary(date, { tasks, sessions, subjects, goal: st.goalDaily || 240 })
  const setSecs = (v) => setSettings({ reportSections: v })
  const move = (i, dir) => { const a = [...secs], j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setSecs(a) }
  const share = async () => { const text = asText(d, secs); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('복사했어요') } } catch {} }
  const mx = Math.max(60, ...d.hours)
  const body = (k) => {
    if (k === 'study') return <div className="row" style={{ alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 28, fontWeight: 200 }}>{fmtDur(d.mins)}</span><span className="small muted">/ {fmtDur(d.goal)}</span></div>
    if (k === 'subjects') return d.subs.length ? d.subs.map((x, i) => <div key={i} className="small"><span className="dot" style={{ background: x.sub?.color || 'var(--muted)', marginRight: 6 }} />{x.sub?.name || '과목 없음'} <span className="muted">{fmtDur(x.m)}</span>{x.notes.length > 0 && <div className="tiny muted" style={{ marginLeft: 14 }}>{x.notes.join(' / ')}</div>}</div>) : null
    if (k === 'hours') return d.hours.some(Boolean) ? <div><div className="row" style={{ gap: 2, alignItems: 'flex-end', height: 40 }}>{d.hours.map((m, i) => <i key={i} title={`${i + 6}시 ${m}분`} style={{ flex: 1, height: Math.max(2, Math.round((m / mx) * 40)), borderRadius: 2, background: m ? 'var(--accent)' : 'var(--line)', opacity: m ? 0.4 + 0.6 * (m / mx) : 1 }} />)}</div><div className="row between tiny muted"><span>6</span><span>12</span><span>18</span><span>24</span></div></div> : null
    const l = lines(k, d)
    return l.length ? l.map((x, i) => <div key={i} className="small">{x}</div>) : null
  }
  return (
    <div className="col">
      <div className="row between">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="전날">‹</button>
        <b style={{ fontWeight: 500 }}>{fmtDate(date)}</b>
        <button className="icon-btn" disabled={date >= today()} onClick={() => setDate(addDays(date, 1))} aria-label="다음 날">›</button>
      </div>
      {edit && (
        <div className="col" style={{ gap: 6, padding: 8, border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
          <div className="tiny muted">보여 줄 항목을 켜고 순서를 정해요 (공유·인쇄도 같아요)</div>
          {secs.map((k, i) => <div key={k} className="row small" style={{ gap: 6 }}><span className="grow">{i + 1}. {SECTIONS.find(([x]) => x === k)[1]}</span><button className="icon-btn" aria-label="위로" onClick={() => move(i, -1)}>‹</button><button className="icon-btn" aria-label="아래로" onClick={() => move(i, 1)}>›</button><button className="chip on" onClick={() => setSecs(secs.filter((x) => x !== k))}>끄기</button></div>)}
          <div className="row wrap" style={{ gap: 6 }}>{SECTIONS.filter(([k]) => !secs.includes(k)).map(([k, l]) => <button key={k} className="chip" onClick={() => setSecs([...secs, k])}>+ {l}</button>)}</div>
        </div>
      )}
      {secs.map((k) => { const b = body(k); return b && <div key={k} className="col" style={{ gap: 2 }}>{k !== 'study' && <div className="small muted" style={{ marginTop: 4 }}>{title(k, d)}</div>}{b}</div> })}
      {secs.every((k) => !body(k)) && <div className="small muted">기록이 없어요.</div>}
      <div className="row" style={{ gap: 6, marginTop: 8 }}>
        <button className="btn" onClick={() => setEdit(!edit)}>{edit ? '구성 닫기' : '구성'}</button>
        <button className="btn grow" onClick={share}>공유</button>
        <button className="btn grow" onClick={() => printA4(d, secs)}>A4 인쇄</button>
      </div>
    </div>
  )
}
