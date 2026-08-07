;;; SKALES.LSP v5.0 — Σχεδιασμός κλίμακας με σφήνες (DCL)
;;; Επιλογή polyline βαθμιδοφόρου -> pick αρχής -> pick εσωτερικής πλευράς
;;; Ευθείες βαθμίδες + σφηνοειδείς στις στροφές γύρω από το φανάρι
;;; Neufert: 62<2υ+π<65 . υ 14-20 . π 27-32 / >=25 / >=23
;;; Εντολή: SKALES | HEXIS — BRB DEVELOPMENT

(setq *sk-L* nil *sk-H* 3.00 *sk-W* 1.20 *sk-PMIN* 27.0 *sk-RMIN* 0.0
      *sk-CANDS* nil *sk-SEL* -1 *sk-N* nil *sk-3D* "0" *sk-SEC* "0")

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

(defun sk-plinedraw (pts)
  (entmake (append
    (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 "STAIRS")
          (cons 100 "AcDbPolyline") (cons 90 (length pts)) (cons 70 0))
    (mapcar (quote (lambda (p) (cons 10 (list (car p) (cadr p))))) pts))))

(defun sk-arrow (p1 p2 sz / ang lp)
  (setq ang (angle p1 p2))
  (setq lp (polar p2 (+ ang pi) sz))
  (sk-line p2 (polar lp (+ ang (/ pi 2)) (* sz 0.4)))
  (sk-line p2 (polar lp (- ang (/ pi 2)) (* sz 0.4))))

(defun sk-getpts (ent / ed pts pr)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  pts)

; προβολή σημείου P σε ευθεία (A, γωνία ang)
(defun sk-proj (P A ang / u t2)
  (setq u (list (cos ang) (sin ang)))
  (setq t2 (+ (* (- (car P) (car A)) (car u))
              (* (- (cadr P) (cadr A)) (cadr u))))
  (list (+ (car A) (* t2 (car u))) (+ (cadr A) (* t2 (cadr u))) 0.0))

; κανονικοποίηση γωνίας σε (-pi, pi]
(defun sk-normang (a)
  (while (> a pi) (setq a (- a (* 2 pi))))
  (while (<= a (- pi)) (setq a (+ a (* 2 pi))))
  a)

