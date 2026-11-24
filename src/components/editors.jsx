// 편집 시트: 할 일 · 공부 기록 · 시험 · 점수 · 교재
import { useState } from 'react'
import { put, patch, find, useColl, remove, settings, list } from '../store/store.js'
import { addTask, deleteTask, deleteExam, upcoming, logSession, lastPick } from '../store/actions.js'
import { openSheet, toast } from './toast.js'
import { Field, Seg, Icon, confirmSheet } from './ui.jsx'
import { today, addDays, fmtDate, dday, dur } from '../lib/date.js'
import { JLPT_LEVELS, sectionsOf, areasOf, examName, clampPart, judge, jlptDates, passLine, maxTotal } from '../lib/exams.js'
import { PALETTE } from '../store/schema.js'

// 시험 · 영역 고르기 (기록 · 할 일 공용)
export function ExamAreaPick({ examId, area, onChange }) {
  const exams = upcoming(useColl('exams'))
  const ex = exams.find((e) => e.id === examId)
  return (
    <>
      <Field label="시험">
        <div className="chips">
          <button type="button" className={'chip' + (!examId ? ' on' : '')} onClick={() => onChange(null, null)}>없음</button>
          {exams.map((e) => <button type="button" key={e.id} className={'chip' + (examId === e.id ? ' on' : '')} onClick={() => onChange(e.id, null)}><i className="sw" style={{ background: e.color || 'var(--soft)' }} />{examName(e)}</button>)}
        </div>
      </Field>
      {ex && <Field label="영역"><div className="chips">{areasOf(ex).map((a) => <button type="button" key={a} className={'chip' + (area === a ? ' on' : '')} onClick={() => onChange(examId, area === a ? null : a)}>{a}</button>)}</div></Field>}
    </>
  )
}

/* ── 할 일 ── */
export const openTask = (id, preset = {}) => openSheet((close) => <TaskForm id={id} preset={preset} close={close} />, { title: id ? '할 일' : '할 일 추가' })
function TaskForm({ id, preset, close }) {
  const t0 = id ? find('tasks', id) : null
  const [v, setV] = useState(() => ({ title: '', due: today(), examId: null, area: null, memo: '', ...preset, ...t0 }))
  const save = () => {
    const title = (v.title || '').trim(); if (!title) return toast('할 일을 적어 주세요')
    const rec = { title, due: v.due || null, examId: v.examId || null, area: v.area || null, memo: v.memo || '' }
    if (id) patch('tasks', id, rec); else addTask(rec)
    close()
  }
  return (
    <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save() }}>
      <input className="input" autoFocus={!id} placeholder="예: N2 문법 30과 · RC Part 5" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      <Field label="날짜">
        <div className="row wrap">
          <Seg small value={v.due === today() ? 't' : v.due === addDays(today(), 1) ? 'm' : v.due ? 'd' : 'n'} onChange={(k) => setV({ ...v, due: k === 't' ? today() : k === 'm' ? addDays(today(), 1) : k === 'n' ? null : v.due || today() })} options={[['t', '오늘'], ['m', '내일'], ['d', '날짜'], ['n', '없음']]} />
          {v.due && <input className="input" style={{ width: 'auto' }} type="date" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value || null })} />}
        </div>
      </Field>
      <ExamAreaPick examId={v.examId} area={v.area} onChange={(examId, area) => setV({ ...v, examId, area })} />
      <Field label="메모"><textarea className="input" value={v.memo || ''} onChange={(e) => setV({ ...v, memo: e.target.value })} /></Field>
      <div className="row end">
        {id && <button type="button" className="btn danger" onClick={() => { close(); deleteTask(id) }}><Icon name="trash" size={15} />지우기</button>}
        <span className="grow" />
        <button className="btn primary">{id ? '저장' : '추가'}</button>
      </div>
    </form>
  )
}

