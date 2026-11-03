// HEXIS PAD — χάρτης σε συντεταγμένες καννάβου (canvas): υπόβαθρα, ΚΑΕΚ, σχέδιο DXF/DWG, σημεία, θέση
(function (g) {
  'use strict';
  const D2R = Math.PI / 180;

  // ---------- Υπόβαθρα (όλα ως πλακίδια Web Mercator, προβάλλονται σε κάνναβο) ----------
  const BASEMAPS = {
    none: { name: 'Χωρίς υπόβαθρο' },
    esri_sat: { name: 'Esri · Δορυφορική', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 19, attr: 'Esri, Maxar, Earthstar' },
    esri_street: { name: 'Esri · Οδικός', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', max: 19, attr: 'Esri' },
    esri_topo: { name: 'Esri · Τοπογραφικός', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', max: 19, attr: 'Esri' },
    google_sat: { name: 'Google · Δορυφορική (API key)', google: 'satellite', max: 21, attr: 'Google' },
    google_road: { name: 'Google · Οδικός (API key)', google: 'roadmap', max: 21, attr: 'Google' },
    osm: { name: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19, attr: '© OpenStreetMap' },
  };
  const OVERLAYS = {
    esri_labels: { name: 'Esri · Ονόματα / δρόμοι', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', max: 19 },
    kt_wms: { name: 'Κτηματολόγιο · Όρια γεωτεμαχίων (WMS)', wms: 'https://gis.ktimanet.gr/inspire/rest/services/cadastralparcels/CadastralParcelWMS/MapServer/exts/InspireView/service', layers: '0', min: 15, max: 21 },
    hexis_kaek: { name: 'HEXIS · ΚΑΕΚ (όρια + αριθμοί)', vector: 'kaek', min: 16 },
  };
  const KT_LIVE_URL = 'https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query';

  const tileCache = new Map(); // key -> {img, ok, t}
  const MAXTILES = 400;
  let googleSession = {}, googleKey = '';

  function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
  function lat2y(lat, z) { const r = lat * D2R; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z); }
  function x2lon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
  function y2lat(y, z) { const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z); return Math.atan(Math.sinh(n)) / D2R; }
  function merc(lat, lon) { return [lon * 20037508.34 / 180, Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 6378137]; }

  async function ensureGoogle(type) {
    if (!googleKey) return null;
    const s = googleSession[type];
    if (s && s.exp > Date.now()) return s.token;
    if (s && s.pending) return null;
    googleSession[type] = { pending: true };
    try {
      const r = await fetch('https://tile.googleapis.com/v1/createSession?key=' + encodeURIComponent(googleKey), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapType: type, language: 'el-GR', region: 'GR', layerTypes: type === 'satellite' ? ['layerRoadmap'] : undefined }),
      });
      const j = await r.json();
      if (!j.session) throw new Error(j.error ? j.error.message : 'Google session');
      googleSession[type] = { token: j.session, exp: Date.now() + 10 * 24 * 3600e3 };
      return j.session;
    } catch (e) { googleSession[type] = { error: e.message, exp: Date.now() + 60e3 }; console.warn(e); return null; }
  }

  function tileUrl(layer, z, x, y) {
    if (layer.google) {
      const s = googleSession[layer.google];
      if (!s || !s.token) { ensureGoogle(layer.google); return null; }
      return `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}?session=${s.token}&key=${encodeURIComponent(googleKey)}`;
    }
    if (layer.wms) {
      const n = Math.pow(2, z), R = 20037508.34;
      const minx = x / n * 2 * R - R, maxx = (x + 1) / n * 2 * R - R;
      const maxy = R - y / n * 2 * R, miny = R - (y + 1) / n * 2 * R;
      return `${layer.wms}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer.layers}&STYLES=&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX=${minx},${miny},${maxx},${maxy}`;
    }
    return layer.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }

  function getTile(url, redraw) {
    let t = tileCache.get(url);
    if (t) { t.t = Date.now(); return t; }
    t = { img: new Image(), ok: false, t: Date.now() };
    t.img.decoding = 'async';
    t.img.onload = () => { t.ok = true; redraw(); };
    t.img.onerror = () => { t.err = true; };
    t.img.src = url;
    tileCache.set(url, t);
    if (tileCache.size > MAXTILES) {
      const arr = [...tileCache.entries()].sort((a, b) => a[1].t - b[1].t);
      for (let i = 0; i < arr.length - MAXTILES; i++) tileCache.delete(arr[i][0]);
    }
    return t;
  }

  // ---------- Κλάση χάρτη ----------
  function MapView(canvas) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.view = { cx: 0, cy: 0, s: 2 }; // s: pixel ανά μέτρο
    this.layers = { design: null, points: [], lines: [], target: null, targetLine: null, pos: null, track: [], measure: [], kaek: [] };
    this.base = 'esri_sat'; this.overlays = { esri_labels: false, kt_wms: false, hexis_kaek: false };
    this.designLayers = {};
    this.dark = false;
    this.follow = true;
    this.onTap = null; this.onLongPress = null; this.onViewChange = null;
    this._dirty = true;
    this._pt = new Map();
    this._bind();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    const loop = () => { if (this._dirty) { this._dirty = false; this._draw(); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  MapView.prototype.setGoogleKey = function (k) { googleKey = k || ''; googleSession = {}; this.redraw(); };
  MapView.prototype.redraw = function () { this._dirty = true; };
  MapView.prototype._resize = function () {
    const r = this.c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    this.dpr = dpr; this.w = r.width; this.h = r.height;
    this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
    this.redraw();
  };
  MapView.prototype.w2s = function (E, N) { const v = this.view; return [this.w / 2 + (E - v.cx) * v.s, this.h / 2 - (N - v.cy) * v.s]; };
  MapView.prototype.s2w = function (x, y) { const v = this.view; return { E: v.cx + (x - this.w / 2) / v.s, N: v.cy - (y - this.h / 2) / v.s }; };
  MapView.prototype.centerOn = function (E, N, s) { this.view.cx = E; this.view.cy = N; if (s) this.view.s = s; this.redraw(); this._changed(); };
  MapView.prototype.zoom = function (k, sx, sy) {
    sx = sx == null ? this.w / 2 : sx; sy = sy == null ? this.h / 2 : sy;
    const p = this.s2w(sx, sy);
    this.view.s = Math.max(0.0005, Math.min(4000, this.view.s * k));
    const q = this.s2w(sx, sy);
    this.view.cx += p.E - q.E; this.view.cy += p.N - q.N;
    this.redraw(); this._changed();
  };
  MapView.prototype._changed = function () { clearTimeout(this._vt); this._vt = setTimeout(() => this.onViewChange && this.onViewChange(), 350); };

  MapView.prototype.extents = function () {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (E, N) => { if (!isFinite(E) || !isFinite(N)) return; x0 = Math.min(x0, E); x1 = Math.max(x1, E); y0 = Math.min(y0, N); y1 = Math.max(y1, N); };
    const L = this.layers;
    if (L.design && L.design.bbox) { add(L.design.bbox.x0, L.design.bbox.y0); add(L.design.bbox.x1, L.design.bbox.y1); }
    L.points.forEach(p => add(p.E, p.N));
    if (L.pos) add(L.pos.E, L.pos.N);
    if (!isFinite(x0)) return false;
    const w = Math.max(x1 - x0, 5), h = Math.max(y1 - y0, 5);
    this.view.cx = (x0 + x1) / 2; this.view.cy = (y0 + y1) / 2;
    this.view.s = Math.min(this.w / w, this.h / h) * 0.85;
    this.follow = false; this.redraw(); this._changed();
    return true;
  };

  // ---------- Χειρονομίες ----------
  MapView.prototype._bind = function () {
    const c = this.c;
    let start = null, pinch = null, moved = false, lpTimer = null, lastTap = 0;
    const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      this._pt.set(e.pointerId, pos(e));
      if (this._pt.size === 1) {
        start = { p: pos(e), cx: this.view.cx, cy: this.view.cy }; moved = false;
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { if (!moved && this.onLongPress) { moved = true; const w = this.s2w(...start.p); this.onLongPress(w, start.p); } }, 650);
      } else if (this._pt.size === 2) {
        clearTimeout(lpTimer);
        const [a, b] = [...this._pt.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s: this.view.s, w: this.s2w((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
        moved = true;
      }
    });
    c.addEventListener('pointermove', e => {
      if (!this._pt.has(e.pointerId)) return;
      this._pt.set(e.pointerId, pos(e));
      if (this._pt.size === 2 && pinch) {
        const [a, b] = [...this._pt.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        this.view.s = Math.max(0.0005, Math.min(4000, pinch.s * d / pinch.d));
        this.view.cx = pinch.w.E - (m[0] - this.w / 2) / this.view.s;
        this.view.cy = pinch.w.N + (m[1] - this.h / 2) / this.view.s;
        this.follow = false; this.redraw(); this._changed();
      } else if (start && this._pt.size === 1) {
        const p = pos(e);
        const dx = p[0] - start.p[0], dy = p[1] - start.p[1];
        if (!moved && Math.hypot(dx, dy) > 8) { moved = true; clearTimeout(lpTimer); }
        if (moved) {
          this.view.cx = start.cx - dx / this.view.s; this.view.cy = start.cy + dy / this.view.s;
          this.follow = false; this.redraw(); this._changed();
          if (this.onPan) this.onPan();
        }
      }
    });
    const end = e => {
      this._pt.delete(e.pointerId);
      clearTimeout(lpTimer);
      if (this._pt.size < 2) pinch = null;
      if (this._pt.size === 0) {
        if (start && !moved) {
          const now = Date.now();
          if (now - lastTap < 300) { this.zoom(2, ...start.p); lastTap = 0; }
          else { lastTap = now; const p = start.p; setTimeout(() => { if (lastTap === now && this.onTap) this.onTap(this.s2w(...p), p); }, 260); }
        }
        start = null;
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); this.zoom(e.deltaY < 0 ? 1.25 : 0.8, p[0], p[1]); this.follow = false; }, { passive: false });
  };

  // ---------- Εύρεση κοντινότερου (snap) ----------
  // επιστρέφει {kind:'point'|'vertex'|'line', E,N,Z, ref, ent, d}
  MapView.prototype.snap = function (sx, sy, opts) {
    opts = opts || {};
    const tol = (opts.tol || 26);
    let best = null;
    const test = (E, N, kind, ref, extra) => {
      const [x, y] = this.w2s(E, N); const d = Math.hypot(x - sx, y - sy);
      if (d < tol && (!best || d < best.d - (kind === 'line' ? 6 : 0))) best = Object.assign({ kind, E, N, d, ref }, extra || {});
    };
    this.layers.points.forEach(p => test(p.E, p.N, 'point', p, { Z: p.Z }));
    const D = this.layers.design;
    if (D && !opts.pointsOnly) {
      for (const e of D.ents) {
        const ly = this.designLayers[e.layer]; if (ly && ly.on === false) continue;
        if (e.t === 'P') test(e.E, e.N, 'vertex', null, { Z: e.Z, ent: e });
        else if (e.t === 'L') {
          (e.verts || [e.pts[0], e.pts[e.pts.length - 1]]).forEach(v => test(v.E, v.N, 'vertex', null, { Z: v.Z, ent: e }));
          if (e.center) test(e.center.E, e.center.N, 'vertex', null, { ent: e, Z: e.pts[0].Z });
        }
      }
      if (!best || opts.line) {
        // κοντινότερη γραμμή
        const w = this.s2w(sx, sy);
        let bl = null;
        for (const e of D.ents) {
          if (e.t !== 'L') continue;
          const ly = this.designLayers[e.layer]; if (ly && ly.on === false) continue;
          const pts = e.closed ? e.pts.concat([e.pts[0]]) : e.pts;
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const dx = b.E - a.E, dy = b.N - a.N, L2 = dx * dx + dy * dy; if (!L2) continue;
            const t = Math.max(0, Math.min(1, ((w.E - a.E) * dx + (w.N - a.N) * dy) / L2));
            const d = Math.hypot(w.E - a.E - t * dx, w.N - a.N - t * dy) * this.view.s;
            if (d < tol && (!bl || d < bl.d)) bl = { kind: 'line', E: a.E + t * dx, N: a.N + t * dy, d, ent: e, seg: i };
          }
        }
        if (bl && (opts.line || !best)) best = bl;
      }
    }
    return best;
  };

  // ---------- ΚΑΕΚ (ζωντανά από τη γεωπύλη, μόνο ΕΓΣΑ87) ----------
  MapView.prototype.loadKaek = async function (toEgsa) {
    if (!this.overlays.hexis_kaek) return;
    const z = this.tileZoom();
    if (z < OVERLAYS.hexis_kaek.min) { this.kaekMsg = 'Μεγέθυνε για ΚΑΕΚ'; this.redraw(); return; }
    const a = this.s2w(0, this.h), b = this.s2w(this.w, 0);
    const A = toEgsa(a), B = toEgsa(b);
    if (!A || !B) return;
    const env = [Math.min(A.E, B.E), Math.min(A.N, B.N), Math.max(A.E, B.E), Math.max(A.N, B.N)].map(v => v.toFixed(1)).join(',');
    if (env === this._kaekEnv) return;
    this._kaekEnv = env;
    const qs = { f: 'json', inSR: '2100', outSR: '2100', outFields: 'KAEK', returnGeometry: 'true', spatialRel: 'esriSpatialRelIntersects', where: '1=1', geometry: env, geometryType: 'esriGeometryEnvelope', resultRecordCount: '1500' };
    const url = KT_LIVE_URL + '?' + Object.entries(qs).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    try {
      const r = await fetch(url); const j = await r.json();
      this.layers.kaek = ((j && j.features) || []).map(f => ({ kaek: (f.attributes || {}).KAEK, rings: (f.geometry && f.geometry.rings) || [] }));
      this.kaekEgsa = true; this.kaekMsg = '';
    } catch (e) { this.kaekMsg = 'ΚΑΕΚ: χωρίς σύνδεση'; }
    this.redraw();
  };

  MapView.prototype.tileZoom = function () {
    // μέτρα/pixel -> zoom Web Mercator (~ στο γεωγρ. πλάτος της θέσης)
    const lat = this._lat || 38.5;
    const mpp = 1 / this.view.s;
    return Math.max(0, Math.min(22, Math.round(Math.log2(156543.03 * Math.cos(lat * D2R) / mpp))));
  };

  // ---------- Σχεδίαση ----------
  MapView.prototype._draw = function () {
    const x = this.x, dpr = this.dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    x.fillStyle = css.getPropertyValue('--map-bg') || '#eef2f5';
    x.fillRect(0, 0, this.w, this.h);
    if (this.toLL) {
      this._drawTiles(BASEMAPS[this.base]);
      if (this.overlays.esri_labels) this._drawTiles(OVERLAYS.esri_labels);
      if (this.overlays.kt_wms) this._drawTiles(OVERLAYS.kt_wms);
    }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const onImg = this.base !== 'none' && BASEMAPS[this.base] && (BASEMAPS[this.base].url || BASEMAPS[this.base].google) && /sat/.test(this.base);
    this._drawGrid(onImg);
    if (this.overlays.hexis_kaek) this._drawKaek(onImg);
    this._drawDesign(onImg);
    this._drawLines();
    this._drawPoints(onImg);
    this._drawMeasure();
    this._drawTarget();
    this._drawPos();
    this._drawScale(onImg);
  };

  MapView.prototype._drawTiles = function (L) {
    if (!L || (!L.url && !L.wms && !L.google)) return;
    const z0 = this.tileZoom();
    if (L.min && z0 < L.min) return;
    const z = Math.min(z0, L.max || 19);
    const x = this.x, dpr = this.dpr;
    // όρια οθόνης σε lat/lon
    const corners = [[0, 0], [this.w, 0], [0, this.h], [this.w, this.h]].map(p => { const w = this.s2w(p[0], p[1]); return this.toLL(w.E, w.N); });
    if (corners.some(c => !c || !isFinite(c.lat))) return;
    this._lat = corners[0].lat;
    let tx0 = Infinity, tx1 = -Infinity, ty0 = Infinity, ty1 = -Infinity;
    corners.forEach(c => { const tx = lon2x(c.lon, z), ty = lat2y(c.lat, z); tx0 = Math.min(tx0, tx); tx1 = Math.max(tx1, tx); ty0 = Math.min(ty0, ty); ty1 = Math.max(ty1, ty); });
    tx0 = Math.floor(tx0); ty0 = Math.floor(ty0); tx1 = Math.floor(tx1); ty1 = Math.floor(ty1);
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 120) return;
    const redraw = () => this.redraw();
    for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
      const url = tileUrl(L, z, tx, ty); if (!url) continue;
      const t = getTile(url, redraw);
      if (!t.ok) continue;
      // τρεις γωνίες του πλακιδίου -> οθόνη (affine)
      const p0 = this._ll2s(y2lat(ty, z), x2lon(tx, z));
      const p1 = this._ll2s(y2lat(ty, z), x2lon(tx + 1, z));
      const p2 = this._ll2s(y2lat(ty + 1, z), x2lon(tx, z));
      const a = (p1[0] - p0[0]) / 256, b = (p1[1] - p0[1]) / 256, c = (p2[0] - p0[0]) / 256, d = (p2[1] - p0[1]) / 256;
      x.setTransform(a * dpr, b * dpr, c * dpr, d * dpr, p0[0] * dpr, p0[1] * dpr);
      x.drawImage(t.img, 0, 0, 256.6, 256.6);
    }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  MapView.prototype._ll2s = function (lat, lon) { const g = this.toGrid(lat, lon); return this.w2s(g.E, g.N); };

  MapView.prototype._drawGrid = function (onImg) {
    if (this.base !== 'none') return;
    const x = this.x;
    const step = niceStep(80 / this.view.s);
    const a = this.s2w(0, this.h), b = this.s2w(this.w, 0);
    x.strokeStyle = this.dark ? 'rgba(255,255,255,0.06)' : 'rgba(20,40,60,0.05)'; x.lineWidth = 1;
    x.beginPath();
    for (let E = Math.floor(a.E / step) * step; E <= b.E; E += step) { const s = this.w2s(E, 0)[0]; x.moveTo(s, 0); x.lineTo(s, this.h); }
    for (let N = Math.floor(a.N / step) * step; N <= b.N; N += step) { const s = this.w2s(0, N)[1]; x.moveTo(0, s); x.lineTo(this.w, s); }
    x.stroke();
  };

  MapView.prototype._drawKaek = function (onImg) {
    const x = this.x;
    if (!this.layers.kaek.length) return;
    const toS = (E, N) => this.kaekToScreen(E, N);
    x.lineWidth = 1.6; x.strokeStyle = onImg ? '#ffd400' : '#b8860b';
    x.font = `600 ${Math.round(13 * (this.fontScale || 1))}px Manrope,system-ui,sans-serif`; x.textAlign = 'center';
    for (const f of this.layers.kaek) {
      x.beginPath();
      let sx = 0, sy = 0, n = 0;
      f.rings.forEach(r => r.forEach((p, i) => { const s = toS(p[0], p[1]); if (i) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); sx += s[0]; sy += s[1]; n++; }));
      x.stroke();
      if (this.view.s > 0.6 && f.kaek && n) {
        const tx = sx / n, ty = sy / n;
        x.lineWidth = 3; x.strokeStyle = onImg ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'; x.strokeText(f.kaek, tx, ty);
        x.fillStyle = onImg ? '#ffe66b' : '#7a5600'; x.fillText(f.kaek, tx, ty);
        x.lineWidth = 1.6; x.strokeStyle = onImg ? '#ffd400' : '#b8860b';
      }
    }
    x.textAlign = 'left';
  };

  MapView.prototype._drawDesign = function (onImg) {
    const D = this.layers.design; if (!D) return;
    const x = this.x;
    const a = this.s2w(-50, this.h + 50), b = this.s2w(this.w + 50, -50);
    const inView = p => p.E >= a.E && p.E <= b.E && p.N >= a.N && p.N <= b.N;
    x.lineWidth = 1.3;
    const def = onImg ? '#ffffff' : (this.dark ? '#e8eef5' : '#1b2733');
    const col = e => {
      let c = e.color || (D.layers[e.layer] && D.layers[e.layer].color) || def;
      if (c === '#ffffff' && !onImg && !this.dark) c = '#1b2733';
      if (c === '#000000' && (onImg || this.dark)) c = '#ffffff';
      if (c === '#ffff00' && !onImg && !this.dark) c = '#a08800';
      return c;
    };
    for (const e of D.ents) {
      const ly = this.designLayers[e.layer]; if (ly && ly.on === false) continue;
      if (e.t === 'L') {
        // γρήγορος έλεγχος ορίων
        let vis = false; for (let i = 0; i < e.pts.length; i += Math.max(1, (e.pts.length / 8) | 0)) if (inView(e.pts[i])) { vis = true; break; }
        if (!vis && e.pts.length > 1) { const p = e.pts[0], q = e.pts[e.pts.length - 1]; if (!(Math.max(p.E, q.E) < a.E || Math.min(p.E, q.E) > b.E || Math.max(p.N, q.N) < a.N || Math.min(p.N, q.N) > b.N)) vis = true; }
        if (!vis) continue;
        x.strokeStyle = col(e);
        x.beginPath();
        e.pts.forEach((p, i) => { const s = this.w2s(p.E, p.N); if (i) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); });
        if (e.closed) x.closePath();
        x.stroke();
      } else if (e.t === 'P') {
        if (!inView(e)) continue;
        const s = this.w2s(e.E, e.N); x.fillStyle = col(e); x.fillRect(s[0] - 2, s[1] - 2, 4, 4);
      } else if (e.t === 'T') {
        if (!inView(e)) continue;
        const px = e.h * this.view.s; if (px < 5) continue;
        const s = this.w2s(e.E, e.N);
        x.save(); x.translate(s[0], s[1]); x.rotate(-(e.rot || 0) * D2R);
        x.fillStyle = col(e); x.font = `${Math.min(px, 60)}px Manrope,system-ui,sans-serif`; x.fillText(e.text, 0, 0); x.restore();
      }
    }
  };

  MapView.prototype._drawLines = function () {
    const x = this.x;
    x.lineWidth = 2; x.strokeStyle = '#1e6fd9';
    this.layers.lines.forEach(l => {
      if (l.pts.length < 2) return;
      x.beginPath(); l.pts.forEach((p, i) => { const s = this.w2s(p.E, p.N); if (i) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); });
      if (l.closed) x.closePath(); x.stroke();
    });
    if (this.layers.targetLine) {
      x.lineWidth = 4; x.strokeStyle = 'rgba(232,48,90,0.85)';
      x.beginPath(); this.layers.targetLine.forEach((p, i) => { const s = this.w2s(p.E, p.N); if (i) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); }); x.stroke();
    }
  };

  MapView.prototype._drawPoints = function (onImg) {
    const x = this.x;
    const showLbl = this.view.s > 4;
    const fg = onImg ? '#ffffff' : (this.dark ? '#e8eef5' : '#14202c');
    const halo = onImg ? 'rgba(0,0,0,0.75)' : (this.dark ? 'rgba(10,16,24,0.85)' : 'rgba(255,255,255,0.9)');
    x.font = `600 ${Math.round(15 * (this.fontScale || 1))}px Manrope,system-ui,sans-serif`;
    for (const p of this.layers.points) {
      if (p.E == null) continue;
      const [sx, sy] = this.w2s(p.E, p.N);
      if (sx < -20 || sy < -20 || sx > this.w + 20 || sy > this.h + 20) continue;
      x.lineWidth = 2;
      if (p.type === 'stake') { // στόχος χάραξης: σταυρός μέσα σε κύκλο
        x.strokeStyle = p.done ? '#14a44d' : '#e8305a';
        x.beginPath(); x.arc(sx, sy, 6, 0, 7); x.moveTo(sx - 9, sy); x.lineTo(sx + 9, sy); x.moveTo(sx, sy - 9); x.lineTo(sx, sy + 9); x.stroke();
      } else if (p.type === 'staked') {
        x.fillStyle = '#14a44d'; x.beginPath(); x.moveTo(sx, sy - 7); x.lineTo(sx + 6, sy + 5); x.lineTo(sx - 6, sy + 5); x.closePath(); x.fill();
        x.strokeStyle = halo; x.lineWidth = 1; x.stroke();
      } else if (p.type === 'calc') {
        x.strokeStyle = '#8a3ffc'; x.lineWidth = 2; x.strokeRect(sx - 5, sy - 5, 10, 10);
      } else if (p.type === 'control') {
        x.strokeStyle = '#d97706'; x.lineWidth = 2; x.beginPath(); x.moveTo(sx, sy - 8); x.lineTo(sx + 7, sy + 5); x.lineTo(sx - 7, sy + 5); x.closePath(); x.stroke();
      } else {
        x.fillStyle = '#1e6fd9'; x.beginPath(); x.arc(sx, sy, 5, 0, 7); x.fill();
        x.strokeStyle = halo; x.lineWidth = 1.5; x.stroke();
      }
      if (p.photos && p.photos.length) { x.fillStyle = '#f59e0b'; x.beginPath(); x.arc(sx + 7, sy - 7, 3, 0, 7); x.fill(); }
      if (showLbl) {
        const t = p.name + (this.view.s > 15 && p.Z != null ? '  ' + p.Z.toFixed(2) : '');
        x.lineWidth = 3; x.strokeStyle = halo; x.strokeText(t, sx + 10, sy - 7); x.fillStyle = fg; x.fillText(t, sx + 10, sy - 7);
      }
    }
  };

  MapView.prototype._drawMeasure = function () {
    const m = this.layers.measure; if (!m.length) return;
    const x = this.x;
    x.strokeStyle = '#ff7a00'; x.lineWidth = 2.5; x.setLineDash([8, 5]);
    x.beginPath(); m.forEach((p, i) => { const s = this.w2s(p.E, p.N); if (i) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); }); x.stroke(); x.setLineDash([]);
    m.forEach(p => { const s = this.w2s(p.E, p.N); x.fillStyle = '#ff7a00'; x.beginPath(); x.arc(s[0], s[1], 4, 0, 7); x.fill(); });
  };

  MapView.prototype._drawTarget = function () {
    const t = this.layers.target, P = this.layers.pos; if (!t) return;
    const x = this.x;
    const [sx, sy] = this.w2s(t.E, t.N);
    if (P) {
      const [px, py] = this.w2s(P.E, P.N);
      x.strokeStyle = 'rgba(232,48,90,0.9)'; x.lineWidth = 2; x.setLineDash([6, 6]);
      x.beginPath(); x.moveTo(px, py); x.lineTo(sx, sy); x.stroke(); x.setLineDash([]);
    }
    x.strokeStyle = '#e8305a'; x.lineWidth = 3;
    x.beginPath(); x.arc(sx, sy, 14, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(sx - 22, sy); x.lineTo(sx - 6, sy); x.moveTo(sx + 6, sy); x.lineTo(sx + 22, sy); x.moveTo(sx, sy - 22); x.lineTo(sx, sy - 6); x.moveTo(sx, sy + 6); x.lineTo(sx, sy + 22); x.stroke();
    if (t.tol) { x.strokeStyle = 'rgba(20,164,77,0.8)'; x.lineWidth = 1.5; x.beginPath(); x.arc(sx, sy, Math.max(2, t.tol * this.view.s), 0, 7); x.stroke(); }
  };

  MapView.prototype._drawPos = function () {
    const P = this.layers.pos; if (!P) return;
    const x = this.x;
    const [sx, sy] = this.w2s(P.E, P.N);
    const col = { fix: '#14a44d', float: '#f59e0b', dgps: '#e8305a', single: '#e8305a' }[P.fix] || '#7b8794';
    if (P.acc) { x.fillStyle = col + '22'; x.beginPath(); x.arc(sx, sy, Math.max(0, P.acc * this.view.s), 0, 7); x.fill(); }
    if (P.heading != null) {
      x.save(); x.translate(sx, sy); x.rotate(P.heading * D2R);
      x.fillStyle = col; x.beginPath(); x.moveTo(0, -20); x.lineTo(8, -6); x.lineTo(-8, -6); x.closePath(); x.fill(); x.restore();
    }
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, 9, 0, 7); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(sx, sy, 6.5, 0, 7); x.fill();
  };

  MapView.prototype._drawScale = function (onImg) {
    const x = this.x;
    const m = niceStep(100 / this.view.s), px = m * this.view.s;
    const X = 12, Y = this.h - 14;
    x.fillStyle = onImg ? 'rgba(0,0,0,0.55)' : (this.dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)');
    x.fillRect(X - 6, Y - 20, px + 60, 26);
    x.strokeStyle = onImg || this.dark ? '#fff' : '#14202c'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(X, Y - 6); x.lineTo(X, Y); x.lineTo(X + px, Y); x.lineTo(X + px, Y - 6); x.stroke();
    x.fillStyle = x.strokeStyle; x.font = '700 14px Manrope,system-ui,sans-serif';
    x.fillText(m >= 1000 ? (m / 1000) + ' km' : (m >= 1 ? m + ' m' : (m * 100).toFixed(0) + ' cm'), X + px + 6, Y - 2);
    const L = BASEMAPS[this.base];
    if (L && L.attr) { x.font = '10px Manrope,system-ui,sans-serif'; const t = '© ' + L.attr; const w = x.measureText(t).width; x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(this.w - w - 10, this.h - 16, w + 8, 14); x.fillStyle = '#333'; x.fillText(t, this.w - w - 6, this.h - 5); }
    if (this.kaekMsg && this.overlays.hexis_kaek) { x.font = '700 14px Manrope,system-ui'; x.fillStyle = '#7a5600'; x.fillText(this.kaekMsg, X, Y - 28); }
  };

  function niceStep(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p; }

  g.HMAP = { MapView, BASEMAPS, OVERLAYS };
})(window);
