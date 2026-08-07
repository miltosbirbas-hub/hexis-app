;;; TOIXOS.LSP v3.0 — ΣΧΕΔΙΑΣΗ ΤΟΙΧΩΝ
;;; Τρόποι: ΣΥΝΕΧΗΣ (αλυσίδα με αυτόματο φάλτσο γωνιών) ή ΜΕΜΟΝΩΜΕΝΟΣ (ένα τμήμα)
;;; Εντολές: TOIXOS · TOIXOSJOIN · TOIXOSROOM
;;; HEXIS Platform — BRB DEVELOPMENT MON. I.K.E.
;;; ΠΡΟΣΟΧΗ: αρχείο σε Windows-1253. ΜΗΝ το μετατρέψεις σε UTF-8.

(setq *wl-W* 0.20 *wl-H* 3.00 *wl-TYP* "DIPLOS" *wl-INS* 0.05
      *wl-EXT* "0" *wl-ETICS* 0.08 *wl-SIDE* 1.0 *wl-ALIGN* "CENTER"
      *wl-MODE* "CHAIN")

;; ===================== ΒΑΣΙΚΑ =====================
(defun wl-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun wl-line (p1 p2 lyr)
  (if (> (distance p1 p2) 1e-7)
    (entmake (append
      (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
            (cons 100 "AcDbLine")
            (cons 10 (list (car p1) (cadr p1) 0.0))
            (cons 11 (list (car p2) (cadr p2) 0.0)))
      (if *wl-XD* (list *wl-XD*) nil)))))

(defun wl-pline (pts lyr cl / el p)
  (setq el (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbPolyline") (cons 90 (length pts))
                 (cons 70 (if (= cl 1) 1 0))))
  (foreach p pts (setq el (append el (list (cons 10 (list (car p) (cadr p)))))))
  (entmake el))

(defun wl-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbText")
                 (cons 10 (list (car p) (cadr p) 0.0)) (cons 40 h)
                 (cons 1 str) (cons 72 1) (cons 73 0)
                 (cons 11 (list (car p) (cadr p) 0.0)))))

(defun wl-xdata (typ ww hh ext etics)
  (if (null (tblsearch "APPID" "HEXIS_WL")) (regapp "HEXIS_WL"))
  (list -3 (list "HEXIS_WL"
    (cons 1000 typ) (cons 1040 ww) (cons 1040 hh)
    (cons 1000 ext) (cons 1040 etics))))

;; ===================== ΓΕΩΜΕΤΡΙΑ =====================
;; μοναδιαία κάθετος ΑΡΙΣΤΕΡΑ της ακμής a->b
(defun wl-nrm (a b / dx dy LL)
  (setq dx (- (car b) (car a)) dy (- (cadr b) (cadr a)))
  (setq LL (sqrt (+ (* dx dx) (* dy dy))))
  (if (< LL 1e-12) nil (list (/ (- 0.0 dy) LL) (/ dx LL))))

;; σημείο p μετατοπισμένο κατά d, φαλτσογωνιασμένο μεταξύ n1 και n2
(defun wl-mit (p n1 n2 d / det vx vy)
  (if (null n1) (setq n1 n2))
  (if (null n2) (setq n2 n1))
  (if (null n1) (list (car p) (cadr p))
    (progn
      (setq det (- (* (car n1) (cadr n2)) (* (cadr n1) (car n2))))
      (if (< (abs det) 1e-9)
        (list (+ (car p) (* (car n1) d)) (+ (cadr p) (* (cadr n1) d)))
        (progn
          (setq vx (/ (* d (- (cadr n2) (cadr n1))) det))
          (setq vy (/ (* d (- (car n1) (car n2))) det))
          (list (+ (car p) vx) (+ (cadr p) vy)))))))

;; αλυσίδα σημείων -> offset αλυσίδα κατά d (cl=1 κλειστή)
(defun wl-off (pts d cl / n i out n1 n2)
  (setq n (length pts) out (list) i 0)
  (while (< i n)
    (if (= cl 1)
      (setq n1 (wl-nrm (nth (rem (+ i (1- n)) n) pts) (nth i pts))
            n2 (wl-nrm (nth i pts) (nth (rem (1+ i) n) pts)))
      (setq n1 (if (> i 0) (wl-nrm (nth (1- i) pts) (nth i pts)) nil)
            n2 (if (< i (1- n)) (wl-nrm (nth i pts) (nth (1+ i) pts)) nil)))
    (setq out (append out (list (wl-mit (nth i pts) n1 n2 d))))
    (setq i (1+ i)))
  out)

;; σχεδίαση σειράς LINE κατά μήκος αλυσίδας
(defun wl-chainlines (pts lyr cl / n i)
  (setq n (length pts) i 0)
  (while (< i (if (= cl 1) n (1- n)))
    (wl-line (nth i pts) (nth (rem (1+ i) n) pts) lyr)
    (setq i (1+ i))))

;; τομή 2 ευθειών (σημείο + διάνυσμα)
(defun wl-isect (p1 v1 p2 v2 / det dx dy tt)
  (setq det (- (* (car v1) (cadr v2)) (* (cadr v1) (car v2))))
  (if (< (abs det) 1e-9) nil
    (progn (setq dx (- (car p2) (car p1)) dy (- (cadr p2) (cadr p1)))
           (setq tt (/ (- (* dx (cadr v2)) (* dy (car v2))) det))
           (list (+ (car p1) (* tt (car v1)))
                 (+ (cadr p1) (* tt (cadr v1))) 0.0))))

(defun wl-tpar (P p1 v)
  (+ (* (- (car P) (car p1)) (car v))
     (* (- (cadr P) (cadr p1)) (cadr v))))

(defun wl-area (pts / n i p q a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  (abs (/ a 2.0)))

(defun wl-perim (pts / n i a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n)
    (setq a (+ a (distance (nth i pts) (nth (rem (1+ i) n) pts))))
    (setq i (1+ i)))
  a)

