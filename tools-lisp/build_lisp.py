# Χτίζει τις εκδόσεις AutoCAD (\U+XXXX) και progeCAD (ANSI 1253) του HEXISNET
# και περνάει τη σύνδεση «από ΚΑΕΚ» στα OROIDOM / DILOSI. Τρέχει μία φορά (idempotent).
import re, os, sys
R = os.path.dirname(os.path.abspath(__file__)) + "/.."
def U(s):   # AutoCAD: όλα τα μη-ASCII ως \U+XXXX
    return "".join(c if ord(c) < 128 else "\\U+%04X" % ord(c) for c in s)
def rd(p):
    b = open(p, "rb").read()
    return b.decode("cp1253"), (b"\r\n" in b)
def wr(p, s, crlf):
    s = s.replace("\r\n", "\n")
    if crlf: s = s.replace("\n", "\r\n")
    open(p, "wb").write(s.encode("cp1253"))

# ---------- HEXISNET ----------
src = open(R + "/tools-lisp/HEXISNET.src.lsp", encoding="utf-8").read()
acad = "\n".join(ln if ("label = \\\"" in ln or ln.lstrip().startswith(";;;")) else U(ln) for ln in src.split("\n"))
acad = acad.replace(";;; Σύνδεση AutoCAD / progeCAD", ";;; Σύνδεση AutoCAD / progeCAD")
wr(R + "/HEXISNET.lsp", acad, True)
prog = src.replace(";;; ================================================================\n(vl-load-com)",
                   ";;; Έκδοση για progeCAD — κωδικοποίηση ANSI Windows-1253 (Ελληνικά)\n;;; ================================================================\n(vl-load-com)", 1)
wr(R + "/HEXISNET_ProgeCAD.lsp", prog, True)

# ---------- OROIDOM ----------
LOADER = '''      (if (null hx:oroi)
        (if (findfile "HEXISNET.lsp") (load (findfile "HEXISNET.lsp"))
          (if (findfile "HEXISNET_ProgeCAD.lsp") (load (findfile "HEXISNET_ProgeCAD.lsp")))))
      (if (null hx:oroi)
        (progn (princ (strcat "\\n" "Δεν βρέθηκε το HEXISNET.lsp — φόρτωσέ το με APPLOAD.")) (exit)))'''
def patch_oroidom(path, esc):
    s, crlf = rd(path); s = s.replace("\r\n", "\n")
    if "HEXIS-APP" in s and "kaekd" in s: print("OROIDOM ήδη:", path); return
    T = (lambda x: U(x)) if esc else (lambda x: x)
    def rep(a, b, cnt=1):
        nonlocal s
        a2 = T(a); assert s.count(a2) == cnt, (path, a[:60], s.count(a2)); s = s.replace(a2, T(b))
    rep('(defun C:OROIDOM ( / *error* od-txt od-hline od-len', '(defun C:OROIDOM ( / *error* od-txt od-hline od-len kaekd')
    rep('(initget 1 "1 2 3 4")', '(initget 1 "1 2 3 4 5")')
    rep('"\\n[1/2/3/4]: ")))', '"\\n" "  5  από ΚΑΕΚ (HEXIS-APP: Ενιαίος Ψηφιακός Χάρτης)"\n    "\\n[1/2/3/4/5]: ")))')
    rep('''  (if (member mode (list "2" "3"))
    (setq fek''', '''  (if (= mode "5")
    (progn
''' + LOADER + '''
      (setq kaekd (hx:oroi (getstring (strcat "\\n" "ΚΑΕΚ: "))))
      (if (null kaekd) (exit))))

  (if (member mode (list "2" "3"))
    (setq fek''')
    rep('''  (setq onom (getstring T (strcat "\\n" "Οικισμός/Περιοχή: ")))''', '''  (setq onom (if (= mode "5")
    (cond ((/= (hx:v kaekd "OIKISMOS") "") (hx:v kaekd "OIKISMOS"))
          ((/= (hx:v kaekd "DIMOS") "") (strcat "Δ. " (hx:v kaekd "DIMOS")))
          (T (strcat "ΚΑΕΚ " (hx:v kaekd "KAEK"))))
    (getstring T (strcat "\\n" "Οικισμός/Περιοχή: "))))''')
    rep('''  (cond

    ;; -- 1: ENTOS SXEDIOU --''', '''  (cond

    ;; -- 5: APO KAEK (HEXIS-APP) --
    ((= mode "5")
      (setq subt (strcat (hx:v kaekd "KATASTASI_TXT") " — ΚΑΕΚ " (hx:v kaekd "KAEK")
                         " · Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ) · HEXIS-APP"))
      (setq rows (mapcar (function (lambda (r) (list (car r) (cdr r)))) (hx:v kaekd "ROWS"))))

    ;; -- 1: ENTOS SXEDIOU --''')
    rep('''  (if (member mode (list "2" "3"))
    (progn
      (setq y (- y (* h 1.3)))''', '''  (if (= mode "5")
    (progn
      (setq y (- y (* h 1.3)))
      (od-txt (car pt) y (* h 0.75) (hx:v kaekd "NOTE"))))

  (if (member mode (list "2" "3"))
    (progn
      (setq y (- y (* h 1.3)))''')
    s = s.replace("OROIDOM v3.1", "OROIDOM v3.2").replace(T("OROIDOM.LSP  v3.1"), T("OROIDOM.LSP  v3.2"))
    wr(path, s, crlf); print("OROIDOM ok:", path)

