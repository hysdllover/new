import { FOCUS, focusLabel } from './StudyWrap.jsx'
import { useState } from 'react'
import { useColl, remove, restore } from '../store/store.js'
import { saveRecord } from '../store/actions.js'
import { Field, Icon, toast, AutoText } from './ui.jsx'
import { TimeInput } from './common.jsx'
import { FilesEditor } from './Attach.jsx'
import { today, tsToMin, fmtDur } from '../engine/date.js'

// 공부 기록 직접 입력·수정 (타이머 기록도 같은 폼으로 수정)
export default function RecordEditor({ rec, date, subjectId, onDone, compact }) {
  const subjects = useColl('subjects')
  const tasks = useColl('tasks').filter((t) => !t.done && !t.archived)
  const init = rec ? {
    subjectId: rec.subjectId, dur: rec.dur, date: rec.date, startMin: rec.start != null ? tsToMin(rec.start) : null,
    note: rec.note || '', taskId: rec.taskId || '', files: rec.files || [], focus: rec.focus || 0,
  } : { subjectId: subjectId || subjects[0]?.id, dur: 30, date: date || today(), startMin: null, note: '', taskId: '', files: [], focus: 0 }
  const [f, setF] = useState(init)
  const [more, setMore] = useState(!!rec)
  const set = (p) => setF({ ...f, ...p })
  const h = Math.floor(f.dur / 60), m = f.dur % 60

  const save = () => {
    if (!f.subjectId) return toast('과목을 선택하세요')
    if (f.dur < 1) return toast('시간을 입력하세요')
    saveRecord({ id: rec?.id, ...f })
    toast(rec ? '기록 수정' : `${fmtDur(f.dur)} 기록했어요`)
    if (!rec) setF({ ...init, subjectId: f.subjectId, date: f.date })
    onDone?.()
  }

  return (
    <div className="form record-form">
      <div className="row wrap" style={{ gap: 6 }}>
        {subjects.map((s) => (
          <button key={s.id} type="button" className={'chip subj' + (f.subjectId === s.id ? ' on' : '')}
            style={f.subjectId === s.id ? { borderColor: s.color, color: s.color, background: s.color + '1a' } : null}
            onClick={() => set({ subjectId: s.id })}><span className="dot" style={{ background: s.color }} />{s.name}</button>
        ))}
      </div>

      <div className="dur-box">
        <button type="button" className="dur-step" onClick={() => set({ dur: Math.max(0, f.dur - 10) })} aria-label="10분 빼기">−</button>
        <div className="dur-val">
          <input inputMode="numeric" className="dur-in" value={h} onChange={(e) => set({ dur: (parseInt(e.target.value) || 0) * 60 + m })} aria-label="시간" /><span>시간</span>
          <input inputMode="numeric" className="dur-in" value={m} onChange={(e) => set({ dur: h * 60 + Math.min(59, parseInt(e.target.value) || 0) })} aria-label="분" /><span>분</span>
        </div>
        <button type="button" className="dur-step" onClick={() => set({ dur: f.dur + 10 })} aria-label="10분 더하기">＋</button>
      </div>
      <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
        {[10, 30, 60, 90].map((x) => <button key={x} type="button" className="chip" onClick={() => set({ dur: f.dur + x })}>+{x < 60 ? x + '분' : x / 60 + '시간'}</button>)}
        <button type="button" className="chip" onClick={() => set({ dur: 0 })}>0</button>
      </div>

      <div className="row">
        <Field label="날짜"><input className="input" type="date" value={f.date} onChange={(e) => e.target.value && set({ date: e.target.value })} /></Field>
        <Field label="시작 시각 (선택)"><TimeInput value={f.startMin} onChange={(v) => set({ startMin: v })} defaultValue={new Date().getHours() * 60} /></Field>
      </div>

      {!compact || more ? (
        <>
          <Field label="공부 내용"><AutoText className="input" value={f.note} onChange={(v) => set({ note: v })} placeholder="예: 수학의 바이블 3단원" style={{ minHeight: 56 }} /></Field>
          <Field label="집중도">
            <div className="row" style={{ gap: 6 }}>
              {FOCUS.map(([v, l]) => <button key={v} type="button" className={'chip' + (focusLabel(f.focus) === l ? ' on' : '')} onClick={() => set({ focus: focusLabel(f.focus) === l ? 0 : v })}>{l}</button>)}
            </div>
          </Field>
          <Field label="연결할 할 일">
            <select className="input" value={f.taskId} onChange={(e) => set({ taskId: e.target.value })}>
              <option value="">없음</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="사진 · 파일"><FilesEditor ids={f.files} onChange={(v) => set({ files: v })} meta={{ subjectId: f.subjectId, date: f.date }} /></Field>
        </>
      ) : <button type="button" className="btn ghost sm" onClick={() => setMore(true)}>내용 · 사진 · 집중도 추가 ▼</button>}

      <div className="row">
        {rec && <button type="button" className="btn danger" onClick={() => { remove('sessions', rec.id); toast('기록 삭제', { label: '되돌리기', fn: () => restore('sessions', rec.id) }); onDone?.() }}><Icon name="trash" size={16} /></button>}
        <button type="button" className="btn primary grow" onClick={save}>{rec ? '저장' : '기록하기'}</button>
      </div>
    </div>
  )
}
