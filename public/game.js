/* Börtü Böcek - istemci. Yerel (1-2 kişi) ve çevrimiçi (sunucuya bağlanarak) oynanır. */
(() => {
'use strict';
const { BUG, ARENA } = Sim;
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
let W, H, dpr, cx, cy, k;
function fit() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; k = Math.min(W, H * .9) * .47 / 1000; cx = W / 2; cy = H * .53; }
addEventListener('resize', fit); fit();

/* ---------- Durum ---------- */
const ui = { kind: 'solo', sp: ['g', 'u'], arena: 'k', mode: 'me', info: '' };
let phase = 'menu', L = null, ws = null, myPid = '', inRoom = false, lobby = null, isHost = false;
let meta = new Map(), metaVer = -1, buf = [], shake = 0, fx = [], phases = new Map(), lastT = performance.now(), T = 0, acc = 0, bannerT = 0;
let sentIn = '', sentAt = 0, lastView = null;
const keys = {}; let joy = null;
const icons = {};

const KINDS = { solo: { n: 'Tek', e: '👤', d: 'Tek başına oyna.' }, duo: { n: 'İki kişi', e: '👥', d: 'Aynı cihazda iki kişi.' }, online: { n: 'Online', e: '🌐', d: 'Ayrı cihazlardan oyna.' } };
const MODES = { me: { n: 'Hepsi bana', e: '🎯', d: 'Tüm düşmanlar sana saldırır.' }, ffa: { n: 'Kendi aralarında', e: '⚔️', d: 'Düşmanlar birbirleriyle savaşır.' }, rnd: { n: 'Rastgele', e: '🎲', d: 'Herkes rastgele birini hedef alır.' } };

/* ---------- Menü ---------- */
function menu() {
  const EM = o => k => `<span class="em">${o[k].e}</span>`;
  const it = (o, sel, key, fn) => Object.entries(o).map(([id, v]) => `<button class="cd${id === sel ? ' on' : ''}" data-${key}="${id}" title="${v.n}: ${v.d}">${fn(id, v)}<b>${v.n}</b></button>`).join('');
  const bi = id => `<img src="${icons[id] || (icons[id] = previewImg(id))}" alt="">`;
  $('pm').innerHTML = it(KINDS, ui.kind, 'p', EM(KINDS));
  $('bl').innerHTML = it(BUG, ui.sp[0], 'b', bi); $('bl2').innerHTML = it(BUG, ui.sp[1], 'c', bi);
  $('al').innerHTML = it(ARENA, ui.arena, 'a', (id, v) => `<i class="sw" style="background:radial-gradient(circle,${v.c0},${v.c1})"></i>`);
  $('ml').innerHTML = it(MODES, ui.mode, 'm', EM(MODES));
  const duo = ui.kind === 'duo', on = ui.kind === 'online';
  $('n2').style.display = $('h2').style.display = $('bl2').style.display = duo ? '' : 'none';
  $('h1').textContent = duo ? '1. oyuncu böceği' : 'Böcek';
  $('on').style.display = on && !inRoom ? '' : 'none';
  $('li').style.display = on && inRoom ? '' : 'none';
  $('lv').style.display = on && inRoom ? '' : 'none';
  $('go').style.display = !on || (inRoom && isHost) ? '' : 'none';
  $('go').textContent = phase === 'over' ? 'Tekrar oyna' : 'Başla';
  if (on && inRoom && lobby) $('li').textContent = 'Oda: ' + lobby.room.toUpperCase() + ' · Oyuncular: ' + lobby.players.map(p => p.nm).join(', ') + (isHost ? '' : ' · Kurucunun başlatmasını bekle');
  $('info').textContent = ui.info || (BUG[ui.sp[0]].n + ' · ' + BUG[ui.sp[0]].d);
  $('hint').textContent = on ? 'Aynı oda kodunu yazın: biri Oda kur, diğerleri Katıl. WASD / sürükle · Boşluk · E' : duo ? '1. oyuncu: WASD · Boşluk · E     2. oyuncu: oklar · Enter · Sağ Shift' : 'WASD / oklar / parmakla sürükle · Boşluk: hamle · E: yetenek';
}
$('ov').addEventListener('click', e => {
  const c = e.target.closest('.cd'); if (!c) return;
  const d = c.dataset;
  if (d.p) { if (!inRoom) ui.kind = d.p; } else if (d.b) ui.sp[0] = d.b; else if (d.c) ui.sp[1] = d.c; else if (d.a) ui.arena = d.a; else if (d.m) ui.mode = d.m;
  const o = d.p ? KINDS[d.p] : d.b ? BUG[d.b] : d.c ? BUG[d.c] : d.a ? ARENA[d.a] : MODES[d.m];
  ui.info = o.n + ' · ' + o.d;
  if (d.b && inRoom) send({ t: 'me', nm: name(1), sp: ui.sp[0] });
  menu();
});
const name = n => ($('n' + n).value || 'Oyuncu ' + n).trim().slice(0, 12);

/* ---------- Yerel oyun ---------- */
function startLocal() {
  L = Sim.Game();
  L.addPlayer('p1', name(1), ui.sp[0]);
  if (ui.kind === 'duo') L.addPlayer('p2', name(2), ui.sp[1]);
  L.start({ mode: ui.mode, arena: ui.arena });
  myPid = 'p1'; enterPlay();
}
function enterPlay() {
  phase = 'play'; buf = []; meta = new Map(); metaVer = -1; fx = []; phases = new Map();
  $('ov').style.display = 'none'; $('dash').style.display = $('ab').style.display = 'block';
}
function showOver(v) {
  phase = 'over'; $('dash').style.display = $('ab').style.display = 'none';
  $('t').textContent = 'Oyun bitti'; $('sub').textContent = v.sc.map(s => s[1] + ': ' + s[2]).join(' · ');
  $('ov').style.display = 'flex'; menu();
}
$('go').onclick = () => {
  if (ui.kind === 'online') { if (isHost) send({ t: 'start', mode: ui.mode, arena: ui.arena }); return; }
  startLocal();
};
$('lv').onclick = () => { send({ t: 'leave' }); inRoom = false; lobby = null; isHost = false; phase = 'menu'; $('t').textContent = 'Börtü Böcek'; $('sub').textContent = 'İt, düşür, ayakta kal!'; menu(); };

/* ---------- Çevrimiçi ---------- */
function wsUrl() { return (window.BB_SERVER || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host)) + '/ws'; }
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function connect(then) {
  if (ws && ws.readyState === 1) return then();
  ui.info = 'Sunucuya bağlanılıyor… (ilk seferde 1 dakikaya kadar sürebilir)'; menu();
  try { ws = new WebSocket(wsUrl()); } catch (e) { ui.info = 'Sunucu adresi hatalı.'; return menu(); }
  ws.onopen = () => { ui.info = ''; then(); };
  ws.onerror = () => { ui.info = 'Sunucuya bağlanılamadı.'; menu(); };
  ws.onclose = () => { if (inRoom) { inRoom = false; lobby = null; isHost = false; if (phase !== 'menu') { phase = 'menu'; $('ov').style.display = 'flex'; $('dash').style.display = $('ab').style.display = 'none'; } ui.info = 'Bağlantı koptu.'; menu(); } };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
}
function join(create) {
  const code = $('rc').value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  if (!code) { ui.info = 'Önce bir oda kodu yaz (harf ve rakam).'; return menu(); }
  connect(() => send({ t: 'join', room: code, create: create ? 1 : 0, nm: name(1), sp: ui.sp[0] }));
}
$('hb').onclick = () => join(true); $('jb').onclick = () => join(false);
function onMsg(m) {
  if (m.t === 'hello') { myPid = m.pid; inRoom = true; }
  else if (m.t === 'err') { ui.info = String(m.m).slice(0, 100); menu(); }
  else if (m.t === 'lobby') {
    lobby = m; isHost = m.host === myPid;
    if (m.state === 'play' && phase !== 'play') enterPlay();
    if (m.state !== 'play' && phase === 'play') { /* bitiş snap ile gelir */ }
    if (phase !== 'play') menu();
  }
  else if (m.t === 'meta') { meta = new Map(m.d.map(e => [e[0], { sp: e[1], col: e[2], r: e[3], nm: e[4], pid: e[5], ix: e[6] }])); }
  else if (m.t === 'snap') { buf.push({ t: performance.now(), d: m.d }); if (buf.length > 8) buf.shift(); events(m.d.ev); if (m.d.s === 'over' && phase === 'play') showOver(build(m.d)); }
}

