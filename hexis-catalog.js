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
var VERSION = 'v4.50';

var BRB_TERRAIN_URL = 'https://miltosbirbas-hub.github.io/BRB-contour-live/';

var CATALOG = [
  { id:'app', primary:true, ico:'🏗️', name:'Διαχείριση Έργων',
    desc:'Εργοτάξια · ημερολόγιο · φωτογραφίες με pins · εντολές · αναφορές PDF · συνεργάτες',
    href:'app.html' },

  { id:'nomothesia', ico:'⚖️', name:'Νομοθεσία',
    desc:'Κώδικας Ταγαρά 5306/26 · ΝΟΚ · Ν.4495 · Κτιριοδομικός + AI αναζήτηση',
    href:'nomothesia.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Όλη η πολεοδομική νομοθεσία σε ένα σημείο — με AI αναζήτηση που απαντάει σε φυσική γλώσσα.',
    feats:['Κώδικας Ταγαρά 5306/26','ΝΟΚ, Ν.4495/2017 και Κτιριοδομικός Κανονισμός','AI αναζήτηση: ρωτάς όπως θα ρωτούσες συνάδελφο','Παραπομπές σε άρθρα και διατάξεις'] },

  { id:'ktima', ico:'🗺️', name:"Κτηματολόγιο & ΕΓΣΑ'87",
    desc:'Χάρτης με συντεταγμένες · μετρήσεις · όρια κτηματολογίου',
    href:'ktimatologio.html', price:'50€ / έτος + ΦΠΑ',
    tagline:'Χάρτης με υπόβαθρο κτηματολογίου και συντεταγμένες ΕΓΣΑ΄87, στο χέρι σου.',
    feats:["Ζωντανές συντεταγμένες ΕΓΣΑ'87 σε κάθε σημείο",'Υπόβαθρο ορίων κτηματολογίου (WMS)','Μετρήσεις αποστάσεων και εμβαδών πάνω στον χάρτη','Ιδανικό για αυτοψίες και προέλεγχο ορίων'] },

  { id:'dxf', ico:'📐', name:'Check My DXF', adminName:'CAD Tools (DXF + LISP)',
    desc:'Έλεγχος διαγράμματος για Ηλεκτρονική Υποβολή ΕΚ · Πίνακας Ι · χάρτης — πακέτο CAD Tools μαζί με το LISP',
    href:'checkmydxf.html', price:'35€ / έτος + ΦΠΑ',
    tagline:'Έλεγχος διαγράμματος πριν την Ηλεκτρονική Υποβολή στο Κτηματολόγιο — χωρίς απορρίψεις.',
    feats:['Αυτόματος έλεγχος DXF για Ηλεκτρονική Υποβολή ΕΚ','Έλεγχος Πίνακα Ι και δομής αρχείου','Προεπισκόπηση σε χάρτη','Πακέτο CAD Tools: περιλαμβάνει και το LISP για AutoCAD/progeCAD'],
    note:'Το Check My DXF και το LISP HEXISCHECK/HEXISFIX πωλούνται μαζί ως ένα πακέτο (CAD Tools) — με μία ενεργοποίηση αποκτάς και τα δύο.' },

  { id:'kostos', ico:'💰', name:'Κόστος Άδειας',
    desc:'Προϋπολογισμός · Αμοιβές · Φόροι · ΕΦΚΑ · Συμφωνητικά · ΣΑΥ/ΦΑΥ · ΥΔ · XML',
    href:'adeia_kostos.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Πλήρης κοστολόγηση οικοδομικής άδειας: από τον προϋπολογισμό μέχρι το XML.',
    feats:['Συμβατικός προϋπολογισμός έργου','Αμοιβές μηχανικών, φόροι και κρατήσεις ΕΦΚΑ','Συμφωνητικά, ΣΑΥ/ΦΑΥ και Υπεύθυνες Δηλώσεις','Εξαγωγή XML για το e-Άδειες'] },

  { id:'domisi', ico:'📋', name:'Έλεγχος Δόμησης',
    desc:'Πόρισμα Ελεγκτών · Ν.4495/2017 · ΚΥΑ 299/2014 · αμοιβή',
    href:'elegxos.html', price:'40€ / έτος + ΦΠΑ',
    tagline:'Το πόρισμα του Ελεγκτή Δόμησης, δομημένο και χωρίς παραλείψεις.',
    feats:['Δομημένο πόρισμα κατά Ν.4495/2017','Έλεγχοι σύμφωνα με την ΚΥΑ 299/2014','Υπολογισμός αμοιβής ελεγκτή','Έτοιμο κείμενο για υποβολή'] },

  { id:'terrain', ico:'⛰️', name:'HEXIS Terrain',
    desc:"KMZ/KML → ΕΓΣΑ'87 · υψόμετρα DEM · ισοϋψείς · DXF εξαγωγή",
    href:BRB_TERRAIN_URL, external:true, price:'40€ / έτος + ΦΠΑ',
    tagline:'Από KMZ/KML σε τοπογραφικό υπόβαθρο ΕΓΣΑ΄87 — με υψόμετρα, ισοϋψείς και DXF.',
    feats:["Μετατροπή KMZ/KML σε ΕΓΣΑ'87",'Υψόμετρα από DEM σε κάθε κορυφή','Αυτόματες ισοϋψείς καμπύλες και TIN','Εξαγωγή έτοιμου DXF για το CAD σου'] },

  { id:'asbuilt', ico:'☁️', icoSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="48" height="48"><defs><linearGradient id="abog" x1="100" y1="120" x2="430" y2="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB02E"/><stop offset="1" stop-color="#E8772E"/></linearGradient><linearGradient id="abbgg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#12274A"/><stop offset="1" stop-color="#0A1730"/></linearGradient></defs><rect width="512" height="512" rx="104" fill="url(#abbgg)"/><rect x="10" y="10" width="492" height="492" rx="96" fill="none" stroke="#253B63" stroke-width="4"/><g stroke="#4D8DFF" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 22" opacity=".95"><line x1="180" y1="322" x2="150" y2="416"/><line x1="262" y1="326" x2="262" y2="420"/><line x1="344" y1="322" x2="376" y2="412"/></g><path d="M74 436 L160 436 L196 456 L252 456 L288 436 L344 420 L438 420" fill="none" stroke="#EEF2F8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="108" cy="235" r="9" fill="url(#abog)"/><circle cx="111" cy="214" r="9" fill="url(#abog)"/><circle cx="120" cy="195" r="9" fill="url(#abog)"/><circle cx="134" cy="179" r="9" fill="url(#abog)"/><circle cx="152" cy="168" r="9" fill="url(#abog)"/><circle cx="173" cy="163" r="9" fill="url(#abog)"/><circle cx="187" cy="145" r="9" fill="url(#abog)"/><circle cx="197" cy="130" r="9" fill="url(#abog)"/><circle cx="210" cy="117" r="9" fill="url(#abog)"/><circle cx="225" cy="107" r="9" fill="url(#abog)"/><circle cx="241" cy="100" r="9" fill="url(#abog)"/><circle cx="259" cy="96" r="9" fill="url(#abog)"/><circle cx="277" cy="96" r="9" fill="url(#abog)"/><circle cx="295" cy="100" r="9" fill="url(#abog)"/><circle cx="311" cy="107" r="9" fill="url(#abog)"/><circle cx="326" cy="117" r="9" fill="url(#abog)"/><circle cx="339" cy="130" r="9" fill="url(#abog)"/><circle cx="349" cy="145" r="9" fill="url(#abog)"/><circle cx="356" cy="161" r="9" fill="url(#abog)"/><circle cx="358" cy="178" r="9" fill="url(#abog)"/><circle cx="376" cy="183" r="9" fill="url(#abog)"/><circle cx="393" cy="193" r="9" fill="url(#abog)"/><circle cx="405" cy="206" r="9" fill="url(#abog)"/><circle cx="413" cy="223" r="9" fill="url(#abog)"/><circle cx="416" cy="242" r="9" fill="url(#abog)"/><circle cx="413" cy="261" r="9" fill="url(#abog)"/><circle cx="405" cy="278" r="9" fill="url(#abog)"/><circle cx="393" cy="291" r="9" fill="url(#abog)"/><circle cx="376" cy="301" r="9" fill="url(#abog)"/><circle cx="358" cy="306" r="9" fill="url(#abog)"/><circle cx="340" cy="305" r="9" fill="url(#abog)"/><circle cx="322" cy="298" r="9" fill="url(#abog)"/><circle cx="299" cy="278" r="9" fill="url(#abog)"/><circle cx="277" cy="280" r="9" fill="url(#abog)"/><circle cx="259" cy="280" r="9" fill="url(#abog)"/><circle cx="241" cy="276" r="9" fill="url(#abog)"/><circle cx="226" cy="291" r="9" fill="url(#abog)"/><circle cx="208" cy="302" r="9" fill="url(#abog)"/><circle cx="187" cy="307" r="9" fill="url(#abog)"/><circle cx="166" cy="306" r="9" fill="url(#abog)"/><circle cx="146" cy="298" r="9" fill="url(#abog)"/><circle cx="129" cy="286" r="9" fill="url(#abog)"/><circle cx="117" cy="269" r="9" fill="url(#abog)"/><circle cx="281" cy="186" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="174" cy="225" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="324" cy="197" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="214" cy="225" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="358" cy="246" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="262" cy="240" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="238" cy="192" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="304" cy="147" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="198" cy="186" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="170" cy="259" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="252" cy="153" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="308" cy="243" r="5.5" fill="#FFB02E" opacity=".85"/><circle cx="209" cy="259" r="5.5" fill="#FFB02E" opacity=".85"/></svg>', name:'AS-BUILT CLOUD',
    desc:'Πάχος κατασκευών & όγκοι cut/fill από νέφη σημείων · χάρτες με κλίμακες · Τεχνική Έκθεση PDF',
    href:'asbuilt.html', price:'80€ / έτος + ΦΠΑ',
    tagline:'Από δύο αποτυπώσεις σε τεκμηριωμένη επιμέτρηση — πάχη as-built και χωματουργικά με ένα κλικ.',
    feats:['Πραγματικό πάχος κατασκευής έναντι μελέτης, με ανοχές και φίλτρο αντικειμένων','Όγκοι εκσκαφών–επιχώσεων (cut/fill) με κατώφλι θορύβου αποτύπωσης','Δέχεται νέφη ASCII/OBJ και ισοϋψείς τοπογραφικού DXF','Τεχνική έκθεση PDF με υψομετρικούς χάρτες, ιστόγραμμα και στατιστικά — όλα τοπικά στη συσκευή'] },

  { id:'mpeton', ico:'🧱', name:'Σκυρόδεμα & Τοιχοποιία',
    desc:'Αναλογίες μπετόν C12/15–C40 · τούβλα · σενάζ · λάσπη',
    href:'mpeton.html', price:'20€ / έτος + ΦΠΑ',
    tagline:'Υπολογιστές ποσοτήτων για σκυρόδεμα και τοιχοποιία, επί τόπου του έργου — από το κινητό σου.',
    feats:['Αναλογίες μπετόν για όλες τις κατηγορίες C12/15 έως C40','Υπολογισμός τούβλων και σενάζ ανά τοιχοποιία','Ξεχωριστή καρτέλα για λάσπη / κονιάματα','Δουλεύει offline στο εργοτάξιο (PWA)'] },

  { id:'stegh', ico:'🏠', name:'Στέγη & Προμέτρηση',
    desc:'Σχεδιάζεις το περίγραμμα στο κινητό · μαχιές · ντερέδες · υψόμετρα · ποσότητες υλικών σε PDF',
    href:'stegh.html', price:'40€ / έτος + ΦΠΑ',
    tagline:'Σχεδιάζεις το περίγραμμα της στέγης με το δάχτυλο και παίρνεις τις ποσότητες — επί τόπου, χωρίς σήμα.',
    feats:['Αυτόματη επίλυση: μαχιές, ντερέδες, κορφιάδες και υψόμετρα σε κάθε κόμβο','Κεραμίδια, καβαλλάρηδες, ακροκέραμα, ξυλεία, μόνωση και μεμβράνες','Φορτία χιονιού και ανέμου κατά Ευρωκώδικα 1 (Ελληνικό Εθνικό Προσάρτημα)','Εξαγωγή PDF με σχέδιο κάτοψης και πίνακες — δουλεύει offline (PWA)'],
    note:'Στη LISP Βιβλιοθήκη CAD περιλαμβάνεται και η εντολή STEGH για AutoCAD/progeCAD: κάτοψη, ξυλότυπος, ανάπτυγμα και τομή ζευκτού.' },

  { id:'rtk', ico:'🛰️', name:'RTK Checklist',
    desc:'Στήσιμο Base + Rover · γνωστό σημείο / localization',
    href:'rtk_checklist.html', price:'20€ / έτος + ΦΠΑ',
    tagline:'Η λίστα ελέγχου που εξασφαλίζει σωστές μετρήσεις GNSS — πριν χάσεις μια μέρα στο πεδίο.',
    feats:['Βήμα-βήμα στήσιμο Base + Rover','Έλεγχος σε γνωστό σημείο / localization','Έλεγχοι FIX, PDOP και ύψους κεραίας','Offline PWA — δουλεύει και χωρίς σήμα'] },

  { id:'routeprep', ico:'🛩️', name:'Route Prep · Drone',
    desc:'KML/KMZ → DJI Pilot 2 · καθάρισμα ορίου · οδηγός αποστολής & checklist Mavic 3E',
    href:'routeprep.html', price:'20€ / έτος + ΦΠΑ',
    tagline:'Από το όριο του γεωτεμαχίου σε έτοιμη αποστολή χαρτογράφησης στο DJI Pilot 2 — σε δύο λεπτά.',
    feats:['Καθαρίζει KML/KMZ από Κτηματολόγιο & Google Earth (styles, folders, label points)','Έτοιμο KMZ για import ως Area Route (Mapping) στο DJI Pilot 2','Οδηγός αποστολής 5 βημάτων: εξαγωγή → καθάρισμα → import → ρυθμίσεις → checklist','Πίνακας ύψους/GSD για Mavic 3E και checklist πεδίου — δουλεύει offline (PWA)'] },

  { id:'kenak', ico:'⚡', icoSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"> <polygon points="19,6 33.7,14.5 33.7,31.5 19,40 4.3,31.5 4.3,14.5" fill="#FFFFFF" stroke="#E8772E" stroke-width="2.4" stroke-linejoin="round"/> <g stroke="#FFFFFF" stroke-width="0.7"> <path d="M10 14.9 h14   l3.4 1.7 l-3.4 1.7 h-14 z"   fill="#0B7A3B"/> <path d="M10 19.1 h18.5 l3.4 1.7 l-3.4 1.7 h-18.5 z" fill="#F2C21C"/> <path d="M10 23.3 h23   l3.4 1.7 l-3.4 1.7 h-23 z"   fill="#E06A22"/> <path d="M10 27.5 h27.5 l3.4 1.7 l-3.4 1.7 h-27.5 z" fill="#C43A2B"/> </g> <path d="M33.7 14.5 L19 6 L4.3 14.5 V31.5 L19 40 L33.7 31.5" fill="none" stroke="#E8772E" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/> <text x="10.8" y="18.1" font-family="Arial,Helvetica,sans-serif" font-size="4.1" font-weight="900" fill="#FFFFFF">Α+</text> </svg>', name:'ΚΕΝΑΚ Επιθεώρηση (Beta)',
    desc:'Σκαρίφημα κάτοψης · κουφώματα · σκιάσεις · όροφοι · έλεγχοι ΤΟΤΕΕ · XML ΤΕΕ-ΚΕΝΑΚ',
    href:'kenak.html', price:'Δωρεάν όσο διαρκεί το Beta',
    tagline:'Από την αυτοψία στο XML του ΤΕΕ-ΚΕΝΑΚ — σχεδιάζεις την κάτοψη, βγαίνουν όψεις, σκιάσεις, συστήματα και σενάρια, έτοιμα για import.',
    feats:['Σχεδιαστικό με ΚΑΕΚ υπόβαθρο, κουφώματα, ύψη ανά τοίχο, ορόφους','Γωνίες σκίασης και συντελεστές F από τους πίνακες ΤΟΤΕΕ','Έλεγχος ορθότητας συστημάτων (λέβητες, ΑΘ, SEER) πριν την εξαγωγή','XML ΤΕΕ-ΚΕΝΑΚ 1.31 με κέλυφος, συστήματα και σενάρια — δοκιμασμένο σε πραγματικά αρχεία'],
    note:'Beta έκδοση — η εξαγωγή XML είναι δωρεάν κατά τη δοκιμαστική περίοδο. Η τιμολόγηση ανά ΠΕΑ θα ανακοινωθεί με την επίσημη κυκλοφορία.' },

  { id:'lisp', mod:'dxf', ico:'⬇️', name:'LISP Βιβλιοθήκη CAD',
    desc:'HEXISCHECK/HEXISFIX · STEGH στέγη & ξυλότυπος · EXPTXT εξαγωγή σημείων TXT · νέες ρουτίνες AutoLISP συνεχώς — AutoCAD & progeCAD',
    href:'lisplib.html', price:'35€ / έτος + ΦΠΑ',
    tagline:'Ρουτίνες AutoLISP για AutoCAD & progeCAD — βιβλιοθήκη που μεγαλώνει συνεχώς.',
    feats:['HEXISCHECK / HEXISFIX: έλεγχος & αυτόματες διορθώσεις πριν την εξαγωγή DXF','STEGH: επίλυση στέγης, ξυλότυπος, ανάπτυγμα εδρών και τομή ζευκτού','EXPTXT / EXPTXTA: εξαγωγή σημείων σε TXT (Α/Α,Χ,Υ,Ζ) για ΤΕΚΤΩΝ, GNSS, Excel','Νέες εντολές προστίθενται χωρίς επιπλέον χρέωση'],
    note:'Η LISP Βιβλιοθήκη και το Check My DXF πωλούνται μαζί ως ένα πακέτο (CAD Tools) — με μία ενεργοποίηση αποκτάς όλα.' }
];

