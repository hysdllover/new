import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toSleepHours, toSteps } from '../src/lib/health.js'
test('수면 단위 자동 판별·걸음 정리', () => {
  assert.equal(toSleepHours('7.5'), 7.5)
  assert.equal(toSleepHours('450'), 7.5)      // 분
  assert.equal(toSleepHours('27000'), 7.5)    // 초
  assert.equal(toSleepHours(''), null)
  assert.equal(toSteps('8,123'), 8123)
})
