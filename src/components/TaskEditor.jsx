import { useState } from 'react'
import { useRec, useColl, patch, uid, list } from '../store/store.js'
import { updateTask, toggleTask, deleteTask, scheduleTask, splitTask, addReview, taskSpent, dayRec, setDay } from '../store/actions.js'
import { Icon, Check, Field, AutoText, closeDetail, openSheet, toast, Prog } from './ui.jsx'
import { PRI, SubjectSelect, ProjectSelect, RepeatEditor, TimeInput } from './common.jsx'
import { LinksEditor, FilesEditor } from './Attach.jsx'
import { fmtDur, today, fmtShort } from '../engine/date.js'
import { startStopwatch } from '../lib/timer.js'
import { go } from '../nav.js'

export default function TaskEditor({ id }) {
  const t = useRec('tasks', id)
  const logs = useColl('logs')
  const sessions = useColl('sessions')
  const [showLog, setShowLog] = useState(false)
  if (!t) return <div className="pane-b empty">삭제된 할 일입니다.</div>
  const up = (p) => updateTask(id, p)
  const subs = t.subtasks || []
  const setSubs = (s) => patch('tasks', id, { subtasks: s })
  const spent = taskSpent(id, sessions)
  const myLogs = logs.filter((l) => l.taskId === id).sort((a, b) => b.at - a.at)
  const others = list('tasks').filter((x) => x.id !== id && !x.done)
  const top3 = dayRec(today()).top3 || []

  return (
    <>
      <div className="pane-h">
        <Check on={t.done} onClick={() => toggleTask(id)} />
        <h2 className="ellipsis">{t.title || '할 일'}</h2>
        <button className="icon-btn" onClick={() => { deleteTask(id); closeDetail() }} aria-label="삭제"><Icon name="trash" /></button>
        <button className="icon-btn" onClick={closeDetail} aria-label="닫기"><Icon name="close" /></button>
      </div>
      <div className="pane-b form">
        <AutoText className="input title-input" value={t.title} onChange={(v) => patch('tasks', id, { title: v })} placeholder="할 일 제목" />

        <div className="row wrap" style={{ gap: 6 }}>
          <button className="chip" onClick={() => { scheduleTask(id); toast('오늘 빈 시간에 배정했어요') }}><Icon name="clock" size={14} />오늘 배정</button>
          <button className="chip" onClick={() => openSheet((c) => <SplitForm id={id} close={c} />, { title: '세션 분할' })}><Icon name="split" size={14} />세션 분할</button>
          <button className="chip" onClick={() => { startStopwatch(t.subjectId, id); go('study', 'timer') }}><Icon name="play" size={14} />타이머</button>
          <button className={'chip' + (top3.includes(id) ? ' on' : '')} onClick={() => setDay(today(), { top3: top3.includes(id) ? top3.filter((x) => x !== id) : [...top3, id].slice(-3) })}><Icon name="star" size={14} />Top 3</button>
          <button className="chip" onClick={() => addReview({ title: t.title, subjectId: t.subjectId, sourceType: 'task', sourceId: id })}><Icon name="brain" size={14} />복습 등록</button>
        </div>

        <div className="row">
          <Field label="마감일"><input className="input" type="date" value={t.due || ''} onChange={(e) => up({ due: e.target.value || null })} /></Field>
          <Field label="시각"><TimeInput value={t.dueTime} onChange={(v) => up({ dueTime: v })} /></Field>
        </div>
        <div className="row">
          <Field label="우선순위">
            <select className="input" value={t.priority || 0} onChange={(e) => up({ priority: +e.target.value })}>{PRI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="상태">
            <select className="input" value={t.status || 'todo'} onChange={(e) => { const s = e.target.value; if ((s === 'done') !== !!t.done) toggleTask(id); up({ status: s }) }}>
              <option value="todo">할 일</option><option value="doing">진행 중</option><option value="done">완료</option>
            </select>
          </Field>
        </div>
        <div className="row">
          <Field label="과목"><SubjectSelect value={t.subjectId} onChange={(v) => up({ subjectId: v })} /></Field>
          <Field label="프로젝트"><ProjectSelect value={t.projectId} onChange={(v) => up({ projectId: v })} /></Field>
        </div>
        <div className="row">
          <Field label="예상 소요(분)"><input className="input" type="number" min="5" step="5" value={t.estimate || ''} onChange={(e) => up({ estimate: +e.target.value || null })} /></Field>
          <Field label="알림(분 전)"><input className="input" type="number" min="0" step="5" value={t.remind ?? ''} placeholder="없음" onChange={(e) => up({ remind: e.target.value === '' ? null : +e.target.value })} /></Field>
        </div>

        <Field label={`하위 할 일 ${subs.length ? `${subs.filter((s) => s.done).length}/${subs.length}` : ''}`}>
          {subs.length > 0 && <Prog value={subs.filter((s) => s.done).length / subs.length} />}
          <div className="list">
            {subs.map((s, i) => (
              <div key={s.id} className="row" style={{ minHeight: 38 }}>
                <Check on={s.done} round onClick={() => setSubs(subs.map((x) => x.id === s.id ? { ...x, done: !x.done } : x))} />
                <input className="input bare grow" value={s.title} onChange={(e) => setSubs(subs.map((x) => x.id === s.id ? { ...x, title: e.target.value } : x))} />
                {i > 0 && <button className="icon-btn" onClick={() => { const a = [...subs];[a[i - 1], a[i]] = [a[i], a[i - 1]]; setSubs(a) }} aria-label="위로">↑</button>}
                <button className="icon-btn" onClick={() => setSubs(subs.filter((x) => x.id !== s.id))} aria-label="삭제"><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); const v = e.target.s.value.trim(); if (v) { setSubs([...subs, { id: uid(), title: v, done: false }]); e.target.reset() } }}>
            <input name="s" className="input" placeholder="+ 하위 할 일 추가" />
          </form>
        </Field>

        <Field label="메모"><AutoText className="input" value={t.note || ''} onChange={(v) => patch('tasks', id, { note: v })} placeholder="메모" style={{ minHeight: 60 }} /></Field>
        <Field label="링크"><LinksEditor links={t.links} onChange={(v) => up({ links: v })} /></Field>
        <Field label="첨부 (사진·PDF·HTML)"><FilesEditor ids={t.files} onChange={(v) => up({ files: v })} meta={{ subjectId: t.subjectId, taskId: id }} /></Field>
        <Field label="반복"><RepeatEditor rule={t.repeat} start={t.due} onChange={(r) => up({ repeat: r })} /></Field>

        <Field label="간트 · 선행 작업">
          <div className="row">
            <span className="small muted nowrap">시작일</span>
            <input className="input" type="date" value={t.start || ''} onChange={(e) => up({ start: e.target.value || null })} />
          </div>
          <div className="row wrap" style={{ gap: 4 }}>
            {(t.dependsOn || []).map((d) => { const x = list('tasks').find((y) => y.id === d); return x && <button key={d} className="chip" onClick={() => up({ dependsOn: t.dependsOn.filter((y) => y !== d) })}>← {x.title} ✕</button> })}
          </div>
          <select className="input" value="" onChange={(e) => e.target.value && up({ dependsOn: [...(t.dependsOn || []), e.target.value] })}>
            <option value="">+ 먼저 끝나야 하는 작업 추가</option>
            {others.filter((x) => !(t.dependsOn || []).includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </Field>

        <div className="small muted">공부 시간 {fmtDur(spent)}{t.carry ? ` · 이월 ${t.carry}회` : ''}</div>
        <button className="btn ghost sm" onClick={() => setShowLog(!showLog)}>활동 로그 {myLogs.length}개 {showLog ? '▲' : '▼'}</button>
        {showLog && (
          <div className="list small">
            {myLogs.map((l) => (
              <div key={l.id} className="row" style={{ padding: '4px 0' }}>
                <span className="muted nowrap tiny">{fmtShort(new Date(l.at).toISOString().slice(0, 10))} {new Date(l.at).toTimeString().slice(0, 5)}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn sm" onClick={() => { up({ archived: !t.archived }); toast(t.archived ? '보관 해제' : '보관함으로 이동') }}><Icon name="archive" size={14} />{t.archived ? '보관 해제' : '보관'}</button>
      </div>
    </>
  )
}

function SplitForm({ id, close }) {
  const [n, setN] = useState(3)
  const [dur, setDur] = useState(50)
  const [from, setFrom] = useState(today())
  return (
    <div className="form">
      <div className="row">
        <Field label="세션 수"><input className="input" type="number" min="1" max="20" value={n} onChange={(e) => setN(+e.target.value)} /></Field>
        <Field label="세션 길이(분)"><input className="input" type="number" min="10" step="5" value={dur} onChange={(e) => setDur(+e.target.value)} /></Field>
      </div>
      <Field label="시작일"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
      <div className="small muted">각 날짜의 빈 시간에 하루 1개씩 배치합니다.</div>
      <button className="btn primary" onClick={() => { const s = splitTask(id, n, dur, from); toast(`${s.length}개 세션 배치 완료`); close() }}>배치</button>
    </div>
  )
}
