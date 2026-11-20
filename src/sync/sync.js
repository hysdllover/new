// GitHub Gist 동기화 (아이폰 ↔ 아이패드): 비공개 gist 하나에 data.json(전체) · widget.json(위젯용 요약) · backup-날짜.json
// 토큰은 이 기기에만 (localStorage). 위젯은 토큰 없이 widget.json 의 raw 주소로만 읽음
// 너무 잦은 동기화 금지: 편집 뒤 8초 모아서(최소 30초 간격) · 앱을 열 때 · 열려 있으면 5분마다
import { useSyncExternalStore } from 'react'
import { getState, replaceColl, onChange, list, put, remove, settings, deviceId } from '../store/store.js'
import { COLL_NAMES } from '../store/schema.js'
import { mergeColl, stableJSON } from './merge.js'
import { widgetPayload } from './widgetData.js'

const API = 'https://api.github.com', DESC = 'exam-study-sync'
const ls = { get: (k) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} } }
export const token = () => ls.get('x_gh_token')
export const gistId = () => ls.get('x_gist')
export const ghLogin = () => ls.get('x_gh_login')

let status = { state: token() ? 'idle' : 'off', last: +ls.get('x_sync_last') || null, error: null, got: 0, sent: false }
const L = new Set()
const setStatus = (p) => { status = { ...status, ...p }; L.forEach((f) => f()) }
export const getSyncStatus = () => status
export const useSyncStatus = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => status)

async function gh(path, opt = {}) {
  const r = await fetch(API + path, { ...opt, cache: 'no-store', headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', ...(opt.body ? { 'Content-Type': 'application/json' } : null) } })
  if (r.status === 401) throw Object.assign(new Error('토큰이 맞지 않거나 만료됐어요'), { auth: true })
  if (r.status === 403 || r.status === 429) throw new Error('GitHub 요청이 잠깐 막혔어요 · 조금 뒤 다시')
  if (!r.ok) throw new Error('GitHub 오류 ' + r.status)
  return r.status === 204 ? null : r.json()
}
const fileText = async (f) => (f.truncated ? (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content)

// 이 기기에만 두는 것: 기기 표시는 동기화하되 내용 그대로
const dataJSON = () => { const s = getState(); return stableJSON(Object.fromEntries(COLL_NAMES.map((c) => [c, s[c]]))) }

export async function connect(tok) {
  ls.set('x_gh_token', tok.trim())
  try {
    const me = await gh('/user'); ls.set('x_gh_login', me.login)
    let id = null
    for (let p = 1; p <= 3 && !id; p++) { const gs = await gh(`/gists?per_page=100&page=${p}`); id = gs.find((g) => g.description === DESC)?.id; if (gs.length < 100) break }
    if (!id) { const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files: { 'data.json': { content: dataJSON() }, 'widget.json': { content: JSON.stringify(widgetPayload()) } } }) }); id = g.id }
    ls.set('x_gist', id); setStatus({ state: 'idle', error: null })
    await syncNow()
  } catch (e) { ls.set('x_gh_token', null); setStatus({ state: 'off', error: e.message }); throw e }
}
export function disconnect() { ['x_gh_token', 'x_gist', 'x_gh_login', 'x_sync_last'].forEach((k) => ls.set(k, null)); setStatus({ state: 'off', last: null, error: null }) }
export const widgetRawUrl = () => (gistId() && ghLogin() ? `https://gist.githubusercontent.com/${ghLogin()}/${gistId()}/raw/widget.json` : null)

