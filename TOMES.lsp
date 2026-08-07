;;; TOMES.LSP v3.0 — Αυτόματη τομή κτιρίου από κάτοψη
;;; Έως 10 όροφοι ανωδομή + 5 υπόγεια. Διαβάζει αυτόματα κουφώματα WINDOORS (XData)
;;; και σχεδιάζει ποδιά / άνοιγμα / πρέκι στην τομή.
;;; Εντολή: TOMES | HEXIS — BRB DEVELOPMENT

; ταξινόμηση λίστας αριθμών (χωρίς vl-sort, συμβατό παντού)
(defun tm-sort (lst / out m rest)
  (setq out (list))
  (while lst
    (setq m (car lst) rest (list))
    (foreach x (cdr lst)
      (if (< x m) (progn (setq rest (append rest (list m))) (setq m x))
                  (setq rest (append rest (list x)))))
    (setq out (append out (list m)))
    (setq lst rest))
  out)

(defun tm-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun tm-line (p1 p2 lyr)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p1) (cons 11 p2))))

(defun tm-rect (x1 y1 x2 y2 lyr)
  (entmake (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbPolyline") (cons 90 4) (cons 70 1)
                 (cons 10 (list x1 y1)) (cons 10 (list x2 y1))
                 (cons 10 (list x2 y2)) (cons 10 (list x1 y2)))))

(defun tm-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p) (cons 40 h) (cons 1 str) (cons 72 0))))

(defun tm-t (P A ang)
  (+ (* (- (car P) (car A)) (cos ang))
     (* (- (cadr P) (cadr A)) (sin ang))))

(defun tm-getpts (ent / ed pts pr)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  (if (= 1 (logand 1 (cdr (assoc 70 ed))))
    (setq pts (append pts (list (car pts)))))
  pts)

; τομές μιας οντότητας με τη γραμμή τομής -> λίστα t
(defun tm-hits (ent p1 p2 ang / etyp ed pa pb pts j hit out)
  (setq etyp (cdr (assoc 0 (entget ent))) out (list))
  (cond
    ((= etyp "LINE")
      (setq ed (entget ent))
      (setq pa (cdr (assoc 10 ed)) pb (cdr (assoc 11 ed)))
      (setq hit (inters p1 p2 pa pb))
      (if hit (setq out (list (tm-t hit p1 ang)))))
    ((= etyp "LWPOLYLINE")
      (setq pts (tm-getpts ent))
      (setq j 0)
      (while (< j (1- (length pts)))
        (setq hit (inters p1 p2 (nth j pts) (nth (1+ j) pts)))
        (if hit (setq out (append out (list (tm-t hit p1 ang)))))
        (setq j (1+ j)))))
  out)

;; -- ενημέρωση από dialog + preview --
(defun tm-upd ( / v)
  (setq v (atof (get_tile "hwall"))) (if (> v 0.5) (setq hwall v))
  (setq v (atof (get_tile "hbeam"))) (if (>= v 0.0) (setq hbeam v))
  (setq v (atof (get_tile "tslab"))) (if (> v 0.01) (setq tslab v))
  (setq v (atoi (get_tile "nfl")))  (if (> v 0) (setq nfl (min v 10)))
  (setq v (atoi (get_tile "nbas"))) (if (>= v 0) (setq nbas (min v 5)))
  (setq v (atof (get_tile "hbas"))) (if (> v 0.5) (setq hbas v))
  (set_tile "nfl" (itoa nfl)) (set_tile "nbas" (itoa nbas))
  (set_tile "gross" (strcat "Μεικτό ορόφου = " (rtos (+ hwall hbeam tslab) 2 2)
    " m  |  Συν. ύψος = " (rtos (+ (* nfl (+ hwall hbeam tslab)) (* nbas hbas)) 2 2) " m"))
  (tm-prev))

