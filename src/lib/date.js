// 날짜: 'YYYY-MM-DD' 문자열 기준 (기기 시간대)
const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => ymd()
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d) }
export const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 86400000) // a - b
export const WD = ['일', '월', '화', '수', '목', '금', '토']
export const weekStart = (s, start = 1) => { const d = parseYmd(s), k = (d.getDay() - start + 7) % 7; return addDays(s, -k) }
export const fmtShort = (s) => `${+s.slice(5, 7)}.${+s.slice(8)}`
export const fmtDate = (s, wd = true) => `${+s.slice(5, 7)}월 ${+s.slice(8)}일${wd ? ` (${WD[parseYmd(s).getDay()]})` : ''}`
// 남은 날: D-3 · D-DAY · D+2
export const dday = (s, t0 = today()) => { const n = diffDays(s, t0); return n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}` }
// 상대 날짜: 오늘 · 내일 · 모레 · 어제 · 날짜
export const rel = (s, t0 = today()) => { const n = diffDays(s, t0); return n === 0 ? '오늘' : n === 1 ? '내일' : n === 2 ? '모레' : n === -1 ? '어제' : fmtShort(s) }
// 분 → 1:05 · 1시간 5분
export const hm = (m) => `${Math.floor((m || 0) / 60)}:${pad(Math.round(m || 0) % 60)}`
export const dur = (m) => { m = Math.round(m || 0); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}시간 ${r}분` : `${h}시간`) : `${r}분` }
export const clock = (sec) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(s) }
export const tsYmd = (ts) => ymd(new Date(ts))
