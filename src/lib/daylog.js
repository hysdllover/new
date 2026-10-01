// 데일리 노트 자동 기록: 하루가 끝나면 그날 공부·완료·일정·컨디션·공부 메모를 데일리 노트 아래에 채움
// 자동 블록은 auto: 'daylog' 표시 → 다시 채우면 그 부분만 바뀜 (직접 쓴 내용은 그대로)
import { list, find, put, patch, settings } from '../store/store.js'
import { eventsOn } from '../engine/scheduler.js'
import { tsToYmd, fmtDur, fmtTime, addDays, today } from '../engine/date.js'
import { newBlock } from './notes.js'

const B = (type, text) => ({ ...newBlock(type, text), auto: 'daylog' })

export function dayLogBlocks(date) {
  const subs = list('subjects'), name = (id) => subs.find((s) => s.id === id)?.name || '기타'
  const ss = list('sessions').filter((s) => s.date === date)
  const total = ss.reduce((a, s) => a + (s.dur || 0), 0)
  const by = {}; for (const s of ss) by[name(s.subjectId)] = (by[name(s.subjectId)] || 0) + (s.dur || 0)
  const done = list('tasks').filter((t) => t.done && t.doneAt && tsToYmd(t.doneAt) === date)
  const left = list('tasks').filter((t) => !t.done && !t.archived && t.due === date)
  const evs = eventsOn(date)
  const c = find('conditions', date)
  const memos = ss.filter((s) => s.note).map((s) => `${name(s.subjectId)}: ${s.note}`)
  if (!total && !done.length && !evs.length && !c && !left.length) return []
  const out = [B('divider', ''), B('h2', '오늘 기록 · 자동')]
  if (total) out.push(B('bullet', `공부 ${fmtDur(total)} — ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fmtDur(v)}`).join(', ')}`))
  if (done.length) out.push(B('bullet', `완료 ${done.length}개 — ${done.slice(0, 12).map((t) => t.title).join(', ')}${done.length > 12 ? ' 외' : ''}`))
  if (left.length) out.push(B('bullet', `못 한 일 ${left.length}개 — ${left.slice(0, 8).map((t) => t.title).join(', ')}`))
  if (evs.length) out.push(B('bullet', `일정 — ${evs.map((e) => (e.start != null ? fmtTime(e.start) + ' ' : '') + e.title).join(', ')}`))
  if (c) out.push(B('bullet', `컨디션 — ${[c.sleep != null && `수면 ${c.sleep}시간`, c.mood && `기분 ${c.mood}/5`, c.energy && `에너지 ${c.energy}/5`, c.steps != null && `걸음 ${c.steps.toLocaleString()}`].filter(Boolean).join(' · ') || '기록 없음'}`))
  for (const m of memos.slice(0, 6)) out.push(B('text', m))
  return out
}

export function writeDayLog(date) {
  const blocks = dayLogBlocks(date)
  const id = 'daily-' + date
  const n = find('notes', id) || list('notes').find((x) => x.type === 'daily' && x.date === date)
  const mine = (n?.blocks || []).filter((b) => b.auto !== 'daylog')
  if (!blocks.length && !(n?.blocks || []).some((b) => b.auto === 'daylog')) return null
  const next = [...mine.filter((b, i) => !(i === mine.length - 1 && b.type === 'text' && !b.text && blocks.length)), ...blocks]
  if (n) patch('notes', n.id, { blocks: next.length ? next : [newBlock()], daylogAt: Date.now() })
  else put('notes', { id, title: date, type: 'daily', date, blocks: next, daylogAt: Date.now() })
  return blocks.length
}

// 날짜가 바뀌면 지난 3일 중 아직 안 채운 날 채우기
export function autoDayLog() {
  if (settings().daylog === false) return
  for (let i = 1; i <= 3; i++) {
    const d = addDays(today(), -i), n = find('notes', 'daily-' + d)
    if (n?.daylogAt && tsToYmd(n.daylogAt) > d) continue
    writeDayLog(d)
  }
}
