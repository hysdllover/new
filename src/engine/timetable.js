// 학교 시간표 + 주말 독서실 시간표: 요일 × 교시 → 날짜별 목록 (순수 함수, 저장은 settings().timetable · 주말은 timetable.wk)
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
// 주말 독서실: 9:00 시작, 80분 · 10분 쉬는 시간, 2교시 뒤 점심 70분, 6교시 (방학과 상관없이 매주)
export const DEFAULT_WEEKEND = { on: true, days: [6, 0], periods: defaultPeriods(6, 9 * 60, 80, 10, 2, 70), cells: {} }
export const weekendOf = (tt) => ({ ...DEFAULT_WEEKEND, ...(tt?.wk || {}) })

// 수업 없는 날: 꺼짐, 요일 제외, 방학·휴업 기간
export function isSchoolDay(tt, date) {
  if (!tt || tt.on === false) return false
  if (!(tt.days || []).includes(parseYmd(date).getDay())) return false
  return !(tt.off || []).some((o) => o.from && date >= o.from && date <= (o.to || o.from))
}

// 주말 시간표를 쓰는 날: 학교 가는 날이 아니고 주말 요일에 들어 있을 때 (토요일 수업이 있으면 학교 시간표가 먼저)
export function isWeekendDay(tt, date) {
  const wk = weekendOf(tt)
  return wk.on !== false && (wk.days || []).includes(parseYmd(date).getDay()) && !isSchoolDay(tt, date)
}

export function classesFor(tt, date, subjects = []) {
  const wkDay = isWeekendDay(tt, date)
  if (!wkDay && !isSchoolDay(tt, date)) return []
  const t = wkDay ? weekendOf(tt) : tt, wd = parseYmd(date).getDay()
  const out = []
  ;(t.periods || []).forEach((p, i) => {
    const c = t.cells?.[`${wd}-${i + 1}`]
    if (!c || !(c.title || c.subjectId)) return
    const sub = c.subjectId && subjects.find((s) => s.id === c.subjectId)
    out.push({ id: `tt-${date}-${wkDay ? 'w' : ''}${i + 1}`, period: i + 1, title: c.title || sub?.name || `${i + 1}교시`, start: p.start, end: p.end, color: sub?.color || null, subjectId: c.subjectId || null, room: c.room || '', ...(wkDay ? { wk: true } : {}) })
  })
  return out
}
