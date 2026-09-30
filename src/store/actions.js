import { put, patch, remove, restore, find, list, batch, settings, uid } from './store.js'
import { today, addDays, diffDays, nowMin, tsToYmd, weekStart } from '../engine/date.js'
import { nextOccurrence } from '../engine/recurrence.js'
import { findSlot, planSessions } from '../engine/scheduler.js'
import { toast } from '../components/ui.jsx'

/* ── 활동 로그 ── */
export function log(taskId, type, text) {
  put('logs', { taskId, at: Date.now(), type, text })
}

/* ── 할 일 ── */
export function addTask(t) {
  const rec = put('tasks', { title: '', done: false, priority: 0, subtasks: [], status: 'todo', order: Date.now(), ...t })
  log(rec.id, 'create', '생성')
  return rec
}

const LABEL = { title: '제목', due: '마감일', priority: '우선순위', subjectId: '과목', projectId: '프로젝트', status: '상태', estimate: '예상시간', start: '시작일' }
export function updateTask(id, partial, opt = {}) {
  const prev = find('tasks', id)
  if (!prev) return
  // 날짜를 정하면 받은 편지함에서 빠짐
  if (partial.due && prev.inbox && partial.inbox === undefined) partial = { ...partial, inbox: false }
  const next = patch('tasks', id, partial)
  const changed = Object.keys(partial).filter((k) => LABEL[k] && prev[k] !== partial[k])
  if (changed.length && !opt.silentLog) log(id, 'update', changed.map((k) => LABEL[k]).join('·') + ' 변경')
  // 간트: 마감이 늦춰지면 후속 작업을 밀어냄
  if (partial.due && prev.due && partial.due > prev.due) pushDependents(next)
  return next
}

/* ── 주간 목표 (최대 3개, days 컬렉션에 'week:주 시작일' 로 저장) ── */
export const weekId = (d = today()) => 'week:' + weekStart(d, settings().weekStart ?? 1)
export const weekGoals = (id = weekId()) => find('days', id)?.goals || []
export const setWeekGoals = (goals, id = weekId()) => put('days', { ...(find('days', id) || null), id, goals })
export function goalProgress(g, tasks) {
  const linked = tasks.filter((t) => t.goalId === g.id && !t.archived)
  const done = linked.filter((t) => t.done).length
  return { linked: linked.length, done, ratio: g.done ? 1 : linked.length ? done / linked.length : 0 }
}

// 빠른 날짜 목표: 오늘·내일·이번 주말(토)·다음 주 월요일
export function quickDate(kind) {
  const d = today(), dow = new Date().getDay()
  if (kind === 'today') return d
  if (kind === 'tomorrow') return addDays(d, 1)
  if (kind === 'weekend') return addDays(d, dow === 6 ? 1 : dow === 0 ? 6 : 6 - dow) // 토요일(토요일이면 일요일)
  if (kind === 'nextweek') return addDays(d, ((8 - dow) % 7) || 7)
  return null
}
export const QUICK_DATES = [['today', '오늘'], ['tomorrow', '내일'], ['weekend', '이번 주말'], ['nextweek', '다음 주 월'], ['none', '날짜 없음']]

// 여러 할 일을 한 번에 옮기기 (미룬 횟수 +1)
export function moveTasks(ids, kind) {
  const date = quickDate(kind)
  batch(() => {
    for (const id of ids) {
      const t = find('tasks', id)
      if (!t || t.done) continue
      const later = t.due && date && date > t.due
      updateTask(id, { due: date, ...(date ? null : { dueTime: null }), ...(later ? { carry: (t.carry || 0) + 1 } : null) }, { silentLog: true })
      if (later) log(id, 'carry', `${t.due.slice(5)} → ${date.slice(5)} 미룸`)
    }
  })
  return date
}

function pushDependents(task, depth = 0) {
  if (depth > 20) return
  for (const t of list('tasks')) {
    if (!t.dependsOn?.includes(task.id) || t.done) continue
    const s = t.start || t.due
    if (!s || s > task.due) continue
    const shift = diffDays(task.due, s) + 1
    const nt = patch('tasks', t.id, { start: t.start ? addDays(t.start, shift) : t.start, due: t.due ? addDays(t.due, shift) : t.due })
    log(t.id, 'update', `선행 작업 지연으로 ${shift}일 밀림`)
    pushDependents(nt, depth + 1)
  }
}

