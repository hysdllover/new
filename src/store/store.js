import { mergeColl } from '../sync/merge.js'
import { useMemo, useSyncExternalStore } from 'react'
import { get, getMany, setMany } from 'idb-keyval'
import { COLL_NAMES, DEFAULT_SETTINGS, DEFAULT_SUBJECTS, DEFAULT_QUOTES, emptyState } from './schema.js'

const SCHEMA_VERSION = 1
let state = emptyState()
const listeners = new Set()
const changeHooks = new Set()
let batching = 0
let pendingNotify = false
let saveTimer = null
const dirty = new Set() // 저장할 컬렉션 (바뀐 것만 IndexedDB 의 `c:<컬렉션>` 에)

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const deviceId = (() => {
  try {
    let d = localStorage.getItem('deviceId')
    if (!d) { d = uid(); localStorage.setItem('deviceId', d) }
    return d
  } catch { return 'local' }
})()

export const getState = () => state
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
// (coll, next, prev) 형태로 모든 레코드 변경을 전달 — 동기화·자동화·로그가 사용
export const onChange = (fn) => { changeHooks.add(fn); return () => changeHooks.delete(fn) }

function notify() {
  if (batching) { pendingNotify = true; return }
  listeners.forEach((l) => l())
  scheduleSave()
}
function scheduleSave() {
  if (!dirty.size) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const cs = [...dirty]; dirty.clear()
    setMany(cs.map((c) => ['c:' + c, state[c]])).catch(() => cs.forEach((c) => dirty.add(c)))
  }, 400)
}

export function batch(fn) {
  batching++
  try { return fn() } finally {
    batching--
    if (!batching && pendingNotify) { pendingNotify = false; notify() }
  }
}

function write(coll, rec, prev, silent) {
  state = { ...state, [coll]: { ...state[coll], [rec.id]: rec } }
  dirty.add(coll)
  if (!silent) changeHooks.forEach((h) => { try { h(coll, rec, prev) } catch (e) { console.error(e) } })
  notify()
  return rec
}

const stamp = (rec) => ({ ...rec, updatedAt: Date.now(), deviceId })

export function put(coll, rec) {
  const id = rec.id || uid()
  const prev = state[coll][id]
  const { deleted, deletedAt, purged, ...base } = prev || {} // 같은 id 로 다시 쓰면 휴지통에서 되살림
  return write(coll, stamp({ createdAt: prev?.createdAt || Date.now(), ...base, ...rec, id }), prev)
}
export function patch(coll, id, partial) {
  const prev = state[coll][id]
  if (!prev) return null
  const next = typeof partial === 'function' ? partial(prev) : partial
  return write(coll, stamp({ ...prev, ...next }), prev)
}
export function remove(coll, id) {
  const prev = state[coll][id]
  if (!prev || prev.deleted) return
  write(coll, stamp({ ...prev, deleted: true, deletedAt: Date.now() }), prev)
}
export function restore(coll, id) {
  const prev = state[coll][id]
  if (!prev) return
  const { deleted, deletedAt, ...rest } = prev
  write(coll, stamp(rest), prev)
}
// 동기화 병합 결과 반영 (타임스탬프 유지, 훅 미발생)
export function replaceColl(coll, recs) {
  state = { ...state, [coll]: recs }
  dirty.add(coll)
  notify()
}
export function replaceAll(next) {
  state = { ...emptyState(), ...next }
  COLL_NAMES.forEach((c) => dirty.add(c))
  notify()
}

export const alive = (obj) => Object.values(obj).filter((r) => !r.deleted)
export const find = (coll, id) => { const r = state[coll][id]; return r && !r.deleted ? r : null }
export const list = (coll) => alive(state[coll])

