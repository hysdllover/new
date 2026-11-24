# 어학 스터디 (JLPT · 토익) — 작업 기준

## 대상 기기 (항상 이 기준으로 만들고 점검)
- iPhone 16 Pro Max — 화면 440×956pt, 3x, ProMotion 120Hz
- iPad Pro M4 13" — 1032×1376pt (가로 1376×1032), 11" — 834×1210pt, 애플 펜슬 호버, 매직 키보드
- iOS / iPadOS 27 이상, Safari 홈 화면 웹 앱 (standalone). 구형 iOS 대비 코드는 넣지 않음
- 점검: `npm run audit` (Playwright, 위 크기 · 세로/가로 · 라이트/다크, 모든 화면)

## 디자인
- 심플·깔끔. 색: 채도 낮은 연한 네이비, 올리브그린, 파스텔 바이올렛·로즈. 글씨: 작고 얇고 단순하게
- 다크 모드 절대 금지 (앱 · 위젯 · 이미지 모두 늘 밝게, 어두운 테마 선택지도 두지 않음)
- 둥근 알약 · 동그란 모양 디자인 금지 (각지게, 모서리는 아주 살짝만)
- 글자 그림자 없음. 진행은 깔끔한 선으로(특수문자 X). 종이 테마는 흰 수채화지 느낌(누렇지 않게)
- 위젯 기본색은 블루그레이, 잠금 화면 위젯에 원형 블러 배경 없음
- HTML 결과물은 A4 인쇄에 맞게, 아이폰·아이패드 모두 호환

## 하지 않는 것
- 뽀모도로 · 타이머, 연속 기록(N일 연속), 오답 기능, 미룸 배지
- 할 일 순서는 사용자가 정함 (정리 정렬은 날짜·시간만)
- 위젯 스크립트에 토큰 넣지 않기 (위젯은 비공개 gist 의 widget.json 주소로만 읽음), 너무 잦은 자동 동기화 금지

## 개발
- React 19 + Vite PWA. 데이터는 idb-keyval(키 `x:<컬렉션>` — 예전 앱 데이터와 분리) + GitHub Gist 동기화(gist `exam-study-sync`: data.json · widget.json · backup-날짜.json)
- 구조: `src/lib/exams.js`(시험 규칙 · JLPT 합격 판정) · `src/store/`(저장 · 액션) · `src/sync/`(동기화 · 위젯 요약) · `src/views/`(오늘 · 계획 · 기록 · 시험 · 설정)
- 위젯은 Scriptable: 사용자는 `src/lib/scriptable.js` 의 로더만 붙여 넣고, 본체 `src/widget/core.js`(일반 JS 파일)는 앱과 함께 배포되어 자동으로 받음
- 새 위젯 형태를 넣으면 `WIDGET_KINDS`(scriptable.js) · 본체 KIND 표 · 설정 미리보기(`src/views/WidgetPreview.jsx` 의 `PREVIEW_KINDS`)를 함께 — `tests/core.test.js` 가 검사
- `npm test` (node --test), `npm run build`, `npm run audit`
- 진도표(`src/lib/plans.js`)의 원본은 아티팩트 '토익 · 토스 진도 달력'(`PLAN_SOURCE`). 수정본이 있으면 항상 반영: 할 일(days) · 상세 계획 규칙 · 팁 · 알아두기 · 머리말을 맞추고 `PLAN_SOURCE.version` 갱신, 진도표 id 는 그대로 둬서 앱에서 '바뀐 내용 반영하기'로 고쳐지게
- 예전 스터디 대시보드는 `backup/study-dashboard-v1` 브랜치에 보관
