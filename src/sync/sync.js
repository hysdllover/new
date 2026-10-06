import { useSyncExternalStore } from 'react'
import { notesForWidget } from '../lib/notePreview.js'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { getState, replaceColl, onChange, patch, settings, list } from '../store/store.js'
import { COLLECTIONS, GIST_FILES } from '../store/schema.js'
import { mergeColl, stableFile } from './merge.js'
import { blobToDataUrl, setRemoteRaw, addFile } from '../lib/files.js'
import { eventsOn, classesOn } from '../engine/scheduler.js'
import { weekGoals, goalProgress, addTask, toggleTask, addSession } from '../store/actions.js'
import { today, addDays } from '../engine/date.js'
import { buildIcs } from '../lib/ics.js'
import { SCRIPT_VER } from '../lib/scriptable.js'
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
// 동기화 기록 (이 기기 · 최근 20개): 받은 항목 · 보낸 파일 · 겹침 · 오류
export const syncLog = () => { try { return JSON.parse(localStorage.getItem('sync_log') || '[]') } catch { return [] } }
function addLog(x) { try { localStorage.setItem('sync_log', JSON.stringify([x, ...syncLog()].slice(0, 20))) } catch {} }
export const useSyncStatus = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => status)

const token = () => ls.get('gist_token')
const gistId = () => ls.get('gist_id')

async function gh(path, opt = {}) {
  const res = await fetch(API + path, {
    ...opt,
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : null) },
  })
  const exp = res.headers.get('github-authentication-token-expiration') // 브라우저에 공개된 경우에만 읽힘
  if (exp) ls.set('token_exp', exp)
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const body = await res.json().catch(() => ({}))
      const h = (k) => res.headers.get(k)
      const retry = +h('retry-after'), reset = +h('x-ratelimit-reset')
      if (res.status === 429 || retry || h('x-ratelimit-remaining') === '0' || /rate limit/i.test(body.message || '')) {
        // GitHub 요청 제한 — 알려 준 시간(없으면 5분)만큼 쉬었다가 자동 재시도
        const until = retry ? Date.now() + retry * 1000 : reset && h('x-ratelimit-remaining') === '0' ? reset * 1000 : Date.now() + 5 * 60000
        throw Object.assign(new Error('GitHub 요청이 많아요. 잠시 후 다시 시도해 주세요'), { until: Math.max(until, Date.now() + 60000) })
      }
      throw new Error('토큰 권한이 부족해요 (gist 권한 확인)')
    }
    if (res.status === 401) throw Object.assign(new Error('GitHub 에서 토큰이 만료·취소됐어요 (GitHub 메일에 이유가 있어요) · 새 토큰을 넣어 주세요'), { auth: true })
    throw new Error(res.status === 404 ? 'Gist 를 찾을 수 없어요 (gist 권한 확인)' : `GitHub 오류 ${res.status}`)
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

// 토큰 백업: iOS 가 localStorage 만 비우는 경우를 대비해 IndexedDB 에도 저장
const backup = () => idbSet('gist_backup', { token: token(), gistId: gistId() }).catch(() => {})
export async function restoreSync() {
  if (token()) { if (!(await idbGet('gist_backup').catch(() => null))?.token) backup(); return }
  const b = await idbGet('gist_backup').catch(() => null)
  if (b?.token) { ls.set('gist_token', b.token); if (b.gistId) ls.set('gist_id', b.gistId); setStatus({ state: 'idle', error: null }) }
}

// 동기화용 gist 찾기(없으면 만들기)
async function ensureGist() {
  if (gistId()) return gistId()
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
  ls.set('gist_id', found.id); backup()
  return found.id
}

// 연결: 토큰이 틀린 경우(401)에만 지우고, 요청 제한·네트워크 오류는 토큰을 남긴 채 자동 재시도
export async function connect(tok, gid = null) {
  ls.set('gist_token', tok.trim()); ls.set('gist_id', gid); backup()
  setStatus({ state: 'syncing', error: null, auth: false })
  try {
    await ensureGist()
  } catch (e) {
    if (e.auth) {
      ls.set('gist_token', null); idbDel('gist_backup').catch(() => {})
      setStatus({ state: 'off', error: '토큰이 올바르지 않아요 (gist 권한·만료 확인)' })
      throw new Error('토큰이 올바르지 않아요')
    }
    if (e.until) pause(e.until)
    else setStatus({ state: 'error', error: '연결 대기 중 · 자동으로 다시 시도해요 (' + e.message + ')' })
    return null
  }
  await syncNow()
  return gistId()
}

