// 하루 리포트 이미지 (1080폭, 길이는 내용만큼) — 앱 본문 폰트·색 그대로
const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export async function drawReport(d, secs, lines, title) {
  await document.fonts.ready.catch(() => {})
  const W = 1080, P = 88, IW = W - P * 2
  const bg = css('--bg', '#f7f6f2'), ink = css('--text', '#2b2a28'), soft = css('--muted', '#9a958c'), acc = css('--accent', '#4a5a78'), line = css('--line', '#e4e0d8')
  const font = css('--font', '-apple-system, sans-serif'), fw = css('--fw', '300')
  const f = (size, w = fw) => `${w} ${size}px ${font}`
  const c = document.createElement('canvas'), g = c.getContext('2d')
  // 줄 바꿈
  const wrap = (text, size) => { g.font = f(size); const out = []; let cur = ''; for (const ch of String(text)) { if (g.measureText(cur + ch).width > IW && cur) { out.push(cur); cur = ch } else cur += ch } if (cur) out.push(cur); return out }
  // 1) 배치 계산
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  const dateTxt = new Date(d.date + 'T00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  add(64, (y0) => { g.fillStyle = soft; g.font = f(30, 400); g.fillText(dateTxt, P, y0); const r = '하루 리포트'; g.fillText(r, W - P - g.measureText(r).width, y0) })
  for (const k of secs) {
    if (k === 'study') { add(170, (y0) => { g.fillStyle = ink; g.font = f(120, 200); g.fillText(hm(d.mins), P - 4, y0); g.fillStyle = soft; g.font = f(32); g.fillText(`/ ${hm(d.goal)} · ${Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)}%`, P, y0 + 132) }); add(40, (y0) => { g.fillStyle = line; g.fillRect(P, y0, IW, 4); g.fillStyle = acc; g.fillRect(P, y0 - 3, IW * Math.min(1, d.mins / (d.goal || 1)), 10) }); continue }
    const ls = lines(k, d)
    if (k === 'hours') { if (!d.hours.some(Boolean)) continue; add(56, (y0) => { g.fillStyle = soft; g.font = f(28, 400); g.fillText('시간대', P, y0) }); const mx = Math.max(60, ...d.hours), bh = 120; add(bh + 50, (y0) => { const bw = (IW - 17 * 6) / 18; d.hours.forEach((m, i) => { const h = Math.max(3, (m / mx) * bh); g.fillStyle = m ? acc : line; g.globalAlpha = m ? 0.45 + 0.55 * (m / mx) : 1; g.fillRect(P + i * (bw + 6), y0 + bh - h, bw, h) }); g.globalAlpha = 1; g.fillStyle = soft; g.font = f(22); [6, 12, 18, 24].forEach((h, j) => g.fillText(String(h), P + (IW - 20) * (j / 3), y0 + bh + 12)) }); continue }
    if (!ls.length) continue
    add(56, (y0) => { g.fillStyle = soft; g.font = f(28, 400); g.fillText(title(k, d), P, y0) })
    for (const l of ls) for (const [i, w] of wrap(l, 34).entries()) add(i ? 46 : 50, (y0) => { g.fillStyle = ink; g.font = f(34); g.fillText(w, P, y0) })
    add(24, () => {})
  }
  y += P - 24
  // 2) 그리기
  c.width = W; c.height = Math.max(W * 0.75, y)
  g.fillStyle = bg; g.fillRect(0, 0, W, c.height); g.textBaseline = 'top'
  for (const op of ops) op()
  return await new Promise((res) => c.toBlob(res, 'image/png'))
}
