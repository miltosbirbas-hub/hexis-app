;;; STEGH.LSP v1.0 — Επίλυση ισοκλινούς στέγης από κάτοψη
;;; Δίρριχτη / Μονόρριχτη · κλίση σε % ή μοίρες · hatch κεραμιδιού
;;; Τομή με στρώσεις: κεραμίδι, τεγίδες, θερμομόνωση, υγρομόνωση, πέτσωμα
;;; + Αναπτυγμένο ζευκτό: ελκυστήρας, αμείβοντες, ορθοστάτης, αντηρίδες
;;; Πηγές: ΕΜΠ (Ε.Τούση), ΤΕΙ Ηπείρου, ktirio.gr — ζευκτά ανά 1-5μ, τεγίδες <=90cm
;;; Εντολή: STEGH | HEXIS — BRB DEVELOPMENT

(setq *st-TYP* "GAB" *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50
      *st-TKER* 5.0 *st-TTEG* 8.0 *st-TTH* 8.0 *st-TPET* 2.5
      *st-BAM* 8.0 *st-HAM* 16.0 *st-BEL* 8.0 *st-HEL* 18.0
      *st-DZ* 0.90 *st-HATCH* "1" *st-SEC* "1" *st-TRUSS* "1")

(defun st-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun st-line (p1 p2 lyr)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p1) (cons 11 p2))))

(defun st-pline (pts lyr cls)
  (entmake (append
    (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lyr)
          (cons 100 "AcDbPolyline") (cons 90 (length pts)) (cons 70 (if cls 1 0)))
    (mapcar (quote (lambda (p) (cons 10 (list (car p) (cadr p))))) pts))))

(defun st-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p) (cons 40 h) (cons 1 str) (cons 72 0))))

(defun st-getpts (ent / ed pts pr)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  pts)

; γωνία κλίσης σε rad από τιμή+mode
(defun st-slope-rad ( )
  (if (= *st-PMODE* "PCT")
    (atan (/ *st-PIT* 100.0))
    (* *st-PIT* (/ pi 180.0))))

;; -- Preview: τομή στέγης σχηματικά --
(defun st-prev ( / w h th x0 x1 xm y0 rise sc)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq th (st-slope-rad))
  (setq x0 (fix (* w 0.10)) x1 (fix (* w 0.90)))
  (setq y0 (fix (* h 0.80)))
  ;; κλίμακα ώστε το rise να χωράει
  (setq rise (* (/ (- x1 x0) (if (= *st-TYP* "GAB") 2.0 1.0)) (/ (sin th) (cos th))))
  (setq sc 1.0)
  (if (> rise (* h 0.60)) (setq sc (/ (* h 0.60) rise)))
  (setq rise (fix (* rise sc)))
  ;; ελκυστήρας
  (vector_image x0 y0 x1 y0 7)
  (vector_image x0 (+ y0 3) x1 (+ y0 3) 7)
  (cond
    ((= *st-TYP* "GAB")
      (setq xm (fix (/ (+ x0 x1) 2)))
      ;; αμείβοντες
      (vector_image x0 y0 xm (- y0 rise) 7)
      (vector_image x1 y0 xm (- y0 rise) 7)
      ;; ορθοστάτης + αντηρίδες
      (vector_image xm y0 xm (- y0 rise) 1)
      (vector_image xm (- y0 (fix (* rise 0.35)))
                    (fix (+ x0 (* (- xm x0) 0.5))) (- y0 (fix (* rise 0.5))) 1)
      (vector_image xm (- y0 (fix (* rise 0.35)))
                    (fix (- x1 (* (- x1 xm) 0.5))) (- y0 (fix (* rise 0.5))) 1)
      ;; κεραμίδια πάνω από αμείβοντες (κυανό)
      (vector_image (- x0 4) (- y0 4) (- xm 0) (- y0 rise 4) 4)
      (vector_image (+ x1 4) (- y0 4) xm (- y0 rise 4) 4))
    (T
      ;; μονόρριχτη: ένας αμείβοντας
      (vector_image x0 y0 x1 (- y0 rise) 7)
      (vector_image (- x0 4) (- y0 4) (- x1 4) (- y0 rise 4) 4)
      (vector_image x1 y0 x1 (- y0 rise) 1)))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (setq v (atof (get_tile "dz")))  (if (> v 0.1) (setq *st-DZ* v))
  (setq v (atof (get_tile "tker"))) (if (> v 0.0) (setq *st-TKER* v))
  (setq v (atof (get_tile "tteg"))) (if (> v 0.0) (setq *st-TTEG* v))
  (setq v (atof (get_tile "tth")))  (if (>= v 0.0) (setq *st-TTH* v))
  (setq v (atof (get_tile "tpet"))) (if (> v 0.0) (setq *st-TPET* v))
  (setq v (atof (get_tile "ham")))  (if (> v 0.0) (setq *st-HAM* v))
  (setq v (atof (get_tile "hel")))  (if (> v 0.0) (setq *st-HEL* v))
  (set_tile "sinfo" (strcat "Γωνία = "
    (rtos (* (st-slope-rad) (/ 180.0 pi)) 2 1) " μοίρες  |  Κλίση = "
    (rtos (* 100.0 (/ (sin (st-slope-rad)) (cos (st-slope-rad)))) 2 1) " %"))
  (st-prev))

