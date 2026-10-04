// 하루 리포트 이미지 (1080폭, 길이는 내용만큼) — 앱 본문 폰트, 작고 얇은 글씨 · 가는 선 · 넉넉한 여백
const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export async function drawReport(d, secs, lines, title) {
  await document.fonts.ready.catch(() => {})
  const W = 1080, P = 104, IW = W - P * 2
  const bg = css('--bg', '#f7f6f2'), ink = css('--text', '#2b2a28'), soft = css('--muted', '#9a958c'), acc = css('--accent', '#4a5a78'), rule = css('--line', '#e4e0d8')
  const font = css('--font', '-apple-system, sans-serif')
  const LW = 300, TH = 200 // 본문 · 큰 숫자 굵기 (얇게)
  const f = (size, w = LW) => `${w} ${size}px ${font}`
  const c = document.createElement('canvas'), g = c.getContext('2d')
  const fit = (text, size, maxW) => { g.font = f(size); let s = String(text); if (g.measureText(s).width <= maxW) return s; while (s && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…' }
  const wrap = (text, size, maxW) => { g.font = f(size); const out = []; let cur = ''; for (const ch of String(text)) { if (g.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch } else cur += ch } if (cur) out.push(cur); return out }
  const spaced = (s, size, x, y, color, right) => { g.font = f(size, 400); g.fillStyle = color; const sp = size * 0.18; let w = 0; for (const ch of s) w += g.measureText(ch).width + sp; let cx = right ? x - w + sp : x; for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp } }
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  const dd0 = new Date(d.date + 'T00:00'), dateTxt = `${dd0.getFullYear()}. ${dd0.getMonth() + 1}. ${dd0.getDate()} (${'일월화수목금토'[dd0.getDay()]})`
  const pct = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)

  // 머리: 날짜 · DAILY REPORT + 가는 선
  add(58, (y0) => { g.font = f(24); g.fillStyle = soft; g.fillText(dateTxt, P, y0); spaced('DAILY REPORT', 18, W - P, y0 + 4, soft, true) })
  add(60, (y0) => { g.fillStyle = rule; g.fillRect(P, y0, IW, 1.5) })

  const secTitle = (k) => add(54, (y0) => { spaced(title(k, d).toUpperCase(), 18, P, y0, soft); g.fillStyle = rule; const tw2 = g.measureText(title(k, d)).width; g.fillRect(P, y0 + 40, IW, 1) })

  for (const k of secs) {
    if (k === 'study') {
      // 큰 공부 시간 + 목표·% + 가는 진행선 + 요약 숫자 셋
      add(118, (y0) => { g.font = f(104, TH); g.fillStyle = ink; g.fillText(hm(d.mins), P - 4, y0); const w = g.measureText(hm(d.mins)).width; g.font = f(26); g.fillStyle = soft; g.fillText(`/ ${hm(d.goal)}`, P + w + 18, y0 + 68); g.fillStyle = acc; const t2 = `${pct}%`; g.fillText(t2, W - P - g.measureText(t2).width, y0 + 68) })
      add(52, (y0) => { g.fillStyle = rule; g.fillRect(P, y0 + 14, IW, 2); g.fillStyle = acc; g.fillRect(P, y0 + 13, Math.max(4, IW * (pct / 100)), 4) })
      const stats = [['이번 주', hm(d.wk || 0)], ['공부 기록', String(d.sess?.length || 0)], ['끝낸 일', String(d.done.length)]]
      add(140, (y0) => { const cw = IW / 3; stats.forEach(([l, v], i) => { const x = P + cw * i; spaced(l, 16, x, y0, soft); g.font = f(40, TH); g.fillStyle = ink; g.fillText(v, x, y0 + 34) }) })
      continue
    }
    if (k === 'subjects') {
      if (!d.subs.length) continue
      secTitle(k); add(18, () => {})
      const mx = d.subs[0].m || 1
      for (const x of d.subs) {
        add(66, (y0) => { g.font = f(28); g.fillStyle = ink; g.fillText(fit(x.sub?.name || '과목 없음', 28, IW - 200), P, y0); const tv = hm(x.m); g.fillStyle = soft; g.fillText(tv, W - P - g.measureText(tv).width, y0); g.fillStyle = rule; g.fillRect(P, y0 + 46, IW, 1.5); g.fillStyle = x.sub?.color || acc; g.fillRect(P, y0 + 45, Math.max(4, IW * (x.m / mx)), 3.5) })
        for (const n of x.notes) for (const l of wrap(n, 22, IW)) add(34, (y0) => { g.font = f(22); g.fillStyle = soft; g.fillText(l, P, y0 - 6) })
      }
      add(30, () => {}); continue
    }
    if (k === 'hours') {
      if (!d.hours.some(Boolean)) continue
      secTitle(k); add(24, () => {})
      const mx = Math.max(60, ...d.hours), bh = 110
      add(bh + 64, (y0) => { const gap = 8, bw = (IW - gap * 17) / 18; d.hours.forEach((m, i) => { const h = Math.max(2, (m / mx) * bh); g.fillStyle = m ? acc : rule; g.globalAlpha = m ? 0.35 + 0.65 * (m / mx) : 1; g.fillRect(P + i * (bw + gap), y0 + bh - h, bw, h) }); g.globalAlpha = 1; g.font = f(18); g.fillStyle = soft; [6, 12, 18, 24].forEach((h, j) => { const tx = String(h); g.fillText(tx, P + (IW - g.measureText(tx).width) * (j / 3), y0 + bh + 14) }) })
      continue
    }
    const ls = lines(k, d)
    if (!ls.length) continue
    secTitle(k); add(22, () => {})
    // 목록이 길면 두 단으로
    const two = ls.length >= 6 && ls.every((l) => { g.font = f(26); return g.measureText(l).width < IW / 2 - 24 || true })
    const items = ls.map((l) => { const m = /^(✓|–|↺) /.exec(l); return { mark: m ? m[1] : '', text: m ? l.slice(2) : l } })
    if (two) {
      const half = Math.ceil(items.length / 2), colW = IW / 2 - 18
      for (let i = 0; i < half; i++) add(46, (y0) => [items[i], items[i + half]].forEach((it, j) => { if (!it) return; const x = P + j * (colW + 36); g.font = f(24); if (it.mark) { g.fillStyle = it.mark === '✓' ? acc : soft; g.fillText(it.mark, x, y0) } g.fillStyle = ink; g.fillText(fit(it.text, 24, colW - (it.mark ? 34 : 0)), x + (it.mark ? 34 : 0), y0) }))
    } else {
      for (const it of items) { const ws2 = wrap(it.text, 26, IW - (it.mark ? 36 : 0)); ws2.forEach((w2, i) => add(i < ws2.length - 1 ? 38 : 48, (y0) => { g.font = f(26); if (i === 0 && it.mark) { g.fillStyle = it.mark === '✓' ? acc : soft; g.fillText(it.mark, P, y0) } g.fillStyle = ink; g.fillText(w2, P + (it.mark ? 36 : 0), y0) })) }
    }
    add(30, () => {})
  }
  y += P - 30
  c.width = W; c.height = Math.max(Math.round(W * 0.8), y)
  g.fillStyle = bg; g.fillRect(0, 0, W, c.height); g.textBaseline = 'top'
  for (const op of ops) op()
  return await new Promise((res) => c.toBlob(res, 'image/png'))
}
