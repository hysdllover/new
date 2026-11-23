// 진도표 불러오기: 시험 · 날짜별 할 일 · 교재를 한 번에 넣음 (같은 id 로 넣어서 두 번 눌러도 겹치지 않음)
import { batch, put, find, list, remove, setSettings } from '../store/store.js'

// 토익 · 토스 진도 달력 — ~12/12 토익 4시간 + 토스 1시간 · 12/14~ 토스 5시간
// 토익: 단기공략 850+ LC · RC · ETS 기출보카 · 기출문제집 / 토스: 시계토끼 올인원 기본서
// 하루: items [영역, 내용] — 영역 '토스' 와 토익 시험 뒤의 할 일은 토스 시험에, 나머지는 토익 시험에
const T = (lc, rc, voca, tos, etc, o = {}) => ({ items: [['LC', lc], ['RC', rc], ['보카', voca], ['토스', tos], ['기타', etc]], ...o })
const TIP = 'P5·6는 20분 안에 · 채점 후 정답률 75% 이상 오답부터 분석'
const M = (n, voca, tos) => T(`기출문제집 ${n}회 LC`, `기출문제집 ${n}회 RC`, voca, tos, TIP, { mock: true, imp: true })
const S = (tos, etc = '포켓북 1시간 · 재녹음 · 스크립트 정리', o = {}) => ({ items: [['토스', tos], ['기타', etc]], mock: true, exam: 'tos', ...o })
export const PLANS = [{
  id: 'toeic-tos-1220d',
  replaces: ['toeic-1213', 'toeic-1213b', 'toeic-tos-1220', 'toeic-tos-1220b', 'toeic-tos-1220c'], // 예전 진도표의 끝내지 않은 할 일은 지우고 이걸로 바꿈 (끝낸 건 기록으로 남김)
  title: '토익 · 토스 진도 달력',
  note: '하루 5시간 — ~12/12 토익 4시간 + 토스 1시간 · 12/14~ 토스 5시간 · 토익은 YBM 단기공략 850+, 토스는 시계토끼 올인원 기본서 기준',
  goalDaily: 300,
  exams: {
    toeic: { kind: 'toeic', date: '2026-12-13', name: '12/13 정기', areas: ['LC', 'RC', '보카', '기타'], color: '#7a8660', legacyId: 'plan-toeic-1213' },
    tos: { kind: 'custom', name: '토익스피킹', date: '2026-12-20', sections: [{ id: 's', name: '점수', max: 200 }], areas: ['토스', '기타'], color: '#a99bc4' },
  },
  materials: [
    { id: 'lc', exam: 'toeic', title: '단기공략 850+ LC', unit: 'U', total: 16 },
    { id: 'rc', exam: 'toeic', title: '단기공략 850+ RC', unit: 'U', total: 23 },
    { id: 'voca', exam: 'toeic', title: 'ETS 기출보카', unit: 'Day', total: 30 },
    { id: 'mock', exam: 'toeic', title: 'ETS 기출문제집', unit: '회', total: 4 },
    { id: 'tos', exam: 'tos', title: '시계토끼 올인원 기본서', unit: 'Part', total: 5 },
  ],
  days: {
    '2026-11-23': T('단기공략 모의고사 LC', '단기공략 모의고사 RC', 'Day 01–02', 'Part 1 소개·전략·기초 (p.16–24)', '모의고사 오답 정리 (860점)', { mock: true }),
    '2026-11-24': T('P1 INTRO · U1–2 · P1 만점 빈출 표현 (p.18–33)', 'P5 INTRO · U1 명사 · U2 대명사 · U3 형용사&부사 (p.122–147)', 'Day 03–04', 'Part 1 기초 다지기 (p.25–28)', '쉐도잉 · 오답'),
    '2026-11-25': T('P2 INTRO · U3 Who/What·Which · U4 When/Where (p.34–43)', 'U4 전치사 · U5 자·타동사/수 일치/태/시제 (p.148–165)', 'Day 05–06', 'Part 1 유형·실전 (p.29–35)', '쉐도잉 · 오답'),
    '2026-11-26': T('U5 Why/How · U6 일반/선택 의문문 (p.44–51)', 'U6 to부정사&동명사 · U7 분사 · U8 접속사 (p.166–185)', 'Day 07–08', 'Part 2 소개·전략·기초 (p.36–42)', '쉐도잉 · 오답'),
    '2026-11-27': T('U7 부정/부가 · U8 요청·제안문/평서문 (p.52–59)', 'U9 관계사 · U10 명사절 접속사 (p.186–197)', 'Day 09–10', 'Part 2 유형 익히기 (p.43–53)', '쉐도잉 · 오답'),
    '2026-11-28': T('P2 만점 빈출 표현 (p.60–65) · 모의고사 P2 오답 다시 듣기', 'U11 ETS 기출 어휘 · 형용사·부사 어휘 꼼꼼히 (p.198–219)', 'Day 11–12', 'Part 2 실전 + 묘사 틀 암기 (p.54–57)', '쉐도잉 · 오답'),
    '2026-11-29': M(1, 'Day 01–12 복습 · 실전 1–2회', 'Part 3 소개·전략·기초 (p.58–66)'),
    '2026-11-30': T('P3 INTRO · U9 주제·목적/화자·장소 (p.66–73)', 'P6 INTRO · U12 문법 문제 (p.220–227)', 'Day 13–14', 'Part 3 기초 다지기 (p.67–70)', '정기접수 마감 오전 10시', { imp: true }),
    '2026-12-01': T('U10 세부 사항/문제점·걱정거리 (p.74–79)', 'U13 어휘 문제 (p.228–233)', 'Day 15–16', 'Part 3 의문사 만능패턴 (p.71–78)', 'P7 시간 재기'),
    '2026-12-02': T('U11 요청·제안/다음에 할 일 (p.80–85)', 'U14 접속부사 · U15 문장 고르기 (p.234–247)', 'Day 17–18', 'Part 3 부연 설명 (p.79–84)', 'P7 시간 재기'),
    '2026-12-03': T('U12 의도 파악/시각 정보 연계 (p.86–92)', 'P6 실전 풀이 · 모의고사 P6 오답 다시 풀기', 'Day 19–20', 'Part 3 유형·실전 (p.85–107)', 'P7 시간 재기'),
    '2026-12-04': T('P3 만점 빈출 표현 (p.93–97) · 모의고사 P3 오답 다시 듣기', 'P7 INTRO · U16 주제/목적 · U17 세부 사항 (p.248–257)', 'Day 21–22', 'Part 4 소개·전략·기초 (p.108–114)', 'P7 시간 재기'),
    '2026-12-05': T('P4 INTRO · U13 전화 메시지 · U14 공지/회의 (p.98–107)', 'U18 Not/True · U19 추론/암시 (p.258–265)', 'Day 23–24', 'Part 4 유형 ① (p.115–131)', 'P7 시간 재기'),
    '2026-12-06': M(2, 'Day 13–24 복습 · 실전 3–4회', 'Part 4 유형 ② (p.132–148)'),
    '2026-12-07': T('U15 설명/소개 (p.108–111)', 'U20 동의어 · U21 의도 파악 (p.266–273)', 'Day 25–26', 'Part 4 실전 (p.149–159)', '모의고사 오답 다시 풀기'),
    '2026-12-08': T('U16 광고/방송 · P4 만점 빈출 표현 (p.112–121)', 'U22 문장 삽입 · U23 연계 문제 (p.274~)', 'Day 27–28', 'Part 5 소개·전략·기초 (p.160–172)', '오답노트 복습'),
    '2026-12-09': M(3, 'Day 29–30 · 실전 5–6회', 'Part 5 유형 ① (p.173–203)'),
    '2026-12-10': T('틀린 문제 다시 풀기 (P3·P4 의도 파악·다음에 할 일)', '틀린 문제 다시 풀기 (3중 지문 시간 재고 풀기 · 모의고사 P7 오답)', 'Day 25–30·Level-Up · 실전 7–9회', 'Part 5 유형 ② (p.204–234)', 'P5·6 20분 안에 풀기 연습'),
    '2026-12-11': M(4, '실전 10–12회', 'Part 5 실전 (p.235–239)'),
    '2026-12-12': T('오답노트 가볍게', '오답노트 가볍게', '체크한 단어만', '포켓북 만능문장 낭독만', '수험표·신분증 챙기기 · 일찍 자기', { imp: true }),
    '2026-12-13': { items: [['시험', '토익 시험']], examDay: 'toeic' },
    '2026-12-14': S('모의고사 1회 · Part 1–2 집중'),
    '2026-12-15': S('모의고사 2회 · Part 3 집중'),
    '2026-12-16': S('모의고사 3회 · Part 4 집중'),
    '2026-12-17': S('모의고사 4회 · Part 5 집중'),
    '2026-12-18': S('모의고사 5회 · 가장 약한 Part 집중'),
    '2026-12-19': S('약한 회차 다시 풀기 · 포켓북', '일찍 자기', { imp: true }),
    '2026-12-20': { items: [['시험', '토익스피킹 시험']], examDay: 'tos' },
  },
}]

