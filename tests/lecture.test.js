import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lectureStats, studyDays } from '../src/engine/lecture.js'

const T = '2026-09-30' // 수요일

test('남은 시간: 강별 길이·평균·배속', () => {
  const s = lectureStats({ total: 4, avgMin: 40, lens: [30, 60], speed: 1.5, done: { 1: '2026-09-29' } }, T)
  assert.equal(s.doneN, 1); assert.equal(s.left, 3); assert.equal(s.next, 2)
  assert.equal(s.leftMin, Math.round((60 + 40 + 40) / 1.5))
})

test('듣는 요일 기준 하루 분량 (오늘 들은 것 포함)', () => {
  const l = { total: 10, days: [1, 2, 3, 4, 5], goal: '2026-10-06', done: { 1: T } } // 수~다음 화 평일 5일
  assert.equal(studyDays(l, T, '2026-10-06'), 5)
  const s = lectureStats(l, T)
  assert.equal(s.perDay, 2); assert.equal(s.todayDone, 1); assert.equal(s.todayLeft, 1)
})

test('최근 속도로 예정일, 기한 초과', () => {
  const done = {}; for (let i = 1; i <= 7; i++) done[i] = `2026-09-${String(16 + i * 2).padStart(2, '0')}` // 14일에 7강
  const l = { total: 17, done, expires: '2026-10-10' }
  const s = lectureStats(l, T)
  assert.equal(s.pace, 0.5)
  assert.equal(s.eta, '2026-10-19') // 10강 ÷ 0.5 = 20일째
  assert.equal(s.late, true)
  assert.equal(lectureStats({ ...l, expires: '2026-12-01' }, T).late, false)
  assert.equal(lectureStats({ total: 2, done: { 1: T, 2: T } }, T).eta, T)
})
