// 가져오기: 마크다운·텍스트·CSV · 노션/옵시디언 zip · HTML · Word(.docx) · PDF → 미리 보고 → 새 페이지 / 지금 페이지 아래에 붙이기
import { useMemo, useState } from 'react'
import { put, patch, find, batch } from '../store/store.js'
import { mdToBlocks, mdToNote, mdSummary, cleanName } from '../lib/md.js'
import { linkTodos } from '../lib/notes.js'
import { pickFiles } from '../lib/files.js'
import { openNote } from '../nav.js'
import { toast, Icon, Toggle } from './ui.jsx'
import { Inline } from './BlockEditor.jsx'

// 파일 글자 읽기: UTF-8 이 깨지면 EUC-KR 로 다시 (한글 윈도우에서 만든 .txt·.md)
async function readText(f) {
  const buf = await f.arrayBuffer()
  const u8 = new TextDecoder('utf-8').decode(buf)
  if (!/�/.test(u8)) return u8
  try { return new TextDecoder('euc-kr').decode(buf) } catch { return u8 }
}
const isText = (f) => /\.(md|markdown|mdown|mkd|txt|csv|tsv)$/i.test(f.name) || /^text\/(plain|markdown|csv)/.test(f.type || '')
const isRich = (f) => /\.(zip|html?|docx|pdf)$/i.test(f.name)
const isImg = (f) => /\.(png|jpe?g|gif|webp|heic)$/i.test(f.name) || /^image\//.test(f.type || '')
const KINDS = '.md · .csv · .zip(노션·옵시디언) · .html · .docx · .pdf · .md 와 그림을 함께'

export function importMarkdown(text, fileName, { subjectId = null, parentId = null } = {}) {
  const { title, blocks } = mdToNote(text, fileName)
  const n = put('notes', { title, type: 'page', subjectId, parentId, blocks: [] })
  patch('notes', n.id, { blocks: linkTodos(blocks, n) })
  return n
}

// 미리보기: 앞쪽 블록 몇 개를 실제 노트 모양으로
const LABEL = { file: '그림', page: '하위 페이지', board: '보드', link: '링크', embed: '임베드', cols: '두 단' }
function Preview({ blocks }) {
  return (
    <div className="mdi-prev">
      {blocks.slice(0, 14).map((b) => (
        <div key={b.id} className={'mdi-b mdi-' + b.type} style={b.indent ? { paddingLeft: b.indent * 16 } : null}>
          {b.type === 'bullet' && <span className="mdi-m">{b.num ? b.num + '.' : '•'}</span>}
          {b.type === 'todo' && <span className={'mdi-ck' + (b.done ? ' on' : '')} />}
          {b.type === 'divider' ? (b.text ? <span className="tiny muted">― {b.text} ―</span> : <hr />)
            : b.type === 'table' ? <span className="tiny muted">표 {b.rows.length}줄 × {b.rows[0]?.length || 0}칸 · {b.rows[0]?.join(' | ')}</span>
            : b.type === 'toggle' ? <span className="mdi-t">▸ <Inline text={b.text} /> <span className="tiny muted">· {b.children?.length || 0}줄</span></span>
            : b.type === 'code' ? <code>{(b.text || '').split('\n').slice(0, 3).join('\n')}</code>
            : LABEL[b.type] ? <span className="tiny muted">[{LABEL[b.type]}]</span>
            : <span className="mdi-t"><Inline text={(b.text || '').split('\n')[0]} /></span>}
        </div>
      ))}
      {blocks.length > 14 && <div className="tiny muted">… {blocks.length - 14}줄 더</div>}
    </div>
  )
}