/* ── 공부 기록 ── */
export const openSession = (id, preset = {}) => openSheet((close) => <SessionForm id={id} preset={preset} close={close} />, { title: id ? '공부 기록' : '공부 기록 추가' })
// 새 기록 기본값: 마지막으로 고른 시험 · 영역 (없으면 가장 가까운 시험)
const pickDefault = () => { const lp = lastPick(), ups = upcoming(list('exams')); return lp && (!lp.examId || ups.some((e) => e.id === lp.examId)) ? lp : { examId: ups[0]?.id || null, area: null } }
export function SessionForm({ id, preset, close, inline }) {
  const s0 = id ? find('sessions', id) : null
  const fresh = () => ({ date: today(), min: 30, memo: '', ...(id ? {} : pickDefault()), ...preset, ...s0 })
  const [v, setV] = useState(fresh)
  const add = (d) => setV((x) => ({ ...x, min: Math.max(0, Math.round(+x.min || 0) + d) }))
  const save = () => {
    const min = Math.round(+v.min); if (!(min > 0)) return toast('공부한 시간을 적어 주세요')
    const rec = { date: v.date || today(), min, examId: v.examId || null, area: v.area || null, memo: v.memo || '' }
    if (id) patch('sessions', id, rec); else logSession(rec)
    if (inline) setV({ ...fresh(), ...pickDefault(), min: 30 }); else close()
  }
  return (
    <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save() }}>
      <div className="fields">
        <Field label="날짜"><input className="input" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
        <Field label={`시간 · ${dur(+v.min || 0)}`}><input className="input num" type="number" inputMode="numeric" min="1" step="1" value={v.min} onChange={(e) => setV({ ...v, min: e.target.value })} aria-label="분" /></Field>
      </div>
      <div className="chips time-add">
        <button type="button" className="chip" onClick={() => add(-10)}>−10분</button>
        {[10, 30, 60].map((m) => <button type="button" key={m} className="chip" onClick={() => add(m)}>+{dur(m)}</button>)}
        <button type="button" className="chip" onClick={() => setV({ ...v, min: 0 })}>0</button>
      </div>
      <ExamAreaPick examId={v.examId} area={v.area} onChange={(examId, area) => setV({ ...v, examId, area })} />
      <Field label="메모"><input className="input" value={v.memo || ''} onChange={(e) => setV({ ...v, memo: e.target.value })} placeholder="한 일 (선택)" /></Field>
      <div className="row end">
        {id && <button type="button" className="btn danger" onClick={() => confirmSheet('기록 지우기', '이 공부 기록을 지울까요?', () => { remove('sessions', id); close() }, '지우기')}><Icon name="trash" size={15} />지우기</button>}
        <span className="grow" />
        <button className="btn primary">{id ? '저장' : '기록'}</button>
      </div>
    </form>
  )
}

