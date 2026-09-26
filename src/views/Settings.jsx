import { useState } from 'react'
import { useSettings, setSettings, useColl, put, remove, patch, exportJSON, importJSON, uid } from '../store/store.js'
import { PRESETS, FONTS } from '../theme/theme.js'
import { PALETTE } from '../store/schema.js'
import { Card, Seg, Toggle, Field, Icon, toast, confirmSheet, openSheet } from '../components/ui.jsx'
import { ColorPick, TimeInput, SubjectSelect } from '../components/common.jsx'
import { useSyncStatus, connect, disconnect, syncNow } from '../sync/sync.js'
import { download } from '../lib/files.js'
import { requestPermission } from '../lib/notify.js'
import { fmtTime, today, WD } from '../engine/date.js'

export default function Settings() {
  const st = useSettings()
  const th = st.theme
  const setTheme = (p) => setSettings({ theme: { ...th, ...p } })
  return (
    <div className="grid two">
      <SyncCard />
      <Card title="디자인">
        <div className="form">
          <Field label="색상 프리셋">
            <div className="row wrap" style={{ gap: 6 }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} className={'chip' + (th.preset === k && !th.accent ? ' on' : '')} onClick={() => setTheme({ preset: k, accent: null })}>
                  <span className="dot" style={{ background: p.accent }} /><span className="dot" style={{ background: p.c3 }} />{p.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="포인트 색 직접 선택">
            <div className="row">
              <input type="color" value={th.accent || PRESETS[th.preset]?.accent || '#4a5a78'} onChange={(e) => setTheme({ accent: e.target.value })} />
              <ColorPick value={th.accent} onChange={(c) => setTheme({ accent: c })} colors={PALETTE} />
            </div>
          </Field>
          <Field label="화면 모드"><Seg value={th.mode} onChange={(v) => setTheme({ mode: v })} options={[['system', '시스템'], ['light', '라이트'], ['dark', '다크']]} /></Field>
          <Field label="폰트">
            <select className="input" value={th.font} onChange={(e) => setTheme({ font: e.target.value })}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}
            </select>
          </Field>
          <Field label={`글자 크기 ${th.fontSize}px`}><input type="range" min="12" max="16" step="0.5" value={th.fontSize} onChange={(e) => setTheme({ fontSize: +e.target.value })} /></Field>
          <Field label={`글자 굵기 ${th.fontWeight}`}><input type="range" min="300" max="500" step="100" value={th.fontWeight} onChange={(e) => setTheme({ fontWeight: +e.target.value })} /></Field>
          <Field label={`모서리 둥글기 ${th.radius}px`}><input type="range" min="0" max="20" value={th.radius} onChange={(e) => setTheme({ radius: +e.target.value })} /></Field>
          <Field label="간격"><Seg value={th.density} onChange={(v) => setTheme({ density: v })} options={[['compact', '촘촘'], ['normal', '보통'], ['relaxed', '여유']]} /></Field>
          <Field label="카드 스타일"><Seg value={th.card} onChange={(v) => setTheme({ card: v })} options={[['line', '선'], ['shadow', '그림자'], ['flat', '평면']]} /></Field>
        </div>
      </Card>

      <Card title="기능 켜기 / 끄기">
        {[['health', '건강 (컨디션·약·주기)'], ['matrix', '아이젠하워 매트릭스'], ['kanban', '칸반'], ['gantt', '간트'], ['db', '표 · DB 뷰'], ['circle', '원형 계획표'], ['graph', '개념 그래프'], ['mindmap', '마인드맵'], ['mock', '모의고사 타이머']].map(([k, l]) => (
          <Toggle key={k} label={l} checked={st.modules[k] !== false} onChange={(v) => setSettings({ modules: { ...st.modules, [k]: v } })} />
        ))}
      </Card>

      <SubjectsCard />
      <ProjectsCard />

      <Card title="플래너 · 공부">
        <div className="form">
          <div className="row">
            <Field label="하루 시작"><TimeInput value={st.dayStart} onChange={(v) => v != null && setSettings({ dayStart: v })} /></Field>
            <Field label="하루 끝"><TimeInput value={st.dayEnd % 1440} onChange={(v) => v != null && setSettings({ dayEnd: v === 0 ? 1440 : v })} /></Field>
          </div>
          <Field label="주 시작"><Seg value={st.weekStart} onChange={(v) => setSettings({ weekStart: v })} options={[[1, '월요일'], [0, '일요일']]} /></Field>
          <div className="row">
            <Field label="하루 목표(분)"><input className="input" type="number" step="10" value={st.goalDaily} onChange={(e) => setSettings({ goalDaily: +e.target.value })} /></Field>
            <Field label="주간 목표(분)"><input className="input" type="number" step="30" value={st.goalWeekly} onChange={(e) => setSettings({ goalWeekly: +e.target.value })} /></Field>
          </div>
          <div className="row">
            {[['work', '집중'], ['short', '휴식'], ['long', '긴 휴식'], ['every', '긴 휴식 주기']].map(([k, l]) => (
              <Field key={k} label={l}><input className="input" type="number" min="1" value={st.pomodoro[k]} onChange={(e) => setSettings({ pomodoro: { ...st.pomodoro, [k]: +e.target.value || 1 } })} /></Field>
            ))}
          </div>
          <Field label="복습 간격(일, 쉼표)"><input className="input" defaultValue={st.reviewIntervals.join(', ')} onBlur={(e) => { const v = e.target.value.split(/[,\s]+/).map(Number).filter((n) => n > 0); if (v.length) setSettings({ reviewIntervals: v }) }} /></Field>
          <Field label="일정 기본 이동·준비 버퍼(분)"><input className="input" type="number" min="0" step="5" value={st.defaultBuffer} onChange={(e) => setSettings({ defaultBuffer: +e.target.value })} /></Field>
          <Toggle label="요일 템플릿 자동 적용" checked={st.autoTemplate} onChange={(v) => setSettings({ autoTemplate: v })} />
          <Toggle label="타이머 중 화면 켜짐 유지" checked={st.wakeLock !== false} onChange={(v) => setSettings({ wakeLock: v })} />
          <Toggle label="알림" checked={st.notify} onChange={async (v) => { setSettings({ notify: v }); if (v) { const p = await requestPermission(); if (p === 'denied') toast('설정 앱에서 알림을 허용해 주세요') } }} />
          <div className="tiny muted">iPhone/iPad 는 Safari 공유 → ‘홈 화면에 추가’ 후 앱으로 열어야 시스템 알림이 표시돼요. 앱이 열려 있을 때 동작합니다.</div>
        </div>
      </Card>

      <TemplatesCard />

      <Card title="백업 · 복원">
        <div className="row wrap">
          <button className="btn" onClick={() => download(`study-backup-${today()}.json`, exportJSON(), 'application/json')}><Icon name="download" size={16} />JSON 내보내기</button>
          <button className="btn" onClick={() => {
            const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json'
            i.onchange = async () => { const f = i.files[0]; if (!f) return; const text = await f.text(); confirmSheet('복원', '현재 데이터를 백업 파일로 교체할까요?', () => { try { importJSON(text); toast('복원 완료') } catch (e) { toast(e.message) } }, '복원') }
            i.click()
          }}><Icon name="upload" size={16} />JSON 가져오기</button>
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>첨부 파일 원본은 Gist 동기화로 옮겨집니다. JSON 백업에는 목록만 포함돼요.</div>
      </Card>
      <Card title="홈 화면에 설치">
        <div className="small">Safari 에서 공유 버튼 → <b>홈 화면에 추가</b>. 전체 화면·오프라인으로 동작합니다. iPhone 과 iPad 모두 같은 방법으로 설치한 뒤 위 동기화에 같은 토큰을 입력하세요.</div>
      </Card>
    </div>
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
    <Card title="iPhone ↔ iPad 동기화 (GitHub Gist)" action={<span className="row small"><span className={'sync-dot ' + s.state} />{label}</span>}>
      {!on ? (
        <div className="form">
          <div className="small muted">
            1. github.com → Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → <b>gist</b> 권한만 체크해 생성<br />
            2. 아래에 붙여넣고 연결 (두 기기 모두 같은 토큰) — 비공개 Gist 가 자동으로 만들어지거나 찾아집니다.
          </div>
          <input className="input" type="password" autoComplete="off" placeholder="ghp_…" value={tok} onChange={(e) => setTok(e.target.value)} />
          <button className="btn primary" disabled={!tok || busy} onClick={async () => { setBusy(true); try { await connect(tok); toast('동기화 연결됨'); setTok('') } catch (e) { toast(e.message) } setBusy(false) }}>{busy ? '연결 중…' : '연결'}</button>
          {s.error && <div className="small" style={{ color: 'var(--danger)' }}>{s.error}</div>}
        </div>
      ) : (
        <div className="form">
          <div className="small muted">마지막 동기화: {s.last ? new Date(s.last).toLocaleString('ko-KR') : '-'}</div>
          {s.error && <div className="small" style={{ color: 'var(--danger)' }}>{s.error}</div>}
          <div className="row wrap">
            <button className="btn" onClick={() => syncNow()}><Icon name="sync" size={16} />지금 동기화</button>
            {gistId && <a className="btn" href={`https://gist.github.com/${gistId}`} target="_blank" rel="noreferrer">Gist 보기</a>}
            <button className="btn danger" onClick={() => confirmSheet('연결 해제', '이 기기의 토큰을 지웁니다. 데이터는 그대로 남아요.', disconnect, '해제')}>연결 해제</button>
          </div>
          <div className="tiny muted">앱을 열 때·돌아올 때·편집 3초 후·1분마다 자동 동기화. 같은 항목은 최신 수정이 우선합니다.</div>
        </div>
      )}
      <div className="divider" />
      <Toggle label="생리 주기는 이 기기에만 저장" checked={st.syncExclude?.cycles} onChange={(v) => setSettings({ syncExclude: { ...st.syncExclude, cycles: v } })} />
      <Toggle label="약·컨디션도 이 기기에만 저장" checked={st.syncExclude?.meds} onChange={(v) => setSettings({ syncExclude: { ...st.syncExclude, meds: v, medLogs: v, conditions: v } })} />
    </Card>
  )
}

function SubjectsCard() {
  const subjects = useColl('subjects')
  return (
    <Card title="과목" action={<button className="btn sm" onClick={() => put('subjects', { name: '새 과목', color: PALETTE[subjects.length % PALETTE.length] })}><Icon name="plus" size={14} />추가</button>}>
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
            <Field label="시작"><TimeInput value={nb.start} onChange={(v) => setNb({ ...nb, start: v ?? 0 })} /></Field>
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