export default function MdImport({ close, noteId }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([]) // 글 파일 [{ name, text }]
  const [rich, setRich] = useState([]) // 그 밖의 파일 (File)
  const [loose, setLoose] = useState([]) // 그림과 함께 고른 .md (옵시디언처럼 ![[그림]] 연결)
  const [plan, setPlan] = useState(null), [busy, setBusy] = useState(''), [pdfImg, setPdfImg] = useState(false)
  const target = noteId && find('notes', noteId)
  const parsed = useMemo(() => (files.length ? files.map((f) => ({ ...mdToNote(f.text, f.name), name: f.name })) : text.trim() ? [{ ...mdToNote(text, ''), name: '' }] : []), [files, text])
  const build = async (rs, tf, img = pdfImg, lf = loose) => {
    if (!rs.length && !lf.length) { setPlan(null); return }
    setBusy('읽는 중…')
    try {
      const m = await import('../lib/importers.js')
      const plans = []
      for (const f of rs) {
        const n = f.name.toLowerCase()
        plans.push(n.endsWith('.zip') ? await m.planFromZip(f) : n.endsWith('.docx') ? await m.planFromDocx(f) : n.endsWith('.pdf') ? await m.planFromPdf(f, { pagesAsImages: img }) : m.planFromHtml(await readText(f), f.name))
      }
      if (lf.length) plans.push(await m.planFromFileList(lf))
      else for (const t of tf) plans.push(m.planFromText(t.text, t.name))
      setPlan(m.mergePlans(plans))
    } catch (e) { toast('파일을 읽지 못했어요 · ' + e.message); setPlan(null) }
    setBusy('')
  }
  const pick = async () => {
    // 아이폰·아이패드는 형식 지정이 있으면 .md 가 흐리게 나와 고를 수 없어서 모든 파일을 열고 여기서 거름
    const fs = await pickFiles('', true)
    if (!fs.length) return
    const ok = fs.filter((f) => isText(f) || isRich(f) || isImg(f)), bad = fs.length - ok.length
    if (bad) toast(`${bad}개는 가져올 수 없는 형식이라 뺐어요`)
    try {
      const tf = await Promise.all(ok.filter(isText).map(async (f) => ({ name: f.name, text: await readText(f) })))
      const rs = ok.filter(isRich), ims = ok.filter(isImg)
      const lf = ims.length && tf.length ? [...ok.filter(isText), ...ims] : []
      if (ims.length && !tf.length && !rs.length) toast('그림만 고르면 가져올 수 없어요 · .md 와 함께 골라 주세요')
      setFiles(tf); setRich(rs); setLoose(lf)
      await build(rs, tf, pdfImg, lf)
    } catch (e) { toast('파일을 읽지 못했어요 · ' + e.message) }
  }
  const run = async () => {
    if (plan) {
      setBusy('가져오는 중…')
      const m = await import('../lib/importers.js')
      try {
        if (target) { const r = await m.commitIntoNote(plan, noteId); close(); toast(r.sub ? `${r.blocks}줄을 붙이고 하위 페이지 ${r.sub}개를 만들었어요` : `${r.blocks}줄을 붙였어요`); return }
        const made = await m.commitPlan(plan, { subjectId: null })
        close()
        const tops = made.filter((n) => !n.parentId)
        toast(made.length === 1 ? `‘${made[0].title}’ 페이지로 가져왔어요` : `${made.length}개 페이지로 가져왔어요`)
        if (tops.length === 1) openNote(tops[0].id)
      } catch (e) { toast('가져오지 못했어요 · ' + e.message); setBusy('') }
      return
    }
    if (!parsed.length) return
    if (target) {
      const n = find('notes', noteId); if (!n) return
      const add = linkTodos(files.length ? files.flatMap((f) => (/\.(csv|tsv)$/i.test(f.name) ? mdToNote(f.text, f.name).blocks : mdToBlocks(f.text))) : mdToBlocks(text), n)
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
  const reset = () => { setFiles([]); setRich([]); setLoose([]); setPlan(null) }
  const hasPdf = rich.some((f) => /\.pdf$/i.test(f.name))
  const n = plan ? plan.pages.length : parsed.length
  return (
    <div className="form">
      <div className="small muted">{target ? '이 페이지 아래에 붙여요.' : '파일마다 새 페이지가 생기고, 노션·옵시디언 zip 은 폴더·하위 페이지 구조와 그림까지 가져와요.'} 제목·목록·체크(할 일로 연결)·인용·강조 상자·코드·표·접는 글·구분선을 블록으로 바꿔요.</div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn grow" onClick={pick} disabled={!!busy}><Icon name="upload" size={15} />{files.length || rich.length ? '다른 파일 고르기' : '파일 고르기'}</button>
        {(files.length > 0 || rich.length > 0) && <button className="btn" onClick={reset}>파일 빼기</button>}
      </div>
      <div className="tiny muted">{KINDS} · 여러 개 함께 골라도 돼요</div>
      {hasPdf && <Toggle checked={pdfImg} onChange={(v) => { setPdfImg(v); build(rich, files, v) }} label="PDF 쪽을 그림으로도 넣기 (글자와 함께)" />}
      {!files.length && !rich.length && <textarea className="input" style={{ minHeight: 140, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} placeholder={'또는 여기에 붙여 넣기\n\n# 제목\n- 목록\n  - 들여쓴 목록\n- [ ] 할 일\n> [!tip] 강조 상자'} value={text} onChange={(e) => setText(e.target.value)} />}
      {busy && <div className="small muted">{busy}</div>}
      {plan ? <>
        <div className="mdi-card"><div className="small">{plan.summary}</div></div>
        {plan.pages.slice(0, 6).map((p) => (
          <div key={p.key} className="mdi-card">
            <div className="row between" style={{ gap: 8 }}><b className="ellipsis" style={{ fontWeight: 'var(--fw-b)' }}>{p.parent ? '↳ ' : ''}{p.title}</b><span className="tiny muted nowrap">{p.blocks.length}줄</span></div>
            <div className="tiny muted">{mdSummary(p.blocks) || '본문'}</div>
            {plan.pages.length <= 2 && <Preview blocks={p.blocks} />}
          </div>
        ))}
        {plan.pages.length > 6 && <div className="tiny muted">… 페이지 {plan.pages.length - 6}개 더</div>}
      </> : parsed.map((p, k) => (
        <div key={k} className="mdi-card">
          <div className="row between" style={{ gap: 8 }}><b className="ellipsis" style={{ fontWeight: 'var(--fw-b)' }}>{target ? (p.name ? cleanName(p.name) : '붙일 내용') : p.title}</b><span className="tiny muted nowrap">{p.blocks.length}줄</span></div>
          <div className="tiny muted">{mdSummary(p.blocks) || '본문'}</div>
          {parsed.length <= 3 && <Preview blocks={target && !/\.(csv|tsv)$/i.test(p.name) ? mdToBlocks(files.length ? files[k].text : text) : p.blocks} />}
        </div>
      ))}
      <button className="btn primary" disabled={!n || !!busy} onClick={run}>{target ? '이 페이지에 붙이기' : n > 1 ? `${n}개 페이지로 가져오기` : '새 페이지로 가져오기'}</button>
    </div>
  )
}