# ---------- DILOSI ----------
def patch_dilosi(path, esc):
    s, crlf = rd(path); s = s.replace("\r\n", "\n")
    if "dl:from-kaek" in s: print("DILOSI ήδη:", path); return
    T = (lambda x: U(x)) if esc else (lambda x: x)
    def rep(a, b, raw=False):
        nonlocal s
        assert s.count(a) == 1, (path, a[:70], s.count(a)); s = s.replace(a, b if raw else b)
    # κουμπί στη σελίδα 1 (DCL: πάντα ANSI)
    rep('''  (w "      : edit_box { key = \\"kaek\\"; label = \\"ΚΑΕΚ :\\"; edit_width = 22; }")
  (w "    }")''', '''  (w "      : edit_box { key = \\"kaek\\"; label = \\"ΚΑΕΚ :\\"; edit_width = 22; }")
  (w "    }")
  (w "    : button { key = \\"bkaek\\"; label = \\"<< Συμπλήρωση από ΚΑΕΚ (HEXIS-APP: όροι, ΦΕΚ, θέση)\\"; width = 52; }")''')
    rep('''           (action_tile "btab"  "(dl:grab *KEYS*)(done_dialog 22)"))''', '''           (action_tile "btab"  "(dl:grab *KEYS*)(done_dialog 22)")
           (action_tile "bkaek" "(dl:grab *KEYS*)(done_dialog 23)"))''')
    rep('''          ((= res 22) (dl:table-info) (setq pg 1))''', '''          ((= res 22) (dl:table-info) (setq pg 1))
          ((= res 23) (dl:from-kaek) (setq pg 1))''')
    fn = '''
;; ---------------- συμπλήρωση από ΚΑΕΚ (HEXIS-APP) ----------------
(defun dl:from-kaek ( / d k f2 st)
''' + LOADER.replace("      ", "  ", 1).replace("(exit)", "(setq d 'skip)") + '''
  (setq k (dl:get "kaek"))
  (if (and hx:oroi (/= d 'skip))
    (if (not (dl:nz k))
      (alert "Γράψε πρώτα το ΚΑΕΚ στη σελίδα 1.")
      (if (setq d (hx:oroi k))
        (progn
          (defun f2 (key fld) (if (and (/= (hx:v d key) "") (not (dl:nz (dl:get fld)))) (dl:set fld (hx:v d key))))
          (f2 "EMBADON" "emb") (f2 "DIMOS" "dimos") (f2 "OT" "ot") (f2 "OIKISMOS" "thesi")
          (setq st (hx:v d "KATASTASI"))
          (dl:set "pos" (cond ((= st "sxedio") "0") ((= st "oikismos") "2") (T "3")))
          (if (= (hx:v d "GPS") "1") (progn (dl:set "gps" "1") (f2 "FEK_GPS" "gpsfek")))
          (if (= (hx:v d "ZOE") "1") (progn (dl:set "zoe" "1") (f2 "FEK_ZOE" "zoefek")))
          (f2 "FEK_SXEDIO" "fekrym") (f2 "FEK_OROI" "fekoron") (f2 "FEK_OIKISMOU" "oikfek")
          (f2 "ART_EMB" "artemb") (f2 "PROSOPO" "pros")
          (cond ((= (hx:v d "ARTIO") "1") (dl:set "artio" "1")) ((= (hx:v d "ARTIO") "0") (dl:set "artio" "0")))
          (if (= (hx:v d "ARXAIO") "1") (dl:set "arxaio" "1"))
          (if (= (hx:v d "REMA") "1") (dl:set "rema" "1"))
          (alert (strcat "HEXIS-APP — ΚΑΕΚ " (hx:v d "KAEK") "\\n\\n"
                         (hx:v d "KATASTASI_TXT")
                         (if (/= (hx:v d "MAX_DOMISI") "") (strcat "\\nΜέγιστη δόμηση: " (hx:v d "MAX_DOMISI") " τ.μ. · Σ.Α.Ο. " (hx:v d "SAO")) "")
                         "\\n\\nΣυμπληρώθηκαν: θέση, ΦΕΚ, αρτιότητα, πρόσωπο και τα κενά πεδία."
                         "\\nΈλεγξε τις σελίδες 2-4 πριν την εισαγωγή."))))))
  (princ))
'''
    # οι συναρτήσεις μπαίνουν πριν από το dl:dialog — μηνύματα: AutoCAD με \\U+, progeCAD ANSI
    anchor = "(defun dl:dialog ( / dcl pg res id)"
    assert s.count(anchor) == 1
    s = s.replace(anchor, (U(fn) if esc else fn) + "\n" + anchor)
    s = s.replace("DILOSI.LSP v1.2", "DILOSI.LSP v1.3")
    wr(path, s, crlf); print("DILOSI ok:", path)

