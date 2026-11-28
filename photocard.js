// 오늘의 포토 카드: 방문객이 고른 사진을 카드 틀의 세 칸에 넣고, 오늘 날짜와 한 줄의 기억을 얹어
// 한 장의 이미지로 저장·공유한다. 사진은 휴대폰 안(이 페이지)에서만 쓰이고 어디로도 전송되지 않는다.
(() => {
  const $ = id => document.getElementById(id);
  const W = 1440, H = 2303;                                   // photocard.jpg 크기
  const SLOTS = [                                             // 사진 칸 (틀에서 잰 흰 칸의 위치)
    { key: 'float', label: '1.FLOAT', x: 128, y: 408, w: 506, h: 586 },
    { key: 'rush',  label: '2.RUSH',  x: 784, y: 408, w: 506, h: 586 },
    { key: 'wave',  label: '3.WAVE',  x: 128, y: 1240, w: 1173, h: 586 },
  ];
  const INK = '#1C1C2E', BG = '#FCF1D8', BLUE = '#0142FE';
  const DATE = { x: 76, base: 2075, size: 57 };               // 원래 날짜 자리
  const MEMO = { x: 78, base: 2206, max: 950, size: 38 };     // 밑줄(y 2225) 바로 위

  const cv = $('pc'), ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  const tpl = new Image(); tpl.src = 'photocard.jpg';
  const photos = {};                                          // key → { img, ox, oy } (ox/oy: 칸 안에서 사진 위치 0~1)
  let target = null;

  const today = () => {
    const d = new Date(); const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  $('pcDate').value = today();

  function cover(img, s, ox, oy) {                            // 칸을 꽉 채우도록 자르기 (ox, oy로 보이는 부분 이동)
    const r = Math.max(s.w / img.width, s.h / img.height);
    const dw = img.width * r, dh = img.height * r;
    return { dx: s.x - (dw - s.w) * ox, dy: s.y - (dh - s.h) * oy, dw, dh };
  }

  function draw(forExport) {
    if (!tpl.complete || !tpl.naturalWidth) return;
    ctx.drawImage(tpl, 0, 0, W, H);
    for (const s of SLOTS) {
      const p = photos[s.key];
      ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
      if (p) {
        const c = cover(p.img, s, p.ox, p.oy);
        ctx.drawImage(p.img, c.dx, c.dy, c.dw, c.dh);
      } else if (!forExport) {                                 // 미리보기에서만: 빈 칸 안내
        ctx.fillStyle = '#F4F1EA'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = 'rgba(28,28,46,.35)'; ctx.setLineDash([18, 14]); ctx.lineWidth = 4;
        ctx.strokeRect(s.x + 22, s.y + 22, s.w - 44, s.h - 44); ctx.setLineDash([]);
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `700 64px 'Noto Sans KR', sans-serif`; ctx.fillText('+', s.x + s.w / 2, s.y + s.h / 2 - 40);
        ctx.font = `700 36px 'Noto Sans KR', sans-serif`; ctx.fillText(`${s.label} 사진 넣기`, s.x + s.w / 2, s.y + s.h / 2 + 30);
      }
      ctx.restore();
    }
    // 날짜
    const dv = ($('pcDate').value || today()).replaceAll('-', '.');
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
    ctx.font = `700 ${DATE.size}px 'Noto Sans KR', sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '-1px';
    ctx.fillText(dv, DATE.x, DATE.base);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // 한 줄의 기억
    const memo = $('pcMemo').value.trim();
    if (memo) {
      let size = MEMO.size; ctx.font = `500 ${size}px 'Noto Sans KR', sans-serif`;
      while (ctx.measureText(memo).width > MEMO.max && size > 22) { size -= 2; ctx.font = `500 ${size}px 'Noto Sans KR', sans-serif`; }
      ctx.fillText(memo, MEMO.x, MEMO.base);
    } else if (!forExport) {
      ctx.fillStyle = 'rgba(28,28,46,.35)'; ctx.font = `500 ${MEMO.size}px 'Noto Sans KR', sans-serif`;
      ctx.fillText('한 줄의 기억을 적어 주세요', MEMO.x, MEMO.base);
    }
    updateChips();
  }

  function updateChips() {
    document.querySelectorAll('#pcSlots button').forEach(b => {
      const on = !!photos[b.dataset.k]; b.classList.toggle('on', on);
      b.querySelector('em').textContent = on ? '바꾸기' : '사진 넣기';
    });
    const n = Object.keys(photos).length;
    $('pcSave').disabled = n === 0;
    $('pcHint').textContent = n === 0 ? '사진을 한 장 이상 넣으면 저장할 수 있어요.'
      : n < 3 ? `${3 - n}칸이 비어 있어요. 빈 칸은 카드 무늬 그대로 저장돼요.` : '사진을 끌어서 보이는 부분을 옮길 수 있어요.';
  }

  // 큰 사진은 줄여서 보관 (메모리·속도)
  function loadFile(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const m = 1800 / Math.max(img.width, img.height);
        if (m >= 1) { res(img); return; }
        const c = document.createElement('canvas'); c.width = Math.round(img.width * m); c.height = Math.round(img.height * m);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        const out = new Image(); out.onload = () => res(out); out.src = c.toDataURL('image/jpeg', 0.92);
      };
      img.onerror = () => rej(new Error('사진을 열 수 없어요'));
      img.src = url;
    });
  }

  const pick = key => { target = key; $('pcFile').value = ''; $('pcFile').click(); };
  $('pcFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f || !target) return;
    try { photos[target] = { img: await loadFile(f), ox: 0.5, oy: 0.5 }; draw(false); }
    catch (err) { alert(err.message); }
  });
  document.querySelectorAll('#pcSlots button').forEach(b => b.onclick = () => pick(b.dataset.k));
  $('pcMemo').addEventListener('input', () => draw(false));
  $('pcDate').addEventListener('change', () => draw(false));

  // 미리보기 위에서: 빈 칸을 누르면 사진 고르기, 사진이 있는 칸은 끌어서 위치 옮기기(그냥 누르면 바꾸기)
  const toCard = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  const hit = pt => SLOTS.find(s => pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h);
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    const s = hit(toCard(e)); if (!s) return;
    drag = { s, start: toCard(e), moved: false, p: photos[s.key], o: photos[s.key] && { ox: photos[s.key].ox, oy: photos[s.key].oy } };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || !drag.p) return;
    const pt = toCard(e), dx = pt.x - drag.start.x, dy = pt.y - drag.start.y;
    if (Math.hypot(dx, dy) > 12) drag.moved = true;
    if (!drag.moved) return;
    const c = cover(drag.p.img, drag.s, 0, 0), ex = c.dw - drag.s.w, ey = c.dh - drag.s.h;
    drag.p.ox = ex > 0 ? Math.min(1, Math.max(0, drag.o.ox - dx / ex)) : 0.5;
    drag.p.oy = ey > 0 ? Math.min(1, Math.max(0, drag.o.oy - dy / ey)) : 0.5;
    draw(false); e.preventDefault();
  });
  cv.addEventListener('pointerup', () => { if (drag && !drag.moved) pick(drag.s.key); drag = null; });
  cv.addEventListener('pointercancel', () => { drag = null; });

  // 저장·공유
  $('pcSave').onclick = async () => {
    draw(true);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
    draw(false);
    const name = `caribbeanbay-photocard-${($('pcDate').value || today())}.jpg`;
    const file = new File([blob], name, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '오늘의 포토 카드', text: '#캐리비안베이 #오늘의포토카드' }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  // 글꼴이 준비된 뒤 다시 그리기 (처음엔 기본 글꼴로 그려질 수 있음)
  tpl.onload = () => draw(false);
  if (document.fonts) Promise.all(['700 57px "Noto Sans KR"', '500 38px "Noto Sans KR"'].map(f => document.fonts.load(f))).then(() => draw(false)).catch(() => {});
  window.__photocard = { draw, photos, SLOTS };
})();
