// iPhone·iPad 홈 화면 위젯 (Scriptable) — 다이어리 감성: 종이색 배경·노트 줄·마스킹테이프·세리프
// 내용: 오늘 할 일 · 오늘 공부시간/목표 · D-day · 다짐·명언
export function buildScript({ token, gistId, appUrl }) {
  return `// 스터디 다이어리 위젯 (Scriptable) — 소·중·대 지원
// 위젯 길게 누르기 › 위젯 편집 › Script 에서 이 스크립트 선택
const TOKEN = ${JSON.stringify(token || '')}
const GIST = ${JSON.stringify(gistId || '')}
const APP = ${JSON.stringify(appUrl)}

// ── 색 (저채도 · 종이) ──
const dyn = (l, d) => Color.dynamic(new Color(l), new Color(d))
const PAPER = dyn('#f6f1e7', '#2a2621')
const LINE = dyn('#e3dccd', '#3a352e')
const INK = dyn('#3b3a36', '#e8e1d3')
const SOFT = dyn('#8f887b', '#9d968a')
const NAVY = dyn('#4a5a78', '#8a9bbd')
const OLIVE = dyn('#7a8660', '#a3ae88')
const ROSE = dyn('#c9a0a8', '#d8b3ba')
const TAPE = new Color('#c9a0a8', 0.35)

const serif = (s) => { try { return new Font('Georgia', s) } catch (e) { return Font.lightSystemFont(s) } }
const serifB = (s) => { try { return new Font('Georgia-Bold', s) } catch (e) { return Font.semiboldSystemFont(s) } }
const hand = (s) => Font.lightRoundedSystemFont(s)

const pad = (n) => String(n).padStart(2, '0')
const d0 = new Date()
const today = d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate())
const WD = ['일', '월', '화', '수', '목', '금', '토']
const alive = (o) => Object.values(o || {}).filter((r) => !r.deleted)
const dur = (m) => m < 60 ? m + '분' : Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '')

async function load() {
  const key = 'study-diary-widget'
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

// 노트 줄 배경 이미지
function paper(w, h) {
  const c = new DrawContext(); c.size = new Size(w, h); c.respectScreenScale = true
  c.setFillColor(Device.isUsingDarkAppearance() ? new Color('#2a2621') : new Color('#f6f1e7')); c.fillRect(new Rect(0, 0, w, h))
  c.setFillColor(Device.isUsingDarkAppearance() ? new Color('#3a352e') : new Color('#e6dfd0'))
  for (let y = 34; y < h; y += 22) c.fillRect(new Rect(0, y, w, 1))
  c.setFillColor(new Color('#c9a0a8', 0.35)); c.fillRect(new Rect(22, 0, 1, h)) // 여백 선
  return c.getImage()
}

// 색연필 막대 (목표 대비)
function pencilBar(ratio, w, h, color) {
  const c = new DrawContext(); c.size = new Size(w, h); c.opaque = false; c.respectScreenScale = true
  const r = h / 2
  const bg = new Path(); bg.addRoundedRect(new Rect(0, 0, w, h), r, r); c.addPath(bg); c.setFillColor(new Color('#8f887b', 0.18)); c.fillPath()
  const fw = Math.max(h, w * Math.min(1, ratio))
  const fg = new Path(); fg.addRoundedRect(new Rect(0, 0, fw, h), r, r); c.addPath(fg); c.setFillColor(color); c.fillPath()
  // 색연필 결: 얇은 사선
  c.setFillColor(new Color('#ffffff', 0.18))
  for (let x = 4; x < fw - 2; x += 6) c.fillRect(new Rect(x, 1, 1.2, h - 2))
  return c.getImage()
}

function tape(stack, text) {
  const t = stack.addStack(); t.backgroundColor = TAPE; t.cornerRadius = 2; t.setPadding(2, 8, 2, 8)
  const x = t.addText(text); x.font = hand(11); x.textColor = INK
}
function txt(stack, s, font, color, lines = 1) { const t = stack.addText(s); t.font = font; t.textColor = color; t.lineLimit = lines; return t }

const data = await load()
const fam = config.widgetFamily || 'large'
const W = { small: [170, 170], medium: [364, 170], large: [364, 382] }[fam] || [364, 382]
const w = new ListWidget()
w.backgroundImage = paper(W[0], W[1])
w.backgroundColor = PAPER
w.url = APP
w.setPadding(12, 30, 12, 14)
w.refreshAfterDate = new Date(Date.now() + 15 * 60000)

if (!data) {
  txt(w, '앱 설정에서 동기화를 연결해 주세요', serif(12), SOFT, 3)
} else {
  const st = data.settings.settings?.main || {}
  const goal = st.goalDaily || 240
  const subjects = alive(data.study.subjects)
  const sessions = alive(data.study.sessions).filter((s) => s.date === today)
  const mins = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const tasksAll = alive(data.tasks.tasks).filter((t) => !t.archived)
  const todo = tasksAll.filter((t) => !t.done && t.due && t.due <= today).sort((a, b) => (b.priority || 0) - (a.priority || 0))
  const doneToday = tasksAll.filter((t) => t.done && t.doneAt && new Date(t.doneAt).toDateString() === d0.toDateString()).length
  const dd = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))[0]
  const ddN = dd ? Math.round((new Date(dd.date) - new Date(today)) / 86400000) : null
  const quotes = Object.keys(data.settings.quotes || {}).sort().map((k) => data.settings.quotes[k]).filter((q) => !q.deleted)
  const quote = quotes.length ? quotes[Math.floor(Date.now() / 86400000) % quotes.length].text : null
  const dateLabel = (d0.getMonth() + 1) + '.' + d0.getDate() + ' ' + WD[d0.getDay()]

  const studyBlock = (parent, barW) => {
    const row = parent.addStack(); row.centerAlignContent()
    txt(row, dur(mins), serifB(fam === 'small' ? 15 : 16), INK)
    row.addSpacer(4); txt(row, '/ ' + dur(goal), serif(10), SOFT)
    parent.addSpacer(4)
    const img = parent.addImage(pencilBar(mins / goal, barW, 8, NAVY)); img.imageSize = new Size(barW, 8)
  }
  const ddBlock = (parent, big) => {
    if (!dd) { txt(parent, 'D-day 없음', serif(11), SOFT); return }
    txt(parent, dd.title, serif(big ? 11 : 10), SOFT)
    txt(parent, ddN === 0 ? 'D-DAY' : 'D-' + ddN, serifB(big ? 30 : 22), ROSE)
  }
  const todoBlock = (parent, n) => {
    for (const t of todo.slice(0, n)) {
      const r = parent.addStack(); r.centerAlignContent()
      txt(r, t.priority >= 3 ? '★' : '☐', hand(12), t.priority >= 3 ? ROSE : SOFT)
      r.addSpacer(5); txt(r, t.title, serif(12), INK)
      parent.addSpacer(fam === 'large' ? 5 : 3)
    }
    if (!todo.length) txt(parent, '오늘 할 일 끝 ✓', hand(12), OLIVE)
    else if (todo.length > n) txt(parent, '+' + (todo.length - n) + '개 더', hand(10), SOFT)
  }

  if (fam === 'small') {
    tape(w, dateLabel); w.addSpacer(6)
    ddBlock(w, true); w.addSpacer()
    studyBlock(w, 118)
  } else if (fam === 'medium') {
    const h = w.addStack(); h.topAlignContent()
    const L = h.addStack(); L.layoutVertically(); L.size = new Size(128, 0)
    tape(L, dateLabel); L.addSpacer(6); ddBlock(L, false); L.addSpacer(); studyBlock(L, 116)
    h.addSpacer(12)
    const R = h.addStack(); R.layoutVertically()
    txt(R, '오늘 할 일', serifB(11), NAVY); R.addSpacer(5)
    todoBlock(R, 4)
  } else {
    const top = w.addStack(); top.centerAlignContent()
    tape(top, dateLabel); top.addSpacer()
    if (dd) { txt(top, dd.title + ' ', serif(11), SOFT); txt(top, ddN === 0 ? 'D-DAY' : 'D-' + ddN, serifB(18), ROSE) }
    w.addSpacer(8)
    if (quote) { const q = txt(w, '“' + quote + '”', serif(13), INK, 2); w.addSpacer(10) }
    txt(w, '오늘 공부', serifB(11), NAVY); w.addSpacer(4)
    studyBlock(w, 300)
    w.addSpacer(4)
    const subs = w.addStack()
    let shown = 0
    for (const s of subjects) {
      const m = sessions.filter((x) => x.subjectId === s.id).reduce((a2, x) => a2 + x.dur, 0)
      if (!m || shown >= 4) continue
      const dot = subs.addText('● '); dot.font = Font.systemFont(8); dot.textColor = new Color(s.color)
      txt(subs, s.name + ' ' + dur(m) + '   ', hand(10), SOFT); shown++
    }
    w.addSpacer(10)
    const hdr = w.addStack(); txt(hdr, '오늘 할 일', serifB(11), NAVY); hdr.addSpacer(); txt(hdr, '완료 ' + doneToday, hand(10), OLIVE)
    w.addSpacer(5)
    todoBlock(w, 6)
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
