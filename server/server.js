'use strict';
/* Börtü Böcek sunucusu. Ek paket (npm install) gerektirmez: sadece Node.js.
   - public/ klasörünü yayınlar (oyunun kendisi)
   - /ws adresinde WebSocket ile çevrimiçi odalar sunar
   - Oyun mantığı sunucuda çalışır (hile yapılamaz), herkes aynı oyunu görür. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Sim = require('../public/sim.js');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, '..', 'public');
const MAX_PLAYERS = 4, MAX_ROOMS = 100, TICK = 1 / 60, SNAP_EVERY = 3;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* ---------- Basit WebSocket (RFC 6455) ---------- */
function wsAccept(key) { return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64'); }
function frame(op, payload) {
  const len = payload.length; let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, payload]);
}
class Client {
  constructor(sock) { this.sock = sock; this.buf = Buffer.alloc(0); this.frag = []; this.alive = true; this.room = null; this.pid = null; this.msgs = 0; this.msgT = Date.now(); this.onmsg = null; this.onclose = null;
    sock.on('data', d => this.data(d)); sock.on('close', () => this.close()); sock.on('error', () => this.close()); sock.setNoDelay(true); }
  send(obj) {
    if (!this.alive || this.sock.writableLength > 1e6) return;
    try { this.sock.write(frame(1, Buffer.from(JSON.stringify(obj)))); } catch (e) { this.close(); }
  }
  data(d) {
    this.buf = Buffer.concat([this.buf, d]);
    if (this.buf.length > 1e5) return this.kill();
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const fin = b[0] & 0x80, op = b[0] & 15, masked = b[1] & 0x80; let len = b[1] & 127, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (!masked || len > 65536) return this.kill();
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), p = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < p.length; i++) p[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      if (op === 8) return this.kill();
      if (op === 9) { this.sock.write(frame(10, p)); continue; }
      if (op === 0 || op === 1) {
        this.frag.push(p);
        if (fin) { const txt = Buffer.concat(this.frag).toString('utf8'); this.frag = []; this.text(txt); }
      }
    }
  }
  text(t) {
    const now = Date.now();
    if (now - this.msgT > 1000) { this.msgT = now; this.msgs = 0; }
    if (++this.msgs > 60) return;           // saniyede en fazla 60 mesaj
    let m; try { m = JSON.parse(t); } catch (e) { return; }
    if (m && typeof m === 'object' && this.onmsg) this.onmsg(m);
  }
  kill() { try { this.sock.end(); this.sock.destroy(); } catch (e) {} this.close(); }
  close() { if (!this.alive) return; this.alive = false; if (this.onclose) this.onclose(); }
}

/* ---------- Odalar ---------- */
const rooms = new Map();
const code4 = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);

