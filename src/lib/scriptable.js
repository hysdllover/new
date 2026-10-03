import { pickQuote } from './quote.js'
// iPhone·iPad 홈 화면·잠금 화면 위젯 (Scriptable) — 얇은 단일 서체 · 모노톤
// 유형: 위젯 편집 › Parameter 에 공부 · 할일 · 디데이 · 달력 · 다짐 (비우면 기본)
export const WIDGET_KINDS = [['', '기본'], ['공부', '공부'], ['할일', '할 일'], ['디데이', 'D-day'], ['달력', '공부 달력'], ['캘린더', '캘린더'], ['다짐', '다짐'], ['시간표', '시간표'], ['주간', '주간 공부'], ['과목', '과목별'], ['지금', '지금·다음'], ['진도', '진도'], ['목표', '이번 주 목표'], ['오늘', '오늘 한눈에'], ['대시보드', '대시보드'], ['내일', '내일 준비'], ['마감', '마감 임박'], ['일주일', '7일 일정'], ['디데이목록', 'D-day 목록'], ['바로가기', '바로 시작']]

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
let CUSTOM = '', SCALE = 1, WSHIFT = 0
// 앱 설정의 위젯 글자 크기(SCALE)·굵기(WSHIFT: -1 얇게 · 0 기본 · 1 보통 · 2 진하게)
const WTS = ['UltraLight', 'Thin', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold']
const F = (s, wt = 'Light') => new Font(CUSTOM || 'AppleSDGothicNeo-' + WTS[Math.max(0, Math.min(6, WTS.indexOf(wt) + WSHIFT))], Math.round(s * SCALE * 2) / 2)
const tw = (s) => F(s, 'Light')
const thin = (s) => F(s, 'Thin')
const label = (s) => F(s, 'Regular')

const RAWP = String(args.widgetParameter || '').replace(/\\s/g, '').toLowerCase()
const PARAM = RAWP.split('@')[0] // "공부@2" 처럼 @ 뒤는 배경 구분용
// 디데이2, 디데이3 … → 두 번째·세 번째 D-day
const DDI = Math.max(0, (+(PARAM.match(/(\\d)$/) || [])[1] || 1) - 1)
const KIND = { '공부': 'study', '할일': 'todo', '디데이': 'dday', 'd-day': 'dday', '달력': 'month', '캘린더': 'cal', '일정': 'cal', calendar: 'cal', '다짐': 'quote', '시간표': 'class', '수업': 'class', class: 'class', '주간': 'week', week: 'week', '과목': 'subj', subj: 'subj', '지금': 'now', '다음': 'now', now: 'now', '진도': 'prog', prog: 'prog', '목표': 'goals', goals: 'goals', '오늘': 'today', today: 'today', '대시보드': 'dash', dash: 'dash', '내일': 'tmrw', tomorrow: 'tmrw', '마감': 'due', due: 'due', '일주일': 'week7', '7일': 'week7', week7: 'week7', '디데이목록': 'ddl', ddl: 'ddl', '바로가기': 'quick', '시작': 'quick', quick: 'quick', study: 'study', todo: 'todo', dday: 'dday', month: 'month', quote: 'quote' }[PARAM.replace(/\\d$/, '')] || 'default'
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
// 캐시는 파일로 (잠금 화면 위젯은 메모리·시간 한도가 작아 Keychain 대용량 저장을 피함)
const CFM = FileManager.local()
const cachePath = CFM.joinPath(CFM.documentsDirectory(), 'study-widget-cache.json')
// 최신 데이터 받기: GitHub API(캐시 없이 바로 최신, 시간당 60회) → 안 되면 raw 주소(최대 몇 분 캐시)
async function fetchFresh(timeout) {
  const m = SRC.match(/gist\\.githubusercontent\\.com\\/[^/]+\\/(\\w+)\\//)
  if (m) {
    try {
      const r = new Request('https://api.github.com/gists/' + m[1]); r.headers = { Accept: 'application/vnd.github+json' }; r.timeoutInterval = timeout
      const g = await r.loadJSON()
      const f = g && g.files && g.files['widget.json']
      if (f && f.content && !f.truncated) return JSON.parse(f.content)
      if (f && f.raw_url) { const r2 = new Request(f.raw_url); r2.timeoutInterval = timeout; return JSON.parse(await r2.loadString()) }
    } catch (e) {}
  }
  const r = new Request(SRC + '?t=' + Date.now()); r.headers = { 'Cache-Control': 'no-cache' }; r.timeoutInterval = timeout
  return JSON.parse(await r.loadString())
}
async function load() {
  const key = 'study-widget-data'
  const LOCK0 = String(config.widgetFamily || '').startsWith('accessory')
  try {
    if (!SRC) throw new Error('no source')
    // 여러 위젯이 한꺼번에 새로 그려질 때: 25초 안에 받아 둔 게 있으면 그대로 (요청 절약)
    try { if (CFM.fileExists(cachePath)) { const c = JSON.parse(CFM.readString(cachePath)); if (c.at && Date.now() - c.at < 25000) return c } } catch (e0) {}
    const data = await fetchFresh(LOCK0 ? 6 : 15)
    if (!data || !data.study) throw new Error('bad data')
    data.at = Date.now()
    try { CFM.writeString(cachePath, JSON.stringify(data)) } catch (e) {}
    return data
  } catch (e) {
    try {
      if (CFM.fileExists(cachePath)) { const d = JSON.parse(CFM.readString(cachePath)); STALE = d.at ? new Date(d.at) : new Date(0); return d }
      if (Keychain.contains(key)) { // 예전 캐시 → 파일로 옮김
        const d = JSON.parse(Keychain.get(key)); STALE = d.at ? new Date(d.at) : new Date(0)
        try { CFM.writeString(cachePath, JSON.stringify(d)); Keychain.remove(key) } catch (e2) {}
        return d
      }
    } catch (e3) {}
    return null
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
function rule(parent, w) { const s = parent.addStack(); s.size = new Size(w, 0.6); s.backgroundColor = RULE }
function vrule(parent, h) { const s = parent.addStack(); s.size = new Size(0.6, h); s.backgroundColor = RULE }
function t(parent, s, font, color, lines = 1) { const x = parent.addText(String(s)); x.font = font; if (color) x.textColor = color; x.lineLimit = lines; return x }
function cap(parent, s) { return t(parent, s.split('').join(' '), label(8), SOFT) }

const data = await load()
// 투명 배경 파일
const FM = FileManager.local()
const bgPath = (f, p) => FM.joinPath(FM.documentsDirectory(), 'study-bg-' + f + '-' + (p || 'default') + '.jpg')
// 잠금 화면 진행선: 이미지 대신 색 채운 스택 두 겹 (가볍고 확실히 그려짐)
function lbar(parent, ratio, wd, h = 2) {
  const o = parent.addStack(); o.size = new Size(wd, h); o.cornerRadius = h / 2; o.backgroundColor = new Color('#ffffff', 0.3)
  const k = Math.max(0, Math.min(1, ratio || 0))
  if (k > 0) { const i = o.addStack(); i.size = new Size(Math.max(h, Math.round(wd * k)), h); i.cornerRadius = h / 2; i.backgroundColor = new Color('#ffffff') }
  o.addSpacer()
  return o
}
// 잠금 화면 위젯 실제 크기(pt) — 화면 폭별 (원형 c · 직사각형 rw×rh)
const LK = (() => {
  if (Device.isPad()) return { c: 72, rw: 160, rh: 72 }
  const sc = Device.screenSize(), sw = Math.min(sc.width, sc.height)
  return sw >= 428 ? { c: 76, rw: 172, rh: 76 } : sw >= 390 ? { c: 72, rw: 160, rh: 72 } : { c: 68, rw: 157, rh: 67 }
})()
const cline = (z, ratio, wd = Math.round(LK.c * 0.5)) => { z.addSpacer(4); const a = z.addStack(); a.addSpacer(); lbar(a, ratio, wd); a.addSpacer() }

function build(fam) {
const lock = fam.startsWith('accessory')
let w = new ListWidget()
// 한 줄(시계 위) 위젯: iOS 가 텍스트 하나만 시스템 서체로 그림 → 서체·색 지정 없이 짧게 하나만
const inline = (s) => { s = String(s); const x = w.addText(s.length > 26 ? s.slice(0, 25) + '…' : s); x.lineLimit = 1; return x }
w.url = link({ todo: 'tasks', due: 'tasks', cal: 'planner.month', week7: 'planner.week', tmrw: 'planner.week', class: 'planner.timetable', default: '', dash: '', quick: 'study.timer', ddl: 'study.progress', prog: 'study.progress' }[KIND] ?? 'study.records')
w.refreshAfterDate = new Date(Date.now() + 5 * 60000) // 5분 뒤 다시 그려 달라고 요청 (실제 시점은 iOS 가 정함)
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
const inkMode = Keychain.contains('study-ink') ? Keychain.get('study-ink') : 'auto'
if (inkMode === 'light') { INK = new Color('#ffffff'); SOFT = new Color('#ffffff', 0.72); RULE = new Color('#ffffff', 0.3) }
if (inkMode === 'dark') { INK = new Color('#1d1c1a'); SOFT = new Color('#1d1c1a', 0.6); RULE = new Color('#1d1c1a', 0.2) }
if (!lock) {
  w.setPadding(P, P, P, P)
  if (FM.fileExists(bgPath(fam, RAWP))) w.backgroundImage = FM.readImage(bgPath(fam, RAWP))
  else w.backgroundColor = BG
}

if (!data) {
  if (fam === 'accessoryInline') inline('동기화 필요')
  else t(w, lock ? '동기화 필요' : '앱에서 동기화를 연결하고 스크립트를 다시 복사해 주세요', tw(12), lock ? null : SOFT, 3)
} else try {
  const st = data.settings.settings?.main || {}
  CUSTOM = (st.widgetFont || '').trim()
  SCALE = Math.max(0.8, Math.min(1.3, +st.widgetScale || 1)); if (lock) SCALE = Math.min(1.25, SCALE * 1.18) // 잠금 화면은 꽉 차게 (기본 1.18배)
  WSHIFT = +st.widgetWeight || 0
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
  let strikeImg = null // 필요할 때만 그림 (잠금 화면에선 안 그림)
  const strikeImage = () => strikeImg || (strikeImg = (() => {
    const c = new DrawContext(); c.size = new Size(240, 24); c.opaque = false; c.respectScreenScale = true
    c.setFillColor(new Color(dark() ? '#7d786f' : '#a19c93')); c.fillRect(new Rect(0, 11.6, 240, 1.2))
    return c.getImage()
  })())
  const strike = (parent, s, font) => { const k = parent.addStack(); k.backgroundImage = strikeImage(); t(k, s, font, SOFT).minimumScaleFactor = 0.85; return k }
  const ddAll = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const ddN = (d) => Math.round((new Date(d.date) - new Date(today)) / 86400000)
  const ddT = (d) => (ddN(d) === 0 ? 'D-DAY' : 'D-' + ddN(d))
  const dd = ddAll[KIND === 'dday' ? DDI : 0]
  const ddTxt = dd ? ddT(dd) : null
  const quotes = Object.keys(data.settings.quotes || {}).sort().map((k) => data.settings.quotes[k]).filter((q) => !q.deleted)
  const quote = pickQuote(quotes)?.text ?? null // 3시간마다 무작위 (앱과 같은 문구)
  const dateStr = DAY[d0.getDay()] + ' · ' + d0.getDate() + ' ' + MON[d0.getMonth()] + (STALE ? ' · ' + pad(STALE.getHours()) + ':' + pad(STALE.getMinutes()) : '')
  const pct = Math.round(Math.min(1, mins / goal) * 100)
  // 진행 중 타이머 (앱에서 시작·정지할 때 올라옴) — 끝났거나 오래된 건 무시
  const TM = (() => {
    const x = data.timer
    if (!x) return null
    if (x.end && x.end < Date.now()) return null
    if (x.start && Date.now() - x.start > 12 * 3600000) return null
    // 일시정지 때 보여 줄 분: 스톱워치는 흐른 시간, 타이머는 남은 시간
    x.pm = Math.round(Math.max(0, x.mode === 'countdown' && x.target ? x.target - x.acc : x.acc) / 60000)
    return x
  })()
  if (TM) w.refreshAfterDate = new Date(Math.min(w.refreshAfterDate.getTime(), Date.now() + 3 * 60000)) // 타이머 중엔 더 자주
  // 위젯이 다시 그려지지 않아도 초 단위로 흐르는 시간
  const timerDate = (parent, size, thinFont) => { const d = parent.addDate(new Date(TM.mode === 'countdown' ? TM.end : TM.start)); d.applyTimerStyle(); d.font = thinFont ? thin(size) : tw(size); d.lineLimit = 1; d.minimumScaleFactor = 0.6; return d }
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
    // 하나만 넘치면 '+1 more' 줄 대신 그 할 일을 보여 줌 (같은 한 줄)
    if (items.length === n + 1) { n++; gap = Math.max(3, gap - 1) }
    for (const x of items.slice(0, n)) {
      const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
      if (x.id) r.url = APP + '?done=' + encodeURIComponent(x.id) // 누르면 앱에서 완료 확인 (중·대 위젯)
      if (x.done) { t(r, '✓', tw(TS - 2), SOFT); strike(r, x.title, tw(TS)) }
      else { const imp = x.priority >= 3; t(r, imp ? '•' : '–', tw(TS - 1), imp ? GOLD : SOFT); t(r, x.title, imp ? F(TS, 'Medium') : tw(TS), INK).minimumScaleFactor = 0.85 } // 중요는 진하게
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

  // 오늘 수업 (시간표) — 앱이 앞으로 8일치를 올림
  const CL = (data.classes && data.classes[today]) || []
  const nm = new Date().getHours() * 60 + new Date().getMinutes()
  const clCur = CL.find((c) => c.start <= nm && c.end > nm), clNext = CL.find((c) => c.start > nm)
  const clk = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60)
  if (CL.length) {
    const nx = clCur || clNext // 다음 교시 시작·끝에 맞춰 다시 그리기
    if (nx) { const at = new Date(d0); at.setHours(0, (clCur ? clCur.end : nx.start), 0, 0); if (at > new Date()) w.refreshAfterDate = new Date(Math.min(w.refreshAfterDate.getTime(), at.getTime())) }
  }

  // ── 새 유형 공용 데이터 ──
  const DM = {}; for (const s of allSess) DM[s.date] = (DM[s.date] || 0) + (s.dur || 0)
  const yOff = (k) => { const x = new Date(d0); x.setDate(x.getDate() - k); return ymd(x) }
  const wBack = (d0.getDay() - (st.weekStart ?? 1) + 7) % 7
  const week7 = [6, 5, 4, 3, 2, 1, 0].map((k) => ({ d: yOff(k), m: DM[yOff(k)] || 0, wd: new Date(yOff(k) + 'T00:00').getDay() }))
  let weekTot = 0, lastWeek = 0
  for (let k = 0; k <= wBack; k++) { weekTot += DM[yOff(k)] || 0; lastWeek += DM[yOff(k + 7)] || 0 }
  const weekAvg = Math.round(weekTot / (wBack + 1))
  const wFrom = yOff(wBack)
  const weekSub = subjects.map((s) => ({ s, m: allSess.filter((x) => x.subjectId === s.id && x.date >= wFrom).reduce((a, x) => a + (x.dur || 0), 0), today: sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)
  const PROG = data.prog || [], GOALS = data.goals || []
  const goalsDone = GOALS.filter((g) => g.done).length
  // 오늘 일정 + 수업 (지금·다음)
  const tmr = ymd(new Date(d0.getTime() + 86400000))
  const evItems = (k) => (data.cal && data.cal[k] || []).filter((e) => e.s != null).map((e) => ({ t: e.t, s: e.s, e: e.e != null ? e.e : e.s + 60, c: e.c, l: e.l }))
  const NOW = [...evItems(today), ...CL.map((c) => ({ t: c.period + '교시 ' + c.title, s: c.start, e: c.end, l: c.room }))].sort((a, b) => a.s - b.s)
  const nCur = NOW.find((x) => x.s <= nm && x.e > nm), nNext = NOW.find((x) => x.s > nm)
  const nTmr = !nCur && !nNext ? evItems(tmr)[0] : null
  const atMin = (m, k = today) => { const x = new Date(k + 'T00:00'); x.setMinutes(m); return x }
  if (KIND === 'now') { const b = nCur ? nCur.e : nNext ? nNext.s : null; if (b != null) { const at = atMin(b); if (at > new Date()) w.refreshAfterDate = new Date(Math.min(w.refreshAfterDate.getTime(), at.getTime())) } }
  const timerTo = (parent, m, f, k) => { const d = parent.addDate(atMin(m, k)); d.applyTimerStyle(); d.font = f; d.lineLimit = 1; d.minimumScaleFactor = 0.6; return d }
  // 막대 7개 (이미지 없이 스택)
  const bars7 = (parent, wd, h, fg, bg) => {
    const mx = Math.max(goal, ...week7.map((x) => x.m)), gap = 4, bw = Math.floor((wd - gap * 6) / 7)
    const row = parent.addStack(); row.size = new Size(wd, h); row.bottomAlignContent(); row.spacing = gap
    week7.forEach((x, i) => { const b = row.addStack(); b.size = new Size(bw, Math.max(2, Math.round((x.m / mx) * h))); b.cornerRadius = Math.min(3, bw / 3); b.backgroundColor = x.m ? (i === 6 ? fg : dyn('#b39d74', '#c9b489', 0.5)) : bg })
    return row
  }
  const wdRow = (parent, wd, size = 7) => { const gap = 4, bw = Math.floor((wd - gap * 6) / 7); const r = parent.addStack(); r.spacing = gap; week7.forEach((x, i) => { const c = r.addStack(); c.size = new Size(bw, 10); c.centerAlignContent(); t(c, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][x.wd], label(size), i === 6 ? GOLD : SOFT) }) }
  const pbar = (parent, r, wd, c) => { const img = parent.addImage(line(r, wd, c ? c : null)); img.imageSize = new Size(wd, 3) }
  // ── 내일 · 마감 · 7일 일정 · 바로 시작 공용 ──
  const dOff = (k) => { const x = new Date(d0); x.setDate(x.getDate() + k); return ymd(x) }
  const evDay = (k) => ((data.cal && data.cal[k]) || []).slice().sort((a, b) => (a.s ?? -1) - (b.s ?? -1))
  const TMR = { ev: evDay(tmr), cl: (data.classes && data.classes[tmr]) || [], tk: tasksAll.filter((x) => !x.done && x.due === tmr).sort(byDate) }
  const tmrN = TMR.ev.length + TMR.tk.length
  const dueIn = (x) => Math.round((new Date(x.due + 'T00:00') - new Date(today + 'T00:00')) / 86400000)
  const DUE = tasksAll.filter((x) => !x.done && x.due && x.due <= dOff(14)).sort(byDate)
  const dueTxt = (x) => { const n = dueIn(x); return n < 0 ? -n + '일 지남' : n === 0 ? '오늘' : n === 1 ? '내일' : 'D-' + n }
  const DAYS7 = [0, 1, 2, 3, 4, 5, 6].map((i) => { const x = new Date(d0); x.setDate(x.getDate() + i); const k = ymd(x); return { i, x, k, ev: evDay(k).filter((e) => !(i === 0 && e.s != null && (e.e != null ? e.e : e.s + 60) <= nm)) } })
  const ev7 = DAYS7.reduce((a, d) => a + d.ev.length, 0)
  const nextEv7 = (() => { for (const d of DAYS7) if (d.ev[0]) return { d, e: d.ev[0] }; return null })()
  const dayName = (d) => (d.i === 0 ? 'TODAY' : d.i === 1 ? 'TMRW' : DAY[d.x.getDay()])
  // 바로 시작: 최근 공부한 과목 먼저
  const recent = allSess.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0))
  const QS = []
  for (const x of recent) { const s = subjects.find((y) => y.id === x.subjectId); if (s && !QS.includes(s)) QS.push(s); if (QS.length >= 8) break }
  for (const s of subjects) if (QS.length < 8 && !QS.includes(s)) QS.push(s)
  const startUrl = (s) => APP + '?timer=' + encodeURIComponent(s ? s.id : '')
  const newUrl = (k) => APP + '?new=' + k

  if (lock && KIND === 'class') {
    // ── 잠금 화면 · 시간표 ──
    const c = clCur || clNext
    if (fam === 'accessoryInline') {
      inline(c ? (clCur ? c.period + '교시 ' + c.title + ' ~' + clk(c.end) : '다음 ' + c.period + '교시 ' + c.title + ' ' + clk(c.start)) : CL.length ? '오늘 수업 끝' : '오늘 수업 없음')
    } else if (fam === 'accessoryCircular') {
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const row = (s, f) => { const a = z.addStack(); a.addSpacer(); t(a, s, f).minimumScaleFactor = 0.6; a.addSpacer() }
      if (c) { row(c.period + '교시', label(8)); row(c.title, tw(13)); row(clCur ? '~' + clk(c.end) : clk(c.start), label(8)) }
      else row(CL.length ? '끝' : '—', tw(14))
    } else {
      const r = w.addStack(); r.centerAlignContent(); t(r, clCur ? '지금 ' + clCur.period + '교시' : clNext ? '다음 ' + clNext.period + '교시' : '시간표', label(8)); r.addSpacer(); if (c) t(r, clk(c.start) + '–' + clk(c.end), label(8))
      w.addSpacer(1)
      t(w, c ? c.title : CL.length ? '오늘 수업 끝' : '오늘 수업 없음', thin(22)).minimumScaleFactor = 0.6
      w.addSpacer(1)
      const after = c ? CL.filter((x) => x.start > c.start).slice(0, 3).map((x) => x.title).join(' · ') : ''
      t(w, c && c.room ? c.room + (after ? ' · ' + after : '') : after || ' ', tw(10))
    }
  } else if (lock && KIND === 'dday') {
    // ── 잠금 화면 · D-day 만 ──
    const next = ddAll[DDI + 1]
    if (!dd) inline('No D-day')
    else if (fam === 'accessoryInline') {
      inline(ddTxt + ' ' + dd.title)
    } else if (fam === 'accessoryCircular') {
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, ddN(dd) === 0 ? 'D-DAY' : ddN(dd), thin(ddN(dd) === 0 ? 14 : 24)).minimumScaleFactor = 0.5; a.addSpacer()
      const b = z.addStack(); b.addSpacer(); t(b, dd.title, label(8)).minimumScaleFactor = 0.6; b.addSpacer()
    } else {
      const r = w.addStack(); r.bottomAlignContent()
      t(r, ddTxt, thin(26)).minimumScaleFactor = 0.6; r.addSpacer()
      w.addSpacer(2)
      const r2 = w.addStack(); t(r2, dd.title, tw(12)); r2.addSpacer(6); t(r2, dd.date.slice(5).replace('-', '.'), tw(10)); r2.addSpacer()
      if (next) { w.addSpacer(2); const r3 = w.addStack(); t(r3, next.title + ' ' + ddT(next), tw(10)).textOpacity = 0.7; r3.addSpacer() }
    }
  } else if (lock && TM && (KIND === 'default' || KIND === 'study' || KIND === 'quick')) {
    // ── 잠금 화면 · 진행 중 타이머 (초 단위로 흐름) ──
    if (fam === 'accessoryInline') {
      if (TM.paused) inline('일시정지 ' + TM.name + ' ' + hm(TM.pm)); else { const d = w.addDate(new Date(TM.mode === 'countdown' ? TM.end : TM.start)); d.applyTimerStyle(); d.lineLimit = 1 }
    } else if (fam === 'accessoryCircular') {
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, TM.name, label(8)).minimumScaleFactor = 0.6; a.addSpacer()
      const b = z.addStack(); b.addSpacer(); if (TM.paused) t(b, hm(TM.pm), tw(13)); else timerDate(b, 12); b.addSpacer()
      const c = z.addStack(); c.addSpacer(); t(c, TM.paused ? '일시정지' : TM.mode === 'countdown' ? '남음' : '공부 중', label(7)); c.addSpacer()
    } else {
      const r = w.addStack(); r.centerAlignContent(); t(r, '● ' + TM.name, tw(11)); r.addSpacer(); t(r, TM.paused ? '일시정지' : TM.mode === 'countdown' ? '타이머' : '공부 중', label(8))
      w.addSpacer(1)
      const r2 = w.addStack(); if (TM.paused) t(r2, hm(TM.pm), thin(26)); else timerDate(r2, 26, true); r2.addSpacer()
      w.addSpacer(1)
      t(w, '오늘 ' + hm(mins) + ' / ' + hm(goal), tw(10))
    }
  } else if (lock && KIND !== 'default') {
    // ── 잠금 화면 · 유형별 (글자·스택만, 이미지 없음) ──
    const inl = fam === 'accessoryInline', circ = fam === 'accessoryCircular'
    const cRows = (rows, ratio) => { // 원형: 가운데 정렬 줄들 (+ 진행선)
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      for (const [s, f] of rows) { const a = z.addStack(); a.addSpacer(); const x = t(a, s, f); x.minimumScaleFactor = 0.5; a.addSpacer() }
      if (ratio != null) cline(z, ratio)
    }
    const rRow = (l, r, lf = tw(11), rf = label(8)) => { const a = w.addStack(); a.centerAlignContent(); t(a, l, lf).minimumScaleFactor = 0.7; a.addSpacer(); if (r) { a.addSpacer(4); t(a, r, rf) } return a } // 오른쪽 값은 오른쪽 끝에
    const dayMins = {}
    for (const x of allSess) dayMins[x.date] = (dayMins[x.date] || 0) + (x.dur || 0)
    const ymdOff = (k) => { const d = new Date(d0); d.setDate(d.getDate() - k); return ymd(d) }
    if (KIND === 'study') {
      const ws = st.weekStart ?? 1, back = (d0.getDay() - ws + 7) % 7
      let week = 0; for (let k = 0; k <= back; k++) week += dayMins[ymdOff(k)] || 0
      const yday = dayMins[ymdOff(1)] || 0
      if (inl) inline('공부 ' + hm(mins) + ' / ' + hm(goal) + ' · ' + pct + '%')
      else if (circ) cRows([[hm(mins), tw(14)], [pct + '%', label(8)]], mins / goal)
      else {
        const r = w.addStack(); r.bottomAlignContent(); t(r, hm(mins), thin(22)); r.addSpacer(4); t(r, '/ ' + hm(goal), tw(10)); r.addSpacer(); t(r, pct + '%', tw(11))
        w.addSpacer(3); lbar(w, mins / goal, LK.rw); w.addSpacer(4)
        rRow('이번 주 ' + hm(week), '어제 ' + hm(yday), tw(10), tw(10))
      }
    } else if (KIND === 'todo') {
      const left = items.filter((x) => !x.done)
      if (inl) inline(left.length ? '할 일 ' + left.length + '개 · ' + left[0].title : '오늘 할 일 끝')
      else if (circ) cRows([[String(left.length), thin(24)], ['할 일', label(7)], [done + '/' + (done + left.length), label(7)]])
      else {
        rRow('T O D A Y', done + '/' + items.length, label(7), label(7))
        for (const x of items.slice(0, 3)) { const a = w.addStack(); a.centerAlignContent(); const imp = !x.done && x.priority >= 3; const s1 = t(a, (x.done ? '✓ ' : imp ? '• ' : '– ') + x.title, imp ? F(11, 'Medium') : tw(11)); s1.minimumScaleFactor = 0.8; if (x.done) s1.textOpacity = 0.45; a.addSpacer() }
        if (!items.length) t(w, 'All clear.', tw(11))
        else if (items.length > 3) t(w, '+ ' + (items.length - 3) + ' more', label(7)).textOpacity = 0.7
      }
    } else if (KIND === 'month') {
      const pre = d0.getFullYear() + '-' + pad(d0.getMonth() + 1)
      const mv = Object.entries(dayMins).filter(([k]) => k.startsWith(pre)).map(([, v]) => v)
      const total = mv.reduce((a, v) => a + v, 0), days = mv.filter(Boolean).length, hit = mv.filter((v) => v >= goal).length
      const L7 = [6, 5, 4, 3, 2, 1, 0].map((k) => dayMins[ymdOff(k)] || 0)
      const mx = Math.max(goal, ...L7)
      if (inl) inline(MON[d0.getMonth()] + ' ' + hm(total) + ' · ' + days + '일')
      else if (circ) cRows([[String(days), thin(22)], ['DAYS', label(7)]], days / new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate())
      else {
        rRow(MON[d0.getMonth()] + ' · ' + hm(total), days + '일 · 달성 ' + hit, tw(12), label(8))
        w.addSpacer(2)
        // 최근 7일 막대 (오늘은 진하게)
        const sp = w.addStack(); sp.size = new Size(LK.rw, 20); sp.bottomAlignContent(); sp.spacing = 5
        L7.forEach((v, k) => { const b = sp.addStack(); b.size = new Size(Math.floor((LK.rw - 30) / 7), Math.max(2, Math.round((v / mx) * 20))); b.cornerRadius = 1; b.backgroundColor = new Color('#ffffff', !v ? 0.25 : k === 6 ? 1 : 0.6) })
        w.addSpacer(2)
        rRow('최근 7일', '평균 ' + hm(Math.round(L7.reduce((a, v) => a + v, 0) / 7)), label(7), label(7))
      }
    } else if (KIND === 'cal') {
      const cal = data.cal || {}
      const ag = []
      for (let i = 0; i < 14 && ag.length < 6; i++) {
        const dt = new Date(d0); dt.setDate(dt.getDate() + i); const k = ymd(dt)
        for (const e of cal[k] || []) if (!(i === 0 && e.s != null && (e.e ?? e.s + 60) <= nm)) ag.push({ i, s: e.s, title: e.t })
      }
      ag.sort((a, b) => a.i - b.i || (a.s ?? -1) - (b.s ?? -1))
      const when = (a) => (a.i === 0 && a.s == null ? '오늘' : (a.i === 0 ? '' : a.i === 1 ? '내일 ' : DAY[(d0.getDay() + a.i) % 7] + ' ') + (a.s == null ? '종일' : clk(a.s % 1440)))
      const nx = ag.find((a) => a.i > 0 || a.s == null || a.s >= nm) || ag[0]
      if (nx && nx.i === 0 && nx.s != null && nx.s > nm) { const at = new Date(d0); at.setHours(0, nx.s, 0, 0); w.refreshAfterDate = new Date(Math.min(w.refreshAfterDate.getTime(), at.getTime())) }
      if (inl) inline(nx ? (nx.i === 0 && nx.s == null ? '' : '다음 ') + when(nx) + ' ' + nx.title : '다가오는 일정 없음')
      else if (circ) cRows(nx ? [[nx.s == null ? '종일' : clk(nx.s % 1440), tw(13)], [nx.title, label(8)], [nx.i ? (nx.i === 1 ? '내일' : DAY[(d0.getDay() + nx.i) % 7]) : 'TODAY', label(6)]] : [['—', tw(14)]])
      else {
        for (const a of ag.slice(0, 3)) rRow(a.title, when(a), tw(11), label(8))
        if (!ag.length) t(w, '다가오는 일정 없음', tw(11))
      }
    } else if (KIND === 'quote') {
      const q = quote || '앱에서 다짐을 적어 보세요'
      if (inl) inline(q)
      else if (circ) { w.addAccessoryWidgetBackground = true; const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.setPadding(4, 4, 4, 4); z.centerAlignContent(); const x = t(z, q, tw(9), null, 4); x.centerAlignText(); x.minimumScaleFactor = 0.5 }
      else t(w, q, tw(12), null, 3).minimumScaleFactor = 0.7
    } else if (KIND === 'week') {
      if (inl) inline('이번 주 ' + hm(weekTot) + ' · 하루 ' + hm(weekAvg))
      else if (circ) cRows([[hm(weekTot), tw(13)], ['WEEK', label(7)]], weekTot / (goal * (wBack + 1)))
      else {
        rRow('이번 주 ' + hm(weekTot), '하루 ' + hm(weekAvg), tw(12), label(8))
        w.addSpacer(3)
        const mx = Math.max(goal, ...week7.map((x) => x.m)), row = w.addStack(); row.size = new Size(LK.rw, 22); row.bottomAlignContent(); row.spacing = 5
        week7.forEach((x, i) => { const b = row.addStack(); b.size = new Size(Math.floor((LK.rw - 30) / 7), Math.max(2, Math.round((x.m / mx) * 22))); b.cornerRadius = 1; b.backgroundColor = new Color('#ffffff', !x.m ? 0.25 : i === 6 ? 1 : 0.6) })
        w.addSpacer(2)
        rRow(lastWeek ? '지난주 같은 때 ' + hm(lastWeek) : '최근 7일', '', label(7), label(7))
      }
    } else if (KIND === 'subj') {
      const top = weekSub.slice(0, 3)
      if (inl) inline(top.length ? top.slice(0, 2).map((x) => x.s.name + ' ' + hm(x.m)).join(' · ') : '이번 주 공부 기록 없음')
      else if (circ) cRows(top[0] ? [[top[0].s.name, label(8)], [hm(top[0].m), tw(14)], ['WEEK', label(6)]] : [['—', tw(14)]], top[0] ? top[0].m / Math.max(1, weekTot) : null)
      else {
        for (const x of top) { rRow(x.s.name, hm(x.m), tw(11), label(8)); lbar(w, x.m / (top[0].m || 1), LK.rw) ; w.addSpacer(2) }
        if (!top.length) t(w, '이번 주 공부 기록 없음', tw(11))
      }
    } else if (KIND === 'now') {
      const c = nCur || nNext || nTmr, k = nTmr ? tmr : today
      if (inl) inline(nCur ? nCur.t + ' ~' + clk(nCur.e) : c ? (nTmr ? '내일 ' : '다음 ') + clk(c.s) + ' ' + c.t : '남은 일정 없음')
      else if (circ) {
        w.addAccessoryWidgetBackground = true
        const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
        const rowC = (fn) => { const a = z.addStack(); a.addSpacer(); fn(a); a.addSpacer() }
        if (c) { rowC((a) => t(a, nCur ? '남음' : nTmr ? '내일' : '다음', label(7))); rowC((a) => { if (nTmr) t(a, clk(c.s), tw(13)); else timerTo(a, nCur ? c.e : c.s, tw(12)) }); rowC((a) => t(a, c.t, label(7)).minimumScaleFactor = 0.5) }
        else rowC((a) => t(a, '—', tw(14)))
      } else {
        if (c) {
          rRow(nCur ? '지금' : nTmr ? '내일' : '다음', clk(c.s) + '–' + clk(c.e), label(8), label(8))
          t(w, c.t, thin(20)).minimumScaleFactor = 0.6
          const r = w.addStack(); r.centerAlignContent(); if (!nTmr) { t(r, nCur ? '끝까지 ' : '시작까지 ', label(8)); timerTo(r, nCur ? c.e : c.s, label(9)) } else t(r, c.l || ' ', label(8)); r.addSpacer()
        } else t(w, '오늘 남은 일정 없음', tw(12))
      }
    } else if (KIND === 'prog') {
      const p0 = PROG[0]
      if (inl) inline(p0 ? p0.t + ' ' + Math.round((p0.n / p0.of) * 100) + '%' : '진행 중인 교재·인강 없음')
      else if (circ) cRows(p0 ? [[Math.round((p0.n / p0.of) * 100) + '%', tw(14)], [p0.t, label(7)]] : [['—', tw(14)]], p0 ? p0.n / p0.of : null)
      else {
        for (const x of PROG.slice(0, 3)) { rRow(x.t, x.n + '/' + x.of + x.u, tw(11), label(8)); lbar(w, x.n / x.of, LK.rw); w.addSpacer(2) }
        if (!PROG.length) t(w, '진행 중인 교재·인강 없음', tw(11))
      }
    } else if (KIND === 'goals') {
      const g0 = GOALS.find((g) => !g.done)
      if (inl) inline(GOALS.length ? '목표 ' + goalsDone + '/' + GOALS.length + (g0 ? ' · ' + g0.t : ' 완료') : '이번 주 목표 없음')
      else if (circ) cRows(GOALS.length ? [[goalsDone + '/' + GOALS.length, thin(22)], ['GOALS', label(7)]] : [['—', tw(14)]], GOALS.length ? goalsDone / GOALS.length : null)
      else {
        rRow('THIS WEEK', goalsDone + '/' + GOALS.length, label(7), label(7))
        for (const g of GOALS.slice(0, 3)) { const a = w.addStack(); a.centerAlignContent(); const x = t(a, (g.done ? '✓ ' : '– ') + g.t, tw(11)); x.minimumScaleFactor = 0.8; if (g.done) x.textOpacity = 0.5; a.addSpacer(); if (g.of) t(a, g.n + '/' + g.of, label(7)) }
        if (!GOALS.length) t(w, '앱에서 이번 주 목표를 정해 보세요', tw(11))
      }
    } else if (KIND === 'today') {
      const left = items.filter((x) => !x.done).length, c = nCur || nNext
      if (inl) inline('할 일 ' + left + ' · 공부 ' + hm(mins) + (c ? ' · ' + clk(c.s) + ' ' + c.t : ''))
      else if (circ) cRows([[String(left), thin(22)], ['할 일', label(7)]], mins / goal)
      else {
        rRow(DAY[d0.getDay()] + ' ' + d0.getDate(), '할 일 ' + left, label(8), label(8))
        rRow(c ? clk(c.s) + ' ' + c.t : '남은 일정 없음', '', tw(11), label(8))
        rRow('공부 ' + hm(mins) + ' / ' + hm(goal), pct + '%', tw(11), label(8))
        lbar(w, mins / goal, LK.rw)
      }
    } else if (KIND === 'dash') {
      const left = items.filter((x) => !x.done).length, c = nCur || nNext
      if (inl) inline(hm(mins) + ' · 할 일 ' + left + (dd ? ' · ' + ddTxt : ''))
      else if (circ) cRows([[hm(mins), tw(14)], ['할 일 ' + left, label(7)]], mins / goal)
      else {
        rRow('공부 ' + hm(mins), '할 일 ' + left, tw(11), label(8))
        rRow(c ? clk(c.s) + ' ' + c.t : '남은 일정 없음', '', tw(11), label(8))
        rRow(dd ? dd.title : 'No D-day', dd ? ddTxt : '', tw(11), label(8))
        lbar(w, mins / goal, LK.rw)
      }
    } else if (KIND === 'tmrw') {
      const f = TMR.ev[0], c1 = TMR.cl[0]
      if (inl) inline(f ? '내일 ' + (f.s == null ? '' : clk(f.s % 1440) + ' ') + f.t : c1 ? '내일 ' + clk(c1.start) + ' ' + c1.title : TMR.tk.length ? '내일 할 일 ' + TMR.tk.length + '개' : '내일은 비어 있어요')
      else if (circ) cRows([['내일', label(7)], [String(tmrN), thin(22)], ['일정·할 일', label(6)]])
      else {
        rRow('내일 ' + DAY[(d0.getDay() + 1) % 7], TMR.cl.length ? '수업 ' + TMR.cl.length + '교시' : '', label(8), label(8))
        const rows = [...TMR.ev.map((e) => [e.t, e.s == null ? '종일' : clk(e.s % 1440)]), ...TMR.tk.map((x) => ['– ' + x.title, ''])]
        for (const x of rows.slice(0, 3)) rRow(x[0], x[1], tw(11), label(8))
        if (!rows.length) t(w, c1 ? '첫 수업 ' + clk(c1.start) + ' ' + c1.title : '내일은 비어 있어요', tw(11))
      }
    } else if (KIND === 'due') {
      const over = DUE.filter((x) => dueIn(x) < 0).length
      if (inl) inline(DUE[0] ? dueTxt(DUE[0]) + ' ' + DUE[0].title : '2주 안에 마감 없음')
      else if (circ) cRows([[String(DUE.length), thin(22)], ['마감', label(7)], [over ? over + ' 지남' : '2주', label(6)]])
      else {
        for (const x of DUE.slice(0, 3)) rRow(x.title, dueTxt(x), tw(11), label(8))
        if (!DUE.length) t(w, '2주 안에 마감 없음', tw(11))
        else if (DUE.length > 3) t(w, '+ ' + (DUE.length - 3) + ' more', label(7)).textOpacity = 0.7
      }
    } else if (KIND === 'week7') {
      const nx = nextEv7
      if (inl) inline(nx ? (nx.d.i === 0 ? '' : nx.d.i === 1 ? '내일 ' : DAY[nx.d.x.getDay()] + ' ') + (nx.e.s == null ? '종일' : clk(nx.e.s % 1440)) + ' ' + nx.e.t : '7일 안에 일정 없음')
      else if (circ) cRows([[String(ev7), thin(22)], ['7 DAYS', label(7)]])
      else {
        const ds = DAYS7.filter((d) => d.ev.length).slice(0, 3)
        for (const d of ds) rRow(dayName(d) + '  ' + d.ev[0].t, d.ev.length > 1 ? '+' + (d.ev.length - 1) : (d.ev[0].s == null ? '종일' : clk(d.ev[0].s % 1440)), tw(11), label(8))
        if (!ds.length) t(w, '7일 안에 일정 없음', tw(11))
      }
    } else if (KIND === 'ddl') {
      if (inl) inline(ddAll.length ? ddAll.slice(0, 2).map((x) => ddT(x) + ' ' + x.title).join(' · ') : 'No D-day')
      else if (circ) cRows(dd ? [[ddN(dd) === 0 ? 'D' : String(ddN(dd)), thin(22)], [dd.title, label(7)]] : [['—', tw(14)]])
      else {
        for (const x of ddAll.slice(0, 3)) rRow(x.title, ddT(x), tw(11), label(9))
        if (!ddAll.length) t(w, 'No D-day', tw(11))
      }
    } else if (KIND === 'quick') {
      const s0 = QS[0]
      w.url = startUrl(s0)
      if (inl) inline(s0 ? '공부 시작 · ' + s0.name + ' · 오늘 ' + hm(mins) : '공부 시작')
      else if (circ) cRows([['시작', label(7)], [s0 ? s0.name : '공부', tw(13)], [hm(mins), label(7)]], mins / goal)
      else {
        rRow('공부 시작', '오늘 ' + hm(mins), label(8), label(8))
        t(w, s0 ? s0.name : '공부', thin(22)).minimumScaleFactor = 0.6
        lbar(w, mins / goal, LK.rw)
      }
    }
  } else if (lock) {
    // ── 잠금 화면 ──
    if (fam === 'accessoryInline') {
      inline(hm(mins) + (dd ? ' · ' + ddTxt + ' ' + dd.title : ''))
    } else if (fam === 'accessoryCircular') {
      w.addAccessoryWidgetBackground = true
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const row = (s, f) => { const a = z.addStack(); a.addSpacer(); t(a, s, f).minimumScaleFactor = 0.6; a.addSpacer() }
      if (KIND === 'dday' && dd) { row(ddN(dd) === 0 ? 'D' : String(ddN(dd)), thin(20)); row('D-DAY', label(7)) }
      else { row(hm(mins), tw(14)); row(pct + '%', label(8)); cline(z, mins / goal) }
    } else {
      const r = w.addStack(); r.bottomAlignContent()
      t(r, hm(mins), thin(22)); r.addSpacer(4); t(r, '/ ' + hm(goal), tw(10)); r.addSpacer(); if (dd) t(r, ddTxt, tw(12))
      w.addSpacer(4)
      lbar(w, mins / goal, LK.rw)
      w.addSpacer(5)
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
    const yday = dayMins[ymdOff(1)] || 0
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
    if (TM) { w.addSpacer(4); const k = w.addStack(); k.centerAlignContent(); t(k, '● ' + TM.name + (TM.paused ? ' 일시정지 ' : ' 공부 중 '), label(8), GOLD); if (TM.paused) t(k, hm(TM.pm), label(8), GOLD); else { const dd2 = timerDate(k, 8); dd2.font = label(8); dd2.textColor = GOLD }; k.addSpacer() }
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (fam === 'small') {
      studyBig(w, 30, inner)
      w.addSpacer()
      const s2 = w.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, 'YESTERDAY', hm(yday), GOLD)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(150, 104)
      studyBig(L, 34, 150); L.addSpacer()
      const s2 = L.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, 'YESTERDAY', hm(yday), GOLD); s2.addSpacer()
      row.addSpacer(16); vrule(row, 104); row.addSpacer(16)
      const R = row.addStack(); R.layoutVertically()
      bars(R, inner - 183, 78); R.addSpacer()
      row.addSpacer()
    } else {
      studyBig(w, 44, inner)
      w.addSpacer(14)
      const s2 = w.addStack(); stat(s2, 'WEEK', hm(week)); s2.addSpacer(); stat(s2, '7-DAY AVG', hm(avg)); s2.addSpacer(); stat(s2, 'YESTERDAY', hm(yday), GOLD)
      w.addSpacer(14)
      bars(w, inner, 70)
      w.addSpacer(14); rule(w, inner); w.addSpacer(10)
      subBars(w, inner, 3)
    }
  } else if (KIND === 'class') {
    // ── 시간표 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'CLASSES'); h.addSpacer(); t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const max = fam === 'small' ? 6 : fam === 'medium' ? 5 : 10
    const start = Math.max(0, Math.min(CL.findIndex((c) => c.end > nm), CL.length - max))
    for (const c of CL.slice(start < 0 ? 0 : start, (start < 0 ? 0 : start) + max)) {
      const r = w.addStack(); r.centerAlignContent(); r.spacing = 8
      const col = c === clCur ? GOLD : c.end <= nm ? SOFT : INK
      const pn = r.addStack(); pn.size = new Size(12, 0); t(pn, c.period, tw(10), SOFT)
      t(r, c.title, tw(fam === 'small' ? 13 : 14), col).minimumScaleFactor = 0.8
      if (fam !== 'small' && c.room) t(r, c.room, tw(10), SOFT)
      r.addSpacer(); t(r, clk(c.start), tw(10), SOFT)
      w.addSpacer(fam === 'large' ? 7 : 4)
    }
    if (!CL.length) t(w, '오늘은 수업이 없어요', tw(13), SOFT)
  } else if (KIND === 'todo') {
    // ── 할 일 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, done + ' DONE', label(8), GOLD)
    w.addSpacer(10)
    todoList(w, fam === 'small' ? 4 : fam === 'medium' ? 5 : 11, fam === 'large' ? 7 : 4)
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
    // ── 캘린더: 이번 달 + 아래(중형은 옆) 다가오는 일정 · 할 일은 넣지 않음 ──
    const cal = data.cal || {}
    const y = d0.getFullYear(), m = d0.getMonth(), n = new Date(y, m + 1, 0).getDate()
    const ws = st.weekStart ?? 1, lead = (new Date(y, m, 1).getDay() - ws + 7) % 7
    const key = (dd2) => y + '-' + pad(m + 1) + '-' + pad(dd2)
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
          const k = key(day), evs = cal[k] || [], has = evs.length
          // 오늘: 채우기 대신 테두리 — 틴트/투명 홈 화면에서도 숫자가 보이게
          if (k === today) { c.borderWidth = 1; c.borderColor = INK; c.cornerRadius = Math.min(cell, cellH) / 2 }
          const a = c.addStack(); a.addSpacer(); t(a, day, k === today ? F(numSize, 'SemiBold') : label(numSize), k === today || has ? INK : SOFT); a.addSpacer()
          const b = c.addStack(); b.addSpacer(); t(b, has ? '•' : ' ', label(numSize - 2), has && evs[0].c ? new Color(evs[0].c) : GOLD); b.addSpacer()
        }
        parent.addSpacer(gap)
      }
    }
    // 다가오는 일정 (오늘부터 30일, 오늘 이미 끝난 일정은 빼고)
    const agenda = [], nowM = new Date().getHours() * 60 + new Date().getMinutes()
    for (let i = 0; i < 30 && agenda.length < 12; i++) {
      const dt = new Date(d0); dt.setDate(dt.getDate() + i); const k = ymd(dt)
      const evs = (cal[k] || []).slice().sort((a, b) => (a.s ?? -1) - (b.s ?? -1))
      for (const e of evs) { if (i === 0 && e.s != null && e.s + 60 <= nowM) continue; agenda.push({ k, dt, time: e.s == null ? '종일' : pad(Math.floor(e.s / 60) % 24) + ':' + pad(e.s % 60), title: e.t, c: e.c }) }
    }
    const agendaList = (parent, count) => {
      let last = ''
      // 다음 일정(오늘 아직 안 지난 첫 일정) 강조
      const nowHM = pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())
      const nextA = agenda.find((a) => a.k > today || (a.k === today && (a.time === '종일' || a.time >= nowHM)))
      for (const a of agenda.slice(0, count)) {
        if (a.k !== last) { last = a.k; const h = parent.addStack(); t(h, a.k === today ? 'TODAY' : DAY[a.dt.getDay()] + ' ' + (a.dt.getMonth() + 1) + '/' + a.dt.getDate(), label(8), a.k === today ? GOLD : SOFT); h.addSpacer(); parent.addSpacer(3) }
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 8
        const hot = a === nextA
        const tm = r.addStack(); tm.size = new Size(34, 0); t(tm, a.time, hot ? label(10) : tw(10), hot ? GOLD : SOFT); tm.addSpacer()
        const bar = r.addStack(); bar.size = new Size(2, 12); bar.cornerRadius = 1; bar.backgroundColor = a.c ? new Color(a.c) : RULE
        t(r, a.title, hot ? F(fam === 'large' ? 14 : 13, 'Medium') : tw(fam === 'large' ? 14 : 13), INK).minimumScaleFactor = 0.85; r.addSpacer()
        parent.addSpacer(5)
      }
      if (!agenda.length) t(parent, '다가오는 일정 없음', tw(13), SOFT)
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
      grid(w, (inner - 6 * 4) / 7, rows > 5 ? 21 : 24, 3, 10)
      w.addSpacer(4); rule(w, inner); w.addSpacer(8)
      agendaList(w, fam === 'extraLarge' ? 8 : rows > 5 ? 4 : 5)
    }
  } else if (KIND === 'week') {
    // ── 주간 공부 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'THIS WEEK'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 6 : 8)
    const big = w.addStack(); big.bottomAlignContent(); t(big, hm(weekTot), thin(fam === 'large' ? 38 : 30), INK).minimumScaleFactor = 0.6; big.addSpacer(6)
    t(big, lastWeek ? (weekTot >= lastWeek ? '+' : '−') + hm(Math.abs(weekTot - lastWeek)) : '', tw(10), weekTot >= lastWeek ? GOLD : SOFT); big.addSpacer()
    t(w, '하루 평균 ' + hm(weekAvg) + (lastWeek ? ' · 지난주 같은 때 ' + hm(lastWeek) : ''), tw(10), SOFT).minimumScaleFactor = 0.7
    w.addSpacer()
    const bw = fam === 'small' ? inner : fam === 'medium' ? inner : inner
    bars7(w, bw, fam === 'small' ? 30 : fam === 'medium' ? 26 : 90, GOLD, RULE); w.addSpacer(3); wdRow(w, bw)
    if (fam === 'large') {
      w.addSpacer(12); rule(w, inner); w.addSpacer(10)
      for (const x of weekSub.slice(0, 5)) { const r = w.addStack(); r.centerAlignContent(); t(r, x.s.name, tw(12), INK); r.addSpacer(); t(r, hm(x.m), tw(11), SOFT); w.addSpacer(3); pbar(w, x.m / (weekSub[0].m || 1), inner, x.s.color); w.addSpacer(7) }
    }
  } else if (KIND === 'subj') {
    // ── 과목별 (이번 주) ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'SUBJECTS'); h.addSpacer(); t(h, '이번 주 ' + hm(weekTot), label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const n = fam === 'small' ? 3 : fam === 'medium' ? 3 : 8
    for (const x of weekSub.slice(0, n)) {
      const r = w.addStack(); r.centerAlignContent(); const dot = r.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = x.s.color ? new Color(x.s.color) : GOLD; r.addSpacer(6)
      t(r, x.s.name, tw(fam === 'small' ? 12 : 13), INK).minimumScaleFactor = 0.8; r.addSpacer()
      if (fam !== 'small' && x.today) { t(r, '오늘 ' + hm(x.today), tw(10), SOFT); r.addSpacer(8) }
      t(r, hm(x.m), tw(fam === 'small' ? 11 : 12), INK)
      w.addSpacer(3); pbar(w, x.m / (weekSub[0].m || 1), inner, x.s.color); w.addSpacer(fam === 'large' ? 9 : 6)
    }
    if (!weekSub.length) t(w, '이번 주 공부 기록이 없어요', tw(12), SOFT)
    if (fam !== 'large') w.addSpacer()
  } else if (KIND === 'now') {
    // ── 지금·다음 ──
    const c = nCur || nNext || nTmr, k = nTmr ? tmr : today
    const h = w.addStack(); h.centerAlignContent(); cap(h, nCur ? 'NOW' : nTmr ? 'TOMORROW' : 'NEXT'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    if (c) {
      if (c.c) { const bar = w.addStack(); bar.size = new Size(24, 2); bar.cornerRadius = 1; bar.backgroundColor = new Color(c.c); w.addSpacer(6) }
      t(w, c.t, thin(fam === 'small' ? 20 : 24), INK, 2).minimumScaleFactor = 0.6
      w.addSpacer(4)
      t(w, clk(c.s) + '–' + clk(c.e) + (c.l ? ' · ' + c.l : ''), tw(11), SOFT).minimumScaleFactor = 0.7
      w.addSpacer(6)
      if (!nTmr) { const r = w.addStack(); r.centerAlignContent(); t(r, nCur ? '끝까지 ' : '시작까지 ', label(9), SOFT); timerTo(r, nCur ? c.e : c.s, label(11)).textColor = GOLD; r.addSpacer() }
      if (nCur && fam !== 'small') { w.addSpacer(6); pbar(w, (nm - c.s) / Math.max(1, c.e - c.s), inner) }
    } else t(w, '오늘 남은 일정이 없어요', tw(13), SOFT)
    if (fam !== 'small') {
      const rest = NOW.filter((x) => x.e > nm && x !== c).slice(0, fam === 'large' ? 8 : 1)
      if (rest.length) {
        w.addSpacer(fam === 'large' ? 14 : 8); if (fam === 'large') { rule(w, inner); w.addSpacer(10) }
        for (const x of rest) { const r = w.addStack(); r.centerAlignContent(); r.spacing = 8; const tm = r.addStack(); tm.size = new Size(38, 0); t(tm, clk(x.s), tw(10), SOFT); tm.addSpacer(); t(r, x.t, tw(13), INK).minimumScaleFactor = 0.8; r.addSpacer(); w.addSpacer(6) }
      }
    }
    w.addSpacer()
  } else if (KIND === 'prog') {
    // ── 진도 (교재·인강) ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'PROGRESS'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const n = fam === 'small' ? 3 : fam === 'medium' ? 3 : 8
    for (const x of PROG.slice(0, n)) {
      const r = w.addStack(); r.centerAlignContent(); t(r, x.t, tw(fam === 'small' ? 12 : 13), INK).minimumScaleFactor = 0.8; r.addSpacer(); t(r, fam === 'small' ? Math.round((x.n / x.of) * 100) + '%' : x.n + '/' + x.of + x.u, tw(10), SOFT)
      w.addSpacer(3); pbar(w, x.n / x.of, inner, x.c); w.addSpacer(fam === 'large' ? 10 : 7)
    }
    if (!PROG.length) t(w, '진행 중인 교재·인강이 없어요', tw(12), SOFT)
    w.addSpacer()
  } else if (KIND === 'goals') {
    // ── 이번 주 목표 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'THIS WEEK'); h.addSpacer(); t(h, goalsDone + '/' + GOALS.length, label(8), GOLD)
    w.addSpacer(fam === 'small' ? 8 : 10)
    for (const g of GOALS.slice(0, 3)) {
      const r = w.addStack(); r.centerAlignContent(); r.spacing = 6
      t(r, g.done ? '✓' : '–', tw(12), g.done ? GOLD : SOFT)
      if (g.done) strike(r, g.t, tw(fam === 'small' ? 12 : 14)); else t(r, g.t, tw(fam === 'small' ? 12 : 14), INK).minimumScaleFactor = 0.8
      r.addSpacer(); if (g.of && fam !== 'small') t(r, g.n + '/' + g.of, tw(10), SOFT)
      w.addSpacer(3); pbar(w, g.r, inner); w.addSpacer(fam === 'large' ? 12 : 7)
    }
    if (!GOALS.length) t(w, '앱 › 할 일에서 이번 주 목표를 정해 보세요', tw(12), SOFT, 2)
    if (fam === 'large') { w.addSpacer(8); rule(w, inner); w.addSpacer(10); const s2 = w.addStack(); t(s2, '이번 주 공부 ' + hm(weekTot), tw(12), INK); s2.addSpacer(); t(s2, '하루 ' + hm(weekAvg), tw(11), SOFT) }
    w.addSpacer()
  } else if (KIND === 'today') {
    // ── 오늘 한눈에: 다음 일정 · 공부 · 할 일 ──
    const c = nCur || nNext
    const evLine = (parent, size) => { const r = parent.addStack(); r.centerAlignContent(); t(r, c ? (nCur ? '지금 ' : '') + clk(c.s) : '—', tw(size - 3), GOLD); r.addSpacer(6); t(r, c ? c.t : '남은 일정 없음', tw(size), c ? INK : SOFT).minimumScaleFactor = 0.8; r.addSpacer() }
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, dateStr, label(8), SOFT)
    w.addSpacer(8)
    if (fam === 'small') {
      evLine(w, 12); w.addSpacer(); studyBig(w, 26, inner); w.addSpacer(6)
      t(w, '할 일 ' + items.filter((x) => !x.done).length + '개 남음', tw(11), SOFT)
    } else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(Math.round(inner * 0.42), 0); evLine(L, 12); L.addSpacer(); studyBig(L, 26, Math.round(inner * 0.42))
      row.addSpacer(12); vrule(row, 100); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); todoList(R, 4, 4); R.addSpacer()
    } else {
      evLine(w, 14); w.addSpacer(10); studyBig(w, 36, inner)
      w.addSpacer(12); rule(w, inner); w.addSpacer(10)
      todoList(w, 6, 6)
      w.addSpacer(); if (dd) ddRow(w, 12)
    }
  } else if (KIND === 'dash') {
    // ── 대시보드: 공부 · 할 일 · 다음 일정 · D-day 칸 (중·대는 칸마다 누르면 해당 화면) ──
    const left = items.filter((x) => !x.done).length, c = nCur || nNext
    const tiles = [
      ['STUDY', hm(mins), pct + '%', mins / goal, 'study.records', GOLD],
      ['TO DO', String(left), done + ' done', items.length ? done / items.length : 0, 'tasks', SOFT],
      ['NEXT', c ? clk(c.s) : '—', c ? c.t : '남은 일정 없음', null, 'planner.today', SOFT],
      ['D-DAY', dd ? ddTxt : '—', dd ? dd.title : '없음', null, 'study.progress', GOLD],
    ]
    const cols = fam === 'medium' ? 4 : 2, gap = 12, wd = Math.floor((inner - gap * (cols - 1)) / cols), big = fam === 'small' ? 19 : fam === 'medium' ? 22 : 30
    if (fam !== 'small') { const h = w.addStack(); h.centerAlignContent(); cap(h, 'TODAY'); h.addSpacer(); t(h, dateStr, label(8), SOFT); w.addSpacer(fam === 'medium' ? 14 : 12) }
    for (let i = 0; i < 4; i += cols) {
      const r = w.addStack(); r.spacing = gap
      for (const x of tiles.slice(i, i + cols)) {
        const b = r.addStack(); b.layoutVertically(); b.size = new Size(wd, 0); if (fam !== 'small') b.url = link(x[4])
        t(b, x[0], label(7), SOFT); b.addSpacer(2)
        t(b, x[1], thin(big), INK).minimumScaleFactor = 0.5
        t(b, x[2], tw(10), x[5]).minimumScaleFactor = 0.7
        if (x[3] != null) { b.addSpacer(4); pbar(b, x[3], wd) }
      }
      if (i + cols < 4) w.addSpacer(fam === 'small' ? 10 : 14)
    }
    if (fam === 'large' || fam === 'extraLarge') { w.addSpacer(14); rule(w, inner); w.addSpacer(10); todoList(w, 5, 5) }
  } else if (KIND === 'tmrw') {
    // ── 내일 준비: 수업 · 일정 · 할 일 ──
    const td = new Date(d0.getTime() + 86400000)
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'TOMORROW'); h.addSpacer(); t(h, DAY[td.getDay()] + ' ' + (td.getMonth() + 1) + '/' + td.getDate(), label(8), GOLD)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const clLine = (parent) => { if (!TMR.cl.length) return; const r = parent.addStack(); r.centerAlignContent(); t(r, '수업 ' + TMR.cl.length + '교시', tw(10), SOFT); r.addSpacer(6); t(r, clk(TMR.cl[0].start) + '–' + clk(TMR.cl[TMR.cl.length - 1].end), tw(10), SOFT); r.addSpacer(); parent.addSpacer(6) }
    const evRows = (parent, n, size) => {
      for (const e of TMR.ev.slice(0, n)) {
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 6
        const tm = r.addStack(); tm.size = new Size(34, 0); t(tm, e.s == null ? '종일' : clk(e.s % 1440), tw(10), SOFT); tm.addSpacer()
        const bar = r.addStack(); bar.size = new Size(2, 12); bar.cornerRadius = 1; bar.backgroundColor = e.c ? new Color(e.c) : RULE
        t(r, e.t, tw(size), INK).minimumScaleFactor = 0.8; r.addSpacer(); parent.addSpacer(5)
      }
      if (TMR.ev.length > n) t(parent, '+ ' + (TMR.ev.length - n) + ' more', tw(10), SOFT)
    }
    const tkRows = (parent, n, size) => {
      for (const x of TMR.tk.slice(0, n)) {
        const r = parent.addStack(); r.centerAlignContent(); r.spacing = 6; if (x.id) r.url = APP + '?done=' + encodeURIComponent(x.id)
        const imp = x.priority >= 3; t(r, imp ? '•' : '–', tw(size - 1), imp ? GOLD : SOFT); t(r, x.title, imp ? F(size, 'Medium') : tw(size), INK).minimumScaleFactor = 0.85; r.addSpacer()
        if (x.dueTime != null) t(r, clk(x.dueTime), tw(10), SOFT)
        parent.addSpacer(5)
      }
      if (TMR.tk.length > n) t(parent, '+ ' + (TMR.tk.length - n) + ' more', tw(10), SOFT)
    }
    if (!TMR.ev.length && !TMR.tk.length && !TMR.cl.length) t(w, '내일은 비어 있어요', tw(13), SOFT)
    else if (fam === 'small') { clLine(w); const k = TMR.cl.length ? 2 : 3, kt = Math.max(0, k - TMR.ev.length); evRows(w, k, 12); if (kt) tkRows(w, kt, 12); w.addSpacer(); if (TMR.tk.length && !kt) t(w, '할 일 ' + TMR.tk.length + '개', tw(10), GOLD) }
    else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(Math.round(inner * 0.54), 0); clLine(L); evRows(L, TMR.cl.length ? 3 : 4, 12); if (!TMR.ev.length) t(L, '일정 없음', tw(12), SOFT); L.addSpacer()
      row.addSpacer(12); vrule(row, 96); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically(); tkRows(R, 4, 12); if (!TMR.tk.length) t(R, '할 일 없음', tw(12), SOFT); R.addSpacer()
      row.addSpacer()
    } else {
      if (TMR.cl.length) { cap(w, 'CLASSES'); w.addSpacer(5); t(w, TMR.cl.map((c) => c.period + ' ' + c.title).join(' · '), tw(12), INK, 2); w.addSpacer(12) }
      cap(w, 'EVENTS'); w.addSpacer(5); evRows(w, 4, 13); if (!TMR.ev.length) t(w, '일정 없음', tw(12), SOFT)
      w.addSpacer(10); cap(w, 'TO DO'); w.addSpacer(5); tkRows(w, TMR.cl.length ? 4 : 6, 13); if (!TMR.tk.length) t(w, '할 일 없음', tw(12), SOFT)
    }
  } else if (KIND === 'due') {
    // ── 마감 임박: 지난 것 + 2주 안 (누르면 완료 확인) ──
    const over = DUE.filter((x) => dueIn(x) < 0).length
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'DUE'); h.addSpacer(); t(h, over ? over + '개 지남' : '2주 ' + DUE.length + '개', label(8), over ? GOLD : SOFT)
    w.addSpacer(10)
    const n0 = fam === 'small' ? 4 : fam === 'medium' ? 5 : 11, n = DUE.length === n0 + 1 ? n0 + 1 : n0
    for (const x of DUE.slice(0, n)) {
      const r = w.addStack(); r.centerAlignContent(); r.spacing = 8; if (x.id) r.url = APP + '?done=' + encodeURIComponent(x.id)
      const tg = r.addStack(); tg.size = new Size(fam === 'small' ? 36 : 42, 0); t(tg, dueTxt(x), tw(10), dueIn(x) <= 0 ? GOLD : SOFT).minimumScaleFactor = 0.7; tg.addSpacer()
      t(r, x.title, x.priority >= 3 ? F(TS, 'Medium') : tw(TS), INK).minimumScaleFactor = 0.85; r.addSpacer()
      if (fam !== 'small' && x.dueTime != null) t(r, clk(x.dueTime), tw(10), SOFT)
      w.addSpacer(fam === 'large' ? 7 : 4)
    }
    if (!DUE.length) t(w, '2주 안에 마감 없음', tw(TS), SOFT)
    else if (DUE.length > n) t(w, '+ ' + (DUE.length - n) + ' more', tw(11), SOFT)
  } else if (KIND === 'week7') {
    // ── 7일 일정: 중형은 7칸, 소·대형은 날짜별 줄 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'NEXT 7 DAYS'); h.addSpacer(); t(h, ev7 + '개', label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const evBar = (parent, e, hgt) => { const b = parent.addStack(); b.size = new Size(2, hgt); b.cornerRadius = 1; b.backgroundColor = e.c ? new Color(e.c) : GOLD }
    if (fam === 'medium') {
      const gap = 4, cw = Math.floor((inner - gap * 6) / 7), row = w.addStack(); row.spacing = gap
      for (const d of DAYS7) {
        const c = row.addStack(); c.layoutVertically(); c.size = new Size(cw, 94)
        const a = c.addStack(); t(a, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.x.getDay()], label(7), d.i === 0 ? GOLD : SOFT); a.addSpacer()
        const b = c.addStack(); t(b, d.x.getDate(), d.i === 0 ? F(13, 'SemiBold') : tw(13), d.i === 0 ? GOLD : INK); b.addSpacer()
        c.addSpacer(4)
        for (const e of d.ev.slice(0, 3)) { const r = c.addStack(); r.centerAlignContent(); r.spacing = 2; evBar(r, e, 9); t(r, e.t, tw(8), INK); r.addSpacer(); c.addSpacer(3) }
        if (d.ev.length > 3) t(c, '+' + (d.ev.length - 3), label(7), SOFT)
        c.addSpacer()
      }
    } else {
      const nd = fam === 'small' ? 3 : 7, ne = fam === 'small' ? 1 : 2
      for (const d of DAYS7.slice(0, nd)) {
        const r = w.addStack(); r.topAlignContent(); r.spacing = 8
        const L = r.addStack(); L.size = new Size(fam === 'small' ? 34 : 44, 0); L.layoutVertically(); t(L, dayName(d), label(7), d.i === 0 ? GOLD : SOFT); t(L, (d.x.getMonth() + 1) + '/' + d.x.getDate(), tw(10), SOFT)
        const R = r.addStack(); R.layoutVertically()
        d.ev.slice(0, ne).forEach((e, j) => {
          const q = R.addStack(); q.centerAlignContent(); q.spacing = 5
          if (fam !== 'small') { const tm = q.addStack(); tm.size = new Size(32, 0); t(tm, e.s == null ? '종일' : clk(e.s % 1440), tw(10), SOFT); tm.addSpacer() }
          evBar(q, e, 11); t(q, e.t, tw(fam === 'small' ? 11 : 12), INK).minimumScaleFactor = 0.8; q.addSpacer()
          if (j === ne - 1 && d.ev.length > ne) t(q, '+' + (d.ev.length - ne), label(7), SOFT)
          R.addSpacer(2)
        })
        if (!d.ev.length) t(R, '—', tw(11), SOFT)
        r.addSpacer()
        w.addSpacer(fam === 'small' ? 5 : 7)
      }
    }
  } else if (KIND === 'ddl') {
    // ── D-day 목록 ──
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'D-DAYS'); h.addSpacer(); if (fam !== 'small') t(h, dateStr, label(8), SOFT)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const ddLine = (parent, x, size) => { const r = parent.addStack(); r.centerAlignContent(); t(r, x.title, tw(size), INK).minimumScaleFactor = 0.8; r.addSpacer(6); if (fam !== 'small') { t(r, x.date.slice(5).replace('-', '.'), tw(10), SOFT); r.addSpacer(8) } t(r, ddT(x), tw(size), GOLD) }
    if (!ddAll.length) t(w, 'No D-day.', tw(13), SOFT)
    else if (fam === 'medium') {
      const row = w.addStack()
      const L = row.addStack(); L.layoutVertically(); L.size = new Size(Math.round(inner * 0.38), 0)
      t(L, ddT(ddAll[0]), thin(34), INK).minimumScaleFactor = 0.5; L.addSpacer(2); t(L, ddAll[0].title, tw(12), GOLD).minimumScaleFactor = 0.7; t(L, ddAll[0].date.slice(5).replace('-', '.'), tw(10), SOFT); L.addSpacer()
      row.addSpacer(12); vrule(row, 92); row.addSpacer(12)
      const R = row.addStack(); R.layoutVertically()
      for (const x of ddAll.slice(1, 5)) { const r = R.addStack(); r.centerAlignContent(); t(r, x.title, tw(12), INK).minimumScaleFactor = 0.8; r.addSpacer(6); t(r, ddT(x), tw(12), GOLD); R.addSpacer(7) }
      if (ddAll.length === 1) t(R, '다른 D-day 없음', tw(11), SOFT)
      R.addSpacer()
    } else {
      const n = fam === 'small' ? 4 : 10
      for (const x of ddAll.slice(0, n)) { ddLine(w, x, fam === 'small' ? 12 : 14); w.addSpacer(fam === 'small' ? 6 : 10) }
    }
  } else if (KIND === 'quick') {
    // ── 바로 시작: 과목 누르면 스톱워치 시작 · 빠른 추가 (소형은 최근 과목 하나) ──
    const s0 = QS[0]
    const h = w.addStack(); h.centerAlignContent(); cap(h, 'START'); h.addSpacer(); t(h, '오늘 ' + hm(mins), label(8), GOLD)
    w.addSpacer(fam === 'small' ? 8 : 10)
    const btn = (parent, s, url, wd, hgt, color, size = 12) => { const b = parent.addStack(); b.size = new Size(wd, hgt); b.cornerRadius = 10; b.backgroundColor = RULE; b.centerAlignContent(); b.url = url; if (color) { const d = b.addStack(); d.size = new Size(6, 6); d.cornerRadius = 3; d.backgroundColor = new Color(color); b.addSpacer(5) } t(b, s, tw(size), INK).minimumScaleFactor = 0.6; return b }
    const running = (parent) => { const k = parent.addStack(); k.centerAlignContent(); k.url = link('study.timer'); t(k, '● ' + TM.name + ' ', tw(12), GOLD); if (TM.paused) t(k, hm(TM.pm), tw(12), INK); else timerDate(k, 12); k.addSpacer(); t(k, TM.paused ? '일시정지' : '공부 중', label(8), SOFT) }
    if (fam === 'small') {
      w.url = TM ? link('study.timer') : startUrl(s0)
      if (TM) { t(w, TM.name, tw(12), GOLD); w.addSpacer(2); const r = w.addStack(); if (TM.paused) t(r, hm(TM.pm), thin(30), INK); else timerDate(r, 30, true); r.addSpacer() }
      else { const r = w.addStack(); r.centerAlignContent(); if (s0 && s0.color) { const d = r.addStack(); d.size = new Size(7, 7); d.cornerRadius = 3.5; d.backgroundColor = new Color(s0.color); r.addSpacer(6) } t(r, s0 ? s0.name : '공부', thin(26), INK).minimumScaleFactor = 0.5; r.addSpacer(); w.addSpacer(2); t(w, '눌러서 시작', tw(10), SOFT) }
      w.addSpacer(); pbar(w, mins / goal, inner)
    } else {
      const per = 4, gap = 8, bw = Math.floor((inner - gap * (per - 1)) / per)
      if (TM) { running(w); w.addSpacer(10) }
      const subs = QS.slice(0, TM ? (fam === 'medium' ? 0 : 4) : fam === 'medium' ? 4 : 8)
      for (let i = 0; i < subs.length; i += per) { const r = w.addStack(); r.spacing = gap; for (const s of subs.slice(i, i + per)) btn(r, s.name, startUrl(s), bw, 34, s.color); w.addSpacer(gap) }
      if (!subjects.length && !TM) { t(w, '앱 › 설정에서 과목을 추가해 보세요', tw(12), SOFT); w.addSpacer(gap) }
      const aw = Math.floor((inner - gap * 2) / 3), r2 = w.addStack(); r2.spacing = gap
      btn(r2, '+ 할 일', newUrl('task'), aw, 30, null, 11); btn(r2, '+ 일정', newUrl('event'), aw, 30, null, 11); btn(r2, '+ 기록', newUrl('record'), aw, 30, null, 11)
      if (fam === 'large' || fam === 'extraLarge') { w.addSpacer(14); rule(w, inner); w.addSpacer(10); todoList(w, 4, 5) }
    }
  } else if (KIND === 'quote') {
    // ── 다짐 ──
    t(w, dateStr, label(9), SOFT)
    w.addSpacer()
    t(w, quote || '앱에서 다짐을 적어 보세요', tw(fam === 'small' ? 14 : fam === 'medium' ? 17 : 22), INK, fam === 'large' ? 8 : 4)
    w.addSpacer()
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
} catch (e) {
  // 그리다 실패해도 빈칸 대신 원인을 보여 줌
  w = new ListWidget()
  if (!lock) { w.setPadding(16, 16, 16, 16); w.backgroundColor = BG }
  const msg = String((e && e.message) || e)
  if (fam === 'accessoryInline') { inline('위젯 오류 · ' + msg); return w }
  t(w, '위젯 오류', label(lock ? 10 : 12), lock ? null : INK)
  t(w, lock ? msg.slice(0, 60) : msg + ' · 스크립트를 앱에서 다시 복사해 보세요', tw(lock ? 9 : 11), lock ? null : SOFT, lock ? 2 : 4)
}
return w
}

