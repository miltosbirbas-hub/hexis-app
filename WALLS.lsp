;;; WALLS.LSP v1.0
;;; WALL: σχεδίαση τοίχου (DCL) · WALLJOIN: T/L/X trim · WALLROOM: εμβαδόν χώρων
;;; HEXIS Platform - BRB DEVELOPMENT

(setq *wl-W* 0.25 *wl-H* 3.00 *wl-MAT* "BETON")

(defun wl-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun wl-line (p1 p2 lyr)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p1) (cons 11 p2))))

(defun wl-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 10 p) (cons 40 h) (cons 1 str) (cons 72 1) (cons 11 p))))

; κάθετο offset: αριστερά από διεύθυνση ang σε απόσταση d
(defun wl-perp (p ang d)
  (list (+ (car p) (* d (- (sin ang))))
        (+ (cadr p) (* d (cos ang))) 0.0))

; τομή 2 ευθειών (P1+t*V1, P2+s*V2)
(defun wl-isect (p1 v1 p2 v2 / det dx dy tt)
  (setq det (- (* (car v1) (cadr v2)) (* (cadr v1) (car v2))))
  (if (< (abs det) 1e-9) nil
    (progn (setq dx (- (car p2) (car p1)) dy (- (cadr p2) (cadr p1)))
           (setq tt (/ (- (* dx (cadr v2)) (* dy (car v2))) det))
           (list (+ (car p1) (* tt (car v1)))
                 (+ (cadr p1) (* tt (cadr v1))) 0.0))))

; ενημέρωση start/end LINE entity
(defun wl-set10 (ent p / ed) (setq ed (subst (cons 10 p) (assoc 10 (entget ent)) (entget ent))) (entmod ed) (entupd ent))
(defun wl-set11 (ent p / ed) (setq ed (subst (cons 11 p) (assoc 11 (entget ent)) (entget ent))) (entmod ed) (entupd ent))

; εμβαδόν + περίμετρος + κέντρο
(defun wl-area (pts / n i p q a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p))))) (setq i (1+ i)))
  (abs (/ a 2.0)))

(defun wl-perim (pts / n i a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n) (setq a (+ a (distance (nth i pts) (nth (rem (1+ i) n) pts)))) (setq i (1+ i)))
  a)

(defun wl-cen (pts / n cx cy i p)
  (setq n (length pts) cx 0.0 cy 0.0 i 0)
  (while (< i n) (setq p (nth i pts) cx (+ cx (car p)) cy (+ cy (cadr p))) (setq i (1+ i)))
  (list (/ cx n) (/ cy n) 0.0))

;; WALLJOIN: T/L/X — για κάθε ζεύγος γραμμών WALL* βρίσκει τομή
;; και snap τα άκρα που είναι εντός snapR στη θέση τομής
(defun C:WALLJOIN ( / *error* ss n segs i j s1 s2
    p1 q1 p2 q2 v1 v2 ang1 ang2 hit
    d11 d12 d21 d22 snapR njoins)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 WALLJOIN: " msg)))
    (princ))

  (setq snapR 0.06 njoins 0)
  (setq ss (ssget "X" (list (cons 0 "LINE") (cons 8 "*WALL*"))))
  (if (null ss) (progn (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03B9.") (exit)))
  ;; φτιάχνω list από (ent p1 p2)
  (setq segs (list) i 0 n (sslength ss))
  (while (< i n)
    (setq e (ssname ss i) ed (entget e))
    (setq segs (append segs (list (list e
      (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed)) 0.0)
      (list (cadr (assoc 11 ed)) (caddr (assoc 11 ed)) 0.0)))))
    (setq i (1+ i)))
  (princ (strcat "\n" "\U+0395\U+03C0\U+03B5\U+03BE\U+03B5\U+03C1\U+03B3\U+03AC\U+03B6\U+03BF\U+03BC\U+03B1\U+03B9 " (itoa n) " \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2..."))
  (setq i 0)
  (while (< i n)
    (setq s1 (nth i segs) p1 (cadr s1) q1 (caddr s1))
    (setq ang1 (angle p1 q1))
    (setq v1 (list (cos ang1) (sin ang1)))
    (setq j (1+ i))
    (while (< j n)
      (setq s2 (nth j segs) p2 (cadr s2) q2 (caddr s2))
      (setq ang2 (angle p2 q2))
      ;; παράλληλες γραμμές: παράλειψε
      (if (> (abs (sin (- ang1 ang2))) 0.03)
        (progn
          (setq v2 (list (cos ang2) (sin ang2)))
          (setq hit (wl-isect p1 v1 p2 v2))
          (if hit
            (progn
              (setq d11 (distance hit p1) d12 (distance hit q1))
              (setq d21 (distance hit p2) d22 (distance hit q2))
              (if (< d11 snapR) (progn (wl-set10 (car s1) hit) (setq njoins (1+ njoins))))
              (if (< d12 snapR) (progn (wl-set11 (car s1) hit) (setq njoins (1+ njoins))))
              (if (< d21 snapR) (progn (wl-set10 (car s2) hit) (setq njoins (1+ njoins))))
              (if (< d22 snapR) (progn (wl-set11 (car s2) hit) (setq njoins (1+ njoins))))))))
      (setq j (1+ j)))
    (setq i (1+ i)))
  (princ (strcat "\n" "WALLJOIN: " (itoa njoins) " snaps."))
  (princ))

