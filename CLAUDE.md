# 스터디 대시보드 — 작업 기준

## 대상 기기 (항상 이 기준으로 만들고 점검)
- iPhone 16 Pro Max — 화면 440×956pt, 3x, ProMotion 120Hz
- iPad Pro M4 13" — 1032×1376pt (가로 1376×1032), 11" — 834×1210pt, 애플 펜슬 호버, 매직 키보드
- iOS / iPadOS 27 이상, Safari 홈 화면 웹 앱 (standalone). 구형 iOS 대비 코드는 넣지 않음
- 점검: `npm run audit` (Playwright, 위 크기 · 세로/가로 · 라이트/다크, 모든 화면)

## 디자인
- 심플·깔끔. 색: 채도 낮은 연한 네이비, 올리브그린, 파스텔 바이올렛·로즈. 글씨: 작고 얇고 단순하게
- 글자 그림자 없음. 진행은 깔끔한 선으로(특수문자 X). 종이 테마는 흰 수채화지 느낌(누렇지 않게)
- 위젯 기본색은 블루그레이, 잠금 화면 위젯에 원형 블러 배경 없음
- HTML 결과물은 A4 인쇄에 맞게, 아이폰·아이패드 모두 호환

## 하지 않는 것
- 뽀모도로, 연속 기록(N일 연속), 오답 기능, 미룸 배지
- 할 일 순서는 사용자가 정함 (정리 정렬은 날짜·시간만)
- 위젯 스크립트에 토큰 넣지 않기 (토큰은 Scriptable 보관함 `study-gh` 에만), 너무 잦은 자동 동기화 금지

## 개발
- React 19 + Vite PWA, 데이터는 idb-keyval + GitHub Gist 동기화, 위젯은 Scriptable (`src/lib/scriptable.js` 로더 + 본체 `src/lib/widget/core-*.js` 네 조각, 템플릿 문자열 안 백슬래시는 두 번·백틱 금지)
- `npm test` (node --test), `npm run build`. 새 위젯 형태를 추가하면 설정 미리보기(`src/views/settings/WidgetSettings.jsx` 의 `V[...]`)도 함께 — `tests/widgetkinds.test.js` 가 검사
