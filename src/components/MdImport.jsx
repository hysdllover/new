// 마크다운 가져오기: .md 파일(여러 개) 또는 붙여 넣은 글 → 새 페이지 / 지금 페이지 아래에 붙이기
import { useState } from 'react'
import { put, patch, find, batch } from '../store/store.js'
import { toggleTask } from '../store/actions.js'
import { mdToBlocks, mdToNote } from '../lib/md.js'
import { commitBlock } from '../lib/notes.js'
import { pickFiles } from '../lib/files.js'
import { openNote } from '../nav.js'
import { toast, Icon } from './ui.jsx'

// 체크 줄은 할 일로 연결 (완료 표시된 줄은 완료 상태로)
const linkTodos = (blocks, note) => blocks.map((b) => {
  if (b.type !== 'todo') return b
  const { done, ...rest } = b
  const nb = commitBlock(rest, note)
  if (done && nb.taskId) toggleTask(nb.taskId)
  return nb
})

export function importMarkdown(text, fileName, { subjectId = null, parentId = null } = {}) {
  const { title, blocks } = mdToNote(text, fileName)
  const n = put('notes', { title, type: 'page', subjectId, parentId, blocks: [] })
  patch('notes', n.id, { blocks: linkTodos(blocks, n) })
  return n
}

export default function MdImport({ close, noteId }) {
  const [text, setText] = useState('')
  const target = noteId && find('notes', noteId)
  const fromFiles = async () => {
    const fs = await pickFiles('.md,.markdown,.txt,text/markdown,text/plain', !target)
    if (!fs.length) return
    const texts = await Promise.all(fs.map((f) => f.text().then((t) => [t, f.name])))
    if (target) return append(texts.map(([t]) => t).join('\n\n'))
    const made = batch(() => texts.map(([t, name]) => importMarkdown(t, name, { subjectId: null })))
    close(); toast(made.length === 1 ? `‘${made[0].title}’ 페이지로 가져왔어요` : `${made.length}개 페이지로 가져왔어요`)
    if (made.length === 1) openNote(made[0].id)
  }
  const append = (t) => {
    const n = find('notes', noteId); if (!n) return
    const add = linkTodos(mdToBlocks(t), n)
    if (!add.length) return toast('가져올 내용이 없어요')
    const cur = (n.blocks || []).filter((b, i, a) => !(i === a.length - 1 && b.type === 'text' && !b.text))
    patch('notes', n.id, { blocks: [...cur, ...add] })
    close(); toast(`${add.length}줄을 붙였어요`)
  }
  const fromText = () => {
    if (!text.trim()) return
    if (target) return append(text)
    const n = importMarkdown(text, '')
    close(); toast(`‘${n.title}’ 페이지로 가져왔어요`); openNote(n.id)
  }
  return (
    <div className="form">
      <div className="small muted">{target ? '이 페이지 아래에 붙여요.' : '파일마다 새 페이지가 생겨요.'} 제목·목록·체크(할 일로 연결)·인용·강조 상자(&gt; [!note])·표·구분선을 블록으로 바꿔요.</div>
      <button className="btn" onClick={fromFiles}><Icon name="upload" size={15} />{target ? '.md 파일 고르기' : '.md 파일 고르기 (여러 개 가능)'}</button>
      <textarea className="input" style={{ minHeight: 160, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} placeholder={'또는 여기에 붙여 넣기\n\n# 제목\n- 목록\n- [ ] 할 일'} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn primary" disabled={!text.trim()} onClick={fromText}>{target ? '이 페이지에 붙이기' : '새 페이지로 가져오기'}</button>
    </div>
  )
}