let w
try { w = build(config.widgetFamily || 'large') } catch (e) {
  w = new ListWidget(); const x = w.addText('위젯 오류 · ' + String((e && e.message) || e).slice(0, 80)); x.font = Font.systemFont(10); x.lineLimit = 3
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
  ;['미리보기 · 소', '미리보기 · 중', '미리보기 · 대', '투명 배경 설정', '투명 배경 모두 지우기', '글자색 · 자동', '글자색 · 밝게', '글자색 · 어둡게', '잠금 화면 미리보기 · 원형', '잠금 화면 미리보기 · 직사각형', '잠금 화면 미리보기 · 한 줄'].forEach((x) => m.addAction(x)); m.addCancelAction('닫기')
  const i = await m.present()
  if (i === 0) await w.presentSmall()
  else if (i === 1) await w.presentMedium()
  else if (i === 2) await w.presentLarge()
  else if (i === 3) await transparentSetup()
  else if (i === 4) { for (const f of FM.listContents(FM.documentsDirectory())) if (f.startsWith('study-bg-')) FM.remove(FM.joinPath(FM.documentsDirectory(), f)) }
  else if (i >= 5 && i <= 7) Keychain.set('study-ink', ['auto', 'light', 'dark'][i - 5])
  else if (i >= 8) {
    // 잠금 화면 위젯을 앱 안에서 그려 보기 (오류가 있으면 여기서 보임)
    const f = ['accessoryCircular', 'accessoryRectangular', 'accessoryInline'][i - 8]
    const lw = build(f)
    if (f === 'accessoryCircular' && lw.presentAccessoryCircular) await lw.presentAccessoryCircular()
    else if (f === 'accessoryRectangular' && lw.presentAccessoryRectangular) await lw.presentAccessoryRectangular()
    else if (f === 'accessoryInline' && lw.presentAccessoryInline) await lw.presentAccessoryInline()
    else await lw.presentSmall()
  }
}
Script.complete()
`
}
