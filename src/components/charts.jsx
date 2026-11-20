// 그래프: 7일 막대 · 점수 추이 선 · 한 달 칸 — 각진 점 · 가는 선 (필기 느낌이면 선을 살짝 부드럽게)
import { hm, parseYmd, WD, today, fmtShort } from '../lib/date.js'

export function Bars7({ days, mins, goal }) {
  const mx = Math.max(goal || 0, ...days.map((d) => mins[d] || 0), 1), t0 = today()
  return (
    <div className="bars" role="img" aria-label="최근 7일 공부 시간">
      {days.map((d) => {
        const v = mins[d] || 0
        return (
          <div key={d} className={d === t0 ? 'today' : ''} title={hm(v)}>
            <span className="num">{v ? hm(v) : ''}</span>
            <b style={{ height: (v / mx) * 100 + '%' }} />
            <span>{WD[parseYmd(d).getDay()]}</span>
          </div>
        )
      })}
    </div>
  )
}

// 점수 추이: points [{ date, total }] · target · pass · max
export function ScoreChart({ points, target, pass, max, color = 'var(--accent)' }) {
  const W = 320, H = 130, L = 30, R = 10, T = 14, B = 20
  if (!points.length) return null
  const vals = points.map((p) => p.total), lo0 = Math.min(...vals, target ?? Infinity, pass ?? Infinity), hi0 = Math.max(...vals, target ?? -Infinity, pass ?? -Infinity)
  const pad = Math.max(5, (hi0 - lo0) * 0.15), lo = Math.max(0, Math.floor((lo0 - pad) / 5) * 5), hi = Math.min(max, Math.ceil((hi0 + pad) / 5) * 5)
  const x = (i) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1)), y = (v) => T + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - T - B)
  const hand = typeof document !== 'undefined' && document.documentElement.hasAttribute('data-hand')
  let d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ')
  if (hand && points.length > 2) { // 부드러운 곡선 (Catmull-Rom → 베지어)
    const P = points.map((p, i) => [x(i), y(p.total)])
    d = `M${P[0][0]} ${P[0][1]}` + P.slice(1).map((p, i) => { const p0 = P[i - 1] || P[i], p1 = P[i], p3 = P[i + 2] || p; return ` C${p1[0] + (p[0] - p0[0]) / 6} ${p1[1] + (p[1] - p0[1]) / 6} ${p[0] - (p3[0] - p1[0]) / 6} ${p[1] - (p3[1] - p1[1]) / 6} ${p[0]} ${p[1]}` }).join('')
  }
  const hl = (v, label, dash) => v != null && v >= lo && v <= hi && <g><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--soft)" strokeWidth=".7" strokeDasharray={dash} /><text x={W - R} y={y(v) - 3} textAnchor="end">{label} {v}</text></g>
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="점수 추이">
      <text x={L - 6} y={y(hi) + 3} textAnchor="end">{hi}</text><text x={L - 6} y={y(lo) + 3} textAnchor="end">{lo}</text>
      {hl(target, '목표', '3 3')}{hl(pass, '합격', '1 3')}
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      {points.map((p, i) => <g key={i}><rect x={x(i) - 2.5} y={y(p.total) - 2.5} width="5" height="5" fill={p.real ? color : 'var(--surface)'} stroke={color} strokeWidth="1" /><text className="val" x={x(i)} y={y(p.total) - 6} textAnchor="middle">{p.total}</text><text x={x(i)} y={H - 4} textAnchor="middle">{fmtShort(p.date)}</text></g>)}
    </svg>
  )
}

// 한 달 칸: 공부한 만큼 진하게
export function MonthGrid({ month, mins, goal, weekStart = 1 }) {
  const [y, m] = month.split('-').map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate()
  const lead = (first.getDay() - weekStart + 7) % 7, t0 = today()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  const wd = Array.from({ length: 7 }, (_, i) => WD[(i + weekStart) % 7])
  return (
    <div className="mgrid">
      {wd.map((w) => <span key={w} className="mg-h">{w}</span>)}
      {cells.map((k, i) => k ? <span key={k} className={'mg-c' + (k === t0 ? ' today' : '') + ((mins[k] || 0) / Math.max(goal, 1) > 0.5 ? ' dk' : '')} title={hm(mins[k] || 0)} style={{ '--a': mins[k] ? Math.min(1, 0.18 + 0.82 * (mins[k] / Math.max(goal, 1))) : 0 }}><i>{+k.slice(8)}</i></span> : <span key={'e' + i} />)}
    </div>
  )
}