(defun C:WALLROOM ( / *error* lab pt bnd ed pts ar pr cn)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 WALLROOM: " msg)))
    (princ))

  (wl-layer "WALL-TEXT" 3)
  (setq lab (getreal (strcat "\n" "\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03B5\U+03B9\U+03BC\U+03AD\U+03BD\U+03BF\U+03C5 (m) <1.00>: ")))
  (if (null lab) (setq lab 1.00))
  (princ (strcat "\n" "Pick \U+03B5\U+03C3\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03CC \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03C7\U+03CE\U+03C1\U+03BF\U+03C5 (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2):"))
  (setq pt (getpoint (strcat "\n" "\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF: ")))
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
            (wl-txt (list (car cn) (+ (cadr cn) (* lab 0.6)) 0.0)
              lab (strcat "E=" (rtos ar 2 2) " m2") "WALL-TEXT")
            (wl-txt (list (car cn) (- (cadr cn) (* lab 0.8)) 0.0)
              (* lab 0.75) (strcat "P=" (rtos pr 2 2) " m") "WALL-TEXT")
            (princ (strcat "\n  E=" (rtos ar 2 2) " m2  P=" (rtos pr 2 2) " m")))
          (princ (strcat "\n  " "\U+03A7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B4\U+03B5\U+03BD \U+03BA\U+03BB\U+03B5\U+03AF\U+03BD\U+03B5\U+03B9 \U+2014 \U+03AD\U+03BB\U+03B5\U+03B3\U+03BE\U+03B5 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\U+03C2."))))
      (princ (strcat "\n  " "\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 boundary.")))
    (setq pt (getpoint (strcat "\n" "\U+0395\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): "))))
  (princ (strcat "\n" "WALLROOM \U+03BF\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5."))
  (princ))

