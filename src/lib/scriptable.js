// Scriptable 위젯: 사용자는 짧은 로더만 한 번 붙여 넣음 → 본체(widget-core.js)는 앱과 같이 배포되어 자동으로 바뀜
// 토큰은 넣지 않음 (위젯은 비공개 gist 의 widget.json 주소로만 읽음)
export const WIDGET_KINDS = [
  ['', '기본', 'D-day · 오늘 공부 · 오늘 할 일'],
  ['디데이', 'D-day', '가까운 시험 D-day 크게 · 다른 시험'],
  ['공부', '공부 시간', '오늘 공부 / 목표 · 7일 막대'],
  ['할일', '할 일', '오늘 할 일 · 누르면 체크'],
  ['점수', '점수', '최근 점수 · 목표까지 · 추이'],
  ['교재', '교재 · 강의', '진도 선'],
]

export function buildLoader({ widgetRaw, appUrl }) {
  return `// 어학 스터디 위젯 (Scriptable) — 한 번만 붙여 넣으면 돼요
// 위젯 모양은 앱이 바뀌면 같이 바뀌어요 · 토큰 없음 (비공개 gist 주소로만 읽어요)
// 위젯 편집 › Parameter: 비우면 기본 · 디데이 · 공부 · 할일 · 점수 · 교재
const SRC = ${JSON.stringify(widgetRaw || '')}
const APP = ${JSON.stringify(appUrl)}
const fm = FileManager.local()
const path = fm.joinPath(fm.documentsDirectory(), 'exam-core.js')
const vpath = fm.joinPath(fm.documentsDirectory(), 'exam-core.ver')
const lockW = String(config.widgetFamily || '').startsWith('accessory')
const has = fm.fileExists(path) && fm.fileExists(vpath)
const fresh = has && config.runsInWidget && Date.now() - fm.modificationDate(vpath).getTime() < 30 * 60000
if (!fresh) {
  try {
    const rv = new Request(APP + 'widget-core.ver?t=' + Date.now()); rv.timeoutInterval = lockW ? 4 : 8
    const ver = (await rv.loadString()).trim(), cur = has ? fm.readString(vpath).trim() : ''
    if (/^[0-9a-f]{6,40}$/.test(ver) && ver !== cur) {
      const r = new Request(APP + 'widget-core.js?v=' + ver); r.timeoutInterval = lockW ? 5 : 10
      const s = await r.loadString()
      if (s && s.includes('EXAM_CORE')) { fm.writeString(path, s); fm.writeString(vpath, ver) }
    } else if (has) fm.writeString(vpath, cur)
  } catch (e) {}
}
if (!fm.fileExists(path)) {
  const w = new ListWidget(); const x = w.addText('위젯을 처음 받는 중이에요 · 인터넷 연결 후 다시 열어 주세요'); x.font = Font.systemFont(11); x.lineLimit = 3
  if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium()
  Script.complete()
} else {
  await importModule(path)({ SRC, APP })
}
`
}
