import { useTimerState, useTick, elapsed, remaining } from '../lib/timer.js'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useSettings, setSettings, useColl, put, remove, patch, exportJSON, importJSON, uid, getState, deviceId as myDevice } from '../store/store.js'
import { seriesSummary } from '../lib/series.js'
import { diagText, recentErrors, clearErrors, persistStorage, updateBadge } from '../lib/diag.js'
import { notesForWidget } from '../lib/notePreview.js'
import { PRESETS, FONTS, effTheme, setDeviceTheme } from '../theme/theme.js'
import { PALETTE, SOFT_PALETTE } from '../store/schema.js'
import { Card, Seg, Toggle, Field, Icon, toast, confirmSheet, openSheet, useMedia } from '../components/ui.jsx'
import { ColorPick, TimeInput, SubjectSelect } from '../components/common.jsx'
import { deviceName, useSyncStatus, connect, disconnect, syncNow, gistInfo, tokenExpiry, listBackups, backupNow, restoreBackup, calendarUrl, readGistFile, syncLog, connectLink } from '../sync/sync.js'
import { enablePush, disablePush, pushState, testLocal, isStandalone, pushSupported } from '../lib/push.js'
import { buildLoader, WIDGET_KINDS } from '../lib/scriptable.js'
import { TAB_OPTIONS, DEFAULT_TABBAR, tabOpt } from '../nav.js'
import { pickQuote } from '../lib/quote.js'
import { pickColor, harmonize } from '../lib/colors.js'
import { eventsOn, classesOn } from '../engine/scheduler.js'
import { sortTasks } from './tasks/filter.js'
import { download } from '../lib/files.js'
import { useMyFonts, addFont, removeFont, fontFamily, loadAllFonts, SYNC_FONT_MAX } from '../lib/fonts.js'
import { requestPermission } from '../lib/notify.js'
import { fmtTime, fmtClock, today, WD, weekStart } from '../engine/date.js'
import { weekGoals, goalProgress } from '../store/actions.js'
import { DIGEST_TIMES } from '../engine/reminders.js'
import { APP_ICONS, iconSrc, getAppIcon, setAppIcon } from '../lib/appIcon.js'
import { WidgetFontField, DashTilesField, CustomWidgetsField, WidgetPreview, dashKeys } from './settings/WidgetSettings.jsx'

