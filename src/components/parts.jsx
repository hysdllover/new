// 여러 화면이 같이 쓰는 줄 · 카드: 할 일 줄 · 빠른 추가 · 시험 요약 · 교재 줄
import { useState } from 'react'
import { find } from '../store/store.js'
import { toggleTask, addTask, stepMaterial } from '../store/actions.js'
import { Check, Icon, Line } from './ui.jsx'
import { openTask, openExam, openScore, openMaterial, ExamTag } from './editors.jsx'
import { today, rel, fmtDate, dday, diffDays } from '../lib/date.js'
import { examName, judge, maxTotal, passLine } from '../lib/exams.js'

export function TaskRow({ t, exams, showDate }) {
  const ex = exams.find((e) => e.id === t.examId)
  const late = !t.done && t.due && t.due < today()
  return (
    <div className={'row-line' + (t.done ? ' done' : '')}>
      <Check on={t.done} onClick={() => toggleTask(t.id)} />
      <button className="t" style={{ textAlign: 'left' }} onClick={() => openTask(t.id)}>
        <div className="tt">{t.title}</div>
        {(ex || t.area || (showDate && t.due) || late) && <div className="meta"><ExamTag exam={ex} area={t.area} />{(showDate || late) && t.due && <span className={late ? 'bad-t' : ''}>{rel(t.due)}</span>}</div>}
      </button>
    </div>
  )
}

// 빠른 추가: 적고 엔터 (날짜 · 시험은 정해진 값)
export function QuickAdd({ due = today(), examId = null, placeholder = '할 일 적고 엔터' }) {
  const [v, setV] = useState('')
  return (
    <form className="row quick" noValidate onSubmit={(e) => { e.preventDefault(); const title = v.trim(); if (!title) return; addTask({ title, due, examId }); setV('') }}>
      <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label="할 일 추가" />
      <button className="icon-btn" type="button" onClick={() => openTask(null, { due, examId, title: v })} aria-label="자세히 추가"><Icon name="plus" /></button>
    </form>
  )
}

/* ── 시험 요약 (D-day · 목표 · 최근 점수) ── */
export function ExamSummary({ exam, scores, big }) {
  const S = scores.filter((s) => s.examId === exam.id).sort((a, b) => a.date.localeCompare(b.date))
  const last = S[S.length - 1], j = last ? judge(exam, last) : null, max = maxTotal(exam), pl = passLine(exam)
  const n = exam.date ? diffDays(exam.date, today()) : null
  return (
    <div className="exam-sum">
      <button className="row" style={{ alignItems: 'baseline', width: '100%' }} onClick={() => openExam(exam.id)}>
        <span className="sw" style={{ background: exam.color || 'var(--soft)' }} />
        <b className="grow ellipsis" style={{ textAlign: 'left' }}>{examName(exam)}{exam.name ? <span className="soft"> · {exam.name}</span> : null}</b>
        <span className={big ? 'mid num' : 'num'}>{exam.date ? dday(exam.date) : '날짜 미정'}</span>
      </button>
      <div className="meta">{exam.date && <span>{fmtDate(exam.date)}{n > 0 ? ` · ${Math.ceil(n / 7)}주 남음` : ''}</span>}{exam.target && <span>목표 {exam.target}</span>}{pl && <span>합격 {pl}</span>}</div>
      {j?.total != null && (
        <button className="exam-last" onClick={() => openScore(exam.id, last.id)}>
          <span className="small">최근 {last.kind === 'real' ? '시험' : '모의'} <b className="num">{j.total}</b><span className="soft"> / {max}</span></span>
          {j.toTarget != null && <span className="tiny soft">{j.toTarget > 0 ? `목표까지 ${j.toTarget}` : '목표 달성'}</span>}
          {j.pass != null && <span className={'tiny ' + (j.pass ? 'ok-t' : 'bad-t')}>{j.pass ? '합격선 이상' : j.fail.length ? '기준점 미달' : '합격선 아래'}</span>}
        </button>
      )}
      {exam.target && j?.total != null && <Line value={j.total / exam.target} color={exam.color} />}
    </div>
  )
}

/* ── 교재 줄 ── */
export function MaterialRow({ m, exams }) {
  const ex = exams.find((e) => e.id === m.examId), r = (m.current || 0) / (m.total || 1)
  return (
    <div className="row-line mat">
      <button className="t" style={{ textAlign: 'left' }} onClick={() => openMaterial(m.id)}>
        <div className="row" style={{ gap: 8 }}><span className="tt grow ellipsis">{m.title}</span><span className="small num soft">{m.current || 0}/{m.total}{m.unit}</span></div>
        <Line value={r} color={ex?.color} />
        {ex && <div className="meta" style={{ marginTop: 3 }}><ExamTag exam={ex} /></div>}
      </button>
      <button className="btn sm" onClick={() => stepMaterial(m.id, 1)} disabled={(m.current || 0) >= m.total} aria-label="한 단위 끝냄">+1</button>
    </div>
  )
}
export { find }