(defun tm-prev ( / w h hg tot sc gy x1 x2 xw k zb zbu zsu yy)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq hg (+ hwall hbeam tslab))
  (setq tot (+ (* nfl hg) (* nbas hbas)))
  (setq sc (/ (* h 0.88) tot))
  ;; γραμμή εδάφους στο σωστό σημείο
  (setq gy (fix (+ (* h 0.06) (* sc (* nfl hg)))))
  ;; ανωδομή
  (setq x1 (fix (* w 0.18)) x2 (fix (* w 0.70)) xw (fix (* w 0.10)))
  (setq k 0)
  (while (< k nfl)
    (setq zb (- gy (fix (* sc hg (float k)))))
    (setq zbu (- zb (fix (* sc hwall))))
    (setq zsu (- zb (fix (* sc (+ hwall hbeam)))))
    (vector_image x1 zb x1 zbu 7) (vector_image (+ x1 xw) zb (+ x1 xw) zbu 7)
    (vector_image x2 zb x2 zbu 7) (vector_image (+ x2 xw) zb (+ x2 xw) zbu 7)
    (vector_image x1 zbu (+ x1 xw) zsu 1) (vector_image x2 zbu (+ x2 xw) zsu 1)
    (setq yy (- zb (fix (* sc hg))))
    (vector_image (fix (* w 0.06)) zsu (fix (* w 0.90)) zsu 4)
    (vector_image (fix (* w 0.06)) yy (fix (* w 0.90)) yy 4)
    (setq k (1+ k)))
  ;; υπόγεια (κάτω από τη γραμμή εδάφους)
  (setq k 0)
  (while (< k nbas)
    (setq zb (+ gy (fix (* sc hbas (float (1+ k))))))
    (setq zbu (+ gy (fix (* sc hbas (float k)))))
    ;; περιμετρικά τοιχία (πιο χοντρά, χρώμα 8)
    (vector_image x1 zb x1 zbu 8) (vector_image (+ x1 xw) zb (+ x1 xw) zbu 8)
    (vector_image x2 zb x2 zbu 8) (vector_image (+ x2 xw) zb (+ x2 xw) zbu 8)
    ;; πλάκα υπογείου
    (vector_image (fix (* w 0.06)) zb (fix (* w 0.90)) zb 4)
    (setq k (1+ k)))
  ;; γραμμή εδάφους (έντονη)
  (vector_image (fix (* w 0.02)) gy (fix (* w 0.96)) gy 2)
  (vector_image (fix (* w 0.02)) (1+ gy) (fix (* w 0.96)) (1+ gy) 2)
  (end_image))

