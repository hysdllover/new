import { useSyncExternalStore } from 'react'
import { get as idbGet } from 'idb-keyval'
import { getState, replaceColl, onChange, patch, settings, list } from '../store/store.js'
import { COLLECTIONS, GIST_FILES } from '../store/schema.js'
import { mergeColl, stableFile } from './merge.js'
import { blobToDataUrl, setRemoteRaw, MAX_FILE } from '../lib/files.js'
import { listFonts, getFontBlob, importFont, removeFont, markSynced, pendingDeletes, clearDeletes, SYNC_FONT_MAX } from '../lib/fonts.js'

// GitHub Gist 기반 iPhone ↔ iPad 동기화
const DESC = 'study-dashboard-sync'
const API = 'https://api.github.com'
const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} },
}

let status = { state: ls.get('gist_token') ? 'idle' : 'off', last: +ls.get('gist_last') || null, error: null }
const L = new Set()
const setStatus = (p) => { status = { ...status, ...p }; L.forEach((l) => l()) }
export const useSyncStatus = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => status)

const token = () => ls.get('gist_token')
const gistId = () => ls.get('gist_id')

async function gh(path, opt = {}) {
  const res = await fetch(API + path, {
    ...opt,
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : null) },
  })
  if (!res.ok) {
    const msg = res.status === 401 ? '토큰이 올바르지 않아요' : res.status === 404 ? 'Gist 를 찾을 수 없어요 (gist 권한 확인)' : `GitHub 오류 ${res.status}`
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}

const excluded = () => {
  const ex = settings().syncExclude || {}
  return new Set(Object.keys(ex).filter((k) => ex[k]))
}

function buildFiles(state) {
  const ex = excluded()
  const files = {}
  for (const f of GIST_FILES) {
    const colls = {}
    for (const [c, file] of Object.entries(COLLECTIONS)) if (file === f && !ex.has(c)) colls[c] = state[c]
    files[f + '.json'] = stableFile(colls)
  }
  return files
}

export async function connect(tok) {
  ls.set('gist_token', tok.trim())
  setStatus({ state: 'syncing', error: null })
  try {
    let found = null
    for (let page = 1; page <= 5 && !found; page++) {
      const gists = await gh(`/gists?per_page=100&page=${page}`)
      found = gists.find((g) => g.description === DESC)
      if (gists.length < 100) break
    }
    if (!found) {
      const files = buildFiles(getState())
      files['meta.json'] = JSON.stringify({ app: 'study-dashboard', createdAt: new Date().toISOString() })
      const body = { description: DESC, public: false, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, { content: v }])) }
      found = await gh('/gists', { method: 'POST', body: JSON.stringify(body) })
    }
    ls.set('gist_id', found.id)
    await syncNow()
    return found.id
  } catch (e) {
    ls.set('gist_token', null); ls.set('gist_id', null)
    setStatus({ state: 'off', error: e.message })
    throw e
  }
}

export function disconnect() {
  ls.set('gist_token', null); ls.set('gist_id', null); ls.set('gist_last', null)
  setStatus({ state: 'off', last: null, error: null })
}

// 내 폰트 동기화 (1MB 이하): 원격에만 있으면 받고, 로컬에만 있으면 올리고, 지운 건 양쪽에서 지움
async function syncFonts(gist, patchFiles) {
  const remote = Object.fromEntries(Object.entries(gist.files || {}).filter(([n]) => n.startsWith('font-')).map(([n, f]) => [n.slice(5).replace(/\.txt$/, ''), f]))
  const dels = await pendingDeletes()
  for (const id of dels) if (remote[id]) patchFiles[`font-${id}.txt`] = null
  const local = listFonts()
  for (const f of local) if (f.synced && !remote[f.id]) await removeFont(f.id, { remote: true })
  for (const [id, f] of Object.entries(remote)) {
    if (dels.includes(id) || local.some((x) => x.id === id)) continue
    try {
      const meta = JSON.parse(f.truncated || !f.content ? await (await fetch(f.raw_url)).text() : f.content)
      await importFont(id, meta, await (await fetch(meta.data)).blob())
    } catch {}
  }
  const up = []
  for (const f of listFonts()) {
    if (f.synced || remote[f.id] || f.size > SYNC_FONT_MAX) continue
    const blob = await getFontBlob(f.id)
    if (!blob) continue
    patchFiles[`font-${f.id}.txt`] = { content: JSON.stringify({ name: f.name, ps: f.ps, data: await blobToDataUrl(blob) }) }
    up.push(f.id)
  }
  return up
}