;; -- Κατασκευή γεωμετρίας μονοπατιών --
;; Επιστρέφει: (list walk-pieces inner-pts total-len)
;; walk-piece line: (list 0 pstart pend ang len)
;; walk-piece arc:  (list 1 center radius ang-start dang len corner-idx)
(defun sk-build ( / m i a-list v0 v1 aa off-in off-w2
                   pivots tins touts pieces inner-pts
                   ang1 ang2 dturn pv t-in t-out arclen tot
                   pcur pend seg)
  ;; γωνίες τμημάτων
  (setq m (1- (length *sk-PTS*)))
  (setq a-list (list))
  (setq i 0)
  (while (< i m)
    (setq a-list (append a-list (list (angle (nth i *sk-PTS*) (nth (1+ i) *sk-PTS*)))))
    (setq i (1+ i)))
  ;; offset συναρτήσεις: εσωτερικό = side*90
  ;; pivots στις εσωτερικές γωνίες (offset W, τομή γραμμών)
  (setq pivots (list) tins (list) touts (list))
  (setq i 1)
  (while (< i m)
    (setq ang1 (nth (1- i) a-list) ang2 (nth i a-list))
    (setq v1 (nth i *sk-PTS*))
    ;; pivot: τομή των 2 εσωτερικών offset γραμμών (W)
    (setq pv (inters
      (polar (nth (1- i) *sk-PTS*) (+ ang1 (* *sk-SIDE* (/ pi 2))) *sk-W*)
      (polar v1                    (+ ang1 (* *sk-SIDE* (/ pi 2))) *sk-W*)
      (polar v1                    (+ ang2 (* *sk-SIDE* (/ pi 2))) *sk-W*)
      (polar (nth (1+ i) *sk-PTS*) (+ ang2 (* *sk-SIDE* (/ pi 2))) *sk-W*)
      nil))
    (if (null pv) (setq pv (polar v1 (+ ang1 (* *sk-SIDE* (/ pi 2))) *sk-W*)))
    (setq pivots (append pivots (list pv)))
    ;; tangent points στη γραμμή ανάβασης (offset W/2): προβολές του pivot
    (setq t-in (sk-proj pv
      (polar (nth (1- i) *sk-PTS*) (+ ang1 (* *sk-SIDE* (/ pi 2))) (/ *sk-W* 2.0)) ang1))
    (setq t-out (sk-proj pv
      (polar v1 (+ ang2 (* *sk-SIDE* (/ pi 2))) (/ *sk-W* 2.0)) ang2))
    (setq tins (append tins (list t-in)))
    (setq touts (append touts (list t-out)))
    (setq i (1+ i)))
  ;; pieces: εναλλάξ line / arc
  (setq pieces (list) tot 0.0)
  (setq pcur (polar (car *sk-PTS*) (+ (car a-list) (* *sk-SIDE* (/ pi 2))) (/ *sk-W* 2.0)))
  (setq i 0)
  (while (< i m)
    (if (< i (1- m))
      (setq pend (nth i tins))
      (setq pend (polar (last *sk-PTS*) (+ (nth i a-list) (* *sk-SIDE* (/ pi 2))) (/ *sk-W* 2.0))))
    (setq seg (distance pcur pend))
    (if (> seg 0.001)
      (progn
        (setq pieces (append pieces (list (list 0 pcur pend (nth i a-list) seg))))
        (setq tot (+ tot seg))))
    ;; τόξο στη γωνία i (αν όχι τελευταίο τμήμα)
    (if (< i (1- m))
      (progn
        (setq pv (nth i pivots))
        (setq ang1 (angle pv (nth i tins)))
        (setq ang2 (angle pv (nth i touts)))
        (setq dturn (sk-normang (- ang2 ang1)))
        (setq arclen (* (abs dturn) (/ *sk-W* 2.0)))
        (setq pieces (append pieces (list (list 1 pv (/ *sk-W* 2.0) ang1 dturn arclen i))))
        (setq tot (+ tot arclen))
        (setq pcur (nth i touts))))
    (setq i (1+ i)))
  ;; εσωτερικός βαθμιδοφόρος: αρχή -> pivots -> τέλος
  (setq inner-pts (append
    (list (polar (car *sk-PTS*) (+ (car a-list) (* *sk-SIDE* (/ pi 2))) *sk-W*))
    pivots
    (list (polar (last *sk-PTS*) (+ (last a-list) (* *sk-SIDE* (/ pi 2))) *sk-W*))))
  (setq *sk-PIECES* pieces *sk-INNER* inner-pts *sk-PIVOTS* pivots)
  (setq *sk-L* tot)
  tot)

;; σημείο + πληροφορία σε απόσταση dist πάνω στη γραμμή ανάβασης
;; επιστρέφει (list ptype pt ang pivot) — ptype 0=ευθεία 1=τόξο
(defun sk-at (dist / d pc res phi)
  (setq d dist res nil)
  (foreach pc *sk-PIECES*
    (if (null res)
      (if (<= d (nth (if (= (car pc) 0) 4 5) pc))
        (if (= (car pc) 0)
          (setq res (list 0 (polar (cadr pc) (nth 3 pc) d) (nth 3 pc) nil))
          (progn
            (setq phi (+ (nth 3 pc) (* (/ d (nth 5 pc)) (nth 4 pc))))
            (setq res (list 1 (polar (cadr pc) phi (caddr pc)) phi (cadr pc)))))
        (setq d (- d (nth (if (= (car pc) 0) 4 5) pc))))))
  (if (null res)
    (progn
      (setq pc (last *sk-PIECES*))
      (setq res (list 0 (caddr pc) (nth 3 pc) nil))))
  res)

