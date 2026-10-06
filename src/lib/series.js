// 시리즈 할 일: '파피루스 day1~33' 같은 번호 묶음을 날짜에 나눠 만들기 · 진행 요약
import { addDays, parseYmd } from '../engine/date.js'

// days: 넣을 요일 [0-6] (비우면 매일) · perDay: 하루 몇 개 → [{ n, title, due }]
export function planSeries({ prefix = '', suffix = '', from = 1, to = 1, start, perDay = 1, days = [] }) {
  const out = [], per = Math.max(1, perDay | 0), lo = Math.min(from, to), hi = Math.max(from, to)
  let d = start, used = 0, guard = 0
  const ok = (x) => !days.length || days.includes(parseYmd(x).getDay())
  while (!ok(d) && guard++ < 14) d = addDays(d, 1)
  for (let n = lo; n <= hi && out.length < 400; n++) {
    if (used >= per) { used = 0; d = addDays(d, 1); guard = 0; while (!ok(d) && guard++ < 14) d = addDays(d, 1) }
    out.push({ n, title: `${prefix}${n}${suffix}`.trim(), due: d })
    used++
  }
  return out
}

// 진행 중인 시리즈: [{ id, t, d (끝낸 수), n (전체), next (다음 할 일 제목), color }] — 남은 것이 있거나 최근 7일 안에 끝낸 것
export function seriesSummary(tasks, subjects = [], colors = {}) {
  const by = {}
  for (const t of tasks) {
    if (!t.seriesId || t.deleted || t.archived) continue
    const s = (by[t.seriesId] ||= { id: t.seriesId, t: t.seriesName || '', d: 0, n: 0, next: null, last: 0, sub: t.subjectId })
    s.n++
    if (t.done) { s.d++; s.last = Math.max(s.last, t.doneAt || 0) }
    else if (!s.next || (t.seriesN ?? 0) < (s.next.seriesN ?? 0)) s.next = t
  }
  const week = Date.now() - 7 * 864e5
  return Object.values(by).filter((s) => s.d < s.n || s.last > week)
    .map((s) => ({ id: s.id, t: s.t, d: s.d, n: s.n, next: s.next ? { id: s.next.id, title: s.next.title, due: s.next.due || null } : null, color: colors[s.id] || subjects.find((x) => x.id === s.sub)?.color || null }))
    .sort((a, b) => (a.d >= a.n) - (b.d >= b.n) || (a.next?.due || '9').localeCompare(b.next?.due || '9'))
}
