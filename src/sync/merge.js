// 레코드 단위 병합: updatedAt 이 큰 쪽 우선, 같으면 deviceId 사전순. 삭제는 tombstone 으로 전파.
export const newer = (a, b) => {
  if (!b) return true
  if (!a) return false
  const ta = a.updatedAt || 0, tb = b.updatedAt || 0
  return ta > tb || (ta === tb && String(a.deviceId || '') > String(b.deviceId || ''))
}

export function mergeColl(local = {}, remote = {}) {
  const out = { ...local }
  let localChanged = false
  for (const [id, r] of Object.entries(remote)) {
    const l = local[id]
    if (!l || (newer(r, l) && (r.updatedAt !== l.updatedAt || r.deviceId !== l.deviceId))) { out[id] = r; localChanged = true }
  }
  return { merged: out, localChanged }
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
