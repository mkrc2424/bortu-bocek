/* Börtü Böcek - istemci. Yerel (1-2 kişi) ve çevrimiçi (sunucuya bağlanarak) oynanır. */
(() => {
'use strict';
const { BUG, ARENA } = Sim;
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
let W, H, dpr, cx, cy, k;
function fit() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; k = Math.min(W, H * .9) * .47 / 1000; cx = W / 2; cy = H * (H > W * 1.2 ? .45 : .53); }
addEventListener('resize', fit); fit();

/* ---------- Durum ---------- */
const ui = { kind: 'solo', sp: 'g', arena: 'k', mode: 'me', info: '' };
let phase = 'menu', L = null, ws = null, myPid = '', inRoom = false, lobby = null, isHost = false;
let rooms = [], meta = new Map(), metaVer = -1, buf = [], shake = 0, fx = [], phases = new Map(), lastT = performance.now(), T = 0, acc = 0, bannerT = 0;
let sentIn = '', sentAt = 0, lastView = null;
const keys = {}; let joy = null;
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const icons = {};

const KINDS = { solo: { n: 'Tek', e: '👤', d: 'Tek başına oyna.' }, online: { n: 'Online', e: '🌐', d: 'Ayrı cihazlardan oyna.' } };
const MODES = { me: { n: 'Hepsi bana', e: '🎯', d: 'Tüm düşmanlar sana saldırır.' }, ffa: { n: 'Kendi aralarında', e: '⚔️', d: 'Düşmanlar birbirleriyle savaşır.' }, rnd: { n: 'Rastgele', e: '🎲', d: 'Herkes rastgele birini hedef alır.' } };

/* ---------- Ses ---------- */
['pointerdown', 'keydown', 'touchstart'].forEach(n => addEventListener(n, () => Snd.init(), { passive: true }));
const sndIcon = () => { $('sndBtn').textContent = Snd.on ? '🔊' : '🔇'; };
$('sndBtn').onclick = () => { Snd.toggle(); sndIcon(); }; sndIcon();
const musIcon = () => { $('musBtn').textContent = Music.on ? '🎵' : '🔕'; };
$('musBtn').onclick = () => { Music.toggle(); musIcon(); }; musIcon();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyM') { Music.toggle(); musIcon(); }
  if (e.code === 'KeyN') { Snd.toggle(); sndIcon(); }
});

