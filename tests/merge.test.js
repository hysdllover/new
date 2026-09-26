import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeColl, stableFile } from '../src/sync/merge.js'

test('각 기기에서 다른 레코드를 수정하면 둘 다 보존', () => {
  const local = { a: { id: 'a', title: 'A-ipad', updatedAt: 200, deviceId: 'ipad' }, b: { id: 'b', title: 'B', updatedAt: 100, deviceId: 'ipad' } }
  const remote = { a: { id: 'a', title: 'A', updatedAt: 100, deviceId: 'ipad' }, b: { id: 'b', title: 'B-phone', updatedAt: 150, deviceId: 'phone' } }
  const { merged, localChanged } = mergeColl(local, remote)
  assert.equal(merged.a.title, 'A-ipad')
  assert.equal(merged.b.title, 'B-phone')
  assert.equal(localChanged, true)
})

test('같은 레코드는 최신 수정이 이김', () => {
  const { merged } = mergeColl({ a: { id: 'a', v: 1, updatedAt: 300, deviceId: 'x' } }, { a: { id: 'a', v: 2, updatedAt: 250, deviceId: 'y' } })
  assert.equal(merged.a.v, 1)
})

test('삭제 tombstone 이 더 최신이면 삭제가 전파', () => {
  const { merged } = mergeColl({ a: { id: 'a', title: 'x', updatedAt: 100 } }, { a: { id: 'a', deleted: true, updatedAt: 200 } })
  assert.equal(merged.a.deleted, true)
})

test('삭제보다 늦은 수정이 있으면 수정이 이김', () => {
  const { merged } = mergeColl({ a: { id: 'a', title: 'edited', updatedAt: 300 } }, { a: { id: 'a', deleted: true, updatedAt: 200 } })
  assert.equal(merged.a.deleted, undefined)
})

test('원격에만 있는 레코드는 추가', () => {
  const { merged, localChanged } = mergeColl({}, { n: { id: 'n', updatedAt: 1 } })
  assert.ok(merged.n)
  assert.equal(localChanged, true)
})

test('동일하면 변경 없음', () => {
  const r = { id: 'a', updatedAt: 5, deviceId: 'd' }
  assert.equal(mergeColl({ a: r }, { a: { ...r } }).localChanged, false)
})

test('stableFile 은 키 순서와 무관하게 같은 문자열', () => {
  assert.equal(stableFile({ t: { b: 1, a: 2 }, s: {} }), stableFile({ s: {}, t: { a: 2, b: 1 } }))
})
