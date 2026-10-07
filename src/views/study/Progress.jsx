import { useState, useEffect, useRef } from 'react'
import { useColl, put, patch, remove, uid } from '../../store/store.js'
import { setTextbookProgress } from '../../store/actions.js'
import { Card, Icon, Prog, Empty, Field, openSheet, confirmSheet, toast, Check, AddInput } from '../../components/ui.jsx'
import { SubjectSelect, SubjectTag } from '../../components/common.jsx'
import { Burndown, LineChart } from '../../components/charts.jsx'
import { fmtShort, diffDays, today } from '../../engine/date.js'
import Lectures from './Lectures.jsx'

export default function Progress() {
  const textbooks = useColl('textbooks')
  const plans = useColl('plans')
  const subjects = useColl('subjects')
  return (
    <div className="col">
      <ExamRanges />
      <Lectures />
      <div className="row between">
        <h4>교재 진도</h4>
        <button className="btn sm" onClick={() => openSheet((c) => <TbForm close={c} />, { title: '교재 추가' })}><Icon name="plus" size={14} />교재</button>
      </div>
      {!textbooks.length && <Empty hint="교재 전체 쪽수와 지금 쪽을 적어 두면 진도와 끝나는 날을 계산해 줘요" action={{ label: '교재 추가', fn: () => openSheet((c) => <TbForm close={c} />, { title: '교재 추가' }) }}>교재가 없어요</Empty>}
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
              <PdfRow tb={tb} />
              {plan ? <div style={{ marginTop: 8 }}><div className="tiny muted">번다운 · {plan.title}</div><Burndown plan={plan} textbook={tb} /></div>
                : hist.length > 1 && <LineChart height={100} yMax={tb.total} series={[{ points: hist.map((h) => [diffDays(h.date, first) / span, h.value]), color: 'var(--accent)' }]} labels={[[0, fmtShort(first)], [1, '오늘']]} />}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// 시험 범위: D-day 별 단원 체크 → 남은 단원 ÷ 남은 날 = 하루 분량
function ExamRanges() {
  const ddays = useColl('ddays').filter((d) => d.date >= today()).sort((a, b) => a.date.localeCompare(b.date))
  const [open, setOpen] = useState(null)
  return (
    <>
      <div className="row between"><h4>시험 범위</h4>{!ddays.length && <span className="tiny muted">통계 › D-day 에서 시험을 먼저 추가하세요</span>}</div>
      <div className="grid two">
        {ddays.map((d) => {
          const units = d.units || []
          const left = units.filter((u) => !u.done).length
          const days = Math.max(1, diffDays(d.date, today()))
          const per = left ? Math.ceil(left / days) : 0
          const set = (u) => patch('ddays', d.id, { units: u })
          return (
            <Card key={d.id} title={<span className="row">{d.title}<span className="tiny muted">D-{diffDays(d.date, today())}</span></span>}
              action={<span className="small">{units.length - left}/{units.length}</span>}>
              {units.length > 0 && <Prog value={(units.length - left) / units.length} h={6} />}
              <div className="small" style={{ margin: '8px 0' }}>{!units.length ? '단원을 추가하면 하루 분량을 계산해요' : left ? <>하루 <b>{per}단원</b>씩 · 남은 {left}단원 · {days}일</> : '범위를 모두 끝냈어요'}</div>
              <div className="list">
                {(open === d.id ? units : units.filter((u) => !u.done).slice(0, per || 3)).map((u) => (
                  <div key={u.id} className={'item' + (u.done ? ' done' : '')} style={{ padding: '4px 0', alignItems: 'center' }}>
                    <Check on={u.done} onClick={() => set(units.map((x) => (x.id === u.id ? { ...x, done: !x.done } : x)))} />
                    <span className="title grow">{u.name}</span>
                    {open === d.id && <button className="icon-btn" aria-label="삭제" onClick={() => set(units.filter((x) => x.id !== u.id))}><Icon name="close" size={12} /></button>}
                  </div>
                ))}
              </div>
              {open === d.id && <AddInput placeholder="단원 추가 (쉼표로 여러 개)" onAdd={(text) => set([...units, ...text.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean).map((name) => ({ id: uid(), name, done: false }))])} />}
              <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => setOpen(open === d.id ? null : d.id)}>{open === d.id ? '닫기' : units.length ? '전체 보기 · 편집' : '단원 추가'}</button>
            </Card>
          )
        })}
      </div>
    </>
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

// 교재 PDF: 넣기·읽기 (PDF 는 이 기기에만, 진도는 동기화)
function PdfRow({ tb }) {
  const [has, setHas] = useState(null)
  const ref = useRef(null)
  useEffect(() => { import('./PdfReader.jsx').then((m) => m.hasPdf(tb.id)).then(setHas) }, [tb.id])
  const open = () => import('./PdfReader.jsx').then((m) => openSheet(() => <m.default id={tb.id} />, { title: tb.title, full: true }))
  const add = async (f) => { if (!f) return; try { const m = await import('./PdfReader.jsx'); await m.savePdf(tb.id, f); setHas(true); toast('PDF 를 넣었어요 · 읽으면 진도가 기록돼요'); open() } catch (e) { toast(e.message) } }
  return (
    <div className="row" style={{ marginTop: 6, gap: 6 }}>
      <input ref={ref} type="file" accept="application/pdf" hidden onChange={(e) => add(e.target.files?.[0])} />
      {has ? <>
        <button className="btn sm" onClick={open}><Icon name="book" size={14} />PDF 읽기{tb.pdf?.page ? ` · ${tb.pdf.page}쪽부터` : ''}</button>
        <button className="btn sm ghost" onClick={() => confirmSheet('PDF 빼기', '이 기기에서 PDF 를 지울까요? 진도 기록은 그대로예요.', async () => { (await import('./PdfReader.jsx')).removePdf(tb.id); setHas(false) }, '빼기')}>빼기</button>
      </> : has === false && <button className="btn sm ghost" onClick={() => ref.current?.click()}><Icon name="book" size={14} />{tb.pdf ? '이 기기에 PDF 넣기' : 'PDF 넣기'}</button>}
    </div>
  )
}
