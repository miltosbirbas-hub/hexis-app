/**
 * HEXIS — Υπενθύμιση λήξης δωρεάν δοκιμής
 * Google Apps Script στον λογαριασμό miltos.birbas@gmail.com
 *
 * Κάθε μέρα (~10:00) βρίσκει όσους έχουν ≤3 ημέρες ως τη λήξη του δωρεάν
 * και τους στέλνει email από το Gmail σου. Οι απαντήσεις έρχονται στο inbox.
 * Κάθε χρήστης παίρνει το email μία φορά.
 *
 * ΡΥΘΜΙΣΗ (μία φορά):
 *  1. Βάλε το κλειδί στο KEY παρακάτω (το βρίσκεις στο Supabase → SQL Editor:
 *     select value from public.app_secrets where name = 'trial_reminder';)
 *  2. Επίλεξε τη συνάρτηση sendTest → Run (θα ζητήσει άδεια Gmail — Allow).
 *     Σου έρχεται ένα δείγμα στο δικό σου email.
 *  3. Επίλεξε τη συνάρτηση install → Run. Από εκεί και πέρα τρέχει μόνο του.
 */

const KEY = 'ΒΑΛΕ_ΕΔΩ_ΤΟ_ΚΛΕΙΔΙ';

const SB_URL   = 'https://oucqqudfdimccgowvpqp.supabase.co';
const APP_URL  = 'https://hexis-app.gr/hub.html';
const SENDER   = 'HEXIS — Μίλτος Μπίρμπας';

// Το δημόσιο anon key διαβάζεται από τη σελίδα του HEXIS, ώστε να μένει πάντα σε συγχρονισμό.
function anonKey_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('sb_anon');
  if (hit) return hit;
  const html = UrlFetchApp.fetch('https://hexis-app.gr/admin.html').getContentText();
  const m = html.match(/SB_KEY\s*=\s*'([^']+)'/);
  if (!m) throw new Error('Δεν βρέθηκε το SB_KEY στο admin.html');
  cache.put('sb_anon', m[1], 6 * 3600);
  return m[1];
}

function rpc_(fn, payload) {
  const k = anonKey_();
  const r = UrlFetchApp.fetch(SB_URL + '/rest/v1/rpc/' + fn, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: k, Authorization: 'Bearer ' + k },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error(fn + ': ' + r.getResponseCode() + ' ' + r.getContentText());
  const t = r.getContentText();
  return t ? JSON.parse(t) : null;
}

function firstName_(full) {
  let f = String(full || '').trim().split(/\s+/)[0] || '';
  if (f.length < 2) return '';
  // ΚΕΦΑΛΑΙΑ → Πρώτο κεφαλαίο
  if (f === f.toUpperCase() && f.length > 1) f = f.charAt(0) + f.slice(1).toLowerCase().replace(/σ$/, 'ς');
  // Ελληνική κλητική: Γιάννης → Γιάννη, Θανάσης → Θανάση, Λουκάς → Λουκά, Σπύρος → Σπύρο, Βασίλειος → Βασίλειε
  if (/[α-ωάέήίόύώ]$/i.test(f.slice(0, -1)) || /ς$/.test(f)) {
    if (/ειος$/.test(f)) return f.replace(/ος$/, 'ε');
    if (/[ηήαάοό]ς$/.test(f)) return f.slice(0, -1);
  }
  return f;
}

function fmtDate_(iso) {
  return Utilities.formatDate(new Date(iso), 'Europe/Athens', 'dd/MM/yyyy');
}