export default function Settings() {
  const st = useSettings()
  const th = st.theme
  const [, setTick] = useState(0), bump = () => setTick((x) => x + 1), eff = effTheme(th)
  const setTheme = (p) => setSettings({ theme: { ...th, ...p } })
  const myFonts = useMyFonts()
  const [q, setQ] = useState(''), gridRef = useRef(null)
  useSettingsSearch(gridRef, q)
  // 분류: 처음엔 목록만, 고르면 그 분류 카드만 (검색할 땐 전부) — 기억해 두고 다시 열면 그 자리
  const wide = useMedia('(min-width: 1000px)')
  const [sec, setSecS] = useState(() => { try { return localStorage.getItem('set_sec') || '' } catch { return '' } })
  const setSec = (k) => { setSecS(k); try { localStorage.setItem('set_sec', k) } catch {} ; document.getElementById('content')?.scrollTo({ top: 0 }) }
  const cur = sec || (wide ? 'sync' : '')
  const show = (k) => !!q || cur === k
  const list = !q && (wide || !cur) && (
    <nav className="set-cats" aria-label="설정 분류">
      {SET_SECS.map(([k, l, ic, d]) => <button key={k} className={'set-cat' + (cur === k ? ' on' : '')} onClick={() => setSec(k)}><Icon name={ic} size={17} /><span className="grow"><b>{l}</b><span className="tiny muted">{d}</span></span>{!wide && <Icon name="next" size={14} />}</button>)}
    </nav>
  )
  if (!q && !wide && !cur) return (
    <div className="settings-grid" ref={gridRef}>
      <div className="set-search no-print">
        <Icon name="search" size={15} />
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="설정 검색 · 예: 위젯, 알림, 폰트" />
      </div>
      {list}
    </div>
  )
  return (
    <div className={'settings-wrap' + (wide && !q ? ' two' : '')}>
    {wide && list}
    <div className="grid two settings-grid" ref={gridRef}>
      {!wide && !q && cur && <button className="btn ghost sm set-back" onClick={() => setSec('')}><Icon name="back" size={14} />설정</button>}
      <div className="set-search no-print">
        <Icon name="search" size={15} />
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="설정 검색 · 예: 위젯, 알림, 폰트" />
        {q && <button className="chip" onClick={() => setQ('')}>지우기</button>}
      </div>
      {q && <div className="set-none tiny muted">찾는 설정이 없어요</div>}
      {show('sync') && <div className="set-sec"><SyncCard /><PushCard /></div>}
      {show('widget') && <div className="set-sec"><HomeWidgetCard /><ShareCaptureCard /><CalendarSubCard /></div>}
      {show('layout') && <div className="set-sec"><TabBarCard /><SidebarCard /></div>}
      {show('design') && <div className="set-sec">
      <Card title="디자인">
        <div className="form">
          <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
            <button className={'btn' + (th.card === 'note' ? ' on-acc' : '')} onClick={() => { setTheme({ card: 'note', headFont: 'gaegu', radius: Math.min(th.radius, 6) }); setSettings({ widgetTheme: 'paper', reportTheme: 'paper' }); toast('종이 노트 테마를 적용했어요') }}>종이 노트 테마 한 번에 적용</button>
            <span className="tiny muted">종이 바탕 · 노트 카드 · 손글씨 제목 · 위젯·리포트도 종이</span>
          </div>
          <Field label="색상 프리셋">
            <div className="row wrap" style={{ gap: 6 }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} className={'chip' + (th.preset === k && !th.accent ? ' on' : '')} onClick={() => setTheme({ preset: k, accent: null, c2: null, c3: null, c4: null })}>
                  {[p.accent, p.c2, p.c3, p.c4].map((c, i) => <span key={i} className="dot" style={{ background: c, marginRight: -2 }} />)}<span style={{ marginLeft: 4 }}>{p.name}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="포인트 색 직접 선택">
            <div className="row">
              <input type="color" value={th.accent || PRESETS[th.preset]?.accent || '#4a5a78'} onChange={(e) => setTheme({ accent: e.target.value })} />
              <ColorPick value={th.accent} onChange={(c) => setTheme({ accent: c })} colors={SOFT_PALETTE} />
            </div>
          </Field>
          {[['c2', '그래프·달력 색'], ['c3', '보조 색 1'], ['c4', '보조 색 2']].map(([k, l]) => (
            <Field key={k} label={l}>
              <div className="row">
                <input type="color" value={th[k] || PRESETS[th.preset]?.[k] || '#7a8660'} onChange={(e) => setTheme({ [k]: e.target.value })} />
                <ColorPick value={th[k]} onChange={(c) => setTheme({ [k]: c })} colors={SOFT_PALETTE} />
                {th[k] && <button className="chip" onClick={() => setTheme({ [k]: null })}>기본</button>}
              </div>
            </Field>
          ))}
          <Toggle label="데일리 노트 자동 기록 · 하루가 끝나면 공부·완료·일정·컨디션을 노트에 채우기" checked={st.daylog !== false} onChange={(v) => setSettings({ daylog: v })} />
          <Toggle label="조용한 모드 · 개수·지연 빨간 표시 숨기기" checked={!!st.calm} onChange={(v) => setSettings({ calm: v })} />
          <Field label="화면 모드"><Seg value={th.mode} onChange={(v) => setTheme({ mode: v })} options={[['system', '시스템'], ['light', '라이트'], ['dark', '다크']]} /></Field>
          <Field label="폰트">
            <select className="input" value={th.font} onChange={(e) => setTheme({ font: e.target.value })}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}
              {myFonts.map((f) => <option key={f.id} value={'my:' + f.id}>내 폰트 · {f.name}</option>)}
              {th.font?.startsWith('my:') && !myFonts.some((f) => 'my:' + f.id === th.font) && <option value={th.font}>내 폰트 (이 기기에 없음)</option>}
            </select>
          </Field>
          <Field label="제목·큰 숫자 폰트">
            <select className="input" value={th.headFont || ''} onChange={(e) => setTheme({ headFont: e.target.value || null })}>
              <option value="">본문과 같게</option>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}
              {myFonts.map((f) => <option key={f.id} value={'my:' + f.id}>내 폰트 · {f.name}</option>)}
            </select>
          </Field>
          <MyFonts th={th} setTheme={setTheme} fonts={myFonts} />
          <Field label={`글자 크기 ${eff.fontSize}px · 이 기기만`}><Seg value={String(eff.fontSize)} onChange={(v) => { setDeviceTheme({ fontSize: +v }, th); bump() }} options={[['12', '작게'], ['13', '기본'], ['14.5', '크게'], ['16', '더 크게']]} /></Field>
          <Field label={`글자 굵기 ${th.fontWeight}`}><input type="range" min="300" max="500" step="100" value={th.fontWeight} onChange={(e) => setTheme({ fontWeight: +e.target.value })} /></Field>
          <Field label={`모서리 둥글기 ${th.radius}px`}><input type="range" min="0" max="20" value={th.radius} onChange={(e) => setTheme({ radius: +e.target.value })} /></Field>
          <Field label="간격 · 이 기기만 (아이패드 기본 여유)"><Seg value={eff.density} onChange={(v) => { setDeviceTheme({ density: v }, th); bump() }} options={[['compact', '촘촘'], ['normal', '보통'], ['relaxed', '여유']]} /></Field>
          <Field label="아이패드 가로 2단 (오른쪽에 함께 보기)"><Seg value={st.splitPane || ''} onChange={(v) => setSettings({ splitPane: v || null })} options={[['', '끔'], ['planner', '오늘 일정'], ['timer', '타이머'], ['tasks', '오늘 할 일'], ['notes', '데일리']]} /></Field>
          <Field label="아이콘"><div className="row wrap" style={{ gap: 6 }}><Seg value={th.iconWeight || 'normal'} onChange={(v) => setTheme({ iconWeight: v })} options={[['thin', '가늘게'], ['normal', '보통'], ['bold', '굵게']]} /><Seg value={th.iconShape || 'round'} onChange={(v) => setTheme({ iconShape: v })} options={[['round', '둥글게'], ['square', '각지게']]} /></div></Field>
          <AppIconPick />
          <Field label="카드 스타일"><Seg value={th.card} onChange={(v) => setTheme({ card: v })} options={[['line', '선'], ['shadow', '그림자'], ['flat', '평면'], ['glass', '유리'], ['paper', '종이'], ['note', '노트']]} /></Field>
        </div>
      </Card>

      <DesignDetail th={th} setTheme={setTheme} st={st} />
      </div>}

      {show('layout') && <div className="set-sec">
      <Card title="기능 켜기·끄기">
        <Toggle label="완료한 지 30일 지난 할 일은 보관함으로 자동 정리" checked={st.autoArchive !== false} onChange={(v) => setSettings({ autoArchive: v })} />
        {[['planning', '계획 기능 (자동 학습 계획·타임박싱·원형·10분 플래너)'], ['health', '건강 (컨디션·약)'], ['matrix', '아이젠하워 매트릭스'], ['kanban', '칸반'], ['gantt', '간트'], ['db', '표 · DB 뷰'], ['circle', '원형 계획표'], ['graph', '개념 그래프'], ['mindmap', '마인드맵'], ['mock', '모의고사 타이머']].map(([k, l]) => (
          <Toggle key={k} label={l} checked={st.modules[k] !== false} onChange={(v) => setSettings({ modules: { ...st.modules, [k]: v } })} />
        ))}
      </Card>
      </div>}

      {show('study') && <div className="set-sec">
      <SubjectsCard />
      <ProjectsCard />

      <Card title="플래너·공부">
        <div className="form">
          <div className="row">
            <Field label="기상 (하루 시작)"><TimeInput allowEmpty={false} value={st.dayStart} onChange={(v) => v != null && setSettings({ dayStart: v })} /></Field>
            <Field label="취침 (하루 끝)"><TimeInput allowEmpty={false} value={st.dayEnd % 1440} onChange={(v) => v != null && setSettings({ dayEnd: v === 0 ? 1440 : v })} /></Field>
          </div>
          <Toggle label="자는 시간엔 알림 보내지 않기 · 기상 때 밤사이 할 일 알림을 한 번에" checked={st.quietNight !== false} onChange={(v) => setSettings({ quietNight: v })} />
          <div className="tiny muted" style={{ marginTop: -6 }}>타임라인·빈 시간 추천·자동 배정도 이 시간 안에서만 해요.</div>
          <Field label="앱 시작 화면">
            <select className="input" value={st.startTab || 'last'} onChange={(e) => setSettings({ startTab: e.target.value })}>
              {[['last', '마지막으로 보던 화면'], ['home', '홈'], ['tasks.list', '할 일'], ['study.timer', '타이머'], ['study.log', '기록 입력'], ['study.records', '공부 통계'], ['planner.today', '캘린더 · 오늘'], ['planner.month', '캘린더 · 월'], ['notes.daily', '노트 · 데일리']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="주 시작"><Seg value={st.weekStart} onChange={(v) => setSettings({ weekStart: v })} options={[[1, '월요일'], [0, '일요일']]} /></Field>
          <div className="row">
            <Field label="하루 목표(분)"><input className="input" type="number" step="10" value={st.goalDaily} onChange={(e) => setSettings({ goalDaily: +e.target.value })} /></Field>
            <Field label="주간 목표(분)"><input className="input" type="number" step="30" value={st.goalWeekly} onChange={(e) => setSettings({ goalWeekly: +e.target.value })} /></Field>
          </div>
          <Field label="복습 간격(일, 쉼표)"><input className="input" defaultValue={st.reviewIntervals.join(', ')} onBlur={(e) => { const v = e.target.value.split(/[,\s]+/).map(Number).filter((n) => n > 0); if (v.length) setSettings({ reviewIntervals: v }) }} /></Field>
          <Field label="일정 기본 이동·준비 버퍼(분)"><input className="input" type="number" min="0" step="5" value={st.defaultBuffer} onChange={(e) => setSettings({ defaultBuffer: +e.target.value })} /></Field>
          <Toggle label="요일 템플릿 자동 적용" checked={st.autoTemplate} onChange={(v) => setSettings({ autoTemplate: v })} />
          <Toggle label="타이머 기록을 5분 단위로 맞추기 (예: 47분 → 45분)" checked={!!st.roundRec} onChange={(v) => setSettings({ roundRec: v })} />
          <Toggle label="타이머 중 화면 켜짐 유지" checked={st.wakeLock !== false} onChange={(v) => setSettings({ wakeLock: v })} />
          <Toggle label="알림" checked={st.notify} onChange={async (v) => { setSettings({ notify: v }); if (v) { const p = await requestPermission(); if (p === 'denied') toast('설정 앱에서 알림을 허용해 주세요') } }} />
          <div className="tiny muted">iPhone/iPad 는 Safari 공유 → ‘홈 화면에 추가’ 후 앱으로 열어야 시스템 알림이 표시돼요. 앱이 열려 있을 때 동작합니다.</div>
        </div>
      </Card>

      <TemplatesCard />
      </div>}

      {show('sync') && <div className="set-sec">
      <Card title="백업·복원">
        <div className="row wrap">
          <button className="btn" onClick={() => download(`study-backup-${today()}-${new Date().toTimeString().slice(0, 5).replace(':', '')}.json`, exportJSON(), 'application/json')}><Icon name="download" size={16} />백업 파일 내보내기</button>
          <button className="btn" onClick={() => {
            const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json'
            i.onchange = async () => { const f = i.files[0]; if (!f) return; const text = await f.text(); confirmSheet('복원', '현재 데이터를 백업 파일로 교체할까요?', () => { try { importJSON(text); toast('복원 완료') } catch (e) { toast(e.message) } }, '복원') }
            i.click()
          }}><Icon name="upload" size={16} />백업 파일로 바꾸기</button>
          <button className="btn" onClick={() => {
            const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json'
            i.onchange = async () => { const f = i.files[0]; if (!f) return; try { const n = importJSON(await f.text(), { merge: true }); toast(`합쳤어요 · ${n}개 항목 반영`) } catch (e) { toast(e.message) } }
            i.click()
          }}><Icon name="upload" size={16} />백업 파일 합치기</button>
        </div>
        <AutoBackups />
        <div className="tiny muted" style={{ marginTop: 8 }}>바꾸기: 지금 데이터를 백업 파일로 바꿔요 · 합치기: 지금 데이터는 두고 항목마다 최신 수정만 반영해요. 첨부 파일 원본은 Gist 동기화로 옮겨지고, JSON 백업에는 목록만 포함돼요.</div>
      </Card>
      </div>}
      {show('info') && <div className="set-sec">
      <DiagCard />
      <Card title="홈 화면에 설치">
        <div className="small">Safari 에서 공유 버튼 → <b>홈 화면에 추가</b>. 전체 화면·오프라인으로 동작합니다. iPhone 과 iPad 모두 같은 방법으로 설치한 뒤 위 동기화에 같은 토큰을 입력하세요.</div>
      </Card>
      </div>}
    </div>
    </div>
  )
}

// 설정 분류: [키, 이름, 아이콘, 설명]
const SET_SECS = [
  ['sync', '동기화·백업', 'sync', '아이폰·아이패드 동기화, 알림, 백업'],
  ['widget', '위젯·연동', 'layers', '홈·잠금 화면 위젯, 공유 시트, 캘린더 구독'],
  ['design', '디자인', 'edit', '색, 글꼴, 카드, 세부 모양'],
  ['layout', '화면 구성', 'grid', '하단 탭, 사이드바, 기능 켜기·끄기'],
  ['study', '공부·플래너', 'clock', '과목, 프로젝트, 하루 시간, 템플릿'],
  ['info', '정보·진단', 'more', '문제 신고, 진단, 설치 방법'],
]

