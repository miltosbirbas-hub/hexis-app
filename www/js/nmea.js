// HEXIS PAD — NMEA 0183 parser (GGA, RMC, GST, GSA, GSV, VTG, HDT) + laser ($PLTIT, generic)
(function (g) {
  'use strict';

  function checksumOk(line) {
    const star = line.lastIndexOf('*');
    if (star < 0) return true; // κάποιοι δέκτες δεν στέλνουν checksum
    const body = line.slice(1, star);
    const cs = parseInt(line.slice(star + 1, star + 3), 16);
    let x = 0;
    for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    return x === cs;
  }

  function dm2deg(v, hemi) {
    if (!v) return NaN;
    const f = parseFloat(v);
    const deg = Math.floor(f / 100);
    const d = deg + (f - deg * 100) / 60;
    return (hemi === 'S' || hemi === 'W') ? -d : d;
  }

  function num(v) { const f = parseFloat(v); return isNaN(f) ? null : f; }

  const FIX = {
    0: { key: 'none', label: 'NO FIX' },
    1: { key: 'single', label: 'SINGLE' },
    2: { key: 'dgps', label: 'DGPS' },
    3: { key: 'pps', label: 'PPS' },
    4: { key: 'fix', label: 'FIX' },
    5: { key: 'float', label: 'FLOAT' },
    6: { key: 'dr', label: 'DR' },
    7: { key: 'manual', label: 'MANUAL' },
    8: { key: 'sim', label: 'SIM' },
  };

  // Κατάσταση που ενημερώνεται από διαδοχικές προτάσεις
  function NmeaState() {
    this.reset();
  }
  NmeaState.prototype.reset = function () {
    this.lat = null; this.lon = null; this.alt = null; this.geoidSep = null;
    this.quality = 0; this.sats = 0; this.hdop = null; this.pdop = null; this.vdop = null;
    this.age = null; this.baseId = null; this.utc = null;
    this.sLat = null; this.sLon = null; this.sAlt = null; // σ από GST
    this.speed = null; this.course = null; this.heading = null;
    this.satsView = 0; this.lastGGA = null; this.lastGGATime = 0; this.count = 0;
  };

  // Επιστρέφει {type, ...} ή null
  NmeaState.prototype.feed = function (raw) {
    let line = (raw || '').trim();
    if (!line || line[0] !== '$') return null;
    if (!checksumOk(line)) return { type: 'bad' };
    const star = line.lastIndexOf('*');
    const f = (star > 0 ? line.slice(1, star) : line.slice(1)).split(',');
    const id = f[0];
    const t = id.length >= 5 ? id.slice(-3) : id;
    this.count++;
    if (id === 'PLTIT') return parseTruPulse(f);
    switch (t) {
      case 'GGA': {
        this.utc = f[1] || this.utc;
        this.lat = dm2deg(f[2], f[3]);
        this.lon = dm2deg(f[4], f[5]);
        this.quality = parseInt(f[6] || '0', 10) || 0;
        this.sats = parseInt(f[7] || '0', 10) || 0;
        this.hdop = num(f[8]);
        this.alt = num(f[9]);
        this.geoidSep = num(f[11]);
        this.age = num(f[13]);
        this.baseId = f[14] || null;
        if (isNaN(this.lat) || isNaN(this.lon)) { this.lat = this.lon = null; }
        this.lastGGA = line;
        this.lastGGATime = Date.now();
        return { type: 'GGA' };
      }
      case 'RMC': {
        if (f[2] === 'A') {
          this.speed = num(f[7]) !== null ? num(f[7]) * 0.514444 : null;
          this.course = num(f[8]);
        }
        return { type: 'RMC' };
      }
      case 'VTG': {
        const kmh = num(f[7]);
        if (kmh !== null) this.speed = kmh / 3.6;
        if (num(f[1]) !== null) this.course = num(f[1]);
        return { type: 'VTG' };
      }
      case 'GST': {
        this.sLat = num(f[6]); this.sLon = num(f[7]); this.sAlt = num(f[8]);
        return { type: 'GST' };
      }
      case 'GSA': {
        this.pdop = num(f[15]); this.hdop = num(f[16]) != null ? num(f[16]) : this.hdop; this.vdop = num(f[17]);
        return { type: 'GSA' };
      }
      case 'GSV': {
        if (f[2] === '1') this._gsvSum = this._gsvSum || {};
        const n = parseInt(f[3] || '0', 10) || 0;
        this._gsvSum = this._gsvSum || {};
        this._gsvSum[id.slice(0, 2)] = n;
        this.satsView = Object.values(this._gsvSum).reduce((a, b) => a + b, 0);
        return { type: 'GSV' };
      }
      case 'HDT': {
        this.heading = num(f[1]);
        return { type: 'HDT' };
      }
    }
    return { type: t };
  };

  NmeaState.prototype.fix = function () { return FIX[this.quality] || FIX[0]; };
  NmeaState.prototype.hrms = function () {
    if (this.sLat !== null && this.sLon !== null) return Math.sqrt(this.sLat * this.sLat + this.sLon * this.sLon);
    return null;
  };

  // TruPulse / laser: $PLTIT,HV,HD,F|M,AZ,D,INC,D,SD,F|M*cs
  function parseTruPulse(f) {
    if (f[1] !== 'HV') return { type: 'laser-other' };
    const unit = (f[3] || 'M').toUpperCase();
    const k = unit === 'F' ? 0.3048 : (unit === 'Y' ? 0.9144 : 1);
    const hd = num(f[2]);
    const az = num(f[4]);
    const inc = num(f[6]);
    const sd = num(f[8]);
    return {
      type: 'laser',
      hd: hd !== null ? hd * k : (sd !== null && inc !== null ? sd * k * Math.cos(inc * Math.PI / 180) : null),
      sd: sd !== null ? sd * k : null,
      az: az, inc: inc,
      vd: (sd !== null && inc !== null) ? sd * k * Math.sin(inc * Math.PI / 180) : null,
    };
  }

  // Γενικό laser (μη-NMEA γραμμές): ψάχνει "D=12.345" ή απλό αριθμό
  function parseGenericLaser(line) {
    const s = (line || '').trim();
    if (!s) return null;
    if (s[0] === '$') return null;
    const m = s.match(/(-?\d+(?:[.,]\d+)?)\s*(m|mm)?/i);
    if (!m) return null;
    let v = parseFloat(m[1].replace(',', '.'));
    if (m[2] && m[2].toLowerCase() === 'mm') v /= 1000;
    return { type: 'laser', sd: v, hd: v, az: null, inc: null, vd: null };
  }

  // Δημιουργία GGA (για NTRIP VRS όταν τρέχει προσομοιωτής ή GPS κινητού)
  function makeGGA(lat, lon, alt, quality, sats, hdop) {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    function dm(v, w) {
      const a = Math.abs(v); const d = Math.floor(a); const m = (a - d) * 60;
      return String(d).padStart(w, '0') + m.toFixed(6).padStart(9, '0');
    }
    const body = `GPGGA,${hh}${mm}${ss}.00,${dm(lat, 2)},${lat >= 0 ? 'N' : 'S'},${dm(lon, 3)},${lon >= 0 ? 'E' : 'W'},${quality},${String(sats).padStart(2, '0')},${(hdop || 1).toFixed(1)},${(alt || 0).toFixed(3)},M,0.000,M,,`;
    let x = 0; for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    return '$' + body + '*' + x.toString(16).toUpperCase().padStart(2, '0');
  }

  g.HNMEA = { NmeaState, FIX, makeGGA, parseGenericLaser, checksumOk, dm2deg };
})(window);
