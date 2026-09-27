import { list } from '../store/store.js'
import { parseMention } from '../engine/date.js'

// '#과목' 과 '@날짜 시각' 을 인식
export function parseQuick(text) {
  let rest = text
  let subjectId = null
  const m = rest.match(/#(\S+)/)
  if (m) {
    const s = list('subjects').find((x) => x.name === m[1])
    if (s) { subjectId = s.id; rest = rest.replace(m[0], '').trim() }
  }
  const mm = parseMention(rest)
  return { title: mm ? mm.rest : rest.trim(), date: mm?.date || null, time: mm?.time ?? null, subjectId }
}