(defun wl-cen (pts / n cx cy i p)
  (setq n (length pts) cx 0.0 cy 0.0 i 0)
  (while (< i n)
    (setq p (nth i pts) cx (+ cx (car p)) cy (+ cy (cadr p)))
    (setq i (1+ i)))
  (list (/ cx n) (/ cy n) 0.0))

;; ===================== ΣΧΕΔΙΑΣΗ ΤΟΙΧΟΥ =====================
;; pts=άξονας, cl=κλειστό, o1/o2=offsets παρειών, oe=offset ETICS
(defun wl-draw (pts cl o1 o2 ext oe lyr / LL RR EE)
  (setq LL (wl-off pts o1 cl) RR (wl-off pts o2 cl))
  (wl-chainlines LL lyr cl)
  (wl-chainlines RR lyr cl)
  (if (/= cl 1)
    (progn
      (wl-line (car LL) (car RR) lyr)
      (wl-line (last LL) (last RR) lyr)))
  (if (= ext "1")
    (progn
      (setq EE (wl-off pts oe cl))
      (wl-chainlines EE "WALL-ETICS" cl)
      (if (/= cl 1)
        (progn
          (wl-line (car EE) (car LL) "WALL-ETICS")
          (wl-line (last EE) (last LL) "WALL-ETICS")))))
  (wl-pline pts "WALL-AXIS" cl)
  (length pts))

