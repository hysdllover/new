// EXAM_CORE — 어학 스터디 위젯 본체 (Scriptable). 로더가 앱 주소에서 받아 실행: importModule(path)({ SRC, APP })
// Parameter: 비우면 기본 · 디데이 · 할일 · 점수 · 교재 (잠금 화면 · 한 줄 위젯도 같은 이름)
// 토큰 없음: widget.json 의 비공개 gist raw 주소(SRC)만 읽음 · 15분마다 새로 그리기 요청 (너무 잦은 동기화 X)
module.exports = async function ({ SRC, APP }) {
  const fam = config.widgetFamily || 'medium'
  const lock = fam.startsWith('accessory'), inline = fam === 'accessoryInline', circ = fam === 'accessoryCircular'
  const KIND = ({ '': 'base', '디데이': 'dday', '할일': 'todo', '점수': 'score', '교재': 'books' })[String(args.widgetParameter || '').trim()] || 'base'
  const fm = FileManager.local(), cachePath = fm.joinPath(fm.documentsDirectory(), 'exam-widget-cache.json')

  // ── 데이터: 받아 오고, 안 되면 지난번 것 ──
  let D = null
  if (SRC) {
    try { const r = new Request(SRC + (SRC.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000)); r.timeoutInterval = lock ? 5 : 10; D = await r.loadJSON(); if (D && D.v) fm.writeString(cachePath, JSON.stringify(D)) } catch (e) { D = null }
  }
  if (!D || !D.v) { try { if (fm.fileExists(cachePath)) D = JSON.parse(fm.readString(cachePath)) } catch (e) { D = null } }

  // ── 색 · 글씨 (늘 밝게 · 기본은 블루그레이) ──
  const TH = {
    basic: { bg: '#f5f6f8', ink: '#3d4a5e', soft: '#8794a8', rule: '#d9dee6', acc: '#5b6b86' },
    paper: { bg: '#fbfbf9', ink: '#3a4659', soft: '#8a93a2', rule: '#dedfdb', acc: '#4a5a78' },
    pencil: { bg: '#fcfcfa', ink: '#45484e', soft: '#8d9096', rule: '#d8d8d4', acc: '#5d6066' },
  }[(D && D.theme) || 'basic'] || null
  const C = (h, a) => new Color(h, a == null ? 1 : a)
  const INK = lock ? Color.white() : C(TH.ink), SOFT = lock ? C('#ffffff', 0.7) : C(TH.soft), RULE = lock ? C('#ffffff', 0.35) : C(TH.rule), ACC = lock ? Color.white() : C(TH.acc)
  const F = (s, w) => (w === 'b' ? Font.mediumSystemFont(s) : w === 't' ? Font.thinSystemFont(s) : Font.lightSystemFont(s))
  const LAB = (s) => Font.mediumSystemFont(s)

  const w = new ListWidget()
  if (!lock) { w.backgroundColor = C(TH.bg); w.setPadding(14, 15, 14, 15) }
  w.url = APP + '?go=home'
  w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
  const t = (p, s, font, color, lines) => { const x = p.addText(String(s)); x.font = font; x.textColor = color || INK; x.lineLimit = lines || 1; return x }
  const cap = (p, s) => { const x = t(p, String(s).toUpperCase(), LAB(8), SOFT); return x }

  // 크기 (pt): 줄 · 막대 그림 폭에만 씀 (나머지는 늘어나는 칸)
  const sc = Device.screenSize(), sw = Math.min(sc.width, sc.height)
  const PAD = Device.isPad(), SZ = PAD ? (sw >= 1000 ? [170, 379, 795] : sw >= 820 ? [155, 342, 715] : [141, 305, 634]) : (sw >= 428 ? [170, 364, 364] : sw >= 390 ? [158, 338, 338] : [155, 329, 329])
  const WID = ({ small: SZ[0], medium: SZ[1], large: SZ[1], extraLarge: SZ[2] })[fam] || SZ[1]
  const inner = WID - 30

  // ── 날짜 ──
  const pad2 = (n) => String(n).padStart(2, '0')
  const ymd = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  const now = new Date(), today = ymd(now)
  const dOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
  const diff = (a, b) => Math.round((dOf(a) - dOf(b)) / 86400000)
  const dday = (k) => { if (!k) return '—'; const n = diff(k, today); return n > 0 ? 'D-' + n : n === 0 ? 'D-DAY' : 'D+' + -n }
  const md = (k) => +k.slice(5, 7) + '.' + +k.slice(8)

  // 가는 선 · 막대 (그림)
  const lineImg = (r, wd, color) => { const c = new DrawContext(); c.size = new Size(wd, 3); c.opaque = false; c.respectScreenScale = true; c.setFillColor(RULE); c.fillRect(new Rect(0, 1, wd, 1)); c.setFillColor(color || ACC); c.fillRect(new Rect(0, 0.5, Math.max(0, Math.min(1, r)) * wd, 2)); return c.getImage() }
  const pline = (p, r, wd, color) => { const im = p.addImage(lineImg(r, wd, color)); im.imageSize = new Size(wd, 3); return im }

  if (!D || !D.v) {
    t(w, '어학 스터디', F(13, 'b')); w.addSpacer(4)
    t(w, SRC ? '아직 받은 데이터가 없어요 · 앱에서 동기화한 뒤 다시 열어 주세요' : '앱 › 설정 › 위젯에서 로더를 다시 복사해 주세요', F(11), SOFT, 4)
    return done()
  }

  // ── 고르기 ──
  const exams = (D.exams || []).filter((e) => !e.date || e.date >= today)
  const ex0 = exams[0]
  const tasks = (D.tasks || []).filter((x) => x.due && (x.due < today ? !x.done : x.due === today && (!x.done || (x.doneAt && ymd(new Date(x.doneAt)) === today))))
  tasks.sort((a, b) => (a.done - b.done) || (a.due < today) - (b.due < today))
  const left = tasks.filter((x) => !x.done).length

  // ── 잠금 화면 ──
  if (lock) {
    if (inline) {
      const s = KIND === 'todo' ? (left ? '할 일 ' + left + '개 · ' + (tasks.find((x) => !x.done) || {}).t : '오늘 할 일 끝') : KIND === 'score' && ex0 ? ex0.name + ' ' + (ex0.last ?? '—') + (ex0.target ? '/' + ex0.target : '') : ex0 ? ex0.name + ' ' + dday(ex0.date) : '시험 없음'
      w.addText(s.length > 28 ? s.slice(0, 27) + '…' : s)
      return done()
    }
    if (circ) {
      w.addSpacer()
      const big = KIND === 'todo' ? String(left) : KIND === 'score' ? String(ex0 && ex0.last != null ? ex0.last : '—') : ex0 ? dday(ex0.date).replace('D-', '') : '—'
      const sub = KIND === 'todo' ? 'TO DO' : KIND === 'score' ? 'SCORE' : ex0 ? ex0.name : 'D-DAY'
      const a = t(w, big, F(big.length > 4 ? 14 : 20, 't'), INK); a.centerAlignText(); a.minimumScaleFactor = 0.5
      const b = t(w, sub, LAB(7), SOFT); b.centerAlignText(); b.minimumScaleFactor = 0.6
      w.addSpacer()
      return done()
    }
    // 직사각형: 3줄
    const rRow = (l, r) => { const s = w.addStack(); s.centerAlignContent(); t(s, l, F(11), INK).minimumScaleFactor = 0.8; s.addSpacer(); if (r) t(s, r, LAB(9), SOFT); w.addSpacer(1) }
    if (KIND === 'todo') { for (const x of tasks.filter((y) => !y.done).slice(0, 3)) rRow(x.t, x.area || ''); if (!left) t(w, '오늘 할 일 끝', F(11)) }
    else if (KIND === 'score') { for (const e of exams.slice(0, 3)) rRow(e.name, (e.last ?? '—') + (e.target ? ' / ' + e.target : '')); if (!exams.length) t(w, '시험 없음', F(11)) }
    else { for (const e of exams.slice(0, 3)) rRow(e.name + (e.sub ? ' · ' + e.sub : ''), dday(e.date)); if (!exams.length) t(w, '시험을 추가해 보세요', F(11)) }
    return done()
  }

  // ── 홈 화면 조각 ──
  const head = (p, l, r) => { const h = p.addStack(); h.centerAlignContent(); cap(h, l); h.addSpacer(); if (r) t(h, r, LAB(8), SOFT); p.addSpacer(8) }
  const ddBlock = (p, e, size) => {
    if (!e) { t(p, '시험 없음', F(12), SOFT); return }
    const r = p.addStack(); r.bottomAlignContent()
    t(r, dday(e.date), F(size, 't'), e.color ? C(e.color) : INK).minimumScaleFactor = 0.6
    p.addSpacer(2)
    t(p, e.name + (e.sub ? ' · ' + e.sub : ''), F(12, 'b'), INK).minimumScaleFactor = 0.8
    if (e.date) t(p, md(e.date) + (e.target ? '  ·  목표 ' + e.target : ''), F(10), SOFT)
  }
  // 오늘 할 일 진행: 남은 개수 + 끝낸 만큼 선
  const todayBlock = (p, wd) => {
    const n = tasks.length, r = p.addStack(); r.bottomAlignContent()
    t(r, String(left), F(26, 't')); r.addSpacer(5); t(r, n ? '남은 할 일 / ' + n : '오늘 할 일 없음', F(11), SOFT)
    p.addSpacer(5); pline(p, n ? (n - left) / n : 0, wd)
  }
  const moreExams = (p, n) => { for (const e of exams.slice(1, 1 + n)) { const r = p.addStack(); r.centerAlignContent(); const sw0 = r.addStack(); sw0.size = new Size(6, 6); sw0.backgroundColor = e.color ? C(e.color) : SOFT; r.addSpacer(6); t(r, e.name + (e.sub ? ' · ' + e.sub : ''), F(11)).minimumScaleFactor = 0.8; r.addSpacer(); t(r, dday(e.date), F(11), SOFT); p.addSpacer(3) } }
  const taskRows = (p, n, fs) => {
    const L = tasks.slice(0, n)
    for (const x of L) {
      const r = p.addStack(); r.centerAlignContent(); r.spacing = 6; r.url = APP + '?done=' + encodeURIComponent(x.id)
      const box = r.addStack(); box.size = new Size(fs - 2, fs - 2); box.borderWidth = 1; box.borderColor = x.done ? SOFT : ACC; box.cornerRadius = 1
      if (x.done) box.backgroundColor = C(TH.soft, 0.35)
      const tx = t(r, x.t, F(fs), x.done ? SOFT : INK); tx.minimumScaleFactor = 0.8
      r.addSpacer()
      if (x.due < today) t(r, md(x.due), F(9), ACC)
      else if (x.area) t(r, x.area, F(9), SOFT)
      p.addSpacer(4)
    }
    if (!L.length) t(p, '오늘 할 일이 없어요', F(fs), SOFT)
    else if (tasks.length > n) t(p, '+ ' + (tasks.length - n), F(10), SOFT)
  }
  const col = (p, wd) => { const s = p.addStack(); s.layoutVertically(); if (wd) s.size = new Size(wd, 0); return s }
  const vrule = (p, h) => { const s = p.addStack(); s.size = new Size(0.6, h); s.backgroundColor = RULE }

  if (KIND === 'dday') {
    head(w, 'D-DAY', exams.length > 1 ? exams.length + ' EXAMS' : '')
    ddBlock(w, ex0, fam === 'small' ? 34 : 44)
    if (fam !== 'small' && exams.length > 1) {
      w.addSpacer(10)
      moreExams(w, fam === 'medium' ? 2 : 6)
    }
    w.url = APP + '?go=exam'
  } else if (KIND === 'todo') {
    head(w, 'TO DO', tasks.length ? (tasks.length - left) + ' / ' + tasks.length : '')
    taskRows(w, fam === 'small' ? 4 : fam === 'medium' ? 4 : 12, fam === 'small' ? 11 : 12.5)
    w.url = APP + '?go=plan.list'
  } else if (KIND === 'score') {
    head(w, 'SCORE', '')
    const L = exams.filter((e) => e.last != null || e.target).slice(0, fam === 'small' ? 1 : fam === 'medium' ? 2 : 5)
    for (const e of L) {
      const r = w.addStack(); r.bottomAlignContent(); t(r, e.name, F(11, 'b')); r.addSpacer(); t(r, e.last != null ? String(e.last) : '—', F(fam === 'small' ? 22 : 18, 't')); t(r, ' / ' + (e.target || e.max), F(10), SOFT)
      w.addSpacer(3); pline(w, e.last != null ? e.last / (e.target || e.max) : 0, inner, e.color ? C(e.color) : null)
      if (fam !== 'small') { w.addSpacer(2); t(w, (e.lastDate ? '최근 ' + md(e.lastDate) : '아직 점수 없음') + (e.pass ? '  ·  합격 ' + e.pass : '') + (e.trend && e.trend.length > 1 ? '  ·  ' + e.trend.join(' › ') : ''), F(9), SOFT) }
      w.addSpacer(8)
    }
    if (!L.length) t(w, '시험 점수를 기록해 보세요', F(11), SOFT)
    w.url = APP + '?go=exam'
  } else if (KIND === 'books') {
    head(w, 'BOOKS', '')
    const B = (D.books || []).slice(0, fam === 'small' ? 2 : fam === 'medium' ? 3 : 6)
    for (const b of B) { const r = w.addStack(); t(r, b.t, F(11)).minimumScaleFactor = 0.8; r.addSpacer(); t(r, b.cur + '/' + b.total + b.unit, F(10), SOFT); w.addSpacer(3); pline(w, b.cur / b.total, inner); w.addSpacer(7) }
    if (!B.length) t(w, '진행 중인 교재가 없어요', F(11), SOFT)
    w.url = APP + '?go=plan.books'
  } else {
    // 기본: 소형 D-day + 남은 할 일 · 중형 이상 왼쪽 D-day · 할 일 진행 (대형은 + 다른 시험) / 오른쪽 할 일
    if (fam === 'small') {
      ddBlock(w, ex0, 30); w.addSpacer(); todayBlock(w, inner)
    } else {
      const row = w.addStack(); row.topAlignContent()
      const lw = Math.floor(inner * (fam === 'extraLarge' ? 0.36 : 0.44)), L0 = col(row, lw)
      ddBlock(L0, ex0, fam === 'medium' ? 30 : 40); L0.addSpacer(fam === 'medium' ? 10 : 16); todayBlock(L0, lw)
      if (fam !== 'medium' && exams.length > 1) { L0.addSpacer(16); moreExams(L0, 6) }
      L0.addSpacer()
      row.addSpacer(12); vrule(row, fam === 'medium' ? 110 : 300); row.addSpacer(12)
      const R0 = col(row, inner - lw - 25)
      head(R0, 'TO DO', tasks.length ? (tasks.length - left) + '/' + tasks.length : '')
      taskRows(R0, fam === 'medium' ? 4 : 13, fam === 'medium' ? 11.5 : 12.5)
      R0.addSpacer()
    }
  }
  return done()

  function done() {
    if (config.runsInWidget) Script.setWidget(w)
    else if (fam === 'small') w.presentSmall(); else if (fam === 'large') w.presentLarge(); else w.presentMedium()
    Script.complete()
  }
}
