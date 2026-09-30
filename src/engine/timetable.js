// 학교 시간표: 요일 × 교시 → 날짜별 수업 목록 (순수 함수, 저장은 settings().timetable)
import { parseYmd } from './date.js'

// 기본: 8:40 시작, 50분 수업 · 10분 쉬는 시간, 4교시 뒤 점심 60분, 7교시
export function defaultPeriods(n = 7, first = 8 * 60 + 40, len = 50, gap = 10, lunchAfter = 4, lunch = 60) {
  const out = []
  let s = first
  for (let i = 1; i <= n; i++) {
    out.push({ start: s, end: s + len })
    s += len + (i === lunchAfter ? lunch : gap)
  }
  return out
}

export const DEFAULT_TIMETABLE = { on: true, days: [1, 2, 3, 4, 5], periods: defaultPeriods(), cells: {}, off: [] }

// 수업 없는 날: 꺼짐, 요일 제외, 방학·휴업 기간
export function isSchoolDay(tt, date) {
  if (!tt || tt.on === false) return false
  if (!(tt.days || []).includes(parseYmd(date).getDay())) return false
  return !(tt.off || []).some((o) => o.from && date >= o.from && date <= (o.to || o.from))
}

export function classesFor(tt, date, subjects = []) {
  if (!isSchoolDay(tt, date)) return []
  const wd = parseYmd(date).getDay()
  const out = []
  ;(tt.periods || []).forEach((p, i) => {
    const c = tt.cells?.[`${wd}-${i + 1}`]
    if (!c || !(c.title || c.subjectId)) return
    const sub = c.subjectId && subjects.find((s) => s.id === c.subjectId)
    out.push({ id: `tt-${date}-${i + 1}`, period: i + 1, title: c.title || sub?.name || `${i + 1}교시`, start: p.start, end: p.end, color: sub?.color || null, subjectId: c.subjectId || null, room: c.room || '' })
  })
  return out
}
