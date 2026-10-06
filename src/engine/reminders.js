// 할 일 알림 (앱 안 알림·서버 푸시 공용, 브라우저 의존 없음)
// reminders: [분 전 숫자 | 'am'(당일 아침 9시)] · 시간이 없는 할 일은 9시 기준
export const REMINDER_OPTS = [[0, '정시'], [10, '10분 전'], [30, '30분 전'], [60, '1시간 전'], [1440, '하루 전'], ['am', '당일 아침 9시']]
const MORNING = 9 * 60
const dayIdx = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000 }
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// 예전 방식(remind: 분 전 하나)도 인식
export const taskReminders = (t) => (t.reminders?.length ? t.reminders : t.remind != null && t.dueTime != null ? [t.remind] : [])
export const absMinutes = (date, min) => dayIdx(date) * 1440 + min

// 각 알림의 절대 시각(분 단위)
export function reminderTimes(t) {
  if (!t.due || t.done || t.archived) return []
  const day = dayIdx(t.due) * 1440, base = day + (t.dueTime ?? MORNING)
  return taskReminders(t).map((off) => ({ off, at: off === 'am' ? day + MORNING : base - off }))
}

export function reminderBody(t, off) {
  const time = t.dueTime != null ? ' ' + hm(t.dueTime) : ''
  // 차분한 문구: '마감' 대신 '까지'
  if (off === 'am') return time ? `오늘${time}까지` : '오늘까지'
  if (off >= 1440) return time ? `내일${time}까지` : '내일까지'
  if (off === 0) return time ? `${time.trim()}까지` : '오늘 할 일'
  return `${off >= 60 ? off / 60 + '시간' : off + '분'} 뒤까지`
}

// 알림 요약: 정한 시각(예: 07:30·12:30·18:00)에 다음 요약 시각 전까지의 할 일 알림을 한 번에
export const DIGEST_TIMES = ['07:30', '12:30', '18:00']
const toMin = (t) => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return isNaN(h) ? null : h * 60 + (m || 0) }
export function digestDue(tasks, date, now, times = DIGEST_TIMES, win = 15) {
  const slots = [...new Set(times.map(toMin).filter((x) => x != null))].sort((a, b) => a - b)
  if (!slots.length) return null
  const nowAbs = absMinutes(date, now)
  for (let i = 0; i < slots.length; i++) {
    const s = absMinutes(date, slots[i])
    if (nowAbs < s || nowAbs >= s + win) continue
    const next = i < slots.length - 1 ? absMinutes(date, slots[i + 1]) : absMinutes(date, slots[0]) + 1440
    const seen = new Set(), items = []
    for (const t of tasks) for (const r of reminderTimes(t)) {
      if (r.at < s || r.at >= next || seen.has(t.id)) continue
      seen.add(t.id); items.push({ t, off: r.off, at: r.at })
    }
    items.sort((a, b) => a.at - b.at)
    return { key: `dg:${date}:${slots[i]}`, items }
  }
  return null
}
export function digestText(items) {
  const lines = items.slice(0, 5).map(({ t, off }) => `· ${t.title}  ${reminderBody(t, off)}`)
  if (items.length > 5) lines.push('그리고 몇 가지 더')
  return { title: '할 일', body: lines.join('\n') }
}

// 기상·취침: 자는 시간(취침~기상)엔 알림을 보내지 않음, 기상 때 자는 동안 쌓인 할 일 알림을 한 번에
export function isQuiet(now, wake, sleep) {
  if (wake == null || sleep == null) return false
  sleep = sleep % 1440 || 1440
  return sleep > wake ? now < wake || now >= sleep : now >= sleep && now < wake
}
export function nightMissed(tasks, date, wake, sleep) {
  const s = sleep % 1440 || 1440
  const from = absMinutes(date, s > wake ? s - 1440 : s), to = absMinutes(date, wake)
  const seen = new Set(), items = []
  for (const t of tasks) for (const r of reminderTimes(t)) if (r.at >= from && r.at < to && !seen.has(t.id)) { seen.add(t.id); items.push({ t, off: r.off, at: r.at }) }
  return items.sort((a, b) => a.at - b.at)
}