/* ---------- Görüntü oluşturma ---------- */
function build(sn) {
  return { s: sn.s, w: sn.w, h: sn.h, ar: sn.ar, g: sn.g, u: sn.u, wb: sn.wb, sc: sn.sc,
    b: sn.b.map(e => { const m = meta.get(e[0]); if (!m) return null;
      return { id: e[0], x: e[1], y: e[2], a: e[3], vx: e[4], vy: e[5], can: e[6], fall: e[7], fly: e[8], arm: e[9], pu: e[10], dashT: e[11], hf: e[12], sc: e[13], abCd: e[14], sp: m.sp, col: m.col, r: m.r, nm: m.nm, pid: m.pid, ix: m.ix }; }).filter(Boolean) };
}
function interp(now) {
  if (!buf.length) return null;
  const rt = now - 100; let i = buf.length - 1;
  while (i > 0 && buf[i - 1].t > rt) i--;
  const b = buf[i], a = buf[i - 1];
  if (!a) return build(b.d);
  const f = Math.max(0, Math.min(1, (rt - a.t) / (b.t - a.t || 1))), v = build(b.d), pa = new Map(a.d.b.map(e => [e[0], e]));
  for (const o of v.b) { const p = pa.get(o.id); if (!p) continue; o.x = p[1] + (o.x - p[1]) * f; o.y = p[2] + (o.y - p[2]) * f; let d = ((o.a - p[3] + Math.PI * 3) % (Math.PI * 2)) - Math.PI; o.a = p[3] + d * f; }
  return v;
}
function events(list) {
  for (const e of list || []) {
    if (e[0] === 'bn') banner(e[1]);
    else if (e[0] === 'fx') fx.push({ x: e[1], y: e[2], l: .3, z: e[3] });
    else if (e[0] === 'sh') shake = Math.max(shake, e[1]);
  }
}
function banner(s) { const b = $('banner'); b.textContent = s; b.style.opacity = 1; bannerT = 1.6; }

