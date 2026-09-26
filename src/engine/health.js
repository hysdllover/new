import { addDays, diffDays } from './date.js'

// 생리 주기 예측: 최근 주기 평균 길이(기본 28일)로 다음 시작일 계산
export function cycleInfo(cycles) {
  const starts = cycles.map((c) => c.start).filter(Boolean).sort()
  if (!starts.length) return null
  const lens = []
  for (let i = 1; i < starts.length; i++) {
    const l = diffDays(starts[i], starts[i - 1])
    if (l >= 18 && l <= 45) lens.push(l)
  }
  const recent = lens.slice(-6)
  const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 28
  const durs = cycles.filter((c) => c.end).map((c) => diffDays(c.end, c.start) + 1).slice(-6)
  const dur = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 5
  const last = starts[starts.length - 1]
  const next = addDays(last, avg)
  return { avg, dur, last, next, nextEnd: addDays(next, dur - 1) }
}

// 날짜가 (실제 기록 또는 예측) 주기 기간인지
export function cycleState(date, cycles, info) {
  for (const c of cycles) if (date >= c.start && date <= (c.end || addDays(c.start, (info?.dur || 5) - 1))) return 'on'
  if (info) {
    for (let k = 0; k < 3; k++) {
      const s = addDays(info.next, info.avg * k)
      if (date >= s && date <= addDays(s, info.dur - 1)) return 'pred'
    }
  }
  return null
}
