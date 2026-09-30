import { useEffect, useState, useSyncExternalStore } from 'react'
import { addSession, markLecture } from '../store/actions.js'
import { settings } from '../store/store.js'
import { toast } from '../components/ui.jsx'
import { keepAwake } from './notify.js'

// 진행 중 타이머 (기기별 localStorage 유지 → 새로고침해도 계속)
// { mode: 'stopwatch'|'countdown', subjectId, taskId, segStart, acc, paused, pausedAt, target(ms, 타이머만) }
const KEY = 'timer'
let t = (() => { try { const x = JSON.parse(localStorage.getItem(KEY)); return x?.mode === 'pomodoro' ? { mode: 'stopwatch', subjectId: x.subjectId, taskId: x.taskId, segStart: x.segStart, acc: x.acc || 0, paused: x.paused || x.phase === 'break', pausedAt: x.pausedAt || Date.now() } : x } catch { return null } })()
const L = new Set()
const set = (next) => {
  const was = t
  t = next; try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY) } catch {} L.forEach((l) => l())
  // 시작·일시정지·종료 때만 알림 (과목 바꿈 등은 제외)
  if (!was !== !next || was?.paused !== next?.paused) try { window.dispatchEvent(new Event('timer-change')) } catch {}
}
export const useTimerState = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => t)
export const getTimer = () => t

export function useTick(on = true) {
  const [, s] = useState(0)
  useEffect(() => { if (!on) return; const i = setInterval(() => s((x) => x + 1), 1000); return () => clearInterval(i) }, [on])
}

// 누적(ms): 일시정지 전까지 + 현재 구간
export const elapsed = (x = t) => !x ? 0 : (x.acc || 0) + (x.paused ? 0 : Date.now() - x.segStart)
// 타이머 남은 시간(ms)
export const remaining = (x = t) => (x?.mode === 'countdown' ? Math.max(0, x.target - elapsed(x)) : 0)

function flush(x) {
  // 현재 공부 구간을 세션으로 저장
  if (!x || x.paused) return null
  return addSession({ subjectId: x.subjectId, taskId: x.taskId, lectureId: x.lectureId, start: x.segStart, end: Date.now(), kind: x.mode })
}

export function startStopwatch(subjectId, taskId, lectureId) {
  if (t) stop()
  set({ mode: 'stopwatch', subjectId, taskId, ...(lectureId ? { lectureId } : {}), segStart: Date.now(), acc: 0 })
  if (settings().wakeLock !== false) keepAwake(true)
}
// 타이머: 정한 시간이 지나면 자동으로 멈추고 기록
export function startCountdown(subjectId, minutes, taskId) {
  if (t) stop()
  set({ mode: 'countdown', subjectId, taskId, segStart: Date.now(), acc: 0, target: minutes * 60000 })
  if (settings().wakeLock !== false) keepAwake(true)
}
export function pause() {
  if (!t || t.paused) return
  flush(t)
  set({ ...t, paused: true, acc: elapsed(t), pausedAt: Date.now() })
}
export function resume() {
  if (!t?.paused) return
  set({ ...t, paused: false, segStart: Date.now() })
}
export function stop() {
  if (!t) return
  const last = flush(t), was = t
  const total = Math.round(elapsed(t) / 60000)
  set(null)
  keepAwake(false)
  const lec = was.lectureId
  // 인강 듣기로 시작했으면 바로 다음 강 완료 표시
  if (lec) toast(total >= 1 ? `${total}분 기록했어요` : '인강 듣기를 마쳤어요', { label: '＋1강', fn: () => { const n = markLecture(lec); if (n) toast(`${n}강 완료`) } })
  else if (total >= 1) toast(`${total}분 기록했어요`, last ? { label: '수정', fn: () => import('../views/study/Log.jsx').then((m) => m.openRecord(last)) } : undefined)
}
export const setTimerTask = (taskId, subjectId) => t && set({ ...t, taskId, subjectId: subjectId ?? t.subjectId })

// 타이머 끝 확인 (1초마다)
function countdownTick() {
  if (!t || t.mode !== 'countdown' || t.paused || remaining(t) > 0) return
  const min = Math.round(t.target / 60000)
  // 끝난 시각 기준으로 정확히 기록
  const end = t.segStart + (t.target - (t.acc || 0))
  addSession({ subjectId: t.subjectId, taskId: t.taskId, lectureId: t.lectureId, start: t.segStart, end, kind: 'countdown' })
  set(null); keepAwake(false)
  notify('타이머 끝', `${min}분 공부를 기록했어요`)
}

function notify(title, body) {
  toast(`⏱ ${title} · ${body}`)
  try { navigator.vibrate?.([200, 100, 200]) } catch {}
  try { if (Notification.permission === 'granted') navigator.serviceWorker?.ready.then((r) => r.showNotification(title, { body })) } catch {}
}

setInterval(countdownTick, 1000)