let running = null, again = false
export async function syncNow() {
  if (!token() || !gistId()) return
  if (!navigator.onLine) { setStatus({ state: 'pending' }); return }
  if (running) { again = true; return running }
  running = (async () => {
    setStatus({ state: 'syncing', error: null })
    try {
      const gist = await gh(`/gists/${gistId()}`)
      const remoteText = {}
      for (const [name, f] of Object.entries(gist.files || {})) {
        if (name.startsWith('att-')) { setRemoteRaw(name.slice(4).replace(/\.txt$/, ''), f.raw_url); continue }
        if (name.startsWith('font-')) continue
        remoteText[name] = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
      }
      // 1) 원격 → 로컬 병합
      const ex = excluded()
      for (const f of GIST_FILES) {
        let data = {}
        try { data = JSON.parse(remoteText[f + '.json'] || '{}') } catch {}
        for (const [c, recs] of Object.entries(data)) {
          if (!(c in COLLECTIONS) || ex.has(c)) continue
          const { merged, localChanged } = mergeColl(getState()[c], recs)
          if (localChanged) replaceColl(c, merged)
        }
      }
      // 2) 로컬 → 원격: 바뀐 파일만
      const files = buildFiles(getState())
      const patchFiles = {}
      for (const [name, content] of Object.entries(files)) if (remoteText[name] !== content) patchFiles[name] = { content }
      // 첨부 파일 업로드 / 삭제
      const uploaded = []
      for (const m of list('files')) {
        if (m.gist || gist.files?.[`att-${m.id}.txt`]) continue
        const blob = await idbGet('blob:' + m.id)
        if (!blob || blob.size > MAX_FILE) continue
        patchFiles[`att-${m.id}.txt`] = { content: await blobToDataUrl(blob) }
        uploaded.push(m.id)
      }
      for (const r of Object.values(getState().files)) if (r.deleted && gist.files?.[`att-${r.id}.txt`]) patchFiles[`att-${r.id}.txt`] = null
      const fontsUp = await syncFonts(gist, patchFiles)
      if (Object.keys(patchFiles).length) {
        const res = await gh(`/gists/${gistId()}`, { method: 'PATCH', body: JSON.stringify({ files: patchFiles }) })
        for (const [name, f] of Object.entries(res.files || {})) if (name.startsWith('att-')) setRemoteRaw(name.slice(4).replace(/\.txt$/, ''), f.raw_url)
        for (const id of uploaded) patch('files', id, { gist: true })
        for (const id of fontsUp) await markSynced(id)
      }
      await clearDeletes()
      const now = Date.now()
      ls.set('gist_last', String(now))
      setStatus({ state: 'ok', last: now })
    } catch (e) {
      setStatus({ state: 'error', error: e.message })
    }
  })()
  try { await running } finally {
    running = null
    if (again) { again = false; syncNow() }
  }
}

let timer = null
export function startSync() {
  onChange(() => {
    if (!token()) return
    if (status.state !== 'syncing') setStatus({ state: 'pending' })
    clearTimeout(timer)
    timer = setTimeout(syncNow, 3000)
  })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  window.addEventListener('online', () => syncNow())
  setInterval(() => { if (document.visibilityState === 'visible') syncNow() }, 60000)
  syncNow()
}

// 동기화와 별개인 Gist 파일 읽기/쓰기 (푸시 구독·위젯용)
export const gistInfo = () => ({ token: token(), gistId: gistId() })
export async function readGistFile(name) {
  if (!token() || !gistId()) throw new Error('먼저 동기화를 연결하세요')
  const g = await gh(`/gists/${gistId()}`)
  const f = g.files?.[name]
  if (!f) return null
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
  try { return JSON.parse(text) } catch { return null }
}
export async function writeGistFile(name, data) {
  if (!token() || !gistId()) throw new Error('먼저 동기화를 연결하세요')
  await gh(`/gists/${gistId()}`, { method: 'PATCH', body: JSON.stringify({ files: { [name]: { content: JSON.stringify(data, null, 1) } } }) })
}
