// 가져오기 계획(importPlan.js) → 노트·첨부로 만들기
import { put, patch, find, uid, onChange, remove, batch } from '../store/store.js'
import { addFile, deleteFile } from './files.js'
import { linkTodos } from './notes.js'
export { planFromZip, planFromFileList, planFromHtml, planFromDocx, planFromPdf, htmlToBlocks } from './importPlan.js'
import { mdToNote } from './md.js'

/* ── 되돌리기: fn 이 만든 항목은 휴지통으로, 고친 항목은 전 내용으로 ── */
export async function withUndo(fn) {
  const made = new Map(), before = new Map()
  const off = onChange((c, rec, prev) => {
    const k = c + ':' + rec.id
    if (made.has(k) || before.has(k)) return
    if (!prev || prev.deleted) made.set(k, [c, rec.id]); else before.set(k, [c, prev])
  })
  let result
  try { result = await fn() } finally { off() }
  const undo = () => batch(() => {
    for (const [c, id] of made.values()) c === 'files' ? deleteFile(id) : remove(c, id)
    for (const [c, prev] of before.values()) { const { updatedAt, deviceId, ...rest } = prev; put(c, rest) }
  })
  return { result, undo, made: made.size }
}

// 같은 제목 노트가 이미 있는 맨 위 페이지(와 그 하위 페이지)를 뺀 계획
export function dropDuplicates(plan, titles) {
  const drop = new Set(plan.pages.filter((p) => !p.parent && titles.has(String(p.title || '').trim())).map((p) => p.key))
  for (let more = true; more;) { more = false; for (const p of plan.pages) if (p.parent && drop.has(p.parent) && !drop.has(p.key)) { drop.add(p.key); more = true } }
  return { ...plan, pages: plan.pages.filter((p) => !drop.has(p.key)) }
}

/* ── 계획 → 노트 만들기 ── */
// parentId: 맨 위 페이지들을 넣을 상위 노트 · 하위 관계는 그대로 (부모 노트 안에 하위 페이지 블록)
export async function commitPlan(plan, { subjectId = null, parentId = null } = {}) {
  const fileIds = {}
  for (const [t, im] of Object.entries(plan.imgs || {})) {
    try { const f = new File([im.blob], im.name, { type: im.blob.type }); const r = await addFile(f, { subjectId }); fileIds[t] = r.id } catch {}
  }
  const ids = {}
  for (const pg of plan.pages) ids[pg.key] = uid()
  const fixBlocks = (bs) => (bs || []).flatMap((b) => {
    if (b.type === 'file' && b._img != null) { const { _img, ...r } = b; return fileIds[_img] ? [{ ...r, fileId: fileIds[_img] }] : [] }
    if (b.type === 'page' && b._key != null) return ids[b._key] ? [{ id: b.id, type: 'page', pageId: ids[b._key] }] : []
    if (b.type === 'file' && b._src) return []
    if (b.children) return [{ ...b, children: fixBlocks(b.children) }]
    return [b]
  })
  const made = []
  for (const pg of plan.pages) {
    const pid = pg.parent && ids[pg.parent] ? ids[pg.parent] : parentId
    const n = put('notes', { id: ids[pg.key], title: pg.title, type: 'page', subjectId, parentId: pid, blocks: [] })
    patch('notes', n.id, { blocks: linkTodos(fixBlocks(pg.blocks), n) })
    made.push(n)
  }
  // 부모 노트 본문에 아직 하위 페이지 블록이 없으면 끝에 붙임
  for (const pg of plan.pages) {
    const pid = pg.parent && ids[pg.parent]; if (!pid) continue
    const p = find('notes', pid); if (!p) continue
    if (!(p.blocks || []).some((b) => b.type === 'page' && b.pageId === ids[pg.key])) patch('notes', pid, { blocks: [...(p.blocks || []).filter((b) => !(b.type === 'text' && !b.text)), { id: uid(), type: 'page', pageId: ids[pg.key] }] })
  }
  return made
}

export const planSummary = (plan) => {
  const blocks = plan.pages.reduce((a, p) => a + p.blocks.length, 0), imgs = Object.keys(plan.imgs || {}).length
  return `${plan.kind ? plan.kind + ' · ' : ''}페이지 ${plan.pages.length}개 · 블록 ${blocks}개${imgs ? ` · 그림 ${imgs}장` : ''}`
}

// 여러 계획 합치기 (파일마다 키·그림 번호가 겹치지 않게 앞에 번호)
export function mergePlans(plans) {
  const pages = [], imgs = {}, kinds = new Set()
  plans.forEach((p, i) => {
    if (p.kind) kinds.add(p.kind)
    const k = (x) => (x == null ? x : i + ':' + x)
    const fix = (bs) => (bs || []).map((b) => ({ ...b, ...(b._img != null ? { _img: k(b._img) } : null), ...(b._key != null ? { _key: k(b._key) } : null), ...(b.children ? { children: fix(b.children) } : null) }))
    for (const pg of p.pages) pages.push({ ...pg, key: k(pg.key), parent: k(pg.parent), blocks: fix(pg.blocks) })
    for (const [t, v] of Object.entries(p.imgs || {})) imgs[k(t)] = v
  })
  const plan = { pages, imgs, kind: [...kinds].join(' · ') }
  plan.summary = planSummary(plan)
  return plan
}
// 글 파일(마크다운·CSV) 한 개 → 계획
export function planFromText(text, name) { const r = mdToNote(text, name); return { pages: [{ key: 't0', title: r.title, blocks: r.blocks, parent: null }], imgs: {}, kind: '마크다운' } }

// 지금 페이지 아래에 붙이기: 첫 맨 위 페이지의 블록은 본문 끝에, 나머지 페이지는 이 페이지의 하위 페이지로
export async function commitIntoNote(plan, noteId) {
  const tops = plan.pages.filter((p) => !p.parent)
  const first = tops[0]
  const rest = { ...plan, pages: plan.pages.filter((p) => p !== first).map((p) => (p.parent === first?.key ? { ...p, parent: null } : p)) }
  const made = rest.pages.length ? await commitPlan(rest, { parentId: noteId }) : []
  const n = find('notes', noteId); if (!n) return { blocks: 0, sub: made.length }
  // 첫 페이지 그림 올리고 자리표 바꾸기
  const ids = Object.fromEntries(made.map((m, i) => [rest.pages[i].key, m.id]))
  const fileIds = {}
  for (const b of first?.blocks || []) if (b._img != null && plan.imgs[b._img]) { try { const im = plan.imgs[b._img]; const r = await addFile(new File([im.blob], im.name, { type: im.blob.type }), { noteId }); fileIds[b._img] = r.id } catch {} }
  const add = linkTodos((first?.blocks || []).flatMap((b) => (b._img != null ? (fileIds[b._img] ? [{ id: b.id, type: 'file', fileId: fileIds[b._img], ...(b.size ? { size: b.size } : null) }] : []) : b._key != null ? (ids[b._key] ? [{ id: b.id, type: 'page', pageId: ids[b._key] }] : []) : [b])), n)
  const cur = (n.blocks || []).filter((b, i, a) => !(i === a.length - 1 && b.type === 'text' && !b.text))
  const linked = new Set(add.filter((b) => b.type === 'page').map((b) => b.pageId))
  const subs = made.filter((m) => m.parentId === noteId && !linked.has(m.id)).map((m) => ({ id: uid(), type: 'page', pageId: m.id }))
  patch('notes', noteId, { blocks: [...cur, ...add, ...subs] })
  return { blocks: add.length, sub: made.filter((m) => m.parentId === noteId).length }
}
