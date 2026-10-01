// 내 기록에 물어보기: 간단한 질문은 앱 안에서 바로 계산, 어려운 질문은 단축어(애플 인텔리전스)로
import { addDays, weekStart, monthStart, diffDays, tsToYmd } from '../engine/date.js'

const hm = (m) => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}시간${r ? ' ' + r + '분' : ''}` : `${r}분` }

// 기간 해석 (기본: 이번 주)
export function parsePeriod(q, t, ws = 1) {
  const n = q.match(/최근\s*(\d+)\s*일/)
  if (n) return { from: addDays(t, -(+n[1] - 1)), to: t, label: `최근 ${n[1]}일` }
  if (/그제|그저께/.test(q)) return { from: addDays(t, -2), to: addDays(t, -2), label: '그제' }
  if (/어제/.test(q)) return { from: addDays(t, -1), to: addDays(t, -1), label: '어제' }
  if (/오늘/.test(q)) return { from: t, to: t, label: '오늘' }
  if (/지난\s*주|저번\s*주/.test(q)) { const s = addDays(weekStart(t, ws), -7); return { from: s, to: addDays(s, 6), label: '지난주' } }
  if (/지난\s*달|저번\s*달/.test(q)) { const s = monthStart(addDays(monthStart(t), -1)); return { from: s, to: addDays(monthStart(t), -1), label: '지난달' } }
  if (/이번\s*달|이달/.test(q)) return { from: monthStart(t), to: t, label: '이번 달' }
  if (/올해|이번\s*년/.test(q)) return { from: t.slice(0, 4) + '-01-01', to: t, label: '올해' }
  if (/내일/.test(q)) return { from: addDays(t, 1), to: addDays(t, 1), label: '내일' }
  if (/다음\s*주/.test(q)) { const s = addDays(weekStart(t, ws), 7); return { from: s, to: addDays(s, 6), label: '다음 주' } }
  return { from: weekStart(t, ws), to: addDays(weekStart(t, ws), 6), label: '이번 주' }
}

export function answer(q, { tasks, sessions, subjects, ddays, today: t, weekStart: ws = 1 }) {
  q = q.trim()
  if (!q) return null
  const P = parsePeriod(q, t, ws)
  const sub = subjects.find((s) => s.name && q.includes(s.name))
  const inP = (d) => d && d >= P.from && d <= P.to
  const live = tasks.filter((x) => !x.archived)
  const name = (id) => subjects.find((s) => s.id === id)?.name || '기타'

  // 시험·D-day
  if (/디데이|D-?day|시험|며칠\s*남/i.test(q)) {
    const list = ddays.filter((d) => d.date >= t && (!sub || d.title.includes(sub.name))).sort((a, b) => a.date.localeCompare(b.date))
    if (!list.length) return { text: '다가오는 D-day가 없어요' }
    return { text: `${list[0].title}까지 ${diffDays(list[0].date, t)}일 남았어요`, lines: list.slice(0, 5).map((d) => `${d.title} · D-${diffDays(d.date, t)} (${d.date.slice(5).replace('-', '/')})`) }
  }
  // 미룬·밀린 할 일
  if (/미룬|밀린|미뤄|이월|지연/.test(q)) {
    const list = live.filter((x) => !x.done && ((x.carry || 0) > 0 || (x.due && x.due < t)) && (!sub || x.subjectId === sub.id))
      .sort((a, b) => (b.carry || 0) - (a.carry || 0) || (a.due || '').localeCompare(b.due || ''))
    if (!list.length) return { text: '밀린 할 일이 없어요' }
    return { text: `밀리거나 미룬 할 일 ${list.length}개`, lines: list.slice(0, 8).map((x) => `${x.title}${x.carry ? ` · ${x.carry}번 미룸` : ''}${x.due ? ` · ${x.due.slice(5).replace('-', '/')}` : ''}`) }
  }
  // 완료한 할 일
  if (/완료|끝낸|끝냈|해낸|한\s*일/.test(q)) {
    const list = live.filter((x) => x.done && x.doneAt && inP(tsToYmd(x.doneAt)) && (!sub || x.subjectId === sub.id))
    return { text: `${P.label} 완료 ${list.length}개`, lines: list.slice(0, 8).map((x) => `${x.title} · ${name(x.subjectId)}`) }
  }
  // 남은·해야 할 일
  if (/남은|해야|할\s*일|마감/.test(q)) {
    const list = live.filter((x) => !x.done && (P.label === '이번 주' && !/이번\s*주/.test(q) ? x.due && x.due <= P.to : inP(x.due)) && (!sub || x.subjectId === sub.id))
      .sort((a, b) => (a.due || '').localeCompare(b.due || '') || (a.dueTime ?? 9999) - (b.dueTime ?? 9999))
    if (!list.length) return { text: `${P.label} 남은 할 일이 없어요` }
    return { text: `${P.label} 남은 할 일 ${list.length}개`, lines: list.slice(0, 8).map((x) => `${x.title}${x.due ? ' · ' + x.due.slice(5).replace('-', '/') : ''}`) }
  }
  // 공부 시간 (과목·요일·최다)
  if (/공부|시간|몇\s*분|가장|제일|많이|적게/.test(q) || sub) {
    const ss = sessions.filter((s) => inP(s.date) && (!sub || s.subjectId === sub.id))
    const total = ss.reduce((a, s) => a + (s.dur || 0), 0)
    const by = {}; for (const s of ss) by[name(s.subjectId)] = (by[name(s.subjectId)] || 0) + (s.dur || 0)
    const top = Object.entries(by).sort((a, b) => b[1] - a[1])
    if (/요일/.test(q)) {
      const WD = ['일', '월', '화', '수', '목', '금', '토'], w = {}
      for (const s of ss) { const d = new Date(s.date + 'T00:00').getDay(); w[d] = (w[d] || 0) + (s.dur || 0) }
      const best = Object.entries(w).sort((a, b) => b[1] - a[1])[0]
      return best ? { text: `${P.label} ${WD[best[0]]}요일에 가장 많이 했어요 (${hm(best[1])})` } : { text: `${P.label} 공부 기록이 없어요` }
    }
    if (/가장|제일|많이/.test(q) && !sub && top.length) return { text: `${P.label} 가장 많이 한 과목은 ${top[0][0]} (${hm(top[0][1])})`, lines: top.slice(0, 5).map(([k, v]) => `${k} · ${hm(v)}`) }
    if (!total) return { text: `${P.label} ${sub ? sub.name + ' ' : ''}공부 기록이 없어요` }
    const days = new Set(ss.map((s) => s.date)).size
    return { text: `${P.label} ${sub ? sub.name + ' ' : ''}${hm(total)} 공부했어요`, lines: [`${days}일 공부 · 하루 평균 ${hm(total / Math.max(1, days))}`, ...(!sub ? top.slice(0, 5).map(([k, v]) => `${k} · ${hm(v)}`) : [])] }
  }
  return null
}

// AI 에 넘길 요약 (짧게): 최근 30일 공부, 남은·밀린 할 일, 최근 완료, D-day
export function contextFor({ tasks, sessions, subjects, ddays, today: t }) {
  const name = (id) => subjects.find((s) => s.id === id)?.name || '기타'
  const from = addDays(t, -29), by = {}
  for (const s of sessions) if (s.date >= from) { const k = s.date + ' ' + name(s.subjectId); by[k] = (by[k] || 0) + (s.dur || 0) }
  const study = Object.entries(by).sort().map(([k, v]) => `${k} ${v}분`).join('; ')
  const live = tasks.filter((x) => !x.archived)
  const open = live.filter((x) => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 40)
    .map((x) => `${x.title}(${name(x.subjectId)}${x.due ? ', 마감 ' + x.due : ''}${x.carry ? ', ' + x.carry + '번 미룸' : ''}${x.estimate ? ', 예상 ' + x.estimate + '분' : ''})`).join('; ')
  const done = live.filter((x) => x.done && x.doneAt && tsToYmd(x.doneAt) >= addDays(t, -13)).slice(0, 30).map((x) => `${tsToYmd(x.doneAt)} ${x.title}`).join('; ')
  const dd = ddays.filter((d) => d.date >= t).map((d) => `${d.title} ${d.date}`).join('; ')
  return `오늘: ${t}\n최근 30일 공부(날짜 과목 분): ${study || '없음'}\n남은 할 일: ${open || '없음'}\n최근 2주 완료: ${done || '없음'}\nD-day: ${dd || '없음'}`
}

export const aiPrompt = (question, ctx) => `너는 학생의 공부·할 일 기록을 보고 답하는 도우미야. 아래 기록만 근거로 한국어로 짧고 구체적으로 답해. 모르면 모른다고 해.\n\n[기록]\n${ctx}\n\n[질문]\n${question}`
