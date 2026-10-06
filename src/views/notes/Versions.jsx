// 노트 이전 버전 목록: 눌러서 미리 보고 되돌리기
import { useEffect, useState } from 'react'
import { getState } from '../../store/store.js'
import { versionsOf, restoreVersion } from '../../lib/noteVersions.js'
import { noteLines } from '../../lib/notePreview.js'
import { toast } from '../../components/ui.jsx'

const when = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export default function Versions({ id, close }) {
  const [list, setList] = useState(null), [open, setOpen] = useState(0)
  useEffect(() => { versionsOf(id).then(setList) }, [id])
  if (!list) return <div className="tiny muted">불러오는 중…</div>
  if (!list.length) return <div className="small muted">아직 이전 버전이 없어요. 편집하면 10분 단위로 이 기기에 남아요.</div>
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="tiny muted">편집하기 전 내용이 이 기기에 최근 {list.length}개 남아 있어요.</div>
      {list.map((v, i) => (
        <div key={v.at + '-' + i} className={'nv-row' + (open === i ? ' on' : '')}>
          <button className="row between nv-h" onClick={() => setOpen(open === i ? -1 : i)}>
            <span className="small">{when(v.at)}</span><span className="tiny muted ellipsis" style={{ maxWidth: '60%' }}>{v.title || '제목 없음'}</span>
          </button>
          {open === i && (
            <div className="nv-body">
              {noteLines({ blocks: v.blocks }, getState(), 30).map((l, j) => <div key={j} className={'nv-l k-' + l.k}>{l.k === 'todo' ? (l.d ? '☑ ' : '☐ ') : l.k === 'b' ? '· ' : ''}{l.x}</div>)}
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn sm primary" onClick={async () => { await restoreVersion(id, v); close(); toast(`${when(v.at)} 버전으로 되돌렸어요 · 지금 내용도 버전에 남겼어요`) }}>이 버전으로 되돌리기</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
