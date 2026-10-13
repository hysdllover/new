// 리포트 이미지 (1080폭, 길이는 내용만큼) — 앱 본문 폰트, 작고 얇은 글씨 · 가는 선 · 넉넉한 여백
// 테마: app(앱 색) · light · dark · paper
const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export const REPORT_THEMES = [['app', '앱 색'], ['light', '밝게'], ['dark', '어둡게'], ['paper', '종이']]
const PAL = {
  light: { bg: '#fbfaf7', ink: '#2c2f36', soft: '#9a968e', acc: '#55658a', rule: '#e6e2da' },
  dark: { bg: '#23272f', ink: '#e7e5e0', soft: '#8c919c', acc: '#b3a6cf', rule: '#383d48' },
  paper: { bg: '#f7f7f5', ink: '#33353a', soft: '#94958f', acc: '#6e7a52', rule: '#dedfd9', grain: true },
}
function palette(theme) {
  if (PAL[theme]) return PAL[theme]
  return { bg: css('--bg', '#f7f6f2'), ink: css('--text', '#2b2a28'), soft: css('--muted', '#9a958c'), acc: css('--accent', '#4a5a78'), rule: css('--line', '#e4e0d8') }
}
function setup(theme) {
  const T = palette(theme), font = css('--font', '-apple-system, sans-serif')
  const c = document.createElement('canvas'), g = c.getContext('2d')
  const f = (size, w = 300) => `${w} ${size}px ${font}`
  const spaced = (s, size, x, y, color, right) => { g.font = f(size, 400); g.fillStyle = color; const sp = size * 0.18; let w = 0; for (const ch of s) w += g.measureText(ch).width + sp; let cx = right ? x - w + sp : x; for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp } }
  return { T, c, g, f, spaced }
}
// 종이 결: 하얀 수채화지처럼 오톨도톨한 요철 (회색만, 누런 기 없음) — 실패하면 고운 입자
const RELIEF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Cfilter id='p' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.075' numOctaves='3' seed='7' stitchTiles='stitch'/%3E%3CfeDiffuseLighting lighting-color='%23fff' surfaceScale='1.1'%3E%3CfeDistantLight azimuth='225' elevation='68'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.36'/%3E%3C/svg%3E"
async function paperGrain(g, W, H) {
  try {
    const img = new Image(); img.src = RELIEF; await img.decode()
    const t = document.createElement('canvas'); t.width = t.height = 480; t.getContext('2d').drawImage(img, 0, 0)
    t.getContext('2d').getImageData(0, 0, 1, 1) // 그릴 수 없는 브라우저면 여기서 실패
    g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, W, H); return
  } catch {}
  const N = 256, t = document.createElement('canvas'); t.width = t.height = N
  const x = t.getContext('2d'), im = x.createImageData(N, N)
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() < 0.5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.random() * 18 }
  x.putImageData(im, 0, 0)
  g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, W, H)
}
const finish = async (c, g, T, ops, W, y, square) => {
  c.width = W; c.height = Math.max(Math.round(W * 0.8), y)
  g.fillStyle = T.bg; g.fillRect(0, 0, W, c.height); g.textBaseline = 'top'
  if (T.grain) await paperGrain(g, W, c.height)
  for (const op of ops) op()
  if (square) {
    // 정사각형: 내용 전체를 1080×1080 안에 줄여 가운데 배치
    const c2 = document.createElement('canvas'); c2.width = c2.height = W
    const g2 = c2.getContext('2d'); g2.fillStyle = T.bg; g2.fillRect(0, 0, W, W)
    if (T.grain) await paperGrain(g2, W, W)
    const k = Math.min(1, W / c.height), w2 = W * k, h2 = c.height * k
    g2.drawImage(c, (W - w2) / 2, (W - h2) / 2, w2, h2)
    return await new Promise((res) => c2.toBlob(res, 'image/png'))
  }
  return await new Promise((res) => c.toBlob(res, 'image/png'))
}

