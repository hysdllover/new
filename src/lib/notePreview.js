// 노트 위젯용 요약: 고정 노트 먼저, 그다음 최근 수정 순 · 노트마다 앞부분 줄(할 일 체크 상태 포함)
const clean = (s) => String(s || '').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/==(?:[rgby]:)?([^=\n]+)==/g, '$1').replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/__([^_\n]+)__/g, '$1').replace(/^\s*[-*]\s+/, '').trim()
export function noteLines(n, st, max = 40) {
  const tasks = st.tasks || {}, sync = st.syncBlocks || {}
  const flat = (bs) => (bs || []).flatMap((b) => (b.type === 'sync' ? flat(sync[b.syncId]?.blocks) : b.type === 'cols' ? (b.cols || []).flatMap(flat) : b.type === 'toggle' ? [b, ...flat(b.children)] : [b]))
  const blocks = flat(n.blocks)
  const out = []
  for (const b of blocks) {
    if (out.length >= max) break
    if (!b || ['divider', 'embed', 'file', 'page'].includes(b.type)) continue
    if (b.type === 'table') { for (const r of b.rows || []) { const x = r.filter(Boolean).join(' | '); if (x) out.push({ k: 't', x: x.slice(0, 120) }); if (out.length >= max) break } continue }
    const k = b.type === 'todo' ? 'todo' : b.type === 'bullet' ? 'b' : /^h\d?$/.test(b.type || '') ? 'h' : 't'
    for (const ln of String(b.text || '').split('\n')) {
      const x = clean(ln)
      if (!x) continue
      out.push(k === 'todo' ? { k, x: x.slice(0, 120), d: !!(tasks[b.taskId]?.done || b.done) } : { k, x: x.slice(0, 120) })
      if (out.length >= max || k === 'todo') break
    }
  }
  return out
}
export function notesForWidget(st, n = 8) {
  const all = Object.values(st.notes || {}).filter((x) => !x.deleted && !x.trashed && x.type !== 'event')
  // 고정 → 일반 노트 최근순 → 데일리 노트 ('노트:데일리' 로 데일리만 고를 수 있음)
  all.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.type === 'daily' ? 1 : 0) - (b.type === 'daily' ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0))
  return all.slice(0, n).map((x) => ({ id: x.id, t: (x.type === 'daily' && x.date ? `${+x.date.slice(5, 7)}/${+x.date.slice(8)} 데일리` : x.title || '제목 없음').slice(0, 40), p: !!x.pinned, u: x.updatedAt || 0, dd: x.type === 'daily' ? x.date : null, l: noteLines(x, st).filter((l, i) => !(i === 0 && l.x === (x.title || '').trim())) })) // 첫 줄이 제목과 같으면 빼기
}

// 위젯용: 노트 속 표 (최근 고친 노트부터 6개, 10줄 × 4칸) · 보드 (4개, 칸마다 카드 8장)
const walkB = (bs, f) => { for (const b of bs || []) { f(b); if (b.type === 'toggle') walkB(b.children, f); if (b.type === 'cols') for (const c of b.cols || []) walkB(c, f) } }
const plainW = (s, n) => String(s || '').replace(/==(?:[rgby]:)?|\*\*|__|\{\{[rgbvmD]:|\}\}|\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n)
const recentNotes = (st) => Object.values(st.notes || {}).filter((n) => !n.deleted && n.type !== 'daily').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
export function tablesForWidget(st) {
  const out = []
  for (const n of recentNotes(st)) { walkB(n.blocks, (b) => { if (b.type === 'table' && out.length < 6 && (b.rows || []).some((r) => r.some((c) => String(c).trim()))) out.push({ t: n.title || '표', h: b.head !== false, r: b.rows.slice(0, 10).map((r) => r.slice(0, 4).map((c) => plainW(c, 24))) }) }); if (out.length >= 6) break }
  return out
}
export function boardsForWidget(st) {
  const out = []
  for (const n of recentNotes(st)) { walkB(n.blocks, (b) => { if (b.type === 'board' && out.length < 4) out.push({ t: n.title || '보드', c: (b.cols || []).map((c) => ({ n: c.name, k: (c.cards || []).length, x: (c.cards || []).slice(0, 8).map((x) => plainW(x.text, 40)) })) }) }); if (out.length >= 4) break }
  return out
}
// 사진 위젯 후보: 최근 노트마다 첫 그림 (4장)
export function photoPicks(st) {
  const out = []
  for (const n of recentNotes(st)) {
    let fid = null
    walkB(n.blocks, (b) => { if (!fid && b.type === 'file' && st.files?.[b.fileId]?.type?.startsWith('image') && !st.files[b.fileId].deleted) fid = b.fileId })
    if (fid) out.push({ t: n.title || '노트', fileId: fid })
    if (out.length >= 4) break
  }
  return out
}
