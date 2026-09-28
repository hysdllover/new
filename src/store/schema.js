// 컬렉션 → Gist 파일 매핑. 모든 레코드는 { id, updatedAt, deviceId, deleted? } 를 가진다.
export const COLLECTIONS = {
  tasks: 'tasks', projects: 'tasks', views: 'tasks', logs: 'tasks',
  events: 'events', blocks: 'events', days: 'events', templates: 'events',
  notes: 'notes', syncBlocks: 'notes', files: 'notes',
  subjects: 'study', sessions: 'study', ddays: 'study', plans: 'study', textbooks: 'study',
  reviews: 'study', grades: 'study', habits: 'study', mocks: 'study',
  conditions: 'health', meds: 'health', medLogs: 'health',
  settings: 'settings', links: 'settings', quotes: 'settings',
}
export const COLL_NAMES = Object.keys(COLLECTIONS)
export const GIST_FILES = [...new Set(Object.values(COLLECTIONS))]

export const PALETTE = ['#4a5a78', '#7a8660', '#a99bc4', '#c9a0a8', '#8a9bb5', '#b5a47a', '#7fa3a0', '#b58a7a', '#9a8fb0', '#8c8c86']
// 설정 색 선택용: 저채도 파스텔·모노톤
export const SOFT_PALETTE = [...PALETTE, '#9fb0a5', '#a9b59c', '#b4acc9', '#cfb2b7', '#c2b49c', '#93a3b8', '#d1b3b3', '#9aa3ad', '#a8a39b', '#6b6d72']

export const DEFAULT_WIDGETS = [
  { id: 'w1', type: 'now', size: 'm' },
  { id: 'w2', type: 'top3', size: 'm' },
  { id: 'w3', type: 'goal', size: 's' },
  { id: 'w4', type: 'dday', size: 's' },
  { id: 'w5', type: 'today', size: 'l' },
  { id: 'w6', type: 'review', size: 'm' },
  { id: 'w7', type: 'gaps', size: 'm' },
  { id: 'w8', type: 'quicknote', size: 'm' },
  { id: 'w9', type: 'habits', size: 'm' },
  { id: 'w10', type: 'meds', size: 's' },
  { id: 'w11', type: 'quote', size: 's' },
  { id: 'w12', type: 'links', size: 's' },
]

export const DEFAULT_SETTINGS = {
  id: 'main',
  theme: { preset: 'default', accent: null, mode: 'system', font: 'system', fontSize: 13, fontWeight: 300, radius: 10, density: 'normal', card: 'line' },
  modules: { health: true, gantt: true, db: true, mindmap: true, graph: true, matrix: true, kanban: true, circle: true, mock: true, planning: false },
  widgets: DEFAULT_WIDGETS,
  dayStart: 7 * 60, dayEnd: 24 * 60,
  weekStart: 1,
  goalDaily: 240, goalWeekly: 1500,
  pomodoro: { work: 25, short: 5, long: 15, every: 4 },
  reviewIntervals: [1, 3, 7, 14, 30],
  syncExclude: {},
  defaultBuffer: 10,
  autoTemplate: true,
  notify: true,
}

export const DEFAULT_SUBJECTS = [
  { id: 'sub-kor', name: '국어', color: '#c9a0a8' },
  { id: 'sub-math', name: '수학', color: '#4a5a78' },
  { id: 'sub-eng', name: '영어', color: '#7a8660' },
  { id: 'sub-sci', name: '과학', color: '#a99bc4' },
  { id: 'sub-soc', name: '사회', color: '#b5a47a' },
]

export const DEFAULT_QUOTES = [
  { id: 'q1', text: '작게 시작하고, 매일 이어가기.' },
  { id: 'q2', text: '완벽보다 완료.' },
]

export function emptyState() {
  const s = {}
  for (const c of COLL_NAMES) s[c] = {}
  return s
}
