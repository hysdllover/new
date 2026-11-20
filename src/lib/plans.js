// 진도표 불러오기: 시험 · 날짜별 할 일 · 교재를 한 번에 넣음 (같은 id 로 넣어서 두 번 눌러도 겹치지 않음)
import { batch, put, find, list, setSettings } from '../store/store.js'

// 토익 12/13 정기시험 · 3주 진도표 (단기공략 850+ · ETS 기출보카 · ETS 기출문제집)
// 줄: [영역, 내용] · 영역 '할일' 은 영역 없음
const W = (lc, rc, voca, rev) => [['LC', lc], ['RC', rc], ['보카', voca], ['복습', rev]]
const MOCK = (t, voca) => [['모의', t], ['오답', '채점 · 오답 정리'], ['보카', voca]]
export const PLANS = [{
  id: 'toeic-1213',
  title: '토익 진도표 · 12/13 시험',
  note: '하루 4시간 · 보카 40 · LC 70 · RC 90 · 오답·쉐도잉 40분 — 단기공략 850+ · ETS 기출보카 · 모의고사는 ETS 기출문제집 기준',
  goalDaily: 240,
  exam: { kind: 'toeic', date: '2026-12-13', name: '12/13 정기', areas: ['LC', 'RC', '보카', '모의', '오답', '복습'], color: '#7a8660' },
  materials: [
    { id: 'lc', title: '단기공략 850+ LC', unit: 'U', total: 16 },
    { id: 'rc', title: '단기공략 850+ RC', unit: 'U', total: 23 },
    { id: 'voca', title: 'ETS 기출보카', unit: 'Day', total: 30 },
    { id: 'mock', title: 'ETS 기출문제집', unit: '회', total: 4 },
  ],
  days: {
    '2026-11-23': [...MOCK('단기공략 모의고사 (진단)', 'Day 01–02'), ['할일', '토익 접수 (12/13 회차)']],
    '2026-11-24': W('U1–2 인물 · 사물·풍경 사진', 'U1–2 명사, 대명사', 'Day 03–04', '쉐도잉 · 오답 다시 풀기'),
    '2026-11-25': W('U3 Who/What/Which 의문문', 'U3–4 형용사·부사, 전치사', 'Day 05–06', '쉐도잉 · 오답 다시 풀기'),
    '2026-11-26': W('U4 When/Where 의문문', 'U5–6 동사, to부정사·동명사', 'Day 07–08', '쉐도잉 · 오답 다시 풀기'),
    '2026-11-27': W('U5 Why/How 의문문', 'U7–8 분사, 접속사', 'Day 09–10', '쉐도잉 · 오답 다시 풀기'),
    '2026-11-28': W('U6 일반/선택 의문문', 'U9–10 관계사, 명사절', 'Day 11–12', '쉐도잉 · 오답 다시 풀기'),
    '2026-11-29': MOCK('기출문제집 1회 (2시간)', 'Day 13–14'),
    '2026-11-30': [...W('U7–8 부정/부가, 요청·제안/평서문', 'U11 ETS 기출 어휘', 'Day 15–16').slice(0, 3), ['할일', '정기접수 마감 오전 10시 · 접수 확인']],
    '2026-12-01': W('U9 주제·목적/화자·장소', 'U12–13 문법·어휘 문제 (P6)', 'Day 17–18', '쉐도잉 · P7 시간 재기'),
    '2026-12-02': W('U10 세부 사항/문제점', 'U14–15 접속부사, 문장 고르기', 'Day 19–20', '쉐도잉 · P7 시간 재기'),
    '2026-12-03': W('U11 요청·제안/다음 할 일', 'U16 주제/목적 (P7)', 'Day 21–22', '쉐도잉 · P7 시간 재기'),
    '2026-12-04': W('U12 의도 파악/시각 정보', 'U17–18 세부 사항, Not/True', 'Day 23–24', '쉐도잉 · P7 시간 재기'),
    '2026-12-05': W('U13 전화메시지', 'U19 추론/암시', 'Day 25–26', '쉐도잉 · P7 시간 재기'),
    '2026-12-06': MOCK('기출문제집 2회 (2시간)', 'Day 27–28'),
    '2026-12-07': W('U14 공지/회의', 'U20–21 동의어, 의도 파악', 'Day 29–30', '모의고사 오답 다시 풀기'),
    '2026-12-08': W('U15 설명/소개', 'U22 문장 삽입', 'Day 01–15 복습 · 실전 1–3회', '모의고사 오답 다시 풀기'),
    '2026-12-09': W('U16 광고/방송', 'U23 연계 문제', '실전 4–6회', '모의고사 오답 다시 풀기'),
    '2026-12-10': MOCK('기출문제집 3회 (2시간)', 'Day 16–30 복습 · 실전 7–9회'),
    '2026-12-11': MOCK('기출문제집 4회 (2시간)', '실전 10–12회'),
    '2026-12-12': [['오답', '오답노트 가볍게'], ['보카', '체크한 단어만'], ['할일', '수험표 · 신분증 챙기고 일찍 자기']],
    '2026-12-13': [['시험', '토익 정기시험']],
  },
}]

export const planCount = (p) => Object.values(p.days).reduce((a, L) => a + L.length, 0)

// 넣기: 같은 날 같은 종류 시험이 이미 있으면 그 시험에 연결 · 할 일 · 교재는 고정 id (다시 넣으면 덮어쓰지 않고 건너뜀)
export function importPlan(p, { goal = true, books = true } = {}) {
  let added = 0
  batch(() => {
    const same = list('exams').find((e) => e.kind === p.exam.kind && e.date === p.exam.date)
    const examId = same?.id || 'plan-' + p.id
    if (same) { if (!same.areas?.length) put('exams', { ...same, areas: p.exam.areas }) } else if (!find('exams', examId)) put('exams', { id: examId, ...p.exam })
    let n = 0
    for (const [due, L] of Object.entries(p.days)) L.forEach(([area, title], i) => {
      const id = `plan-${p.id}-${due}-${i}`
      n++
      if (find('tasks', id)) return
      put('tasks', { id, title, due, examId, area: area === '할일' || area === '시험' ? null : area, done: false, order: n, plan: p.id })
      added++
    })
    if (books) for (const m of p.materials || []) { const id = `plan-${p.id}-${m.id}`; if (!find('materials', id)) put('materials', { id, title: m.title, unit: m.unit, total: m.total, current: 0, examId }) }
    if (goal && p.goalDaily) setSettings({ goalDaily: p.goalDaily })
  })
  return added
}
