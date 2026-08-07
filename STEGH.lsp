;;; STEGH.LSP v5.0
;;; Ισοκλινής / Δίρριχτη / Μονόρριχτη · μαχιές · ντερέδες · κορφιάδες · στάθμες
;;; Εντολή: STEGH | HEXIS -- BRB DEVELOPMENT

(setq *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50 *st-STEP* 0.05 *st-TYP* "ISO")

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
  (foreach pr ed (if (= (car pr) 10)
    (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  (if (and (> (length pts) 1) (< (distance (car pts) (last pts)) 1e-6))
    (setq pts (reverse (cdr (reverse pts))))) pts)

(defun st-area2 (pts / n i p q a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n) (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p))))) (setq i (1+ i))) a)

(defun st-inorm (p q / dx dy l)
  (setq dx (- (car q) (car p)) dy (- (cadr q) (cadr p)) l (sqrt (+ (* dx dx) (* dy dy))))
  (if (< l 1e-9) (list 0.0 0.0) (list (/ (- dy) l) (/ dx l))))

; point in polygon
(defun st-pip (pt poly / x y n i j ins xi yi xj yj)
  (setq x (car pt) y (cadr pt) n (length poly) ins nil i 0 j (1- n))
  (while (< i n)
    (setq xi (car (nth i poly)) yi (cadr (nth i poly)))
    (setq xj (car (nth j poly)) yj (cadr (nth j poly)))
    (if (and (not (equal (> yi y) (> yj y)))
             (< x (+ (/ (* (- xj xi) (- y yi)) (- yj yi)) xi)))
      (setq ins (not ins)))
    (setq j i i (1+ i)))
  ins)

; offset κορυφής i κατά d
(defun st-offv (pts i d / n n1 n2 bx by l pp p)
  (setq n (length pts) p (nth i pts))
  (setq n1 (st-inorm (nth (rem (+ i (1- n)) n) pts) p))
  (setq n2 (st-inorm p (nth (rem (1+ i) n) pts)))
  (setq bx (+ (car n1) (car n2)) by (+ (cadr n1) (cadr n2)))
  (setq l (sqrt (+ (* bx bx) (* by by))))
  (if (< l 1e-9)
    (list (+ (car p) (* d (car n1))) (+ (cadr p) (* d (cadr n1))) 0.0)
    (progn (setq pp (+ (* (/ bx l) (car n1)) (* (/ by l) (cadr n1))))
      (if (< (abs pp) 1e-9) (list (car p) (cadr p) 0.0)
        (list (+ (car p) (/ (* d (/ bx l)) pp))
              (+ (cadr p) (/ (* d (/ by l)) pp)) 0.0)))))

(defun st-pitch-rad ( )
  (if (= *st-PMODE* "PCT") (atan (/ *st-PIT* 100.0)) (* *st-PIT* (/ pi 180.0))))

(defun st-prev ( / w h x0 x1 y0 y1 xm ym xw)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev") (fill_image 0 0 w h 0)
  (setq x0 (fix (* w 0.12)) x1 (fix (* w 0.88)))
  (setq y0 (fix (* h 0.18)) y1 (fix (* h 0.78)))
  (setq ym (fix (/ (+ y0 y1) 2)) xw (fix (/ (- y1 y0) 2)))
  (vector_image x0 y0 x1 y0 7) (vector_image x1 y0 x1 y1 7)
  (vector_image x1 y1 x0 y1 7) (vector_image x0 y1 x0 y0 7)
  (cond
    ((= *st-TYP* "ISO")
      (vector_image x0 y0 (+ x0 xw) ym 1) (vector_image x0 y1 (+ x0 xw) ym 1)
      (vector_image x1 y0 (- x1 xw) ym 1) (vector_image x1 y1 (- x1 xw) ym 1)
      (vector_image (+ x0 xw) ym (- x1 xw) ym 1))
    ((= *st-TYP* "GAB") (vector_image x0 ym x1 ym 1))
    (T (vector_image x0 (+ y0 4) x1 (+ y0 4) 4)))
  (set_tile "sinfo" (strcat "\U+039A\U+03BB\U+03AF\U+03C3\U+03B7 "(rtos *st-PIT* 2 1)
    (if (= *st-PMODE* "PCT") "%" "\U+00B0") " = "
    (rtos (* (st-pitch-rad) (/ 180.0 pi)) 2 1) "\U+00B0"))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (setq v (atof (get_tile "stp"))) (if (> v 0.0) (setq *st-STEP* v))
  (st-prev))

