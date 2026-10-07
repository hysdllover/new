// 진단: 최근 오류 기록 · 저장 공간 보존 · 앱 아이콘 배지 · 진단 정보 복사
import { getState, settings } from '../store/store.js'
import { CHANGES } from './whatsnew.js'

const KEY = 'diag_errors'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
export const recentErrors = () => read()
export function logError(err, where = '') {
  try {
    const e = { t: Date.now(), w: where, m: String(err?.message || err).slice(0, 300), s: String(err?.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400) }
    localStorage.setItem(KEY, JSON.stringify([e, ...read()].slice(0, 20)))
  } catch {}
}
export const clearErrors = () => { try { localStorage.removeItem(KEY) } catch {} }

export function installErrorLog() {
  addEventListener('error', (e) => logError(e.error || e.message, 'window'))
  addEventListener('unhandledrejection', (e) => logError(e.reason, 'promise'))
}

// 저장 공간 보존 요청: 기기 공간이 모자라도 Safari 가 앱 데이터를 지우지 않게
export async function persistStorage() {
  try {
    if (!navigator.storage?.persist) return null
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch { return null }
}

// 앱 아이콘 배지: 오늘(지난 포함) 남은 할 일 수 · 설정에서 끔
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const badgeCount = (tasks) => { const d = today(); return Object.values(tasks || {}).filter((t) => !t.deleted && !t.done && !t.archived && t.due && t.due <= d).length }
let lastBadge = -1
export function updateBadge() {
  if (!navigator.setAppBadge) return
  const on = settings().appBadge !== false
  const n = on ? badgeCount(getState().tasks) : 0
  if (n === lastBadge) return
  lastBadge = n
  ;(n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {})
}

// 문제 신고용 진단 정보 (토큰·내용은 넣지 않음)
export async function diagText({ sync } = {}) {
  const st = getState(), n = (k) => Object.values(st[k] || {}).filter((x) => !x.deleted).length
  let est = ''
  try { const e = await navigator.storage?.estimate?.(); if (e) est = `${(e.usage / 1048576).toFixed(1)}MB / ${(e.quota / 1048576 / 1024).toFixed(1)}GB` } catch {}
  let persisted = '?'
  try { persisted = (await navigator.storage?.persisted?.()) ? '보존됨' : '보존 안 됨' } catch {}
  const errs = recentErrors().slice(0, 8).map((e) => `- ${new Date(e.t).toLocaleString('ko-KR')} [${e.w}] ${e.m}${e.s ? '\n    ' + e.s : ''}`).join('\n') || '- 없음'
  return [
    `스터디 앱 진단 · ${new Date().toLocaleString('ko-KR')}`,
    `버전: ${CHANGES[0]?.v || '-'}`,
    `기기: ${navigator.userAgent}`,
    `화면: ${innerWidth}×${innerHeight} @${devicePixelRatio}x · ${matchMedia('(display-mode: standalone)').matches ? '홈 화면 앱' : '브라우저'} · ${matchMedia('(prefers-color-scheme: dark)').matches ? '다크' : '라이트'}`,
    `저장: ${est} · ${persisted}`,
    `동기화: ${sync?.state || '-'}${sync?.error ? ' · ' + sync.error : ''}`,
    `데이터: 할 일 ${n('tasks')} · 노트 ${n('notes')} · 일정 ${n('events')} · 공부 기록 ${n('sessions')} · 첨부 ${n('files')}`,
    `최근 오류:\n${errs}`,
  ].join('\n')
}
