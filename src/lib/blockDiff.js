// 노트 버전 비교 (블록 id 기준): 그대로 · 바뀜 · 새로 생김 · 지워짐 — 순서는 지금 내용을 따르고 지운 줄은 원래 자리 근처에
const txt = (b) => JSON.stringify({ ...b, id: undefined })
export function diffBlocks(oldB = [], newB = []) {
  const O = new Map(oldB.map((b) => [b.id, b])), N = new Set(newB.map((b) => b.id))
  const out = []
  // 지운 줄은 원래 바로 앞에 있던 줄 뒤에 끼워 넣음
  const after = new Map(); let prev = null
  for (const b of oldB) { if (!N.has(b.id)) { const k = prev ?? '^'; after.set(k, [...(after.get(k) || []), b]) } else prev = b.id }
  for (const b of after.get('^') || []) out.push({ k: 'del', old: b })
  for (const b of newB) {
    const o = O.get(b.id)
    out.push(!o ? { k: 'add', cur: b } : txt(o) === txt(b) ? { k: 'same', cur: b } : { k: 'chg', old: o, cur: b })
    for (const d of after.get(b.id) || []) out.push({ k: 'del', old: d })
  }
  return out
}
// 버전의 줄 하나만 되살리기: 같은 id 가 있으면 바꾸고, 없으면 버전에서 바로 앞 줄 뒤에 넣음
export function restoreBlock(cur = [], ver = [], id) {
  const b = ver.find((x) => x.id === id); if (!b) return cur
  if (cur.some((x) => x.id === id)) return cur.map((x) => (x.id === id ? b : x))
  const i = ver.findIndex((x) => x.id === id)
  for (let j = i - 1; j >= 0; j--) { const k = cur.findIndex((x) => x.id === ver[j].id); if (k >= 0) return [...cur.slice(0, k + 1), b, ...cur.slice(k + 1)] }
  return [b, ...cur]
}
