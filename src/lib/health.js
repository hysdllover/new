// 건강 앱(단축어 자동화)에서 넘어온 수면·걸음 → 컨디션 기록
// ?health=1&sleep=값&steps=값[&date=YYYY-MM-DD] · 수면은 시간·분·초 어느 단위든 자동 판별
import { put, find } from '../store/store.js'
import { today } from '../engine/date.js'

export function toSleepHours(v) {
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''))
  if (!isFinite(n) || n <= 0) return null
  const h = n > 1000 ? n / 3600 : n > 24 ? n / 60 : n // 초 · 분 · 시간
  return Math.round(h * 10) / 10
}
export const toSteps = (v) => { const n = Math.round(parseFloat(String(v).replace(/[^\d.]/g, ''))); return isFinite(n) && n >= 0 ? n : null }

export function importHealth(q) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q.get('date') || '') ? q.get('date') : today()
  const sleep = q.get('sleep') != null ? toSleepHours(q.get('sleep')) : null
  const steps = q.get('steps') != null ? toSteps(q.get('steps')) : null
  if (sleep == null && steps == null) return null
  const prev = find('conditions', date) || { id: date }
  put('conditions', { ...prev, id: date, ...(sleep != null ? { sleep } : null), ...(steps != null ? { steps } : null), healthAt: Date.now() })
  return { date, sleep, steps }
}