// 월 달력 칸 (칸 진하기 = 목표 대비, 칸 안에 공부 시간) → 높이
function calGrid(ctx, x0, y0, w, { month, values, goal, weekStartDow = 1, mono }, draw = true) {
  const { g, f, T } = ctx, hc = mono ? T.ink : T.acc
  const y = +month.slice(0, 4), mo = +month.slice(5, 7) - 1, n = new Date(y, mo + 1, 0).getDate()
  const lead = (new Date(y, mo, 1).getDay() - weekStartDow + 7) % 7, rows = Math.ceil((lead + n) / 7)
  const gap = 8, cw = (w - gap * 6) / 7, ch = Math.round(cw * 0.86), head = 40
  const h = head + rows * ch + (rows - 1) * gap
  if (!draw) return h
  g.font = f(18); g.fillStyle = T.soft
  for (let i = 0; i < 7; i++) { const s = '일월화수목금토'[(i + weekStartDow) % 7]; g.fillText(s, x0 + i * (cw + gap) + (cw - g.measureText(s).width) / 2, y0) }
  for (let d = 1; d <= n; d++) {
    const k = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, v = values[k] || 0, r = Math.min(1, v / ((typeof goal === 'function' ? goal(k) : goal) || 1))
    const p = lead + d - 1, cx = x0 + (p % 7) * (cw + gap), cy = y0 + head + Math.floor(p / 7) * (ch + gap)
    g.fillStyle = v ? hc : T.rule; g.globalAlpha = v ? (mono ? 0.08 + 0.5 * r : 0.14 + 0.66 * r) : 0.45
    g.beginPath(); g.roundRect ? g.roundRect(cx, cy, cw, ch, 10) : g.rect(cx, cy, cw, ch); g.fill(); g.globalAlpha = 1
    const dk = r >= (mono ? 0.85 : 0.6), tc = dk ? T.bg : T.ink
    g.font = f(18); g.fillStyle = dk ? T.bg : T.soft; g.fillText(String(d), cx + 12, cy + 10)
    if (v) { g.font = f(24); g.fillStyle = tc; const s = hm(v); g.fillText(s, cx + cw - 12 - g.measureText(s).width, cy + ch - 34) }
  }
  return h
}