;; ===================== DCL =====================
(defun wl-dcl ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "toixos3.dcl"))
  (setq f (open path "w"))
  (write-line "toixos3 : dialog {" f)
  (write-line "  label = \"TOIXOS v3 \U+2014 \U+03A3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7 \U+03A4\U+03BF\U+03AF\U+03C7\U+03C9\U+03BD (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "    : column {" f)
  (write-line "      : boxed_radio_column { key = \"md\"; label = \"\U+03A4\U+03C1\U+03CC\U+03C0\U+03BF\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7\U+03C2\";" f)
  (write-line "        : radio_button { key = \"m_ch\"; label = \"\U+03A3\U+03A5\U+039D\U+0395\U+03A7\U+0397\U+03A3 \U+2014 \U+03B1\U+03BB\U+03C5\U+03C3\U+03AF\U+03B4\U+03B1 \U+03C4\U+03BF\U+03AF\U+03C7\U+03C9\U+03BD (auto \U+03C6\U+03AC\U+03BB\U+03C4\U+03C3\U+03BF \U+03B3\U+03C9\U+03BD\U+03B9\U+03CE\U+03BD)\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"m_sg\"; label = \"\U+039C\U+0395\U+039C\U+039F\U+039D\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A3 \U+2014 \U+03AD\U+03BD\U+03B1 \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1 \U+03BA\U+03AC\U+03B8\U+03B5 \U+03C6\U+03BF\U+03C1\U+03AC\"; }" f)
  (write-line "      }" f)
  (write-line "      : boxed_radio_column { key = \"typ\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\";" f)
  (write-line "        : radio_button { key = \"t_bat\"; label = \"\U+039C\U+03C0\U+03B1\U+03C4\U+03B9\U+03BA\U+03CC\U+03C2 (9.5 cm)\"; }" f)
  (write-line "        : radio_button { key = \"t_dro\"; label = \"\U+0394\U+03C1\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 (6.5 cm)\"; }" f)
  (write-line "        : radio_button { key = \"t_dip\"; label = \"\U+0394\U+03B9\U+03C0\U+03BB\U+03CC\U+03C2 \U+03B4\U+03C1\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 + \U+03BC\U+03CC\U+03BD\U+03C9\U+03C3\U+03B7\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"t_bet\"; label = \"\U+03A6.\U+03A3. / \U+039C\U+03C0\U+03B5\U+03C4\U+03CC\U+03BD\"; }" f)
  (write-line "      }" f)
  (write-line "      : edit_box { key = \"ins\"; label = \"\U+039C\U+03CC\U+03BD\U+03C9\U+03C3\U+03B7 \U+03B4\U+03B9\U+03C0\U+03BB\U+03BF\U+03CD (cm):\"; edit_width = 7; }" f)
  (write-line "      : edit_box { key = \"ww\";  label = \"\U+03A0\U+03AC\U+03C7\U+03BF\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (m):\"; edit_width = 7; }" f)
  (write-line "      : edit_box { key = \"hh\";  label = \"\U+038E\U+03C8\U+03BF\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (m):\"; edit_width = 7; }" f)
  (write-line "    }" f)
  (write-line "    : column {" f)
  (write-line "      : boxed_radio_column { key = \"aln\"; label = \"\U+0398\U+03AD\U+03C3\U+03B7 \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1\";" f)
  (write-line "        : radio_button { key = \"a_cen\"; label = \"\U+039A\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"a_in\";  label = \"\U+0395\U+03C3\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03AE \U+03C0\U+03B1\U+03C1\U+03B5\U+03B9\U+03AC\"; }" f)
  (write-line "        : radio_button { key = \"a_out\"; label = \"\U+0395\U+03BE\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03AE \U+03C0\U+03B1\U+03C1\U+03B5\U+03B9\U+03AC\"; }" f)
  (write-line "      }" f)
  (write-line "      : toggle { key = \"ext\"; label = \"\U+0395\U+03BE\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03CC\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C2 (\U+03B8\U+03B5\U+03C1\U+03BC\U+03BF\U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7)\"; }" f)
  (write-line "      : edit_box { key = \"etics\"; label = \"ETICS d (cm):\"; edit_width = 7; }" f)
  (write-line "      : image { key = \"prev\"; width = 30; aspect_ratio = 0.55; color = 0; }" f)
  (write-line "      : text { key = \"i1\"; width = 34; }" f)
  (write-line "      : text { key = \"i2\"; width = 34; }" f)
  (write-line "    }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f) path)

(defun wl-prev ( / w h cx y0 y1 tk ins ax ec)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev") (fill_image 0 0 w h 0)
  (setq cx (fix (* w 0.45)) y0 (fix (* h 0.20)) y1 (fix (* h 0.80)))
  (setq tk (fix (* w 0.13)))
  (fill_image (- cx tk) y0 (* tk 2) (- y1 y0)
    (cond ((= *wl-TYP* "BETON") 5) ((= *wl-TYP* "BATIKOS") 1)
          ((= *wl-TYP* "DROMIKOS") 3) (T 4)))
  (vector_image (- cx tk) y0 (+ cx tk) y0 7)
  (vector_image (- cx tk) y1 (+ cx tk) y1 7)
  (vector_image (- cx tk) y0 (- cx tk) y1 7)
  (vector_image (+ cx tk) y0 (+ cx tk) y1 7)
  (if (= *wl-TYP* "DIPLOS")
    (progn
      (setq ins (fix (* w 0.045)))
      (fill_image (- cx ins) y0 (* ins 2) (- y1 y0) 8)
      (vector_image (- cx ins) y0 (- cx ins) y1 7)
      (vector_image (+ cx ins) y0 (+ cx ins) y1 7)))
  (if (= *wl-EXT* "1")
    (progn
      (setq ec (fix (* w 0.06)))
      (fill_image (+ cx tk) y0 ec (- y1 y0) 3)
      (vector_image (+ cx tk ec) y0 (+ cx tk ec) y1 7)))
  (setq ax (cond ((= *wl-ALIGN* "CENTER") cx)
                 ((= *wl-ALIGN* "INSIDE") (- cx tk))
                 (T (+ cx tk))))
  (vector_image ax y0 ax y1 2)
  (set_tile "i1" (strcat "\U+03A0\U+03AC\U+03C7\U+03BF\U+03C2 " (rtos *wl-W* 2 3) " m"
    (if (= *wl-EXT* "1") (strcat " + ETICS " (rtos *wl-ETICS* 2 2) " m") "")))
  (set_tile "i2" (strcat (if (= *wl-MODE* "CHAIN") "\U+03A3\U+03A5\U+039D\U+0395\U+03A7\U+0397\U+03A3" "\U+039C\U+0395\U+039C\U+039F\U+039D\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A3")
    "  \U+00B7  \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1\U+03C2: "
    (cond ((= *wl-ALIGN* "CENTER") "\U+03BA\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF")
          ((= *wl-ALIGN* "INSIDE") "\U+03B5\U+03C3\U+03C9\U+03C4.") (T "\U+03B5\U+03BE\U+03C9\U+03C4."))))
  (end_image))

(defun wl-preset (typ / ins)
  (setq ins (/ (atof (get_tile "ins")) 100.0))
  (setq *wl-TYP* typ *wl-INS* ins)
  (cond
    ((= typ "BATIKOS")  (setq *wl-W* 0.095))
    ((= typ "DROMIKOS") (setq *wl-W* 0.065))
    ((= typ "DIPLOS")   (setq *wl-W* (+ 0.095 ins 0.065)))
    (T                  (setq *wl-W* 0.20)))
  (set_tile "ww" (rtos *wl-W* 2 3))
  (wl-prev))

(defun wl-upd ( / v)
  (setq v (atof (get_tile "ww")))    (if (> v 0.0) (setq *wl-W* v))
  (setq v (atof (get_tile "hh")))    (if (> v 0.0) (setq *wl-H* v))
  (setq v (atof (get_tile "etics"))) (if (>= v 0.0) (setq *wl-ETICS* (/ v 100.0)))
  (setq *wl-EXT* (get_tile "ext"))
  (wl-prev))

;; ===================== ΕΝΤΟΛΗ TOIXOS =====================
(defun C:TOIXOS ( / *error* dclpath dclid status ww hh ext etics typ
                    lyr col s o1 o2 oe pts p go cl more nseg ntot)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 TOIXOS: " msg)))
    (setq *wl-XD* nil)
    (princ))

  (setq dclpath (wl-dcl))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 DCL.") (exit)))
  (if (not (new_dialog "toixos3" dclid))
    (progn (unload_dialog dclid) (princ "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 dialog.") (exit)))
  (set_tile "ww"    (rtos *wl-W* 2 3))
  (set_tile "hh"    (rtos *wl-H* 2 2))
  (set_tile "ins"   (rtos (* *wl-INS* 100.0) 2 1))
  (set_tile "etics" (rtos (* *wl-ETICS* 100.0) 2 1))
  (set_tile (if (= *wl-MODE* "SINGLE") "m_sg" "m_ch") "1")
  (set_tile (cond ((= *wl-TYP* "BATIKOS") "t_bat") ((= *wl-TYP* "DROMIKOS") "t_dro")
                  ((= *wl-TYP* "BETON") "t_bet") (T "t_dip")) "1")
  (set_tile (cond ((= *wl-ALIGN* "INSIDE") "a_in") ((= *wl-ALIGN* "OUTSIDE") "a_out")
                  (T "a_cen")) "1")
  (if (= *wl-EXT* "1") (set_tile "ext" "1"))
  (wl-prev)
  (action_tile "m_ch"  "(setq *wl-MODE* \"CHAIN\") (wl-prev)")
  (action_tile "m_sg"  "(setq *wl-MODE* \"SINGLE\") (wl-prev)")
  (action_tile "t_bat" "(wl-preset \"BATIKOS\")")
  (action_tile "t_dro" "(wl-preset \"DROMIKOS\")")
  (action_tile "t_dip" "(wl-preset \"DIPLOS\")")
  (action_tile "t_bet" "(wl-preset \"BETON\")")
  (action_tile "a_cen" "(setq *wl-ALIGN* \"CENTER\") (wl-prev)")
  (action_tile "a_in"  "(setq *wl-ALIGN* \"INSIDE\") (wl-prev)")
  (action_tile "a_out" "(setq *wl-ALIGN* \"OUTSIDE\") (wl-prev)")
  (action_tile "ins"   "(wl-preset *wl-TYP*)")
  (action_tile "ww"    "(wl-upd)")
  (action_tile "hh"    "(wl-upd)")
  (action_tile "etics" "(wl-upd)")
  (action_tile "ext"   "(wl-upd)")
  (action_tile "accept" "(wl-upd) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))

  (setq ww *wl-W* hh *wl-H* ext *wl-EXT* etics *wl-ETICS* typ *wl-TYP*)
  (setq lyr (strcat "WALL-" typ "-" (itoa (fix (+ 0.5 (* ww 100.0))))))
  (setq col (cond ((= typ "BETON") 5) ((= typ "BATIKOS") 1)
                  ((= typ "DIPLOS") 4) (T 3)))
  (wl-layer lyr col) (wl-layer "WALL-AXIS" 8) (wl-layer "WALL-ETICS" 3)
  (setq *wl-XD* (wl-xdata typ ww hh ext etics))

  (setq s *wl-SIDE* more T ntot 0)
  (princ (strcat "\n>> " (if (= *wl-MODE* "CHAIN")
    "\U+03A3\U+03A5\U+039D\U+0395\U+03A7\U+0397\U+03A3: \U+03BA\U+03BB\U+03B9\U+03BA \U+03B4\U+03B9\U+03B1\U+03B4\U+03BF\U+03C7\U+03B9\U+03BA\U+03AC \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03B1 \U+00B7 C=\U+03BA\U+03BB\U+03B5\U+03AF\U+03C3\U+03B9\U+03BC\U+03BF \U+00B7 Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2 \U+03B1\U+03BB\U+03C5\U+03C3\U+03AF\U+03B4\U+03B1\U+03C2"
    "\U+039C\U+0395\U+039C\U+039F\U+039D\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A3: \U+03BA\U+03BB\U+03B9\U+03BA \U+03B1\U+03C1\U+03C7\U+03AE \U+03BA\U+03B1\U+03B9 \U+03C4\U+03AD\U+03BB\U+03BF\U+03C2 \U+03BA\U+03AC\U+03B8\U+03B5 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5")))

  (while more
    (setq pts (list) cl 0 go T)
    (initget "F")
    (setq p (getpoint "\n\U+0391\U+03C1\U+03C7\U+03AE \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (F=\U+03B1\U+03BB\U+03BB\U+03B1\U+03B3\U+03AE \U+03C6\U+03BF\U+03C1\U+03AC\U+03C2, Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): "))
    (while (= p "F")
      (setq *wl-SIDE* (- 0.0 *wl-SIDE*) s *wl-SIDE*)
      (princ (strcat "\n  \U+03A6\U+03BF\U+03C1\U+03AC -> " (if (> s 0.0) "\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AC" "\U+03B4\U+03B5\U+03BE\U+03B9\U+03AC")))
      (initget "F")
      (setq p (getpoint "\n\U+0391\U+03C1\U+03C7\U+03AE \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (F=\U+03B1\U+03BB\U+03BB\U+03B1\U+03B3\U+03AE \U+03C6\U+03BF\U+03C1\U+03AC\U+03C2, Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): ")))
    (if (null p)
      (setq more nil)
      (progn
        (setq pts (list (list (car p) (cadr p))))
        (while go
          (initget "F C")
          (setq p (getpoint (last pts)
            (if (= *wl-MODE* "CHAIN")
              "\n\U+0395\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF (F=\U+03C6\U+03BF\U+03C1\U+03AC, C=\U+03BA\U+03BB\U+03B5\U+03AF\U+03C3\U+03B9\U+03BC\U+03BF, Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): "
              "\n\U+03A4\U+03AD\U+03BB\U+03BF\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (F=\U+03C6\U+03BF\U+03C1\U+03AC): ")))
          (cond
            ((= p "F")
              (setq *wl-SIDE* (- 0.0 *wl-SIDE*) s *wl-SIDE*)
              (princ (strcat "\n  \U+03A6\U+03BF\U+03C1\U+03AC -> " (if (> s 0.0) "\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AC" "\U+03B4\U+03B5\U+03BE\U+03B9\U+03AC"))))
            ((= p "C")
              (if (>= (length pts) 3)
                (setq cl 1 go nil)
                (princ "\n  \U+03A4\U+03BF \U+03BA\U+03BB\U+03B5\U+03AF\U+03C3\U+03B9\U+03BC\U+03BF \U+03B8\U+03AD\U+03BB\U+03B5\U+03B9 3+ \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03B1.")))
            ((null p) (setq go nil))
            (T
              (if (> (distance (last pts) p) 1e-6)
                (setq pts (append pts (list (list (car p) (cadr p))))))
              (if (= *wl-MODE* "SINGLE") (setq go nil)))))
        (if (>= (length pts) 2)
          (progn
            (setq o1 (cond ((= *wl-ALIGN* "CENTER") (* s (/ ww  2.0)))
                           ((= *wl-ALIGN* "INSIDE") (* s ww))
                           (T                        0.0)))
            (setq o2 (cond ((= *wl-ALIGN* "CENTER") (* s (/ ww -2.0)))
                           ((= *wl-ALIGN* "INSIDE") 0.0)
                           (T                       (* s (- 0.0 ww)))))
            (setq oe (+ o1 (* s etics)))
            (setq nseg (wl-draw pts cl o1 o2 ext oe lyr))
            (setq ntot (+ ntot (if (= cl 1) nseg (1- nseg))))
            (princ (strcat "\n  \U+03A3\U+03C7\U+03B5\U+03B4\U+03B9\U+03AC\U+03C3\U+03C4\U+03B7\U+03BA\U+03B1\U+03BD " (itoa (if (= cl 1) nseg (1- nseg)))
              " \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1\U+03C4\U+03B1" (if (= cl 1) " (\U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC)" ""))))))))

  (setq *wl-XD* nil)
  (princ (strcat "\n--- TOIXOS v3.0 ---"
    "\n\U+03A3\U+03CD\U+03BD\U+03BF\U+03BB\U+03BF \U+03C4\U+03BC\U+03B7\U+03BC\U+03AC\U+03C4\U+03C9\U+03BD: " (itoa ntot)
    "  \U+00B7  \U+03C4\U+03CD\U+03C0\U+03BF\U+03C2 " typ "  \U+00B7  \U+03C0\U+03AC\U+03C7\U+03BF\U+03C2 " (rtos ww 2 3) " m"
    (if (= ext "1") (strcat " + ETICS " (rtos etics 2 2) " m") "")
    "\nLayer: " lyr "  \U+00B7  \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1\U+03C2: WALL-AXIS"
    "\n\U+03A3\U+03C5\U+03BD\U+03AD\U+03C7\U+03B5\U+03B9\U+03B1: TOIXOSROOM \U+03B3\U+03B9\U+03B1 \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03AC \U+00B7 WINDOORS \U+03B3\U+03B9\U+03B1 \U+03B1\U+03BD\U+03BF\U+03AF\U+03B3\U+03BC\U+03B1\U+03C4\U+03B1"))
  (princ))

;; ===================== TOIXOSJOIN v3.1 =====================
;; ΓΩΝΙΕΣ (L) + ΤΑΥ (T) + σταυροί (X, αγνοούνται)
;; Χωρίς FILLET — μόνο entmod/entmake, άρα χωρίς παρενέργειες σε
;; FILLETRAD / CMDECHO / UNDO stack.

(defun wl-jdir (a b / dx dy LL)
  (setq dx (- (car b) (car a)) dy (- (cadr b) (cadr a)))
  (setq LL (sqrt (+ (* dx dx) (* dy dy))))
  (if (< LL 1e-12) nil (list (/ dx LL) (/ dy LL))))

;; τομή ευθειών (p1+t*v1) και (p2+s*v2) -> (x y t s) ή nil
(defun wl-jisect (p1 v1 p2 v2 / det dx dy tt ss)
  (setq det (- (* (car v1) (cadr v2)) (* (cadr v1) (car v2))))
  (if (< (abs det) 1e-9) nil
    (progn
      (setq dx (- (car p2) (car p1)) dy (- (cadr p2) (cadr p1)))
      (setq tt (/ (- (* dx (cadr v2)) (* dy (car v2))) det))
      (setq ss (/ (- (* dx (cadr v1)) (* dy (car v1))) det))
      (list (+ (car p1) (* tt (car v1)))
            (+ (cadr p1) (* tt (cadr v1))) tt ss))))

(defun wl-jp1 (a) (list (nth 0 a) (nth 1 a)))
(defun wl-jp2 (a) (list (nth 2 a) (nth 3 a)))

;; Βρίσκει το ΚΑΛΥΤΕΡΟ σημείο snap για το άκρο 'wh' (0=αρχή 1=τέλος) της γραμμής i.
;; ΤΑΞΙΝΟΜΗΣΗ ΥΠΟΨΗΦΙΩΝ:
;;   ΓΩΝΙΑ (L) : η τομή πέφτει ΚΟΝΤΑ σε άκρο της γραμμής-στόχου
;;   ΤΑΥ   (T) : η τομή πέφτει στο ΕΣΩΤΕΡΙΚΟ της γραμμής-στόχου
;; ΕΠΙΛΟΓΗ:
;;   αν υπάρχει έστω μία ΓΩΝΙΑ -> min(μετατόπιση δική μου + μετατόπιση στόχου)
;;                                (ενώνει εξωτ.-με-εξωτ. και εσωτ.-με-εσωτ.)
;;   αλλιώς ΤΑΥ -> min t = Η ΠΡΩΤΗ παρειά που συναντά η γραμμή  <-- ΚΡΙΣΙΜΟ
;; Επιστρέφει (x y idxΣτόχου isTee) ή nil.
(defun wl-jsnap (L i wh tol / a p o va n k b vb pb LB hit d best bd sIn sPar
                            dt bestT btT bestL bdL Lp Lo)
  (setq a (nth i L))
  (setq p (if (= wh 0) (wl-jp1 a) (wl-jp2 a)))
  (setq o (if (= wh 0) (wl-jp2 a) (wl-jp1 a)))
  (setq va (wl-jdir o p))
  (setq Lo (distance o p))
  (if (or (null va) (< Lo 1e-9)) nil
    (progn
      (setq n (length L) k 0 bestL nil bdL nil bestT nil btT nil)
      (while (< k n)
        (if (/= k i)
          (progn
            (setq b (nth k L) pb (wl-jp1 b))
            (setq vb (wl-jdir pb (wl-jp2 b)))
            (setq LB (distance pb (wl-jp2 b)))
            (if (and vb (> LB 1e-9)
                     (> (abs (- (* (car va) (cadr vb)) (* (cadr va) (car vb)))) 0.17))
              (progn
                (setq hit (wl-jisect o va pb vb))
                (if hit
                  (progn
                    (setq sPar (nth 3 hit))
                    (setq d (distance p (list (car hit) (cadr hit))))
                    ;; (α) εντός/κοντά στο τμήμα-στόχο, (β) κοντά στο άκρο μου,
                    ;; (γ) να μην αντιστραφεί η γραμμή μου
                    (if (and (> sPar (- 0.0 tol)) (< sPar (+ LB tol))
                             (<= d tol)
                             (> (nth 2 hit) (* 0.25 Lo)))
                      (progn
                        ;; μετατόπιση του ΣΤΟΧΟΥ (0 αν η τομή είναι εσωτερική)
                        (setq dt (min (abs sPar) (abs (- sPar LB))))
                        (setq sIn (if (and (> sPar tol) (< sPar (- LB tol))) 1 0))
                        (if (= sIn 1)
                          ;; --- ΤΑΥ: κράτα το ΜΙΚΡΟΤΕΡΟ t (πρώτη παρειά) ---
                          (if (or (null btT) (< (nth 2 hit) btT))
                            (setq btT (nth 2 hit)
                                  bestT (list (car hit) (cadr hit) k 1)))
                          ;; --- ΓΩΝΙΑ: κράτα το μικρότερο άθροισμα μετατοπίσεων ---
                          (if (or (null bdL) (< (+ d dt) bdL))
                            (setq bdL (+ d dt)
                                  bestL (list (car hit) (cadr hit) k 0)))))))))))
          )
        (setq k (1+ k)))
      (if bestL bestL bestT))))

;; Εφαρμόζει snap σε ΟΛΑ τα άκρα -> νέα λίστα γραμμών
(defun wl-jfix (L tol / n i out a s0 s1 nx ny mx my)
  (setq n (length L) out (list) i 0)
  (while (< i n)
    (setq a (nth i L))
    (setq s0 (wl-jsnap L i 0 tol))
    (setq s1 (wl-jsnap L i 1 tol))
    (setq nx (if s0 (car s0) (nth 0 a)) ny (if s0 (cadr s0) (nth 1 a)))
    (setq mx (if s1 (car s1) (nth 2 a)) my (if s1 (cadr s1) (nth 3 a)))
    (setq out (append out (list (list nx ny mx my))))
    (setq i (1+ i)))
  out)

;; Ποια άκρα προσκολλήθηκαν στο ΕΣΩΤΕΡΙΚΟ άλλης γραμμής (= ταυ)
;; -> λίστα (idxTargetLine x y)
(defun wl-jtees (L tol / n i out s wh)
  (setq n (length L) out (list) i 0)
  (while (< i n)
    (foreach wh (list 0 1)
      (setq s (wl-jsnap L i wh tol))
      (if (and s (= (nth 3 s) 1))
        (setq out (append out (list (list (nth 2 s) (car s) (cadr s)))))))
    (setq i (1+ i)))
  out)

;; Σπάσιμο γραμμής i στα σημεία ταυ που πέφτουν πάνω της.
;; Επιστρέφει λίστα τμημάτων (x1 y1 x2 y2). Κενή = να σβηστεί.
(defun wl-jbreak (L tees i / a p1 p2 v LL ts out k t1 t2 tv e)
  (setq a (nth i L) p1 (wl-jp1 a) p2 (wl-jp2 a))
  (setq v (wl-jdir p1 p2) LL (distance p1 p2))
  (if (or (null v) (< LL 1e-9)) (list a)
    (progn
      ;; μάζεψε t-τιμές των ταυ πάνω σε αυτή τη γραμμή
      (setq ts (list))
      (foreach e tees
        (if (= (car e) i)
          (progn
            (setq tv (+ (* (- (cadr e) (car p1)) (car v))
                        (* (- (caddr e) (cadr p1)) (cadr v))))
            (if (and (> tv 1e-6) (< tv (- LL 1e-6)))
              (setq ts (append ts (list tv)))))))
      (if (< (length ts) 2) (list a)
        (progn
          (setq ts (wl-jsort ts))
          ;; ζεύγη (0,1) (2,3) ... = τα ανοίγματα που αφαιρούνται
          (setq out (list) k 0 t1 0.0)
          (while (< (1+ k) (length ts))
            (setq t2 (nth k ts))
            (if (> (- t2 t1) 1e-4)
              (setq out (append out (list (list
                (+ (car p1) (* (car v) t1)) (+ (cadr p1) (* (cadr v) t1))
                (+ (car p1) (* (car v) t2)) (+ (cadr p1) (* (cadr v) t2)))))))
            (setq t1 (nth (1+ k) ts))
            (setq k (+ k 2)))
          (if (> (- LL t1) 1e-4)
            (setq out (append out (list (list
              (+ (car p1) (* (car v) t1)) (+ (cadr p1) (* (cadr v) t1))
              (car p2) (cadr p2))))))
          out)))))

(defun wl-jsort (lst / out mn rest found x)
  (setq out (list))
  (while lst
    (setq mn (car lst))
    (foreach x lst (if (< x mn) (setq mn x)))
    (setq out (append out (list mn)) rest (list) found nil)
    (foreach x lst
      (if (and (not found) (= x mn)) (setq found T)
        (setq rest (append rest (list x)))))
    (setq lst rest))
  out)

;; --------------------------------------------------------------
(defun C:TOIXOSJOIN ( / *error* ss n i k tol mode L ents R tees
                        e ed a b segs nmov nbrk lyr first oldC)
  (defun *error* (msg)
    (if oldC (setvar "CMDECHO" oldC))
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 TOIXOSJOIN: " msg)))
    (princ))

  (initget "Butt Merge")
  (setq mode (getkword "\n\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C4\U+03B1\U+03C5 [Butt=\U+03C0\U+03B1\U+03C1\U+03B5\U+03B9\U+03AC \U+03C3\U+03C5\U+03BD\U+03B5\U+03C7\U+03AE\U+03C2 / Merge=\U+03C3\U+03C0\U+03AC\U+03C3\U+03B9\U+03BC\U+03BF \U+03C0\U+03B1\U+03C1\U+03B5\U+03B9\U+03AC\U+03C2] <Butt>: "))
  (if (null mode) (setq mode "Butt"))
  (setq tol (getreal "\n\U+0391\U+03BD\U+03BF\U+03C7\U+03AE \U+03AD\U+03BD\U+03C9\U+03C3\U+03B7\U+03C2 (m) <0.30>: "))
  (if (null tol) (setq tol 0.30))

  (princ "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03C4\U+03B9\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03C9\U+03BD (WINDOW):")
  (setq ss (ssget (list (cons 0 "LINE") (cons 8 "WALL-*"))))
  (if (null ss)
    (progn (princ "\n\U+039A\U+03B1\U+03BC\U+03AF\U+03B1 \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03CE\U+03BD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5.") (exit)))

  (setq oldC (getvar "CMDECHO")) (setvar "CMDECHO" 0)

  ;; --- συλλογή (εξαιρώντας άξονες/κείμενα/ETICS) ---
  (setq n (sslength ss) i 0 L (list) ents (list))
  (while (< i n)
    (setq e (ssname ss i))
    (if (and e (entget e))
      (progn
        (setq ed (entget e) lyr (cdr (assoc 8 ed)))
        (if (and (/= lyr "WALL-AXIS") (/= lyr "WALL-ETICS") (/= lyr "WALL-TEXT"))
          (progn
            (setq L (append L (list (list
              (cadr (assoc 10 ed)) (caddr (assoc 10 ed))
              (cadr (assoc 11 ed)) (caddr (assoc 11 ed))))))
            (setq ents (append ents (list e)))))))
    (setq i (1+ i)))
  (if (< (length L) 2)
    (progn (setvar "CMDECHO" oldC)
           (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 2+ \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5.") (exit)))

  (princ (strcat "\n\U+0388\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 " (itoa (length L)) " \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03CE\U+03BD (\U+03B1\U+03BD\U+03BF\U+03C7\U+03AE "
                 (rtos tol 2 2) " m)..."))

  ;; --- ΦΑΣΗ 1: προσκόλληση άκρων (γωνίες + ταυ) ---
  (setq R (wl-jfix L tol))
  (setq tees (wl-jtees L tol))
  (setq nmov 0 i 0)
  (while (< i (length R))
    (setq a (nth i L) b (nth i R))
    (if (> (+ (distance (list (nth 0 a) (nth 1 a)) (list (nth 0 b) (nth 1 b)))
              (distance (list (nth 2 a) (nth 3 a)) (list (nth 2 b) (nth 3 b))))
           1e-7)
      (progn
        (setq e (nth i ents) ed (entget e))
        (setq ed (subst (cons 10 (list (nth 0 b) (nth 1 b) 0.0)) (assoc 10 ed) ed))
        (setq ed (subst (cons 11 (list (nth 2 b) (nth 3 b) 0.0)) (assoc 11 ed) ed))
        (entmod ed) (entupd e)
        (setq nmov (1+ nmov))))
    (setq i (1+ i)))

  ;; --- ΦΑΣΗ 2: σπάσιμο παρειάς (μόνο Merge) ---
  (setq nbrk 0)
  (if (= mode "Merge")
    (progn
      (setq i 0)
      (while (< i (length R))
        (setq segs (wl-jbreak R tees i))
        (if (> (length segs) 1)
          (progn
            (setq e (nth i ents) ed (entget e) lyr (cdr (assoc 8 ed)))
            (setq first (car segs))
            (setq ed (subst (cons 10 (list (nth 0 first) (nth 1 first) 0.0)) (assoc 10 ed) ed))
            (setq ed (subst (cons 11 (list (nth 2 first) (nth 3 first) 0.0)) (assoc 11 ed) ed))
            (entmod ed) (entupd e)
            (setq k 1)
            (while (< k (length segs))
              (setq a (nth k segs))
              (wl-line (list (nth 0 a) (nth 1 a)) (list (nth 2 a) (nth 3 a)) lyr)
              (setq k (1+ k)))
            (setq nbrk (1+ nbrk))))
        (setq i (1+ i)))))

  (setvar "CMDECHO" oldC)
  (princ (strcat "\n--- TOIXOSJOIN v3.1 ---"
    "\n\U+0386\U+03BA\U+03C1\U+03B1 \U+03C0\U+03BF\U+03C5 \U+03B5\U+03BD\U+03CE\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD: " (itoa nmov)
    "\n\U+03A4\U+03B1\U+03C5 \U+03C0\U+03BF\U+03C5 \U+03B5\U+03BD\U+03C4\U+03BF\U+03C0\U+03AF\U+03C3\U+03C4\U+03B7\U+03BA\U+03B1\U+03BD: " (itoa (length tees))
    (if (= mode "Merge") (strcat "\n\U+03A0\U+03B1\U+03C1\U+03B5\U+03B9\U+03AD\U+03C2 \U+03C0\U+03BF\U+03C5 \U+03C3\U+03C0\U+03AC\U+03C3\U+03C4\U+03B7\U+03BA\U+03B1\U+03BD: " (itoa nbrk)) "")
    "\n\U+03A4\U+03C1\U+03CC\U+03C0\U+03BF\U+03C2: " (if (= mode "Merge") "Merge (\U+03C3\U+03C5\U+03BC\U+03C0\U+03B1\U+03B3\U+03AE\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C2)"
                                       "Butt (\U+03C0\U+03B1\U+03C1\U+03B5\U+03B9\U+03AC \U+03C3\U+03C5\U+03BD\U+03B5\U+03C7\U+03AE\U+03C2)")))
  (princ))

;; ===================== TOIXOSROOM =====================
(defun C:TOIXOSROOM ( / *error* lab pt bnd ed pts ar pr cn oldC)
  (defun *error* (msg)
    (if oldC (setvar "CMDECHO" oldC))
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 TOIXOSROOM: " msg)))
    (princ))
  (setq oldC (getvar "CMDECHO")) (setvar "CMDECHO" 0)
  (wl-layer "WALL-TEXT" 3)
  (setq lab (getreal "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03B5\U+03B9\U+03BC\U+03AD\U+03BD\U+03BF\U+03C5 (m) <0.20>: "))
  (if (null lab) (setq lab 0.20))
  (setq pt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C7\U+03CE\U+03C1\U+03BF\U+03C5 (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): "))
  (while pt
    (command "_.BOUNDARY" pt "")
    (setq bnd (entlast))
    (if (and bnd (= (cdr (assoc 0 (entget bnd))) "LWPOLYLINE"))
      (progn
        (setq ed (entget bnd) pts (list))
        (foreach pr ed
          (if (= (car pr) 10)
            (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
        (if (>= (length pts) 3)
          (progn
            (setq ar (wl-area pts) pr (wl-perim pts) cn (wl-cen pts))
            (wl-txt (list (car cn) (+ (cadr cn) (* lab 0.65)))
              lab (strcat "E=" (rtos ar 2 2) " m2") "WALL-TEXT")
            (wl-txt (list (car cn) (- (cadr cn) (* lab 0.85)))
              (* lab 0.72) (strcat "P=" (rtos pr 2 2) " m") "WALL-TEXT")
            (princ (strcat "\n  E=" (rtos ar 2 2) " m2   P=" (rtos pr 2 2) " m")))
          (princ "\n  \U+039F \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B4\U+03B5\U+03BD \U+03BA\U+03BB\U+03B5\U+03AF\U+03BD\U+03B5\U+03B9.")))
      (princ "\n  \U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 boundary \U+2014 \U+03BF \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B4\U+03B5\U+03BD \U+03BA\U+03BB\U+03B5\U+03AF\U+03BD\U+03B5\U+03B9."))
    (setq pt (getpoint "\n\U+0395\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): ")))
  (setvar "CMDECHO" oldC)
  (princ "\nTOIXOSROOM \U+03BF\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5.")
  (princ))

;; ===================== ΚΟΨΙΜΟ ΤΟΙΧΟΥ ΓΙΑ ΚΟΥΦΩΜΑ =====================
;; Καλείται από WINDOORS. Κόβει ΜΟΝΟ γραμμές που:
;;   (α) είναι σε layer WALL-* αλλά ΟΧΙ WALL-AXIS / WALL-ETICS / WALL-TEXT
;;   (β) είναι παράλληλες στον άξονα (±5 μοίρες)
;;   (γ) απέχουν ΚΑΘΕΤΑ από τον άξονα το πολύ maxperp  <-- ΚΡΙΣΙΜΟ
;;   (δ) επικαλύπτονται με το διάστημα [t1,t2]
(defun wd-cut-wall (t1 t2 p-ref v-ang maxperp / ss n i e ed lyr
                    ep1 ep2 ang2 tol nx ny d1 d2 tp1 tp2 vv
                    na nb ncut)
  (if (null maxperp) (setq maxperp 0.60))
  (setq tol 0.005 ncut 0)
  (setq nx (- 0.0 (sin v-ang)) ny (cos v-ang))
  (setq vv (list (cos v-ang) (sin v-ang)))
  (setq ss (ssget "X" (list (cons 0 "LINE") (cons 8 "WALL-*"))))
  (if (null ss)
    (princ "\n  (\U+03B4\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03B9 \U+03B3\U+03B9\U+03B1 \U+03BA\U+03CC\U+03C8\U+03B9\U+03BC\U+03BF)")
    (progn
      (setq n (sslength ss) i 0)
      (while (< i n)
        (setq e (ssname ss i))
        (if (and e (entget e))
          (progn
            (setq ed (entget e) lyr (cdr (assoc 8 ed)))
            (if (and (/= lyr "WALL-AXIS") (/= lyr "WALL-ETICS")
                     (/= lyr "WALL-TEXT"))
              (progn
                (setq ep1 (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed)) 0.0)
                      ep2 (list (cadr (assoc 11 ed)) (caddr (assoc 11 ed)) 0.0))
                (if (> (distance ep1 ep2) 1e-9)
                  (progn
                    (setq ang2 (angle ep1 ep2))
                    ;; (β) παραλληλία
                    (if (< (abs (sin (- v-ang ang2))) 0.09)
                      (progn
                        ;; (γ) κάθετη απόσταση από τον άξονα
                        (setq d1 (+ (* (- (car ep1) (car p-ref)) nx)
                                    (* (- (cadr ep1) (cadr p-ref)) ny)))
                        (setq d2 (+ (* (- (car ep2) (car p-ref)) nx)
                                    (* (- (cadr ep2) (cadr p-ref)) ny)))
                        (if (and (<= (abs d1) maxperp) (<= (abs d2) maxperp))
                          (progn
                            (setq tp1 (wl-tpar ep1 p-ref vv)
                                  tp2 (wl-tpar ep2 p-ref vv))
                            ;; κανονικοποίηση ώστε tp1 < tp2
                            (if (> tp1 tp2)
                              (progn (setq na tp1 tp1 tp2 tp2 na)
                                     (setq na ep1 ep1 ep2 ep2 na)
                                     (setq ang2 (angle ep1 ep2))))
                            ;; (δ) επικάλυψη με [t1,t2]
                            (if (and (< tp1 (+ t2 tol)) (> tp2 (- t1 tol)))
                              (progn
                                (setq na (polar ep1 ang2 (- t1 tp1)))
                                (setq nb (polar ep1 ang2 (- t2 tp1)))
                                ;; ΠΡΩΤΑ φτιάχνουμε το δεύτερο κομμάτι,
                                ;; ΜΕΤΑ πειράζουμε/σβήνουμε το αρχικό
                                (if (> (distance nb ep2) tol)
                                  (wl-line nb ep2 lyr))
                                (if (> (distance ep1 na) tol)
                                  (progn
                                    (setq ed (entget e))
                                    (entmod (subst (cons 11 na)
                                              (assoc 11 ed) ed))
                                    (entupd e))
                                  (entdel e))
                                (setq ncut (1+ ncut)))))))))))))
        (setq i (1+ i)))
      (princ (strcat "\n  \U+039A\U+03CC\U+03C0\U+03B7\U+03BA\U+03B1\U+03BD " (itoa ncut) " \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5."))))
  ncut))

(princ "\nTOIXOS v3.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5.")
(princ "\n\U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: TOIXOS \U+00B7 TOIXOSJOIN \U+00B7 TOIXOSROOM")
(princ "\n\U+03A4\U+03C1\U+03CC\U+03C0\U+03BF\U+03B9: \U+03A3\U+03A5\U+039D\U+0395\U+03A7\U+0397\U+03A3 (\U+03B1\U+03BB\U+03C5\U+03C3\U+03AF\U+03B4\U+03B1, auto \U+03C6\U+03AC\U+03BB\U+03C4\U+03C3\U+03BF) \U+03AE \U+039C\U+0395\U+039C\U+039F\U+039D\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A3")
(princ)
