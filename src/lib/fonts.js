// 내 글꼴: 사용자가 고른 글꼴 파일을 이 기기(IndexedDB)에만 저장해 씀 — 저장소 · 사이트에 올리지 않음 (유료 · 상용 글꼴 재배포 방지)
// 아이폰 · 아이패드에서 각각 한 번 넣어 주면 됨. 일본어(가나 · 한자)처럼 글꼴에 없는 글자는 기본 글꼴로
import { get, set, del } from 'idb-keyval'

const KEY = 'x:font', FAMILY = 'MyFontX'
const L = new Set()
let cur = null // { name, size }
export const fontInfo = () => cur
export const onFont = (f) => { L.add(f); return () => L.delete(f) }
const emit = () => L.forEach((f) => f())

function apply(on) {
  const r = document.documentElement
  if (on) r.style.setProperty('--font', `"${FAMILY}", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Hiragino Sans", sans-serif`)
  else r.style.removeProperty('--font')
}
async function register(buf) {
  const ff = new FontFace(FAMILY, buf, { weight: '100 900', style: 'normal', display: 'swap' })
  await ff.load()
  for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === FAMILY) document.fonts.delete(f)
  document.fonts.add(ff)
}
// 앱을 열 때: 저장해 둔 글꼴이 있으면 적용 (실패해도 기본 글꼴로)
export async function loadFont() {
  try {
    const rec = await get(KEY)
    if (!rec?.buf) return
    await register(rec.buf); apply(true)
    cur = { name: rec.name, size: rec.buf.byteLength }; emit()
  } catch (e) { console.error(e); apply(false) }
}
export async function addFont(file) {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('ttf · otf · woff 글꼴 파일을 골라 주세요')
  if (file.size > 30 * 1048576) throw new Error('30MB 보다 큰 글꼴은 넣을 수 없어요')
  const buf = await file.arrayBuffer()
  try { await register(buf) } catch { throw new Error('이 파일을 글꼴로 읽지 못했어요') }
  const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/^[0-9a-f]{8}-/, '').replace(/_\d+$/, '')
  await set(KEY, { name, buf })
  apply(true); cur = { name, size: buf.byteLength }; emit()
}
export async function removeFont() { await del(KEY); apply(false); cur = null; emit() }
