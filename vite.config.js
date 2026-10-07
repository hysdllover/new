import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { buildCore } from './src/lib/scriptable.js'

// 위젯 본체(widget-core.js)를 앱과 같이 배포 — Scriptable 로더가 매번 받아 실행 (다시 복사할 필요 없음)
const widgetCore = () => ({
  name: 'widget-core',
  generateBundle() { const src = buildCore(); this.emitFile({ type: 'asset', fileName: 'widget-core.js', source: src }); this.emitFile({ type: 'asset', fileName: 'widget-core.ver', source: coreVer(src) }) },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const p = req.url.split('?')[0]
      if (p.endsWith('/widget-core.js')) { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); return res.end(buildCore()) }
      if (p.endsWith('/widget-core.ver')) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end(coreVer(buildCore())) }
      next()
    })
  },
})
// 위젯 본체 버전 (내용 해시) — 로더가 이 작은 파일만 보고 바뀌었을 때만 본체를 받음
const coreVer = (src) => createHash('sha1').update(src).digest('hex').slice(0, 12)

// 서비스 워커에 이번 빌드 assets/ 목록을 넣음 (지난 빌드 파일 정리 · 내용이 바뀌어 새 워커로 교체됨)
const swAssets = () => {
  let files = [], out = 'dist'
  return {
    name: 'sw-assets',
    apply: 'build',
    configResolved(c) { out = c.build.outDir },
    writeBundle(_, bundle) { files = Object.keys(bundle).filter((f) => f.startsWith('assets/')) },
    closeBundle() {
      const p = out + '/sw.js'
      try { writeFileSync(p, readFileSync(p, 'utf8').replace('/*ASSETS*/null', JSON.stringify(files.sort()))) } catch {}
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), widgetCore(), swAssets()],
})
