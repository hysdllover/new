// 다짐·명언: 3시간마다 무작위로 바뀜. 시간 구간으로 정해진 섞기라 모든 기기·홈 화면 위젯이 같은 문구를 보여 줌
// 개수만큼의 구간마다 한 번씩 모두 나오고, 연속으로 같은 문구는 나오지 않음
// (홈 화면 위젯 스크립트에 그대로 넣으므로 바깥 변수를 쓰지 않음)
export function pickQuote(list, now = Date.now()) {
  const n = list.length
  if (!n) return null
  const slot = Math.floor(now / (3 * 3600000))
  if (n < 3) return list[slot % n]
  const perm = (c) => {
    let a = c >>> 0
    const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    const p = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]] }
    return p
  }
  const c = Math.floor(slot / n), pos = slot % n
  const p = perm(c)
  if (p[0] === perm(c - 1)[n - 1]) [p[0], p[1]] = [p[1], p[0]]
  return list[p[pos]]
}
