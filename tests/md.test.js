import { test } from 'node:test'
import assert from 'node:assert/strict'

test('마크다운 → 블록', async () => {
  const { mdToBlocks, looksMd } = await import('../src/lib/md.js')
  const b = mdToBlocks('# 광합성\n\n- 명반응\n1. 암반응\n- [ ] 그림\n- [x] 요약\n> 인용\n---\n| a | b |\n|---|---|\n| 1 | 2 |\n그냥 글')
  assert.deepEqual(b.map((x) => x.type), ['h1', 'bullet', 'bullet', 'todo', 'todo', 'quote', 'divider', 'table', 'text'])
  assert.deepEqual(b[7].rows, [['a', 'b'], ['1', '2']])
  assert.equal(b[4].done, true)
  assert.ok(looksMd('# a\nb')); assert.ok(!looksMd('그냥 한 줄'))
})
