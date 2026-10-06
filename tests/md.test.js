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

test('줄 안 꾸밈 · 강조 상자 · 코드 · 파일 가져오기', async () => {
  const { inlineMd, mdToBlocks, mdToNote } = await import('../src/lib/md.js')
  assert.equal(inlineMd('**굵게** *기울임* ~~취소~~ `코드` [구글](https://g.co) <mark>형광</mark>'), '**굵게** 기울임 취소 코드 구글 https://g.co ==형광==')
  assert.equal(inlineMd('__밑줄__ 그대로'), '__밑줄__ 그대로')
  const b = mdToBlocks('> [!warning] 주의할 점\n> 둘째 줄\n```\nconst a = 1\n```')
  assert.deepEqual(b.map((x) => [x.type, x.text, x.tone]), [['callout', '주의할 점 둘째 줄', 'warn'], ['quote', 'const a = 1', undefined]])
  const n = mdToNote('---\ntags: x\n---\n# 광합성\n- 명반응', '노트.md')
  assert.equal(n.title, '광합성'); assert.deepEqual(n.blocks.map((x) => x.type), ['bullet'])
  assert.equal(mdToNote('본문만', '독서 기출.md').title, '독서 기출')
  assert.equal(mdToNote('---\ntitle: "속성 제목"\n---\n글', 'a.md').title, '속성 제목')
})
