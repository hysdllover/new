// 위젯 본체 (공통: 색·글꼴·데이터 받기·바로 처리(act)·배경) — Scriptable 에서 실행되는 코드를 글자로 담음. 네 조각을 이어 붙여 본체가 됨
// 템플릿 문자열 안: 백슬래시는 두 번, 백틱 금지
import { pickQuote } from '../quote.js'
import { SCRIPT_VER } from '../scriptable.js'
export default () => `const VER = ${SCRIPT_VER}
let MONO = false
const nC = (h, a = 1) => {
  if (!MONO) return new  Color(h, a)
  const x = String(h).replace('#', ''), f = x.length === 3 ? x.split('').map((c) => c + c).join('') : x.slice(0, 6)
  if (/^f{6}$/i.test(f)) return new  Color('#ffffff', a)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255), L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return new  Color('#ffffff', (L > 0.78 || L < 0.22 ? 0.25 : 0.9) * a) // 아주 밝거나 어두운 색(선·바탕) → 옅게, 나머지(포인트) → 진하게
}

const dyn = (l, d, a = 1) => Color.dynamic(new Color(l, a), new Color(d, a))
const BG = dyn('#f2f4f6', '#15181d')
let INK = dyn('#2a2f38', '#e6e9ee')
let SOFT = dyn('#8c94a1', '#78808d')
let GOLD = dyn('#66778f', '#9fadc4')
let RULE = dyn('#dce1e7', '#2a2f37')

// 폰트 — 한글·영문·숫자 한 서체로 통일. 기본 애플 산돌고딕 얇게, 앱 설정에서 설치한 폰트(PostScript 이름) 지정 가능
let CUSTOM = '', SCALE = 1, WSHIFT = 0, CLEAR = false
// 앱 설정의 위젯 글자 크기(SCALE)·굵기(WSHIFT: -1 얇게 · 0 기본 · 1 보통 · 2 진하게)
const WTS = ['UltraLight', 'Thin', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold']
// CLEAR(투명·클리어 위젯): 아주 작은 글자는 9pt 이상으로, 전체 6% 크게
const F = (s, wt = 'Light') => new Font(CUSTOM || 'AppleSDGothicNeo-' + WTS[Math.max(0, Math.min(6, WTS.indexOf(wt) + WSHIFT))], Math.round((CLEAR ? Math.max(s, 9) * 1.06 : s) * SCALE * 2) / 2)
const tw = (s) => F(s, 'Light')
const thin = (s) => F(s, 'Thin')
const label = (s) => F(s, 'Regular')

// Parameter → 유형 (앱에서 미리보기할 땐 고른 Parameter 로 다시 정함)
const KINDS = { '공부': 'study', '할일': 'todo', '디데이': 'dday', 'd-day': 'dday', '달력': 'month', '캘린더': 'cal', '일정': 'cal', calendar: 'cal', '다짐': 'quote', '시간표': 'class', '수업': 'class', class: 'class', '주간': 'week', week: 'week', '과목': 'subj', subj: 'subj', '지금': 'now', '다음': 'now', now: 'now', '진도': 'prog', prog: 'prog', '목표': 'goals', goals: 'goals', '오늘': 'today', today: 'today', '대시보드': 'dash', dash: 'dash', '내일': 'tmrw', tomorrow: 'tmrw', '마감': 'due', due: 'due', '일주일': 'week7', '7일': 'week7', week7: 'week7', '디데이목록': 'ddl', ddl: 'ddl', '바로가기': 'quick', '시작': 'quick', quick: 'quick', '구성': 'custom', '내위젯': 'custom', custom: 'custom', '타이머': 'timer', '스톱워치': 'timer', timer: 'timer', '진행': 'pct', '공부진행': 'pct', pct: 'pct', '남은분': 'mins', '분': 'mins', mins: 'mins', '노트': 'note', '메모': 'note', note: 'note', '습관': 'habit', habit: 'habit', '시리즈': 'series', series: 'series', '배치': 'board', '주간배치': 'board', board: 'board', '주차': 'weeks', weeks: 'weeks', '표': 'tbl', table: 'tbl', '보드': 'boardn', '사진': 'photo', photo: 'photo', '10분': 'ten', '플래너': 'ten', ten: 'ten', '하루': 'dayline', '하루진행': 'dayline', dayline: 'dayline', '한줄': 'line1', '문장': 'line1', line1: 'line1', '공책': 'nb', '한주': 'nb', nb: 'nb', '숫자': 'big', big: 'big', '선그래프': 'spark', '선': 'spark', spark: 'spark', '원호': 'arc', arc: 'arc', '메모지': 'memo', memo: 'memo', '인쇄': 'print', print: 'print', '반반': 'split', split: 'split', '큰수': 'hero', hero: 'hero', '세단': 'three', three: 'three', '자동': 'auto', auto: 'auto', '묶음': 'pair', pair: 'pair', study: 'study', todo: 'todo', dday: 'dday', month: 'month', quote: 'quote' }
let RAWP, PARAM, DDI, KIND, BASEKIND, ARG
function setParam(raw) {
  RAWP = String(raw || '').replace(/\\s/g, '').toLowerCase()
  const P0 = RAWP.split('@')[0] // "공부@2" 처럼 @ 뒤는 배경 구분용
  PARAM = P0.split(':')[0]; ARG = P0.split(':')[1] || '' // "시작:수학" → 과목 고정
  DDI = Math.max(0, (+(PARAM.match(/(\\d)$/) || [])[1] || 1) - 1) // 디데이2 → 두 번째 D-day
  KIND = BASEKIND = KINDS[PARAM.replace(/\\d$/, '')] || 'default'
}
setParam(args.widgetParameter)
const pickQuote = ${pickQuote.toString()}
// 위젯에서 바로 처리(토큰을 Scriptable 보관함에 저장했을 때): 타이머 화면 대신 이 스크립트를 실행해 시작·정지·기록
let RUN = null
// GitHub 오류 설명 (404 = 이 토큰으로는 동기화 저장소가 안 보임 → Gist 권한 없는 토큰)
const ghErr = (sc) => (sc === 401 ? '토큰이 만료됐거나 틀려요. 메뉴 › 위젯에서 바로 처리 끄기 → 다시 켜기로 새 토큰을 넣어 주세요.' : sc === 404 || sc === 403 ? '이 토큰으로는 동기화 저장소에 접근할 수 없어요 (오류 ' + sc + ').\\n앱 동기화에 쓰는 토큰(Gist 권한)을 넣어 주세요. 알림용 Actions 토큰은 안 돼요.\\n메뉴 › 위젯에서 바로 처리 끄기 → 다시 켜기' : 'GitHub 오류 ' + sc)
// 토큰 저장 전에 실제로 동기화 저장소에 접근되는지 확인
async function tokenOk(tok) { if (!data || !data.gid) return '위젯 데이터에 저장소 정보가 아직 없어요. 홈 화면 앱을 한 번 열어 동기화한 뒤 다시 해 주세요.'; try { const r = new Request('https://api.github.com/gists/' + data.gid); r.headers = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }; await r.loadString(); const sc = r.response && r.response.statusCode; return sc && sc >= 300 ? ghErr(sc) : null } catch (e) { return String(e.message || e) } }
const link = (path) => (/^(https?|scriptable):/.test(path || '') ? path : RUN && path === 'study.timer' ? RUN + '?act=timer' : RUN ? RUN + '?act=view&go=' + encodeURIComponent(path || '') : APP + (path ? '?go=' + path : ''))
// 위젯에서 할 일 누르기: 확인 없이 바로 완료 (앱이 잠깐 열렸다가 완료 · 되돌리기 가능)
// 위젯에서 할 일 제목 누르기: 그 할 일 자세히 (완료는 앞의 표시를 누름)
const taskUrl = (id) => (RUN ? RUN + '?act=view&go=tasks' : APP + '?task=' + encodeURIComponent(id))
const doneUrl = (id) => (RUN ? RUN + '?act=done&id=' + encodeURIComponent(id) : APP + '?done=' + encodeURIComponent(id) + '&quick=1')

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
let DDHEX = null // 별표한 D-day 색 (진행선 · D-day 숫자 포인트)
let PENCIL = false // 종이 테마: 연필 빗금 진행선 · 연필 체크
function line(ratio, w, fg, bg) {
  const c = new DrawContext(); c.size = new Size(w, 3); c.opaque = false; c.respectScreenScale = true
  if (PENCIL) {
    c.setFillColor(new Color(bg || '#c9cbcf')); c.fillRect(new Rect(0, 1.25, w, 0.5))
    c.setStrokeColor(new Color(fg || DDHEX || '#66778f')); c.setLineWidth(0.9)
    for (let x = 0; x < Math.max(2, w * Math.min(1, ratio)) - 1; x += 2.2) { const p = new Path(); p.move(new Point(x, 3)); p.addLine(new Point(x + 1.8, 0)); c.addPath(p); c.strokePath() }
    return c.getImage()
  }
  c.setFillColor(new Color(bg || (dark() ? '#2a2f37' : '#dce1e7'))); c.fillRect(new Rect(0, 1, w, 1))
  c.setFillColor(new Color(fg || DDHEX || (dark() ? '#9fadc4' : '#66778f'))); c.fillRect(new Rect(0, 0.5, Math.max(2, w * Math.min(1, ratio)), 2))
  return c.getImage()
}
// 낙서 (앱 리포트와 같은 결): 물결 밑줄 · 별 · 체크 — 가는 선 하나로
let DOODLE = true
const inkHex = () => DDHEX || (dark() ? '#9fadc4' : '#66778f')
function waveImg(w, hex) {
  const c = new DrawContext(); c.size = new Size(w, 6); c.opaque = false; c.respectScreenScale = true
  const p = new Path(); p.move(new Point(1, 3.2))
  for (let x = 3; x <= w - 1; x += 2) p.addLine(new Point(x, 3 + Math.sin(x / 9) * 1.5 + Math.sin(x / 3.4) * 0.25))
  c.addPath(p); c.setStrokeColor(new Color(hex || inkHex(), 0.6)); c.setLineWidth(1.1); c.strokePath()
  return c.getImage()
}
function starImg(sz, hex) {
  const c = new DrawContext(); c.size = new Size(sz, sz); c.opaque = false; c.respectScreenScale = true
  const p = new Path(), m = sz / 2
  for (let i = 0; i < 10; i++) { const r = i % 2 ? sz * 0.2 : sz * 0.46, a = -Math.PI / 2 + (i * Math.PI) / 5, pt = new Point(m + r * Math.cos(a), m + r * Math.sin(a)); if (i) p.addLine(pt); else p.move(pt) }
  p.closeSubpath(); c.addPath(p); c.setStrokeColor(new Color(hex || inkHex())); c.setLineWidth(1); c.strokePath()
  return c.getImage()
}
function tickImg(sz, hex) {
  const c = new DrawContext(); c.size = new Size(sz, sz); c.opaque = false; c.respectScreenScale = true
  const p = new Path(); p.move(new Point(sz * 0.14, sz * 0.55)); p.addLine(new Point(sz * 0.4, sz * 0.8)); p.addLine(new Point(sz * 0.88, sz * 0.2))
  c.addPath(p); c.setStrokeColor(new Color(hex || inkHex())); c.setLineWidth(1.4); c.strokePath()
  return c.getImage()
}
function doodleWave(parent, w) { if (!DOODLE) return; const im = parent.addImage(waveImg(w)); im.imageSize = new Size(w, 6) }
let RW = 0.6 // 구분선 굵기 (앱 설정 › 위젯 구분선)
function rule(parent, w) { const s = parent.addStack(); s.size = new Size(w, RW || 0.1); if (RW) s.backgroundColor = RULE }
function vrule(parent, h) { const s = parent.addStack(); s.size = new Size(RW || 0.1, h); if (RW) s.backgroundColor = RULE }
// 노트: Parameter '노트' → 고정·최근 노트, '노트:제목' → 제목에 그 말이 든 노트
const NOTES = () => (data && Array.isArray(data.notes) ? data.notes : [])
const pickNote = () => { const ns = NOTES(); return (ARG && ns.find((n) => n.t.includes(ARG))) || ns[0] || null }
const noteUrl = (n) => (RUN ? RUN + '?act=view&go=notes' + (n ? '&note=' + encodeURIComponent(n.id) : '') : n ? APP + '?open=' + encodeURIComponent(n.id) : APP + '?go=notes.pages')
const HABITS = () => (data && data.extra && Array.isArray(data.extra.habits) ? data.extra.habits : [])
const habitUrl = (h) => (RUN && h && h.id ? RUN + '?act=habit&id=' + encodeURIComponent(h.id) : APP)
const noteAgo = (u) => { if (!u) return ''; const m = Math.round((Date.now() - u) / 60000); return m < 60 ? Math.max(1, m) + '분 전' : m < 1440 ? Math.round(m / 60) + '시간 전' : Math.round(m / 1440) + '일 전' }
// 노트 한 줄: 할 일은 작은 네모(완료면 채움), 글머리는 작은 점, 긴 줄은 두 줄까지
function noteRow(P2, l, wd, fs, lim = 2) {
  const r = P2.addStack(); r.size = new Size(wd, 0); r.topAlignContent(); r.spacing = 5
  if (l.k === 'todo' || l.k === 'b') {
    const m = r.addStack(); m.layoutVertically(); m.addSpacer(fs * 0.42); const bx = m.addStack(), z = l.k === 'todo' ? Math.round(fs * 0.55) : 3
    bx.size = new Size(z, z); bx.cornerRadius = l.k === 'todo' ? 1.5 : 1.5
    if (l.k === 'todo') { bx.borderWidth = 0.8; bx.borderColor = SOFT; if (l.d) { if (PENCIL) { bx.centerAlignContent(); t(bx, '✓', F(Math.max(6, z * 0.95), 'Regular'), GOLD) } else bx.backgroundColor = SOFT } } else bx.backgroundColor = SOFT
  }
  t(r, l.x, l.k === 'h' ? F(fs + 0.5, 'Regular') : tw(fs), l.d ? SOFT : INK, l.k === 'h' ? 1 : lim)
  r.addSpacer()
}
// 높이만큼 줄을 채우고, 들어간 줄 수를 돌려줌 (글자 수로 몇 줄로 접힐지 어림)
function noteFlow(P2, L, wd, avail, fs) {
  let used = 0, k = 0
  for (const l of L) {
    const tw2 = wd - (l.k === 'todo' || l.k === 'b' ? 12 : 0), per = Math.max(4, Math.floor(tw2 / (fs * 0.92 * SCALE))), nl = l.k === 'h' ? 1 : Math.min(2, Math.ceil(l.x.length / per))
    const hh = nl * fs * 1.28 * SCALE + (l.k === 'h' && k ? 4 : 3)
    if (used + hh > avail && k) break
    if (l.k === 'h' && k) P2.addSpacer(3)
    noteRow(P2, l, wd, fs); P2.addSpacer(3); used += hh; k++
  }
  return k
}
function t(parent, s, font, color, lines = 1) {
  const x = parent.addText(String(s)); x.font = font; if (color) x.textColor = color; x.lineLimit = lines
  return x
}
let inkDark = false
function cap(parent, s) { return t(parent, s.split('').join(' '), label(8), SOFT) }

const data = await load()
const nzT = (s) => String(s || '').replace(/\\s/g, '').toLowerCase()
async function loadPhotos() {
  const pp = CFM.joinPath(CFM.documentsDirectory(), 'study-photo-cache.json')
  try {
    if (!SRC) throw new Error('no source')
    const j = await new Request(SRC.replace(/widget\\.json.*$/, 'photo.json') + '?t=' + Date.now()).loadJSON()
    const l = (j && Array.isArray(j.list)) ? j.list : []
    try { CFM.writeString(pp, JSON.stringify(l)) } catch (e) {}
    return l
  } catch (e) { try { return JSON.parse(CFM.readString(pp)) } catch (e2) { return [] } }
}
const PHOTOS = KIND === 'photo' ? await loadPhotos() : []
const QP = (typeof args !== 'undefined' && args && args.queryParameters) || {}
try { RUN = Keychain.contains('study-gh') && data && data.gid ? 'scriptable:///run/' + encodeURIComponent(Script.name()) : null } catch (e) { RUN = null }
// 위젯을 눌러 실행된 경우: 할 일 완료 · 타이머 시작/일시정지/정지 · 공부 기록 → 동기화 저장소에 명령을 남기고(앱이 열리면 반영) 위젯 데이터도 바로 고침
// 사진 앱 공유 › Run Script(이 스크립트): 사진을 동기화 저장소 받기함에 올림 → 앱을 열면 받은 편지함 할 일(사진 첨부)로
async function sharePhotos(imgs) {
  const say = async (title, msg) => { const a = new Alert(); a.title = title; if (msg) a.message = msg; a.addAction('확인'); await a.present() }
  const tok = Keychain.contains('study-gh') ? Keychain.get('study-gh') : '', gid = data && data.gid
  if (!tok || !gid) return say('설정이 필요해요', 'Scriptable 에서 이 스크립트를 실행 › 메뉴 › 위젯에서 바로 처리 켜기 (토큰 저장) 후 다시 보내 주세요')
  const a = new Alert(); a.title = '앱으로 사진 ' + imgs.length + '장'; a.message = '제목 (비우면 사진)'; a.addTextField('예: 수학 p.52 3번', ''); a.addAction('보내기'); a.addCancelAction('취소')
  if (await a.present() < 0) return
  const title = a.textFieldValue(0).trim().replace(/[\\/~]/g, ' ').slice(0, 40)
  const shrink = (img) => { const z = img.size, k = Math.min(1, 1600 / Math.max(z.width, z.height)); if (k >= 1) return img; const c = new DrawContext(); c.size = new Size(Math.round(z.width * k), Math.round(z.height * k)); c.respectScreenScale = false; c.drawImageInRect(img, new Rect(0, 0, c.size.width, c.size.height)); return c.getImage() }
  const at = Date.now(), files = {}
  imgs.forEach((img, i) => { files['inbox-' + (title ? title + (imgs.length > 1 ? ' ' + (i + 1) : '') : '') + '~' + (at + i) + '.txt'] = { content: Data.fromJPEG(shrink(img)).toBase64String() } })
  const r = new Request('https://api.github.com/gists/' + gid); r.method = 'PATCH'; r.headers = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }; r.body = JSON.stringify({ files })
  try { await r.loadString(); const sc = r.response && r.response.statusCode; if (sc && sc >= 300) throw new Error(ghErr(sc)) } catch (e) { return say('보내지 못했어요', String(e.message || e)) }
  const n = new Notification(); n.title = '앱으로 사진 ' + imgs.length + '장 보냈어요'; n.body = '앱을 열면 받은 편지함에 들어와요'; n.schedule()
}
// ── 위젯을 눌렀을 때 (바로 처리 켠 경우) ──
// 명령은 동기화 gist 에 cmd-*.json 으로 남기고(앱이 열리면 정식 반영), 위젯 데이터는 바로 고쳐 위젯에 곧 보이게
const ACT = (() => {
  const tok = () => (Keychain.contains('study-gh') ? Keychain.get('study-gh') : '')
  const say = async (title, msg) => { const a = new Alert(); a.title = title; if (msg) a.message = msg; a.addAction('확인'); await a.present() }
  const sheet = async (title, items, msg) => { const a = new Alert(); a.title = title; if (msg) a.message = msg; items.forEach((x) => a.addAction(x)); a.addCancelAction('취소'); return a.presentSheet() }
  const now = () => Date.now()
  const ymdOf = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
  const subs = () => Object.values((data.study && data.study.subjects) || {}).filter((x) => !x.deleted)
  const subOf = (id) => subs().find((x) => x.id === id)
  const pickSub = async (title) => { const ss = subs(), i = await sheet(title, [...ss.map((x) => x.name), '과목 없이']); return i < 0 ? undefined : ss[i] ? ss[i].id : null }
  const addSess = (sid, start, end) => { const m = Math.round((end - start) / 60000); if (m < 1) return; data.study.sessions = data.study.sessions || {}; data.study.sessions['wg-' + end] = { id: 'wg-' + end, subjectId: sid, date: ymdOf(end), start, dur: m } }
  const timer = () => (data.timer && !(data.timer.end && data.timer.end < now()) ? data.timer : null)
  let dirty = false
  const patchGist = async (id, files) => { const r = new Request('https://api.github.com/gists/' + id); r.method = 'PATCH'; r.headers = { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }; r.body = JSON.stringify({ files }); await r.loadString(); const sc = r.response && r.response.statusCode; if (sc && sc >= 300) throw new Error(ghErr(sc)) }
  // 명령 보내기 (실패하면 알림창)
  const send = async (cmd) => { cmd.at = cmd.at || now(); try { await patchGist(data.gid, { ['cmd-' + cmd.at + '.json']: { content: JSON.stringify(cmd) } }); dirty = true; return true } catch (e) { await say('보내지 못했어요', String(e.message || e)); return false } }
  // 위젯 데이터 반영 (캐시 + 위젯 gist)
  const flush = async () => {
    if (!dirty) return
    data.at = now(); try { CFM.writeString(cachePath, JSON.stringify(data)) } catch (e) {}
    const wid = (String(SRC).match(/gist\\.githubusercontent\\.com\\/[^/]+\\/(\\w+)\\//) || [])[1]
    if (wid) { const d2 = Object.assign({}, data); delete d2.at; await patchGist(wid, { 'widget.json': { content: JSON.stringify(d2) } }).catch(() => {}) }
    dirty = false
  }
  const done = async (id) => {
    const x = data.tasks && data.tasks.tasks && data.tasks.tasks[id]
    if (!x) { await say('할 일을 찾지 못했어요', '앱에서 동기화한 뒤 다시 해 보세요'); return null }
    if (x.done) return null
    const at = now(); if (!(await send({ act: 'done', id, at }))) return null
    x.done = true; x.doneAt = at; return '완료 · ' + x.title
  }
  const start = async (sid) => {
    const at = now(); if (!(await send({ act: 'start', sid: sid || null, at }))) return null
    const sb = subOf(sid); data.timer = { mode: 'stopwatch', name: sb ? sb.name : '공부', color: sb ? sb.color : null, sid: sid || null, paused: false, acc: 0, start: at, end: null, target: null }
    return '시작 · ' + data.timer.name
  }
  const log = async () => {
    const sid = await pickSub('어떤 과목을 공부했나요?'); if (sid === undefined) return null
    const D = [15, 30, 45, 60, 90, 120], i = await sheet('얼마나?', [...D.map((m) => (m >= 60 ? Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') : m + '분')), '직접 입력'])
    if (i < 0) return null
    let dur = D[i]
    if (i === D.length) { const a = new Alert(); a.title = '몇 분?'; a.addTextField('분', '30'); a.addAction('기록'); a.addCancelAction('취소'); if (await a.present() < 0) return null; dur = parseInt(a.textFieldValue(0), 10) }
    if (!(dur > 0)) return null
    const at = now(); if (!(await send({ act: 'log', sid, dur, at }))) return null
    addSess(sid, at - dur * 60000, at)
    return '기록 · ' + ((subOf(sid) || {}).name || '공부') + ' ' + dur + '분'
  }
  // 타이머 칸: 돌고 있으면 일시정지/계속/정지, 아니면 시작 또는 기록 추가
  const timerMenu = async () => {
    const T = timer()
    if (!T) { const i = await sheet('공부', ['타이머 시작', '공부 기록 추가']); if (i < 0) return null; if (i === 1) return log(); const sid = await pickSub('어떤 과목?'); return sid === undefined ? null : start(sid) }
    const i = await sheet((T.name || '공부') + (T.paused ? ' · 일시정지' : ' · 공부 중'), [T.paused ? '계속' : '일시정지', '정지하고 기록'])
    if (i < 0) return null
    const at = now()
    if (i === 0 && !T.paused) { if (!(await send({ act: 'pause', at }))) return null; addSess(T.sid || null, T.start + (T.acc || 0), at); T.acc = at - T.start; T.paused = true; T.start = null; return '일시정지' }
    if (i === 0) { if (!(await send({ act: 'resume', at }))) return null; T.start = at - (T.acc || 0); T.paused = false; return '다시 시작' }
    if (!(await send({ act: 'stop', at }))) return null
    if (!T.paused) addSess(T.sid || null, T.start + (T.acc || 0), at)
    const m = Math.round((T.paused ? T.acc : at - T.start) / 60000); data.timer = null; return '정지 · ' + m + '분 공부'
  }
  // 할 일 추가 (오늘) · 노트에 한 줄 덧붙이기
  const addTask = async () => {
    const a = new Alert(); a.title = '오늘 할 일 추가'; a.addTextField('예: 수학 문제집 3단원', ''); a.addAction('추가'); a.addCancelAction('취소')
    if (await a.present() < 0) return null
    const title = a.textFieldValue(0).trim(); if (!title) return null
    const at = now(), td = ymdOf(at); if (!(await send({ act: 'addtask', title, due: td, at }))) return null
    data.tasks = data.tasks || { tasks: {} }; data.tasks.tasks['wg-' + at] = { id: 'wg-' + at, title, due: td, done: false, order: at }
    return '할 일 추가 · ' + title
  }
  const noteLine = async (n0) => {
    let n = n0
    if (!n) { const ns = NOTES(); if (!ns.length) { await say('노트가 없어요'); return null } const i = await sheet('어느 노트에?', ns.slice(0, 8).map((x) => x.t)); if (i < 0) return null; n = ns[i] }
    const a = new Alert(); a.title = n.t; a.message = '끝에 한 줄 덧붙여요'; a.addTextField('내용', ''); a.addAction('추가'); a.addCancelAction('취소')
    if (await a.present() < 0) return null
    const text = a.textFieldValue(0).trim(); if (!text) return null
    if (!(await send({ act: 'noteline', id: n.id, text, at: now() }))) return null
    n.l = [...(n.l || []), { k: 't', x: text }]; n.u = now()
    return '노트에 추가 · ' + n.t
  }
  const habit = async (id) => {
    const h = ((data.extra && data.extra.habits) || []).find((x) => x.id === id)
    if (!h) { await say('습관을 찾지 못했어요', '앱에서 동기화한 뒤 다시 해 보세요'); return null }
    const on = !h.on; if (!(await send({ act: 'habit', id, on, at: now() }))) return null
    h.on = on; if (Array.isArray(h.w) && h.w.length) h.w[h.w.length - 1] = on
    return (on ? '습관 완료 · ' : '습관 취소 · ') + h.t
  }
  const notify = (msg) => { if (!msg) return; const n = new Notification(); n.title = msg; n.body = '위젯은 곧 바뀌고, 앱을 열면 기록에도 반영돼요'; n.schedule() }
  return { tok, say, done, start, log, timerMenu, habit, addTask, noteLine, flush, notify, timer, subs, ymdOf }
})()

async function widgetAct(Q) {
  if (!ACT.tok() || !(data && data.gid)) return ACT.say('설정이 필요해요', 'Scriptable 에서 이 스크립트를 실행 › 메뉴 › 위젯에서 바로 처리 켜기')
  if (Q.act === 'view') { await miniApp(Q); await ACT.flush(); return }
  let msg = null
  if (Q.act === 'done') msg = await ACT.done(Q.id)
  else if (Q.act === 'start') msg = await ACT.start(Q.sid || null)
  else if (Q.act === 'log') msg = await ACT.log()
  else if (Q.act === 'habit') msg = await ACT.habit(Q.id)
  else if (Q.act === 'addtask') msg = await ACT.addTask()
  else if (Q.act === 'noteline') msg = await ACT.noteLine(Q.id ? NOTES().find((x) => x.id === Q.id) || null : null)
  else if (Q.act === 'timer') msg = await ACT.timerMenu()
  await ACT.flush(); ACT.notify(msg)
}

// ── 간단한 앱 화면 (Scriptable 안): 공부·타이머 · 오늘 할 일 · 일정 · D-day · 노트 ──
async function miniApp(Q) {
  const go = Q.go || '', tb = new UITable(); tb.showSeparators = true
  const C = { ink: Color.dynamic(new Color('#2a2f38'), new Color('#e6e9ee')), soft: Color.dynamic(new Color('#8c94a1'), new Color('#78808d')), acc: Color.dynamic(new Color('#66778f'), new Color('#9fadc4')) }
  const td = ACT.ymdOf(Date.now()), hmS = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
  let toast = ''
  const row = (title, sub, opt = {}) => {
    const r = new UITableRow(); r.height = opt.h || (sub ? 54 : 44); r.dismissOnSelect = false
    const c = r.addText(title, sub || null); c.titleFont = opt.font || Font.lightSystemFont(opt.size || 15); c.titleColor = opt.color || C.ink; if (sub) { c.subtitleFont = Font.lightSystemFont(11); c.subtitleColor = C.soft }
    if (opt.right) { const rc = r.addText(opt.right); rc.rightAligned(); rc.widthWeight = 30; rc.titleFont = Font.lightSystemFont(13); rc.titleColor = opt.rightColor || C.soft; c.widthWeight = 70 }
    if (opt.onSelect) r.onSelect = opt.onSelect
    tb.addRow(r); return r
  }
  const head = (t2) => { const r = new UITableRow(); r.isHeader = true; r.height = 34; const c = r.addText(t2); c.titleFont = Font.mediumSystemFont(11); c.titleColor = C.soft; tb.addRow(r) }
  const act = async (fn) => { const m = await fn(); if (m) toast = m; render() }
  const sec = {
    study: () => {
      const ss = Object.values((data.study && data.study.sessions) || {}).filter((x) => !x.deleted && x.date === td)
      const T = ACT.timer(), live = T && !T.paused && T.start ? Math.round((Date.now() - T.start) / 60000) : 0
      const mins = ss.reduce((a, x) => a + (x.dur || 0), 0), goal = (data.settings && data.settings.settings && data.settings.settings.main && data.settings.settings.main.goalDaily) || 240
      head('공부')
      row(hmS(mins) + ' / ' + hmS(goal), T ? (T.paused ? '일시정지 · ' : '공부 중 · ') + (T.name || '공부') + (T.paused ? ' ' + Math.round((T.acc || 0) / 60000) + '분' : ' ' + live + '분째') : '오늘 공부 시간', { font: Font.thinSystemFont(26), h: 64 })
      if (T) { row(T.paused ? '계속하기' : '일시정지 · 정지', null, { color: C.acc, onSelect: () => act(ACT.timerMenu) }) }
      else { row('타이머 시작', null, { color: C.acc, onSelect: () => act(async () => { const s = await (async () => { const xs = ACT.subs(); const a = new Alert(); a.title = '어떤 과목?'; xs.forEach((x) => a.addAction(x.name)); a.addAction('과목 없이'); a.addCancelAction('취소'); const i = await a.presentSheet(); return i < 0 ? undefined : xs[i] ? xs[i].id : null })(); return s === undefined ? null : ACT.start(s) }) }) }
      row('공부 기록 추가', null, { color: C.acc, onSelect: () => act(ACT.log) })
    },
    tasks: () => {
      const all = Object.values((data.tasks && data.tasks.tasks) || {}).filter((x) => !x.deleted && !x.archived && ((x.due && x.due <= td && !x.done) || (x.done && x.doneAt && ACT.ymdOf(x.doneAt) === td)))
      all.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || String(a.due).localeCompare(String(b.due)) || (a.dueTime == null) - (b.dueTime == null) || (a.dueTime || 0) - (b.dueTime || 0) || (a.order || 0) - (b.order || 0))
      head('오늘 할 일 ' + all.filter((x) => x.done).length + '/' + all.length)
      row('+ 할 일 추가', null, { color: C.acc, onSelect: () => act(ACT.addTask) })
      for (const x of all) row((x.done ? '✓  ' : '○  ') + x.title, x.due < td && !x.done ? '지난 할 일 · ' + x.due.slice(5).replace('-', '/') : null, { color: x.done ? C.soft : C.ink, onSelect: x.done ? null : () => act(() => ACT.done(x.id)) })
      if (!all.length) row('오늘 할 일이 없어요', null, { color: C.soft })
    },
    cal: () => {
      const evs = (data.cal && data.cal[td]) || []
      head('오늘 일정')
      for (const e of evs) row(e.t, e.l || null, { right: e.s == null ? '종일' : Math.floor(e.s / 60) % 24 + ':' + String(e.s % 60).padStart(2, '0') })
      if (!evs.length) row('일정 없음', null, { color: C.soft })
      const dds = Object.values((data.study && data.study.ddays) || {}).filter((x) => !x.deleted && x.date >= td).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
      if (dds.length) { head('D-DAY'); for (const x of dds) { const n = Math.round((new Date(x.date + 'T00:00') - new Date(td + 'T00:00')) / 86400000); row(x.title, null, { right: n ? 'D-' + n : 'D-DAY', rightColor: C.acc }) } }
    },
    habits: () => {
      const hs = HABITS(); if (!hs.length) return
      head('오늘 습관 ' + hs.filter((x) => x.on).length + '/' + hs.length)
      for (const h of hs) row((h.on ? '✓  ' : '○  ') + h.t, null, { color: h.on ? C.soft : C.ink, right: (h.w || []).map((x) => (x ? '●' : '·')).join(' '), onSelect: () => act(() => ACT.habit(h.id)) })
    },
    notes: () => {
      const ns = NOTES(); if (!ns.length) return
      head('노트')
      row('+ 노트에 한 줄 추가', null, { color: C.acc, onSelect: () => act(() => ACT.noteLine(null)) })
      for (const n of ns.slice(0, 6)) row(n.t, (n.l[0] && n.l[0].x) || null, { onSelect: () => noteView(n) })
    },
  }
  const noteView = async (n) => {
    const t2 = new UITable(); t2.showSeparators = false
    const r0 = new UITableRow(); r0.height = 52; const c0 = r0.addText(n.t); c0.titleFont = Font.regularSystemFont(19); c0.titleColor = C.ink; t2.addRow(r0)
    for (const l of n.l) { const r = new UITableRow(); const len = l.x.length; r.height = Math.max(30, Math.ceil(len / 26) * 20 + 10); const c = r.addText((l.k === 'todo' ? (l.d ? '✓ ' : '○ ') : l.k === 'b' ? '·  ' : '') + l.x); c.titleFont = l.k === 'h' ? Font.mediumSystemFont(15) : Font.lightSystemFont(14); c.titleColor = l.d ? C.soft : C.ink; t2.addRow(r) }
    const r9 = new UITableRow(); r9.height = 50; const c9 = r9.addText('앱(사파리)에서 이 노트 열기'); c9.titleFont = Font.lightSystemFont(13); c9.titleColor = C.acc; r9.onSelect = () => Safari.open(APP + '?open=' + encodeURIComponent(n.id)); t2.addRow(r9)
    await t2.present(false)
  }
  // 누른 칸에 맞는 부분을 위로
  const order = go === 'habits' ? ['habits', 'tasks', 'study', 'cal', 'notes'] : go.startsWith('tasks') ? ['tasks', 'habits', 'study', 'cal', 'notes'] : go.startsWith('planner') ? ['cal', 'tasks', 'habits', 'study', 'notes'] : go.startsWith('notes') || Q.note ? ['notes', 'tasks', 'habits', 'study', 'cal'] : ['study', 'tasks', 'habits', 'cal', 'notes']
  const render = () => {
    tb.removeAllRows()
    if (toast) { const r = new UITableRow(); r.height = 36; r.backgroundColor = Color.dynamic(new Color('#eef1f5'), new Color('#232831')); const c = r.addText(toast + ' — 앱을 열면 기록에도 반영돼요'); c.titleFont = Font.lightSystemFont(12); c.titleColor = C.acc; tb.addRow(r) }
    for (const k of order) sec[k]()
    head('')
    row('앱(사파리)에서 열기', null, { color: C.acc, size: 13, onSelect: () => Safari.open(APP + (go ? '?go=' + go : '')) })
    tb.reload()
  }
  render()
  if (Q.note) { const n = NOTES().find((x) => x.id === Q.note); if (n) await noteView(n) }
  await tb.present(false)
}
// 위젯을 눌러 실행됐거나(act) 사진 공유로 실행된 경우 여기서 처리하고 끝
if (QP.act && !config.runsInWidget) { await widgetAct(QP); Script.complete(); return }
if (!config.runsInWidget && typeof args !== 'undefined' && args && args.images && args.images.length) { await sharePhotos(args.images); Script.complete(); return }
// 투명 배경 파일
const FM = FileManager.local()
const bgPath = (f, p) => FM.joinPath(FM.documentsDirectory(), 'study-bg-' + f + '-' + (p || 'default') + '.jpg')
// 종이 테마: 앱과 같은 요철 결 이미지(한 번 받아 두고 씀) → 위젯 크기만큼 타일로 깔기
const paperPath = FM.joinPath(FM.documentsDirectory(), 'study-paper-2.jpg')
// 받아 두기만 하고, 읽는 건 배경을 새로 그릴 때만 (큰 위젯 메모리 절약)
if (((data && data.settings && data.settings.settings && data.settings.settings.main) || {}).widgetTheme === 'paper' && !FM.fileExists(paperPath)) {
  try { FM.writeImage(paperPath, await new Request(APP + 'paper.jpg').loadImage()) } catch (e) {}
}
const loadPaper = () => { try { return FM.fileExists(paperPath) ? FM.readImage(paperPath) : null } catch (e) { return null } }
let TILEH = 0 // 대시보드 칸 하나에 쓸 수 있는 높이 (노트 칸이 줄을 높이만큼 채우게)
let TBIG = false // 내 위젯에서 '크게' 고른 칸을 그리는 중
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

`
