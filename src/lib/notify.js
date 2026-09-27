import { list, settings, find } from '../store/store.js'
import { today, nowMin, fmtTime, parseTime } from '../engine/date.js'
import { eventsOn } from '../engine/scheduler.js'
import { toast } from '../components/ui.jsx'
import { carryOver, autoTemplate } from '../store/actions.js'

// 알림: 앱이 열려 있는 동안 동작 (iOS 는 홈 화면 PWA 16.4+ 에서 시스템 알림 표시)
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

const fired = new Set(JSON.parse(sessionStorage.getItem('fired') || '[]'))
function fire(key, title, body) {
  if (fired.has(key)) return
  fired.add(key)
  sessionStorage.setItem('fired', JSON.stringify([...fired].slice(-300)))
  toast(`🔔 ${title}${body ? ' · ' + body : ''}`)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready.then((r) => r.showNotification(title, { body, icon: './icon-192.png', tag: key })).catch(() => new Notification(title, { body }))
    }
  } catch {}
}

export function checkReminders() {
  if (!settings().notify) return
  const d = today(), m = nowMin()
  for (const e of eventsOn(d)) {
    if (e.start == null || e.remind == null) continue
    const at = e.start - e.remind - (e.bufferBefore || 0)
    if (m >= at && m < e.start) fire(`ev:${e.id}:${d}`, e.title, `${fmtTime(e.start)} 시작${e.location ? ' · ' + e.location : ''}`)
  }
  for (const t of list('tasks')) {
    if (t.done || t.due !== d || t.dueTime == null) continue
    const at = t.dueTime - (t.remind ?? 0)
    if (m >= at && m < t.dueTime + 30) fire(`task:${t.id}:${d}`, t.title, `${fmtTime(t.dueTime)} 마감`)
  }
  for (const med of list('meds')) {
    if (!med.active) continue
    for (const tm of med.times || []) {
      const at = parseTime(tm)
      if (m >= at && m < at + 60 && !find('medLogs', `${med.id}_${d}_${tm}`)?.taken) fire(`med:${med.id}:${d}:${tm}`, `${med.name} 복용`, tm)
    }
  }
}

// 날짜가 바뀌면 이월·템플릿 적용
let lastDay = null
function dayTick() {
  const d = today()
  if (d === lastDay) return
  lastDay = d
  carryOver()
  autoTemplate(d)
}

export function startServices() {
  dayTick()
  checkReminders()
  setInterval(() => { dayTick(); checkReminders() }, 30000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { dayTick(); checkReminders() } })
}

/* ── 화면 켜짐 유지 ── */
let lock = null
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen')
      document.addEventListener('visibilitychange', relock)
    } else { await lock?.release(); lock = null; document.removeEventListener('visibilitychange', relock) }
    return !!lock
  } catch { return false }
}
async function relock() { if (lock && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen').catch(() => null) }
