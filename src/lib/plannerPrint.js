// 흑백 인쇄풍 A4 플래너: 월간(가로) · 주간(세로) — 내 일정·시간표·할 일·D-day·목표를 채우거나 빈 양식으로
// 위젯의 DAILY SHEET 처럼 테두리선만 · 먹색 한 가지 · 작고 얇은 글씨 / 인쇄 · 이미지(PNG) · HTML 파일
import { list, settings } from '../store/store.js'
import { eventsOn, classesOn } from '../engine/scheduler.js'
import { monthStart, weekStart, addDays, parseYmd, today } from '../engine/date.js'
import { holiday } from '../engine/holidays.js'
import { goalFor } from '../engine/goal.js'
import { weekGoals, weekId } from '../store/actions.js'
import { shareBlob } from './shareCard.js'

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const pad = (n) => String(n).padStart(2, '0')
const hm = (m) => `${Math.floor(m / 60)}:${pad(m % 60)}`
const clk = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
const md = (k) => `${+k.slice(5, 7)}.${pad(+k.slice(8))}`

// 그날 채울 줄: D-day · 종일 · 시간 일정 · 할 일 (수업은 한 줄로 묶음)
function dayItems(k, { tasks, ddays, withClasses }) {
  const out = []
  for (const x of ddays) if (x.date === k) out.push({ t: x.title, k: 'dd' })
  const evs = eventsOn(k)
  for (const e of evs.filter((e) => e.start == null)) out.push({ t: e.title, k: 'ev' })
  for (const e of evs.filter((e) => e.start != null).sort((a, b) => a.start - b.start)) out.push({ t: e.title, k: 'ev', at: clk(e.start) })
  if (withClasses) { const cl = classesOn(k); if (cl.length) out.push({ t: cl.map((c) => c.title).join(' · '), k: 'cl', at: `${cl[0].period}–${cl[cl.length - 1].period}교시` }) }
  for (const t of tasks.filter((t) => t.due === k)) out.push({ t: t.title, k: 'tk', done: t.done })
  return out
}
const line = (x) => `<div class="pp-it pp-${x.k}${x.done ? ' done' : ''}">${x.k === 'tk' ? `<i class="bx${x.done ? ' on' : ''}"></i>` : x.k === 'dd' ? '<i class="dm"></i>' : ''}${x.at ? `<em>${esc(x.at)}</em>` : ''}<span>${esc(x.t)}</span></div>`
const lines = (its, cap) => its.slice(0, cap).map(line).join('') + (its.length > cap ? `<div class="pp-it pp-more"><em>+${its.length - cap}</em></div>` : '')

// 줄 수 나누기: 줄(행)마다 필요한 높이를 더해 쪽을 넘으면 가장 많은 행부터 한 줄씩 줄임
function fitCaps(need, budget, base, per, max) {
  const cap = need.map((n) => Math.min(n, max))
  const sum = () => cap.reduce((a, n) => a + base + n * per, 0)
  while (sum() > budget) { const i = cap.indexOf(Math.max(...cap)); if (cap[i] <= 1) break; cap[i]-- }
  return cap
}

