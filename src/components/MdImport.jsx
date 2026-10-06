// 마크다운 가져오기: .md 파일(여러 개) · 붙여 넣은 글 → 미리 보고 → 새 페이지 / 지금 페이지 아래에 붙이기
import { useMemo, useState } from 'react'
import { put, patch, find, batch } from '../store/store.js'
import { toggleTask } from '../store/actions.js'
import { mdToBlocks, mdToNote, mdSummary, cleanName } from '../lib/md.js'
import { commitBlock } from '../lib/notes.js'
import { pickFiles } from '../lib/files.js'
import { openNote } from '../nav.js'
import { toast, Icon } from './ui.jsx'
import { Inline } from './BlockEditor.jsx'

// 체크 줄은 할 일로 연결 (완료 표시된 줄은 완료 상태로) · 하위 블록까지
const linkTodos = (blocks, note) => blocks.map((b) => {
  if (b.type !== 'todo') return b
  const { done, ...rest } = b
  const nb = commitBlock(rest, note)
  if (done && nb.taskId) toggleTask(nb.taskId)
  return nb
})

// 파일 글자 읽기: UTF-8 이 깨지면 EUC-KR 로 다시 (한글 윈도우에서 만든 .txt·.md)
async function readText(f) {
  const buf = await f.arrayBuffer()
  const u8 = new TextDecoder('utf-8').decode(buf)
  if (!/�/.test(u8)) return u8
  try { return new TextDecoder('euc-kr').decode(buf) } catch { return u8 }
}
const isText = (f) => /\.(md|markdown|mdown|mkd|txt)$/i.test(f.name) || /^text\//.test(f.type || '')

export function importMarkdown(text, fileName, { subjectId = null, parentId = null } = {}) {
  const { title, blocks } = mdToNote(text, fileName)
  const n = put('notes', { title, type: 'page', subjectId, parentId, blocks: [] })
  patch('notes', n.id, { blocks: linkTodos(blocks, n) })
  return n
}

// 미리보기: 앞쪽 블록 몇 개를 실제 노트 모양으로
function Preview({ blocks }) {
  return (
    <div className="mdi-prev">
      {blocks.slice(0, 14).map((b) => (
        <div key={b.id} className={'mdi-b mdi-' + b.type} style={b.indent ? { paddingLeft: b.indent * 16 } : null}>
          {b.type === 'bullet' && <span className="mdi-m">{b.num ? b.num + '.' : '•'}</span>}
          {b.type === 'todo' && <span className={'mdi-ck' + (b.done ? ' on' : '')} />}
          {b.type === 'divider' ? <hr /> : b.type === 'table' ? <span className="tiny muted">표 {b.rows.length}줄 × {b.rows[0]?.length || 0}칸 · {b.rows[0]?.join(' | ')}</span> : b.type === 'code' ? <code>{b.text.split('\n').slice(0, 3).join('\n')}</code> : <span className="mdi-t"><Inline text={b.text.split('\n')[0]} /></span>}
        </div>
      ))}
      {blocks.length > 14 && <div className="tiny muted">… {blocks.length - 14}줄 더</div>}
    </div>
  )
}

export default function MdImport({ close, noteId }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([]) // [{ name, text }]
  const target = noteId && find('notes', noteId)
  const parsed = useMemo(() => (files.length ? files.map((f) => ({ ...mdToNote(f.text, f.name), name: f.name })) : text.trim() ? [{ ...mdToNote(text, ''), name: '' }] : []), [files, text])
  const pick = async () => {
    // 아이폰·아이패드는 형식 지정이 있으면 .md 가 흐리게 나와 고를 수 없어서 모든 파일을 열고 여기서 거름
    const fs = await pickFiles('', !target)
    if (!fs.length) return
    const ok = fs.filter(isText), bad = fs.length - ok.length
    if (bad) toast(`${bad}개는 마크다운·텍스트 파일이 아니라 뺐어요`)
    try { setFiles(await Promise.all(ok.map(async (f) => ({ name: f.name, text: await readText(f) })))) } catch (e) { toast('파일을 읽지 못했어요 · ' + e.message) }
  }
  const run = () => {
    if (!parsed.length) return
    if (target) {
      const n = find('notes', noteId); if (!n) return
      const add = linkTodos(files.length ? files.flatMap((f) => mdToBlocks(f.text)) : mdToBlocks(text), n)
      if (!add.length) return toast('가져올 내용이 없어요')
      const cur = (n.blocks || []).filter((b, i, a) => !(i === a.length - 1 && b.type === 'text' && !b.text))
      patch('notes', n.id, { blocks: [...cur, ...add] })
      close(); return toast(`${add.length}줄을 붙였어요`)
    }
    const made = batch(() => (files.length ? files.map((f) => importMarkdown(f.text, f.name)) : [importMarkdown(text, '')]))
    close()
    toast(made.length === 1 ? `‘${made[0].title}’ 페이지로 가져왔어요` : `${made.length}개 페이지로 가져왔어요`)
    if (made.length === 1) openNote(made[0].id)
  }
  return (
    <div className="form">
      <div className="small muted">{target ? '이 페이지 아래에 붙여요.' : '파일마다 새 페이지가 생겨요.'} 제목·목록(들여쓰기·번호)·체크(할 일로 연결)·인용·강조 상자·코드·표·구분선을 블록으로 바꿔요.</div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn grow" onClick={pick}><Icon name="upload" size={15} />{files.length ? '다른 파일 고르기' : '.md 파일 고르기'}</button>
        {files.length > 0 && <button className="btn" onClick={() => setFiles([])}>파일 빼기</button>}
      </div>
      {!files.length && <textarea className="input" style={{ minHeight: 140, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} placeholder={'또는 여기에 붙여 넣기\n\n# 제목\n- 목록\n  - 들여쓴 목록\n- [ ] 할 일\n> [!tip] 강조 상자'} value={text} onChange={(e) => setText(e.target.value)} />}
      {parsed.map((p, k) => (
        <div key={k} className="mdi-card">
          <div className="row between" style={{ gap: 8 }}><b className="ellipsis" style={{ fontWeight: 'var(--fw-b)' }}>{target ? (p.name ? cleanName(p.name) : '붙일 내용') : p.title}</b><span className="tiny muted nowrap">{p.blocks.length}줄</span></div>
          <div className="tiny muted">{mdSummary(p.blocks) || '본문'}</div>
          {parsed.length <= 3 && <Preview blocks={target ? mdToBlocks(files.length ? files[k].text : text) : p.blocks} />}
        </div>
      ))}
      <button className="btn primary" disabled={!parsed.length} onClick={run}>{target ? '이 페이지에 붙이기' : parsed.length > 1 ? `${parsed.length}개 페이지로 가져오기` : '새 페이지로 가져오기'}</button>
    </div>
  )
}