// Safari 연결 링크: 위젯을 누르면 iOS 가 Safari 로 열어서(홈 화면 앱과 저장소가 따로) — Safari 에도 같은 토큰을 한 번 넣는 링크
// 토큰은 # 뒤에만 있어 서버로 가지 않고, 열자마자 주소에서 지움
export const connectLink = () => { const t = token(); if (!t) return null; const b = btoa(JSON.stringify({ t, g: gistId() })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return location.origin + location.pathname + '#link=' + b }
export function readConnectLink() {
  const m = /^#link=([\w-]+)/.exec(location.hash)
  if (!m) return null
  history.replaceState(null, '', location.pathname + location.search)
  try { const o = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))); return o.t ? o : null } catch { return null }
}

export function disconnect() {
  ls.set('gist_token', null); ls.set('gist_id', null); ls.set('gist_last', null); ls.set('widget_gist', null); ls.set('widget_last', null); ls.set('widget_at', null); ls.set('token_exp', null)
  idbDel('gist_backup').catch(() => {})
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

// 위젯 전용 작은 gist — 홈 화면 위젯(Scriptable)이 빠르게 받을 수 있게 필요한 데이터만
const WIDGET_DESC = 'study-dashboard-widget'
export const widgetGistId = () => ls.get('widget_gist')
// 위젯은 토큰 없이 비공개 gist 의 raw 주소로 읽음 (스크립트에 토큰을 넣지 않기 위해)
export const widgetRawUrl = () => { const id = widgetGistId(), who = ls.get('gh_login'); return id && who ? `https://gist.githubusercontent.com/${who}/${id}/raw/widget.json` : null }
// 캘린더 위젯용: 지난달 말~앞으로 45일 일정(반복 포함)을 날짜별로 펼침
function calPayload() {
  if (excluded().has('events')) return {}
  const ymd = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0')
  const d = new Date(); d.setDate(1); d.setDate(d.getDate() - 7)
  const out = {}
  for (let i = 0; i < 90; i++, d.setDate(d.getDate() + 1)) {
    const evs = eventsOn(ymd(d))
    if (evs.length) out[ymd(d)] = evs.map((e) => ({ t: e.title || '', s: e.start ?? null, e: e.end ?? null, c: e.color || null, l: e.location || null }))
  }
  return out
}
// 진행 중 타이머 (잠금 화면 위젯에서 실시간 표시)
function timerPayload() {
  let t = null
  try { t = JSON.parse(localStorage.getItem('timer')) } catch {}
  if (!t) return null
  const sub = getState().subjects?.[t.subjectId]
  const acc = t.acc || 0
  return { mode: t.mode, sid: t.subjectId || null, name: sub?.name || '공부', color: sub?.color || null, paused: !!t.paused, acc, start: t.paused ? null : t.segStart - acc, end: t.mode === 'countdown' && !t.paused ? t.segStart + (t.target - acc) : null, target: t.target || null }
}
// 앞으로 8일 수업 — 앱을 며칠 안 열어도 위젯이 그날 시간표를 보여 줌
function classesPayload() {
  const out = {}
  for (let i = -6; i < 8; i++) { // 이번 주 지난 요일(대형 위젯 주간 표) ~ 앞으로 7일
    const k = addDays(today(), i), l = classesOn(k)
    if (l.length) out[k] = l.map(({ period, title, start, end, room }) => ({ period, title, start, end, room }))
  }
  return out
}

// 위젯 '진도': 교재·인강 진행 (짧게)
function progPayload() {
  const sub = (id) => list('subjects').find((s) => s.id === id)
  const tb = list('textbooks').map((x) => ({ t: x.title, n: x.current || 0, of: x.total || 0, u: x.unit || 'p', c: sub(x.subjectId)?.color || null }))
  const lec = list('lectures').map((x) => { const n = Object.keys(x.done || {}).filter((k) => +k <= x.total).length; return { t: x.title, n, of: x.total || 0, u: '강', c: sub(x.subjectId)?.color || null } })
  return [...lec, ...tb].filter((x) => x.of && x.n < x.of).slice(0, 8)
}
// 위젯 '목표': 이번 주 목표 3개와 진행률
function goalsPayload() {
  const tasks = list('tasks')
  return weekGoals().map((g) => { const p = goalProgress(g, tasks); return { t: g.title, done: !!g.done || (p.linked > 0 && p.ratio >= 1), r: p.ratio, n: p.done, of: p.linked } })
}

// 위젯 '내 위젯' 칸용: 오늘 습관 · 오늘 볼 복습 수 · 오늘의 하나
function extraPayload() {
  const d = today(), day = getState().days?.[d], one = day?.one
  const oneT = one?.taskId ? getState().tasks?.[one.taskId] : null
  return {
    habits: list('habits').filter((h) => !h.archived).slice(0, 10).map((h) => ({ id: h.id, t: h.title, c: h.color || null, on: !!h.days?.[d], w: Array.from({ length: 7 }, (_, i) => !!h.days?.[addDays(d, i - 6)]) })),
    rev: list('reviews').filter((r) => r.next && r.next <= d && !r.done).length,
    one: one ? { t: oneT ? oneT.title : one.text || '', d: oneT ? !!oneT.done : !!one.done } : null,
  }
}
function widgetPayload() {
  const st = getState()
  const keep = (c, fn = () => true) => Object.fromEntries(Object.values(st[c] || {}).filter((r) => !r.deleted && fn(r)).map((r) => [r.id, r]))
  const d = new Date(); d.setDate(d.getDate() - 62)
  const from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const recent = Date.now() - 2 * 86400000
  const main = settings()
  return JSON.stringify({
    tasks: { tasks: keep('tasks', (t) => !t.archived && (!t.done || (t.doneAt && new Date(t.doneAt).getTime() > recent))) },
    study: { subjects: keep('subjects'), sessions: keep('sessions', (x) => x.date >= from), ddays: keep('ddays') },
    cal: calPayload(),
    timer: timerPayload(),
    classes: classesPayload(),
    prog: progPayload(),
    goals: goalsPayload(),
    notes: excluded().has('notes') ? [] : notesForWidget(getState()),
    extra: extraPayload(),
    sv: SCRIPT_VER,
    gid: gistId(), // 위젯에서 바로 처리할 때 명령을 남길 곳 (토큰은 위젯 쪽 보관함에만)
    settings: { settings: { main: { goalDaily: main.goalDaily, weekStart: main.weekStart, widgetFont: main.widgetFont, widgetScale: main.widgetScale, widgetWeight: main.widgetWeight, widgetClear: main.widgetClear, widgetTheme: main.widgetTheme, dashTiles: main.dashTiles, customWidgets: main.customWidgets } }, quotes: keep('quotes') },
  })
}
const ATT_MAX = 7 * 1024 * 1024 // gist 한 파일로 올릴 수 있는 첨부 크기 (base64 로 늘어나는 걸 고려)
const WIDGET_GAP = 60000, WIDGET_FORCE_GAP = 15000 // 위젯 gist 쓰기 최소 간격 1분 (앱을 나갈 때·타이머는 15초) — GitHub 쓰기 제한 대비
let widgetDirty = false, widgetTimer = null
// 아이폰 캘린더 구독용 .ics (일정·할 일·D-day)
function calendarIcs() {
  const st = settings(), ex = excluded()
  const ymd = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0')
  const d = new Date(); d.setDate(d.getDate() - 30)
  const from = ymd(d), items = []
  const evOn = st.icsEvents !== false && !ex.has('events'), clOn = !!st.icsClasses
  if (evOn || clOn) {
    for (let i = 0; i < 150; i++, d.setDate(d.getDate() + 1)) {
      const k = ymd(d)
      if (evOn) for (const e of eventsOn(k)) items.push({ uid: `e-${e.id}-${k}`, title: e.title, date: k, start: e.start ?? null, end: e.end ?? null, location: e.location, note: e.note })
      if (clOn) for (const c of classesOn(k)) items.push({ uid: c.id, title: `${c.period}교시 ${c.title}`, date: k, start: c.start, end: c.end, location: c.room })
    }
  }
  if (st.icsTasks !== false) for (const t of list('tasks')) if (t.due && !t.done && !t.archived && t.due >= from) items.push({ uid: `t-${t.id}`, title: '☐ ' + t.title, date: t.due, start: t.dueTime ?? null, end: t.dueTime != null ? t.dueTime + (t.estimate || 30) : null })
  if (st.icsDdays !== false) for (const x of list('ddays')) if (x.date >= from) items.push({ uid: `d-${x.id}`, title: '🎯 ' + x.title, date: x.date })
  const day = new Date(); day.setHours(0, 0, 0, 0)
  return buildIcs(items, { name: '스터디 일정', stamp: day })
}
export const calendarUrl = () => widgetRawUrl()?.replace(/widget\.json$/, 'calendar.ics') || null

async function syncWidget(remoteId, patchFiles, force) {
  const content = widgetPayload(), ics = calendarIcs()
  let id = remoteId || widgetGistId()
  if (!id) {
    const res = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: WIDGET_DESC, public: false, files: { 'widget.json': { content }, 'calendar.ics': { content: ics } } }) })
    id = res.id
    ls.set('widget_last', content); ls.set('ics_last', ics)
  } else if (ls.get('widget_last') !== content || ls.get('ics_last') !== ics || ls.get('widget_gist') !== id) {
    const gap = force ? WIDGET_FORCE_GAP : WIDGET_GAP
    if (ls.get('widget_gist') === id && Date.now() - (+ls.get('widget_at') || 0) < gap) {
      widgetDirty = true
      clearTimeout(widgetTimer); widgetTimer = setTimeout(() => syncNow({ flush: true }), gap - (Date.now() - (+ls.get('widget_at') || 0)) + 500)
      return
    }
    try {
      const files = { 'widget.json': { content } }
      if (ls.get('ics_last') !== ics || ls.get('widget_gist') !== id) files['calendar.ics'] = { content: ics }
      await gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files }) })
      ls.set('widget_last', content); ls.set('ics_last', ics); ls.set('widget_at', String(Date.now())); widgetDirty = false
    } catch (e) {
      if (/찾을 수 없/.test(e.message)) { ls.set('widget_gist', null); ls.set('widget_last', null); ls.set('ics_last', null); return syncWidget(null, patchFiles, force) }
      throw e
    }
  }
  ls.set('widget_gist', id)
  if (remoteId !== id) patchFiles['widget-gist.txt'] = { content: id }
}

