import { today, addDays, weekStart, tsToYmd } from '../../engine/date.js'

export const SMART = [
  ['inbox', '받은 편지함'], ['all', '전체'], ['today', '오늘'], ['tomorrow', '내일'], ['week', '이번 주'], ['nodue', '기한 없음'], ['overdue', '지연'], ['done', '완료'],
]

// 완료한 할 일은 목록에서 사라지지 않고 줄 그은 채로 남음 (보관함으로 옮겨야 사라짐)
export const doneToday = (t) => !!(t.done && t.doneAt && tsToYmd(t.doneAt) === today())

export function smartMatch(t, smart) {
  const d = today()
  switch (smart) {
    case 'today': return !!t.due && t.due <= d && (!t.done || t.due === d || doneToday(t))
    case 'tomorrow': return t.due === addDays(d, 1)
    case 'week': { const ws = weekStart(d); return !!t.due && t.due >= ws && t.due <= addDays(ws, 6) }
    case 'nodue': return !t.due
    case 'overdue': return !t.done && t.due && t.due < d
    case 'inbox': return !!t.inbox && !t.done
    case 'done': return t.done
    default: return true
  }
}

export function applyFilter(tasks, f = {}) {
  const q = (f.q || '').trim().toLowerCase()
  let out = tasks.filter((t) => !t.archived && smartMatch(t, f.smart || 'all'))
  if (f.subjectId) out = out.filter((t) => t.subjectId === f.subjectId)
  if (f.projectId) out = out.filter((t) => t.projectId === f.projectId)
  if (f.priority) out = out.filter((t) => (t.priority || 0) >= +f.priority)
  if (q) out = out.filter((t) => (t.title || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q))
  return sortTasks(out, f.sort)
}

export const openCount = (list) => list.filter((t) => !t.done).length

export function sortTasks(list, sort = 'manual') {
  const a = [...list]
  if (sort === 'due') a.sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999') || (x.dueTime ?? 9999) - (y.dueTime ?? 9999) || (x.order ?? 0) - (y.order ?? 0))
  else if (sort === 'priority') a.sort((x, y) => (y.priority || 0) - (x.priority || 0) || (x.due || '9999').localeCompare(y.due || '9999'))
  else if (sort === 'subject') a.sort((x, y) => (x.subjectId || '~').localeCompare(y.subjectId || '~'))
  else if (sort === 'created') a.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))
  else a.sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
  return a
}

// 아이젠하워: q 가 지정 안 됐으면 우선순위·마감으로 추정
export function quadrant(t) {
  if (t.q) return t.q
  const important = (t.priority || 0) >= 2
  const urgent = t.due && t.due <= addDays(today(), 2)
  return important && urgent ? 1 : important ? 2 : urgent ? 3 : 4
}

// 기간 할 일: 시작일~마감일 사이(마감일 전날까지) 진행 중
export const spanOn = (t, d) => !!(t.start && t.due && t.start < t.due && t.start <= d && d < t.due && !t.archived)
export const spanInfo = (t, d) => { const total = Math.round((Date.parse(t.due) - Date.parse(t.start)) / 86400000) + 1, n = Math.round((Date.parse(d) - Date.parse(t.start)) / 86400000) + 1; return { n, total } }
