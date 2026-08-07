;;; STEGH.LSP v6.0 -- ΜΕΘΟΔΟΣ ΔΙΧΟΤΟΜΩΝ
;;; Ο κλασικός κανόνας χάραξης: διχοτόμοι γωνιών -> μαχιές/ντερέδες
;;; Τομές διχοτόμων -> κόμβοι -> ένωση -> κορφιάδες
;;; Ισοκλινής / Δίρριχτη / Μονόρριχτη · στάθμες σε κάθε κόμβο
;;; Εντολή: STEGH | HEXIS -- BRB DEVELOPMENT

(setq *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50 *st-TYP* "ISO")

(defun st-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun st-line (p1 p2 lyr)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 (list (car p1) (cadr p1) 0.0))
                 (cons 11 (list (car p2) (cadr p2) 0.0)))))

(defun st-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 (list (car p) (cadr p) 0.0)) (cons 40 h)
                 (cons 1 str) (cons 72 1)
                 (cons 11 (list (car p) (cadr p) 0.0)))))

(defun st-getpts (ent / ed pts pr)
  (setq ed (entget ent) pts (list))
  (foreach pr ed (if (= (car pr) 10)
    (setq pts (append pts (list (list (cadr pr) (caddr pr)))))))
  (if (and (> (length pts) 1) (< (distance (car pts) (last pts)) 1e-6))
    (setq pts (reverse (cdr (reverse pts))))) pts)

(defun st-area2 (pts / n i p q a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n) (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p))))) (setq i (1+ i))) a)

; ΔΙΧΟΤΟΜΟΣ γωνίας i -> (list dirx diry sin_half)
(defun st-bis (pts i / n pp p pn v1 v2 l1 l2 bx by lb cosa)
  (setq n (length pts) p (nth i pts))
  (setq pp (nth (rem (+ i (1- n)) n) pts) pn (nth (rem (1+ i) n) pts))
  (setq v1 (list (- (car pp) (car p)) (- (cadr pp) (cadr p))))
  (setq v2 (list (- (car pn) (car p)) (- (cadr pn) (cadr p))))
  (setq l1 (sqrt (+ (* (car v1) (car v1)) (* (cadr v1) (cadr v1)))))
  (setq l2 (sqrt (+ (* (car v2) (car v2)) (* (cadr v2) (cadr v2)))))
  (if (or (< l1 1e-9) (< l2 1e-9)) nil
    (progn
      (setq v1 (list (/ (car v1) l1) (/ (cadr v1) l1)))
      (setq v2 (list (/ (car v2) l2) (/ (cadr v2) l2)))
      (setq bx (+ (car v1) (car v2)) by (+ (cadr v1) (cadr v2)))
      (setq lb (sqrt (+ (* bx bx) (* by by))))
      (if (< lb 1e-9) nil
        (progn
          (setq cosa (+ (* (car v1) (car v2)) (* (cadr v1) (cadr v2))))
          (if (> cosa 1.0) (setq cosa 1.0))
          (if (< cosa -1.0) (setq cosa -1.0))
          (list (/ bx lb) (/ by lb) (sin (/ (atan (sqrt (- 1.0 (* cosa cosa))) cosa) 2.0))))))))

; τομή 2 ημιευθειών -> (x y t s) ή nil
(defun st-isect (p1 d1 p2 d2 / det dx dy tt ss)
  (setq det (- (* (car d1) (cadr d2)) (* (cadr d1) (car d2))))
  (if (< (abs det) 1e-9) nil
    (progn (setq dx (- (car p2) (car p1)) dy (- (cadr p2) (cadr p1)))
      (setq tt (/ (- (* dx (cadr d2)) (* dy (car d2))) det))
      (setq ss (/ (- (* dx (cadr d1)) (* dy (car d1))) det))
      (list (+ (car p1) (* tt (car d1))) (+ (cadr p1) (* tt (cadr d1))) tt ss))))

; κάθετη απόσταση σημείου από ακμή a-b
(defun st-d2e (pt a b / ex ey el)
  (setq ex (- (car b) (car a)) ey (- (cadr b) (cadr a)))
  (setq el (sqrt (+ (* ex ex) (* ey ey))))
  (if (< el 1e-9) 0.0
    (/ (abs (- (* (- (car pt) (car a)) ey) (* (- (cadr pt) (cadr a)) ex))) el)))

(defun st-slope ( )
  (if (= *st-PMODE* "PCT") (/ *st-PIT* 100.0)
    (/ (sin (* *st-PIT* (/ pi 180.0))) (cos (* *st-PIT* (/ pi 180.0))))))

