// 앱 데이터: 메모리 상태 + IndexedDB 저장 (컬렉션마다 'x:<이름>' — 예전 앱 데이터와 섞이지 않게)
import { useMemo, useSyncExternalStore } from 'react'
import { getMany, setMany } from 'idb-keyval'
import { COLL_NAMES, DEFAULT_SETTINGS, emptyState } from './schema.js'
import { mergeColl } from '../sync/merge.js'

const KEY = (c) => 'x:' + c
let state = emptyState()
const listeners = new Set(), hooks = new Set(), dirty = new Set()
let batching = 0, pending = false, saveTimer = null

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const deviceId = (() => { try { let d = localStorage.getItem('x_device'); if (!d) { d = uid(); localStorage.setItem('x_device', d) } return d } catch { return 'local' } })()

export const getState = () => state
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
// 레코드가 바뀔 때마다 (동기화 예약 등)
export const onChange = (fn) => { hooks.add(fn); return () => hooks.delete(fn) }

function notify() {
  if (batching) { pending = true; return }
  listeners.forEach((l) => l())
  if (!dirty.size) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { const cs = [...dirty]; dirty.clear(); setMany(cs.map((c) => [KEY(c), state[c]])).catch(() => cs.forEach((c) => dirty.add(c))) }, 300)
}
export function batch(fn) { batching++; try { return fn() } finally { batching--; if (!batching && pending) { pending = false; notify() } } }

// 되돌리기: recordChanges(fn) 안에서 바뀐 레코드의 이전 모습
let journal = null
export function recordChanges(fn) {
  if (journal) { fn(); return [] }
  journal = new Map()
  try { fn() } catch (e) { journal = null; throw e }
  const out = [...journal.values()]; journal = null
  return out
}
export function undoChanges(changes) {
  batch(() => { for (const { coll, id, prev } of [...changes].reverse()) { if (prev) write(coll, stamp({ ...prev }), state[coll][id]); else remove(coll, id) } })
}
const stamp = (rec) => ({ ...rec, updatedAt: Date.now(), deviceId })
function write(coll, rec, prev) {
  if (journal && !journal.has(coll + ':' + rec.id)) journal.set(coll + ':' + rec.id, { coll, id: rec.id, prev })
  state = { ...state, [coll]: { ...state[coll], [rec.id]: rec } }
  dirty.add(coll)
  hooks.forEach((h) => { try { h(coll, rec, prev) } catch (e) { console.error(e) } })
  notify()
  return rec
}
export function put(coll, rec) {
  const id = rec.id || uid(), prev = state[coll][id]
  const { deleted, deletedAt, ...base } = prev || {}
  return write(coll, stamp({ createdAt: prev?.createdAt || Date.now(), ...base, ...rec, id }), prev)
}
export function patch(coll, id, partial) {
  const prev = state[coll][id]
  if (!prev) return null
  return write(coll, stamp({ ...prev, ...(typeof partial === 'function' ? partial(prev) : partial) }), prev)
}
export function remove(coll, id) {
  const prev = state[coll][id]
  if (!prev || prev.deleted) return
  write(coll, stamp({ ...prev, deleted: true, deletedAt: Date.now() }), prev)
}
// 동기화 병합 결과 (시각 유지 · 훅 없음)
export function replaceColl(coll, recs) { state = { ...state, [coll]: recs }; dirty.add(coll); notify() }
export function replaceAll(next) { state = { ...emptyState(), ...next }; COLL_NAMES.forEach((c) => dirty.add(c)); notify() }

const alive = (o) => Object.values(o || {}).filter((r) => !r.deleted)
export const find = (coll, id) => { const r = state[coll][id]; return r && !r.deleted ? r : null }
export const list = (coll) => alive(state[coll])
export function useColl(coll) { const raw = useSyncExternalStore(subscribe, () => state[coll]); return useMemo(() => alive(raw), [raw]) }
export function useRec(coll, id) { const r = useSyncExternalStore(subscribe, () => state[coll][id]); return r && !r.deleted ? r : null }
export const settings = () => ({ ...DEFAULT_SETTINGS, ...state.settings.main })
export function useSettings() { const s = useSyncExternalStore(subscribe, () => state.settings.main); return useMemo(() => ({ ...DEFAULT_SETTINGS, ...s }), [s]) }
export const setSettings = (p) => put('settings', { ...settings(), ...p, id: 'main' })

// 지운 지 60일 지난 표식은 완전히 정리
function purge() {
  const now = Date.now()
  for (const c of COLL_NAMES) {
    const gone = Object.values(state[c]).filter((r) => r.deleted && now - (r.deletedAt || 0) > 60 * 86400000)
    if (gone.length) { const o = { ...state[c] }; gone.forEach((r) => delete o[r.id]); state = { ...state, [c]: o }; dirty.add(c) }
  }
}
export async function loadState() {
  try {
    const vals = await getMany(COLL_NAMES.map(KEY))
    const next = emptyState(); COLL_NAMES.forEach((c, i) => { if (vals[i]) next[c] = vals[i] })
    state = next
  } catch (e) { console.error(e) }
  // 처음 여는 기기: 기본 설정은 시각 0 으로 — 동기화하면 다른 기기에서 정한 설정이 이김
  if (!state.settings.main) replaceColl('settings', { main: { ...DEFAULT_SETTINGS, updatedAt: 0, deviceId } })
  purge(); notify()
}

export const exportJSON = () => JSON.stringify({ app: 'exam-study', v: 1, exportedAt: new Date().toISOString(), state }, null, 1)
// 가져오기: 합치기(항목마다 최신 수정) 또는 바꾸기
export function importJSON(text, { merge = true } = {}) {
  const data = JSON.parse(text)
  if (!data?.state || data.app !== 'exam-study') throw new Error('이 앱의 백업 파일이 아니에요')
  if (!merge) { replaceAll(data.state); return -1 }
  let n = 0
  for (const c of COLL_NAMES) { const { merged, localChanged, received } = mergeColl(state[c], data.state[c]); if (localChanged) { replaceColl(c, merged); n += received } }
  return n
}
// 모든 데이터 지우기 (이 기기)
export function resetAll() { replaceAll({ settings: { main: { ...DEFAULT_SETTINGS, updatedAt: 0, deviceId } } }) }
