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

test('mergeColl counts received and conflicts since last sync', () => {
  const local = { a: { id: 'a', v: 1, updatedAt: 500, deviceId: 'x' }, b: { id: 'b', v: 1, updatedAt: 100, deviceId: 'x' } }
  const remote = { a: { id: 'a', v: 2, updatedAt: 600, deviceId: 'y' }, b: { id: 'b', v: 2, updatedAt: 450, deviceId: 'y' }, c: { id: 'c', updatedAt: 450 } }
  const r = mergeColl(local, remote, 400)
  assert.equal(r.received, 3)
  assert.equal(r.conflicts, 1)
  assert.equal(r.merged.a.v, 2)
})

test('노트 조각: 같은 id 는 항상 같은 조각 · 동기화 파일 이름', async () => {
  const { shardOf, NOTE_SHARDS, isDataFile } = await import('../src/sync/merge.js')
  const ids = Array.from({ length: 400 }, (_, i) => 'n' + i.toString(36) + 'x')
  const cnt = Array(NOTE_SHARDS).fill(0)
  for (const id of ids) { const k = shardOf(id); assert.ok(k >= 0 && k < NOTE_SHARDS); assert.equal(shardOf(id), k); cnt[k]++ }
  assert.ok(Math.min(...cnt) > 20) // 고르게 나뉨
  for (const n of ['tasks.json', 'notes.json', 'notes-3.json', 'settings.json']) assert.ok(isDataFile(n), n)
  for (const n of ['push.json', 'att-x.txt', 'backup-2026-01-01.json', 'widget-gist.txt', 'meta.json']) assert.ok(!isDataFile(n), n)
})