/* ---------- Menü ---------- */
const name = () => ($('nick').value || 'Oyuncu').trim().slice(0, 12);
try { const v = JSON.parse(localStorage.getItem('bb_ui') || '{}'); if (BUG[v.sp]) ui.sp = v.sp; if (ARENA[v.arena]) ui.arena = v.arena; if (MODES[v.mode]) ui.mode = v.mode; if (typeof v.nick === 'string') $('nick').value = v.nick.slice(0, 12); } catch (e) {}
function save() { try { localStorage.setItem('bb_ui', JSON.stringify({ sp: ui.sp, arena: ui.arena, mode: ui.mode, nick: $('nick').value })); } catch (e) {} }
$('nick').addEventListener('input', () => { save(); if (inRoom) send({ t: 'me', nm: name(), sp: ui.sp }); });
const bi = id => `<img src="${icons[id] || (icons[id] = previewImg(id))}" alt="">`;
const sw = v => `<i class="sw" style="background:radial-gradient(circle,${v.c0},${v.c1})"></i>`;
const em = v => `<span class="em">${v.e}</span>`;
function menu() {
  $('pm').innerHTML = Object.entries(KINDS).map(([id, v]) => `<button class="cd${id === ui.kind ? ' on' : ''}" data-p="${id}">${em(v)}<b>${v.n}</b></button>`).join('');
  const bg = BUG[ui.sp], ar = ARENA[ui.arena], md = MODES[ui.mode];
  const sb = (key, ico, lab, val) => `<button class="sb" data-s="${key}">${ico}<b>${lab}</b><small>${val}</small></button>`;
  $('sel').innerHTML = sb('b', bi(ui.sp), 'Böcek', bg.n) + sb('a', sw(ar), 'Alan', ar.n) + sb('m', em(md), 'Savaş', md.n);
  const on = ui.kind === 'online';
  $('on').style.display = on && !inRoom ? '' : 'none';
  $('li').style.display = on && inRoom ? '' : 'none';
  $('lv').style.display = on && inRoom ? '' : 'none';
  $('go').style.display = !on || (inRoom && isHost) ? '' : 'none';
  $('go').textContent = phase === 'over' ? 'Tekrar oyna' : 'Başla';
  if (on && inRoom && lobby) $('li').textContent = 'Oda ' + lobby.room.toUpperCase() + ' · ' + lobby.players.map(p => p.nm).join(', ') + (isHost ? '' : ' · bekleniyor');
  if (on && !inRoom) renderRooms();
  $('st').textContent = ui.info || '';
}
const SHEETS = { b: ['Böcek', BUG, 'sp', bi], a: ['Alan', ARENA, 'arena', (id, v) => sw(v)], m: ['Savaş şekli', MODES, 'mode', (id, v) => em(v)] };
function openSheet(k) {
  const [title, o, key, fn] = SHEETS[k], cur = ui[key];
  $('shT').textContent = title;
  $('shB').innerHTML = Object.entries(o).map(([id, v]) => `<button class="cd${id === cur ? ' on' : ''}" data-v="${id}" data-k="${k}">${fn(id, v)}<b>${v.n}</b></button>`).join('');
  $('sheet').hidden = false;
}
$('sel').addEventListener('click', e => { const b = e.target.closest('.sb'); if (b) openSheet(b.dataset.s); });
$('shB').addEventListener('click', e => {
  const c = e.target.closest('.cd'); if (!c) return;
  const k = c.dataset.k; ui[SHEETS[k][2]] = c.dataset.v; $('sheet').hidden = true; save();
  if (k === 'b' && inRoom) send({ t: 'me', nm: name(), sp: ui.sp });
  menu();
});
$('shX').onclick = () => { $('sheet').hidden = true; };
$('pm').addEventListener('click', e => {
  const c = e.target.closest('.cd'); if (!c || inRoom) return;
  ui.kind = c.dataset.p; ui.info = '';
  if (ui.kind === 'online') connect(() => send({ t: 'list' }));
  menu();
});
$('rl').addEventListener('click', e => { const rb = e.target.closest('.room'); if (rb && !rb.disabled) join(rb.dataset.r, false); });
function buildInfo() {
  const L1 = a => '<ul>' + a.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  $('infoBody').innerHTML =
    '<h3>Nasıl oynanır</h3>' + L1([
      'Hareket: WASD / ok tuşları ya da ekranda parmağını sürükle.',
      'Hamle: Boşluk tuşu ya da Hamle düğmesi. Hızlı atılış, daha çok hasar verir.',
      'Yetenek: E / Shift ya da mor düğme. Her böceğin kendine özgü yeteneği var.',
      'Rakipleri ortadaki delikten ya da kenardaki boşluklardan düşür. Eğim seni de deliğe çeker.',
      'Can: arkadan ve yandan gelen darbe çok, önden gelen az hasar verir. Canın azaldıkça hızın ve gücün düşer.',
      'Alanda çıkan güçler 5 saniye sürer: ⚡ Hız, 💪 Güç, 🛡️ Kalkan. ❤ canı yeniler.',
      'Her dalgada alan değişir. Başta orta kapalı, kenarlar yer yer açıktır. Sonra delik büyür, kenarlar kapanır.'
    ]) +
    '<h3>Böcekler</h3>' + L1(Object.values(BUG).map(b => '<b>' + esc(b.n) + '</b> · ' + esc(b.d) + ' (' + esc(b.ab) + ')')) +
    '<h3>Alanlar</h3>' + L1(Object.values(ARENA).map(a => '<b>' + esc(a.n) + '</b> · ' + esc(a.d))) +
    '<h3>Savaş şekilleri</h3>' + L1(Object.values(MODES).map(m => '<b>' + esc(m.n) + '</b> · ' + esc(m.d))) +
    '<h3>Online</h3>' + L1([
      '"+ Yeni oda kur" ile oda aç ya da listeden açık bir odaya dokun. Odayı kuran Başla\'ya basar.',
      'Bir odada en fazla 4 kişi oynar. Oyun başlamış odalara girilemez.',
      'Sunucu uyuyorsa ilk bağlantı 1 dakikaya kadar sürebilir.'
    ]) +
    '<h3>Ses ve titreşim</h3>' + L1(['Sağ üstteki 🔊 düğmesi (N tuşu) ses efektlerini ve titreşimi, 🎵 düğmesi (M tuşu) müziği açıp kapatır.', 'Telefonda canın yandığında ve düştüğünde titreşim olur.']);
}
$('infoBtn').onclick = () => { buildInfo(); $('infoM').hidden = false; };
$('infoX').onclick = () => { $('infoM').hidden = true; };