(defun C:TOMES ( / *error* p1 p2 ang ss i ent ts
    dclpath dclid status f
    hwall hbeam tslab hgross nfl nbas hbas base opall
    ops sso xd oph opsill opts t1o t2o
    inspt sx sy tmin tmax margin
    k z0 zslab-und zbeam-und t1 t2 lvl txt-h
    hits op zsill zhead)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\nΣφάλμα TOMES: " msg)))
    (princ))

  (tm-layer "TOMH"     7)
  (tm-layer "TOMH-CUT" 1)
  (tm-layer "TOMH-TXT" 2)
  (tm-layer "TOMH-OPN" 4)

  ;; 1. Γραμμή τομής
  (setq p1 (getpoint "\n1ο σημείο γραμμής τομής: "))
  (if (null p1) (exit))
  (setq p2 (getpoint p1 "\n2ο σημείο γραμμής τομής: "))
  (if (null p2) (exit))
  (setq ang (angle p1 p2))
  (tm-line p1 p2 "TOMH")

  ;; 2. Τοίχοι
  (princ "\nΕπίλεξε τους ΤΟΙΧΟΥΣ που τέμνει η τομή (ΟΧΙ τα κουφώματα):")
  (setq ss (ssget (list (cons 0 "LINE,LWPOLYLINE"))))
  (if (null ss) (progn (princ "\nΚαμία επιλογή.") (exit)))
  (setq ts (list) i 0)
  (while (< i (sslength ss))
    (setq ts (append ts (tm-hits (ssname ss i) p1 p2 ang)))
    (setq i (1+ i)))
  (if (< (length ts) 2)
    (progn (princ "\nΗ τομή δεν τέμνει τουλάχιστον 2 γραμμές τοίχου.") (exit)))
  (setq ts (tm-sort ts))

  ;; 3. Αυτόματη εύρεση κουφωμάτων WINDOORS (XData HEXIS_WD)
  (setq ops (list))
  (setq sso (ssget "X" (list (cons 0 "LWPOLYLINE") (list -3 (list "HEXIS_WD")))))
  (if sso
    (progn
      (setq i 0)
      (while (< i (sslength sso))
        (setq ent (ssname sso i))
        (setq hits (tm-hits ent p1 p2 ang))
        (if (>= (length hits) 2)
          (progn
            (setq hits (tm-sort hits))
            (setq t1o (car hits) t2o (last hits))
            ;; XData: 1000=τύπος, 1040 x3 = w, hop, sill
            (setq xd (cdadr (assoc -3 (entget ent (list "HEXIS_WD")))))
            (setq opts (list))
            (foreach pr xd
              (if (= (car pr) 1040) (setq opts (append opts (list (cdr pr))))))
            (if (>= (length opts) 3)
              (setq ops (append ops (list (list t1o t2o (cadr opts) (caddr opts))))))))
        (setq i (1+ i)))))
  (princ (strcat "\nΤοίχοι: " (itoa (/ (length ts) 2))
    " | Κουφώματα στην τομή: " (itoa (length ops))))

  ;; 4. DCL
  (setq dclpath (strcat (getvar "TEMPPREFIX") "tomes.dcl"))
  (setq f (open dclpath "w"))
  (write-line "tomes_dlg : dialog {" f)
  (write-line "  label = \"TOMES v3 — Αυτόματη Τομή (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "  : text { key = \"tinfo\"; width = 44; }" f)
  (write-line "  : edit_box { key = \"hwall\"; label = \"Καθαρό ύψος ορόφου (m):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"hbeam\"; label = \"Κρέμαση δοκού (m):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"tslab\"; label = \"Πάχος πλάκας (m):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"nfl\"; label = \"Όροφοι ανωδομής (1-10):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"nbas\"; label = \"Υπόγεια (0-5):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"hbas\"; label = \"Μεικτό ύψος υπογείου (m):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"base\"; label = \"Στάθμη αφετηρίας ±0.00 (m):\"; edit_width = 7; }" f)
  (write-line "  : toggle { key = \"opall\"; label = \"Κουφώματα σε όλους τους ορόφους (τυπικός όρ.)\"; value = \"1\"; }" f)
  (write-line "  : text { key = \"gross\"; width = 44; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "  : image { key = \"prev\"; width = 32; aspect_ratio = 1.15; color = 0; }" f)
  (write-line "  }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nΑποτυχία DCL.") (exit)))
  (if (not (new_dialog "tomes_dlg" dclid)) (progn (princ "\nΑποτυχία διαλόγου.") (exit)))
  (setq hwall 2.80 hbeam 0.40 tslab 0.20 nfl 1 nbas 0 hbas 3.00 base 0.00 opall "1")
  (set_tile "tinfo" (strcat "Τοίχοι: " (itoa (/ (length ts) 2))
    "  |  Κουφώματα: " (itoa (length ops))))
  (set_tile "hwall" "2.80") (set_tile "hbeam" "0.40") (set_tile "tslab" "0.20")
  (set_tile "nfl" "1") (set_tile "nbas" "0") (set_tile "hbas" "3.00")
  (set_tile "base" "0.00")
  (tm-upd)
  (action_tile "hwall" "(tm-upd)")
  (action_tile "hbeam" "(tm-upd)")
  (action_tile "tslab" "(tm-upd)")
  (action_tile "nfl" "(tm-upd)")
  (action_tile "nbas" "(tm-upd)")
  (action_tile "hbas" "(tm-upd)")
  (action_tile "accept" "(tm-upd) (setq base (atof (get_tile \"base\"))) (setq opall (get_tile \"opall\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\nΑκύρωση.") (exit)))
  (setq hgross (+ hwall hbeam tslab))

  ;; 5. Σημείο εισαγωγής (στάθμη ±0.00 στο ύψος του pick)
  (setq inspt (getpoint "\nΣημείο εισαγωγής τομής (αριστερό άκρο, στάθμη 0.00): "))
  (if (null inspt) (exit))
  (setq sx (car inspt) sy (cadr inspt))
  (setq tmin (car ts) tmax (last ts))
  (setq margin (* (- tmax tmin) 0.10))
  (if (< margin 0.5) (setq margin 0.5))
  (setq txt-h (* hgross 0.06))

  ;; ===== 6. ΥΠΟΓΕΙΑ =====
  (setq k 1)
  (while (<= k nbas)
    (setq z0 (- sy (* k hbas)))            ; δάπεδο υπογείου k
    ;; περιμετρικά τοιχία: συμπαγή σε όλο το ύψος
    (setq i 0)
    (while (< (1+ i) (length ts))
      (setq t1 (nth i ts) t2 (nth (1+ i) ts))
      (tm-rect (+ sx (- t1 tmin)) z0
               (+ sx (- t2 tmin)) (+ z0 hbas) "TOMH-CUT")
      (setq i (+ i 2)))
    ;; πλάκα οροφής υπογείου
    (tm-rect (- sx margin) (- (+ z0 hbas) tslab)
             (+ sx (- tmax tmin) margin) (+ z0 hbas) "TOMH-CUT")
    ;; στάθμη
    (setq lvl (- base (* k hbas)))
    (tm-txt (list (+ sx (- tmax tmin) margin (* txt-h 0.5)) (+ z0 (* txt-h 0.3)) 0.0)
            txt-h (rtos lvl 2 2) "TOMH-TXT")
    (setq k (1+ k)))
  ;; θεμελίωση: γενική κοιτόστρωση κάτω από το χαμηλότερο επίπεδο
  (setq z0 (- sy (* nbas hbas)))
  (tm-rect (- sx (* margin 1.5)) (- z0 (* tslab 2.0))
           (+ sx (- tmax tmin) (* margin 1.5)) z0 "TOMH-CUT")

  ;; ===== 7. ΑΝΩΔΟΜΗ =====
  (setq k 0)
  (while (< k nfl)
    (setq z0 (+ sy (* k hgross)))
    (setq zbeam-und (+ z0 hwall))
    (setq zslab-und (+ z0 hwall hbeam))

    ;; τοίχοι + δοκοί
    (setq i 0)
    (while (< (1+ i) (length ts))
      (setq t1 (nth i ts) t2 (nth (1+ i) ts))
      (tm-rect (+ sx (- t1 tmin)) z0
               (+ sx (- t2 tmin)) zbeam-und "TOMH-CUT")
      (tm-rect (+ sx (- t1 tmin)) zbeam-und
               (+ sx (- t2 tmin)) zslab-und "TOMH-CUT")
      (setq i (+ i 2)))

    ;; κουφώματα (μόνο ανωδομή, 1ος όροφος ή όλοι αν opall)
    (if (or (= k 0) (= opall "1"))
      (foreach op ops
        (setq t1 (car op) t2 (cadr op))
        (setq oph (caddr op) opsill (cadddr op))
        (setq zsill (+ z0 opsill))
        (setq zhead (+ zsill oph))
        (if (> zhead zbeam-und) (setq zhead zbeam-und))
        ;; ποδιά (αν sill>0)
        (if (> opsill 0.01)
          (tm-rect (+ sx (- t1 tmin)) z0
                   (+ sx (- t2 tmin)) zsill "TOMH-CUT"))
        ;; πρέκι: από κεφαλή ανοίγματος έως κάτω δοκού
        (if (< zhead zbeam-und)
          (tm-rect (+ sx (- t1 tmin)) zhead
                   (+ sx (- t2 tmin)) zbeam-und "TOMH-CUT"))
        ;; δοκός πάνω από το άνοιγμα
        (tm-rect (+ sx (- t1 tmin)) zbeam-und
                 (+ sx (- t2 tmin)) zslab-und "TOMH-CUT")
        ;; πλαίσιο κουφώματος: 2 κατακόρυφες + τζάμι στο μέσο
        (tm-line (list (+ sx (- t1 tmin)) zsill 0.0)
                 (list (+ sx (- t1 tmin)) zhead 0.0) "TOMH-OPN")
        (tm-line (list (+ sx (- t2 tmin)) zsill 0.0)
                 (list (+ sx (- t2 tmin)) zhead 0.0) "TOMH-OPN")
        (tm-line (list (+ sx (- (/ (+ t1 t2) 2.0) tmin)) zsill 0.0)
                 (list (+ sx (- (/ (+ t1 t2) 2.0) tmin)) zhead 0.0) "TOMH-OPN")
        (tm-line (list (+ sx (- t1 tmin)) zsill 0.0)
                 (list (+ sx (- t2 tmin)) zsill 0.0) "TOMH-OPN")
        (tm-line (list (+ sx (- t1 tmin)) zhead 0.0)
                 (list (+ sx (- t2 tmin)) zhead 0.0) "TOMH-OPN")))

    ;; πλάκα ορόφου
    (tm-rect (- sx margin) zslab-und
             (+ sx (- tmax tmin) margin) (+ zslab-und tslab) "TOMH-CUT")

    ;; στάθμη δαπέδου
    (setq lvl (+ base (* k hgross)))
    (tm-txt (list (+ sx (- tmax tmin) margin (* txt-h 0.5)) (+ z0 (* txt-h 0.3)) 0.0)
            txt-h (strcat (if (>= lvl 0.0) "+" "") (rtos lvl 2 2)) "TOMH-TXT")
    (setq k (1+ k)))

  ;; στάθμη οροφής
  (setq lvl (+ base (* nfl hgross)))
  (tm-txt (list (+ sx (- tmax tmin) margin (* txt-h 0.5))
                (+ sy (* nfl hgross) (* txt-h 0.3)) 0.0)
          txt-h (strcat "+" (rtos lvl 2 2)) "TOMH-TXT")

  ;; γραμμή εδάφους
  (tm-line (list (- sx (* margin 2.0)) sy 0.0)
           (list (+ sx (- tmax tmin) (* margin 2.0)) sy 0.0) "TOMH")

  (princ (strcat "\nTOMES v3.0 — " (itoa nfl) " όροφοι + " (itoa nbas)
    " υπόγεια, " (itoa (length ops)) " κουφώματα. Layers: TOMH/TOMH-CUT/TOMH-OPN/TOMH-TXT."))
  (princ))

(princ "\nTOMES v3.0 φορτώθηκε. Εντολή: TOMES")
(princ)
