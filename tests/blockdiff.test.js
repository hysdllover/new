import test from 'node:test'
import assert from 'node:assert/strict'
import { diffBlocks, restoreBlock } from '../src/lib/blockDiff.js'

const t = (id, text) => ({ id, type: 'text', text })
test('버전 비교: 그대로 · 바뀜 · 새로 · 지워짐', () => {
  const d = diffBlocks([t('a', '1'), t('b', '2'), t('c', '3')], [t('a', '1'), t('c', '3!'), t('n', 'new')])
  assert.deepEqual(d.map((x) => x.k + ':' + (x.cur || x.old).id), ['same:a', 'del:b', 'chg:c', 'add:n'])
})
test('줄 하나 되살리기', () => {
  const ver = [t('a', '1'), t('b', '2'), t('c', '3')]
  assert.deepEqual(restoreBlock([t('a', '1'), t('c', '3')], ver, 'b').map((x) => x.id), ['a', 'b', 'c'])
  assert.equal(restoreBlock([t('a', '1'), t('c', '9')], ver, 'c')[1].text, '3')
  assert.deepEqual(restoreBlock([t('c', '3')], ver, 'a').map((x) => x.id), ['a', 'c'])
})
