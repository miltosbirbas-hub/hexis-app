;;; SKALES.LSP v3.0 — Διάλογος σχεδιασμού κλίμακας (DCL)
;;; Κανόνες Neufert: 62<2υ+π<65 · υ 14-20cm · π: 27-32 / >=25 δύσκολη / >=23 μεταλλική
;;; Εντολή: SKALES | HEXIS — BRB DEVELOPMENT

(setq *sk-L* nil *sk-H* 3.00 *sk-W* 1.20 *sk-PMIN* 27.0
      *sk-CANDS* nil *sk-SEL* -1 *sk-N* nil)

(defun sk-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun sk-line (p1 p2)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 "STAIRS")
                 (cons 10 p1) (cons 11 p2))))

(defun sk-txt (p h str)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 "STAIRS")
                 (cons 10 p) (cons 40 h) (cons 1 str) (cons 72 0))))

(defun sk-pline (pts)
  (entmake (append
    (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 "STAIRS")
          (cons 100 "AcDbPolyline") (cons 90 (length pts)) (cons 70 0))
    (mapcar (quote (lambda (p) (cons 10 p))) pts))))

(defun sk-arrow (p1 p2 sz / ang lp)
  (setq ang (angle p1 p2))
  (setq lp (polar p2 (+ ang pi) sz))
  (sk-line p2 (polar lp (+ ang (/ pi 2)) (* sz 0.4)))
  (sk-line p2 (polar lp (- ang (/ pi 2)) (* sz 0.4))))

(defun sk-plen (pts / tot i)
  (setq tot 0.0 i 0)
  (while (< i (1- (length pts)))
    (setq tot (+ tot (distance (nth i pts) (nth (1+ i) pts))))
    (setq i (1+ i)))
  tot)

(defun sk-getpts (ent / ed pts pr)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  pts)

(defun sk-ptalong (pts dist / i seg d p0 p1 res)
  (setq i 0 d dist res nil)
  (while (and (< i (1- (length pts))) (null res))
    (setq p0 (nth i pts) p1 (nth (1+ i) pts))
    (setq seg (distance p0 p1))
    (if (<= d seg)
      (setq res (list (polar p0 (angle p0 p1) d) (angle p0 p1)))
      (setq d (- d seg)))
    (setq i (1+ i)))
  (if (null res)
    (setq res (list (last pts) (angle (nth (- (length pts) 2) pts) (last pts)))))
  res)

;; -- Υπολογισμός υποψήφιων λύσεων --
(defun sk-calc ( / nmin nmax n r g chk dev ok lst)
  (setq lst (list))
  (setq nmin (fix (/ (* *sk-H* 100.0) 20.0)))
  (if (< nmin 3) (setq nmin 3))
  (setq nmax (1+ (fix (/ (* *sk-H* 100.0) 14.0))))
  (setq n nmin)
  (while (<= n nmax)
    (setq r (/ (* *sk-H* 100.0) n))
    (setq g (/ (* *sk-L* 100.0) (1- n)))
    (setq chk (+ (* 2.0 r) g))
    (setq dev (abs (- chk 63.0)))
    (setq ok (and (> chk 62.0) (< chk 65.0)
                  (>= r 14.0) (<= r 20.0)
                  (>= g *sk-PMIN*) (<= g 32.0)))
    (setq lst (append lst (list (list n r g chk dev ok))))
    (setq n (1+ n)))
  (setq *sk-CANDS* lst))

;; -- Γέμισμα list_box --
(defun sk-fill-list ( / c s best-i i)
  (start_list "cands")
  (setq i 0 best-i -1)
  (foreach c *sk-CANDS*
    (setq s (strcat
      (if (nth 5 c) "[OK] " "[ X ] ")
      "n=" (itoa (car c))
      "  υ=" (rtos (cadr c) 2 1)
      "  π=" (rtos (caddr c) 2 1)
      "  2υ+π=" (rtos (cadddr c) 2 1)))
    (add_list s)
    (if (and (nth 5 c) (< best-i 0)) (setq best-i i))
    (setq i (1+ i)))
  (end_list)
  ;; προεπιλογή: πρώτη έγκυρη (ή καλύτερη dev αν καμία)
  (if (< best-i 0)
    (progn
      (setq best-i 0 i 0)
      (foreach c *sk-CANDS*
        (if (< (nth 4 c) (nth 4 (nth best-i *sk-CANDS*))) (setq best-i i))
        (setq i (1+ i)))))
  (set_tile "cands" (itoa best-i))
  (setq *sk-SEL* best-i)
  (sk-show-sel))

