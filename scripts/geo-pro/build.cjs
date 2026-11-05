#!/usr/bin/env node
// HEXIS GEOmetry Pro — χτίσιμο του κρυπτογραφημένου bundle για την Edge Function «geo-pro».
//
// Ο πηγαίος κώδικας του Pro (Τοπογραφικό + ΔΓΜ) ΔΕΝ μπαίνει σε αυτό το δημόσιο repo.
// Βρίσκεται στο ιδιωτικό repo miltosbirbas-hub/hexis-pad, φάκελος hexis-app-pro/geometry/.
//
// Χρήση:
//   npm i terser@5 tweetnacl@1.0.3   (σε οποιονδήποτε φάκελο· δώσε τον με GEO_DEPS=…/node_modules)
//   GEO_DEPS=/path/node_modules node scripts/geo-pro/build.cjs <φάκελος πηγής Pro> [geometry/pro-key.pub] [supabase/functions/geo-pro/bundle.ts]
//
// Βήματα: ενώνει τα *.js της πηγής με τη σειρά του ονόματος → συμπίεση/ανακάτεμα ονομάτων (terser)
// → κρυπτογράφηση NaCl box με εφήμερο κλειδί προς το δημόσιο κλειδί του server → base64 στο bundle.ts.
// Το ιδιωτικό κλειδί υπάρχει μόνο στο secret GEO_PRO_SK του Supabase.
'use strict';
const fs = require('fs'), path = require('path');
const dep = (n) => require(process.env.GEO_DEPS ? path.join(process.env.GEO_DEPS, n) : n);
const { minify } = dep('terser');
const nacl = dep('tweetnacl');

(async () => {
  const [src, pubFile = 'geometry/pro-key.pub', out = 'supabase/functions/geo-pro/bundle.ts'] = process.argv.slice(2);
  if (!src) { console.error('Δώσε τον φάκελο πηγής του Pro'); process.exit(1); }
  const files = fs.readdirSync(src).filter((f) => f.endsWith('.js')).sort();
  if (!files.length) { console.error('Δεν βρέθηκαν .js στον ' + src); process.exit(1); }
  const code = files.map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n;\n');
  const m = await minify(code, { ecma: 2018, compress: { passes: 2 }, mangle: { toplevel: false }, format: { comments: false, ascii_only: false } });
  if (!m.code) throw new Error('terser');
  // έλεγχος: τα δημόσια ονόματα που περιμένει η σελίδα πρέπει να υπάρχουν
  ['DGM', 'DgmPraxis', 'PraxisDescr', 'DgmSheet', 'TopoSheet', 'CmdCheck'].forEach((n) => {
    if (m.code.indexOf('.' + n + '=') < 0) throw new Error('Λείπει το ' + n + ' από το bundle');
  });
  if (process.env.GEO_PLAIN) fs.writeFileSync(process.env.GEO_PLAIN, m.code); // μόνο για τοπικό έλεγχο — ΠΟΤΕ στο repo
  const pk = Buffer.from(fs.readFileSync(pubFile, 'utf8').trim(), 'base64');
  if (pk.length !== 32) throw new Error('Λάθος δημόσιο κλειδί');
  const eph = nacl.box.keyPair(), nonce = nacl.randomBytes(24);
  const box = nacl.box(new TextEncoder().encode(m.code), nonce, new Uint8Array(pk), eph.secretKey);
  const all = Buffer.concat([Buffer.from(eph.publicKey), Buffer.from(nonce), Buffer.from(box)]);
  fs.writeFileSync(out,
    '// Κρυπτογραφημένος κώδικας HEXIS GEOmetry Pro (NaCl box: εφήμερο δημόσιο 32B | nonce 24B | κρυπτοκείμενο), base64.\n' +
    '// Παράγεται από το scripts/geo-pro/build.cjs — δεν γράφεται με το χέρι.\n' +
    'export const PRO = "' + all.toString('base64') + '";\n');
  console.log('OK: ' + files.join(', ') + ' → ' + out + ' (' + code.length + ' → ' + m.code.length + ' χαρ. → ' + all.length + ' bytes κρυπτογραφημένα)');
})().catch((e) => { console.error(e.message || e); process.exit(1); });
