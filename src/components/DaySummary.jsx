// 리포트(하루·주간·월간): 구성(켜기·순서)을 직접 정함 — 공유(텍스트)·이미지·A4 인쇄도 같은 구성
import { useState } from 'react'
import { useColl, useSettings, setSettings, find, list } from '../store/store.js'
import { pickQuote } from '../lib/quote.js'
import { drawReport, REPORT_THEMES } from '../lib/reportImage.js'
import { MonthHeat } from './charts.jsx'
import { shareBlob } from '../lib/shareCard.js'
import { eventsOn } from '../engine/scheduler.js'
import { today, addDays, addMonths, fmtDate, fmtShort, fmtDur, fmtTime, tsToMin, weekStart, diffDays, monthStart, daysInMonth, range, WD } from '../engine/date.js'
import { dayRec } from '../store/actions.js'
import { toast } from './ui.jsx'
import { focusLabel } from './StudyWrap.jsx'

export const SECTIONS = [
  ['study', '공부 시간'], ['subjects', '과목별·메모'], ['sessions', '공부 기록'], ['hours', '시간대'], ['focus', '집중'], ['week', '이번 주'],
  ['top3', '핵심 3가지'], ['done', '끝낸 일'], ['left', '남은 할 일'], ['events', '일정'], ['tomorrow', '내일'],
  ['habits', '습관'], ['reviews', '복습'], ['progress', '진도'], ['dday', 'D-day'], ['condition', '컨디션'], ['quote', '다짐'], ['comment', '한 줄 코멘트'],
]
// 주간·월간 리포트 항목
export const PSECTIONS = [
  ['study', '공부 시간'], ['days', '날짜별'], ['cal', '공부 달력'], ['subjects', '과목별'], ['hours', '시간대'], ['focus', '집중'], ['best', '가장 많이 한 날'],
  ['done', '끝낸 일'], ['left', '남은 할 일'], ['habits', '습관'], ['progress', '진도'], ['dday', 'D-day'], ['comments', '한 줄 코멘트'],
]
const MODES = [['day', '하루'], ['week', '주간'], ['month', '월간']]
const KEY = { day: 'reportSections', week: 'reportSectionsW', month: 'reportSectionsM' }
const DEF = { day: ['study', 'subjects', 'done', 'events'], week: ['study', 'days', 'subjects', 'done'], month: ['study', 'cal', 'subjects', 'done'] }
const allOf = (mode) => (mode === 'day' ? SECTIONS : PSECTIONS.filter(([k]) => k !== 'cal' || mode === 'month'))
const secsOf = (st, mode = 'day') => (st[KEY[mode]]?.length ? st[KEY[mode]] : DEF[mode]).filter((k) => allOf(mode).some(([x]) => x === k))

const hmS = (m) => `${Math.floor((m || 0) / 60)}:${String((m || 0) % 60).padStart(2, '0')}`

