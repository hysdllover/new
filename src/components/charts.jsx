import { addDays, diffDays, today, weekStart, fmtShort, parseYmd } from '../engine/date.js'

// 선 그래프: series = [{ points: [[x,y]], color, dash }], x 는 0..1 로 정규화된 값
export function LineChart({ series, height = 140, yMax, yMin = 0, labels = [], goal }) {
  const W = 320, H = height, P = 22
  const ys = series.flatMap((s) => s.points.map((p) => p[1]))
  const max = yMax ?? Math.max(1, ...ys)
  const sx = (x) => P + x * (W - P - 8)
  const sy = (y) => H - 18 - ((y - yMin) / (max - yMin || 1)) * (H - 30)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {[0, .5, 1].map((k) => { const v = yMin + (max - yMin) * k; return <g key={k}><line x1={P} x2={W - 8} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth=".6" /><text x={P - 4} y={sy(v) + 3} fontSize="8" fill="var(--muted)" textAnchor="end">{Math.round(v)}</text></g> })}
      {goal != null && <line x1={P} x2={W - 8} y1={sy(goal)} y2={sy(goal)} stroke="var(--c4)" strokeDasharray="3 3" strokeWidth="1" />}
      {series.map((s, i) => s.points.length > 0 && (
        <g key={i}>
          <polyline points={s.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.6" strokeDasharray={s.dash} strokeLinejoin="round" />
          {!s.dash && s.points.map(([x, y], j) => <circle key={j} cx={sx(x)} cy={sy(y)} r="2.2" fill={s.color} />)}
        </g>
      ))}
      {labels.map(([x, l], i) => <text key={i} x={sx(x)} y={H - 4} fontSize="8" fill="var(--muted)" textAnchor={x > .95 ? 'end' : x < .05 ? 'start' : 'middle'}>{l}</text>)}
    </svg>
  )
}

// 번다운: 남은 분량 (이상선 vs 실제)
export function Burndown({ plan, textbook }) {
  const start = plan.startDate, end = addDays(plan.examDate, -(plan.reviewDays || 0) - 1)
  const span = Math.max(1, diffDays(end, start))
  const total = plan.to - plan.from + 1
  const X = (d) => Math.min(1, Math.max(0, diffDays(d, start) / span))
  const hist = (textbook?.history || []).filter((h) => h.date >= start).sort((a, b) => a.date.localeCompare(b.date))
  const actual = [[0, total], ...hist.map((h) => [X(h.date), Math.max(0, plan.to - Math.max(plan.from - 1, h.value))])]
  const last = actual[actual.length - 1]
  // 현재 속도로 예측
  const elapsed = Math.max(1, diffDays(today(), start))
  const rate = (total - last[1]) / elapsed
  const daysNeed = rate > 0 ? last[1] / rate : Infinity
  const eta = isFinite(daysNeed) ? addDays(today(), Math.ceil(daysNeed)) : null
  const onTrack = eta && eta <= end
  return (
    <div>
      <LineChart height={130} yMax={total} series={[
        { points: [[0, total], [1, 0]], color: 'var(--muted)', dash: '4 3' },
        { points: actual, color: 'var(--accent)' },
      ]} labels={[[0, fmtShort(start)], [X(today()), '오늘'], [1, fmtShort(end)]]} />
      <div className="small" style={{ color: onTrack ? 'var(--ok)' : 'var(--danger)' }}>
        {last[1] === 0 ? '범위 완료 🎉' : eta ? (onTrack ? `지금 속도면 ${fmtShort(eta)} 완료 — 여유 있어요` : `지금 속도면 ${fmtShort(eta)} 완료 — 시험 전 복습일보다 늦어요`) : '아직 진도 기록이 없어요'}
      </div>
    </div>
  )
}

// 잔디 히트맵: values = { 'YYYY-MM-DD': number }
export function Heatmap({ values, weeks = 15, max, color = 'var(--c2)', onPick }) {
  const end = today()
  const start = addDays(weekStart(end, 0), -(weeks - 1) * 7)
  const m = max ?? Math.max(1, ...Object.values(values))
  return (
    <div className="heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="heat-col">
          {Array.from({ length: 7 }, (_, d) => {
            const day = addDays(start, w * 7 + d)
            const v = values[day] || 0
            return <button key={d} className="heat-cell" title={`${day} ${v}`} disabled={day > end} onClick={() => onPick?.(day)}
              style={{ background: day > end ? 'transparent' : v ? `color-mix(in srgb, ${color} ${Math.round(25 + 75 * Math.min(1, v / m))}%, var(--surface))` : 'var(--surface-2)', outline: day === end ? '1px solid var(--accent)' : null }} />
          })}
        </div>
      ))}
    </div>
  )
}

export function Bars({ items, unit = '' }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="bars">
      {items.map((i) => (
        <div key={i.label} className="bar-row">
          <span className="bar-l ellipsis">{i.label}</span>
          <div className="bar-t"><i style={{ width: (i.value / max) * 100 + '%', background: i.color || 'var(--accent)' }} /></div>
          <span className="bar-v">{i.text ?? i.value + unit}</span>
        </div>
      ))}
    </div>
  )
}

// 요일별 막대 (최근 7일)
export function WeekBars({ values, goal }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6))
  const max = Math.max(goal || 1, ...days.map((d) => values[d] || 0))
  return (
    <div className="wbars">
      {days.map((d) => (
        <div key={d} className="wbar">
          <div className="wbar-t">
            {goal && <span className="wbar-goal" style={{ bottom: (goal / max) * 100 + '%' }} />}
            <i style={{ height: ((values[d] || 0) / max) * 100 + '%' }} />
          </div>
          <span className="tiny muted">{'일월화수목금토'[parseYmd(d).getDay()]}</span>
        </div>
      ))}
    </div>
  )
}
