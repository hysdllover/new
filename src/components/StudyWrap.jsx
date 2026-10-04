// 타이머를 끝낼 때: 무엇을 했는지 한 줄 + 집중도(상·중·하) — 이번에 기록된 구간 모두에 남김
import { useState } from 'react'
import { patch } from '../store/store.js'
import { toast } from './ui.jsx'

export const FOCUS = [[5, '상'], [3, '중'], [1, '하']]
export const focusLabel = (f) => (!f ? '' : f >= 4 ? '상' : f >= 3 ? '중' : '하')

export default function StudyWrap({ ids, min, close }) {
  const [note, setNote] = useState(''), [focus, setFocus] = useState(0)
  const save = () => {
    for (const id of ids) patch('sessions', id, { ...(note.trim() ? { note: note.trim() } : null), ...(focus ? { focus } : null) })
    if (note.trim() || focus) toast('기록에 남겼어요')
    close()
  }
  return (
    <div className="col">
      <div className="small muted">{min}분 기록했어요</div>
      <input className="input" autoFocus placeholder="무엇을 했나요? (한 줄 · 선택)" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()} />
      <div className="row" style={{ gap: 6 }}>
        <span className="small muted">집중</span>
        {FOCUS.map(([v, l]) => <button key={v} className={'chip' + (focus === v ? ' on' : '')} onClick={() => setFocus(focus === v ? 0 : v)}>{l}</button>)}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn primary grow" onClick={save}>저장</button>
        <button className="btn" onClick={close}>건너뛰기</button>
      </div>
    </div>
  )
}
