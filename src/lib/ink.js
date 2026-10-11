// 눌림 표시: 버튼·줄을 누르면 손끝 자리에 아주 옅은 잉크가 번졌다 사라짐 (동작 줄이기면 끔)
const SEL = 'button, a, .item, .chip, [role="button"], .exp-row'
export function installInk() {
  if (typeof window === 'undefined') return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  window.addEventListener('pointerdown', (e) => {
    if (reduce?.matches || e.button > 0) return
    const t = e.target.closest?.(SEL)
    if (!t || t.disabled || t.closest('.blk-editor, input, textarea, [contenteditable="true"]')) return
    const d = document.createElement('span')
    d.className = 'ink'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'
    document.body.appendChild(d)
    setTimeout(() => d.remove(), 450)
  }, { passive: true })
}