/* ── 시험 ── */
export const openExam = (id) => openSheet((close) => <ExamForm id={id} close={close} />, { title: id ? '시험' : '시험 추가' })
function ExamForm({ id, close }) {
  const e0 = id ? find('exams', id) : null
  const [v, setV] = useState(() => ({ kind: 'jlpt', level: 'N2', date: '', target: '', name: '', pass: '', color: PALETTE[0], sections: [{ id: 's0', name: '영역 1', max: 100 }], areas: null, ...e0 }))
  const [areaTxt, setAreaTxt] = useState(() => (e0?.areas || []).join(', '))
  const sug = v.kind === 'jlpt' ? jlptDates(today()) : []
  const save = () => {
    if (v.kind === 'custom' && !(v.name || '').trim()) return toast('시험 이름을 적어 주세요')
    const areas = areaTxt.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)
    const rec = { kind: v.kind, level: v.kind === 'jlpt' ? v.level : null, name: (v.name || '').trim(), date: v.date || null, target: v.target === '' ? null : +v.target, pass: v.kind === 'custom' && v.pass !== '' ? +v.pass : null, color: v.color, sections: v.kind === 'custom' ? v.sections.filter((s) => s.name) : null, areas: areas.length ? areas : null, done: !!v.done }
    if (id) patch('exams', id, rec); else put('exams', rec)
    close()
  }
  const max = maxTotal(v)
  return (
    <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save() }}>
      <Seg value={v.kind} onChange={(kind) => setV({ ...v, kind })} options={[['jlpt', 'JLPT'], ['toeic', '토익'], ['custom', '직접 만들기']]} />
      {v.kind === 'jlpt' && <Field label="급수"><Seg value={v.level} onChange={(level) => setV({ ...v, level })} options={JLPT_LEVELS.map((l) => [l, l])} /></Field>}
      <Field label={v.kind === 'custom' ? '시험 이름' : '메모 이름 (선택 · 예: 12월 정기)'}><input className="input" value={v.name || ''} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={v.kind === 'custom' ? '예: JPT · 토플 · HSK' : ''} /></Field>
      <Field label="시험일">
        <input className="input" type="date" value={v.date || ''} onChange={(e) => setV({ ...v, date: e.target.value })} />
        {sug.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{sug.map((d) => <button type="button" key={d} className={'chip' + (v.date === d ? ' on' : '')} onClick={() => setV({ ...v, date: d })}>{fmtDate(d)} 정기</button>)}</div>}
      </Field>
      <div className="fields">
        <Field label={`목표 점수 (${max}점 만점)`}><input className="input num" type="number" inputMode="numeric" value={v.target ?? ''} onChange={(e) => setV({ ...v, target: e.target.value })} /></Field>
        {v.kind === 'custom' && <Field label="합격 점수 (선택)"><input className="input num" type="number" inputMode="numeric" value={v.pass ?? ''} onChange={(e) => setV({ ...v, pass: e.target.value })} /></Field>}
      </div>
      {v.kind === 'jlpt' && <div className="tiny soft">합격: 총점 {passLine(v)}점 이상 · 영역마다 기준점 이상 ({sectionsOf(v).map((s) => `${s.name} ${s.min}`).join(' · ')})</div>}
      {v.kind === 'custom' && (
        <Field label="점수 영역">
          <div className="col" style={{ gap: 6 }}>
            {v.sections.map((s, i) => (
              <div key={s.id} className="row">
                <input className="input grow" value={s.name} onChange={(e) => setV({ ...v, sections: v.sections.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className="input num" style={{ width: 84 }} type="number" value={s.max} onChange={(e) => setV({ ...v, sections: v.sections.map((x, j) => (j === i ? { ...x, max: +e.target.value || 0 } : x)) })} aria-label="만점" />
                <button type="button" className="icon-btn" onClick={() => setV({ ...v, sections: v.sections.filter((_, j) => j !== i) })} aria-label="빼기"><Icon name="close" size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn sm" onClick={() => setV({ ...v, sections: [...v.sections, { id: 's' + Date.now(), name: '영역 ' + (v.sections.length + 1), max: 100 }] })}><Icon name="plus" size={14} />영역 추가</button>
          </div>
        </Field>
      )}
      <Field label="공부 영역 (쉼표로 구분 · 비우면 기본)"><input className="input" value={areaTxt} onChange={(e) => setAreaTxt(e.target.value)} placeholder={areasOf({ kind: v.kind }).join(', ')} /></Field>
      <Field label="색"><div className="chips">{PALETTE.map((c) => <button type="button" key={c} className={'chip sw-pick' + (v.color === c ? ' on' : '')} onClick={() => setV({ ...v, color: c })} aria-label={c}><i className="sw" style={{ background: c }} /></button>)}</div></Field>
      {id && <label className="row small"><input type="checkbox" checked={!!v.done} onChange={(e) => setV({ ...v, done: e.target.checked })} />끝난 시험으로 (목록 아래로)</label>}
      <div className="row end">
        {id && <button type="button" className="btn danger" onClick={() => confirmSheet('시험 지우기', '이 시험과 점수 기록을 지울까요?', () => { close(); deleteExam(id) }, '지우기')}><Icon name="trash" size={15} />지우기</button>}
        <span className="grow" />
        <button className="btn primary">{id ? '저장' : '추가'}</button>
      </div>
    </form>
  )
}

/* ── 점수 ── */
export const openScore = (examId, id) => openSheet((close) => <ScoreForm examId={examId} id={id} close={close} />, { title: id ? '점수' : '점수 기록' })
function ScoreForm({ examId, id, close }) {
  const ex = find('exams', examId), s0 = id ? find('scores', id) : null
  const [v, setV] = useState(() => ({ date: today(), kind: 'mock', parts: {}, memo: '', ...s0 }))
  if (!ex) return null
  const S = sectionsOf(ex), j = judge(ex, v)
  const save = () => {
    if (j.total == null) return toast('점수를 하나 이상 적어 주세요')
    const parts = Object.fromEntries(S.map((s) => [s.id, clampPart(ex, s.id, v.parts[s.id])]))
    const rec = { examId, date: v.date || today(), kind: v.kind, parts, memo: v.memo || '' }
    if (id) patch('scores', id, rec); else put('scores', rec)
    close()
  }
  return (
    <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save() }}>
      <div className="row wrap"><Seg value={v.kind} onChange={(kind) => setV({ ...v, kind })} options={[['mock', '모의고사'], ['real', '실제 시험']]} /><span className="grow" /><input className="input" style={{ width: 'auto' }} type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
      <div className="fields">
        {S.map((s) => (
          <Field key={s.id} label={`${s.name} / ${s.max}`}>
            <input className="input num" type="number" inputMode="numeric" min={s.low ?? 0} max={s.max} step="1" value={v.parts[s.id] ?? ''} onChange={(e) => setV({ ...v, parts: { ...v.parts, [s.id]: e.target.value } })} />
          </Field>
        ))}
      </div>
      <div className="row small">
        <span>합계 <b className="num">{j.total ?? '—'}</b> / {j.max}</span>
        {j.pass != null && <span className={j.pass ? 'ok-t' : 'bad-t'}>{j.pass ? '합격선 이상' : '합격선 아래'}</span>}
        {j.fail.length > 0 && <span className="bad-t">기준점 미달 · {j.fail.join(', ')}</span>}
        {j.toTarget != null && <span className="soft">{j.toTarget > 0 ? `목표까지 ${j.toTarget}점` : '목표 달성'}</span>}
      </div>
      <Field label="메모"><input className="input" value={v.memo || ''} onChange={(e) => setV({ ...v, memo: e.target.value })} placeholder="예: 청해 문제 3 약함" /></Field>
      <div className="row end">
        {id && <button type="button" className="btn danger" onClick={() => confirmSheet('점수 지우기', '이 점수 기록을 지울까요?', () => { remove('scores', id); close() }, '지우기')}><Icon name="trash" size={15} />지우기</button>}
        <span className="grow" />
        <button className="btn primary">{id ? '저장' : '기록'}</button>
      </div>
    </form>
  )
}

/* ── 교재 · 강의 ── */
export const openMaterial = (id) => openSheet((close) => <MaterialForm id={id} close={close} />, { title: id ? '교재 · 강의' : '교재 · 강의 추가' })
function MaterialForm({ id, close }) {
  const m0 = id ? find('materials', id) : null
  const [v, setV] = useState(() => ({ title: '', examId: null, unit: '과', total: 20, current: 0, ...m0 }))
  const save = () => {
    const title = (v.title || '').trim(); if (!title) return toast('이름을 적어 주세요')
    const total = Math.max(1, Math.round(+v.total || 1)), rec = { title, examId: v.examId || null, unit: (v.unit || '').trim() || '과', total, current: Math.max(0, Math.min(total, Math.round(+v.current || 0))) }
    if (id) patch('materials', id, rec); else put('materials', rec)
    close()
  }
  return (
    <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save() }}>
      <input className="input" autoFocus={!id} placeholder="예: 新完全マスター 文法 N2 · 해커스 토익 RC" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      <div className="fields">
        <Field label="단위"><input className="input" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} placeholder="과 · 강 · 회 · 쪽" /></Field>
        <Field label="전체"><input className="input num" type="number" inputMode="numeric" value={v.total} onChange={(e) => setV({ ...v, total: e.target.value })} /></Field>
        <Field label="지금까지"><input className="input num" type="number" inputMode="numeric" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} /></Field>
      </div>
      <ExamAreaPick examId={v.examId} area={null} onChange={(examId) => setV({ ...v, examId })} />
      <div className="row end">
        {id && <button type="button" className="btn danger" onClick={() => confirmSheet('지우기', '이 교재 · 강의를 지울까요?', () => { remove('materials', id); close() }, '지우기')}><Icon name="trash" size={15} />지우기</button>}
        <span className="grow" />
        <button className="btn primary">{id ? '저장' : '추가'}</button>
      </div>
    </form>
  )
}

export const ExamTag = ({ exam, area }) => exam ? <span className="tag"><i style={{ background: exam.color || 'var(--soft)' }} />{examName(exam)}{area ? ' · ' + area : ''}</span> : area ? <span className="tag">{area}</span> : null
export const ddayOf = (e) => (e?.date ? dday(e.date) : '날짜 미정')
export { settings }
