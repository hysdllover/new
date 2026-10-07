// 오류 경계: 한 부분(카드·화면·시트)에서 오류가 나도 앱 전체가 하얗게 멈추지 않고 그 자리만 '다시 불러오기'
import { Component } from 'react'
import { logError } from '../lib/diag.js'

export default class ErrorBoundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { logError(err, this.props.where || 'view') }
  componentDidUpdate(prev) { if (this.state.err && prev.reset !== this.props.reset) this.setState({ err: null }) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className={'err-box' + (this.props.big ? ' big' : '')} role="alert">
        <span className="small muted">이 부분을 불러오지 못했어요</span>
        <button className="btn sm" onClick={() => this.setState({ err: null })}>다시 불러오기</button>
      </div>
    )
  }
}