/* ---------- Girdi ---------- */
const SCH = [{ u: 'KeyW', d: 'KeyS', l: 'KeyA', r: 'KeyD', dash: 'Space', ab: 'KeyE' }, { u: 'ArrowUp', d: 'ArrowDown', l: 'ArrowLeft', r: 'ArrowRight', dash: 'Enter', ab: 'ShiftRight' }];
function axis(i) {
  const s = SCH[i], both = ui.kind !== 'duo' && i === 0;
  let x = (keys[s.r] || both && keys.ArrowRight ? 1 : 0) - (keys[s.l] || both && keys.ArrowLeft ? 1 : 0);
  let y = (keys[s.d] || both && keys.ArrowDown ? 1 : 0) - (keys[s.u] || both && keys.ArrowUp ? 1 : 0);
  if (i === 0 && joy) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, l = Math.hypot(jx, jy); if (l > 6) { const m = Math.min(l, 55) / 55; x = jx / l * m; y = jy / l * m; } }
  return [x, y];
}
function act(i, kind) {
  if (phase !== 'play') return;
  if (ui.kind === 'online') send({ t: 'act', k: kind }); else if (L) L.act(i ? 'p2' : 'p1', kind);
}
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = 1;
  if (phase !== 'play') return;
  for (let i = 0; i < (ui.kind === 'duo' ? 2 : 1); i++) {
    if (e.code === SCH[i].dash) { e.preventDefault(); act(i, 'd'); }
    if (e.code === SCH[i].ab || (ui.kind !== 'duo' && i === 0 && (e.code === 'ShiftLeft' || e.code === 'ShiftRight'))) { e.preventDefault(); act(i, 'a'); }
  }
});
addEventListener('keyup', e => keys[e.code] = 0);
$('dash').addEventListener('pointerdown', e => { e.preventDefault(); act(0, 'd'); });
$('ab').addEventListener('pointerdown', e => { e.preventDefault(); act(0, 'a'); });
cv.addEventListener('pointerdown', e => { joy = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }; });
cv.addEventListener('pointermove', e => { if (joy) { joy.x = e.clientX; joy.y = e.clientY; } });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => joy = null));

