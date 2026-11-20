// 시험 종류 · 영역 · 점수 규칙 (JLPT · 토익 · 직접 만든 시험)
// JLPT: 급수별 합격점과 영역 기준점(과락) — 출처: JLPT 공식 '합격 판정' 기준
// 토익: LC · RC 각 5~495, 합계 10~990

export const JLPT_LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5']
const JLPT_PASS = { N1: 100, N2: 90, N3: 95, N4: 90, N5: 80 }

// 점수 영역 (sections): 성적표에 나오는 칸 · min: 기준점(이 아래면 과락)
export function sectionsOf(exam) {
  if (exam.kind === 'jlpt') {
    if (exam.level === 'N4' || exam.level === 'N5') return [
      { id: 'lk', name: '언어지식·독해', max: 120, min: 38 },
      { id: 'li', name: '청해', max: 60, min: 19 },
    ]
    return [
      { id: 'lk', name: '언어지식', max: 60, min: 19 },
      { id: 'rd', name: '독해', max: 60, min: 19 },
      { id: 'li', name: '청해', max: 60, min: 19 },
    ]
  }
  if (exam.kind === 'toeic') return [
    { id: 'lc', name: 'LC', max: 495, low: 5 },
    { id: 'rc', name: 'RC', max: 495, low: 5 },
  ]
  return (exam.sections || []).map((s, i) => ({ id: s.id || 's' + i, name: s.name || '영역 ' + (i + 1), max: +s.max || 100 }))
}

// 공부 영역 (시간 기록 · 할 일 분류용) — 직접 바꿀 수 있음 (exam.areas)
export function areasOf(exam) {
  if (exam?.areas?.length) return exam.areas
  if (exam?.kind === 'jlpt') return ['문자·어휘', '문법', '독해', '청해', '한자']
  if (exam?.kind === 'toeic') return ['LC', 'RC', '단어', '모의고사']
  return ['공부']
}

export const maxTotal = (exam) => sectionsOf(exam).reduce((a, s) => a + s.max, 0)
export const passLine = (exam) => (exam.kind === 'jlpt' ? JLPT_PASS[exam.level] ?? null : exam.pass ? +exam.pass : null)

// 점수 하나 계산: 합계 · 합격 여부 · 과락 영역 · 목표까지
export function judge(exam, score) {
  const S = sectionsOf(exam), v = score?.parts || {}
  const filled = S.filter((s) => v[s.id] !== '' && v[s.id] != null)
  const total = filled.length ? filled.reduce((a, s) => a + (+v[s.id] || 0), 0) : null
  const fail = exam.kind === 'jlpt' ? S.filter((s) => v[s.id] !== '' && v[s.id] != null && +v[s.id] < s.min).map((s) => s.name) : []
  const pl = passLine(exam)
  const complete = filled.length === S.length
  const pass = pl == null || !complete ? null : total >= pl && !fail.length
  const target = +exam.target || null
  return { total, complete, pass, fail, toTarget: target != null && total != null ? target - total : null, max: maxTotal(exam) }
}

// 점수 칸 값 맞추기 (범위 밖이면 잘라냄 · 토익은 5점 단위)
export function clampPart(exam, sid, raw) {
  if (raw === '' || raw == null) return ''
  const s = sectionsOf(exam).find((x) => x.id === sid)
  let n = Math.round(+raw)
  if (!Number.isFinite(n)) return ''
  if (exam.kind === 'toeic') n = Math.round(n / 5) * 5
  return Math.max(s?.low ?? 0, Math.min(s?.max ?? n, n))
}

export const examName = (exam) => (exam.kind === 'jlpt' ? `JLPT ${exam.level || ''}`.trim() : exam.kind === 'toeic' ? '토익' : exam.name || '시험')
export const examLabel = (exam) => exam.name && exam.kind !== 'custom' ? `${examName(exam)} · ${exam.name}` : examName(exam)

// JLPT 정기 시험일 안내: 7월 · 12월 첫째 일요일 (해외·국내 같은 날)
export function jlptDates(fromYmd) {
  const y = +fromYmd.slice(0, 4), out = []
  for (const yy of [y, y + 1]) for (const m of [7, 12]) {
    const d = new Date(yy, m - 1, 1); while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
    const k = `${yy}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (k >= fromYmd) out.push(k)
  }
  return out.slice(0, 2)
}