export function daySummary(date, { tasks, sessions, subjects, goal, ...opts }) {
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
  const cond = find('conditions', date), rec = dayRec(date), comment = rec.comment || ''
  // 공부 기록 목록 · 집중 · 이번 주
  const sess = ss.slice().sort((a, b) => (a.start || 0) - (b.start || 0)).map((s) => ({ t: s.start != null ? fmtTime(tsToMin(s.start)) : '', sub: sub(s.subjectId)?.name || '공부', dur: s.dur || 0, note: s.note || '', focus: s.focus ? focusLabel(s.focus) : '' }))
  const fc = { 상: 0, 중: 0, 하: 0 }; for (const s of ss) if (s.focus) fc[focusLabel(s.focus)]++
  const ws = weekStart(date, opts.weekStart ?? 1), wk = sessions.filter((s) => s.date >= ws && s.date <= date).reduce((a, s) => a + (s.dur || 0), 0), wdays = diffDays(date, ws) + 1
  const top3 = (rec.top3 || []).map((id) => tasks.find((t) => t.id === id)).filter(Boolean)
  const habits = list('habits').map((h) => ({ title: h.title, on: !!h.days?.[date] }))
  const revs = list('reviews').flatMap((r) => (r.history || []).filter((x) => x.date === date).map((x) => ({ title: r.title, ok: x.ok })))
  const prog = [...list('lectures').map((x) => ({ t: x.title, n: Object.values(x.done || {}).filter((v) => v === date).length, all: Object.keys(x.done || {}).length, of: x.total, u: '강' })), ...list('textbooks').map((x) => ({ t: x.title, n: 0, all: x.current || 0, of: x.total, u: x.unit || 'p' }))].filter((x) => x.of)
  const ddays = list('ddays').filter((x) => x.date >= date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2).map((x) => ({ t: x.title, n: diffDays(x.date, date) }))
  const quote = pickQuote(list('quotes').sort((a, b) => a.id.localeCompare(b.id)))?.text || ''
  return { date, mins, goal, subs: Object.values(bySub).sort((a, b) => b.m - a.m), hours, done, left, evs: eventsOn(date), tmr: { tasks: live.filter((t) => !t.done && t.due === tmr), evs: eventsOn(tmr) }, cond, comment, sess, fc, wk, wavg: Math.round(wk / wdays), top3, habits, revs, prog, ddays, quote }
}

