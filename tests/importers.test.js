import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zipSync, strToU8 } from 'fflate'

const zipFile = (files, name) => { const u8 = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v]))); return { name, arrayBuffer: async () => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) } }

test('노션 zip: 하위 페이지 · 그림 · 링크', async () => {
  const { planFromZip } = await import('../src/lib/importPlan.js')
  const h = '0123456789abcdef0123456789abcdef', h2 = 'fedcba9876543210fedcba9876543210'
  const plan = await planFromZip(zipFile({
    [`경제 ${h}.md`]: `# 경제\n\n요약 **중요**\n\n![도표](${encodeURIComponent('경제 ' + h)}/chart.png)\n\n[금리](${encodeURIComponent('경제 ' + h)}/${encodeURIComponent('금리 ' + h2)}.md)\n\n- [x] 끝낸 일`,
    [`경제 ${h}/금리 ${h2}.md`]: '# 금리\n\n금리가 오르면 채권 가격은 내려간다',
    [`경제 ${h}/chart.png`]: new Uint8Array([137, 80, 78, 71]),
  }, 'Export.zip'))
  assert.equal(plan.kind, '노션')
  const top = plan.pages.find((p) => p.title === '경제'), sub = plan.pages.find((p) => p.title === '금리')
  assert.ok(top && sub); assert.equal(sub.parent, top.key)
  assert.deepEqual(top.blocks.map((b) => b.type), ['text', 'file', 'page', 'todo'])
  assert.equal(Object.keys(plan.imgs).length, 1)
})

test('옵시디언: 폴더 → 부모 페이지 · ![[그림]]', async () => {
  const { planFromZip } = await import('../src/lib/importPlan.js')
  const plan = await planFromZip(zipFile({
    'vault/수학/이차함수.md': '# 이차함수\n\n![[graph.png]]\n\n[[일차함수]] 와 비교',
    'vault/수학/일차함수.md': '기울기',
    'vault/attachments/graph.png': new Uint8Array([1, 2, 3]),
    'vault/.obsidian/app.json': '{}',
  }, 'vault.zip'))
  const dir = plan.pages.find((p) => p.title === '수학'), q = plan.pages.find((p) => p.title === '이차함수')
  assert.ok(dir, '폴더 페이지'); assert.equal(q.parent, dir.key)
  assert.equal(q.blocks[0].type, 'file'); assert.match(q.blocks[1].text, /\[\[일차함수\]\]/)
  assert.ok(!plan.pages.some((p) => p.title === 'vault'), '맨 위 하나뿐인 폴더는 건너뜀')
})