;; -- Υπολογισμός λύσεων / DCL (όπως v3) --
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
    (setq dev (abs (- chk 62.0)))
    (setq ok (and (>= chk 61.0) (<= chk 63.0)
                  (>= r 14.0) (<= r 20.0)
                  (>= g *sk-PMIN*) (<= g 32.0)))
    (setq lst (append lst (list (list n r g chk dev ok))))
    (setq n (1+ n)))
  (setq *sk-CANDS* lst))

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
  (if (< best-i 0)
    (progn
      (setq best-i 0 i 0)
      (foreach c *sk-CANDS*
        (if (< (nth 4 c) (nth 4 (nth best-i *sk-CANDS*))) (setq best-i i))
        (setq i (1+ i)))))
  (set_tile "cands" (itoa best-i))
  (setq *sk-SEL* best-i)
  (sk-show-sel))

(defun sk-show-sel ( / c r g chk)
  (if (and (>= *sk-SEL* 0) (< *sk-SEL* (length *sk-CANDS*)))
    (progn
      (setq c (nth *sk-SEL* *sk-CANDS*))
      (setq r (cadr c) g (caddr c) chk (cadddr c))
      (setq *sk-N* (car c))
      (set_tile "res1" (strcat "Ρίχτυα: " (itoa (car c)) "   Πατήματα: " (itoa (1- (car c)))))
      (set_tile "res2" (strcat "Ανύψωμα υ = " (rtos r 2 1) " cm   Πάτημα π = " (rtos g 2 1) " cm"))
      (set_tile "res3" (strcat "Blondel 2υ+π = " (rtos chk 2 1) " cm  "
        (if (nth 5 c) "-> ΕΝΤΟΣ (61-63)" "-> ΕΚΤΟΣ (61-63)!")))
      (set_tile "res4" (strcat "Άνεση π-υ = " (rtos (- g r) 2 1)
        "   Ασφάλεια π+υ = " (rtos (+ g r) 2 1)))
      (set_tile "res5"
        (if (> (car c) 18) "ΠΡΟΣΟΧΗ: >18 ρίχτυα — χρειάζεται πλατύσκαλο!" ""))
      (sk-preview))))

(defun sk-preview ( / w h n i x0 y0 x1 y1 bh tx)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq n *sk-N*)
  (if (null n) (setq n 16))
  (setq x0 (fix (* w 0.08)) x1 (fix (* w 0.92)))
  (setq y0 (fix (* h 0.25)) y1 (fix (* h 0.75)))
  (vector_image x0 y0 x1 y0 7)
  (vector_image x1 y0 x1 y1 7)
  (vector_image x1 y1 x0 y1 7)
  (vector_image x0 y1 x0 y0 7)
  (setq i 1)
  (while (< i n)
    (setq tx (+ x0 (fix (* (- x1 x0) (/ (float i) n)))))
    (vector_image tx y0 tx y1 7)
    (setq i (1+ i)))
  (setq bh (fix (/ (+ y0 y1) 2)))
  (vector_image x0 bh (- x1 8) bh 1)
  (vector_image (- x1 8) bh (- x1 16) (- bh 4) 1)
  (vector_image (- x1 8) bh (- x1 16) (+ bh 4) 1)
  (end_image))

(defun sk-recalc ( / v v2)
  (setq v (atof (get_tile "h")))
  (if (> v 0.5) (setq *sk-H* v))
  (setq v2 (atof (get_tile "rmin")))
  (if (> v2 0.0) (setq *sk-RMIN* (/ v2 100.0)))
  (sk-calc)
  (sk-fill-list))

