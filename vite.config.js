import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildCore } from './src/lib/scriptable.js'

// 위젯 본체(widget-core.js)를 앱과 같이 배포 — Scriptable 로더가 매번 받아 실행 (다시 복사할 필요 없음)
const widgetCore = () => ({
  name: 'widget-core',
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'widget-core.js', source: buildCore() }) },
  configureServer(server) { server.middlewares.use((req, res, next) => { if (!req.url.split('?')[0].endsWith('/widget-core.js')) return next(); res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(buildCore()) }) },
})

export default defineConfig({
  base: './',
  plugins: [react(), widgetCore()],
})