; ===== ΕΠΙΛΥΣΗ ΜΕ ΔΙΧΟΤΟΜΟΥΣ =====
(defun st-solve (pts0 / pts th lines heights lav dacc it n i j
                       cur bd cands best dmin ei ej node k d sh st new m)
  (setq pts pts0)
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
  (setq th (st-slope) lines (list) heights (list) dacc 0.0)
  (foreach p pts (setq heights (append heights (list (list p 0.0)))))
  (setq lav (mapcar (quote (lambda (p) (list p p))) pts))
  (setq it 0)
  (while (and (>= (length lav) 3) (< it 200))
    (setq it (1+ it) n (length lav))
    (setq cur (mapcar (quote car) lav))
    (setq bd (list) i 0)
    (while (< i n) (setq bd (append bd (list (st-bis cur i)))) (setq i (1+ i)))
    ;; υποψήφια events: τομές διχοτόμων γειτονικών κορυφών
    (setq cands (list) i 0)
    (while (< i n)
      (setq j (rem (1+ i) n))
      (if (and (nth i bd) (nth j bd))
        (progn
          (setq best (st-isect (nth i cur) (nth i bd) (nth j cur) (nth j bd)))
          (if (and best (> (caddr best) 1e-6) (> (cadddr best) 1e-6))
            (setq cands (append cands (list (list
              (st-d2e (list (car best) (cadr best)) (nth i cur) (nth j cur))
              i j (list (car best) (cadr best)))))))))
      (setq i (1+ i)))
    (if (null cands) (setq it 200)
      (progn
        ;; ελάχιστη απόσταση
        (setq best (car cands))
        (foreach c cands (if (< (car c) (car best)) (setq best c)))
        (setq dmin (car best) ei (cadr best) ej (caddr best) node (cadddr best))
        (setq dacc (+ dacc dmin))
        ;; γραμμές των 2 που συγχωνεύονται
        (foreach k (list ei ej)
          (if (> (distance (cadr (nth k lav)) node) 1e-4)
            (setq lines (append lines (list (list (cadr (nth k lav)) node))))))
        (setq heights (append heights (list (list node (* dacc th)))))
        ;; νέο lav
        (setq new (list) k 0)
        (while (< k n)
          (cond
            ((= k ei) (setq new (append new (list (list node node)))))
            ((= k ej) nil)
            (T (setq d (nth k bd))
               (if (and d (> (caddr d) 1e-6))
                 (progn (setq st (/ dmin (caddr d)))
                   (setq new (append new (list (list
                     (list (+ (car (nth k cur)) (* st (car d)))
                           (+ (cadr (nth k cur)) (* st (cadr d))))
                     (cadr (nth k lav)))))))
                 (setq new (append new (list (nth k lav)))))))
          (setq k (1+ k)))
        (setq lav new))))
  ;; τελικές: born -> current + ένωση μεταξύ τους (κορφιάς)
  (setq m (length lav) k 0)
  (while (< k m)
    (if (> (distance (cadr (nth k lav)) (car (nth k lav))) 1e-4)
      (setq lines (append lines (list (list (cadr (nth k lav)) (car (nth k lav)))))))
    (setq k (1+ k)))
  (if (>= m 2)
    (progn (setq k 0)
      (while (< k (if (= m 2) 1 m))
        (if (> (distance (car (nth k lav)) (car (nth (rem (1+ k) m) lav))) 1e-4)
          (setq lines (append lines (list (list (car (nth k lav))
                                                (car (nth (rem (1+ k) m) lav)))))))
        (setq k (1+ k)))))
  (list lines heights))

(defun st-pline (pts lyr / el)
  (setq el (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbPolyline") (cons 90 (length pts)) (cons 70 1)))
  (foreach p pts
    (setq el (append el (list (cons 10 (list (car p) (cadr p)))))))
  (entmake el))

;; Offset πολυγώνου προς τα ΕΞΩ κατά d -> κλειστό πολύγωνο
(defun st-offset-out (pts d / n i b out p st)
  (setq n (length pts) out (list) i 0)
  (while (< i n)
    (setq b (st-bis pts i))
    (setq p (nth i pts))
    (if (and b (> (caddr b) 1e-6))
      (progn
        (setq st (/ d (caddr b)))
        ;; ΕΞΩ = αντίθετα από τη διχοτόμο (που δείχνει μέσα)
        (setq out (append out (list
          (list (- (car p) (* st (car b))) (- (cadr p) (* st (cadr b))))))))
      (setq out (append out (list p))))
    (setq i (1+ i)))
  out)

(defun st-prev ( / w h x0 x1 y0 y1 ym xw)
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
    (if (= *st-PMODE* "PCT") "%" "\U+00B0")))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (st-prev))

