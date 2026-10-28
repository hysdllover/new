import { test } from 'node:test'
import assert from 'node:assert/strict'
import { morningBrief } from '../src/engine/reminders.js'

test('아침 브리핑: 일정 · Top 3 · D-day', () => {
  const x = morningBrief({
    date: '2026-10-28',
    events: [{ title: '영어 학원', start: 17 * 60 }, { title: '엄마 생일', start: null }, { title: '스터디', start: 9 * 60 }],
    tasks: [{ id: 'a', title: '수학 3단원' }, { id: 'b', title: '영단어', done: true }, { id: 'c', title: '국어', due: '2026-10-28' }],
    days: [{ id: '2026-10-28', top3: ['a', 'b'] }],
    ddays: [{ title: '지난', date: '2026-10-01' }, { title: '중간고사', date: '2026-11-03' }],
  })
  assert.equal(x.title, '10월 28일 수요일 · 오늘')
  assert.equal(x.body, '일정 · 엄마 생일 · 09:00 스터디 · 17:00 영어 학원\nTop 3 · 수학 3단원\n중간고사 D-6')
})

test('아침 브리핑: 비었을 때 · 고정 D-day 먼저', () => {
  const x = morningBrief({ date: '2026-10-28', tasks: [{ id: 'c', title: '국어', due: '2026-10-27' }], ddays: [{ title: '가까움', date: '2026-10-29' }, { title: '수능', date: '2026-11-19', pinned: true }] })
  assert.equal(x.body, '일정 없음\n할 일 1개\n수능 D-22')
})
