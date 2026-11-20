import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeColl } from '../src/sync/merge.js'
import { dday, weekStart, addDays, hm, rel } from '../src/lib/date.js'
import { WIDGET_KINDS, buildLoader } from '../src/lib/scriptable.js'

test('병합: 나중에 고친 쪽이 남음 · 지운 표식도 전파', () => {
  const l = { a: { id: 'a', t: 1, updatedAt: 10 }, b: { id: 'b', updatedAt: 5 } }
  const r = { a: { id: 'a', t: 2, updatedAt: 20 }, b: { id: 'b', deleted: true, updatedAt: 6 }, c: { id: 'c', updatedAt: 1 } }
  const { merged, received } = mergeColl(l, r)
  assert.equal(merged.a.t, 2); assert.equal(merged.b.deleted, true); assert.ok(merged.c); assert.equal(received, 3)
  assert.equal(mergeColl(r, l).merged.a.t, 2)
})

test('날짜', () => {
  assert.equal(dday('2026-12-06', '2026-11-20'), 'D-16')
  assert.equal(dday('2026-11-20', '2026-11-20'), 'D-DAY')
  assert.equal(weekStart('2026-11-20', 1), '2026-11-16')
  assert.equal(weekStart('2026-11-20', 0), '2026-11-15')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(hm(125), '2:05')
  assert.equal(rel('2026-11-21', '2026-11-20'), '내일')
})

test('위젯: 모든 형태가 본체 · 미리보기에 있음', () => {
  const core = readFileSync(new URL('../src/widget/core.js', import.meta.url), 'utf8')
  const prev = readFileSync(new URL('../src/views/WidgetPreview.jsx', import.meta.url), 'utf8')
  const P = JSON.parse(prev.match(/export const PREVIEW_KINDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'))
  for (const [k] of WIDGET_KINDS) {
    assert.ok(P.includes(k), '미리보기에 없음: ' + k)
    assert.ok(core.includes(`'${k}':`), '본체에 없음: ' + k)
  }
  assert.ok(core.includes('EXAM_CORE'))
  assert.doesNotThrow(() => new Function('module', 'config', core))
})

test('위젯 로더: 토큰을 넣지 않음', () => {
  const s = buildLoader({ widgetRaw: 'https://gist.githubusercontent.com/u/x/raw/widget.json', appUrl: 'https://a/' })
  assert.ok(!/ghp_|Bearer|Authorization|Keychain/.test(s))
  assert.ok(s.includes('EXAM_CORE') && s.includes('importModule'))
})
