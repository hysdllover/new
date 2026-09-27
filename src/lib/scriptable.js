// iPhone·iPad 홈 화면 위젯: Scriptable 앱용 스크립트를 만들어 준다 (동기화 Gist 를 읽어 표시)
export function buildScript({ token, gistId, appUrl, accent = '#4a5a78' }) {
  return `// 스터디 대시보드 위젯 (Scriptable)
// 위젯 크기: 소·중·대 모두 지원. 위젯 길게 누르기 › 위젯 편집 › Script 에서 이 스크립트 선택
const TOKEN = ${JSON.stringify(token || '')}
const GIST = ${JSON.stringify(gistId || '')}
const APP = ${JSON.stringify(appUrl)}
const ACCENT = new Color(${JSON.stringify(accent)})
const BG = Color.dynamic(new Color('#f7f7f5'), new Color('#1c1f26'))
const FG = Color.dynamic(new Color('#2b2f36'), new Color('#e3e4e8'))
const MUTED = Color.dynamic(new Color('#8a8e96'), new Color('#8d93a0'))

const pad = (n) => String(n).padStart(2, '0')
const d0 = new Date()
const today = d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate())
const alive = (o) => Object.values(o || {}).filter((r) => !r.deleted)
const dur = (m) => m < 60 ? m + '분' : Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '')

async function load() {
  const cacheKey = 'study-widget-cache'
  try {
    const r = new Request('https://api.github.com/gists/' + GIST)
    r.headers = { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' }
    const g = await r.loadJSON()
    const get = async (n) => { const f = g.files[n + '.json']; if (!f) return {}; const t = f.truncated ? await new Request(f.raw_url).loadString() : f.content; return JSON.parse(t) }
    const data = { tasks: await get('tasks'), study: await get('study'), events: await get('events'), settings: await get('settings') }
    Keychain.set(cacheKey, JSON.stringify(data))
    return data
  } catch (e) {
    return Keychain.contains(cacheKey) ? JSON.parse(Keychain.get(cacheKey)) : null
  }
}

const data = await load()
const w = new ListWidget()
w.backgroundColor = BG
w.url = APP
w.setPadding(14, 14, 14, 14)
w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
const fam = config.widgetFamily || 'medium'

if (!data) {
  const t = w.addText('동기화 정보를 확인하세요'); t.font = Font.systemFont(12); t.textColor = MUTED
} else {
  const st = data.settings.settings?.main || {}
  const goal = st.goalDaily || 240
  const subjects = alive(data.study.subjects)
  const sessions = alive(data.study.sessions).filter((s) => s.date === today)
  const mins = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const todo = alive(data.tasks.tasks).filter((t) => !t.done && !t.archived && t.due && t.due <= today)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  const dd = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))[0]
  const ddN = dd ? Math.round((new Date(dd.date) - new Date(today)) / 86400000) : null

  // 공부시간 링
  function ring(size) {
    const c = new DrawContext(); c.size = new Size(size, size); c.opaque = false; c.respectScreenScale = true
    const lw = size * 0.1, r = (size - lw) / 2, cx = size / 2
    const arc = (p, color) => {
      const path = new Path(); const steps = 60
      for (let i = 0; i <= steps * p; i++) { const a = -Math.PI / 2 + (i / steps) * 2 * Math.PI; const pt = new Point(cx + r * Math.cos(a), cx + r * Math.sin(a)); i === 0 ? path.move(pt) : path.addLine(pt) }
      c.addPath(path); c.setStrokeColor(color); c.setLineWidth(lw); c.strokePath()
    }
    arc(1, new Color('#888888', 0.2)); arc(Math.min(1, mins / goal), ACCENT)
    c.setTextAlignedCenter(); c.setFont(Font.semiboldSystemFont(size * 0.2)); c.setTextColor(FG)
    c.drawTextInRect(Math.round(mins / goal * 100) + '%', new Rect(0, cx - size * 0.13, size, size * 0.3))
    return c.getImage()
  }

  if (fam === 'small') {
    const img = w.addImage(ring(120)); img.imageSize = new Size(70, 70); img.centerAlignImage()
    w.addSpacer(6)
    const t = w.addText(dur(mins)); t.font = Font.semiboldSystemFont(14); t.textColor = FG; t.centerAlignText()
    if (dd) { const x = w.addText(dd.title + ' D-' + ddN); x.font = Font.systemFont(11); x.textColor = MUTED; x.centerAlignText(); x.lineLimit = 1 }
  } else {
    const top = w.addStack(); top.centerAlignContent()
    const img = top.addImage(ring(120)); img.imageSize = new Size(52, 52)
    top.addSpacer(10)
    const col = top.addStack(); col.layoutVertically()
    const a = col.addText('오늘 공부 ' + dur(mins)); a.font = Font.semiboldSystemFont(15); a.textColor = FG
    const b = col.addText(dd ? dd.title + ' D-' + ddN : '목표 ' + dur(goal)); b.font = Font.systemFont(11); b.textColor = MUTED
    w.addSpacer(8)
    const n = fam === 'large' ? 7 : 3
    for (const t of todo.slice(0, n)) {
      const row = w.addText((t.priority >= 3 ? '★ ' : '○ ') + t.title); row.font = Font.systemFont(12); row.textColor = FG; row.lineLimit = 1
    }
    if (!todo.length) { const x = w.addText('오늘 할 일을 모두 끝냈어요'); x.font = Font.systemFont(12); x.textColor = MUTED }
    if (fam === 'large') {
      w.addSpacer(10)
      const h = w.addText('과목별'); h.font = Font.mediumSystemFont(11); h.textColor = MUTED
      for (const s of subjects) {
        const m = sessions.filter((x) => x.subjectId === s.id).reduce((a2, x) => a2 + x.dur, 0)
        if (!m) continue
        const r = w.addStack(); r.centerAlignContent()
        const dot = r.addText('● '); dot.textColor = new Color(s.color); dot.font = Font.systemFont(10)
        const nm = r.addText(s.name + '  ' + dur(m)); nm.font = Font.systemFont(12); nm.textColor = FG
      }
    }
  }
  w.addSpacer()
}

if (config.runsInWidget) Script.setWidget(w)
else if (fam === 'small') await w.presentSmall()
else if (fam === 'large') await w.presentLarge()
else await w.presentMedium()
Script.complete()
`
}