const INK = '#2b2f36', SUB = '#6b7079', HAIR = '#c3c7ce'
const CSS = `
#print-area.pp, .pp { font-family: -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: ${INK}; font-weight: 300; font-size: 8.5pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pp * { box-sizing: border-box; margin: 0; }
.pp-page { width: 297mm; height: 210mm; padding: 10mm 12mm; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
.pp-page.port { width: 210mm; height: 297mm; }
.pp-page.prn { width: auto; height: 189mm; padding: 0; }
.pp-page.prn.port { height: 276mm; }
.pp-top { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 1.4mm; border-bottom: .35mm solid ${INK}; margin-bottom: 3mm; flex-shrink: 0; }
.pp-top b { font-weight: 400; letter-spacing: .32em; font-size: 9.5pt; }
.pp-top span { letter-spacing: .16em; font-size: 8.5pt; }
.pp-cap { font-size: 6.5pt; letter-spacing: .2em; color: ${SUB}; margin-bottom: .6mm; }
.pp-it { display: flex; gap: 1.2mm; align-items: baseline; white-space: nowrap; overflow: hidden; font-weight: 400; min-width: 0; }
.pp-it span { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.pp-it em { font-style: normal; font-weight: 300; color: ${SUB}; font-size: .86em; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.pp-it.done span { text-decoration: line-through; color: #8a8e96; }
.pp-it .bx { width: 2.3mm; height: 2.3mm; border: .2mm solid ${INK}; flex-shrink: 0; align-self: center; }
.pp-it .bx.on { background: ${INK}; }
.pp-it .dm { width: 1.7mm; height: 1.7mm; background: ${INK}; transform: rotate(45deg); flex-shrink: 0; align-self: center; margin: 0 .3mm; }
.pp-dd span { font-weight: 500; }
.pp-cl span, .pp-cl em { color: ${SUB}; font-weight: 300; }
.pp-lines { background: repeating-linear-gradient(to bottom, transparent 0 calc(6mm - .15mm), ${HAIR} calc(6mm - .15mm) 6mm); }
/* 위 칸 띠: 목표 · D-day · 공부 */
.pp-strip { display: grid; border: .3mm solid ${INK}; margin-bottom: 3mm; flex-shrink: 0; }
.pp-strip > div { padding: 1.6mm 2.4mm; min-width: 0; }
.pp-strip > div + div { border-left: .2mm solid ${HAIR}; }
.pp-strip .v { font-size: 12pt; font-weight: 200; line-height: 1.2; }
.pp-strip .v small { font-size: 7.5pt; color: ${SUB}; margin-left: 1mm; }
.pp-n { display: grid; grid-template-columns: 4mm 1fr; align-items: end; height: 5mm; border-bottom: .15mm solid ${HAIR}; white-space: nowrap; overflow: hidden; }
.pp-n:last-child { border-bottom: 0; }
.pp-n i { font-style: normal; color: ${SUB}; font-size: 7pt; }
.pp-n span { overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
/* 월간 */
.ppm-cal { flex: 1; min-height: 0; overflow: hidden; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); align-content: stretch; border: .3mm solid ${INK}; }
.ppm-cal > div { border-left: .2mm solid ${HAIR}; border-top: .2mm solid ${HAIR}; padding: .9mm 1.3mm 1mm; min-width: 0; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: .3mm; font-size: 8.3pt; }
.ppm-cal > div:nth-child(7n+1) { border-left: 0; }
.ppm-cal > .wd { border-top: 0; border-bottom: .3mm solid ${INK}; font-size: 6.5pt; letter-spacing: .2em; color: ${SUB}; justify-content: center; padding: 0 1.3mm; }
.ppm-cal > div:nth-child(-n+14) { border-top: 0; }
.ppm-cal .dn { display: flex; gap: 1.2mm; align-items: baseline; font-size: 9.5pt; line-height: 1.25; }
.ppm-cal .dn s { text-decoration: none; font-size: 6.5pt; color: ${SUB}; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: 1; }
.ppm-cal .dn em { font-style: normal; font-size: 7pt; color: ${SUB}; margin-left: auto; font-variant-numeric: tabular-nums; }
.ppm-cal .out .dn { color: #b4b8bf; }
.ppm-cal .today .dn b { font-weight: 600; }
/* 주간: 2단 × 4칸 (7일 + 메모) */
.ppw { flex: none; min-height: 0; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; align-content: stretch; border: .3mm solid ${INK}; }
.ppw > div { border-top: .2mm solid ${HAIR}; padding: 1.6mm 2.6mm 2mm; display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; font-size: 9pt; }
.ppw > div:nth-child(-n+2) { border-top: 0; }
.ppw > div:nth-child(2n) { border-left: .2mm solid ${HAIR}; }
.ppw-h { display: flex; gap: 1.5mm; align-items: baseline; padding-bottom: .9mm; border-bottom: .2mm solid ${INK}; margin-bottom: 1.2mm; white-space: nowrap; }
.ppw-h b { font-weight: 400; letter-spacing: .2em; font-size: 7.5pt; }
.ppw-h span { font-size: 10pt; }
.ppw-h s { text-decoration: none; font-size: 7pt; color: ${SUB}; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.ppw-h em { font-style: normal; font-size: 7.5pt; color: ${SUB}; margin-left: auto; font-variant-numeric: tabular-nums; }
.ppw-h em i { font-style: normal; color: ${INK}; }
.ppw .its { display: flex; flex-direction: column; gap: .5mm; }
.ppw.fill { flex: 1; }
.ppw .pp-lines, .ppw-notes .pp-lines { flex: 1; }
.ppw-notes { flex: 1; min-height: 0; display: flex; margin-top: 3mm; border: .3mm solid ${INK}; }
.ppw-notes > div { flex: 1; display: flex; flex-direction: column; padding: 1.6mm 2.6mm 2mm; }
`

