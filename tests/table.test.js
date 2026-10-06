import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as T from '../src/lib/table.js'
import { mdToBlocks, mdToNote } from '../src/lib/md.js'

const b = { rows: [['이름', '점수'], ['가', '10'], ['나', '9'], ['다', '']], align: ['l', 'r'], colW: ['n', 's'] }

test('줄·칸 옮기기 · 넣기 · 지우기 (정렬·너비도 함께)', () => {
  assert.deepEqual(T.moveRow(b, 1, 3).rows.map((r) => r[0]), ['이름', '나', '다', '가'])
  const m = T.moveCol(b, 0, 1)
  assert.deepEqual(m.rows[0], ['점수', '이름']); assert.deepEqual(m.align, ['r', 'l']); assert.deepEqual(m.colW, ['s', 'n'])
  const i = T.insCol(b, 1)
  assert.deepEqual(i.rows[1], ['가', '', '10']); assert.deepEqual(i.align, ['l', 'l', 'r'])
  assert.deepEqual(T.delCol(b, 0).align, ['r'])
  assert.equal(T.insRow(b, 0).rows[0].join(''), '')
  assert.equal(T.delRow(b, 2).rows.length, 3)
  assert.deepEqual(T.dupRow(b, 1).rows[2], ['가', '10'])
})

test('정렬: 머리줄 고정 · 숫자 크기 · 빈 칸 뒤', () => {
  assert.deepEqual(T.sortBy(b, 1, 1).rows.map((r) => r[1]), ['점수', '9', '10', ''])
  assert.deepEqual(T.sortBy(b, 1, -1).rows.map((r) => r[1]), ['점수', '10', '9', ''])
  assert.deepEqual(T.sortBy({ ...b, head: false }, 0, 1).rows.map((r) => r[0]), ['가', '나', '다', '이름'])
})

test('시트 붙여넣기 · 복사 · 마크다운', () => {
  const g = T.parseGrid('a\tb\n"c\nd"\te')
  assert.deepEqual(g, [['a', 'b'], ['c\nd', 'e']])
  const p = T.pasteGrid(b, 3, 1, g)
  assert.equal(p.rows.length, 5); assert.equal(p.rows[0].length, 3); assert.equal(p.rows[4][2], 'e')
  assert.equal(T.toTSV({ rows: [['a', 'x\ty']] }), 'a\t"x\ty"')
  const md = T.tableMd({ rows: [['a|b', 'c'], ['1\n2', '3']], align: ['c', 'r'] }).join('\n')
  assert.match(md, /a\\\|b/); assert.match(md, /:---:/); assert.match(md, /1<br>2/)
  const back = mdToBlocks(md)[0]
  assert.deepEqual(back.rows, [['a|b', 'c'], ['1\n2', '3']]); assert.deepEqual(back.align, ['c', 'r'])
})

test('가져오기: details · aside · HTML 표 · 수식 · csv · 제목 3단계', () => {
  const bs = mdToBlocks('<details><summary>열기</summary>\n\n- [x] 끝\n\n</details>\n\n<aside>\n💡 팁\n</aside>\n\n<table><tr><td>1</td><td>2</td></tr></table>\n\n$$\nx^2\n$$\n\n# A\n## B\n### C')
  assert.deepEqual(bs.map((x) => x.type), ['toggle', 'callout', 'table', 'code', 'h1', 'h2', 'text'])
  assert.equal(bs[0].children[0].type, 'todo'); assert.equal(bs[0].children[0].done, true)
  assert.equal(bs[6].text, '**C**')
  const n = mdToNote('이름,점수\n"가, 나",10\n', '성적 0123456789abcdef0123456789abcdef.csv')
  assert.equal(n.title, '성적'); assert.deepEqual(n.blocks[0].rows, [['이름', '점수'], ['가, 나', '10']])
})
