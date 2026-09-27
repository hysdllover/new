// 날짜는 로컬 기준 'YYYY-MM-DD' 문자열, 시각은 자정부터의 분(min)으로 다룬다.
const pad = (n) => String(n).padStart(2, '0')

export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const today = () => ymd()
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d) }
export const addMonths = (s, n) => { const d = parseYmd(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth()))); return ymd(d) }
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
export const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 86400000) // a - b
export const dow = (s) => parseYmd(s).getDay()
export const weekStart = (s, startDow = 1) => { const d = dow(s); return addDays(s, -((d - startDow + 7) % 7)) }
export const monthStart = (s) => s.slice(0, 8) + '01'
export const range = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out }
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }

export const WD = ['일', '월', '화', '수', '목', '금', '토']
export const fmtDate = (s, opt = {}) => {
  if (!s) return ''
  const d = parseYmd(s)
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`
  return opt.year ? `${d.getFullYear()}년 ${md}` : opt.wd === false ? md : `${md} (${WD[d.getDay()]})`
}
export const fmtShort = (s) => { if (!s) return ''; const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}` }
export const fmtTime = (m) => m == null ? '' : `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
export const parseTime = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
export const fmtDur = (min) => {
  min = Math.round(min || 0)
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
export const fmtClock = (sec) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}` }

export const dday = (s) => {
  if (!s) return ''
  const n = diffDays(s, today())
  return n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`
}
export const tsToYmd = (ts) => ymd(new Date(ts))
export const tsToMin = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes() }

// '@오늘', '@내일 15:00', '@9/30', '@2026-10-02 9:30' 형태의 날짜 멘션 파싱
export const MENTION_RE = /@(오늘|내일|모레|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/
export function parseMention(text, base = today()) {
  const m = text.match(MENTION_RE)
  if (!m) return null
  let date
  if (m[1] === '오늘') date = base
  else if (m[1] === '내일') date = addDays(base, 1)
  else if (m[1] === '모레') date = addDays(base, 2)
  else if (m[1].includes('/')) {
    const [mo, d] = m[1].split('/').map(Number)
    let y = parseYmd(base).getFullYear()
    date = `${y}-${pad(mo)}-${pad(d)}`
    if (date < base) date = `${y + 1}-${pad(mo)}-${pad(d)}`
  } else { const [y, mo, d] = m[1].split('-').map(Number); date = `${y}-${pad(mo)}-${pad(d)}` }
  return { date, time: m[2] ? parseTime(m[2]) : null, match: m[0], rest: text.replace(m[0], '').replace(/\s+/g, ' ').trim() }
}