(defun C:STEGH ( / *error* ent pts orig dclpath dclid status f
    th ovh step luk n n0 i j k it cur idxm new keep tracks
    t-acc evs uniq lines heights lab p q mid dd found
    d01 d12 ra rb hh hipt bi bd pm eang p0 p1 pa pb nx ny el dx dy
    a-orig)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGH: " msg))) (princ))

  (st-layer "STEGH-SKL" 1) (st-layer "STEGH-LUK" 4) (st-layer "STEGH-TXT" 2)

  (princ (strcat "\n" "\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AE polyline \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2:"))
  (setq ent (entsel))
  (if (null ent) (exit))
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3) (progn (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 >=3 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2.") (exit)))
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
  (setq orig pts n0 (length pts))

  ;; DCL
  (setq dclpath (strcat (getvar "TEMPPREFIX") "stegh5.dcl"))
  (setq f (open dclpath "w"))
  (write-line "stegh5_dlg : dialog {" f)
  (write-line "  label = \"STEGH v5 \U+2014 \U+0395\U+03C0\U+03AF\U+03BB\U+03C5\U+03C3\U+03B7 \U+03A3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "    : radio_column { key = \"typ\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2\";" f)
  (write-line "      : radio_button { key = \"t_iso\"; label = \"\U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE\U+03C2 (\U+03B1\U+03C5\U+03C4\U+03CC\U+03BC\U+03B1\U+03C4\U+03B7)\"; value = \"1\"; }" f)
  (write-line "      : radio_button { key = \"t_gab\"; label = \"\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
  (write-line "      : radio_button { key = \"t_mon\"; label = \"\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
  (write-line "    }" f)
  (write-line "    : radio_row { key = \"pm\";" f)
  (write-line "      : radio_button { key = \"p_pct\"; label = \"%\"; value = \"1\"; }" f)
  (write-line "      : radio_button { key = \"p_deg\"; label = \"\U+039C\U+03BF\U+03AF\U+03C1\U+03B5\U+03C2\"; }" f)
  (write-line "    }" f)
  (write-line "    : edit_box { key = \"pit\"; label = \"\U+039A\U+03BB\U+03AF\U+03C3\U+03B7:\"; edit_width = 7; }" f)
  (write-line "    : edit_box { key = \"ovh\"; label = \"\U+03A0\U+03C1\U+03BF\U+03B5\U+03BE\U+03BF\U+03C7\U+03AE (m):\"; edit_width = 7; }" f)
  (write-line "    : edit_box { key = \"stp\"; label = \"\U+0391\U+03BA\U+03C1\U+03AF\U+03B2\U+03B5\U+03B9\U+03B1 (m):\"; edit_width = 7; }" f)
  (write-line "    : toggle { key = \"luk\"; label = \"\U+039B\U+03BF\U+03CD\U+03BA\U+03B9\U+03B1 / \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\"; value = \"1\"; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "    : image { key = \"prev\"; width = 28; aspect_ratio = 0.7; color = 0; }" f)
  (write-line "    : text { key = \"sinfo\"; width = 32; }" f)
  (write-line "  }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f) (close f)
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nDCL error.") (exit)))
  (if (not (new_dialog "stegh5_dlg" dclid)) (progn (princ "\nDialog error.") (exit)))
  (set_tile "pit" (rtos *st-PIT* 2 1))
  (set_tile "ovh" (rtos *st-OVH* 2 2))
  (set_tile "stp" (rtos *st-STEP* 2 2))
  (st-prev)
  (action_tile "t_iso" "(setq *st-TYP* \"ISO\") (st-prev)")
  (action_tile "t_gab" "(setq *st-TYP* \"GAB\") (st-prev)")
  (action_tile "t_mon" "(setq *st-TYP* \"MON\") (st-prev)")
  (action_tile "p_pct" "(setq *st-PMODE* \"PCT\") (st-upd)")
  (action_tile "p_deg" "(setq *st-PMODE* \"DEG\") (st-upd)")
  (action_tile "pit" "(st-upd)") (action_tile "ovh" "(st-upd)") (action_tile "stp" "(st-upd)")
  (action_tile "accept" "(st-upd) (setq luk (get_tile \"luk\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog)) (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq th (st-pitch-rad) ovh *st-OVH* step *st-STEP*)
  (setq lines (list) heights (list))
  (foreach p orig (setq heights (append heights (list (list p 0.0)))))

  (cond
    ;; ===== ΔΙΡΡΙΧΤΗ =====
    ((= *st-TYP* "GAB")
      (if (/= n0 4) (princ "\n\U+0397 \U+03B4\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7 \U+03B8\U+03AD\U+03BB\U+03B5\U+03B9 \U+03BF\U+03C1\U+03B8\U+03BF\U+03B3\U+03CE\U+03BD\U+03B9\U+03BF.")
        (progn
          (setq d01 (distance (nth 0 orig) (nth 1 orig)))
          (setq d12 (distance (nth 1 orig) (nth 2 orig)))
          (if (>= d01 d12)
            (progn
              (setq ra (list (/ (+ (car (nth 0 orig)) (car (nth 3 orig))) 2.0)
                             (/ (+ (cadr (nth 0 orig)) (cadr (nth 3 orig))) 2.0) 0.0))
              (setq rb (list (/ (+ (car (nth 1 orig)) (car (nth 2 orig))) 2.0)
                             (/ (+ (cadr (nth 1 orig)) (cadr (nth 2 orig))) 2.0) 0.0))
              (setq hh (* (/ d12 2.0) (/ (sin th) (cos th)))))
            (progn
              (setq ra (list (/ (+ (car (nth 0 orig)) (car (nth 1 orig))) 2.0)
                             (/ (+ (cadr (nth 0 orig)) (cadr (nth 1 orig))) 2.0) 0.0))
              (setq rb (list (/ (+ (car (nth 2 orig)) (car (nth 3 orig))) 2.0)
                             (/ (+ (cadr (nth 2 orig)) (cadr (nth 3 orig))) 2.0) 0.0))
              (setq hh (* (/ d01 2.0) (/ (sin th) (cos th))))))
          (setq lines (list (list ra rb)))
          (setq heights (append heights (list (list ra hh) (list rb hh)))))))

    ;; ===== ΜΟΝΟΡΡΙΧΤΗ =====
    ((= *st-TYP* "MON")
      (setq hipt (getpoint "\n\U+0394\U+03B5\U+03AF\U+03BE\U+03B5 \U+03C0\U+03C1\U+03BF\U+03C2 \U+03C4\U+03B7\U+03BD \U+03A8\U+0397\U+039B\U+0397 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC: "))
      (if (null hipt) (setq hipt (nth 0 orig)))
      (setq bi 0 bd nil i 0)
      (while (< i n0)
        (setq pm (list (/ (+ (car (nth i orig)) (car (nth (rem (1+ i) n0) orig))) 2.0)
                       (/ (+ (cadr (nth i orig)) (cadr (nth (rem (1+ i) n0) orig))) 2.0) 0.0))
        (setq dd (distance hipt pm))
        (if (or (null bd) (< dd bd)) (progn (setq bd dd) (setq bi i)))
        (setq i (1+ i)))
      (setq pa (nth bi orig) pb (nth (rem (1+ bi) n0) orig))
      (setq eang (angle pa pb))
      (setq heights (list) i 0)
      (while (< i n0)
        (setq p0 (nth i orig))
        (setq dd (abs (- (* (- (car p0) (car pa)) (sin eang))
                         (* (- (cadr p0) (cadr pa)) (cos eang)))))
        (setq heights (append heights (list (list p0 (* dd (/ (sin th) (cos th)))))))
        (setq i (1+ i)))
      (setq lines (list (list pa pb))))

    ;; ===== ΙΣΟΚΛΙΝΗΣ =====
    (T
      (princ (strcat "\n" "\U+0395\U+03C0\U+03AF\U+03BB\U+03C5\U+03C3\U+03B7..."))
      (setq a-orig (abs (st-area2 orig)))
      ;; tracks: (born current alive)
      (setq tracks (mapcar (quote (lambda (p) (list p p T))) orig))
      (setq idxm (list) i 0)
      (while (< i n0) (setq idxm (append idxm (list i))) (setq i (1+ i)))
      (setq cur orig t-acc 0.0 evs (list) it 0)
      (while (and (> (length cur) 2) (< it 500))
        (setq it (1+ it) n (length cur))
        (setq new (list) i 0)
        (while (< i n) (setq new (append new (list (st-offv cur i step)))) (setq i (1+ i)))
        (setq t-acc (+ t-acc step))
        ;; φιλτράρισμα: μόνο εντός
        (setq keep (list) i 0)
        (while (< i n)
          (if (st-pip (nth i new) orig)
            (setq keep (append keep (list i)))
            (progn
              (setq k (nth i idxm))
              (setq tracks (subst (list (car (nth k tracks)) (nth i cur) nil) (nth k tracks) tracks))
              (setq evs (append evs (list (list (nth i cur) (* (- t-acc step) (/ (sin th) (cos th)))))))))
          (setq i (1+ i)))
        ;; ενημέρωση current
        (foreach i keep
          (setq k (nth i idxm))
          (setq tracks (subst (list (car (nth k tracks)) (nth i new) T) (nth k tracks) tracks)))
        (if (< (length keep) 3)
          (progn
            (if keep
              (progn
                (setq mid (list 0.0 0.0 0.0))
                (foreach i keep (setq mid (list (+ (car mid) (car (nth i new)))
                                                (+ (cadr mid) (cadr (nth i new))) 0.0)))
                (setq mid (list (/ (car mid) (length keep)) (/ (cadr mid) (length keep)) 0.0))
                (foreach i keep
                  (setq k (nth i idxm))
                  (setq tracks (subst (list (car (nth k tracks)) mid nil) (nth k tracks) tracks)))
                (setq evs (append evs (list (list mid (* t-acc (/ (sin th) (cos th)))))))))
            (setq it 500))
          (progn
            (setq cur (mapcar (quote (lambda (i) (nth i new))) keep))
            (setq idxm (mapcar (quote (lambda (i) (nth i idxm))) keep))
            (if (< (abs (st-area2 cur)) (* a-orig 0.0005))
              (progn
                (setq mid (list 0.0 0.0 0.0))
                (foreach p cur (setq mid (list (+ (car mid) (car p)) (+ (cadr mid) (cadr p)) 0.0)))
                (setq mid (list (/ (car mid) (length cur)) (/ (cadr mid) (length cur)) 0.0))
                (foreach k idxm
                  (setq tracks (subst (list (car (nth k tracks)) mid nil) (nth k tracks) tracks)))
                (setq evs (append evs (list (list mid (* t-acc (/ (sin th) (cos th)))))))
                (setq it 500))))))
      ;; μία γραμμή ανά αρχική κορυφή
      (foreach tr tracks
        (if (> (distance (car tr) (cadr tr)) 1e-3)
          (setq lines (append lines (list (list (car tr) (cadr tr)))))))
      ;; dedupe events
      (setq uniq (list))
      (foreach ev evs
        (setq found nil)
        (foreach u uniq
          (if (and (not found) (< (distance (car ev) (car u)) (* step 2.5)))
            (setq found T)))
        (if (not found) (setq uniq (append uniq (list ev)))))
      ;; κορφιάδες μεταξύ events
      (setq i 0)
      (while (< i (length uniq))
        (setq j (1+ i))
        (while (< j (length uniq))
          (setq mid (list (/ (+ (car (car (nth i uniq))) (car (car (nth j uniq)))) 2.0)
                          (/ (+ (cadr (car (nth i uniq))) (cadr (car (nth j uniq)))) 2.0) 0.0))
          (if (and (> (distance (car (nth i uniq)) (car (nth j uniq))) (* step 3.0))
                   (st-pip mid orig))
            (setq lines (append lines (list (list (car (nth i uniq)) (car (nth j uniq)))))))
          (setq j (1+ j)))
        (setq i (1+ i)))
      (setq heights (append heights uniq))))

  ;; ΣΧΕΔΙΑΣΗ
  (foreach ln lines
    (st-line (list (car (car ln)) (cadr (car ln)) 0.0)
             (list (car (cadr ln)) (cadr (cadr ln)) 0.0) "STEGH-SKL"))

  (if (= luk "1")
    (progn (setq i 0)
      (while (< i n0)
        (setq p0 (nth i orig) p1 (nth (rem (1+ i) n0) orig))
        (setq dx (- (car p1) (car p0)) dy (- (cadr p1) (cadr p0))
              el (sqrt (+ (* dx dx) (* dy dy))))
        (if (> el 1e-9)
          (progn (setq nx (/ dy el) ny (/ (- dx) el))
            (st-line (list (+ (car p0) (* ovh nx)) (+ (cadr p0) (* ovh ny)) 0.0)
                     (list (+ (car p1) (* ovh nx)) (+ (cadr p1) (* ovh ny)) 0.0) "STEGH-LUK")))
        (setq i (1+ i)))))

  (setq lab 0.25)
  (foreach hh heights
    (st-txt (list (car (car hh)) (+ (cadr (car hh)) (* lab 0.4)) 0.0)
      lab (strcat "+" (rtos (cadr hh) 2 2)) "STEGH-TXT"))

  (princ (strcat "\nSTEGH v5.0: " (itoa (length lines)) " \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2"))
  (princ))

(princ "\nSTEGH v5.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE: STEGH")
(princ)
