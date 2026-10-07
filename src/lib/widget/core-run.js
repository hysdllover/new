// 위젯 본체 (실행: 위젯 만들기·미리보기) — Scriptable 에서 실행되는 코드를 글자로 담음. 네 조각을 이어 붙여 본체가 됨
// 템플릿 문자열 안: 백슬래시는 두 번, 백틱 금지
export default () => `let w
try { w = build(config.widgetFamily || 'large') } catch (e) {
  w = new ListWidget(); const x = w.addText('위젯 오류 · ' + String((e && e.message) || e).slice(0, 80)); x.font = Font.systemFont(10); x.lineLimit = 3
}

// 앱에서 실행하면 메뉴: 미리보기 · 투명 배경 · 글자색
async function transparentSetup() {
  // 스크린샷 해상도(세로 px)별 위젯 위치 — 표에 없는 기기는 비슷한 기기 비율로 추정
  const T = {
    2868: { small: 520, medium: 1113, large: 1169, left: 101, right: 694, top: 290, middle: 938, bottom: 1586 },
    2796: { small: 510, medium: 1092, large: 1146, left: 99, right: 681, top: 282, middle: 918, bottom: 1554 },
    2778: { small: 510, medium: 1092, large: 1146, left: 96, right: 678, top: 246, middle: 882, bottom: 1518 },
    2688: { small: 507, medium: 1080, large: 1137, left: 81, right: 654, top: 228, middle: 858, bottom: 1488 },
    2622: { small: 486, medium: 1041, large: 1089, left: 83, right: 638, top: 277, middle: 880, bottom: 1483 },
    2556: { small: 474, medium: 1014, large: 1062, left: 82, right: 622, top: 270, middle: 858, bottom: 1446 },
    2532: { small: 474, medium: 1014, large: 1062, left: 78, right: 618, top: 231, middle: 819, bottom: 1407 },
    2436: { small: 465, medium: 987, large: 1035, left: 69, right: 591, top: 213, middle: 783, bottom: 1353 },
    2340: { small: 436, medium: 936, large: 980, left: 72, right: 570, top: 212, middle: 756, bottom: 1300 },
    2208: { small: 471, medium: 1044, large: 1071, left: 99, right: 672, top: 114, middle: 696, bottom: 1278 },
    1792: { small: 338, medium: 720, large: 758, left: 54, right: 436, top: 160, middle: 580, bottom: 1000 },
    1334: { small: 296, medium: 642, large: 648, left: 54, right: 400, top: 60, middle: 412, bottom: 764 },
  }
  if (Device.isPad()) { const a = new Alert(); a.title = '아이패드는 지원하지 않아요'; a.message = '화면 방향마다 위치가 달라 아이폰에서만 쓸 수 있어요.'; a.addAction('확인'); await a.present(); return }
  let a = new Alert(); a.title = '투명 배경'; a.message = '1) 홈 화면 편집(아이콘 흔들림) 상태에서 맨 오른쪽 빈 페이지로 넘겨 스크린샷을 찍어 두세요.\\n2) 다음에서 그 스크린샷을 고르세요.'; a.addAction('스크린샷 고르기'); a.addCancelAction('취소')
  if (await a.present() === -1) return
  const img = await Photos.fromLibrary()
  const h = img.size.height
  let L = T[h]
  if (!L) { const k = Object.keys(T).map(Number).sort((x, y) => Math.abs(x - h) - Math.abs(y - h))[0], r = h / k; L = Object.fromEntries(Object.entries(T[k]).map(([n, v]) => [n, Math.round(v * r)])) }
  a = new Alert(); a.title = '위젯 크기'; ['소', '중', '대'].forEach((x) => a.addAction(x))
  const size = ['small', 'medium', 'large'][await a.present()]
  const pos = size === 'small' ? [['왼쪽 위', 'left', 'top'], ['오른쪽 위', 'right', 'top'], ['왼쪽 가운데', 'left', 'middle'], ['오른쪽 가운데', 'right', 'middle'], ['왼쪽 아래', 'left', 'bottom'], ['오른쪽 아래', 'right', 'bottom']]
    : size === 'medium' ? [['위', 'left', 'top'], ['가운데', 'left', 'middle'], ['아래', 'left', 'bottom']] : [['위', 'left', 'top'], ['아래', 'left', 'middle']]
  a = new Alert(); a.title = '위젯 위치'; pos.forEach((x) => a.addAction(x[0]))
  const [, hx, vy] = pos[await a.present()]
  a = new Alert(); a.title = '어떤 위젯에 쓸까요?'; a.message = '위젯 Parameter 를 적어 주세요 (예: 공부, 캘린더@2). 비우면 기본.'; a.addTextField('Parameter', ''); a.addAction('저장')
  await a.present()
  const key = a.textFieldValue(0).replace(/\\s/g, '').toLowerCase()
  const wpx = size === 'small' ? L.small : L.medium, hpx = size === 'large' ? L.large : L.small
  const c = new DrawContext(); c.size = new Size(wpx, hpx); c.drawImageAtPoint(img, new Point(-L[hx], -L[vy]))
  FM.writeImage(bgPath(size, key), c.getImage())
  a = new Alert(); a.title = '저장했어요'; a.message = '위젯이 곧 새 배경으로 바뀌어요. 글자가 잘 안 보이면 메뉴에서 글자색을 바꿔 보세요.'; a.addAction('확인'); await a.present()
}
if (config.runsInWidget) Script.setWidget(w)
else {
  const m = new Alert(); m.title = '스터디 위젯'
  ;['미리보기 · 소', '미리보기 · 중', '미리보기 · 대', '투명 배경 설정', '투명 배경 모두 지우기', '글자색 · 자동', '글자색 · 밝게', '글자색 · 어둡게', '잠금 화면 미리보기 · 원형', '잠금 화면 미리보기 · 직사각형', '잠금 화면 미리보기 · 한 줄', Keychain.contains('study-gh') ? '위젯에서 바로 처리 끄기' : '위젯에서 바로 처리 켜기'].forEach((x) => m.addAction(x)); m.addCancelAction('닫기')
  const i = await m.present()
  // 미리보기: 위젯과 같은 Parameter 를 골라 그 크기로 그림 (기존엔 대형을 잘라 보여 줌)
  if (i === 11) {
    if (Keychain.contains('study-gh')) { Keychain.remove('study-gh'); const a = new Alert(); a.title = '껐어요'; a.message = '위젯을 누르면 다시 앱(사파리)으로 열려요.'; a.addAction('확인'); await a.present() }
    else { const a = new Alert(); a.title = '위젯에서 바로 처리'; a.message = '할 일 완료 · 타이머 시작·정지 · 공부 기록을 앱을 열지 않고 처리해요.\\nGitHub 토큰(Gists 읽기·쓰기)을 넣어 주세요. 이 아이폰의 Scriptable 보관함에만 저장되고 스크립트에는 들어가지 않아요.'; a.addSecureTextField('ghp_… / github_pat_…', ''); a.addAction('저장'); a.addCancelAction('취소'); if (await a.present() === 0 && a.textFieldValue(0).trim()) { const tk = a.textFieldValue(0).trim(), err = await tokenOk(tk); const b = new Alert(); if (err) { b.title = '저장하지 않았어요'; b.message = err } else { Keychain.set('study-gh', tk); b.title = '켰어요'; b.message = '이제 위젯을 누르면 사파리 대신 바로 처리돼요. (위젯이 다시 그려진 뒤부터)' } b.addAction('확인'); await b.present() } }
    Script.complete(); return
  }
  if (i <= 2 || (i >= 8 && i <= 10)) {
    const last = Keychain.contains('study-preview-param') ? Keychain.get('study-preview-param') : ''
    const a = new Alert(); a.title = 'Parameter'; a.message = '위젯 편집의 Parameter 와 같게 (예: 오늘, 대시보드, 캘린더). 비우면 기본.'; a.addTextField('Parameter', last); a.addAction('보기')
    await a.present()
    const pv = a.textFieldValue(0); Keychain.set('study-preview-param', pv); setParam(pv)
  }
  if (i === 0) await build('small').presentSmall()
  else if (i === 1) await build('medium').presentMedium()
  else if (i === 2) await build('large').presentLarge()
  else if (i === 3) await transparentSetup()
  else if (i === 4) { for (const f of FM.listContents(FM.documentsDirectory())) if (f.startsWith('study-bg-')) FM.remove(FM.joinPath(FM.documentsDirectory(), f)) }
  else if (i >= 5 && i <= 7) Keychain.set('study-ink', ['auto', 'light', 'dark'][i - 5])
  else if (i >= 8 && i <= 10) {
    // 잠금 화면 위젯을 앱 안에서 그려 보기 (오류가 있으면 여기서 보임)
    const f = ['accessoryCircular', 'accessoryRectangular', 'accessoryInline'][i - 8]
    const lw = build(f)
    if (f === 'accessoryCircular' && lw.presentAccessoryCircular) await lw.presentAccessoryCircular()
    else if (f === 'accessoryRectangular' && lw.presentAccessoryRectangular) await lw.presentAccessoryRectangular()
    else if (f === 'accessoryInline' && lw.presentAccessoryInline) await lw.presentAccessoryInline()
    else await lw.presentSmall()
  }
}
Script.complete()
`
