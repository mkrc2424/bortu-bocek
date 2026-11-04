/* Börtü Böcek - ses efektleri (dosya gerekmez, tarayıcıda üretilir) ve titreşim. */
const Snd = (() => {
  let ctx = null, master = null, nb = null, on = true; const last = {};
  try { on = localStorage.getItem('bb_snd') !== '0'; } catch (e) {}
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
    if (typeof Music !== 'undefined') Music.kick();
  }
  function tone(f0, f1, dur, type, vol, delay = 0) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol, f0, f1, delay = 0) {
    if (!nb) { nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = nb; f.type = 'bandpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
  }
  const S = {
    hit: v => { noise(.09, .5 * v, 1800, 400); tone(150, 55, .14, 'sine', .8 * v); },
    dash: v => noise(.18, .25 * v, 500, 2500),
    ab: () => { tone(300, 900, .25, 'triangle', .35); tone(450, 1350, .25, 'triangle', .2, .05); },
    pk: () => { tone(660, 660, .08, 'square', .16); tone(990, 990, .12, 'square', .16, .08); },
    fall: () => { tone(700, 70, .6, 'sine', .5); noise(.3, .12, 800, 150, .05); },
    wave: () => { [392, 494, 587].forEach((f, i) => tone(f, f, .16, 'triangle', .3, i * .13)); },
    over: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * .98, .3, 'sawtooth', .2, i * .22)); }
  };
  return {
    init, ac: () => ({ ctx, master }),
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('bb_snd', on ? '1' : '0'); } catch (e) {} if (on) init(); return on; },
    play(n, v = 1) { if (!on || !ctx || !S[n]) return; const t = performance.now(); if (t - (last[n] || 0) < 70) return; last[n] = t; try { S[n](v); } catch (e) {} },
    buzz(p) { if (on && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }
  };
})();

/* Arka plan müziği: kendi kendine üretilen, sonsuz döngülü hafif melodi. */
const Music = (() => {
  let on = true, track = 'menu', timer = null, next = 0, step = 0, bus = null;
  try { on = localStorage.getItem('bb_mus') !== '0'; } catch (e) {}
  const PEN = [0, 3, 5, 7, 10, 12, 15, 17], PROG = [0, -4, 3, -2];
  const TR = { menu: { bpm: 80, vol: .55 }, game: { bpm: 118, vol: .7 } };
  const hz = n => 220 * Math.pow(2, n / 12);
  function note(f, t, dur, type, vol) {
    const { ctx } = Snd.ac(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .05);
  }
  function sched() {
    const { ctx } = Snd.ac(); if (!ctx || !on) return;
    const tr = TR[track], sp = 60 / tr.bpm / 2;
    while (next < ctx.currentTime + .35) {
      const bar = Math.floor(step / 8), s = step % 8, root = PROG[bar % 4];
      if (s === 0 || s === 4) note(hz(root - 12), next, sp * 3.5, 'triangle', .5 * tr.vol);
      if (track === 'game' && s % 2 === 1) note(hz(root), next, sp * .6, 'square', .04);
      if (s % 2 === 0 || track === 'game') { const h = (bar * 7 + s * 3 + (bar >> 2)) % 8; note(hz(root + PEN[(h + s) % 8] + 12), next, sp * 1.6, track === 'game' ? 'triangle' : 'sine', .16 * tr.vol); }
      next += sp; step++;
    }
  }
  function kick() {
    const { ctx, master } = Snd.ac(); if (!ctx || !on || timer) return;
    if (!bus) { bus = ctx.createGain(); bus.gain.value = .35; bus.connect(master); }
    next = ctx.currentTime + .1; timer = setInterval(sched, 90);
  }
  function stop() { clearInterval(timer); timer = null; }
  return {
    get on() { return on; },
    set(t) { if (t === track) return; track = t; step = 0; const { ctx } = Snd.ac(); if (ctx) next = ctx.currentTime + .1; },
    kick,
    toggle() { on = !on; try { localStorage.setItem('bb_mus', on ? '1' : '0'); } catch (e) {} if (on) kick(); else stop(); return on; }
  };
})();
document.addEventListener('visibilitychange', () => { const { ctx } = Snd.ac(); if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
