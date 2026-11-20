// 화면 이동: 탭 + 탭 안 세그먼트 (이 기기에 기억) — 위젯 링크 ?go=탭.세그먼트
import { useSyncExternalStore } from 'react'

export const TABS = [
  ['home', '오늘', 'home'],
  ['plan', '계획', 'plan'],
  ['record', '기록', 'clock'],
  ['exam', '시험', 'flag'],
  ['settings', '설정', 'settings'],
]
const KEY = 'x_nav'
const L = new Set()
let nav = (() => { try { return { tab: 'home', seg: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { tab: 'home', seg: {} } } })()
if (!TABS.some((t) => t[0] === nav.tab)) nav = { tab: 'home', seg: {} }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(nav)) } catch {} L.forEach((f) => f()) }
export function go(tab, seg) { nav = { ...nav, tab, seg: seg ? { ...nav.seg, [tab]: seg } : nav.seg }; save(); window.scrollTo?.({ top: 0 }) }
export function setSeg(tab, seg) { nav = { ...nav, seg: { ...nav.seg, [tab]: seg } }; save() }
export const useNav = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => nav)
