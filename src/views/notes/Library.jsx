import { useState } from 'react'
import { useColl, patch } from '../../store/store.js'
import { Icon, Empty, Card, openSheet, toast, Field, confirmSheet } from '../../components/ui.jsx'
import { SubjectSelect, SubjectTag } from '../../components/common.jsx'
import { FileThumb, FilePreview } from '../../components/Attach.jsx'
import { addFile, pickFiles, deleteFile, fmtSize } from '../../lib/files.js'
import { openNote } from '../../nav.js'
import { openDetail } from '../../components/ui.jsx'

// 학습 자료 라이브러리: 과목·단원·태그로 묶고 할 일/노트에서 참조
export default function Library() {
  const files = useColl('files')
  const subjects = useColl('subjects')
  const tasks = useColl('tasks')
  const notes = useColl('notes')
  const [sub, setSub] = useState(null)
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const typeOf = (f) => f.type?.startsWith('image') ? 'image' : f.type?.includes('pdf') ? 'pdf' : f.type?.includes('html') ? 'html' : 'etc'
  const list = files.filter((f) => (!sub || f.subjectId === sub) && (type === 'all' || typeOf(f) === type) && (!q || f.name.includes(q) || f.unit?.includes(q) || f.tags?.some((t) => t.includes(q))))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const upload = async () => {
    const fs = await pickFiles()
    let n = 0
    for (const f of fs) { try { await addFile(f, { subjectId: sub }); n++ } catch (e) { toast(e.message) } }
    if (n) toast(`${n}개 업로드`)
  }
  const units = [...new Set(list.map((f) => f.unit).filter(Boolean))]
  return (
    <div className="col">
      <div className="row wrap" style={{ gap: 6 }}>
        <input className="input grow" style={{ minWidth: 140 }} placeholder="파일·단원·태그 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary" onClick={upload}><Icon name="upload" size={16} />업로드</button>
      </div>
      <div className="scroll-x"><div className="row" style={{ gap: 6 }}>
        <button className={'chip' + (!sub ? ' on' : '')} onClick={() => setSub(null)}>전체</button>
        {subjects.map((s) => <button key={s.id} className={'chip' + (sub === s.id ? ' on' : '')} onClick={() => setSub(s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}
        <span style={{ width: 8 }} />
        {[['all', '모든 형식'], ['image', '사진'], ['pdf', 'PDF'], ['html', 'HTML']].map(([k, l]) => <button key={k} className={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{l}</button>)}
      </div></div>
      {units.length > 0 && <div className="row wrap tiny muted" style={{ gap: 6 }}>단원: {units.map((u) => <button key={u} className="chip" onClick={() => setQ(u)}>{u}</button>)}</div>}
      <div className="lib-grid">
        {list.map((f) => {
          const usedT = tasks.filter((t) => t.files?.includes(f.id)).length
          const usedN = notes.filter((n) => (n.blocks || []).some((b) => b.fileId === f.id)).length
          return (
            <Card key={f.id} className="lib-card" onClick={() => openSheet(() => <FileDetail id={f.id} />, { title: f.name, full: true })}>
              <FileThumb file={f} size={'100%'} onClick={() => {}} />
              <div className="ellipsis small" style={{ marginTop: 6 }}>{f.name}</div>
              <div className="row wrap tiny muted" style={{ gap: 4 }}><SubjectTag id={f.subjectId} subjects={subjects} />{f.unit && <span>{f.unit}</span>}{(usedT + usedN) > 0 && <span>🔗{usedT + usedN}</span>}</div>
            </Card>
          )
        })}
      </div>
      {!list.length && <Empty>사진·PDF·HTML 자료를 올려 과목과 단원으로 정리하세요</Empty>}
    </div>
  )
}

function FileDetail({ id }) {
  const f = useColl('files').find((x) => x.id === id)
  const tasks = useColl('tasks'), notes = useColl('notes')
  if (!f) return <Empty>삭제된 파일</Empty>
  const up = (p) => patch('files', id, p)
  const usedT = tasks.filter((t) => t.files?.includes(id))
  const usedN = notes.filter((n) => (n.blocks || []).some((b) => b.fileId === id))
  return (
    <div className="col">
      <div className="row wrap">
        <div style={{ flex: 1, minWidth: 130 }}><SubjectSelect value={f.subjectId} onChange={(v) => up({ subjectId: v })} /></div>
        <input className="input" style={{ flex: 1, minWidth: 110 }} placeholder="단원" value={f.unit || ''} onChange={(e) => up({ unit: e.target.value })} />
      </div>
      <Field label="태그 (쉼표)"><input className="input" defaultValue={(f.tags || []).join(', ')} onBlur={(e) => up({ tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
      {(usedT.length > 0 || usedN.length > 0) && (
        <div className="row wrap small" style={{ gap: 6 }}>사용 중:
          {usedT.map((t) => <button key={t.id} className="chip" onClick={() => openDetail('task', t.id)}>☐ {t.title}</button>)}
          {usedN.map((n) => <button key={n.id} className="chip" onClick={() => openNote(n.id)}>📄 {n.title}</button>)}
        </div>
      )}
      <div className="small muted">{fmtSize(f.size)} · {f.date}{f.gist ? ' · 동기화됨' : ''}</div>
      <FilePreview file={f} />
      <button className="btn danger" onClick={() => confirmSheet('파일 삭제', `'${f.name}'을 삭제할까요?`, () => deleteFile(id), '삭제')}>삭제</button>
    </div>
  )
}
