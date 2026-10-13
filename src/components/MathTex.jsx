// 수식(LaTeX) 보기 — KaTeX 는 수식이 처음 보일 때 받아 옴 · 받는 동안엔 원문
import { useEffect, useState } from 'react'
import { loadKatex, texHtml } from '../lib/katex.js'

export default function MathTex({ tex, block }) {
  const [, setV] = useState(0)
  const html = texHtml(tex, block)
  useEffect(() => { if (html == null) loadKatex().then(() => setV((x) => x + 1)).catch(() => {}) }, [html == null])
  if (html == null) return <span className={'math-src' + (block ? ' b' : '')}>{tex}</span>
  return <span className={block ? 'math-b' : 'math-i'} dangerouslySetInnerHTML={{ __html: html }} />
}
