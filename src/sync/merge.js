// 레코드 단위 병합: updatedAt 이 큰 쪽 우선, 같으면 deviceId 사전순. 삭제는 표식(deleted)으로 전파.
export const newer = (a, b) => {
  if (!b) return true
  if (!a) return false
  const ta = a.updatedAt || 0, tb = b.updatedAt || 0
  return ta > tb || (ta === tb && String(a.deviceId || '') > String(b.deviceId || ''))
}

// 원격 레코드를 로컬에 합침 — 바뀐 게 있으면 localChanged
export function mergeColl(local = {}, remote = {}) {
  const out = { ...local }
  let localChanged = false, received = 0
  for (const [id, r] of Object.entries(remote || {})) {
    const l = local[id]
    if (!l || (newer(r, l) && (r.updatedAt !== l.updatedAt || r.deviceId !== l.deviceId))) { out[id] = r; localChanged = true; received++ }
  }
  return { merged: out, localChanged, received }
}

// 정렬된 JSON (비교용으로 항상 같은 문자열)
export function stableJSON(colls) {
  const obj = {}
  for (const name of Object.keys(colls).sort()) {
    const c = colls[name] || {}, sorted = {}
    for (const id of Object.keys(c).sort()) sorted[id] = c[id]
    obj[name] = sorted
  }
  return JSON.stringify(obj)
}
