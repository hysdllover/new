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
import { toast, Seg, Icon } from './ui.jsx'
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
    kind, date: from, from, to, mins, goal: goal * nd, dayGoal: goal, subs: Object.values(bySub).sort((a, b) => b.m - a.m), hours, days, done, left, fc, habits, prog, ddays, comments, best: best?.m ? best : null,
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
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const el = document.createElement('div'); el.id = 'print-area'; el.className = 'rpa'
  const cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue('--accent').trim() || '#4a5a78'
  const vbars = (vals, labs, goal) => { const mx = Math.max(60, goal || 0, ...vals); return `<div class="rpa-plot">${goal ? `<span class="rpa-goal" style="bottom:${(goal / mx) * 100}%"></span>` : ''}${vals.map((m) => `<div class="rpa-col"><i style="height:${m ? Math.max(3, (m / mx) * 100) : 0}%;opacity:${goal ? (m >= goal ? 1 : 0.55) : 0.45 + 0.55 * (m / mx)}"></i></div>`).join('')}</div><div class="rpa-lab">${labs.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` }
  const sec = (k, html, wide) => `<section class="rpa-sec${wide ? ' wide' : ''}"><h3>${esc(title(k, d))}</h3>${html}</section>`
  const pct = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)
  const parts = secs.map((k) => {
    if (k === 'study') { const stats = d.stats || [['이번 주', hmS(d.wk)], ['공부 기록', d.sess.length], ['끝낸 일', d.done.length]]; return `<section class="rpa-hero wide"><div class="rpa-big">${hmS(d.mins)}<small> / ${hmS(d.goal)}</small><em>${pct}%</em></div><div class="rpa-track"><i style="width:${pct}%"></i></div><div class="rpa-stats">${stats.map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div></section>` }
    if (k === 'subjects') { if (!d.subs.length) return ''; const tot = d.subs.reduce((a, x) => a + x.m, 0) || 1; return sec(k, `<div class="rpa-stack">${d.subs.map((x) => `<i style="flex:${x.m};background:${x.sub?.color || '#999'}"></i>`).join('')}</div>${d.subs.map((x) => `<div class="rpa-lg"><span class="dot" style="background:${x.sub?.color || '#999'}"></span><span class="n">${esc(x.sub?.name || '과목 없음')}</span><span class="p">${Math.round((x.m / tot) * 100)}%</span><span class="t">${hmS(x.m)}</span>${x.notes.length ? `<div class="note">${esc(x.notes.join(' / '))}</div>` : ''}</div>`).join('')}`) }
    if (k === 'days') return d.days?.some((x) => x.m) ? sec(k, vbars(d.days.map((x) => x.m), d.days.map((x) => (d.kind === 'week' ? x.l : x.l)), d.dayGoal || 0), true) : ''
    if (k === 'hours') return d.hours.some(Boolean) ? sec(k, vbars(d.hours, d.hours.map((_, i) => ([0, 6, 12, 17].includes(i) ? i + 6 + '시' : ''))), true) : ''
    if (k === 'cal') { if (!d.cal) return ''; const c = d.cal, lead = (new Date(c.month + 'T00:00').getDay() - c.weekStartDow + 7) % 7, cells = [...Array(lead).fill(null), ...d.days]; while (cells.length % 7) cells.push(null); return sec(k, `<div class="rpa-cal">${Array.from({ length: 7 }, (_, i) => `<span class="wd">${WD[(i + c.weekStartDow) % 7]}</span>`).join('')}${cells.map((x, i) => x ? `<span class="c" style="${x.m ? `background:color-mix(in srgb, ${acc} ${Math.round(14 + 60 * Math.min(1, x.m / (c.goal || 1)))}%, white)` : ''}"><b>${i - lead + 1}</b>${x.m ? hmS(x.m) : ''}</span>` : '<span></span>').join('')}</div>`, true) }
    const l = lines(k, d)
    return l.length ? sec(k, `<ul class="${l.length >= 8 ? 'two' : ''}">${l.map((x) => { const m = /^(✓|–|↺) /.exec(x); return `<li><span class="mk${m && m[1] === '✓' ? ' on' : m ? '' : ' dash'}"></span>${esc(m ? x.slice(2) : x)}</li>` }).join('')}</ul>`, l.length >= 8) : ''
  }).join('')
  el.innerHTML = `<style>
  .rpa { font-family: var(--font); color: #2b2e35; font-weight: 300; font-size: 9.5pt; --a: ${acc}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rpa-top { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 3mm; border-bottom: .3mm solid #d9dbe0; margin-bottom: 5mm; }
  .rpa-top h1 { font-size: 20pt; font-weight: 200; margin: 0; } .rpa-top span { font-size: 7pt; letter-spacing: .25em; color: #8b9099; }
  .rpa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 8mm; }
  .rpa-sec, .rpa-hero { break-inside: avoid; } .wide { grid-column: 1 / -1; }
  .rpa-sec h3 { font-size: 7pt; letter-spacing: .18em; font-weight: 400; color: #8b9099; margin: 0 0 2.5mm; padding-bottom: 1.5mm; border-bottom: .2mm solid #e3e5e9; }
  .rpa-hero { background: color-mix(in srgb, var(--a) 6%, white); border-radius: 3mm; padding: 5mm 6mm; }
  .rpa-big { font-size: 30pt; font-weight: 200; line-height: 1; display: flex; align-items: baseline; gap: 2mm; } .rpa-big small { font-size: 10pt; color: #8b9099; } .rpa-big em { margin-left: auto; font-style: normal; font-size: 10pt; color: var(--a); }
  .rpa-track { height: 1.2mm; background: #e3e5e9; border-radius: 1mm; margin: 4mm 0; overflow: hidden; } .rpa-track i { display: block; height: 100%; background: var(--a); border-radius: 1mm; }
  .rpa-stats { display: grid; grid-template-columns: repeat(3, 1fr); } .rpa-stats div + div { border-left: .2mm solid #d9dbe0; padding-left: 4mm; }
  .rpa-stats span { display: block; font-size: 6.5pt; letter-spacing: .12em; color: #8b9099; } .rpa-stats b { font-weight: 200; font-size: 15pt; }
  .rpa-stack { display: flex; gap: .6mm; height: 2mm; border-radius: 1mm; overflow: hidden; margin-bottom: 2mm; }
  .rpa-lg { display: flex; flex-wrap: wrap; align-items: center; gap: 2mm; padding: 1.2mm 0; border-bottom: .2mm dashed #e3e5e9; } .rpa-lg .dot { width: 2mm; height: 2mm; border-radius: 50%; } .rpa-lg .n { flex: 1; } .rpa-lg .p { color: #8b9099; font-size: 8pt; } .rpa-lg .t { min-width: 10mm; text-align: right; } .rpa-lg .note { flex-basis: 100%; padding-left: 4mm; color: #8b9099; font-size: 8pt; }
  .rpa-plot { position: relative; height: 26mm; display: flex; gap: 1.5mm; align-items: flex-end; border-bottom: .2mm solid #d9dbe0; } .rpa-col { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; } .rpa-col i { display: block; width: min(3mm, 70%); background: var(--a); border-radius: 1.5mm 1.5mm .3mm .3mm; }
  .rpa-goal { position: absolute; left: 0; right: 0; border-top: .25mm dashed #9aa0aa; } .rpa-lab { display: flex; gap: 1.5mm; margin-top: 1mm; } .rpa-lab span { flex: 1; text-align: center; font-size: 7pt; color: #8b9099; white-space: nowrap; }
  .rpa-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1mm; font-size: 7.5pt; } .rpa-cal .wd { text-align: center; color: #8b9099; font-size: 7pt; } .rpa-cal .c { height: 12mm; border-radius: 1.5mm; box-shadow: inset 0 0 0 .2mm #e3e5e9; padding: 1mm 1.5mm; display: flex; flex-direction: column; justify-content: space-between; } .rpa-cal .c b { font-weight: 300; color: #8b9099; }
  .rpa ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.2mm; } .rpa ul.two { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2mm 6mm; }
  .rpa li { display: flex; gap: 2mm; align-items: center; } .rpa .mk { width: 2.4mm; height: 2.4mm; border: .25mm solid #9aa0aa; border-radius: .6mm; flex-shrink: 0; } .rpa .mk.on { background: var(--a); border-color: var(--a); } .rpa .mk.dash { width: 1.6mm; height: 0; border-width: .25mm 0 0; border-radius: 0; }
  </style><div class="rpa-top"><h1>${esc(label(d))}</h1><span>${NAME_EN[d.kind || 'day']}</span></div><div class="rpa-grid">${parts}</div>`
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 50)
}
const NAME_EN = { day: 'DAILY REPORT', week: 'WEEKLY REPORT', month: 'MONTHLY REPORT' }

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
  const hl = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  const body = (k) => {
    if (k === 'study') { const p = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100); return <div className="rp-hero">
      <div className="row" style={{ alignItems: 'baseline', gap: 8 }}><span className="rp-big">{hmS(d.mins)}</span><span className="small muted">/ {hmS(d.goal)}</span><span className="grow" /><span className="rp-pct">{p}%</span></div>
      <div className="rp-track"><i style={{ width: p + '%' }} /></div>
      <div className="rp-stats">{(d.stats || [['이번 주', hmS(d.wk)], ['공부 기록', d.sess.length], ['끝낸 일', d.done.length]]).map(([l, v]) => <div key={l} className="stat-mini"><i>{l}</i><b>{v}</b></div>)}</div>
    </div> }
    if (k === 'subjects') { if (!d.subs.length) return null; const tot = d.subs.reduce((a, x) => a + x.m, 0) || 1; return <div className="col" style={{ gap: 8 }}>
      <div className="rp-stack">{d.subs.map((x, i) => <i key={i} style={{ flex: x.m, background: x.sub?.color || 'var(--muted)' }} />)}</div>
      <div className="rp-legend">{d.subs.map((x, i) => <div key={i} className="rp-lg"><span className="dot" style={{ background: x.sub?.color || 'var(--muted)' }} /><span className="grow ellipsis">{x.sub?.name || '과목 없음'}</span><span className="muted tiny">{Math.round((x.m / tot) * 100)}%</span><span className="rp-num">{hmS(x.m)}</span>{x.notes.length > 0 && <div className="rp-note">{x.notes.join(' / ')}</div>}</div>)}</div>
    </div> }
    if (k === 'days') { if (!d.days.some((x) => x.m)) return null; const per = d.dayGoal || 0, dm = Math.max(60, per, ...d.days.map((x) => x.m)); return <div className="rp-chart">
      <div className="rp-plot" style={{ gap: d.days.length > 20 ? 2 : 6 }}>{per > 0 && <span className="wbars-goal" style={{ bottom: (per / dm) * 100 + '%' }} />}{d.days.map((x) => <div key={x.d} className="rp-col" title={`${fmtShort(x.d)} ${fmtDur(x.m)}`}>{d.days.length <= 7 && x.m > 0 && <span className="wbar-v">{hl(x.m)}</span>}<i className="wbar-b" style={{ height: Math.max(x.m ? 3 : 0, (x.m / dm) * 100) + '%', width: d.days.length > 20 ? 5 : 8, opacity: x.m >= per ? 1 : 0.7 }} /></div>)}</div>
      <div className="wbars-l" style={{ gap: d.days.length > 20 ? 2 : 6 }}>{d.days.map((x) => <span key={x.d} style={{ overflow: 'visible', whiteSpace: 'nowrap' }}>{x.l}</span>)}</div>
    </div> }
    if (k === 'cal') return d.cal ? <MonthHeat values={d.cal.values} goal={d.cal.goal} weekStartDow={d.cal.weekStartDow} fixed={d.cal.month} color="var(--accent)" /> : null
    if (k === 'hours') return d.hours.some(Boolean) ? <div className="rp-chart"><div className="rp-plot" style={{ gap: 3, height: 56 }}>{d.hours.map((m, i) => <div key={i} className="rp-col" title={`${i + 6}시 ${m}분`}><i className="wbar-b" style={{ width: '100%', maxWidth: 10, height: Math.max(m ? 3 : 0, (m / mx) * 100) + '%', opacity: 0.45 + 0.55 * (m / mx) }} /></div>)}</div><div className="row between tiny muted" style={{ marginTop: 4 }}><span>6시</span><span>12시</span><span>18시</span><span>24시</span></div></div> : null
    const l = lines(k, d)
    return l.length ? <div className={'rp-list' + (l.length >= 6 ? ' two' : '')}>{l.map((x, i) => { const m = /^(✓|–|↺) /.exec(x); return <div key={i} className="rp-li ellipsis">{m ? <span className={'rp-mk' + (m[1] === '✓' ? ' on' : '')}>{m[1] === '↺' ? '↺' : ''}</span> : <span className="rp-dash" />}{m ? x.slice(2) : x}</div> })}</div> : null
  }
  return (
    <div className="col rp">
      <Seg value={mode} onChange={setMode} options={MODES} />
      <div className="rp-head">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="이전"><Icon name="back" size={16} /></button>
        <div className="col" style={{ alignItems: 'center', gap: 2 }}><span className="rp-kicker">{{ day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY' }[mode]} REPORT</span><span className="rp-date">{label(d)}</span></div>
        <button className="icon-btn" disabled={nextOff} onClick={() => step(1)} aria-label="다음"><Icon name="next" size={16} /></button>
      </div>
      {edit && (
        <div className="col rp-edit">
          <div className="tiny muted">보여 줄 항목을 켜고 순서를 정해요 (공유·인쇄도 같아요)</div>
          {secs.map((k, i) => <div key={k} className="row small" style={{ gap: 6 }}><span className="grow">{i + 1}. {allOf(mode).find(([x]) => x === k)[1]}</span><button className="icon-btn" aria-label="위로" onClick={() => move(i, -1)}>‹</button><button className="icon-btn" aria-label="아래로" onClick={() => move(i, 1)}>›</button><button className="chip on" onClick={() => setSecs(secs.filter((x) => x !== k))}>끄기</button></div>)}
          <div className="row wrap" style={{ gap: 6 }}>{allOf(mode).filter(([k]) => !secs.includes(k)).map(([k, l]) => <button key={k} className="chip" onClick={() => setSecs([...secs, k])}>+ {l}</button>)}</div>
          <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}><span className="tiny muted">이미지 색</span>{REPORT_THEMES.map(([k, l]) => <button key={k} className={'chip' + (theme === k ? ' on' : '')} onClick={() => setSettings({ reportTheme: k })}>{l}</button>)}</div>
        </div>
      )}
      {secs.map((k) => { const b = body(k); return b && <section key={k} className={'rp-sec rp-' + k}>{k !== 'study' && <div className="rp-cap">{title(k, d)}</div>}{b}</section> })}
      {secs.every((k) => !body(k)) && <div className="small muted" style={{ padding: '18px 0', textAlign: 'center' }}>기록이 없어요.</div>}
      <div className="rp-actions">
        <button className={'btn ghost sm' + (edit ? ' on-acc' : '')} onClick={() => setEdit(!edit)}><Icon name="layers" size={14} />구성</button>
        <button className="btn ghost sm" onClick={share}><Icon name="share" size={14} />텍스트</button>
        <button className="btn ghost sm" onClick={async () => { const blob = await drawReport(d, secs, lines, title, { theme, head: { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY' }[mode] + ' REPORT', dateTxt: mode === 'day' ? undefined : label(d) }); const r = await shareBlob(blob, `리포트-${mode === 'day' ? date : d.from}.png`); if (r === 'saved') toast('이미지를 저장했어요') }}><Icon name="image" size={14} />이미지</button>
        <button className="btn ghost sm" onClick={() => printA4(d, secs)}><Icon name="print" size={14} />A4</button>
      </div>
    </div>
  )
}
