// 숫자가 바뀔 때 바뀐 글자만 살짝 굴러 올라옴 (처음 그릴 때는 그대로)
import { useEffect, useRef, useState } from 'react'

export function Roll({ value }) {
  const ready = useRef(false)
  useEffect(() => { ready.current = true }, [])
  return <span className="roll" aria-label={String(value)}>{[...String(value)].map((ch, i) => <span key={i + ':' + ch} className={'roll-ch' + (ready.current ? ' in' : '')} aria-hidden="true">{ch}</span>)}</span>
}

// 처음 열 때 숫자가 0 에서 올라감 (0.4초) — 그 뒤 바뀔 때는 Roll 처럼 · 동작 줄이기면 바로 표시
export function CountUp({ to, fmt = (v) => String(Math.round(v)), ms = 400 }) {
  const [v, setV] = useState(() => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? null : 0))
  useEffect(() => {
    if (v === null) return
    const t0 = performance.now(); let raf = 0
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); setV(k >= 1 ? null : to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line
  return v === null ? <Roll value={fmt(to)} /> : <span className="roll">{fmt(v)}</span>
}
