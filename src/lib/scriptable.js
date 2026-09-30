import { pickQuote } from './quote.js'
// iPhone·iPad 홈 화면·잠금 화면 위젯 (Scriptable) — 얇은 단일 서체 · 모노톤
// 유형: 위젯 편집 › Parameter 에 공부 · 할일 · 디데이 · 달력 · 다짐 (비우면 기본)
export const WIDGET_KINDS = [['', '기본'], ['공부', '공부'], ['할일', '할 일'], ['디데이', 'D-day'], ['달력', '공부 달력'], ['캘린더', '캘린더'], ['다짐', '다짐']]

export function buildScript({ widgetRaw, appUrl }) {
  return `// Study — 홈 화면·잠금 화면 위젯 (Scriptable)
// 위젯 길게 누르기 › 위젯 편집 › Script: 이 스크립트 · Parameter: 공부 / 할일 / 디데이 / 달력 / 다짐 (비우면 기본)
// 토큰 없음: 비공개 위젯 gist 의 주소로만 읽어요 (이 스크립트가 어디 노출돼도 GitHub 계정은 안전)
const SRC = ${JSON.stringify(widgetRaw || '')}
const APP = ${JSON.stringify(appUrl)}

const dyn = (l, d, a = 1) => Color.dynamic(new Color(l, a), new Color(d, a))
const BG = dyn('#f5f3ef', '#161616')
let INK = dyn('#2b2a28', '#ece8e1')
let SOFT = dyn('#a19c93', '#7d786f')
const GOLD = dyn('#b39d74', '#c9b489')
let RULE = dyn('#e2ded6', '#2c2b29')

// 폰트 — 한글·영문·숫자 한 서체로 통일. 기본 애플 산돌고딕 얇게, 앱 설정에서 설치한 폰트(PostScript 이름) 지정 가능
let CUSTOM = ''
const F = (s, wt = 'Light') => new Font(CUSTOM || 'AppleSDGothicNeo-' + wt, s)
const tw = (s) => F(s, 'Light')
const thin = (s) => F(s, 'Thin')
const label = (s) => F(s, 'Regular')

const RAWP = String(args.widgetParameter || '').replace(/\\s/g, '').toLowerCase()
const PARAM = RAWP.split('@')[0] // "공부@2" 처럼 @ 뒤는 배경 구분용
// 디데이2, 디데이3 … → 두 번째·세 번째 D-day
const DDI = Math.max(0, (+(PARAM.match(/(\\d)$/) || [])[1] || 1) - 1)
const KIND = { '공부': 'study', '할일': 'todo', '디데이': 'dday', 'd-day': 'dday', '달력': 'month', '캘린더': 'cal', '일정': 'cal', calendar: 'cal', '다짐': 'quote', study: 'study', todo: 'todo', dday: 'dday', month: 'month', quote: 'quote' }[PARAM.replace(/\\d$/, '')] || 'default'
const pickQuote = ${pickQuote.toString()}
const link = (path) => APP + (path ? '?go=' + path : '')

const pad = (n) => String(n).padStart(2, '0')
const d0 = new Date()
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const today = ymd(d0)
const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const alive = (o) => Object.values(o || {}).filter((r) => !r.deleted)
const hm = (m) => Math.floor(m / 60) + ':' + pad(m % 60)

let STALE = null // 받기 실패로 캐시를 쓸 때 마지막 갱신 시각
async function load() {
  const key = 'study-widget-data'
  try {
    if (!SRC) throw new Error('no source')
    const r = new Request(SRC + '?t=' + Date.now()); r.headers = { 'Cache-Control': 'no-cache' }; r.timeoutInterval = 20
    const data = JSON.parse(await r.loadString())
    if (!data.study) throw new Error('bad data')
    data.at = Date.now()
    Keychain.set(key, JSON.stringify(data))
    return data
  } catch (e) {
    if (!Keychain.contains(key)) return null
    const data = JSON.parse(Keychain.get(key))
    STALE = data.at ? new Date(data.at) : new Date(0)
    return data
  }
}

const dark = () => Device.isUsingDarkAppearance()
// 가는 진행선
function line(ratio, w, fg, bg) {
  const c = new DrawContext(); c.size = new Size(w, 3); c.opaque = false; c.respectScreenScale = true
  c.setFillColor(new Color(bg || (dark() ? '#2c2b29' : '#e2ded6'))); c.fillRect(new Rect(0, 1, w, 1))
  c.setFillColor(new Color(fg || (dark() ? '#c9b489' : '#b39d74'))); c.fillRect(new Rect(0, 0.5, Math.max(2, w * Math.min(1, ratio)), 2))
  return c.getImage()
}
// 잠금 화면 원형 링
function ring(ratio, size) {
  const c = new DrawContext(); c.size = new Size(size, size); c.opaque = false; c.respectScreenScale = true
  const r = size / 2 - 3, cx = size / 2, cy = size / 2
  const arc = (from, to) => { const p = new Path(); const pts = []; for (let a = from; a <= to + 0.001; a += 0.05) pts.push(new Point(cx + r * Math.sin(a), cy - r * Math.cos(a))); p.addLines(pts); return p }
  c.setLineWidth(3)
  c.setStrokeColor(new Color('#ffffff', 0.25)); c.addPath(arc(0, Math.PI * 2)); c.strokePath()
  if (ratio > 0) { c.setStrokeColor(new Color('#ffffff')); c.addPath(arc(0, Math.PI * 2 * Math.min(1, ratio))); c.strokePath() }
  return c.getImage()
}
function rule(parent, w) { const s = parent.addStack(); s.size = new Size(w, 0.6); s.backgroundColor = RULE }
function vrule(parent, h) { const s = parent.addStack(); s.size = new Size(0.6, h); s.backgroundColor = RULE }
function t(parent, s, font, color, lines = 1) { const x = parent.addText(String(s)); x.font = font; if (color) x.textColor = color; x.lineLimit = lines; return x }
function cap(parent, s) { return t(parent, s.split('').join(' '), label(8), SOFT) }

const data = await load()
const fam = config.widgetFamily || 'large'
const lock = fam.startsWith('accessory')
const w = new ListWidget()
w.url = link(KIND === 'todo' ? 'tasks' : KIND === 'cal' ? 'planner.month' : KIND === 'default' ? '' : 'study.records')
w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
const P = fam === 'small' ? 16 : 18
// 기기별 위젯 크기(pt) — 아이폰은 화면 폭 비례, 아이패드는 고정값
const SZ = (() => {
  if (Device.isPad()) return { small: 158, medium: 342, large: 342, extraLarge: 715 }
  const sc = Device.screenSize(), sw = Math.min(sc.width, sc.height)
  const sm = Math.min(170, Math.round(sw * 0.43)), md = Math.min(364, Math.round(sw * 0.926))
  return { small: sm, medium: md, large: md, extraLarge: md }
})()
const inner = (SZ[fam] || SZ.large) - P * 2
// 투명 배경(배경화면 잘라 붙이기) · 글자색
const FM = FileManager.local()
const bgPath = (f, p) => FM.joinPath(FM.documentsDirectory(), 'study-bg-' + f + '-' + (p || 'default') + '.jpg')
const inkMode = Keychain.contains('study-ink') ? Keychain.get('study-ink') : 'auto'
if (inkMode === 'light') { INK = new Color('#ffffff'); SOFT = new Color('#ffffff', 0.72); RULE = new Color('#ffffff', 0.3) }
if (inkMode === 'dark') { INK = new Color('#1d1c1a'); SOFT = new Color('#1d1c1a', 0.6); RULE = new Color('#1d1c1a', 0.2) }
if (!lock) {
  w.setPadding(P, P, P, P)
  if (FM.fileExists(bgPath(fam, RAWP))) w.backgroundImage = FM.readImage(bgPath(fam, RAWP))
  else w.backgroundColor = BG
}

if (!data) {
  t(w, lock ? '동기화 필요' : '앱에서 동기화를 연결하고 스크립트를 다시 복사해 주세요', tw(12), lock ? null : SOFT, 3)
} else {
  const st = data.settings.settings?.main || {}
  CUSTOM = (st.widgetFont || '').trim()
  const goal = st.goalDaily || 240
  const subjects = alive(data.study.subjects)
  const allSess = alive(data.study.sessions)
  const sessions = allSess.filter((s) => s.date === today)
  const mins = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const tasksAll = alive(data.tasks.tasks).filter((x) => !x.archived)
  // 날짜·시간 순, 같으면 사용자가 정한 순서
  const byDate = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.dueTime ?? 9999) - (b.dueTime ?? 9999) || (a.order ?? 0) - (b.order ?? 0)
  const todo = tasksAll.filter((x) => !x.done && x.due && x.due <= today).sort(byDate)
  const doneT = tasksAll.filter((x) => x.done && x.doneAt && new Date(x.doneAt).toDateString() === d0.toDateString())
  const done = doneT.length
  // 오늘 할 일: 완료해도 자리 그대로, 줄 그어 표시
  const items = tasksAll.filter((x) => x.due && x.due <= today && (!x.done || x.due === today || doneT.includes(x))).sort(byDate)
  // 취소선: 글자는 설정 폰트 그대로, 뒤에 가운데 가는 선 이미지를 깔아 표시 (특수 문자는 폰트가 바뀌어 사용 안 함)
  const strikeImg = (() => {
    const c = new DrawContext(); c.size = new Size(240, 24); c.opaque = false; c.respectScreenScale = true
    c.setFillColor(new Color(dark() ? '#7d786f' : '#a19c93')); c.fillRect(new Rect(0, 11.6, 240, 1.2))
    return c.getImage()
  })()
  const strike = (parent, s, font) => { const k = parent.addStack(); k.backgroundImage = strikeImg; t(k, s, font, SOFT).minimumScaleFactor = 0.85; return k }
  const ddAll = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const ddN = (d) => Math.round((new Date(d.date) - new Date(today)) / 86400000)
  const ddT = (d) => (ddN(d) === 0 ? 'D-DAY' : 'D-' + ddN(d))
  const dd = ddAll[KIND === 'dday' ? DDI : 0]
  const ddTxt = dd ? ddT(dd) : null
  const quotes = Object.keys(data.settings.quotes || {}).sort().map((k) => data.settings.quotes[k]).filter((q) => !q.deleted)
  const quote = pickQuote(quotes)?.text ?? null // 3시간마다 무작위 (앱과 같은 문구)
  const dateStr = DAY[d0.getDay()] + ' · ' + d0.getDate() + ' ' + MON[d0.getMonth()] + (STALE ? ' · ' + pad(STALE.getHours()) + ':' + pad(STALE.getMinutes()) : '')
  const pct = Math.round(Math.min(1, mins / goal) * 100)
  const subMins = subjects.map((s) => ({ s, m: sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)

  const studyBig = (parent, size, width) => {
    const r = parent.addStack(); r.bottomAlignContent()
    t(r, hm(mins), thin(size), INK).minimumScaleFactor = 0.5 // 폭이 모자라면 잘리지 않고 작아짐
    r.addSpacer(6); t(r, 'of ' + hm(goal), tw(size * 0.32), SOFT).minimumScaleFactor = 0.6
    r.addSpacer(); t(r, pct + '%', tw(size * 0.32), GOLD).minimumScaleFactor = 0.6
    parent.addSpacer(6)
    const img = parent.addImage(line(mins / goal, width)); img.imageSize = new Size(width, 3)
  }
  // 할 일 글자 크기: 소 13 · 중 14 · 대 15
  const TS = fam === 'small' ? 13 : fam === 'medium' ? 14 : 15
  const todoList = (parent, n, gap = fam === 'large' ? 7 : 5) => {
    for (const x of items.slice(0, n)) {
      const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
      if (x.done) { t(r, '✓', tw(TS - 2), SOFT); strike(r, x.title, tw(TS)) }
      else { t(r, x.priority >= 3 ? '•' : '–', tw(TS - 1), x.priority >= 3 ? GOLD : SOFT); t(r, x.title, tw(TS), INK).minimumScaleFactor = 0.85 }
      r.addSpacer() // 줄을 꽉 채워 왼쪽 정렬 (스택은 기본 가운데 정렬)
      parent.addSpacer(gap)
    }
    if (!items.length) t(parent, 'All clear.', tw(TS), SOFT)
    else if (items.length > n) t(parent, '+ ' + (items.length - n) + ' more', tw(11), SOFT)
  }
  const ddRow = (parent, big = 13) => { if (!dd) return; const r = parent.addStack(); r.centerAlignContent(); t(r, ddTxt, tw(big), GOLD); r.addSpacer(6); t(r, dd.title, tw(10), SOFT); r.addSpacer() }
  const subBars = (parent, width, n) => {
    const max = subMins[0]?.m || 1
    for (const x of subMins.slice(0, n)) {
      const r = parent.addStack(); r.centerAlignContent()
      t(r, x.s.name, tw(10), INK); r.addSpacer(); t(r, hm(x.m), tw(10), SOFT)
      parent.addSpacer(3)
      const img = parent.addImage(line(x.m / max, width)); img.imageSize = new Size(width, 3)
      parent.addSpacer(7)
    }
    if (!subMins.length) t(parent, 'No study yet.', tw(11), SOFT)
  }
  // 월별 공부 달력 (칸 진하기 = 목표 대비)
  const monthGrid = (parent, cell, gap, showNum) => {
    const byDay = {}
    for (const s of allSess) byDay[s.date] = (byDay[s.date] || 0) + (s.dur || 0)
    const y = d0.getFullYear(), m = d0.getMonth()
    const n = new Date(y, m + 1, 0).getDate()
    const ws = st.weekStart ?? 1
    const lead = (new Date(y, m, 1).getDay() - ws + 7) % 7
    const hdr = parent.addStack(); hdr.spacing = gap
    for (let i = 0; i < 7; i++) { const c = hdr.addStack(); c.size = new Size(cell, 10); c.centerAlignContent(); t(c, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][(i + ws) % 7], label(7), SOFT) }
    parent.addSpacer(gap)
    let day = 1 - lead
    while (day <= n) {
      const row = parent.addStack(); row.spacing = gap
      for (let i = 0; i < 7; i++, day++) {
        const c = row.addStack(); c.size = new Size(cell, showNum ? cell * 0.8 : cell * 0.72); c.cornerRadius = Math.min(5, cell / 5)
        if (day < 1 || day > n) continue
        const key = y + '-' + pad(m + 1) + '-' + pad(day)
        const v = byDay[key] || 0, r = Math.min(1, v / goal)
        c.backgroundColor = v ? dyn('#b39d74', '#c9b489', 0.18 + 0.72 * r) : RULE
        if (key === today) { c.borderWidth = 1; c.borderColor = INK }
        if (showNum) { c.setPadding(3, 4, 0, 0); c.topAlignContent(); t(c, day, label(8), r >= 0.6 ? dyn('#ffffff', '#161616') : SOFT) }
      }
      parent.addSpacer(gap)
    }
    const monthMins = Object.entries(byDay).filter(([k]) => k.startsWith(y + '-' + pad(m + 1))).map(([, v]) => v)
    return { total: monthMins.reduce((a, v) => a + v, 0), days: monthMins.filter(Boolean).length, hit: monthMins.filter((v) => v >= goal).length }
  }

  if (lock && KIND === 'dday') {
    // ── 잠금 화면 · D-day 만 ──
    const next = ddAll[DDI + 1]
    if (!dd) t(w, 'No D-day', tw(12))
    else if (fam === 'accessoryInline') {
      t(w, ddTxt + ' ' + dd.title, tw(12))
    } else if (fam === 'accessoryCircular') {
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(60, 60); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, ddN(dd) === 0 ? 'D-DAY' : ddN(dd), thin(ddN(dd) === 0 ? 14 : 24)).minimumScaleFactor = 0.5; a.addSpacer()
      const b = z.addStack(); b.addSpacer(); t(b, dd.title, label(8)).minimumScaleFactor = 0.6; b.addSpacer()
    } else {
      const r = w.addStack(); r.bottomAlignContent()
      t(r, ddTxt, thin(26)).minimumScaleFactor = 0.6; r.addSpacer()
      w.addSpacer(2)
      const r2 = w.addStack(); t(r2, dd.title, tw(12)); r2.addSpacer(6); t(r2, dd.date.slice(5).replace('-', '.'), tw(10)); r2.addSpacer()
      if (next) { w.addSpacer(2); const r3 = w.addStack(); t(r3, next.title + ' ' + ddT(next), tw(10)).textOpacity = 0.7; r3.addSpacer() }
    }
  } else if (lock) {
    // ── 잠금 화면 ──
    if (fam === 'accessoryInline') {
      t(w, hm(mins) + (dd ? ' · ' + ddTxt + ' ' + dd.title : ''), tw(12))
    } else if (fam === 'accessoryCircular') {
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(60, 60); z.backgroundImage = ring(KIND === 'dday' ? 0 : mins / goal, 60); z.centerAlignContent()
      const col = z.addStack(); col.layoutVertically(); col.centerAlignContent()
      if (KIND === 'dday' && dd) { t(col, ddN(dd) === 0 ? 'D' : ddN(dd), thin(20)); t(col, 'D-DAY', label(7)) }
      else { t(col, hm(mins), tw(13)); t(col, pct + '%', label(8)) }
    } else {
      const r = w.addStack(); r.bottomAlignContent()
      t(r, hm(mins), thin(22)); r.addSpacer(4); t(r, '/ ' + hm(goal), tw(10)); r.addSpacer(); if (dd) t(r, ddTxt, tw(12))
      w.addSpacer(3)
      const img = w.addImage(line(mins / goal, 150, '#ffffff', '#666666')); img.imageSize = new Size(150, 3)
      w.addSpacer(4)
      t(w, KIND === 'dday' && dd ? dd.title : todo[0] ? '– ' + todo[0].title : (dd ? dd.title : 'All clear.'), tw(11))
    }
  } else if (KIND === 'study') {
    // ── 공부 (시간 위주) ──
    const dayMins = {}
    for (const x of allSess) dayMins[x.date] = (dayMins[x.date] || 0) + (x.dur || 0)
    const ymdOff = (k) => { const d = new Date(d0); d.setDate(d.getDate() - k); return ymd(d) }
    const last7 = [6, 5, 4, 3, 2, 1, 0].map((k) => ({ d: ymdOff(k), m: dayMins[ymdOff(k)] || 0, wd: new Date(ymdOff(k) + 'T00:00').getDay() }))
    const ws = st.weekStart ?? 1, back = (d0.getDay() - ws + 7) % 7
    let week = 0; for (let k = 0; k <= back; k++) week += dayMins[ymdOff(k)] || 0
    let streak = 0; for (let k = dayMins[today] ? 0 : 1; dayMins[ymdOff(k)]; k++) streak++
    const avg = Math.round(last7.reduce((a, x) => a + x.m, 0) / 7)
    // 최근 7일 막대 (오늘은 진하게, 목표선 점선)
    const bars = (parent, width, height) => {
      const c = new DrawContext(); c.size = new Size(width, height); c.opaque = false; c.respectScreenScale = true
      const max = Math.max(goal, ...last7.map((x) => x.m)), bw = (width - 6 * 6) / 7
      const gy = height - (goal / max) * height
      c.setFillColor(new Color(dark() ? '#3a3935' : '#d9d4ca')); for (let x = 0; x < width; x += 4) c.fillRect(new Rect(x, gy, 2, 0.6))
      last7.forEach((x, i) => {
        const h = Math.max(1.5, (x.m / max) * height)
        c.setFillColor(new Color(dark() ? '#c9b489' : '#b39d74', i === 6 ? 1 : 0.35 + 0.4 * Math.min(1, x.m / goal)))
        const p = new Path(); p.addRoundedRect(new Rect(i * (bw + 6), height - h, bw, h), 2, 2); c.addPath(p); c.fillPath()
      })
      const img = parent.addImage(c.getImage()); img.imageSize = new Size(width, height)
      parent.addSpacer(3)
      const lr = parent.addStack(); lr.spacing = 6
      last7.forEach((x, i) => { const k = lr.addStack(); k.size = new Size((width - 36) / 7, 10); k.centerAlignContent(); t(k, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][x.wd], label(7), i === 6 ? GOLD : SOFT) })
    }
    const stat = (parent, k, v, color = INK) => { const c = parent.addStack(); c.layoutVertically(); t(c, k, label(7), SOFT); c.addSpacer(2); t(c, v, tw(13), color).minimumScaleFactor = 0.7 }
    const r = w.addStack(); r.centerAlignContent(); cap(r, 'STUDY'); r.addSpacer(); t(r, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (fam === 'small') {
      studyBig(w, 30, inner)
      w.addSpacer()
      const s2 = w.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, 'STREAK', streak + 'd', GOLD)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(150, 104)
      studyBig(L, 34, 150); L.addSpacer()
      const s2 = L.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, 'STREAK', streak + 'd', GOLD); s2.addSpacer()
      row.addSpacer(16); vrule(row, 104); row.addSpacer(16)
      const R = row.addStack(); R.layoutVertically()
      bars(R, inner - 183, 78); R.addSpacer()
      row.addSpacer()
    } else {
      studyBig(w, 44, inner)
      w.addSpacer(14)
      const s2 = w.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, '7-DAY AVG', hm(avg)); s2.addSpacer(); stat(s2, 'STREAK', streak + ' days', GOLD)
      w.addSpacer(14)
      bars(w, inner, 70)
      w.addSpacer(14); rule(w, inner); w.addSpacer(10)
      subBars(w, inner, 3)
    }
  } else if (KIND === 'todo') {
    // ── 할 일 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    w.addSpacer(10)
    todoList(w, fam === 'small' ? 4 : fam === 'medium' ? 5 : 10, fam === 'large' ? 8 : 4)
  } else if (KIND === 'dday') {
    // ── D-day ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    if (dd) {
      t(w, ddTxt, thin(fam === 'small' ? 40 : 52), INK)
      w.addSpacer(2)
      const r = w.addStack(); r.centerAlignContent(); t(r, dd.title, tw(fam === 'small' ? 12 : 14), GOLD); r.addSpacer(8); t(r, dd.date.slice(5).replace('-', '.'), tw(10), SOFT); r.addSpacer()
    } else t(w, 'No D-day.', tw(14), SOFT)
    if (fam !== 'small' && quote) { w.addSpacer(10); t(w, '— ' + quote, tw(12), SOFT, 2) }
    if (fam === 'large' && ddAll.length > 1) {
      w.addSpacer(16); rule(w, inner); w.addSpacer(12)
      for (const x of ddAll.filter((x) => x !== dd).slice(0, 5)) { const r = w.addStack(); r.centerAlignContent(); t(r, x.title, tw(12), INK); r.addSpacer(); t(r, ddT(x), tw(12), GOLD); w.addSpacer(8) }
    }
  } else if (KIND === 'month') {
    // ── 달력 ──
    const h = w.addStack(); h.centerAlignContent(); t(h, MON[d0.getMonth()] + ' ' + d0.getFullYear(), label(9), SOFT); h.addSpacer(); if (fam !== 'small') t(h, 'TODAY ' + hm(mins), label(8), GOLD)
    w.addSpacer(8)
    if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically()
      const G = row.addStack(); G.layoutVertically()
      const sum = monthGrid(G, 20, 3, false)
      L.size = new Size(inner - 7 * 20 - 6 * 3 - 14, 100)
      t(L, hm(sum.total), thin(28), INK); L.addSpacer(4)
      t(L, sum.days + ' DAYS', label(8), SOFT); L.addSpacer(2)
      t(L, sum.hit + ' GOAL', label(8), GOLD); L.addSpacer()
      row.addSpacer()
    } else if (fam === 'small') {
      monthGrid(w, 16, 3, false)
    } else {
      const sum = monthGrid(w, (inner - 6 * 5) / 7, 5, true)
      w.addSpacer(4)
      const r = w.addStack(); r.centerAlignContent()
      t(r, 'TOTAL ' + hm(sum.total), label(8), INK); r.addSpacer(); t(r, sum.days + ' DAYS', label(8), SOFT); r.addSpacer(); t(r, sum.hit + ' GOAL', label(8), GOLD)
    }
  } else if (KIND === 'cal') {
    // ── 캘린더: 이번 달 + 다가오는 일정 ──
    const cal = data.cal || {}
    const y = d0.getFullYear(), m = d0.getMonth(), n = new Date(y, m + 1, 0).getDate()
    const ws = st.weekStart ?? 1, lead = (new Date(y, m, 1).getDay() - ws + 7) % 7
    const key = (dd2) => y + '-' + pad(m + 1) + '-' + pad(dd2)
    const dueOn = (k) => tasksAll.filter((x) => x.due === k && !x.done)
    const rows = Math.ceil((lead + n) / 7)
    const grid = (parent, cell, cellH, gap, numSize, showWd = true) => {
      if (showWd) {
        const hdr = parent.addStack(); hdr.spacing = gap
        for (let i = 0; i < 7; i++) { const c = hdr.addStack(); c.size = new Size(cell, 10); c.centerAlignContent(); t(c, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][(i + ws) % 7], label(7), SOFT) }
        parent.addSpacer(gap)
      }
      let day = 1 - lead
      while (day <= n) {
        const row = parent.addStack(); row.spacing = gap
        for (let i = 0; i < 7; i++, day++) {
          const c = row.addStack(); c.size = new Size(cell, cellH); c.layoutVertically(); c.centerAlignContent()
          if (day < 1 || day > n) continue
          const k = key(day), evs = cal[k] || [], has = evs.length || dueOn(k).length
          // 오늘: 채우기 대신 테두리 — 틴트/투명 홈 화면에서도 숫자가 보이게
          if (k === today) { c.borderWidth = 1; c.borderColor = INK; c.cornerRadius = Math.min(cell, cellH) / 2 }
          const a = c.addStack(); a.addSpacer(); t(a, day, k === today ? F(numSize, 'SemiBold') : label(numSize), k === today || has ? INK : SOFT); a.addSpacer()
          const b = c.addStack(); b.addSpacer(); t(b, has ? '•' : ' ', label(numSize - 2), GOLD); b.addSpacer()
        }
        parent.addSpacer(gap)
      }
    }
    // 다가오는 일정·할 일 (오늘부터 14일)
    const agenda = []
    for (let i = 0; i < 14 && agenda.length < 12; i++) {
      const dt = new Date(d0); dt.setDate(dt.getDate() + i); const k = ymd(dt)
      for (const e of cal[k] || []) agenda.push({ k, dt, time: e.s == null ? 'ALL' : pad(Math.floor(e.s / 60) % 24) + ':' + pad(e.s % 60), title: e.t })
      for (const x of dueOn(k)) agenda.push({ k, dt, time: x.dueTime == null ? '–' : pad(Math.floor(x.dueTime / 60)) + ':' + pad(x.dueTime % 60), title: x.title, task: true })
    }
    const agendaList = (parent, count) => {
      let last = ''
      for (const a of agenda.slice(0, count)) {
        if (a.k !== last) { last = a.k; const h = parent.addStack(); t(h, a.k === today ? 'TODAY' : DAY[a.dt.getDay()] + ' ' + a.dt.getDate(), label(8), a.k === today ? GOLD : SOFT); h.addSpacer(); parent.addSpacer(3) }
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
        const tm = r.addStack(); tm.size = new Size(34, 0); t(tm, a.time, tw(10), SOFT); tm.addSpacer()
        t(r, a.title, tw(fam === 'large' ? 14 : 13), a.task ? SOFT : INK).minimumScaleFactor = 0.85; r.addSpacer()
        parent.addSpacer(5)
      }
      if (!agenda.length) t(parent, 'No plans.', tw(13), SOFT)
    }
    const h = w.addStack(); h.centerAlignContent(); t(h, MON[m] + ' ' + y, label(9), SOFT); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(8)
    if (fam === 'small') {
      grid(w, 16, rows > 5 ? 12 : 14, 2, 7, rows < 6)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); grid(L, 17, rows > 5 ? 14 : 16, 2, 7, false)
      row.addSpacer(14); vrule(row, 110); row.addSpacer(14)
      const R = row.addStack(); R.layoutVertically(); agendaList(R, 4); R.addSpacer()
      row.addSpacer()
    } else {
      grid(w, (inner - 6 * 4) / 7, rows > 5 ? 23 : 26, 3, 10)
      w.addSpacer(4); rule(w, inner); w.addSpacer(8)
      agendaList(w, rows > 5 ? 3 : 4)
    }
  } else if (KIND === 'quote') {
    // ── 다짐 ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    t(w, quote || '앱에서 다짐을 적어 보세요', tw(fam === 'small' ? 14 : fam === 'medium' ? 17 : 22), INK, fam === 'large' ? 8 : 4)
    w.addSpacer()
    if (dd) ddRow(w, 11)
  } else if (fam === 'small') {
    // ── 기본 ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    studyBig(w, 26, inner)
    w.addSpacer()
    ddRow(w)
  } else if (fam === 'medium') {
    const row = w.addStack()
    const L = row.addStack(); L.layoutVertically(); L.size = new Size(140, 134); L.url = link('study.records')
    t(L, dateStr, label(9), SOFT); L.addSpacer()
    studyBig(L, 28, 140)
    L.addSpacer()
    ddRow(L, 12)
    row.addSpacer(16); vrule(row, 134); row.addSpacer(16)
    const R = row.addStack(); R.layoutVertically(); R.url = link('tasks')
    cap(R, 'TODAY'); R.addSpacer(10)
    todoList(R, 4)
    R.addSpacer()
    row.addSpacer() // 줄을 위젯 폭만큼 채워 가운데로 밀리지 않게
  } else {
    const top = w.addStack(); top.centerAlignContent()
    t(top, dateStr, label(9), SOFT); top.addSpacer()
    if (dd) { t(top, dd.title + '  ', tw(10), SOFT); t(top, ddTxt, tw(13), GOLD) }
    w.addSpacer(14)
    if (quote) { t(w, '— ' + quote, tw(14), INK, 2); w.addSpacer(14) }
    rule(w, inner); w.addSpacer(12)
    const S = w.addStack(); S.layoutVertically(); S.url = link('study.records')
    cap(S, 'STUDY'); S.addSpacer(6)
    studyBig(S, 34, inner)
    S.addSpacer(7)
    const subs = S.addStack(); subs.spacing = 12
    for (const x of subMins) t(subs, x.s.name + ' ' + hm(x.m), tw(10), SOFT)
    subs.addSpacer()
    w.addSpacer(12); rule(w, inner); w.addSpacer(12)
    const T = w.addStack(); T.layoutVertically(); T.url = link('tasks')
    const h = T.addStack(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    T.addSpacer(9)
    todoList(T, 6)
  }
  if (!lock) w.addSpacer()
}

// 앱에서 실행하면 메뉴: 미리보기 · 투명 배경 · 글자색
async function transparentSetup() {
  // 스크린샷 해상도(세로 px)별 위젯 위치 — 표에 없는 기기는 비슷한 기기 비율로 추정
  const T = {
    2868: { small: 520, medium: 1113, large: 1169, left: 101, right: 694, top: 290, middle: 938, bottom: 1586 },
    2796: { small: 510, medium: 1092, large: 1146, left: 99, right: 681, top: 282, middle: 918, bottom: 1554 },
    2778: { small: 510, medium: 1092, large: 1146, left: 96, right: 678, top: 246, middle: 882, bottom: 1518 },
    2688: { small: 507, medium: 1080, large: 1137, left: 81, right: 654, top: 228, middle: 858, bottom: 1488 },
    2622: { small: 486, medium: 1041, large: 1089, left: 83, right: 638, top: 277, middle: 880, bottom: 1483 },
    2556: { small: 474, medium: 1014, large: 1062, left: 82, right: 622, top: 270, middle: 858, bottom: 1446 },
    2532: { small: 474, medium: 1014, large: 1062, left: 78, right: 618, top: 231, middle: 819, bottom: 1407 },
    2436: { small: 465, medium: 987, large: 1035, left: 69, right: 591, top: 213, middle: 783, bottom: 1353 },
    2340: { small: 436, medium: 936, large: 980, left: 72, right: 570, top: 212, middle: 756, bottom: 1300 },
    2208: { small: 471, medium: 1044, large: 1071, left: 99, right: 672, top: 114, middle: 696, bottom: 1278 },
    1792: { small: 338, medium: 720, large: 758, left: 54, right: 436, top: 160, middle: 580, bottom: 1000 },
    1334: { small: 296, medium: 642, large: 648, left: 54, right: 400, top: 60, middle: 412, bottom: 764 },
  }
  if (Device.isPad()) { const a = new Alert(); a.title = '아이패드는 지원하지 않아요'; a.message = '화면 방향마다 위치가 달라 아이폰에서만 쓸 수 있어요.'; a.addAction('확인'); await a.present(); return }
  let a = new Alert(); a.title = '투명 배경'; a.message = '1) 홈 화면 편집(아이콘 흔들림) 상태에서 맨 오른쪽 빈 페이지로 넘겨 스크린샷을 찍어 두세요.\\n2) 다음에서 그 스크린샷을 고르세요.'; a.addAction('스크린샷 고르기'); a.addCancelAction('취소')
  if (await a.present() === -1) return
  const img = await Photos.fromLibrary()
  const h = img.size.height
  let L = T[h]
  if (!L) { const k = Object.keys(T).map(Number).sort((x, y) => Math.abs(x - h) - Math.abs(y - h))[0], r = h / k; L = Object.fromEntries(Object.entries(T[k]).map(([n, v]) => [n, Math.round(v * r)])) }
  a = new Alert(); a.title = '위젯 크기'; ['소', '중', '대'].forEach((x) => a.addAction(x))
  const size = ['small', 'medium', 'large'][await a.present()]
  const pos = size === 'small' ? [['왼쪽 위', 'left', 'top'], ['오른쪽 위', 'right', 'top'], ['왼쪽 가운데', 'left', 'middle'], ['오른쪽 가운데', 'right', 'middle'], ['왼쪽 아래', 'left', 'bottom'], ['오른쪽 아래', 'right', 'bottom']]
    : size === 'medium' ? [['위', 'left', 'top'], ['가운데', 'left', 'middle'], ['아래', 'left', 'bottom']] : [['위', 'left', 'top'], ['아래', 'left', 'middle']]
  a = new Alert(); a.title = '위젯 위치'; pos.forEach((x) => a.addAction(x[0]))
  const [, hx, vy] = pos[await a.present()]
  a = new Alert(); a.title = '어떤 위젯에 쓸까요?'; a.message = '위젯 Parameter 를 적어 주세요 (예: 공부, 캘린더@2). 비우면 기본.'; a.addTextField('Parameter', ''); a.addAction('저장')
  await a.present()
  const key = a.textFieldValue(0).replace(/\\s/g, '').toLowerCase()
  const wpx = size === 'small' ? L.small : L.medium, hpx = size === 'large' ? L.large : L.small
  const c = new DrawContext(); c.size = new Size(wpx, hpx); c.drawImageAtPoint(img, new Point(-L[hx], -L[vy]))
  FM.writeImage(bgPath(size, key), c.getImage())
  a = new Alert(); a.title = '저장했어요'; a.message = '위젯이 곧 새 배경으로 바뀌어요. 글자가 잘 안 보이면 메뉴에서 글자색을 바꿔 보세요.'; a.addAction('확인'); await a.present()
}
if (config.runsInWidget) Script.setWidget(w)
else {
  const m = new Alert(); m.title = '스터디 위젯'
  ;['미리보기 · 소', '미리보기 · 중', '미리보기 · 대', '투명 배경 설정', '투명 배경 모두 지우기', '글자색 · 자동', '글자색 · 밝게', '글자색 · 어둡게'].forEach((x) => m.addAction(x)); m.addCancelAction('닫기')
  const i = await m.present()
  if (i === 0) await w.presentSmall()
  else if (i === 1) await w.presentMedium()
  else if (i === 2) await w.presentLarge()
  else if (i === 3) await transparentSetup()
  else if (i === 4) { for (const f of FM.listContents(FM.documentsDirectory())) if (f.startsWith('study-bg-')) FM.remove(FM.joinPath(FM.documentsDirectory(), f)) }
  else if (i >= 5) Keychain.set('study-ink', ['auto', 'light', 'dark'][i - 5])
}
Script.complete()
`
}
