// 새 노트: 템플릿 고르기 (기본 양식 + 내 템플릿)
import { useColl } from '../store/store.js'
import { BUILTIN, myTemplates, createFromTemplate, saveAsTemplate } from '../lib/noteTemplates.js'
import { openNote } from '../nav.js'
import { Icon } from './ui.jsx'
import { noteTitle } from '../lib/notes.js'

export default function TemplatePicker({ close, extra, onPick }) {
  useColl('notes')
  const mine = myTemplates()
  const pick = (tpl) => { if (onPick) onPick(tpl); else openNote(createFromTemplate(tpl, extra).id); close() }
  return (
    <div className="col">
      <div className="tpl-grid">
        {BUILTIN.map((t) => (
          <button key={t.id} className="tpl" onClick={() => pick(t)}>
            <span className="tpl-i">{t.icon}</span><b>{t.name}</b><span className="tiny muted">{t.desc}</span>
          </button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>내 템플릿 · 노트 메뉴(⋯) › ‘템플릿으로 저장’</div>
      {mine.length ? (
        <div className="tpl-grid">
          {mine.map((n) => (
            <div key={n.id} className="tpl" role="button" tabIndex={0} onClick={() => pick(n)}>
              <span className="tpl-i">{n.icon || '📄'}</span><b className="ellipsis">{noteTitle(n)}</b>
              <button className="icon-btn tpl-x" aria-label="템플릿에서 빼기" onClick={(e) => { e.stopPropagation(); saveAsTemplate(n, false) }}><Icon name="close" size={12} /></button>
            </div>
          ))}
        </div>
      ) : <div className="small muted">아직 없어요</div>}
    </div>
  )
}
