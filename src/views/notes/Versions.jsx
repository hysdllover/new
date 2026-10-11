// 노트 이전 버전 목록: 눌러서 미리 보고 되돌리기
import { useEffect, useState } from 'react'
import { getState, find, patch } from '../../store/store.js'
import { diffBlocks, restoreBlock } from '../../lib/blockDiff.js'
import { versionsOf, restoreVersion } from '../../lib/noteVersions.js'
import { noteLines } from '../../lib/notePreview.js'
import { toast, Seg } from '../../components/ui.jsx'

const when = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

// 블록 한 줄 글 (표·파일 같은 건 이름만)
const LBL = { file: '그림·파일', page: '하위 페이지', table: '표', board: '보드', link: '링크', divider: '구분선', embed: '임베드', cols: '두 단' }
const lineOf = (b) => (b.text || '').split('\n')[0].replace(/\{\{[a-zA-Z]:|\}\}|\*\*|==|__|\[\[|\]\]/g, '') || (LBL[b.type] ? `[${LBL[b.type]}]` : '빈 줄')

// 지금 내용과 비교: 새로 생긴 줄 · 지운 줄(취소선) · 바뀐 줄(전 → 지금), 지운·바뀐 줄은 하나만 되살리기
function Diff({ id, v }) {
  const n = find('notes', id)
  const rows = diffBlocks(v.blocks || [], n?.blocks || []).filter((r) => r.k !== 'same')
  if (!n) return null
  if (!rows.length && (n.title || '') === (v.title || '')) return <div className="tiny muted">지금 내용과 같아요</div>
  const back = (bid) => { patch('notes', id, { blocks: restoreBlock(find('notes', id)?.blocks || [], v.blocks || [], bid) }); toast('그 줄을 되살렸어요') }
  return (
    <div className="nv-diff">
      {(n.title || '') !== (v.title || '') && <div className="nv-d chg"><span className="nv-old">{v.title || '제목 없음'}</span><span className="nv-new">{n.title || '제목 없음'}</span></div>}
      {rows.map((r, i) => (
        <div key={i} className={'nv-d ' + r.k}>
          {r.k === 'add' && <span className="nv-new">{lineOf(r.cur)}</span>}
          {r.k === 'del' && <span className="nv-old">{lineOf(r.old)}</span>}
          {r.k === 'chg' && <><span className="nv-old">{lineOf(r.old)}</span><span className="nv-new">{lineOf(r.cur)}</span></>}
          {r.k !== 'add' && <button className="btn sm ghost" onClick={() => back(r.old.id)}>되살리기</button>}
        </div>
      ))}
    </div>
  )
}

export default function Versions({ id, close }) {
  const [list, setList] = useState(null), [open, setOpen] = useState(0), [view, setView] = useState('diff')
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
              <Seg value={view} onChange={setView} options={[['diff', '지금과 비교'], ['all', '그때 내용']]} />
              {view === 'diff' ? <Diff id={id} v={v} /> : noteLines({ blocks: v.blocks }, getState(), 30).map((l, j) => <div key={j} className={'nv-l k-' + l.k}>{l.k === 'todo' ? (l.d ? '☑ ' : '☐ ') : l.k === 'b' ? '· ' : ''}{l.x}</div>)}
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
