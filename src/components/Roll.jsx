// 숫자가 바뀔 때 바뀐 글자만 살짝 굴러 올라옴 (처음 그릴 때는 그대로)
import { useEffect, useRef } from 'react'

export function Roll({ value }) {
  const ready = useRef(false)
  useEffect(() => { ready.current = true }, [])
  return <span className="roll" aria-label={String(value)}>{[...String(value)].map((ch, i) => <span key={i + ':' + ch} className={'roll-ch' + (ready.current ? ' in' : '')} aria-hidden="true">{ch}</span>)}</span>
}
