// 둘러보기 데이터 (?demo · 화면 점검용) — 이 기기 데이터를 바꿈
import { batch, put, replaceAll } from '../store/store.js'
import { DEFAULT_SETTINGS } from '../store/schema.js'
import { today, addDays } from './date.js'

export function seedDemo() {
  const t = today(), d = (n) => addDays(t, n)
  batch(() => {
    replaceAll({})
    put('settings', { ...DEFAULT_SETTINGS })
    put('exams', { id: 'e1', kind: 'jlpt', level: 'N2', date: d(16), target: 120, color: '#4a5a78' })
    put('exams', { id: 'e2', kind: 'toeic', date: d(45), target: 850, color: '#7a8660' })
    put('scores', { id: 's1', examId: 'e1', date: d(-30), kind: 'mock', parts: { lk: 31, rd: 28, li: 30 } })
    put('scores', { id: 's2', examId: 'e1', date: d(-12), kind: 'mock', parts: { lk: 36, rd: 33, li: 35 } })
    put('scores', { id: 's3', examId: 'e1', date: d(-3), kind: 'mock', parts: { lk: 40, rd: 37, li: 36 } })
    put('scores', { id: 's4', examId: 'e2', date: d(-20), kind: 'mock', parts: { lc: 385, rc: 330 } })
    put('scores', { id: 's5', examId: 'e2', date: d(-6), kind: 'mock', parts: { lc: 410, rc: 355 } })
    put('tasks', { id: 't1', title: 'N2 문법 30~35과', due: t, examId: 'e1', area: '문법', order: 1 })
    put('tasks', { id: 't2', title: '청해 모의 1회분', due: t, examId: 'e1', area: '청해', order: 2, done: true, doneAt: Date.now() })
    put('tasks', { id: 't3', title: 'RC Part 5 30문제', due: t, examId: 'e2', area: 'RC', order: 3 })
    put('tasks', { id: 't4', title: '단어 Day 12', due: d(1), examId: 'e2', area: '단어', order: 4 })
    put('tasks', { id: 't5', title: '독해 장문 2지문', due: d(2), examId: 'e1', area: '독해', order: 5 })
    put('tasks', { id: 't6', title: '교재 다음 단원 훑어보기', order: 6 })
    put('materials', { id: 'm1', title: '新完全マスター 文法 N2', examId: 'e1', unit: '과', total: 40, current: 29 })
    put('materials', { id: 'm2', title: 'ETS 토익 정기시험 기출 1000', examId: 'e2', unit: '회', total: 10, current: 3 })
  })
}
