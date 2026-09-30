// 인강 수강 계산: 남은 시간(배속), 하루 분량, 최근 속도로 완강 예정일, 기한 초과 (순수 함수)
import { addDays, parseYmd, diffDays } from './date.js'

const ALL = [0, 1, 2, 3, 4, 5, 6]
export const lenOf = (l, i) => l.lens?.[i - 1] || l.avgMin || 40

// from~to (포함) 사이 듣는 요일 수
export function studyDays(l, from, to) {
  const days = l.days?.length ? l.days : ALL
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) if (days.includes(parseYmd(d).getDay())) n++
  return n
}

export function lectureStats(l, t) {
  const total = Math.max(0, l.total || 0), done = l.done || {}
  const isDone = (i) => !!done[i]
  const left = []
  for (let i = 1; i <= total; i++) if (!isDone(i)) left.push(i)
  const doneN = total - left.length
  const leftMin = Math.round(left.reduce((a, i) => a + lenOf(l, i), 0) / (l.speed || 1))
  const todayDone = Object.entries(done).filter(([i, d]) => +i <= total && d === t).length
  // 목표일까지 하루 분량 (오늘 이미 들은 것 포함해서 계산 → 들어도 오늘 분량이 바뀌지 않음)
  let perDay = null
  if (l.goal && left.length) {
    const n = l.goal < t ? 1 : Math.max(1, studyDays(l, t, l.goal))
    perDay = Math.ceil((left.length + todayDone) / n)
  }
  // 최근 14일 속도 (듣는 요일 기준)
  const from = addDays(t, -13)
  const recent = Object.values(done).filter((d) => d >= from && d <= t).length
  const pace = recent / Math.max(1, studyDays(l, from, t))
  let eta = null
  if (!left.length) eta = Object.values(done).sort().at(-1) || t
  else if (pace > 0) {
    let need = Math.ceil(left.length / pace), d = t
    const days = l.days?.length ? l.days : ALL
    for (let g = 0; g < 3650; g++) { if (days.includes(parseYmd(d).getDay()) && --need <= 0) break; d = addDays(d, 1) }
    eta = d
  }
  const limit = [l.goal, l.expires].filter(Boolean).sort()[0] || null
  return {
    total, doneN, left: left.length, leftMin, next: left[0] || null, todayDone,
    perDay, todayLeft: perDay != null ? Math.max(0, perDay - todayDone) : null,
    pace, eta, limit,
    late: !!(left.length && limit && (limit < t || (eta && eta > limit))),
    expiresIn: l.expires ? diffDays(l.expires, t) : null,
  }
}
