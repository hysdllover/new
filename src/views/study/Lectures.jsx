// 인강 수강 관리: 강 단위 체크, 남은 시간(배속)·하루 분량·완강 예정일·수강 기한
import { useState } from 'react'
import { useColl, put, patch, remove, find } from '../../store/store.js'
import { markLecture } from '../../store/actions.js'
import { lectureStats } from '../../engine/lecture.js'
import { today, fmtShort, fmtDur, WD } from '../../engine/date.js'
import { Card, Icon, Prog, Field, openSheet, confirmSheet, toast } from '../../components/ui.jsx'
import { SubjectSelect, SubjectTag } from '../../components/common.jsx'
import { startStopwatch } from '../../lib/timer.js'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
const SPEEDS = [1, 1.2, 1.4, 1.5, 1.6, 1.8, 2]

export const plusOne = (id) => { const n = markLecture(id); toast(n ? `${n}강 완료` : '모두 들었어요') }
export function listen(l) {
  if (l.link) window.open(l.link, '_blank', 'noopener')
  startStopwatch(l.subjectId || null, null, l.id)
  toast(`${l.title} 듣기 시작`)
}

// 한 줄 요약: 오늘 분량·예정일
export function lectureLine(s) {
  if (!s.left) return '완강했어요'
  const parts = []
  if (s.perDay != null) parts.push(s.todayLeft ? `오늘 ${s.todayLeft}강 남음` : '오늘 분량 끝')
  if (s.eta) parts.push(`지금 속도면 ${fmtShort(s.eta)} 완강`)
  else parts.push('다음 ' + s.next + '강')
  return parts.join(' · ')
}

