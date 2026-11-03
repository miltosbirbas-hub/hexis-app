// HEXIS PAD — κατασκευαστές δεκτών (ελληνική αγορά) και οικογένειες εντολών διαμόρφωσης
// Οι εντολές εμφανίζονται πάντα στον χρήστη για έλεγχο/διόρθωση πριν σταλούν.
(function (g) {
  'use strict';

  // {lat} {lon} σε δεκαδικές μοίρες, {h} ελλειψοειδές ύψος ARP (m), {port} θύρα εξόδου διορθώσεων
  const FAMILIES = {
    unicore: {
      name: 'Unicore (UM980 / UM982 / UB4B0)',
      rover: ['MODE ROVER', 'GPGGA COM1 1', 'GPGST COM1 1', 'GPGSA COM1 1', 'GPRMC COM1 1', 'SAVECONFIG'],
      baseFixed: ['MODE BASE {lat} {lon} {h}', 'RTCM1006 {port} 10', 'RTCM1033 {port} 10', 'RTCM1074 {port} 1', 'RTCM1084 {port} 1', 'RTCM1094 {port} 1', 'RTCM1124 {port} 1', 'SAVECONFIG'],
      baseHere: ['MODE BASE TIME 120 1.5 2.5', 'RTCM1006 {port} 10', 'RTCM1033 {port} 10', 'RTCM1074 {port} 1', 'RTCM1084 {port} 1', 'RTCM1094 {port} 1', 'RTCM1124 {port} 1', 'SAVECONFIG'],
      ports: ['COM2', 'COM1', 'COM3'], note: 'Το ύψος στο MODE BASE: έλεγξε στο εγχειρίδιο αν ζητείται ελλειψοειδές ή ορθομετρικό.',
    },
    novatel: {
      name: 'NovAtel OEM / ComNav (Sinognss) — εντολές τύπου LOG / FIX',
      rover: ['FIX NONE', 'LOG COM1 GPGGA ONTIME 1', 'LOG COM1 GPGST ONTIME 1', 'LOG COM1 GPGSA ONTIME 1', 'LOG COM1 GPRMC ONTIME 1', 'SAVECONFIG'],
      baseFixed: ['FIX POSITION {lat} {lon} {hmsl}', 'LOG {port} RTCM1006 ONTIME 10', 'LOG {port} RTCM1033 ONTIME 10', 'LOG {port} RTCM1074 ONTIME 1', 'LOG {port} RTCM1084 ONTIME 1', 'LOG {port} RTCM1094 ONTIME 1', 'LOG {port} RTCM1124 ONTIME 1', 'SAVECONFIG'],
      baseHere: ['POSAVE ON 0.05', 'LOG {port} RTCM1006 ONTIME 10', 'LOG {port} RTCM1033 ONTIME 10', 'LOG {port} RTCM1074 ONTIME 1', 'LOG {port} RTCM1084 ONTIME 1', 'LOG {port} RTCM1094 ONTIME 1', 'SAVECONFIG'],
      ports: ['COM2', 'COM1', 'COM3'], note: 'Το FIX POSITION δέχεται ύψος πάνω από τη μέση στάθμη θάλασσας (MSL).',
    },
    septentrio: {
      name: 'Septentrio (mosaic / AsteRx)',
      rover: ['setPVTMode, Rover, all, auto', 'setNMEAOutput, Stream1, COM1, GGA+GST+GSA+RMC, sec1'],
      baseFixed: ['setStaticPosGeodetic, Geodetic1, {lat}, {lon}, {h}', 'setPVTMode, Static, , Geodetic1', 'setDataInOut, {port}, , RTCMv3', 'setRTCMv3Output, {port}, RTCM1006+RTCM1033+MSM4'],
      baseHere: ['setPVTMode, Static, , auto', 'setDataInOut, {port}, , RTCMv3', 'setRTCMv3Output, {port}, RTCM1006+RTCM1033+MSM4'],
      ports: ['COM2', 'COM1', 'USB1'], note: '',
    },
    ublox: {
      name: 'u-blox ZED-F9P (Emlid, ArduSimple κ.ά.)', rover: [], baseFixed: [], baseHere: [], ports: [],
      note: 'Η διαμόρφωση γίνεται από την εφαρμογή/σελίδα του κατασκευαστή (π.χ. Reach Panel). Η HEXIS PAD διαβάζει NMEA και στέλνει NTRIP.',
    },
    nmea: {
      name: 'Μόνο NMEA (κλειστό λογισμικό κατασκευαστή)', rover: [], baseFixed: [], baseHere: [], ports: [],
      note: 'Η βάση και το ράδιο ρυθμίζονται από το λογισμικό/πάνελ του κατασκευαστή. Στη HEXIS PAD: rover μέσω NMEA (Bluetooth), NTRIP, αποτύπωση, χάραξη, QC.',
    },
  };

  // Μάρκες στην ελληνική αγορά. Η «οικογένεια» είναι η τυπική — άλλαξέ την αν το μοντέλο σου έχει άλλη πλακέτα.
  const BRANDS = [
    { id: 'chc', name: 'CHC Navigation (i73, i83, i93, X-series)', fam: 'nmea' },
    { id: 'south', name: 'South (Galaxy G1/G6/G7, Insight)', fam: 'unicore' },
    { id: 'stonex', name: 'Stonex (S700A, S900A, S990A, S580)', fam: 'unicore' },
    { id: 'hitarget', name: 'Hi-Target (V200, V300, iRTK)', fam: 'unicore' },
    { id: 'comnav', name: 'ComNav (T300, T30, N3)', fam: 'novatel' },
    { id: 'singular', name: 'Singular XYZ (L1, X1, Y1, E1)', fam: 'unicore' },
    { id: 'kolida', name: 'Kolida (K-series)', fam: 'unicore' },
    { id: 'ruide', name: 'Ruide (R-series)', fam: 'unicore' },
    { id: 'tersus', name: 'Tersus (Oscar, David)', fam: 'novatel' },
    { id: 'satlab', name: 'SatLab (SL900, Geo)', fam: 'unicore' },
    { id: 'foif', name: 'FOIF (A-series)', fam: 'unicore' },
    { id: 'emlid', name: 'Emlid (Reach RS2+, RS3, RX)', fam: 'ublox' },
    { id: 'ardusimple', name: 'ArduSimple / u-blox F9P', fam: 'ublox' },
    { id: 'septentrio', name: 'Septentrio (Altus NR3)', fam: 'septentrio' },
    { id: 'leica', name: 'Leica (GS18, GS16, GS07)', fam: 'nmea' },
    { id: 'geomax', name: 'GeoMax (Zenith 40/60)', fam: 'nmea' },
    { id: 'trimble', name: 'Trimble (R12, R10, R8, R2)', fam: 'nmea' },
    { id: 'spectra', name: 'Spectra Geospatial (SP85, SP60)', fam: 'nmea' },
    { id: 'topcon', name: 'Topcon (HiPer VR, HiPer HR)', fam: 'nmea' },
    { id: 'sokkia', name: 'Sokkia (GRX3, GCX3)', fam: 'nmea' },
    { id: 'other', name: 'Άλλος δέκτης NMEA', fam: 'nmea' },
  ];

  function fill(tpl, v) {
    return tpl.map(l => l.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m));
  }

  g.HRCV = { FAMILIES, BRANDS, fill };
})(window);
