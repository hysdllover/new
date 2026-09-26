import { list, settings } from '../store/store.js'
import { occurrences } from './recurrence.js'
import { addDays, today, nowMin } from './date.js'

// 날짜별 일정(반복 전개 포함)
export function eventsOn(date, events = list('events')) {
  const out = []
  for (const e of events) {
    if (e.endDate && e.endDate > e.date && !e.repeat) {
      if (date >= e.date && date <= e.endDate) out.push({ ...e, occ: date })
      continue
    }
    if (e.repeat ? occurrences(e.repeat, e.date, date, date).length : e.date === date) out.push({ ...e, occ: date })
  }
  return out.sort((a, b) => (a.start ?? -1) - (b.start ?? -1))
}

export const blocksOn = (date, blocks = list('blocks')) => blocks.filter((b) => b.date === date).sort((a, b) => a.start - b.start)

// 바쁜 구간: 일정(+앞뒤 버퍼) + 타임블록
export function busy(date, excludeId) {
  const out = []
  for (const e of eventsOn(date)) {
    if (e.start == null) continue
    out.push({ s: e.start - (e.bufferBefore || 0), e: (e.end ?? e.start + 60) + (e.bufferAfter || 0), id: e.id, type: 'event' })
  }
  for (const b of blocksOn(date)) if (b.id !== excludeId) out.push({ s: b.start, e: b.start + b.dur, id: b.id, type: 'block' })
  return out.sort((a, b) => a.s - b.s)
}

export function freeSlots(date, from, to) {
  const st = settings()
  from = from ?? st.dayStart
  to = to ?? st.dayEnd
  const gaps = []
  let cur = from
  for (const b of busy(date)) {
    if (b.e <= cur) continue
    if (b.s > cur) gaps.push({ s: cur, e: Math.min(b.s, to) })
    cur = Math.max(cur, b.e)
    if (cur >= to) break
  }
  if (cur < to) gaps.push({ s: cur, e: to })
  return gaps.filter((g) => g.e - g.s >= 10)
}

const roundUp = (m, step = 10) => Math.ceil(m / step) * step

// 오늘이면 현재 시각 이후만
export function findSlot(date, dur, after) {
  const start = date === today() ? Math.max(settings().dayStart, roundUp(nowMin())) : settings().dayStart
  for (const g of freeSlots(date, Math.max(start, after ?? 0))) if (g.e - g.s >= dur) return g.s
  return null
}

// 여러 날에 걸쳐 n개 세션 배치
export function planSessions(n, dur, fromDate, maxDays = 30) {
  const out = []
  let d = fromDate
  for (let i = 0; i < maxDays && out.length < n; i++, d = addDays(d, 1)) {
    const s = findSlot(d, dur)
    if (s != null) out.push({ date: d, start: s })
  }
  return out
}

// 연쇄 재조정: 한 항목을 옮기면 뒤따르는 블록들을 겹치지 않게 밀어냄. 일정(event)은 고정.
export function cascade(date, moved) {
  const items = blocksOn(date).filter((b) => b.id !== moved.id).map((b) => ({ id: b.id, s: b.start, d: b.dur, title: b.title }))
  const fixed = eventsOn(date).filter((e) => e.start != null && e.id !== moved.id).map((e) => ({ s: e.start - (e.bufferBefore || 0), e: (e.end ?? e.start + 60) + (e.bufferAfter || 0) }))
  const occupied = [{ s: moved.start, e: moved.start + moved.dur }, ...fixed]
  const changes = []
  // 옮긴 항목과 겹치거나 그 뒤에 있는 블록만 순서대로 밀기
  const after = items.filter((b) => b.s + b.d > moved.start).sort((a, b) => a.s - b.s)
  for (const b of after) {
    let s = b.s
    let guard = 0
    while (guard++ < 50) {
      const hit = occupied.find((o) => s < o.e && s + b.d > o.s)
      if (!hit) break
      s = hit.e
    }
    occupied.push({ s, e: s + b.d })
    if (s !== b.s) changes.push({ id: b.id, title: b.title, from: b.s, to: s })
  }
  return changes
}

// 자투리 시간: 지금 이후 빈 틈 (10~90분)
export function gapsToday() {
  const d = today()
  return freeSlots(d, Math.max(settings().dayStart, roundUp(nowMin(), 5))).filter((g) => g.e - g.s <= 90)
}
