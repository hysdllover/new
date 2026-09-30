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