/* ---------- Yerel oyun ---------- */
function startLocal() {
  L = Sim.Game(); L.addPlayer('p1', name(), ui.sp);
  L.start({ mode: ui.mode, arena: ui.arena });
  myPid = 'p1'; save(); enterPlay();
}
function enterPlay() {
  phase = 'play'; Music.set('game'); buf = []; meta = new Map(); metaVer = -1; fx = []; phases = new Map();
  $('ov').style.display = 'none'; $('dash').style.display = $('ab').style.display = 'block';
}
function showOver(v) {
  phase = 'over'; Music.set('menu'); $('dash').style.display = $('ab').style.display = 'none';
  $('t').textContent = 'Oyun bitti'; $('sub').textContent = v.sc.map(s => s[1] + ': ' + s[2]).join(' · ');
  $('ov').style.display = 'flex'; menu();
}
$('go').onclick = () => {
  if (ui.kind === 'online') { if (isHost) send({ t: 'start', mode: ui.mode, arena: ui.arena }); return; }
  startLocal();
};
$('lv').onclick = () => { send({ t: 'leave' }); inRoom = false; lobby = null; isHost = false; phase = 'menu'; Music.set('menu'); $('t').textContent = 'Börtü Böcek'; $('sub').textContent = ''; menu(); };

/* ---------- Çevrimiçi ---------- */
function wsUrl() { return (window.BB_SERVER || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host)) + '/ws'; }
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function connect(then) {
  if (ws && ws.readyState === 1) return then();
  if (ws && ws.readyState === 0) { ws.addEventListener('open', then, { once: true }); return; }
  ui.info = 'Sunucuya bağlanılıyor… (ilk seferde 1 dakikaya kadar sürebilir)'; menu();
  try { ws = new WebSocket(wsUrl()); } catch (e) { ui.info = 'Sunucu adresi hatalı.'; return menu(); }
  ws.onopen = () => { ui.info = ''; then(); menu(); };
  ws.onerror = () => { ui.info = 'Sunucuya bağlanılamadı.'; menu(); };
  ws.onclose = () => { if (inRoom) { inRoom = false; lobby = null; isHost = false; if (phase !== 'menu') { phase = 'menu'; $('ov').style.display = 'flex'; $('dash').style.display = $('ab').style.display = 'none'; } ui.info = 'Bağlantı koptu.'; menu(); } };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
}
function join(code, create) { connect(() => send({ t: 'join', room: code || '', create: create ? 1 : 0, nm: name(), sp: ui.sp })); }
$('hb').onclick = () => join('', true);
function renderRooms() {
  const el = $('rl');
  if (!ws || ws.readyState !== 1) { el.innerHTML = '<p>Sunucuya bağlanılıyor…</p>'; return; }
  el.innerHTML = rooms.length ? rooms.map(r => `<button class="room" data-r="${esc(r.code)}"${r.st === 'play' || r.n >= r.max ? ' disabled' : ''}><b>${esc(r.host)}</b> · ${r.n}/${r.max} · ${esc((ARENA[r.arena] || {}).n || '')} · ${esc((MODES[r.mode] || {}).n || '')}${r.st === 'play' ? ' · Oyunda' : ''}</button>`).join('') : '<p>Açık oda yok</p>';
}
setInterval(() => { if (ui.kind === 'online' && !inRoom && phase !== 'play') send({ t: 'list' }); }, 2500);
function onMsg(m) {
  if (m.t === 'hello') { myPid = m.pid; inRoom = true; }
  else if (m.t === 'rooms') { rooms = Array.isArray(m.d) ? m.d : []; if (ui.kind === 'online' && !inRoom && phase === 'menu') renderRooms(); }
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
    else if (e[0] === 'fx') { fx.push({ x: e[1], y: e[2], l: .3, z: e[3] }); Snd.play('hit', e[4] ? 1 : .55); }
    else if (e[0] === 'sh') shake = Math.max(shake, e[1]);
    else if (e[0] === 'dash') Snd.play('dash', .6);
    else if (e[0] === 'ab') Snd.play('ab');
    else if (e[0] === 'pk') { if (e[1] === myPid) Snd.play('pk'); }
    else if (e[0] === 'wave') Snd.play('wave');
    else if (e[0] === 'fall') { Snd.play('fall'); if (e[3] === myPid) Snd.buzz([80, 40, 160]); }
    else if (e[0] === 'hurt') { if (e[1] === myPid) Snd.buzz(35); }
    else if (e[0] === 'over') { Snd.play('over'); Snd.buzz(250); }
  }
}
function banner(s) { const b = $('banner'); b.textContent = s; b.style.opacity = 1; bannerT = 1.6; }

