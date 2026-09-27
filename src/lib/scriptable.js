// iPhone·iPad 홈 화면 위젯 (Scriptable) — 얇은 단일 서체 · 모노톤 · 여백 중심의 고급 구성
// 내용: 오늘 할 일 · 오늘 공부시간/목표 · D-day · 다짐
export function buildScript({ token, gistId, appUrl }) {
  return `// Study — 홈 화면 위젯 (Scriptable) · 소·중·대
// 위젯 길게 누르기 › 위젯 편집 › Script 에서 이 스크립트 선택
const TOKEN = ${JSON.stringify(token || '')}
const GIST = ${JSON.stringify(gistId || '')}
const APP = ${JSON.stringify(appUrl)}

const dyn = (l, d) => Color.dynamic(new Color(l), new Color(d))
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

const pad = (n) => String(n).padStart(2, '0')
const d0 = new Date()
const today = d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate())
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

// 가는 진행선 (1.5pt)
function line(ratio, w) {
  const c = new DrawContext(); c.size = new Size(w, 3); c.opaque = false; c.respectScreenScale = true
  const dark = Device.isUsingDarkAppearance()
  c.setFillColor(new Color(dark ? '#2c2b29' : '#e2ded6')); c.fillRect(new Rect(0, 1, w, 1))
  c.setFillColor(new Color(dark ? '#c9b489' : '#b39d74')); c.fillRect(new Rect(0, 0.5, Math.max(2, w * Math.min(1, ratio)), 2))
  return c.getImage()
}
function rule(parent, w) { const s = parent.addStack(); s.size = new Size(w, 0.6); s.backgroundColor = RULE }
function vrule(parent, h) { const s = parent.addStack(); s.size = new Size(0.6, h); s.backgroundColor = RULE }
function t(parent, s, font, color, lines = 1, spacing) { const x = parent.addText(s); x.font = font; x.textColor = color; x.lineLimit = lines; if (spacing) x.minimumScaleFactor = spacing; return x }
function cap(parent, s) { return t(parent, s.split('').join(' '), label(8), SOFT) }

const data = await load()
const fam = config.widgetFamily || 'large'
const w = new ListWidget()
w.backgroundColor = BG
w.url = APP
w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
const P = fam === 'small' ? 16 : 18
w.setPadding(P, P, P, P)
const inner = fam === 'small' ? 170 - P * 2 : 364 - P * 2

if (!data) {
  t(w, 'Connect sync in the app', tw(12), SOFT, 3)
} else {
  const st = data.settings.settings?.main || {}
  CUSTOM = (st.widgetFont || '').trim()
  const goal = st.goalDaily || 240
  const subjects = alive(data.study.subjects)
  const sessions = alive(data.study.sessions).filter((s) => s.date === today)
  const mins = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const tasksAll = alive(data.tasks.tasks).filter((x) => !x.archived)
  const todo = tasksAll.filter((x) => !x.done && x.due && x.due <= today).sort((a, b) => (b.priority || 0) - (a.priority || 0))
  const done = tasksAll.filter((x) => x.done && x.doneAt && new Date(x.doneAt).toDateString() === d0.toDateString()).length
  const dd = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))[0]
  const ddN = dd ? Math.round((new Date(dd.date) - new Date(today)) / 86400000) : null
  const ddTxt = dd ? (ddN === 0 ? 'D-DAY' : 'D-' + ddN) : null
  const quotes = Object.keys(data.settings.quotes || {}).sort().map((k) => data.settings.quotes[k]).filter((q) => !q.deleted)
  const quote = quotes.length ? quotes[Math.floor(Date.now() / 86400000) % quotes.length].text : null
  const dateStr = DAY[d0.getDay()] + ' · ' + d0.getDate() + ' ' + MON[d0.getMonth()]
  const pct = Math.round(Math.min(1, mins / goal) * 100)

  const studyBig = (parent, size, width) => {
    const r = parent.addStack(); r.bottomAlignContent()
    t(r, hm(mins), thin(size), INK)
    r.addSpacer(6); t(r, 'of ' + hm(goal), tw(size * 0.32), SOFT)
    r.addSpacer(); t(r, pct + '%', tw(size * 0.32), GOLD)
    parent.addSpacer(6)
    const img = parent.addImage(line(mins / goal, width)); img.imageSize = new Size(width, 3)
  }
  const todoList = (parent, n) => {
    for (const x of todo.slice(0, n)) {
      const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
      t(r, x.priority >= 3 ? '•' : '–', tw(11), x.priority >= 3 ? GOLD : SOFT)
      t(r, x.title, tw(12), INK)
      parent.addSpacer(fam === 'large' ? 7 : 5)
    }
    if (!todo.length) t(parent, 'All clear.', tw(12), SOFT)
    else if (todo.length > n) t(parent, '+ ' + (todo.length - n) + ' more', tw(10), SOFT)
  }

  if (fam === 'small') {
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    studyBig(w, 26, inner)
    w.addSpacer()
    if (dd) { const r = w.addStack(); r.centerAlignContent(); t(r, ddTxt, tw(13), GOLD); r.addSpacer(6); t(r, dd.title, tw(10), SOFT) }
  } else if (fam === 'medium') {
    const row = w.addStack()
    const L = row.addStack(); L.layoutVertically(); L.size = new Size(128, 134)
    t(L, dateStr, label(9), SOFT); L.addSpacer()
    studyBig(L, 28, 128)
    L.addSpacer()
    if (dd) { const r = L.addStack(); r.centerAlignContent(); t(r, ddTxt, tw(12), GOLD); r.addSpacer(5); t(r, dd.title, tw(10), SOFT) }
    row.addSpacer(16); vrule(row, 134); row.addSpacer(16)
    const R = row.addStack(); R.layoutVertically()
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
    cap(w, 'STUDY'); w.addSpacer(6)
    studyBig(w, 34, inner)
    w.addSpacer(7)
    const subs = w.addStack(); subs.spacing = 12
    for (const s of subjects) {
      const m = sessions.filter((x) => x.subjectId === s.id).reduce((a2, x) => a2 + x.dur, 0)
      if (m) t(subs, s.name + ' ' + hm(m), tw(10), SOFT)
    }
    w.addSpacer(12); rule(w, inner); w.addSpacer(12)
    const h = w.addStack(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    w.addSpacer(9)
    todoList(w, 6)
  }
  w.addSpacer()
}

if (config.runsInWidget) Script.setWidget(w)
else if (fam === 'small') await w.presentSmall()
else if (fam === 'medium') await w.presentMedium()
else await w.presentLarge()
Script.complete()
`
}
