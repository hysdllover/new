import test from 'node:test'
import assert from 'node:assert/strict'
import { sectionsOf, judge, clampPart, passLine, maxTotal, jlptDates, areasOf } from '../src/lib/exams.js'

test('JLPT N2: 총점 90 이상 + 영역 기준점 19 이상이면 합격', () => {
  const e = { kind: 'jlpt', level: 'N2', target: 120 }
  assert.equal(maxTotal(e), 180)
  assert.equal(passLine(e), 90)
  const ok = judge(e, { parts: { lk: 30, rd: 30, li: 30 } })
  assert.equal(ok.total, 90); assert.equal(ok.pass, true); assert.equal(ok.toTarget, 30)
  const low = judge(e, { parts: { lk: 50, rd: 50, li: 18 } })
  assert.equal(low.total, 118); assert.equal(low.pass, false); assert.deepEqual(low.fail, ['청해'])
})

test('JLPT N4 · N5: 언어지식·독해 120 + 청해 60, 기준점 38 · 19', () => {
  const e = { kind: 'jlpt', level: 'N5' }
  assert.deepEqual(sectionsOf(e).map((s) => [s.max, s.min]), [[120, 38], [60, 19]])
  assert.equal(judge(e, { parts: { lk: 60, li: 20 } }).pass, true)
  assert.equal(judge(e, { parts: { lk: 37, li: 60 } }).pass, false)
})

test('점수를 다 넣지 않으면 합격 판정 없음', () => {
  assert.equal(judge({ kind: 'jlpt', level: 'N1' }, { parts: { lk: 50 } }).pass, null)
})

test('토익: 5점 단위 · 5~495 · 합계 990', () => {
  const e = { kind: 'toeic' }
  assert.equal(clampPart(e, 'lc', 412), 410)
  assert.equal(clampPart(e, 'rc', 600), 495)
  assert.equal(clampPart(e, 'rc', 0), 5)
  assert.equal(judge(e, { parts: { lc: 400, rc: 350 } }).total, 750)
  assert.equal(passLine(e), null)
})

test('직접 만든 시험: 영역 · 합격 점수', () => {
  const e = { kind: 'custom', name: 'JPT', pass: 600, sections: [{ id: 'a', name: '청해', max: 495 }, { id: 'b', name: '독해', max: 495 }] }
  assert.equal(maxTotal(e), 990)
  assert.equal(judge(e, { parts: { a: 300, b: 310 } }).pass, true)
  assert.deepEqual(areasOf({ ...e, areas: ['어휘'] }), ['어휘'])
})

test('JLPT 정기 시험일: 7월 · 12월 첫째 일요일', () => {
  assert.deepEqual(jlptDates('2026-11-20'), ['2026-12-06', '2027-07-04'])
})
