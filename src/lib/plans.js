// 진도표 불러오기: 시험 · 날짜별 할 일 · 교재를 한 번에 넣음 (같은 id 로 넣어서 두 번 눌러도 겹치지 않음)
import { batch, put, find, list, remove } from '../store/store.js'

// 토익 · 토스 진도 달력 — ~12/12 토익 3시간 + 토스 1시간 · 12/14~ 토스 4시간
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
  note: '하루 4시간 — ~12/12 토익 3시간 + 토스 1시간 · 12/14~ 토스 4시간 · 토익은 YBM 단기공략 850+, 토스는 시계토끼 올인원 기본서 기준',
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
    '2026-11-25': T('P3 INTRO (p.66–67) · U11 요청·제안/다음에 할 일 (p.80–85)', 'P6 INTRO (p.220–221) · U12 문법 문제 (p.222–227)', 'Day 05–06', 'Part 1 유형·실전 (p.29–35)', '쉐도잉 · 오답'),
    '2026-11-26': T('U12 의도 파악/시각 정보 연계 (p.86–92)', 'U13 어휘 문제 (p.228–233) · U14 접속부사 문제 (p.234–239)', 'Day 07–08', 'Part 2 소개·전략·기초 (p.36–42)', '쉐도잉 · 오답'),
    '2026-11-27': T('U10 세부 사항/문제점 (p.74–79)', 'U15 문장 고르기 문제 (p.240–247)', 'Day 09–10', 'Part 2 유형 익히기 (p.43–53)', '쉐도잉 · 오답'),
    '2026-11-28': T('U9 주제·목적/화자·장소 (p.68–73) · P3 만점 빈출 표현 (p.93–97)', 'P7 INTRO (p.248–249) · U16 주제/목적 (p.250–253) · U17 세부 사항 (p.254–257)', 'Day 11–12', 'Part 2 실전 + 묘사 틀 암기 (p.54–57)', '쉐도잉 · 오답'),
    '2026-11-29': M(1, 'Day 01–12 복습 · 실전 1–2회', 'Part 3 소개·전략·기초 (p.58–66)'),
    '2026-11-30': T('P4 INTRO (p.98–99) · U13 전화 메시지 (p.100–103)', 'U18 Not/True (p.258–261) · U19 추론/암시 (p.262–265)', 'Day 13–14', 'Part 3 기초 다지기 (p.67–70)', '정기접수 마감 오전 10시', { imp: true }),
    '2026-12-01': T('U14 공지/회의 (p.104–107)', 'U20 동의어 (p.266–269) · U21 의도 파악 (p.270–273)', 'Day 15–16', 'Part 3 의문사 만능패턴 (p.71–78)', 'P7 시간 재기'),
    '2026-12-02': T('U15 설명/소개 (p.108–111)', 'U22 문장 삽입 (p.274–277) · U23 연계 문제 (p.278~)', 'Day 17–18', 'Part 3 부연 설명 (p.79–84)', 'P7 시간 재기'),
    '2026-12-03': T('U16 광고/방송 (p.112–115) · P4 만점 빈출 표현 (p.116–121)', 'P7 3중 지문 시간 재고 풀기 (교재 실전 문제)', 'Day 19–20', 'Part 3 유형·실전 (p.85–107)', 'P7 시간 재기'),
    '2026-12-04': T('기출 1회 LC 오답 다시 듣기', 'U11 ETS 기출 어휘 (p.198–219)', 'Day 21–22', 'Part 4 소개·전략·기초 (p.108–114)', 'P7 시간 재기'),
    '2026-12-05': T('기출문제집 남은 회차 P3·P4 문제만 풀기', '기출 1회 RC 오답 다시 풀기 · P6 4지문 8분 안에 풀기', 'Day 23–24', 'Part 4 유형 ① (p.115–131)', 'P7 시간 재기'),
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

