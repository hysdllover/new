// 레코드 단위 병합: updatedAt 이 큰 쪽 우선, 같으면 deviceId 사전순. 삭제는 tombstone 으로 전파.
export const newer = (a, b) => {
  if (!b) return true
  if (!a) return false
  const ta = a.updatedAt || 0, tb = b.updatedAt || 0
  return ta > tb || (ta === tb && String(a.deviceId || '') > String(b.deviceId || ''))
}

// since: 마지막 동기화 시각 — 그 뒤로 양쪽에서 같은 항목을 고쳤으면 겹침(conflicts)으로 셈 (최신 수정이 이김)
export function mergeColl(local = {}, remote = {}, since = 0) {
  const out = { ...local }
  let localChanged = false, received = 0, conflicts = 0
  for (const [id, r] of Object.entries(remote)) {
    const l = local[id]
    const differs = l && (r.updatedAt !== l.updatedAt || r.deviceId !== l.deviceId)
    if (differs && since && (l.updatedAt || 0) > since && (r.updatedAt || 0) > since) conflicts++
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
