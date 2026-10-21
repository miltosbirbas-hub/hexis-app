// hexis-catalog.js → προσθήκη στο TOOLS (δωρεάν για κάθε συνδεδεμένο χρήστη, όπως το ΣΥΝΤΕΤΑΓΜΕΝΕΣ)
{
  id: 'paper2dxf',
  name: 'PAPER → DXF',
  title: 'Paper → DXF',
  desc: 'Παλιά σχέδια (PDF, JPG, TIFF) σε επεξεργάσιμο DXF: γραμμές, πολυγραμμές, τόξα, ελληνικά MTEXT, κλίμακα 1:1, 3D extrude τοίχων.',
  file: 'paper2dxf.html',
  icon: 'paper2dxf',        // κλειδί στο ICONS map (βλ. παρακάτω)
  free: true,
  tags: ['CAD', 'DXF', 'OCR', 'ψηφιοποίηση']
}

// ICONS map → νέο κλειδί
paper2dxf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h9l5 5v11a1 1 0 0 1-1 1H4z"/><path d="M13 4v5h5"/><path d="M7 17 11 10l3 4 3-3"/></svg>'

// sw.js precache: δημιουργείται από τον catalog· τα tessdata/*.gz και ocr-worker.js ΔΕΝ χρειάζονται precache (φορτώνονται μία φορά και μένουν στην cache του browser).
// VERSION bump στο hexis-catalog.js όπως πάντα.
