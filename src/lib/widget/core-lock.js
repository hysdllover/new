// 위젯 본체 (build() 앞부분: 크기·테마 · 잠금 화면 위젯) — Scriptable 에서 실행되는 코드를 글자로 담음. 네 조각을 이어 붙여 본체가 됨
// 템플릿 문자열 안: 백슬래시는 두 번, 백틱 금지
export default () => `function build(fam) {
const lock = fam.startsWith('accessory')
// 진행·남은분은 잠금 원형용 — 다른 크기에선 공부·지금 유형으로
KIND = fam === 'accessoryCircular' ? BASEKIND : ({ pct: 'study', mins: 'now' }[BASEKIND] || BASEKIND)
if (KIND === 'custom' && fam.startsWith('accessory')) KIND = 'dash' // 내 위젯의 잠금 화면은 대시보드와 같게
let w = new ListWidget()
// 한 줄(시계 위) 위젯: iOS 가 텍스트 하나만 시스템 서체로 그림 → 서체·색 지정 없이 짧게 하나만
const inline = (s) => { s = String(s); const x = w.addText(s.length > 26 ? s.slice(0, 25) + '…' : s); x.lineLimit = 1; return x }
w.url = link({ todo: 'tasks', due: 'tasks', cal: 'planner.month', week7: 'planner.week', tmrw: 'planner.week', class: 'planner.timetable', default: '', dash: '', quick: 'study.timer', timer: 'study.timer', ddl: 'study.progress', prog: 'study.progress', series: 'tasks.board', board: 'tasks.board', weeks: 'study.records' }[KIND] ?? 'study.records')
w.refreshAfterDate = new Date(Date.now() + 5 * 60000) // 5분 뒤 다시 그려 달라고 요청 (실제 시점은 iOS 가 정함)
// 앱 설정: 위젯 여백 단계 · 구분선 굵기
const STM = (data && data.settings && data.settings.settings && data.settings.settings.main) || {}
const P = Math.round((fam === 'small' ? 16 : 18) * ({ tight: 0.72, roomy: 1.25 }[STM.widgetPad] || 1))
RW = { none: 0, thin: 0.4, bold: 1 }[STM.widgetRule] ?? 0.6
// 기기별 위젯 크기(pt) — 아이폰은 화면 폭별 실제 크기표(가장 가까운 폭), 아이패드는 고정값
const SZ = (() => {
  if (Device.isPad()) return { small: 158, medium: 342, large: 342, extraLarge: 715, h: { small: 158, medium: 158, large: 342, extraLarge: 342 } }
  const sc = Device.screenSize(), sw = Math.min(sc.width, sc.height)
  const T = { 440: [176, 376, 392], 430: [170, 364, 382], 428: [170, 364, 382], 414: [169, 360, 379], 402: [162, 345, 362], 393: [158, 338, 354], 390: [158, 338, 354], 375: [155, 329, 345], 360: [155, 329, 345], 320: [141, 292, 311] }
  const k = Object.keys(T).map(Number).sort((a, b) => Math.abs(a - sw) - Math.abs(b - sw))[0], [sm, md, lh] = T[k]
  return { small: sm, medium: md, large: md, extraLarge: md, h: { small: sm, medium: sm, large: lh, extraLarge: lh } }
})()
const inner = (SZ[fam] || SZ.large) - P * 2
const innerH = (SZ.h[fam] || SZ.h.large) - P * 2 // 세로 안쪽 높이
let MH = innerH - 21 // 중형: 머리줄(제목 + 간격) 아래 남는 높이 (글자 크기 정해진 뒤 다시 계산)
// 투명 배경(배경화면 잘라 붙이기) · 글자색
// 앱 설정의 위젯 테마가 있으면 우선: 흰 글씨 · 검은 글씨 · 종이 · 다크 (자동이면 Scriptable 메뉴의 글자색)
const WT = (data && data.settings && data.settings.settings && data.settings.settings.main && data.settings.settings.main.widgetTheme) || 'auto'
MONO = WT === 'mono'
if (MONO) GOLD = new Color('#ffffff', 0.9)
PENCIL = WT === 'paper'
let inkMode = WT === 'white' || WT === 'night' || WT === 'mono' ? 'light' : WT === 'black' || WT === 'paper' ? 'dark' : Keychain.contains('study-ink') ? Keychain.get('study-ink') : 'auto'
// 투명 배경을 잘라 둘 때 잰 배경 밝기로 글자색 자동 (밝은 배경 → 먹색 · 어두운 배경 → 흰색)
const inkFile = bgPath(fam, RAWP) + '.ink'
if (inkMode === 'auto' && FM.fileExists(bgPath(fam, RAWP)) && FM.fileExists(inkFile)) { try { const v = FM.readString(inkFile).trim(); if (v === 'light' || v === 'dark') inkMode = v } catch (e) {} }
if (inkMode === 'light') { INK = new Color('#ffffff'); SOFT = new Color('#ffffff', 0.72); RULE = new Color('#ffffff', 0.3) }
if (inkMode === 'dark') { INK = new Color('#1e232b'); SOFT = new Color('#1e232b', 0.6); RULE = new Color('#1e232b', 0.2) }
if (!lock) {
  w.setPadding(P, P, P, P)
  const W2 = SZ[fam] || SZ.large, H2 = SZ.h[fam] || SZ.h.large, PAT = STM.widgetPattern
  const hasBg = FM.fileExists(bgPath(fam, RAWP)), pat = (PAT === 'grid' || PAT === 'line') && !hasBg ? PAT : ''
  if (WT === 'paper' || pat) {
    // 종이·무늬 배경: 2배 해상도로 한 번만 그려 파일에 두고 다시 씀 — 큰 위젯이 메모리 한도를 넘어 하얗게 비던 문제
    const dk = WT === 'night' || WT === 'mono' || (WT !== 'paper' && WT !== 'white' && WT !== 'black' && dark())
    const cp = FM.joinPath(FM.documentsDirectory(), 'study-cbg-3-' + WT + '-' + (pat || 'plain') + '-' + (dk ? 'd' : 'l') + '-' + Math.round(W2) + 'x' + Math.round(H2) + '.jpg')
    let img = null
    try { if (FM.fileExists(cp)) img = FM.readImage(cp) } catch (e) {}
    if (!img) {
      const PAPER = WT === 'paper' ? loadPaper() : null
      const K = 2, c = new DrawContext(); c.size = new Size(W2 * K, H2 * K); c.opaque = true; c.respectScreenScale = false
      c.setFillColor(new Color(WT === 'night' ? '#1b1d22' : WT === 'mono' ? '#1c1d21' : WT === 'paper' ? '#f2f2f1' : dk ? '#15181d' : '#f2f4f6')); c.fillRect(new Rect(0, 0, W2 * K, H2 * K))
      if (WT === 'paper' && PAPER) for (let x = 0; x < W2 * K; x += 720) for (let y = 0; y < H2 * K; y += 720) c.drawImageInRect(PAPER, new Rect(x, y, 720, 720))
      if (pat) {
        c.setFillColor(new Color(dk ? '#ffffff' : '#55658a', dk ? 0.07 : 0.1))
        const g = (pat === 'grid' ? 14 : 20) * K
        for (let y = g; y < H2 * K; y += g) c.fillRect(new Rect(0, y, W2 * K, 1))
        if (pat === 'grid') for (let x = g; x < W2 * K; x += g) c.fillRect(new Rect(x, 0, 1, H2 * K))
      }
      img = c.getImage()
      if (WT !== 'paper' || PAPER) try { FM.writeImage(cp, img) } catch (e) {} // 결 이미지를 못 받았으면 다음에 다시
    }
    w.backgroundImage = img
  }
  else if (WT === 'night') w.backgroundColor = new Color('#1b1d22')
  else if (WT === 'mono') w.backgroundColor = new Color('#1c1d21')
  else if (hasBg) w.backgroundImage = FM.readImage(bgPath(fam, RAWP))
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
  CLEAR = st.widgetClear !== false && !lock // 기본 켬
  if (CLEAR) {
    // 투명·클리어 위젯: 한 단계 굵게, 흐린 글자도 또렷하게, 선도 진하게
    WSHIFT = Math.max(WSHIFT, 0) + 1
    inkDark = inkMode === 'dark'
    SOFT = inkMode === 'light' ? new Color('#ffffff', 0.9) : inkMode === 'dark' ? new Color('#1e232b', 0.85) : dyn('#2a2f38', '#e6e9ee', 0.85)
    RULE = inkMode === 'light' ? new Color('#ffffff', 0.5) : inkMode === 'dark' ? new Color('#1e232b', 0.35) : dyn('#2a2f38', '#e6e9ee', 0.35)
  }
  MH = innerH - Math.round(11 * SCALE) - 10
  const goal = st.goalDaily || 240
  const subjects = alive(data.study.subjects)
  const allSess = alive(data.study.sessions)
  const sessions = allSess.filter((s) => s.date === today)
  // 진행 중 타이머의 지금 구간(기록은 일시정지·정지 때 남음)까지 더한 오늘 공부 시간
  const T0 = data.timer && !(data.timer.end && data.timer.end < Date.now()) && !(data.timer.start && Date.now() - data.timer.start > 12 * 3600000) ? data.timer : null
  const SEG = T0 && !T0.paused && T0.start ? Math.max(T0.start + (T0.acc || 0), new Date(today + 'T00:00').getTime()) : null
  const done0 = sessions.reduce((a, s) => a + (s.dur || 0), 0)
  const mins = done0 + (SEG ? Math.max(0, Math.floor((Date.now() - SEG) / 60000)) : 0)
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
    c.setFillColor(new Color(dark() ? '#78808d' : '#8c94a1')); c.fillRect(new Rect(0, 11.6, 240, 1.2))
    return c.getImage()
  })())
  const strike = (parent, s, font) => { const k = parent.addStack(); k.backgroundImage = strikeImage(); t(k, s, font, SOFT).minimumScaleFactor = 0.85; return k }
  const ddAll = alive(data.study.ddays).filter((d) => d.date >= today).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.date.localeCompare(b.date))
  const ddN = (d) => Math.round((new Date(d.date) - new Date(today)) / 86400000)
  const ddT = (d) => (ddN(d) === 0 ? 'D-DAY' : 'D-' + ddN(d))
  // 시험까지 남은 주말 (오늘이 주말이면 이번 주말 포함, D-day 당일 주말은 빼고)
  const weekends = (d) => { let n = 0; const x = new Date(today + 'T00:00'), end = new Date(d.date + 'T00:00'); if (x.getDay() === 0) x.setDate(x.getDate() - 1); for (; x < end; x.setDate(x.getDate() + 1)) if (x.getDay() === 6) n++; return n }
  const dd = ddAll[KIND === 'dday' ? DDI : 0]
  const ddTxt = dd ? ddT(dd) : null
  DOODLE = st.widgetDoodle !== false
  if (st.widgetDdColor !== false && !MONO && !lock && ddAll[0] && ddAll[0].pinned && ddAll[0].color) DDHEX = ddAll[0].color
  const DDC = DDHEX ? new Color(DDHEX) : null
  const quotes = Object.keys(data.settings.quotes || {}).sort().map((k) => data.settings.quotes[k]).filter((q) => !q.deleted)
  const quote = pickQuote(quotes)?.text ?? null // 3시간마다 무작위 (앱과 같은 문구)
  const dateStr = DAY[d0.getDay()] + ' · ' + d0.getDate() + ' ' + MON[d0.getMonth()] + (STALE ? ' · ' + pad(STALE.getHours()) + ':' + pad(STALE.getMinutes()) : '') + (data.sv && data.sv > VER ? ' · 스크립트 업데이트' : '')
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
  if (TM) w.refreshAfterDate = new Date(Math.min(w.refreshAfterDate.getTime(), Date.now() + (TM.paused ? 3 : 1) * 60000)) // 타이머 중엔 더 자주 (진행선·%)
  // 위젯이 다시 그려지지 않아도 초 단위로 흐르는 시간
  const timerDate = (parent, size, thinFont) => { const d = parent.addDate(new Date(TM.mode === 'countdown' ? TM.end : TM.start)); d.applyTimerStyle(); d.font = thinFont ? thin(size) : tw(size); d.lineLimit = 1; d.minimumScaleFactor = 0.6; return d }
  // 오늘 공부 시간 · 목표까지 남은 시간: 타이머가 돌면 위젯을 다시 그리지 않아도 초 단위로 바뀜
  const liveDate = (parent, at, font, color) => { const d = parent.addDate(new Date(at)); d.applyTimerStyle(); d.font = font; if (color) d.textColor = color; d.lineLimit = 1; d.minimumScaleFactor = 0.5; return d }
  const studyLive = (parent, font, color) => (SEG ? liveDate(parent, SEG - done0 * 60000, font, color) : t(parent, hm(mins), font, color))
  const leftLive = (parent, font, color) => (SEG && mins < goal ? liveDate(parent, SEG + (goal - done0) * 60000, font, color) : t(parent, hm(Math.max(0, goal - mins)), font, color))
  const subMins = subjects.map((s) => ({ s, m: sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + (x.dur || 0), 0) })).filter((x) => x.m).sort((a, b) => b.m - a.m)

  const studyBig = (parent, size, width) => {
    const r = parent.addStack(); r.bottomAlignContent()
    studyLive(r, thin(size), INK).minimumScaleFactor = 0.5 // 폭이 모자라면 잘리지 않고 작아짐
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
      if (x.id) r.url = taskUrl(x.id) // 제목을 누르면 그 할 일 자세히 (중·대 위젯)
      if (x.done) { if (DOODLE) { const ck = r.addImage(tickImg(12)); ck.imageSize = new Size(10, 10) } else t(r, '✓', tw(TS - 2), SOFT); strike(r, x.title, tw(TS)) }
      else { const imp = x.priority >= 3; const mk = t(r, imp ? '•' : '–', tw(TS - 1), imp ? GOLD : SOFT); if (x.id) mk.url = doneUrl(x.id); t(r, x.title, imp ? F(TS, 'Medium') : tw(TS), INK).minimumScaleFactor = 0.85 } // 표시를 누르면 완료 · 중요는 진하게
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
  const monthGrid = (parent, cell, gap, showNum, cellH) => {
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
        const c = row.addStack(); c.size = new Size(cell, cellH || (showNum ? cell * 0.8 : cell * 0.72)); c.cornerRadius = Math.min(5, cell / 5)
        if (day < 1 || day > n) continue
        const key = y + '-' + pad(m + 1) + '-' + pad(day)
        const v = byDay[key] || 0, r = Math.min(1, v / goal)
        c.backgroundColor = v ? dyn('#66778f', '#9fadc4', 0.18 + 0.72 * r) : RULE
        if (key === today) { c.borderWidth = 1; c.borderColor = INK }
        // 대형: 날짜 + 그날 공부 시간 (칸 진하기 = 목표 대비)
        if (showNum) { const fg = r >= 0.6 ? dyn('#ffffff', '#15181d') : v ? INK : SOFT; c.layoutVertically(); c.setPadding(3, 4, 2, 2); t(c, day, label(8), fg); c.addSpacer(); if (v) t(c, hm(v), F(8, 'Medium'), fg).minimumScaleFactor = 0.6 }
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
    week7.forEach((x, i) => { const b = row.addStack(); b.size = new Size(bw, Math.max(2, Math.round((x.m / mx) * h))); b.cornerRadius = Math.min(3, bw / 3); b.backgroundColor = x.m ? (i === 6 ? fg : dyn('#66778f', '#9fadc4', 0.5)) : bg })
    return row
  }
  const wdRow = (parent, wd, size = 7) => { const gap = 4, bw = Math.floor((wd - gap * 6) / 7); const r = parent.addStack(); r.spacing = gap; week7.forEach((x, i) => { const c = r.addStack(); c.size = new Size(bw, Math.max(10, size + 4)); c.centerAlignContent(); t(c, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][x.wd], label(size), i === 6 ? GOLD : SOFT) }) }
  let FILL = false // true: 내용이 위젯 높이를 스스로 채움 (끝의 빈칸 밀기 안 함)
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
  if (ARG) { const fx = subjects.find((y) => String(y.name).replace(/\\s/g, '').toLowerCase() === ARG); if (fx) { QS.splice(QS.indexOf(fx), QS.includes(fx) ? 1 : 0); QS.unshift(fx) } }
  const startUrl = (s) => (RUN ? RUN + '?act=start&sid=' + encodeURIComponent(s ? s.id : '') : APP + '?timer=' + encodeURIComponent(s ? s.id : ''))
  const newUrl = (k) => APP + '?new=' + k

  // ── 이번 주 배치 · D-day까지 주차 (공용) ──
  const WKS = (st.weekStart ?? 1) % 7
  const wkStartOf = (x) => { const d = new Date(x); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() - WKS + 7) % 7)); return d }
  const bwStart = wkStartOf(d0)
  const bwDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(bwStart); d.setDate(d.getDate() + i); return ymd(d) })
  const bwOf = (k) => tasksAll.filter((x) => x.due === k)
  const WDN = ['일', '월', '화', '수', '목', '금', '토']
  const dots = (parent, list, z, max) => { const r = parent.addStack(); r.spacing = 2; for (const x of list.slice(0, max)) { const c = r.addStack(); c.size = new Size(z, z); c.cornerRadius = z / 2; if (x.done) c.backgroundColor = GOLD; else { c.borderWidth = 1; c.borderColor = SOFT } } if (list.length > max) t(r, '+', label(7), SOFT); return r }
  const wkDd = (() => { if (!ddAll.length) return null; if (ARG) { const f = ddAll.find((d) => String(d.title).split(' ').join('').toLowerCase().includes(ARG)); if (f) return f } return ddAll.slice().sort((a, b) => b.date.localeCompare(a.date))[0] })()
  const wkInfo = (() => {
    if (!wkDd) return null
    const cur = ymd(bwStart), end = ymd(wkStartOf(new Date(wkDd.date + 'T12:00:00')))
    const wGoal = +st.goalWeekly || (+st.goalDaily || 240) * 7
    const weeks = []
    const s0 = new Date(bwStart); s0.setDate(s0.getDate() - 7 * 8)
    for (let d = new Date(s0); ymd(d) <= end && weeks.length < 80; d.setDate(d.getDate() + 7)) {
      const k = ymd(d), e = new Date(d); e.setDate(e.getDate() + 6); const ke = ymd(e)
      const m = k <= cur ? allSess.filter((x) => x.date >= k && x.date <= ke).reduce((a, x) => a + (x.dur || 0), 0) : 0
      weeks.push({ k, m, r: Math.min(1, m / wGoal), now: k === cur, fut: k > cur, end: k === end })
    }
    const first = weeks.findIndex((x) => x.m > 0 || x.now)
    const left = Math.max(0, Math.round((new Date(wkDd.date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 864e5))
    return { weeks: weeks.slice(Math.max(0, first)), left, lw: Math.floor(left / 7), ld: left % 7 }
  })()
  const sq = (parent, x, z) => { const c = parent.addStack(); c.size = new Size(z, z); c.cornerRadius = 2; if (x.fut) { c.borderWidth = 0.8; c.borderColor = SOFT } else if (x.m) { c.backgroundColor = lock ? new Color('#ffffff', 0.25 + 0.75 * x.r) : dyn('#66778f', '#9fadc4', 0.2 + 0.75 * x.r) } else { c.borderWidth = 0.8; c.borderColor = SOFT } if (x.now) { c.borderWidth = 1.5; c.borderColor = INK } return c }
  const sqRows = (parent, list, z, gap, wd) => { const per = Math.max(1, Math.floor((wd + gap) / (z + gap))); for (let i = 0; i < list.length; i += per) { const r = parent.addStack(); r.spacing = gap; for (const x of list.slice(i, i + per)) sq(r, x, z); if (i + per < list.length) parent.addSpacer(gap) } }

  if (lock && KIND === 'class') {
    // ── 잠금 화면 · 시간표 ──
    const c = clCur || clNext
    if (fam === 'accessoryInline') {
      inline(c ? (clCur ? c.period + '교시 ' + c.title + ' ~' + clk(c.end) : '다음 ' + c.period + '교시 ' + c.title + ' ' + clk(c.start)) : CL.length ? '오늘 수업 끝' : '오늘 수업 없음')
    } else if (fam === 'accessoryCircular') {
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const row = (s, f) => { const a = z.addStack(); a.addSpacer(); t(a, s, f).minimumScaleFactor = 0.6; a.addSpacer() }
      if (c) { row(c.period + '교시', label(8)); row(c.title, tw(13)); row(clCur ? '~' + clk(c.end) : clk(c.start), label(8)) }
      else row(CL.length ? '끝' : '—', tw(14))
    } else {
      const r = w.addStack(); r.size = new Size(LK.rw, 0); r.centerAlignContent(); t(r, clCur ? '지금 ' + clCur.period + '교시' : clNext ? '다음 ' + clNext.period + '교시' : '시간표', label(8)); r.addSpacer(); if (c) t(r, clk(c.start) + '–' + clk(c.end), label(8))
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
      inline(ddTxt + ' ' + dd.title + ' · 주말 ' + weekends(dd) + '번')
    } else if (fam === 'accessoryCircular') {
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, ddN(dd) === 0 ? 'D-DAY' : ddN(dd), thin(ddN(dd) === 0 ? 14 : 24)).minimumScaleFactor = 0.5; a.addSpacer()
      const b = z.addStack(); b.addSpacer(); t(b, dd.title, label(8)).minimumScaleFactor = 0.6; b.addSpacer()
      const c2 = z.addStack(); c2.addSpacer(); t(c2, '주말 ' + weekends(dd), label(6)); c2.addSpacer()
    } else {
      const r = w.addStack(); r.size = new Size(LK.rw, 0); r.bottomAlignContent()
      t(r, ddTxt, thin(26)).minimumScaleFactor = 0.6; r.addSpacer()
      w.addSpacer(2)
      const r2 = w.addStack(); r2.size = new Size(LK.rw, 0); t(r2, dd.title, tw(12)).minimumScaleFactor = 0.7; r2.addSpacer(6); t(r2, dd.date.slice(5).replace('-', '.'), tw(10)); r2.addSpacer(); t(r2, '주말 ' + weekends(dd) + '번', tw(10))
      if (next) { w.addSpacer(2); const r3 = w.addStack(); t(r3, next.title + ' ' + ddT(next), tw(10)).textOpacity = 0.7; r3.addSpacer() }
    }
  } else if (lock && KIND === 'weeks') {
    // ── 잠금 화면 · D-day까지 주차 ──
    if (!wkInfo) inline('D-day 없음')
    else if (fam === 'accessoryInline') inline(wkDd.title + '까지 ' + wkInfo.lw + '주 ' + wkInfo.ld + '일')
    else if (fam === 'accessoryCircular') {
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, wkInfo.lw + '주', thin(20)).minimumScaleFactor = 0.6; a.addSpacer()
      const b = z.addStack(); b.addSpacer(); t(b, wkDd.title, label(8)).minimumScaleFactor = 0.6; b.addSpacer()
    } else {
      const r = w.addStack(); r.size = new Size(LK.rw, 0); r.bottomAlignContent(); t(r, wkDd.title + '까지', tw(11)).minimumScaleFactor = 0.7; r.addSpacer(); t(r, wkInfo.lw + '주 ' + wkInfo.ld + '일', tw(13))
      w.addSpacer(4)
      const z = 8, gap = 3, per = Math.floor((LK.rw + gap) / (z + gap)), list = wkInfo.weeks.length > per * 2 ? wkInfo.weeks.slice(-per * 2) : wkInfo.weeks
      sqRows(w, list, z, gap, LK.rw)
    }
  } else if (lock && KIND === 'board') {
    // ── 잠금 화면 · 이번 주 배치 (요일별 남은 할 일 수) ──
    const left = bwDays.map((k) => bwOf(k).filter((x) => !x.done).length)
    if (fam === 'accessoryInline') inline('이번 주 남은 할 일 ' + left.reduce((a, v) => a + v, 0) + '개')
    else if (fam === 'accessoryCircular') {
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, String(bwOf(today).filter((x) => !x.done).length), thin(22)); a.addSpacer()
      const b = z.addStack(); b.addSpacer(); t(b, '오늘 남음', label(7)); b.addSpacer()
    } else {
      const cw = Math.floor(LK.rw / 7)
      const r = w.addStack()
      bwDays.forEach((k, i) => { const c = r.addStack(); c.size = new Size(cw, 0); c.layoutVertically(); const a = c.addStack(); a.addSpacer(); t(a, WDN[new Date(k + 'T12:00:00').getDay()], k === today ? F(10, 'Medium') : label(9), k === today ? INK : SOFT); a.addSpacer(); c.addSpacer(3); const b = c.addStack(); b.addSpacer(); t(b, left[i] ? String(left[i]) : '·', k === today ? tw(17) : tw(14), INK); b.addSpacer() })
    }
  } else if (lock && TM && (KIND === 'default' || KIND === 'study' || KIND === 'quick' || KIND === 'timer')) {
    // ── 잠금 화면 · 진행 중 타이머 (초 단위로 흐름) ──
    if (fam === 'accessoryInline') {
      if (TM.paused) inline('일시정지 ' + TM.name + ' ' + hm(TM.pm)); else { const d = w.addDate(new Date(TM.mode === 'countdown' ? TM.end : TM.start)); d.applyTimerStyle(); d.lineLimit = 1 }
    } else if (fam === 'accessoryCircular') {
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const a = z.addStack(); a.addSpacer(); t(a, TM.name, label(8)).minimumScaleFactor = 0.6; a.addSpacer()
      const b = z.addStack(); b.addSpacer(); if (TM.paused) t(b, hm(TM.pm), tw(13)); else timerDate(b, 12); b.addSpacer()
      const c = z.addStack(); c.addSpacer(); t(c, TM.paused ? '일시정지' : TM.mode === 'countdown' ? '남음' : '공부 중', label(7)); c.addSpacer()
    } else {
      const r = w.addStack(); r.size = new Size(LK.rw, 0); r.centerAlignContent(); t(r, '● ' + TM.name, tw(11)); r.addSpacer(); t(r, TM.paused ? '일시정지' : TM.mode === 'countdown' ? '타이머' : '공부 중', label(8))
      w.addSpacer(1)
      const r2 = w.addStack(); if (TM.paused) t(r2, hm(TM.pm), thin(26)); else timerDate(r2, 26, true); r2.addSpacer()
      w.addSpacer(1)
      t(w, '오늘 ' + hm(mins) + ' / ' + hm(goal), tw(10))
    }
  } else if (lock && KIND !== 'default') {
    // ── 잠금 화면 · 유형별 (글자·스택만, 이미지 없음) ──
    const inl = fam === 'accessoryInline', circ = fam === 'accessoryCircular'
    const cRows = (rows, ratio) => { // 원형: 가운데 정렬 줄들 (+ 진행선)
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      for (const [s, f] of rows) { const a = z.addStack(); a.addSpacer(); const x = t(a, s, f); x.minimumScaleFactor = 0.5; a.addSpacer() }
      if (ratio != null) cline(z, ratio)
    }
    if (KIND === 'pct') {
      // 원형 · 공부 진행: 큰 % + 진행선
      cRows([[pct + '%', thin(22)], ['공부 ' + hm(mins), label(7)]], mins / goal)
    } else if (KIND === 'mins') {
      // 원형 · 다음 일정까지(진행 중이면 끝까지) 흐르는 시간 크게
      const c = nCur || nNext
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const rowC = (fn) => { const a = z.addStack(); a.addSpacer(); fn(a); a.addSpacer() }
      if (c) { rowC((a) => t(a, nCur ? '끝까지' : '시작까지', label(7))); rowC((a) => timerTo(a, nCur ? c.e : c.s, thin(17))); rowC((a) => t(a, c.t, label(7)).minimumScaleFactor = 0.5) }
      else rowC((a) => t(a, '—', tw(16)))
      const b = c ? (nCur ? c.e : c.s) : null; if (b != null) { const at = atMin(b); if (at > new Date()) w.refreshAfterDate = new Date(Math.min(w.refreshAfterDate.getTime(), at.getTime())) }
    }
    const rRow = (l, r, lf = tw(11), rf = label(8)) => { const a = w.addStack(); a.size = new Size(LK.rw, 0); a.centerAlignContent(); t(a, l, lf).minimumScaleFactor = 0.7; a.addSpacer(); if (r) { a.addSpacer(4); t(a, r, rf) } return a } // 오른쪽 값은 오른쪽 끝에
    const dayMins = {}
    for (const x of allSess) dayMins[x.date] = (dayMins[x.date] || 0) + (x.dur || 0)
    const ymdOff = (k) => { const d = new Date(d0); d.setDate(d.getDate() - k); return ymd(d) }
    if (KIND === 'study' || KIND === 'timer') {
      const ws = st.weekStart ?? 1, back = (d0.getDay() - ws + 7) % 7
      let week = 0; for (let k = 0; k <= back; k++) week += dayMins[ymdOff(k)] || 0
      const yday = dayMins[ymdOff(1)] || 0
      if (inl) inline('공부 ' + hm(mins) + ' / ' + hm(goal) + ' · ' + pct + '%')
      else if (circ) cRows([[hm(mins), tw(14)], [pct + '%', label(8)]], mins / goal)
      else {
        const r = w.addStack(); r.size = new Size(LK.rw, 0); r.bottomAlignContent(); studyLive(r, thin(22)); r.addSpacer(4); t(r, '/ ' + hm(goal), tw(10)); r.addSpacer(); t(r, pct + '%', tw(11))
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
    } else if (KIND === 'habit') {
      const hs = HABITS(), on = hs.filter((x) => x.on).length, nx = hs.find((x) => !x.on); w.url = link('habits')
      if (inl) inline(hs.length ? '습관 ' + on + '/' + hs.length + (nx ? ' · ' + nx.t : ' · 모두 완료') : '습관 없음')
      else if (circ) cRows(hs.length ? [[on + '/' + hs.length, tw(14)], ['HABITS', label(6)]] : [['—', tw(14)]], hs.length ? on / hs.length : null)
      else { rRow('습관 ' + on + '/' + hs.length, nx ? '' : '모두 완료', tw(11), label(7)); for (const h of hs.filter((x) => !x.on).slice(0, 2)) t(w, '· ' + h.t, tw(9.5), null, 1) }
    } else if (KIND === 'note') {
      const n = pickNote(); w.url = noteUrl(n)
      if (inl) inline(n ? n.t : '노트 없음')
      else if (circ) cRows([['NOTE', label(7)], [n ? n.t : '없음', tw(11)]])
      else { rRow(n ? n.t : '노트 없음', n ? noteAgo(n.u) : '', tw(11), label(7)); for (const l of (n ? n.l : []).slice(0, 2)) t(w, (l.k === 'todo' ? (l.d ? '✓ ' : '· ') : l.k === 'b' ? '· ' : '') + l.x, tw(9.5), null, 1) }
    } else if (KIND === 'quote') {
      const q = quote || '앱에서 다짐을 적어 보세요'
      if (inl) inline(q)
      else if (circ) { const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.setPadding(4, 4, 4, 4); z.centerAlignContent(); const x = t(z, q, tw(9), null, 4); x.centerAlignText(); x.minimumScaleFactor = 0.5 }
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
      // 타이머가 돌면 공부 시간 자리에 타이머
      if (inl) { if (TM && !TM.paused) { const d = w.addDate(new Date(TM.mode === 'countdown' ? TM.end : TM.start)); d.applyTimerStyle(); d.lineLimit = 1 } else inline((dd ? ddTxt + ' · ' : '') + (c ? clk(c.s) + ' · ' : '') + (TM ? TM.name + ' 일시정지 ' + hm(TM.pm) : '공부 ' + hm(mins))) }
      else if (circ && TM) {
        const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
        const rowC = (fn) => { const a2 = z.addStack(); a2.addSpacer(); fn(a2); a2.addSpacer() }
        rowC((a2) => t(a2, TM.name, label(8)).minimumScaleFactor = 0.6); rowC((a2) => { if (TM.paused) t(a2, hm(TM.pm), tw(13)); else timerDate(a2, 12) }); rowC((a2) => t(a2, TM.paused ? '일시정지' : '공부 중', label(7)))
      }
      else if (circ) cRows([[hm(mins), tw(14)], [pct + '%', label(7)]], mins / goal)
      else {
        // 크게 두 개(D-day · 공부 시간) + 아래 한 줄(일정 · %) — 잠금 화면에서 잘 보이게 굵고 넉넉하게
        const r1 = w.addStack(); r1.size = new Size(LK.rw, 0); r1.bottomAlignContent()
        t(r1, dd ? ddTxt : '—', F(20, 'Regular')).minimumScaleFactor = 0.6; r1.addSpacer()
        if (TM && !TM.paused) { const d = r1.addDate(new Date(TM.mode === 'countdown' ? TM.end : TM.start)); d.applyTimerStyle(); d.font = F(20, 'Regular'); d.lineLimit = 1; d.minimumScaleFactor = 0.6; d.rightAlignText() } else t(r1, hm(TM ? TM.pm : mins), F(20, 'Regular')).minimumScaleFactor = 0.6
        w.addSpacer(3)
        const r2 = w.addStack(); r2.size = new Size(LK.rw, 0); r2.centerAlignContent()
        t(r2, c ? clk(c.s) + ' ' + c.t : dd ? dd.title : '남은 일정 없음', F(12, 'Regular')).minimumScaleFactor = 0.7; r2.addSpacer(); t(r2, pct + '%', F(12, 'Regular')) // 왼쪽 글자는 왼쪽 끝, % 만 오른쪽 끝
        w.addSpacer(4)
        lbar(w, mins / goal, LK.rw, 3)
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
    } else if (KIND === 'tbl' || KIND === 'boardn' || KIND === 'photo') {
      const TBS = Array.isArray(data.tables) ? data.tables : [], BDS = Array.isArray(data.boards) ? data.boards : []
      const tb = (ARG && TBS.find((x) => nzT(x.t).includes(ARG))) || TBS[0], bd = (ARG && BDS.find((x) => nzT(x.t).includes(ARG))) || BDS[0]
      const head = KIND === 'tbl' ? 'TABLE' : KIND === 'boardn' ? 'BOARD' : 'PHOTO'
      const s = KIND === 'tbl' ? (tb ? tb.t + ' · ' + (tb.r[tb.h ? 1 : 0] || []).slice(0, 2).join(' ') : '표 없음') : KIND === 'boardn' ? (bd ? bd.c.map((c) => c.n + ' ' + c.k).join(' · ') : '보드 없음') : '사진은 홈 화면 위젯에서'
      if (inl) inline(s)
      else if (circ) cRows([[head, label(7)], [KIND === 'boardn' && bd ? String(bd.c[0] ? bd.c[0].k : 0) : '·', tw(16)], [KIND === 'boardn' && bd && bd.c[0] ? bd.c[0].n : '', label(7)]])
      else { rRow(head, KIND === 'tbl' ? (tb ? tb.t : '') : KIND === 'boardn' ? (bd ? bd.t : '') : '', label(8), label(8)); t(w, s, tw(11), INK, 3).minimumScaleFactor = 0.8 }
    }
  } else if (lock) {
    // ── 잠금 화면 ──
    if (fam === 'accessoryInline') {
      inline(hm(mins) + (dd ? ' · ' + ddTxt + ' ' + dd.title : ''))
    } else if (fam === 'accessoryCircular') {
      const z = w.addStack(); z.size = new Size(LK.c, LK.c); z.layoutVertically(); z.centerAlignContent()
      const row = (s, f) => { const a = z.addStack(); a.addSpacer(); t(a, s, f).minimumScaleFactor = 0.6; a.addSpacer() }
      if (KIND === 'dday' && dd) { row(ddN(dd) === 0 ? 'D' : String(ddN(dd)), thin(20)); row('D-DAY', label(7)) }
      else { row(hm(mins), tw(14)); row(pct + '%', label(8)); cline(z, mins / goal) }
    } else {
      const r = w.addStack(); r.size = new Size(LK.rw, 0); r.bottomAlignContent()
      studyLive(r, thin(22)); r.addSpacer(4); t(r, '/ ' + hm(goal), tw(10)); r.addSpacer(); if (dd) t(r, ddTxt, tw(12))
      w.addSpacer(4)
      lbar(w, mins / goal, LK.rw)
      w.addSpacer(5)
      t(w, KIND === 'dday' && dd ? dd.title : todo[0] ? '– ' + todo[0].title : (dd ? dd.title : 'All clear.'), tw(11))
    }
`
