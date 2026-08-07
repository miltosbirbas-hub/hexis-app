;;; WALLS.LSP v2.0
;;; WALL: σχεδίαση τοίχου με flip φοράς · WALLJOIN: T/L/X · WALLROOM: εμβαδόν
;;; Τύποι τοίχου: μπατικός/δρομικός/διπλός δρομικός/Φ.Σ. · ETICS flag
;;; WINDOORS v3+ διαβάζει XData HEXIS_WD και κόβει τον τοίχο αυτόματα
;;; HEXIS Platform - BRB DEVELOPMENT

(setq *wl-W* 0.20 *wl-H* 3.00 *wl-MAT* "BETON" *wl-TYP* "BATIKOS"
      *wl-EXT* "0" *wl-ETICS* 0.08 *wl-SIDE* 1.0 *wl-ALIGN* "CENTER")

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

; κάθετο offset: αριστερά(+)/δεξιά(-) από διεύθυνση ang
(defun wl-perp (p ang d)
  (list (+ (car p) (* d (- (sin ang))))
        (+ (cadr p) (* d (cos ang))) 0.0))

; τομή 2 ευθειών
(defun wl-isect (p1 v1 p2 v2 / det dx dy tt)
  (setq det (- (* (car v1) (cadr v2)) (* (cadr v1) (car v2))))
  (if (< (abs det) 1e-9) nil
    (progn (setq dx (- (car p2) (car p1)) dy (- (cadr p2) (cadr p1)))
           (setq tt (/ (- (* dx (cadr v2)) (* dy (car v2))) det))
           (list (+ (car p1) (* tt (car v1)))
                 (+ (cadr p1) (* tt (cadr v1))) 0.0))))

; t-παράμετρος σημείου P κατά μήκος ευθείας p1->v
(defun wl-tpar (P p1 v)
  (+ (* (- (car P) (car p1)) (car v))
     (* (- (cadr P) (cadr p1)) (cadr v))))

(defun wl-set10 (ent p / ed) (entmod (subst (cons 10 p) (assoc 10 (entget ent)) (entget ent))) (entupd ent))
(defun wl-set11 (ent p / ed) (entmod (subst (cons 11 p) (assoc 11 (entget ent)) (entget ent))) (entupd ent))

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

; XData τοίχου: τύπος, πάχος, ύψος, εξωτερικός, ETICS
(defun wl-xdata (mat typ ww hh ext etics / ent ed xd)
  (if (null (tblsearch "APPID" "HEXIS_WL")) (regapp "HEXIS_WL"))
  (list -3 (list "HEXIS_WL"
    (cons 1000 mat) (cons 1000 typ) (cons 1040 ww) (cons 1040 hh)
    (cons 1000 ext) (cons 1040 etics))))

