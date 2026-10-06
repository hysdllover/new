import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSeries, seriesSummary } from '../src/lib/series.js'

test('하루 1개씩 · 하루 2개씩', () => {
  const a = planSeries({ prefix: '파피루스 day', from: 1, to: 3, start: '2026-10-07' })
  assert.deepEqual(a.map((x) => [x.title, x.due]), [['파피루스 day1', '2026-10-07'], ['파피루스 day2', '2026-10-08'], ['파피루스 day3', '2026-10-09']])
  const b = planSeries({ prefix: 'day', from: 1, to: 3, start: '2026-10-07', perDay: 2 })
  assert.deepEqual(b.map((x) => x.due), ['2026-10-07', '2026-10-07', '2026-10-08'])
})

test('요일 고르기 · 뒤 글자', () => {
  // 2026-10-09 금 → 월·수만: 10/12(월), 10/14(수)
  const a = planSeries({ prefix: '우기분 ', suffix: '강', from: 3, to: 4, start: '2026-10-09', days: [1, 3] })
  assert.deepEqual(a.map((x) => [x.title, x.due]), [['우기분 3강', '2026-10-12'], ['우기분 4강', '2026-10-14']])
})

test('진행 요약', () => {
  const ts = [{ seriesId: 's', seriesName: 'day', seriesN: 1, title: 'day1', done: true, doneAt: Date.now() }, { seriesId: 's', seriesN: 2, title: 'day2', due: '2026-10-08' }, { seriesId: 's', seriesN: 3, title: 'day3' }]
  const [s] = seriesSummary(ts)
  assert.equal(s.d, 1); assert.equal(s.n, 3); assert.equal(s.next.title, 'day2')
})
