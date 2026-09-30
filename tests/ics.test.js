import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIcs, fold } from '../src/lib/ics.js'

test('종일·시간 이벤트와 이스케이프', () => {
  const s = buildIcs([{ uid: 'a', title: '시험, 수학; 1\\2', date: '2026-10-02' }, { uid: 'b', title: '학원', date: '2026-10-02', start: 17 * 60, end: 19 * 60, location: '강남' }], { stamp: new Date(Date.UTC(2026, 0, 1)) })
  assert.ok(s.includes('SUMMARY:시험\\, 수학\\; 1\\\\2'), 'escape')
  assert.match(s, /DTSTART;VALUE=DATE:20261002\r\nDTEND;VALUE=DATE:20261003/)
  assert.match(s, /DTSTART;TZID=Asia\/Seoul:20261002T170000\r\nDTEND;TZID=Asia\/Seoul:20261002T190000/)
  assert.match(s, /LOCATION:강남/)
  assert.ok(s.startsWith('BEGIN:VCALENDAR\r\n') && s.endsWith('END:VCALENDAR\r\n'))
})

test('끝 시간 없으면 30분, 월말 다음 날 계산', () => {
  const s = buildIcs([{ uid: 'c', title: 'x', date: '2026-10-31', start: 600 }, { uid: 'd', title: 'y', date: '2026-12-31' }])
  assert.match(s, /DTEND;TZID=Asia\/Seoul:20261031T103000/)
  assert.match(s, /DTEND;VALUE=DATE:20270101/)
})

test('긴 줄은 75바이트로 접기', () => {
  const line = 'SUMMARY:' + '가'.repeat(60)
  const f = fold(line)
  for (const part of f.split('\r\n')) assert.ok(new TextEncoder().encode(part).length <= 75)
  assert.equal(f.replace(/\r\n /g, ''), line)
})
