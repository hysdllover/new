// 노트 위젯용 요약: 고정 노트 먼저, 그다음 최근 수정 순 · 노트마다 앞부분 줄(할 일 체크 상태 포함)
const clean = (s) => String(s || '').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/^\s*[-*]\s+/, '').trim()
export function noteLines(n, st, max = 12) {
  const tasks = st.tasks || {}, sync = st.syncBlocks || {}
  const blocks = (n.blocks || []).flatMap((b) => (b.type === 'sync' ? sync[b.syncId]?.blocks || [] : [b]))
  const out = []
  for (const b of blocks) {
    if (out.length >= max) break
    if (!b || ['divider', 'embed', 'file'].includes(b.type)) continue
    const k = b.type === 'todo' ? 'todo' : b.type === 'bullet' ? 'b' : /^h\d?$/.test(b.type || '') ? 'h' : 't'
    for (const ln of String(b.text || '').split('\n')) {
      const x = clean(ln)
      if (!x) continue
      out.push(k === 'todo' ? { k, x: x.slice(0, 60), d: !!(tasks[b.taskId]?.done || b.done) } : { k, x: x.slice(0, 60) })
      if (out.length >= max || k === 'todo') break
    }
  }
  return out
}
export function notesForWidget(st, n = 8) {
  const all = Object.values(st.notes || {}).filter((x) => !x.deleted && !x.trashed && x.type !== 'event')
  // 고정 → 일반 노트 최근순 → 데일리 노트 ('노트:데일리' 로 데일리만 고를 수 있음)
  all.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.type === 'daily' ? 1 : 0) - (b.type === 'daily' ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0))
  return all.slice(0, n).map((x) => ({ id: x.id, t: (x.type === 'daily' && x.date ? `${+x.date.slice(5, 7)}/${+x.date.slice(8)} 데일리` : x.title || '제목 없음').slice(0, 40), p: !!x.pinned, u: x.updatedAt || 0, dd: x.type === 'daily' ? x.date : null, l: noteLines(x, st) }))
}
