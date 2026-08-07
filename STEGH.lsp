;;; STEGH.LSP v4.0
;;; Ισοκλινής επίλυση στέγης μέσω iterative offset
;;; Μαχιές · ντερέδες · κορφιάδες · λούκια · στάθμες
;;; Εντολή: STEGH | HEXIS -- BRB DEVELOPMENT

(setq *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50 *st-STEP* 0.10)

(defun st-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun st-line (p1 p2 lyr)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p1) (cons 11 p2))))

(defun st-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p) (cons 40 h) (cons 1 str) (cons 72 1) (cons 11 p))))

(defun st-getpts (ent / ed pts pr)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  (if (and (> (length pts) 1) (< (distance (car pts) (last pts)) 1e-6))
    (setq pts (reverse (cdr (reverse pts)))))
  pts)

(defun st-area2 (pts / n i p q a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i))) a)

; inward normal CCW
(defun st-inorm (p q / dx dy l)
  (setq dx (- (car q) (car p)) dy (- (cadr q) (cadr p))
        l (sqrt (+ (* dx dx) (* dy dy))))
  (if (< l 1e-9) (list 0.0 0.0) (list (/ (- dy) l) (/ dx l))))

; offset κορυφής i κατά d: τομή δύο offset ακμών
(defun st-off-vertex (pts i d / n n1 n2 p1 p2 bx by l pp)
  (setq n (length pts))
  (setq n1 (st-inorm (nth (rem (+ i (1- n)) n) pts) (nth i pts)))
  (setq n2 (st-inorm (nth i pts) (nth (rem (1+ i) n) pts)))
  (setq bx (+ (car n1) (car n2)) by (+ (cadr n1) (cadr n2)))
  (setq l (sqrt (+ (* bx bx) (* by by))))
  (if (< l 1e-9)
    ;; εξωτερική γωνία (reflex): κινείται κατά ένα από τα normals
    (list (+ (car (nth i pts)) (* d (car n1)))
          (+ (cadr (nth i pts)) (* d (cadr n1))) 0.0)
    (progn
      (setq pp (+ (* (/ bx l) (car n1)) (* (/ by l) (cadr n1))))
      (if (< (abs pp) 1e-9)
        (list (car (nth i pts)) (cadr (nth i pts)) 0.0)
        (list (+ (car (nth i pts)) (* d (/ bx l) (/ 1.0 pp)))
              (+ (cadr (nth i pts)) (* d (/ by l) (/ 1.0 pp))) 0.0)))))

; offset ολόκληρου πολυγώνου εσωτερικά κατά d
(defun st-offset-poly (pts d / n i new-pts)
  (setq n (length pts) new-pts (list) i 0)
  (while (< i n)
    (setq new-pts (append new-pts (list (st-off-vertex pts i d))))
    (setq i (1+ i)))
  new-pts)

; pitch
(defun st-pitch-rad ( )
  (if (= *st-PMODE* "PCT") (atan (/ *st-PIT* 100.0))
    (* *st-PIT* (/ pi 180.0))))

(defun st-prev ( / w h x0 x1 y0 y1 xm ym xw)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev") (fill_image 0 0 w h 0)
  (setq x0 (fix (* w 0.12)) x1 (fix (* w 0.88)))
  (setq y0 (fix (* h 0.15)) y1 (fix (* h 0.80)))
  (setq xm (fix (/ (+ x0 x1) 2)) ym (fix (* h 0.47)))
  (setq xw (fix (/ (- y1 y0) 2)))
  (vector_image x0 y0 x1 y0 7) (vector_image x1 y0 x1 y1 7)
  (vector_image x1 y1 x0 y1 7) (vector_image x0 y1 x0 y0 7)
  (vector_image x0 y0 (+ x0 xw) ym 1) (vector_image x0 y1 (+ x0 xw) ym 1)
  (vector_image x1 y0 (- x1 xw) ym 1) (vector_image x1 y1 (- x1 xw) ym 1)
  (vector_image (+ x0 xw) ym (- x1 xw) ym 1)
  (set_tile "sinfo" (strcat "\U+039A\U+03BB\U+03AF\U+03C3\U+03B7: "(rtos *st-PIT* 2 1)
    (if (= *st-PMODE* "PCT") "%" " \U+03BC\U+03BF\U+03AF\U+03C1\U+03B5\U+03C2")
    " => " (rtos (* (st-pitch-rad) (/ 180.0 pi)) 2 1) "\U+00B0"
    " | \U+0392\U+03AE\U+03BC\U+03B1: " (rtos *st-STEP* 2 2) "m"))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (setq v (atof (get_tile "stp"))) (if (> v 0.0) (setq *st-STEP* v))
  (st-prev))

