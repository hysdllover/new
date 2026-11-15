// 할 일 하나의 하위 목록: A4 체크리스트 인쇄 · 이미지(PNG) 저장 — 흑백 · 얇은 선 · 네모 체크
import { list } from '../store/store.js'
import { today } from '../engine/date.js'
import { shareBlob } from './shareCard.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const md = (k) => (k ? `${+k.slice(5, 7)}.${String(+k.slice(8)).padStart(2, '0')}` : '')
const subjOf = (t) => list('subjects').find((s) => s.id === t.subjectId)
const order = (t) => { const L = t.subtasks || []; return [...L.filter((s) => s.star), ...L.filter((s) => !s.star)] }

const CSS = `
.sp { font-family: -apple-system, 'Apple SD Gothic Neo', sans-serif; color: #2f3640; font-weight: 300; }
.sp-page { width: 186mm; min-height: 270mm; box-sizing: border-box; padding: 4mm 2mm; }
.sp-top { display: flex; align-items: baseline; gap: 10px; border-bottom: .6pt solid #2f3640; padding-bottom: 3mm; }
.sp-top b { font-size: 16pt; font-weight: 400; letter-spacing: .02em; flex: 1; }
.sp-top span { font-size: 8pt; letter-spacing: .14em; color: #6b7380; }
.sp-meta { display: flex; gap: 14px; font-size: 8pt; color: #6b7380; letter-spacing: .06em; margin: 2.5mm 0 1mm; }
.sp-bar { height: 1.2pt; background: #d9dde3; margin: 2mm 0 5mm; position: relative; }
.sp-bar i { position: absolute; left: 0; top: 0; bottom: 0; background: #4a5568; }
.sp-row { display: flex; align-items: center; gap: 4mm; min-height: 9.5mm; border-bottom: .4pt solid #c9ced6; font-size: 11pt; }
.sp-row .bx { width: 4mm; height: 4mm; border: .7pt solid #2f3640; flex-shrink: 0; position: relative; }
.sp-row.done .bx::after { content: ''; position: absolute; left: 1.2mm; top: .1mm; width: 1.2mm; height: 2.5mm; border: solid #2f3640; border-width: 0 .8pt .8pt 0; transform: rotate(42deg); }
.sp-row .tt { flex: 1; }
.sp-row.done .tt { color: #8a919c; text-decoration: line-through; text-decoration-thickness: .5pt; }
.sp-row.star .tt { font-weight: 500; }
.sp-row em { font-style: normal; font-size: 8pt; color: #6b7380; letter-spacing: .06em; }
.sp-blank { min-height: 9.5mm; border-bottom: .4pt solid #e1e4e9; }
.sp-foot { margin-top: 6mm; font-size: 7.5pt; color: #8a919c; letter-spacing: .14em; }
`

function build(t) {
  const L = order(t), n = L.filter((s) => s.done).length, sb = subjOf(t)
  const rows = L.map((s) => `<div class="sp-row${s.done ? ' done' : ''}${s.star ? ' star' : ''}"><i class="bx"></i><span class="tt">${esc(s.title)}</span>${s.due ? `<em>${md(s.due)}</em>` : ''}</div>`).join('')
  const blanks = '<div class="sp-blank"></div>'.repeat(Math.max(0, 24 - L.length))
  const meta = [sb ? esc(sb.name) : '', t.due ? 'DUE ' + md(t.due) : '', `${n} / ${L.length}`].filter(Boolean).map((x) => `<span>${x}</span>`).join('')
  return `<div class="sp-top"><b>${esc(t.title || '할 일')}</b><span>CHECKLIST</span></div><div class="sp-meta">${meta}</div><div class="sp-bar"><i style="width:${L.length ? (n / L.length) * 100 : 0}%"></i></div>${rows}${blanks}<div class="sp-foot">${md(today())}</div>`
}

export function printSubs(t) {
  if (!t) return
  const el = document.createElement('div'); el.id = 'print-area'; el.className = 'sp'
  el.innerHTML = `<style>${CSS}@page { size: A4 portrait; margin: 12mm; }</style><div class="sp-page">${build(t)}</div>`
  document.getElementById('print-area')?.remove()
  document.body.appendChild(el); document.body.classList.add('print-area')
  const done = () => { el.remove(); document.body.classList.remove('print-area'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  setTimeout(() => { window.print(); setTimeout(done, 1500) }, 80)
}

// 이미지: 캔버스에 직접 (흰 바탕 · 먹색 · 네모 체크) — 폭 1080, 줄 수만큼 길이
export async function saveSubsImage(t) {
  if (!t) return
  const L = order(t), n = L.filter((s) => s.done).length, sb = subjOf(t)
  const W = 1080, P = 80, RH = 74, top = 250, H = Math.max(900, top + L.length * RH + 140)
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d'), ink = '#2f3640', soft = '#8a919c', rule = '#d4d8de', F = "-apple-system, 'Apple SD Gothic Neo', sans-serif"
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
  g.fillStyle = ink; g.font = `300 46px ${F}`; g.textBaseline = 'alphabetic'
  const fit = (s, max, font) => { g.font = font; let x = s; while (x.length > 1 && g.measureText(x).width > max) x = x.slice(0, -1); return x === s ? s : x.slice(0, -1) + '…' }
  g.fillText(fit(t.title || '할 일', W - P * 2 - 180, `300 46px ${F}`), P, 120)
  g.fillStyle = soft; g.font = `400 20px ${F}`; g.textAlign = 'right'; g.fillText('CHECKLIST', W - P, 120); g.textAlign = 'left'
  g.fillStyle = ink; g.fillRect(P, 142, W - P * 2, 1.4)
  g.fillStyle = soft; g.font = `300 22px ${F}`
  g.fillText([sb?.name, t.due ? 'DUE ' + md(t.due) : '', `${n} / ${L.length}`].filter(Boolean).join('    '), P, 188)
  g.fillStyle = rule; g.fillRect(P, 212, W - P * 2, 2.4); g.fillStyle = '#4a5568'; g.fillRect(P, 212, (W - P * 2) * (L.length ? n / L.length : 0), 2.4)
  L.forEach((s, i) => {
    const y = top + i * RH, cy = y + RH / 2
    g.strokeStyle = ink; g.lineWidth = 1.6; g.strokeRect(P + 1, cy - 14, 28, 28)
    if (s.done) { g.beginPath(); g.moveTo(P + 7, cy); g.lineTo(P + 13, cy + 7); g.lineTo(P + 24, cy - 9); g.stroke() }
    const ft = `${s.star ? 500 : 300} 30px ${F}`
    g.fillStyle = s.done ? soft : ink
    const tt = fit(s.title || '', W - P * 2 - 70 - (s.due ? 110 : 0), ft); g.font = ft; g.fillText(tt, P + 56, cy + 10)
    if (s.done) { const tw = g.measureText(tt).width; g.fillRect(P + 56, cy, tw, 1.2) }
    if (s.due) { g.fillStyle = soft; g.font = `300 22px ${F}`; g.textAlign = 'right'; g.fillText(md(s.due), W - P, cy + 8); g.textAlign = 'left' }
    g.fillStyle = rule; g.fillRect(P, y + RH, W - P * 2, 1)
  })
  g.fillStyle = soft; g.font = `400 18px ${F}`; g.fillText(md(today()), P, H - 60)
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  if (!blob) throw new Error('image')
  return shareBlob(blob, `체크리스트-${(t.title || '할 일').slice(0, 20)}.png`)
}
