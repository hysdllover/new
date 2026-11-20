import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// 위젯 본체(src/widget/core.js)를 앱과 같이 배포 — Scriptable 로더가 버전 파일을 보고 바뀌었을 때만 받음
const core = () => readFileSync(new URL('./src/widget/core.js', import.meta.url), 'utf8')
const coreVer = (src) => createHash('sha1').update(src).digest('hex').slice(0, 12)
const widgetCore = () => ({
  name: 'widget-core',
  generateBundle() { const src = core(); this.emitFile({ type: 'asset', fileName: 'widget-core.js', source: src }); this.emitFile({ type: 'asset', fileName: 'widget-core.ver', source: coreVer(src) }) },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const p = req.url.split('?')[0]
      if (p.endsWith('/widget-core.js')) { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); return res.end(core()) }
      if (p.endsWith('/widget-core.ver')) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end(coreVer(core())) }
      next()
    })
  },
})
// 서비스 워커에 이번 빌드 assets/ 목록 (지난 빌드 파일 정리)
const swAssets = () => {
  let files = [], out = 'dist'
  return {
    name: 'sw-assets', apply: 'build',
    configResolved(c) { out = c.build.outDir },
    writeBundle(_, bundle) { files = Object.keys(bundle).filter((f) => f.startsWith('assets/')) },
    closeBundle() { const p = out + '/sw.js'; try { writeFileSync(p, readFileSync(p, 'utf8').replace('/*ASSETS*/null', JSON.stringify(files.sort()))) } catch {} },
  }
}
export default defineConfig({ base: './', plugins: [react(), widgetCore(), swAssets()] })
