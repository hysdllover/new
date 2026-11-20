// 시험: 시험마다 D-day · 목표 · 점수 추이 · 영역별 점수 표 (JLPT 합격 판정 · 토익 합계)
import { useState } from 'react'
import { useColl } from '../store/store.js'
import { upcoming } from '../store/actions.js'
import { Card, Empty, Icon } from '../components/ui.jsx'
import { ExamSummary } from '../components/parts.jsx'
import { openExam, openScore } from '../components/editors.jsx'
import { ScoreChart } from '../components/charts.jsx'
import { today, fmtShort } from '../lib/date.js'
import { sectionsOf, judge, passLine, maxTotal } from '../lib/exams.js'

export default function Exams() {
  const exams = useColl('exams'), scores = useColl('scores')
  const [old, setOld] = useState(false)
  const ups = upcoming(exams), past = exams.filter((e) => !ups.includes(e)).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <>
      <header className="page-h"><h1>시험</h1><span className="grow" /><button className="btn sm" onClick={() => openExam()}><Icon name="plus" size={14} />시험 추가</button></header>
      <div className="grid two">
        {ups.map((e) => <ExamCard key={e.id} exam={e} scores={scores} />)}
        {!ups.length && <Card><Empty>JLPT · 토익 · 직접 만든 시험을 추가하면 D-day와 점수 추이를 볼 수 있어요<br /><button className="btn sm" style={{ marginTop: 8 }} onClick={() => openExam()}><Icon name="plus" size={14} />시험 추가</button></Empty></Card>}
      </div>
      {past.length > 0 && <div style={{ marginTop: 16 }}>
        <button className="btn sm" onClick={() => setOld(!old)}>{old ? '지난 시험 접기' : `지난 · 끝낸 시험 ${past.length}`}</button>
        {old && <div className="grid two" style={{ marginTop: 12 }}>{past.map((e) => <ExamCard key={e.id} exam={e} scores={scores} />)}</div>}
      </div>}
    </>
  )
}

function ExamCard({ exam, scores }) {
  const S = sectionsOf(exam), L = scores.filter((s) => s.examId === exam.id).sort((a, b) => a.date.localeCompare(b.date))
  const pts = L.map((s) => ({ date: s.date, total: judge(exam, s).total, real: s.kind === 'real' })).filter((p) => p.total != null)
  return (
    <Card title={exam.date && exam.date < today() ? '지난 시험' : '시험'} action={<button className="lnk" onClick={() => openScore(exam.id)}>+ 점수</button>}>
      <ExamSummary exam={exam} scores={scores} big />
      {pts.length > 0 && <div style={{ margin: '10px 0 4px' }}><ScoreChart points={pts.slice(-8)} target={exam.target} pass={passLine(exam)} max={maxTotal(exam)} color={exam.color} /></div>}
      {L.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl num">
            <thead><tr><th>날짜</th>{S.map((s) => <th key={s.id}>{s.name}</th>)}<th>합계</th></tr></thead>
            <tbody>{[...L].reverse().map((s) => { const j = judge(exam, s); return (
              <tr key={s.id} onClick={() => openScore(exam.id, s.id)}>
                <td>{fmtShort(s.date)}<span className="soft">{s.kind === 'real' ? ' 시험' : ' 모의'}</span></td>
                {S.map((x) => { const v = s.parts?.[x.id]; return <td key={x.id} className={x.min != null && v !== '' && v != null && +v < x.min ? 'bad-t' : ''}>{v === '' || v == null ? '—' : v}</td> })}
                <td><b>{j.total ?? '—'}</b>{j.pass != null && <span className={'tiny ' + (j.pass ? 'ok-t' : 'bad-t')}> {j.pass ? '합격' : '불합격'}</span>}</td>
              </tr>
            ) })}</tbody>
          </table>
        </div>
      )}
      {!L.length && <Empty>모의고사 점수를 기록하면 추이가 선으로 나와요</Empty>}
      {exam.kind === 'jlpt' && <div className="tiny soft" style={{ marginTop: 6 }}>합격: 총점 {passLine(exam)} 이상 · 기준점 {S.map((x) => `${x.name} ${x.min}`).join(' · ')}</div>}
    </Card>
  )
}
