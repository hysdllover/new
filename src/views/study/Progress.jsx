import { useState } from 'react'
import { useColl, put, patch, remove } from '../../store/store.js'
import { setTextbookProgress } from '../../store/actions.js'
import { Card, Icon, Prog, Empty, Field, openSheet, confirmSheet, toast } from '../../components/ui.jsx'
import { SubjectSelect, SubjectTag } from '../../components/common.jsx'
import { Burndown, LineChart } from '../../components/charts.jsx'
import { fmtShort, diffDays, today } from '../../engine/date.js'

export default function Progress() {
  const textbooks = useColl('textbooks')
  const plans = useColl('plans')
  const subjects = useColl('subjects')
  return (
    <div className="col">
      <div className="row between">
        <h4>교재 진도</h4>
        <button className="btn sm" onClick={() => openSheet((c) => <TbForm close={c} />, { title: '교재 추가' })}><Icon name="plus" size={14} />교재</button>
      </div>
      {!textbooks.length && <Empty>교재를 추가하고 진도를 기록해 보세요</Empty>}
      <div className="grid two">
        {textbooks.map((tb) => {
          const ratio = (tb.current || 0) / (tb.total || 1)
          const plan = plans.find((p) => p.textbookId === tb.id)
          const hist = [...(tb.history || [])].sort((a, b) => a.date.localeCompare(b.date))
          const first = hist[0]?.date
          const span = first ? Math.max(1, diffDays(today(), first)) : 1
          return (
            <Card key={tb.id} title={<span className="row">{tb.title}<SubjectTag id={tb.subjectId} subjects={subjects} /></span>} action={
              <div className="row" style={{ gap: 2 }}>
                <button className="icon-btn" onClick={() => openSheet((c) => <TbForm close={c} tb={tb} />, { title: '교재 수정' })} aria-label="수정"><Icon name="edit" size={16} /></button>
                <button className="icon-btn" onClick={() => confirmSheet('교재 삭제', `'${tb.title}'을 삭제할까요?`, () => remove('textbooks', tb.id), '삭제')} aria-label="삭제"><Icon name="trash" size={16} /></button>
              </div>
            }>
              <div className="row between small"><span>{tb.current || 0} / {tb.total}{tb.unit}</span><b>{Math.round(ratio * 100)}%</b></div>
              <Prog value={ratio} h={7} />
              <ProgressInput tb={tb} />
              {plan ? <div style={{ marginTop: 8 }}><div className="tiny muted">번다운 · {plan.title}</div><Burndown plan={plan} textbook={tb} /></div>
                : hist.length > 1 && <LineChart height={100} yMax={tb.total} series={[{ points: hist.map((h) => [diffDays(h.date, first) / span, h.value]), color: 'var(--accent)' }]} labels={[[0, fmtShort(first)], [1, '오늘']]} />}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ProgressInput({ tb }) {
  const [v, setV] = useState('')
  const commit = (n) => { if (isNaN(n)) return; setTextbookProgress(tb.id, Math.max(0, Math.min(tb.total, n))); setV(''); toast('진도 저장 · 계획 재조정') }
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <input className="input" type="number" inputMode="numeric" placeholder={`현재 ${tb.unit || 'p'}`} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && v && commit(+v)} />
      <button className="btn" onClick={() => v && commit(+v)}>저장</button>
      <button className="btn" onClick={() => commit((tb.current || 0) + 10)}>+10</button>
    </div>
  )
}

function TbForm({ close, tb }) {
  const [f, setF] = useState(tb || { title: '', subjectId: null, unit: 'p', total: 200, current: 0 })
  return (
    <div className="form">
      <Field label="교재 이름"><input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <SubjectSelect value={f.subjectId} onChange={(v) => setF({ ...f, subjectId: v })} />
      <div className="row">
        <Field label="전체 분량"><input className="input" type="number" value={f.total} onChange={(e) => setF({ ...f, total: +e.target.value })} /></Field>
        <Field label="단위"><select className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}><option value="p">쪽(p)</option><option value="강">강</option><option value="단원">단원</option><option value="문제">문제</option></select></Field>
      </div>
      <button className="btn primary" onClick={() => { if (!f.title) return; tb ? patch('textbooks', tb.id, f) : put('textbooks', { ...f, history: [] }); close() }}>저장</button>
    </div>
  )
}
