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

// 아침 브리핑: 오늘 일정(학원 포함) · 오늘의 Top 3(없으면 할 일 수) · D-day 를 알림 한 개로
// events 는 오늘 열리는 일정만 넘김 (반복·여러 날 일정은 부르는 쪽에서 판단)
const WD = ['일', '월', '화', '수', '목', '금', '토']
export function morningBrief({ date, tasks = [], events = [], days = [], ddays = [] }) {
  const [y, mo, d] = date.split('-').map(Number), wd = WD[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]
  const ev = [...events].sort((a, b) => (a.start ?? -1) - (b.start ?? -1))
  const evTxt = ev.slice(0, 3).map((e) => (e.start != null ? hm(e.start) + ' ' : '') + e.title).join(' · ') + (ev.length > 3 ? ` 외 ${ev.length - 3}개` : '')
  const live = tasks.filter((t) => !t.done && !t.archived)
  const top = (days.find((x) => x.id === date)?.top3 || []).map((id) => live.find((t) => t.id === id)).filter(Boolean)
  const todo = live.filter((t) => t.due && t.due <= date).length
  const up = ddays.filter((x) => x.date >= date).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))[0]
  const ddN = up ? dayIdx(up.date) - dayIdx(date) : 0
  const lines = [
    ev.length ? '일정 · ' + evTxt : '일정 없음',
    top.length ? 'Top 3 · ' + top.map((t) => t.title).join(' · ') : todo ? `할 일 ${todo}개` : '오늘 할 일 없음',
    up ? `${up.title} ${ddN ? 'D-' + ddN : 'D-DAY'}` : null,
  ].filter(Boolean)
  return { title: `${mo}월 ${d}일 ${wd}요일 · 오늘`, body: lines.join('\n') }
}

// 알림 종류별 켜고 끄기 (settings.notifyOff[종류] === true 면 끔)
export const NOTIFY_KINDS = [['task', '할 일'], ['event', '일정'], ['academy', '학원'], ['med', '약'], ['am', '아침 브리핑'], ['pm', '저녁 마감']]
export const kindOn = (st, k) => st?.notifyOff?.[k] !== true
export const eventKind = (e) => (e.layer === 'academy' ? 'academy' : 'event')
// 일정 알림(분 전): 일정에 직접 정했으면 그 값(없음 = null), 안 정했으면 기본값 (학원 · 일정 따로)
export const eventRemind = (e, st) => (e.remind !== undefined ? e.remind : (eventKind(e) === 'academy' ? st?.academyRemind : st?.eventRemind) ?? null)
// 알림을 누르면 열 화면
export const notifyLink = {
  task: (id) => `./?task=${encodeURIComponent(id)}`,
  event: (id, date) => `./?ev=${encodeURIComponent(id)}&occ=${date}`,
  tasks: () => './?go=tasks.day',
  med: () => './?go=health',
  home: () => './?go=home',
  close: () => './?close=1',
}

// 저녁 마감: 오늘 공부 · 목표 · 남은 할 일 → 누르면 하루 마감하기
export function eveningBrief({ date, studied = 0, goal = 240, tasks = [] }) {
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ' ' + (m % 60) + '분' : ''}` : `${m}분`)
  const left = tasks.filter((t) => !t.done && !t.archived && t.due && t.due <= date).length
  const pct = goal ? Math.round((studied / goal) * 100) : 0
  const l1 = studied ? `공부 ${dur(studied)} · 목표의 ${pct}%` : '아직 공부 기록이 없어요'
  const l2 = (left ? `남은 할 일 ${left}개` : '남은 할 일 없음') + ' · 눌러서 하루 마감하기'
  return { title: studied >= goal ? '오늘 목표 달성 · 마감할 시간' : '오늘 마감할 시간', body: l1 + '\n' + l2 }
}

// 늦게 도착한 알림 처리: bundle(30분 넘게 늦은 건 하나로 묶기) · skip(30분 넘게 늦은 건 보내지 않기) · each(늦어도 하나씩)
export const LATE_MODES = [['bundle', '하나로 묶기'], ['skip', '보내지 않기'], ['each', '하나씩 모두']]
export function handleLate(out, mode = 'bundle', key = 'miss', limit = 30) {
  const late = out.filter((n) => (n.late || 0) > limit)
  const keep = out.filter((n) => !late.includes(n))
  if (mode === 'each' || !late.length) return { send: out, drop: [] }
  if (mode === 'skip') return { send: keep, drop: late }
  if (late.length === 1) return { send: out, drop: [] }
  const body = late.slice(0, 5).map((n) => `· ${n.title}${n.body ? ' — ' + n.body.split('\n')[0] : ''}`).join('\n') + (late.length > 5 ? '\n그리고 몇 가지 더' : '')
  return { send: [...keep, { key, title: '놓친 알림', body, url: notifyLink.home() }], drop: late }
}
