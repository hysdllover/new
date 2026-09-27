import { useState } from 'react'
import { useColl, put, patch } from '../store/store.js'
import { Card, Icon, Empty, Seg, openDetail } from '../components/ui.jsx'
import BlockEditor from '../components/BlockEditor.jsx'
import NotePage from './notes/NotePage.jsx'
import Hub from './notes/Hub.jsx'
import Graph from './notes/Graph.jsx'
import Library from './notes/Library.jsx'
import DBView from './tasks/DBView.jsx'
import { setParams, openNote } from '../nav.js'
import { today, addDays, fmtDate, fmtTime, fmtDur, tsToMin, tsToYmd } from '../engine/date.js'
import { eventsOn } from '../engine/scheduler.js'
import { mentionsOf, noteTitle, newBlock, noteText } from '../lib/notes.js'
import { SubjectTag } from '../components/common.jsx'
import { FileThumb } from '../components/Attach.jsx'

export default function Notes({ seg, params }) {
  if (params.noteId && seg === 'pages') return <NotePage id={params.noteId} />
  if (seg === 'daily') return <Daily date={params.date || today()} />
  if (seg === 'hub') return <Hub hubId={params.hubId} />
  if (seg === 'graph') return <Graph />
  if (seg === 'library') return <Library />
  return <Pages params={params} />
}

function Pages({ params }) {
  const notes = useColl('notes')
  const subjects = useColl('subjects')
  const [mode, setMode] = useState(params.mode || 'list')
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const list = notes.filter((n) => n.type !== 'daily' && (type === 'all' || (n.type || 'page') === type))
    .filter((n) => !q || (n.title || '').includes(q) || noteText(n).includes(q))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt)
  const create = () => openNote(put('notes', { title: '', type: 'page', blocks: [newBlock()] }).id)
  return (
    <div className="col">
      <div className="row wrap">
        <Seg value={mode} onChange={(v) => { setMode(v); setParams('notes', { mode: v }) }} options={[['list', '목록'], ['db', 'DB 뷰']]} />
        <span className="grow" />
        <button className="btn primary" onClick={create}><Icon name="plus" size={16} />새 페이지</button>
      </div>
      {mode === 'db' ? <DBView source="notes" /> : (
        <>
          <div className="row wrap" style={{ gap: 6 }}>
            <input className="input grow" style={{ minWidth: 140 }} placeholder="노트 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            {[['all', '전체'], ['page', '페이지'], ['memo', '메모'], ['event', '일정 노트']].map(([k, l]) => <button key={k} className={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{l}</button>)}
          </div>
          <div className="note-grid">
            {list.map((n) => (
              <button key={n.id} className="card note-card" onClick={() => openNote(n.id)}>
                <div className="row"><span>{n.icon || (n.type === 'memo' ? '🗒️' : n.type === 'event' ? '📅' : '📄')}</span><b className="ellipsis grow">{noteTitle(n)}</b>{n.pinned && <Icon name="star" size={12} fill="currentColor" />}</div>
                <div className="note-prev">{noteText(n).replace(/\[\[|\]\]/g, '').slice(0, 120)}</div>
                <div className="row small muted" style={{ gap: 6 }}><SubjectTag id={n.subjectId} subjects={subjects} /><span className="tiny">{new Date(n.updatedAt).toLocaleDateString('ko-KR')}</span></div>
              </button>
            ))}
          </div>
          {!list.length && <Empty>노트가 없어요</Empty>}
        </>
      )}
    </div>
  )
}

function Daily({ date }) {
  const notes = useColl('notes')
  const events = useColl('events')
  const tasks = useColl('tasks')
  const sessions = useColl('sessions')
  const subjects = useColl('subjects')
  const files = useColl('files')
  const cond = useColl('conditions').find((c) => c.id === date)
  const n = notes.find((x) => x.type === 'daily' && x.date === date)
  const evs = eventsOn(date, events)
  const doneFix = tasks.filter((t) => t.done && t.doneAt && tsToYmd(t.doneAt) === date)
  const ss = sessions.filter((s) => s.date === date)
  const bySub = subjects.map((s) => ({ s, m: ss.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.dur, 0) })).filter((x) => x.m)
  const dayFiles = files.filter((f) => f.date === date)
  const mentions = mentionsOf(date, notes).filter((x) => x.id !== n?.id)
  const setDate = (d) => setParams('notes', { date: d })
  return (
    <div className="col">
      <div className="row between">
        <div className="row">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="이전"><Icon name="back" /></button>
          <label className="date-label"><b>{fmtDate(date)}</b><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="다음"><Icon name="next" /></button>
        </div>
        {date !== today() && <button className="btn sm" onClick={() => setDate(today())}>오늘</button>}
      </div>
      <div className="today-grid">
        <Card className="daily-note">
          <BlockEditor blocks={n?.blocks || []} note={n || { id: null }}
            onChange={(blocks) => { if (n) patch('notes', n.id, { blocks }); else put('notes', { ...dailyNoteSeed(date), blocks }) }} />
        </Card>
        <div className="col">
          <Card title="이 날 한눈에">
            <div className="daily-agg">
              <div><h4>일정</h4>{evs.length ? evs.map((e) => <button key={e.id} className="row agg-row" onClick={() => openDetail('event', e.id, { occ: date })}><span className="dot" style={{ background: e.color || 'var(--accent)' }} /><span className="tiny muted">{e.start != null ? fmtTime(e.start) : '종일'}</span><span className="ellipsis">{e.title}</span></button>) : <span className="tiny muted">없음</span>}</div>
              <div><h4>완료 {doneFix.length}</h4>{doneFix.length ? doneFix.map((t) => <button key={t.id} className="row agg-row" onClick={() => openDetail('task', t.id)}><span style={{ color: 'var(--ok)' }}>✓</span><span className="ellipsis">{t.title}</span></button>) : <span className="tiny muted">없음</span>}</div>
              <div><h4>공부 {fmtDur(ss.reduce((a, s) => a + s.dur, 0))}</h4>{bySub.map(({ s, m }) => <div key={s.id} className="row agg-row"><span className="dot" style={{ background: s.color }} /><span className="grow">{s.name}</span><span className="tiny muted">{fmtDur(m)}</span></div>)}
                {ss.some((s) => s.start != null) && <div className="tiny muted">{fmtTime(Math.min(...ss.filter((s) => s.start != null).map((s) => tsToMin(s.start))))} 시작</div>}
              </div>
              {cond && <div><h4>컨디션</h4><div className="small">수면 {cond.sleep ?? '-'}시간 · 기분 {'●'.repeat(cond.mood || 0)}{'○'.repeat(5 - (cond.mood || 0))}</div></div>}
              {dayFiles.length > 0 && <div><h4>첨부</h4><div className="row wrap" style={{ gap: 6 }}>{dayFiles.map((f) => <FileThumb key={f.id} file={f} size={48} />)}</div></div>}
              {mentions.length > 0 && <div><h4>이 날짜를 언급한 노트</h4>{mentions.map((m) => <button key={m.id} className="chip" onClick={() => openNote(m.id)}>{noteTitle(m)}</button>)}</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const dailyNoteSeed = (date) => ({ id: 'daily-' + date, title: date, type: 'daily', date })
