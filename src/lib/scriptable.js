import coreBase from './widget/core-base.js'
import coreLock from './widget/core-lock.js'
import coreHome from './widget/core-home.js'
import coreRun from './widget/core-run.js'
// iPhone·iPad 홈 화면·잠금 화면 위젯 (Scriptable) — 얇은 단일 서체 · 모노톤
// 유형: 위젯 편집 › Parameter 에 공부 · 할일 · 디데이 · 달력 · 다짐 (비우면 기본)
export const WIDGET_KINDS = [['', '기본'], ['공부', '공부'], ['할일', '할 일'], ['디데이', 'D-day'], ['달력', '공부 달력'], ['캘린더', '캘린더'], ['다짐', '다짐'], ['시간표', '시간표'], ['주간', '주간 공부'], ['과목', '과목별'], ['지금', '지금·다음'], ['진도', '진도'], ['목표', '이번 주 목표'], ['오늘', '오늘 한눈에'], ['대시보드', '대시보드'], ['내일', '내일 준비'], ['마감', '마감 임박'], ['일주일', '7일 일정'], ['디데이목록', 'D-day 목록'], ['바로가기', '바로 시작'], ['진행', '공부 진행'], ['남은분', '남은 시간'], ['타이머', '타이머·공부 시간'], ['노트', '노트'], ['습관', '습관'], ['시리즈', '시리즈 진행'], ['배치', '이번 주 배치'], ['주차', 'D-day까지 주차'], ['표', '노트 표'], ['보드', '노트 보드'], ['사진', '노트 사진'], ['10분', '10분 플래너'], ['하루', '하루 진행'], ['한줄', '한 줄 요약'], ['공책', '한 주 공책'], ['숫자', '숫자만'], ['숫자:디데이', '숫자 · D-day'], ['숫자:할일', '숫자 · 할 일'], ['숫자:주간', '숫자 · 이번 주'], ['선그래프', '선 그래프'], ['원호', '원호'], ['메모지', '종이 메모'], ['인쇄', '흑백 인쇄풍'], ['반반', '노트 · 할 일 반반'], ['큰수', '큰 수 · 목록'], ['세단', '세 단'], ['자동', '시간대별 자동'], ['묶음', 'D-day · 일정 묶음'], ['달력:과목', '공부 달력 · 과목 색'], ['구성1', '내 위젯 1'], ['구성2', '내 위젯 2'], ['구성3', '내 위젯 3']]

// 스크립트 버전 — 위젯 모양이 바뀔 때 올림. 앱이 위젯 데이터에 같이 올려서, 예전 스크립트면 위젯에 '스크립트 업데이트' 표시
export const SCRIPT_VER = 80

// 전체 스크립트 (예전 방식 · 테스트용): 머리 + 본체
export function buildScript({ widgetRaw, appUrl }) {
  return `// Study — 홈 화면·잠금 화면 위젯 (Scriptable)
const SRC = ${JSON.stringify(widgetRaw || '')}
const APP = ${JSON.stringify(appUrl)}
` + coreBody()
}

// 자동 업데이트 본체: 앱과 같이 배포(widget-core.js)되고, 로더가 매번 받아 실행
export function buildCore() {
  return `// STUDY_CORE v${SCRIPT_VER} — 스터디 위젯 본체 (Scriptable 로더가 받아 실행)
module.exports = async function (ctx) {
const SRC = ctx.SRC
const APP = ctx.APP
` + coreBody() + `
}
`
}

// 사용자가 Scriptable 에 붙여 넣는 짧은 로더 — 한 번만 붙여 넣으면 이후 위젯 모양·기능은 앱 배포와 함께 자동으로 바뀜
export function buildLoader({ widgetRaw, appUrl }) {
  return `// 스터디 위젯 (Scriptable) — 자동 업데이트
// 한 번만 붙여 넣으면 돼요. 위젯 본체는 앱 주소에서 받아 와서, 앱이 바뀌면 위젯도 같이 바뀌어요.
// 토큰 없음: 비공개 위젯 gist 주소로만 읽어요
const SRC = ${JSON.stringify(widgetRaw || '')}
const APP = ${JSON.stringify(appUrl)}
const fm = FileManager.local()
const path = fm.joinPath(fm.documentsDirectory(), 'study-core.js')
const vpath = fm.joinPath(fm.documentsDirectory(), 'study-core.ver')
const lockW = String(config.widgetFamily || '').startsWith('accessory')
// 본체는 이 기기에 저장해 두고, 작은 버전 파일만 확인해서 바뀌었을 때만 다시 받음 (20분에 한 번 확인)
const has = fm.fileExists(path) && fm.fileExists(vpath)
const fresh = has && Date.now() - fm.modificationDate(vpath).getTime() < 20 * 60000
if (!fresh) {
  try {
    const rv = new Request(APP + 'widget-core.ver?t=' + Date.now())
    rv.timeoutInterval = lockW ? 4 : 8
    const ver = (await rv.loadString()).trim()
    const cur = has ? fm.readString(vpath).trim() : ''
    if (/^[0-9a-f]{6,40}$/.test(ver) && ver !== cur) {
      const r = new Request(APP + 'widget-core.js?v=' + ver)
      r.timeoutInterval = lockW ? 5 : 10
      const s = await r.loadString()
      if (s && s.includes('STUDY_CORE')) { fm.writeString(path, s); fm.writeString(vpath, ver) }
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

// 단색 테마(색조 홈 화면용): 본체의 모든 색을 nC() 로 — 단색일 때 흰색 한 가지(밝기만 다르게)로 바꿈
function coreBody() { return coreRaw().replace(/new Color\(/g, 'nC(') }
// 본체는 네 조각(src/lib/widget/core-*.js)을 이어 붙임 — 공통 · 잠금 화면 · 홈 화면 형태별 · 실행
function coreRaw() { return coreBase() + coreLock() + coreHome() + coreRun() }
