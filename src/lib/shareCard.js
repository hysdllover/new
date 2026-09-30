// 공부 인증 카드: 오늘 공부 기록을 1080×1350 이미지로 그림 (인스타 스토리·메신저 공유용)
const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

export async function drawShareCard({ date, mins, goal, subjects, week, streak, quote }) {
  await document.fonts.ready.catch(() => {})
  const W = 1080, H = 1350, P = 96
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')
  const bg = css('--bg', '#f7f6f2'), ink = css('--text', '#2b2a28'), soft = css('--muted', '#9a958c'), acc = css('--accent', '#4a5a78'), line = css('--line', '#e4e0d8')
  const font = css('--font', '-apple-system, sans-serif')
  const f = (size, w = 300) => `${w} ${size}px ${font}`

  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  // 은은한 원형 포인트
  try { const grd = g.createRadialGradient(W, 0, 0, W, 0, 900); grd.addColorStop(0, acc + '22'); grd.addColorStop(1, acc + '00'); g.fillStyle = grd; g.fillRect(0, 0, W, H) } catch {}

  g.fillStyle = soft; g.font = f(30, 400); g.textBaseline = 'top'
  g.fillText(date, P, P)
  g.fillText('STUDY LOG', W - P - g.measureText('STUDY LOG').width, P)

  // 큰 공부 시간
  g.fillStyle = ink; g.font = f(220, 200)
  g.fillText(hm(mins), P - 8, P + 90)
  const pct = Math.round(Math.min(1, mins / (goal || 1)) * 100)
  g.fillStyle = soft; g.font = f(38, 300)
  g.fillText(`of ${hm(goal)}  ·  ${pct}%`, P, P + 340)
  // 진행선
  g.fillStyle = line; g.fillRect(P, P + 410, W - P * 2, 4)
  g.fillStyle = acc; g.fillRect(P, P + 406, (W - P * 2) * Math.min(1, mins / (goal || 1)), 12)

  // 과목별
  let y = P + 480
  const max = Math.max(1, ...subjects.map((s) => s.m))
  for (const s of subjects.slice(0, 5)) {
    g.fillStyle = s.color || acc; g.beginPath(); g.arc(P + 10, y + 22, 10, 0, Math.PI * 2); g.fill()
    g.fillStyle = ink; g.font = f(38, 400); g.fillText(s.name, P + 40, y)
    g.fillStyle = soft; g.font = f(36, 300); const t = hm(s.m); g.fillText(t, W - P - g.measureText(t).width, y)
    g.fillStyle = line; g.fillRect(P + 40, y + 60, W - P * 2 - 40, 3)
    g.fillStyle = s.color || acc; g.fillRect(P + 40, y + 58, (W - P * 2 - 40) * (s.m / max), 7)
    y += 104
  }
  if (!subjects.length) { g.fillStyle = soft; g.font = f(36, 300); g.fillText('오늘도 시작해 볼까요', P, y) }

  // 이번 주 · 연속
  const by = H - P - 250
  g.fillStyle = line; g.fillRect(P, by, W - P * 2, 2)
  const stat = (x, k, v) => { g.fillStyle = soft; g.font = f(26, 400); g.fillText(k, x, by + 36); g.fillStyle = ink; g.font = f(56, 300); g.fillText(v, x, by + 76) }
  stat(P, 'THIS WEEK', hm(week)); stat(P + 360, 'STREAK', `${streak} days`)
  // 다짐
  if (quote) {
    g.fillStyle = soft; g.font = f(34, 300)
    let q = '— ' + quote
    while (g.measureText(q).width > W - P * 2 && q.length > 4) q = q.slice(0, -2) + '…'
    g.fillText(q, P, H - P - 44)
  }
  return new Promise((res) => c.toBlob(res, 'image/png'))
}

export async function shareBlob(blob, name) {
  const file = new File([blob], name, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared' } catch (e) { if (e.name === 'AbortError') return 'cancel' }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  return 'saved'
}