(defun C:STEGH ( / *error* ent pts orig dclpath dclid status f
    res lines heights th ovh luk lab n0 i
    d01 d12 ra rb hh hipt bi bd pm dd eang pa pb p0 p1 nx ny el dx dy)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1: " msg))) (princ))

  (st-layer "STEGH-SKL" 1) (st-layer "STEGH-LUK" 4) (st-layer "STEGH-TXT" 2)
  (princ (strcat "\n" "\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AE polyline \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2:"))
  (setq ent (entsel))
  (if (null ent) (exit))
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3) (progn (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 >=3 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2.") (exit)))
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
  (setq orig pts n0 (length pts))

  (setq dclpath (strcat (getvar "TEMPPREFIX") "stegh6.dcl"))
  (setq f (open dclpath "w"))
  (write-line "stegh6_dlg : dialog {" f)
  (write-line "  label = \"STEGH v6 \U+2014 \U+039C\U+03AD\U+03B8\U+03BF\U+03B4\U+03BF\U+03C2 \U+0394\U+03B9\U+03C7\U+03BF\U+03C4\U+03CC\U+03BC\U+03C9\U+03BD (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "    : radio_column { key = \"typ\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2\";" f)
  (write-line "      : radio_button { key = \"t_iso\"; label = \"\U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE\U+03C2\"; value = \"1\"; }" f)
  (write-line "      : radio_button { key = \"t_gab\"; label = \"\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
  (write-line "      : radio_button { key = \"t_mon\"; label = \"\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
  (write-line "    }" f)
  (write-line "    : radio_row { key = \"pm\";" f)
  (write-line "      : radio_button { key = \"p_pct\"; label = \"%\"; value = \"1\"; }" f)
  (write-line "      : radio_button { key = \"p_deg\"; label = \"\U+039C\U+03BF\U+03AF\U+03C1\U+03B5\U+03C2\"; }" f)
  (write-line "    }" f)
  (write-line "    : edit_box { key = \"pit\"; label = \"\U+039A\U+03BB\U+03AF\U+03C3\U+03B7:\"; edit_width = 7; }" f)
  (write-line "    : edit_box { key = \"ovh\"; label = \"\U+03A0\U+03C1\U+03BF\U+03B5\U+03BE\U+03BF\U+03C7\U+03AE (m):\"; edit_width = 7; }" f)
  (write-line "    : toggle { key = \"luk\"; label = \"\U+039B\U+03BF\U+03CD\U+03BA\U+03B9\U+03B1 / \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\"; value = \"1\"; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "    : image { key = \"prev\"; width = 26; aspect_ratio = 0.7; color = 0; }" f)
  (write-line "    : text { key = \"sinfo\"; width = 28; }" f)
  (write-line "  }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f) (close f)
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nDCL error.") (exit)))
  (if (not (new_dialog "stegh6_dlg" dclid)) (progn (princ "\nDialog error.") (exit)))
  (set_tile "pit" (rtos *st-PIT* 2 1))
  (set_tile "ovh" (rtos *st-OVH* 2 2))
  (st-prev)
  (action_tile "t_iso" "(setq *st-TYP* \"ISO\") (st-prev)")
  (action_tile "t_gab" "(setq *st-TYP* \"GAB\") (st-prev)")
  (action_tile "t_mon" "(setq *st-TYP* \"MON\") (st-prev)")
  (action_tile "p_pct" "(setq *st-PMODE* \"PCT\") (st-upd)")
  (action_tile "p_deg" "(setq *st-PMODE* \"DEG\") (st-upd)")
  (action_tile "pit" "(st-upd)") (action_tile "ovh" "(st-upd)")
  (action_tile "accept" "(st-upd) (setq luk (get_tile \"luk\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog)) (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq th (st-slope) ovh *st-OVH*)
  (setq lines (list) heights (list))

  (cond
    ((= *st-TYP* "GAB")
      (if (/= n0 4) (princ "\n\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7: \U+03B8\U+03AD\U+03BB\U+03B5\U+03B9 \U+03BF\U+03C1\U+03B8\U+03BF\U+03B3\U+03CE\U+03BD\U+03B9\U+03BF.")
        (progn
          (setq d01 (distance (nth 0 orig) (nth 1 orig)))
          (setq d12 (distance (nth 1 orig) (nth 2 orig)))
          (if (>= d01 d12)
            (progn
              (setq ra (list (/ (+ (car (nth 0 orig)) (car (nth 3 orig))) 2.0)
                             (/ (+ (cadr (nth 0 orig)) (cadr (nth 3 orig))) 2.0)))
              (setq rb (list (/ (+ (car (nth 1 orig)) (car (nth 2 orig))) 2.0)
                             (/ (+ (cadr (nth 1 orig)) (cadr (nth 2 orig))) 2.0)))
              (setq hh (* (/ d12 2.0) th)))
            (progn
              (setq ra (list (/ (+ (car (nth 0 orig)) (car (nth 1 orig))) 2.0)
                             (/ (+ (cadr (nth 0 orig)) (cadr (nth 1 orig))) 2.0)))
              (setq rb (list (/ (+ (car (nth 2 orig)) (car (nth 3 orig))) 2.0)
                             (/ (+ (cadr (nth 2 orig)) (cadr (nth 3 orig))) 2.0)))
              (setq hh (* (/ d01 2.0) th))))
          (setq lines (list (list ra rb)))
          (foreach p orig (setq heights (append heights (list (list p 0.0)))))
          (setq heights (append heights (list (list ra hh) (list rb hh)))))))

    ((= *st-TYP* "MON")
      (setq hipt (getpoint "\n\U+0394\U+03B5\U+03AF\U+03BE\U+03B5 \U+03C0\U+03C1\U+03BF\U+03C2 \U+03C4\U+03B7\U+03BD \U+03A8\U+0397\U+039B\U+0397 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC: "))
      (if (null hipt) (setq hipt (nth 0 orig)))
      (setq bi 0 bd nil i 0)
      (while (< i n0)
        (setq pm (list (/ (+ (car (nth i orig)) (car (nth (rem (1+ i) n0) orig))) 2.0)
                       (/ (+ (cadr (nth i orig)) (cadr (nth (rem (1+ i) n0) orig))) 2.0)))
        (setq dd (distance (list (car hipt) (cadr hipt)) pm))
        (if (or (null bd) (< dd bd)) (progn (setq bd dd) (setq bi i)))
        (setq i (1+ i)))
      (setq pa (nth bi orig) pb (nth (rem (1+ bi) n0) orig))
      (setq eang (angle pa pb))
      (setq i 0)
      (while (< i n0)
        (setq p0 (nth i orig))
        (setq dd (abs (- (* (- (car p0) (car pa)) (sin eang))
                         (* (- (cadr p0) (cadr pa)) (cos eang)))))
        (setq heights (append heights (list (list p0 (* dd th)))))
        (setq i (1+ i)))
      (setq lines (list (list pa pb))))

    (T
      (princ (strcat "\n" "\U+0395\U+03C0\U+03AF\U+03BB\U+03C5\U+03C3\U+03B7 \U+03BC\U+03B5 \U+03B4\U+03B9\U+03C7\U+03BF\U+03C4\U+03CC\U+03BC\U+03BF\U+03C5\U+03C2..."))
      (setq res (st-solve orig))
      (setq lines (car res) heights (cadr res))))

  ;; ΣΧΕΔΙΑΣΗ
  (foreach ln lines (st-line (car ln) (cadr ln) "STEGH-SKL"))
  ;; ΓΕΙΣΟ: κλειστή polyline offset προς τα έξω
  (if (and (= luk "1") (> ovh 0.001))
    (st-pline (st-offset-out orig ovh) "STEGH-LUK"))
  ;; Περίγραμμα γέννησης ως κλειστή polyline
  (st-pline orig "STEGH-SKL")
  (setq lab 0.25)
  (foreach hh heights
    (st-txt (list (car (car hh)) (+ (cadr (car hh)) (* lab 0.4)))
      lab (strcat "+" (rtos (cadr hh) 2 2)) "STEGH-TXT"))
  (princ (strcat "\nSTEGH v6.1: " (itoa (length lines)) " \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2"))
  (princ))

(princ "\nSTEGH v6.1 (\U+03BC\U+03AD\U+03B8\U+03BF\U+03B4\U+03BF\U+03C2 \U+03B4\U+03B9\U+03C7\U+03BF\U+03C4\U+03CC\U+03BC\U+03C9\U+03BD) \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE: STEGH")
(princ)