/* ---------- Döngü ---------- */
function frame(n) {
  const dt = Math.min(.05, (n - lastT) / 1000); lastT = n; T += dt;
  shake = Math.max(0, shake - dt * 40);
  for (const e of fx) e.l -= dt; fx = fx.filter(e => e.l > 0);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').style.opacity = 0; }
  let v = null;
  if (phase === 'play' || phase === 'over') {
    if (ui.kind === 'online') {
      const [x, y] = axis(0), s = x.toFixed(1) + ',' + y.toFixed(1);
      if (phase === 'play' && (s !== sentIn || n - sentAt > 100)) { sentIn = s; sentAt = n; send({ t: 'in', x: +x.toFixed(1), y: +y.toFixed(1) }); }
      v = interp(n);
    } else if (L) {
      if (phase === 'play') {
        const a0 = axis(0); L.setInput('p1', a0[0], a0[1]);
        if (ui.kind === 'duo') { const a1 = axis(1); L.setInput('p2', a1[0], a1[1]); }
        acc += dt; while (acc >= 1 / 60) { acc -= 1 / 60; L.step(1 / 60); }
        if (L.mv !== metaVer) { metaVer = L.mv; meta = new Map(L.meta().map(e => [e[0], { sp: e[1], col: e[2], r: e[3], nm: e[4], pid: e[5], ix: e[6] }])); }
        const sn = L.snap(); events(sn.ev); v = build(sn);
        if (sn.s === 'over') showOver(v);
      } else v = lastView;
    }
  }
  if (v) {
    lastView = v;
    for (const b of v.b) phases.set(b.id, (phases.get(b.id) || 0) + Math.hypot(b.vx, b.vy) * dt * .017 + dt * 2);
    $('hw').textContent = 'Dalga ' + v.w; $('hs').textContent = v.sc.map(s => s[1] + ' ' + s[2]).join(' · ');
    const me = v.b.find(b => b.pid === myPid);
    if (me) { const r = me.abCd; $('ab').textContent = r > 0 ? r : BUG[me.sp].ab; $('ab').classList.toggle('w', r > 0); }
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#14200f'; ctx.fillRect(0, 0, W, H);
  const view = v || { h: 0, ar: ui.arena, g: [], u: [], wb: [], b: [] };
  drawScene(ctx, view, { cx, cy, k, t: T, shake, fx, ph: phases, me: myPid });
  if (joy && phase === 'play') {
    ctx.strokeStyle = 'rgba(243,233,198,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.sx, joy.sy, 55, 0, 7); ctx.stroke();
    const l = Math.hypot(joy.x - joy.sx, joy.y - joy.sy) || 1, m = Math.min(l, 55) / l;
    ctx.fillStyle = 'rgba(243,233,198,.5)'; ctx.beginPath(); ctx.arc(joy.sx + (joy.x - joy.sx) * m, joy.sy + (joy.y - joy.sy) * m, 20, 0, 7); ctx.fill();
  }
  requestAnimationFrame(frame);
}
menu();
requestAnimationFrame(frame);
})();
