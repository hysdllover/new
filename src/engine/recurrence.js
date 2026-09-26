import { addDays, diffDays, dow, parseYmd, weekStart, daysInMonth } from './date.js'

// rule: { freq: 'daily'|'weekly'|'monthly'|'yearly', interval, byDay: [0-6], monthMode: 'date'|'nth'|'last', until, except: [] }
export function matches(rule, start, date) {
  if (!rule || date < start) return false
  if (rule.until && date > rule.until) return false
  if (rule.except?.includes(date)) return false
  const iv = Math.max(1, rule.interval || 1)
  const s = parseYmd(start), d = parseYmd(date)
  switch (rule.freq) {
    case 'daily': return diffDays(date, start) % iv === 0
    case 'weekly': {
      const weeks = Math.round(diffDays(weekStart(date, 0), weekStart(start, 0)) / 7)
      const days = rule.byDay?.length ? rule.byDay : [dow(start)]
      return weeks % iv === 0 && days.includes(d.getDay())
    }
    case 'monthly': {
      const months = (d.getFullYear() - s.getFullYear()) * 12 + d.getMonth() - s.getMonth()
      if (months % iv) return false
      if (rule.monthMode === 'nth' || rule.monthMode === 'last') {
        if (d.getDay() !== s.getDay()) return false
        if (rule.monthMode === 'last') return d.getDate() + 7 > daysInMonth(d.getFullYear(), d.getMonth())
        return Math.ceil(d.getDate() / 7) === Math.ceil(s.getDate() / 7)
      }
      const dim = daysInMonth(d.getFullYear(), d.getMonth())
      return d.getDate() === Math.min(s.getDate(), dim)
    }
    case 'yearly': {
      const years = d.getFullYear() - s.getFullYear()
      return years % iv === 0 && d.getMonth() === s.getMonth() && d.getDate() === s.getDate()
    }
    default: return false
  }
}

export function occurrences(rule, start, from, to) {
  const out = []
  if (!rule) { if (start >= from && start <= to) out.push(start); return out }
  let d = from < start ? start : from
  for (let i = 0; d <= to && i < 1500; i++, d = addDays(d, 1)) if (matches(rule, start, d)) out.push(d)
  return out
}

export function nextOccurrence(rule, start, after) {
  let d = addDays(after < start ? addDays(start, -1) : after, 1)
  for (let i = 0; i < 1500; i++, d = addDays(d, 1)) {
    if (rule.until && d > rule.until) return null
    if (matches(rule, start, d)) return d
  }
  return null
}

const WD = ['일', '월', '화', '수', '목', '금', '토']
export function describeRule(rule, start) {
  if (!rule) return ''
  const iv = rule.interval > 1 ? rule.interval : ''
  let s = ''
  if (rule.freq === 'daily') s = iv ? `${iv}일마다` : '매일'
  if (rule.freq === 'weekly') s = `${iv ? iv + '주마다' : '매주'} ${(rule.byDay?.length ? rule.byDay : [dow(start)]).sort().map((d) => WD[d]).join('·')}`
  if (rule.freq === 'monthly') {
    const d = parseYmd(start)
    s = iv ? `${iv}개월마다 ` : '매월 '
    s += rule.monthMode === 'nth' ? `${Math.ceil(d.getDate() / 7)}번째 ${WD[d.getDay()]}요일` : rule.monthMode === 'last' ? `마지막 ${WD[d.getDay()]}요일` : `${d.getDate()}일`
  }
  if (rule.freq === 'yearly') s = iv ? `${iv}년마다` : '매년'
  if (rule.until) s += ` ~${rule.until.slice(5).replace('-', '/')}`
  return s
}
