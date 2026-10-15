import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDay, notionBlocks, notionProps } from '../src/lib/notionDay.js'

const D = '2026-10-15'
const data = {
  subjects: { k: { name: '국어' }, e: { name: '영어' } },
  tasks: {
    a: { id: 'a', title: '2109 예술정의-작품비평', subjectId: 'k', due: D, done: true },
    b: { id: 'b', title: '2309 아도르노 미학', subjectId: 'k', due: D },
    x: { id: 'x', title: '지운 할 일', due: D, deleted: true },
  },
  sessions: {
    s1: { date: D, subjectId: 'k', taskId: 'a', dur: 60 },
    s2: { date: D, subjectId: 'k', note: '2109 예술정의 복습', dur: 27 },
    s3: { date: D, subjectId: 'e', note: '파우스트 35회 오답', dur: 16 },
    s4: { date: '2026-10-14', subjectId: 'e', dur: 10 },
  },
  days: { [D]: { comment: '오늘 한 줄' } },
}

test('할 일 기준 · 메모로 할 일 찾기 · 할 일 외 기록은 완료로', () => {
  const d = buildDay(data, D)
  assert.equal(d.title, '10.15 thu')
  assert.equal(d.total, 103)
  assert.deepEqual(d.subjects, ['국어', '영어'])
  assert.deepEqual(d.groups[0].items.map((i) => [i.title, i.done, i.min]), [['2109 예술정의-작품비평', true, 87], ['2309 아도르노 미학', false, 0]])
  assert.deepEqual(d.groups[1].items.map((i) => [i.title, i.done, i.min]), [['파우스트 35회 오답', true, 16]])
  assert.equal(`${d.done}/${d.count}`, '2/3')
})

test('노션 형식', () => {
  const d = buildDay(data, D)
  const p = notionProps(d)
  assert.equal(p['to-do'].rich_text[0].text.content, '2/3')
  assert.equal(p['one line'].rich_text[0].text.content, '오늘 한 줄')
  const b = notionBlocks(d)
  assert.deepEqual(b.map((x) => x.type), ['quote', 'paragraph', 'callout', 'callout'])
  assert.equal(b[2].callout.children.filter((c) => c.type === 'to_do').length, 2)
  assert.equal(buildDay(data, '2026-10-01'), null)
})