// 문제 신고 · 진단: 기기·버전·저장 공간·최근 오류를 한 번에 복사 (토큰·내용 없음)
function DiagCard() {
  const sync = useSyncStatus(), st = useSettings()
  const [errN, setErrN] = useState(() => recentErrors().length), [pers, setPers] = useState(null)
  useEffect(() => { navigator.storage?.persisted?.().then(setPers).catch(() => {}) }, [])
  const copy = async () => { const t = await diagText({ sync }); try { await navigator.clipboard.writeText(t); toast('진단 정보를 복사했어요') } catch { openSheet(() => <textarea className="input" readOnly value={t} style={{ minHeight: 280, fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace' }} onFocus={(e) => e.target.select()} />, { title: '진단 정보' }) } }
  return (
    <Card title="문제 신고·진단">
      <div className="form">
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn" onClick={copy}><Icon name="download" size={15} />진단 정보 복사</button>
          {errN > 0 && <button className="btn" onClick={() => { clearErrors(); setErrN(0); toast('오류 기록을 지웠어요') }}>오류 기록 지우기 ({errN})</button>}
          {pers === false && <button className="btn" onClick={async () => { const r = await persistStorage(); setPers(!!r); toast(r ? '저장 공간을 보존해요' : 'iOS 가 아직 허용하지 않았어요 · 홈 화면 앱에서 다시 눌러 주세요') }}>저장 공간 보존 요청</button>}
        </div>
        <div className="tiny muted">기기·버전·화면·저장 공간·동기화 상태·최근 오류를 글로 복사해요. 토큰이나 노트 내용은 들어가지 않아요. 저장 공간: {pers == null ? '확인 중' : pers ? '보존됨 (공간이 부족해도 지워지지 않아요)' : '보존 요청 전'}</div>
        <Toggle checked={st.appBadge !== false} onChange={(v) => { setSettings({ appBadge: v }); setTimeout(updateBadge, 50) }} label="앱 아이콘에 남은 할 일 수 (알림 허용 필요)" />
      </div>
    </Card>
  )
}

// 아이폰 캘린더에 구독 (.ics)
function CalendarSubCard() {
  const sync = useSyncStatus(), st = useSettings()
  const url = calendarUrl()
  return (
    <Card title="아이폰 캘린더에 구독">
      {url ? <>
        <div className="small" style={{ lineHeight: 1.7 }}>
          일정·할 일 마감·D-day 가 아이폰 기본 캘린더 앱에 보여요.<br />
          1. 아래 주소 복사<br />
          2. 아이폰 <b>설정 › 캘린더 › 캘린더 계정 › 계정 추가 › 기타 › 구독 캘린더 추가</b> › 붙여넣기 › 다음 › 저장
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input grow" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
        </div>
        <div className="row wrap" style={{ gap: 12, marginTop: 8 }}>
          {[['icsEvents', '일정'], ['icsTasks', '할 일 마감'], ['icsDdays', 'D-day']].map(([k, l]) => <Toggle key={k} label={l} checked={st[k] !== false} onChange={(v) => setSettings({ [k]: v })} />)}
          <Toggle label="학교 수업 (시간표)" checked={!!st.icsClasses} onChange={(v) => setSettings({ icsClasses: v })} />
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>앱에서 바꾸면 몇 분 안에 파일이 갱신되고, 캘린더 앱은 iOS 가 정한 주기(보통 1시간 안팎)로 새로 가져와요. 읽기 전용이라 캘린더 앱에서 고친 내용은 돌아오지 않아요.</div>
      </> : <div className="small muted">{sync.state === 'off' ? '동기화를 연결하면 구독 주소가 생겨요.' : '다음 동기화 뒤에 주소가 나타나요.'}</div>}
    </Card>
  )
}

// 공유 시트로 할 일 추가 (iOS 단축어)
function ShareCaptureCard() {
  const base = location.origin + location.pathname
  const tmpl = base + '?add='
  return (
    <Card title="공유 시트로 할 일·노트 추가">
      <div className="small" style={{ lineHeight: 1.7 }}>
        사파리·메모 등에서 <b>공유 › 할 일로</b> 를 누르면 받은 편지함에 들어가요.<br />
        1. <b>단축어</b> 앱 › ＋ 새 단축어 › 이름 ‘할 일로’<br />
        2. 단축어 설정(ⓘ) › <b>공유 시트에서 보기</b> 켜기 · 받는 유형: 텍스트·URL<br />
        3. 동작 추가: <b>URL</b> → 아래 주소 붙여넣고 끝에 <b>단축어 입력</b> 변수 넣기 → 이어서 <b>URL 열기</b>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={tmpl} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(tmpl); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>단축어는 사파리로 열려요. 사파리에서도 한 번 동기화를 연결해 두면 홈 화면 앱에 바로 나타나요.</div>
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
      <b className="small">노트로 저장</b>
      <div className="small" style={{ lineHeight: 1.7, marginTop: 4 }}>
        기사·블로그·메모 글을 <b>공유 › 노트로</b> 로 저장해요. 링크·고른 글이 담긴 노트가 바로 열려요.<br />
        1. 위와 같이 새 단축어 ‘노트로’ (공유 시트에서 보기 · 텍스트·URL·사파리 웹 페이지)<br />
        2. (선택) 동작 <b>웹 페이지 세부 정보 가져오기 › 이름</b> → 제목으로 씀<br />
        3. 동작 <b>URL</b>: 아래 주소 + <b>단축어 입력</b> (제목을 넣으려면 끝에 <code>&amp;title=</code> + 이름) → <b>URL 열기</b>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={base + '?note='} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(base + '?note='); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
      </div>
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
      <b className="small">사진으로 (문제집·필기 사진)</b>
      <div className="small" style={{ lineHeight: 1.7, marginTop: 4 }}>
        사진 앱·카메라에서 <b>공유 › 사진으로</b> → 앱이 열리면 <b>붙여넣기</b> 한 번 → 할 일 또는 노트에 첨부돼요.<br />
        1. 새 단축어 ‘사진으로’ (공유 시트에서 보기 · 받는 유형: 이미지)<br />
        2. 동작 <b>클립보드에 복사</b>(단축어 입력) → <b>URL</b>: 아래 주소 → <b>URL 열기</b>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={base + '?photo=1'} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(base + '?photo=1'); toast('주소를 복사했어요') } catch { toast('주소를 길게 눌러 복사해 주세요') } }}>복사</button>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>⋯ 메뉴 › 사진 넣기 로도 열 수 있어요. PDF 는 노트에서 파일 첨부로 추가해 주세요.</div>
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
      <PhotoInboxGuide />
    </Card>
  )
}

// 사진 받기함: 단축어가 동기화 gist 에 사진을 올리면 앱(홈 화면 앱)이 다음 동기화 때 받은 편지함으로 가져옴 — 사파리를 거치지 않음
function PhotoInboxGuide() {
  const gid = gistInfo().gistId, api = gid ? `https://api.github.com/gists/${gid}` : ''
  const copy = async (v, m) => { try { await navigator.clipboard.writeText(v); toast(m) } catch { toast('길게 눌러 복사해 주세요') } }
  return (
    <>
      <b className="small">사진 앱 › 공유 › Scriptable 로 바로 보내기 (가장 간단)</b>
      <div className="small" style={{ lineHeight: 1.75, marginTop: 4, marginBottom: 10 }}>
        1. Scriptable 에서 위젯 스크립트 실행 › 메뉴 › <b>위젯에서 바로 처리 켜기</b> (토큰 저장 · 이미 했으면 생략)<br />
        2. Scriptable 의 스크립트 목록에서 위젯 스크립트를 길게 눌러 <b>설정(ⓘ)</b> › <b>Share Sheet Inputs</b> › <b>Images</b> 켜기<br />
        3. 사진 앱에서 사진(여러 장 가능) › 공유 › <b>Run Script</b> › 위젯 스크립트 → 제목 적고 <b>보내기</b><br />
        → 앱을 열면 <b>받은 편지함</b>에 사진이 첨부된 할 일로 들어와요. 사파리는 열리지 않아요.
      </div>
      <b className="small">또는 단축어로 (사파리 안 거침)</b>
      <div className="small" style={{ lineHeight: 1.75, marginTop: 4 }}>
        사진 앱에서 <b>공유 › 앱에 사진</b> → 사진이 동기화 저장소에 올라가고, 홈 화면 앱을 열면 <b>받은 편지함</b> 할 일(사진 첨부)로 들어와요. 아이폰·아이패드 어디서 열어도 돼요.<br />
        1. 새 단축어 ‘앱에 사진’ · ⓘ › <b>공유 시트에서 보기</b> · 받는 유형: 이미지<br />
        2. <b>이미지 크기 조절</b> → 너비 1600 (높이 자동)<br />
        3. <b>이미지 변환</b> → JPEG · 품질 0.7 · 메타데이터 보존 끄기<br />
        4. <b>Base64 인코딩</b> (줄 바꿈: 없음)<br />
        5. <b>URL</b> → 아래 주소<br />
        6. <b>URL의 콘텐츠 가져오기</b> · 방법 <b>PATCH</b><br />
        　· 헤더 <code>Authorization</code> = <code>Bearer 토큰</code>, <code>Accept</code> = <code>application/vnd.github+json</code><br />
        　· 요청 본문 <b>JSON</b>: <code>files</code> (사전) › 키 <code>inbox-</code>＋<b>현재 날짜</b> (사전) › <code>content</code> (텍스트) = <b>Base64 인코딩된 결과</b><br />
        7. (선택) <b>알림 보기</b> ‘앱에 보냈어요’
      </div>
      {gid ? <div className="row" style={{ marginTop: 8 }}>
        <input className="input grow" readOnly value={api} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={() => copy(api, '주소를 복사했어요')}>복사</button>
      </div> : <div className="small" style={{ color: 'var(--danger)', marginTop: 6 }}>먼저 위 ‘동기화’를 연결해 주세요.</div>}
      <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
        키를 <code>inbox-수학 p.52</code> 처럼 쓰면 그 글이 할 일 제목이 돼요(날짜만 있으면 ‘사진’).<br />
        토큰은 이 단축어 안에만 넣고, 단축어를 남에게 공유하지 마세요. 따로 쓰려면 GitHub › Fine-grained token › 권한 <b>Gists: Read and write</b> 만 준 토큰을 새로 만들어 쓰면 안전해요.
      </div>
    </>
  )
}

// 자동 백업 목록 (보관용 gist 에 매주 저장, 최근 4개)
function AutoBackups() {
  const sync = useSyncStatus()
  const [list, setList] = useState(null), [busy, setBusy] = useState(false)
  const load = () => listBackups().then(setList).catch((e) => setList({ error: e.message }))
  useEffect(() => { if (sync.state !== 'off') load() }, [sync.state === 'off']) // eslint-disable-line
  if (sync.state === 'off') return <div className="tiny muted" style={{ marginTop: 8 }}>동기화를 연결하면 매주 자동 백업돼요.</div>
  return (
    <div style={{ marginTop: 10 }}>
      <div className="row between"><span className="small">자동 백업 <span className="tiny muted">· 매주 · 최근 4개</span></span>
        <button className="btn sm" disabled={busy} onClick={async () => { setBusy(true); try { await backupNow(); toast('백업했어요'); load() } catch (e) { toast(e.message) } setBusy(false) }}>지금 백업</button></div>
      <div className="list">
        {Array.isArray(list) && list.map((b) => (
          <div key={b.name} className="item" style={{ padding: '6px 0', alignItems: 'center' }}>
            <span className="grow small">{fmtDateK(b.date)}</span><span className="tiny muted">{Math.round(b.size / 1024)}KB</span>
            <button className="btn sm" onClick={() => confirmSheet('되돌리기', `${fmtDateK(b.date)} 백업 내용으로 되돌릴까요? 백업 이후 새로 만든 항목은 그대로 남아요.`, async () => { try { await restoreBackup(b); toast('되돌렸어요') } catch (e) { toast(e.message) } }, '되돌리기')}>되돌리기</button>
          </div>
        ))}
        {Array.isArray(list) && !list.length && <div className="tiny muted">아직 백업이 없어요 · 다음 동기화 때 만들어져요</div>}
        {list?.error && <div className="tiny muted">{list.error}</div>}
      </div>
    </div>
  )
}
const fmtDateK = (s) => { const [y, m, d] = s.split('-'); return `${y}년 ${+m}월 ${+d}일` }

// 동기화 기록: 언제 · 받음/보냄 · 겹침(양쪽에서 같은 항목 수정 → 최신 수정 우선) · 오류
function SyncLog() {
  useSyncStatus()
  const log = syncLog().slice(0, 6)
  if (!log.length) return null
  return (
    <details className="small">
      <summary className="muted">동기화 기록</summary>
      <div className="col" style={{ gap: 2, marginTop: 4 }}>
        {log.map((x, i) => <div key={i} className="tiny row" style={{ gap: 8 }}><span className="muted" style={{ width: 82, flexShrink: 0 }}>{new Date(x.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {x.err ? <span style={{ color: 'var(--danger)' }}>오류 · {x.err}</span> : <span>받음 {x.got} · 보냄 {x.sent}{x.clash ? <b style={{ fontWeight: 500 }}> · 겹침 {x.clash} (최신 수정 우선)</b> : ''}</span>}</div>)}
      </div>
    </details>
  )
}

function SyncCard() {
  const s = useSyncStatus()
  const st = useSettings()
  const [tok, setTok] = useState('')
  const [busy, setBusy] = useState(false)
  const on = s.state !== 'off'
  const gistId = (() => { try { return localStorage.getItem('gist_id') } catch { return null } })()
  const label = { ok: '동기화됨', syncing: '동기화 중…', pending: '대기 중', error: '오류', idle: '연결됨', off: '꺼짐' }[s.state]
  return (
    <Card title="아이폰·아이패드 동기화" action={<span className="row small"><span className={'sync-dot ' + s.state} />{label}</span>}>
      {!on ? (
        <div className="form">
          <div className="small muted">
            1. github.com → Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → <b>gist</b> 권한만 체크, Expiration 은 <b>No expiration</b> 으로 생성<br />
            2. 아래에 붙여넣고 연결 (두 기기 모두 같은 토큰) — 비공개 Gist 가 자동으로 만들어지거나 찾아집니다.<br />
            ※ 토큰은 메모·채팅·공개 저장소 등에 붙여넣지 마세요. GitHub 가 공개된 토큰을 발견하면 바로 취소해요.
          </div>
          <input className="input" type="password" autoComplete="off" placeholder="ghp_…" value={tok} onChange={(e) => setTok(e.target.value)} />
          <button className="btn primary" disabled={!tok || busy} onClick={async () => { setBusy(true); try { const id = await connect(tok); toast(id ? '동기화 연결됨' : '토큰 저장됨 · 연결은 자동으로 다시 시도해요'); setTok('') } catch (e) { toast(e.message) } setBusy(false) }}>{busy ? '연결 중…' : '연결'}</button>
          {s.error && <div className="small" style={{ color: 'var(--danger)' }}>{s.error}</div>}
        </div>
      ) : (
        <div className="form">
          <div className="small muted">마지막 동기화: {s.last ? new Date(s.last).toLocaleString('ko-KR') : '-'}</div>
          <Devices />
          {(() => { const e = tokenExpiry(); if (!e) return null; const d = new Date(e.replace(' UTC', 'Z').replace(' ', 'T')), left = Math.ceil((d - Date.now()) / 86400000)
            return <div className="small" style={{ color: left <= 7 ? 'var(--danger)' : 'var(--muted)' }}>토큰 만료: {d.toLocaleDateString('ko-KR')}{left <= 7 ? ` · ${Math.max(0, left)}일 남음 — 만료 없는 새 토큰으로 바꿔 주세요` : ''}</div> })()}
          {s.error && <div className="small" style={{ color: 'var(--danger)' }}>{s.error}</div>}
          {(s.auth || (tokenExpiry() && new Date(tokenExpiry().replace(' UTC', 'Z').replace(' ', 'T')) - Date.now() < 7 * 86400000)) && <div className="row"><input className="input" type="password" autoComplete="off" placeholder="새 토큰 ghp_…" value={tok} onChange={(e) => setTok(e.target.value)} /><button className="btn primary" disabled={!tok || busy} onClick={async () => { setBusy(true); try { await connect(tok); setTok('') } catch (e) { toast(e.message) } setBusy(false) }}>다시 연결</button></div>}
          <div className="row wrap">
            <button className="btn" onClick={() => syncNow()}><Icon name="sync" size={16} />지금 동기화</button>
            {gistId && <a className="btn" href={`https://gist.github.com/${gistId}`} target="_blank" rel="noreferrer">Gist 보기</a>}
            <button className="btn danger" onClick={() => confirmSheet('연결 해제', '이 기기의 토큰을 지웁니다. 데이터는 그대로 남아요.', disconnect, '해제')}>연결 해제</button>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(connectLink()); toast('복사했어요 · Safari 주소창에 붙여 넣으세요') } catch { toast('복사하지 못했어요') } }}>Safari 연결 링크 복사</button>
            <div className="tiny muted">위젯을 누르면 iOS 가 홈 화면 앱 대신 Safari 로 열어요(iOS 제한 · 웹 앱을 직접 여는 방법이 없어요). Safari 는 저장소가 따로라, 이 링크를 Safari 주소창에 한 번 붙여 넣으면 Safari 도 같은 데이터로 동기화돼요. 링크에 토큰이 들어 있으니 메모·채팅에 붙이지 말고 바로 Safari 에만 쓰세요.</div>
          </div>
          <SyncLog />
          <Field label="자동 동기화 간격 (열려 있을 때)"><Seg value={st.syncEvery || 'normal'} onChange={(v) => setSettings({ syncEvery: v })} options={[['normal', '3분'], ['eco', '10분 · 절약'], ['off', '끄기']]} /></Field>
          <div className="tiny muted" style={{ marginTop: -4 }}>편집한 내용은 4초 뒤(연속이면 30초 간격) 올리고, 앱을 열거나 나갈 때도 동기화해요. 타이머 중에는 1분마다 받아요. ‘끄기’는 앱을 열고 닫을 때·편집할 때만 동기화해요.</div>
          <div className="tiny muted">앱을 열 때·돌아올 때·편집 후·정한 간격마다 자동 동기화. 같은 항목은 최신 수정이 우선합니다. 홈 화면 앱과 사파리는 저장 공간이 따로라, 위젯을 눌러 사파리로 열었다면 사파리에서도 한 번 연결해 주세요.</div>
        </div>
      )}
      <div className="divider" />
      <Toggle label="약·컨디션도 이 기기에만 저장" checked={st.syncExclude?.meds} onChange={(v) => setSettings({ syncExclude: { ...st.syncExclude, meds: v, medLogs: v, conditions: v } })} />
    </Card>
  )
}

function SubjectsCard() {
  const subjects = useColl('subjects')
  return (
    <Card title="과목" action={<div className="row" style={{ gap: 4 }}>
      <button className="btn sm ghost" onClick={() => confirmSheet('과목 색 정리', '모든 과목 색을 서로 어울리는 저채도 색으로 다시 정할까요?', () => { const cs = harmonize(subjects.length); subjects.forEach((s, i) => patch('subjects', s.id, { color: cs[i] })); toast('과목 색을 정리했어요') }, '정리')}>색 정리</button>
      <button className="btn sm" onClick={() => put('subjects', { name: '새 과목', color: pickColor(subjects.map((s) => s.color)) })}><Icon name="plus" size={14} />추가</button>
    </div>}>
      <div className="list">
        {subjects.map((s) => (
          <div key={s.id} className="row" style={{ padding: '6px 0' }}>
            <input type="color" value={s.color} onChange={(e) => patch('subjects', s.id, { color: e.target.value })} />
            <input className="input" value={s.name} onChange={(e) => patch('subjects', s.id, { name: e.target.value })} />
            <button className="icon-btn" onClick={() => confirmSheet('과목 삭제', `'${s.name}' 과목을 삭제할까요?`, () => remove('subjects', s.id), '삭제')} aria-label="삭제"><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProjectsCard() {
  const projects = useColl('projects')
  return (
    <Card title="프로젝트" action={<button className="btn sm" onClick={() => put('projects', { name: '새 프로젝트', color: PALETTE[(projects.length + 2) % PALETTE.length] })}><Icon name="plus" size={14} />추가</button>}>
      <div className="list">
        {projects.map((p) => (
          <div key={p.id} className="row" style={{ padding: '6px 0' }}>
            <input type="color" value={p.color} onChange={(e) => patch('projects', p.id, { color: e.target.value })} />
            <input className="input" value={p.name} onChange={(e) => patch('projects', p.id, { name: e.target.value })} />
            <button className="icon-btn" onClick={() => confirmSheet('프로젝트 삭제', `'${p.name}' 을 삭제할까요? 할 일은 남아요.`, () => remove('projects', p.id), '삭제')} aria-label="삭제"><Icon name="trash" size={16} /></button>
          </div>
        ))}
        {!projects.length && <div className="empty">리포트, 대회 준비처럼 여러 할 일을 묶어 관리해요</div>}
      </div>
    </Card>
  )
}

function TemplatesCard() {
  const tpls = useColl('templates')
  return (
    <Card title="요일별 기본 하루 템플릿" action={<button className="btn sm" onClick={() => openTemplate(put('templates', { name: '새 템플릿', weekdays: [], blocks: [] }).id)}><Icon name="plus" size={14} />추가</button>}>
      <div className="list">
        {tpls.map((t) => (
          <button key={t.id} className="item" style={{ textAlign: 'left' }} onClick={() => openTemplate(t.id)}>
            <div className="t"><div>{t.name}</div><div className="meta">{(t.weekdays || []).sort().map((d) => WD[d]).join('·') || '요일 없음'} · 블록 {t.blocks?.length || 0}개</div></div>
          </button>
        ))}
        {!tpls.length && <div className="empty">예: “월수금 학원 있는 날” — 요일에 맞춰 자동으로 하루를 채워요</div>}
      </div>
    </Card>
  )
}

export function openTemplate(id) { openSheet(() => <TemplateEditor id={id} />, { title: '하루 템플릿', full: true }) }

function TemplateEditor({ id }) {
  const tpls = useColl('templates')
  const t = tpls.find((x) => x.id === id)
  const [nb, setNb] = useState({ title: '', start: 18 * 60, dur: 60, kind: 'study', subjectId: null })
  if (!t) return null
  const up = (p) => patch('templates', id, p)
  const blocks = [...(t.blocks || [])].sort((a, b) => a.start - b.start)
  return (
    <div className="form">
      <Field label="이름"><input className="input" value={t.name} onChange={(e) => up({ name: e.target.value })} /></Field>
      <Field label="적용 요일">
        <div className="row wrap" style={{ gap: 4 }}>
          {WD.map((w, i) => { const on = t.weekdays?.includes(i); return <button key={i} className={'chip' + (on ? ' on' : '')} onClick={() => up({ weekdays: on ? t.weekdays.filter((x) => x !== i) : [...(t.weekdays || []), i] })}>{w}</button> })}
        </div>
      </Field>
      <div className="list">
        {blocks.map((b) => (
          <div key={b.id} className="item">
            <div className="t"><div>{b.title}</div><div className="meta">{fmtTime(b.start)}–{fmtTime(b.start + b.dur)} · {{ study: '공부', break: '휴식', custom: '기타', task: '할 일' }[b.kind]}</div></div>
            <button className="icon-btn" onClick={() => up({ blocks: t.blocks.filter((x) => x.id !== b.id) })} aria-label="삭제"><Icon name="close" size={14} /></button>
          </div>
        ))}
      </div>
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <div className="form">
          <input className="input" placeholder="블록 이름 (예: 학원, 수학 자습)" value={nb.title} onChange={(e) => setNb({ ...nb, title: e.target.value })} />
          <div className="row">
            <Field label="시작"><TimeInput allowEmpty={false} value={nb.start} onChange={(v) => setNb({ ...nb, start: v ?? 0 })} /></Field>
            <Field label="길이(분)"><input className="input" type="number" step="10" value={nb.dur} onChange={(e) => setNb({ ...nb, dur: +e.target.value })} /></Field>
          </div>
          <div className="row">
            <select className="input" value={nb.kind} onChange={(e) => setNb({ ...nb, kind: e.target.value })}><option value="study">공부</option><option value="break">휴식</option><option value="custom">기타</option></select>
            <SubjectSelect value={nb.subjectId} onChange={(v) => setNb({ ...nb, subjectId: v })} />
          </div>
          <button className="btn" onClick={() => { if (!nb.title) return; up({ blocks: [...(t.blocks || []), { ...nb, id: uid() }] }); setNb({ ...nb, title: '', start: nb.start + nb.dur }) }}>블록 추가</button>
        </div>
      </div>
      <button className="btn danger" onClick={() => remove('templates', id)}>템플릿 삭제</button>
    </div>
  )
}

function PushCard() {
  const st = useSettings()
  const sync = useSyncStatus()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setOn) }, [])
  const connected = sync.state !== 'off'
  // 알림 서버(GitHub Actions)가 마지막으로 확인한 시각
  const [last, setLast] = useState(undefined)
  useEffect(() => { if (connected) readGistFile('push-sent.json').then((x) => setLast(x?._meta?.lastRun || null)).catch(() => setLast(null)) }, [connected])
  const ago = last ? Math.round((Date.now() - last) / 60000) : null
  const t2m = (v) => v == null ? null : +v.split(':')[0] * 60 + +v.split(':')[1]
  const m2t = (m) => m == null ? null : fmtTime(m)
  return (
    <Card title="알림" action={<span className="small">{on ? '● 켜짐' : '꺼짐'}</span>}>
      <div className="form">
        <div className="small muted">
          할 일 시간 · 일정 알림 · 약 · 아침 요약 · 저녁 공부 목표를 푸시로 보내요. GitHub Actions 가 5분마다 확인해 보내므로 몇 분 늦을 수 있어요.
        </div>
        {!isStandalone() && <div className="small" style={{ color: 'var(--danger)' }}>iPhone·iPad 는 Safari › 공유 › 홈 화면에 추가 후, 설치된 앱에서 켜야 해요 (iOS 16.4+)</div>}
        {!connected && <div className="small" style={{ color: 'var(--danger)' }}>먼저 위의 동기화를 연결하세요</div>}
        <div className="row wrap">
          {!on ? <button className="btn primary" disabled={busy || !connected || !pushSupported()} onClick={async () => { setBusy(true); try { await enablePush(); setOn(true); setSettings({ notify: true }); toast('이 기기에서 알림을 받아요') } catch (e) { toast(e.message) } setBusy(false) }}>{busy ? '설정 중…' : '이 기기에서 알림 켜기'}</button>
            : <button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await disablePush(); setOn(false); toast('알림 해제') } catch (e) { toast(e.message) } setBusy(false) }}>이 기기 알림 끄기</button>}
          {on && <button className="btn" onClick={() => testLocal()}>테스트</button>}
        </div>
        {connected && last !== undefined && (
          <div className="small" style={{ color: ago == null || ago > 90 ? 'var(--danger)' : 'var(--muted)' }}>
            알림 서버 마지막 확인: {ago == null ? '아직 없음' : ago < 1 ? '방금' : ago < 60 ? `${ago}분 전` : `${Math.floor(ago / 60)}시간 ${ago % 60}분 전`}
            {ago != null && ago <= 90 && ' · 보낼 알림이 없으면 1시간에 한 번만 남겨요'}{(ago == null || ago > 90) && ' · GitHub 예약 실행이 늦어지고 있어요. 아래 ‘정확한 시간에 받기’를 설정하세요.'}
          </div>
        )}
        <div className="row">
          <Field label="아침 요약"><TimeInput value={t2m(st.notifyMorning ?? '07:30')} onChange={(v) => setSettings({ notifyMorning: m2t(v) })} defaultValue={450} /></Field>
          <Field label="저녁 목표 알림"><TimeInput value={t2m(st.notifyEvening ?? '21:00')} onChange={(v) => setSettings({ notifyEvening: m2t(v) })} defaultValue={1260} /></Field>
        </div>
        <Toggle label="할 일 알림 요약해서 받기" checked={!!st.digest?.on} onChange={(v) => setSettings({ digest: { times: DIGEST_TIMES, ...(st.digest || {}), on: v } })} />
        {st.digest?.on && (
          <div className="col" style={{ gap: 6 }}>
            <div className="tiny muted">할 일 알림을 바로 보내지 않고, 아래 시각마다 다음 요약 전까지 예정된 것을 한 번에 보내요. 일정·약 알림은 그대로 바로 와요.</div>
            <div className="row wrap" style={{ gap: 6 }}>
              {(st.digest.times || DIGEST_TIMES).map((tm, i) => (
                <div key={i} className="row" style={{ gap: 2 }}>
                  <TimeInput value={t2m(tm)} allowEmpty={false} onChange={(v) => setSettings({ digest: { ...st.digest, times: (st.digest.times || DIGEST_TIMES).map((x, j) => (j === i ? m2t(v) : x)) } })} />
                  {(st.digest.times || DIGEST_TIMES).length > 1 && <button className="icon-btn" aria-label="삭제" onClick={() => setSettings({ digest: { ...st.digest, times: (st.digest.times || DIGEST_TIMES).filter((_, j) => j !== i) } })}><Icon name="close" size={12} /></button>}
                </div>
              ))}
              {(st.digest.times || DIGEST_TIMES).length < 6 && <button className="chip" onClick={() => setSettings({ digest: { ...st.digest, times: [...(st.digest.times || DIGEST_TIMES), '21:00'] } })}>＋ 시각</button>}
            </div>
          </div>
        )}
        <details className="more">
          <summary>정확한 시간에 받기 (5분마다 깨우기 · 권장)</summary>
          <div className="small" style={{ marginTop: 6, lineHeight: 1.75 }}>
            GitHub 의 예약 실행은 무료라서 몇 시간씩 밀리기도 해요. 무료 서비스 <b>cron-job.org</b> 가 5분마다 알림 확인을 실행하게 하면 제시간에 와요.<br />
            1. github.com › Settings › Developer settings › <b>Fine-grained tokens</b> › 새 토큰: 저장소 <b>hysdllover/new</b> 만 · 권한 <b>Actions: Read and write</b><br />
            2. cron-job.org 가입 › <b>CREATE CRONJOB</b> · URL 은 아래 주소 · 실행 간격 <b>5분</b><br />
            3. <b>ADVANCED</b> › 요청 방식 <b>POST</b> · 헤더 <code>Authorization</code> = <code>Bearer 토큰</code>, <code>Accept</code> = <code>application/vnd.github+json</code> · 본문 <code>{'{"ref":"main"}'}</code><br />
            4. 저장 후 몇 분 뒤 위 ‘마지막 확인’ 이 몇 분 전으로 바뀌면 완료
          </div>
          {[['주소', 'https://api.github.com/repos/hysdllover/new/actions/workflows/notify.yml/dispatches'], ['본문', '{"ref":"main"}']].map(([k, v]) => (
            <div key={k} className="row" style={{ marginTop: 6 }}>
              <span className="tiny muted nowrap" style={{ width: 28 }}>{k}</span>
              <input className="input grow" readOnly value={v} onFocus={(e) => e.target.select()} />
              <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(v); toast('복사했어요') } catch { toast('길게 눌러 복사해 주세요') } }}>복사</button>
            </div>
          ))}
          <div className="tiny muted" style={{ marginTop: 6 }}>토큰은 이 저장소의 Actions 실행 권한만 있어 안전해요. 앱이 열려 있을 때는 앱이 직접 알림을 띄워요.</div>
        </details>
        <details className="more">
          <summary>처음 한 번만: GitHub 설정</summary>
          <div className="small" style={{ marginTop: 6, lineHeight: 1.7 }}>
            1. github.com/hysdllover/new › <b>Settings › Secrets and variables › Actions</b><br />
            2. <b>New repository secret</b> → 이름 <code>GIST_TOKEN</code>, 값은 동기화에 쓴 토큰<br />
            3. Actions 탭 › <b>Push notifications</b> 가 10분마다 자동 실행돼요<br />
            <span className="muted">푸시 키는 비공개 Gist 에 저장됩니다.</span>
          </div>
        </details>
      </div>
    </Card>
  )
}

