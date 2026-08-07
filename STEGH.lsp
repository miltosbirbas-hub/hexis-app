;;; STEGH.LSP v2.0 — Επίλυση στέγης από κάτοψη
;;; ΙΣΟΚΛΙΝΗΣ (αυτόματη επίλυση οποιουδήποτε περιγράμματος - μαχιές/ντερέδες/κορφιάδες)
;;; + Δίρριχτη / Μονόρριχτη για ορθογώνια. Λεπτομέρεια τομής ΜΟΝΟ αν ζητηθεί.
;;; Εντολή: STEGH | HEXIS — BRB DEVELOPMENT

(setq *st-TYP* "ISO" *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50
      *st-TKER* 5.0 *st-TTEG* 8.0 *st-TTH* 8.0 *st-TPET* 2.5
      *st-HAM* 16.0 *st-HEL* 18.0 *st-DZ* 0.90
      *st-HATCH* "0" *st-SEC* "0" *st-TRUSS* "0")

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

(defun st-getpts (ent / ed pts pr p0)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr) 0.0))))))
  ;; αφαίρεση διπλού τελευταίου σημείου αν συμπίπτει με το πρώτο
  (if (and (> (length pts) 1)
           (< (distance (car pts) (last pts)) 1e-6))
    (setq pts (reverse (cdr (reverse pts)))))
  pts)

(defun st-slope-rad ( )
  (if (= *st-PMODE* "PCT")
    (atan (/ *st-PIT* 100.0))
    (* *st-PIT* (/ pi 180.0))))

