// 일정 템플릿: 자주 쓰는 일정(시간·이동·준비물·과목·알림)을 한 번에 넣기 — settings().eventTemplates (동기화)
import { put, settings, setSettings, uid } from '../store/store.js'

const KEYS = ['title', 'dur', 'bufferBefore', 'bufferAfter', 'location', 'subjectId', 'color', 'remind', 'note', 'studyLog']
export const eventTemplates = () => settings().eventTemplates || []

export function saveEventTemplate(e, name) {
  const tpl = { id: uid(), name: name || e.title || '일정', dur: e.start != null && e.end != null ? e.end - e.start : 60 }
  for (const k of KEYS) if (k !== 'dur' && e[k] != null && e[k] !== '') tpl[k] = e[k]
  setSettings((s) => ({ eventTemplates: [...(s.eventTemplates || []).filter((x) => x.name !== tpl.name), tpl] }))
  return tpl
}
export const removeEventTemplate = (id) => setSettings((s) => ({ eventTemplates: (s.eventTemplates || []).filter((x) => x.id !== id) }))

export function addFromTemplate(tpl, { date, start, title } = {}) {
  const s = start ?? 9 * 60
  const { id, name, dur, ...rest } = tpl
  return put('events', { ...rest, title: title || tpl.title || name, date, start: s, end: s + (dur || 60) })
}
