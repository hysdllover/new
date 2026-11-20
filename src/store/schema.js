// 데이터 모음 (컬렉션) — 레코드마다 id · updatedAt · deviceId (동기화 병합 기준)
// exams: 시험 { kind: 'jlpt'|'toeic'|'custom', level, name, date, target, pass, sections, areas, color, done }
// scores: 점수 { examId, date, kind: 'mock'|'real', parts: { 영역id: 점수 }, memo }
// tasks: 할 일 { title, due, done, doneAt, examId, area, order, memo }
// materials: 교재·강의 { title, examId, unit, total, current, done }
// sessions: 공부 기록 { date, start, min, examId, area, memo }
// days: 날마다 메모 { id: 'YYYY-MM-DD', memo }
// settings: { id: 'main', ... } · live: 동기화 · 백업 표시 (기기별)
export const COLL_NAMES = ['exams', 'scores', 'tasks', 'materials', 'sessions', 'days', 'settings', 'live']
export const emptyState = () => Object.fromEntries(COLL_NAMES.map((c) => [c, {}]))

export const PALETTE = ['#4a5a78', '#7a8660', '#a99bc4', '#c9a0a8', '#8a9bb5', '#b5a47a', '#7fa3a0', '#8c8c86']

export const DEFAULT_SETTINGS = {
  id: 'main',
  goalDaily: 120, // 하루 목표 공부 (분)
  weekStart: 1,
  theme: 'basic', // basic · pencil
  handFx: true, // 필기 느낌 (연필 선 · 손으로 그은 체크)
  accent: '#4a5a78',
  widgetTheme: 'basic', // 위젯: basic(블루그레이) · paper · pencil
}
