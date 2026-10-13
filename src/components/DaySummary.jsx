// 리포트(하루·주간·월간): 구성(켜기·순서)을 직접 정함 — 공유(텍스트)·이미지·A4 인쇄도 같은 구성
import { useEffect, useState } from 'react'
import { goalFor } from '../engine/goal.js'
import { reportFamily, loadReportFont, reportFontOptions, reportScale } from '../lib/reportFont.js'
import { useMyFonts } from '../lib/fonts.js'
import { CountUp } from './Roll.jsx'
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
  // 10분 칸 (6시~24시 · 108칸): 채운 비율과 가장 오래 한 과목 색 — 플래너 시간표처럼
  const slots = Array.from({ length: 108 }, () => ({ f: 0, c: null, o: 0 }))
  for (const s of ss) if (s.start != null) {
    const a = tsToMin(s.start), b = a + (s.dur || 0), col = sub(s.subjectId)?.color || null
    for (let i = Math.max(0, Math.floor((a - 360) / 10)); i < Math.min(108, Math.ceil((b - 360) / 10)); i++) {
      const o = Math.min(b, 370 + i * 10) - Math.max(a, 360 + i * 10); if (o <= 0) continue
      const sl = slots[i]; sl.f = Math.min(1, sl.f + o / 10); if (o > sl.o) { sl.o = o; sl.c = col }
    }
  }
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
  const ddays = pinnedDdays(date)
  const quote = pickQuote(list('quotes').sort((a, b) => a.id.localeCompare(b.id)))?.text || ''
  return { date, mins, goal, subs: Object.values(bySub).sort((a, b) => b.m - a.m), hours, slots, done, left, evs: eventsOn(date), tmr: { tasks: live.filter((t) => !t.done && t.due === tmr), evs: eventsOn(tmr) }, cond, comment, sess, fc, wk, wavg: Math.round(wk / wdays), top3, habits, revs, prog, ddays, quote }
}

// 리포트 D-day: 별표한 것만 (지나지 않은 것 · 가까운 순)
const pinnedDdays = (from) => list('ddays').filter((x) => x.pinned && x.date >= from).sort((a, b) => a.date.localeCompare(b.date)).map((x) => ({ t: x.title, n: diffDays(x.date, from), c: x.color || null }))