(defun C:STEGH ( / *error* ent pts n v0 v1 v2 v3 d01 d12 lng-ang shr-ang
    lng shr cen dclpath dclid status f
    th rise a-eave b-eave ridge-p1 ridge-p2 ovh
    e1 e2 e3 e4 rowsp nr i off pside cross s hipt
    inspt sx sy span half sc-m tk tg tt tp
    heel1 heel2 apex bx by lx ly j xx yy zz nteg dteg
    lab-h lab-x lab-y)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\nΣφάλμα STEGH: " msg)))
    (princ))

  (st-layer "STEGH"     7)   ; κάτοψη
  (st-layer "STEGH-KER" 1)   ; hatch κεραμίδι
  (st-layer "STEGH-SEC" 7)   ; τομή/ζευκτό
  (st-layer "STEGH-TXT" 2)   ; ετικέτες

  ;; 1. Επιλογή ορθογωνικής polyline κάτοψης
  (princ "\nΕπίλεξε την ΟΡΘΟΓΩΝΙΚΗ polyline του περιγράμματος στέγης:")
  (setq ent (entsel))
  (if (null ent) (exit))
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 4) (progn (princ "\nΧρειάζεται κλειστό ορθογώνιο 4 κορυφών.") (exit)))
  (setq v0 (nth 0 pts) v1 (nth 1 pts) v2 (nth 2 pts) v3 (nth 3 pts))
  (setq d01 (distance v0 v1) d12 (distance v1 v2))
  ;; μεγάλη πλευρά = διεύθυνση κορφιά
  (if (>= d01 d12)
    (progn (setq lng d01 shr d12 lng-ang (angle v0 v1) shr-ang (angle v1 v2)))
    (progn (setq lng d12 shr d01 lng-ang (angle v1 v2) shr-ang (angle v0 v1))))
  (setq cen (list (/ (+ (car v0) (car v2)) 2.0) (/ (+ (cadr v0) (cadr v2)) 2.0) 0.0))

  ;; 2. DCL
  (setq dclpath (strcat (getvar "TEMPPREFIX") "stegh.dcl"))
  (setq f (open dclpath "w"))
  (write-line "stegh_dlg : dialog {" f)
  (write-line "  label = \"STEGH — Επίλυση Στέγης (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "  : radio_row { key = \"typ\"; label = \"Τύπος\";" f)
  (write-line "    : radio_button { key = \"t_gab\"; label = \"Δίρριχτη\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"t_mon\"; label = \"Μονόρριχτη\"; }" f)
  (write-line "  }" f)
  (write-line "  : radio_row { key = \"pm\"; label = \"Μονάδα κλίσης\";" f)
  (write-line "    : radio_button { key = \"p_pct\"; label = \"%\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"p_deg\"; label = \"Μοίρες\"; }" f)
  (write-line "  }" f)
  (write-line "  : edit_box { key = \"pit\"; label = \"Κλίση:\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"ovh\"; label = \"Προεξοχή στέγης (m):\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"dz\"; label = \"Απόσταση ζευκτών/τεγίδων (m):\"; edit_width = 7; }" f)
  (write-line "  : text { label = \"— Πάχη στρώσεων (cm) —\"; }" f)
  (write-line "  : edit_box { key = \"tker\"; label = \"Κεραμίδι:\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"tteg\"; label = \"Τεγίδα:\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"tth\"; label = \"Θερμομόνωση:\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"tpet\"; label = \"Πέτσωμα:\"; edit_width = 7; }" f)
  (write-line "  : text { label = \"— Ζευκτό (cm) —\"; }" f)
  (write-line "  : edit_box { key = \"ham\"; label = \"Ύψος αμείβοντα:\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"hel\"; label = \"Ύψος ελκυστήρα:\"; edit_width = 7; }" f)
  (write-line "  : toggle { key = \"hat\"; label = \"Hatch κεραμίδι στην κάτοψη\"; value = \"1\"; }" f)
  (write-line "  : toggle { key = \"sec\"; label = \"Τομή με στρώσεις υλικών\"; value = \"1\"; }" f)
  (write-line "  : toggle { key = \"tru\"; label = \"Αναπτυγμένο ζευκτό\"; value = \"1\"; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "  : image { key = \"prev\"; width = 34; aspect_ratio = 0.75; color = 0; }" f)
  (write-line "  : text { key = \"sinfo\"; width = 40; }" f)
  (write-line "  }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nΑποτυχία DCL.") (exit)))
  (if (not (new_dialog "stegh_dlg" dclid)) (progn (princ "\nΑποτυχία διαλόγου.") (exit)))
  (set_tile "pit" (rtos *st-PIT* 2 1))
  (set_tile "ovh" (rtos *st-OVH* 2 2))
  (set_tile "dz" (rtos *st-DZ* 2 2))
  (set_tile "tker" (rtos *st-TKER* 2 1))
  (set_tile "tteg" (rtos *st-TTEG* 2 1))
  (set_tile "tth" (rtos *st-TTH* 2 1))
  (set_tile "tpet" (rtos *st-TPET* 2 1))
  (set_tile "ham" (rtos *st-HAM* 2 1))
  (set_tile "hel" (rtos *st-HEL* 2 1))
  (st-upd)
  (action_tile "t_gab" "(setq *st-TYP* \"GAB\") (st-prev)")
  (action_tile "t_mon" "(setq *st-TYP* \"MON\") (st-prev)")
  (action_tile "p_pct" "(setq *st-PMODE* \"PCT\") (st-upd)")
  (action_tile "p_deg" "(setq *st-PMODE* \"DEG\") (st-upd)")
  (action_tile "pit" "(st-upd)")
  (action_tile "ovh" "(st-upd)")
  (action_tile "dz" "(st-upd)")
  (action_tile "tker" "(st-upd)") (action_tile "tteg" "(st-upd)")
  (action_tile "tth" "(st-upd)") (action_tile "tpet" "(st-upd)")
  (action_tile "ham" "(st-upd)") (action_tile "hel" "(st-upd)")
  (action_tile "accept"
    "(st-upd) (setq *st-HATCH* (get_tile \"hat\")) (setq *st-SEC* (get_tile \"sec\")) (setq *st-TRUSS* (get_tile \"tru\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\nΑκύρωση.") (exit)))

  (setq th (st-slope-rad))
  (setq ovh *st-OVH*)

  ;; ===== 3. ΚΑΤΟΨΗ =====
  ;; προεξοχή: offset περίγραμμα προς τα έξω
  ;; (απλοποίηση ορθογωνίου: επεκτείνουμε τις 4 κορυφές διαγώνια)
  (setq e1 (polar (polar v0 (+ lng-ang pi) ovh) (+ shr-ang pi) ovh))
  (setq e2 (polar (polar v1 lng-ang ovh) (+ shr-ang pi) ovh))
  (setq e3 (polar (polar v2 lng-ang ovh) shr-ang ovh))
  (setq e4 (polar (polar v3 (+ lng-ang pi) ovh) shr-ang ovh))
  (st-pline (list e1 e2 e3 e4) "STEGH" T)

  (if (= *st-TYP* "GAB")
    (progn
      ;; κορφιάς στη μέση, παράλληλος στη μεγάλη πλευρά
      (setq ridge-p1 (polar cen (+ lng-ang pi) (+ (/ lng 2.0) ovh)))
      (setq ridge-p2 (polar cen lng-ang (+ (/ lng 2.0) ovh)))
      (st-line ridge-p1 ridge-p2 "STEGH")
      ;; βέλη κλίσης (2, ένα ανά πλάνη)
      (st-line cen (polar cen shr-ang (* shr 0.35)) "STEGH-TXT")
      (st-line cen (polar cen (+ shr-ang pi) (* shr 0.35)) "STEGH-TXT"))
    (progn
      ;; μονόρριχτη: δείξε την ΨΗΛΗ πλευρά
      (setq pside (getpoint "\nΔείξε προς την ΨΗΛΗ πλευρά (κορυφή μονόρριχτης): "))
      (if (null pside) (setq pside (polar cen shr-ang shr)))
      (setq cross (- (* (cos lng-ang) (- (cadr pside) (cadr cen)))
                     (* (sin lng-ang) (- (car pside) (car cen)))))
      (setq s (if (>= cross 0.0) 1.0 -1.0))
      ;; βέλος ροής νερού προς τη χαμηλή
      (setq hipt (polar cen (+ lng-ang (* s (/ pi 2))) (* shr 0.3)))
      (st-line hipt (polar hipt (- lng-ang (* s (/ pi 2))) (* shr 0.6)) "STEGH-TXT")))

  ;; hatch κεραμιδιού: σειρές παράλληλες στον κορφιά ανά 0.35*cos(θ)
  (if (= *st-HATCH* "1")
    (progn
      (setq rowsp (* 0.35 (cos th)))
      (setq nr (fix (/ (+ (/ shr 2.0) ovh) rowsp)))
      (if (= *st-TYP* "MON") (setq nr (fix (/ (+ shr (* 2 ovh)) rowsp))))
      (setq i 1)
      (while (<= i nr)
        (setq off (* i rowsp))
        (if (= *st-TYP* "GAB")
          (progn
            ;; πάνω πλάνη
            (st-line (polar ridge-p1 shr-ang off) (polar ridge-p2 shr-ang off) "STEGH-KER")
            ;; κάτω πλάνη
            (st-line (polar ridge-p1 (+ shr-ang pi) off) (polar ridge-p2 (+ shr-ang pi) off) "STEGH-KER"))
          (st-line (polar e1 shr-ang off) (polar e2 shr-ang off) "STEGH-KER"))
        (setq i (1+ i)))))

  ;; ===== 4. ΤΟΜΗ + ΖΕΥΚΤΟ =====
  (if (or (= *st-SEC* "1") (= *st-TRUSS* "1"))
    (progn
      (setq inspt (getpoint "\nΣημείο εισαγωγής τομής/ζευκτού: "))
      (if inspt
        (progn
          (setq sx (car inspt) sy (cadr inspt))
          (setq span (+ shr (* 2 ovh)))
          (setq half (/ span 2.0))
          (setq tk (/ *st-TKER* 100.0) tg (/ *st-TTEG* 100.0)
                tt (/ *st-TTH* 100.0) tp (/ *st-TPET* 100.0))
          (setq lab-h (* span 0.02))

          ;; -- ΖΕΥΚΤΟ --
          (setq heel1 (list sx sy 0.0))
          (if (= *st-TYP* "GAB")
            (progn
              (setq heel2 (list (+ sx span) sy 0.0))
              (setq apex (list (+ sx half) (+ sy (* half (/ (sin th) (cos th)))) 0.0)))
            (progn
              (setq heel2 (list (+ sx span) sy 0.0))
              (setq apex (list (+ sx span) (+ sy (* span (/ (sin th) (cos th)))) 0.0))))

          ;; ελκυστήρας
          (st-pline (list heel1 heel2
            (list (car heel2) (- (cadr heel2) (/ *st-HEL* 100.0)) 0.0)
            (list (car heel1) (- (cadr heel1) (/ *st-HEL* 100.0)) 0.0)) "STEGH-SEC" T)

          ;; αμείβοντες (πάχος HAM κάθετα στην κλίση)
          (setq zz (/ *st-HAM* 100.0))
          (st-pline (list heel1 apex
            (list (- (car apex) (* zz (sin th))) (+ (cadr apex) (* zz (cos th))) 0.0)
            (list (- (car heel1) (* zz (sin th))) (+ (cadr heel1) (* zz (cos th))) 0.0))
            "STEGH-SEC" T)
          (if (= *st-TYP* "GAB")
            (st-pline (list heel2 apex
              (list (+ (car apex) (* zz (sin th))) (+ (cadr apex) (* zz (cos th))) 0.0)
              (list (+ (car heel2) (* zz (sin th))) (+ (cadr heel2) (* zz (cos th))) 0.0))
              "STEGH-SEC" T))

          ;; ορθοστάτης + αντηρίδες (μόνο δίρριχτη, ζευκτό)
          (if (and (= *st-TYP* "GAB") (= *st-TRUSS* "1"))
            (progn
              (st-line (list (car apex) sy 0.0) apex "STEGH-SEC")
              ;; αντηρίδες: από 1/3 ορθοστάτη προς μέσο αμειβόντων
              (setq yy (+ sy (* (- (cadr apex) sy) 0.33)))
              (st-line (list (car apex) yy 0.0)
                (list (+ sx (* span 0.27)) (+ sy (* (* span 0.27) (/ (sin th) (cos th)))) 0.0)
                "STEGH-SEC")
              (st-line (list (car apex) yy 0.0)
                (list (+ sx (* span 0.73)) (+ sy (* (- span (* span 0.73)) (/ (sin th) (cos th)))) 0.0)
                "STEGH-SEC")))

          ;; -- ΣΤΡΩΣΕΙΣ (πάνω από τον αριστερό αμείβοντα) --
          (if (= *st-SEC* "1")
            (progn
              ;; τεγίδες: τετράγωνα tg x tg ανά DZ κατά μήκος της κλίσης
              (setq dteg *st-DZ*)
              (setq nteg (fix (/ (/ half (cos th)) dteg)))
              (if (= *st-TYP* "MON") (setq nteg (fix (/ (/ span (cos th)) dteg))))
              (setq j 0)
              (while (<= j nteg)
                (setq xx (+ (car heel1) (* (* j dteg) (cos th)) (- (* zz (sin th)))))
                (setq yy (+ (cadr heel1) (* (* j dteg) (sin th)) (* zz (cos th))))
                (st-pline (list
                  (list xx yy 0.0)
                  (list (+ xx (* tg (cos th))) (+ yy (* tg (sin th))) 0.0)
                  (list (+ xx (* tg (cos th)) (- (* tg (sin th)))) (+ yy (* tg (sin th)) (* tg (cos th))) 0.0)
                  (list (- xx (* tg (sin th))) (+ yy (* tg (cos th))) 0.0)) "STEGH-SEC" T)
                (setq j (1+ j)))

              ;; πέτσωμα: λωρίδα tp πάνω από τεγίδες
              (setq off (+ zz tg))
              (st-line
                (list (- (car heel1) (* off (sin th))) (+ (cadr heel1) (* off (cos th))) 0.0)
                (list (- (car apex) (* off (sin th))) (+ (cadr apex) (* off (cos th))) 0.0)
                "STEGH-SEC")
              (setq off (+ off tp))
              (st-line
                (list (- (car heel1) (* off (sin th))) (+ (cadr heel1) (* off (cos th))) 0.0)
                (list (- (car apex) (* off (sin th))) (+ (cadr apex) (* off (cos th))) 0.0)
                "STEGH-SEC")
              ;; υγρομόνωση: διακεκομμένη-σχηματικά (2η γραμμή κοντά)
              (setq off (+ off 0.005))
              (st-line
                (list (- (car heel1) (* off (sin th))) (+ (cadr heel1) (* off (cos th))) 0.0)
                (list (- (car apex) (* off (sin th))) (+ (cadr apex) (* off (cos th))) 0.0)
                "STEGH-KER")
              ;; θερμομόνωση: λωρίδα tt
              (setq off (+ off tt))
              (st-line
                (list (- (car heel1) (* off (sin th))) (+ (cadr heel1) (* off (cos th))) 0.0)
                (list (- (car apex) (* off (sin th))) (+ (cadr apex) (* off (cos th))) 0.0)
                "STEGH-SEC")
              ;; κεραμίδια: σκαλωτή γραμμή (βήματα ανά 0.35 στην κλίση)
              (setq off (+ off tk))
              (setq j 0)
              (while (< (* j 0.35) (/ (if (= *st-TYP* "GAB") half span) (cos th)))
                (setq xx (+ (car heel1) (* (* j 0.35) (cos th)) (- (* off (sin th)))))
                (setq yy (+ (cadr heel1) (* (* j 0.35) (sin th)) (* off (cos th))))
                (st-line (list xx yy 0.0)
                  (list (+ xx (* 0.35 (cos th))) (+ yy (* 0.35 (sin th))) 0.0) "STEGH-KER")
                (st-line (list xx yy 0.0)
                  (list (+ xx (* tk 0.6 (sin th))) (- yy (* tk 0.6 (cos th))) 0.0) "STEGH-KER")
                (setq j (1+ j)))

              ;; -- ΕΤΙΚΕΤΕΣ ΣΤΡΩΣΕΩΝ --
              (setq lab-x (- sx (* span 0.42)))
              (setq lab-y (+ sy (* span 0.05)))
              (st-txt (list lab-x (+ lab-y (* lab-h 10.0)) 0.0) lab-h
                (strcat "1. ΚΕΡΑΜΙΔΙ " (rtos *st-TKER* 2 1) " cm") "STEGH-TXT")
              (st-txt (list lab-x (+ lab-y (* lab-h 8.5)) 0.0) lab-h
                "2. ΥΓΡΟΜΟΝΩΣΗ (μεμβράνη)" "STEGH-TXT")
              (st-txt (list lab-x (+ lab-y (* lab-h 7.0)) 0.0) lab-h
                (strcat "3. ΘΕΡΜΟΜΟΝΩΣΗ " (rtos *st-TTH* 2 1) " cm") "STEGH-TXT")
              (st-txt (list lab-x (+ lab-y (* lab-h 5.5)) 0.0) lab-h
                (strcat "4. ΠΕΤΣΩΜΑ " (rtos *st-TPET* 2 1) " cm") "STEGH-TXT")
              (st-txt (list lab-x (+ lab-y (* lab-h 4.0)) 0.0) lab-h
                (strcat "5. ΤΕΓΙΔΕΣ " (rtos *st-TTEG* 2 1) "x" (rtos *st-TTEG* 2 1)
                  " ανά " (rtos *st-DZ* 2 2) " m") "STEGH-TXT")
              (st-txt (list lab-x (+ lab-y (* lab-h 2.5)) 0.0) lab-h
                (strcat "6. ΑΜΕΙΒΟΝΤΕΣ (ΨΑΛΙΔΙΑ) 8x" (rtos *st-HAM* 2 0) " cm") "STEGH-TXT")
              (st-txt (list lab-x (+ lab-y (* lab-h 1.0)) 0.0) lab-h
                (strcat "7. ΕΛΚΥΣΤΗΡΑΣ 8x" (rtos *st-HEL* 2 0) " cm") "STEGH-TXT")))
        )))
  )

  (princ (strcat "\nSTEGH v1.0 — " (if (= *st-TYP* "GAB") "Δίρριχτη" "Μονόρριχτη")
    " | κλίση " (rtos (* (st-slope-rad) (/ 180.0 pi)) 2 1) " μοιρών"
    " | Layers: STEGH / STEGH-KER / STEGH-SEC / STEGH-TXT"))
  (princ))

(princ "\nSTEGH v1.0 φορτώθηκε. Εντολή: STEGH")
(princ)
