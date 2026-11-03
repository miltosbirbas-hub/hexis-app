// HEXIS PAD — πηγές θέσης: δέκτης Bluetooth/TCP (native), GPS κινητού, προσομοιωτής. NTRIP μέσω native.
(function (g) {
  'use strict';
  const listeners = { nmea: [], status: [], ntrip: [] };
  function emit(ev, d) { (listeners[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }
  function on(ev, f) { listeners[ev].push(f); }

  function plugin() { return g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.HexisGnss; }
  function hasNative() { return !!(plugin() && g.Capacitor.isNativePlatform && g.Capacitor.isNativePlatform()); }

  let nativeBound = false;
  function bindNative() {
    if (nativeBound || !hasNative()) return;
    nativeBound = true;
    const P = plugin();
    P.addListener('nmea', d => emit('nmea', d));
    P.addListener('status', d => emit('status', d));
    P.addListener('ntrip', d => emit('ntrip', d));
  }

  const state = { gnss: 'off', laser: 'off', source: null };

  async function listPaired() {
    if (!hasNative()) return [];
    bindNative();
    const r = await plugin().listPaired();
    return r.devices || [];
  }

  // cfg: {type:'bt'|'tcp'|'phone'|'sim', address, host, port, channel}
  async function connect(cfg) {
    const ch = cfg.channel || 'gnss';
    await disconnect(ch);
    if (cfg.type === 'sim') { Sim.start(cfg); state[ch] = 'on'; state.source = 'sim'; emit('status', { channel: ch, state: 'connected', name: 'Προσομοιωτής' }); return; }
    if (cfg.type === 'phone') { Phone.start(); state[ch] = 'on'; state.source = 'phone'; emit('status', { channel: ch, state: 'connected', name: 'GPS κινητού' }); return; }
    if (!hasNative()) throw new Error('Η σύνδεση με εξωτερικό δέκτη/laser γίνεται μόνο από την εφαρμογή Android.');
    bindNative();
    emit('status', { channel: ch, state: 'connecting' });
    await plugin().connect({ channel: ch, type: cfg.type, address: cfg.address || '', host: cfg.host || '', port: cfg.port || 0 });
    state[ch] = 'on'; if (ch === 'gnss') state.source = cfg.type;
  }

  async function disconnect(ch) {
    ch = ch || 'gnss';
    if (ch === 'gnss') { Sim.stop(); Phone.stop(); }
    if (hasNative()) { try { await plugin().disconnect({ channel: ch }); } catch (e) { /* */ } }
    if (state[ch] !== 'off') emit('status', { channel: ch, state: 'disconnected' });
    state[ch] = 'off'; if (ch === 'gnss') state.source = null;
  }

  async function write(ch, text) {
    if (!hasNative()) return;
    await plugin().write({ channel: ch, data: btoa(text) });
  }

  // ---------- NTRIP ----------
  async function ntripStart(cfg) {
    if (!hasNative()) throw new Error('Το NTRIP λειτουργεί μόνο στην εφαρμογή Android.');
    bindNative();
    await plugin().ntripStart(cfg);
  }
  async function ntripStop() { if (hasNative()) await plugin().ntripStop(); }
  async function ntripSetGGA(gga) { if (hasNative() && gga) { try { await plugin().ntripSetGGA({ gga }); } catch (e) { /* */ } } }
  async function ntripTable(host, port, user, pass) {
    if (!hasNative()) throw new Error('Μόνο στην εφαρμογή Android.');
    const r = await plugin().ntripSourcetable({ host, port, user: user || '', pass: pass || '' });
    return r.mounts || [];
  }

  // ---------- GPS κινητού (για δοκιμή / πρόχειρη θέση) ----------
  const Phone = {
    id: null,
    start() {
      if (!navigator.geolocation) throw new Error('Δεν υπάρχει GPS');
      this.id = navigator.geolocation.watchPosition(p => {
        const c = p.coords;
        const gga = HNMEA.makeGGA(c.latitude, c.longitude, c.altitude || 0, 1, 8, Math.max(0.5, (c.accuracy || 5) / 5));
        emit('nmea', { channel: 'gnss', line: gga });
        const sig = (c.accuracy || 5) / Math.SQRT2;
        emit('nmea', { channel: 'gnss', line: gstLine(sig, sig, c.altitudeAccuracy || sig * 2) });
      }, e => emit('status', { channel: 'gnss', state: 'error', message: e.message }), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    },
    stop() { if (this.id != null) navigator.geolocation.clearWatch(this.id); this.id = null; },
  };

  function gstLine(sLat, sLon, sAlt) {
    const body = `GPGST,000000.00,0.01,${sLat.toFixed(3)},${sLon.toFixed(3)},0.0,${sLat.toFixed(3)},${sLon.toFixed(3)},${sAlt.toFixed(3)}`;
    let x = 0; for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    return '$' + body + '*' + x.toString(16).toUpperCase().padStart(2, '0');
  }

  // ---------- Προσομοιωτής (εκπαίδευση / δοκιμή χωρίς δέκτη) ----------
  const Sim = {
    timer: null, E: null, N: null, Z: 100, target: null, quality: 4, t: 0,
    start(cfg) {
      const c = cfg.center || { E: 213500, N: 4290500, Z: 12 };
      if (this.E == null) { this.E = c.E; this.N = c.N; this.Z = c.Z != null ? c.Z : 12; }
      this.stop();
      this.timer = setInterval(() => this.tick(), 200);
    },
    stop() { if (this.timer) clearInterval(this.timer); this.timer = null; },
    walkTo(p) { this.target = { E: p.E, N: p.N }; },
    jumpTo(p) { this.E = p.E; this.N = p.N; if (p.Z != null) this.Z = p.Z + 1.8; this.target = null; },
    tick() {
      this.t++;
      if (this.target) {
        const dx = this.target.E - this.E, dy = this.target.N - this.N, d = Math.hypot(dx, dy);
        this.v = Math.min(0.3, (this.v || 0) + 0.03); // επιτάχυνση έως ~1.5 m/s
        const step = Math.min(d, this.v);
        if (d < 0.005) { this.target = null; this.v = 0; } else { this.E += dx / d * step; this.N += dy / d * step; }
      }
      // FIX κυρίως, σύντομα FLOAT κάθε ~40 s
      this.quality = (this.t % 200) > 185 ? 5 : 4;
      const noise = this.quality === 4 ? 0.006 : 0.12;
      const E = this.E + (Math.random() - 0.5) * noise, N = this.N + (Math.random() - 0.5) * noise;
      const ll = HGEO.toLL(E, N);
      const gga = HNMEA.makeGGA(ll.lat, ll.lon, this.Z + (Math.random() - 0.5) * noise * 1.5, this.quality, 22, 0.6)
        .replace(/,M,0\.000,M,,\*/, ',M,0.000,M,1.0,0001*');
      emit('nmea', { channel: 'gnss', line: fixCs(gga) });
      const s = this.quality === 4 ? 0.008 : 0.15;
      emit('nmea', { channel: 'gnss', line: gstLine(s, s * 1.1, s * 1.8) });
    },
  };
  function fixCs(line) {
    const body = line.slice(1, line.lastIndexOf('*'));
    let x = 0; for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    return '$' + body + '*' + x.toString(16).toUpperCase().padStart(2, '0');
  }

  g.HCONN = { _emit: emit, on, connect, disconnect, write, listPaired, hasNative, ntripStart, ntripStop, ntripSetGGA, ntripTable, state, Sim };
})(window);