patch_oroidom(R + "/OROIDOM.lsp", True)
patch_oroidom(R + "/OROIDOM_ProgeCAD.lsp", False)
patch_dilosi(R + "/DILOSI.lsp", True)
patch_dilosi(R + "/DILOSI_ProgeCAD.lsp", False)

# ---------- OROIDOM v3.3: απόσπασμα ρυμοτομικού κάτω από τον πίνακα (επιλογή 5) ----------
def patch_oroidom_apo(path, esc):
    s, crlf = rd(path); s = s.replace("\r\n", "\n")
    if "hx:apospasma" in s: print("OROIDOM απόσπασμα ήδη:", path); return
    T = (lambda t: U(t)) if esc else (lambda t: t)
    a = '(defun C:OROIDOM ( / *error* od-txt od-hline od-len kaekd'
    assert s.count(a) == 1; s = s.replace(a, a + ' apo')
    anchor = T('  (princ (strcat "\\n" "OROIDOM v3.2 — Ο πίνακας εισήχθη (layer OD-PIN, λευκά)."))')
    assert s.count(anchor) == 1, (path, "anchor")
    blk = T('''  (if (and (= mode "5") hx:apospasma)
    (progn
      (initget "Nai Oxi")
      (setq apo (getkword (strcat "\\n" "Απόσπασμα ρυμοτομικού κάτω από τον πίνακα; [Nai/Oxi] <Nai>: ")))
      (if (/= apo "Oxi")
        (hx:apospasma (hx:v kaekd "KAEK") (car pt) (- y (* h 2.5)) (max (* h 45.0) (min totw (* h 70.0))) h))))

''')
    s = s.replace(anchor, blk + anchor)
    s = s.replace("OROIDOM v3.2", "OROIDOM v3.3").replace(T("OROIDOM.LSP  v3.2"), T("OROIDOM.LSP  v3.3"))
    wr(path, s, crlf); print("OROIDOM απόσπασμα ok:", path)
patch_oroidom_apo(R + "/OROIDOM.lsp", True)
patch_oroidom_apo(R + "/OROIDOM_ProgeCAD.lsp", False)