;; -- Εμφάνιση επιλεγμένης λύσης + preview --
(defun sk-show-sel ( / c r g chk)
  (if (and (>= *sk-SEL* 0) (< *sk-SEL* (length *sk-CANDS*)))
    (progn
      (setq c (nth *sk-SEL* *sk-CANDS*))
      (setq r (cadr c) g (caddr c) chk (cadddr c))
      (setq *sk-N* (car c))
      (set_tile "res1" (strcat "Ρίχτυα: " (itoa (car c)) "   Πατήματα: " (itoa (1- (car c)))))
      (set_tile "res2" (strcat "Ανύψωμα υ = " (rtos r 2 1) " cm   Πάτημα π = " (rtos g 2 1) " cm"))
      (set_tile "res3" (strcat "Blondel 2υ+π = " (rtos chk 2 1) " cm  "
        (if (nth 5 c) "-> ΕΝΤΟΣ ΚΑΝΟΝΙΣΜΟΥ" "-> ΕΚΤΟΣ!")))
      (set_tile "res4" (strcat "Άνεση π-υ = " (rtos (- g r) 2 1)
        "   Ασφάλεια π+υ = " (rtos (+ g r) 2 1)))
      (set_tile "res5"
        (if (> (car c) 18) "ΠΡΟΣΟΧΗ: >18 ρίχτυα — χρειάζεται πλατύσκαλο!" ""))
      (sk-preview))))

;; -- Preview: κάτοψη στο image tile --
(defun sk-preview ( / w h n i x0 y0 x1 y1 bw bh tx)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq n *sk-N*)
  (if (null n) (setq n 16))
  ;; ζώνη σκάλας: οριζόντια μπάντα
  (setq x0 (fix (* w 0.08)) x1 (fix (* w 0.92)))
  (setq y0 (fix (* h 0.25)) y1 (fix (* h 0.75)))
  ;; περίγραμμα
  (vector_image x0 y0 x1 y0 7)
  (vector_image x1 y0 x1 y1 7)
  (vector_image x1 y1 x0 y1 7)
  (vector_image x0 y1 x0 y0 7)
  ;; βαθμίδες
  (setq i 1)
  (while (< i n)
    (setq tx (+ x0 (fix (* (- x1 x0) (/ (float i) n)))))
    (vector_image tx y0 tx y1 7)
    (setq i (1+ i)))
  ;; γραμμή ανάβασης (κόκκινη) στο μέσο + βέλος
  (setq bh (fix (/ (+ y0 y1) 2)))
  (vector_image x0 bh (- x1 8) bh 1)
  (vector_image (- x1 8) bh (- x1 16) (- bh 4) 1)
  (vector_image (- x1 8) bh (- x1 16) (+ bh 4) 1)
  ;; κύκλος αφετηρίας (τετραγωνάκι)
  (vector_image (- x0 2) (- bh 2) (+ x0 2) (- bh 2) 1)
  (vector_image (+ x0 2) (- bh 2) (+ x0 2) (+ bh 2) 1)
  (vector_image (+ x0 2) (+ bh 2) (- x0 2) (+ bh 2) 1)
  (vector_image (- x0 2) (+ bh 2) (- x0 2) (- bh 2) 1)
  (end_image))

;; -- Ανανέωση από inputs --
(defun sk-recalc ( / v)
  (setq v (atof (get_tile "h")))
  (if (> v 0.5) (setq *sk-H* v))
  (sk-calc)
  (sk-fill-list))

