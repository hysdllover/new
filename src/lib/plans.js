// 진도표 불러오기: 시험 · 날짜별 할 일 · 교재를 한 번에 넣음 (같은 id 로 넣어서 두 번 눌러도 겹치지 않음)
import { batch, put, find, list, remove } from '../store/store.js'

// 토익 · 토스 진도 달력 — ~12/12 토익 4시간 + 토스 1시간 · 12/14~ 토스 5시간
// 토익: 단기공략 850+ LC · RC · ETS 기출보카 · 기출문제집 / 토스: 시계토끼 올인원 기본서
// 하루: items [영역, 내용] — 영역 '토스' 와 토익 시험 뒤의 할 일은 토스 시험에, 나머지는 토익 시험에
const T = (lc, rc, voca, tos, etc, o = {}) => ({ items: [['LC', lc], ['RC', rc], ['보카', voca], ['토스', tos], ['기타', etc]], ...o })
const TIP = 'P5·6는 20분 안에 · 채점 후 정답률 75% 이상 오답부터 분석'
const M = (n, voca, tos) => T(`기출문제집 ${n}회 LC`, `기출문제집 ${n}회 RC`, voca, tos, TIP, { mock: true, imp: true })
const S = (tos, etc = '포켓북 1시간 · 재녹음 · 스크립트 정리', o = {}) => ({ items: [['토스', tos], ['기타', etc]], mock: true, exam: 'tos', ...o })
export const PLANS = [{
  id: 'toeic-tos-1220e',
  replaces: ['toeic-1213', 'toeic-1213b', 'toeic-tos-1220', 'toeic-tos-1220b', 'toeic-tos-1220c', 'toeic-tos-1220d'], // 예전 진도표의 끝내지 않은 할 일은 지우고 이걸로 바꿈 (끝낸 건 기록으로 남김)
  title: '토익 · 토스 진도 달력',
  note: '하루 5시간 — ~12/12 토익 4시간 + 토스 1시간 · 12/14~ 토스 5시간 · 토익은 YBM 단기공략 850+, 토스는 시계토끼 올인원 기본서 기준',
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
    '2026-11-24': T('U5 Why/How 의문문 (p.44–47) · U8 요청·제안문/평서문 (p.56–59)', 'P7 3중 지문 시간 재고 풀기 (교재 실전 문제)', 'Day 03–04', 'Part 1 기초 다지기 (p.25–28)', '쉐도잉 · 오답'),
    '2026-11-25': T('P2 만점 빈출 표현 (p.60–65) · P1 만점 빈출 표현 훑기 (p.28–33)', 'U11 ETS 기출 어휘 ① (p.198–208)', 'Day 05–06', 'Part 1 유형·실전 (p.29–35)', '쉐도잉 · 오답'),
    '2026-11-26': T('P3 INTRO · U11 요청·제안/다음에 할 일 (p.66–67, 80–85)', 'U11 ETS 기출 어휘 ② (p.209–219)', 'Day 07–08', 'Part 2 소개·전략·기초 (p.36–42)', '쉐도잉 · 오답'),
    '2026-11-27': T('U12 의도 파악/시각 정보 연계 (p.86–92)', 'P6 INTRO · U12 문법 문제 · U13 어휘 문제 (p.220–233)', 'Day 09–10', 'Part 2 유형 익히기 (p.43–53)', '쉐도잉 · 오답'),
    '2026-11-28': T('U10 세부 사항/문제점 (p.74–79) · P3 만점 빈출 표현 (p.93–97)', 'U14 접속부사 · U15 문장 고르기 (p.234–247)', 'Day 11–12', 'Part 2 실전 + 묘사 틀 암기 (p.54–57)', '쉐도잉 · 오답'),
    '2026-11-29': M(1, 'Day 01–12 복습 · 실전 1–2회', 'Part 3 소개·전략·기초 (p.58–66)'),
    '2026-11-30': T('P4 INTRO · U13 전화 메시지 · U14 공지/회의 (p.98–107)', 'P7 INTRO · U16–18 주제/목적·세부 사항·Not/True (p.248–261)', 'Day 13–14', 'Part 3 기초 다지기 (p.67–70)', '정기접수 마감 오전 10시', { imp: true }),
    '2026-12-01': T('U15 설명/소개 · U16 광고/방송 (p.108–115)', 'U19 추론/암시 · U20 동의어 (p.262–269)', 'Day 15–16', 'Part 3 의문사 만능패턴 (p.71–78)', 'P7 시간 재기'),
    '2026-12-02': T('P4 만점 빈출 표현 (p.116–121)', 'U21 의도 파악 · U22 문장 삽입 (p.270–277)', 'Day 17–18', 'Part 3 부연 설명 (p.79–84)', 'P7 시간 재기'),
    '2026-12-03': T('U3·U4·U6·U7 문제만 풀기 (p.36–55)', 'U23 연계 문제 (p.278~) · 3중 지문 시간 재고 풀기', 'Day 19–20', 'Part 3 유형·실전 (p.85–107)', 'P7 시간 재기'),
    '2026-12-04': T('기출 1회 LC 오답 다시 듣기', 'P5 U1–10 문제만 풀기 (30문항 10분 목표)', 'Day 21–22', 'Part 4 소개·전략·기초 (p.108–114)', 'P7 시간 재기'),
    '2026-12-05': T('U9 주제·목적/화자·장소 문제만 풀기 (p.68–73)', '기출 1회 RC 오답 다시 풀기 · P6 4지문 8분 안에 풀기', 'Day 23–24', 'Part 4 유형 ① (p.115–131)', 'P7 시간 재기'),
    '2026-12-06': M(2, 'Day 13–24 복습 · 실전 3–4회', 'Part 4 유형 ② (p.132–148)'),
    '2026-12-07': T('기출 2회 LC 오답 다시 듣기', '기출 2회 RC 오답 다시 풀기 · 3중 지문 시간 재고 풀기', 'Day 25–26', 'Part 4 실전 (p.149–159)', '모의고사 오답 다시 풀기'),
    '2026-12-08': T('기출문제집 남은 회차 P3·P4 문제만 풀기', '기출문제집 남은 회차 P6·P7만 시간 재고 풀기', 'Day 27–28', 'Part 5 소개·전략·기초 (p.160–172)', '오답노트 복습'),
    '2026-12-09': M(3, 'Day 29–30 · 실전 5–6회', 'Part 5 유형 ① (p.173–203)'),
    '2026-12-10': T('기출 3회 LC 오답 다시 듣기 · 의도 파악·다음에 할 일 모아 보기', '기출 3회 RC 오답 다시 풀기 · P5·6 20분 안에 풀기', 'Day 25–30·Level-Up · 실전 7–9회', 'Part 5 유형 ② (p.204–234)', '오답노트 전체 훑기'),
    '2026-12-11': M(4, '실전 10–12회', 'Part 5 실전 (p.235–239)'),
    '2026-12-12': T('오답노트 가볍게', '오답노트 가볍게', '체크한 단어만', '포켓북 만능문장 낭독만', '수험표·신분증 챙기기 · 일찍 자기', { imp: true, light: true }),
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

// 일별 상세 계획: 그날 할 일을 순서 · 시간 배분(계획)으로 풀어 씀 — { label, head, steps[], min }
const LS = (t) => t.includes('문제만') ? '개념은 건너뛰고 문제만 풀기 → 채점 → 틀린 문제 스크립트 확인 → 받아쓰기' : t.includes('오답') ? '틀린 문제 다시 듣기 → 스크립트로 근거 확인 → 받아쓰기 → 쉐도잉' : '개념·전략 읽기 → 문제 풀이 → 채점 → 틀린 문제 스크립트 확인 → 받아쓰기'
const RS = (t) => t.includes('문제만') ? '개념은 건너뛰고 문제만 풀기 → 채점 → 틀린 문제만 해설 확인' : t.includes('오답') || t.includes('시간 재고') ? '시간 재고 다시 풀기 → 근거 문장 표시 → 틀린 이유 오답노트에 적기' : '개념 정리 → 문제 풀이 → 채점 → 오답 이유 적기'
export function planDetail(p, due) {
  const d = p?.days[due]; if (!d) return []
  const out = [], add = (label, text, min = 0) => { const i = text.indexOf(': '); out.push({ label, head: i > 0 ? text.slice(0, i) : '', steps: (i > 0 ? text.slice(i + 2) : text).split(' → '), min }) }
  const get = (a) => d.items.find((x) => x[0] === a)?.[1] || ''
  const lc = get('LC'), rc = get('RC'), vo = get('보카'), ts = get('토스'), note = d.imp ? get('기타') : ''
  if (d.examDay === 'toeic') { add('시험', '토익 시험 (LC · RC) → 신분증 · 수험표 · 연필 확인'); add('휴식', '시험 끝나면 푹 쉬기 → 토스는 내일부터'); return out }
  if (d.examDay) { add('시험', '시험 전 포켓북 만능문장 소리 내어 읽기 → 토익스피킹 시험 → 신분증 · 수험표 확인'); return out }
  if (d.exam === 'tos') {
    const m = ts.match(/모의고사 (\d회) · (.+) 집중/)
    if (!m) { add('토스', `${ts.split(' · ')[0]}: 응시하며 녹음 → 모범 답안과 비교 → 고친 답변으로 다시 말하기`, 90); add('포켓북', 'Part별 템플릿과 만능문장 소리 내어 읽기', 60); add('스크립트', '나만의 답변 스크립트 최종 점검', 30) }
    else {
      add('모의고사', `실전 모의고사 ${m[1]} 응시하며 녹음 → 모범 답안과 비교 → 막혔던 문항 답변 고치기`, 90)
      add('Part 복습', `${m[2]}: 교재 유형 익히기 다시 보기 → 실전 트레이닝 문항 소리 내어 답하기`, 90)
      add('포켓북', '템플릿 · 만능문장 암기 → 보지 않고 따라 말하기', 60)
      add('재녹음', `모의고사 ${m[1]} 다시 답하고 녹음 → 처음 녹음과 비교`, 30)
      add('스크립트', '오늘 고친 답변을 나만의 스크립트에 정리', 30)
    }
    if (note) add('알림', note); return out
  }
  if (d.light) { add('오답', 'LC · RC 오답노트 훑어보기 → 틀린 이유만 다시 확인', 90); add('보카', '체크한 단어만 빠르게 보기', 40); add('토스', '포켓북 만능문장 소리 내어 읽기', 30); if (note) add('알림', note); return out }
  add('보카', `${vo}: 새 단어 외우기 → MP3로 발음 확인 → 전날 Day 뜻 가리고 테스트`, 40)
  if (d.mock) {
    add('모의고사', `${lc.replace(/ LC$/, '')}: LC → RC 쉬지 않고 이어서 풀기 (실전처럼)`, 120)
    add('채점 · 오답', '파트별 틀린 개수 기록 → 응시자 정답률 75% 이상인데 틀린 문제부터 원인 적기 (개념 · 실수 · 시간) → LC 틀린 문장 받아쓰기 → RC 틀린 문장 해석', 80)
  } else {
    add('LC', `${lc}: ${LS(lc)}`, 70)
    add('RC', `${rc}: ${RS(rc)}`, 90)
    add('오답 · 쉐도잉', '오늘 틀린 문제 오답노트에 정리 → LC 음원 따라 말하기', 40)
  }
  add('토스', ts.startsWith('포켓북') ? ts : `${ts}: 교재 읽기 → 만능문장 따라 말하기 → 녹음하고 다시 듣기`, 60)
  if (note) add('알림', note)
  return out
}
// 할 일들 중 불러온 진도표에서 그날 상세 계획 찾기
export const detailFor = (tasks, due) => { for (const t of tasks) if (t.plan && t.due === due) { const p = planOf(t.plan); if (p?.days[due]) return planDetail(p, due) } return [] }

export const planCount = (p) => Object.values(p.days).reduce((a, d) => a + d.items.length, 0)
export const planDays = (p) => Object.values(p.days).filter((d) => !d.examDay).length
const planOf = (id) => PLANS.find((p) => p.id === id)
export const planTitle = (id) => planOf(id)?.title || '진도표'

// 넣기 (다시 누르면 바뀐 내용 반영): 같은 종류 · 같은 날 시험이 있으면 그 시험에 연결 · 할 일 · 교재는 고정 id (다시 넣으면 건너뜀)
export function importPlan(p, { books = true } = {}) {
  let added = 0, removed = 0, fixed = 0
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
      const had = find('tasks', id)
      if (had) { if (!had.done && had.title !== title) { put('tasks', { ...had, title }); fixed++ } return } // 진도표 내용이 바뀌면 안 끝낸 할 일만 고침
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
  })
  return { added, removed, fixed }
}