; εμβαδόν με πρόσημο (CCW θετικό)
(defun st-area (pts / a i p q n)
  (setq a 0.0 n (length pts) i 0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  (/ a 2.0))

;; ============================================================
;; STRAIGHT SKELETON (LAV, edge events)
;; Κάθε ενεργή κορυφή: (list pt vx vy) όπου (vx vy) ταχύτητα wavefront
;; ============================================================

; ταχύτητα κορυφής από τα inward normals των 2 ακμών (nA πριν, nB μετά)
(defun st-vel (nA nB / det)
  (setq det (- (* (car nA) (cadr nB)) (* (cadr nA) (car nB))))
  (if (< (abs det) 1e-9)
    ;; συνευθειακές ακμές: κίνηση κατά το κοινό normal
    (list (car nA) (cadr nA))
    (list (/ (- (cadr nB) (cadr nA)) det)
          (/ (- (car nA) (car nB)) det))))

; inward normal (CCW πολύγωνο): αριστερό κάθετο της ακμής
(defun st-inorm (p q / dx dy len)
  (setq dx (- (car q) (car p)) dy (- (cadr q) (cadr p)))
  (setq len (sqrt (+ (* dx dx) (* dy dy))))
  (if (< len 1e-9) (list 0.0 0.0)
    (list (/ (- dy) len) (/ dx len))))

; Επίλυση skeleton v3: births + vertex events + collinear fallback
; lav item: (list cur birth) · ring: (list lav tacc)
(defun st-skel (pts / arcs rings guard lav tacc m i j V p q
               ex ey el ux uy rel tt tmin evs adv drops nb nl
               m2 aa bb split P r1 r2 ii t2 ei d01 d12 d02 mid e1 e2 it)
  (setq arcs (list))
  (setq rings (list (list (mapcar (quote (lambda (p) (list p p))) pts) 0.0)))
  (setq guard 0)
  (while (and rings (< guard 800))
    (setq guard (1+ guard))
    (setq lav (car (car rings)) tacc (cadr (car rings)))
    (setq rings (cdr rings))
    (setq m (length lav))
    (cond
      ((< m 2) nil)
      ;; -- 2 κορυφές: κορφιάς --
      ((= m 2)
        (setq arcs (append arcs (list (list (cadr (nth 0 lav)) (cadr (nth 1 lav)) tacc)))))
      ;; -- 3 κορυφές: τελικό event ή collinear --
      ((= m 3)
        (setq V (list))
        (setq i 0)
        (while (< i 3)
          (setq V (append V (list (st-vel
            (st-inorm (car (nth (rem (+ i 2) 3) lav)) (car (nth i lav)))
            (st-inorm (car (nth i lav)) (car (nth (rem (1+ i) 3) lav)))))))
          (setq i (1+ i)))
        (setq t2 nil ei 0 i 0)
        (while (< i 3)
          (setq j (rem (1+ i) 3))
          (setq p (car (nth i lav)) q (car (nth j lav)))
          (setq ex (- (car q) (car p)) ey (- (cadr q) (cadr p)))
          (setq el (sqrt (+ (* ex ex) (* ey ey))))
          (if (> el 1e-9)
            (progn
              (setq ux (/ ex el) uy (/ ey el))
              (setq rel (+ (* (- (car (nth i V)) (car (nth j V))) ux)
                           (* (- (cadr (nth i V)) (cadr (nth j V))) uy)))
              (if (> rel 1e-9)
                (progn
                  (setq tt (/ el rel))
                  (if (or (null t2) (< tt t2)) (progn (setq t2 tt) (setq ei i)))))))
          (setq i (1+ i)))
        (if t2
          (progn
            (setq P (list (+ (car (car (nth ei lav))) (* t2 (car (nth ei V))))
                          (+ (cadr (car (nth ei lav))) (* t2 (cadr (nth ei V)))) 0.0))
            (setq i 0)
            (while (< i 3)
              (setq arcs (append arcs (list (list (cadr (nth i lav)) P (+ tacc t2)))))
              (setq i (1+ i))))
          (progn
            ;; collinear fallback: μέσο -> άκρα
            (setq d01 (distance (cadr (nth 0 lav)) (cadr (nth 1 lav))))
            (setq d12 (distance (cadr (nth 1 lav)) (cadr (nth 2 lav))))
            (setq d02 (distance (cadr (nth 0 lav)) (cadr (nth 2 lav))))
            (cond
              ((and (>= d01 d12) (>= d01 d02)) (setq mid 2 e1 0 e2 1))
              ((and (>= d12 d01) (>= d12 d02)) (setq mid 0 e1 1 e2 2))
              (T (setq mid 1 e1 0 e2 2)))
            (setq arcs (append arcs (list
              (list (cadr (nth mid lav)) (cadr (nth e1 lav)) tacc)
              (list (cadr (nth mid lav)) (cadr (nth e2 lav)) tacc)))))))
      ;; -- 4+ κορυφές: edge events --
      (T
        (setq V (list) i 0)
        (while (< i m)
          (setq V (append V (list (st-vel
            (st-inorm (car (nth (rem (+ i (1- m)) m) lav)) (car (nth i lav)))
            (st-inorm (car (nth i lav)) (car (nth (rem (1+ i) m) lav)))))))
          (setq i (1+ i)))
        (setq tmin nil evs (list) i 0)
        (while (< i m)
          (setq j (rem (1+ i) m))
          (setq p (car (nth i lav)) q (car (nth j lav)))
          (setq ex (- (car q) (car p)) ey (- (cadr q) (cadr p)))
          (setq el (sqrt (+ (* ex ex) (* ey ey))))
          (if (> el 1e-9)
            (progn
              (setq ux (/ ex el) uy (/ ey el))
              (setq rel (+ (* (- (car (nth i V)) (car (nth j V))) ux)
                           (* (- (cadr (nth i V)) (cadr (nth j V))) uy)))
              (if (> rel 1e-9)
                (progn
                  (setq tt (/ el rel))
                  (cond
                    ((or (null tmin) (< tt (- tmin 1e-9)))
                      (setq tmin tt) (setq evs (list i)))
                    ((<= (abs (- tt tmin)) (* 1e-6 (max 1.0 tmin)))
                      (setq evs (append evs (list i)))))))))
          (setq i (1+ i)))
        (if (null tmin)
          (princ "\n[skeleton] Κολλημένος δακτύλιος - παραλείπεται (σύνθετο τμήμα).")
          (progn
            (setq tacc (+ tacc tmin))
            (setq adv (list) i 0)
            (while (< i m)
              (setq adv (append adv (list (list
                (+ (car (car (nth i lav))) (* tmin (car (nth i V))))
                (+ (cadr (car (nth i lav))) (* tmin (cadr (nth i V)))) 0.0))))
              (setq i (1+ i)))
            (setq drops (list) nb (list))
            (foreach i evs
              (setq j (rem (1+ i) m))
              (setq drops (append drops (list j)))
              (setq arcs (append arcs (list
                (list (cadr (nth i lav)) (nth i adv) tacc)
                (list (cadr (nth j lav)) (nth i adv) tacc))))
              (setq nb (append nb (list (cons i (nth i adv))))))
            (setq nl (list) ii 0)
            (while (< ii m)
              (if (not (member ii drops))
                (setq nl (append nl (list (list (nth ii adv)
                  (cond ((assoc ii nb) (cdr (assoc ii nb)))
                        (T (cadr (nth ii lav)))))))))
              (setq ii (1+ ii)))
            ;; vertex event: σύμπτωση μη-γειτονικών
            (setq m2 (length nl) split nil aa 0)
            (while (and (< aa m2) (null split))
              (setq bb (+ aa 2))
              (while (and (< bb m2) (null split))
                (if (not (and (= aa 0) (= bb (1- m2))))
                  (if (< (distance (car (nth aa nl)) (car (nth bb nl))) 1e-6)
                    (setq split (list aa bb))))
                (setq bb (1+ bb)))
              (setq aa (1+ aa)))
            (if split
              (progn
                (setq aa (car split) bb (cadr split))
                (setq P (car (nth aa nl)))
                (setq arcs (append arcs (list
                  (list (cadr (nth aa nl)) P tacc)
                  (list (cadr (nth bb nl)) P tacc))))
                ;; sub-ring 1: [P] + nl(aa+1..bb-1)
                (setq r1 (list (list P P)) ii (1+ aa))
                (while (< ii bb)
                  (setq r1 (append r1 (list (nth ii nl))))
                  (setq ii (1+ ii)))
                ;; sub-ring 2: [P] + nl(bb+1..end) + nl(0..aa-1)
                (setq r2 (list (list P P)) ii (1+ bb))
                (while (< ii m2)
                  (setq r2 (append r2 (list (nth ii nl))))
                  (setq ii (1+ ii)))
                (setq ii 0)
                (while (< ii aa)
                  (setq r2 (append r2 (list (nth ii nl))))
                  (setq ii (1+ ii)))
                (setq rings (append rings (list (list r1 tacc) (list r2 tacc)))))
              (setq rings (append rings (list (list nl tacc)))))))
      ))
  )
  arcs)

;; -- Preview --
(defun st-prev ( / w h x0 x1 y0 y1 xm ym)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq x0 (fix (* w 0.12)) x1 (fix (* w 0.88)))
  (setq y0 (fix (* h 0.15)) y1 (fix (* h 0.75)))
  (cond
    ((= *st-TYP* "ISO")
      ;; τετράρριχτη: ορθογώνιο + μαχιές 45 + κορφιάς
      (vector_image x0 y0 x1 y0 7) (vector_image x1 y0 x1 y1 7)
      (vector_image x1 y1 x0 y1 7) (vector_image x0 y1 x0 y0 7)
      (setq ym (fix (/ (+ y0 y1) 2)))
      (setq xm (fix (- y1 y0)))  ; μισό ύψος για 45
      (vector_image x0 y0 (+ x0 (/ xm 2)) ym 1)
      (vector_image x0 y1 (+ x0 (/ xm 2)) ym 1)
      (vector_image x1 y0 (- x1 (/ xm 2)) ym 1)
      (vector_image x1 y1 (- x1 (/ xm 2)) ym 1)
      (vector_image (+ x0 (/ xm 2)) ym (- x1 (/ xm 2)) ym 1))
    ((= *st-TYP* "GAB")
      (vector_image x0 y0 x1 y0 7) (vector_image x1 y0 x1 y1 7)
      (vector_image x1 y1 x0 y1 7) (vector_image x0 y1 x0 y0 7)
      (setq ym (fix (/ (+ y0 y1) 2)))
      (vector_image x0 ym x1 ym 1))
    (T
      (vector_image x0 y0 x1 y0 7) (vector_image x1 y0 x1 y1 7)
      (vector_image x1 y1 x0 y1 7) (vector_image x0 y1 x0 y0 7)
      (vector_image x0 (+ y0 4) x1 (+ y0 10) 1)))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (set_tile "sinfo" (strcat "Γωνία = "
    (rtos (* (st-slope-rad) (/ 180.0 pi)) 2 1) " μοίρες  |  Κλίση = "
    (rtos (* 100.0 (/ (sin (st-slope-rad)) (cos (st-slope-rad)))) 2 1) " %"))
  (st-prev))