function HomeWidgetCard() {
  const sync = useSyncStatus()
  const appUrl = location.origin + location.pathname
  const copy = async () => {
    if (!gistInfo().widgetRaw) await syncNow({ flush: true })
    const { widgetRaw } = gistInfo()
    if (!widgetRaw) { toast('동기화가 끝난 뒤 다시 눌러 주세요'); return }
    const script = buildLoader({ widgetRaw, appUrl })
    try { await navigator.clipboard.writeText(script); toast('스크립트를 복사했어요') }
    catch { openSheet(() => <textarea className="input" readOnly value={script} style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 11 }} onFocus={(e) => e.target.select()} />, { title: '스크립트 (전체 선택 후 복사)', full: true }) }
  }
  return (
    <Card title="아이폰·아이패드 홈 화면 위젯">
      <WidgetPreview />
      <WidgetFontField />
      <div className="small" style={{ lineHeight: 1.7, marginTop: 10 }}>
        1. App Store 에서 무료 앱 <b>Scriptable</b> 설치<br />
        2. 아래 <b>스크립트 복사</b> → Scriptable › ＋ › 붙여넣기 → 이름 ‘스터디’<br />
        3. 홈 화면 길게 누르기 › ＋ › Scriptable 위젯(소·중·대) 추가 → 위젯 편집 › Script: ‘스터디’ · Parameter: 위 형태 단어<br />
        4. 투명 배경(아이폰): Scriptable 에서 ‘스터디’ 스크립트를 눌러 실행 › 투명 배경 설정 › 빈 홈 화면 스크린샷·위젯 크기·위치 선택. 같은 크기 위젯이 여러 개면 Parameter 에 @번호를 붙여 구분 (예: 공부@2). 글자색도 같은 메뉴에서 바꿔요.<br />
        5. 잠금 화면: 잠금 화면 길게 누르기 › 사용자화 › 잠금 화면 › 위젯 추가 › Scriptable → <b>추가한 위젯을 한 번 더 눌러 Script: ‘스터디’ 선택</b> (안 고르면 빈칸) · 잠금 화면도 Parameter 로 공부 · 할일 · 달력 · 캘린더 · 다짐 · 디데이(다음 D-day 는 디데이2) · 시간표 · 주간 · 과목 · 지금 · 진도 · 목표 · 오늘 · 대시보드 지정 (비우면 기본, 아이폰·아이패드 같음). 원형 전용: <b>진행</b>(공부 %) · <b>남은분</b>(다음 일정까지)<br />
        · 과목 고정 시작 버튼: Parameter 에 <b>시작:수학</b> (누르면 그 과목 타이머 시작) · 할 일을 누르면 확인 없이 바로 완료돼요(되돌리기 가능)<br />
        6. 아이패드 잠금 화면은 iPadOS 17 이상. 빈칸·오류가 보이면 Scriptable 에서 스크립트를 실행 › ‘잠금 화면 미리보기’로 오류 문구를 확인하세요.
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>위젯을 누르면 해당 화면(할 일·공부 기록)이 열려요. iOS 제한으로 사파리에서 열리니, 사파리에서도 한 번 동기화를 연결해 두세요.</div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" disabled={sync.state === 'off'} onClick={copy}><Icon name="download" size={16} />스크립트 복사</button>
        {sync.state === 'off' && <span className="small muted">동기화를 먼저 연결하세요</span>}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>스크립트에는 토큰이 들어가지 않아요(위젯 전용 비공개 주소만). 자동 업데이트 방식이라 한 번만 붙여 넣으면 앱이 바뀔 때 위젯도 같이 바뀌어요(예전 긴 스크립트를 쓰고 있다면 이번에 한 번만 새로 복사해 바꿔 주세요). 갱신 주기는 iOS가 정해요(보통 15분~1시간). 날짜 옆에 시각이 보이면 그때 받은 데이터예요.</div>
      <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}><b>위젯에서 바로 처리</b>: Scriptable 에서 이 스크립트를 한 번 실행 › 메뉴 › <b>위젯에서 바로 처리 켜기</b> › GitHub 토큰(Gists 읽기·쓰기) 입력. 그러면 위젯의 할 일을 누르면 바로 완료, 타이머·바로 시작 버튼은 시작·일시정지·정지, 그 밖의 칸을 누르면 Scriptable 안에 간단한 앱 화면(공부·타이머 · 오늘 할 일 체크 · 일정·D-day · 노트 읽기)이 열려요. 사파리를 거치지 않고, 앱을 열면 기록에도 반영돼요. 토큰은 그 아이폰의 Scriptable 보관함에만 저장돼요.</div>
      <WidgetSets />
      <ControlCenterGuide />
    </Card>
  )
}

