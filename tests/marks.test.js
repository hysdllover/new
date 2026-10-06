import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyMark, activeMarks, markRuns } from '../src/lib/marks.js'

const ap = (t, a, z, k) => applyMark(t, a, z, k)?.text

test('선택 감싸기 · 다시 누르면 풀기', () => {
  assert.equal(ap('사과 바나나', 3, 6, 'h'), '사과 ==바나나==')
  assert.equal(ap('사과 ==바나나==', 5, 8, 'h'), '사과 바나나')
  assert.equal(ap('사과 바나나', 0, 2, 'u'), '__사과__ 바나나')
  assert.equal(ap('__사과__ 바나나', 2, 4, 'u'), '사과 바나나')
})

test('커서만 있으면 그 자리 단어 · 이미 꾸민 구간이면 그 구간', () => {
  assert.equal(ap('사과 바나나', 4, 4, 'h:r'), '사과 ==r:바나나==')
  assert.equal(ap('사과 ==r:바나나==', 10, 10, 'h:r'), '사과 바나나')
  assert.equal(ap('', 0, 0, 'h'), undefined)
})

test('형광 색 바꾸기 · 지우기', () => {
  assert.equal(ap('==r:바나나==', 4, 7, 'h:g'), '==g:바나나==')
  assert.equal(ap('==r:바나나==', 4, 7, 'h'), '==바나나==')
  assert.equal(ap('**굵게** ==형광== __밑줄__', 0, 22, 'c'), '굵게 형광 밑줄')
})

test('겹쳐 꾸미기 · 엇갈리지 않게 넓히기', () => {
  assert.equal(ap('**굵게**', 2, 4, 'h'), '**==굵게==**')
  assert.equal(ap('**ab**cd', 3, 7, 'u'), '__**ab**c__d')
  assert.equal(ap('a ==b== c', 0, 9, 'h'), '==a b c==')
})

test('켜진 꾸밈 · 편집 칸 모양', () => {
  assert.deepEqual(activeMarks('==g:바나나== x', 5, 5), { h: 'g' })
  assert.deepEqual(activeMarks('**a**', 2, 3), { b: true })
  const r = markRuns('a ==b==')
  assert.deepEqual(r.map((x) => [x.x, !!x.mk, x.h || '']), [['a ', false, ''], ['==', true, ''], ['b', false, 'd'], ['==', true, '']])
})
