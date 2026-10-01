import { useSyncExternalStore } from 'react'

// 탭·세그먼트 탐색 상태 (기기별 localStorage)
const load = () => { try { return JSON.parse(localStorage.getItem('nav')) || null } catch { return null } }
let nav = load() || { tab: 'home', seg: {}, params: {} }
// 할 일 기본 보기를 '일별'로 (한 번만 전환, 이후엔 마지막 선택 유지)
try { if (!localStorage.getItem('navDay')) { nav.seg = { ...(nav.seg || {}), tasks: 'day' }; localStorage.setItem('navDay', '1') } } catch {}
const L = new Set()
const save = () => { try { localStorage.setItem('nav', JSON.stringify(nav)) } catch {} }

export const TABS = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'tasks', label: '할 일', icon: 'tasks' },
  { id: 'study', label: '기록', icon: 'study' },
  { id: 'planner', label: '캘린더', icon: 'planner' },
  { id: 'notes', label: '노트', icon: 'notes' },
]
export const EXTRA = [
  { id: 'health', label: '건강', icon: 'heart', module: 'health' },
  { id: 'settings', label: '설정', icon: 'settings' },
]

export const SEGMENTS = {
  planner: [['today', '오늘'], ['week', '주'], ['month', '월'], ['timetable', '시간표'], ['circle', '원형', 'planning'], ['grid', '10분', 'planning']],
  tasks: [['day', '일별'], ['list', '리스트'], ['matrix', '매트릭스', 'matrix'], ['kanban', '칸반', 'kanban'], ['gantt', '간트', 'gantt'], ['table', '표', 'db'], ['archive', '보관함']],
  study: [['log', '기록 입력'], ['timer', '타이머'], ['records', '통계'], ['review', '복습'], ['progress', '진도'], ['plan', '계획', 'planning']],
  notes: [['daily', '데일리'], ['pages', '페이지'], ['hub', '허브'], ['graph', '그래프', 'graph'], ['library', '자료']],
}

export const useNav = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => nav)
export const getNav = () => nav
export const onNav = (f) => { L.add(f); return () => L.delete(f) }
export function go(tab, seg, params) {
  nav = { ...nav, tab, seg: seg ? { ...nav.seg, [tab]: seg } : nav.seg, params: params !== undefined ? { ...nav.params, [tab]: params } : nav.params }
  save(); L.forEach((l) => l())
}
export const setParams = (tab, params) => go(tab, undefined, { ...(nav.params[tab] || {}), ...params })
export const segOf = (tab) => nav.seg[tab] || SEGMENTS[tab]?.[0][0]
export const openNote = (id) => go('notes', 'pages', { noteId: id })
