// KaTeX 수식: 처음 쓸 때만 받아 옴 (앱 시작은 가볍게)
let K = null, P = null
export const loadKatex = () => (P ||= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([m]) => (K = m.default || m)))
// 이미 받아 둔 경우 수식 HTML (아직이면 null)
export const texHtml = (tex, block) => {
  if (!K) return null
  try { return K.renderToString(tex || '', { displayMode: !!block, throwOnError: false, errorColor: '#b0706f', strict: 'ignore', output: 'html' }) } catch { return null }
}
export const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css'
