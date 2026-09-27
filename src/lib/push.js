import { readGistFile, writeGistFile } from '../sync/sync.js'
import { deviceId } from '../store/store.js'

// 앱을 닫아도 오는 알림: 이 기기의 푸시 구독을 Gist(push.json)에 저장 → GitHub Actions 가 주기적으로 발송
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

async function vapidKeys(data) {
  if (data?.vapid?.publicKey && data?.vapid?.privateKey) return data.vapid
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const pub = await crypto.subtle.exportKey('raw', kp.publicKey)
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  return { publicKey: b64u(pub), privateKey: jwk.d }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error(isStandalone() ? '이 기기는 푸시 알림을 지원하지 않아요 (iOS 16.4 이상 필요)' : 'Safari 공유 → 홈 화면에 추가 후, 설치된 앱에서 켜 주세요')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('알림 권한이 거부되었어요. 설정 앱 › 알림에서 허용해 주세요')
  const data = (await readGistFile('push.json')) || {}
  const vapid = await vapidKeys(data)
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  const want = fromB64u(vapid.publicKey)
  if (sub && b64u(sub.options.applicationServerKey || new ArrayBuffer(0)) !== vapid.publicKey) { await sub.unsubscribe(); sub = null }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want })
  const json = sub.toJSON()
  const subs = (data.subs || []).filter((s) => s.endpoint !== json.endpoint && s.deviceId !== deviceId)
  subs.push({ endpoint: json.endpoint, keys: json.keys, deviceId, ua: navigator.userAgent.slice(0, 80), at: new Date().toISOString() })
  await writeGistFile('push.json', { ...data, vapid, subs, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul' })
  return subs.length
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  const data = (await readGistFile('push.json')) || {}
  data.subs = (data.subs || []).filter((s) => s.deviceId !== deviceId && s.endpoint !== sub?.endpoint)
  await writeGistFile('push.json', data)
  await sub?.unsubscribe()
}

export async function pushState() {
  if (!pushSupported()) return false
  try { const reg = await navigator.serviceWorker.getRegistration(); return !!(await reg?.pushManager.getSubscription()) } catch { return false }
}

export async function testLocal() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('스터디 알림 테스트', { body: '이렇게 알림이 표시돼요', icon: './icon-192.png', tag: 'test' })
}