// 쪽 내용(HTML) 만들기 — 인쇄 · 이미지 · HTML 이 같이 씀
function build(kind, date, blank) {
  const st = settings(), ws0 = st.weekStart ?? 1
  const tasks = blank ? [] : list('tasks').filter((t) => !t.archived)
  const ddays = blank ? [] : list('ddays')
  const byDay = {}; if (!blank) for (const s of list('sessions')) byDay[s.date] = (byDay[s.date] || 0) + (s.dur || 0)
  const t0 = today(), done = (k) => !blank && k <= t0 && byDay[k] ? hm(byDay[k]) : ''
  if (kind === 'month') {
    const ms = monthStart(date), m = parseYmd(ms).getMonth(), y = parseYmd(ms).getFullYear(), dim = new Date(y, m + 1, 0).getDate()
    const lead = (parseYmd(ms).getDay() - ws0 + 7) % 7, start = addDays(ms, -lead)
    const weeks = Math.ceil((lead + dim) / 7)
    const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
    const its = cells.map((k) => parseYmd(k).getMonth() === m && !blank ? dayItems(k, { tasks, ddays, withClasses: false }) : [])
    // 달력 높이 ≈ 189 − 머리 9 − 띠 22 − 요일 6 mm · 날짜 줄 6.4mm + 할 일 한 줄 4.3mm
    const caps = fitCaps(Array.from({ length: weeks }, (_, w) => Math.max(0, ...its.slice(w * 7, w * 7 + 7).map((x) => x.length))), 150, 6.4, 4.3, 9)
    // 내용 많은 주가 더 높게 (빈 주는 낮게)
    const rows = caps.map((c, w) => `minmax(0,${Math.max(18, 6.4 + 4.3 * Math.min(c + 1, Math.max(0, ...its.slice(w * 7, w * 7 + 7).map((x) => x.length))))}fr)`).join(' ')
    const cal = Array.from({ length: 7 }, (_, i) => `<div class="wd">${DAY[(i + ws0) % 7]}</div>`).join('') + cells.map((k, i) => {
      const inM = parseYmd(k).getMonth() === m, hol = inM ? holiday(k) : ''
      return `<div class="${inM ? '' : 'out'}${k === t0 && !blank ? ' today' : ''}"><div class="dn"><b>${+k.slice(8)}</b><s>${hol ? esc(hol) : ''}</s><em>${inM ? done(k) : ''}</em></div>${lines(its[i], caps[Math.floor(i / 7)] + (its[i].length === caps[Math.floor(i / 7)] + 1 ? 1 : 0))}</div>`
    }).join('')
    const dd = ddays.filter((x) => x.date >= t0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
    const dn = (x) => { const n = Math.round((parseYmd(x.date) - parseYmd(t0)) / 864e5); return n === 0 ? 'D-DAY' : 'D-' + n }
    const total = Object.entries(byDay).filter(([k]) => k.startsWith(ms.slice(0, 7))).reduce((a, [, v]) => a + v, 0)
    const mgoal = Array.from({ length: dim }, (_, i) => goalFor(st, addDays(ms, i))).reduce((a, v) => a + v, 0)
    const strip = `<div class="pp-strip" style="grid-template-columns:1.5fr 1.5fr 1fr">
      <div><div class="pp-cap">GOALS</div>${[1, 2, 3].map((i) => `<div class="pp-n"><i>${i}</i><span></span></div>`).join('')}</div>
      <div><div class="pp-cap">D-DAY</div>${[0, 1, 2].map((i) => { const x = dd[i]; return `<div class="pp-n" style="grid-template-columns:11mm 1fr"><i>${x ? dn(x) : ''}</i><span>${x ? esc(x.title) : ''}</span></div>` }).join('')}</div>
      <div><div class="pp-cap">STUDY</div><div class="v">${blank ? '　' : hm(total)}</div><div class="pp-n" style="grid-template-columns:1fr auto"><span>목표</span><i>${hm(mgoal)}</i></div></div>
    </div>`
    return { land: true, name: `플래너-${ms.slice(0, 7)}${blank ? '-빈양식' : ''}`, html: `<div class="pp-top"><b>MONTHLY PLANNER</b><span>${y} · ${MON[m]}</span></div>${strip}
      <div class="ppm-cal" style="grid-template-rows:6mm ${rows}">${cal}</div>` }
  }
  const ws = weekStart(date, ws0), days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const tot = blank ? 0 : days.filter((k) => k <= t0).reduce((a, k) => a + (byDay[k] || 0), 0)
  const wgoal = days.reduce((a, k) => a + goalFor(st, k), 0)
  const goals = blank ? [] : weekGoals(weekId(ws)).slice(0, 3)
  const its = days.map((k) => blank ? [] : dayItems(k, { tasks, ddays, withClasses: true }))
  // 날짜 없는 할 일: 여덟째 칸 (빈 양식이면 메모)
  const later = tasks.filter((t) => !t.done && !t.due).map((t) => ({ t: t.title, k: 'tk' }))
  its.push(later)
  // 칸 높이 ≈ 276 − 머리 9 − 띠 22 mm (채우기면 아래 메모 칸 26mm) · 머리 줄 8.6mm + 한 줄 4.9mm
  const need = [0, 1, 2, 3].map((r) => Math.max(0, ...its.slice(r * 2, r * 2 + 2).map((x) => x.length)))
  const caps = fitCaps(need, blank ? 240 : 212, 9, 4.9, 16)
  const rows = blank ? 'repeat(4,1fr)' : caps.map((c) => `${Math.max(44, 9 + 4.9 * c).toFixed(1)}mm`).join(' ')
  const strip = `<div class="pp-strip" style="grid-template-columns:1fr 1fr 2.2fr">
    <div><div class="pp-cap">WEEK GOAL</div><div class="v">${hm(wgoal)}</div></div>
    <div><div class="pp-cap">STUDY</div><div class="v">${blank ? '　' : hm(tot)}${!blank && wgoal ? `<small>${Math.round((tot / wgoal) * 100)}%</small>` : ''}</div></div>
    <div><div class="pp-cap">THIS WEEK</div>${[0, 1, 2].map((i) => `<div class="pp-n"><i>${i + 1}</i><span>${goals[i] ? esc(goals[i].title) : ''}</span></div>`).join('')}</div>
  </div>`
  const notes = '<div><div class="ppw-h"><b>NOTES</b></div><div class="pp-lines"></div></div>'
  const cell = (k, i) => {
    const d = parseYmd(k), hol = holiday(k), cap = caps[Math.floor(i / 2)]
    return `<div><div class="ppw-h"><b>${DAY[d.getDay()]}</b><span>${md(k)}</span><s>${hol ? esc(hol) : ''}</s><em><i>${done(k)}</i>${done(k) ? ' / ' : ''}${hm(goalFor(st, k))}</em></div>
      ${its[i].length ? `<div class="its">${lines(its[i], cap + (its[i].length === cap + 1 ? 1 : 0))}</div>` : ''}${blank ? '<div class="pp-lines"></div>' : ''}</div>`
  }
  return { land: false, name: `플래너-${ws}-주간${blank ? '-빈양식' : ''}`, html: `<div class="pp-top"><b>WEEKLY PLANNER</b><span>${md(days[0])} – ${md(days[6])}</span></div>${strip}
    <div class="ppw${blank ? ' fill' : ''}" style="grid-template-rows:${rows}">${days.map(cell).join('')}${blank ? notes
      : `<div><div class="ppw-h"><b>LATER</b><s>날짜 없는 할 일</s></div>${later.length ? `<div class="its">${lines(later, caps[3] + (later.length === caps[3] + 1 ? 1 : 0))}</div>` : ''}</div>`}</div>
    ${blank ? '' : `<div class="ppw-notes">${notes}</div>`}` }
}

// 인쇄 — kind: 'month' | 'week', blank: 빈 양식(날짜만)
export function printPlanner(kind, date, { blank = false } = {}) {
  const { html, land } = build(kind, date, blank)
  const el = document.createElement('div'); el.id = 'print-area'; el.className = 'pp'
  el.innerHTML = `<style>${CSS}@page { size: A4 ${land ? 'landscape' : 'portrait'}; margin: 10mm 12mm; }</style><div class="pp-page prn${land ? '' : ' port'}">${html}</div>`
  document.getElementById('print-area')?.remove()
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 80)
}