var ICONS = {"asbuilt": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><defs><linearGradient id=\"abog\" x1=\"100\" y1=\"120\" x2=\"430\" y2=\"320\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFB02E\"/><stop offset=\"1\" stop-color=\"#E8772E\"/></linearGradient><linearGradient id=\"abbgg\" x1=\"0\" y1=\"0\" x2=\"512\" y2=\"512\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#12274A\"/><stop offset=\"1\" stop-color=\"#0A1730\"/></linearGradient></defs><rect width=\"512\" height=\"512\" rx=\"104\" fill=\"url(#abbgg)\"/><rect x=\"10\" y=\"10\" width=\"492\" height=\"492\" rx=\"96\" fill=\"none\" stroke=\"#253B63\" stroke-width=\"4\"/><g stroke=\"#4D8DFF\" stroke-width=\"7\" stroke-linecap=\"round\" stroke-dasharray=\"2 22\" opacity=\".95\"><line x1=\"180\" y1=\"322\" x2=\"150\" y2=\"416\"/><line x1=\"262\" y1=\"326\" x2=\"262\" y2=\"420\"/><line x1=\"344\" y1=\"322\" x2=\"376\" y2=\"412\"/></g><path d=\"M74 436 L160 436 L196 456 L252 456 L288 436 L344 420 L438 420\" fill=\"none\" stroke=\"#EEF2F8\" stroke-width=\"14\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"108\" cy=\"235\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"111\" cy=\"214\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"120\" cy=\"195\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"134\" cy=\"179\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"152\" cy=\"168\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"173\" cy=\"163\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"187\" cy=\"145\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"197\" cy=\"130\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"210\" cy=\"117\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"225\" cy=\"107\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"241\" cy=\"100\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"259\" cy=\"96\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"277\" cy=\"96\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"295\" cy=\"100\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"311\" cy=\"107\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"326\" cy=\"117\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"339\" cy=\"130\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"349\" cy=\"145\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"356\" cy=\"161\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"358\" cy=\"178\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"376\" cy=\"183\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"393\" cy=\"193\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"405\" cy=\"206\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"413\" cy=\"223\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"416\" cy=\"242\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"413\" cy=\"261\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"405\" cy=\"278\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"393\" cy=\"291\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"376\" cy=\"301\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"358\" cy=\"306\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"340\" cy=\"305\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"322\" cy=\"298\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"299\" cy=\"278\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"277\" cy=\"280\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"259\" cy=\"280\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"241\" cy=\"276\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"226\" cy=\"291\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"208\" cy=\"302\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"187\" cy=\"307\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"166\" cy=\"306\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"146\" cy=\"298\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"129\" cy=\"286\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"117\" cy=\"269\" r=\"9\" fill=\"url(#abog)\"/><circle cx=\"281\" cy=\"186\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"174\" cy=\"225\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"324\" cy=\"197\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"214\" cy=\"225\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"358\" cy=\"246\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"262\" cy=\"240\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"238\" cy=\"192\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"304\" cy=\"147\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"198\" cy=\"186\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"170\" cy=\"259\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"252\" cy=\"153\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"308\" cy=\"243\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/><circle cx=\"209\" cy=\"259\" r=\"5.5\" fill=\"#FFB02E\" opacity=\".85\"/></svg>", "kenak": "<svg style=\"width:100%;height:100%;display:block\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" width=\"48\" height=\"48\"> <polygon points=\"19,6 33.7,14.5 33.7,31.5 19,40 4.3,31.5 4.3,14.5\" fill=\"#FFFFFF\" stroke=\"#E8772E\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/> <g stroke=\"#FFFFFF\" stroke-width=\"0.7\"> <path d=\"M10 14.9 h14   l3.4 1.7 l-3.4 1.7 h-14 z\"   fill=\"#0B7A3B\"/> <path d=\"M10 19.1 h18.5 l3.4 1.7 l-3.4 1.7 h-18.5 z\" fill=\"#F2C21C\"/> <path d=\"M10 23.3 h23   l3.4 1.7 l-3.4 1.7 h-23 z\"   fill=\"#E06A22\"/> <path d=\"M10 27.5 h27.5 l3.4 1.7 l-3.4 1.7 h-27.5 z\" fill=\"#C43A2B\"/> </g> <path d=\"M33.7 14.5 L19 6 L4.3 14.5 V31.5 L19 40 L33.7 31.5\" fill=\"none\" stroke=\"#E8772E\" stroke-width=\"2.4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <text x=\"10.8\" y=\"18.1\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"4.1\" font-weight=\"900\" fill=\"#FFFFFF\">Α+</text> </svg>", "app": "<img src=\"icon-192.png\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain;border-radius:10px\">", "mpeton": "<svg style=\"width:100%;height:100%;display:block\"  viewBox=\"0 0 40 40\"><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\"/><circle cx=\"20\" cy=\"20\" r=\"6.2\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\"/></svg>", "rtk": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\" stroke-linejoin=\"round\"/> <g transform=\"translate(26.6 11.6) rotate(45)\" fill=\"#e9a826\"> <rect x=\"-1.7\" y=\"-1.3\" width=\"3.4\" height=\"2.6\" rx=\"0.5\"/> <rect x=\"-5.6\" y=\"-0.8\" width=\"3.1\" height=\"1.6\" rx=\"0.3\"/> <rect x=\"2.5\" y=\"-0.8\" width=\"3.1\" height=\"1.6\" rx=\"0.3\"/> </g> <g fill=\"none\" stroke=\"#e9a826\" stroke-width=\"1.7\" stroke-linecap=\"round\"> <path d=\"M22.6 17.4 A7.4 7.4 0 0 0 17.6 22.2\"/> <path d=\"M20.2 14.4 A11.4 11.4 0 0 0 12.6 21.8\"/> </g> <g stroke=\"#e9a826\" stroke-width=\"1.9\" stroke-linecap=\"round\" fill=\"none\"> <ellipse cx=\"13.6\" cy=\"23.6\" rx=\"3.1\" ry=\"1.25\" fill=\"#e9a826\" stroke=\"none\"/> <line x1=\"13.6\" y1=\"24.6\" x2=\"13.6\" y2=\"27.2\"/> <path d=\"M13.6 27.2 L10.2 32.8 M13.6 27.2 L17 32.8 M13.6 27.2 L13.6 32.8\"/> </g></svg>", "ktima": "<svg style=\"width:100%;height:100%;display:block\"  viewBox=\"0 0 22 22\" fill=\"none\"> <rect x=\"1.5\" y=\"1.5\" width=\"19\" height=\"19\" rx=\"2\" stroke=\"#22d3ee\" stroke-width=\"1.3\"/> <line x1=\"7.8\" y1=\"1.5\" x2=\"7.8\" y2=\"20.5\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <line x1=\"14.2\" y1=\"1.5\" x2=\"14.2\" y2=\"20.5\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <line x1=\"1.5\" y1=\"7.8\" x2=\"20.5\" y2=\"7.8\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <line x1=\"1.5\" y1=\"14.2\" x2=\"20.5\" y2=\"14.2\" stroke=\"#22d3ee\" stroke-width=\"0.9\" opacity=\"0.75\"/> <circle cx=\"11\" cy=\"11\" r=\"2\" fill=\"#67e8f9\"/> </svg>", "dxf": "<svg style=\"width:100%;height:100%;display:block\"  class=\"hxlogo\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"> <polygon points=\"50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/> <polygon points=\"27.1,63.2 31.5,37.7 52.2,28.9 72,45.6 66.7,68.5 45.6,72\" fill=\"#FDF3E3\" stroke=\"#1B2530\" stroke-width=\"3.6\" stroke-linejoin=\"round\"/> <g fill=\"#1B2530\"> <circle cx=\"27.1\" cy=\"63.2\" r=\"2.7\"/><circle cx=\"31.5\" cy=\"37.7\" r=\"2.7\"/><circle cx=\"52.2\" cy=\"28.9\" r=\"2.7\"/> <circle cx=\"72\" cy=\"45.6\" r=\"2.7\"/><circle cx=\"66.7\" cy=\"68.5\" r=\"2.7\"/><circle cx=\"45.6\" cy=\"72\" r=\"2.7\"/> </g> <polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#1F4E9C\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#39FF14\" stroke-width=\"9.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </svg>", "lisp": "<svg style=\"width:100%;height:100%;display:block\"  class=\"hxlogo\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"> <polygon points=\"50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28\" fill=\"none\" stroke=\"#D97706\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/> <polygon points=\"27.1,63.2 31.5,37.7 52.2,28.9 72,45.6 66.7,68.5 45.6,72\" fill=\"#FDF3E3\" stroke=\"#1B2530\" stroke-width=\"3.6\" stroke-linejoin=\"round\"/> <g fill=\"#1B2530\"> <circle cx=\"27.1\" cy=\"63.2\" r=\"2.7\"/><circle cx=\"31.5\" cy=\"37.7\" r=\"2.7\"/><circle cx=\"52.2\" cy=\"28.9\" r=\"2.7\"/> <circle cx=\"72\" cy=\"45.6\" r=\"2.7\"/><circle cx=\"66.7\" cy=\"68.5\" r=\"2.7\"/><circle cx=\"45.6\" cy=\"72\" r=\"2.7\"/> </g> <polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#1F4E9C\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><polyline points=\"36.8,50.9 47.8,62.3 70.2,35.0\" fill=\"none\" stroke=\"#39FF14\" stroke-width=\"9.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </svg>", "domisi": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 48 48\"><defs><linearGradient id=\"edg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e9a826\"/><stop offset=\"1\" stop-color=\"#f6c453\"/></linearGradient></defs><rect width=\"48\" height=\"48\" rx=\"10\" fill=\"url(#edg)\"/><text x=\"24\" y=\"31\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"18\" font-weight=\"800\" fill=\"#fff\">ΕΔ</text></svg>", "nomothesia": "<img src=\"nomothesia-icon-192.png\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain;border-radius:10px\">", "stegh": "<img src=\"stegh-icon-192.png\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain;border-radius:10px\">", "kostos": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 48 48\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"24,4.5 40.9,14.2 40.9,33.8 24,43.5 7.1,33.8 7.1,14.2\" fill=\"none\" stroke=\"#1F4E9C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><text x=\"24\" y=\"32\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"21\" font-weight=\"800\" fill=\"#1F4E9C\">€</text></svg>", "terrain": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><clipPath id=\"hxTclip\"><path d=\"M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z\"/></clipPath></defs><g clip-path=\"url(#hxTclip)\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M4.2 18.5C4.6 13.8 7 9.6 10.6 8.2c3.8-1.5 8 .4 9.6 4 1.4 3.2.6 7-1.8 9.6\" stroke=\"#F26B21\" stroke-width=\"1\" opacity=\"0.45\"/><path d=\"M6.2 19.6c0-3.9 1.9-7.4 5-8.5 3.1-1.1 6.4.5 7.6 3.4 1.1 2.6.3 5.6-1.7 7.7\" stroke=\"#F26B21\" stroke-width=\"1.5\" opacity=\"0.75\"/><path d=\"M8.4 20.4c.1-2.8 1.5-5.2 3.7-6 2.2-.8 4.6.4 5.4 2.5.7 1.9 0 4-1.4 5.5\" stroke=\"#F26B21\" stroke-width=\"1\" opacity=\"0.45\"/><path d=\"M10.7 21c.2-1.8 1.1-3.2 2.4-3.7 1.4-.5 2.8.3 3.3 1.6.4 1.1 0 2.4-.8 3.3\" stroke=\"#F26B21\" stroke-width=\"1.5\" opacity=\"0.75\"/><circle cx=\"13.6\" cy=\"19.4\" r=\"0.75\" fill=\"#F26B21\" stroke=\"none\"/></g><path d=\"M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z\" stroke=\"#F26B21\" stroke-width=\"1.8\"/></svg>", "routeprep": "<svg style=\"width:100%;height:100%;display:block\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"20,3 33.9,11 33.9,29 20,37 6.1,29 6.1,11\" fill=\"none\" stroke=\"#e9a826\" stroke-width=\"2.6\" stroke-linejoin=\"round\"/><g stroke=\"#e9a826\" stroke-width=\"1.8\" stroke-linecap=\"round\"><line x1=\"17.2\" y1=\"17.2\" x2=\"13.8\" y2=\"13.8\"/><line x1=\"22.8\" y1=\"17.2\" x2=\"26.2\" y2=\"13.8\"/><line x1=\"17.2\" y1=\"22.8\" x2=\"13.8\" y2=\"26.2\"/><line x1=\"22.8\" y1=\"22.8\" x2=\"26.2\" y2=\"26.2\"/></g><g fill=\"none\" stroke=\"#e9a826\" stroke-width=\"1.8\"><circle cx=\"13\" cy=\"13\" r=\"3.2\"/><circle cx=\"27\" cy=\"13\" r=\"3.2\"/><circle cx=\"13\" cy=\"27\" r=\"3.2\"/><circle cx=\"27\" cy=\"27\" r=\"3.2\"/></g><rect x=\"16.6\" y=\"17\" width=\"6.8\" height=\"6\" rx=\"1.6\" fill=\"#e9a826\"/></svg>"};

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
g.HEXIS_CATALOG = CATALOG;
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