export const planCount = (p) => Object.values(p.days).reduce((a, d) => a + d.items.length, 0)
export const planDays = (p) => Object.values(p.days).filter((d) => !d.examDay).length
const planOf = (id) => PLANS.find((p) => p.id === id)
export const planTitle = (id) => planOf(id)?.title || '진도표'

// 넣기: 같은 종류 · 같은 날 시험이 있으면 그 시험에 연결 · 할 일 · 교재는 고정 id (다시 넣으면 건너뜀)
export function importPlan(p, { goal = true, books = true } = {}) {
  let added = 0, removed = 0
  batch(() => {
    const olds = p.replaces || []
    for (const t of list('tasks')) if (olds.includes(t.plan) && !t.done) { remove('tasks', t.id); removed++ }
    const ids = {}
    for (const [k, e] of Object.entries(p.exams)) {
      const { legacyId, ...rec } = e
      const same = list('exams').find((x) => x.kind === e.kind && x.date === e.date && (e.kind !== 'custom' || x.name === e.name))
      ids[k] = same?.id || `plan-${p.id}-${k}`
      put('exams', same ? { ...same, areas: e.areas } : { id: ids[k], ...rec })
    }
    let n = 0
    for (const [due, d] of Object.entries(p.days)) d.items.forEach(([area, title], i) => {
      const id = `plan-${p.id}-${due}-${i}`
      n++
      if (find('tasks', id)) return
      const ex = d.examDay || d.exam || (area === '토스' ? 'tos' : 'toeic')
      put('tasks', { id, title, due, examId: ids[ex], area: area === '시험' ? null : area, done: false, order: n, plan: p.id, ...(d.mock ? { mock: true } : null), ...(d.imp && area === '기타' ? { imp: true } : null), ...(d.examDay ? { examDay: true } : null) })
      added++
    })
    // 교재: 예전 진도표로 넣은 것은 이어 씀 (진도 유지)
    if (books) for (const m of p.materials || []) {
      const old = list('materials').find((x) => x.title === m.title)
      if (old) { if (old.examId !== ids[m.exam]) put('materials', { ...old, examId: ids[m.exam] }); continue }
      put('materials', { id: `plan-${p.id}-${m.id}`, title: m.title, unit: m.unit, total: m.total, current: 0, examId: ids[m.exam] })
    }
    if (goal && p.goalDaily) setSettings({ goalDaily: p.goalDaily })
  })
  return { added, removed }
}
