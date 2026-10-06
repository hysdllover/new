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
  assert.equal(inlineMd('__굵게__ <u>밑줄</u>'), '**굵게** __밑줄__')
  const b = mdToBlocks('> [!warning] 주의할 점\n> 둘째 줄\n```\nconst a = 1\n```')
  assert.deepEqual(b.map((x) => [x.type, x.text, x.tone]), [['callout', '주의할 점\n둘째 줄', 'warn'], ['code', 'const a = 1', undefined]])
  const n = mdToNote('---\ntags: x\n---\n# 광합성\n- 명반응', '노트.md')
  assert.equal(n.title, '광합성'); assert.deepEqual(n.blocks.map((x) => x.type), ['bullet'])
  assert.equal(mdToNote('본문만', '독서 기출.md').title, '독서 기출')
  assert.equal(mdToNote('---\ntitle: "속성 제목"\n---\n글', 'a.md').title, '속성 제목')
})

test('들여쓰기 · 번호 · 밑줄형 제목 · 표 정렬 · 이름 정리', async () => {
  const { mdToBlocks, mdToNote, cleanName } = await import('../src/lib/md.js')
  const b = mdToBlocks('큰 제목\n===\n- a\n  - b\n1. 하나\n2. 둘\n| x | y |\n|:-:|--:|\n| 1 | 2 |')
  assert.deepEqual(b.map((x) => [x.type, x.indent || 0, x.num || 0]), [['h1', 0, 0], ['bullet', 0, 0], ['bullet', 1, 0], ['bullet', 0, 1], ['bullet', 0, 2], ['table', 0, 0]])
  assert.deepEqual(b[5].align, ['c', 'r'])
  assert.equal(cleanName('독서 기출 0123456789abcdef0123456789abcdef.md'), '독서 기출')
  const n = mdToNote('# 제목\n## 소제목\n### 더 작은\n본문', 'a.md')
  assert.deepEqual(n.blocks.map((x) => x.type), ['h1', 'h2', 'text'])
})
