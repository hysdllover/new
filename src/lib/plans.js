// 진도표 불러오기: 시험 · 날짜별 할 일 · 교재를 한 번에 넣음 (같은 id 로 넣어서 두 번 눌러도 겹치지 않음)
import { batch, put, find, list, remove, setSettings } from '../store/store.js'

// 토익 12/13 정기시험 · 진도 달력 (단기공략 850+ LC · RC · ETS 기출보카 · 기출문제집) — ★ 는 진단에서 약했던 부분
// 하루: [LC, RC, 보카, 기타] · mock: 모의고사 날 · imp: 기타 줄을 눈에 띄게 (접수 마감 · 시험 전날)
const D = (lc, rc, voca, etc, o = {}) => ({ items: [['LC', lc], ['RC', rc], ['보카', voca], ['기타', etc]], ...o })
const M = (n, voca, o = {}) => D(`기출문제집 ${n}회 LC`, `기출문제집 ${n}회 RC`, voca, '모의고사 오답 정리', { mock: true, ...o })
export const PLANS = [{
  id: 'toeic-1213b',
  replaces: 'toeic-1213', // 예전 진도표를 넣었으면 끝내지 않은 할 일은 지우고 이걸로 바꿈 (시험 · 교재는 그대로 이어 씀)
  title: '토익 진도 달력 · 12/13 시험',
  note: '하루 4시간 — 보카 40 · LC 70 · RC 90 · 오답·쉐도잉 40분 · ★ 진단 약점',
  goalDaily: 240,
  exam: { kind: 'toeic', date: '2026-12-13', name: '12/13 정기', areas: ['LC', 'RC', '보카', '기타'], color: '#7a8660' },
  materials: [
    { id: 'lc', title: '단기공략 850+ LC', unit: 'U', total: 16 },
    { id: 'rc', title: '단기공략 850+ RC', unit: 'U', total: 23 },
    { id: 'voca', title: 'ETS 기출보카', unit: 'Day', total: 30 },
    { id: 'mock', title: 'ETS 기출문제집', unit: '회', total: 4 },
  ],
  days: {
    '2026-11-23': D('U1–2 인물·사물 사진', 'U8·U14 접속사, 접속부사 ★', 'Day 01–02', 'RC 진단 완료(11/20) · 쉐도잉'),
    '2026-11-24': D('U3 Who/What/Which', 'U9–10 관계사, 명사절 ★', 'Day 03–04', '쉐도잉 · 오답'),
    '2026-11-25': D('U4 When/Where', 'U1–2 명사, 대명사', 'Day 05–06', '쉐도잉 · 오답'),
    '2026-11-26': D('U5 Why/How', 'U3–4 형용사·부사, 전치사', 'Day 07–08', '쉐도잉 · 오답'),
    '2026-11-27': D('U6–7 일반·선택, 부정·부가 의문문', 'U5–6 동사(가정법 도치 ★), to부정사·동명사', 'Day 09–10', '쉐도잉 · 오답'),
    '2026-11-28': D('U8 요청·제안/평서문', 'U7·U11 분사, 기출 어휘', 'Day 11–12', '쉐도잉 · 오답'),
    '2026-11-29': M(1, 'Day 01–12 복습 · 실전 1–2회'),
    '2026-11-30': D('U9 주제·목적/화자·장소', 'U12–13 P6 문법·어휘', 'Day 13–14', '정기접수 마감 오전 10시', { imp: true }),
    '2026-12-01': D('U10 세부 사항/문제점', 'U15–16 문장 고르기, 주제/목적', 'Day 15–16', 'P7 시간 재기'),
    '2026-12-02': D('U11 요청·제안/다음 할 일', 'U17–18 세부 사항, Not/True', 'Day 17–18', 'P7 시간 재기'),
    '2026-12-03': D('U12 의도 파악/시각 정보', 'U19–20 추론/암시, 동의어', 'Day 19–20', 'P7 시간 재기'),
    '2026-12-04': D('U13–14 전화메시지, 공지/회의', 'U21 의도 파악', 'Day 21–22', 'P7 시간 재기'),
    '2026-12-05': D('U15 설명/소개', 'U22 문장 삽입', 'Day 23–24', 'P7 시간 재기'),
    '2026-12-06': M(2, 'Day 13–24 복습 · 실전 3–4회'),
    '2026-12-07': D('U16 광고/방송', 'U23 연계 문제', 'Day 25–26', '모의고사 오답 다시 풀기'),
    '2026-12-08': D('틀린 Unit 다시 풀기', 'U8·9·14 다시 풀기 ★', 'Day 27–28', '오답노트 복습'),
    '2026-12-09': M(3, 'Day 29–30 · 실전 5–6회'),
    '2026-12-10': D('단기공략 모의고사 LC', '단기공략 모의고사 RC', 'Day 25–30·Level-Up · 실전 7–9회', '모의고사 오답 정리', { mock: true }),
    '2026-12-11': M(4, '실전 10–12회'),
    '2026-12-12': D('오답노트 가볍게', '오답노트 가볍게', '체크한 단어만', '수험표·신분증 챙기기 · 일찍 자기', { imp: true }),
    '2026-12-13': { items: [['시험', '토익 시험']], exam: true },
  },
}]

export const planCount = (p) => Object.values(p.days).reduce((a, d) => a + d.items.length, 0)
export const planDays = (p) => Object.keys(p.days).filter((k) => !p.days[k].exam).length

// 넣기: 같은 날 같은 종류 시험이 있으면 그 시험에 연결 · 할 일 · 교재는 고정 id (다시 넣으면 건너뜀)
// replaces: 예전 진도표의 끝내지 않은 할 일은 지움 (끝낸 건 기록으로 남김)
export function importPlan(p, { goal = true, books = true } = {}) {
  let added = 0, removed = 0
  const base = p.replaces || p.id
  batch(() => {
    if (p.replaces) for (const t of list('tasks')) if (t.plan === p.replaces && !t.done) { remove('tasks', t.id); removed++ }
    const same = list('exams').find((e) => e.kind === p.exam.kind && e.date === p.exam.date)
    const examId = same?.id || 'plan-' + base
    if (same) put('exams', { ...same, areas: p.exam.areas }); else put('exams', { id: examId, ...p.exam })
    let n = 0
    for (const [due, d] of Object.entries(p.days)) d.items.forEach(([area, title], i) => {
      const id = `plan-${p.id}-${due}-${i}`
      n++
      if (find('tasks', id)) return
      const imp = d.imp && area === '기타'
      put('tasks', { id, title, due, examId, area: area === '시험' ? null : area, done: false, order: n, plan: p.id, ...(d.mock ? { mock: true } : null), ...(imp ? { imp: true } : null), ...(d.exam ? { examDay: true } : null) })
      added++
    })
    if (books) for (const m of p.materials || []) { const id = `plan-${base}-${m.id}`; if (!find('materials', id)) put('materials', { id, title: m.title, unit: m.unit, total: m.total, current: 0, examId }) }
    if (goal && p.goalDaily) setSettings({ goalDaily: p.goalDaily })
  })
  return { added, removed }
}