(defun st-dcl ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "stegh4.dcl"))
  (setq f (open path "w"))
  (write-line "stegh4_dlg : dialog {" f)
  (write-line "  label = \"STEGH v4 \U+2014 \U+0395\U+03C0\U+03AF\U+03BB\U+03C5\U+03C3\U+03B7 \U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03BF\U+03CD\U+03C2 \U+03A3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "    : radio_row { key = \"pm\";" f)
  (write-line "      : radio_button { key = \"p_pct\"; label = \"%\"; value = \"1\"; }" f)
  (write-line "      : radio_button { key = \"p_deg\"; label = \"\U+039C\U+03BF\U+03AF\U+03C1\U+03B5\U+03C2\"; }" f)
  (write-line "    }" f)
  (write-line "    : edit_box { key = \"pit\"; label = \"\U+039A\U+03BB\U+03AF\U+03C3\U+03B7:\"; edit_width = 7; }" f)
  (write-line "    : edit_box { key = \"ovh\"; label = \"\U+03A0\U+03C1\U+03BF\U+03B5\U+03BE\U+03BF\U+03C7\U+03AE \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\U+03C5 (m):\"; edit_width = 7; }" f)
  (write-line "    : edit_box { key = \"stp\"; label = \"\U+0392\U+03AE\U+03BC\U+03B1 \U+03B5\U+03C0\U+03AF\U+03BB\U+03C5\U+03C3\U+03B7\U+03C2 (m, \U+03BC\U+03B9\U+03BA\U+03C1\U+03CC\U+03C4\U+03B5\U+03C1\U+03BF=\U+03B1\U+03BA\U+03C1\U+03B9\U+03B2\U+03AD\U+03C3\U+03C4\U+03B5\U+03C1\U+03BF):\"; edit_width = 7; }" f)
  (write-line "    : toggle { key = \"luk\"; label = \"\U+039B\U+03BF\U+03CD\U+03BA\U+03B9\U+03B1 / \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\"; value = \"1\"; }" f)
  (write-line "    : toggle { key = \"det\"; label = \"\U+039B\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03AD\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2\"; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "    : image { key = \"prev\"; width = 30; aspect_ratio = 0.7; color = 0; }" f)
  (write-line "    : text { key = \"sinfo\"; width = 40; }" f)
  (write-line "  }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f) path)

(defun C:STEGH ( / *error* ent pts dclpath dclid status f
    luk det ovh step th i n iter-pts prev-pts
    lines heights mid lab dx dy el nx ny pa pb)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGH: " msg)))
    (princ))

  (st-layer "STEGH-SKL" 1) (st-layer "STEGH-LUK" 4) (st-layer "STEGH-TXT" 2)

  (princ (strcat "\n" "\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AE polyline \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2:"))
  (setq ent (entsel))
  (if (null ent) (exit))
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3) (progn (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF >=3 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03CE\U+03BD.") (exit)))
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))

  (setq dclpath (st-dcl))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nDCL error.") (exit)))
  (if (not (new_dialog "stegh4_dlg" dclid)) (progn (princ "\nDialog error.") (exit)))
  (set_tile "pit" (rtos *st-PIT* 2 1))
  (set_tile "ovh" (rtos *st-OVH* 2 2))
  (set_tile "stp" (rtos *st-STEP* 2 2))
  (st-prev)
  (action_tile "p_pct" "(setq *st-PMODE* \"PCT\") (st-upd)")
  (action_tile "p_deg" "(setq *st-PMODE* \"DEG\") (st-upd)")
  (action_tile "pit" "(st-upd)") (action_tile "ovh" "(st-upd)") (action_tile "stp" "(st-upd)")
  (action_tile "accept"
    "(st-upd) (setq luk (get_tile \"luk\")) (setq det (get_tile \"det\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog)) (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq th (st-pitch-rad) ovh *st-OVH* step *st-STEP*)

  ;; ===== ITERATIVE OFFSET SKELETON =====
  ;; Κάθε iteration: offset εσωτερικά κατά step
  ;; Σχεδίαση γραμμής: prev_i -> iter_i (μαχιά)
  ;; Αν κορυφή "πέρασε" (area < 0 ή distance > threshold): event
  (setq prev-pts pts)
  (setq heights (list) lines (list))
  (foreach p pts (setq heights (append heights (list (list p 0.0)))))
  (setq t-acc 0.0 guard 0 n (length pts))
  (setq iter-pts pts)

  (while (and (> (length iter-pts) 2) (< guard 500))
    (setq guard (1+ guard))
    (setq prev-pts iter-pts)
    (setq t-acc (+ t-acc step))
    ;; Offset
    (setq iter-pts (st-offset-poly prev-pts step))
    ;; Σχεδίαση arcs: από prev -> iter
    (setq i 0 m (min (length prev-pts) (length iter-pts)))
    (while (< i m)
      (if (> (distance (nth i prev-pts) (nth i iter-pts)) 1e-4)
        (setq lines (append lines (list (list (nth i prev-pts) (nth i iter-pts))))))
      (setq i (1+ i)))
    ;; Έλεγχος convergence: αν πολύγωνο συρρικνώθηκε πολύ
    (if (< (abs (st-area2 iter-pts)) (* (abs (st-area2 pts)) 0.001))
      (progn
        ;; Κορφιάς: centroid των εναπομεινουσών
        (setq mid (list
          (/ (apply (quote +) (mapcar (quote car) iter-pts)) (length iter-pts))
          (/ (apply (quote +) (mapcar (quote cadr) iter-pts)) (length iter-pts)) 0.0))
        (setq heights (append heights (list (list mid (* t-acc (tan th))))))
        (foreach p prev-pts
          (if (> (distance p mid) 1e-3)
            (setq lines (append lines (list (list p mid))))))
        (setq iter-pts (list)))))

  ;; Αν ο αλγόριθμος σταμάτησε νωρίς: υπολόγισε events από τα τελευταία arcs
  (if (> (length iter-pts) 0)
    (progn
      (setq mid (list
        (/ (apply (quote +) (mapcar (quote car) iter-pts)) (length iter-pts))
        (/ (apply (quote +) (mapcar (quote cadr) iter-pts)) (length iter-pts)) 0.0))
      (setq heights (append heights (list (list mid (* t-acc (tan th))))))
      (foreach p iter-pts
        (if (> (distance p mid) 1e-3)
          (setq lines (append lines (list (list p mid))))))))

  ;; ===== ΣΧΕΔΙΑΣΗ =====
  ;; 1. Μαχιές / ντερέδες / κορφιάδες
  (foreach ln lines
    (if (not (equal (car ln) (cadr ln) 1e-4))
      (st-line (list (car (car ln)) (cadr (car ln)) 0.0)
               (list (car (cadr ln)) (cadr (cadr ln)) 0.0) "STEGH-SKL")))

  ;; 2. Λούκια
  (if (= luk "1")
    (progn
      (setq n (length pts) i 0)
      (while (< i n)
        (setq p0 (nth i pts) p1 (nth (rem (1+ i) n) pts))
        (setq dx (- (car p1) (car p0)) dy (- (cadr p1) (cadr p0))
              el (sqrt (+ (* dx dx) (* dy dy))))
        (if (> el 1e-9)
          (progn
            (setq nx (/ dy el) ny (/ (- dx) el))
            (setq pa (list (+ (car p0) (* ovh nx)) (+ (cadr p0) (* ovh ny)) 0.0))
            (setq pb (list (+ (car p1) (* ovh nx)) (+ (cadr p1) (* ovh ny)) 0.0))
            (st-line pa pb "STEGH-LUK")))
        (setq i (1+ i)))))

  ;; 3. Στάθμες
  (setq lab 0.25)
  (foreach hh heights
    (setq hp (car hh) hv (cadr hh))
    (st-txt (list (car hp) (+ (cadr hp) (* lab 0.4)) 0.0)
      lab (strcat "+" (rtos hv 2 2) "m") "STEGH-TXT"))

  (setq max-h (apply (quote max) (mapcar (quote cadr) heights)))
  (princ (strcat "\n" "STEGH v4.0 \U+2014 "(itoa (length lines)) " \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2, \U+03BC\U+03AD\U+03B3. +" (rtos max-h 2 2) "m"))
  (princ))

(princ "\nSTEGH v4.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE: STEGH")
(princ)