// React hooks
export function useColl(coll) {
  const raw = useSyncExternalStore(subscribe, () => state[coll])
  return useMemo(() => alive(raw), [raw])
}
export function useRaw(coll) { return useSyncExternalStore(subscribe, () => state[coll]) }
export function useRec(coll, id) {
  const raw = useSyncExternalStore(subscribe, () => state[coll][id])
  return raw && !raw.deleted ? raw : null
}
export function useSettings() {
  const s = useSyncExternalStore(subscribe, () => state.settings.main)
  return s || DEFAULT_SETTINGS
}
export const settings = () => state.settings.main || DEFAULT_SETTINGS
export const setSettings = (partial) => put('settings', { ...settings(), ...(typeof partial === 'function' ? partial(settings()) : partial), id: 'main' })

// 휴지통 정리: 30일 지난 삭제 항목은 내용 비우고 표식만, 90일 지나면 완전 제거
export const TRASH_DAYS = 30
function purge() {
  // 첨부 항목은 보관함 주소(raw)를 남겨 나중에 보관함에서도 지움
  const now = Date.now(), D = 86400000
  let changed = false
  const next = { ...state }
  for (const c of COLL_NAMES) {
    let coll = null
    for (const r of Object.values(state[c])) {
      if (!r.deleted) continue
      const age = now - (r.deletedAt || r.updatedAt)
      if (age > 90 * D) { coll = coll || { ...state[c] }; delete coll[r.id] }
      else if (age > TRASH_DAYS * D && !r.purged) { coll = coll || { ...state[c] }; coll[r.id] = { id: r.id, deleted: true, purged: true, deletedAt: r.deletedAt, updatedAt: r.updatedAt, deviceId: r.deviceId, ...(r.raw ? { raw: r.raw, rm: r.rm } : null) } }
    }
    if (coll) { next[c] = coll; changed = true; dirty.add(c) }
  }
  if (changed) { state = next; notify() }
}

export async function loadState() {
  try {
    const vals = await getMany(COLL_NAMES.map((c) => 'c:' + c))
    if (vals.some(Boolean)) {
      const next = emptyState()
      COLL_NAMES.forEach((c, i) => { if (vals[i]) next[c] = vals[i] })
      state = next
    } else {
      // 예전 저장(전체를 'state' 한 덩어리로) → 컬렉션별로 옮김 · 예전 키는 그대로 둠(되돌아갈 때 대비)
      const saved = await get('state')
      if (saved?.state) {
        state = { ...emptyState(), ...saved.state }
        await setMany(COLL_NAMES.map((c) => ['c:' + c, state[c]]))
      }
    }
  } catch (e) { console.error(e) }
  if (!state.settings.main) {
    batch(() => {
      put('settings', { ...DEFAULT_SETTINGS })
      DEFAULT_SUBJECTS.forEach((s) => put('subjects', s))
      DEFAULT_QUOTES.forEach((q) => put('quotes', q))
    })
  } else {
    // 새 설정 키가 추가된 경우 기본값 보충
    const s = state.settings.main
    const merged = { ...DEFAULT_SETTINGS, ...s, theme: { ...DEFAULT_SETTINGS.theme, ...s.theme }, modules: { ...DEFAULT_SETTINGS.modules, ...s.modules } }
    state = { ...state, settings: { ...state.settings, main: merged } }
  }
  purge()
}

export function exportJSON() { return JSON.stringify({ app: 'study-dashboard', v: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state }, null, 1) }
export function importJSON(text, { merge = false } = {}) {
  const data = JSON.parse(text)
  if (!data.state) throw new Error('형식이 올바르지 않습니다')
  if (!merge) return replaceAll(data.state)
  // 합치기: 항목마다 최신 수정이 남음 (지금 데이터는 지우지 않음)
  let n = 0
  for (const [c, recs] of Object.entries(data.state)) {
    if (!(c in state) || c === 'settings' || !recs || typeof recs !== 'object') continue
    const { merged, localChanged, received } = mergeColl(state[c], recs)
    if (localChanged) { replaceColl(c, merged); n += received }
  }
  return n
}
