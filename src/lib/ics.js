// iCalendar(.ics) 만들기 — 아이폰 캘린더 구독용 (브라우저 의존 없음)
// items: [{ uid, title, date: 'YYYY-MM-DD', start?: 분, end?: 분, location?, note? }] (start 없으면 종일)
const pad = (n) => String(n).padStart(2, '0')
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const ymd = (d) => d.replace(/-/g, '')
const nextDay = (d) => { const [y, m, dd] = d.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd + 1)); return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}` }
const localTime = (d, min) => `${ymd(d)}T${pad(Math.floor(min / 60) % 24)}${pad(min % 60)}00`

// 75바이트 줄 접기 (UTF-8 기준, 글자 중간을 자르지 않음)
export function fold(line) {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out = []; let cur = '', size = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    if (size + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; size = 0 }
    cur += ch; size += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

export function buildIcs(items, { name = '스터디', tz = 'Asia/Seoul', stamp = new Date() } = {}) {
  const now = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//study-dashboard//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, `X-WR-TIMEZONE:${tz}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']
  for (const it of items) {
    L.push('BEGIN:VEVENT', `UID:${it.uid}@study-dashboard`, `DTSTAMP:${now}`, `SUMMARY:${esc(it.title || '(제목 없음)')}`)
    if (it.start == null) L.push(`DTSTART;VALUE=DATE:${ymd(it.date)}`, `DTEND;VALUE=DATE:${nextDay(it.endDate || it.date)}`)
    else {
      const end = it.end != null && it.end > it.start ? it.end : it.start + 30
      L.push(`DTSTART;TZID=${tz}:${localTime(it.date, it.start)}`, `DTEND;TZID=${tz}:${end >= 1440 ? localTime(nextDay(it.date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'), end - 1440) : localTime(it.date, end)}`)
    }
    if (it.location) L.push(`LOCATION:${esc(it.location)}`)
    if (it.note) L.push(`DESCRIPTION:${esc(it.note)}`)
    L.push('END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.map(fold).join('\r\n') + '\r\n'
}