export function toggleTask(id) {
  const t = find('tasks', id)
  if (!t) return
  batch(() => {
    const done = !t.done
    patch('tasks', id, { done, doneAt: done ? Date.now() : null, status: done ? 'done' : t.status === 'done' ? 'todo' : t.status })
    log(id, done ? 'done' : 'undone', done ? '완료' : '완료 취소')
    if (done && t.repeat && t.due) {
      let nd = nextOccurrence(t.repeat, t.repeatStart || t.due, t.due)
      while (nd && nd < today()) nd = nextOccurrence(t.repeat, t.repeatStart || t.due, nd)
      if (nd && !list('tasks').some((x) => x.repeatId === (t.repeatId || t.id) && x.due === nd)) {
        const { id: _, done: __, doneAt, createdAt, updatedAt, status, carry, ...rest } = t
        addTask({ ...rest, due: nd, repeatStart: t.repeatStart || t.due, repeatId: t.repeatId || t.id, subtasks: (t.subtasks || []).map((s) => ({ ...s, done: false })) })
      }
    }
    // 학습 계획 할 일 완료 → 교재 진도 반영
    if (done && t.planId && t.range) {
      const plan = find('plans', t.planId)
      const tb = plan && find('textbooks', plan.textbookId)
      if (tb && t.range[1] > (tb.current || 0)) setTextbookProgress(tb.id, t.range[1])
    }
  })
}

export function deleteTask(id) {
  const t = find('tasks', id)
  remove('tasks', id)
  toast(`'${t?.title || '할 일'}' 삭제됨`, { label: '되돌리기', fn: () => restore('tasks', id) })
}

export function taskProgress(t) {
  if (t.done) return 1
  const s = t.subtasks || []
  return s.length ? s.filter((x) => x.done).length / s.length : 0
}
export function projectProgress(projectId, tasks = list('tasks')) {
  const ts = tasks.filter((t) => t.projectId === projectId && !t.archived)
  return ts.length ? ts.reduce((a, t) => a + taskProgress(t), 0) / ts.length : 0
}

export function taskSpent(taskId, sessions = list('sessions')) {
  return sessions.filter((s) => s.taskId === taskId).reduce((a, s) => a + (s.dur || 0), 0)
}

/* ── 타임블록 ── */
export function scheduleTask(taskId, date = today(), start, dur) {
  const t = find('tasks', taskId)
  dur = dur || t?.estimate || 30
  const s = start ?? findSlot(date, dur)
  if (s == null) { toast('빈 시간이 없어요'); return null }
  const b = put('blocks', { date, start: s, dur, taskId, kind: 'task', title: t?.title })
  log(taskId, 'schedule', `${date.slice(5)} 타임박스 배정`)
  return b
}

export function splitTask(taskId, n, dur, fromDate = today()) {
  const t = find('tasks', taskId)
  const slots = planSessions(n, dur, fromDate)
  batch(() => {
    slots.forEach((s, i) => put('blocks', { date: s.date, start: s.start, dur, taskId, kind: 'task', title: `${t.title} (${i + 1}/${n})` }))
    log(taskId, 'split', `${slots.length}개 세션으로 분할`)
  })
  return slots
}

// 지난 날 미완료 타임박스 → 오늘/다음 빈 시간으로 이월
export function carryOver() {
  const d0 = today()
  const stale = list('blocks').filter((b) => b.date < d0 && b.kind === 'task' && b.taskId && !b.carriedTo)
  let n = 0
  batch(() => {
    for (const b of stale) {
      const t = find('tasks', b.taskId)
      if (!t || t.done) { patch('blocks', b.id, { carriedTo: 'done' }); continue }
      let date = d0, s = null
      for (let i = 0; i < 7 && s == null; i++) { date = addDays(d0, i); s = findSlot(date, b.dur) }
      if (s == null) continue
      put('blocks', { date, start: s, dur: b.dur, taskId: b.taskId, kind: 'task', title: b.title, carriedFrom: b.date })
      patch('blocks', b.id, { carriedTo: date })
      patch('tasks', t.id, { carry: (t.carry || 0) + 1 })
      log(t.id, 'carry', `${b.date.slice(5)} → ${date.slice(5)} 이월`)
      n++
    }
  })
  if (n) toast(`미완료 ${n}개를 이월했어요`)
}

/* ── 하루 설정 (Top3·꾸미기·템플릿) ── */
export const dayRec = (date) => find('days', date) || { id: date, top3: [], stickers: [], comment: '' }
export const setDay = (date, partial) => put('days', { ...dayRec(date), ...partial, id: date })

export function applyTemplate(tplId, date) {
  const tpl = find('templates', tplId)
  if (!tpl) return
  batch(() => {
    for (const b of tpl.blocks || []) put('blocks', { date, start: b.start, dur: b.dur, title: b.title, kind: b.kind || 'custom', subjectId: b.subjectId, fromTemplate: tpl.id })
    setDay(date, { templateApplied: tpl.id })
  })
}
export function autoTemplate(date = today()) {
  if (!settings().autoTemplate) return
  const day = find('days', date)
  if (day?.templateApplied) return
  const dw = new Date().getDay()
  const tpl = list('templates').find((t) => t.weekdays?.includes(dw))
  if (tpl && !list('blocks').some((b) => b.date === date && b.fromTemplate)) applyTemplate(tpl.id, date)
}

