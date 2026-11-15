import { put, patch, remove, restore, find, list, batch, settings, uid, recordChanges, undoChanges } from './store.js'
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
  // 하위 할 일이 있는 할 일은 하위 진행만큼 반영
  const part = linked.reduce((a, t) => a + taskProgress(t), 0)
  return { linked: linked.length, done, ratio: g.done ? 1 : linked.length ? part / linked.length : 0 }
}

// 빠른 날짜 목표: 오늘·내일·이번 주말(토)·다음 주 월요일
export function quickDate(kind) {
  const d = today(), dow = new Date().getDay()
  if (/^\d{4}-\d\d-\d\d$/.test(kind || '')) return kind // 날짜 직접
  if (kind === 'today') return d
  if (kind === 'tomorrow') return addDays(d, 1)
  if (kind === 'weekend') return addDays(d, dow === 6 ? 1 : dow === 0 ? 6 : 6 - dow) // 토요일(토요일이면 일요일)
  if (kind === 'nextweek') return addDays(d, ((8 - dow) % 7) || 7)
  return null
}
export const QUICK_DATES = [['today', '오늘'], ['tomorrow', '내일'], ['weekend', '이번 주말'], ['nextweek', '다음 주 월'], ['none', '날짜 없음']]

// 여러 할 일을 한 번에 옮기기 (미룬 횟수 +1)
// 바꾼 뒤 3초 '되돌리기' 알림 (opt.quiet 면 알림 없이)
export function undoToast(text, changes) { if (changes?.length) toast(text, { label: '되돌리기', fn: () => undoChanges(changes) }) }
export function moveTasks(ids, kind, opt = {}) {
  const date = quickDate(kind)
  const ch = recordChanges(() => batch(() => {
    for (const id of ids) {
      const t = find('tasks', id)
      if (!t || t.done) continue
      const later = t.due && date && date > t.due
      updateTask(id, { due: date, ...(date ? null : { dueTime: null }), ...(later ? { carry: (t.carry || 0) + 1 } : null) }, { silentLog: true })
      if (later) log(id, 'carry', `${t.due.slice(5)} → ${date.slice(5)} 미룸`)
    }
  }))
  if (!opt.quiet) { const n = ids.length, l = (QUICK_DATES.find(([k]) => k === kind) || [])[1] || '그 날'; undoToast(n > 1 ? `${n}개를 ${l}(으)로 옮겼어요` : `${l}(으)로 옮겼어요`, ch) }
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

export function toggleTask(id, opt = {}) {
  const t = find('tasks', id)
  if (!t) return
  const ch = recordChanges(() => batch(() => {
    const done = !t.done
    patch('tasks', id, { done, doneAt: done ? Date.now() : null, status: done ? 'done' : t.status === 'done' ? 'todo' : t.status })
    // 설정: 상위를 끝내면 남은 하위도 함께 체크
    if (done && settings().subWithParent && (t.subtasks || []).some((s) => !s.done)) setSubs(id, t.subtasks.map((s) => (s.done ? s : { ...s, done: true, doneAt: Date.now() })))
    log(id, done ? 'done' : 'undone', done ? '완료' : '완료 취소')
    if (done && t.repeat && t.due) {
      let nd = nextOccurrence(t.repeat, t.repeatStart || t.due, t.due)
      while (nd && nd < today()) nd = nextOccurrence(t.repeat, t.repeatStart || t.due, nd)
      if (nd && !list('tasks').some((x) => x.repeatId === (t.repeatId || t.id) && x.due === nd)) {
        const { id: _, done: __, doneAt, createdAt, updatedAt, status, carry, ...rest } = t
        addTask({ ...rest, due: nd, repeatStart: t.repeatStart || t.due, repeatId: t.repeatId || t.id, subtasks: (t.subtasks || []).map((s) => ({ ...s, done: false, ...(s.due && t.due ? { due: addDays(s.due, diffDays(nd, t.due)) } : null) })) }) // 하위 할 일 날짜도 같은 만큼 옮김
      }
    }
    // 학습 계획 할 일 완료 → 교재 진도 반영
    if (done && t.planId && t.range) {
      const plan = find('plans', t.planId)
      const tb = plan && find('textbooks', plan.textbookId)
      if (tb && t.range[1] > (tb.current || 0)) setTextbookProgress(tb.id, t.range[1])
    }
  }))
  if (!t.done && !opt.quiet) undoToast(`완료 · ${t.title}`, ch)
}

export function deleteTask(id) {
  const t = find('tasks', id)
  remove('tasks', id)
  toast(`'${t?.title || '할 일'}' 삭제됨`, { label: '되돌리기', fn: () => restore('tasks', id) })
}

// 하위 할 일 하나 끝내기 · 되돌리기
/* ── 하위 할 일 ── */
// 하위마다 at(마지막 수정 시각): 두 기기에서 같은 할 일의 다른 하위를 고쳐도 둘 다 남게 합칠 때 씀 (sync merge)
const subKey = (x) => { const { at, ...r } = x || {}; return JSON.stringify(r) }
export function stampSubs(prev = [], next = []) {
  const P = new Map(prev.map((x) => [x.id, x])), now = Date.now()
  return next.map((x) => { const o = P.get(x.id); return !o || subKey(o) !== subKey(x) ? { ...x, at: now } : x })
}
// 하위 목록 바꾸기 (편집 화면 등) — 지운 하위는 30일 동안 subTrash 에 (되살리기)
export function setSubs(taskId, next) {
  const t = find('tasks', taskId)
  if (!t) return
  const prev = t.subtasks || [], ids = new Set(next.map((x) => x.id)), now = Date.now()
  const gone = prev.filter((x) => !ids.has(x.id)).map((x) => ({ ...x, deletedAt: now }))
  const trash = [...gone, ...(t.subTrash || []).filter((x) => !ids.has(x.id) && now - (x.deletedAt || 0) < 30 * 86400000)].slice(0, 100)
  patch('tasks', taskId, { subtasks: stampSubs(prev, next), ...(gone.length || (t.subTrash || []).length !== trash.length ? { subTrash: trash } : null) })
}
export function patchSub(taskId, subId, partial) {
  const t = find('tasks', taskId)
  if (!t) return
  setSubs(taskId, (t.subtasks || []).map((s) => (s.id === subId ? { ...s, ...partial } : s)))
}
// 하위 체크 — 되돌리기 알림 · 설정에 따라 다 끝내면 상위도 완료
export function toggleSub(taskId, subId, opt = {}) {
  const t = find('tasks', taskId)
  if (!t) return
  const s0 = (t.subtasks || []).find((s) => s.id === subId)
  if (!s0) return
  const done = !s0.done
  const ch = recordChanges(() => batch(() => {
    const next = (t.subtasks || []).map((s) => (s.id === subId ? { ...s, done, doneAt: done ? Date.now() : null } : s))
    setSubs(taskId, next)
    if (done && !t.done && settings().subAutoDone && next.every((s) => s.done)) toggleTask(taskId, { quiet: true })
  }))
  if (!opt.quiet) undoToast(`${done ? '끝냄' : '되돌림'} · ${s0.title}`, ch)
}
export function deleteSub(taskId, subId) {
  const t = find('tasks', taskId)
  if (!t) return
  const s0 = (t.subtasks || []).find((s) => s.id === subId)
  const ch = recordChanges(() => setSubs(taskId, (t.subtasks || []).filter((s) => s.id !== subId)))
  undoToast(`지움 · ${s0?.title || ''}`, ch)
}
// 지운 하위 되살리기 (맨 뒤로)
export function restoreSub(taskId, subId) {
  const t = find('tasks', taskId)
  const x = t && (t.subTrash || []).find((s) => s.id === subId)
  if (!x) return
  const { deletedAt, ...sub } = x
  patch('tasks', taskId, { subTrash: (t.subTrash || []).filter((s) => s.id !== subId) })
  setSubs(taskId, [...(find('tasks', taskId).subtasks || []), sub])
}
// 하위 → 따로 할 일 (과목 · 프로젝트 · 목표는 상위를 따름)
export function promoteSub(taskId, subId) {
  const t = find('tasks', taskId)
  const s0 = t && (t.subtasks || []).find((s) => s.id === subId)
  if (!s0) return
  const ch = recordChanges(() => batch(() => {
    addTask({ title: s0.title, due: s0.due || t.due || null, done: !!s0.done, doneAt: s0.done ? (s0.doneAt || Date.now()) : null, subjectId: t.subjectId || null, projectId: t.projectId || null, goalId: t.goalId || null, priority: s0.star ? 2 : 0 })
    setSubs(taskId, (t.subtasks || []).filter((s) => s.id !== subId))
    const t2 = find('tasks', taskId); patch('tasks', taskId, { subTrash: (t2.subTrash || []).filter((s) => s.id !== subId) }) // 꺼낸 것은 '지운 하위'에 두지 않음
  }))
  undoToast(`할 일로 꺼냈어요 · ${s0.title}`, ch)
}
// 할 일 → 다른 할 일의 하위 (그 할 일의 하위도 함께 이어 붙임)
export function demoteTask(taskId, parentId) {
  const t = find('tasks', taskId), p = find('tasks', parentId)
  if (!t || !p || t.id === p.id) return
  const own = (t.subtasks || []).map((s) => ({ ...s, id: uid() }))
  const ch = recordChanges(() => batch(() => {
    setSubs(parentId, [...(p.subtasks || []), { id: uid(), title: t.title, done: !!t.done, doneAt: t.doneAt || null, due: t.due && t.due !== p.due ? t.due : null, star: t.priority >= 2 || undefined }, ...own])
    remove('tasks', taskId)
  }))
  undoToast(`‘${p.title}’ 아래로 넣었어요`, ch)
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
export function addSession({ id, subjectId, taskId, lectureId, start, end, kind = 'stopwatch', note }) {
  const raw = Math.round((end - start) / 60000)
  if (raw < 1) return null
  // 설정: 타이머 기록을 5분 단위로 (2분 이하 짧은 기록은 그대로)
  const dur = settings().roundRec && raw > 2 ? Math.max(5, Math.round(raw / 5) * 5) : raw
  // id 를 구간 시작으로 고정하면 두 기기가 같은 구간을 기록해도 하나로 합쳐짐
  const s = put('sessions', { ...(id ? { id } : {}), subjectId, taskId, ...(lectureId ? { lectureId } : {}), start, end, dur, date: tsToYmd(start), kind, ...(note ? { note } : {}) })
  if (taskId) log(taskId, 'study', `${dur}분 공부`)
  return s
}

// 인강: n강 완료 표시/취소 (n 없으면 다음 강 완료)
export function markLecture(id, n) {
  const l = find('lectures', id)
  if (!l) return null
  const done = { ...(l.done || {}) }
  if (n == null) { n = 1; while (done[n] && n <= l.total) n++; if (n > l.total) return null }
  if (done[n]) delete done[n]; else done[n] = today()
  patch('lectures', id, { done })
  return n
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

// 완료한 지 30일 지난 할 일은 보관함으로 (설정에서 끌 수 있음)
export function autoArchive() {
  if (settings().autoArchive === false) return 0
  const cut = Date.now() - 30 * 86400000
  const old = list('tasks').filter((t) => t.done && !t.archived && t.doneAt && t.doneAt < cut)
  if (old.length) batch(() => old.forEach((t) => patch('tasks', t.id, { archived: true })))
  return old.length
}
