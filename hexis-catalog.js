/* ============================================================
   HEXIS CATALOG — ΕΝΑ αρχείο για ΟΛΕΣ τις εφαρμογές
   ============================================================
   ΝΕΑ ΕΦΑΡΜΟΓΗ; Κάνε ΜΟΝΟ αυτά:
     1. Ανέβασε το νέο .html στο repo
     2. Πρόσθεσε ΕΝΑ αντικείμενο στο CATALOG παρακάτω
        (+ προαιρετικά icon στο ICONS — αλλιώς δείχνει το emoji)
     3. Bump VERSION στο sw.js και APP_VERSION στο app.html
   Το hub (tile), το tool.html (σελίδα ξεκλειδώματος), το admin
   (toggle ενεργοποίησης) και το sw.js (offline precache)
   ενημερώνονται ΑΥΤΟΜΑΤΑ από εδώ.

   Πεδία ανά εφαρμογή:
     id       μοναδικό αναγνωριστικό (και ?id= στο tool.html)
     mod      (προαιρετικό) όνομα module στο entitlements —
              default: ίδιο με id. Δύο εργαλεία με ίδιο mod
              πωλούνται ως πακέτο (π.χ. dxf + lisp).
     ico      emoji fallback
     name     όνομα στο hub tile & στο tool.html
     adminName (προαιρετικό) όνομα στο admin toggle αν διαφέρει
     desc     κείμενο στο hub tile
     href     αρχείο .html (ή πλήρες URL με external:true)
     external true = εξωτερικό link, δεν μπαίνει στο precache
     primary  true = η μεγάλη κάρτα (μόνο το app)
     price    π.χ. '20€ / έτος + ΦΠΑ'
     free     true = δωρεάν για κάθε συνδεδεμένο χρήστη (χωρίς entitlement)
     tagline  μία πρόταση στη σελίδα ξεκλειδώματος
     feats    4 bullets στη σελίδα ξεκλειδώματος
     note     (προαιρετικό) σημείωση πακέτου στη σελίδα ξεκλειδώματος
   ============================================================ */
