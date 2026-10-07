// 위젯 스크립트의 형태마다 설정 화면 미리보기가 있는지 (빠지면 미리보기를 누를 때 화면이 멈췄던 문제 재발 방지)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { WIDGET_KINDS } from '../src/lib/scriptable.js'

test('모든 위젯 형태에 설정 미리보기가 있음', () => {
  const src = readFileSync(new URL('../src/views/Settings.jsx', import.meta.url), 'utf8')
  const keys = new Set([...src.matchAll(/V\['([^']*)'\]\s*=/g)].map((m) => m[1]))
  if (/V\['구성' \+ \(i \+ 1\)\]/.test(src)) ['구성1', '구성2', '구성3'].forEach((k) => keys.add(k)) // 내 위젯 1~3 은 반복문으로
  const start = src.indexOf('const V = {'), body = src.slice(start, src.indexOf('\n  }\n', start))
  for (const m of body.matchAll(/^ {4}(?:'([^']*)'|([^\s:'[\]()]+)):\s*\[/gm)) keys.add(m[1] ?? m[2])
  const missing = WIDGET_KINDS.map(([k]) => k).filter((k) => !keys.has(k))
  assert.deepEqual(missing, [], '미리보기 없는 형태: ' + missing.join(', '))
})
