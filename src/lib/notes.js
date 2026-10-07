import { list, put, patch, find, remove, settings, setSettings, batch } from '../store/store.js'
import { plainText } from './marks.js'
import { tableMd } from './table.js'
import { addTask, updateTask, toggleTask } from '../store/actions.js'
import { parseMention, fmtTime } from '../engine/date.js'
import { uid } from '../store/store.js'

export const LINK_RE = /\[\[([^\]]+)\]\]/g
export const newBlock = (type = 'text', text = '') => ({ id: uid(), type, text })

export const noteTitle = (n) => n?.title || '제목 없음'
export const findByTitle = (title) => list('notes').find((n) => (n.title || '').trim() === title.trim())

export function openOrCreateByTitle(title) {
  return findByTitle(title) || put('notes', { title: title.trim(), type: 'page', blocks: [newBlock()] })
}

export function dailyNote(date, create) {
  const n = list('notes').find((x) => x.type === 'daily' && x.date === date)
  if (n || !create) return n
  return put('notes', { id: 'daily-' + date, title: date, type: 'daily', date, blocks: [newBlock()] })
}

// 블록 텍스트 전체 (동기화 블록 포함)
export function allBlocks(note) {
  const out = []
  const walk = (bs) => { for (const b of bs || []) {
    if (b.type === 'sync') walk(find('syncBlocks', b.syncId)?.blocks)
    else if (b.type === 'cols') for (const c of b.cols || []) walk(c) // 두 단: 왼쪽 → 오른쪽
    else if (b.type === 'toggle') { out.push(b); walk(b.children) }
    else out.push(b)
  } }
  walk(note.blocks)
  return out
}
export const noteText = (note) => allBlocks(note).map((b) => b.text || (b.rows ? b.rows.map((r) => r.join(' ')).join('\n') : '')).join('\n')

export function linksOf(note) {
  const set = new Set()
  for (const m of noteText(note).matchAll(LINK_RE)) set.add(m[1].trim())
  return [...set]
}

export function backlinks(note, notes = list('notes')) {
  const t = (note.title || '').trim()
  if (!t) return []
  return notes.filter((n) => n.id !== note.id && linksOf(n).includes(t))
}

// 날짜를 언급(@)한 노트
export function mentionsOf(date, notes = list('notes')) {
  return notes.filter((n) => allBlocks(n).some((b) => b.ref?.date === date))
}

// 블록 편집이 끝났을 때: 체크박스 ↔ 할 일, @날짜 → 일정/할 일
export function commitBlock(block, note) {
  let b = { ...block }
  const text = (b.text || '').trim()
  if (b.type === 'todo' && text) {
    const m = parseMention(text)
    const title = plainText((m ? m.rest : text).replace(LINK_RE, '$1'))
    if (!b.taskId || !find('tasks', b.taskId)) {
      const t = addTask({ title, noteId: note?.id, subjectId: note?.subjectId || null, projectId: note?.projectId || null, due: m?.date || null, dueTime: m?.time ?? null })
      b.taskId = t.id
    } else {
      const t = find('tasks', b.taskId)
      const p = {}
      if (t.title !== title) p.title = title
      if (m && t.due !== m.date) { p.due = m.date; p.dueTime = m.time }
      if (Object.keys(p).length) updateTask(b.taskId, p, { silentLog: !p.due })
    }
    if (m) b.ref = { type: 'task', id: b.taskId, date: m.date, time: m.time }
    return b
  }
  if (b.type !== 'todo' && b.type !== 'divider') {
    const m = parseMention(text)
    if (m && (!b.ref || b.ref.date !== m.date || b.ref.time !== m.time)) {
      const title = plainText(m.rest.replace(LINK_RE, '$1')) || note?.title || '메모'
      if (b.ref?.type === 'event' && find('events', b.ref.id)) {
        patch('events', b.ref.id, { date: m.date, start: m.time, end: m.time != null ? m.time + 60 : null })
      } else if (b.ref?.type === 'task' && find('tasks', b.ref.id)) {
        updateTask(b.ref.id, { due: m.date, dueTime: m.time })
      } else if (m.time != null) {
        const e = put('events', { title, date: m.date, start: m.time, end: m.time + 60, noteId: note?.id, subjectId: note?.subjectId, projectId: note?.projectId })
        b.ref = { type: 'event', id: e.id }
      } else {
        const t = addTask({ title, due: m.date, noteId: note?.id, subjectId: note?.subjectId || null, projectId: note?.projectId || null })
        b.ref = { type: 'task', id: t.id }
      }
      b.ref = { ...b.ref, date: m.date, time: m.time }
    }
  }
  return b
}

export const refLabel = (ref) => ref ? `${ref.type === 'event' ? '일정' : '할 일'} ${ref.date.slice(5).replace('-', '/')}${ref.time != null ? ' ' + fmtTime(ref.time) : ''}` : ''

