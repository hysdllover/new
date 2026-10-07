// 노트 전체 zip: 과목 폴더마다 마크다운 + attachments 폴더의 그림·파일 — 노션·옵시디언에서 그대로 열림
import { list, find } from '../store/store.js'
import { toMarkdown, noteTitle } from './notes.js'
import { getBlob } from './files.js'

const safe = (s) => String(s || '제목 없음').replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '제목 없음'

// onProgress(지금, 전체) · signal.aborted 면 멈춤
const stop = (signal) => { if (signal?.aborted) throw Object.assign(new Error('취소'), { name: 'AbortError' }) }
export async function notesZip(notes, { onProgress, signal } = {}) {
  const { zipSync, strToU8 } = await import('fflate')
  const subjects = list('subjects'), files = {}, used = new Set(), att = new Map()
  const pathOf = new Map()
  for (const n of notes) {
    const folder = n.type === 'daily' ? '데일리' : safe(subjects.find((s) => s.id === n.subjectId)?.name || '노트')
    let p = `${folder}/${safe(noteTitle(n))}.md`, k = 2
    while (used.has(p)) p = `${folder}/${safe(noteTitle(n))} ${k++}.md`
    used.add(p); pathOf.set(n.id, p)
  }
  for (const n of notes) {
    stop(signal)
    const md = toMarkdown(n, {
      fileRef: (b) => {
        const f = find('files', b.fileId); if (!f) return ''
        const name = att.get(f.id)?.name || `${f.id.slice(-6)}-${safe(f.name).replace(/\s/g, '_')}`
        att.set(f.id, { name, f })
        const href = '../attachments/' + encodeURIComponent(name)
        return f.type?.startsWith('image') ? `![${f.name}](${href})` : `[${f.name}](${href})`
      },
      pageRef: (c) => c ? `[[${noteTitle(c)}]]` : '',
    })
    files[pathOf.get(n.id)] = strToU8(md)
  }
  let i = 0
  for (const [, { name, f }] of att) {
    stop(signal)
    onProgress?.(++i, att.size)
    try { const b = await getBlob(f.id); if (b) files['attachments/' + name] = new Uint8Array(await b.arrayBuffer()) } catch {}
  }
  stop(signal)
  return zipSync(files, { level: 6 })
}

export const exportableNotes = () => list('notes').filter((n) => !n.isTemplate || (n.blocks || []).length)