function buildEmail_(u) {
  const name = firstName_(u.full_name);
  const hello = name ? 'Γεια σου ' + name + ',' : 'Γεια σου,';
  const days = u.days_left === 1 ? '1 ημέρα' : u.days_left + ' ημέρες';
  const date = fmtDate_(u.trial_ends_at);
  const subject = 'Πώς σου φάνηκε το HEXIS; — η δωρεάν δοκιμή λήγει σε ' + days;

  const text =
    hello + '\n\n' +
    'Η δωρεάν δοκιμή σου στο HEXIS λήγει σε ' + days + ' (' + date + ').\n\n' +
    'Θα ήθελα πολύ να μάθω:\n' +
    '• Πώς σου φάνηκε η εφαρμογή;\n' +
    '• Χρειάζεσαι κάποια βοήθεια — στο στήσιμο ενός έργου, στις αναφορές ή σε κάποιο εργαλείο;\n' +
    '• Σκέφτεσαι να τη συνεχίσεις; Αν ναι, για ποιους λόγους — κι αν όχι, τι σου έλειψε;\n\n' +
    'Απλώς απάντησε σε αυτό το email, το διαβάζω προσωπικά.\n\n' +
    'Συνέχεια στο HEXIS: ' + APP_URL + '\n\n' +
    'Μίλτος Μπίρμπας\nΠολιτικός Μηχανικός Τ.Ε., MSc — HEXIS-APP\nhexis-app.gr\npowered by BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε.';

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1F2836;max-width:560px">' +
    '<p>' + hello + '</p>' +
    '<p>Η δωρεάν δοκιμή σου στο <b>HEXIS</b> λήγει σε <b>' + days + '</b> (' + date + ').</p>' +
    '<p>Θα ήθελα πολύ να μάθω:</p>' +
    '<ul style="padding-left:20px;margin:0 0 14px">' +
    '<li>Πώς σου φάνηκε η εφαρμογή;</li>' +
    '<li>Χρειάζεσαι κάποια βοήθεια — στο στήσιμο ενός έργου, στις αναφορές ή σε κάποιο εργαλείο;</li>' +
    '<li>Σκέφτεσαι να τη συνεχίσεις; Αν ναι, για ποιους λόγους — κι αν όχι, τι σου έλειψε;</li>' +
    '</ul>' +
    '<p>Απλώς απάντησε σε αυτό το email, το διαβάζω προσωπικά.</p>' +
    '<p style="margin:22px 0"><a href="' + APP_URL + '" style="background:#F26B21;color:#fff;padding:11px 20px;border-radius:9px;text-decoration:none;font-weight:bold">Συνέχεια στο HEXIS →</a></p>' +
    '<p style="color:#5B6675;font-size:13.5px"><b style="color:#1F2836">Μίλτος Μπίρμπας</b><br>Πολιτικός Μηχανικός Τ.Ε., MSc — HEXIS-APP<br><a href="https://hexis-app.gr" style="color:#E05A12">hexis-app.gr</a><br><span style="font-size:11px;color:#98A1AE;white-space:nowrap">powered by BRB&nbsp;Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ&nbsp;ΜΟΝ.&nbsp;Ι.Κ.Ε.</span></p>' +
    '</div>';

  return { subject: subject, text: text, html: html };
}

/** Τρέχει καθημερινά από το trigger. */
function sendTrialReminders() {
  const due = rpc_('trial_reminders_due', { key: KEY }) || [];
  let sent = 0;
  due.forEach(function (u) {
    try {
      const m = buildEmail_(u);
      GmailApp.sendEmail(u.email, m.subject, m.text, { htmlBody: m.html, name: SENDER });
      rpc_('trial_reminder_mark', { key: KEY, target: u.user_id });
      sent++;
      Utilities.sleep(1500);
    } catch (e) {
      console.error('Αποτυχία για ' + u.email + ': ' + e);
    }
  });
  console.log('Υπενθυμίσεις: ' + sent + ' / ' + due.length);
}

/** Στέλνει ένα δείγμα στον εαυτό σου (δεν αγγίζει χρήστες). */
function sendTest() {
  const me = Session.getActiveUser().getEmail();
  const ends = new Date(Date.now() + 3 * 864e5).toISOString();
  const m = buildEmail_({ full_name: 'Μίλτος Μπίρμπας', days_left: 3, trial_ends_at: ends });
  GmailApp.sendEmail(me, '[ΔΟΚΙΜΗ] ' + m.subject, m.text, { htmlBody: m.html, name: SENDER });
  // έλεγχος ότι το κλειδί δουλεύει
  const due = rpc_('trial_reminders_due', { key: KEY }) || [];
  console.log('Δείγμα στάλθηκε στο ' + me + '. Χρήστες που θα πάρουν email στην επόμενη εκτέλεση: ' + due.length);
}

/** Εγκατάσταση καθημερινού trigger (~10:00 ώρα Ελλάδας). */
function install() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'sendTrialReminders'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendTrialReminders').timeBased().everyDays(1).atHour(10).inTimezone('Europe/Athens').create();
  console.log('Εγκαταστάθηκε: καθημερινά ~10:00');
}
