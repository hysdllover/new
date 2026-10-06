// 타이머를 끝낼 때: 무엇을 했는지 한 줄 + 집중도(상·중·하) — 이번에 기록된 구간 모두에 남김
import { useState } from 'react'
import { patch, find, useColl } from '../store/store.js'
import { toast, Icon } from './ui.jsx'
import { FileThumb } from './Attach.jsx'
import { addFile, pickFiles } from '../lib/files.js'

export const FOCUS = [[5, '상'], [3, '중'], [1, '하']]
export const focusLabel = (f) => (!f ? '' : f >= 4 ? '상' : f >= 3 ? '중' : '하')

export default function StudyWrap({ ids, min, close }) {
  const [note, setNote] = useState(''), [focus, setFocus] = useState(0), [pic, setPic] = useState(null)
  const files = useColl('files'), picRec = pic && files.find((x) => x.id === pic)
  const s0 = find('sessions', ids[ids.length - 1])
  // 사진 한 장 (푼 페이지 인증) — 마지막 구간 기록에 붙임
  const addPic = async () => { const [f] = await pickFiles('image/*', false); if (!f) return; try { const r = await addFile(f, { subjectId: s0?.subjectId || null, date: s0?.date }); setPic(r.id) } catch (e) { toast(e.message) } }
  const save = () => {
    for (const id of ids) patch('sessions', id, { ...(note.trim() ? { note: note.trim() } : null), ...(focus ? { focus } : null) })
    if (pic && s0) patch('sessions', s0.id, { files: [...(find('sessions', s0.id)?.files || []), pic] })
    if (note.trim() || focus || pic) toast('기록에 남겼어요')
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
      <div className="row" style={{ gap: 8 }}>
        {picRec ? <><FileThumb file={picRec} size={52} /><button className="chip" onClick={() => setPic(null)}>빼기</button></> : <button className="chip" onClick={addPic}><Icon name="image" size={13} />사진 한 장</button>}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn primary grow" onClick={save}>저장</button>
        <button className="btn" onClick={close}>건너뛰기</button>
      </div>
    </div>
  )
}
