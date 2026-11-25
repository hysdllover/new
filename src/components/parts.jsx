// 여러 화면이 같이 쓰는 줄 · 카드: 할 일 줄 · 빠른 추가 · 시험 요약 · 교재 줄 · 상세 계획
import { useState } from 'react'
import { find, useColl } from '../store/store.js'
import { toggleTask, addTask, stepMaterial, logSession } from '../store/actions.js'
import { Check, Icon, Line } from './ui.jsx'
import { openTask, openExam, openScore, openMaterial, openSession, ExamTag } from './editors.jsx'
import { today, rel, fmtDate, dday, diffDays, dur } from '../lib/date.js'
import { examName, judge, maxTotal, passLine } from '../lib/exams.js'

// 긴 제목 읽기 쉽게: ' · ' 로 나눈 단원은 줄마다, 쪽수(p.~)는 옅게
const PG = /\s*\((p\.[^)]*)\)\s*$/
export function TitleLines({ text }) {
  const parts = String(text || '').split(' · ')
  if (parts.length < 2 && !PG.test(text)) return text
  return <span className="tl">{parts.map((x, i) => { const m = x.match(PG); return <span key={i} className="tl-l">{m ? x.slice(0, m.index) : x}{m && <span className="pg">{m[1]}</span>}</span> })}</span>
}
export function TaskRow({ t, exams, showDate }) {
  const ex = exams.find((e) => e.id === t.examId)
  const late = !t.done && t.due && t.due < today()
  return (
    <div className={'row-line' + (t.done ? ' done' : '')}>
      <Check on={t.done} onClick={() => toggleTask(t.id)} />
      <button className="t" style={{ textAlign: 'left' }} onClick={() => openTask(t.id)}>
        <div className="tt">{t.plan ? <TitleLines text={t.title} /> : t.title}</div>
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
/* ── 일별 상세 계획 (진도표) ── */
// 세부 단계는 번호 목록으로만 (체크 없음)
export const detailTotal = (rows) => rows.reduce((a, r) => a + (r.min || 0), 0)
// 상세 계획 한 줄 → 공부 기록 (계획 시간 · 시험 · 영역을 채워서 한 번에)
const AREAS = ['LC', 'RC', '보카', '토스']
function useRowLog(due) {
  const tasks = useColl('tasks'), sessions = useColl('sessions')
  const T = tasks.filter((t) => t.plan && t.due === due)
  const toeic = T.find((t) => t.area && t.area !== '토스' && !t.examDay)?.examId || null, tos = T.find((t) => t.area === '토스')?.examId || null
  return (r) => {
    const key = due + '/' + r.label, done = sessions.find((s) => s.planKey === key)
    const isTos = r.label === '토스' || !toeic
    const area = AREAS.includes(r.label) ? r.label : isTos ? '토스' : r.label === '모의고사' ? null : '기타'
    const memo = r.label + (r.items[0]?.h ? ' · ' + r.items[0].h : '')
    return { done, log: () => done ? openSession(done.id) : logSession({ date: due, min: r.min, examId: isTos ? tos : toeic, area, memo, planKey: key }, `기록했어요 · ${r.label} ${dur(r.min)}`) }
  }
}
export function PlanDetail({ rows, due }) {
  const rowLog = useRowLog(due), canLog = due <= today()
  return (
    <div className="pdl">{rows.map((r, i) => (
      <div key={i} className={'pdl-r' + (r.label === '알림' ? ' note' : '')}>
        <span className="pdl-l">{r.label}{r.min ? <small className="num">{dur(r.min)}</small> : null}
          {r.min && canLog ? (() => { const L = rowLog(r); return <button className={'pdl-log' + (L.done ? ' on' : '')} onClick={L.log} aria-label={L.done ? `${r.label} 기록 보기` : `${r.label} ${dur(r.min)} 공부 기록`}>{L.done ? `기록함 ${dur(L.done.min)}` : '+ 기록'}</button> })() : null}
        </span>
        <div className="pdl-b">{r.items.map((it, x) => (
          <div key={x} className="pdl-it">
            {it.h && <div className="pdl-h"><TitleLines text={it.h} /></div>}
            <ol className="pdl-ol">{it.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
            {it.tip && <div className="pdl-tip">{it.tip}</div>}
          </div>
        ))}</div>
      </div>
    ))}</div>
  )
}
// 처음이라면 알아두기 (용어)
export function PlanGuide({ items }) {
  return <dl className="pdl-guide">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
}
export { find }