(defun wl-dcl-write ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "wall.dcl"))
  (setq f (open path "w"))
  (write-line "wall_dlg : dialog {" f)
  (write-line "  label = \"WALL v2 \U+2014 \U+03A4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C2 (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "    : column {" f)
  (write-line "      : radio_column { key = \"typ\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\";" f)
  (write-line "        : radio_button { key = \"t_bat\"; label = \"\U+039C\U+03C0\U+03B1\U+03C4\U+03B9\U+03BA\U+03CC\U+03C2 (9.5cm)\"; }" f)
  (write-line "        : radio_button { key = \"t_dro\"; label = \"\U+0394\U+03C1\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 (6.5cm)\"; }" f)
  (write-line "        : radio_button { key = \"t_dip\"; label = \"\U+0394\U+03B9\U+03C0\U+03BB\U+03CC\U+03C2 \U+03B4\U+03C1\U+03BF\U+03BC. + \U+03BC\U+03CC\U+03BD\U+03C9\U+03C3\U+03B7\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"t_bet\"; label = \"\U+03A6.\U+03A3. / \U+039C\U+03C0\U+03B5\U+03C4\U+03CC\U+03BD\"; }" f)
  (write-line "      }" f)
  (write-line "      : edit_box { key = \"ww\"; label = \"\U+03A0\U+03AC\U+03C7\U+03BF\U+03C2 (m):\"; edit_width = 7; }" f)
  (write-line "      : edit_box { key = \"ins\"; label = \"\U+039C\U+03CC\U+03BD\U+03C9\U+03C3\U+03B7 \U+03B4\U+03B9\U+03C0\U+03BB\U+03BF\U+03CD (cm):\"; edit_width = 7; }" f)
  (write-line "      : edit_box { key = \"hh\"; label = \"\U+038E\U+03C8\U+03BF\U+03C2 (m):\"; edit_width = 7; }" f)
  (write-line "  : radio_row { key = \"aln\"; label = \"\U+0386\U+03BE\U+03BF\U+03BD\U+03B1\U+03C2 \U+03C9\U+03C2 \U+03C0\U+03C1\U+03BF\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7\";" f)
  (write-line "    : radio_button { key = \"a_cen\"; label = \"\U+039A\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF (\U+03B1\U+03BE. \U+03C3\U+03C4\U+03B7 \U+03BC\U+03AD\U+03C3\U+03B7)\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"a_in\"; label = \"\U+039C\U+03AD\U+03C3\U+03B1 (\U+03B1\U+03BE. \U+03C3\U+03C4\U+03B7\U+03BD \U+03B5\U+03C3\U+03C9\U+03C4.)\"; }" f)
  (write-line "    : radio_button { key = \"a_out\"; label = \"\U+0388\U+03BE\U+03C9 (\U+03B1\U+03BE. \U+03C3\U+03C4\U+03B7\U+03BD \U+03B5\U+03BE\U+03C9\U+03C4.)\"; }" f)
  (write-line "  }" f)
  (write-line "      : toggle { key = \"ext\"; label = \"\U+0395\U+03BE\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03CC\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C2\"; }" f)
  (write-line "      : edit_box { key = \"etics\"; label = \"ETICS (cm):\"; edit_width = 7; }" f)
  (write-line "    }" f)
  (write-line "    : column {" f)
  (write-line "      : image { key = \"prev\"; width = 28; aspect_ratio = 0.5; color = 0; }" f)
  (write-line "      : text { key = \"winfo\"; width = 30; }" f)
  (write-line "    }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)
  path)

(defun wl-dcl-prev ( / w h cx y0 y1 w1 ins thick col-w col-in col-e)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq cx (fix (* w 0.5)) y0 (fix (* h 0.35)) y1 (fix (* h 0.65)))
  (setq thick (fix (* w 0.35)))
  ;; τοίχος
  (setq col-w (cond ((= *wl-TYP* "BETON") 5) ((= *wl-TYP* "BATIKOS") 1) (T 4)))
  (fill_image (- cx thick) y0 (* thick 2) (- y1 y0) col-w)
  (vector_image (- cx thick) y0 (+ cx thick) y0 7)
  (vector_image (- cx thick) y1 (+ cx thick) y1 7)
  (vector_image (- cx thick) y0 (- cx thick) y1 7)
  (vector_image (+ cx thick) y0 (+ cx thick) y1 7)
  ;; μόνωση (διπλός)
  (if (= *wl-TYP* "DIPLOS")
    (progn
      (setq ins (fix (* w 0.07)))
      (fill_image (- cx ins) y0 (* ins 2) (- y1 y0) 8)
      (vector_image (- cx ins) y0 (- cx ins) y1 7)
      (vector_image (+ cx ins) y0 (+ cx ins) y1 7)))
  ;; ETICS εξωτερικά
  (if (= *wl-EXT* "1")
    (progn
      (fill_image (+ cx thick) y0 (fix (* w 0.12)) (- y1 y0) 3)
      (vector_image (+ cx thick (fix (* w 0.12))) y0
                    (+ cx thick (fix (* w 0.12))) y1 7)))
  (setq axline (cond ((= *wl-ALIGN* "CENTER") cx) ((= *wl-ALIGN* "INSIDE") (- cx thick)) (T (+ cx thick))))
  (vector_image axline y0 axline y1 1)
  (set_tile "winfo" (strcat "\U+03A0\U+03AC\U+03C7\U+03BF\U+03C2: " (rtos *wl-W* 2 3) " m"
    (if (= *wl-EXT* "1") (strcat " + ETICS " (rtos *wl-ETICS* 2 2) "m") "")
    (strcat "  [" (cond ((= *wl-ALIGN* "CENTER") "\U+03BA\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF") ((= *wl-ALIGN* "INSIDE") "\U+03BC\U+03AD\U+03C3\U+03B1") (T "\U+03AD\U+03BE\U+03C9")) "]")))
  (end_image))

(defun wl-preset (typ ins / w)
  (setq ins (/ (atof ins) 100.0))
  (cond
    ((= typ "BATIKOS") (setq w 0.095))
    ((= typ "DROMIKOS") (setq w 0.065))
    ((= typ "DIPLOS") (setq w (+ 0.095 ins 0.065)))
    (T (setq w 0.20)))
  (setq *wl-W* w)
  (set_tile "ww" (rtos w 2 3))
  (setq *wl-TYP* typ)
  (wl-dcl-prev))

(defun C:WALL ( / *error* dclpath dclid status f
    ww hh mat typ ext etics ins lyr col ang off1 off2
    p1 p2 s pa pb pc pd xd keyinput)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 WALL: " msg)))
    (princ))

  (setq dclpath (wl-dcl-write))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nDCL error.") (exit)))
  (if (not (new_dialog "wall_dlg" dclid)) (progn (princ "\nDialog error.") (exit)))
  (set_tile "ww" (rtos *wl-W* 2 3))
  (set_tile "hh" (rtos *wl-H* 2 2))
  (set_tile "ins" "5")
  (set_tile "etics" (rtos (* *wl-ETICS* 100.0) 2 0))
  (if (= *wl-EXT* "1") (set_tile "ext" "1"))
  (wl-dcl-prev)
  (action_tile "a_cen" "(setq *wl-ALIGN* \"CENTER\") (wl-dcl-prev)")
  (action_tile "a_in"  "(setq *wl-ALIGN* \"INSIDE\") (wl-dcl-prev)")
  (action_tile "a_out" "(setq *wl-ALIGN* \"OUTSIDE\") (wl-dcl-prev)")
  (action_tile "t_bat"  "(wl-preset \"BATIKOS\"  (get_tile \"ins\"))")
  (action_tile "t_dro"  "(wl-preset \"DROMIKOS\" (get_tile \"ins\"))")
  (action_tile "t_dip"  "(wl-preset \"DIPLOS\"   (get_tile \"ins\"))")
  (action_tile "t_bet"  "(wl-preset \"BETON\"    (get_tile \"ins\"))")
  (action_tile "ww"     "(setq *wl-W* (atof (get_tile \"ww\"))) (wl-dcl-prev)")
  (action_tile "ins"    "(wl-preset *wl-TYP* (get_tile \"ins\"))")
  (action_tile "ext"    "(setq *wl-EXT* (get_tile \"ext\")) (wl-dcl-prev)")
  (action_tile "etics"  "(setq *wl-ETICS* (/ (atof (get_tile \"etics\")) 100.0)) (wl-dcl-prev)")
  (action_tile "accept"
    "(setq *wl-W* (atof (get_tile \"ww\"))) (setq *wl-H* (atof (get_tile \"hh\"))) (setq *wl-EXT* (get_tile \"ext\")) (setq *wl-ETICS* (/ (atof (get_tile \"etics\")) 100.0)) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq ww *wl-W* hh *wl-H* ext *wl-EXT* etics *wl-ETICS* typ *wl-TYP*)

  ;; layer + XData
  (setq lyr (strcat "WALL-" typ "-" (itoa (fix (* ww 100)))))
  (setq col (cond ((= typ "BETON") 5) ((= typ "BATIKOS") 1) ((= typ "DIPLOS") 4) (T 3)))
  (wl-layer lyr col) (wl-layer "WALL-AXIS" 8) (wl-layer "WALL-ETICS" 3)
  (setq xd (wl-xdata typ typ ww hh ext etics))

  (setq s *wl-SIDE*)  ; φορά (+1 αριστερά, -1 δεξιά)
  (princ (strcat "\n" "\U+0391\U+03C1\U+03C7\U+03AE \U+03AC\U+03BE\U+03BF\U+03BD\U+03B1 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (F=\U+03B1\U+03BB\U+03BB\U+03B1\U+03B3\U+03AE \U+03C6\U+03BF\U+03C1\U+03AC\U+03C2, Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2):"))
  (setq p1 (getpoint (strcat "\n" "\U+0391\U+03C1\U+03C7\U+03AE (F=flip \U+03C6\U+03BF\U+03C1\U+03AC): ")))
  (while p1
    ;; έλεγχος flip ΠΡΙΝ το getpoint τέλους
    (while (and (listp p1)
               (= (type p1) (quote LIST))
               (= (length p1) 1)
               (= (car p1) (ascii "F")))
      nil)  ; placeholder — το flip γίνεται κάτω
    (setq p2 (getpoint p1 (strcat "\n" "\U+03A4\U+03AD\U+03BB\U+03BF\U+03C2 (F=\U+03B1\U+03BD\U+03C4\U+03B9\U+03C3\U+03C4\U+03C1\U+03BF\U+03C6\U+03AE \U+03BA\U+03B1\U+03C4\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03C3\U+03B7\U+03C2, Enter=\U+03BD\U+03AD\U+03BF\U+03C2): ")))
    (if p2
      (progn
        (setq ang (angle p1 p2))
        ;; s=+1: αριστερά, s=-1: δεξιά
        ;; align: CENTER/INSIDE/OUTSIDE
        (setq off1 (cond ((= *wl-ALIGN* "CENTER")  (* s (/ ww  2.0)))
                         ((= *wl-ALIGN* "INSIDE")  (* s ww))
                         (T                         0.0)))
        (setq off2 (cond ((= *wl-ALIGN* "CENTER")  (* s (/ ww -2.0)))
                         ((= *wl-ALIGN* "INSIDE")  0.0)
                         (T                        (* s (- ww)))))
        (setq pa (wl-perp p1 ang off1))
        (setq pb (wl-perp p2 ang off1))
        (setq pc (wl-perp p1 ang off2))
        (setq pd (wl-perp p2 ang off2))
        ;; 2 πλαϊνές + 2 καπάκια
        (setq e1 (wl-line pa pb lyr))
        (setq e2 (wl-line pc pd lyr))
        (wl-line pa pc lyr)
        (wl-line pb pd lyr)
        ;; ETICS: επιπλέον γραμμή εξωτερικά
        (if (= ext "1")
          (progn
            (setq pe (wl-perp p1 ang (* s (+ (/ ww 2.0) etics))))
            (setq pf (wl-perp p2 ang (* s (+ (/ ww 2.0) etics))))
            (wl-line pe pf "WALL-ETICS")
            (wl-line pe pa "WALL-ETICS")
            (wl-line pf pb "WALL-ETICS")))
        ;; axis
        (wl-line (list (car p1)(cadr p1) 0.0) (list (car p2)(cadr p2) 0.0) "WALL-AXIS")))
    ;; getpoint με keyword F για flip
    (initget "F")
    (setq p1 (getpoint (strcat "\n" "\U+0391\U+03C1\U+03C7\U+03AE (F=flip \U+03C6\U+03BF\U+03C1\U+03AC, Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): ")))
    (if (= p1 "F") (progn (setq *wl-SIDE* (- *wl-SIDE*) s *wl-SIDE*)
      (princ (strcat "\n\U+03A6\U+03BF\U+03C1\U+03AC \U+03B1\U+03BD\U+03C4\U+03B5\U+03C3\U+03C4\U+03C1\U+03AC\U+03C6\U+03B7 \U+2192 " (if (> s 0) "\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AC" "\U+03B4\U+03B5\U+03BE\U+03B9\U+03AC"))))
      (if (= p1 "F") (setq p1 (getpoint (strcat "\n" "\U+0391\U+03C1\U+03C7\U+03AE: ")))))
  )
  (princ (strcat "\n" "WALL: \U+03A4\U+03C1\U+03AD\U+03BE\U+03B5 WALLJOIN \U+03B3\U+03B9\U+03B1 trim \U+03B3\U+03C9\U+03BD\U+03B9\U+03CE\U+03BD, WALLROOM \U+03B3\U+03B9\U+03B1 \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03AC."))
  (princ))

(defun C:WALLJOIN ( / *error* ss n segs i j e ed s1 s2
    p1 q1 p2 q2 v1 v2 ang1 ang2 hit d11 d12 d21 d22 snapR njoins)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 WALLJOIN: " msg)))
    (princ))

  (setq snapR 0.08 njoins 0)
  (setq ss (ssget "X" (list (cons 0 "LINE") (cons 8 "*WALL*"))))
  (if (null ss) (progn (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03B9.") (exit)))
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
    (setq ang1 (angle p1 q1) v1 (list (cos ang1) (sin ang1)))
    (setq j (1+ i))
    (while (< j n)
      (setq s2 (nth j segs) p2 (cadr s2) q2 (caddr s2))
      (setq ang2 (angle p2 q2))
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
  (princ (strcat "\nWALLJOIN: " (itoa njoins) " snaps."))
  (princ))

(defun C:WALLROOM ( / *error* lab pt bnd ed pts ar pr cn)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n" "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 WALLROOM: " msg)))
    (princ))

  (wl-layer "WALL-TEXT" 3)
  (setq lab (getreal (strcat "\n" "\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03B5\U+03B9\U+03BC\U+03AD\U+03BD\U+03BF\U+03C5 (m) <1.00>: ")))
  (if (null lab) (setq lab 1.00))
  (setq pt (getpoint (strcat "\n" "\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C7\U+03CE\U+03C1\U+03BF\U+03C5 (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): ")))
  (while pt
    (command "_.BOUNDARY" pt "")
    (setq bnd (entlast))
    (if (and bnd (= (cdr (assoc 0 (entget bnd))) "LWPOLYLINE"))
      (progn
        (setq ed (entget bnd) pts (list))
        (foreach pr ed (if (= (car pr) 10) (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
        (if (>= (length pts) 3)
          (progn
            (setq ar (wl-area pts) pr (wl-perim pts) cn (wl-cen pts))
            (wl-txt (list (car cn) (+ (cadr cn) (* lab 0.65)) 0.0)
              lab (strcat "E=" (rtos ar 2 2) " m2") "WALL-TEXT")
            (wl-txt (list (car cn) (- (cadr cn) (* lab 0.8)) 0.0)
              (* lab 0.72) (strcat "P=" (rtos pr 2 2) " m") "WALL-TEXT")
            (princ (strcat "\n  E=" (rtos ar 2 2) " m2   P=" (rtos pr 2 2) " m")))
          (princ (strcat "\n  " "\U+039F \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B4\U+03B5\U+03BD \U+03BA\U+03BB\U+03B5\U+03AF\U+03BD\U+03B5\U+03B9 \U+2014 \U+03C4\U+03C1\U+03AD\U+03BE\U+03B5 WALLJOIN."))))
      (princ (strcat "\n  " "\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 boundary.")))
    (setq pt (getpoint (strcat "\n" "\U+0395\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF (Enter=\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2): "))))
  (princ (strcat "\n" "WALLROOM \U+03BF\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5."))
  (princ))

;; wd-cut-wall: κόβει τον τοίχο για να μπει κούφωμα
;; p1/p2 = άκρα ανοίγματος ΚΑΤΑ ΤΟΝ ΑΞΟΝΑ ΤΟΥ ΤΟΙΧΟΥ
;; wlyr = layer τοίχου
(defun wd-cut-wall (t1 t2 p-ref v-ang wlyr / ss n i e ed
    ep1 ep2 tp1 tp2 ang2 v2 hit len tol)
  (setq tol 0.005)
  (setq ss (ssget "X" (list (cons 0 "LINE") (cons 8 "*WALL*"))))
  (if (null ss) (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03B9 \U+03B3\U+03B9\U+03B1 \U+03BA\U+03CC\U+03C8\U+03B9\U+03BC\U+03BF.") (progn
    (setq n (sslength ss) i 0)
    (while (< i n)
      (setq e (ssname ss i) ed (entget e))
      (setq ep1 (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed)) 0.0))
      (setq ep2 (list (cadr (assoc 11 ed)) (caddr (assoc 11 ed)) 0.0))
      (setq ang2 (angle ep1 ep2))
      ;; μόνο ΠΑΡΑΛΛΗΛΕΣ γραμμές (ίδια κατεύθυνση ±5°)
      (if (< (abs (sin (- v-ang ang2))) 0.09)
        (progn
          ;; t-παράμετροι αρχής/τέλους γραμμής ως προς p-ref/v
          (setq v2 (list (cos v-ang) (sin v-ang)))
          (setq tp1 (wl-tpar ep1 p-ref v2))
          (setq tp2 (wl-tpar ep2 p-ref v2))
          (setq len (distance ep1 ep2))
          ;; αν η γραμμή επικαλύπτεται με [t1,t2]
          (if (and (< tp1 (+ t2 tol)) (> tp2 (- t1 tol)))
            (progn
              ;; κράτα [0..t1] και [t2..len]
              (setq new-ep2 (polar ep1 ang2 (- t1 tp1)))
              (setq new-ep3 (polar ep1 ang2 (- t2 tp1)))
              (if (> (distance ep1 new-ep2) tol)
                (wl-set11 e new-ep2)
                (entdel e))
              (if (> (distance new-ep3 ep2) tol)
                (wl-line new-ep3 ep2 (cdr (assoc 8 (entget e)))))))))
      (setq i (1+ i))))))

(princ "\nWALLS v2.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5.")
(princ "\n\U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: WALL \U+00B7 WALLJOIN \U+00B7 WALLROOM")
(princ "\nWINDOORS v3+ \U+03C7\U+03C1\U+03B7\U+03C3\U+03B9\U+03BC\U+03BF\U+03C0\U+03BF\U+03B9\U+03B5\U+03AF wd-cut-wall \U+03B3\U+03B9\U+03B1 \U+03B1\U+03C5\U+03C4\U+03CC\U+03BC\U+03B1\U+03C4\U+03BF \U+03BA\U+03CC\U+03C8\U+03B9\U+03BC\U+03BF \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5.")
(princ)
