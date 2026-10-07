// 레코드 단위 병합: updatedAt 이 큰 쪽 우선, 같으면 deviceId 사전순. 삭제는 tombstone 으로 전파.
export const newer = (a, b) => {
  if (!b) return true
  if (!a) return false
  const ta = a.updatedAt || 0, tb = b.updatedAt || 0
  return ta > tb || (ta === tb && String(a.deviceId || '') > String(b.deviceId || ''))
}

// since: 마지막 동기화 시각 — 그 뒤로 양쪽에서 같은 항목을 고쳤으면 겹침(conflicts)으로 셈 (최신 수정이 이김)
// resolve(l, r): 양쪽에서 고친 항목을 합친 레코드 (없으면 최신 수정 우선)
export function mergeColl(local = {}, remote = {}, since = 0, resolve = null) {
  const out = { ...local }
  let localChanged = false, received = 0, conflicts = 0
  for (const [id, r] of Object.entries(remote)) {
    const l = local[id]
    const differs = l && (r.updatedAt !== l.updatedAt || r.deviceId !== l.deviceId)
    if (differs && since && (l.updatedAt || 0) > since && (r.updatedAt || 0) > since) {
      conflicts++
      const m = resolve && resolve(l, r)
      if (m) { out[id] = m; localChanged = true; received++; continue }
    }
    if (!l || (newer(r, l) && differs)) { out[id] = r; localChanged = true; received++ }
  }
  return { merged: out, localChanged, received, conflicts }
}

// 정렬된 JSON (비교용으로 항상 같은 문자열을 만든다)
export function stableFile(colls) {
  const obj = {}
  for (const name of Object.keys(colls).sort()) {
    const c = colls[name] || {}
    const sorted = {}
    for (const id of Object.keys(c).sort()) sorted[id] = c[id]
    obj[name] = sorted
  }
  return JSON.stringify(obj)
}

// 노트 조각 파일: id 로 0~7 중 하나 (기기마다 항상 같은 조각)
export const NOTE_SHARDS = 8
export function shardOf(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % NOTE_SHARDS }
// 항목이 들어 있는 동기화 파일 (tasks.json 등 · notes-0.json 등)
export const isDataFile = (n) => /^(tasks|events|notes|study|health|settings)(-\d+)?\.json$/.test(n)

// 노트 블록 3방향 합치기: base(지난 동기화 때 내용) · mine(이 기기) · theirs(다른 기기)
// 다른 블록을 고쳤으면 둘 다 반영, 같은 블록을 둘 다 고쳤으면 두 버전을 나란히 남김(이 기기 쪽은 바로 아래에)
// 한쪽이 지운 블록은 다른 쪽이 고치지 않았을 때만 지움 · 순서는 다른 기기 쪽을 따르고 이 기기에서 새로 넣은 블록은 앞 블록 뒤에
const js = (x) => JSON.stringify(x ?? null)
export function merge3Blocks(base = [], mine = [], theirs = [], dupId = (id) => id + '-m') {
  const B = new Map(base.map((b) => [b.id, b])), M = new Map(mine.map((b) => [b.id, b])), T = new Map(theirs.map((b) => [b.id, b]))
  const out = [], extra = new Map() // theirs 블록 id → 바로 뒤에 둘 이 기기 버전
  for (const t of theirs) {
    const b = B.get(t.id), m = M.get(t.id)
    if (!b) { out.push(t); continue } // 다른 기기에서 새로 넣음 (이 기기에도 같은 id 가 있으면 아래에서 거름)
    if (!m) { if (js(t) === js(b)) continue; out.push(t); continue } // 이 기기에서 지움 · 다른 기기가 고쳤으면 남김
    if (js(m) === js(b) || js(m) === js(t)) { out.push(t); continue }
    if (js(t) === js(b)) { out.push(m); continue }
    out.push(t); extra.set(t.id, { ...m, id: dupId(m.id) }) // 둘 다 고침
  }
  // 다른 기기에서 지웠지만 이 기기에서 고친 블록은 되살림 · 이 기기에서 새로 넣은 블록
  const have = new Set(out.map((b) => b.id))
  const res = []
  for (const b of out) { res.push(b); if (extra.has(b.id)) res.push(extra.get(b.id)) }
  let prev = null
  for (const m of mine) {
    const b = B.get(m.id)
    const keep = !have.has(m.id) && !T.has(m.id) && (!b || js(m) !== js(b))
    if (keep) { const at = prev ? res.findIndex((x) => x.id === prev) + 1 : 0; res.splice(at, 0, m); have.add(m.id) }
    if (have.has(m.id)) prev = m.id
  }
  return res
}

// 노트 하나 3방향 합치기 — 합칠 수 없으면 null (그냥 최신 수정 우선)
export function mergeNote(base, mine, theirs) {
  if (!base || !mine || !theirs || mine.deleted || theirs.deleted || !Array.isArray(mine.blocks) || !Array.isArray(theirs.blocks)) return null
  const blocks = merge3Blocks(base.blocks || [], mine.blocks, theirs.blocks, (id) => id + '-' + Math.random().toString(36).slice(2, 6))
  const title = (mine.title || '') !== (base.title || '') ? mine.title : theirs.title
  const top = newer(mine, theirs) ? mine : theirs
  return { ...top, title, blocks }
}
