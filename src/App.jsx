import { useEffect, Component } from 'react'
import { useSettings } from './store/store.js'
import { applyTheme } from './lib/theme.js'
import { TABS, go, useNav } from './lib/nav.js'
import { Icon, UiHost } from './components/ui.jsx'
import { startSync } from './sync/sync.js'
import Home from './views/Home.jsx'
import Plan from './views/Plan.jsx'
import Record from './views/Record.jsx'
import Exams from './views/Exams.jsx'
import Settings from './views/Settings.jsx'

const VIEWS = { home: Home, plan: Plan, record: Record, exam: Exams, settings: Settings }

// 화면 하나가 오류 나도 앱 전체가 멈추지 않게
class Guard extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() { return this.state.err ? <div className="card err-box"><p>이 화면을 그리다 문제가 생겼어요.</p><p className="tiny soft">{String(this.state.err.message || this.state.err)}</p><button className="btn sm" onClick={() => location.reload()}>다시 불러오기</button></div> : this.props.children }
}

export default function App() {
  const st = useSettings(), nav = useNav()
  useEffect(() => { applyTheme(st) }, [st])
  useEffect(() => startSync(), [])
  const V = VIEWS[nav.tab] || Home
  return (
    <div className="app">
      <nav className="nav" aria-label="화면">
        <span className="brand">EXAM STUDY</span>
        {TABS.map(([k, l, ic]) => <button key={k} className={nav.tab === k ? 'on' : ''} aria-current={nav.tab === k ? 'page' : undefined} onClick={() => go(k)}><Icon name={ic} size={20} /><span>{l}</span></button>)}
      </nav>
      <main className="main content-inner"><Guard key={nav.tab}><V seg={nav.seg[nav.tab]} /></Guard></main>
      <UiHost />
    </div>
  )
}
