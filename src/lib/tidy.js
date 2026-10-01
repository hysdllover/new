// 오늘 화면 정리: 끝난 일정·블록·완료한 할 일 접기 (기기별)
import { useSyncExternalStore } from 'react'
const L = new Set()
let on = (() => { try { return localStorage.getItem('tidy') === '1' } catch { return false } })()
export const useTidy = () => useSyncExternalStore((f) => { L.add(f); return () => L.delete(f) }, () => on)
export const setTidy = (v) => { on = v; try { localStorage.setItem('tidy', v ? '1' : '0') } catch {} L.forEach((f) => f()) }
