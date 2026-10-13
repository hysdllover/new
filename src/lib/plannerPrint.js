// 흑백 인쇄풍 A4 플래너: 월간(가로) · 주간(세로) — 내 일정·시간표·할 일·D-day·목표를 채우거나 빈 양식으로
// 위젯의 DAILY SHEET 처럼 테두리선만 · 먹색 한 가지 · 작고 얇은 글씨
import { list, settings } from '../store/store.js'
import { eventsOn, classesOn } from '../engine/scheduler.js'
import { monthStart, weekStart, addDays, parseYmd, today } from '../engine/date.js'
import { holiday } from '../engine/holidays.js'
import { goalFor } from '../engine/goal.js'
import { weekGoals, weekId } from '../store/actions.js'

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

const CSS = `
#print-area.pp { font-family: -apple-system, "Apple SD Gothic Neo", sans-serif; color: #2b2f36; font-weight: 300; font-size: 8pt; line-height: 1.35; }
.pp * { box-sizing: border-box; }
.pp-top { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 1.6mm; border-bottom: .5mm solid #2b2f36; margin-bottom: .6mm; }
.pp-top + .pp-rule { border-top: .2mm solid #2b2f36; margin-bottom: 3mm; }
.pp-top b { font-weight: 400; letter-spacing: .32em; font-size: 9pt; }
.pp-top span { letter-spacing: .18em; font-size: 8pt; }
.pp-cap { font-size: 6.5pt; letter-spacing: .2em; color: #6f747d; }
.pp-box { border: .25mm solid #2b2f36; }
.pp-it { display: flex; gap: 1.2mm; align-items: baseline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 7.2pt; }
.pp-it span { overflow: hidden; text-overflow: ellipsis; }
.pp-it em { font-style: normal; color: #6f747d; font-size: 6.4pt; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.pp-it.done span { text-decoration: line-through; color: #8a8e96; }
.pp-it .bx { width: 2.2mm; height: 2.2mm; border: .2mm solid #2b2f36; flex-shrink: 0; align-self: center; }
.pp-it .bx.on { background: #2b2f36; }
.pp-it .dm { width: 1.6mm; height: 1.6mm; background: #2b2f36; transform: rotate(45deg); flex-shrink: 0; align-self: center; }
.pp-dd span { font-weight: 500; }
.pp-cl span { color: #6f747d; }
.pp-lines { background: repeating-linear-gradient(to bottom, transparent 0 calc(5.2mm - .15mm), #c9ccd2 calc(5.2mm - .15mm) 5.2mm); }
/* 월간: 왼쪽 칸 띠 + 오른쪽 달력 */
.ppm { display: grid; grid-template-columns: 52mm 1fr; gap: 4mm; height: 172mm; }
.ppm-side { display: flex; flex-direction: column; gap: 3mm; min-height: 0; }
.ppm-side .pp-box { padding: 2mm 2.4mm; }
.ppm-side .fill { flex: 1; display: flex; flex-direction: column; }
.ppm-side .fill .pp-lines { flex: 1; margin-top: 1.5mm; }
.ppm-n { display: grid; grid-template-columns: 4mm 1fr; align-items: end; height: 6mm; border-bottom: .15mm solid #c9ccd2; font-size: 7.5pt; }
.ppm-n:last-child { border-bottom: 0; }
.ppm-n i { font-style: normal; color: #6f747d; font-size: 6.5pt; }
.ppm-cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-template-rows: 6mm; grid-auto-rows: 1fr; border-top: .25mm solid #2b2f36; border-left: .25mm solid #2b2f36; }
.ppm-cal > div { border-right: .25mm solid #2b2f36; border-bottom: .25mm solid #2b2f36; padding: 1mm 1.2mm; min-width: 0; overflow: hidden; display: flex; flex-direction: column; gap: .4mm; }
.ppm-cal .wd { font-size: 6.5pt; letter-spacing: .2em; color: #6f747d; justify-content: center; padding: 0 1.2mm; }
.ppm-cal .dn { display: flex; justify-content: space-between; align-items: baseline; font-size: 8.5pt; }
.ppm-cal .dn em { font-style: normal; font-size: 6.2pt; color: #6f747d; }
.ppm-cal .out .dn { color: #b4b8bf; }
.ppm-cal .today .dn b { font-weight: 600; }
.ppm-cal .hol { font-size: 6pt; color: #6f747d; }
/* 주간: 위 칸 띠 + 2단 × 4칸 (7일 + 메모) */
.ppw-strip { display: grid; grid-template-columns: 1fr 1fr 2.2fr; margin-bottom: 3mm; }
.ppw-strip > div { padding: 1.6mm 2.4mm; min-height: 13mm; }
.ppw-strip > div + div { border-left: .25mm solid #2b2f36; }
.ppw-strip .v { font-size: 11pt; font-weight: 200; margin-top: .5mm; }
.ppw-strip .g { font-size: 7.2pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ppw { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); height: 228mm; border-top: .25mm solid #2b2f36; border-left: .25mm solid #2b2f36; }
.ppw > div { border-right: .25mm solid #2b2f36; border-bottom: .25mm solid #2b2f36; padding: 1.6mm 2.4mm 2mm; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.ppw-h { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 1mm; border-bottom: .15mm solid #2b2f36; margin-bottom: 1mm; }
.ppw-h b { font-weight: 400; letter-spacing: .2em; font-size: 7.5pt; }
.ppw-h b span { letter-spacing: 0; font-size: 9pt; margin-left: 1.5mm; }
.ppw-h em { font-style: normal; font-size: 6.4pt; color: #6f747d; }
.ppw .its { display: flex; flex-direction: column; gap: .5mm; }
.ppw .pp-lines { flex: 1; margin-top: 1mm; min-height: 10mm; }
.ppw-st { display: flex; justify-content: space-between; align-items: center; border-top: .15mm solid #2b2f36; padding-top: 1mm; margin-top: 1mm; font-size: 6.5pt; color: #6f747d; letter-spacing: .12em; }
.ppw-st b { font-weight: 300; letter-spacing: 0; color: #2b2f36; font-size: 7.5pt; }
`

