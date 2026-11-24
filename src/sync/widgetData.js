// 위젯용 요약 (widget.json): 위젯은 이것만 읽어서 그림 — 날짜는 위젯이 그날 기준으로 다시 골라 씀
import { list, settings } from '../store/store.js'
import { today, addDays } from '../lib/date.js'
import { examName, judge, maxTotal, passLine } from '../lib/exams.js'

export const WIDGET_VER = 1

export function widgetPayload() {
  const st = settings(), t0 = today(), from = addDays(t0, -35), to = addDays(t0, 14)
  const exams = list('exams').filter((e) => !e.done && (!e.date || e.date >= addDays(t0, -1))).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 6)
  const scores = list('scores')
  const mins = {}
  for (const s of list('sessions')) if (s.date >= from) mins[s.date] = (mins[s.date] || 0) + (s.min || 0)
  // 할 일: 지난 것(남은 것) + 2주 안 + 날짜 없음 몇 개 · 최근 끝낸 것
  const tasks = list('tasks').filter((t) => (t.due ? t.due <= to && (!t.done || t.due >= addDays(t0, -1)) : !t.done)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.order ?? 0) - (b.order ?? 0)).slice(0, 60)
  const ex = (id) => exams.find((e) => e.id === id) || list('exams').find((e) => e.id === id)
  return {
    v: WIDGET_VER, at: Date.now(), goal: st.goalDaily, weekStart: st.weekStart, theme: st.widgetTheme || 'basic', accent: st.accent,
    exams: exams.map((e) => {
      const S = scores.filter((s) => s.examId === e.id).sort((a, b) => a.date.localeCompare(b.date)), last = S[S.length - 1], j = last ? judge(e, last) : null
      return { id: e.id, name: examName(e), sub: e.name || '', date: e.date || null, target: e.target || null, pass: passLine(e), max: maxTotal(e), color: e.color || null, last: j?.total ?? null, lastDate: last?.date || null, lastPass: j?.pass ?? null, trend: S.slice(-6).map((s) => judge(e, s).total).filter((x) => x != null) }
    }),
    mins,
    tasks: tasks.map((t) => ({ id: t.id, t: t.title, due: t.due || null, done: !!t.done, doneAt: t.doneAt || null, exam: t.examId && ex(t.examId) ? examName(ex(t.examId)) : null, color: t.examId ? ex(t.examId)?.color || null : null, area: t.area || null })),
    books: list('materials').filter((m) => (m.current || 0) < m.total).slice(0, 6).map((m) => ({ t: m.title, cur: m.current || 0, total: m.total, unit: m.unit || '' })),
  }
}
