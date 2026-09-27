// ?demo 로 열면 샘플 데이터를 채운다 (개발·미리보기용)
import { put, batch, list } from '../store/store.js'
import { regeneratePlan } from '../store/actions.js'
import { today, addDays } from '../engine/date.js'

export function seed() {
  if (list('tasks').length) return
  const d = today()
  const t0 = new Date(); t0.setHours(0, 0, 0, 0)
  const at = (day, min) => t0.getTime() + day * 86400000 + min * 60000
  batch(() => {
    const p1 = put('projects', { id: 'p1', name: '과학 탐구 보고서', color: '#a99bc4' })
    put('projects', { id: 'p2', name: '영어 발표', color: '#7a8660' })
    const tasks = [
      { id: 't1', title: '수학 문제집 3단원', due: d, priority: 3, subjectId: 'sub-math', estimate: 60, subtasks: [{ id: 's1', title: '개념 정리', done: true }, { id: 's2', title: '유형 1~20', done: false }, { id: 's3', title: '오답 체크', done: false }] },
      { id: 't2', title: '영어 단어 50개', due: d, priority: 2, subjectId: 'sub-eng', estimate: 30, repeat: { freq: 'daily', interval: 1 } },
      { id: 't3', title: '자료 조사', start: addDays(d, -2), due: addDays(d, 1), projectId: 'p1', subjectId: 'sub-sci', status: 'doing' },
      { id: 't4', title: '실험 설계', start: addDays(d, 2), due: addDays(d, 4), projectId: 'p1', dependsOn: ['t3'], subjectId: 'sub-sci' },
      { id: 't5', title: '보고서 초안', start: addDays(d, 5), due: addDays(d, 8), projectId: 'p1', dependsOn: ['t4'] },
      { id: 't6', title: '발표 대본 작성', due: addDays(d, 3), projectId: 'p2', priority: 2, subjectId: 'sub-eng' },
      { id: 't7', title: '국어 문학 요약', due: addDays(d, -1), subjectId: 'sub-kor', priority: 1 },
      { id: 't8', title: '독서 기록 정리', subjectId: 'sub-kor' },
      { id: 't9', title: '사회 수행평가 제출', due: addDays(d, 6), subjectId: 'sub-soc', priority: 3 },
    ]
    tasks.forEach((t, i) => put('tasks', { done: false, order: i, subtasks: [], status: 'todo', ...t }))
    put('tasks', { id: 't10', title: '과학 단원평가 오답 정리', done: true, doneAt: Date.now() - 3600000, status: 'done', subjectId: 'sub-sci', order: 20 })
    put('events', { id: 'e1', title: '영어 학원', date: d, start: 17 * 60, end: 19 * 60, color: '#7a8660', location: '역 앞 학원', bufferBefore: 20, bufferAfter: 10, repeat: { freq: 'weekly', interval: 1, byDay: [1, 3, 5] } })
    put('events', { id: 'e2', title: '스터디 모임', date: addDays(d, 2), start: 15 * 60, end: 16 * 60 + 30, color: '#a99bc4' })
    put('events', { id: 'e3', title: '엄마 생일', date: addDays(d, 9), start: null, kind: 'anniv', repeat: { freq: 'yearly', interval: 1 }, color: '#c9a0a8' })
    put('events', { id: 'e4', title: '중간고사', date: addDays(d, 18), endDate: addDays(d, 21), start: null, color: '#4a5a78' })
    put('blocks', { date: d, start: 9 * 60, dur: 60, taskId: 't1', kind: 'task', title: '수학 문제집 3단원' })
    put('blocks', { date: d, start: 10 * 60 + 10, dur: 30, taskId: 't2', kind: 'task', title: '영어 단어 50개' })
    put('blocks', { date: d, start: 13 * 60, dur: 50, kind: 'study', title: '국어 자습', subjectId: 'sub-kor' })
    const ss = [['sub-math', 0, 9 * 60, 55], ['sub-eng', 0, 10 * 60 + 10, 25], ['sub-kor', -1, 14 * 60, 90], ['sub-math', -1, 20 * 60, 70], ['sub-sci', -2, 19 * 60, 45], ['sub-eng', -3, 21 * 60, 60], ['sub-math', -4, 16 * 60, 120], ['sub-soc', -5, 10 * 60, 40]]
    ss.forEach(([s, day, m, dur]) => put('sessions', { subjectId: s, start: at(day, m), end: at(day, m + dur), dur, date: addDays(d, day), kind: 'stopwatch', taskId: s === 'sub-math' && day === 0 ? 't1' : null }))
    put('ddays', { title: '중간고사', date: addDays(d, 18), color: '#4a5a78', pinned: true })
    put('ddays', { title: '영어 발표', date: addDays(d, 3), color: '#7a8660' })
    put('textbooks', { id: 'tb1', title: '수학의 바이블', subjectId: 'sub-math', unit: 'p', total: 320, current: 96, history: [{ date: addDays(d, -6), value: 40 }, { date: addDays(d, -3), value: 70 }, { date: d, value: 96 }] })
    put('plans', { id: 'pl1', title: '중간고사 수학', textbookId: 'tb1', subjectId: 'sub-math', from: 1, to: 240, unit: 'p', startDate: addDays(d, -6), examDate: addDays(d, 18), reviewDays: 3, offDays: [0], minPerUnit: 3 })
    put('reviews', { title: '이차함수 그래프', subjectId: 'sub-math', stage: 1, next: d, learnedAt: addDays(d, -3), history: [] })
    put('reviews', { title: '관계대명사', subjectId: 'sub-eng', stage: 0, next: d, learnedAt: addDays(d, -1), history: [] })
    put('habits', { id: 'h1', title: '아침 영단어', color: '#7a8660', days: Object.fromEntries([0, 1, 2, 4, 5, 7, 8, 9, 10, 12].map((i) => [addDays(d, -i), true])) })
    put('habits', { id: 'h2', title: '스트레칭', color: '#c9a0a8', days: Object.fromEntries([1, 2, 3, 6, 9].map((i) => [addDays(d, -i), true])) })
    put('grades', { subjectId: 'sub-math', name: '3월 모의고사', date: addDays(d, -150), score: 72, max: 100, target: 90 })
    put('grades', { subjectId: 'sub-math', name: '1학기 중간', date: addDays(d, -120), score: 81, max: 100, target: 90 })
    put('grades', { subjectId: 'sub-math', name: '1학기 기말', date: addDays(d, -80), score: 85, max: 100, target: 90 })
    put('grades', { subjectId: 'sub-eng', name: '1학기 중간', date: addDays(d, -120), score: 88, max: 100, target: 95 })
    put('conditions', { id: d, sleep: 6.5, mood: 4, energy: 3 })
    put('conditions', { id: addDays(d, -1), sleep: 7.5, mood: 3, energy: 4 })
    put('meds', { id: 'm1', name: '비타민 D', times: ['08:00'], active: true })
    put('links', { title: '학교 홈페이지', url: 'https://www.google.com' })
    put('notes', { id: 'n1', title: '이차함수', subjectId: 'sub-math', projectId: null, blocks: [
      { id: 'a1', type: 'h1', text: '이차함수' },
      { id: 'a2', type: 'text', text: '[[일차함수]] 와 비교하며 정리. 시험 범위 확인 @내일' },
      { id: 'a3', type: 'h2', text: '그래프' },
      { id: 'a4', type: 'bullet', text: '꼭짓점 (p, q)' },
      { id: 'a5', type: 'bullet', text: '축의 방정식 x = p' },
      { id: 'a6', type: 'h2', text: '활용' },
      { id: 'a7', type: 'bullet', text: '최댓값·최솟값' },
      { id: 'a8', type: 'todo', text: '교과서 예제 풀기', taskId: null },
    ] })
    put('notes', { id: 'n2', title: '일차함수', subjectId: 'sub-math', blocks: [{ id: 'b1', type: 'text', text: '기울기와 y절편. [[이차함수]] 로 이어짐.' }] })
    put('notes', { id: 'n3', title: '보고서 개요', projectId: p1.id, subjectId: 'sub-sci', blocks: [{ id: 'c1', type: 'h1', text: '탐구 주제' }, { id: 'c2', type: 'text', text: '식물 생장과 빛의 파장. [[실험 노트]] 참고' }] })
    put('notes', { id: 'n4', title: '실험 노트', projectId: p1.id, blocks: [{ id: 'd1', type: 'text', text: '1차 실험 결과 기록' }] })
  })
  regeneratePlan('pl1')
}
