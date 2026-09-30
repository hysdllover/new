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
  if (off === 'am') return `오늘${time} 마감`
  if (off >= 1440) return `내일${time} 마감`
  if (off === 0) return time ? `${time.trim()} 마감` : '오늘 할 일'
  return `${off >= 60 ? off / 60 + '시간' : off + '분'} 뒤 마감`
}
