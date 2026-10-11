// 과목 공책: 과목마다 공책 표지(색·제목·무늬)로 노트를 묶어 보여 줌 — 표지를 누르면 그 공책 노트들
import { useColl, patch } from '../../store/store.js'
import { Icon, openSheet, Field } from '../../components/ui.jsx'
import { ColorPick } from '../../components/common.jsx'
import { SOFT_PALETTE } from '../../store/schema.js'

const PATTERNS = [['plain', '무늬 없음'], ['grid', '모눈'], ['dot', '점'], ['line', '줄']]
const coverOf = (s) => ({ color: s?.cover?.color || s?.color || '#8a9bb5', title: s?.cover?.title || s?.name || '과목 없음', pat: s?.cover?.pat || 'plain' })

export function BookCover({ s, count, updated, onClick, onEdit }) {
  const c = coverOf(s)
  return (
    <div className="book" style={{ '--bc': c.color }}>
      <button className={'book-cover pat-' + c.pat} onClick={onClick} aria-label={c.title + ' 공책'}>
        <span className="book-spine" />
        <span className="book-label">
          <b className="ellipsis">{c.title}</b>
          <span className="tiny muted">노트 {count}{updated ? ' · ' + updated : ''}</span>
        </span>
      </button>
      {onEdit && <button className="icon-btn book-edit" onClick={onEdit} aria-label="표지 꾸미기"><Icon name="edit" size={13} /></button>}
    </div>
  )
}

function CoverEditor({ s, close }) {
  const c = coverOf(s)
  const up = (p) => patch('subjects', s.id, { cover: { ...(s.cover || {}), ...p } })
  return (
    <div className="form">
      <div className="row" style={{ justifyContent: 'center' }}><div style={{ width: 120 }}><BookCover s={s} count="…" /></div></div>
      <Field label="표지 제목"><input className="input" defaultValue={s.cover?.title || ''} placeholder={s.name} onChange={(e) => up({ title: e.target.value || null })} /></Field>
      <Field label="표지 색"><ColorPick value={c.color} onChange={(v) => up({ color: v })} colors={[...new Set([s.color, ...SOFT_PALETTE].filter(Boolean))]} /></Field>
      <Field label="무늬"><div className="row wrap" style={{ gap: 6 }}>{PATTERNS.map(([k, l]) => <button key={k} className={'chip' + (c.pat === k ? ' on' : '')} onClick={() => up({ pat: k })}>{l}</button>)}</div></Field>
      <button className="btn primary" onClick={close}>다 됐어요</button>
    </div>
  )
}

export default function Books({ notes, onOpen }) {
  const subjects = useColl('subjects')
  const when = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}` }
  const groups = [...subjects.map((s) => [s, notes.filter((n) => n.subjectId === s.id)]), [null, notes.filter((n) => !n.subjectId || !subjects.some((s) => s.id === n.subjectId))]].filter(([, l]) => l.length)
  return (
    <div className="books">
      {groups.map(([s, l]) => (
        <BookCover key={s?.id || 'none'} s={s} count={l.length} updated={when(Math.max(...l.map((n) => n.updatedAt || 0)))}
          onClick={() => onOpen(s?.id || '')}
          onEdit={s ? () => openSheet((c) => <CoverEditor s={s} close={c} />, { title: '표지 꾸미기' }) : null} />
      ))}
    </div>
  )
}