(function (g) {
'use strict';

/* ============================================================
   ΕΚΔΟΣΗ — ΤΟ ΜΟΝΟ ΣΗΜΕΙΟ ΠΟΥ ΑΛΛΑΖΕΙΣ
   Το sw.js (importScripts) και το app.html τη διαβάζουν από εδώ.
   ΔΕΝ γράφεται πουθενά αλλού.
   ============================================================ */
var VERSION = 'v4.100';

var BRB_TERRAIN_URL = 'https://miltosbirbas-hub.github.io/BRB-contour-live/';

// Κατηγορίες του hub (σειρά εμφάνισης). Κάθε εργαλείο έχει cat:[…]· η πρώτη κατηγορία είναι η «κύρια».
var CATEGORIES = [
  { id:'site',   ico:'🏗️', name:'Εργοτάξιο & Επιθεώρηση', desc:'Κατασκευή, έλεγχος δόμησης, ποσότητες, στατικά στοιχεία' },
  { id:'nomos',  ico:'⚖️', name:'Νομοθεσία & Άδειες',      desc:'Πολεοδομικοί κανονισμοί, κόστος άδειας, έλεγχοι' },
  { id:'topo',   ico:'📐', name:'Τοπογραφία & CAD',        desc:'ΕΓΣΑ87, κτηματολόγιο, συντεταγμένες, DXF, μετρήσεις, GNSS' },
  { id:'energy', ico:'⚡', name:'Ενεργειακή Επιθεώρηση',   desc:'ΚΕΝΑΚ, ΠΕΑ, XML ΤΕΕ' },
  { id:'drone',  ico:'🛩️', name:'Drone',                    desc:'Σχεδιασμός πτήσης, φωτογραμμετρία, ορθοφωτοχάρτες' },
  { id:'slam',   ico:'☁️', name:'SLAM & Νέφη σημείων',     desc:'Σαρώσεις, νέφη σημείων, όγκοι, πάχη, as-built' },
  { id:'design', ico:'🛋️', name:'Σχέδιο & Διακόσμηση',     desc:'Κάτοψη σε 3D, επίπλωση, κουζίνες, υλικά, κουφώματα, επιμέτρηση' }
];

var CATALOG = [
  { id:'app', primary:true, ico:'🏗️', name:'Διαχείριση Έργων',
    desc:'Εργοτάξια · ημερολόγιο · φωτογραφίες με pins · εντολές · αναφορές PDF · συνεργάτες',
    href:'app.html' },

  { id:'nomothesia', cat:['nomos'], ico:'⚖️', name:'Νομοθεσία',
    desc:'Κώδικας Ταγαρά 5306/26 · ΝΟΚ · Ν.4495 · Κτιριοδομικός + AI αναζήτηση',
    href:'nomothesia.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Όλη η πολεοδομική νομοθεσία σε ένα σημείο — με AI αναζήτηση που απαντάει σε φυσική γλώσσα.',
    feats:['Κώδικας Ταγαρά 5306/26','ΝΟΚ, Ν.4495/2017 και Κτιριοδομικός Κανονισμός','AI αναζήτηση: ρωτάς όπως θα ρωτούσες συνάδελφο','Παραπομπές σε άρθρα και διατάξεις'] },

  { id:'ktima', cat:['topo'], ico:'🗺️', name:"Κτηματολόγιο & ΕΓΣΑ'87",
    desc:'Χάρτης με συντεταγμένες · μετρήσεις · όρια κτηματολογίου',
    href:'ktimatologio.html', price:'50€ / έτος + ΦΠΑ',
    tagline:'Χάρτης με υπόβαθρο κτηματολογίου και συντεταγμένες ΕΓΣΑ΄87, στο χέρι σου.',
    feats:["Ζωντανές συντεταγμένες ΕΓΣΑ'87 σε κάθε σημείο",'Υπόβαθρο ορίων κτηματολογίου (WMS)','Μετρήσεις αποστάσεων και εμβαδών πάνω στον χάρτη','Ιδανικό για αυτοψίες και προέλεγχο ορίων'] },

  { id:'syntetagmenes', cat:['topo'], ico:'📍', name:'HEXIS GEOmetry',
    desc:'Συντεταγμένες ΕΓΣΑ\'87 από PDF/DXF · ΚΑΕΚ Κτηματολογίου στη θέση του οικοπέδου · Διαγράμματα Γεωμετρικών Μεταβολών (διόρθωση ορίων, κατάτμηση, συνένωση, ΧΑΧ)',
    href:'syntetagmenes.html', price:'35€ / έτος + ΦΠΑ',
    tagline:'Από το τοπογραφικό στους πίνακες συντεταγμένων, στα γεωτεμάχια ΚΑΕΚ και σε έτοιμο ΔΓΜ για την Ηλεκτρονική Υποβολή Διαγραμμάτων.',
    feats:['Εξαγωγή πινάκων οικοπέδου και κτιρίων από PDF ή DXF, με έλεγχο εμβαδού, πλευρών και γεωμετρίας','Όλο το σχέδιο σε επεξεργάσιμο DXF στο ΕΓΣΑ\'87 (πολυγραμμές με τόξα, κείμενα, layers)','Γεωτεμάχια ΚΑΕΚ της κτηματολογικής βάσης στη θέση του οικοπέδου και απάντηση στο «απαιτείται ΔΓΜ;»','ΔΓΜ διόρθωσης ορίων και εγγραπτέας πράξης (κατάτμηση, συνένωση, σύσταση/κατάργηση ΧΑΧ) κατά το Τεύχος Προδιαγραφών','DXF Πίνακα Ι που περνά το Check My DXF, πινακίδα σε ένα φύλλο με πίνακες, PDF, Excel, TXT','Περιγραφή ορίων για το συμβόλαιο, με όμορους από την πράξη και τα ΚΑΕΚ'] },

  { id:'paper2dxf', cat:['topo'], ico:'📜', name:'Paper → DXF',
    desc:'Παλιά σχέδια (PDF, JPG, TIFF) σε επεξεργάσιμο DXF · γραμμές, πολυγραμμές, τόξα · ελληνικά MTEXT · κλίμακα 1:1 · 3D extrude τοίχων',
    href:'paper2dxf.html', price:'10€ / έτος + ΦΠΑ',
    tagline:'Από το χαρτί στο CAD: κάθε σχέδιο του φύλλου γίνεται γεωμετρία σε πραγματικές διαστάσεις, με τα γράμματα σωστά ελληνικά.',
    feats:['Σαρωμένα και διανυσματικά PDF, JPG, PNG, TIFF: κατόψεις, τομές, όψεις, ξυλότυποι, τοπογραφικά, όλα σε ένα DXF','Τοίχοι ως κλειστές πολυγραμμές, πόρτες ως τόξα, κύκλοι, ίσιωμα οριζόντιων/κατακόρυφων, layers ανά πάχος και χρώμα πένας','Κείμενα σε MTEXT Arial με Unicode ελληνικά και OCR στον browser, με μικρογραφία για έλεγχο και διόρθωση','Κλίμακα 1:1 από κλίμακα και dpi, γνωστή απόσταση, χωριστά Χ/Υ ή 4+ σημεία ΕΓΣΑ\'87','Προβολή 3D με ύψος τοίχων (όπως EXTRUDE) και προαιρετικό thickness στο DXF','Ανοίγει σωστά σε AutoCAD και progeCAD (DXF R2000)'] },

  { id:'pdfdim', cat:['topo'], ico:'📏', name:'PDF Dim',
    desc:'Μετρήσεις σε σχέδια PDF · μήκη, εμβαδά, γωνίες, κύκλοι · αυτόματη κλίμακα & έλξη σε γραμμές · γεωαναφορά ΕΓΣΑ87 & ΚΑΕΚ · θέση GPS στο σχέδιο · PDF με διαστάσεις · σύνδεση με τα αρχεία του έργου',
    href:'pdfdim.html', price:'10€ / έτος + ΦΠΑ',
    tagline:'Ανοίγεις το PDF του σχεδίου και μετράς σε πραγματικά μεγέθη — με την κλίμακα να εντοπίζεται μόνη της και τον κέρσορα να κουμπώνει στις γραμμές.',
    feats:['Αναγνώριση γραμμών, τόξων και κύκλων του PDF: έλξη σε άκρο, μέσο, τομή, κέντρο, κάθετο','Αυτόματος εντοπισμός κλίμακας από το φύλλο και βαθμονόμηση με γνωστή απόσταση για σαρώσεις','Γεωαναφορά σε ΕΓΣΑ87: αυτόματα από τον πίνακα κορυφών, με σημεία ελέγχου, στον χάρτη ή στο γεωτεμάχιο ΚΑΕΚ — και η θέση σου (GPS) πάνω στο σχέδιο','PDF με τις διαστάσεις τυπωμένες πάνω στο σχέδιο, στιγμιότυπα, DXF 1:1 / CSV — και αποθήκευση απευθείας στα αρχεία του έργου'] },

  { id:'dxf', cat:['topo'], ico:'📐', name:'Check My DXF', adminName:'CAD Tools (DXF + LISP)',
    desc:'Έλεγχος διαγράμματος για Ηλεκτρονική Υποβολή ΕΚ · Πίνακας Ι · χάρτης — πακέτο CAD Tools μαζί με το LISP',
    href:'checkmydxf.html', price:'35€ / έτος + ΦΠΑ',
    tagline:'Έλεγχος διαγράμματος πριν την Ηλεκτρονική Υποβολή στο Κτηματολόγιο — χωρίς απορρίψεις.',
    feats:['Αυτόματος έλεγχος DXF για Ηλεκτρονική Υποβολή ΕΚ','Έλεγχος Πίνακα Ι και δομής αρχείου','Προεπισκόπηση σε χάρτη','Πακέτο CAD Tools: περιλαμβάνει και το LISP για AutoCAD/progeCAD'],
    note:'Το Check My DXF και το LISP HEXISCHECK/HEXISFIX πωλούνται μαζί ως ένα πακέτο (CAD Tools) — με μία ενεργοποίηση αποκτάς και τα δύο.' },

  { id:'kostos', cat:['nomos'], ico:'💰', name:'Κόστος Άδειας',
    desc:'Προϋπολογισμός · Αμοιβές · Φόροι · ΕΦΚΑ · Συμφωνητικά · ΣΑΥ/ΦΑΥ · ΥΔ · XML',
    href:'adeia_kostos.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Πλήρης κοστολόγηση οικοδομικής άδειας: από τον προϋπολογισμό μέχρι το XML.',
    feats:['Συμβατικός προϋπολογισμός έργου','Αμοιβές μηχανικών, φόροι και κρατήσεις ΕΦΚΑ','Συμφωνητικά, ΣΑΥ/ΦΑΥ και Υπεύθυνες Δηλώσεις','Εξαγωγή XML για το e-Άδειες'] },

  { id:'domisi', cat:['site','nomos'], ico:'📋', name:'Έλεγχος Δόμησης',
    desc:'Πόρισμα Ελεγκτών · Ν.4495/2017 · ΚΥΑ 299/2014 · αμοιβή',
    href:'elegxos.html', price:'40€ / έτος + ΦΠΑ',
    tagline:'Το πόρισμα του Ελεγκτή Δόμησης, δομημένο και χωρίς παραλείψεις.',
    feats:['Δομημένο πόρισμα κατά Ν.4495/2017','Έλεγχοι σύμφωνα με την ΚΥΑ 299/2014','Υπολογισμός αμοιβής ελεγκτή','Έτοιμο κείμενο για υποβολή'] },

  { id:'terrain', cat:['slam','topo'], ico:'⛰️', name:'HEXIS Terrain',
    desc:"KMZ/KML → ΕΓΣΑ'87 · υψόμετρα DEM · ισοϋψείς · DXF εξαγωγή",
    href:BRB_TERRAIN_URL, external:true, price:'40€ / έτος + ΦΠΑ',
    tagline:'Από KMZ/KML σε τοπογραφικό υπόβαθρο ΕΓΣΑ΄87 — με υψόμετρα, ισοϋψείς και DXF.',
    feats:["Μετατροπή KMZ/KML σε ΕΓΣΑ'87",'Υψόμετρα από DEM σε κάθε κορυφή','Αυτόματες ισοϋψείς καμπύλες και TIN','Εξαγωγή έτοιμου DXF για το CAD σου'] },

  { id:'asbuilt', cat:['slam','site'], ico:'☁️', icoSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="48" height="48"><defs><linearGradient id="abog" x1="100" y1="120" x2="430" y2="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB02E"/><stop offset="1" stop-color="#E8772E"/></linearGradient><linearGradient id="abbgg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#12274A"/><stop offset="1" stop-color="#0A1730"/></linearGradient></defs><rect width="512" height="512" rx="104" fill="url(#abbgg)"/><rect x="10" y="10" width="492" height="492" rx="96" fill="none" stroke="#253B63" stroke-width="4"/><g stroke="#4D8DFF" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 22" opacity=".95"><line x1="180" y1="322" x2="150" y2="416"/><line x1="262" y1="326" x2="262" y2="420"/><line x1="344" y1="322" x2="376" y2="412"/></g><path d="M74 436 L160 436 L196 456 L252 456 L288 436 L344 420 L438 420" fill="none" stroke="#EEF2F8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="108" cy="235" r="9" fill="url(#abog)"/><circle cx="111" cy="214" r="9" fill="url(#abog)"/><circle cx="120" cy="195" r="9" fill="url(#abog)"/><circle cx="134" cy="179" r="9" fill="url(#abog)"/><circle cx="152" cy="168" r="9" fill="url(#abog)"/><circle cx="173" cy="163" r="9" fill="url(#abog)"/><circle cx="187" cy="145" r="9" fill="url(#abog)"/><circle cx="197" cy="130" r="9" fill="url(#abog)"/><circle cx="210" cy="117" r="9" fill="url(#abog)"/><circle cx="225" cy="107" r="9" fill="url(#abog)"/><circle cx="241" cy="100" r="9" fill="url(#abog)"/><circle cx="259" cy="96" r="9" fill="url(#abog)"/><circle cx="277" cy="96" r="9" fill="url(#abog)"/><circle cx="295" cy="100" r="9" fill="url(#abog)"/><circle cx="311" cy="107" r="9" fill="url(#abog)"/><circle cx="326" cy="117" r="9" fill="url(#abog)"/><circle cx="339" cy="130" r="9" fill="url(#abog)"/><circle cx="349" cy="145" r="9" fill="url(#abog)"/><circle cx="356" cy="161" r="9" fill="url(#abog)"/><circle cx="358" cy="178" r="9" fill="url(#abog)"/><circle cx="376" cy="183" r="9" fill="url(#abog)"/><circle cx="393" cy="193" r="9" fill="url(#abog)"/><circle cx="405" cy="206" r="9" fill="url(#abog)"/><circle cx="413" cy="223" r="9" fill="url(#abog)"/><circle cx="416" cy="242" r="9" fill="url(#abog)"/><circle cx="413" cy="261" r="9" fill="url(#abog)"/><circle cx="405" cy="278" r="9" fill="url(#abog)"/><circle cx="393" cy="291" r="9" fill="url(#abog)"/><circle cx="376" cy="301" r="9" fill="url(#abog)"/><circle cx="358" cy="306" r="9" fill="url(#abog)"/><circle cx="340" cy="305" r="9" fill="url(#abog)"/><circle cx="322" cy="298" r="9" fill="url(#abog)"/><circle cx="299" cy="278" r="9" fill="url(#abog)"/><circle cx="277" cy="280" r="9" fill="url(#abog)"/><circle cx="259" cy="280" r="9" fill="url(#abog)"/><circle cx="241" cy="276" r="9" fill="url(#abog)"/><circle cx="226" cy="291" r="9" fill="url(#abog)"/><circle cx="208" cy="302" r="9" fill="url(#abog)"/><circle cx="187" cy="307" r="9" fill="url(#abog)"/><circle cx="166" cy="306" r="9" fill="url(#abog)"/><circle cx="146" cy="298" r="9" fill="url(#abog)"/><circle cx="129" cy="286" r="9" fill="url(#abog)"/><circle cx="117" cy="269" r="9" fill="url(#abog)"/><circle cx="281" cy="186" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="174" cy="225" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="324" cy="197" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="214" cy="225" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="358" cy="246" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="262" cy="240" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="238" cy="192" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="304" cy="147" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="198" cy="186" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="170" cy="259" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="252" cy="153" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="308" cy="243" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="209" cy="259" r="5.5" fill="#FFB02E" opacity=".85"/></svg>', name:'AS-BUILT CLOUD',
    desc:'Πάχος κατασκευών & όγκοι cut/fill από νέφη σημείων · χάρτες με κλίμακες · Τεχνική Έκθεση PDF',
    href:'asbuilt.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Από δύο αποτυπώσεις σε τεκμηριωμένη επιμέτρηση — πάχη as-built και χωματουργικά με ένα κλικ.',
    feats:['Πραγματικό πάχος κατασκευής έναντι μελέτης, με ανοχές και φίλτρο αντικειμένων','Όγκοι εκσκαφών–επιχώσεων (cut/fill) με κατώφλι θορύβου αποτύπωσης','Δέχεται νέφη ASCII/OBJ και ισοϋψείς τοπογραφικού DXF','Τεχνική έκθεση PDF με υψομετρικούς χάρτες, ιστόγραμμα και στατιστικά — όλα τοπικά στη συσκευή'] },

  { id:'plan3d', cat:['site'], ico:'🏗️', name:'3D Κτίριο',
    desc:'Κατόψεις & ξυλότυποι (PDF/DXF) σε 3D μοντέλο · τομές · μετρήσεις · ήλιος & σκιές',
    href:'plan3d.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Από τις κατόψεις στο κτίριο — τοίχοι, κουφώματα και φέρων ακριβώς όπως είναι σχεδιασμένα.',
    feats:['Ακριβές 3D από το περίγραμμα των γραμμών κάθε κάτοψης, όροφο προς όροφο','Κουφώματα με ποδιές και πρέκια, εξώστες, φέρων οργανισμός από τον ξυλότυπο','Οριζόντιες & κατακόρυφες τομές, μετρήσεις αποστάσεων και χώρων','Ήλιος & σκιές ανά εποχή από πόλη ή συντεταγμένες ΕΓΣΑ87 · εξαγωγή GLB/OBJ'] },

  { id:'toixos', cat:['site'], ico:'🧱', name:'Τοίχος Αντιστήριξης',
    desc:'Τοίχος προβόλου Ο/Σ · EN 1997‑1 / EN 1998‑5 / EN 1992‑1‑1 · ΚΤΣ‑2016 · τομή, οριζοντιογραφία με μεταβλητές στάθμες, ξυλότυπος, αποστράγγιση, οπλισμός, τεύχος, DXF',
    href:'toixos.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Από την κάτοψη της οδού στον πλήρη φάκελο του τοίχου — ευστάθεια, οπλισμός και σχέδια από μία διατομή.',
    feats:['Ευστάθεια (ανατροπή, ολίσθηση, φέρουσα ικανότητα) κατά EN 1997‑1 DA2 και σεισμός Mononobe‑Okabe κατά EN 1998‑5','Διαστασιολόγηση κορμού και πέδιλου κατά EN 1992‑1‑1 με επιλογή Ø/s, αγκυρώσεις και πίνακα οπλισμού ανά m','Οριζοντιογραφία πάνω σε DXF κάτοψης (ισοϋψείς, οδός, ανάντη/κατάντη): τοποθέτηση με το ποντίκι, στάθμες βάσης και στέψης ανά κορυφή, όψη/μηκοτομή','Ξυλότυπος τομής και κάτοψης, λεπτομέρεια επίχωσης‑αποστράγγισης, προμετρήσεις, τεύχος υπολογισμών και εξαγωγή όλων των σχεδίων σε DXF'] },

  { id:'mpeton', cat:['site'], ico:'🧱', name:'Σκυρόδεμα & Τοιχοποιία',
    desc:'Αναλογίες μπετόν C12/15–C40 · τούβλα · σενάζ · λάσπη',
    href:'mpeton.html', price:'20€ / έτος + ΦΠΑ',
    tagline:'Υπολογιστές ποσοτήτων για σκυρόδεμα και τοιχοποιία, επί τόπου του έργου — από το κινητό σου.',
    feats:['Αναλογίες μπετόν για όλες τις κατηγορίες C12/15 έως C40','Υπολογισμός τούβλων και σενάζ ανά τοιχοποιία','Ξεχωριστή καρτέλα για λάσπη / κονιάματα','Δουλεύει offline στο εργοτάξιο (PWA)'] },

  { id:'stegh', cat:['site'], ico:'🏠', name:'Στέγη & Προμέτρηση',
    desc:'Σχεδιάζεις το περίγραμμα στο κινητό · μαχιές · ντερέδες · υψόμετρα · ποσότητες υλικών σε PDF',
    href:'stegh.html', price:'40€ / έτος + ΦΠΑ',
    tagline:'Σχεδιάζεις το περίγραμμα της στέγης με το δάχτυλο και παίρνεις τις ποσότητες — επί τόπου, χωρίς σήμα.',
    feats:['Αυτόματη επίλυση: μαχιές, ντερέδες, κορφιάδες και υψόμετρα σε κάθε κόμβο','Κεραμίδια, καβαλλάρηδες, ακροκέραμα, ξυλεία, μόνωση και μεμβράνες','Φορτία χιονιού και ανέμου κατά Ευρωκώδικα 1 (Ελληνικό Εθνικό Προσάρτημα)','Εξαγωγή PDF με σχέδιο κάτοψης και πίνακες — δουλεύει offline (PWA)'],
    note:'Στη LISP Βιβλιοθήκη CAD περιλαμβάνεται και η εντολή STEGH για AutoCAD/progeCAD: κάτοψη, ξυλότυπος, ανάπτυγμα και τομή ζευκτού.' },

  { id:'rtk', cat:['topo'], ico:'🛰️', name:'RTK Checklist',
    desc:'Στήσιμο Base + Rover · γνωστό σημείο / localization',
    href:'rtk_checklist.html', price:'20€ / έτος + ΦΠΑ',
    tagline:'Η λίστα ελέγχου που εξασφαλίζει σωστές μετρήσεις GNSS — πριν χάσεις μια μέρα στο πεδίο.',
    feats:['Βήμα-βήμα στήσιμο Base + Rover','Έλεγχος σε γνωστό σημείο / localization','Έλεγχοι FIX, PDOP και ύψους κεραίας','Offline PWA — δουλεύει και χωρίς σήμα'] },

  { id:'mapping', cat:['drone','slam'], ico:'🛰️', name:'HEXIS MAPPING',
    desc:'Drone → ορθοφωτοχάρτης, νέφος, DTM, ισοϋψείς σε ΕΓΣΑ87 · GPU στο cloud',
    href:'mapping.html', free:true, ownerOnly:true, adminName:'HEXIS MAPPING', price:'Άδεια HEXIS MAPPING',
    tagline:'Με κλειδί άδειας HEXIS MAPPING — είσοδος με τον λογαριασμό HEXIS, λήψη της εφαρμογής για Windows, έργα και παραδοτέα από οποιονδήποτε υπολογιστή.',
    feats:['Φωτοκέντρα MRK σε ΕΓΣΑ87 και GCP με αυτόματη τοποθέτηση','Επεξεργασία σε GPU στο cloud, παραδοτέα με email','Ορθοφωτοχάρτης, νέφος, DTM/DSM, ισοϋψείς, 3D μοντέλο','Χωματισμοί, όγκος σωρού, μηκοτομές, CAD πάνω στο νέφος'] },

  { id:'interior', cat:['design'], ico:'🛋️', name:'HEXIS INTERIOR',
    desc:'Σκίτσο, κάτοψη ή σάρωση → 3D σπίτι · επίπλωση, κουζίνα, πλακίδια, φως · εκτίμηση κόστους',
    href:'interior.html', free:true, ownerOnly:true, adminName:'HEXIS INTERIOR', price:'Ιδιωτικό · δοκιμαστική έκδοση',
    tagline:'Από ένα σκίτσο ή μια σάρωση στο ανακαινισμένο σπίτι — με πραγματικές διαστάσεις και κόστος.',
    feats:['Ιδιώτης σε 3 βήματα · Μηχανικός με όλα τα εργαλεία','Κάτοψη από σκίτσο με λοξούς, καμπύλους τοίχους, κολόνες και δοκάρια, ή από σάρωση','AI διαρρύθμιση και φωτορεαλιστική απόδοση','Κουζίνες με γωνία, νησίδα και συσκευές · κουφώματα ALUMIL, EUROPA, ELVIAL','PDF με κατόψεις σε κλίμακα και πλήρη επιμέτρηση · Ελληνικά / English'] },

  { id:'routeprep', cat:['drone'], ico:'🛩️', name:'Route Prep · Drone',
    desc:'KML/KMZ → DJI Pilot 2 · καθάρισμα ορίου · οδηγός αποστολής & checklist Mavic 3E',
    href:'routeprep.html', price:'20€ / έτος + ΦΠΑ',
    tagline:'Από το όριο του γεωτεμαχίου σε έτοιμη αποστολή χαρτογράφησης στο DJI Pilot 2 — σε δύο λεπτά.',
    feats:['Καθαρίζει KML/KMZ από Κτηματολόγιο & Google Earth (styles, folders, label points)','Έτοιμο KMZ για import ως Area Route (Mapping) στο DJI Pilot 2','Οδηγός αποστολής 5 βημάτων: εξαγωγή → καθάρισμα → import → ρυθμίσεις → checklist','Πίνακας ύψους/GSD για Mavic 3E και checklist πεδίου — δουλεύει offline (PWA)'] },

  { id:'kenak', cat:['energy'], ico:'⚡', icoSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"> <polygon points="19,6 33.7,14.5 33.7,31.5 19,40 4.3,31.5 4.3,14.5" fill="#FFFFFF" stroke="#E8772E" stroke-width="2.4" stroke-linejoin="round"/> <g stroke="#FFFFFF" stroke-width="0.7"> <path d="M10 14.9 h14   l3.4 1.7 l-3.4 1.7 h-14 z"   fill="#0B7A3B"/> <path d="M10 19.1 h18.5 l3.4 1.7 l-3.4 1.7 h-18.5 z" fill="#F2C21C"/> <path d="M10 23.3 h23   l3.4 1.7 l-3.4 1.7 h-23 z"   fill="#E06A22"/> <path d="M10 27.5 h27.5 l3.4 1.7 l-3.4 1.7 h-27.5 z" fill="#C43A2B"/> </g> <path d="M33.7 14.5 L19 6 L4.3 14.5 V31.5 L19 40 L33.7 31.5" fill="none" stroke="#E8772E" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/> <text x="10.8" y="18.1" font-family="Arial,Helvetica,sans-serif" font-size="4.1" font-weight="900" fill="#FFFFFF">Α+</text> </svg>', name:'ΚΕΝΑΚ Επιθεώρηση (Beta)',
    desc:'Σκαρίφημα κάτοψης · κουφώματα · σκιάσεις · όροφοι · έλεγχοι ΤΟΤΕΕ · XML ΤΕΕ-ΚΕΝΑΚ',
    href:'kenak.html', price:'Δωρεάν όσο διαρκεί το Beta',
    tagline:'Από την αυτοψία στο XML του ΤΕΕ-ΚΕΝΑΚ — σχεδιάζεις την κάτοψη, βγαίνουν όψεις, σκιάσεις, συστήματα και σενάρια, έτοιμα για import.',
    feats:['Σχεδιαστικό με ΚΑΕΚ υπόβαθρο, κουφώματα, ύψη ανά τοίχο, ορόφους','Γωνίες σκίασης και συντελεστές F από τους πίνακες ΤΟΤΕΕ','Έλεγχος ορθότητας συστημάτων (λέβητες, ΑΘ, SEER) πριν την εξαγωγή','XML ΤΕΕ-ΚΕΝΑΚ 1.31 με κέλυφος, συστήματα και σενάρια — δοκιμασμένο σε πραγματικά αρχεία'],
    note:'Beta έκδοση — η εξαγωγή XML είναι δωρεάν κατά τη δοκιμαστική περίοδο. Η τιμολόγηση ανά ΠΕΑ θα ανακοινωθεί με την επίσημη κυκλοφορία.' },

  { id:'lisp', cat:['topo'], mod:'dxf', ico:'⬇️', name:'LISP Βιβλιοθήκη CAD',
    desc:'HEXISCHECK/HEXISFIX · STEGH στέγη & ξυλότυπος · EXPTXT εξαγωγή σημείων TXT · νέες ρουτίνες AutoLISP συνεχώς — AutoCAD & progeCAD',
    href:'lisplib.html', price:'35€ / έτος + ΦΠΑ',
    tagline:'Ρουτίνες AutoLISP για AutoCAD & progeCAD — βιβλιοθήκη που μεγαλώνει συνεχώς.',
    feats:['HEXISCHECK / HEXISFIX: έλεγχος & αυτόματες διορθώσεις πριν την εξαγωγή DXF','STEGH: επίλυση στέγης, ξυλότυπος, ανάπτυγμα εδρών και τομή ζευκτού','EXPTXT / EXPTXTA: εξαγωγή σημείων σε TXT (Α/Α,Χ,Υ,Ζ) για ΤΕΚΤΩΝ, GNSS, Excel','Νέες εντολές προστίθενται χωρίς επιπλέον χρέωση'],
    note:'Η LISP Βιβλιοθήκη και το Check My DXF πωλούνται μαζί ως ένα πακέτο (CAD Tools) — με μία ενεργοποίηση αποκτάς όλα.' }
];

var ICONS = {"interior": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\"><defs><linearGradient id=\"hxin\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0796A8\"/><stop offset=\"1\" stop-color=\"#4C6BEA\"/></linearGradient></defs><rect x=\"2\" y=\"2\" width=\"44\" height=\"44\" rx=\"11\" fill=\"url(#hxin)\"/><path d=\"M11 12h26v24H11z M24 12v13 M24 30v6 M11 24h8\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.6\" stroke-linejoin=\"round\"/><g fill=\"#FFD9A3\"><circle cx=\"15\" cy=\"16.5\" r=\"1.5\"/><circle cx=\"18.5\" cy=\"17.5\" r=\"1.5\"/><circle cx=\"30\" cy=\"30\" r=\"1.5\"/><circle cx=\"32\" cy=\"26.5\" r=\"1.5\"/><circle cx=\"28.5\" cy=\"17.5\" r=\"1.5\"/></g></svg>", "mapping": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 40 40\"><defs><linearGradient id=\"hxm-face\" x1=\"0\" y1=\"0\" x2=\"0.35\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fbfdf3\"/><stop offset=\".55\" stop-color=\"#eef4dc\"/><stop offset=\"1\" stop-color=\"#dfe8c6\"/></linearGradient><linearGradient id=\"hxm-side\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#a8731a\"/><stop offset=\".5\" stop-color=\"#d1931f\"/><stop offset=\"1\" stop-color=\"#8f6114\"/></linearGradient><linearGradient id=\"hxm-rim\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ffd36a\"/><stop offset=\"1\" stop-color=\"#d99a1e\"/></linearGradient><radialGradient id=\"hxm-tree\" cx=\"35%\" cy=\"30%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#9cc46a\"/><stop offset=\".55\" stop-color=\"#4f7d32\"/><stop offset=\"1\" stop-color=\"#2e4f1c\"/></radialGradient><linearGradient id=\"hxm-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5b6748\"/><stop offset=\"1\" stop-color=\"#252c1d\"/></linearGradient><radialGradient id=\"hxm-lens\" cx=\"35%\" cy=\"30%\" r=\"70%\"><stop offset=\"0\" stop-color=\"#ffe08a\"/><stop offset=\"1\" stop-color=\"#c9861a\"/></radialGradient><linearGradient id=\"hxm-road\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#4e5349\"/><stop offset=\"1\" stop-color=\"#7a8072\"/></linearGradient><linearGradient id=\"hxm-gloss\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient><radialGradient id=\"hxm-shadow\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" stop-color=\"#000\" stop-opacity=\".35\"/><stop offset=\"1\" stop-color=\"#000\" stop-opacity=\"0\"/></radialGradient><filter id=\"hxm-ds\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\"><feDropShadow dx=\".25\" dy=\".45\" stdDeviation=\".35\" flood-color=\"#1b2214\" flood-opacity=\".45\"/></filter><clipPath id=\"hxm-hx\"><polygon points=\"20,3.77 33.27,11.4 33.27,28.6 20,36.24 6.73,28.6 6.73,11.4\"/></clipPath><mask id=\"hxm-lbl\"><rect width=\"40\" height=\"40\" fill=\"#fff\"/><rect x=\"12.1\" y=\"17.3\" width=\"4.9\" height=\"3.3\" rx=\".8\" fill=\"#000\"/></mask></defs><ellipse cx=\"20.6\" cy=\"38.2\" rx=\"13\" ry=\"1.6\" fill=\"url(#hxm-shadow)\"/><polygon points=\"20,4.6 33.9,12.6 33.9,30.6 20,38.6 6.1,30.6 6.1,12.6\" fill=\"url(#hxm-side)\"/><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"url(#hxm-rim)\"/><polygon points=\"20,3.77 33.27,11.4 33.27,28.6 20,36.24 6.73,28.6 6.73,11.4\" fill=\"url(#hxm-face)\"/><g clip-path=\"url(#hxm-hx)\"><path d=\"M13 37 Q22 27.5 35 25.5\" fill=\"none\" stroke=\"#2f332b\" stroke-opacity=\".35\" stroke-width=\"4.6\" stroke-linecap=\"round\" transform=\"translate(.3 .5)\"/><path d=\"M13 37 Q22 27.5 35 25.5\" fill=\"none\" stroke=\"url(#hxm-road)\" stroke-width=\"4.2\" stroke-linecap=\"round\"/><path d=\"M13 37 Q22 27.5 35 25.5\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\".5\" stroke-dasharray=\"1.4 1.1\"/><path d=\"M6 23 C11.5 20.8 15.5 24.6 21 22.6 S29 20.4 34 22.2\" fill=\"none\" stroke=\"#c9861a\" stroke-width=\".28\" stroke-linecap=\"round\" opacity=\".9\"/><path d=\"M6 19.6 C11 17.2 14.5 21.4 19.5 19.4 S28 16.6 34 18.6\" fill=\"none\" stroke=\"#b9770f\" stroke-width=\".48\" stroke-linecap=\"round\" mask=\"url(#hxm-lbl)\"/><text x=\"14.55\" y=\"19.85\" font-family=\"Segoe UI,Arial,sans-serif\" font-size=\"2.15\" font-weight=\"700\" fill=\"#b9770f\" text-anchor=\"middle\">100</text><g filter=\"url(#hxm-ds)\" fill=\"url(#hxm-tree)\"><circle cx=\"9.4\" cy=\"29.4\" r=\"1.6\"/><circle cx=\"12.6\" cy=\"30.2\" r=\"1.8\"/><circle cx=\"14.2\" cy=\"26.0\" r=\"1.8\"/><circle cx=\"10.9\" cy=\"26.6\" r=\"2.2\"/></g><path d=\"M27.2 17.4 L17 21.2 L19.2 28.2 Z\" fill=\"#39ff14\" opacity=\".14\"/><path d=\"M27.2 17.4 L17 21.2 M27.2 17.4 L17.6 24.8 M27.2 17.4 L19.2 28.2\" stroke=\"#2fbf0f\" stroke-width=\".4\" stroke-linecap=\"round\" opacity=\".9\"/></g><g filter=\"url(#hxm-ds)\"><path d=\"M20 14.6 L15.6 18.3 M20 14.6 L24.4 18.3\" stroke=\"#39422e\" stroke-width=\".5\" stroke-dasharray=\".9 .7\" fill=\"none\" opacity=\".7\"/><rect x=\"13.6\" y=\"11.25\" width=\"12.8\" height=\".9\" rx=\".45\" fill=\"url(#hxm-dark)\"/><ellipse cx=\"13.9\" cy=\"10.6\" rx=\"2.3\" ry=\".75\" fill=\"url(#hxm-dark)\"/><ellipse cx=\"26.1\" cy=\"10.6\" rx=\"2.3\" ry=\".75\" fill=\"url(#hxm-dark)\"/><rect x=\"18.3\" y=\"10.6\" width=\"3.4\" height=\"2.2\" rx=\".6\" fill=\"url(#hxm-dark)\"/><circle cx=\"20\" cy=\"13.6\" r=\".85\" fill=\"url(#hxm-lens)\"/></g><g filter=\"url(#hxm-ds)\"><rect x=\"27.1\" y=\"21.4\" width=\"2.2\" height=\"6.4\" rx=\"1.05\" fill=\"url(#hxm-dark)\"/><rect x=\"26.1\" y=\"18.6\" width=\"4.2\" height=\"3.4\" rx=\"1\" fill=\"url(#hxm-dark)\"/><rect x=\"26.9\" y=\"16.3\" width=\"2.6\" height=\"2.6\" rx=\"1.3\" fill=\"url(#hxm-lens)\"/><circle cx=\"28.2\" cy=\"17.6\" r=\".7\" fill=\"#252c1d\"/><circle cx=\"27.95\" cy=\"17.35\" r=\".2\" fill=\"#fff\" opacity=\".8\"/><rect x=\"26.7\" y=\"19.6\" width=\"1.4\" height=\".6\" rx=\".3\" fill=\"#2fbf0f\"/></g><polygon points=\"20,3.77 33.27,11.4 33.27,14.2 20,8.1 6.73,14.2 6.73,11.4\" fill=\"url(#hxm-gloss)\"/></svg>", "pdfdim": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"pdbg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#0B1630\"/><stop offset=\"1\" stop-color=\"#050A18\"/></linearGradient><linearGradient id=\"pdac\" x1=\"96\" y1=\"0\" x2=\"416\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#3DE8FF\"/><stop offset=\".6\" stop-color=\"#8B5CFF\"/><stop offset=\"1\" stop-color=\"#FB7185\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#pdbg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#1E3A66\" stroke-width=\"4\"/><path d=\"M150 84 H316 L374 142 V344 H150 Z\" fill=\"#3DE8FF\" fill-opacity=\".07\" stroke=\"#E8F1FF\" stroke-width=\"12\" stroke-linejoin=\"round\"/><path d=\"M316 84 V142 H374\" fill=\"none\" stroke=\"#E8F1FF\" stroke-width=\"10\" stroke-linejoin=\"round\" opacity=\".7\"/><path d=\"M196 176 H300 V286 H196 Z\" fill=\"none\" stroke=\"#3DE8FF\" stroke-width=\"8\" stroke-linejoin=\"round\" opacity=\".85\"/><g fill=\"none\" stroke=\"#FACC15\" stroke-width=\"7\"><rect x=\"186\" y=\"166\" width=\"20\" height=\"20\"/><rect x=\"290\" y=\"276\" width=\"20\" height=\"20\"/></g><path d=\"M96 420 H416\" stroke=\"url(#pdac)\" stroke-width=\"14\" stroke-linecap=\"round\"/><path d=\"M96 394 V446 M416 394 V446\" stroke=\"url(#pdac)\" stroke-width=\"12\" stroke-linecap=\"round\"/><path d=\"M128 420 L160 400 M128 420 L160 440 M384 420 L352 400 M384 420 L352 440\" stroke=\"#E8F1FF\" stroke-width=\"8\" stroke-linecap=\"round\" opacity=\".8\"/></svg>", "toixos": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"txbg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#0E1B3A\"/><stop offset=\"1\" stop-color=\"#050A18\"/></linearGradient><linearGradient id=\"txac\" x1=\"70\" y1=\"0\" x2=\"440\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#3DE8FF\"/><stop offset=\"1\" stop-color=\"#8B5CFF\"/></linearGradient><linearGradient id=\"txfill\" x1=\"0\" y1=\"110\" x2=\"0\" y2=\"372\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#3DE8FF\" stop-opacity=\".18\"/><stop offset=\"1\" stop-color=\"#8B5CFF\" stop-opacity=\".18\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#txbg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#1E3A66\" stroke-width=\"4\"/><g stroke=\"#3DE8FF\" stroke-width=\"2\" opacity=\".10\"><path d=\"M64 128H448M64 256H448M64 384H448M128 64V448M256 64V448M384 64V448\"/></g><path d=\"M206 112 H336 V312 H436 V372 H76 V312 H160 Z\" fill=\"url(#txfill)\" stroke=\"#E8F1FF\" stroke-width=\"18\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><path d=\"M292 112 V312\" stroke=\"#E8F1FF\" stroke-width=\"12\" stroke-linecap=\"round\" opacity=\".6\"/><path d=\"M104 312 H140\" stroke=\"#E8F1FF\" stroke-width=\"12\" stroke-linecap=\"round\" opacity=\".6\"/><path d=\"M72 424 H440\" stroke=\"url(#txac)\" stroke-width=\"16\" stroke-linecap=\"round\" opacity=\".35\"/><path d=\"M72 424 H440\" stroke=\"url(#txac)\" stroke-width=\"10\" stroke-linecap=\"round\"/></svg>", "paper2dxf": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"p2dbg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#1A56AD\"/><stop offset=\"1\" stop-color=\"#082A5F\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#p2dbg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#3C7AD6\" stroke-width=\"4\"/><g stroke=\"#FFFFFF\" stroke-width=\"2\" opacity=\".18\"><path d=\"M64 128H448M64 192H448M64 256H448M64 320H448M64 384H448M128 64V448M192 64V448M256 64V448M320 64V448M384 64V448\"/></g><rect x=\"96\" y=\"96\" width=\"320\" height=\"320\" rx=\"6\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"6\" opacity=\".55\"/><g fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"16\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M136 376V136H376V376H136Z\"/><path d=\"M256 136V256H376\"/></g><path d=\"M256 256A80 80 0 0 1 336 336\" fill=\"none\" stroke=\"#FFE066\" stroke-width=\"10\" stroke-linecap=\"round\"/><path d=\"M256 256L256 336\" stroke=\"#FFE066\" stroke-width=\"10\" stroke-linecap=\"round\"/><text x=\"196\" y=\"330\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"54\" font-weight=\"700\" fill=\"#FFFFFF\">Α</text></svg>", "plan3d": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"p3bg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#0B1630\"/><stop offset=\"1\" stop-color=\"#050A18\"/></linearGradient><linearGradient id=\"p3ac\" x1=\"120\" y1=\"120\" x2=\"400\" y2=\"420\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#3DE8FF\"/><stop offset=\"1\" stop-color=\"#8B5CFF\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#p3bg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#1E3A66\" stroke-width=\"4\"/><g fill=\"none\" stroke=\"#3DE8FF\" stroke-width=\"5\" stroke-linejoin=\"round\" opacity=\".75\"><path d=\"M84 344 L256 444 L428 344 L256 244 Z\"/><path d=\"M127 369 L299 269 M170 394 L342 294 M213 419 L385 319\" stroke-width=\"2.5\" opacity=\".6\"/><path d=\"M127 319 L299 419 M170 294 L342 394 M213 269 L385 369\" stroke-width=\"2.5\" opacity=\".6\"/></g><g fill=\"none\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M150 330 L256 391 L362 330 L362 190 L256 129 L150 190 Z\" fill=\"#0E1C38\" stroke=\"#E8F1FF\" stroke-width=\"12\"/><path d=\"M150 190 L256 251 L362 190 M256 251 L256 391\" stroke=\"#E8F1FF\" stroke-width=\"12\"/><path d=\"M150 260 L256 321 L362 260\" stroke=\"url(#p3ac)\" stroke-width=\"9\"/></g><g fill=\"url(#p3ac)\"><path d=\"M172 216 L190 226 L190 246 L172 236 Z\"/><path d=\"M206 236 L224 246 L224 266 L206 256 Z\"/><path d=\"M172 286 L190 296 L190 316 L172 306 Z\"/><path d=\"M206 306 L224 316 L224 346 L206 336 Z\"/><path d=\"M288 246 L306 236 L306 256 L288 266 Z\"/><path d=\"M322 226 L340 216 L340 236 L322 246 Z\"/><path d=\"M288 316 L306 306 L306 326 L288 336 Z\"/><path d=\"M322 296 L340 286 L340 306 L322 316 Z\"/></g><path d=\"M256 129 L256 251\" stroke=\"#3DE8FF\" stroke-width=\"3\" stroke-dasharray=\"3 9\" opacity=\".7\"/></svg>", "asbuilt": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"abog\" x1=\"100\" y1=\"120\" x2=\"430\" y2=\"320\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFB02E\"/><stop offset=\"1\" stop-color=\"#E8772E\"/></linearGradient><linearGradient id=\"abbgg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#12274A\"/><stop offset=\"1\" stop-color=\"#0A1730\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#abbgg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#253B63\" stroke-width=\"4\"/><g stroke=\"#4D8DFF\" stroke-width=\"7\" stroke-linecap=\"round\" stroke-dasharray=\"2 22\" opacity=\".95\"><line x1=\"180\" y1=\"322\" x2=\"150\" y2=\"416\"/><line x1=\"262\" y1=\"326\" x2=\"262\" y2=\"420\"/><line x1=\"344\" y1=\"322\" x2=\"376\" y2=\"412\"/></g><path d=\"M74 436 L160 436 L196 456 L252 456 L288 436 L344 420 L438 420\" fill=\"none\" stroke=\"#EEF2F8\" stroke-width=\"14\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"108\" cy=\"235\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"111\" cy=\"214\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"120\" cy=\"195\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"134\" cy=\"179\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"152\" cy=\"168\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"173\" cy=\"163\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"187\" cy=\"145\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"197\" cy=\"130\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"210\" cy=\"117\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"225\" cy=\"107\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"241\" cy=\"100\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"259\" cy=\"96\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"277\" cy=\"96\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"295\" cy=\"100\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"311\" cy=\"107\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"326\" cy=\"117\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"339\" cy=\"130\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"349\" cy=\"145\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"356\" cy=\"161\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"358\" cy=\"178\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"376\" cy=\"183\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"393\" cy=\"193\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"405\" cy=\"206\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"413\" cy=\"223\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"416\" cy=\"242\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"413\" cy=\"261\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"405\" cy=\"278\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"393\" cy=\"291\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"376\" cy=\"301\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"358\" cy=\"306\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"340\" cy=\"305\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"322\" cy=\"298\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"299\" cy=\"278\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"277\" cy=\"280\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"259\" cy=\"280\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"241\" cy=\"276\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"226\" cy=\"291\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"208\" cy=\"302\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"187\" cy=\"307\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"166\" cy=\"306\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"146\" cy=\"298\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"129\" cy=\"286\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"117\" cy=\"269\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"281\" cy=\"186\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"174\" cy=\"225\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"324\" cy=\"197\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"214\" cy=\"225\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"358\" cy=\"246\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"262\" cy=\"240\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"238\" cy=\"192\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"304\" cy=\"147\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"198\" cy=\"186\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"170\" cy=\"259\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"252\" cy=\"153\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"308\" cy=\"243\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"209\" cy=\"259\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/></svg>", "kenak": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" width=\"48\" height=\"48\"> <polygon points=\"19,6 33.7,14.5 33.7,31.5 19,40 4.3,31.5 4.3,14.5\" fill=\"#FFFFFF\" stroke=\"#E8772E\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/> <g stroke=\"#FFFFFF\" stroke-width=\"0.7\"> <path d=\"M10 14.9 h14   l3.4 1.7 l-3.4 1.7 h-14 z\"   fill=\"#0B7A3B\"/> <path d=\"M10 19.1 h18.5 l3.4 1.7 l-3.4 1.7 h-18.5 z\" fill=\"#F2C21C\"/> <path d=\"M10 23.3 h23   l3.4 1.7 l-3.4 1.7 h-23 z\"   fill=\"#E06A22\"/> <path d=\"M10 27.5 h27.5 l3.4 1.7 l-3.4 1.7 h-27.5 z\" fill=\"#C43A2B\"/> </g> <path d=\"M33.7 14.5 L19 6 L4.3 14.5 V31.5 L19 40 L33.7 31.5\" fill=\"none\" stroke=\"#E8772E\" stroke-width=\"2.4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <text x=\"10.8\" y=\"18.1\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"4.1\" font-weight=\"900\" fill=\"#FFFFFF\">Α+</text> </svg>", "app": "<img src=\"icon-192.png\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain;border-radius:10px\">", "mpeton": "<svg style=\"width:100%;height:100%;display:block\"  viewBox=\"0 0 40 40\"><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\"/><circle cx=\"20\" cy=\"20\" r=\"6.2\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\"/></svg>", "rtk": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\" stroke-linejoin=\"round\"/> <g transform=\"translate(26.6 11.6) rotate(45)\" fill=\"#e9a826\"> <rect x=\"-1.7\" y=\"-1.3\" width=\"3.4\" height=\"2.6\" rx=\"0.5\"/> <rect x=\"-5.6\" y=\"-0.8\" width=\"3.1\" height=\"1.6\" rx=\"0.3\"/> <rect x=\"2.5\" y=\"-0.8\" width=\"3.1\" height=\"1.6\" rx=\"0.3\"/> </g> <g fill=\"none\" stroke=\"#e9a826\" stroke-width=\"1.7\" stroke-linecap=\"round\"> <path d=\"M22.6 17.4 A7.4 7.4 0 0 0 17.6 22.2\"/> <path d=\"M20.2 14.4 A11.4 11.4 0 0 0 12.6 21.8\"/> </g> <g stroke=\"#e9a826\" stroke-width=\"1.9\" stroke-linecap=\"round\" fill=\"none\"> <ellipse cx=\"13.6\" cy=\"23.6\" rx=\"3.1\" ry=\"1.25\" fill=\"#e9a826\" stroke=\"none\"/> <line x1=\"13.6\" y1=\"24.6\" x2=\"13.6\" y2=\"27.2\"/> <path d=\"M13.6 27.2 L10.2 32.8 M13.6 27.2 L17 32.8 M13.6 27.2 L13.6 32.8\"/> </g></svg>", "ktima": "<svg style=\"width:100%;height:100%;display:block\"  viewBox=\"0 0 22 22\" fill=\"none\"> <rect x=\"1.5\" y=\"1.5\" width=\"19\" height=\"19\" rx=\"2\" stroke=\"#22d3ee\" stroke-width=\"1.3\"/> <line x1=\"7.8\" y1=\"1.5\" x2=\"7.8\" y2=\"20.5\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <line x1=\"14.2\" y1=\"1.5\" x2=\"14.2\" y2=\"20.5\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <line x1=\"1.5\" y1=\"7.8\" x2=\"20.5\" y2=\"7.8\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <line x1=\"1.5\" y1=\"14.2\" x2=\"20.5\" y2=\"14.2\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <circle cx=\"11\" cy=\"11\" r=\"2\" fill=\"#67e8f9\"/> </svg>", "dxf": "<svg style=\"width:100%;height:100%;display:block\"  class=\"hxlogo\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"> <polygon points=\"50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/> <polygon points=\"27.1,63.2 31.5,37.7 52.2,28.9 72,45.6 66.7,68.5 45.6,72\" fill=\"#FDF3E3\" stroke=\"#1B2530\" stroke-width=\"3.6\" stroke-linejoin=\"round\"/> <g fill=\"#1B2530\"> <circle cx=\"27.1\" cy=\"63.2\" r=\"2.7\"/><circle cx=\"31.5\" cy=\"37.7\" r=\"2.7\"/><circle cx=\"52.2\" cy=\"28.9\" r=\"2.7\"/> <circle cx=\"72\" cy=\"45.6\" r=\"2.7\"/><circle cx=\"66.7\" cy=\"68.5\" r=\"2.7\"/><circle cx=\"45.6\" cy=\"72\" r=\"2.7\"/> </g> <polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#1F4E9C\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#39FF14\" stroke-width=\"9.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </svg>", "lisp": "<svg style=\"width:100%;height:100%;display:block\"  class=\"hxlogo\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"> <polygon points=\"50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/> <polygon points=\"27.1,63.2 31.5,37.7 52.2,28.9 72,45.6 66.7,68.5 45.6,72\" fill=\"#FDF3E3\" stroke=\"#1B2530\" stroke-width=\"3.6\" stroke-linejoin=\"round\"/> <g fill=\"#1B2530\"> <circle cx=\"27.1\" cy=\"63.2\" r=\"2.7\"/><circle cx=\"31.5\" cy=\"37.7\" r=\"2.7\"/><circle cx=\"52.2\" cy=\"28.9\" r=\"2.7\"/> <circle cx=\"72\" cy=\"45.6\" r=\"2.7\"/><circle cx=\"66.7\" cy=\"68.5\" r=\"2.7\"/><circle cx=\"45.6\" cy=\"72\" r=\"2.7\"/> </g> <polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#1F4E9C\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#39FF14\" stroke-width=\"9.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </svg>", "domisi": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 48 48\"><defs><linearGradient id=\"edg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e9a826\"/><stop offset=\"1\" stop-color=\"#f6c453\"/></linearGradient></defs><rect width=\"48\" height=\"48\" rx=\"10\" fill=\"url(#edg)\"/><text x=\"24\" y=\"31\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"18\" font-weight=\"800\" fill=\"#fff\">ΕΔ</text></svg>", "nomothesia": "<img src=\"nomothesia-icon-192.png\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain;border-radius:10px\">", "stegh": "<img src=\"stegh-icon-192.png\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain;border-radius:10px\">", "kostos": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 48 48\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"24,4.5 40.9,14.2 40.9,33.8 24,43.5 7.1,33.8 7.1,14.2\" fill=\"none\" stroke=\"#1F4E9C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><text x=\"24\" y=\"32\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"21\" font-weight=\"800\" fill=\"#1F4E9C\">€</text></svg>", "terrain": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><clipPath id=\"hxTclip\"><path d=\"M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z\"/></clipPath></defs><g clip-path=\"url(#hxTclip)\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M4.2 18.5C4.6 13.8 7 9.6 10.6 8.2c3.8-1.5 8 .4 9.6 4 1.4 3.2.6 7-1.8 9.6\" stroke=\"#F26B21\" stroke-width=\"1\" opacity=\"0.45\"/><path d=\"M6.2 19.6c0-3.9 1.9-7.4 5-8.5 3.1-1.1 6.4.5 7.6 3.4 1.1 2.6.3 5.6-1.7 7.7\" stroke=\"#F26B21\" stroke-width=\"1.5\" opacity=\"0.75\"/><path d=\"M8.4 20.4c.1-2.8 1.5-5.2 3.7-6 2.2-.8 4.6.4 5.4 2.5.7 1.9 0 4-1.4 5.5\" stroke=\"#F26B21\" stroke-width=\"1\" opacity=\"0.45\"/><path d=\"M10.7 21c.2-1.8 1.1-3.2 2.4-3.7 1.4-.5 2.8.3 3.3 1.6.4 1.1 0 2.4-.8 3.3\" stroke=\"#F26B21\" stroke-width=\"1.5\" opacity=\"0.75\"/><circle cx=\"13.6\" cy=\"19.4\" r=\"0.75\" fill=\"#F26B21\" stroke=\"none\"/></g><path d=\"M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z\" stroke=\"#F26B21\" stroke-width=\"1.8\"/></svg>", "routeprep": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\" stroke-linejoin=\"round\"/><g stroke=\"#e9a826\" stroke-width=\"1.8\" stroke-linecap=\"round\"><line x1=\"17.2\" y1=\"17.2\" x2=\"13.8\" y2=\"13.8\"/><line x1=\"22.8\" y1=\"17.2\" x2=\"26.2\" y2=\"13.8\"/><line x1=\"17.2\" y1=\"22.8\" x2=\"13.8\" y2=\"26.2\"/><line x1=\"22.8\" y1=\"22.8\" x2=\"26.2\" y2=\"26.2\"/></g><g fill=\"none\" stroke=\"#e9a826\" stroke-width=\"1.8\"><circle cx=\"13\" cy=\"13\" r=\"3.2\"/><circle cx=\"27\" cy=\"13\" r=\"3.2\"/><circle cx=\"13\" cy=\"27\" r=\"3.2\"/><circle cx=\"27\" cy=\"27\" r=\"3.2\"/></g><rect x=\"16.6\" y=\"17\" width=\"6.8\" height=\"6\" rx=\"1.6\" fill=\"#e9a826\"/></svg>", "syntetagmenes": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"sygbg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#0B1630\"/><stop offset=\"1\" stop-color=\"#050A18\"/></linearGradient><linearGradient id=\"sygac\" x1=\"90\" y1=\"110\" x2=\"420\" y2=\"420\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#3DE8FF\"/><stop offset=\".6\" stop-color=\"#8B5CFF\"/><stop offset=\"1\" stop-color=\"#FB7185\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#sygbg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#1E3A66\" stroke-width=\"4\"/><g stroke=\"#3DE8FF\" stroke-width=\"2.5\" opacity=\".28\"><path d=\"M64 160H448M64 256H448M64 352H448M160 64V448M256 64V448M352 64V448\"/></g><path d=\"M118 352 L170 150 L338 118 L404 300 L250 404 Z\" fill=\"#3DE8FF\" fill-opacity=\".10\" stroke=\"url(#sygac)\" stroke-width=\"14\" stroke-linejoin=\"round\"/><g fill=\"#E8F1FF\" stroke=\"#0B1630\" stroke-width=\"6\"><circle cx=\"118\" cy=\"352\" r=\"17\"/><circle cx=\"170\" cy=\"150\" r=\"17\"/><circle cx=\"338\" cy=\"118\" r=\"17\"/><circle cx=\"404\" cy=\"300\" r=\"17\"/><circle cx=\"250\" cy=\"404\" r=\"17\"/></g><g fill=\"none\" stroke=\"#E8F1FF\" stroke-width=\"9\" stroke-linecap=\"round\"><circle cx=\"262\" cy=\"258\" r=\"40\"/><path d=\"M262 196V226M262 290V320M200 258H230M294 258H324\"/></g><circle cx=\"262\" cy=\"258\" r=\"8\" fill=\"#FB7185\"/></svg>"};

/* ---------- ΠΑΡΑΓΩΓΑ — μην τα πειράζεις ---------- */

// hub.html: λίστα tiles με τη σειρά εμφάνισης
g.HEXIS_TOOLS = CATALOG;

// tool.html: map id -> εργαλείο (χωρίς το primary)
g.HEXIS_TOOL_MAP = {};
CATALOG.forEach(function (t) { if (!t.primary) g.HEXIS_TOOL_MAP[t.id] = t; });

// admin.html: map module -> όνομα toggle (ένα ανά module/πακέτο)
g.HEXIS_MODULES = {};
CATALOG.forEach(function (t) {
  if (t.primary) return;
  var m = t.mod || t.id;
  if (!g.HEXIS_MODULES[m]) g.HEXIS_MODULES[m] = t.adminName || t.name;
});

// app.html: map module -> {name, price} για το modal ξεκλειδώματος
g.HEXIS_MODULE_INFO = {};
CATALOG.forEach(function (t) {
  if (t.primary) return;
  var m = t.mod || t.id;
  if (!g.HEXIS_MODULE_INFO[m]) g.HEXIS_MODULE_INFO[m] = { name: t.adminName || t.name, price: t.price || '' };
});

// sw.js: ποια .html των εργαλείων μπαίνουν στο precache
g.HEXIS_PRECACHE_HTML = CATALOG
  .filter(function (t) { return !t.external && t.href && /\.html$/.test(t.href); })
  .map(function (t) { return t.href; });

g.HEXIS_VERSION = VERSION;
g.HEXIS_OWNER_EMAILS = ['miltos.birbas@gmail.com','brb.develop@gmail.com'];
g.HEXIS_CATALOG = CATALOG;
g.HEXIS_CATEGORIES = CATEGORIES;
g.HEXIS_ICONS = ICONS;
g.HEXIS_TERRAIN_URL = BRB_TERRAIN_URL;

})(typeof self !== 'undefined' ? self : this);

/* ============================================================
   AUTO-ICON (v4.40): αντικατάσταση του ⚡ της κάρτας ΚΕΝΑΚ με το
   SVG εικονίδιο (icoSvg) ΧΩΡΙΣ καμία αλλαγή στο hub.html.
   Σαρώνει για στοιχεία-φύλλα με κείμενο ακριβώς «⚡» και βάζει το SVG.
   Ξαναπροσπαθεί έως 6" (αν το hub κάνει async render).
   ============================================================ */
(function(){
  if(typeof document==='undefined')return;
  var K=null;
  try{
    var L=(typeof HEXIS_TOOLS!=='undefined')?HEXIS_TOOLS:
      ((typeof self!=='undefined'&&self.HEXIS_TOOLS)||(typeof window!=='undefined'&&window.HEXIS_TOOLS)||[]);
    K=L.filter(function(t){return t.id==='kenak'&&t.icoSvg;})[0];
  }catch(e){}
  if(!K)return;
  var tries=0;
  function put(){
    tries++;
    var done=false;
    /* 0. Το hub έχει ΔΙΚΟ του map: var ICONS = {...} ΧΩΡΙΣ κλειδί kenak.
       Το προσθέτουμε (για κάθε μελλοντικό render)... */
    try{
      var IC=(typeof ICONS!=='undefined')?ICONS:(window.ICONS||null);
      if(IC&&!IC.kenak)IC.kenak='<svg style="width:100%;height:100%;display:block" '+
        K.icoSvg.replace(/^<svg /,'').replace('<svg ','');
      if(IC&&!IC.kenak)IC.kenak=K.icoSvg;
    }catch(e){}
    /* 1. ...και γεμίζουμε το ΗΔΗ αποδοσμένο άδειο slot: κάρτα με σύνδεσμο στο kenak.html */
    try{
      var links=document.querySelectorAll('a[href*="kenak"],[data-id="kenak"],[data-href*="kenak"]');
      for(var li=0;li<links.length;li++){
        var card=links[li];
        /* ανέβα έως 4 επίπεδα μέχρι να βρεις container με κείμενο της κάρτας */
        for(var up2=0;up2<4&&card&&!(card.textContent||'').includes('ΚΕΝΑΚ');up2++)card=card.parentElement;
        if(!card||card.querySelector('svg,img'))continue;
        /* κενό slot: στοιχείο χωρίς παιδιά-στοιχεία και χωρίς κείμενο */
        var cand=card.getElementsByTagName('*');
        for(var ci=0;ci<cand.length;ci++){
          var c2=cand[ci];
          if(c2.children.length===0&&(c2.textContent||'').trim()===''&&c2.tagName!=='BR'&&c2.tagName!=='HR'){
            c2.innerHTML=K.icoSvg;
            var sv2=c2.querySelector('svg');
            if(sv2){sv2.style.width='100%';sv2.style.height='100%';sv2.style.display='block';}
            done=true;break;
          }
        }
        if(done)break;
      }
    }catch(e){}
    var all=document.body?document.body.getElementsByTagName('*'):[];
    for(var i=0;i<all.length;i++){
      var el=all[i];
      if(el.children.length===0&&el.textContent&&el.textContent.trim()==='⚡'){
        el.innerHTML=K.icoSvg;
        var sv=el.querySelector('svg');
        if(sv){sv.style.width='100%';sv.style.height='100%';sv.style.display='block';}
        done=true;
      }
    }
    if(!done){
      /* Το hub δεν αποδίδει καθόλου το ico: βρες την κάρτα από τον ΤΙΤΛΟ της
         και βάλε το εικονίδιο πάνω από αυτόν (όπως στις άλλες κάρτες). */
      var heads=document.querySelectorAll('h1,h2,h3,h4,b,strong,div,span');
      for(var j=0;j<heads.length;j++){
        var h=heads[j];
        if(h.children.length>0)continue;
        if((h.textContent||'').trim()!=='ΚΕΝΑΚ Επιθεώρηση')continue;
        var card=h.parentElement;
        for(var up=0;up<3&&card;up++){
          if(card.querySelector('svg,img'))break;   /* έχει ήδη εικονίδιο */
          if(card.children.length>=2){break;}
          card=card.parentElement;
        }
        if(card&&!card.querySelector('svg,img')){
          h.insertAdjacentHTML('beforebegin',
            '<div style="width:46px;height:46px;margin:0 0 10px">'+K.icoSvg+'</div>');
          done=true;
        }
        break;
      }
    }
    if(!done&&tries<12)setTimeout(put,500);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',function(){setTimeout(put,50);});
  else setTimeout(put,50);
})();
