# 어학 스터디

JLPT · 토익 공부 앱. iPhone · iPad 홈 화면 앱(PWA)으로 동작하고, GitHub Gist로 두 기기를 동기화합니다.

## 기능
- **오늘**: 가까운 시험 D-day · 최근 점수 · 목표까지, 오늘 할 일, 교재 진도
- **계획**: 할 일(지난 · 오늘 · 내일 · 이번 주 · 나중 · 날짜 없음), 주간 7칸, 교재 · 강의 진도(+1)
- **시험**: JLPT(N1~N5 · 영역별 점수 · 합격점과 기준점 판정) · 토익(LC/RC 5점 단위 · 990) · 직접 만든 시험(영역 · 만점 · 합격 점수), 점수 추이 · 목표선
- **설정**: 하루 목표, 기본 · 연필 아날로그 테마, 필기 느낌, 동기화 · 주간 백업, Scriptable 위젯, 내보내기 · 가져오기

## 설치 (iPhone · iPad)
1. 저장소 **Settings → Pages → Source: GitHub Actions**
2. `main`에 병합하면 자동 배포 → `https://<사용자>.github.io/<저장소>/`
3. Safari로 열고 **공유 → 홈 화면에 추가**

## 동기화
1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → `gist` 권한만 체크
2. 앱 **설정 → 동기화**에 토큰 입력 (두 기기 모두)
3. 비공개 gist `exam-study-sync` 하나에 `data.json` · `widget.json` · 주간 `backup-날짜.json`(최근 4개)

## 위젯 (Scriptable)
1. App Store에서 **Scriptable** 설치
2. 앱 **설정 → Scriptable 위젯 → 로더 복사** → Scriptable 새 스크립트에 붙여 넣기
3. 홈 · 잠금 화면에 Scriptable 위젯 추가 → Parameter: 비움(기본) · 디데이 · 할일 · 점수 · 교재
- 위젯 본체(`src/widget/core.js`)는 앱과 함께 배포되어 로더가 자동으로 받습니다. 위젯에는 토큰을 넣지 않습니다.

## 개발
```
npm install
npm run dev      # http://localhost:5173  (?demo 로 둘러보기 데이터)
npm test
npm run build
npm run audit    # dev 서버를 띄운 뒤 · 아이폰 · 아이패드 크기 모든 화면 점검
```

예전 '스터디 대시보드'는 `backup/study-dashboard-v1` 브랜치에 있습니다.
