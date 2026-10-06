import { useState } from 'react'
import { useRec, useColl, patch, remove, restore } from '../../store/store.js'
import { addReview } from '../../store/actions.js'
import BlockEditor from '../../components/BlockEditor.jsx'
import { Icon, openMenu, toast, Seg, AutoText, openDetail, openSheet } from '../../components/ui.jsx'
import TemplatePicker from '../../components/TemplatePicker.jsx'
import { blocksOf } from '../../lib/noteTemplates.js'
import { SubjectSelect, ProjectSelect } from '../../components/common.jsx'
import { backlinks, toMarkdown, noteTitle } from '../../lib/notes.js'
import { download } from '../../lib/files.js'
import { setParams, openNote } from '../../nav.js'
import { fmtDate } from '../../engine/date.js'
import Mindmap from './Mindmap.jsx'
import Versions from './Versions.jsx'

// 페이지 표지: 옅은 색 띠 · 종이 결
const COVERS = [['', '없음'], ['paper', '종이'], ['navy', '네이비'], ['olive', '올리브'], ['violet', '바이올렛'], ['rose', '로즈']]
const ICONS = ['📄', '📘', '🧪', '🧮', '🌏', '✏️', '💡', '📌', '🎯', '🗂️', '📝', '🔖']

export default function NotePage({ id }) {
  const n = useRec('notes', id)
  const notes = useColl('notes')
  const settings = useRec('settings', 'main')
  const [view, setView] = useState('doc')
  // 읽기 모드 (이 기기에 기억)
  const [reading, setReading] = useState(() => { try { return localStorage.getItem('note_read') === '1' } catch { return false } })
  const toggleRead = () => { const v = !reading; setReading(v); try { localStorage.setItem('note_read', v ? '1' : '0') } catch {} }
  if (!n) return <div className="empty">삭제된 노트입니다. <button className="btn sm" onClick={() => setParams('notes', { noteId: null })}>목록으로</button></div>
  const bl = backlinks(n, notes)
  const parent = n.parentId ? notes.find((x) => x.id === n.parentId) : null
  const up = (p) => patch('notes', id, p)
  const menu = (e) => openMenu(e, [
    { label: '마크다운 내보내기', icon: 'download', onClick: () => download(`${noteTitle(n)}.md`, toMarkdown(n), 'text/markdown') },
    { label: 'PDF (A4 인쇄)', icon: 'print', onClick: () => window.print() },
    { label: '노트 전체 복습 등록', icon: 'brain', onClick: () => addReview({ title: noteTitle(n), subjectId: n.subjectId, sourceType: 'note', sourceId: n.id }) },
    { label: '표지', icon: 'layers', onClick: () => openSheet((close) => <div className="row wrap" style={{ gap: 8 }}>{COVERS.map(([k, l]) => <button key={k} className={'chip' + ((n.cover || '') === k ? ' on' : '')} onClick={() => { up({ cover: k || null }); close() }}>{k && <i className={'cover-dot cv-' + k} />}{l}</button>)}</div>, { title: '페이지 표지' }) },
    { label: '이전 버전', icon: 'clock', onClick: () => openSheet((c) => <Versions id={id} close={c} />, { title: '이전 버전' }) },
    { label: n.pinned ? '고정 해제' : '상단 고정', icon: 'star', onClick: () => up({ pinned: !n.pinned }) },
    { label: n.isTemplate ? '템플릿에서 빼기' : '템플릿으로 저장', icon: 'layers', onClick: () => { up({ isTemplate: !n.isTemplate }); toast(n.isTemplate ? '템플릿에서 뺐어요' : '새 페이지에서 이 양식을 고를 수 있어요') } },
    { label: '템플릿 붙이기', icon: 'plus', onClick: () => openSheet((c) => <TemplatePicker close={c} onPick={(tpl) => { up({ blocks: [...(n.blocks || []).filter((b) => b.type !== 'text' || b.text), ...blocksOf(tpl)] }); toast('양식을 아래에 붙였어요') }} />, { title: '템플릿 붙이기' }) },
    { label: '삭제', icon: 'trash', danger: true, onClick: () => { remove('notes', id); setParams('notes', { noteId: null }); toast('노트 삭제됨', { label: '되돌리기', fn: () => { restore('notes', id); openNote(id) } }) } },
  ])
  return (
    <div className={'note-page' + (reading ? ' reading' : '')}>
      <div className="row no-print" style={{ marginBottom: 6 }}>
        <button className="btn ghost sm" onClick={() => setParams('notes', { noteId: null })}><Icon name="back" size={14} />목록</button>
        {parent && <button className="btn ghost sm ellipsis" style={{ maxWidth: '45%' }} onClick={() => openNote(parent.id)}>› {noteTitle(parent)}</button>}
        <span className="grow" />
        <button className={'btn sm' + (reading ? ' on-acc' : '')} onClick={toggleRead}>{reading ? '편집' : '읽기'}</button>
        {settings?.modules?.mindmap !== false && <Seg small value={view} onChange={setView} options={[['doc', '문서'], ['map', '마인드맵']]} />}
        <button className="icon-btn" onClick={menu} aria-label="노트 메뉴"><Icon name="more" size={20} stroke={2.4} /></button>
      </div>
      {n.cover && <div className={'note-cover cv-' + n.cover} style={n.cover === 'paper' ? { backgroundImage: `url(${import.meta.env.BASE_URL}paper.jpg)` } : null} />}
      <div className="note-head">
        <button className="note-icon" onClick={(e) => openMenu(e, ICONS.map((i) => ({ label: i, onClick: () => up({ icon: i }) })))}>{n.icon || '📄'}</button>
        <AutoText className="note-title" value={n.title || ''} placeholder="제목 없음" readOnly={reading} onChange={(v) => up({ title: v })} />
      </div>
      {!reading && <div className="row wrap note-meta no-print">
        <div style={{ minWidth: 120, flex: 1 }}><SubjectSelect className="input sm-input" value={n.subjectId} onChange={(v) => up({ subjectId: v })} /></div>
        <div style={{ minWidth: 120, flex: 1 }}><ProjectSelect value={n.projectId} onChange={(v) => up({ projectId: v })} /></div>
        {n.date && <span className="badge">{fmtDate(n.date)}</span>}
        {n.eventId && <button className="chip" onClick={() => openDetail('event', n.eventId, { occ: n.date })}><Icon name="calendar" size={12} />연결된 일정</button>}
      </div>}
      {view === 'map' ? <Mindmap note={n} /> : <BlockEditor blocks={n.blocks} note={n} readOnly={reading} onChange={(blocks) => up({ blocks })} />}
      {bl.length > 0 && (
        <div className="backlinks no-print">
          <h4>백링크 {bl.length}</h4>
          {bl.map((b) => <button key={b.id} className="chip" onClick={() => openNote(b.id)}>{b.icon || '📄'} {noteTitle(b)}</button>)}
        </div>
      )}
    </div>
  )
}