// HTML 파일 한 장: 화면에선 A4 한 쪽 그대로, 인쇄하면 A4 에 맞춤
export function plannerHtml(kind, date, { blank = false } = {}) {
  const { html, land, name } = build(kind, date, blank)
  const doc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=${land ? 1170 : 840}"><title>${esc(name)}</title><style>${CSS}
@page { size: A4 ${land ? 'landscape' : 'portrait'}; margin: 10mm 12mm; }
html, body { margin: 0; background: #eef0f3; } body { padding: 20px; } .pp-page { margin: 0 auto; border: 1px solid #dde0e5; }
@media print { html, body { background: #fff; padding: 0; } .pp-page { width: auto; height: ${land ? 189 : 276}mm; padding: 0; border: 0; } }
</style></head><body class="pp"><div class="pp-page${land ? '' : ' port'}">${html}</div></body></html>`
  return { blob: new Blob([doc], { type: 'text/html' }), name: name + '.html' }
}

// PNG 이미지: 같은 HTML 을 SVG foreignObject 로 그려 A4 300dpi 가까이(3배)
export async function plannerImage(kind, date, { blank = false } = {}) {
  const { html, land, name } = build(kind, date, blank)
  const W = land ? 1123 : 794, H = land ? 794 : 1123, S = 3
  const box = document.createElement('div'); box.className = 'pp'
  box.innerHTML = `<style>${CSS}</style><div class="pp-page${land ? '' : ' port'}">${html}</div>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${new XMLSerializer().serializeToString(box)}</foreignObject></svg>`
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('image')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) })
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S
  const g = c.getContext('2d'); g.scale(S, S)
  const draw = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H) }
  draw(); await new Promise((r) => setTimeout(r, 120)); draw() // 사파리는 첫 그리기에 글자가 빠질 때가 있어 한 번 더
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  if (!blob) throw new Error('image')
  return { blob, name: name + '.png' }
}

// 저장(공유 시트 · 내려받기) — how: 'image' | 'html'
export async function savePlanner(how, kind, date, opts) {
  const { blob, name } = how === 'html' ? plannerHtml(kind, date, opts) : await plannerImage(kind, date, opts)
  return shareBlob(blob, name)
}
