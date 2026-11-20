// 앱 셸 캐시: 문서는 네트워크 우선, 정적 자산은 캐시 우선
const CACHE = 'exam-v1'
// 빌드할 때 이번 배포의 assets/ 파일 목록이 들어감 → 새 버전이 켜지면 지난 빌드 파일을 캐시에서 지움
const ASSETS = /*ASSETS*/null
async function prune() {
  if (!ASSETS) return
  const keep = new Set(ASSETS), c = await caches.open(CACHE)
  for (const req of await c.keys()) {
    const u = new URL(req.url)
    if (u.origin !== location.origin) continue
    const i = u.pathname.indexOf('/assets/')
    if (i >= 0 && !keep.has(u.pathname.slice(i + 1))) await c.delete(req)
  }
}
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(prune).catch(() => {}).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res }).catch(() => caches.match(req).then((r) => r || caches.match('./'))))
    return
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
    return res
  })))
})