/* ---------- Girdi ---------- */
function axis() {
  let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (joy) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, l = Math.hypot(jx, jy); if (l > 6) { const m = Math.min(l, JR) / JR; x = jx / l * m; y = jy / l * m; } }
  return [x, y];
}
function act(kind) { if (phase !== 'play') return; if (ui.kind === 'online') send({ t: 'act', k: kind }); else if (L) L.act('p1', kind); }
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = 1;
  if (phase !== 'play') return;
  if (e.code === 'Space') { e.preventDefault(); act('d'); }
  if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); act('a'); }
});
addEventListener('keyup', e => keys[e.code] = 0);
$('dash').addEventListener('pointerdown', e => { e.preventDefault(); Snd.buzz(12); act('d'); });
$('ab').addEventListener('pointerdown', e => { e.preventDefault(); Snd.buzz(12); act('a'); });
const JR = 60, isTouch = matchMedia('(pointer: coarse)').matches;
cv.addEventListener('pointerdown', e => { if (joy) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }; });
cv.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
cv.addEventListener('contextmenu', e => e.preventDefault());
['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, e => { if (joy && e.pointerId === joy.id) joy = null; }));

/* ---------- Döngü ---------- */
function frame(n) {
  const dt = Math.min(.05, (n - lastT) / 1000); lastT = n; T += dt;
  shake = Math.max(0, shake - dt * 40);
  for (const e of fx) e.l -= dt; fx = fx.filter(e => e.l > 0);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').style.opacity = 0; }
  let v = null;
  if (phase === 'play' || phase === 'over') {
    if (ui.kind === 'online') {
      const [x, y] = axis(), s = x.toFixed(1) + ',' + y.toFixed(1);
      if (phase === 'play' && (s !== sentIn || n - sentAt > 100)) { sentIn = s; sentAt = n; send({ t: 'in', x: +x.toFixed(1), y: +y.toFixed(1) }); }
      v = interp(n);
    } else if (L) {
      if (phase === 'play') {
        const a0 = axis(); L.setInput('p1', a0[0], a0[1]);
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
  if (!joy && phase === 'play' && isTouch) { ctx.strokeStyle = 'rgba(243,233,198,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(Math.max(JR + 24, W * .14), H - JR - 34, JR, 0, 7); ctx.stroke(); }
  if (joy && phase === 'play') {
    ctx.strokeStyle = 'rgba(243,233,198,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.sx, joy.sy, JR, 0, 7); ctx.stroke();
    const l = Math.hypot(joy.x - joy.sx, joy.y - joy.sy) || 1, m = Math.min(l, JR) / l;
    ctx.fillStyle = 'rgba(243,233,198,.5)'; ctx.beginPath(); ctx.arc(joy.sx + (joy.x - joy.sx) * m, joy.sy + (joy.y - joy.sy) * m, 20, 0, 7); ctx.fill();
  }
  requestAnimationFrame(frame);
}
menu();
requestAnimationFrame(frame);
})();
