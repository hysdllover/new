// 하루 요약 카드: 오늘 끝낸 할 일 · 공부(과목·메모·집중) · 지난 일정 — 공유(텍스트)·A4 인쇄
import { useState } from 'react'
import { useColl, useSettings } from '../store/store.js'
import { eventsOn } from '../engine/scheduler.js'
import { today, addDays, fmtDate, fmtDur, fmtTime } from '../engine/date.js'
import { toast } from './ui.jsx'
import { focusLabel } from './StudyWrap.jsx'

export function daySummary(date, { tasks, sessions, subjects, goal }) {
  const sub = (id) => subjects.find((s) => s.id === id)
  const ss = sessions.filter((s) => s.date === date)
  const mins = ss.reduce((a, s) => a + (s.dur || 0), 0)
  const bySub = {}
  for (const s of ss) { const k = s.subjectId || '-'; (bySub[k] ||= { sub: sub(s.subjectId), m: 0, notes: [] }).m += s.dur || 0; if (s.note) bySub[k].notes.push(s.note + (s.focus ? ` (집중 ${focusLabel(s.focus)})` : '')) }
  const done = tasks.filter((t) => t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date(date + 'T00:00').toDateString())
  const evs = eventsOn(date)
  return { date, mins, goal, subs: Object.values(bySub).sort((a, b) => b.m - a.m), done, evs }
}

const asText = (d) => [
  `${fmtDate(d.date)} 하루 요약`,
  `공부 ${fmtDur(d.mins)} / 목표 ${fmtDur(d.goal)}`,
  ...d.subs.map((x) => `· ${x.sub?.name || '과목 없음'} ${fmtDur(x.m)}${x.notes.length ? ' — ' + x.notes.join(' / ') : ''}`),
  d.done.length ? `\n끝낸 일 ${d.done.length}개` : '', ...d.done.map((t) => `✓ ${t.title}`),
  d.evs.length ? `\n일정` : '', ...d.evs.map((e) => `· ${e.start != null ? fmtTime(e.start) + ' ' : ''}${e.title}`),
].filter((x) => x !== '').join('\n')

// A4 인쇄: 요약만 따로 찍기
function printA4(d) {
  const el = document.createElement('div'); el.id = 'print-area'
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  el.innerHTML = `<h2 style="font-weight:400;margin:0 0 4mm">${esc(fmtDate(d.date))} · 하루 요약</h2>
    <p style="margin:0 0 6mm">공부 <b>${esc(fmtDur(d.mins))}</b> / 목표 ${esc(fmtDur(d.goal))}</p>
    ${d.subs.length ? `<h3 style="font-weight:500">공부</h3><ul>${d.subs.map((x) => `<li>${esc(x.sub?.name || '과목 없음')} ${esc(fmtDur(x.m))}${x.notes.length ? ' — ' + esc(x.notes.join(' / ')) : ''}</li>`).join('')}</ul>` : ''}
    ${d.done.length ? `<h3 style="font-weight:500">끝낸 일 ${d.done.length}</h3><ul>${d.done.map((t) => `<li>${esc(t.title)}</li>`).join('')}</ul>` : ''}
    ${d.evs.length ? `<h3 style="font-weight:500">일정</h3><ul>${d.evs.map((e) => `<li>${e.start != null ? esc(fmtTime(e.start)) + ' ' : ''}${esc(e.title)}</li>`).join('')}</ul>` : ''}`
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 50)
}

export default function DaySummary({ initial = today() }) {
  const [date, setDate] = useState(initial)
  const tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects'), st = useSettings()
  const d = daySummary(date, { tasks, sessions, subjects, goal: st.goalDaily || 240 })
  const share = async () => { const text = asText(d); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('복사했어요') } } catch {} }
  return (
    <div className="col">
      <div className="row between">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="전날">‹</button>
        <b style={{ fontWeight: 500 }}>{fmtDate(date)}</b>
        <button className="icon-btn" disabled={date >= today()} onClick={() => setDate(addDays(date, 1))} aria-label="다음 날">›</button>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 28, fontWeight: 200 }}>{fmtDur(d.mins)}</span><span className="small muted">/ {fmtDur(d.goal)}</span></div>
      {d.subs.map((x, i) => <div key={i} className="small"><span className="dot" style={{ background: x.sub?.color || 'var(--muted)', marginRight: 6 }} />{x.sub?.name || '과목 없음'} <span className="muted">{fmtDur(x.m)}</span>{x.notes.length > 0 && <div className="tiny muted" style={{ marginLeft: 14 }}>{x.notes.join(' / ')}</div>}</div>)}
      <div className="small muted" style={{ marginTop: 6 }}>끝낸 일 {d.done.length}</div>
      {d.done.map((t) => <div key={t.id} className="small">✓ {t.title}</div>)}
      {d.evs.length > 0 && <><div className="small muted" style={{ marginTop: 6 }}>일정</div>{d.evs.map((e, i) => <div key={i} className="small">{e.start != null && <span className="muted">{fmtTime(e.start)} </span>}{e.title}</div>)}</>}
      {!d.mins && !d.done.length && !d.evs.length && <div className="small muted">기록이 없어요.</div>}
      <div className="row" style={{ gap: 6, marginTop: 8 }}>
        <button className="btn grow" onClick={share}>공유</button>
        <button className="btn grow" onClick={() => printA4(d)}>A4 인쇄</button>
      </div>
    </div>
  )
}