// 주간·월간 요약 (from~to)
export function periodSummary(kind, from, to, { tasks, sessions, subjects, goal, weekStart: wsd = 1 }) {
  const sub = (id) => subjects.find((s) => s.id === id)
  const ds = range(from, to), inR = (x) => x >= from && x <= to
  const ss = sessions.filter((s) => inR(s.date))
  const mins = ss.reduce((a, s) => a + (s.dur || 0), 0)
  const bySub = {}
  for (const s of ss) (bySub[s.subjectId || '-'] ||= { sub: sub(s.subjectId), m: 0, notes: [] }).m += s.dur || 0
  const hours = Array(18).fill(0)
  for (const s of ss) if (s.start != null) { const a = tsToMin(s.start), b = a + (s.dur || 0); for (let h = 6; h < 24; h++) hours[h - 6] += Math.max(0, Math.min(b, (h + 1) * 60) - Math.max(a, h * 60)) }
  const byDay = {}; for (const s of sessions) byDay[s.date] = (byDay[s.date] || 0) + (s.dur || 0)
  const days = ds.map((d, i) => ({ d, m: inR(d) ? byDay[d] || 0 : 0, l: kind === 'week' ? WD[new Date(d + 'T00:00').getDay()] : [0, 9, 19, ds.length - 1].includes(i) ? String(i + 1) : '' }))
  const studied = days.filter((x) => x.m).length, best = days.reduce((a, x) => (x.m > (a?.m || 0) ? x : a), null)
  const live = tasks.filter((t) => !t.archived)
  const done = live.filter((t) => t.done && t.doneAt && inR(ymdOf(t.doneAt)))
  const left = live.filter((t) => !t.done && t.due && inR(t.due))
  const fc = { 상: 0, 중: 0, 하: 0 }; for (const s of ss) if (s.focus) fc[focusLabel(s.focus)]++
  const nd = ds.filter((d) => d <= today()).length || 1
  const habits = list('habits').map((h) => ({ title: h.title, n: ds.filter((d) => h.days?.[d]).length, of: nd }))
  const prog = [...list('lectures').map((x) => ({ t: x.title, n: Object.values(x.done || {}).filter((v) => inR(v)).length, all: Object.keys(x.done || {}).length, of: x.total, u: '강' })), ...list('textbooks').map((x) => ({ t: x.title, n: 0, all: x.current || 0, of: x.total, u: x.unit || 'p' }))].filter((x) => x.of)
  const ddays = list('ddays').filter((x) => x.date >= to).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2).map((x) => ({ t: x.title, n: diffDays(x.date, today()) }))
  const comments = ds.map((d) => [d, dayRec(d).comment]).filter(([, c]) => c)
  const hmx = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  return {
    kind, date: from, from, to, mins, goal: goal * nd, subs: Object.values(bySub).sort((a, b) => b.m - a.m), hours, days, done, left, fc, habits, prog, ddays, comments, best: best?.m ? best : null,
    sess: ss, cal: kind === 'month' ? { month: from, values: byDay, goal, weekStartDow: wsd } : null,
    stats: [['하루 평균', hmx(studied ? Math.round(mins / studied) : 0)], ['공부한 날', `${studied}일`], ['끝낸 일', String(done.length)]],
  }
}
const ymdOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

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
  if (k === 'sessions') return d.sess.map((x) => `${x.t ? x.t + ' ' : ''}${x.sub} ${fmtDur(x.dur)}${x.note ? ' — ' + x.note : ''}${x.focus ? ' · 집중 ' + x.focus : ''}`)
  if (k === 'focus') { const n = d.fc.상 + d.fc.중 + d.fc.하; return n ? [`상 ${d.fc.상} · 중 ${d.fc.중} · 하 ${d.fc.하}`] : [] }
  if (k === 'week') return [`이번 주 ${fmtDur(d.wk)} · 하루 평균 ${fmtDur(d.wavg)}`]
  if (k === 'top3') return d.top3.map((t) => (t.done ? '✓ ' : '– ') + t.title)
  if (k === 'days') return d.days?.some((x) => x.m) ? [d.days.filter((x) => x.m).map((x) => `${fmtShort(x.d)} ${fmtDur(x.m)}`).join(' · ')] : []
  if (k === 'cal') return []
  if (k === 'best') return d.best ? [`${fmtDate(d.best.d)} ${fmtDur(d.best.m)}`] : []
  if (k === 'comments') return (d.comments || []).map(([dt, c]) => `${fmtShort(dt)} ${c}`)
  if (k === 'habits' && d.kind) return d.habits.map((h) => `${h.title} ${h.n}/${h.of}`)
  if (k === 'progress' && d.kind) return d.prog.slice(0, 5).map((x) => `${x.t} ${x.all}/${x.of}${x.u}${x.n ? ` (+${x.n}${x.u})` : ''}`)
  if (k === 'habits') return d.habits.length ? [`${d.habits.filter((h) => h.on).length}/${d.habits.length} · ` + d.habits.map((h) => (h.on ? '✓' : '–') + h.title).join(' ')] : []
  if (k === 'reviews') return d.revs.map((r) => (r.ok ? '✓ ' : '↺ ') + r.title)
  if (k === 'progress') return d.prog.slice(0, 5).map((x) => `${x.t} ${x.all}/${x.of}${x.u}${x.n ? ` (오늘 +${x.n}${x.u})` : ''}`)
  if (k === 'dday') return d.ddays.map((x) => `${x.t} ${x.n === 0 ? 'D-DAY' : 'D-' + x.n}`)
  if (k === 'quote') return d.quote ? [d.quote] : []
  return []
}
const title = (k, d) => ({ done: `끝낸 일 ${d.done.length}`, left: `남은 할 일 ${d.left.length}`, sessions: `공부 기록 ${d.sess.length}` })[k] || (d.kind ? [...PSECTIONS, ...SECTIONS] : SECTIONS).find(([x]) => x === k)[1]
const NAME = { day: '하루 리포트', week: '주간 리포트', month: '월간 리포트' }
const label = (d) => (d.kind === 'month' ? `${d.from.slice(0, 4)}년 ${+d.from.slice(5, 7)}월` : d.kind === 'week' ? `${fmtShort(d.from)} – ${fmtShort(d.to)}` : fmtDate(d.date))

