import { useEffect, useState, useSyncExternalStore } from 'react'
import { addSession } from '../store/actions.js'
import { settings } from '../store/store.js'
import { toast } from '../components/ui.jsx'
import { keepAwake } from './notify.js'

// 진행 중 타이머 (기기별 localStorage 유지 → 새로고침해도 계속)
// { mode: 'stopwatch'|'pomodoro', subjectId, taskId, segStart, paused, phase: 'work'|'break', phaseStart, phaseLen, cycle }
const KEY = 'timer'
let t = (() => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } })()
const L = new Set()
const set = (next) => { t = next; try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY) } catch {} L.forEach((l) => l()) }
export const useTimerState = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => t)
export const getTimer = () => t

export function useTick(on = true) {
  const [, s] = useState(0)
  useEffect(() => { if (!on) return; const i = setInterval(() => s((x) => x + 1), 1000); return () => clearInterval(i) }, [on])
}

// 누적(ms): 일시정지 전까지 + 현재 구간
export const elapsed = (x = t) => !x ? 0 : (x.acc || 0) + (x.paused || x.phase === 'break' ? 0 : Date.now() - x.segStart)

function flush(x) {
  // 현재 공부 구간을 세션으로 저장
  if (!x || x.paused || x.phase === 'break') return
  addSession({ subjectId: x.subjectId, taskId: x.taskId, start: x.segStart, end: Date.now(), kind: x.mode })
}

export function startStopwatch(subjectId, taskId) {
  if (t) stop()
  set({ mode: 'stopwatch', subjectId, taskId, segStart: Date.now(), acc: 0 })
  if (settings().wakeLock !== false) keepAwake(true)
}
export function startPomodoro(subjectId, taskId) {
  if (t) stop()
  const p = settings().pomodoro
  set({ mode: 'pomodoro', subjectId, taskId, segStart: Date.now(), acc: 0, phase: 'work', phaseStart: Date.now(), phaseLen: p.work * 60000, cycle: 1 })
  if (settings().wakeLock !== false) keepAwake(true)
}
export function pause() {
  if (!t || t.paused) return
  flush(t)
  set({ ...t, paused: true, acc: elapsed(t), pausedAt: Date.now() })
}
export function resume() {
  if (!t?.paused) return
  const shift = Date.now() - t.pausedAt
  set({ ...t, paused: false, segStart: Date.now(), phaseStart: t.phaseStart ? t.phaseStart + shift : t.phaseStart })
}
export function stop() {
  if (!t) return
  flush(t)
  const total = Math.round(elapsed(t) / 60000)
  set(null)
  keepAwake(false)
  if (total >= 1) toast(`${total}분 기록했어요`)
}
export const setTimerTask = (taskId, subjectId) => t && set({ ...t, taskId, subjectId: subjectId ?? t.subjectId })

// 뽀모도로 단계 전환 확인 (1초마다 호출)
export function pomodoroTick() {
  if (!t || t.mode !== 'pomodoro' || t.paused) return
  const left = t.phaseStart + t.phaseLen - Date.now()
  if (left > 0) return
  const p = settings().pomodoro
  if (t.phase === 'work') {
    flush(t)
    const long = t.cycle % p.every === 0
    set({ ...t, acc: elapsed(t), phase: 'break', phaseStart: Date.now(), phaseLen: (long ? p.long : p.short) * 60000 })
    notifyPhase(long ? '긴 휴식 시간' : '휴식 시간', `${long ? p.long : p.short}분`)
  } else {
    set({ ...t, phase: 'work', segStart: Date.now(), phaseStart: Date.now(), phaseLen: p.work * 60000, cycle: t.cycle + 1 })
    notifyPhase('집중 시작', `${p.work}분`)
  }
}
export function skipPhase() { if (t?.mode === 'pomodoro') set({ ...t, phaseStart: Date.now() - t.phaseLen }), pomodoroTick() }

function notifyPhase(title, body) {
  toast(`⏱ ${title} · ${body}`)
  try { navigator.vibrate?.(200) } catch {}
  try { if (Notification.permission === 'granted') navigator.serviceWorker?.ready.then((r) => r.showNotification(title, { body })) } catch {}
}

setInterval(pomodoroTick, 1000)
