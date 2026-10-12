import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultPeriods, classesFor, isSchoolDay } from '../src/engine/timetable.js'

test('기본 교시 시간', () => {
  const p = defaultPeriods()
  assert.equal(p.length, 7)
  assert.deepEqual(p[0], { start: 520, end: 570 })
  assert.equal(p[4].start, p[3].end + 60) // 점심
  assert.equal(p[1].start, p[0].end + 10)
})

test('요일·방학·과목 색', () => {
  const tt = { on: true, days: [1, 2, 3, 4, 5], periods: defaultPeriods(), cells: { '3-1': { subjectId: 's1' }, '3-2': { title: '창체', room: '강당' } }, off: [{ from: '2026-10-05', to: '2026-10-09' }] }
  const subs = [{ id: 's1', name: '수학', color: '#789' }]
  const c = classesFor(tt, '2026-09-30', subs) // 수요일
  assert.equal(c.length, 2)
  assert.equal(c[0].title, '수학'); assert.equal(c[0].color, '#789'); assert.equal(c[0].start, 520)
  assert.equal(c[1].room, '강당')
  assert.equal(classesFor(tt, '2026-10-07', subs).length, 0) // 방학
  assert.equal(isSchoolDay(tt, '2026-10-04'), false) // 일요일
  assert.equal(classesFor({ ...tt, on: false }, '2026-09-30', subs).length, 0)
})

test('주말 독서실 시간표', () => {
  const tt = { on: true, days: [1, 2, 3, 4, 5], periods: defaultPeriods(), cells: { '6-1': { subjectId: 's1' } }, off: [{ from: '2026-10-01', to: '2026-10-31' }], wk: { cells: { '6-1': { title: '국어', room: '독서실' }, '0-2': { subjectId: 's1' } } } }
  const subs = [{ id: 's1', name: '수학', color: '#789' }]
  const sat = classesFor(tt, '2026-10-10', subs) // 토요일 · 방학이어도 주말 시간표는 그대로
  assert.equal(sat.length, 1); assert.equal(sat[0].title, '국어'); assert.equal(sat[0].start, 540); assert.equal(sat[0].wk, true); assert.equal(sat[0].id, 'tt-2026-10-10-w1')
  assert.equal(classesFor(tt, '2026-10-11', subs)[0].start, 540 + 90) // 일요일 2교시
  assert.equal(classesFor({ ...tt, wk: { ...tt.wk, on: false } }, '2026-10-10', subs).length, 0)
  // 토요일 수업이 있으면 학교 시간표가 먼저
  const sch = classesFor({ ...tt, days: [1, 2, 3, 4, 5, 6], off: [] }, '2026-10-10', subs)
  assert.equal(sch[0].title, '수학'); assert.equal(sch[0].wk, undefined)
  assert.equal(classesFor(tt, '2026-10-12', subs).length, 0) // 평일 · 방학
})