(defun C:STEGH ( / *error* ent pts n area th
    dclpath dclid status f arcs arc hmax tt
    inspt sx sy span half rise heel1 heel2 apex zz yy j xx off
    tk tg tp tth dteg nteg lab-h lab-x lab-y
    p1 p2 newlav)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\nΣφάλμα STEGH: " msg)))
    (princ))

  (st-layer "STEGH"     7)
  (st-layer "STEGH-SKL" 1)   ; skeleton: μαχιές/ντερέδες/κορφιάδες
  (st-layer "STEGH-SEC" 7)
  (st-layer "STEGH-TXT" 2)

  (princ "\nΕπίλεξε την ΚΛΕΙΣΤΗ polyline του περιγράμματος στέγης:")
  (setq ent (entsel))
  (if (null ent) (exit))
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3) (progn (princ "\nΧρειάζεται κλειστό πολύγωνο.") (exit)))
  ;; εξασφάλιση CCW
  (setq area (st-area pts))
  (if (< area 0.0) (setq pts (reverse pts)))

  ;; DCL
  (setq dclpath (strcat (getvar "TEMPPREFIX") "stegh.dcl"))
  (setq f (open dclpath "w"))
  (write-line "stegh_dlg : dialog {" f)
  (write-line "  label = \"STEGH v2 — Επίλυση Στέγης (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "  : radio_column { key = \"typ\"; label = \"Τύπος\";" f)
  (write-line "    : radio_button { key = \"t_iso\"; label = \"Ισοκλινής (αυτόματη επίλυση)\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"t_gab\"; label = \"Δίρριχτη (ορθογώνιο)\"; }" f)
  (write-line "    : radio_button { key = \"t_mon\"; label = \"Μονόρριχτη (ορθογώνιο)\"; }" f)
  (write-line "  }" f)
  (write-line "  : radio_row { key = \"pm\"; label = \"Μονάδα\";" f)
  (write-line "    : radio_button { key = \"p_pct\"; label = \"%\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"p_deg\"; label = \"Μοίρες\"; }" f)
  (write-line "  }" f)
  (write-line "  : edit_box { key = \"pit\"; label = \"Κλίση:\"; edit_width = 7; }" f)
  (write-line "  : edit_box { key = \"ovh\"; label = \"Προεξοχή (m):\"; edit_width = 7; }" f)
  (write-line "  : toggle { key = \"sec\"; label = \"Λεπτομέρεια τομής με στρώσεις (προαιρετικό)\"; }" f)
  (write-line "  : toggle { key = \"tru\"; label = \"Αναπτυγμένο ζευκτό (προαιρετικό)\"; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "  : image { key = \"prev\"; width = 32; aspect_ratio = 0.75; color = 0; }" f)
  (write-line "  : text { key = \"sinfo\"; width = 38; }" f)
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
  (st-upd)
  (action_tile "t_iso" "(setq *st-TYP* \"ISO\") (st-prev)")
  (action_tile "t_gab" "(setq *st-TYP* \"GAB\") (st-prev)")
  (action_tile "t_mon" "(setq *st-TYP* \"MON\") (st-prev)")
  (action_tile "p_pct" "(setq *st-PMODE* \"PCT\") (st-upd)")
  (action_tile "p_deg" "(setq *st-PMODE* \"DEG\") (st-upd)")
  (action_tile "pit" "(st-upd)")
  (action_tile "ovh" "(st-upd)")
  (action_tile "accept"
    "(st-upd) (setq *st-SEC* (get_tile \"sec\")) (setq *st-TRUSS* (get_tile \"tru\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\nΑκύρωση.") (exit)))
  (setq th (st-slope-rad))

  ;; ===== ΙΣΟΚΛΙΝΗΣ ΕΠΙΛΥΣΗ =====
  (if (= *st-TYP* "ISO")
    (progn
      (princ "\nΕπίλυση straight skeleton...")
      (setq arcs (st-skel pts))
      (if (null arcs)
        (princ "\nΑδυναμία επίλυσης — έλεγξε το περίγραμμα (απλό πολύγωνο, χωρίς αυτοτομές).")
        (progn
          ;; σχεδίαση arcs
          (setq hmax 0.0)
          (foreach arc arcs
            (st-line (car arc) (cadr arc) "STEGH-SKL")
            (setq tt (caddr arc))
            (if (> tt hmax) (setq hmax tt)))
          ;; μέγιστο ύψος κορφιά
          (setq tt (* hmax (/ (sin th) (cos th))))
          (princ (strcat "\nΜέγιστο ύψος κορφιά από γέννηση στέγης: +"
            (rtos tt 2 2) " m"))
          (st-txt (car (cadr (car (reverse arcs))))
            0.25 (strcat "+" (rtos tt 2 2)) "STEGH-TXT")
          (princ (strcat "\n" (itoa (length arcs)) " γραμμές skeleton (μαχιές/ντερέδες/κορφιάδες).")))))
    ;; ===== ΟΡΘΟΓΩΝΙΚΑ (όπως v1 απλοποιημένο) =====
    (progn
      (if (/= (length pts) 4)
        (princ "\nΠΡΟΣΟΧΗ: Δίρριχτη/Μονόρριχτη θέλει ορθογώνιο 4 κορυφών — χρησιμοποίησε Ισοκλινή.")
        (progn
          (setq p1 (nth 0 pts) p2 (nth 1 pts))
          (if (< (distance p1 p2) (distance (nth 1 pts) (nth 2 pts)))
            (setq p1 (nth 1 pts) p2 (nth 2 pts)))
          ;; κορφιάς παράλληλος στη μεγάλη πλευρά, στη μέση
          (if (= *st-TYP* "GAB")
            (st-line
              (list (/ (+ (car (nth 0 pts)) (car (nth 3 pts))) 2.0)
                    (/ (+ (cadr (nth 0 pts)) (cadr (nth 3 pts))) 2.0) 0.0)
              (list (/ (+ (car (nth 1 pts)) (car (nth 2 pts))) 2.0)
                    (/ (+ (cadr (nth 1 pts)) (cadr (nth 2 pts))) 2.0) 0.0)
              "STEGH-SKL")
            (princ "\nΜονόρριχτη: μία κλίση σε όλο το πλάτος.")))))
  )

  ;; ===== ΛΕΠΤΟΜΕΡΕΙΑ (ΜΟΝΟ ΑΝ ΖΗΤΗΘΕΙ) =====
  (if (or (= *st-SEC* "1") (= *st-TRUSS* "1"))
    (progn
      (princ "\nΆνοιγμα λεπτομέρειας: δώσε 2 σημεία στην κάτοψη (πλάτος τομής)")
      (setq p1 (getpoint "\n1ο σημείο: "))
      (setq p2 (getpoint p1 "\n2ο σημείο: "))
      (if (and p1 p2)
        (progn
          (setq span (+ (distance p1 p2) (* 2 *st-OVH*)))
          (setq inspt (getpoint "\nΣημείο εισαγωγής λεπτομέρειας: "))
          (if inspt
            (progn
              (setq sx (car inspt) sy (cadr inspt))
              (setq half (/ span 2.0))
              (setq tk (/ *st-TKER* 100.0) tg (/ *st-TTEG* 100.0)
                    tth (/ *st-TTH* 100.0) tp (/ *st-TPET* 100.0))
              (setq lab-h (* span 0.02))
              (setq heel1 (list sx sy 0.0))
              (setq heel2 (list (+ sx span) sy 0.0))
              (setq apex (list (+ sx half) (+ sy (* half (/ (sin th) (cos th)))) 0.0))
              ;; ελκυστήρας
              (st-pline (list heel1 heel2
                (list (car heel2) (- sy (/ *st-HEL* 100.0)) 0.0)
                (list (car heel1) (- sy (/ *st-HEL* 100.0)) 0.0)) "STEGH-SEC" T)
              ;; αμείβοντες
              (setq zz (/ *st-HAM* 100.0))
              (st-pline (list heel1 apex
                (list (- (car apex) (* zz (sin th))) (+ (cadr apex) (* zz (cos th))) 0.0)
                (list (- (car heel1) (* zz (sin th))) (+ (cadr heel1) (* zz (cos th))) 0.0))
                "STEGH-SEC" T)
              (st-pline (list heel2 apex
                (list (+ (car apex) (* zz (sin th))) (+ (cadr apex) (* zz (cos th))) 0.0)
                (list (+ (car heel2) (* zz (sin th))) (+ (cadr heel2) (* zz (cos th))) 0.0))
                "STEGH-SEC" T)
              ;; ζευκτό
              (if (= *st-TRUSS* "1")
                (progn
                  (st-line (list (car apex) sy 0.0) apex "STEGH-SEC")
                  (setq yy (+ sy (* (- (cadr apex) sy) 0.33)))
                  (st-line (list (car apex) yy 0.0)
                    (list (+ sx (* span 0.27)) (+ sy (* span 0.27 (/ (sin th) (cos th)))) 0.0)
                    "STEGH-SEC")
                  (st-line (list (car apex) yy 0.0)
                    (list (+ sx (* span 0.73)) (+ sy (* (- span (* span 0.73)) (/ (sin th) (cos th)))) 0.0)
                    "STEGH-SEC")))
              ;; στρώσεις
              (if (= *st-SEC* "1")
                (progn
                  (setq dteg *st-DZ*)
                  (setq nteg (fix (/ (/ half (cos th)) dteg)))
                  (setq j 0)
                  (while (<= j nteg)
                    (setq xx (+ sx (* j dteg (cos th)) (- (* zz (sin th)))))
                    (setq yy (+ sy (* j dteg (sin th)) (* zz (cos th))))
                    (st-pline (list
                      (list xx yy 0.0)
                      (list (+ xx (* tg (cos th))) (+ yy (* tg (sin th))) 0.0)
                      (list (+ xx (* tg (cos th)) (- (* tg (sin th)))) (+ yy (* tg (sin th)) (* tg (cos th))) 0.0)
                      (list (- xx (* tg (sin th))) (+ yy (* tg (cos th))) 0.0)) "STEGH-SEC" T)
                    (setq j (1+ j)))
                  (setq off (+ zz tg))
                  (foreach dd (list 0.0 tp 0.005 tth)
                    (setq off (+ off dd))
                    (st-line
                      (list (- (car heel1) (* off (sin th))) (+ (cadr heel1) (* off (cos th))) 0.0)
                      (list (- (car apex) (* off (sin th))) (+ (cadr apex) (* off (cos th))) 0.0)
                      "STEGH-SEC"))
                  ;; κεραμίδια σκαλωτά
                  (setq off (+ off tk))
                  (setq j 0)
                  (while (< (* j 0.35) (/ half (cos th)))
                    (setq xx (+ sx (* j 0.35 (cos th)) (- (* off (sin th)))))
                    (setq yy (+ sy (* j 0.35 (sin th)) (* off (cos th))))
                    (st-line (list xx yy 0.0)
                      (list (+ xx (* 0.35 (cos th))) (+ yy (* 0.35 (sin th))) 0.0) "STEGH-SKL")
                    (st-line (list xx yy 0.0)
                      (list (+ xx (* tk 0.6 (sin th))) (- yy (* tk 0.6 (cos th))) 0.0) "STEGH-SKL")
                    (setq j (1+ j)))
                  ;; ετικέτες
                  (setq lab-x (- sx (* span 0.42)) lab-y (+ sy (* span 0.05)))
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
                    (strcat "6. ΑΜΕΙΒΟΝΤΕΣ 8x" (rtos *st-HAM* 2 0) " cm") "STEGH-TXT")
                  (st-txt (list lab-x (+ lab-y (* lab-h 1.0)) 0.0) lab-h
                    (strcat "7. ΕΛΚΥΣΤΗΡΑΣ 8x" (rtos *st-HEL* 2 0) " cm") "STEGH-TXT")))
            ))))))

  (princ "\nSTEGH v2.0 — Ολοκληρώθηκε. Layers: STEGH-SKL (επίλυση) / STEGH-SEC / STEGH-TXT")
  (princ))

(princ "\nSTEGH v2.0 φορτώθηκε. Εντολή: STEGH")
(princ)
