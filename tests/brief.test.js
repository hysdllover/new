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

import { eveningBrief, handleLate, eventRemind, kindOn } from '../src/engine/reminders.js'

test('저녁 마감: 공부 · 남은 할 일', () => {
  const x = eveningBrief({ date: '2026-10-28', studied: 130, goal: 240, tasks: [{ due: '2026-10-28' }, { due: '2026-10-27' }, { due: '2026-10-29' }, { due: '2026-10-28', done: true }] })
  assert.equal(x.title, '오늘 마감할 시간')
  assert.equal(x.body, '공부 2시간 10분 · 목표의 54%\n남은 할 일 2개 · 눌러서 하루 마감하기')
  assert.equal(eveningBrief({ date: '2026-10-28', studied: 250, goal: 240 }).title, '오늘 목표 달성 · 마감할 시간')
})

test('늦은 알림: 묶기 · 건너뛰기 · 하나씩', () => {
  const out = [{ key: 'a', title: 'A', late: 5 }, { key: 'b', title: 'B', late: 40 }, { key: 'c', title: 'C', body: '줄1\n줄2', late: 90 }]
  const b = handleLate(out, 'bundle', 'miss:x')
  assert.deepEqual(b.send.map((n) => n.key), ['a', 'miss:x'])
  assert.equal(b.send[1].body, '· B\n· C — 줄1')
  assert.deepEqual(handleLate(out, 'skip').send.map((n) => n.key), ['a'])
  assert.equal(handleLate(out, 'each').send.length, 3)
})

test('일정 기본 알림 · 종류 끄기', () => {
  const st = { eventRemind: 10, academyRemind: 30, notifyOff: { med: true } }
  assert.equal(eventRemind({}, st), 10)
  assert.equal(eventRemind({ layer: 'academy' }, st), 30)
  assert.equal(eventRemind({ remind: null }, st), null)
  assert.equal(eventRemind({ remind: 5 }, st), 5)
  assert.equal(eventRemind({}, {}), null)
  assert.equal(kindOn(st, 'med'), false)
  assert.equal(kindOn(st, 'task'), true)
})

import { plainNote } from '../src/engine/reminders.js'
test('알림 한 줄', () => {
  assert.deepEqual(plainNote('수학 학원', '15:00 시작'), { title: 'info.', body: '수학 학원 · 15:00 시작' })
  assert.deepEqual(plainNote('10월 28일 · 오늘', '일정 없음\n할 일 2개'), { title: 'info.', body: '10월 28일 · 오늘\n일정 없음\n할 일 2개' })
  assert.deepEqual(plainNote('제목만', ''), { title: 'info.', body: '제목만' })
})