let running = null
export function syncNow() {
  if (!token() || !gistId()) return Promise.resolve()
  if (running) return running
  running = (async () => {
    setStatus({ state: 'syncing', error: null })
    try {
      const g = await gh('/gists/' + gistId())
      const files = g.files || {}
      let got = 0
      if (files['data.json']) {
        const remote = JSON.parse((await fileText(files['data.json'])) || '{}')
        for (const c of COLL_NAMES) { const { merged, localChanged, received } = mergeColl(getState()[c], remote[c]); if (localChanged) { replaceColl(c, merged); got += received } }
      }
      markDevice()
      const patch = {}
      await autoBackup(files, patch)
      const mine = dataJSON()
      if (!files['data.json'] || (await fileText(files['data.json'])) !== mine) patch['data.json'] = { content: mine }
      const w = JSON.stringify(widgetPayload())
      if (!files['widget.json'] || stripAt(await fileText(files['widget.json'])) !== stripAt(w)) patch['widget.json'] = { content: w }
      if (Object.keys(patch).length) await gh('/gists/' + gistId(), { method: 'PATCH', body: JSON.stringify({ files: patch }) })
      const now = Date.now(); ls.set('x_sync_last', String(now))
      setStatus({ state: 'ok', last: now, got, sent: Object.keys(patch).length > 0 })
    } catch (e) {
      setStatus({ state: e.auth ? 'off' : 'error', error: e.message })
      if (e.auth) ls.set('x_gh_token', null)
    } finally { running = null }
  })()
  return running
}
const stripAt = (s) => { try { const o = JSON.parse(s); delete o.at; return JSON.stringify(o) } catch { return s } }

// 기기별 마지막 동기화 (설정에 표시 · 30분에 한 번만 기록)
export const deviceName = () => { const u = navigator.userAgent; return /iPad|Macintosh/.test(u) && navigator.maxTouchPoints > 1 ? '아이패드' : /iPhone/.test(u) ? '아이폰' : '컴퓨터' }
function markDevice() { const me = list('live').find((r) => r.id === 'dev-' + deviceId); if (me && Date.now() - me.at < 30 * 60000) return; put('live', { id: 'dev-' + deviceId, kind: 'device', name: deviceName(), at: Date.now() }) }

// 주간 백업: 같은 gist 에 backup-YYYY-MM-DD.json · 최근 4개
const BK = /^backup-(\d{4}-\d{2}-\d{2})\.json$/
export async function listBackups() { if (!token() || !gistId()) return []; const g = await gh('/gists/' + gistId()); return Object.entries(g.files || {}).filter(([n]) => BK.test(n)).map(([n, f]) => ({ name: n, date: n.match(BK)[1], raw: f.raw_url, size: f.size })).sort((a, b) => b.date.localeCompare(a.date)) }
async function autoBackup(files, patch, force = false) {
  const bks = Object.keys(files).filter((n) => BK.test(n)).sort()
  const last = bks[bks.length - 1]?.match(BK)[1], d = new Date(), ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (force || !last || (Date.now() - new Date(last + 'T00:00').getTime()) / 864e5 >= 7) {
    patch[`backup-${ymd}.json`] = { content: JSON.stringify({ app: 'exam-study', v: 1, exportedAt: d.toISOString(), state: getState() }) }
    for (const n of bks.filter((n) => n !== `backup-${ymd}.json`).slice(0, Math.max(0, bks.length - 3))) patch[n] = null
  }
}
export async function backupNow() { const g = await gh('/gists/' + gistId()); const patch = {}; await autoBackup(g.files || {}, patch, true); await gh('/gists/' + gistId(), { method: 'PATCH', body: JSON.stringify({ files: patch }) }) }
// 되돌리기: 백업 속 항목을 지금 시각으로 다시 써서 모든 기기에 반영 (백업 뒤 새로 만든 항목은 남음)
export async function restoreBackup(b) {
  const data = JSON.parse(await (await fetch(b.raw, { cache: 'no-store' })).text())
  if (data.app !== 'exam-study' || !data.state) throw new Error('백업 형식이 올바르지 않아요')
  for (const c of COLL_NAMES) if (c !== 'live') for (const r of Object.values(data.state[c] || {})) { if (r.deleted) { if (getState()[c][r.id] && !getState()[c][r.id].deleted) remove(c, r.id) } else put(c, r) }
  await syncNow()
}

// 자동 동기화 시작 (App 이 한 번)
let started = false, timer = null
export function startSync() {
  if (started) return; started = true
  const soon = () => { clearTimeout(timer); const wait = Math.max(8000, 30000 - (Date.now() - (status.last || 0))); timer = setTimeout(syncNow, wait) }
  onChange((c) => { if (c !== 'live' && token()) soon() })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - (status.last || 0) > 60000) syncNow() })
  setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - (status.last || 0) > 5 * 60000) syncNow() }, 60000)
  setTimeout(syncNow, 1200)
}
export { settings }