/* ── 공부 세션 ── */
export function addSession({ subjectId, taskId, start, end, kind = 'stopwatch' }) {
  const dur = Math.round((end - start) / 60000)
  if (dur < 1) return null
  const s = put('sessions', { subjectId, taskId, start, end, dur, date: tsToYmd(start), kind })
  if (taskId) log(taskId, 'study', `${dur}분 공부`)
  return s
}

// 직접 입력한 공부 기록 (시작 시각은 선택)
export function saveRecord({ id, subjectId, taskId, date, dur, startMin, note, files, focus }) {
  dur = Math.max(1, Math.round(dur || 0))
  let start = null, end = null
  if (startMin != null) {
    const d = new Date(date + 'T00:00')
    start = d.getTime() + startMin * 60000
    end = start + dur * 60000
  }
  const prev = id && find('sessions', id)
  const rec = put('sessions', { ...(id ? { id } : null), subjectId, taskId: taskId || null, date, dur, start, end, note: note || '', files: files || [], focus: focus || null, kind: prev?.kind || 'manual' })
  if (!prev && taskId) log(taskId, 'study', `${dur}분 공부 (직접 입력)`)
  return rec
}

/* ── 교재 진도 & 학습 계획 ── */
export function setTextbookProgress(id, value) {
  const tb = find('textbooks', id)
  if (!tb) return
  const hist = (tb.history || []).filter((h) => h.date !== today())
  patch('textbooks', id, { current: value, history: [...hist, { date: today(), value }] })
  for (const p of list('plans')) if (p.textbookId === id && !p.done) regeneratePlan(p.id)
}

export function planChunks(plan, tb, from = today()) {
  const done = Math.max(plan.from - 1, tb?.current || 0)
  const remaining = plan.to - done
  const lastStudy = addDays(plan.examDate, -(plan.reviewDays || 0) - 1)
  const days = []
  for (let d = from < plan.startDate ? plan.startDate : from; d <= lastStudy; d = addDays(d, 1)) {
    if (!(plan.offDays || []).includes(new Date(d + 'T00:00').getDay())) days.push(d)
  }
  if (remaining <= 0 || !days.length) return { chunks: [], perDay: 0, days: days.length, remaining }
  const perDay = Math.ceil(remaining / days.length)
  const chunks = []
  let a = done + 1
  for (const d of days) {
    if (a > plan.to) break
    const b = Math.min(plan.to, a + perDay - 1)
    chunks.push({ date: d, a, b })
    a = b + 1
  }
  return { chunks, perDay, days: days.length, remaining }
}

export function regeneratePlan(planId) {
  const plan = find('plans', planId)
  if (!plan) return
  const tb = find('textbooks', plan.textbookId)
  const t0 = today()
  batch(() => {
    for (const t of list('tasks')) if (t.planId === planId && !t.done) remove('tasks', t.id)
    const { chunks } = planChunks(plan, tb)
    for (const c of chunks) {
      addTask({ title: `${tb?.title || plan.title} ${c.a}–${c.b}${plan.unit || 'p'}`, due: c.date, subjectId: plan.subjectId, planId, range: [c.a, c.b], estimate: plan.minPerUnit ? plan.minPerUnit * (c.b - c.a + 1) : 60 })
    }
    for (let i = 1; i <= (plan.reviewDays || 0); i++) {
      const d = addDays(plan.examDate, -i)
      if (d >= t0) addTask({ title: `${plan.title} 총복습`, due: d, subjectId: plan.subjectId, planId, priority: 2 })
    }
    patch('plans', planId, { generatedAt: Date.now() })
  })
}

/* ── 복습 (망각곡선) ── */
export function addReview({ title, subjectId, sourceType = 'manual', sourceId }) {
  const iv = settings().reviewIntervals
  const r = put('reviews', { title, subjectId, sourceType, sourceId, stage: 0, next: addDays(today(), iv[0]), history: [], learnedAt: today() })
  toast(`복습 등록: ${iv.map((d) => d + '일').join('·')} 후`)
  return r
}
export function completeReview(id, ok) {
  const r = find('reviews', id)
  if (!r) return
  const iv = settings().reviewIntervals
  const hist = [...(r.history || []), { date: today(), ok }]
  if (!ok) return patch('reviews', id, { stage: 0, learnedAt: today(), next: addDays(today(), iv[0]), history: hist })
  const stage = r.stage + 1
  if (stage >= iv.length) return patch('reviews', id, { stage, done: true, next: null, history: hist })
  const due = addDays(r.learnedAt || today(), iv[stage])
  patch('reviews', id, { stage, next: due > today() ? due : addDays(today(), 1), history: hist })
}

/* ── 기타 ── */
export const subjectOf = (id) => (id && find('subjects', id)) || null
export const projectOf = (id) => (id && find('projects', id)) || null
export const newId = uid
export { nowMin }
