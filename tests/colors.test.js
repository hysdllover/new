import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickColor, hue, harmonize } from '../src/lib/colors.js'
test('겹치지 않고 색상이 먼 색 고르기', () => {
  const used = ['#4a5a78', '#7a8660']
  const c = pickColor(used)
  assert.ok(!used.includes(c))
  assert.ok(hue(c) != null)
  const h = harmonize(5); assert.equal(new Set(h).size, 5)
})
