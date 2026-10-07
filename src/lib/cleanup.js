// 기기 정리: 지운 노트의 이전 버전 · 어디에서도 쓰지 않는 첨부
import { keys, delMany } from 'idb-keyval'
import { getState, list, patch, remove, settings } from '../store/store.js'

const D = 86400000

// 휴지통에서 완전히 지운 노트(또는 비운 지 30일 넘은 노트)의 이전 버전 기록 지우기
export async function cleanVersions() {
  const ks = (await keys().catch(() => [])).filter((k) => typeof k === 'string' && k.startsWith('nv:'))
  const notes = getState().notes || {}
  const gone = ks.filter((k) => { const n = notes[k.slice(3)]; return !n || n.purged || (n.deleted && Date.now() - (n.deletedAt || 0) > 30 * D) })
  if (gone.length) await delMany(gone).catch(() => {})
  return gone.length
}

// 블록·할 일·기록 어디에서도 쓰지 않는 첨부: 처음 발견한 날을 적고, 30일 뒤에도 그대로면 휴지통으로
// 자료실에 직접 넣은 파일(첨부 표시 없음)은 건드리지 않음 · 이 기기에만 두는 항목이 있으면 판단할 수 없어 쉼
export function sweepFiles(now = Date.now()) {
  const ex = settings().syncExclude || {}
  if (Object.values(ex).some(Boolean)) return 0
  const st = getState()
  const text = JSON.stringify(Object.entries(st).filter(([c]) => c !== 'files' && c !== 'live').map(([, v]) => v))
  let n = 0
  for (const f of list('files')) {
    if (!f.att && !f.noteId) continue
    const used = text.includes('"' + f.id + '"')
    if (used) { if (f.orphanAt) patch('files', f.id, { orphanAt: null }) }
    else if (!f.orphanAt) patch('files', f.id, { orphanAt: now })
    else if (now - f.orphanAt > 30 * D) { remove('files', f.id); n++ }
  }
  return n
}
