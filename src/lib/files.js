import { get, set, del } from 'idb-keyval'
import { put, remove } from '../store/store.js'
import { today } from '../engine/date.js'

export const MAX_FILE = 10 * 1024 * 1024
const remoteRaw = new Map() // 동기화된 첨부의 raw_url (sync.js 가 채움)
export const setRemoteRaw = (id, url) => remoteRaw.set(id, url)

// 이미지는 긴 변 1600px JPEG 로 압축
async function compressImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82))
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch { return file }
}

export async function addFile(file, meta = {}) {
  const f = await compressImage(file)
  if (f.size > MAX_FILE) throw new Error('10MB 이하 파일만 첨부할 수 있어요')
  const rec = put('files', { name: f.name, type: f.type || guessType(f.name), size: f.size, date: today(), tags: [], ...meta })
  await set('blob:' + rec.id, f)
  return rec
}
const guessType = (n) => /\.pdf$/i.test(n) ? 'application/pdf' : /\.html?$/i.test(n) ? 'text/html' : /\.(png|jpe?g|gif|webp|heic)$/i.test(n) ? 'image/*' : 'application/octet-stream'

export async function getBlob(id) {
  let b = await get('blob:' + id)
  if (b) return b
  const raw = remoteRaw.get(id)
  if (!raw) return null
  const text = await (await fetch(raw)).text()
  b = await (await fetch(text)).blob()
  await set('blob:' + id, b)
  return b
}
export const hasLocalBlob = async (id) => !!(await get('blob:' + id))
export async function deleteFile(id) { remove('files', id); await del('blob:' + id).catch(() => {}) }

export async function blobUrl(id) { const b = await getBlob(id); return b ? URL.createObjectURL(b) : null }
export const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob) })

export function pickFiles(accept = 'image/*,application/pdf,.html,.htm', multiple = true) {
  return new Promise((res) => {
    const i = document.createElement('input')
    i.type = 'file'; i.accept = accept; i.multiple = multiple
    i.onchange = () => res([...i.files])
    i.click()
  })
}

export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const fmtSize = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'