export default function Lectures() {
  const lectures = useColl('lectures')
  const subjects = useColl('subjects')
  const t = today()
  return (
    <>
      <div className="row between">
        <h4>인강</h4>
        <button className="btn sm" onClick={() => openSheet((c) => <LecForm close={c} />, { title: '인강 추가' })}><Icon name="plus" size={14} />강좌</button>
      </div>
      {!lectures.length && <div className="small muted">강좌를 추가하면 남은 시간·하루 분량·완강 예정일을 계산해요</div>}
      <div className="grid two">
        {lectures.map((l) => {
          const s = lectureStats(l, t)
          return (
            <Card key={l.id} className="lec" title={<span className="row">{l.title}<SubjectTag id={l.subjectId} subjects={subjects} /></span>} action={
              <div className="row" style={{ gap: 2 }}>
                <button className="icon-btn" onClick={() => openSheet(() => <LecList id={l.id} />, { title: l.title })} aria-label="강 목록"><Icon name="layers" size={16} /></button>
                <button className="icon-btn" onClick={() => openSheet((c) => <LecForm close={c} l={l} />, { title: '인강 수정' })} aria-label="수정"><Icon name="edit" size={16} /></button>
              </div>
            }>
              <div className="row between small"><span>{s.doneN} / {s.total}강{l.platform ? <span className="muted"> · {l.platform}</span> : null}</span><b>{Math.round((s.doneN / (s.total || 1)) * 100)}%</b></div>
              <Prog value={s.doneN / (s.total || 1)} h={7} />
              <div className="small" style={{ marginTop: 8 }}>{s.left ? <>남은 <b>{fmtDur(s.leftMin)}</b> <span className="muted">· {l.speed || 1}배속</span></> : '완강했어요 🎉'}</div>
              {s.left > 0 && <div className="tiny muted">{s.perDay != null && <>하루 {s.perDay}강이면 {fmtShort(l.goal)} 완강 · </>}{lectureLine(s)}</div>}
              {l.expires && s.left > 0 && <div className={'tiny' + (s.late ? ' lec-late' : ' muted')}>수강 기한 {fmtShort(l.expires)} ({s.expiresIn >= 0 ? `D-${s.expiresIn}` : '지남'}){s.late ? ' · 이 속도면 기한을 넘겨요' : ''}</div>}
              {!l.expires && s.late && <div className="tiny lec-late">목표일보다 늦어요</div>}
              {s.left > 0 && (
                <div className="row" style={{ marginTop: 8, gap: 6 }}>
                  <button className="btn sm" onClick={() => plusOne(l.id)}>＋1강 <span className="muted tiny">({s.next}강)</span></button>
                  <button className="btn sm primary" onClick={() => listen(l)}>▶ 듣기</button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

// 강 목록: 칩으로 완료/취소, 강 길이 붙여넣기
function LecList({ id }) {
  useColl('lectures')
  const l = find('lectures', id)
  const [paste, setPaste] = useState(false)
  if (!l) return null
  const done = l.done || {}
  return (
    <div className="col">
      <div className="tiny muted">강을 눌러 완료·취소해요. 완료한 날짜가 속도 계산에 쓰여요.</div>
      <div className="lec-chips">
        {Array.from({ length: l.total || 0 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={'lec-chip' + (done[n] ? ' on' : '')} onClick={() => markLecture(id, n)} title={done[n] ? fmtShort(done[n]) + ' 완료' : ''}>
            {n}{l.lens?.[n - 1] ? <small>{l.lens[n - 1]}′</small> : null}
          </button>
        ))}
      </div>
      {paste ? <LenPaste l={l} close={() => setPaste(false)} /> : <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setPaste(true)}>강별 길이 붙여넣기</button>}
    </div>
  )
}

// "42:10" 또는 "42" 를 줄마다 → 분
export const parseLens = (text) => text.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean).map((x) => {
  const m = x.match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/)
  if (m) return m[3] != null ? +m[1] * 60 + +m[2] + (+m[3] >= 30 ? 1 : 0) : +m[1] + (+m[2] >= 30 ? 1 : 0)
  const n = x.match(/(\d+)\s*분?$/); return n ? +n[1] : null
}).filter((n) => n != null && n > 0)

function LenPaste({ l, close }) {
  const [v, setV] = useState((l.lens || []).join('\n'))
  const lens = parseLens(v)
  return (
    <div className="col">
      <textarea className="input" rows={6} value={v} onChange={(e) => setV(e.target.value)} placeholder={'강의 목록에서 재생 시간을 복사해 붙여 넣어요\n42:10\n38:05\n...'} />
      <div className="tiny muted">{lens.length}강 · 합계 {fmtDur(lens.reduce((a, x) => a + x, 0))}{lens.length > (l.total || 0) ? ' · 전체 강수도 늘려요' : ''}</div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={close}>취소</button>
        <button className="btn primary" onClick={() => { patch('lectures', l.id, { lens, total: Math.max(l.total || 0, lens.length) }); close() }}>저장</button>
      </div>
    </div>
  )
}

function LecForm({ close, l }) {
  const [f, setF] = useState(l || { title: '', subjectId: null, platform: '', link: '', total: 30, avgMin: 40, speed: 1.5, goal: '', expires: '', days: [] })
  const set = (p) => setF({ ...f, ...p })
  const days = f.days?.length ? f.days : ORDER
  const save = () => {
    if (!f.title.trim()) return
    const rec = { ...f, title: f.title.trim(), total: Math.max(1, +f.total || 1), avgMin: Math.max(1, +f.avgMin || 40), goal: f.goal || null, expires: f.expires || null, days: f.days?.length === 7 ? [] : f.days }
    l ? patch('lectures', l.id, rec) : put('lectures', { ...rec, done: {} })
    close()
  }
  return (
    <div className="form">
      <Field label="강좌 이름"><input className="input" autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="예: 수학Ⅱ 개념 완성" /></Field>
      <div className="row">
        <Field label="과목"><SubjectSelect value={f.subjectId} onChange={(v) => set({ subjectId: v })} /></Field>
        <Field label="플랫폼"><input className="input" value={f.platform || ''} onChange={(e) => set({ platform: e.target.value })} placeholder="예: EBS" /></Field>
      </div>
      <Field label="강의 링크 (▶ 듣기로 열림)"><input className="input" type="url" inputMode="url" value={f.link || ''} onChange={(e) => set({ link: e.target.value })} placeholder="https://" /></Field>
      <div className="row">
        <Field label="전체 강수"><input className="input" type="number" inputMode="numeric" value={f.total} onChange={(e) => set({ total: e.target.value })} /></Field>
        <Field label="평균 길이(분)"><input className="input" type="number" inputMode="numeric" value={f.avgMin} onChange={(e) => set({ avgMin: e.target.value })} /></Field>
      </div>
      <Field label="배속">
        <div className="row wrap" style={{ gap: 4 }}>{SPEEDS.map((x) => <button key={x} type="button" className={'chip' + ((f.speed || 1) === x ? ' on' : '')} onClick={() => set({ speed: x })}>{x}×</button>)}</div>
      </Field>
      <div className="row">
        <Field label="완강 목표일"><input className="input" type="date" value={f.goal || ''} onChange={(e) => set({ goal: e.target.value })} /></Field>
        <Field label="수강 기한"><input className="input" type="date" value={f.expires || ''} onChange={(e) => set({ expires: e.target.value })} /></Field>
      </div>
      <Field label="듣는 요일">
        <div className="row wrap" style={{ gap: 4 }}>{ORDER.map((d) => <button key={d} type="button" className={'chip' + (days.includes(d) ? ' on' : '')} onClick={() => set({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] })}>{WD[d]}</button>)}</div>
      </Field>
      <div className="row between">
        {l ? <button className="btn danger" onClick={() => confirmSheet('강좌 삭제', `'${l.title}'을 삭제할까요?`, () => { remove('lectures', l.id); close() }, '삭제')}>삭제</button> : <span />}
        <button className="btn primary" onClick={save}>저장</button>
      </div>
    </div>
  )
}
