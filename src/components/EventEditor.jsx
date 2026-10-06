import { useRec, patch, remove, restore, put, list } from '../store/store.js'
import { Icon, Field, AutoText, closeDetail, openDetail, toast, Toggle } from './ui.jsx'
import { RepeatEditor, TimeInput, ColorPick, SubjectSelect, ProjectSelect } from './common.jsx'
import { PALETTE } from '../store/schema.js'
import { openNote } from '../nav.js'
import { fmtDate, addDays } from '../engine/date.js'
import { saveEventTemplate } from '../lib/eventTemplates.js'

export function eventNote(ev, occ) {
  const date = occ || ev.date
  let n = list('notes').find((x) => x.eventId === ev.id && (!ev.repeat || x.date === date))
  if (!n) n = put('notes', { title: `${ev.title} · ${date.slice(5).replace('-', '/')}`, type: 'event', eventId: ev.id, date, blocks: [{ id: 'b0', type: 'text', text: '' }] })
  return n
}

export default function EventEditor({ id, occ }) {
  const e = useRec('events', id)
  if (!e) return <div className="pane-b empty">삭제된 일정입니다.</div>
  const up = (p) => patch('events', id, p)
  const allDay = e.start == null
  const del = () => {
    remove('events', id); closeDetail()
    toast(`'${e.title}' 삭제됨`, { label: '되돌리기', fn: () => restore('events', id) })
  }
  const delOcc = () => { up({ repeat: { ...e.repeat, except: [...(e.repeat.except || []), occ] } }); closeDetail(); toast(`${occ.slice(5)} 일정만 삭제`) }
  // 반복 일정 하루만 바꾸기: 그날을 빼고 따로 떼어 낸 일정을 만듦 · 이 날부터: 원래 반복은 전날까지, 새 반복이 이 날부터
  const copyOf = (extra) => { const { id: _i, createdAt, updatedAt, deviceId, repeat, ...rest } = e; return put('events', { ...rest, ...extra }) }
  const editOcc = () => { const n = copyOf({ date: occ, repeat: null, endDate: null, fromRepeat: id }); up({ repeat: { ...e.repeat, except: [...(e.repeat.except || []), occ] } }); openDetail('event', n.id, { occ }); toast(`${occ.slice(5)} 일정만 따로 바꿀 수 있어요`) }
  const editFrom = () => { const n = copyOf({ date: occ, repeat: { ...e.repeat, except: (e.repeat.except || []).filter((d) => d > occ) } }); up({ repeat: { ...e.repeat, until: addDays(occ, -1) } }); openDetail('event', n.id, { occ }); toast(`${occ.slice(5)}부터 바뀐 내용으로 반복해요`) }
  const delFrom = () => { const old = e.repeat; if (occ <= e.date) return del(); up({ repeat: { ...old, until: addDays(occ, -1) } }); closeDetail(); toast(`${occ.slice(5)}부터 반복 끝`, { label: '되돌리기', fn: () => patch('events', id, { repeat: old }) }) }
  return (
    <>
      <div className="pane-h">
        <span className="dot" style={{ background: e.color || 'var(--accent)', width: 12, height: 12 }} />
        <h2 className="ellipsis">{e.title || '일정'}</h2>
        <button className="icon-btn" onClick={del} aria-label="삭제"><Icon name="trash" /></button>
        <button className="icon-btn" onClick={closeDetail} aria-label="닫기"><Icon name="close" /></button>
      </div>
      <div className="pane-b form">
        <AutoText className="input title-input" value={e.title} onChange={(v) => up({ title: v })} placeholder="일정 제목" />
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn" onClick={() => { const n = eventNote(e, occ); closeDetail(); openNote(n.id) }}><Icon name="notes" size={16} />일정 노트 {occ && e.repeat ? `(${fmtDate(occ, { wd: false })})` : ''}</button>
          <button className="btn" onClick={() => { const name = prompt('템플릿 이름', e.title || ''); if (name) { saveEventTemplate(e, name.trim()); toast('템플릿 저장 · 빠른 추가 › 일정에서 골라 쓰기') } }}><Icon name="layers" size={16} />템플릿으로 저장</button>
        </div>
        {e.repeat && occ && (
          <div className="col" style={{ gap: 6 }}>
            <div className="tiny muted">반복 일정 중 {fmtDate(occ, { wd: true })}</div>
            <div className="row wrap" style={{ gap: 6 }}>
              <button className="btn sm" onClick={editOcc}>이 날만 바꾸기</button>
              {occ > e.date && <button className="btn sm" onClick={editFrom}>이 날부터 바꾸기</button>}
              <button className="btn danger sm" onClick={delOcc}>이 날만 삭제</button>
              {occ > e.date && <button className="btn danger sm" onClick={delFrom}>이 날부터 삭제</button>}
            </div>
          </div>
        )}
        {e.fromRepeat && <div className="tiny muted">반복 일정에서 하루만 떼어 낸 일정이에요.</div>}
        <div className="row">
          <Field label="날짜"><input className="input" type="date" value={e.date} onChange={(ev) => up({ date: ev.target.value })} /></Field>
          <Field label="종료일(여러 날)"><input className="input" type="date" value={e.endDate || ''} min={e.date} onChange={(ev) => up({ endDate: ev.target.value || null })} /></Field>
        </div>
        <Toggle label="하루 종일" checked={allDay} onChange={(v) => up(v ? { start: null, end: null } : { start: 9 * 60, end: 10 * 60 })} />
        {!allDay && (
          <div className="row">
            <Field label="시작"><TimeInput allowEmpty={false} value={e.start} onChange={(v) => up({ start: v, end: Math.max(v + 10, e.end ?? v + 60) })} /></Field>
            <Field label="종료"><TimeInput allowEmpty={false} value={e.end} onChange={(v) => up({ end: v })} /></Field>
          </div>
        )}
        {!allDay && (
          <div className="row">
            <Field label="이동·준비(분 전)"><input className="input" type="number" min="0" step="5" value={e.bufferBefore || 0} onChange={(ev) => up({ bufferBefore: +ev.target.value })} /></Field>
            <Field label="정리(분 후)"><input className="input" type="number" min="0" step="5" value={e.bufferAfter || 0} onChange={(ev) => up({ bufferAfter: +ev.target.value })} /></Field>
          </div>
        )}
        <div className="row">
          <Field label="장소"><input className="input" value={e.location || ''} onChange={(ev) => up({ location: ev.target.value })} /></Field>
          <Field label="알림(분 전)"><input className="input" type="number" min="0" step="5" value={e.remind ?? ''} placeholder="없음" onChange={(ev) => up({ remind: ev.target.value === '' ? null : +ev.target.value })} /></Field>
        </div>
        <Field label="종류">
          <select className="input" value={e.kind || 'event'} onChange={(ev) => up({ kind: ev.target.value, ...(ev.target.value === 'anniv' ? { repeat: { freq: 'yearly', interval: 1 }, start: null, end: null } : null) })}>
            <option value="event">일정</option><option value="anniv">기념일·생일 (매년)</option>
          </select>
        </Field>
        <div className="row">
          <Field label="과목"><SubjectSelect value={e.subjectId} onChange={(v) => up({ subjectId: v })} /></Field>
          <Field label="프로젝트"><ProjectSelect value={e.projectId} onChange={(v) => up({ projectId: v })} /></Field>
        </div>
        {!allDay && <Toggle label="끝나면 공부 기록으로 (학원·인강·과외)" checked={!!e.studyLog} onChange={(v) => up({ studyLog: v })} />}
        {e.studyLog && !allDay && <div className="tiny muted" style={{ marginTop: -6 }}>일정이 끝나면 {e.subjectId ? '이 과목' : '과목 없이'} {e.end - e.start}분이 공부 기록에 자동으로 들어가요 (반복 일정은 매번). 기록을 지우면 다시 넣지 않아요.</div>}
        <Field label="색상"><ColorPick value={e.color} onChange={(c) => up({ color: c })} colors={PALETTE} /></Field>
        <Field label="반복"><RepeatEditor rule={e.repeat} start={e.date} onChange={(r) => up({ repeat: r })} /></Field>
        <Field label="메모"><AutoText className="input" value={e.note || ''} onChange={(v) => up({ note: v })} style={{ minHeight: 60 }} /></Field>
      </div>
    </>
  )
}
