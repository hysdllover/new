// iPhone·iPad 홈 화면·잠금 화면 위젯 (Scriptable) — 얇은 단일 서체 · 모노톤
// 유형: 위젯 편집 › Parameter 에 공부 · 할일 · 디데이 · 달력 · 다짐 (비우면 기본)
export const WIDGET_KINDS = [['', '기본'], ['공부', '공부'], ['할일', '할 일'], ['디데이', 'D-day'], ['달력', '달력'], ['다짐', '다짐']]

export function buildScript({ token, gistId, appUrl }) {
  return `// Study — 홈 화면·잠금 화면 위젯 (Scriptable)
// 위젯 길게 누르기 › 위젯 편집 › Script: 이 스크립트 · Parameter: 공부 / 할일 / 디데이 / 달력 / 다짐 (비우면 기본)
const TOKEN = ${JSON.stringify(token || '')}
const GIST = ${JSON.stringify(gistId || '')}
const APP = ${JSON.stringify(appUrl)}

const dyn = (l, d, a = 1) => Color.dynamic(new Color(l, a), new Color(d, a))
const BG = dyn('#f5f3ef', '#161616')
const INK = dyn('#2b2a28', '#ece8e1')
const SOFT = dyn('#a19c93', '#7d786f')
const GOLD = dyn('#b39d74', '#c9b489')
const RULE = dyn('#e2ded6', '#2c2b29')

// 폰트 — 한글·영문·숫자 한 서체로 통일. 기본 애플 산돌고딕 얇게, 앱 설정에서 설치한 폰트(PostScript 이름) 지정 가능
let CUSTOM = ''
const F = (s, wt = 'Light') => new Font(CUSTOM || 'AppleSDGothicNeo-' + wt, s)
const tw = (s) => F(s, 'Light')
const thin = (s) => F(s, 'Thin')
const label = (s) => F(s, 'Regular')

const PARAM = String(args.widgetParameter || '').replace(/\\s/g, '').toLowerCase()
const KIND = { '공부': 'study', '할일': 'todo', '디데이': 'dday', 'd-day': 'dday', '달력': 'month', '다짐': 'quote', study: 'study', todo: 'todo', dday: 'dday', month: 'month', quote: 'quote' }[PARAM] || 'default'
const link = (path) => APP + (path ? '?go=' + path : '')

const pad = (n) => String(n).padStart(2, '0')
const d0 = new Date()
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const today = ymd(d0)
const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const alive = (o) => Object.values(o || {}).filter((r) => !r.deleted)
const hm = (m) => Math.floor(m / 60) + ':' + pad(m % 60)

async function load() {
  const key = 'study-widget-data'
  try {
    const r = new Request('https://api.github.com/gists/' + GIST)
    r.headers = { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' }
    const g = await r.loadJSON()
    const get = async (n) => { const f = g.files[n + '.json']; if (!f) return {}; const t = f.truncated ? await new Request(f.raw_url).loadString() : f.content; return JSON.parse(t) }
    const data = { tasks: await get('tasks'), study: await get('study'), settings: await get('settings') }
    Keychain.set(key, JSON.stringify(data))
    return data
  } catch (e) {
    return Keychain.contains(key) ? JSON.parse(Keychain.get(key)) : null
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
w.url = link(KIND === 'todo' ? 'tasks' : KIND === 'default' ? '' : 'study.records')
w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
const P = fam === 'small' ? 16 : 18
if (!lock) { w.backgroundColor = BG; w.setPadding(P, P, P, P) }
const inner = fam === 'small' ? 170 - P * 2 : 364 - P * 2

if (!data) {
  t(w, lock ? '동기화 필요' : '앱에서 동기화를 연결해 주세요', tw(12), lock ? null : SOFT, 3)
} else {
  const st = data.settings.settings?.main || {}
  CUSTOM = (st.widgetFont || '').trim()
  const goal = st.goalDaily || 240
  const subjects = alive(data.study.subjects)
  const allSess = alive(data.study.sessions)
  const sessions = allSess.filter((s) => s.date === today)
  const mins = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const tasksAll = alive(data.tasks.tasks).filter((x) => !x.archived)
  const todo = tasksAll.filter((x) => !x.done && x.due && x.due <= today).sort((a, b) => (b.priority || 0) - (a.priority || 0))
  const done = tasksAll.filter((x) => x.done && x.doneAt && new Date(x.doneAt).toDateString() === d0.toDateString()).length
  const ddAll = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const ddN = (d) => Math.round((new Date(d.date) - new Date(today)) / 86400000)
  const ddT = (d) => (ddN(d) === 0 ? 'D-DAY' : 'D-' + ddN(d))
  const dd = ddAll[0]
  const ddTxt = dd ? ddT(dd) : null
  const quotes = Object.keys(data.settings.quotes || {}).sort().map((k) => data.settings.quotes[k]).filter((q) => !q.deleted)
  const quote = quotes.length ? quotes[Math.floor(Date.now() / 86400000) % quotes.length].text : null
  const dateStr = DAY[d0.getDay()] + ' · ' + d0.getDate() + ' ' + MON[d0.getMonth()]
  const pct = Math.round(Math.min(1, mins / goal) * 100)
  const subMins = subjects.map((s) => ({ s, m: sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)

  const studyBig = (parent, size, width) => {
    const r = parent.addStack(); r.bottomAlignContent()
    t(r, hm(mins), thin(size), INK)
    r.addSpacer(6); t(r, 'of ' + hm(goal), tw(size * 0.32), SOFT)
    r.addSpacer(); t(r, pct + '%', tw(size * 0.32), GOLD)
    parent.addSpacer(6)
    const img = parent.addImage(line(mins / goal, width)); img.imageSize = new Size(width, 3)
  }
  const todoList = (parent, n, gap = fam === 'large' ? 7 : 5) => {
    for (const x of todo.slice(0, n)) {
      const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
      t(r, x.priority >= 3 ? '•' : '–', tw(11), x.priority >= 3 ? GOLD : SOFT)
      t(r, x.title, tw(12), INK)
      parent.addSpacer(gap)
    }
    if (!todo.length) t(parent, 'All clear.', tw(12), SOFT)
    else if (todo.length > n) t(parent, '+ ' + (todo.length - n) + ' more', tw(10), SOFT)
  }
  const ddRow = (parent, big = 13) => { if (!dd) return; const r = parent.addStack(); r.centerAlignContent(); t(r, ddTxt, tw(big), GOLD); r.addSpacer(6); t(r, dd.title, tw(10), SOFT) }
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

  if (lock) {
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
    // ── 공부 ──
    const r = w.addStack(); r.centerAlignContent(); cap(r, 'STUDY'); r.addSpacer(); t(r, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 10 : 12)
    if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(140, 100)
      L.addSpacer(); studyBig(L, 30, 140); L.addSpacer()
      row.addSpacer(16); vrule(row, 100); row.addSpacer(16)
      const R = row.addStack(); R.layoutVertically(); subBars(R, inner - 173, 3)
    } else {
      studyBig(w, fam === 'small' ? 28 : 40, inner)
      w.addSpacer(fam === 'small' ? 10 : 18)
      subBars(w, inner, fam === 'small' ? 2 : 6)
    }
  } else if (KIND === 'todo') {
    // ── 할 일 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    w.addSpacer(10)
    todoList(w, fam === 'small' ? 4 : fam === 'medium' ? 5 : 12, fam === 'large' ? 8 : 4)
  } else if (KIND === 'dday') {
    // ── D-day ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    if (dd) {
      t(w, ddTxt, thin(fam === 'small' ? 40 : 52), INK)
      w.addSpacer(2)
      const r = w.addStack(); r.centerAlignContent(); t(r, dd.title, tw(fam === 'small' ? 12 : 14), GOLD); r.addSpacer(8); t(r, dd.date.slice(5).replace('-', '.'), tw(10), SOFT)
    } else t(w, 'No D-day.', tw(14), SOFT)
    if (fam !== 'small' && quote) { w.addSpacer(10); t(w, '— ' + quote, tw(12), SOFT, 2) }
    if (fam === 'large' && ddAll.length > 1) {
      w.addSpacer(16); rule(w, inner); w.addSpacer(12)
      for (const x of ddAll.slice(1, 6)) { const r = w.addStack(); r.centerAlignContent(); t(r, x.title, tw(12), INK); r.addSpacer(); t(r, ddT(x), tw(12), GOLD); w.addSpacer(8) }
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
      row.addSpacer(14)
    } else if (fam === 'small') {
      monthGrid(w, 16, 3, false)
    } else {
      const sum = monthGrid(w, (inner - 6 * 5) / 7, 5, true)
      w.addSpacer(4)
      const r = w.addStack(); r.centerAlignContent()
      t(r, 'TOTAL ' + hm(sum.total), label(8), INK); r.addSpacer(); t(r, sum.days + ' DAYS', label(8), SOFT); r.addSpacer(); t(r, sum.hit + ' GOAL', label(8), GOLD)
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
    const L = row.addStack(); L.layoutVertically(); L.size = new Size(128, 134); L.url = link('study.records')
    t(L, dateStr, label(9), SOFT); L.addSpacer()
    studyBig(L, 28, 128)
    L.addSpacer()
    ddRow(L, 12)
    row.addSpacer(16); vrule(row, 134); row.addSpacer(16)
    const R = row.addStack(); R.layoutVertically(); R.url = link('tasks')
    cap(R, 'TODAY'); R.addSpacer(10)
    todoList(R, 4)
    R.addSpacer()
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
    w.addSpacer(12); rule(w, inner); w.addSpacer(12)
    const T = w.addStack(); T.layoutVertically(); T.url = link('tasks')
    const h = T.addStack(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    T.addSpacer(9)
    todoList(T, 6)
  }
  if (!lock) w.addSpacer()
}

if (config.runsInWidget) Script.setWidget(w)
else if (fam === 'small') await w.presentSmall()
else if (fam === 'medium') await w.presentMedium()
else await w.presentLarge()
Script.complete()
`
}
