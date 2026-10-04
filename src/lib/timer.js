import { createElement, useEffect, useState, useSyncExternalStore } from 'react'
import { addSession, markLecture } from '../store/actions.js'
import { settings, put, find, subscribe, deviceId, list } from '../store/store.js'
import { toast } from '../components/ui.jsx'
import { keepAwake } from './notify.js'

// 진행 중 타이머 — localStorage(새로고침해도 계속) + 동기화 문서 live.timer(아이폰↔아이패드 연동)
// { mode: 'stopwatch'|'countdown', subjectId, taskId, segStart, acc, paused, pausedAt, target(ms, 타이머만) }
const KEY = 'timer', AT = 'timer_at'
let t = (() => { try { const x = JSON.parse(localStorage.getItem(KEY)); return x?.mode === 'pomodoro' ? { mode: 'stopwatch', subjectId: x.subjectId, taskId: x.taskId, segStart: x.segStart, acc: x.acc || 0, paused: x.paused || x.phase === 'break', pausedAt: x.pausedAt || Date.now() } : x } catch { return null } })()
const L = new Set()
// 마지막으로 반영한 다른 기기 문서 (기기 + 시각) — 기기 간 시계 차이와 무관하게 비교
let seen = (() => { try { return localStorage.getItem(AT) || '' } catch { return '' } })()
const save = (next) => { try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY); localStorage.setItem(AT, seen) } catch {} }
const set = (next) => {
  const was = t
  t = next
  // 다른 기기로 전달 (동기화되는 문서)
  put('live', { id: 'timer', state: next || null, by: deviceId })
  save(next)
  L.forEach((l) => l())
  // 시작·일시정지·종료 때만 알림 (과목 바꿈 등은 제외)
  if (!was !== !next || was?.paused !== next?.paused) try { window.dispatchEvent(new Event('timer-change')) } catch {}
}
// 다른 기기에서 시작·정지한 타이머 받기 (내가 쓴 건 무시, 더 새로운 것만)
function applyRemote() {
  const r = find('live', 'timer')
  if (!r || r.deviceId === deviceId) return
  const key = r.deviceId + ':' + r.updatedAt
  if (key === seen) return
  seen = key
  t = r.state || null
  save(t)
  L.forEach((l) => l())
}
subscribe(applyRemote)

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
  return addSession({ id: 'tm-' + x.segStart, subjectId: x.subjectId, taskId: x.taskId, lectureId: x.lectureId, start: x.segStart, end: Date.now(), kind: x.mode })
}

export function startStopwatch(subjectId, taskId, lectureId) {
  if (t) stop()
  set({ mode: 'stopwatch', subjectId, taskId, ...(lectureId ? { lectureId } : {}), segStart: Date.now(), runStart: Date.now(), acc: 0 })
  if (settings().wakeLock !== false) keepAwake(true)
}
// 타이머: 정한 시간이 지나면 자동으로 멈추고 기록
export function startCountdown(subjectId, minutes, taskId) {
  if (t) stop()
  set({ mode: 'countdown', subjectId, taskId, segStart: Date.now(), runStart: Date.now(), acc: 0, target: minutes * 60000 })
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
  else if (total >= 1) askWrap(was, total, last)
}
export const setTimerTask = (taskId, subjectId) => t && set({ ...t, taskId, subjectId: subjectId ?? t.subjectId })

// 타이머 끝 확인 (1초마다)
function countdownTick() {
  if (!t || t.mode !== 'countdown' || t.paused || remaining(t) > 0) return
  const min = Math.round(t.target / 60000)
  // 끝난 시각 기준으로 정확히 기록
  const end = t.segStart + (t.target - (t.acc || 0))
  addSession({ id: 'tm-' + t.segStart, subjectId: t.subjectId, taskId: t.taskId, lectureId: t.lectureId, start: t.segStart, end, kind: 'countdown' })
  const was = t
  set(null); keepAwake(false)
  notify('타이머 끝', `${min}분 공부를 기록했어요`)
  if (document.visibilityState === 'visible') askWrap(was, min, null)
}

// 끝낸 뒤 한 줄 메모·집중도 묻기 (이번 타이머로 생긴 구간 모두)
function askWrap(was, total, last) {
  const from = was.runStart || was.segStart
  const ids = list('sessions').filter((s) => s.id?.startsWith('tm-') && s.start >= from && s.subjectId === was.subjectId).map((s) => s.id)
  if (last && !ids.includes(last.id)) ids.push(last.id)
  if (!ids.length) return
  Promise.all([import('../components/StudyWrap.jsx'), import('../components/ui.jsx')]).then(([{ default: StudyWrap }, { openSheet }]) =>
    openSheet((close) => createElement(StudyWrap, { ids, min: total, close }), { title: '공부 기록' }))
}

function notify(title, body) {
  toast(`⏱ ${title} · ${body}`)
  try { navigator.vibrate?.([200, 100, 200]) } catch {}
  try { if (Notification.permission === 'granted') navigator.serviceWorker?.ready.then((r) => r.showNotification(title, { body })) } catch {}
}

setInterval(countdownTick, 1000)