// 흑백 인쇄풍: 모눈 위 가는 테두리 표 · 머리줄 영문 작은 글자 · 채도 낮은 포인트 색 조금 (화면·A4와 같은 표)
export async function drawReport(d, secs, lines, title, { theme = 'app', head = 'DAILY REPORT', dateTxt, square = false, barScale = 1, fontKey = '', sheetOf, EN = {} } = {}) {
  await document.fonts.ready.catch(() => {})
  // 날짜·큰 숫자 글꼴 (리포트 › 구성 › 글꼴)
  const { reportFamily, loadReportFont, reportScale } = await import('./reportFont.js'), handFam = reportFamily(fontKey), hs = reportScale(fontKey)
  const W = 1080, P = 84, IW = W - P * 2, K = 2.2, BW = 1.6, HH = 50
  const ctx = setup(theme), { T, c, g, f, spaced } = ctx
  const { ink, soft, acc, rule } = T
  const HC = [ink], OLIVE = '#7a8660', ROSE = '#c9a0a8'
  const fh = (size, w = 300) => `${w} ${Math.round(size * hs)}px ${handFam}`
  const fit = (text, font, maxW) => { g.font = font; let s = String(text); if (g.measureText(s).width <= maxW) return s; while (s && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…' }
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h) }
  const line = (x1, y1, x2, y2) => { g.fillStyle = ink; g.globalAlpha = 0.72; if (x1 === x2) g.fillRect(x1 - BW / 2, y1, BW, y2 - y1); else g.fillRect(x1, y1 - BW / 2, x2 - x1, BW); g.globalAlpha = 1 }
  const ops = []; let y = P, X0 = P, XW0 = IW // 차트 안쪽 여백 (그릴 때가 아니라 배치할 때 값)
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  // 모눈 (종이 전체)
  ops.push(() => { g.fillStyle = ink; g.globalAlpha = theme === 'dark' ? 0.07 : 0.05; for (let x = 0; x < W; x += 30) g.fillRect(x, 0, 1.2, c.height); for (let yy = 0; yy < c.height; yy += 30) g.fillRect(0, yy, W, 1.2); g.globalAlpha = 1 })
  if (!dateTxt) { const dd0 = new Date(d.date + 'T00:00'); dateTxt = `${dd0.getMonth() + 1}월 ${dd0.getDate()}일 ${'일월화수목금토'[dd0.getDay()]}요일` }
  await loadReportFont(fontKey, dateTxt + '0123456789:%D-AY')
  const pct = Math.round(Math.min(1, d.mins / (d.goal || 1)) * 100)
  add(40, (y0) => spaced(head, 17, P, y0, soft))
  add(104, (y0) => { g.font = fh(54); g.fillStyle = ink; g.fillText(dateTxt, P - 2, y0) })

  // 표 상자: 머리줄(옅은 색 바탕 · 영문 · 한글 제목) + 안쪽 → 바깥 테두리
  let bi = 0
  const box = (en, ko, inner, noHead) => {
    const y0 = y, hc = HC[bi++ % 3]
    const tint = (yy, h) => { g.fillStyle = hc; g.globalAlpha = theme === 'dark' ? 0.07 : 0.04; g.fillRect(P, yy, IW, h); g.globalAlpha = 1 }
    if (!noHead) add(HH, (yy) => { tint(yy, HH); spaced(en, 15, P + 22, yy + 17, soft); g.font = f(19); g.fillStyle = soft; g.fillText(ko, W - P - 22 - g.measureText(ko).width, yy + 15); line(P, yy + HH, W - P, yy + HH) })
    inner(tint)
    const h = y - y0
    ops.push(() => { g.strokeStyle = ink; g.globalAlpha = 0.72; g.lineWidth = BW; g.strokeRect(P, y0, IW, h); g.globalAlpha = 1 })
    add(30, () => {})
  }
  const xsOf = (cols) => { const fixed = cols.reduce((a, n) => a + n * K, 0), flex = IW - fixed, xs = [P]; cols.forEach((n) => xs.push(xs[xs.length - 1] + (n ? n * K : flex))); return xs }
  const tick = (cx, cy, col) => { g.strokeStyle = col; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx - 3, cy + 7); g.lineTo(cx + 11, cy - 9); g.stroke() }
  const starAt = (cx, cy, col) => { g.strokeStyle = col; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.6 : 11, a2 = -Math.PI / 2 + (i * Math.PI) / 5; g[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a2), cy + r * Math.sin(a2)) } g.closePath(); g.stroke() }
  const cellDraw = (cl, x0, x1, yy, rh) => {
    const w = x1 - x0, cy = yy + rh / 2, mid = (s, font, col) => { g.font = font; g.fillStyle = col; const s2 = fit(s, font, w - 20); g.fillText(s2, x0 + (w - g.measureText(s2).width) / 2, cy - 13) }
    if (cl.k === 'n') return mid(cl.t, f(22), cl.ink ? ink : soft)
    if (cl.k === 'dd') return mid(cl.t, fh(30, 400), cl.c || ROSE)
    if (cl.k === 'ok') { if (cl.t === '✓') tick(x0 + w / 2, cy, OLIVE); else if (cl.t) mid(cl.t, f(24), soft); return }
    let tx = x0 + 22
    if (cl.k === 'dot') { g.fillStyle = cl.c || soft; rr(tx, cy - 7, 14, 14, 3); g.fill(); tx += 28 }
    if (cl.star) { starAt(tx + 10, cy, cl.star === true ? ROSE : cl.star); tx += 34 }
    if (cl.k === 'note') { g.font = f(21); g.fillStyle = soft; g.fillText(fit(cl.t, f(21), x1 - tx - 40), tx + 30, cy - 12); return }
    const font = f(26); g.font = font; g.fillStyle = cl.dim ? soft : ink; g.fillText(fit(cl.t, font, x1 - tx - 18), tx, cy - 15)
  }
  const sheetT = (k, s) => box(EN[k] || '', title(k, d), (tint) => {
    const xs = xsOf(s.cols)
    if (s.head) add(HH, (yy) => { tint(yy, HH); s.head.forEach((h, j) => { if (j === 1) { spaced(h, 15, xs[1] + 22, yy + 17, soft); const ko = title(k, d); g.font = f(19); g.fillStyle = soft; g.fillText(ko, xs[2] - 22 - g.measureText(ko).width, yy + 15) } else { g.font = f(15, 400); const w0 = g.measureText(h).width + h.length * 2.7; spaced(h, 15, xs[j] + (xs[j + 1] - xs[j] - w0) / 2, yy + 17, soft) } if (j) line(xs[j], yy, xs[j], yy + HH) }); line(P, yy + HH, W - P, yy + HH) })
    if (s.stack) add(40, (yy) => { const tot = s.stack.reduce((a, x) => a + x.m, 0) || 1, gap = 4, avail = IW - 44 - gap * (s.stack.length - 1); let x = P + 22; s.stack.forEach((x2, j) => { const w = Math.max(6, avail * (x2.m / tot)); g.fillStyle = ink; g.globalAlpha = Math.max(0.15, 0.55 - j * 0.1); rr(x, yy + 16, w, 8, 4); g.fill(); x += w + gap }); g.globalAlpha = 1; line(P, yy + 40, W - P, yy + 40) })
    s.rows.forEach((r, ri) => {
      const note = r[0].k === 'note', rh = note ? 50 : 66, xr = note ? [P, W - P] : xs
      add(rh, (yy) => { if (ri) line(P, yy, W - P, yy); r.forEach((cl, j) => { cellDraw(cl, xr[j], xr[j + 1], yy, rh); if (j) line(xr[j], yy, xr[j], yy + rh) }) })
    })
  }, !!s.head)
  // 막대: 바닥선 + (있으면) 목표 점선
  const bars = (vals, labels, bh, goal) => { const X = X0, XW = XW0; add(bh + 66, (y0) => {
    const n = vals.length, gap = n > 20 ? 6 : 12, cw = (XW - gap * (n - 1)) / n, bw = Math.min((n > 20 ? 12 : 18) * barScale, cw), mx = Math.max(60, goal || 0, ...vals)
    vals.forEach((m, i) => { if (!m) return; const h = Math.max(4, (m / mx) * bh), x = X + i * (cw + gap) + (cw - bw) / 2; g.fillStyle = ink; g.globalAlpha = goal ? (m >= goal ? 0.6 : 0.35) : 0.25 + 0.4 * (m / mx); rr(x, y0 + bh - h, bw, h, [bw / 2, bw / 2, 2, 2]); g.fill(); if (n <= 7) { g.globalAlpha = 1; g.font = f(18); g.fillStyle = soft; const tv = hm(m); g.fillText(tv, x + bw / 2 - g.measureText(tv).width / 2, y0 + bh - h - 28) } })
    g.globalAlpha = 1; g.fillStyle = rule; g.fillRect(X, y0 + bh, XW, 1.5)
    if (goal) { const gy = y0 + bh - (goal / mx) * bh; g.strokeStyle = soft; g.globalAlpha = 0.6; g.lineWidth = 1.5; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X, gy); g.lineTo(X + XW, gy); g.stroke(); g.setLineDash([]); g.globalAlpha = 1 }
    g.font = f(18); g.fillStyle = soft; labels.forEach((l, i) => { if (!l) return; g.fillText(l, X + i * (cw + gap) + (cw - g.measureText(l).width) / 2, y0 + bh + 16) })
  }) }
  const chart = (k, fn) => box(EN[k] || '', title(k, d), () => { X0 = P + 28; XW0 = IW - 56; add(30, () => {}); fn(); add(14, () => {}); X0 = P; XW0 = IW })

  if (!secs.includes('dday') && d.ddays?.length && sheetOf) sheetT('dday', sheetOf('dday', d))
  for (const k of secs) {
    if (k === 'study') {
      const stats = d.stats || [['이번 주', hm(d.wk || 0)], ['공부 기록', String(d.sess?.length || 0)], ['끝낸 일', String(d.done.length)]]
      box('STUDY', title(k, d), () => {
        const lw = 64 * K
        add(170, (yy) => {
          spaced('TOTAL', 15, P + (lw - 70) / 2, yy + 76, soft); line(P + lw, yy, P + lw, yy + 170)
          const x0 = P + lw + 30; g.font = fh(92); g.fillStyle = ink; const tv = hm(d.mins); g.fillText(tv, x0, yy + 20); const w = g.measureText(tv).width
          g.font = f(26); g.fillStyle = soft; g.fillText(`/ ${hm(d.goal)}`, x0 + w + 16, yy + 70)
          g.font = f(34); g.fillStyle = acc; const t2 = `${pct}%`; g.fillText(t2, W - P - 30 - g.measureText(t2).width, yy + 56)
          const tw = W - P - 30 - x0, pw = Math.max(8, tw * (pct / 100)), pst = document.documentElement.dataset.prog
          g.fillStyle = rule; g.fillRect(x0, yy + 135, tw, 1.5)
          g.save(); rr(x0, yy + 131, pw, 9, 4.5); g.clip(); g.fillStyle = acc
          if (pst === 'pencil') { g.globalAlpha = 0.75; for (let x = x0 - 20; x < x0 + pw + 20; x += 6) { g.beginPath(); g.moveTo(x, yy + 143); g.lineTo(x + 7, yy + 128); g.lineTo(x + 10, yy + 128); g.lineTo(x + 3, yy + 143); g.fill() } }
          else if (pst === 'dot') { for (let x = x0; x < x0 + pw; x += 14) g.fillRect(x, yy + 132, 8, 7) }
          else g.fillRect(x0, yy + 132, pw, 7)
          g.restore(); g.globalAlpha = 1
        })
        add(104, (yy) => { line(P, yy, W - P, yy); const cw = IW / stats.length; stats.forEach(([l, v], i) => { const x = P + cw * i; if (i) line(x, yy, x, yy + 104); g.font = f(19); g.fillStyle = soft; g.fillText(l, x + 22, yy + 18); g.font = f(36, 200); g.fillStyle = ink; g.fillText(String(v), x + 22, yy + 48) }) })
      })
      continue
    }
    if (k === 'hours' && d.slots) {
      // 10분 플래너: 6~14시 · 15~23시 두 줄 묶음, 칸마다 과목 색
      if (!d.hours.some(Boolean)) continue
      chart(k, () => { const X = X0, XW = XW0, rh = 40, colW = (XW - 40) / 2, hw = 40; add(rh * 9 + 10, (y0) => {
        for (let h = 0; h < 18; h++) {
          const x0 = X + (h >= 9 ? colW + 40 : 0), yy = y0 + (h % 9) * rh, cw = (colW - hw) / 6
          g.fillStyle = rule; g.fillRect(x0, yy + rh, colW, 1.2)
          g.font = f(17); g.fillStyle = soft; g.fillText(String(h + 6), x0, yy + 11)
          for (let i = 0; i < 6; i++) { const s0 = d.slots[h * 6 + i], cx = x0 + hw + i * cw; if (s0.f) { g.fillStyle = ink; g.globalAlpha = 0.18 + 0.4 * s0.f; rr(cx + 1.5, yy + 11, cw - 3, rh - 22, 4); g.fill(); g.globalAlpha = 1 } }
        }
      }) })
      continue
    }
    if (k === 'hours') { if (!d.hours.some(Boolean)) continue; chart(k, () => bars(d.hours, d.hours.map((_, i) => ([0, 6, 12, 17].includes(i) ? String(i + 6) + '시' : '')), 120)); continue }
    if (k === 'days') { if (!d.days?.some((x) => x.m)) continue; chart(k, () => { add(20, () => {}); bars(d.days.map((x) => x.m), d.days.map((x) => x.l), 150, d.dayGoal || 0) }); continue }
    if (k === 'cal') { if (!d.cal) continue; chart(k, () => { const X = X0, XW = XW0; add(calGrid(ctx, X, 0, XW, { ...d.cal, mono: true }, false) + 6, (y0) => calGrid(ctx, X, y0, XW, { ...d.cal, mono: true })) }); continue }
    const s = sheetOf ? sheetOf(k, d) : null
    if (s) sheetT(k, s)
  }
  return finish(c, g, T, ops, W, y + P - 30, square)
}

