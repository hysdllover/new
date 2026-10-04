import { scheduleTask } from '../../store/actions.js'
import { createElement as h } from 'react'
import { patch, batch } from '../../store/store.js'
import { cascade } from '../../engine/scheduler.js'
import { fmtTime } from '../../engine/date.js'
import { openSheet } from '../../components/ui.jsx'

// 블록/일정 이동 시 연쇄 재조정 미리보기 → 확정
// moved: 블록 레코드 또는 { id, date, start, dur, isEvent }
export function applyCascadeChange(moved) {
  const changes = cascade(moved.date, { id: moved.id, start: moved.start, dur: moved.dur })
  const commit = () => batch(() => {
    if (moved.isEvent) patch('events', moved.id, { start: moved.start, end: moved.start + moved.dur, date: moved.date })
    else patch('blocks', moved.id, { start: moved.start, dur: moved.dur, date: moved.date })
    for (const c of changes) patch('blocks', c.id, { start: c.to })
  })
  if (!changes.length) return commit()
  openSheet((close) => h('div', { className: 'col' },
    h('div', { className: 'small muted' }, `${fmtTime(moved.start)}로 옮기면 뒤따르는 ${changes.length}개 항목이 함께 밀립니다.`),
    h('div', { className: 'list' }, changes.map((c) => h('div', { key: c.id, className: 'item' },
      h('div', { className: 't' }, c.title || '블록'),
      h('div', { className: 'small nowrap' }, h('span', { className: 'muted', style: { textDecoration: 'line-through' } }, fmtTime(c.from)), ' → ', h('b', null, fmtTime(c.to))),
    ))),
    h('div', { className: 'row', style: { justifyContent: 'flex-end' } },
      h('button', { className: 'btn', onClick: () => { close(); batch(() => moved.isEvent ? patch('events', moved.id, { start: moved.start, end: moved.start + moved.dur }) : patch('blocks', moved.id, { start: moved.start, dur: moved.dur, date: moved.date })) } }, '이것만 이동'),
      h('button', { className: 'btn primary', onClick: () => { close(); commit() } }, '함께 밀기'),
    ),
  ), { title: '연쇄 재조정 미리보기' })
}

// 할 일을 타임라인(data-drop="timeline:날짜")에 놓으면 그 시각에 배정 — 할 일 화면·아이패드 2단에서 공용
export function dropTaskOnTimeline(t, zone, pt) {
  const d = zone?.dataset?.drop
  if (!d?.startsWith('timeline:')) return false
  const date = d.slice(9), r = zone.getBoundingClientRect()
  const m = Math.max(0, Math.round((+zone.dataset.start + (pt.y - r.top) - 15) / 10) * 10)
  const b = scheduleTask(t.id, date, m, t.estimate || 30)
  if (b) applyCascadeChange(b)
  return true
}