class Room {
  constructor(code) { this.code = code; this.game = Sim.Game(); this.clients = new Map(); this.host = null; this.acc = 0; this.last = process.hrtime.bigint(); this.n = 0; this.sentMv = -1; this.emptyAt = 0; this.timer = null; this.mode = 'me'; this.arena = 'k'; }
  lobby() { return { t: 'lobby', room: this.code, host: this.host, mode: this.mode, arena: this.arena, state: this.game.state, players: [...this.game.roster.values()].map(e => ({ pid: e.pid, nm: e.nm, sp: e.sp })) }; }
  broadcast(o) { for (const c of this.clients.values()) c.send(o); }
  add(c, nm, sp) {
    const pid = 'p' + crypto.randomBytes(3).toString('hex'); c.pid = pid; c.room = this; this.clients.set(pid, c);
    this.game.addPlayer(pid, nm, sp); if (!this.host) this.host = pid;
    c.send({ t: 'hello', pid, room: this.code }); this.broadcast(this.lobby());
    if (this.game.state === 'play') { c.send({ t: 'meta', d: this.game.meta() }); }
  }
  remove(c) {
    if (!c.pid || !this.clients.has(c.pid)) return;
    this.clients.delete(c.pid); this.game.removePlayer(c.pid);
    if (this.host === c.pid) this.host = this.clients.keys().next().value || null;
    if (!this.clients.size) { this.emptyAt = Date.now(); this.stop(); } else this.broadcast(this.lobby());
  }
  begin(o) {
    this.mode = ['me', 'ffa', 'rnd'].includes(o.mode) ? o.mode : this.mode; this.arena = Sim.ARENA[o.arena] ? o.arena : this.arena;
    this.game.start({ mode: this.mode, arena: this.arena }); this.sentMv = -1; this.n = 0; this.last = process.hrtime.bigint(); this.acc = 0;
    this.broadcast(this.lobby());
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000 / 60);
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  tick() {
    const now = process.hrtime.bigint(); this.acc += Math.min(.1, Number(now - this.last) / 1e9); this.last = now;
    const G = this.game;
    while (this.acc >= TICK) {
      this.acc -= TICK;
      for (const c of this.clients.values()) if (Date.now() - c.lastIn > 1500) G.setInput(c.pid, 0, 0);   // bağlantısı kopan durur
      const was = G.state; G.step(TICK);
      if (this.sentMv !== G.mv) { this.sentMv = G.mv; this.broadcast({ t: 'meta', d: G.meta() }); }
      if (was === 'play' && G.state === 'over') { this.broadcast({ t: 'snap', d: G.snap() }); this.broadcast(this.lobby()); this.stop(); return; }
      if (++this.n % SNAP_EVERY === 0) this.broadcast({ t: 'snap', d: G.snap() });
    }
  }
}

function onClient(c) {
  c.lastIn = Date.now();
  c.onmsg = m => {
    if (m.t === 'join') {
      if (c.room) return;
      const code = code4(m.room); if (!code) return c.send({ t: 'err', m: 'Oda kodu yaz (harf ve rakam).' });
      let r = rooms.get(code);
      if (!r) { if (!m.create) return c.send({ t: 'err', m: 'Bu kodla oda yok. Önce biri "Oda kur" demeli.' }); if (rooms.size >= MAX_ROOMS) return c.send({ t: 'err', m: 'Sunucu dolu, biraz sonra dene.' }); r = new Room(code); rooms.set(code, r); }
      else if (m.create && r.clients.size) return c.send({ t: 'err', m: 'Bu oda kodu kullanımda, başka bir kod dene.' });
      if (r.clients.size >= MAX_PLAYERS) return c.send({ t: 'err', m: 'Oda dolu (en fazla ' + MAX_PLAYERS + ' kişi).' });
      if (r.game.state === 'play') return c.send({ t: 'err', m: 'Oyun başlamış, bitmesini bekle.' });
      r.add(c, m.nm, m.sp); return;
    }
    const r = c.room; if (!r) return;
    const G = r.game;
    if (m.t === 'in') { c.lastIn = Date.now(); G.setInput(c.pid, m.x, m.y); }
    else if (m.t === 'act') G.act(c.pid, m.k === 'a' ? 'a' : 'd');
    else if (m.t === 'me') { G.setPlayer(c.pid, m.nm, m.sp); r.broadcast(r.lobby()); }
    else if (m.t === 'start' && c.pid === r.host && G.state !== 'play') r.begin(m);
    else if (m.t === 'leave') { r.remove(c); c.room = null; }
  };
  c.onclose = () => { if (c.room) c.room.remove(c); };
}

setInterval(() => { for (const [k, r] of rooms) if (!r.clients.size && Date.now() - r.emptyAt > 30000) { r.stop(); rooms.delete(k); } }, 10000);

/* ---------- HTTP ---------- */
const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (u === '/') u = '/index.html';
  const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('Bulunamadı'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d);
  });
});
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.url || '').split('?')[0] !== '/ws') return sock.destroy();
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + wsAccept(key) + '\r\n\r\n');
  onClient(new Client(sock));
});
if (require.main === module) server.listen(PORT, () => console.log('Börtü Böcek sunucusu çalışıyor: http://localhost:' + PORT));
module.exports = { server, rooms };
