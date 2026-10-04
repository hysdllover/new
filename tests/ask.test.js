import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answer, parsePeriod, contextFor } from '../src/lib/ask.js'

const T = '2026-10-01' // 목
const data = {
  today: T, weekStart: 1,
  subjects: [{ id: 'm', name: '수학' }, { id: 'e', name: '영어' }],
  sessions: [{ date: '2026-09-29', subjectId: 'm', dur: 90 }, { date: '2026-09-30', subjectId: 'e', dur: 30 }, { date: '2026-09-22', subjectId: 'm', dur: 60 }],
  tasks: [{ id: 'a', title: '수학 숙제', subjectId: 'm', due: '2026-09-29', carry: 2 }, { id: 'b', title: '단어', subjectId: 'e', due: '2026-10-02' }, { id: 'c', title: '독서', done: true, doneAt: Date.parse('2026-09-30T10:00:00') }],
  ddays: [{ title: '중간고사', date: '2026-10-20' }],
}
test('기간 해석', () => {
  assert.deepEqual(parsePeriod('지난주 공부', T), { from: '2026-09-21', to: '2026-09-27', label: '지난주' })
  assert.equal(parsePeriod('최근 7일', T).from, '2026-09-25')
})
test('공부 시간·과목·미룬·D-day', () => {
  assert.equal(answer('이번 주 공부 몇 시간?', data).text, '이번 주 2시간 공부했어요')
  assert.equal(answer('이번 주 수학 몇 시간', data).text, '이번 주 수학 1시간 30분 공부했어요')
  assert.match(answer('가장 많이 한 과목', data).text, /수학/)
  assert.match(answer('미룬 할 일', data).lines[0], /수학 숙제 · 09\/29/)
  assert.equal(answer('시험 며칠 남았어', data).text, '중간고사까지 19일 남았어요')
  assert.equal(answer('이번 주 완료한 거', data).text, '이번 주 완료 1개')
  assert.equal(answer('안녕', data), null)
  assert.match(contextFor(data), /수학 숙제\(수학, 마감 2026-09-29\)/)
})
