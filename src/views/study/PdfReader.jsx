// 교재 PDF 읽기: 읽은 쪽이 교재 진도에 자동 기록 (PDF 는 이 기기에만 저장)
import { useEffect, useRef, useState } from 'react'
import { get, set, del } from 'idb-keyval'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { find, patch } from '../../store/store.js'
import { setTextbookProgress } from '../../store/actions.js'
import { toast } from '../../components/ui.jsx'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
export const pdfKey = (id) => 'pdf:' + id
export const hasPdf = async (id) => !!(await get(pdfKey(id)).catch(() => null))
export async function savePdf(id, file) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('PDF 파일만 넣을 수 있어요')
  await set(pdfKey(id), file)
  patch('textbooks', id, { pdf: { name: file.name, size: file.size, offset: find('textbooks', id)?.pdf?.offset || 0 } })
}
export const removePdf = (id) => del(pdfKey(id))

export default function PdfReader({ id }) {
  const tb = find('textbooks', id)
  const canvas = useRef(null), wrap = useRef(null), doc = useRef(null), task = useRef(null)
  const [n, setN] = useState(0)
  const [page, setPage] = useState(tb?.pdf?.page || 1)
  const [err, setErr] = useState(null)
  const offset = tb?.pdf?.offset || 0

  useEffect(() => {
    let dead = false
    ;(async () => {
      const blob = await get(pdfKey(id)).catch(() => null)
      if (!blob) return setErr('이 기기에 PDF 가 없어요. 진도 카드에서 PDF 를 넣어 주세요.')
      try {
        const d = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise
        if (dead) return d.destroy()
        doc.current = d; setN(d.numPages)
        if (!tb?.pdf?.pages) patch('textbooks', id, { pdf: { ...(find('textbooks', id)?.pdf || {}), pages: d.numPages } })
      } catch { setErr('PDF 를 열 수 없어요') }
    })()
    return () => { dead = true; doc.current?.destroy(); doc.current = null }
  }, [id]) // eslint-disable-line

  // 쪽 그리기 (화면 폭에 맞춤, 선명하게)
  useEffect(() => {
    const d = doc.current
    if (!d || !n) return
    let cancelled = false
    ;(async () => {
      const p = await d.getPage(Math.min(Math.max(1, page), n))
      if (cancelled) return
      const w = wrap.current?.clientWidth || 360
      const v1 = p.getViewport({ scale: 1 }), scale = w / v1.width, dpr = Math.min(3, window.devicePixelRatio || 1)
      const v = p.getViewport({ scale: scale * dpr })
      const c = canvas.current; c.width = v.width; c.height = v.height; c.style.width = w + 'px'; c.style.height = v.height / dpr + 'px'
      task.current?.cancel?.()
      task.current = p.render({ canvasContext: c.getContext('2d'), viewport: v })
      await task.current.promise.catch(() => {})
    })()
    return () => { cancelled = true }
  }, [page, n])

  // 읽은 쪽 기록: 2초 머문 쪽만, 진도는 앞으로만
  useEffect(() => {
    if (!n) return
    const tm = setTimeout(() => {
      const cur = find('textbooks', id)
      patch('textbooks', id, { pdf: { ...(cur.pdf || {}), page } })
      const book = page + (cur.pdf?.offset || 0)
      if (book > (cur.current || 0) && book <= (cur.total || Infinity)) setTextbookProgress(id, book)
    }, 2000)
    return () => clearTimeout(tm)
  }, [page, n, id])

  const go = (p) => setPage((x) => Math.min(Math.max(1, typeof p === 'function' ? p(x) : p), n || 1))
  const sw = useRef(null)
  const onTouchStart = (e) => { const t = e.touches[0]; sw.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = (e) => { const s = sw.current; sw.current = null; if (!s) return; const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) go((x) => x + (dx < 0 ? 1 : -1)) }
  useEffect(() => { const k = (e) => { if (e.key === 'ArrowRight' || e.key === 'PageDown') go((x) => x + 1); if (e.key === 'ArrowLeft' || e.key === 'PageUp') go((x) => x - 1) }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [n]) // eslint-disable-line

  if (err) return <div className="small muted">{err}</div>
  return (
    <div className="col pdf-reader">
      <div className="row between pdf-bar">
        <button className="btn sm" onClick={() => go((x) => x - 1)} disabled={page <= 1}>‹ 이전</button>
        <span className="small">
          <input className="input pdf-pg" type="number" inputMode="numeric" value={page} onChange={(e) => e.target.value && go(+e.target.value)} /> / {n || '…'}
          <span className="muted tiny"> · 교재 {page + offset}{tb?.unit || 'p'}</span>
        </span>
        <button className="btn sm" onClick={() => go((x) => x + 1)} disabled={page >= n}>다음 ›</button>
      </div>
      <div className="pdf-page" ref={wrap} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left; if (x < r.width * 0.25) go((p) => p - 1); else if (x > r.width * 0.75) go((p) => p + 1) }}>
        <canvas ref={canvas} />
      </div>
      <div className="row between tiny muted">
        <span>좌우로 밀거나 가장자리를 눌러 넘겨요 · 2초 머문 쪽까지 진도에 기록</span>
        <label className="row" style={{ gap: 4 }}>PDF 1쪽 = 교재
          <input className="input pdf-pg" type="number" inputMode="numeric" defaultValue={1 + offset} onBlur={(e) => { const v = +e.target.value; if (v) { patch('textbooks', id, { pdf: { ...(find('textbooks', id).pdf || {}), offset: v - 1 } }); toast('쪽 번호 맞춤 저장') } }} />쪽</label>
      </div>
    </div>
  )
}
