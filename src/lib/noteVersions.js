// 노트 이전 버전: 편집을 시작할 때(10분 넘게 쉬었다가) 바로 전 내용을 이 기기에 보관 · 노트마다 최근 40개
import { get, set } from 'idb-keyval'
import { onChange, patch, find } from '../store/store.js'

const KEY = (id) => 'nv:' + id, GAP = 10 * 60000, MAX = 40
const last = new Map()
const same = (a, b) => a && b && a.title === (b.title || '') && JSON.stringify(a.blocks) === JSON.stringify(b.blocks || [])

async function snap(n) {
  const l = (await get(KEY(n.id)).catch(() => null)) || []
  if (same(l[0], n)) return
  l.unshift({ at: n.updatedAt || Date.now(), title: n.title || '', blocks: n.blocks || [] })
  await set(KEY(n.id), l.slice(0, MAX)).catch(() => {})
}

export function startNoteVersions() {
  onChange((coll, rec, prev) => {
    if (coll !== 'notes' || !prev || rec.deleted || prev.deleted) return
    if (prev.blocks === rec.blocks && prev.title === rec.title) return
    if (Date.now() - (last.get(rec.id) || 0) < GAP) return
    last.set(rec.id, Date.now())
    snap(prev)
  })
}

export const versionsOf = async (id) => (await get(KEY(id)).catch(() => null)) || []

// 되돌리기 전 지금 내용도 버전으로 남김
export async function restoreVersion(id, v) {
  const cur = find('notes', id)
  if (cur) await snap(cur)
  last.set(id, Date.now())
  patch('notes', id, { title: v.title, blocks: v.blocks })
}