(defun C:WALL ( / *error* dclpath dclid status f
    ww hh mat lyr col ang p1 p2 pa pb pc pd)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 WALL: " msg)))
    (princ))

  ;; DCL
  (setq dclpath (strcat (getvar "TEMPPREFIX") "wall.dcl"))
  (setq f (open dclpath "w"))
  (write-line "wall_dlg : dialog {" f)
  (write-line "  label = \"WALL \U+2014 \U+03A4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C2 (HEXIS)\";" f)
  (write-line "  : edit_box { key = \"ww\"; label = \"\U+03A0\U+03AC\U+03C7\U+03BF\U+03C2 (m):\"; edit_width = 8; }" f)
  (write-line "  : edit_box { key = \"hh\"; label = \"\U+038E\U+03C8\U+03BF\U+03C2 (m):\"; edit_width = 8; }" f)
  (write-line "  : radio_column { key = \"mat\"; label = \"\U+03A5\U+03BB\U+03B9\U+03BA\U+03CC\";" f)
  (write-line "    : radio_button { key = \"m_bet\"; label = \"\U+039C\U+03C0\U+03B5\U+03C4\U+03CC\U+03BD / \U+03A6.\U+03A3.\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"m_tou\"; label = \"\U+03A4\U+03BF\U+03C5\U+03B2\U+03BB\U+03BF\U+03B4\U+03BF\U+03BC\U+03AE\"; }" f)
  (write-line "    : radio_button { key = \"m_ytd\"; label = \"\U+03A5\U+03C4. \U+0394\U+03BF\U+03BC\U+03B9\U+03BA\U+03AC / Gazbeton\"; }" f)
  (write-line "    : radio_button { key = \"m_lit\"; label = \"\U+039B\U+03B9\U+03B8\U+03BF\U+03B4\U+03BF\U+03BC\U+03AE\"; }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\n\U+0391\U+03C0\U+03BF\U+03C4\U+03C5\U+03C7\U+03AF\U+03B1 DCL.") (exit)))
  (if (not (new_dialog "wall_dlg" dclid)) (progn (princ "\n\U+0391\U+03C0\U+03BF\U+03C4\U+03C5\U+03C7\U+03AF\U+03B1 \U+03B4\U+03B9\U+03B1\U+03BB\U+03CC\U+03B3\U+03BF\U+03C5.") (exit)))
  (set_tile "ww" (rtos *wl-W* 2 2))
  (set_tile "hh" (rtos *wl-H* 2 2))
  (action_tile "m_bet" "(setq *wl-MAT* \"BETON\")")
  (action_tile "m_tou" "(setq *wl-MAT* \"TOUVLO\")")
  (action_tile "m_ytd" "(setq *wl-MAT* \"YTD\")")
  (action_tile "m_lit" "(setq *wl-MAT* \"LITHOS\")")
  (action_tile "accept"
    "(setq *wl-W* (atof (get_tile \"ww\"))) (setq *wl-H* (atof (get_tile \"hh\"))) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq ww *wl-W* hh *wl-H* mat *wl-MAT*)

  ;; layer βάσει υλικού + πάχους
  (setq lyr (strcat "WALL-" mat "-" (itoa (fix (* ww 100)))))
  (setq col (cond ((= mat "BETON")  5)
                  ((= mat "TOUVLO") 1)
                  ((= mat "YTD")    4)
                  (T 3)))
  (wl-layer lyr col)
  (wl-layer "WALL-AXIS" 8)

  (setq p1 (getpoint (strcat "\n" "\U+0391\U+03C1\U+03C7\U+03AE \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5: ")))
  (while p1
    (setq p2 (getpoint p1 (strcat "\n" "\U+03A4\U+03AD\U+03BB\U+03BF\U+03C2 \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1 (Enter=\U+03BD\U+03AD\U+03BF\U+03C2): ")))
    (if p2
      (progn
        (setq ang (angle p1 p2))
        ;; 4 γωνίες τοίχου
        (setq pa (wl-perp p1 ang (/ ww  2.0)))
        (setq pb (wl-perp p2 ang (/ ww  2.0)))
        (setq pc (wl-perp p1 ang (/ ww -2.0)))
        (setq pd (wl-perp p2 ang (/ ww -2.0)))
        (wl-line pa pb lyr)   ; \U+03C0\U+03BB\U+03B1\U+03CA\U+03BD\U+03AE 1
        (wl-line pc pd lyr)   ; \U+03C0\U+03BB\U+03B1\U+03CA\U+03BD\U+03AE 2
        (wl-line pa pc lyr)   ; \U+03BA\U+03B1\U+03C0\U+03AC\U+03BA\U+03B9 \U+03B1\U+03C1\U+03C7\U+03AE\U+03C2
        (wl-line pb pd lyr)   ; \U+03BA\U+03B1\U+03C0\U+03AC\U+03BA\U+03B9 \U+03C4\U+03AD\U+03BB\U+03BF\U+03C5\U+03C2
        (wl-line (list (car p1)(cadr p1) 0.0) (list (car p2)(cadr p2) 0.0) "WALL-AXIS")))
    (setq p1 (getpoint (strcat "\n" "\U+0391\U+03C1\U+03C7\U+03AE \U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF\U+03C5 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): "))))

  (princ (strcat "\n" "WALL: \U+03C4\U+03C1\U+03AD\U+03BE\U+03B5 WALLJOIN \U+03B3\U+03B9\U+03B1 trim \U+03B3\U+03C9\U+03BD\U+03B9\U+03CE\U+03BD, WALLROOM \U+03B3\U+03B9\U+03B1 \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03AC."))
  (princ))

(princ "\nWALLS v1.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: WALL \U+00B7 WALLJOIN \U+00B7 WALLROOM")
(princ)