// 월별 공부 달력 이미지
export async function drawMonthCal({ month, values, goal = 240, weekStartDow = 1, theme = 'app' }) {
  await document.fonts.ready.catch(() => {})
  const W = 1080, P = 96, IW = W - P * 2
  const ctx = setup(theme), { T, c, g, f, spaced } = ctx
  const y0m = +month.slice(0, 4), mo = +month.slice(5, 7) - 1, n = new Date(y0m, mo + 1, 0).getDate()
  const keys = Array.from({ length: n }, (_, i) => `${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`), vals = keys.map((k) => values[k] || 0)
  const total = vals.reduce((a, v) => a + v, 0), studied = vals.filter(Boolean).length, hit = vals.filter((v, i) => v >= (typeof goal === 'function' ? goal(keys[i]) : goal)).length
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  add(80, (y0) => { g.font = f(48, 200); g.fillStyle = T.ink; g.fillText(`${y0m}. ${mo + 1}`, P, y0); spaced('STUDY CALENDAR', 18, W - P, y0 + 22, T.soft, true) })
  add(48, (y0) => { g.fillStyle = T.rule; g.fillRect(P, y0, IW, 1.5) })
  add(calGrid(ctx, P, 0, IW, { month, values, goal, weekStartDow }, false) + 56, (y0) => calGrid(ctx, P, y0, IW, { month, values, goal, weekStartDow }))
  const stats = [['합계', hm(total)], ['공부한 날', `${studied}일`], ['목표 달성', `${hit}일`], ['하루 평균', hm(studied ? Math.round(total / studied) : 0)]]
  add(96, (y0) => { const cw = IW / 4; stats.forEach(([l, v], i) => { const x = P + cw * i; spaced(l, 16, x, y0, T.soft); g.font = f(36, 200); g.fillStyle = T.ink; g.fillText(v, x, y0 + 32) }) })
  return finish(c, g, T, ops, W, y + P - 40)
}