// 일별 상세 계획: 그날 할 일을 순서 · 시간 배분(계획) · 팁으로 풀어 씀 — [{ label, min, items: [{ h, steps[], tip }] }]
export const GUIDE = [
  ['받아쓰기', '틀린 문장을 한 문장씩 멈춰 들으며 그대로 적고, 스크립트와 비교해요.'],
  ['쉐도잉', '음원을 0.5초쯤 늦게 그림자처럼 따라 말해요. 발음 · 속도에 익숙해져요.'],
  ['근거 문장', '정답인 이유가 들어 있는 스크립트 · 지문 속 문장이에요.'],
  ['소거법', '보기마다 ○(정답 후보) △(애매) ×(오답)를 표시하며 지워요.'],
  ['실전 문제', '각 Unit 끝의 ETS 고득점 실전 문제는 개념을 읽은 뒤 시간을 재고 풀어요. 채점 후 틀린 문제는 오답노트로 옮겨요.'],
  ['오답노트', '번호 · 유형 · 틀린 이유 · 근거 문장 · 다음엔 이렇게, 다섯 칸으로 적어요.'],
]
const LT = { U5: 'How는 뒤 단어(How long, How much, How about)까지 들어야 뜻이 정해져요.', U8: '요청·제안·평서문은 돌려 말하는 답이 많아요. 의미가 자연스럽게 이어지면 정답이에요.', U9: '주제·화자·장소는 처음 1~2문장에서 답이 나와요.', U10: '문제점·걱정거리는 But, Unfortunately 뒤에 집중해요.', U11: '요청·다음에 할 일은 대화 마지막 부분에서 답이 나와요.', U12: '의도 파악은 인용 문장의 앞뒤 흐름이 답이에요. 시각 정보는 표를 먼저 보고 질문에 없는 항목에 집중해요.', U13: '전화 메시지는 이름 → 전화한 목적 → 요청 순서로 들어요.', U14: "공지·회의는 '무엇이 바뀌는지'에 집중해요.", U15: '설명·소개는 소개 대상의 직업과 업적이 자주 나와요.', U16: '광고는 상품·할인·기간, 방송은 날씨·교통 정보가 자주 나와요.' }
const RT = { U12: '문법 문제는 빈칸 문장 안에서, 시제는 앞 문장의 날짜·시점으로 판단해요.', U13: '어휘 문제는 빈칸 문장만 보지 말고 앞뒤 문장 흐름으로 판단해요.', U14: '앞뒤 관계를 먼저 정하고(원인·추가·반대·예시) 보기를 봐요.', U15: '빈칸 앞뒤 문장과 지시어(this, these, such)로 연결되는지 확인해요.', U16: '주제·목적은 첫 문단에 있어요.', U17: '질문의 키워드를 지문에서 찾아 그 주변을 읽어요.', U18: '보기 4개를 지문과 하나씩 대조해서 지워요.', U19: '지문에 직접 없는 답은 근거 문장 2개로 확인해요.', U20: '사전 뜻이 아니라 문맥 속 뜻으로 골라요.', U21: '인용된 메시지 앞뒤 흐름이 답이에요.', U22: '넣을 문장의 지시어·연결어가 단서예요.', U23: '이름·날짜·숫자처럼 두 지문에 같이 나오는 정보를 연결해요.' }
const TT = { 'Part 1': '끊어 읽기와 강세를 연필로 표시하고 읽어요.', 'Part 2': '사진은 중심 인물 → 주변 → 느낌 순서로 말해요.', 'Part 3': '답 + 이유 한 문장 + 예시 순서로 말해요.', 'Part 4': '표에서 시간·장소·이름을 먼저 확인해요.', 'Part 5': '의견 → 이유 2개 → 예시 → 결론 순서로 말해요.' }
const uid = (t) => (t.match(/U(\d+)/) || [])[0]
const LM = (t) => {
  const u = uid(t), n = u ? +u.slice(1) : 0
  if (t.includes('오답')) return { s: '틀린 문제만 다시 듣고 답 고르기 → 스크립트에서 정답 근거 문장 찾기 → 틀린 이유 표시(못 들음·해석 실수·함정 보기) → 근거 문장 받아쓰기 → 음원 따라 말하기(쉐도잉) 3번' }
  if (t.includes('문제만')) return { s: '개념 설명은 건너뛰고 ETS 고득점 실전 문제 바로 풀기 → 채점 → 틀린 문제만 그 Unit 개념 부분 찾아 읽기 → 틀린 문장 받아쓰기', tip: u && LT[u] }
  if (t.includes('만점 빈출 표현')) return { s: '표현 소리 내어 읽기 → 음원 듣고 따라 말하기 → 뜻 가리고 말해 보기 → 모르는 표현은 단어장에 옮기기', tip: "외웠는지보다 '들으면 바로 뜻이 떠오르는지'가 기준이에요." }
  if (t.includes('INTRO')) return { s: '파트 구성과 문제 수 확인 → 문제 푸는 순서(전략) 읽기 → 예제 음원 한 번 듣기' }
  if (n >= 3 && n <= 8) return { s: '개념에서 질문 유형별로 자주 나오는 정답 패턴 읽기 → 예제 음원 듣기(질문 앞부분 2~3단어에 집중) → ETS 고득점 실전 문제 풀기: 보기마다 ○△× 표시하며 오답 지우기 → 채점 → 스크립트 보며 다시 듣기 → 틀린 문장 받아쓰기 → 쉐도잉 3번', tip: LT[u] }
  if (n >= 9) return { s: '개념·전략 읽기 → ETS 고득점 실전 문제 풀기: 음원 전에 질문 3개를 먼저 읽고 키워드에 밑줄 → 들으면서 바로 답 표시(끝까지 기다리지 않기) → 채점 → 스크립트에서 정답 근거 문장 표시 → 근거 문장 받아쓰기 → 대화 하나 골라 쉐도잉', tip: LT[u] }
  return { s: '개념·전략 읽기 → 문제 풀기 → 채점 → 스크립트 확인 → 받아쓰기' }
}
const RM = (t) => {
  const u = uid(t), n = u ? +u.slice(1) : 0
  if (t.includes('오답')) return { s: '틀린 문제를 시간 재지 말고 다시 풀기 → 해설로 정답 근거 확인 → 틀린 이유 표시(어휘·문법·근거 못 찾음·시간 부족) → P7은 근거 문장을 해석해서 적기' }
  if (t.includes('3중')) return { s: '타이머 켜기(3중 지문 1세트 5분 목표) → 질문 5개를 먼저 읽고 어느 지문에서 찾을지 표시 → 지문끼리 겹치는 이름·날짜·숫자에 동그라미 → 채점 → 시간을 넘긴 세트는 어디서 막혔는지 적기', tip: '처음엔 5분을 넘겨도 괜찮아요. 걸린 시간을 기록해서 줄어드는지 보세요.' }
  if (t.includes('4지문')) return { s: '타이머 8분 → 지문을 처음부터 읽으며 빈칸에서 멈추기 → 채점 → 틀린 문제의 근거 문장 밑줄' }
  if (t.includes('20분')) return { s: 'P5 30문항 + P6 16문항을 20분 안에 풀기 → 채점 → 시간이 오래 걸린 문제 표시' }
  if (t.includes('문제만')) return { s: 'U1–10의 ETS 고득점 실전 문제에서 30문항 골라 타이머 10분(문항당 20초) → 빈칸 앞뒤만 보고 품사·문법 판단 → 채점 → 틀린 문제만 해당 Unit 개념 찾아 읽기' }
  if (t.includes('어휘') && n === 11) return { s: '어휘 목록에서 뜻 가리고 아는 단어 체크 → 모르는 단어는 예문과 함께 읽기 → ETS 고득점 실전 문제 풀기(문항당 20초) → 채점 → 틀린 단어는 기출보카에서 같이 복습', tip: '단어 하나보다 함께 쓰이는 짝(예: comply with)으로 외워요.' }
  if (t.includes('INTRO')) return { s: '파트 구성과 문제 수 확인 → 문제 푸는 순서(전략) 읽기 → 예제 한 세트 풀어 보기' }
  if (n >= 12 && n <= 15) return { s: '개념 읽기 → ETS 고득점 실전 문제 풀기(지문당 2분): 지문을 처음부터 읽으며 빈칸에서 멈추기(빈칸 문장만 보지 않기) → 채점 → 정답 근거 문장 밑줄', tip: RT[u] }
  if (n >= 16) return { s: '개념·전략 읽기 → ETS 고득점 실전 문제 풀기(문항당 1분): 질문을 먼저 읽고 유형 확인 → 지문에서 근거 문장 찾아 밑줄 + 문제 번호 적기 → 채점 → 틀린 문제는 근거 문장 해석해 보기', tip: RT[u] }
  return { s: '개념 정리 → 문제 풀기 → 채점 → 오답 이유 적기' }
}
const TM = (t) => {
  const pt = (t.match(/Part \d/) || [])[0]
  if (t.startsWith('포켓북')) return { s: '포켓북 만능문장 소리 내어 읽기 → 막히는 문장만 한 번 더' }
  if (/실전/.test(t)) return { s: '실제 준비·답변 시간대로 말하며 녹음 → 녹음 듣고 막힌 곳 표시 → 모범 답안 보고 고쳐서 다시 녹음', tip: TT[pt] }
  if (/유형/.test(t)) return { s: '모범 답안 소리 내어 3번 읽기 → 템플릿에 내 말로 바꿔 넣어 보기 → 준비·답변 시간 맞춰 말하고 녹음 → 모범 답안과 비교', tip: TT[pt] }
  return { s: '시험 형식과 채점 기준 읽기 → 템플릿·기초 문장 소리 내어 읽기 → 따라 말하고 녹음해서 다시 듣기', tip: TT[pt] }
}
const VM = (v) => ({ s: 'MP3 들으며 Day 단어 한 번 훑기 → 뜻 가리고 아는 단어 체크 → 모르는 단어만 3번 소리 내어 말하고 쓰기 → 전날 Day 뜻 가리고 테스트' + (v.includes('실전') ? ' → 실전문제 풀고 틀린 단어 표시' : '') })
const IT = (t, f) => t.split(' · ').filter(Boolean).map((h) => ({ h, ...f(h) }))
// 단계는 ' → ' 로 나눔 (괄호 안 화살표는 나누지 않음)
const split = (s) => { const out = []; let depth = 0, cur = ''; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(') depth++; if (c === ')') depth--; if (!depth && s.startsWith(' → ', i)) { out.push(cur); cur = ''; i += 2; continue } cur += c } out.push(cur); return out }
export function planDetail(p, due) {
  const d = p?.days[due]; if (!d) return []
  const out = [], add = (label, items, min = 0) => out.push({ label, min, items: items.map((o) => ({ h: o.h || '', steps: split(o.s), tip: o.tip || '' })) })
  const get = (a) => d.items.find((x) => x[0] === a)?.[1] || ''
  const lc = get('LC'), rc = get('RC'), vo = get('보카'), ts = get('토스'), note = d.imp ? get('기타') : ''
  if (d.examDay === 'toeic') { add('시험', [{ s: '토익 시험 (LC → RC) → 신분증 · 수험표 · 연필 확인' }]); add('휴식', [{ s: '시험 끝나면 푹 쉬기 → 토스는 내일부터' }]); return out }
  if (d.examDay) { add('시험', [{ s: '시험 전 포켓북 만능문장 소리 내어 읽기 → 토익스피킹 시험 → 신분증 · 수험표 확인' }]); return out }
  if (d.exam === 'tos') {
    const m = ts.match(/모의고사 (\d회) · (.+) 집중/)
    if (!m) { add('토스', [{ h: ts.split(' · ')[0], s: '응시하며 녹음 → 모범 답안과 비교 → 고친 답변으로 다시 말하기' }], 90); add('포켓북', [{ s: 'Part별 템플릿과 만능문장 소리 내어 읽기' }], 60); add('스크립트', [{ s: '나만의 답변 스크립트 최종 점검' }], 30) }
    else {
      add('모의고사', [{ h: `실전 모의고사 ${m[1]}`, s: '실제 시간대로 응시하며 녹음 → 모범 답안과 비교 → 막혔던 문항 답변 고치기' }], 80)
      add('Part 복습', [{ h: m[2], s: '교재 유형 익히기 다시 보기 → 실전 트레이닝 문항 소리 내어 답하기' }], 70)
      add('포켓북', [{ s: '템플릿 · 만능문장 암기 → 보지 않고 따라 말하기' }], 50)
      add('재녹음', [{ s: `모의고사 ${m[1]} 다시 답하고 녹음 → 처음 녹음과 비교` }], 20)
      add('스크립트', [{ s: '오늘 고친 답변을 나만의 스크립트에 정리' }], 20)
    }
    if (note) add('알림', [{ s: note }]); return out
  }
  if (d.light) { add('오답', [{ s: 'LC · RC 오답노트 훑어보기 → 틀린 이유만 다시 확인' }], 80); add('보카', [{ s: '체크한 단어만 빠르게 보기' }], 30); add('토스', [{ s: '포켓북 만능문장 소리 내어 읽기' }], 30); if (note) add('알림', [{ s: note }]); return out }
  if (d.mock) {
    add('모의고사', [{ h: lc.replace(/ LC$/, ''), s: '실제 시험처럼 LC 45분 → RC 75분 쉬지 않고 이어서 → RC는 P5·6 20분, P7 55분으로 나누기 → 모르는 문제는 표시하고 넘어가되 답은 꼭 마킹', tip: '실제 시험처럼 오전에 풀면 실전 감각이 좋아져요.' }], 120)
    add('보카', [{ h: vo, s: '오늘 Day는 MP3로 한 번 훑기만 → 틀린 단어 표시' }], 20)
    add('채점 · 오답', [{ s: '파트별 틀린 개수 기록 → 응시자 정답률 75% 이상인데 틀린 문제부터 원인 적기(개념·실수·시간) → LC 틀린 문장 받아쓰기 → RC 틀린 문장 해석' }], 40)
  } else {
    add('보카', [{ h: vo, ...VM(vo) }], 30)
    add('LC', IT(lc, LM), 60)
    add('RC', IT(rc, RM), 70)
    add('오답 정리', [{ s: '오늘 틀린 문제를 오답노트에 정리(번호·유형·틀린 이유·근거 문장)' }], 20)
  }
  add('토스', [{ h: ts, ...TM(ts) }], 60)
  if (note) add('알림', [{ s: note }])
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