// 자동 백업: 7일마다 gist 에 `backup-날짜.json` 저장, 최근 4개만 보관 (이 기기에만 두는 항목은 제외)
const BACKUP_RE = /^backup-(\d{4}-\d{2}-\d{2})\.json$/
const ymdNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function backupContent() {
  const ex = excluded(), st = getState()
  return JSON.stringify({ app: 'study-dashboard', exportedAt: new Date().toISOString(), state: Object.fromEntries(Object.entries(st).filter(([c]) => !ex.has(c))) })
}
function autoBackup(gist, patchFiles, force = false) {
  const names = Object.keys(gist.files || {}).filter((n) => BACKUP_RE.test(n)).sort()
  const last = names.length ? names[names.length - 1].match(BACKUP_RE)[1] : null
  const due = force || !last || (Date.now() - new Date(last + 'T00:00').getTime()) / 86400000 >= 7
  if (!due) return
  const name = `backup-${ymdNow()}.json`
  patchFiles[name] = { content: backupContent() }
  const keep = [...new Set([...names, name])].sort().slice(-4)
  for (const n of names) if (!keep.includes(n)) patchFiles[n] = null
}
export async function listBackups() {
  const g = await gh(`/gists/${gistId()}`)
  return Object.entries(g.files || {}).filter(([n]) => BACKUP_RE.test(n)).map(([n, f]) => ({ name: n, date: n.match(BACKUP_RE)[1], size: f.size, raw: f.raw_url })).sort((a, b) => b.date.localeCompare(a.date))
}
export async function backupNow() {
  const g = await gh(`/gists/${gistId()}`)
  const patchFiles = {}
  autoBackup(g, patchFiles, true)
  await gh(`/gists/${gistId()}`, { method: 'PATCH', body: JSON.stringify({ files: patchFiles }) })
}
// 되돌리기: 백업 속 항목을 지금 시각으로 덮어써 모든 기기에 반영 (백업 이후 새로 만든 항목은 남음)
export async function restoreBackup(b) {
  const data = JSON.parse(await (await fetch(b.raw)).text())
  if (!data.state) throw new Error('백업 형식이 올바르지 않아요')
  const now = Date.now(), dev = localStorage.getItem('deviceId')
  for (const [c, recs] of Object.entries(data.state)) {
    if (!(c in COLLECTIONS) || typeof recs !== 'object') continue
    const bumped = Object.fromEntries(Object.entries(recs).map(([id, r]) => [id, { ...r, updatedAt: now, deviceId: dev }]))
    replaceColl(c, { ...getState()[c], ...bumped })
  }
  syncNow()
}

