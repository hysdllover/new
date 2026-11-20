import { put, patch, remove, find, list, batch, settings, recordChanges, undoChanges } from './store.js'
import { today, addDays, weekStart, tsYmd } from '../lib/date.js'
import { toast } from '../components/toast.js'

// 바꾼 뒤 '되돌리기' 알림
export function undoToast(text, changes) { if (changes?.length) toast(text, { label: '되돌리기', fn: () => undoChanges(changes) }) }

/* ── 할 일 ── */
export function addTask(t) { return put('tasks', { title: '', done: false, order: Date.now(), ...t }) }
export function toggleTask(id, { quiet = false } = {}) {
  const t = find('tasks', id)
  if (!t) return
  const ch = recordChanges(() => patch('tasks', id, { done: !t.done, doneAt: t.done ? null : Date.now() }))
  if (!quiet && !t.done) undoToast('끝냄 · ' + t.title, ch)
}
export function moveTask(id, due) { const ch = recordChanges(() => patch('tasks', id, { due: due || null })); undoToast(due ? '옮겼어요' : '날짜를 뺐어요', ch) }
export function deleteTask(id) { const t = find('tasks', id); const ch = recordChanges(() => remove('tasks', id)); undoToast('지움 · ' + (t?.title || ''), ch) }
// 순서: 날짜·시간 정리는 사용자가 누를 때만 · 평소엔 사용자가 정한 order
export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0)

/* ── 공부 기록 ── */
export function addSession(s) { return put('sessions', { date: today(), min: 0, ...s, min: Math.max(1, Math.round(s.min || 0)) }) }
export const minsOn = (d, sessions = list('sessions')) => sessions.filter((s) => s.date === d).reduce((a, s) => a + (s.min || 0), 0)
export function weekDays(d = today(), start = settings().weekStart) { const ws = weekStart(d, start); return Array.from({ length: 7 }, (_, i) => addDays(ws, i)) }
export function byArea(sessions) { const m = new Map(); for (const s of sessions) { const k = (s.examId || '') + '|' + (s.area || ''); m.set(k, (m.get(k) || 0) + (s.min || 0)) } return [...m.entries()].map(([k, min]) => { const [examId, area] = k.split('|'); return { examId, area, min } }).sort((a, b) => b.min - a.min) }

/* ── 타이머 (이 기기 · 새로 고침해도 이어서) ── */
const TK = 'x_timer'
export const getTimer = () => { try { return JSON.parse(localStorage.getItem(TK) || 'null') } catch { return null } }
const setTimerRaw = (t) => { try { t ? localStorage.setItem(TK, JSON.stringify(t)) : localStorage.removeItem(TK) } catch {} window.dispatchEvent(new Event('x-timer')) }
export const timerSec = (t = getTimer(), now = Date.now()) => (t ? (t.acc || 0) + (t.run ? (now - t.run) / 1000 : 0) : 0)
export function startTimer(examId = null, area = null) { setTimerRaw({ examId, area, acc: 0, run: Date.now(), start: Date.now() }) }
export function pauseTimer() { const t = getTimer(); if (t?.run) setTimerRaw({ ...t, acc: timerSec(t), run: null }) }
export function resumeTimer() { const t = getTimer(); if (t && !t.run) setTimerRaw({ ...t, run: Date.now() }) }
export function setTimerArea(examId, area) { const t = getTimer(); if (t) setTimerRaw({ ...t, examId, area }) }
// 멈추고 기록 (1분 미만은 버림)
export function stopTimer() {
  const t = getTimer(); if (!t) return null
  const min = Math.round(timerSec(t) / 60); setTimerRaw(null)
  if (min < 1) { toast('1분이 안 돼서 기록하지 않았어요'); return null }
  const s = addSession({ date: tsYmd(t.start), start: t.start, min, examId: t.examId, area: t.area })
  toast(`기록했어요 · ${min}분`)
  return s
}
export const cancelTimer = () => setTimerRaw(null)

/* ── 교재 · 강의 진도 ── */
export function stepMaterial(id, d = 1) { const m = find('materials', id); if (!m) return; const cur = Math.max(0, Math.min(m.total || 9999, (m.current || 0) + d)); patch('materials', id, { current: cur }) }

/* ── 시험 ── */
// 다가오는 시험 (끝낸 시험 · 지난 시험 빼고 날짜순) · 날짜 없는 건 뒤로
export const upcoming = (exams, t0 = today()) => exams.filter((e) => !e.done && (!e.date || e.date >= t0)).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
export function deleteExam(id) { const e = find('exams', id); const ch = recordChanges(() => batch(() => { remove('exams', id); list('scores').filter((s) => s.examId === id).forEach((s) => remove('scores', s.id)) })); undoToast('지움 · ' + (e?.name || '시험'), ch) }
