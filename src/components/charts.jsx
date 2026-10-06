import { useState } from 'react'
import { shareBlob } from '../lib/shareCard.js'
import { settings } from '../store/store.js'
import { addDays, addMonths, diffDays, today, weekStart, fmtShort, parseYmd, monthStart, daysInMonth, fmtDur, WD } from '../engine/date.js'

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

const hmT = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
// 월별 공부 달력: 칸 진하기 = 목표 대비 공부량
export function MonthHeat({ values, goal = 240, weekStartDow = 1, color = 'var(--c2)', onPick, compact, fixed }) {
  const t = today()
  const [m0, setMonth] = useState(monthStart(t)), month = fixed || m0
  // 이미지로 저장 (리포트 이미지 색 설정을 따름)
  const saveImg = async () => {
    const { drawMonthCal } = await import('../lib/reportImage.js')
    const blob = await drawMonthCal({ month, values, goal, weekStartDow, theme: settings().reportTheme || 'app' })
    await shareBlob(blob, `공부달력-${month.slice(0, 7)}.png`)
  }
  const y = +month.slice(0, 4), mo = +month.slice(5, 7) - 1
  const n = daysInMonth(y, mo)
  const lead = (parseYmd(month).getDay() - weekStartDow + 7) % 7
  const days = Array.from({ length: n }, (_, i) => addDays(month, i))
  const vals = days.map((d) => values[d] || 0)
  const total = vals.reduce((a, v) => a + v, 0), studied = vals.filter(Boolean).length
  const hit = vals.filter((v) => v >= goal).length
  const wd = Array.from({ length: 7 }, (_, i) => WD[(i + weekStartDow) % 7])
  return (
    <div className={'mheat' + (compact ? ' compact' : '')}>
      {!fixed && <div className="row between mheat-top">
        <button className="icon-btn no-print" onClick={() => setMonth(addMonths(month, -1))} aria-label="이전 달">‹</button>
        <b>{y}. {mo + 1}</b>
        <span className="row" style={{ gap: 2 }}>
          {!compact && <button className="chip no-print" onClick={saveImg}>이미지</button>}
          <button className="icon-btn no-print" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달">›</button>
        </span>
      </div>}
      <div className="mheat-grid">
        {wd.map((w) => <span key={w} className="mheat-wd">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
        {days.map((d, i) => {
          const v = vals[i], r = Math.min(1, v / goal)
          return (
            <button key={d} className={'mheat-cell' + (d === t ? ' today' : '') + (r >= .6 ? ' dark' : '') + (v ? '' : ' empty')} disabled={d > t} onClick={() => onPick?.(d)}
              style={v ? { background: `color-mix(in srgb, ${color} ${Math.round(16 + 70 * r)}%, var(--surface))` } : null}>
              <span className="mheat-d">{i + 1}</span>
              {!compact && v > 0 && <span className="mheat-v">{Math.floor(v / 60)}:{String(v % 60).padStart(2, '0')}</span>}
            </button>
          )
        })}
      </div>
      <div className="mheat-sum">
        {[['합계', hmT(total)], ['공부한 날', studied + '일'], ['목표 달성', hit + '일'], ['하루 평균', hmT(studied ? Math.round(total / studied) : 0)]].map(([l, v]) => <span key={l} className="stat-mini"><i>{l}</i><b>{v}</b></span>)}
      </div>
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

// 요일별 막대 (최근 7일): 가는 막대 · 목표 점선 · 칸 위에 시간
export function WeekBars({ values, goal }) {
  const t = today(), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6))
  const max = Math.max(goal || 1, ...days.map((d) => values[d] || 0))
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  return (
    <div className="wbars">
      <div className="wbars-plot">
        {goal > 0 && <span className="wbars-goal" style={{ bottom: (goal / max) * 100 + '%' }}><em>목표 {hm(goal)}</em></span>}
        {days.map((d) => { const v = values[d] || 0; return (
          <div key={d} className={'wbar' + (d === t ? ' now' : '') + (goal && v >= goal ? ' hit' : '')}>
            {v > 0 && <span className="wbar-v">{hm(v)}</span>}
            <i className="wbar-b" style={{ height: Math.max(v ? 3 : 0, (v / max) * 100) + '%' }} />
          </div>
        ) })}
      </div>
      <div className="wbars-l">{days.map((d) => <span key={d} className={d === t ? 'now' : ''}>{'일월화수목금토'[parseYmd(d).getDay()]}</span>)}</div>
    </div>
  )
}