;; -- Δημιουργία DCL αρχείου --
(defun sk-write-dcl ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "skalos.dcl"))
  (setq f (open path "w"))
  (write-line "skalos_dlg : dialog {" f)
  (write-line "  label = \"SKALES — Σχεδιασμός Κλίμακας (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "    : column {" f)
  (write-line "      : text { key = \"info_l\"; width = 42; }" f)
  (write-line "      : edit_box { key = \"h\"; label = \"Ύψος ορόφου (m):\"; edit_width = 8; }" f)
  (write-line "      : radio_column { key = \"typ\"; label = \"Τύπος σκάλας\";" f)
  (write-line "        : radio_button { key = \"t_norm\"; label = \"Κανονική (π 27-32 cm)\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"t_hard\"; label = \"Δύσκολη (π >= 25 cm)\"; }" f)
  (write-line "        : radio_button { key = \"t_metal\"; label = \"Μεταλλική ευθύγραμμη (π >= 23 cm)\"; }" f)
  (write-line "      }" f)
  (write-line "      : button { key = \"calc\"; label = \"Επανυπολογισμός\"; }" f)
  (write-line "      : list_box { key = \"cands\"; label = \"Λύσεις:\"; height = 9; width = 42; }" f)
  (write-line "    }" f)
  (write-line "    : column {" f)
  (write-line "      : image { key = \"prev\"; width = 38; aspect_ratio = 0.55; color = 0; }" f)
  (write-line "      : text { key = \"res1\"; width = 46; }" f)
  (write-line "      : text { key = \"res2\"; width = 46; }" f)
  (write-line "      : text { key = \"res3\"; width = 46; }" f)
  (write-line "      : text { key = \"res4\"; width = 46; }" f)
  (write-line "      : text { key = \"res5\"; width = 46; }" f)
  (write-line "    }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)
  path)

;; ========== ΚΥΡΙΑ ΕΝΤΟΛΗ ==========
(defun C:SKALES ( / *error* inpt pts pa pb pc pd ang dx dy
    dclpath dclid status n riser going going-m
    i dist res perp p-in mid-pts mp asc-pts txt-h arrow-sz
    cut-c cut-a cut-b total-len)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\nΣφάλμα SKALES: " msg)))
    (princ))

  (sk-layer "STAIRS" 7)

  ;; -- Επιλογή γεωμετρίας --
  (princ "\nΕπίλεξε polyline βαθμιδοφόρου (Enter = pick 4 γωνίες):")
  (setq inpt (entsel))
  (if inpt
    (progn
      (setq pts (sk-getpts (car inpt)))
      (if (< (length pts) 2) (progn (princ "\nΜη έγκυρη polyline.") (exit)))
      (setq *sk-W* (getreal "\nΠλάτος σκάλας (m) <1.20>: "))
      (if (null *sk-W*) (setq *sk-W* 1.20)))
    (progn
      (setq pa (getpoint "\nΓωνία 1 (αρχή βαθμιδοφόρου): "))
      (setq pb (getpoint pa "\nΓωνία 2 (τέλος βαθμιδοφόρου): "))
      (setq pc (getpoint "\nΓωνία 3 (απέναντι πλευρά): "))
      (setq pd (getpoint "\nΓωνία 4 (προαιρετική — Enter): "))
      (setq pts (list pa pb))
      (setq ang (angle pa pb))
      (setq dx (- (car pc) (car pa)))
      (setq dy (- (cadr pc) (cadr pa)))
      (setq *sk-W* (abs (- (* dx (sin ang)) (* dy (cos ang)))))
      (princ (strcat "\nΠλάτος σκάλας (υπολογίστηκε): " (rtos *sk-W* 2 2) " m"))))

  (setq *sk-L* (sk-plen pts))
  (setq total-len *sk-L*)

  ;; -- Διάλογος --
  (setq dclpath (sk-write-dcl))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nΑποτυχία DCL.") (exit)))
  (if (not (new_dialog "skalos_dlg" dclid)) (progn (princ "\nΑποτυχία διαλόγου.") (exit)))

  (set_tile "info_l" (strcat "Μήκος βαθμιδοφόρου L = " (rtos *sk-L* 2 2)
    " m   ·   Πλάτος = " (rtos *sk-W* 2 2) " m"))
  (set_tile "h" (rtos *sk-H* 2 2))
  (setq *sk-PMIN* 27.0)
  (sk-calc)
  (sk-fill-list)

  (action_tile "h" "(sk-recalc)")
  (action_tile "calc" "(sk-recalc)")
  (action_tile "t_norm"  "(setq *sk-PMIN* 27.0) (sk-recalc)")
  (action_tile "t_hard"  "(setq *sk-PMIN* 25.0) (sk-recalc)")
  (action_tile "t_metal" "(setq *sk-PMIN* 23.0) (sk-recalc)")
  (action_tile "cands" "(setq *sk-SEL* (atoi $value)) (sk-show-sel)")
  (action_tile "accept" "(done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")

  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\nΑκύρωση.") (exit)))

  ;; -- Τιμές επιλεγμένης λύσης --
  (setq n *sk-N*)
  (setq riser (/ (* *sk-H* 100.0) n))
  (setq going (/ (* total-len 100.0) (1- n)))
  (setq going-m (/ going 100.0))

  ;; -- ΣΧΕΔΙΑΣΗ --
  (setq mid-pts (list))
  (setq i 1)
  (while (< i n)
    (setq dist (* i going-m))
    (if (> dist total-len) (setq dist total-len))
    (setq res (sk-ptalong pts dist))
    (setq pa (car res))
    (setq ang (cadr res))
    (setq perp (+ ang (/ pi 2.0)))
    (setq p-in (polar pa perp *sk-W*))
    (sk-line pa p-in)
    (setq mid-pts (append mid-pts (list (polar pa perp (* *sk-W* 0.5)))))
    (setq i (1+ i)))

  ;; γραμμή ανάβασης
  (setq asc-pts (list))
  (setq i 0)
  (while (< i (length pts))
    (setq pa (nth i pts))
    (if (< i (1- (length pts)))
      (setq ang (angle pa (nth (1+ i) pts)))
      (setq ang (angle (nth (1- i) pts) pa)))
    (setq perp (+ ang (/ pi 2.0)))
    (setq asc-pts (append asc-pts (list (polar pa perp (* *sk-W* 0.5)))))
    (setq i (1+ i)))
  (sk-pline asc-pts)
  (setq arrow-sz (* *sk-W* 0.15))
  (if (>= (length asc-pts) 2)
    (sk-arrow (nth (- (length asc-pts) 2) asc-pts) (last asc-pts) arrow-sz))
  (entmake (list (cons 0 "CIRCLE") (cons 100 "AcDbEntity") (cons 8 "STAIRS")
                 (cons 10 (car asc-pts)) (cons 40 (* *sk-W* 0.05))))

  ;; αρίθμηση — TEXT με \U+ (δεν χρειάζεται εδώ, αριθμοί ASCII)
  (setq txt-h (* *sk-W* 0.09))
  (setq i 1)
  (foreach mp mid-pts
    (sk-txt (polar mp 0.0 (* txt-h 0.3)) txt-h (itoa i))
    (setq i (1+ i)))

  ;; γραμμή τομής
  (setq res (sk-ptalong pts (/ total-len 2.0)))
  (setq cut-c (polar (car res) (+ (cadr res) (/ pi 2.0)) (* *sk-W* 0.5)))
  (setq cut-a (polar cut-c (+ (cadr res) (/ pi 4.0)) (* *sk-W* 0.75)))
  (setq cut-b (polar cut-c (+ (cadr res) (* 5.0 (/ pi 4.0))) (* *sk-W* 0.75)))
  (sk-line cut-a cut-b)

  (princ (strcat "\nSKALES v3.0 — n=" (itoa n)
    " υ=" (rtos riser 2 1) " π=" (rtos going 2 1) " — layer STAIRS."))
  (princ))

(princ "\nSKALES v3.0 (DCL) φορτώθηκε. Εντολή: SKALES")
(princ)