let againFlush = false
let running = null, again = false, pausedUntil = 0, resumeTimer = null, lastPush = 0, lastRun = 0
const pauseMsg = () => `요청이 많아 잠시 쉬는 중 · ${Math.max(1, Math.ceil((pausedUntil - Date.now()) / 60000))}분 뒤 자동 재시도`
function pause(until) {
  pausedUntil = until
  clearTimeout(resumeTimer); resumeTimer = setTimeout(() => syncNow(), pausedUntil - Date.now() + 1000)
  setStatus({ state: 'error', error: pauseMsg() })
}
// 위젯 명령(cmd-*.json): 할 일 완료 · 타이머 시작/일시정지/계속/정지 · 공부 기록 — 보낸 시각 순서대로 반영 후 gist 에서 지움
async function takeCmds(cmds) {
  if (!cmds.length) return []
  const list2 = [], done = []
  for (const [name, f] of cmds) { try { list2.push({ name, c: JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content) }) } catch { done.push(name) } }
  list2.sort((a, b) => (a.c.at || 0) - (b.c.at || 0))
  const { widgetTimer } = await import('../lib/timer.js')
  const { find: findRec } = await import('../store/store.js')
  for (const { name, c } of list2) {
    try {
      const at = +c.at || Date.now()
      if (c.act === 'done') { const tk = findRec('tasks', c.id); if (tk && !tk.done) { toggleTask(c.id); patch('tasks', c.id, { doneAt: at }) } }
      else if (['start', 'pause', 'resume', 'stop'].includes(c.act)) widgetTimer(c.act, at, c.sid)
      else if (c.act === 'habit') { const h = findRec('habits', c.id); if (h) { const dd = new Date(at), k = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`; patch('habits', c.id, { days: { ...(h.days || {}), [k]: !!c.on } }) } }
      else if (c.act === 'addtask' && c.title) addTask({ title: String(c.title).slice(0, 200), due: c.due || null })
      else if (c.act === 'noteline' && c.text) { const n = findRec('notes', c.id); if (n) patch('notes', n.id, { blocks: [...(n.blocks || []).filter((b, i, arr) => !(i === arr.length - 1 && b.type === 'text' && !b.text)), { id: 'wg' + at, type: 'text', text: String(c.text).slice(0, 2000) }] }) }
      else if (c.act === 'log' && c.dur > 0) addSession({ id: 'wg-' + at, subjectId: c.sid || null, start: at - c.dur * 60000, end: at, kind: 'manual' })
    } catch (e) { addLog({ at: Date.now(), err: '위젯 명령 실패 · ' + String(e.message || e).slice(0, 60) }) }
    done.push(name)
  }
  return done
}

async function takeInbox(inbox) {
  const done = []
  for (const [name, f] of inbox) {
    try {
      let txt = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
      txt = String(txt || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '')
      if (!txt) { done.push(name); continue }
      const bin = atob(txt), u8 = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
      const type = u8[0] === 0x89 && u8[1] === 0x50 ? 'image/png' : 'image/jpeg'
      const label = decodeURIComponent(name.replace(/^inbox-/, '').replace(/\.[a-z]+$/i, '').replace(/~\d+$/, '')).trim()
      const title = !label || /^[\d\s:.\-_T]+$/.test(label) ? '사진' : label
      const rec = await addFile(new File([u8], `photo-${Date.now()}.${type === 'image/png' ? 'png' : 'jpg'}`, { type }))
      addTask({ title, inbox: true, files: [rec.id] })
      done.push(name)
    } catch (e) { addLog({ at: Date.now(), err: '사진 받기 실패 · ' + String(e.message || e).slice(0, 60) }) }
  }
  if (done.length) import('../components/ui.jsx').then((m) => m.toast(`사진 ${done.length}장이 받은 편지함에 들어왔어요`)).catch(() => {})
  return done
}

export async function syncNow({ flush = false } = {}) {
  if (!token()) return
  if (!navigator.onLine) { setStatus({ state: 'pending' }); return }
  if (Date.now() < pausedUntil) { setStatus({ state: 'error', error: pauseMsg() }); return }
  if (running) { again = true; againFlush = againFlush || flush; return running }
  // 받기만 하는 동기화는 20초 안에 다시 하지 않음 (요청 수 절약)
  if (!flush && status.state !== 'pending' && !widgetDirty && Date.now() - lastRun < 20000) return
  lastRun = Date.now()
  running = (async () => {
    setStatus({ state: 'syncing', error: null, auth: false })
    try {
      await ensureGist()
      const gist = await gh(`/gists/${gistId()}`)
      if (gist.owner?.login) ls.set('gh_login', gist.owner.login)
      const remoteText = {}, inbox = [], cmds = []
      for (const [name, f] of Object.entries(gist.files || {})) {
        if (name.startsWith('inbox-')) { inbox.push([name, f]); continue }
        if (name.startsWith('cmd-')) { cmds.push([name, f]); continue }
        if (name.startsWith('att-')) { setRemoteRaw(name.slice(4).replace(/\.txt$/, ''), f.raw_url); continue }
        if (name.startsWith('font-') || name.startsWith('backup-')) continue
        remoteText[name] = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
      }
      // 1) 원격 → 로컬 병합
      const ex = excluded(), since = +ls.get('gist_last') || 0
      let got = 0, clash = 0
      for (const f of GIST_FILES) {
        let data = {}
        try { data = JSON.parse(remoteText[f + '.json'] || '{}') } catch {}
        for (const [c, recs] of Object.entries(data)) {
          if (!(c in COLLECTIONS) || ex.has(c)) continue
          const { merged, localChanged, received, conflicts } = mergeColl(getState()[c], recs, since)
          if (localChanged) replaceColl(c, merged)
          got += received; clash += conflicts
        }
      }
      // 1-1) 사진 받기함: 단축어가 gist 에 올린 사진(inbox-*.txt, base64) → 받은 편지함 할 일로 · 처리한 건 gist 에서 지움
      const inboxDone = [...await takeInbox(inbox), ...await takeCmds(cmds)]
      // 2) 로컬 → 원격: 바뀐 파일만
      const files = buildFiles(getState())
      const patchFiles = {}
      for (const n of inboxDone) patchFiles[n] = null
      for (const [name, content] of Object.entries(files)) if (remoteText[name] !== content) patchFiles[name] = { content }
      // 첨부 파일 업로드 / 삭제
      // 첨부는 본 데이터와 따로 한 개씩 올림 (큰 파일 하나가 실패해도 동기화 전체가 막히지 않게) — 아래 3) 에서
      const attQueue = []
      for (const m of list('files')) {
        if (m.gist || gist.files?.[`att-${m.id}.txt`]) { if (!m.gist && gist.files?.[`att-${m.id}.txt`]) patch('files', m.id, { gist: true }); continue }
        attQueue.push(m)
      }
      for (const r of Object.values(getState().files)) if (r.deleted && gist.files?.[`att-${r.id}.txt`]) patchFiles[`att-${r.id}.txt`] = null
      const fontsUp = await syncFonts(gist, patchFiles)
      autoBackup(gist, patchFiles)
      try { await syncWidget(remoteText['widget-gist.txt']?.trim(), patchFiles, flush) } catch (e) { if (e.until) throw e }
      if (Object.keys(patchFiles).length) {
        const res = await gh(`/gists/${gistId()}`, { method: 'PATCH', body: JSON.stringify({ files: patchFiles }) })
        lastPush = Date.now()
        for (const [name, f] of Object.entries(res.files || {})) if (name.startsWith('att-')) setRemoteRaw(name.slice(4).replace(/\.txt$/, ''), f.raw_url)
        for (const id of fontsUp) await markSynced(id)
      }
      // 3) 첨부 파일 올리기: 한 번에 최대 4개 · 하나씩 · 실패하면 이유를 기록하고 다음 동기화 때 다시
      let attFail = 0
      for (const m of attQueue.slice(0, 4)) {
        try {
          const blob = await idbGet('blob:' + m.id)
          if (!blob) continue // 다른 기기에서 만든 첨부 (그 기기가 올림)
          if (blob.size > ATT_MAX) { if (!m.tooBig) { patch('files', m.id, { tooBig: true }); addLog({ at: Date.now(), err: `‘${m.name}’ 은 ${Math.round(blob.size / 1048576)}MB 라 이 기기에만 있어요 (동기화는 ${ATT_MAX / 1048576}MB 까지)` }) } continue }
          const res = await gh(`/gists/${gistId()}`, { method: 'PATCH', body: JSON.stringify({ files: { [`att-${m.id}.txt`]: { content: await blobToDataUrl(blob) } } }) })
          const f = res.files?.[`att-${m.id}.txt`]; if (f) setRemoteRaw(m.id, f.raw_url)
          patch('files', m.id, { gist: true })
        } catch (e) { if (e.until) throw e; attFail++; addLog({ at: Date.now(), err: `첨부 ‘${m.name}’ 올리기 실패 · ${String(e.message || e).slice(0, 50)}` }) }
      }
      if (attQueue.length > 4 && !attFail) again = true // 남은 첨부는 이어서
      await clearDeletes()
      const now = Date.now()
      ls.set('gist_last', String(now))
      const sent = Object.keys(patchFiles).filter((k) => k.endsWith('.json') && !k.startsWith('backup-')).length
      if (got || sent || clash) addLog({ at: now, got, sent, clash })
      setStatus({ state: 'ok', last: now })
      if (!settings().noteTaskClean1) import('../lib/notes.js').then((m) => m.cleanNoteTasksOnce()).catch(() => {})
    } catch (e) {
      if (e.until) pause(e.until)
      else {
        if (/Gist 를 찾을 수 없/.test(e.message)) ls.set('gist_id', null) // 지워진 gist → 다음에 다시 찾거나 만듦
        setStatus({ state: 'error', error: e.message, auth: !!e.auth })
        addLog({ at: Date.now(), err: String(e.message || e).slice(0, 80) })
      }
    }
  })()
  try { await running } finally {
    running = null
    if (again) { const f = againFlush; again = false; againFlush = false; syncNow({ flush: f }) }
  }
}

let timer = null
export function startSync() {
  onChange(() => {
    if (!token()) return
    if (status.state !== 'syncing') setStatus({ state: 'pending' })
    clearTimeout(timer)
    // 입력이 멈추고 4초 뒤, 연속 업로드는 최소 30초 간격 (GitHub 쓰기 제한 대비)
    timer = setTimeout(() => syncNow(), Math.max(4000, lastPush + 30000 - Date.now()))
  })
  // 앱을 나갈 때 대기 중인 변경을 바로 올림 (iOS 는 백그라운드에서 곧 멈춤)
  const flush = () => { if (status.state === 'pending' || widgetDirty) { clearTimeout(timer); syncNow({ flush: true }) } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); else flush() })
  window.addEventListener('pagehide', flush)
  // 타이머 시작·정지는 잠금 화면 위젯에 바로 반영
  window.addEventListener('timer-change', () => { if (token()) syncNow({ flush: true }) })
  window.addEventListener('online', () => syncNow())
  // 열려 있는 동안 다른 기기 변경 받기: 설정의 자동 동기화 간격(기본 3분 · 절약 10분 · 끄기) — 타이머 중엔 1분
  setInterval(() => {
    if (document.visibilityState !== 'visible') return
    const every = { normal: 180000, eco: 600000, off: 0 }[settings().syncEvery || 'normal']
    const need = localStorage.getItem('timer') ? Math.min(every || 60000, 60000) : every
    if (need && Date.now() - lastRun >= need - 1000) syncNow()
  }, 30000)
  syncNow()
}

// 동기화와 별개인 Gist 파일 읽기/쓰기 (푸시 구독·위젯용)
export const gistInfo = () => ({ token: token(), gistId: gistId(), widgetGist: widgetGistId(), widgetRaw: widgetRawUrl() })
export const tokenExpiry = () => ls.get('token_exp')
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
