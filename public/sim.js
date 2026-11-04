/* Börtü Böcek - ortak oyun mantığı. Sunucuda (Node) ve tarayıcıda aynı kod çalışır.
   Dünya birimi: arena yarıçapı = 1000, merkez (0,0). */
(function (root) {
'use strict';
const K = 1000 / 340, R = 1000;

const BUG = {
  g: { n: 'Gergedan', r: 20, m: 1, acc: 1, col: '#3fbf6a', ab: 'Süper Hamle', d: 'Dengeli. Yetenek: çok güçlü ve uzun bir hamle.', cd: 6 },
  d: { n: 'Bok Böceği', r: 23, m: 2, acc: .6, col: '#34405c', ab: 'Bok Topu Zırhı', d: 'Ağır, topunu taşır. Yetenek: 2,5 sn dev gibi ağırlaşır.', cd: 8 },
  o: { n: 'Örümcek', r: 17, m: .8, acc: 1.1, col: '#7a4a8c', ab: 'Ağ', d: 'Çevik. Yetenek: yere ağ serer, rakipleri yavaşlatır.', cd: 7 },
  p: { n: 'Peygamber Devesi', r: 18, m: .9, acc: .95, col: '#7fb23a', hp: 1.3, ab: 'Pençe Darbesi', d: 'Güçlü pençeli. Yetenek: önündekileri fırlatır.', cd: 6 },
  u: { n: 'Uğur Böceği', r: 15, m: .7, acc: 1.3, col: '#d8392e', ab: 'Kanat', d: 'Hafif ve hızlı. Yetenek: 1,6 sn uçar, deliğe düşmez.', cd: 8 }
};
for (const k in BUG) BUG[k].sp = k;
const FOE = {
  n: { r: 19, m: 1, col: '#4a8fd0', acc: .62, sp: 'g' },
  f: { r: 15, m: .7, col: '#d4be3a', acc: .85, sp: 'u' },
  h: { r: 28, m: 2.4, col: '#9a3f4c', acc: .5, sp: 'd' },
  m: { r: 18, m: .9, col: '#c6d94a', acc: .8, sp: 'p', hp: 1.3 }
};
const ARENA = {
  k: { n: 'Kütük', d: 'Normal zemin.', fr: 2.6, pull: 240, c0: '#4a2c14', c1: '#c18a50', ln: 'rgba(70,38,14,.35)', rim: '#4a2c14' },
  b: { n: 'Buz', d: 'Kaygan! Savrulursun, eğim hafif.', fr: 1.2, pull: 170, c0: '#3d6f9c', c1: '#d4eefa', ln: 'rgba(255,255,255,.5)', rim: '#7fb0d4' },
  c: { n: 'Çamur', d: 'Yapış yapış. Eğim çok güçlü.', fr: 4.4, pull: 300, c0: '#1d1a0b', c1: '#6b5a2c', ln: 'rgba(0,0,0,.3)', rim: '#3a2f14' }
};
const ORD = ['k', 'b', 'c'];

function Game() {
  const G = { state: 'lobby', mode: 'me', selA: 'k', wave: 0, time: 0, roster: new Map(), bs: [], pups: [], webs: [], gaps: [], HR: 0, arena: 'k', ev: [], mv: 0 };
  let uid = 0, pt = 3, clearT = 0, lastKey = '';
  const em = b => b.m * (b.arm > 0 ? 4 : 1) * (b.put > 0 && b.pu === 'k' ? 3 : 1);
  const hs = b => .4 + .6 * b.can / b.mc;
  const ps = b => .35 + .65 * b.can / b.mc;
  const ev = (...a) => G.ev.push(a);
  const banner = s => ev('bn', s);

  function mk(T, x, y) {
    const mc = 60 + 40 * T.m;
    return { id: ++uid, x, y, vx: 0, vy: 0, r: T.r * K, m: T.m, col: T.col, acc: T.acc, sp: T.sp, hp: T.hp || 1,
      a: Math.random() * 6.28, cd: 0, dashT: 0, hornCd: 0, fall: 0, fe: 0, sc: 1, ph: Math.random() * 9, dead: false,
      can: mc, mc, hf: 0, arm: 0, fly: 0, sup: 0, pu: '', put: 0, abCd: 0, lh: null, pid: null, nm: '', ax: 0, ay: 0, tg: null, tt: 0 };
  }
  function kill(b) {
    const o = b.lh;
    if (b.pid || !o || !o.pid) return;
    const e = G.roster.get(o.pid);
    if (e) { e.score += 100 * G.wave; banner(e.nm + ' +' + 100 * G.wave); }
  }
  function hurt(X, Y, dx, dy, k) {
    const dot = Math.cos(Y.a) * dx + Math.sin(Y.a) * dy, m = dot < 0 ? 1 + .6 * dot : 1 + .5 * dot;
    let d = 2.5 * k * m;
    if (Y.arm > 0) d *= .3;
    if (Y.put > 0 && Y.pu === 'k') d *= .5;
    Y.can -= d; Y.hf = .25; Y.lh = X; ev('hurt', Y.pid || '');
    if (Y.can <= 0 && !Y.fall) { Y.can = 0; Y.fall = .001; Y.fe = 2; kill(Y); }
  }
  function tgt(b) {
    let c = G.bs.filter(o => o !== b && !o.fall && !o.dead);
    if (G.mode === 'me') c = c.filter(o => o.pid);
    else if (G.mode === 'ffa') { const e = c.filter(o => !o.pid); if (e.length) c = e; }
    if (!c.length) return null;
    if (G.mode === 'rnd') {
      if (!(b.tg && c.includes(b.tg) && G.time < b.tt)) { b.tg = c[Math.random() * c.length | 0]; b.tt = G.time + 3 + Math.random() * 2; }
      return b.tg;
    }
    return c.reduce((m, o) => Math.hypot(o.x - b.x, o.y - b.y) < Math.hypot(m.x - b.x, m.y - b.y) ? o : m);
  }
  function turn(b, tg, dt, sp) { const d = ((tg - b.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.a += d * Math.min(1, dt * sp); }
  function mix(a, c, w) { return Math.atan2(Math.sin(a) * (1 - w) + Math.sin(c) * w, Math.cos(a) * (1 - w) + Math.cos(c) * w); }
  function inGap(an, m) {
    for (const q of G.gaps) { const d = ((an - q.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (Math.abs(d) < q.w / 2 + m) return true; }
    return false;
  }
  function dash(b) {
    if (b.cd > 0 || b.fall) return;
    const h = hs(b);
    b.vx += Math.cos(b.a) * 720 * K * h; b.vy += Math.sin(b.a) * 720 * K * h;
    b.dashT = .28; b.cd = b.pid ? 1.1 : 2.2; ev('dash');
  }
  function ability(b) {
    if (b.abCd > 0 || b.fall) return;
    b.abCd = BUG[b.sp].cd; ev('ab');
    if (b.sp === 'g') { b.sup = .6; b.dashT = .5; b.vx += Math.cos(b.a) * 1100 * K; b.vy += Math.sin(b.a) * 1100 * K; }
    else if (b.sp === 'p') {
      for (const o of G.bs) {
        if (o === b || o.fall) continue;
        const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 1;
        if ((dx * Math.cos(b.a) + dy * Math.sin(b.a)) / d < .5) continue;
        if (d < b.r * 6) { const p = 700 * K / em(o); o.lh = b; o.vx += dx / d * p; o.vy += dy / d * p; }
      }
      ev('fx', b.x, b.y, 2.4); ev('sh', 9);
    }
    else if (b.sp === 'u') b.fly = 1.6;
    else if (b.sp === 'o') G.webs.push({ x: b.x, y: b.y, l: 5, o: b.id, r: 75 * K });
    else b.arm = 2.5;
  }

  function spawnPlayer(e, i, n) {
    const ang = Math.PI / 2 + (n > 1 ? (i - (n - 1) / 2) * .6 : 0), rr = R * .62;
    const b = mk(BUG[e.sp], Math.cos(ang) * rr, Math.sin(ang) * rr);
    b.a = ang + Math.PI; b.pid = e.pid; b.nm = e.nm; b.ix = i; e.b = b;
    return b;
  }
  function nextWave() {
    G.wave++;
    G.arena = ORD[(ORD.indexOf(G.selA) + G.wave - 1) % 3];
    G.HR = G.wave < 3 ? 0 : R * Math.min(.3, .06 + .02 * (G.wave - 2));
    const gn = [3, 3, 2, 2, 1, 1][G.wave - 1] || 0, o0 = Math.random() * 6.283;
    G.gaps = [];
    for (let i = 0; i < gn; i++) G.gaps.push({ a: o0 + i * 6.283 / gn, w: .9 - .08 * Math.min(G.wave, 4) });
    G.pups = []; G.webs = []; pt = 3;
    const list = [...G.roster.values()], n = list.length, rr = R * .62, humans = [];
    list.forEach((e, i) => {
      let b = e.b;
      if (!b) b = spawnPlayer(e, i, n);
      const ang = Math.PI / 2 + (n > 1 ? (i - (n - 1) / 2) * .6 : 0);
      Object.assign(b, { x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, vx: 0, vy: 0, a: ang + Math.PI, arm: 0, fly: 0, sup: 0, put: 0, pu: '', cd: 0,
        fall: 0, fs: 0, sc: 1, dead: false, fe: 0, nm: e.nm, ix: i, can: b.can <= 0 ? b.mc * .5 : Math.min(b.mc, b.can + b.mc * .35) });
      humans.push(b);
    });
    G.bs = humans;
    const cnt = Math.min(1 + G.wave + (n > 1 ? 2 : 0), 9), pool = G.wave < 3 ? ['n', 'f'] : ['n', 'f', 'h', 'm'];
    for (let i = 0; i < cnt; i++) {
      const an = Math.PI / 2 + .7 + i * (Math.PI * 2 - 1.4) / Math.max(1, cnt - 1);
      const e = mk(FOE[pool[Math.random() * pool.length | 0]], Math.cos(an) * rr, Math.sin(an) * rr);
      e.a = an + Math.PI; G.bs.push(e);
    }
    banner('Dalga ' + G.wave + ' · ' + ARENA[G.arena].n); ev('wave');
  }

  G.addPlayer = (pid, nm, sp) => { if (!G.roster.has(pid)) G.roster.set(pid, { pid, nm: String(nm || 'Oyuncu').slice(0, 12), sp: BUG[sp] ? sp : 'g', score: 0, b: null }); };
  G.setPlayer = (pid, nm, sp) => { const e = G.roster.get(pid); if (e) { if (nm) e.nm = String(nm).slice(0, 12); if (BUG[sp]) e.sp = sp; } };
  G.removePlayer = pid => { const e = G.roster.get(pid); if (e && e.b) e.b.dead = true; G.roster.delete(pid); };
  G.setInput = (pid, x, y) => { const e = G.roster.get(pid); if (e && e.b) { e.b.ax = Math.max(-1, Math.min(1, +x || 0)); e.b.ay = Math.max(-1, Math.min(1, +y || 0)); } };
  G.act = (pid, k) => { const e = G.roster.get(pid); if (!e || !e.b || G.state !== 'play') return; if (k === 'd') dash(e.b); else if (k === 'a') ability(e.b); };
  G.start = (o = {}) => {
    if (['me', 'ffa', 'rnd'].includes(o.mode)) G.mode = o.mode;
    if (ARENA[o.arena]) G.selA = o.arena;
    for (const e of G.roster.values()) { e.score = 0; e.b = null; }
    G.wave = 0; G.time = 0; G.fx = []; G.state = 'play'; nextWave();
  };

  G.step = function (dt) {
    if (G.state !== 'play') return;
    G.time += dt;
    pt -= dt;
    if (pt <= 0) {
      if (G.pups.length < 2) { const an = Math.random() * 6.283, rr = G.HR * 1.7 + Math.random() * (R * .78 - G.HR * 1.7); G.pups.push({ x: Math.cos(an) * rr, y: Math.sin(an) * rr, k: 'hgkc'[Math.random() * 4 | 0], l: 12 }); }
      pt = 6 + Math.random() * 3;
    }
    for (const u of G.pups) u.l -= dt;
    for (const w of G.webs) w.l -= dt;
    G.webs = G.webs.filter(w => w.l > 0);
    const A = ARENA[G.arena], HR = G.HR;
    for (const b of G.bs) {
      b.cd -= dt; b.dashT -= dt; b.hornCd -= dt; b.arm -= dt; b.fly -= dt; b.sup -= dt; b.put -= dt; b.abCd -= dt; b.hf -= dt;
      if (b.fall > 0) {
        if (!b.fs) { b.fs = 1; ev('fall', Math.round(b.x), Math.round(b.y), b.pid || ''); }
        b.fall += dt; b.sc = Math.max(0, 1 - b.fall * 1.5);
        const kk = b.fe === 2 ? 0 : b.fe ? -1.2 : 5; b.x += (0 - b.x) * dt * kk; b.y += (0 - b.y) * dt * kk;
        if (b.fall > .7) b.dead = true;
        continue;
      }
      let dx = 0, dy = 0, T = null;
      const ce = Math.hypot(b.x, b.y);
      if (b.pid) {
        dx = b.ax; dy = b.ay;
        const l = Math.hypot(dx, dy);
        if (l > 1) { dx /= l; dy /= l; }
        if (l > .1) turn(b, Math.atan2(dy, dx), dt, 12);
      } else if ((T = tgt(b))) {
        let an = Math.atan2(T.y - b.y, T.x - b.x) + Math.sin(G.time * 2 + b.id) * .45;
        if (ce < HR * 2.4) { const w = Math.min(1, (HR * 2.4 - ce) / (HR * 1.2)); an = mix(an, Math.atan2(b.y, b.x), w); }
        if (ce > R * .6 && inGap(Math.atan2(b.y, b.x), .25)) { const w = Math.min(1, (ce - R * .6) / (R * .25)); an = mix(an, Math.atan2(-b.y, -b.x), w); }
        dx = Math.cos(an); dy = Math.sin(an); turn(b, an, dt, 7);
        const dp = Math.hypot(T.x - b.x, T.y - b.y);
        if (dp < b.r * 5 && b.cd <= 0 && Math.random() < dt * 1.6 && ce > HR * 2.6) dash(b);
      }
      const acc = 900 * K * b.acc * hs(b) * (b.pid ? 1 : Math.min(1.25, .85 + G.wave * .05)) * (A.fr / 2.6) * (b.put > 0 && b.pu === 'h' ? 1.7 : 1);
      b.vx += dx * acc * dt; b.vy += dy * acc * dt;
      if (b.fly <= 0 && ce > 1) { const pf = A.pull * K * (.4 + .6 * ce / R); b.vx -= b.x / ce * pf * dt; b.vy -= b.y / ce * pf * dt; }
      let fk = A.fr;
      for (const w of G.webs) if (b.fly <= 0 && w.o !== b.id && Math.hypot(b.x - w.x, b.y - w.y) < w.r) fk += 5;
      const fr = Math.exp(-fk * dt); b.vx *= fr; b.vy *= fr;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dc = Math.hypot(b.x, b.y), lim = R - b.r * .7;
      if (dc > lim) {
        if (inGap(Math.atan2(b.y, b.x), 0)) {
          if (dc > R + b.r * .2 && b.fly <= 0) { b.fall = .001; b.fe = 1; kill(b); }
        } else {
          const nx = b.x / dc, ny = b.y / dc; b.x = nx * lim; b.y = ny * lim;
          const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; }
        }
      }
      if (b.fly <= 0 && dc < HR) { b.fall = .001; kill(b); }
      for (const u of G.pups) if (u.l > 0 && Math.hypot(u.x - b.x, u.y - b.y) < b.r + 14 * K) {
        if (u.k === 'c') b.can = Math.min(b.mc, b.can + b.mc * .4); else { b.pu = u.k; b.put = 5; }
        u.l = 0; ev('pk', b.pid || '');
        if (b.pid) banner(b.nm + ' ' + ({ h: '⚡ Hız', g: '💪 Güç', k: '🛡️ Kalkan', c: '❤ Can' })[u.k]);
      }
    }
    G.pups = G.pups.filter(u => u.l > 0);
    const bs = G.bs;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const Aa = bs[i], Bb = bs[j];
      if (Aa.fall || Bb.fall || Aa.fly > 0 || Bb.fly > 0) continue;
      let nx = Bb.x - Aa.x, ny = Bb.y - Aa.y; const d = Math.hypot(nx, ny), rs = Aa.r + Bb.r;
      if (d >= rs || d === 0) continue;
      const ma = em(Aa), mb = em(Bb);
      nx /= d; ny /= d; const ov = rs - d, ms = ma + mb;
      Aa.x -= nx * ov * mb / ms; Aa.y -= ny * ov * mb / ms; Bb.x += nx * ov * ma / ms; Bb.y += ny * ov * ma / ms;
      const rel = (Bb.vx - Aa.vx) * nx + (Bb.vy - Aa.vy) * ny;
      if (rel < 0) { const jj = -1.8 * rel / (1 / ma + 1 / mb); Aa.vx -= jj * nx / ma; Aa.vy -= jj * ny / ma; Bb.vx += jj * nx / mb; Bb.vy += jj * ny / mb; }
      for (const [X, Y, s] of [[Aa, Bb, 1], [Bb, Aa, -1]]) {
        const fc = Math.cos(X.a) * nx * s + Math.sin(X.a) * ny * s;
        if (fc > .72 && X.hornCd <= 0) {
          const str = X.hp * ps(X) * (X.dashT > 0 ? 2.4 : 1) * (X.put > 0 && X.pu === 'g' ? 1.8 : 1) * (X.sup > 0 ? 1.8 : 1);
          const pw = 240 * K * str / em(Y);
          Y.vx += nx * s * pw; Y.vy += ny * s * pw; X.vx -= nx * s * 70 * K; X.vy -= ny * s * 70 * K;
          X.hornCd = .4; hurt(X, Y, nx * s, ny * s, str);
          ev('fx', (Aa.x + Bb.x) / 2, (Aa.y + Bb.y) / 2, 1, X.dashT > 0 ? 1 : 0); ev('sh', X.dashT > 0 ? 9 : 4);
        }
      }
    }
    G.bs = G.bs.filter(b => !b.dead || b.pid);
    const humans = G.bs.filter(b => b.pid);
    if (humans.length && humans.every(b => b.dead)) { G.state = 'over'; ev('over'); return; }
    if (G.bs.every(b => b.pid) && humans.some(b => !b.fall)) { clearT += dt; if (clearT > 1.2) { clearT = 0; nextWave(); } } else clearT = 0;
    const key = G.bs.map(b => b.id).join(); if (key !== lastKey) { lastKey = key; G.mv++; }
  };

  G.meta = () => G.bs.map(b => [b.id, b.sp, b.col, Math.round(b.r), b.nm, b.pid || '', b.ix || 0]);
  G.snap = () => ({
    s: G.state, w: G.wave, h: Math.round(G.HR), ar: G.arena,
    g: G.gaps.map(q => [+q.a.toFixed(2), +q.w.toFixed(2)]),
    u: G.pups.map(u => [Math.round(u.x), Math.round(u.y), u.k]),
    wb: G.webs.map(w => [Math.round(w.x), Math.round(w.y), Math.round(w.r), +w.l.toFixed(1)]),
    b: G.bs.map(b => [b.id, Math.round(b.x), Math.round(b.y), +b.a.toFixed(2), Math.round(b.vx), Math.round(b.vy), Math.round(100 * b.can / b.mc),
      b.fall > 0 ? 1 : 0, b.fly > 0 ? 1 : 0, b.arm > 0 ? 1 : 0, b.put > 0 ? b.pu : '', b.dashT > 0 ? 1 : 0, b.hf > 0 ? 1 : 0, +b.sc.toFixed(2), Math.ceil(Math.max(0, b.abCd))]),
    sc: [...G.roster.values()].map(e => [e.pid, e.nm, e.score]),
    ev: G.ev.splice(0)
  });
  return G;
}

const api = { Game, BUG, FOE, ARENA, ORD, K, R };
root.Sim = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