// 흑백 인쇄풍 A4 플래너 인쇄 — kind: 'month' | 'week', blank: 빈 양식(날짜만)
export function printPlanner(kind, date, { blank = false } = {}) {
  const st = settings(), ws0 = st.weekStart ?? 1
  const tasks = blank ? [] : list('tasks').filter((t) => !t.archived)
  const ddays = blank ? [] : list('ddays')
  const byDay = {}; if (!blank) for (const s of list('sessions')) byDay[s.date] = (byDay[s.date] || 0) + (s.dur || 0)
  const t0 = today()
  let body
  if (kind === 'month') {
    const ms = monthStart(date), m = parseYmd(ms).getMonth(), y = parseYmd(ms).getFullYear()
    const lead = (parseYmd(ms).getDay() - ws0 + 7) % 7, start = addDays(ms, -lead)
    const weeks = Math.ceil((lead + new Date(y, m + 1, 0).getDate()) / 7)
    const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
    const maxIt = weeks > 5 ? 4 : 5
    const cal = Array.from({ length: 7 }, (_, i) => `<div class="wd">${DAY[(i + ws0) % 7]}</div>`).join('') + cells.map((k) => {
      const inM = parseYmd(k).getMonth() === m, hol = holiday(k), its = inM && !blank ? dayItems(k, { tasks, ddays, withClasses: false }) : []
      const sm = inM && !blank && k <= t0 && byDay[k] ? hm(byDay[k]) : ''
      return `<div class="${inM ? '' : 'out'}${k === t0 && !blank ? ' today' : ''}"><div class="dn"><b>${+k.slice(8)}</b><em>${sm}</em></div>${hol && inM ? `<div class="hol">${esc(hol)}</div>` : ''}${its.slice(0, maxIt).map(line).join('')}${its.length > maxIt ? `<div class="pp-it"><em>+${its.length - maxIt}</em></div>` : ''}</div>`
    }).join('')
    const dd = ddays.filter((x) => x.date >= t0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
    const dn = (x) => { const n = Math.round((parseYmd(x.date) - parseYmd(t0)) / 864e5); return n === 0 ? 'D-DAY' : 'D-' + n }
    const total = Object.entries(byDay).filter(([k]) => k.startsWith(ms.slice(0, 7))).reduce((a, [, v]) => a + v, 0)
    const side = `<div class="ppm-side">
      <div class="pp-box"><div class="pp-cap">GOALS</div>${[1, 2, 3].map((i) => `<div class="ppm-n"><i>${i}</i><span></span></div>`).join('')}</div>
      <div class="pp-box"><div class="pp-cap">D-DAY</div>${(dd.length ? dd : [null, null, null]).map((x) => `<div class="ppm-n" style="grid-template-columns:11mm 1fr"><i>${x ? dn(x) : ''}</i><span>${x ? esc(x.title) : ''}</span></div>`).join('')}</div>
      <div class="pp-box"><div class="pp-cap">STUDY</div><div class="ppm-n" style="grid-template-columns:1fr auto"><span>이번 달</span><i>${blank ? '' : hm(total)}</i></div><div class="ppm-n" style="grid-template-columns:1fr auto"><span>하루 목표</span><i>${hm(st.goalDaily || 240)}</i></div></div>
      <div class="pp-box fill"><div class="pp-cap">NOTES</div><div class="pp-lines"></div></div>
    </div>`
    body = `<style>@page { size: A4 landscape; margin: 10mm 12mm; }</style><div class="pp-top"><b>MONTHLY PLANNER</b><span>${y} · ${MON[m]}</span></div><div class="pp-rule"></div>
      <div class="ppm">${side}<div class="ppm-cal" style="grid-template-rows:6mm repeat(${weeks},1fr)">${cal}</div></div>`
  } else {
    const ws = weekStart(date, ws0), days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
    const tot = blank ? 0 : days.filter((k) => k <= t0).reduce((a, k) => a + (byDay[k] || 0), 0)
    const wgoal = days.reduce((a, k) => a + goalFor(st, k), 0)
    const goals = blank ? [] : weekGoals(weekId(ws)).slice(0, 3)
    const strip = `<div class="pp-box ppw-strip">
      <div><div class="pp-cap">WEEK GOAL</div><div class="v">${hm(wgoal)}</div></div>
      <div><div class="pp-cap">STUDY</div><div class="v">${blank ? '' : hm(tot)}</div></div>
      <div><div class="pp-cap">THIS WEEK</div>${[0, 1, 2].map((i) => `<div class="g">${i + 1}  ${goals[i] ? esc(goals[i].title) : ''}</div>`).join('')}</div>
    </div>`
    const cell = (k) => {
      const d = parseYmd(k), hol = holiday(k), its = blank ? [] : dayItems(k, { tasks, ddays, withClasses: true })
      return `<div><div class="ppw-h"><b>${DAY[d.getDay()]}<span>${md(k)}</span></b><em>${hol ? esc(hol) : ''}</em></div>
        <div class="its">${its.slice(0, 9).map(line).join('')}${its.length > 9 ? `<div class="pp-it"><em>+${its.length - 9}</em></div>` : ''}</div>
        <div class="pp-lines"></div>
        <div class="ppw-st"><span>STUDY</span><b>${!blank && k <= t0 && byDay[k] ? hm(byDay[k]) : '　'} / ${hm(goalFor(st, k))}</b></div></div>`
    }
    body = `<style>@page { size: A4 portrait; margin: 10mm 12mm; }</style><div class="pp-top"><b>WEEKLY PLANNER</b><span>${md(days[0])} – ${md(days[6])}</span></div><div class="pp-rule"></div>
      ${strip}<div class="ppw">${days.map(cell).join('')}<div><div class="ppw-h"><b>NOTES</b><em></em></div><div class="pp-lines"></div></div></div>`
  }
  const el = document.createElement('div'); el.id = 'print-area'; el.className = 'pp'
  el.innerHTML = `<style>${CSS}</style>${body}`
  document.getElementById('print-area')?.remove()
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 80)
}