const asText = (d, secs) => [`${label(d)} ${NAME[d.kind || 'day']}`, ...secs.flatMap((k) => { const l = lines(k, d); return l.length ? ['', `[${title(k, d)}]`, ...l] : [] })].join('\n')

function printA4(d, secs) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  const el = document.createElement('div'); el.id = 'print-area'; el.style.fontFamily = 'var(--font)'
  const vbars = (vals, labs) => { const mx = Math.max(60, ...vals); return `<div style="display:flex;gap:1.2mm;align-items:flex-end;height:22mm">${vals.map((m, i) => `<div style="flex:1;text-align:center;font-size:7pt;color:#888"><div style="background:#8a8f98;height:${Math.round((m / mx) * 18)}mm;margin-bottom:1mm"></div>${labs[i]}</div>`).join('')}</div>` }
  el.innerHTML = `<h2 style="font-weight:400;margin:0 0 6mm">${esc(label(d))} · ${NAME[d.kind || 'day']}</h2>` + secs.map((k) => {
    const l = lines(k, d)
    if (k === 'days') return d.days?.some((x) => x.m) ? `<h3 style="font-weight:500;margin:5mm 0 2mm">날짜별</h3>` + vbars(d.days.map((x) => x.m), d.days.map((x) => (d.kind === 'week' ? x.l : +x.d.slice(8)))) : ''
    if (k === 'cal') { if (!d.cal) return ''; const c = d.cal, lead = (new Date(c.month + 'T00:00').getDay() - c.weekStartDow + 7) % 7, cells = [...Array(lead).fill(''), ...d.days.map((x, i) => `<b style="font-weight:400">${i + 1}</b><br>${x.m ? `${Math.floor(x.m / 60)}:${String(x.m % 60).padStart(2, '0')}` : ''}`)]; while (cells.length % 7) cells.push(''); const rows = []; for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7)); return `<h3 style="font-weight:500;margin:5mm 0 2mm">공부 달력</h3><table style="width:100%;border-collapse:collapse;font-size:8pt;table-layout:fixed"><tr>${Array.from({ length: 7 }, (_, i) => `<th style="font-weight:400;color:#888">${WD[(i + c.weekStartDow) % 7]}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((x) => `<td style="border:0.2mm solid #ddd;height:13mm;vertical-align:top;padding:1mm">${x}</td>`).join('')}</tr>`).join('')}</table>` }
    if (k === 'hours') { const mx = Math.max(60, ...d.hours); return `<h3 style="font-weight:500;margin:5mm 0 2mm">시간대</h3><div style="display:flex;gap:1.5mm;align-items:flex-end;height:22mm">${d.hours.map((m, i) => `<div style="flex:1;text-align:center;font-size:7pt;color:#888"><div style="background:#8a8f98;height:${Math.round((m / mx) * 18)}mm;margin-bottom:1mm"></div>${i + 6}</div>`).join('')}</div>` }
    return l.length ? `<h3 style="font-weight:500;margin:5mm 0 2mm">${esc(title(k, d))}</h3><ul style="margin:0;padding-left:5mm">${l.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''
  }).join('')
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 50)
}

export default function DaySummary({ initial = today(), initialMode = 'day' }) {
  const [date, setDate] = useState(initial), [edit, setEdit] = useState(false), [mode, setMode] = useState(initialMode)
  const tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects'), st = useSettings()
  useColl('days'); useColl('conditions')
  const secs = secsOf(st, mode)
  useColl('habits'); useColl('reviews'); useColl('lectures'); useColl('textbooks'); useColl('ddays'); useColl('quotes')
  const opt = { tasks, sessions, subjects, goal: st.goalDaily || 240, weekStart: st.weekStart ?? 1 }
  const from = mode === 'week' ? weekStart(date, opt.weekStart) : monthStart(date)
  const d = mode === 'day' ? daySummary(date, opt) : periodSummary(mode, from, mode === 'week' ? addDays(from, 6) : addDays(from, daysInMonth(+from.slice(0, 4), +from.slice(5, 7) - 1) - 1), opt)
  const step = (n) => setDate(mode === 'day' ? addDays(date, n) : mode === 'week' ? addDays(date, 7 * n) : addMonths(monthStart(date), n))
  const nextOff = mode === 'day' ? date >= today() : d.to >= today()
  const theme = st.reportTheme || 'app'
  const setSecs = (v) => setSettings({ [KEY[mode]]: v })
  const move = (i, dir) => { const a = [...secs], j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setSecs(a) }
  const share = async () => { const text = asText(d, secs); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('복사했어요') } } catch {} }
  const mx = Math.max(60, ...d.hours)
  const body = (k) => {
    if (k === 'study') { const p = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100); return <div className="col" style={{ gap: 6 }}>
      <div className="row" style={{ alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 30, fontWeight: 200, letterSpacing: '-.01em' }}>{hmS(d.mins)}</span><span className="tiny muted">/ {hmS(d.goal)}</span><span className="grow" /><span className="tiny" style={{ color: 'var(--accent)' }}>{p}%</span></div>
      <div style={{ height: 2, background: 'var(--line)', borderRadius: 1 }}><i style={{ display: 'block', height: 2, width: p + '%', background: 'var(--accent)', borderRadius: 1 }} /></div>
      <div className="row" style={{ gap: 0, marginTop: 4 }}>{(d.stats || [['이번 주', hmS(d.wk)], ['공부 기록', d.sess.length], ['끝낸 일', d.done.length]]).map(([l, v]) => <div key={l} className="col grow" style={{ gap: 0 }}><span className="rp-cap">{l}</span><span style={{ fontSize: 17, fontWeight: 200 }}>{v}</span></div>)}</div>
    </div> }
    if (k === 'subjects') return d.subs.length ? d.subs.map((x, i) => <div key={i} style={{ marginBottom: 4 }}><div className="row between small" style={{ fontWeight: 300 }}><span>{x.sub?.name || '과목 없음'}</span><span className="muted">{hmS(x.m)}</span></div><div style={{ height: 1.5, background: 'var(--line)', marginTop: 3 }}><i style={{ display: 'block', height: 1.5, width: (x.m / (d.subs[0].m || 1)) * 100 + '%', background: x.sub?.color || 'var(--accent)' }} /></div>{x.notes.length > 0 && <div className="tiny muted" style={{ marginTop: 2 }}>{x.notes.join(' / ')}</div>}</div>) : null
    if (k === 'days') { if (!d.days.some((x) => x.m)) return null; const dm = Math.max(60, ...d.days.map((x) => x.m)); return <div><div className="row" style={{ gap: d.days.length > 20 ? 1 : 3, alignItems: 'flex-end', height: 48 }}>{d.days.map((x) => <i key={x.d} title={`${fmtShort(x.d)} ${fmtDur(x.m)}`} style={{ flex: 1, height: Math.max(2, Math.round((x.m / dm) * 48)), borderRadius: 2, background: x.m ? 'var(--accent)' : 'var(--line)', opacity: x.m ? 0.4 + 0.6 * (x.m / dm) : 1 }} />)}</div><div className="row tiny muted" style={{ gap: d.days.length > 20 ? 1 : 3 }}>{d.days.map((x) => <span key={x.d} style={{ flex: 1, textAlign: 'center', overflow: 'visible', whiteSpace: 'nowrap' }}>{x.l}</span>)}</div></div> }
    if (k === 'cal') return d.cal ? <MonthHeat values={d.cal.values} goal={d.cal.goal} weekStartDow={d.cal.weekStartDow} fixed={d.cal.month} color="var(--accent)" /> : null
    if (k === 'hours') return d.hours.some(Boolean) ? <div><div className="row" style={{ gap: 2, alignItems: 'flex-end', height: 40 }}>{d.hours.map((m, i) => <i key={i} title={`${i + 6}시 ${m}분`} style={{ flex: 1, height: Math.max(2, Math.round((m / mx) * 40)), borderRadius: 2, background: m ? 'var(--accent)' : 'var(--line)', opacity: m ? 0.4 + 0.6 * (m / mx) : 1 }} />)}</div><div className="row between tiny muted"><span>6</span><span>12</span><span>18</span><span>24</span></div></div> : null
    const l = lines(k, d)
    return l.length ? <div className={l.length >= 6 ? 'rp-two' : 'col'} style={{ gap: 2 }}>{l.map((x, i) => { const m = /^(✓|–|↺) /.exec(x); return <div key={i} className="small ellipsis" style={{ fontWeight: 300 }}>{m && <span style={{ color: m[1] === '✓' ? 'var(--accent)' : 'var(--muted)', marginRight: 6 }}>{m[1]}</span>}{m ? x.slice(2) : x}</div> })}</div> : null
  }
  return (
    <div className="col">
      <div className="row" style={{ gap: 6 }}>{MODES.map(([k, l]) => <button key={k} className={'chip' + (mode === k ? ' on' : '')} onClick={() => setMode(k)}>{l}</button>)}</div>
      <div className="row between">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="이전">‹</button>
        <b style={{ fontWeight: 500 }}>{label(d)}</b>
        <button className="icon-btn" disabled={nextOff} onClick={() => step(1)} aria-label="다음">›</button>
      </div>
      {edit && (
        <div className="col" style={{ gap: 6, padding: 8, border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
          <div className="tiny muted">보여 줄 항목을 켜고 순서를 정해요 (공유·인쇄도 같아요)</div>
          {secs.map((k, i) => <div key={k} className="row small" style={{ gap: 6 }}><span className="grow">{i + 1}. {allOf(mode).find(([x]) => x === k)[1]}</span><button className="icon-btn" aria-label="위로" onClick={() => move(i, -1)}>‹</button><button className="icon-btn" aria-label="아래로" onClick={() => move(i, 1)}>›</button><button className="chip on" onClick={() => setSecs(secs.filter((x) => x !== k))}>끄기</button></div>)}
          <div className="row wrap" style={{ gap: 6 }}>{allOf(mode).filter(([k]) => !secs.includes(k)).map(([k, l]) => <button key={k} className="chip" onClick={() => setSecs([...secs, k])}>+ {l}</button>)}</div>
          <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}><span className="tiny muted">이미지 색</span>{REPORT_THEMES.map(([k, l]) => <button key={k} className={'chip' + (theme === k ? ' on' : '')} onClick={() => setSettings({ reportTheme: k })}>{l}</button>)}</div>
        </div>
      )}
      {secs.map((k) => { const b = body(k); return b && <div key={k} className="col" style={{ gap: 4 }}>{k !== 'study' && <div className="rp-cap rp-h">{title(k, d)}</div>}{b}</div> })}
      {secs.every((k) => !body(k)) && <div className="small muted">기록이 없어요.</div>}
      <div className="row" style={{ gap: 6, marginTop: 8 }}>
        <button className="btn" onClick={() => setEdit(!edit)}>{edit ? '구성 닫기' : '구성'}</button>
        <button className="btn grow" onClick={share}>텍스트</button>
        <button className="btn grow" onClick={async () => { const blob = await drawReport(d, secs, lines, title, { theme, head: { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY' }[mode] + ' REPORT', dateTxt: mode === 'day' ? undefined : label(d) }); const r = await shareBlob(blob, `리포트-${mode === 'day' ? date : d.from}.png`); if (r === 'saved') toast('이미지를 저장했어요') }}>이미지</button>
        <button className="btn grow" onClick={() => printA4(d, secs)}>A4 인쇄</button>
      </div>
    </div>
  )
}
