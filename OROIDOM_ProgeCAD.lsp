;;; OROIDOM.LSP  v3.1 — Πίνακας Όρων Δόμησης
;;; ν.5306/2026 (Ταγαράς) · ΠΔ 24.4/1985 · ΦΕΚ 289/ΑΑΠ/2011
;;; Εντολή: OROIDOM  |  HEXIS Platform — BRB DEVELOPMENT
;;; Έκδοση για ProgeCAD / IntelliCAD — κωδικοποίηση ANSI Windows-1253 (Ελληνικά)

(defun C:OROIDOM ( / *error* od-txt od-hline od-len
                     mode fek onom subt rows
                     pt h y lblw valw totw rowh lineh row2 lbl vals v maxl )

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "Σφάλμα: " msg)))
    (princ))

  (defun od-len (s / i n)
    (setq i 1 n 0)
    (while (<= i (strlen s))
      (if (and (<= (+ i 6) (strlen s)) (= (substr s i 3) "\\U+"))
        (setq i (+ i 7) n (1+ n))
        (setq i (1+ i) n (1+ n))))
    n)

  (defun od-txt (x y th str)
    (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 "OD-PIN")
                   (cons 10 (list x y 0.0)) (cons 40 th) (cons 1 str) (cons 72 0))))

  (defun od-hline (x1 x2 y w)
    (entmake (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 "OD-PIN")
                   (cons 100 "AcDbPolyline") (cons 90 2) (cons 70 0) (cons 43 w)
                   (cons 10 (list x1 y)) (cons 10 (list x2 y)))))

  (initget 1 "1 2 3 4")
  (setq mode (getkword (strcat
    "\n" "Είδος δόμησης:"
    "\n" "  1  εντός σχεδίου πόλης"
    "\n" "  2  οικισμός <2000 κατ."
    "\n" "  3  οικισμός προ '23"
    "\n" "  4  εκτός σχεδίου"
    "\n[1/2/3/4]: ")))

  (if (member mode (list "2" "3"))
    (setq fek (getstring T (strcat "\n" "ΦΕΚ απόφ. Νομάρχη (Enter=κανένα): ")))
    (setq fek ""))

  (setq onom (getstring T (strcat "\n" "Οικισμός/Περιοχή: ")))
  (if (= onom "") (setq onom "---"))

  ;; === ROWS ana mode ===
  (cond

    ;; -- 1: ENTOS SXEDIOU --
    ((= mode "1")
      (setq subt "Εντός εγκεκριμένου σχεδίου πόλης — ΝΟΚ ν.4067/2012 · ν.5306/2026")
      (setq rows (list
    (cons "ΑΡΤΙΟΤΗΤΑ" (list "βάσει όρων δόμησης εγκεκριμένου ΡΣΕ"))
    (cons "ΣΔ / ΚΑΛΥΨΗ / ΥΨΟΣ" (list "βάσει ΡΣΕ / ΓΠΣ περιοχής"))
    (cons "ΓΡΑΜΜΗ ΔΟΜΗΣΗΣ" (list "επί ρυμοτομικής γραμμής")))))

    ;; -- 2 & 3: OIKISMOS <2000 / PRO 23 --
    ((member mode (list "2" "3"))
      (setq subt (strcat
        "Οικισμός <2000 κατ. — ΠΔ 24.4/1985 (Δ 181) · ΦΕΚ 289/ΑΑΠ/2011 · ν.5306/2026 άρ.247§3"
        (if (= fek "") "" (strcat "  ·  " "Απόφ. Νομάρχη: " fek))))
      (setq rows (list
    (cons "ΑΡΤΙΟΤΗΤΑ ΚΑΤΑ ΚΑΝΟΝΑ" (list "2.000 m2  /  πρόσωπο 25 m"))
    (cons "ΑΡΤΙΟΤΗΤΑ ΠΑΡΕΚΚΛΙΣΗΣ" (list "όποιο εμβαδόν έχουν  /  4 m σε κοινόχρηστο (γήπεδα προ 4.11.2011)"))
    (cons "ΠΡΟΣΩΠΟ ΝΕΩΝ ΓΗΠΕΔΩΝ" (list ">= 10 m (Ε<=500 μ2)  ·  >= 15 m (Ε>500 μ2) — μετά 4.11.2011"))
    (cons "ΔΟΜΗΣΗ (ΦΕΚ 289/ΑΑΠ/2011)" (list "Ε < 200 μ2 : ΣΔ 1,0 — max 200 μ2 (κάλυψη έως 70%)" "200–699 μ2 : μέγ. δόμηση 240 μ2 (+40 μ2 πατάρι)" "Ε >= 700 μ2 : μέγ. δόμηση 400 μ2"))
    (cons "ΚΑΛΥΨΗ" (list "60%  (Ε<200 μ2: έως 70%)"))
    (cons "ΥΨΟΣ / ΟΡΟΦΟΙ" (list "7,50 m — 2 όροφοι (+1,20 m στέγη κατά ΝΟΚ)"))
    (cons "ΑΠΟΣΤΑΣΕΙΣ ΑΠΟ ΟΡΙΑ" (list ">= 2,50 m από πλάγια & οπίσθια όρια"))
    (cons "ΣΤΕΓΗ" (list "υποχρεωτική σε 2ώροφα ή με εξάντληση ΣΔ")))))

    ;; -- 4: EKTOS SXEDIOU (ar.250-256 n.5306/2026, proin 32-33 n.4759/2020) --
    ((= mode "4")
      (setq subt "Εκτός σχεδίου — άρ.250-251 & 256 ν.5306/2026 (ΦΕΚ Α 88/08-06-2026) · πρώην άρ.32-33 ν.4759/2020")
      (setq rows (list
    (cons "ΑΡΤΙΟΤΗΤΑ ΚΑΤΑ ΚΑΝΟΝΑ (άρ.251§1)" (list "Ε >= 4.000 μ2  &  πρόσωπο >= 25,00 m σε κοινόχρηστο δρόμο"))
    (cons "ΑΡΤΙΟΤΗΤΑ ΕΠΙ ΟΔΟΥ" (list "πρόσωπο >= 45,00 m · βάθος >= 50,00 m · Ε >= 4.000 μ2 (διεθνή/εθνική/επαρχ./δημοτική οδό)"))
    (cons "ΑΠΟΜΕΙΩΣΗ (άρ.251§1β τελ.εδ.)" (list "αρχικό Ε >= 4.000 μ2 απομειωθέν λόγω απαλλοτρίωσης/διάνοιξης οδού/αναδασμού:" "ΑΡΤΙΟ αν εναπομένον Ε >= 2.000 μ2 & πρόσωπο >= 25,00 m σε διεθνή/εθνική/επαρχ./δημοτ. οδό"))
    (cons "ΓΕΝΙΚΟΙ ΟΡΟΙ (άρ.251§2-5)" (list "ΣΔ 0,18  ·  Κάλυψη 10%  ·  Όροφοι 2"))
    (cons "ΥΨΟΣ" (list "7,50 m  (+1,20 m στέγη)"))
    (cons "ΑΠΟΣΤΑΣΕΙΣ ΑΠΟ ΟΡΙΑ" (list "Δ >= 15,00 m" "εξαίρεση: 7,50 m για κατοικία σε γήπεδα προ 15.4.1981 (μέγ. πλάτος κτιρίου 10,00 m)"))
    (cons "ΜΕΓ. ΔΟΜΗΣΗ ΚΑΤΟΙΚΙΑΣ (άρ.256)" (list "Ε 4.000–8.000 μ2 :  186 + (Ε-4.000) x 0,018  μ2" "Ε > 8.000 μ2 :  258 + (Ε-8.000) x 0,009  μ2 — μέγιστο 360 μ2"))
    (cons "ΤΟΥΡΙΣΤΙΚΑ (άρ.263)" (list "αρτιότητα Ε >= 8.000 μ2 (εξαίρεση 4.000-8.000 μ2 μόνο ξενοδοχ. καταλύματα με κριτήρια ΥΠΕΝ)" "κάλυψη 20% · ΣΔ: 0,18 έως 50 στρ · 0,15 τα 50-100 στρ · 0,10 άνω των 100 στρ" "αναβαθμισμένα: ΣΔ 0,18 (>=4 κριτήρια) ή 0,20 (>=6 κριτήρια) · μέγ. δόμηση 8.000 μ2"))
    (cons "ΒΙΟΜΗΧΑΝΙΚΑ (άρ.254)" (list "ΣΔ 0,6  ·  συντ. κατ όγκον εκμετάλλευσης 4"))
    (cons "ΓΕΩΡΓΟΚΤΗΝΟΤΡΟΦΙΚΑ (άρ.252-253)" (list "όροι πρώην άρ.2 ΠΔ 24.5.1985 (Δ 270) · παρέκκλιση ΣΔ έως 0,8" "χωρίς ελάχ. πρόσωπο αν εξυπηρετείται από αγροτικούς/δασικούς δρόμους (άρ.251§1α)"))
    (cons "ΥΠΟΣΚΑΦΑ (άρ.197, 206§6κδ, 207)" (list "δεν προσμετράται σε ΣΔ & κάλυψη: 50% επιφάνειας για κατοικία · 20% λοιπές χρήσεις" "προϋπ.: μία όψη · κανένα ίχνος σε κάτοψη · προσβάσιμη φυτεμένη οροφή · έγκριση ΣΑ" "κάλυψη δύναται έως 70% max")))))
  )

  (setq pt (getpoint (strcat "\n" "Σημείο εισαγωγής (πάνω-αριστερή γωνία): ")))
  (if (null pt) (exit))
  (setq h (getdist pt (strcat "\n" "Ύψος γραμματοσειράς <2.5>: ")))
  (if (null h) (setq h 2.5))

  (if (null (tblsearch "LAYER" "OD-PIN"))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 "OD-PIN")
                   (cons 70 0) (cons 62 7) (cons 6 "Continuous"))))

  ;; Auto column widths
  (setq maxl 0)
  (foreach row2 rows
    (if (> (od-len (car row2)) maxl) (setq maxl (od-len (car row2)))))
  (setq lblw (+ (* maxl h 0.95) (* h 3.0)))
  (setq valw 0)
  (foreach row2 rows
    (foreach v (cdr row2)
      (if (> (od-len v) valw) (setq valw (od-len v)))))
  (setq valw (* valw h 0.95))
  (setq totw (+ lblw valw))
  (setq rowh  (* h 2.0))
  (setq lineh (* h 1.55))

  (setq y (cadr pt))

  ;; Titlos
  (setq y (- y (* h 1.6)))
  (od-txt (car pt) y (* h 1.5) (strcat "ΟΡΟΙ ΔΟΜΗΣΗΣ" "  —  " onom))

  ;; Ypotitlos
  (setq y (- y (* h 1.5)))
  (od-txt (car pt) y (* h 0.85) subt)

  (setq y (- y (* h 0.8)))
  (od-hline (car pt) (+ (car pt) totw) y (* h 0.18))

  (foreach row2 rows
    (setq lbl (car row2) vals (cdr row2))
    (setq y (- y rowh))
    (od-txt (car pt) y h lbl)
    (od-txt (+ (car pt) lblw) y h (car vals))
    (foreach v (cdr vals)
      (setq y (- y lineh))
      (od-txt (+ (car pt) lblw) y h v)))

  (setq y (- y (* h 1.1)))
  (od-hline (car pt) (+ (car pt) totw) y (* h 0.06))

  (if (member mode (list "2" "3"))
    (progn
      (setq y (- y (* h 1.3)))
      (od-txt (car pt) y (* h 0.75)
        "Το ΠΔ 24.4/1985 ισχύει μεταβατικά (ν.5306/2026 άρ.247§3) έως την οριοθέτηση του οικισμού με νέο ΠΔ.")))

  (princ (strcat "\n" "OROIDOM v3.1 — Ο πίνακας εισήχθη (layer OD-PIN, λευκά)."))
  (princ))

(princ (strcat "\n" "OROIDOM v3.1 φορτώθηκε. Εντολή: OROIDOM"))
(princ)
