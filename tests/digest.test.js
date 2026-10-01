import { test } from 'node:test'
import assert from 'node:assert/strict'
import { digestDue, digestText } from '../src/engine/reminders.js'

const D = '2026-10-01'
const tasks = [
  { id: 'a', title: '수학 과제', due: D, dueTime: 14 * 60, reminders: [0, 60] }, // 13:00·14:00 → 12:30 요약
  { id: 'b', title: '영어 단어', due: D, dueTime: null, reminders: ['am'] },     // 09:00 → 07:30 요약
  { id: 'c', title: '독서', due: '2026-10-02', dueTime: 7 * 60, reminders: [0] }, // 내일 07:00 → 오늘 18:00 요약
]
test('요약 시각마다 다음 요약 전까지 예정된 알림', () => {
  assert.deepEqual(digestDue(tasks, D, 7 * 60 + 30).items.map((x) => x.t.id), ['b'])
  const noon = digestDue(tasks, D, 12 * 60 + 35)
  assert.deepEqual(noon.items.map((x) => x.t.id), ['a']) // 한 할 일은 한 번만
  assert.equal(noon.key, 'dg:2026-10-01:750')
  assert.deepEqual(digestDue(tasks, D, 18 * 60).items.map((x) => x.t.id), ['c'])
  assert.equal(digestDue(tasks, D, 10 * 60), null)
  assert.match(digestText(noon.items).body, /수학 과제/)
})
import { isQuiet, nightMissed } from '../src/engine/reminders.js'
test('자는 시간 판단·밤사이 알림', () => {
  assert.equal(isQuiet(6 * 60, 7 * 60, 1440), true)
  assert.equal(isQuiet(23 * 60, 7 * 60, 1440), false)
  assert.equal(isQuiet(30, 7 * 60, 60), false) // 01:00 취침 → 00:30 깨어 있음
  assert.equal(isQuiet(90, 7 * 60, 60), true)
  const ts = [{ id: 'x', title: '독서', due: D, dueTime: 6 * 60, reminders: [0] }]
  assert.deepEqual(nightMissed(ts, D, 7 * 60, 1440).map((x) => x.t.id), ['x'])
})