// 주간·월간 요약 (from~to)
export function periodSummary(kind, from, to, { tasks, sessions, subjects, goal, goalOf, weekStart: wsd = 1 }) {
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
  // 기간 목표: 요일별 목표가 있으면 오늘까지 날마다 더함
  const gSum = goalOf ? ds.filter((d) => d <= today()).reduce((a, d) => a + goalOf(d), 0) || goalOf(from) : goal * nd
  const habits = list('habits').map((h) => ({ title: h.title, n: ds.filter((d) => h.days?.[d]).length, of: nd }))
  const prog = [...list('lectures').map((x) => ({ t: x.title, n: Object.values(x.done || {}).filter((v) => inR(v)).length, all: Object.keys(x.done || {}).length, of: x.total, u: '강' })), ...list('textbooks').map((x) => ({ t: x.title, n: 0, all: x.current || 0, of: x.total, u: x.unit || 'p' }))].filter((x) => x.of)
  const ddays = pinnedDdays(today())
  const comments = ds.map((d) => [d, dayRec(d).comment]).filter(([, c]) => c)
  const hmx = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  return {
    kind, date: from, from, to, mins, goal: gSum, dayGoal: goal, subs: Object.values(bySub).sort((a, b) => b.m - a.m), hours, days, done, left, fc, habits, prog, ddays, comments, best: best?.m ? best : null,
    sess: ss, cal: kind === 'month' ? { month: from, values: byDay, goal: goalOf || goal, weekStartDow: wsd } : null,
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
// 흑백 인쇄풍 표: 머리줄은 영문 작은 글자 · 칸마다 가는 테두리 (화면·A4·이미지 공용)
export const EN = { study: 'STUDY', subjects: 'SUBJECTS', sessions: 'LOG', hours: 'TIME', focus: 'FOCUS', week: 'WEEK', top3: 'TOP 3', done: 'DONE', left: 'TO DO', events: 'PLAN', tomorrow: 'TOMORROW', habits: 'HABITS', reviews: 'REVIEW', progress: 'PROGRESS', dday: 'D-DAY', condition: 'CONDITION', quote: 'QUOTE', comment: 'NOTE', days: 'DAYS', cal: 'CALENDAR', best: 'BEST DAY', comments: 'NOTES' }
// 표 한 장: cols 는 열 너비(0 = 남는 폭), 칸 k — n 번호·시각 · t 글 · ok 완료 표시 · dd D-day 숫자 · dot 과목 색 + 이름 · note 한 줄 전체
export function sheetOf(k, d) {
  if (k === 'dday') return d.ddays.length ? { cols: [0, 86], rows: d.ddays.map((x) => [{ k: 't', t: x.t, star: x.c || true }, { k: 'dd', t: x.n === 0 ? 'D-DAY' : 'D-' + x.n, c: x.c }]) } : null
  if (k === 'subjects') {
    if (!d.subs.length) return null
    const tot = d.subs.reduce((a, x) => a + x.m, 0) || 1
    return { cols: [0, 48, 64], stack: d.subs.map((x) => ({ m: x.m, c: x.sub?.color })), rows: d.subs.flatMap((x) => [[{ k: 'dot', t: x.sub?.name || '과목 없음', c: x.sub?.color }, { k: 'n', t: Math.round((x.m / tot) * 100) + '%' }, { k: 'n', t: hmS(x.m), ink: true }], ...(x.notes.length ? [[{ k: 'note', t: x.notes.join(' / ') }]] : [])]) }
  }
  const l = lines(k, d)
  if (!l.length) return null
  const it = l.map((x) => { const m = /^(✓|–|↺) /.exec(x), tx = m ? x.slice(2) : x, tm = /^(\d{1,2}:\d{2}|종일) (.+)$/.exec(tx); return { mk: m ? m[1] : '', t: tm ? tm[2] : tx, tm: tm ? tm[1] : '' } })
  const ok = it.some((x) => x.mk === '✓' || x.mk === '↺'), tmc = it.every((x) => x.tm)
  return { cols: [tmc ? 52 : 34, 0, ...(ok ? [48] : [])], head: [tmc ? 'TIME' : 'NO', EN[k] || '', ...(ok ? ['DONE'] : [])], rows: it.map((x, i) => [{ k: 'n', t: tmc ? x.tm : String(i + 1) }, { k: 't', t: x.t, dim: x.mk === '✓' && k !== 'done' }, ...(ok ? [{ k: 'ok', t: x.mk === '✓' ? '✓' : x.mk === '↺' ? '↺' : '' }] : [])]) }
}
const NAME = { day: '하루 리포트', week: '주간 리포트', month: '월간 리포트' }
const label = (d) => (d.kind === 'month' ? `${d.from.slice(0, 4)}년 ${+d.from.slice(5, 7)}월` : d.kind === 'week' ? `${fmtShort(d.from)} – ${fmtShort(d.to)}` : fmtDate(d.date))

const asText = (d, secs) => [`${label(d)} ${NAME[d.kind || 'day']}`, ...secs.flatMap((k) => { const l = lines(k, d); return l.length ? ['', `[${title(k, d)}]`, ...l] : [] })].join('\n')

async function printA4(d, secs, fontKey) {
  await loadReportFont(fontKey); const hand = reportFamily(fontKey), hs = reportScale(fontKey)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const el = document.createElement('div'); el.id = 'print-area'; el.className = 'rpa'
  const cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue('--accent').trim() || '#4a5a78'
  const vbars = (vals, labs, goal) => { const mx = Math.max(60, goal || 0, ...vals); return `<div class="rpa-plot">${goal ? `<span class="rpa-goal" style="bottom:${(goal / mx) * 100}%"></span>` : ''}${vals.map((m) => `<div class="rpa-col"><i style="height:${m ? Math.max(3, (m / mx) * 100) : 0}%;opacity:${goal ? (m >= goal ? 1 : 0.55) : 0.45 + 0.55 * (m / mx)}"></i></div>`).join('')}</div><div class="rpa-lab">${labs.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` }
  // 흑백 인쇄풍 표 (화면과 같은 구성)
  const mm = (cols) => cols.map((n) => (n ? (n * 0.27).toFixed(1) + 'mm' : 'minmax(0, 1fr)')).join(' ')
  const star = (c) => `<svg class="st" viewBox="0 0 16 16"><path style="stroke:${c}" d="M8 1.9l1.7 4 4.2.4-3.2 2.8 1 4.2L8 11.1l-3.7 2.2 1-4.2-3.2-2.8 4.2-.4z"/></svg>`
  const cell = (c) => `<span class="c-${c.k}${c.dim ? ' dim' : ''}${c.ink ? ' strong' : ''}"${c.k === 'dd' && c.c ? ` style="color:${c.c}"` : ''}>${c.k === 'dot' ? `<i style="background:${c.c || '#999'}"></i>` : ''}${c.star ? star(c.star === true ? '#c9a0a8' : c.star) : ''}<span class="tx">${esc(c.t)}</span></span>`
  const head = (k) => `<div class="h"><b>${esc(EN[k] || '')}</b><em>${esc(title(k, d))}</em></div>`
  const box = (i, inner, wide) => `<section class="sh hc${i % 3}${wide ? ' wide' : ''}">${inner}</section>`
  const table = (k, i, s) => box(i, (s.head ? `<div class="r hr" style="grid-template-columns:${mm(s.cols)}">${s.head.map((h, j) => (j === 1 ? `<span class="hl"><b>${esc(h)}</b><em>${esc(title(k, d))}</em></span>` : `<span class="c-l">${h}</span>`)).join('')}</div>` : head(k))
    + (s.stack ? `<div class="sstk">${s.stack.map((x) => `<i style="flex:${x.m};background:${x.c || '#999'}"></i>`).join('')}</div>` : '')
    + s.rows.map((r) => `<div class="r" style="grid-template-columns:${r[0].k === 'note' ? '1fr' : mm(s.cols)}">${r.map(cell).join('')}</div>`).join(''), s.rows.length >= 9)
  const pct = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)
  const dt = `<h1>${esc(d.kind ? label(d) : dayTitle(d.date))}</h1>`
  const parts = (secs.includes('dday') || !d.ddays.length ? [] : [table('dday', 1, sheetOf('dday', d))]).concat(secs.map((k, i) => {
    if (k === 'study') { const stats = d.stats || [['이번 주', hmS(d.wk)], ['공부 기록', d.sess.length], ['끝낸 일', d.done.length]]; return box(i, `${head(k)}<div class="r" style="grid-template-columns:18mm 1fr"><span class="c-l">TOTAL</span><span class="study"><span class="tot"><b class="big">${hmS(d.mins)}</b><small>/ ${hmS(d.goal)}</small><em>${pct}%</em></span><span class="trk"><i style="width:${Math.max(2, pct)}%"></i></span></span></div><div class="r" style="grid-template-columns:repeat(${stats.length}, 1fr)">${stats.map(([l, v]) => `<span class="sx"><i>${esc(l)}</i><b>${esc(v)}</b></span>`).join('')}</div>`, true) }
    if (k === 'days') return d.days?.some((x) => x.m) ? box(i, head(k) + `<div class="b">${vbars(d.days.map((x) => x.m), d.days.map((x) => x.l), d.dayGoal || 0)}</div>`, true) : ''
    if (k === 'hours' && d.slots) return d.hours.some(Boolean) ? box(i, head(k) + `<div class="b"><div class="rpa-ten">${Array.from({ length: 18 }, (_, h) => `<div class="r2"><span>${h + 6}</span>${d.slots.slice(h * 6, h * 6 + 6).map((x) => `<i${x.f ? ` style="background:color-mix(in srgb, #4b505a ${Math.round(22 + 40 * x.f)}%, white)"` : ''}></i>`).join('')}</div>`).join('')}</div></div>`) : ''
    if (k === 'hours') return d.hours.some(Boolean) ? box(i, head(k) + `<div class="b">${vbars(d.hours, d.hours.map((_, j) => ([0, 6, 12, 17].includes(j) ? j + 6 + '시' : '')))}</div>`, true) : ''
    if (k === 'cal') { if (!d.cal) return ''; const c = d.cal, lead = (new Date(c.month + 'T00:00').getDay() - c.weekStartDow + 7) % 7, cells = [...Array(lead).fill(null), ...d.days]; while (cells.length % 7) cells.push(null); return box(i, head(k) + `<div class="b"><div class="rpa-cal">${Array.from({ length: 7 }, (_, j) => `<span class="wd">${WD[(j + c.weekStartDow) % 7]}</span>`).join('')}${cells.map((x, j) => (x ? `<span class="c" style="${x.m ? `background:color-mix(in srgb, #4b505a ${Math.round(10 + 50 * Math.min(1, x.m / ((typeof c.goal === 'function' ? c.goal(x.d) : c.goal) || 1)))}%, white)` : ''}"><b>${j - lead + 1}</b>${x.m ? hmS(x.m) : ''}</span>` : '<span></span>')).join('')}</div></div>`, true) }
    const s = sheetOf(k, d); return s ? table(k, i, s) : ''
  })).join('')
  el.innerHTML = `<style>
  .rpa { position: relative; font-family: var(--font); color: #2b2e35; font-weight: 300; font-size: 9.5pt; --a: ${acc}; --ink: rgba(43, 46, 53, .72); -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2mm 0 0;
    background-image: linear-gradient(#eef0f3 .2mm, transparent .2mm), linear-gradient(90deg, #eef0f3 .2mm, transparent .2mm); background-size: 5mm 5mm; }
  .rpa-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5mm; }
  .rpa-top .k { font-size: 6.5pt; letter-spacing: .3em; color: #8b9099; } .rpa-top h1 { font-family: ${hand}; font-size: ${20 * hs}pt; font-weight: 300; margin: 1mm 0 0; }
  .rpa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 5mm; align-items: start; }
  .sh { border: .25mm solid var(--ink); background: white; break-inside: avoid; } .wide { grid-column: 1 / -1; }
  .sh { --hc: #2b2e35; }
  .sh .h { display: flex; justify-content: space-between; align-items: baseline; padding: 1.4mm 2.6mm; border-bottom: .25mm solid var(--ink); background: color-mix(in srgb, var(--hc) 4%, white); }
  .sh .h b, .sh .hl b { font-weight: 400; font-size: 6.5pt; letter-spacing: .2em; color: #8b9099; } .sh .h em, .sh .hl em { font-style: normal; font-size: 7pt; color: #8b9099; }
  .sh .r { display: grid; min-height: 7mm; } .sh .r + .r { border-top: .25mm solid var(--ink); }
  .sh .r > * { display: flex; align-items: center; gap: 1.6mm; padding: 1.2mm 2.4mm; min-width: 0; } .sh .r > * + * { border-left: .25mm solid var(--ink); }
  .sh .hr { min-height: 5.5mm; background: color-mix(in srgb, var(--hc) 4%, white); border-bottom: .25mm solid var(--ink); } .sh .hr + .r { border-top: 0; } .sh .hl { justify-content: space-between; }
  .c-l { font-size: 6.5pt; letter-spacing: .16em; color: #8b9099; justify-content: center; white-space: nowrap; } .c-n { justify-content: center; font-size: 8pt; color: #8b9099; } .c-n.strong { color: #2b2e35; }
  .tx { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .c-t.dim { color: #8b9099; }
  .c-ok { justify-content: center; color: #7a8660; } .c-dd { justify-content: center; font-family: ${hand}; font-size: ${11 * hs}pt; color: #c9a0a8; }
  .c-dot i { width: 2mm; height: 2mm; border-radius: .4mm; flex-shrink: 0; } .c-note { font-size: 7.5pt; color: #8b9099; padding-left: 6mm !important; }
  .sstk { display: flex; gap: .6mm; height: 1.2mm; margin: 2mm 2.6mm; } .sstk i { border-radius: .6mm; filter: grayscale(1); opacity: .7; } .sstk + .r { border-top: .25mm solid var(--ink); }
  .st { width: 3mm; height: 3mm; flex-shrink: 0; } .st path { fill: none; stroke-width: 1.3; stroke-linejoin: round; }
  .study { flex-direction: column; align-items: stretch !important; gap: 2mm !important; padding: 2.4mm 3mm !important; } .tot { display: flex; align-items: baseline; gap: 2mm; }
  .big { font-family: ${hand}; font-size: ${26 * hs}pt; font-weight: 300; line-height: 1; } .tot small { color: #8b9099; font-size: 9pt; } .tot em { margin-left: auto; font-style: normal; color: var(--a); font-size: 11pt; }
  .trk { display: block; height: 1.2mm; background: linear-gradient(#e3e5e9, #e3e5e9) 0 50% / 100% .2mm no-repeat; } .trk i { display: block; height: 100%; background: var(--a); border-radius: 1mm; }
  .sx { flex-direction: column; align-items: flex-start !important; gap: .4mm !important; } .sx i { font-style: normal; font-size: 6.5pt; color: #8b9099; } .sx b { font-weight: 300; font-size: 12pt; }
  .b { padding: 2.6mm 3mm 3mm; }
  .rpa-ten { display: grid; grid-template-rows: repeat(9, auto); grid-auto-flow: column; column-gap: 5mm; } .rpa-ten .r2 { display: grid; grid-template-columns: 6mm repeat(6, 1fr); height: 4.6mm; align-items: center; border-bottom: .2mm solid #e3e5e9; } .rpa-ten span { font-size: 6.5pt; color: #8b9099; } .rpa-ten i { height: 2.6mm; border-radius: .6mm; margin: 0 .2mm; }
  .rpa-plot { position: relative; height: 26mm; display: flex; gap: 1.5mm; align-items: flex-end; border-bottom: .2mm solid #d9dbe0; } .rpa-col { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; } .rpa-col i { display: block; width: min(3mm, 70%); background: #6b7079; border-radius: 1.5mm 1.5mm .3mm .3mm; }
  .rpa-goal { position: absolute; left: 0; right: 0; border-top: .25mm dashed #9aa0aa; } .rpa-lab { display: flex; gap: 1.5mm; margin-top: 1mm; } .rpa-lab span { flex: 1; text-align: center; font-size: 7pt; color: #8b9099; white-space: nowrap; }
  .rpa-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1mm; font-size: 7.5pt; } .rpa-cal .wd { text-align: center; color: #8b9099; font-size: 7pt; } .rpa-cal .c { height: 12mm; border: .2mm solid #e3e5e9; padding: 1mm 1.5mm; display: flex; flex-direction: column; justify-content: space-between; } .rpa-cal .c b { font-weight: 300; color: #8b9099; }
  </style><div class="rpa-top"><div><span class="k">${NAME_EN[d.kind || 'day']}</span>${dt}</div></div><div class="rpa-grid">${parts}</div>`
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  // 손글씨 한글 조각까지 받은 뒤 인쇄
  document.fonts.ready.catch(() => {}).then(() => setTimeout(() => { window.print(); setTimeout(done, 1500) }, 80))
}
const NAME_EN = { day: 'DAILY REPORT', week: 'WEEKLY REPORT', month: 'MONTHLY REPORT' }

// 10분 플래너 칸: 6시~23시 줄마다 10분 칸 6개 · 공부한 만큼 과목 색으로 칠함
function TenGrid({ slots }) {
  return (
    <div className="rp-ten">
      {Array.from({ length: 18 }, (_, h) => (
        <div key={h} className="rp-ten-r">
          <span className="rp-ten-h">{h + 6}</span>
          {slots.slice(h * 6, h * 6 + 6).map((s, i) => <i key={i} style={s.f ? { background: `color-mix(in srgb, ${s.c || 'var(--accent)'} ${Math.round(28 + 42 * s.f)}%, transparent)` } : null} />)}
        </div>
      ))}
    </div>
  )
}
// 별 (별표한 D-day)
const Star = ({ c }) => <svg className="rp-star" viewBox="0 0 16 16" style={{ color: c }} aria-hidden="true"><path d="M8 1.9l1.7 4 4.2.4-3.2 2.8 1 4.2L8 11.1l-3.7 2.2 1-4.2-3.2-2.8 4.2-.4z" /></svg>
const colsCss = (cols) => cols.map((n) => (n ? n + 'px' : 'minmax(0, 1fr)')).join(' ')
const SCell = ({ c }) => <span className={'sh-' + c.k + (c.dim ? ' dim' : '') + (c.ink ? ' strong' : '')} style={c.k === 'dd' && c.c ? { color: c.c } : null}>{c.k === 'dot' && <i style={{ background: c.c || 'var(--muted)' }} />}{c.star && <Star c={c.star === true ? 'var(--c4, #c9a0a8)' : c.star} />}<span className="ellipsis">{c.t}</span></span>
// 표 한 장 (머리줄 + 줄들)
function SheetTable({ k, d, i, s }) {
  const cols = colsCss(s.cols)
  return (
    <section className={'sh hc' + (i % 3)}>
      {s.head ? <div className="sh-r sh-hr" style={{ '--cols': cols }}>{s.head.map((h, j) => <span key={j} className={j === 1 ? 'sh-hl' : 'sh-l'}>{j === 1 ? <><b>{h}</b><em>{title(k, d)}</em></> : h}</span>)}</div>
        : <div className="sh-h"><b>{EN[k] || ''}</b><em>{title(k, d)}</em></div>}
      {s.stack && <div className="sh-stack">{s.stack.map((x, j) => <i key={j} style={{ flex: x.m, background: x.c || 'var(--muted)' }} />)}</div>}
      {s.rows.map((r, j) => <div key={j} className="sh-r" style={{ '--cols': r[0].k === 'note' ? 'minmax(0, 1fr)' : cols }}>{r.map((c, m) => <SCell key={m} c={c} />)}</div>)}
    </section>
  )
}
const dayTitle = (d) => { const x = new Date(d + 'T00:00'); return `${x.getMonth() + 1}월 ${x.getDate()}일 ${'일월화수목금토'[x.getDay()]}요일` }

export default function DaySummary({ initial = today(), initialMode = 'day' }) {
  const [date, setDate] = useState(initial), [edit, setEdit] = useState(false), [mode, setMode] = useState(initialMode)
  const tasks = useColl('tasks'), sessions = useColl('sessions'), subjects = useColl('subjects'), st = useSettings()
  useColl('days'); useColl('conditions')
  const secs = secsOf(st, mode)
  const fontKey = st.reportFont || ''
  useMyFonts()
  useEffect(() => { loadReportFont(fontKey).catch(() => {}) }, [fontKey]) // 날짜·큰 숫자·소제목 글꼴
  useColl('habits'); useColl('reviews'); useColl('lectures'); useColl('textbooks'); useColl('ddays'); useColl('quotes')
  const opt = { tasks, sessions, subjects, goal: goalFor(st, date), goalOf: (k) => goalFor(st, k), weekStart: st.weekStart ?? 1 }
  const from = mode === 'week' ? weekStart(date, opt.weekStart) : monthStart(date)
  const d = mode === 'day' ? daySummary(date, opt) : periodSummary(mode, from, mode === 'week' ? addDays(from, 6) : addDays(from, daysInMonth(+from.slice(0, 4), +from.slice(5, 7) - 1) - 1), opt)
  const step = (n) => setDate(mode === 'day' ? addDays(date, n) : mode === 'week' ? addDays(date, 7 * n) : addMonths(monthStart(date), n))
  const nextOff = mode === 'day' ? date >= today() : d.to >= today()
  const theme = st.reportTheme || 'app'
  const setSecs = (v) => setSettings({ [KEY[mode]]: v })
  const move = (i, dir) => { const a = [...secs], j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setSecs(a) }
  const share = async () => { const text = asText(d, secs); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('복사했어요') } } catch {} }
  const mx = Math.max(60, ...d.hours)
  const CHARTS = new Set(['days', 'cal', 'hours'])
  const hl = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  const body = (k) => {
    if (k === 'study') { const p = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100), st3 = d.stats || [['이번 주', hmS(d.wk)], ['공부 기록', d.sess.length], ['끝낸 일', d.done.length]]; return <>
      <div className="sh-r" style={{ '--cols': '64px minmax(0, 1fr)' }}><span className="sh-l">TOTAL</span><span className="sh-study"><span className="rp-total"><b className="rp-big"><CountUp key={mode + date} to={d.mins} fmt={(v) => hmS(Math.round(v))} /></b><span className="rp-of">/ {hmS(d.goal)}</span><span className="grow" /><b className="rp-pct">{p}%</b></span><span className="rp-prog"><i style={{ width: Math.max(2, p) + '%' }} /></span></span></div>
      <div className="sh-r" style={{ '--cols': colsCss(st3.map(() => 0)) }}>{st3.map(([l, v]) => <span key={l} className="sh-st"><i>{l}</i><b>{v}</b></span>)}</div>
    </> }
    if (k === 'subjects') { if (!d.subs.length) return null; const tot = d.subs.reduce((a, x) => a + x.m, 0) || 1; return <div className="col" style={{ gap: 8 }}>
      <div className="rp-stack">{d.subs.map((x, i) => <i key={i} style={{ flex: x.m, background: x.sub?.color || 'var(--muted)' }} />)}</div>
      <div className="rp-legend">{d.subs.map((x, i) => <div key={i} className="rp-lg"><span className="dot" style={{ background: x.sub?.color || 'var(--muted)' }} /><span className="grow ellipsis">{x.sub?.name || '과목 없음'}</span><span className="muted tiny">{Math.round((x.m / tot) * 100)}%</span><span className="rp-num">{hmS(x.m)}</span>{x.notes.length > 0 && <div className="rp-note">{x.notes.join(' / ')}</div>}</div>)}</div>
    </div> }
    if (k === 'days') { if (!d.days.some((x) => x.m)) return null; const per = d.dayGoal || 0, dm = Math.max(60, per, ...d.days.map((x) => x.m)); return <div className="rp-chart">
      <div className="rp-plot" style={{ gap: d.days.length > 20 ? 2 : 6 }}>{per > 0 && <span className="wbars-goal" style={{ bottom: (per / dm) * 100 + '%' }} />}{d.days.map((x) => <div key={x.d} className="rp-col" title={`${fmtShort(x.d)} ${fmtDur(x.m)}`}>{d.days.length <= 7 && x.m > 0 && <span className="wbar-v">{hl(x.m)}</span>}<i className="wbar-b" style={{ height: Math.max(x.m ? 3 : 0, (x.m / dm) * 100) + '%', width: d.days.length > 20 ? 5 : 8, opacity: x.m >= per ? 1 : 0.7 }} /></div>)}</div>
      <div className="wbars-l" style={{ gap: d.days.length > 20 ? 2 : 6 }}>{d.days.map((x) => <span key={x.d} style={{ overflow: 'visible', whiteSpace: 'nowrap' }}>{x.l}</span>)}</div>
    </div> }
    if (k === 'cal') return d.cal ? <MonthHeat values={d.cal.values} goal={d.cal.goal} weekStartDow={d.cal.weekStartDow} fixed={d.cal.month} color="var(--text)" /> : null
    if (k === 'hours' && d.slots) return d.hours.some(Boolean) ? <TenGrid slots={d.slots} /> : null
    if (k === 'hours') return d.hours.some(Boolean) ? <div className="rp-chart"><div className="rp-plot" style={{ gap: 3, height: 56 }}>{d.hours.map((m, i) => <div key={i} className="rp-col" title={`${i + 6}시 ${m}분`}><i className="wbar-b" style={{ width: '100%', maxWidth: 10, height: Math.max(m ? 3 : 0, (m / mx) * 100) + '%', opacity: 0.45 + 0.55 * (m / mx) }} /></div>)}</div><div className="row between tiny muted" style={{ marginTop: 4 }}><span>6시</span><span>12시</span><span>18시</span><span>24시</span></div></div> : null
    return null
  }
  return (
    <div className="col rp" style={{ '--rp-hand': reportFamily(fontKey), '--rp-hs': reportScale(fontKey) }}>
      <Seg value={mode} onChange={setMode} options={MODES} />
      {edit && (
        <div className="col rp-edit">
          <div className="tiny muted">보여 줄 항목을 켜고 순서를 정해요 (공유·인쇄도 같아요)</div>
          {secs.map((k, i) => <div key={k} className="row small" style={{ gap: 6 }}><span className="grow">{i + 1}. {allOf(mode).find(([x]) => x === k)[1]}</span><button className="icon-btn" aria-label="위로" onClick={() => move(i, -1)}>‹</button><button className="icon-btn" aria-label="아래로" onClick={() => move(i, 1)}>›</button><button className="chip on" onClick={() => setSecs(secs.filter((x) => x !== k))}>끄기</button></div>)}
          <div className="row wrap" style={{ gap: 6 }}>{allOf(mode).filter(([k]) => !secs.includes(k)).map(([k, l]) => <button key={k} className="chip" onClick={() => setSecs([...secs, k])}>+ {l}</button>)}</div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}><span className="tiny muted nowrap">글꼴</span><select className="input" value={fontKey} onChange={(e) => setSettings({ reportFont: e.target.value })} style={{ fontFamily: reportFamily(fontKey) }}>{reportFontOptions().map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}><span className="tiny muted">이미지 비율</span>{[['tall', '세로형'], ['square', '정사각형']].map(([k, l]) => <button key={k} className={'chip' + ((st.reportSize || 'tall') === k ? ' on' : '')} onClick={() => setSettings({ reportSize: k })}>{l}</button>)}</div>
          <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}><span className="tiny muted">이미지 색</span>{REPORT_THEMES.map(([k, l]) => <button key={k} className={'chip' + (theme === k ? ' on' : '')} onClick={() => setSettings({ reportTheme: k })}>{l}</button>)}</div>
        </div>
      )}
      {/* 흑백 인쇄풍 한 장: 모눈 종이 위에 가는 테두리 표 · 채도 낮은 포인트 색 조금 */}
      <div className="rp-paper rp-sheet">
        <div className="rp-head">
          <div className="rp-dt">
            <span className="rp-kicker">{NAME_EN[mode]}</span>
            <span className="rp-date">{mode === 'day' ? dayTitle(date) : label(d)}</span>
          </div>
          <div className="rp-nav">
            <button className="icon-btn" onClick={() => step(-1)} aria-label="이전"><Icon name="back" size={15} /></button>
            <button className="icon-btn" disabled={nextOff} onClick={() => step(1)} aria-label="다음"><Icon name="next" size={15} /></button>
          </div>
        </div>
        {!secs.includes('dday') && d.ddays.length > 0 && <SheetTable k="dday" d={d} i={1} s={sheetOf('dday', d)} />}
        {secs.map((k, i) => {
          if (k === 'study') return <section key={k} className={'sh hc' + (i % 3)}><div className="sh-h"><b>STUDY</b><em>{title(k, d)}</em></div>{body(k)}</section>
          if (CHARTS.has(k)) { const b = body(k); return b && <section key={k} className={'sh hc' + (i % 3)}><div className="sh-h"><b>{EN[k]}</b><em>{title(k, d)}</em></div><div className="sh-b">{b}</div></section> }
          const sh = sheetOf(k, d); return sh && <SheetTable key={k} k={k} d={d} i={i} s={sh} />
        })}
        {secs.every((k) => k !== 'study' && !(CHARTS.has(k) ? body(k) : sheetOf(k, d))) && <div className="small muted" style={{ padding: '18px 0', textAlign: 'center' }}>기록이 없어요.</div>}
      </div>
      <div className="rp-actions">
        <button className={'btn ghost sm' + (edit ? ' on-acc' : '')} onClick={() => setEdit(!edit)}><Icon name="layers" size={14} />구성</button>
        <button className="btn ghost sm" onClick={share}><Icon name="share" size={14} />텍스트</button>
        <button className="btn ghost sm" onClick={async () => { const blob = await drawReport(d, secs, lines, title, { theme, head: { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY' }[mode] + ' REPORT', dateTxt: mode === 'day' ? undefined : label(d), square: st.reportSize === 'square', fontKey: st.reportFont || '', barScale: { thin: 0.6, thick: 1.6 }[st.theme?.chartBar] || 1, sheetOf, EN }); const r = await shareBlob(blob, `리포트-${mode === 'day' ? date : d.from}.png`); if (r === 'saved') toast('이미지를 저장했어요') }}><Icon name="image" size={14} />이미지</button>
        <button className="btn ghost sm" onClick={() => printA4(d, secs, st.reportFont || '')}><Icon name="print" size={14} />A4</button>
      </div>
    </div>
  )
}
