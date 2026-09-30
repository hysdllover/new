import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reminderTimes, absMinutes, reminderBody, taskReminders } from '../src/engine/reminders.js'

test('하루 전·정시·N분 전 절대 시각', () => {
  const t = { due: '2026-10-02', dueTime: 14 * 60, reminders: [0, 30, 1440, 'am'] }
  const at = Object.fromEntries(reminderTimes(t).map((r) => [r.off, r.at]))
  assert.equal(at[0], absMinutes('2026-10-02', 840))
  assert.equal(at[30], absMinutes('2026-10-02', 810))
  assert.equal(at[1440], absMinutes('2026-10-01', 840)) // 전날 같은 시각
  assert.equal(at.am, absMinutes('2026-10-02', 540))
})

test('시간 없는 할 일은 9시 기준, 완료·보관은 제외', () => {
  assert.equal(reminderTimes({ due: '2026-10-02', reminders: [60] })[0].at, absMinutes('2026-10-02', 480))
  assert.deepEqual(reminderTimes({ due: '2026-10-02', done: true, reminders: [0] }), [])
  assert.deepEqual(reminderTimes({ reminders: [0] }), [])
})

test('예전 remind 값 인식·문구', () => {
  assert.deepEqual(taskReminders({ remind: 15, dueTime: 600 }), [15])
  assert.equal(reminderBody({ dueTime: 600 }, 1440), '내일 10:00 마감')
  assert.equal(reminderBody({ dueTime: 600 }, 30), '30분 뒤 마감')
})
