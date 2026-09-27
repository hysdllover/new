import { useEffect, useState } from 'react'
import { useColl } from '../store/store.js'
import { addFile, blobUrl, getBlob, pickFiles, fmtSize } from '../lib/files.js'
import { Icon, openSheet, toast } from './ui.jsx'

// 링크 미리보기: 서버 없이 도메인·파비콘·제목
export function LinkPreview({ url, title, onRemove }) {
  let host = url
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch {}
  return (
    <div className="row link-card">
      <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} width="20" height="20" alt="" style={{ borderRadius: 4 }} onError={(e) => { e.target.style.visibility = 'hidden' }} />
      <a className="grow" href={url} target="_blank" rel="noreferrer">
        <div className="ellipsis">{title || host}</div>
        <div className="tiny muted ellipsis">{host}</div>
      </a>
      {onRemove && <button className="icon-btn" onClick={onRemove} aria-label="삭제"><Icon name="close" size={14} /></button>}
    </div>
  )
}

export function LinksEditor({ links = [], onChange }) {
  const [u, setU] = useState('')
  const add = () => {
    let v = u.trim()
    if (!v) return
    if (!/^https?:\/\//.test(v)) v = 'https://' + v
    onChange([...links, { url: v, title: '' }]); setU('')
  }
  return (
    <div className="col" style={{ gap: 6 }}>
      {links.map((l, i) => <LinkPreview key={i} url={l.url} title={l.title} onRemove={() => onChange(links.filter((_, j) => j !== i))} />)}
      <div className="row">
        <input className="input" placeholder="링크 붙여넣기" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add}><Icon name="link" size={16} /></button>
      </div>
    </div>
  )
}

export function FileThumb({ file, size = 56, onClick }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let u
    if (file.type?.startsWith('image')) blobUrl(file.id).then((x) => { u = x; setUrl(x) })
    return () => u && URL.revokeObjectURL(u)
  }, [file.id, file.type])
  const icon = file.type?.includes('pdf') ? 'PDF' : file.type?.includes('html') ? 'HTML' : 'FILE'
  return (
    <button className="thumb" style={{ width: size, height: size }} onClick={onClick || (() => previewFile(file))} title={file.name}>
      {url ? <img src={url} alt={file.name} /> : <span className="tiny muted">{icon}</span>}
    </button>
  )
}

export function previewFile(file) {
  openSheet(() => <FilePreview file={file} />, { title: file.name, full: true })
}

export function FilePreview({ file }) {
  const [url, setUrl] = useState(null)
  const [html, setHtml] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let u
    getBlob(file.id).then(async (b) => {
      if (!b) return setErr(true)
      if (file.type?.includes('html')) setHtml(await b.text())
      u = URL.createObjectURL(b); setUrl(u)
    }).catch(() => setErr(true))
    return () => u && URL.revokeObjectURL(u)
  }, [file.id, file.type])
  if (err) return <div className="empty">파일을 불러올 수 없어요. 동기화 후 다시 시도하세요.</div>
  if (!url) return <div className="empty">불러오는 중…</div>
  return (
    <div className="col" style={{ height: '100%' }}>
      <div className="row between small muted"><span>{fmtSize(file.size)} · {file.date}</span><a className="btn sm" href={url} target="_blank" rel="noreferrer" download={file.name}>열기</a></div>
      {file.type?.startsWith('image') && <img src={url} alt={file.name} style={{ maxWidth: '100%', borderRadius: 8 }} />}
      {file.type?.includes('pdf') && <iframe title={file.name} src={url} style={{ width: '100%', height: '70vh', border: 0, borderRadius: 8, background: '#fff' }} />}
      {html != null && <iframe title={file.name} sandbox="" srcDoc={html} style={{ width: '100%', height: '70vh', border: '1px solid var(--line)', borderRadius: 8, background: '#fff' }} />}
    </div>
  )
}

// 파일 id 배열 편집
export function FilesEditor({ ids = [], onChange, meta }) {
  const files = useColl('files')
  const mine = ids.map((id) => files.find((f) => f.id === id)).filter(Boolean)
  const add = async () => {
    const picked = await pickFiles()
    const added = []
    for (const f of picked) {
      try { added.push((await addFile(f, meta)).id) } catch (e) { toast(e.message) }
    }
    if (added.length) onChange([...ids, ...added])
  }
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {mine.map((f) => (
        <div key={f.id} style={{ position: 'relative' }}>
          <FileThumb file={f} />
          <button className="thumb-x" onClick={() => onChange(ids.filter((x) => x !== f.id))} aria-label="첨부 해제">✕</button>
        </div>
      ))}
      <button className="thumb add" onClick={add} aria-label="파일 첨부"><Icon name="plus" /></button>
    </div>
  )
}
