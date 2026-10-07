// 앱 셸 캐시: 문서는 네트워크 우선, 정적 자산은 캐시 우선
const CACHE = 'study-v4'
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin && !url.host.includes('fonts') && !url.host.includes('jsdelivr')) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res }).catch(() => caches.match(req).then((r) => r || caches.match('./'))))
    return
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
    return res
  })))
})

// 푸시 알림 (GitHub Actions 가 발송)
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: '스터디', body: e.data?.text() } }
  // 선언형 푸시(web_push 8030)를 서비스 워커가 받은 경우도 같은 모양으로
  const n = d.notification || d
  const url = n.navigate || d.url || './'
  const badge = n.app_badge != null ? +n.app_badge : null
  if (badge != null && self.navigator.setAppBadge) e.waitUntil(badge ? self.navigator.setAppBadge(badge).catch(() => {}) : self.navigator.clearAppBadge().catch(() => {}))
  e.waitUntil(self.registration.showNotification(n.title || '스터디', { body: n.body || '', icon: './icon-192.png', badge: './icon-192.png', tag: n.tag, data: { url } }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus()
    return self.clients.openWindow(url)
  }))
})
