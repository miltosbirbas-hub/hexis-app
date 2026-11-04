// HEXIS PAD — αποθήκευση (IndexedDB), εισαγωγή/εξαγωγή αρχείων, ZIP, κοινή χρήση/email
(function (g) {
  'use strict';

  // ---------- IndexedDB ----------
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('hexis-pad', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('kv');
        d.createObjectStore('photos');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  const kvGet = k => tx('kv', 'readonly', s => s.get(k));
  const kvSet = (k, v) => tx('kv', 'readwrite', s => s.put(v, k));
  const kvDel = k => tx('kv', 'readwrite', s => s.delete(k));
  const photoGet = k => tx('photos', 'readonly', s => s.get(k));
  const photoSet = (k, v) => tx('photos', 'readwrite', s => s.put(v, k));
  const photoDel = k => tx('photos', 'readwrite', s => s.delete(k));

  // ---------- Εισαγωγή TXT/CSV σημείων ----------
  // Αναγνωρίζει διαχωριστικό (, ; tab κενά) και σειρά στηλών: Όνομα,X,Y,Z,Κωδικός  ή  X,Y,Z  ή Όνομα,Y,X,Z (order='PNEZ')
  function parsePoints(text, order) {
    const rows = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(l => l && !/^[#;]/.test(l));
    if (!rows.length) return [];
    const split = l => {
      if (l.includes('\t')) return l.split('\t').map(x => x.trim());
      if (l.includes(';')) return l.split(';').map(x => x.trim());
      if (l.includes(',')) { const c = l.split(',').map(x => x.trim()); if (c.length >= 3) return c; }
      return l.split(/\s+/);
    };
    const isNum = v => v !== undefined && v !== '' && !isNaN(parseFloat(String(v).replace(',', '.'))) && /^-?\d+([.,]\d+)?$/.test(String(v));
    const N = v => parseFloat(String(v).replace(',', '.'));
    const out = [];
    rows.forEach((l, idx) => {
      const c = split(l);
      if (c.length < 2) return;
      let name, a, b, z, code;
      if (isNum(c[0]) && isNum(c[1]) && isNum(c[2]) && c.length >= 4 && isNum(c[3])) {
        // πιθανό: Αρ., X, Y, Z
        name = c[0]; a = c[1]; b = c[2]; z = c[3]; code = c.slice(4).join(' ');
      } else if (!isNum(c[0]) && isNum(c[1]) && isNum(c[2])) {
        name = c[0]; a = c[1]; b = c[2]; z = isNum(c[3]) ? c[3] : null; code = c.slice(isNum(c[3]) ? 4 : 3).join(' ');
      } else if (isNum(c[0]) && isNum(c[1]) && c.length <= 3) {
        name = 'P' + (idx + 1); a = c[0]; b = c[1]; z = isNum(c[2]) ? c[2] : null; code = '';
      } else if (isNum(c[0]) && isNum(c[1]) && isNum(c[2])) {
        name = c[0]; a = c[1]; b = c[2]; z = null; code = c.slice(3).join(' ');
      } else return; // επικεφαλίδα
      let E = N(a), Nn = N(b);
      if (order === 'PNEZ') { const t = E; E = Nn; Nn = t; }
      out.push({ name: String(name), E, N: Nn, Z: z != null ? N(z) : null, code: code || '' });
    });
    return out;
  }

  // ---------- Εξαγωγές ----------
  const f3 = v => v == null ? '' : v.toFixed(3);
  // συντεταγμένες: δεκαδικά από τις ρυθμίσεις (προεπιλογή 4)
  const DEC = () => { const d = g.APP && g.APP.settings && g.APP.settings.decimals; return d >= 2 && d <= 6 ? d : 4; };
  const fc = v => v == null ? '' : v.toFixed(DEC());
  function toTXT(points, sep) {
    sep = sep || ',';
    return points.map(p => [p.name, fc(p.E), fc(p.N), fc(p.Z), p.code || ''].join(sep)).join('\r\n') + '\r\n';
  }
  function toCSV(points) {
    const h = ['Name', 'X(E)', 'Y(N)', 'Z', 'Code', 'Type', 'Solution', 'HRMS', 'VRMS', 'PDOP', 'Sats', 'Age', 'AntennaH', 'Lat', 'Lon', 'EllH', 'Date', 'Time', 'dX', 'dY', 'dZ', 'Target', 'Photos', 'Note'];
    const q = v => { v = v == null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const rows = points.map(p => {
      const d = p.time ? new Date(p.time) : null;
      return [p.name, fc(p.E), fc(p.N), fc(p.Z), p.code, p.type, p.fix, f3(p.hrms), f3(p.vrms), p.pdop != null ? p.pdop.toFixed(1) : '', p.sats, p.age != null ? p.age.toFixed(1) : '', f3(p.antH),
        p.lat != null ? p.lat.toFixed(9) : '', p.lon != null ? p.lon.toFixed(9) : '', fc(p.ellH),
        d ? d.toLocaleDateString('el-GR') : '', d ? d.toLocaleTimeString('el-GR') : '',
        p.stake ? f3(p.stake.dE) : '', p.stake ? f3(p.stake.dN) : '', p.stake ? f3(p.stake.dZ) : '', p.stake ? p.stake.target : '',
        (p.photos || []).map((x, i) => photoName(p, i)).join(' '), p.note || ''].map(q).join(';');
    });
    return '﻿' + h.join(';') + '\r\n' + rows.join('\r\n') + '\r\n';
  }
  // Αναφορά χάραξης: στόχος ↔ χαραγμένο
  function stakeRows(st, tH, tV) {
    return st.map(p => {
      const s = p.stake, dh = s.dE != null ? Math.hypot(s.dE, s.dN) : null;
      return { p, s, dh, okH: dh == null || dh <= tH, okV: s.dZ == null || Math.abs(s.dZ) <= tV };
    });
  }
  function toStakeCSV(st, tH, tV) {
    const h = ['Στόχος', 'X στόχου', 'Y στόχου', 'Z στόχου', 'Χαραγμένο', 'X', 'Y', 'Z', 'ΔX', 'ΔY', 'ΔΟριζ', 'ΔZ', 'Εντός ανοχής', 'σH', 'σV', 'Λύση', 'Ημερομηνία', 'Ώρα'];
    const q = v => { v = v == null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '\ufeff' + h.join(';') + '\r\n' + stakeRows(st, tH, tV).map(({ p, s, dh, okH, okV }) => {
      const d = new Date(p.time);
      return [s.target, fc(s.tE), fc(s.tN), fc(s.tZ), p.name, fc(p.E), fc(p.N), fc(p.Z), f3(s.dE), f3(s.dN), f3(dh), f3(s.dZ), okH && okV ? 'ΝΑΙ' : 'ΟΧΙ', f3(p.hrms), f3(p.vrms), p.fix, d.toLocaleDateString('el-GR'), d.toLocaleTimeString('el-GR')].map(q).join(';');
    }).join('\r\n') + '\r\n';
  }
  function toStakeTXT(st, tH, tV, proj, crs) {
    const pad = (v, n) => String(v == null ? '' : v).padEnd(n), pl = (v, n) => String(v == null ? '' : v).padStart(n);
    const rows = stakeRows(st, tH, tV);
    let t = `ΑΡΧΕΙΟ ΕΠΙΒΕΒΑΙΩΣΗΣ ΧΑΡΑΞΗΣ — HEXIS PAD\r\nΈργο: ${proj}\r\nΣύστημα: ${crs}\r\nΑνοχή: οριζ. ${tH.toFixed(3)} m · κατακ. ${tV.toFixed(3)} m\r\nΗμερομηνία: ${new Date().toLocaleString('el-GR')}\r\n\r\n`;
    t += pad('Στόχος', 12) + pad('Χαραγμένο', 12) + pl('X', 13) + pl('Y', 14) + pl('Z', 9) + pl('ΔX', 8) + pl('ΔY', 8) + pl('ΔΟριζ', 8) + pl('ΔZ', 8) + '  Ανοχή\r\n' + '-'.repeat(100) + '\r\n';
    rows.forEach(({ p, s, dh, okH, okV }) => { t += pad(s.target, 12) + pad(p.name, 12) + pl(fc(p.E), 14) + pl(fc(p.N), 15) + pl(fc(p.Z), 10) + pl(f3(s.dE), 8) + pl(f3(s.dN), 8) + pl(f3(dh), 8) + pl(f3(s.dZ), 8) + '  ' + (okH && okV ? 'ΝΑΙ' : 'ΟΧΙ') + '\r\n'; });
    const ok = rows.filter(r => r.okH && r.okV).length;
    t += '-'.repeat(100) + `\r\nΣύνολο: ${rows.length} σημεία · εντός ανοχής: ${ok} · εκτός: ${rows.length - ok}\r\n`;
    return t;
  }
  function photoName(p, i) { return (p.name || 'P').replace(/[^\w\-Α-ω.]/g, '_') + (i ? '_' + (i + 1) : '') + '.jpg'; }
  function toKML(points, name) {
    const esc = s => String(s == null ? '' : s).replace(/[<&>]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const pm = points.filter(p => p.lat != null || p.E != null).map(p => {
      let lat = p.lat, lon = p.lon;
      if (lat == null) { const ll = HGEO.toLL(p.E, p.N); lat = ll.lat; lon = ll.lon; }
      return `<Placemark><name>${esc(p.name)}</name><description>${esc(p.code)} Z=${f3(p.Z)}</description><Point><coordinates>${lon.toFixed(9)},${lat.toFixed(9)},${(p.Z || 0).toFixed(DEC())}</coordinates></Point></Placemark>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>\n${pm}\n</Document></kml>\n`;
  }
  function toGeoJSON(points) {
    return JSON.stringify({
      type: 'FeatureCollection', features: points.map(p => {
        let lat = p.lat, lon = p.lon;
        if (lat == null && p.E != null) { const ll = HGEO.toLL(p.E, p.N); lat = ll.lat; lon = ll.lon; }
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat, p.Z] }, properties: { name: p.name, code: p.code, E: p.E, N: p.N, Z: p.Z, fix: p.fix, hrms: p.hrms, vrms: p.vrms, time: p.time } };
      })
    }, null, 1);
  }

  // ---------- ZIP (χωρίς συμπίεση — γρήγορο, για φωτογραφίες) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  async function makeZip(files) { // files: [{name, data: string|Uint8Array|Blob}]
    const enc = new TextEncoder();
    const parts = [], central = [];
    let off = 0;
    const now = new Date();
    const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    const dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    for (const f of files) {
      let data = f.data;
      if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
      else if (typeof data === 'string') data = enc.encode(data);
      const nm = enc.encode(f.name);
      const crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + data.length;
    }
    const csize = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }

  // ---------- Αποθήκευση / κοινή χρήση (email) ----------
  function isNative() { return !!(g.Capacitor && g.Capacitor.isNativePlatform && g.Capacitor.isNativePlatform()); }
  function blobToB64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
  }
  function asBlob(f) {
    if (f.data instanceof Blob) return f.data;
    return new Blob([f.data], { type: f.mime || 'text/plain;charset=utf-8' });
  }
  // files: [{name, data, mime}] — opts: {subject, text, email:true}
  async function share(files, opts) {
    opts = opts || {};
    if (isNative()) {
      const FS = g.Capacitor.Plugins.Filesystem, SH = g.Capacitor.Plugins.Share;
      const uris = [];
      for (const f of files) {
        const b64 = await blobToB64(asBlob(f));
        const r = await FS.writeFile({ path: 'export/' + f.name, data: b64, directory: 'CACHE', recursive: true });
        uris.push(r.uri);
      }
      await SH.share({ title: opts.subject || 'HEXIS PAD', text: opts.text || '', files: uris, dialogTitle: opts.email ? 'Αποστολή με email' : 'Κοινή χρήση' });
      return 'shared';
    }
    const fl = files.map(f => new File([asBlob(f)], f.name, { type: f.mime || 'application/octet-stream' }));
    if (navigator.canShare && navigator.canShare({ files: fl })) {
      try { await navigator.share({ files: fl, title: opts.subject || 'HEXIS PAD', text: opts.text || '' }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    fl.forEach(f => download(f, f.name));
    return 'downloaded';
  }
  async function saveToDevice(files) {
    if (isNative()) {
      const FS = g.Capacitor.Plugins.Filesystem;
      const out = [];
      for (const f of files) {
        const b64 = await blobToB64(asBlob(f));
        let r = null;
        for (const dir of ['DOCUMENTS', 'EXTERNAL']) {
          try { r = await FS.writeFile({ path: 'HEXIS PAD/' + f.name, data: b64, directory: dir, recursive: true }); break; } catch (e) { r = null; }
        }
        if (!r) throw new Error('Δεν επιτράπηκε αποθήκευση — χρησιμοποίησε «Κοινή χρήση»');
        out.push(r.uri);
      }
      return out;
    }
    files.forEach(f => download(asBlob(f), f.name));
    return files.map(f => f.name);
  }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // Συμπίεση φωτογραφίας (μέγ. 2048 px, JPEG 0.85) + υδατογράφημα σημείου
  async function processPhoto(file, stamp) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    const k = Math.min(1, 2048 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    if (stamp && stamp.length) {
      const fs = Math.max(14, Math.round(c.width / 45));
      x.font = `600 ${fs}px system-ui, sans-serif`;
      const pad = fs * 0.5, lh = fs * 1.3, h = stamp.length * lh + pad * 2;
      x.fillStyle = 'rgba(255,255,255,0.82)'; x.fillRect(0, c.height - h, c.width, h);
      x.fillStyle = '#10243a';
      stamp.forEach((t, i) => x.fillText(t, pad, c.height - h + pad + fs + i * lh));
    }
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
    const thumbC = document.createElement('canvas'); const tk = 160 / Math.max(c.width, c.height);
    thumbC.width = Math.round(c.width * tk); thumbC.height = Math.round(c.height * tk);
    thumbC.getContext('2d').drawImage(c, 0, 0, thumbC.width, thumbC.height);
    return { blob, thumb: thumbC.toDataURL('image/jpeg', 0.7) };
  }

  g.HIO = { toStakeCSV, toStakeTXT, kvGet, kvSet, kvDel, photoGet, photoSet, photoDel, parsePoints, toTXT, toCSV, toKML, toGeoJSON, makeZip, share, saveToDevice, download, processPhoto, photoName, isNative };
})(window);