// opts.fileRef(b) · opts.pageRef(note): zip 내보내기에서 그림 경로·하위 페이지 링크를 바꿀 때
export function toMarkdown(note, { fileRef, pageRef } = {}) {
  const tasks = list('tasks')
  const lines = [`# ${noteTitle(note)}`, '']
  // 토글은 <details> 로 감싸서 (끝 표시 _tend)
  const flat = []
  const walk = (bs) => { for (const b of bs || []) {
    if (b.type === 'sync') walk(find('syncBlocks', b.syncId)?.blocks)
    else if (b.type === 'cols') for (const c of b.cols || []) walk(c)
    else if (b.type === 'toggle') { flat.push(b); walk(b.children); flat.push({ type: '_tend' }) }
    else flat.push(b)
  } }
  walk(note.blocks)
  for (const b of flat) {
    const t = (b.text || '').replace(/==[rgby]:/g, '==').replace(/(^|[^_\w])__([^_\n]+?)__(?![_\w])/g, '$1<u>$2</u>') // 앱 밑줄 → <u>
      .replace(/\{\{[rgbvm]:([^{}\n]+)\}\}/g, '$1').replace(/\{\{D:([^{}\n]+)\}\}/g, '$1')
      .replace(/\^([^\s^]{1,24})\^/g, '<sup>$1</sup>').replace(/(?<!~)~([^\s~]{1,24})~(?!~)/g, '<sub>$1</sub>')
    const pad = '  '.repeat(b.indent || 0)
    switch (b.type) {
      case 'h1': lines.push(`## ${t}`); break
      case 'h2': lines.push(`### ${t}`); break
      case 'bullet': lines.push(`${pad}${b.num ? b.num + '.' : '-'} ${t}`); break
      case 'todo': lines.push(`${pad}- [${tasks.find((x) => x.id === b.taskId)?.done ? 'x' : ' '}] ${t}`); break
      case 'code': lines.push('```' + (b.lang || ''), b.text || '', '```'); break
      case 'quote': lines.push(t.split('\n').map((x) => `> ${x}`).join('\n')); break
      case 'divider': lines.push(b.text ? `--- ${b.text} ---` : '---'); break
      case 'file': lines.push(fileRef ? fileRef(b) : `[첨부: ${find('files', b.fileId)?.name || '파일'}]`); break
      case 'embed': lines.push(`<!-- ${b.embed?.kind} -->`); break
      case 'callout': lines.push(`> [!${({ key: 'note', warn: 'warning', ex: 'example', rose: 'quote', olive: 'summary', sand: 'question' })[b.tone || 'key'] || 'note'}]`, ...t.split('\n').map((x) => `> ${x}`)); break
      case 'table': lines.push(...tableMd(b)); break
      case 'link': lines.push(`[${b.title || b.url}](${b.url})`); break
      case 'board': for (const c of b.cols || []) { lines.push(`**${c.name}**`, ...(c.cards || []).map((x) => `- ${x.text}`), '') } break
      case 'toggle': lines.push(`<details><summary>${t}</summary>`); break
      case '_tend': lines.push('</details>'); break
      case 'page': lines.push(pageRef ? pageRef(find('notes', b.pageId)) : `[하위 페이지: ${noteTitle(find('notes', b.pageId))}]`); break
      default: lines.push(t)
    }
    if (!['bullet', 'todo'].includes(b.type)) lines.push('')
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

// 공유 시트(단축어)로 들어온 글·링크 → 새 노트 (?note=내용&url=링크&title=제목)
export function noteFromShare({ text = '', url = '', title = '' }) {
  text = text.trim(); url = url.trim(); title = title.trim()
  const urlIn = url || (text.match(/https?:\/\/\S+/) || [])[0] || ''
  let body = text
  if (urlIn && body.includes(urlIn)) body = body.replace(urlIn, '').trim()
  let host = ''
  try { host = urlIn ? new URL(urlIn).hostname.replace(/^www\./, '') : '' } catch {}
  const first = body.split('\n').find((l) => l.trim()) || ''
  const name = (title || (first.length <= 60 ? first : first.slice(0, 40) + '…') || host || '공유한 내용').slice(0, 80)
  const blocks = []
  if (urlIn) blocks.push(newBlock('quote', urlIn))
  for (const line of body.split('\n')) if (line.trim() && !(line.trim() === name && !title)) blocks.push(newBlock('text', line.trim()))
  blocks.push(newBlock('h2', '메모'), newBlock('text'))
  return put('notes', { title: name, type: 'page', icon: '🔖', clip: { url: urlIn, at: Date.now() }, blocks })
}

// 노트가 가리키는 할 일 id (체크 줄 · @날짜 메모) — 두 단 · 토글 · 동기화 블록 안까지
export function noteTaskRefs(note, out = new Set()) {
  const walk = (bs) => { for (const b of bs || []) {
    if (b.taskId && b.type === 'todo') out.add(b.taskId)
    if (b.ref?.type === 'task' && b.ref.id) out.add(b.ref.id)
    if (b.type === 'sync') walk(find('syncBlocks', b.syncId)?.blocks)
    if (b.type === 'cols') for (const c of b.cols || []) walk(c)
    if (b.type === 'toggle') walk(b.children)
  } }
  walk(note?.blocks)
  return out
}
// 노트로 만든 할 일 중 지금 어느 노트에도 할 일로 없는 것 지우기 (한 번 정리)
export function cleanNoteTasks() {
  const refs = new Set()
  for (const n of list('notes')) noteTaskRefs(n, refs)
  const gone = list('tasks').filter((t) => t.noteId && !refs.has(t.id))
  if (gone.length) batch(() => gone.forEach((t) => remove('tasks', t.id)))
  return gone
}
export async function cleanNoteTasksOnce() {
  if (settings().noteTaskClean1) return
  const gone = cleanNoteTasks()
  setSettings({ noteTaskClean1: true })
  if (gone.length) { const { toast } = await import('../components/ui.jsx'); const { restore } = await import('../store/store.js'); toast(`노트에 없는 할 일 ${gone.length}개를 정리했어요`, { label: '되돌리기', fn: () => gone.forEach((t) => restore('tasks', t.id)) }) }
}

// 체크 줄은 할 일로 연결 (완료 표시된 줄은 완료 상태로) · 하위 블록까지
export const linkTodos = (blocks, note) => blocks.map((b) => {
  if (b.type === 'toggle') return { ...b, children: linkTodos(b.children || [], note) }
  if (b.type !== 'todo') return b
  const { done, ...rest } = b
  const nb = commitBlock(rest, note)
  if (done && nb.taskId) toggleTask(nb.taskId)
  return nb
})
