// 사진 넣기: 공유 시트(단축어가 사진을 클립보드에 복사 → 앱 ?photo=1) 또는 직접 골라서 → 할 일·노트에 첨부
import { useState } from 'react'
import { put, useColl } from '../store/store.js'
import { addTask } from '../store/actions.js'
import { addFile, pickFiles } from '../lib/files.js'
import { newBlock } from '../lib/notes.js'
import { openNote } from '../nav.js'
import { toast } from './ui.jsx'

export default function PhotoPaste({ close }) {
  const [blob, setBlob] = useState(null), [url, setUrl] = useState(null), [title, setTitle] = useState(''), [sub, setSub] = useState('')
  const subjects = useColl('subjects')
  const take = (b) => { setBlob(b); setUrl(URL.createObjectURL(b)) }
  const paste = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((x) => x.startsWith('image/'))
        if (type) return take(await item.getType(type))
      }
      toast('클립보드에 사진이 없어요')
    } catch { toast('붙여넣기를 허용해 주세요 · 또는 사진 고르기') }
  }
  const choose = async () => { const [f] = await pickFiles('image/*', false); if (f) take(f) }
  const save = async (kind) => {
    const file = blob instanceof File ? blob : new File([blob], `photo-${Date.now()}.${(blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: blob.type })
    const rec = await addFile(file, sub ? { subjectId: sub } : {})
    const name = title.trim() || '사진'
    if (kind === 'task') { addTask({ title: name, inbox: true, files: [rec.id], ...(sub ? { subjectId: sub } : null) }); toast('받은 편지함에 추가했어요') }
    else { const n = put('notes', { title: name, type: 'page', blocks: [{ ...newBlock('file'), fileId: rec.id }, newBlock('text')] }); openNote(n.id); toast('노트로 저장했어요') }
    close()
  }
  return (
    <div className="col">
      {!blob ? <>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn primary grow" onClick={paste}>붙여넣기</button>
          <button className="btn grow" onClick={choose}>사진 고르기</button>
        </div>
        <div className="tiny muted">단축어 ‘사진으로’가 사진을 복사해 두면 붙여넣기 한 번으로 들어와요.</div>
      </> : <>
        <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8, alignSelf: 'center' }} />
        <input className="input" placeholder="제목 (예: 수학 p.52 3번)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="row wrap" style={{ gap: 6 }}>{subjects.map((s) => <button key={s.id} className={'chip' + (sub === s.id ? ' on' : '')} onClick={() => setSub(sub === s.id ? '' : s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}</div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn primary grow" onClick={() => save('task')}>할 일로</button>
          <button className="btn grow" onClick={() => save('note')}>노트로</button>
        </div>
      </>}
    </div>
  )
}
