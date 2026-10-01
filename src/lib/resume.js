// 이어 보기: 지금 보는 화면을 동기화 문서 live.resume 에 남기고, 다른 기기에서 열면 배너로 이어 보기
import { useEffect, useState } from 'react'
import { put, find, subscribe, deviceId, useColl } from '../store/store.js'
import { getNav, onNav, go } from '../nav.js'
import { fmtDate, today } from '../engine/date.js'

export const deviceName = () => {
  const ua = navigator.userAgent || ''
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? '아이패드' : /iPhone/.test(ua) ? '아이폰' : '다른 기기'
}
const TAB = { tasks: '할 일', study: '공부 기록', planner: '캘린더', notes: '노트', health: '건강' }
const SEG = { day: '일별', list: '리스트', timer: '타이머', records: '통계', progress: '진도', review: '복습', today: '오늘', week: '주', month: '월', timetable: '시간표', daily: '데일리', pages: '페이지' }

function describe(n) {
  const p = n.params?.[n.tab] || {}, seg = n.seg?.[n.tab]
  if (n.tab === 'notes' && p.noteId) { const note = find('notes', p.noteId); return note ? '노트 ‘' + (note.title || '제목 없음') + '’' : null }
  if (n.tab === 'tasks' && seg === 'day' && p.day) return '할 일 · ' + fmtDate(p.day)
  if (n.tab === 'planner' && p.date && p.date !== today()) return '캘린더 · ' + fmtDate(p.date)
  if (!TAB[n.tab]) return null
  return TAB[n.tab] + (seg && SEG[seg] ? ' · ' + SEG[seg] : '')
}

let timer = null, lastKey = ''
export function startResume() {
  onNav(() => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const n = getNav(), label = describe(n)
      if (!label) return
      const state = { tab: n.tab, seg: n.seg?.[n.tab] || null, params: n.params?.[n.tab] || {} }
      const key = JSON.stringify(state)
      if (key === lastKey) return
      lastKey = key
      put('live', { id: 'resume', state, label, dev: deviceName(), by: deviceId })
    }, 4000)
  })
}

// 다른 기기에서 30분 안에 본 화면이면 배너
export function useResume() {
  useColl('live')
  const [, set] = useState(0)
  useEffect(() => subscribe(() => set((x) => x + 1)), [])
  const r = find('live', 'resume')
  let dismissed = ''
  try { dismissed = sessionStorage.getItem('resumeSeen') || '' } catch {}
  if (!r || r.deviceId === deviceId || Date.now() - (r.updatedAt || 0) > 30 * 60000) return null
  const key = r.deviceId + ':' + r.updatedAt
  if (dismissed === key) return null
  const dismiss = () => { try { sessionStorage.setItem('resumeSeen', key) } catch {} set((x) => x + 1) }
  const open = () => { const s = r.state; go(s.tab, s.seg || undefined, s.params); dismiss() }
  return { label: r.label, dev: r.dev || '다른 기기', open, dismiss }
}