// 노트 한 장 이미지: 제목 · 과목/날짜 · 블록 (형광·밑줄·굵게 그대로, 기호는 숨김)
export async function drawNote(note, { theme = 'app' } = {}) {
  await document.fonts.ready.catch(() => {})
  const [{ allBlocks, noteTitle }, { markRuns }, { list, find }] = await Promise.all([import('./notes.js'), import('./marks.js'), import('../store/store.js')])
  const W = 1080, P = 96, IW = W - P * 2
  const ctx = setup(theme), { T, c, g, f, spaced } = ctx
  const HLC = { d: '#a99bc4', r: '#d6a9b1', g: '#a7b38a', b: '#9db0cc', y: '#d8c69c' }
  const ops = []; let y = P
  const add = (h, fn) => { const y0 = y; ops.push(() => fn(y0)); y += h }
  // 꾸밈 있는 글자 줄 나누기 → [[{ch, b, u, h}]]
  const lines = (text, size, maxW, bold) => {
    const chars = []; for (const r of markRuns(text)) if (!r.mk) for (const ch of r.x) chars.push({ ch, b: r.b || bold, u: r.u, h: r.h })
    const out = []; let cur = [], w = 0
    for (const x of chars) {
      if (x.ch === '\n') { out.push(cur); cur = []; w = 0; continue }
      g.font = f(size, x.b ? 500 : 300); const cw = g.measureText(x.ch).width
      if (w + cw > maxW && cur.length) { out.push(cur); cur = []; w = 0 }
      cur.push({ ...x, w: cw }); w += cw
    }
    if (cur.length || !out.length) out.push(cur)
    return out
  }
  const drawLine = (ln, x, y0, size, color) => {
    let cx = x
    for (const ch of ln) {
      if (ch.h) { g.fillStyle = HLC[ch.h] || HLC.d; g.globalAlpha = 0.5; g.fillRect(cx, y0 + size * 0.62, ch.w + 0.5, size * 0.5); g.globalAlpha = 1 }
      g.font = f(size, ch.b ? 500 : 300); g.fillStyle = color; g.fillText(ch.ch, cx, y0)
      if (ch.u) { g.fillStyle = T.acc; g.globalAlpha = 0.6; g.fillRect(cx, y0 + size * 1.18, ch.w + 0.5, 1.5); g.globalAlpha = 1 }
      cx += ch.w
    }
  }
  const para = (text, { size = 26, indent = 0, color = T.ink, bold = false, gap = 14, lead = null } = {}) => {
    const ls = lines(text, size, IW - indent, bold), lh = Math.round(size * 1.6)
    ls.forEach((ln, i) => add(i === ls.length - 1 ? lh + gap : lh, (y0) => { if (i === 0 && lead) lead(y0); drawLine(ln, P + indent, y0, size, color) }))
  }
  const sub = note.subjectId && find('subjects', note.subjectId)
  const dt = new Date(note.updatedAt || Date.now())
  add(40, (y0) => spaced('NOTE', 17, P, y0, T.soft))
  para(noteTitle(note), { size: 44, bold: false, gap: 6 })
  add(54, (y0) => { g.font = f(20); g.fillStyle = T.soft; g.fillText([sub?.name, `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}`].filter(Boolean).join(' · '), P, y0) })
  add(44, (y0) => { g.fillStyle = T.rule; g.fillRect(P, y0, IW, 1.5) })
  const tasks = list('tasks')
  for (const b of allBlocks(note)) {
    const t = b.text || ''
    if (b.type === 'divider') { add(40, (y0) => { g.fillStyle = T.rule; g.fillRect(P, y0 + 14, IW, 1.2) }); continue }
    if (b.type === 'file' || b.type === 'embed' || b.type === 'cols' || b.type === 'sync') continue
    if (b.type === 'board') { for (const c of b.cols || []) { para(`${c.name} · ${(c.cards || []).length}`, { size: 20, color: T.soft, gap: 4 }); for (const x of (c.cards || []).slice(0, 8)) para('· ' + x.text, { size: 22, color: T.ink, gap: 3 }) } add(10, () => {}); continue }
    if (b.type === 'link') { para('↗ ' + (b.title || b.url), { size: 22, color: T.soft, gap: 6 }); continue }
    if (b.type === 'table') { for (const [i, r] of (b.rows || []).entries()) { const x = r.filter(Boolean).join('  |  '); if (x) para(x, { size: 22, color: i ? T.ink : T.soft, gap: 4 }) } add(14, () => {}); continue }
    if (b.type === 'page') { const pg = find('notes', b.pageId); para('↳ ' + (pg ? noteTitle(pg) : '하위 페이지'), { size: 24, color: T.soft }); continue }
    if (!t.trim()) { add(18, () => {}); continue }
    if (b.type === 'h1') { add(14, () => {}); para(t, { size: 36, bold: true, gap: 10 }); continue }
    if (b.type === 'h2') { add(8, () => {}); para(t, { size: 30, bold: true, gap: 8 }); continue }
    if (b.type === 'bullet') { const ind = (b.indent || 0) * 28; para(t, { indent: 30 + ind, lead: (y0) => { g.fillStyle = T.soft; if (b.num) { g.font = f(24); g.fillText(b.num + '.', P + ind, y0) } else { g.beginPath(); g.arc(P + ind + 10, y0 + 22, 4, 0, Math.PI * 2); g.fill() } } }); continue }
    if (b.type === 'code') { const y1 = y; para(t, { size: 22, indent: 16, color: T.soft, gap: 16 }); const h = y - y1 - 8; ops.push(() => { g.fillStyle = T.rule; g.globalAlpha = 0.5; g.fillRect(P, y1 - 4, 3, h) ; g.globalAlpha = 1 }); continue }
    if (b.type === 'todo') { const done = !!tasks.find((x) => x.id === b.taskId)?.done; para(t, { indent: 38, color: done ? T.soft : T.ink, lead: (y0) => { g.strokeStyle = done ? T.acc : T.soft; g.lineWidth = 1.8; g.beginPath(); g.roundRect ? g.roundRect(P + 1, y0 + 9, 22, 22, 5) : g.rect(P + 1, y0 + 9, 22, 22); g.stroke(); if (done) { g.fillStyle = T.acc; g.beginPath(); g.roundRect ? g.roundRect(P + 6, y0 + 14, 12, 12, 3) : g.rect(P + 6, y0 + 14, 12, 12); g.fill() } } }); continue }
    if (b.type === 'quote' || b.type === 'callout') {
      const y1 = y; para(t, { indent: 24, color: b.type === 'quote' ? T.soft : T.ink, gap: 18 }); const h = y - y1 - 10
      ops.push(() => { g.fillStyle = b.type === 'callout' ? T.acc : T.rule; g.globalAlpha = b.type === 'callout' ? 0.5 : 1; g.fillRect(P, y1 + 4, 3, h); g.globalAlpha = 1 })
      continue
    }
    if (b.type === 'toggle') { para('▸ ' + t, { size: 26 }); continue }
    para(t)
  }
  return finish(c, g, T, ops, W, y + P)
}
