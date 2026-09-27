// 내 폰트 — 사용자가 불러온 폰트 파일을 이 기기(IndexedDB)에 저장하고 FontFace 로 앱에 적용
// 1MB 이하 폰트는 동기화(gist `font-<id>.txt`), 그보다 큰 폰트는 기기마다 한 번씩 추가
import { useSyncExternalStore } from 'react'
import { get, set, del } from 'idb-keyval'
import { uid } from '../store/store.js'

const MAX_FONT = 40 * 1024 * 1024
export const SYNC_FONT_MAX = 1024 * 1024
const OK_EXT = /\.(ttf|otf|ttc|woff2?)$/i
let fonts = []
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const loaded = new Map()
const aliases = new Map()

export const fontFamily = (id) => 'MyFont-' + id
export const useMyFonts = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => fonts)

export async function initFonts() {
  fonts = (await get('myFonts').catch(() => null)) || []
  emit()
}

// sfnt 'name' 테이블에서 이름 읽기 (ttf·otf·ttc). woff 류는 null
export function parseFontNames(buf) {
  try {
    const v = new DataView(buf)
    let base = 0
    if (v.getUint32(0) === 0x74746366) base = v.getUint32(12) // 'ttcf' → 첫 번째 폰트
    const tag = v.getUint32(base)
    if (tag !== 0x00010000 && tag !== 0x4f54544f && tag !== 0x74727565) return null
    const n = v.getUint16(base + 4)
    let off = -1
    for (let i = 0; i < n; i++) {
      const r = base + 12 + i * 16
      if (v.getUint32(r) === 0x6e616d65) { off = v.getUint32(r + 8); break } // 'name'
    }
    if (off < 0) return null
    const count = v.getUint16(off + 2), strOff = off + v.getUint16(off + 4)
    const found = {}
    for (let i = 0; i < count; i++) {
      const r = off + 6 + i * 12
      const pid = v.getUint16(r), lang = v.getUint16(r + 4), nid = v.getUint16(r + 6), len = v.getUint16(r + 8), so = v.getUint16(r + 10)
      if (![1, 4, 6, 16].includes(nid)) continue
      const bytes = new Uint8Array(buf, strOff + so, len)
      let s = ''
      if (pid === 0 || pid === 3) for (let j = 0; j + 1 < len; j += 2) s += String.fromCharCode((bytes[j] << 8) | bytes[j + 1])
      else if (pid === 1) s = String.fromCharCode(...bytes)
      else continue
      // 한국어(0x412) 이름 우선, 없으면 첫 번째
      const score = pid === 3 && lang === 0x412 ? 3 : pid === 3 ? 2 : 1
      if (s && (!found[nid] || score > found[nid].score)) found[nid] = { s, score }
    }
    const pick = (k) => found[k]?.s
    return { family: pick(16) || pick(1) || pick(4), ps: pick(6) }
  } catch { return null }
}

export async function addFont(file) {
  if (!OK_EXT.test(file.name)) throw new Error('ttf · otf · woff 폰트 파일만 추가할 수 있어요')
  if (file.size > MAX_FONT) throw new Error('40MB 이하 폰트만 추가할 수 있어요')
  const buf = await file.arrayBuffer()
  const id = uid()
  const face = new FontFace(fontFamily(id), buf, { weight: '100 900' })
  await face.load().catch(() => { throw new Error('폰트 파일을 읽을 수 없어요') })
  document.fonts.add(face); loaded.set(id, Promise.resolve(face))
  const names = parseFontNames(buf) || {}
  const rec = { id, name: names.family || file.name.replace(OK_EXT, ''), ps: names.ps || '', size: file.size }
  await set('font:' + id, new Blob([buf]))
  fonts = [...fonts, rec]; await set('myFonts', fonts); emit()
  if (rec.ps) addAlias(rec.ps, buf)
  return rec
}

const save = async () => { await set('myFonts', fonts); emit() }
export const listFonts = () => fonts
export const getFontBlob = (id) => get('font:' + id)
export async function markSynced(id) { fonts = fonts.map((f) => (f.id === id ? { ...f, synced: true } : f)); await save() }

// 다른 기기에서 동기화된 폰트 추가
export async function importFont(id, meta, blob) {
  if (fonts.some((f) => f.id === id)) return
  await set('font:' + id, blob)
  fonts = [...fonts, { id, name: meta.name, ps: meta.ps || '', size: blob.size, synced: true }]; await save()
  loadFont(id)
}

// 삭제된 동기화 폰트 — 다음 동기화 때 원격에서도 지움
export const pendingDeletes = async () => (await get('fontDel').catch(() => null)) || []
export const clearDeletes = () => set('fontDel', [])

export async function removeFont(id, { remote = false } = {}) {
  const rec = fonts.find((f) => f.id === id)
  if (rec?.synced && !remote) await set('fontDel', [...await pendingDeletes(), id])
  const face = await loaded.get(id)
  if (face) document.fonts.delete(face)
  loaded.delete(id)
  const ps = fonts.find((f) => f.id === id)?.ps
  if (ps && aliases.has(ps)) { document.fonts.delete(aliases.get(ps)); aliases.delete(ps) }
  await del('font:' + id)
  fonts = fonts.filter((f) => f.id !== id); await save()
}

// 앱에 폰트 등록 (한 번만)
export function loadFont(id) {
  if (!loaded.has(id)) loaded.set(id, register(id))
  return loaded.get(id)
}
async function register(id) {
  const blob = await get('font:' + id).catch(() => null)
  if (!blob) { loaded.delete(id); return null }
  const buf = await blob.arrayBuffer()
  const face = new FontFace(fontFamily(id), buf, { weight: '100 900' })
  try { await face.load(); document.fonts.add(face) } catch { loaded.delete(id); return null }
  const rec = fonts.find((f) => f.id === id)
  if (rec?.ps) addAlias(rec.ps, buf)
  return face
}

// 위젯 미리보기용: PostScript 이름으로도 쓸 수 있게 등록
function addAlias(ps, buf) {
  if (aliases.has(ps)) return
  const face = new FontFace(ps, buf, { weight: '100 900' })
  aliases.set(ps, face)
  face.load().then(() => document.fonts.add(face)).catch(() => aliases.delete(ps))
}

// 저장된 모든 폰트 등록 (위젯 미리보기 등)
export async function loadAllFonts() {
  await Promise.all(fonts.map((f) => loadFont(f.id)))
}
