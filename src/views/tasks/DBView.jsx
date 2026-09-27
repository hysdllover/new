import { useMemo, useState, useEffect } from 'react'
import { useColl, patch } from '../../store/store.js'
import { updateTask, taskProgress, taskSpent, toggleTask } from '../../store/actions.js'
import { Seg, openDetail, Prog, Empty } from '../../components/ui.jsx'
import { PRI, SubjectTag } from '../../components/common.jsx'
import { fmtShort, fmtDur } from '../../engine/date.js'
import { longPress } from '../../lib/drag.js'
import { blobUrl } from '../../lib/files.js'
import { openNote } from '../../nav.js'

const STATUS = { todo: '할 일', doing: '진행 중', done: '완료' }

// 표 / 갤러리 / 보드로 같은 데이터를 보는 데이터베이스 뷰
export default function DBView({ source = 'tasks' }) {
  const tasks = useColl('tasks')
  const notes = useColl('notes')
  const subjects = useColl('subjects')
  const projects = useColl('projects')
  const sessions = useColl('sessions')
  const files = useColl('files')
  const [mode, setMode] = useState(() => localStorage.getItem('db-mode-' + source) || 'table')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ k: 'due', dir: 1 })
  const [groupBy, setGroupBy] = useState(source === 'tasks' ? 'status' : 'subjectId')
  useEffect(() => { try { localStorage.setItem('db-mode-' + source, mode) } catch {} }, [mode, source])

  const isT = source === 'tasks'
  const cols = isT ? [
    ['title', '제목'], ['status', '상태'], ['due', '마감'], ['priority', '우선순위'], ['subjectId', '과목'], ['projectId', '프로젝트'], ['progress', '진행률'], ['estimate', '예상'], ['spent', '공부시간'],
  ] : [['title', '제목'], ['type', '종류'], ['subjectId', '과목'], ['projectId', '프로젝트'], ['blocks', '블록 수'], ['updatedAt', '수정일']]

  const rows = useMemo(() => {
    const base = isT ? tasks.filter((t) => !t.archived).map((t) => ({ ...t, status: t.done ? 'done' : t.status || 'todo', progress: taskProgress(t), spent: taskSpent(t.id, sessions) }))
      : notes.map((n) => ({ ...n, blocks: n.blocks?.length || 0, type: n.type || 'page' }))
    const s = q.trim().toLowerCase()
    const f = s ? base.filter((r) => (r.title || '').toLowerCase().includes(s)) : base
    return f.sort((a, b) => {
      const x = a[sort.k] ?? '', y = b[sort.k] ?? ''
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir
    })
  }, [tasks, notes, sessions, q, sort, isT])

  const open = (r) => isT ? openDetail('task', r.id) : openNote(r.id)
  const cell = (r, k) => {
    switch (k) {
      case 'title': return <button className="ellipsis" style={{ textAlign: 'left', maxWidth: 260 }} onClick={() => open(r)}>{r.title || '제목 없음'}</button>
      case 'status': return <select className="cell-sel" value={r.status} onChange={(e) => { if ((e.target.value === 'done') !== r.done) toggleTask(r.id); patch('tasks', r.id, { status: e.target.value }) }}>{Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      case 'due': return <input className="cell-sel" type="date" value={r.due || ''} onChange={(e) => updateTask(r.id, { due: e.target.value || null })} />
      case 'priority': return <select className="cell-sel" value={r.priority || 0} onChange={(e) => updateTask(r.id, { priority: +e.target.value })}>{PRI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      case 'subjectId': return <SubjectTag id={r.subjectId} subjects={subjects} />
      case 'projectId': { const p = projects.find((x) => x.id === r.projectId); return p ? <span className="row"><span className="dot" style={{ background: p.color }} />{p.name}</span> : null }
      case 'progress': return <div style={{ width: 70 }}><Prog value={r.progress} /></div>
      case 'estimate': return r.estimate ? r.estimate + '분' : ''
      case 'spent': return r.spent ? fmtDur(r.spent) : ''
      case 'type': return { page: '페이지', daily: '데일리', event: '일정', memo: '메모' }[r.type] || r.type
      case 'updatedAt': return fmtShort(new Date(r.updatedAt).toISOString().slice(0, 10))
      default: return r[k]
    }
  }

  const groups = (() => {
    if (groupBy === 'status') return Object.entries(STATUS).map(([v, l]) => ({ v, l }))
    if (groupBy === 'priority') return [...PRI].reverse().map(([v, l]) => ({ v: +v, l }))
    if (groupBy === 'subjectId') return [...subjects.map((s) => ({ v: s.id, l: s.name, c: s.color })), { v: null, l: '없음' }]
    if (groupBy === 'projectId') return [...projects.map((p) => ({ v: p.id, l: p.name, c: p.color })), { v: null, l: '없음' }]
    return [{ v: null, l: '전체' }]
  })()
  const moveTo = (r, v) => {
    if (isT) {
      if (groupBy === 'status') { if ((v === 'done') !== !!r.done) toggleTask(r.id); patch('tasks', r.id, { status: v }) }
      else updateTask(r.id, { [groupBy]: groupBy === 'priority' ? +v : v || null })
    } else patch('notes', r.id, { [groupBy]: v || null })
  }

  return (
    <div className="col">
      <div className="row wrap">
        <Seg value={mode} onChange={setMode} options={[['table', '표'], ['gallery', '갤러리'], ['board', '보드']]} />
        <input className="input grow" style={{ minWidth: 120 }} placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} />
        {mode === 'board' && (
          <select className="input" style={{ width: 'auto' }} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {isT && <option value="status">상태별</option>}
            {isT && <option value="priority">우선순위별</option>}
            <option value="subjectId">과목별</option><option value="projectId">프로젝트별</option>
          </select>
        )}
      </div>
      {!rows.length && <Empty>항목이 없어요</Empty>}
      {mode === 'table' && rows.length > 0 && (
        <div className="card db-table" style={{ padding: 0 }}>
          <div className="scroll-x">
            <table>
              <thead><tr>{cols.map(([k, l]) => <th key={k} onClick={() => setSort({ k, dir: sort.k === k ? -sort.dir : 1 })}>{l}{sort.k === k ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}</th>)}</tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}>{cols.map(([k]) => <td key={k}>{cell(r, k)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      {mode === 'gallery' && (
        <div className="gallery">
          {rows.map((r) => (
            <button key={r.id} className="card gcard" onClick={() => open(r)}>
              <Cover ids={r.files || (isT ? [] : (notes.find((n) => n.id === r.id)?.blocks || []).filter((b) => b.fileId).map((b) => b.fileId))} files={files} />
              <div className="ellipsis" style={{ fontWeight: 'var(--fw-b)' }}>{r.title || '제목 없음'}</div>
              <div className="row wrap small muted" style={{ gap: 6, marginTop: 4 }}>
                <SubjectTag id={r.subjectId} subjects={subjects} />
                {isT && r.due && <span>{fmtShort(r.due)}</span>}
                {isT && <span>{STATUS[r.status]}</span>}
              </div>
              {isT && r.subtasks?.length > 0 && <div style={{ marginTop: 6 }}><Prog value={r.progress} /></div>}
            </button>
          ))}
        </div>
      )}
      {mode === 'board' && (
        <div className="kanban">
          {groups.map((g) => {
            const items = rows.filter((r) => (r[groupBy] ?? null) === g.v || (groupBy === 'priority' && (r.priority || 0) === g.v))
            return (
              <div key={String(g.v)} className="kcol" data-drop={'g:' + (g.v ?? '')}>
                <div className="card-h" style={{ padding: '0 4px' }}><h3 className="row">{g.c && <span className="dot" style={{ background: g.c }} />}{g.l}</h3><span className="badge">{items.length}</span></div>
                {items.map((r) => (
                  <div key={r.id} className="card kcard draggable" onClick={() => open(r)} {...longPress(() => ({ label: r.title, onDrop: (z) => moveTo(r, z.dataset.drop.slice(2)) }))}>
                    <div className="ellipsis">{r.title || '제목 없음'}</div>
                    <div className="row small muted" style={{ gap: 6 }}>{isT && r.due && <span>{fmtShort(r.due)}</span>}<SubjectTag id={groupBy === 'subjectId' ? null : r.subjectId} subjects={subjects} /></div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Cover({ ids = [], files }) {
  const img = ids.map((id) => files.find((f) => f.id === id)).find((f) => f?.type?.startsWith('image'))
  const [url, setUrl] = useState(null)
  useEffect(() => { let u; if (img) blobUrl(img.id).then((x) => { u = x; setUrl(x) }); return () => u && URL.revokeObjectURL(u) }, [img?.id])
  return url ? <img src={url} alt="" className="gcover" /> : null
}