// 위젯 레이아웃 세트: 상황별로 어떤 위젯을 어디에 둘지 (Parameter 를 누르면 복사)
const WSETS = [
  ['공부 집중', [['홈 · 중', '대시보드'], ['홈 · 소', '타이머'], ['홈 · 소', '습관'], ['잠금 · 직사각형', '지금'], ['잠금 · 원형', '진행'], ['잠금 · 한 줄', '디데이']]],
  ['시험 기간', [['홈 · 대', '디데이목록'], ['홈 · 중', '마감'], ['홈 · 소', '진도'], ['잠금 · 직사각형', '마감'], ['잠금 · 원형', '남은분'], ['잠금 · 한 줄', '공부']]],
  ['노트 복습', [['홈 · 중', '노트'], ['홈 · 소', '노트:영어'], ['홈 · 소', '습관'], ['잠금 · 직사각형', '노트'], ['잠금 · 한 줄', '노트']]],
  ['하루 계획', [['홈 · 대', '오늘'], ['홈 · 중', '캘린더'], ['홈 · 소', '할일'], ['잠금 · 직사각형', '캘린더'], ['잠금 · 한 줄', '지금']]],
]
function WidgetSets() {
  const copy = async (v) => { try { await navigator.clipboard.writeText(v); toast(`‘${v}’ 복사 · 위젯 편집 › Parameter 에 붙여 넣기`) } catch { toast(v) } }
  return (
    <div style={{ marginTop: 12 }}>
      <b className="small">위젯 레이아웃 세트</b>
      <div className="tiny muted" style={{ margin: '2px 0 6px' }}>위치마다 위젯을 두고 Parameter 를 이렇게 적어요 (눌러서 복사)</div>
      <div className="col" style={{ gap: 8 }}>
        {WSETS.map(([name, items]) => (
          <div key={name} className="wset">
            <span className="small" style={{ minWidth: 64 }}>{name}</span>
            <div className="row wrap" style={{ gap: 4 }}>{items.map(([where, p], k) => <button key={k} className="chip sm" onClick={() => copy(p)}><span className="tiny muted">{where}</span>&nbsp;{p}</button>)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 제어 센터 · 동작 버튼: 단축어 'URL 열기' 로 위젯 스크립트의 바로 처리 화면을 엶 (사파리 안 거침)
function ControlCenterGuide() {
  const [name, setName] = useState(() => { try { return localStorage.getItem('scriptable_name') || '' } catch { return '' } })
  const save = (v) => { setName(v); try { localStorage.setItem('scriptable_name', v) } catch {} }
  const url = (q) => `scriptable:///run/${encodeURIComponent(name.trim() || '스크립트이름')}?${q}`
  const ACTS = [['타이머 시작·정지', 'act=timer'], ['공부 기록 추가', 'act=log'], ['할 일 추가', 'act=addtask'], ['노트에 한 줄', 'act=noteline'], ['오늘 한눈에', 'act=view']]
  const copy = async (v) => { try { await navigator.clipboard.writeText(v); toast('주소를 복사했어요') } catch { toast('길게 눌러 복사해 주세요') } }
  return (
    <div style={{ marginTop: 14 }}>
      <b className="small">제어 센터 · 동작 버튼</b>
      <div className="small" style={{ lineHeight: 1.7, marginTop: 4 }}>
        1. 단축어 앱 › 새 단축어 › 동작 <b>URL 열기</b> 에 아래 주소 붙여 넣기 (이름 예: ‘타이머’)<br />
        2. 제어 센터 편집 › <b>컨트롤 추가</b> › 단축어 › 그 단축어 · 또는 설정 › <b>동작 버튼</b> › 단축어<br />
        ※ ‘위젯에서 바로 처리’를 켜 둔 기기에서 돼요.
      </div>
      <input className="input" style={{ marginTop: 6 }} placeholder="Scriptable 에 붙여 넣은 스크립트 이름" value={name} onChange={(e) => save(e.target.value)} />
      <div className="col" style={{ gap: 4, marginTop: 6 }}>
        {ACTS.map(([l, q]) => <div key={q} className="row" style={{ gap: 6 }}><span className="small" style={{ width: 96, flexShrink: 0 }}>{l}</span><input className="input grow" readOnly value={url(q)} onFocus={(e) => e.target.select()} style={{ fontSize: 12 }} /><button className="btn sm" onClick={() => copy(url(q))}>복사</button></div>)}
      </div>
    </div>
  )
}

// 내 폰트 — 다운로드한 폰트 파일을 불러와 앱에 적용 (이 기기에만 저장)
function MyFonts({ th, setTheme, fonts }) {
  const st = useSettings()
  const [busy, setBusy] = useState(false)
  useEffect(() => { loadAllFonts() }, [fonts])
  const missing = th.font?.startsWith('my:') && !fonts.some((f) => 'my:' + f.id === th.font)
  const pick = () => {
    const i = document.createElement('input'); i.type = 'file'
    i.onchange = async () => {
      const f = i.files[0]; if (!f) return
      setBusy(true)
      try { const rec = await addFont(f); setTheme({ font: 'my:' + rec.id }); toast(`‘${rec.name}’ 폰트를 적용했어요`); syncNow() } catch (e) { toast(e.message) }
      setBusy(false)
    }
    i.click()
  }
  return (
    <div className="col" style={{ gap: 6 }}>
      {fonts.map((f) => (
        <div key={f.id} className="row" style={{ gap: 6 }}>
          <span className="grow ellipsis" style={{ fontFamily: `"${fontFamily(f.id)}"`, fontSize: '1.15em' }}>{f.name} 가나다 Aa 123</span>
          <span className="tiny muted">{f.size <= SYNC_FONT_MAX ? (f.synced ? '동기화됨' : '동기화 대기') : '이 기기만'}</span>
          {f.ps && <button className={'chip' + (st.widgetFont === f.ps ? ' on' : '')} onClick={() => { setSettings({ widgetFont: f.ps }); toast('위젯 폰트로 지정했어요') }}>위젯에도</button>}
          <button className="icon-btn" aria-label="삭제" onClick={() => confirmSheet('폰트 삭제', `‘${f.name}’ 폰트를 이 기기에서 지울까요?`, async () => { await removeFont(f.id); if (th.font === 'my:' + f.id) setTheme({ font: 'system' }); syncNow() }, '삭제')}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      <div className="row"><button className="btn sm" disabled={busy} onClick={pick}><Icon name="plus" size={14} />{busy ? '불러오는 중…' : '내 폰트 추가'}</button></div>
      <div className="tiny muted" style={{ lineHeight: 1.6 }}>
        다운로드한 폰트 파일(.ttf · .otf · .woff)을 파일 앱에서 선택하세요. 5MB 이하 폰트는 아이폰·아이패드에 자동으로 동기화되고, 그보다 큰 폰트는 기기마다 한 번씩 추가해 주세요.
        {missing && <><br /><b>지금 고른 내 폰트가 이 기기에 없어 기본 폰트로 보여요. 같은 폰트를 추가해 주세요.</b></>}
      </div>
    </div>
  )
}

// 아이패드 사이드바: 자주 쓰는 화면 고정 (누른 순서대로), 나머지는 '전체'로 접힘
function SidebarCard() {
  const st = useSettings(), pins = st.sidebarPins || []
  const tog = (k) => setSettings({ sidebarPins: pins.includes(k) ? pins.filter((x) => x !== k) : [...pins, k] })
  return (
    <Card title="아이패드 사이드바" action={pins.length > 0 && <button className="tiny muted" onClick={() => setSettings({ sidebarPins: [] })}>모두 해제</button>}>
      <div className="tiny muted" style={{ marginBottom: 6 }}>고정한 화면이 맨 위에 누른 순서대로 놓이고, 나머지는 ‘전체’ 아래로 접혀요. 저장된 뷰·프로젝트도 접을 수 있어요.</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {TAB_OPTIONS.map((o) => <button key={o.key} className={'chip' + (pins.includes(o.key) ? ' on' : '')} onClick={() => tog(o.key)}>{pins.includes(o.key) && <span className="tiny">{pins.indexOf(o.key) + 1}</span>}<Icon name={o.icon} size={13} />{o.label}</button>)}
      </div>
    </Card>
  )
}

// 하단 탭 직접 정하기 (아이폰 하단 탭 · 아이패드는 사이드바 그대로)
function TabBarCard() {
  const st = useSettings()
  const cur = st.tabBar?.length ? st.tabBar : DEFAULT_TABBAR
  const set = (v) => setSettings({ tabBar: v })
  const move = (i, d) => { const a = [...cur]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(a) }
  return (
    <Card title="하단 탭" action={<button className="tiny muted" onClick={() => set(null)}>기본으로</button>}>
      <div className="tiny muted" style={{ marginBottom: 6 }}>아이폰 아래 탭에 둘 화면을 2~5개 골라 순서를 정해요. 뺀 화면은 오른쪽 위 ⋯ 메뉴에 있어요.</div>
      <div className="tabpick-bar">
        {cur.map((k, i) => { const o = tabOpt(k); return o && (
          <div key={k} className="tabpick">
            <Icon name={o.icon} size={18} /><span className="tiny">{o.label}</span>
            <div className="row" style={{ gap: 0 }}>
              <button className="icon-btn" aria-label="앞으로" disabled={i === 0} onClick={() => move(i, -1)}>‹</button>
              {cur.length > 2 && <button className="icon-btn" aria-label="빼기" onClick={() => set(cur.filter((x) => x !== k))}><Icon name="close" size={11} /></button>}
              <button className="icon-btn" aria-label="뒤로" disabled={i === cur.length - 1} onClick={() => move(i, 1)}>›</button>
            </div>
          </div>) })}
      </div>
      {cur.length < 5 && (
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          {TAB_OPTIONS.filter((o) => !cur.includes(o.key)).map((o) => <button key={o.key} className="chip" onClick={() => set([...cur, o.key])}><Icon name={o.icon} size={13} />{o.label}</button>)}
        </div>
      )}
    </Card>
  )
}

// 설정 검색: 글자가 들어 있는 카드만 보이고, 맞는 줄은 옅게 표시
function useSettingsSearch(ref, q) {
  useEffect(() => {
    const root = ref.current; if (!root) return
    const k = q.trim().toLowerCase().replace(/\s+/g, '')
    const norm = (el) => (el.textContent + ' ' + [...el.querySelectorAll('input[placeholder]')].map((i) => i.placeholder).join(' ')).toLowerCase().replace(/\s+/g, '')
    root.querySelectorAll('.ss-hit').forEach((x) => x.classList.remove('ss-hit'))
    let any = false
    for (const c of root.querySelectorAll(':scope > .card, :scope > .set-sec > .card')) {
      const hit = !k || norm(c).includes(k)
      c.style.display = hit ? '' : 'none'
      if (hit && k) { any = true; c.querySelectorAll('.field, label, .card-h').forEach((r) => { if (norm(r).includes(k) && !r.parentElement.closest('.ss-hit')) r.classList.add('ss-hit') }) }
    }
    root.querySelector('.set-none')?.classList.toggle('hide', !k || any)
  }, [q])
}

// 홈 화면 앱 아이콘 (홈 화면에서 지우고 다시 추가하면 바뀜)
function AppIconPick() {
  const [k, setK] = useState(getAppIcon)
  return (
    <Field label="앱 아이콘">
      <div className="row wrap" style={{ gap: 8 }}>
        {APP_ICONS.map(([v, l]) => (
          <button key={v} className={'app-ic' + (k === v ? ' on' : '')} onClick={() => { setAppIcon(v); setK(v); toast('홈 화면에서 앱을 지우고 Safari 공유 › 홈 화면에 추가하면 바뀌어요') }}>
            <img src={iconSrc(v)} alt="" width="40" height="40" /><span className="tiny">{l}</span>
          </button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>모노는 iOS 아이콘 ‘색조’ 모드에서 깔끔하게 보여요.</div>
    </Field>
  )
}

// 기기별 마지막 동기화 시각
function Devices() {
  const live = useColl('live').filter((x) => x.kind === 'device').sort((a, b) => (b.at || 0) - (a.at || 0))
  const [name, setName] = useState(deviceName)
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전` }
  return (
    <div className="dev-list">
      {live.map((d) => <div key={d.id} className="row between small"><span>{d.name}{d.id === 'dev-' + myDevice ? <span className="tiny muted"> · 이 기기</span> : ''}</span><span className="muted tiny">{ago(d.at)}</span></div>)}
      <div className="row" style={{ gap: 6 }}><span className="tiny muted nowrap">이 기기 이름</span><input className="input" style={{ maxWidth: 160 }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { try { localStorage.setItem('device_name', name.trim()) } catch {} }} /></div>
    </div>
  )
}

// 디자인 세부: 노트 요소 모양 · 체크박스 · 진행선 · 카드 테두리 · 탭바 · 종이 결
function DesignDetail({ th, setTheme, st }) {
  const paper = th.card === 'paper' || th.card === 'note', note = th.card === 'note'
  const S = (label, key, opts, def) => <Field label={label}><Seg value={th[key] ?? def} onChange={(v) => setTheme({ [key]: v === '' ? null : v })} options={opts} /></Field>
  return (
    <Card title="디자인 세부">
      <div className="form">
        <DesignPreview />
        <div className="row wrap" style={{ gap: 12 }}>{S('제목 1 크기', 'h1Size', [['s', '작게'], ['m', '기본'], ['l', '크게']], 'm')}{S('제목 2 크기', 'h2Size', [['s', '작게'], ['m', '기본'], ['l', '크게']], 'm')}</div>
        {S('본문 글자 색', 'textTone', [['dark', '진하게'], ['ink', '먹색'], ['pencil', '연필 회색']], 'ink')}
        <Field label="노트 본문 글꼴 (앱 글꼴과 따로)"><select className="input" value={th.noteFont || ''} onChange={(e) => setTheme({ noteFont: e.target.value || null })}><option value="">앱 글꼴과 같게</option>{Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}</select></Field>
        {S('노트 줄 맞춤', 'noteAlign', [['left', '왼쪽'], ['justify', '양쪽 맞춤']], 'left')}
        {S('노트 이미지', 'noteImg', [['round', '둥글게'], ['square', '각지게'], ['frame', '사진 테두리']], 'round')}
        <Toggle label="노트 제목 아래 가는 선" checked={!!th.titleLine} onChange={(v) => setTheme({ titleLine: v })} />
        {S('본문 줄 간격', 'noteLH', [['tight', '좁게'], ['normal', '보통'], ['loose', '넓게']], 'normal')}
        {S('글머리 모양', 'bulletStyle', [['dot', '점'], ['dash', '짧은 선'], ['square', '작은 네모']], 'dot')}
        {S('링크 모양', 'linkStyle', [['under', '밑줄'], ['color', '색만'], ['arrow', '↗ 표시']], 'under')}
        {S('형광펜 굵기', 'hlStyle', [['under', '밑줄형'], ['mid', '기본'], ['full', '칠한 형']], 'mid')}
        {S('형광펜 모서리', 'hlCorner', [['square', '각지게'], ['round', '둥글게'], ['brush', '붓 자국']], 'square')}
        {S('인용 모양', 'quoteStyle', [['line', '세로선'], ['mark', '따옴표'], ['slip', '쪽지']], 'line')}
        {S('강조 상자', 'calloutStyle', [['tag', '이름표'], ['band', '색 띠만']], 'tag')}
        {S('완료한 줄', 'doneStyle', [['strike', '취소선'], ['fade', '흐리게'], ['keep', '그대로']], 'strike')}
        {S('구분선', 'divStyle', [['solid', '실선'], ['dot', '점선'], ['wave', '물결']], 'solid')}
        {S('체크박스', 'checkShape', [['', '자동'], ['square', '네모'], ['round', '둥근'], ['pencil', '연필']], '')}
        {S('진행선', 'progStyle', [['', '자동'], ['solid', '실선'], ['dot', '점선'], ['pencil', '연필 빗금']], '')}
        {S('표 머리줄', 'thColor', [['gray', '회색'], ['none', '무색'], ['tint', '옅은 포인트색']], 'gray')}
        {S('칩·배지 색 농도', 'tint', [['light', '옅게'], ['normal', '보통'], ['strong', '진하게']], 'normal')}
        {S('버튼 모양', 'btnStyle', [['line', '테두리'], ['soft', '옅은 바탕'], ['text', '글자만']], 'line')}
        {S('고르기 탭 모양', 'segStyle', [['pill', '알약'], ['under', '밑줄 탭']], 'pill')}
        {S('그래프 막대 굵기', 'chartBar', [['thin', '가늘게'], ['normal', '보통'], ['thick', '굵게']], 'normal')}
        {S('탭바 선택 표시', 'tabSel', [['color', '색만'], ['dot', '점'], ['line', '밑줄'], ['bg', '옅은 바탕']], 'color')}
        <Field label="모서리 둥글기 따로"><div className="col" style={{ gap: 4 }}>{[['rCard', '카드', th.radius ?? 10], ['rBtn', '버튼', Math.max(0, (th.radius ?? 10) - 2)], ['rInput', '입력칸', Math.max(0, (th.radius ?? 10) - 2)]].map(([k, l, d]) => <div key={k} className="row" style={{ gap: 8 }}><span className="tiny muted" style={{ width: 40 }}>{l}</span><input type="range" min="0" max="20" value={th[k] ?? d} onChange={(e) => setTheme({ [k]: +e.target.value })} /><span className="tiny muted" style={{ width: 30 }}>{th[k] ?? d}px</span></div>)}{(th.rCard != null || th.rBtn != null || th.rInput != null) && <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setTheme({ rCard: null, rBtn: null, rInput: null })}>전체 둥글기에 맞추기</button>}</div></Field>
        {S('카드 테두리', 'cardBorder', [['none', '없음'], ['thin', '가늘게'], ['normal', '보통'], ['bold', '진하게']], 'normal')}
        {S('아이콘', 'iconFill', [['line', '선'], ['fill', '옅게 채움']], 'line')}
        <Field label="탭바 · 사이드바"><Seg value={th.tabLabels === false ? 'icon' : 'text'} onChange={(v) => setTheme({ tabLabels: v !== 'icon' })} options={[['text', '글자 함께'], ['icon', '아이콘만']]} /></Field>
        {paper && <Field label={`종이 결 세기 ${Math.round((th.grain ?? 1) * 100)}%`}><input type="range" min="0" max="1.6" step="0.1" value={th.grain ?? 1} onChange={(e) => setTheme({ grain: +e.target.value })} /></Field>}
        {note && <Field label="노트 모눈"><div className="row wrap" style={{ gap: 6 }}><Seg value={th.gridSize || 18} onChange={(v) => setTheme({ gridSize: v })} options={[[14, '촘촘'], [18, '기본'], [24, '넓게']]} /><Seg value={th.gridAlpha ?? 5.5} onChange={(v) => setTheme({ gridAlpha: v })} options={[[0, '없음'], [3, '옅게'], [5.5, '기본'], [9, '진하게']]} /></div></Field>}
        {paper && S('카드 그림자', 'shadowDepth', [['none', '없음'], ['soft', '옅게'], ['normal', '보통'], ['deep', '깊게']], 'normal')}
        <Toggle label="노트 왼쪽 세로줄 (공책 여백선)" checked={!!th.noteMargin} onChange={(v) => setTheme({ noteMargin: v })} />
        {S('월 달력 칸 높이', 'monthDensity', [['compact', '촘촘'], ['normal', '보통'], ['roomy', '넉넉']], 'normal')}
        {S('달력 날짜 숫자', 'calNum', [['body', '기본'], ['head', '손글씨'], ['large', '크고 얇게']], 'body')}
        {S('달력 오늘 표시', 'calToday', [['circle', '동그라미'], ['under', '밑줄'], ['box', '칸 테두리']], 'circle')}
        <Toggle label="달력 지난 날짜 흐리게" checked={!!th.calPastDim} onChange={(v) => setTheme({ calPastDim: v })} />
        <Toggle label="달력 할 일을 점으로 (채운 점 = 끝냄)" checked={!!th.calTaskDots} onChange={(v) => setTheme({ calTaskDots: v })} />
        <Toggle label="달력 주말 칸 옅은 바탕" checked={th.weekendTint !== false} onChange={(v) => setTheme({ weekendTint: v })} />
        <Toggle label="하루 타임라인 30분 눈금" checked={!!th.tlHalf} onChange={(v) => setTheme({ tlHalf: v })} />
        <Field label={`홈 카드 투명도 ${Math.round((th.homeAlpha ?? 1) * 100)}%`}><input type="range" min="0.4" max="1" step="0.05" value={th.homeAlpha ?? 1} onChange={(e) => setTheme({ homeAlpha: +e.target.value })} /></Field>
        {note && <Toggle label="카드 모서리 접힌 종이" checked={th.fold !== false} onChange={(v) => setTheme({ fold: v })} />}
        <Toggle label="노트 머리에 날짜 도장" checked={th.stamp !== false} onChange={(v) => setTheme({ stamp: v })} />
        <Toggle label="상단 상태 줄 (진행 중 타이머 · 동기화)" checked={!!st.statusLine} onChange={(v) => setSettings({ statusLine: v })} />
      </div>
    </Card>
  )
}

// 디자인 세부 미리보기: 실제 노트·체크·진행선 모양 그대로
function DesignPreview() {
  return (
    <div className="dz-prev">
      <div className="blk blk-h2"><div className="blk-c"><div className="blk-v">제목 예시</div></div></div>
      <div className="blk blk-text"><div className="blk-c"><div className="blk-v">본문 <mark className="mk-hl">형광펜</mark>과 <u className="mk-u">밑줄</u>, <span className="wikilink">링크</span></div></div></div>
      <div className="blk blk-bullet"><span className="blk-dot">•</span><div className="blk-c"><div className="blk-v">글머리 줄</div></div></div>
      <div className="blk blk-quote"><div className="blk-c"><div className="blk-v">인용 문장</div></div></div>
      <div className="blk blk-callout tone-key"><div className="blk-c"><div className="blk-v"><span className="co-tag">핵심</span>강조 상자</div></div></div>
      <div className="blk"><div className="blk-c"><hr /></div></div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}><span className="check on" /><span className="small muted" style={{ textDecoration: 'line-through' }}>끝낸 일</span><span className="grow" /><span className="chip on">칩</span><span className="badge acc">배지</span></div>
      <div className="rp-track" style={{ marginTop: 8 }}><i style={{ width: '62%' }} /></div>
    </div>
  )
}