(defun sk-write-dcl ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "skales.dcl"))
  (setq f (open path "w"))
  (write-line "skales_dlg : dialog {" f)
  (write-line "  label = \"SKALES v4 — Σχεδιασμός Κλίμακας (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "    : column {" f)
  (write-line "      : text { key = \"info_l\"; width = 44; }" f)
  (write-line "      : edit_box { key = \"h\"; label = \"Ύψος ορόφου (m):\"; edit_width = 8; }" f)
  (write-line "      : edit_box { key = \"rmin\"; label = \"Απόσταση σφηνών από φανάρι (cm, 0=ακουμπούν):\"; edit_width = 8; }" f)
  (write-line "      : radio_column { key = \"typ\"; label = \"Τύπος σκάλας\";" f)
  (write-line "        : radio_button { key = \"t_norm\"; label = \"Κανονική (π 27-32 cm)\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"t_hard\"; label = \"Δύσκολη (π >= 25 cm)\"; }" f)
  (write-line "        : radio_button { key = \"t_metal\"; label = \"Μεταλλική ευθύγραμμη (π >= 23 cm)\"; }" f)
  (write-line "      }" f)
  (write-line "      : toggle { key = \"do3d\"; label = \"Δημιουργία 3D μοντέλου (3DFACE)\"; }" f)
  (write-line "      : toggle { key = \"dosec\"; label = \"Σχεδίαση τομής (2D)\"; }" f)
  (write-line "      : button { key = \"calc\"; label = \"Επανυπολογισμός\"; }" f)
  (write-line "      : list_box { key = \"cands\"; label = \"Λύσεις:\"; height = 9; width = 44; }" f)
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
(defun C:SKALES ( / *error* inpt pstart pside cross a0 pt1 pt2
    dclpath dclid status n going-m i dist res pt ang pv
    outer-pt inner-pt phi far hit1 hit2 vi mid-pts mp
    asc-draw pc ph txt-h arrow-sz cutres cut-c cut-a cut-b
    riser going seg-n j z z0 re1 re2 riser-ends riser-m secp sx sy)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\nΣφάλμα SKALES: " msg)))
    (princ))

  (sk-layer "STAIRS" 7)

  ;; 1. Polyline εξωτερικού βαθμιδοφόρου
  (princ "\nΕπίλεξε polyline ΕΞΩΤΕΡΙΚΟΥ βαθμιδοφόρου:")
  (setq inpt (entsel))
  (if inpt
    (progn
      (setq *sk-PTS* (sk-getpts (car inpt)))
      (if (< (length *sk-PTS*) 2) (progn (princ "\nΜη έγκυρη polyline.") (exit))))
    (progn
      ;; Pick σημείων διαδρομής — σχεδιάζει τη σκάλα από αυτά
      (princ "\nΔώσε τα σημεία από όπου περνά η σκάλα (εξωτ. βαθμιδοφόρος):")
      (setq *sk-PTS* (list))
      (setq pt1 (getpoint "\n1ο σημείο: "))
      (if (null pt1) (progn (princ "\nΑκύρωση.") (exit)))
      (setq *sk-PTS* (list pt1))
      (while (setq pt2 (getpoint pt1 "\nΕπόμενο σημείο (Enter=τέλος): "))
        (setq *sk-PTS* (append *sk-PTS* (list pt2)))
        (setq pt1 pt2))
      (if (< (length *sk-PTS*) 2) (progn (princ "\nΧρειάζονται 2+ σημεία.") (exit)))
      ;; Σχεδιάζει και τον εξωτερικό βαθμιδοφόρο αφού δεν υπάρχει
      (sk-plinedraw *sk-PTS*)))

  ;; 2. Αρχή σκάλας — pick κοντά στο άκρο εκκίνησης
  (setq pstart (getpoint "\nΔείξε κοντά στην ΑΡΧΗ της σκάλας (από πού ξεκινά): "))
  (if (and pstart
           (> (distance pstart (car *sk-PTS*))
              (distance pstart (last *sk-PTS*))))
    (setq *sk-PTS* (reverse *sk-PTS*)))

  ;; 3. Εσωτερική πλευρά — pick προς το σώμα της σκάλας
  (setq pside (getpoint "\nΔείξε προς το ΕΣΩΤΕΡΙΚΟ της σκάλας (πλευρά πλάτους): "))
  (if (null pside) (progn (princ "\nΑκύρωση.") (exit)))
  (setq a0 (angle (car *sk-PTS*) (cadr *sk-PTS*)))
  ;; πρόσημο εξωτερικού γινομένου: αριστερά=+1 δεξιά=-1
  (setq cross (- (* (cos a0) (- (cadr pside) (cadr (car *sk-PTS*))))
                 (* (sin a0) (- (car pside) (car (car *sk-PTS*))))))
  (setq *sk-SIDE* (if (>= cross 0.0) 1.0 -1.0))

  ;; 4. Πλάτος
  (setq *sk-W* (getreal "\nΠλάτος σκάλας (m) <1.20>: "))
  (if (null *sk-W*) (setq *sk-W* 1.20))

  ;; 5. Γεωμετρία μονοπατιού (γραμμή ανάβασης με τόξα)
  (sk-build)

  ;; 6. Διάλογος
  (setq dclpath (sk-write-dcl))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nΑποτυχία DCL.") (exit)))
  (if (not (new_dialog "skales_dlg" dclid)) (progn (princ "\nΑποτυχία διαλόγου.") (exit)))
  (set_tile "info_l" (strcat "Μήκος γραμμής ανάβασης L = " (rtos *sk-L* 2 2)
    " m   .   Πλάτος = " (rtos *sk-W* 2 2) " m"))
  (set_tile "h" (rtos *sk-H* 2 2))
  (set_tile "rmin" (rtos (* *sk-RMIN* 100.0) 2 0))
  (setq *sk-PMIN* 27.0)
  (sk-calc)
  (sk-fill-list)
  (action_tile "h" "(sk-recalc)")
  (action_tile "rmin" "(sk-recalc)")
  (action_tile "calc" "(sk-recalc)")
  (action_tile "t_norm"  "(setq *sk-PMIN* 27.0) (sk-recalc)")
  (action_tile "t_hard"  "(setq *sk-PMIN* 25.0) (sk-recalc)")
  (action_tile "t_metal" "(setq *sk-PMIN* 23.0) (sk-recalc)")
  (action_tile "cands" "(setq *sk-SEL* (atoi $value)) (sk-show-sel)")
  (action_tile "accept" "(setq *sk-3D* (get_tile \"do3d\")) (setq *sk-SEC* (get_tile \"dosec\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\nΑκύρωση.") (exit)))

  (setq n *sk-N*)
  (setq riser (/ (* *sk-H* 100.0) n))
  (setq going (/ (* *sk-L* 100.0) (1- n)))
  (setq going-m (/ *sk-L* (float (1- n))))

  ;; 7. ΣΧΕΔΙΑΣΗ
  ;; εσωτερικός βαθμιδοφόρος
  (sk-plinedraw *sk-INNER*)

  ;; βαθμίδες
  (setq mid-pts (list) riser-ends (list))
  (setq i 0)
  (while (< i n)
    (setq dist (* i going-m))
    (if (> dist *sk-L*) (setq dist *sk-L*))
    (setq res (sk-at dist))
    (setq pt (cadr res) ang (caddr res))
    (if (= (car res) 0)
      ;; ευθεία βαθμίδα: κάθετη, από εξωτερικό σε εσωτερικό
      (progn
        (setq outer-pt (polar pt (- ang (* *sk-SIDE* (/ pi 2))) (/ *sk-W* 2.0)))
        (setq inner-pt (polar pt (+ ang (* *sk-SIDE* (/ pi 2))) (/ *sk-W* 2.0)))
        (sk-line outer-pt inner-pt)
        (setq riser-ends (append riser-ends (list (list outer-pt inner-pt)))))
      ;; σφηνοειδής: ακτίνα από pivot(+φανάρι) έως εξωτερικό βαθμιδοφόρο
      (progn
        (setq pv (cadddr res))
        (setq phi (angle pv pt))
        (setq far (polar pv phi (* *sk-W* 3.0)))
        ;; τομή με τα τμήματα του εξωτερικού βαθμιδοφόρου
        (setq outer-pt nil vi 0)
        (while (and (< vi (1- (length *sk-PTS*))) (null outer-pt))
          (setq hit1 (inters pv far (nth vi *sk-PTS*) (nth (1+ vi) *sk-PTS*)))
          (if hit1 (setq outer-pt hit1))
          (setq vi (1+ vi)))
        (if (null outer-pt) (setq outer-pt (polar pv phi *sk-W*)))
        ;; Η σφήνα ακουμπά το φανάρι (pivot) — RMIN>0 μόνο αν δοθεί
        (if (> *sk-RMIN* 0.001)
          (setq inner-pt (polar pv phi *sk-RMIN*))
          (setq inner-pt pv))
        (sk-line inner-pt outer-pt)
        (setq riser-ends (append riser-ends (list (list outer-pt inner-pt))))))
    (setq mid-pts (append mid-pts (list pt)))
    (setq i (1+ i)))

  ;; γραμμή ανάβασης: pieces -> σημεία (τόξα με 6 υποδιαιρέσεις)
  (setq asc-draw (list))
  (foreach pc *sk-PIECES*
    (if (= (car pc) 0)
      (progn
        (if (null asc-draw) (setq asc-draw (list (cadr pc))))
        (setq asc-draw (append asc-draw (list (caddr pc)))))
      (progn
        (setq i 1)
        (while (<= i 6)
          (setq ph (+ (nth 3 pc) (* (/ (float i) 6.0) (nth 4 pc))))
          (setq asc-draw (append asc-draw (list (polar (cadr pc) ph (caddr pc)))))
          (setq i (1+ i))))))
  (sk-plinedraw asc-draw)
  (setq arrow-sz (* *sk-W* 0.15))
  (if (>= (length asc-draw) 2)
    (sk-arrow (nth (- (length asc-draw) 2) asc-draw) (last asc-draw) arrow-sz))
  (entmake (list (cons 0 "CIRCLE") (cons 100 "AcDbEntity") (cons 8 "STAIRS")
                 (cons 10 (car asc-draw)) (cons 40 (* *sk-W* 0.05))))

  ;; αρίθμηση: στο μέσο κάθε πατήματος (i-0.5)*π
  (setq txt-h (* *sk-W* 0.09))
  (setq i 1)
  (while (< i n)
    (setq res (sk-at (* (- i 0.5) going-m)))
    (sk-txt (cadr res) txt-h (itoa i))
    (setq i (1+ i)))

  ;; γραμμή τομής στο μέσο
  (setq cutres (sk-at (/ *sk-L* 2.0)))
  (setq cut-c (cadr cutres))
  (setq cut-a (polar cut-c (+ (caddr cutres) (/ pi 4.0)) (* *sk-W* 0.75)))
  (setq cut-b (polar cut-c (+ (caddr cutres) (* 5.0 (/ pi 4.0))) (* *sk-W* 0.75)))
  (sk-line cut-a cut-b)

  ;; ==== 3D ΜΟΝΤΕΛΟ (3DFACE) ====
  (setq riser-m (/ *sk-H* (float n)))
  (if (= *sk-3D* "1")
    (progn
      (setq j 1)
      (while (< j n)
        ;; πάτημα j: μεταξύ ριχτιών j-1 και j σε ύψος j*υ
        (setq re1 (nth (1- j) riser-ends) re2 (nth j riser-ends))
        (if (and re1 re2)
          (progn
            (setq z (* j riser-m))
            (entmake (list (cons 0 "3DFACE") (cons 100 "AcDbEntity") (cons 8 "STAIRS-3D")
              (cons 10 (list (car (car re1)) (cadr (car re1)) z))
              (cons 11 (list (car (car re2)) (cadr (car re2)) z))
              (cons 12 (list (car (cadr re2)) (cadr (cadr re2)) z))
              (cons 13 (list (car (cadr re1)) (cadr (cadr re1)) z))))
            ;; ρίχτυ j: κατακόρυφη όψη στο ρίχτυ j-1 από (j-1)υ έως jυ
            (setq z0 (* (1- j) riser-m))
            (entmake (list (cons 0 "3DFACE") (cons 100 "AcDbEntity") (cons 8 "STAIRS-3D")
              (cons 10 (list (car (car re1)) (cadr (car re1)) z0))
              (cons 11 (list (car (cadr re1)) (cadr (cadr re1)) z0))
              (cons 12 (list (car (cadr re1)) (cadr (cadr re1)) z))
              (cons 13 (list (car (car re1)) (cadr (car re1)) z))))))
        (setq j (1+ j)))
      ;; τελευταίο ρίχτυ έως τη στάθμη ορόφου
      (setq re1 (last riser-ends))
      (setq z0 (* (1- n) riser-m) z (* n riser-m))
      (entmake (list (cons 0 "3DFACE") (cons 100 "AcDbEntity") (cons 8 "STAIRS-3D")
        (cons 10 (list (car (car re1)) (cadr (car re1)) z0))
        (cons 11 (list (car (cadr re1)) (cadr (cadr re1)) z0))
        (cons 12 (list (car (cadr re1)) (cadr (cadr re1)) z))
        (cons 13 (list (car (car re1)) (cadr (car re1)) z))))
      (sk-layer "STAIRS-3D" 4)
      (princ "\n3D μοντέλο: layer STAIRS-3D (δες με 3DORBIT/SHADE).")))

  ;; ==== ΤΟΜΗ 2D ====
  (if (= *sk-SEC* "1")
    (progn
      (setq secp (getpoint "\nΣημείο εισαγωγής τομής (κάτω-αριστερά): "))
      (if secp
        (progn
          (sk-layer "STAIRS-SEC" 7)
          ;; γραμμή εδάφους
          (sk-line (list (- (car secp) (* going-m 1.0)) (cadr secp) 0.0)
                   (list (+ (car secp) (* going-m (float n)) going-m) (cadr secp) 0.0))
          ;; ζιγκ-ζαγκ βαθμίδων
          (setq sx (car secp) sy (cadr secp))
          (setq j 1)
          (while (<= j n)
            ;; ρίχτυ πάνω
            (sk-line (list sx sy 0.0) (list sx (+ sy riser-m) 0.0))
            (setq sy (+ sy riser-m))
            ;; πάτημα δεξιά (εκτός από το τελευταίο που είναι ο όροφος)
            (if (< j n)
              (progn
                (sk-line (list sx sy 0.0) (list (+ sx going-m) sy 0.0))
                (setq sx (+ sx going-m))))
            (setq j (1+ j)))
          ;; γραμμή στάθμης ορόφου
          (sk-line (list sx sy 0.0) (list (+ sx (* going-m 2.0)) sy 0.0))
          ;; στάθμες κείμενο
          (sk-txt (list (+ sx (* going-m 0.3)) (+ sy (* riser-m 0.3)) 0.0)
                  (* going-m 0.35)
                  (strcat "+" (rtos *sk-H* 2 2)))
          (sk-txt (list (- (car secp) (* going-m 0.8)) (+ (cadr secp) (* riser-m 0.3)) 0.0)
                  (* going-m 0.35) "+0.00")
          (princ "\nΤομή: layer STAIRS-SEC.")))))

  (princ (strcat "\nSKALES v5.0 — n=" (itoa n)
    " υ=" (rtos riser 2 1) " π=" (rtos going 2 1) " cm — layer STAIRS."))
  (princ))

(princ "\nSKALES v5.0 φορτώθηκε. Εντολή: SKALES")
(princ)
