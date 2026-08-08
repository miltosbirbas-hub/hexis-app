;;; STEGH.LSP v8.3 — ΠΡΑΓΜΑΤΙΚΟΣ STRAIGHT SKELETON (wavefront propagation)
;;; Edge events + Split events -> μαχιές, ντερέδες, κορφιάδες, υψόμετρα κόμβων.
;;; Εντολές:  STEGH (κάτοψη στέγης)  ·  STEGHTOMI (τομή στρώσεων)
;;; HEXIS Platform — BRB DEVELOPMENT MON. I.K.E.
;;; ΠΡΟΣΟΧΗ: αρχείο σε Windows-1253. ΜΗΝ το μετατρέψεις σε UTF-8.

(setq *st-STEP* "0 - \U+03B1\U+03C6\U+03CC\U+03C1\U+03C4\U+03B9\U+03C3\U+03C4\U+03BF")
(setq *st-BASE* 0.00 *st-TOMI* "0")
(setq *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50 *st-TYP* "ISO"
      *st-LAB* "1" *st-GEI* "1")

;; ΠΕΔΙΑ ΚΟΡΥΦΗΣ : 0 px  1 py  2 t  3 ea  4 eb  5 prv  6 nxt  7 act  8 bx  9 by  10 rfx
;; ΠΕΔΙΑ ΑΚΜΗΣ   : 0 px  1 py  2 qx  3 qy  4 dx  5 dy  6 nx  7 ny  8 c

;; ===================== ΒΟΗΘΗΤΙΚΑ ΛΙΣΤΑΣ =====================
(defun st-put (lst i val / out k x)
  (setq out (list) k 0)
  (foreach x lst (setq out (cons (if (= k i) val x) out)) (setq k (1+ k)))
  (reverse out))

(defun st-vf (i f) (nth f (nth i *SK-V*)))
(defun st-vs (i f v)
  (setq *SK-V* (st-put *SK-V* i (st-put (nth i *SK-V*) f v))))
(defun st-ef (i f) (nth f (nth i *SK-E*)))

;; ===================== ΓΕΩΜΕΤΡΙΑ =====================
(defun st-mkedge (p q / dx dy LL nx ny)
  (setq dx (- (car q) (car p)) dy (- (cadr q) (cadr p)))
  (setq LL (sqrt (+ (* dx dx) (* dy dy))))
  (if (< LL 1e-12) (setq LL 1.0))
  (setq dx (/ dx LL) dy (/ dy LL))
  (setq nx (- 0.0 dy) ny dx)
  (list (car p) (cadr p) (car q) (cadr q) dx dy nx ny
        (+ (* nx (car p)) (* ny (cadr p)))))

(defun st-bisect (ea eb / n1x n1y n2x n2y det)
  (setq n1x (nth 6 ea) n1y (nth 7 ea) n2x (nth 6 eb) n2y (nth 7 eb))
  (setq det (- (* n1x n2y) (* n1y n2x)))
  (if (< (abs det) 1e-12) (list n1x n1y)
    (list (/ (- n2y n1y) det) (/ (- n1x n2x) det))))

(defun st-reflexp (ea eb)
  (< (- (* (nth 4 ea) (nth 5 eb)) (* (nth 5 ea) (nth 4 eb))) -1e-12))

(defun st-vpos (i tt / dt)
  (setq dt (- tt (st-vf i 2)))
  (list (+ (st-vf i 0) (* (st-vf i 8) dt))
        (+ (st-vf i 1) (* (st-vf i 9) dt))))

(defun st-area2 (pts / n i p q a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  a)

;; ===================== ΚΑΤΑΣΚΕΥΗ ΔΟΜΗΣ =====================
(defun st-build (pts / n i ea eb b)
  (setq n (length pts) *SK-E* (list) *SK-V* (list) i 0)
  (while (< i n)
    (setq *SK-E* (append *SK-E*
      (list (st-mkedge (nth i pts) (nth (rem (1+ i) n) pts)))))
    (setq i (1+ i)))
  (setq i 0)
  (while (< i n)
    (setq ea (rem (+ i (1- n)) n) eb i)
    (setq b (st-bisect (nth ea *SK-E*) (nth eb *SK-E*)))
    (setq *SK-V* (append *SK-V* (list
      (list (car (nth i pts)) (cadr (nth i pts)) 0.0 ea eb
            (rem (+ i (1- n)) n) (rem (1+ i) n) 1 (car b) (cadr b)
            (if (st-reflexp (nth ea *SK-E*) (nth eb *SK-E*)) 1 0)))))
    (setq i (1+ i)))
  n)

(defun st-newv (P tt ea eb / b)
  (setq b (st-bisect (nth ea *SK-E*) (nth eb *SK-E*)))
  (setq *SK-V* (append *SK-V* (list
    (list (car P) (cadr P) tt ea eb -1 -1 1 (car b) (cadr b)
          (if (st-reflexp (nth ea *SK-E*) (nth eb *SK-E*)) 1 0)))))
  (1- (length *SK-V*)))

;; ===================== ΓΕΓΟΝΟΤΑ =====================
(defun st-evedge (ia ib / va vb ax ay bx by ddx ddy den tt px py qx qy tmx)
  (setq va (nth ia *SK-V*) vb (nth ib *SK-V*))
  (setq ax (- (nth 0 va) (* (nth 8 va) (nth 2 va)))
        ay (- (nth 1 va) (* (nth 9 va) (nth 2 va)))
        bx (- (nth 0 vb) (* (nth 8 vb) (nth 2 vb)))
        by (- (nth 1 vb) (* (nth 9 vb) (nth 2 vb))))
  (setq ddx (- (nth 8 va) (nth 8 vb)) ddy (- (nth 9 va) (nth 9 vb)))
  (setq den (+ (* ddx ddx) (* ddy ddy)))
  (if (< den 1e-16) nil
    (progn
      (setq tt (/ (+ (* (- bx ax) ddx) (* (- by ay) ddy)) den))
      (setq px (+ ax (* (nth 8 va) tt)) py (+ ay (* (nth 9 va) tt)))
      (setq qx (+ bx (* (nth 8 vb) tt)) qy (+ by (* (nth 9 vb) tt)))
      (setq tmx (max (nth 2 va) (nth 2 vb)))
      (if (or (> (distance (list px py) (list qx qy)) 1e-6)
              (< tt (- tmx 1e-9)))
        nil
        (list tt px py)))))

(defun st-evsplit (iv ie / v e den bx by tt px py ss LL enx eny)
  (setq v (nth iv *SK-V*) e (nth ie *SK-E*))
  (setq enx (nth 6 e) eny (nth 7 e))
  (setq den (- (+ (* enx (nth 8 v)) (* eny (nth 9 v))) 1.0))
  (if (< (abs den) 1e-12) nil
    (progn
      (setq bx (- (nth 0 v) (* (nth 8 v) (nth 2 v)))
            by (- (nth 1 v) (* (nth 9 v) (nth 2 v))))
      (setq tt (/ (- (nth 8 e) (+ (* enx bx) (* eny by))) den))
      (if (< tt (+ (nth 2 v) 1e-9)) nil
        (progn
          (setq px (+ bx (* (nth 8 v) tt)) py (+ by (* (nth 9 v) tt)))
          (if (< (- (+ (* enx px) (* eny py)) (nth 8 e)) -1e-6) nil
            (progn
              (setq ss (+ (* (- px (nth 0 e)) (nth 4 e))
                          (* (- py (nth 1 e)) (nth 5 e))))
              (setq LL (+ (* (- (nth 2 e) (nth 0 e)) (nth 4 e))
                          (* (- (nth 3 e) (nth 1 e)) (nth 5 e))))
              (if (or (< ss (- (- 0.0 tt) 1e-6)) (> ss (+ LL tt 1e-6)))
                nil
                (list tt px py)))))))))

(defun st-oppos (iv ie P tt / n cur guard best bestd AA BB ss LL dd go e c edx edy)
  (setq e (nth ie *SK-E*) edx (nth 4 e) edy (nth 5 e))
  (setq n (length *SK-V*) cur (nth 6 (nth iv *SK-V*)) guard 0 best nil bestd nil go 1)
  (while (and (= go 1) (>= cur 0) (< guard (+ (* 4 n) 8)))
    (setq guard (1+ guard) c (nth cur *SK-V*))
    (if (and (= (nth 7 c) 1) (= (nth 4 c) ie) (>= (nth 6 c) 0))
      (progn
        (setq AA (st-vpos cur tt) BB (st-vpos (nth 6 c) tt))
        (setq ss (+ (* (- (car P) (car AA)) edx) (* (- (cadr P) (cadr AA)) edy)))
        (setq LL (+ (* (- (car BB) (car AA)) edx) (* (- (cadr BB) (cadr AA)) edy)))
        (if (and (>= ss -1e-6) (<= ss (+ LL 1e-6)))
          (setq best cur go 0)
          (progn
            (setq dd (min (abs ss) (abs (- ss LL))))
            (if (or (null bestd) (< dd bestd)) (setq bestd dd best cur))))))
    (if (= go 1)
      (progn
        (setq cur (nth 6 c))
        (if (or (< cur 0) (= cur iv)) (setq go 0)))))
  best)

;; ===================== ΚΥΡΙΟΣ ΒΡΟΧΟΣ =====================
;; -> (list arcs nodes)   arc = (p q)   node = (p t)
(defun st-skel (pts / n it arcs nodes bt bk bia bib bP bie i j r vv nv2
                     ip inx nv io iy v1 v2 o kk maxit)
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
  (setq n (st-build pts) arcs (list) nodes (list) it 0 maxit (+ 40 (* 12 n)))
  (while (< it maxit)
    (setq it (1+ it) bt nil bk nil bia nil bib nil bP nil bie nil)
    (setq i 0 nv2 (length *SK-V*))
    (while (< i nv2)
      (setq vv (nth i *SK-V*))
      (if (= (nth 7 vv) 1)
        (progn
          (setq j (nth 6 vv))
          (if (and (>= j 0) (/= j i) (= (nth 7 (nth j *SK-V*)) 1))
            (progn
              (setq r (st-evedge i j))
              (if (and r (or (null bt) (< (car r) (- bt 1e-9))))
                (setq bt (car r) bk "E" bia i bib j
                      bP (list (cadr r) (caddr r)) bie nil))))))
      (setq i (1+ i)))
    (setq i 0 nv2 (length *SK-V*))
    (while (< i nv2)
      (setq vv (nth i *SK-V*))
      (if (and (= (nth 7 vv) 1) (= (nth 10 vv) 1))
        (progn
          (setq kk 0)
          (while (< kk (length *SK-E*))
            (if (and (/= kk (nth 3 vv)) (/= kk (nth 4 vv)))
              (progn
                (setq r (st-evsplit i kk))
                (if (and r (or (null bt) (< (car r) (- bt 1e-9))))
                  (if (st-oppos i kk (list (cadr r) (caddr r)) (car r))
                    (setq bt (car r) bk "S" bia i bib nil
                          bP (list (cadr r) (caddr r)) bie kk)))))
            (setq kk (1+ kk)))))
      (setq i (1+ i)))
    (if (null bt)
      (setq it maxit)
      (if (= bk "E")
        (progn
          (setq arcs (append arcs
            (list (list (list (st-vf bia 0) (st-vf bia 1)) bP)
                  (list (list (st-vf bib 0) (st-vf bib 1)) bP))))
          (setq nodes (append nodes (list (list bP bt))))
          (setq ip (st-vf bia 5) inx (st-vf bib 6))
          (st-vs bia 7 0)
          (st-vs bib 7 0)
          (if (and (/= ip bib) (/= inx bia))
            (progn
              (setq nv (st-newv bP bt (st-vf bia 3) (st-vf bib 4)))
              (st-vs nv 5 ip)
              (st-vs nv 6 inx)
              (st-vs ip 6 nv)
              (st-vs inx 5 nv)
              (if (= (st-vf nv 5) (st-vf nv 6))
                (progn
                  (setq o (st-vf nv 5))
                  (setq arcs (append arcs
                    (list (list bP (list (st-vf o 0) (st-vf o 1))))))
                  (st-vs nv 7 0)
                  (st-vs o 7 0))))))
        (progn
          (setq io (st-oppos bia bie bP bt))
          (if io
            (progn
              (setq arcs (append arcs
                (list (list (list (st-vf bia 0) (st-vf bia 1)) bP))))
              (setq nodes (append nodes (list (list bP bt))))
              (setq iy (st-vf io 6) ip (st-vf bia 5) inx (st-vf bia 6))
              (st-vs bia 7 0)
              (setq v1 (st-newv bP bt (st-vf bia 3) bie))
              (setq v2 (st-newv bP bt bie (st-vf bia 4)))
              (st-vs v1 5 ip)
              (st-vs v1 6 iy)
              (st-vs ip 6 v1)
              (st-vs iy 5 v1)
              (st-vs v2 5 io)
              (st-vs v2 6 inx)
              (st-vs io 6 v2)
              (st-vs inx 5 v2)
              (foreach nv (list v1 v2)
                (if (and (= (st-vf nv 5) (st-vf nv 6)) (>= (st-vf nv 5) 0))
                  (progn
                    (setq o (st-vf nv 5))
                    (setq arcs (append arcs
                      (list (list (list (st-vf nv 0) (st-vf nv 1))
                                  (list (st-vf o 0) (st-vf o 1))))))
                    (st-vs nv 7 0)
                    (st-vs o 7 0))))))))))
  (list arcs nodes))

;; ===================== ΚΑΘΑΡΙΣΜΑ ΤΟΞΩΝ =====================
(defun st-arcclean (arcs / out dup a u)
  (setq out (list))
  (foreach a arcs
    (if (> (distance (car a) (cadr a)) 1e-6)
      (progn
        (setq dup nil)
        (foreach u out
          (if (or (and (< (distance (car a) (car u)) 1e-6)
                       (< (distance (cadr a) (cadr u)) 1e-6))
                  (and (< (distance (car a) (cadr u)) 1e-6)
                       (< (distance (cadr a) (car u)) 1e-6)))
            (setq dup T)))
        (if (null dup) (setq out (append out (list a)))))))
  out)

;; ===================== CAD =====================
(defun st-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun st-line (p1 p2 lyr)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbLine")
                 (cons 10 (list (car p1) (cadr p1) 0.0))
                 (cons 11 (list (car p2) (cadr p2) 0.0)))))

(defun st-pline (pts lyr / el p)
  (setq el (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbPolyline") (cons 90 (length pts)) (cons 70 1)))
  (foreach p pts (setq el (append el (list (cons 10 (list (car p) (cadr p)))))))
  (entmake el))

(defun st-txt (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbText")
                 (cons 10 (list (car p) (cadr p) 0.0)) (cons 40 h)
                 (cons 1 str) (cons 72 1) (cons 73 2)
                 (cons 11 (list (car p) (cadr p) 0.0)))))

(defun st-getpts (ent / ed pts pr cl p)
  (setq ed (entget ent) pts (list))
  (foreach pr ed
    (if (= (car pr) 10)
      (setq pts (append pts (list (list (cadr pr) (caddr pr)))))))
  (setq cl (list))
  (foreach p pts
    (if (or (null cl) (> (distance p (last cl)) 1e-6))
      (setq cl (append cl (list p)))))
  (if (and (> (length cl) 1) (< (distance (car cl) (last cl)) 1e-6))
    (setq cl (reverse (cdr (reverse cl)))))
  cl)

;; αφαίρεση συνευθειακών κορυφών
(defun st-clean (pts / n i a c b cr la lb res)
  (setq n (length pts) res (list) i 0)
  (while (< i n)
    (setq a (nth (rem (+ i (1- n)) n) pts) c (nth i pts) b (nth (rem (1+ i) n) pts))
    (setq cr (- (* (- (car c) (car a)) (- (cadr b) (cadr c)))
                (* (- (cadr c) (cadr a)) (- (car b) (car c)))))
    (setq la (distance a c) lb (distance c b))
    (if (and (> la 1e-9) (> lb 1e-9) (> (/ (abs cr) (* la lb)) 1e-6))
      (setq res (append res (list c))))
    (setq i (1+ i)))
  (if (>= (length res) 3) res pts))

(defun st-slope ( )
  (if (= *st-PMODE* "PCT") (/ *st-PIT* 100.0)
    (/ (sin (* *st-PIT* (/ pi 180.0))) (cos (* *st-PIT* (/ pi 180.0))))))

;; πολύγωνο γείσου: κάθε κορυφή -> P - ovh*διχοτόμος
;; σωστό ΚΑΙ σε ανακλαστικές γωνίες — ΔΕΝ χρειάζεται FILLET
(defun st-geiso (pts ovh / n i out v)
  (setq n (st-build pts) out (list) i 0)
  (while (< i n)
    (setq v (nth i *SK-V*))
    (setq out (append out (list
      (list (- (nth 0 v) (* (nth 8 v) ovh))
            (- (nth 1 v) (* (nth 9 v) ovh))))))
    (setq i (1+ i)))
  out)

;; index της κορυφής p μέσα στο pts, αλλιώς nil
(defun st-vidx (p pts / i n r)
  (setq n (length pts) i 0 r nil)
  (while (< i n)
    (if (< (distance p (nth i pts)) 1e-6) (setq r i))
    (setq i (1+ i)))
  r)

(defun st-isrfx (pts i / n a c b)
  (setq n (length pts))
  (setq a (nth (rem (+ i (1- n)) n) pts) c (nth i pts) b (nth (rem (1+ i) n) pts))
  (< (- (* (- (car c) (car a)) (- (cadr b) (cadr c)))
        (* (- (cadr c) (cadr a)) (- (car b) (car c)))) -1e-9))

;; μέγιστη διάσταση περιγράμματος (για ύψος κειμένου)
(defun st-span (pts / x0 x1 y0 y1 p)
  (setq x0 (car (car pts)) x1 x0 y0 (cadr (car pts)) y1 y0)
  (foreach p pts
    (if (< (car p) x0) (setq x0 (car p)))
    (if (> (car p) x1) (setq x1 (car p)))
    (if (< (cadr p) y0) (setq y0 (cadr p)))
    (if (> (cadr p) y1) (setq y1 (cadr p))))
  (max (- x1 x0) (- y1 y0)))

;; υψόμετρο = υψόμετρο βάσης + σχετικό ύψος, με πρόσημο
(defun st-elev (h / v)
  (setq v (+ *st-BASE* h))
  (strcat (if (< v -0.0005) "-" "+") (rtos (abs v) 2 2)))

;; ύψος κόμβου P από τη λίστα nodes
(defun st-hgt (P nodes th / r nd)
  (setq r nil)
  (foreach nd nodes
    (if (and (null r) (< (distance P (car nd)) 1e-4))
      (setq r (* (cadr nd) th))))
  r)

;; ===================== ΕΛΕΓΧΟΙ ΕΓΚΥΡΟΤΗΤΑΣ =====================
;; --- έλεγχος αυτοτομής περιγράμματος -> σημείο τομής ή nil ---
(defun st-selfx (pts / n i j a b c d hit r)
  (setq n (length pts) i 0 r nil)
  (while (and (< i n) (null r))
    (setq j (+ i 1))
    (while (and (< j n) (null r))
      (if (not (or (= j i) (= (rem (1+ i) n) j) (= (rem (1+ j) n) i)))
        (progn
          (setq a (nth i pts) b (nth (rem (1+ i) n) pts)
                c (nth j pts) d (nth (rem (1+ j) n) pts))
          (setq hit (st-sx a b c d))
          (if hit (setq r hit))))
      (setq j (1+ j)))
    (setq i (1+ i)))
  r)

(defun st-sx (p1 p2 p3 p4 / d1x d1y d2x d2y det dx dy tt ss)
  (setq d1x (- (car p2) (car p1)) d1y (- (cadr p2) (cadr p1))
        d2x (- (car p4) (car p3)) d2y (- (cadr p4) (cadr p3)))
  (setq det (- (* d1x d2y) (* d1y d2x)))
  (if (< (abs det) 1e-12) nil
    (progn
      (setq dx (- (car p3) (car p1)) dy (- (cadr p3) (cadr p1)))
      (setq tt (/ (- (* dx d2y) (* dy d2x)) det))
      (setq ss (/ (- (* dx d1y) (* dy d1x)) det))
      (if (and (> tt 1e-9) (< tt (- 1.0 1e-9))
               (> ss 1e-9) (< ss (- 1.0 1e-9)))
        (list (+ (car p1) (* tt d1x)) (+ (cadr p1) (* tt d1y)))
        nil))))

;; --- αυτοέλεγχος αποτελέσματος: κορυφές χωρίς ΑΚΡΙΒΩΣ μία μαχιά ---
(defun st-badv (pts arcs / n i p c out)
  (setq n (length pts) i 0 out (list))
  (while (< i n)
    (setq p (nth i pts) c 0)
    (foreach a arcs
      (if (or (< (distance p (car a)) 1e-6) (< (distance p (cadr a)) 1e-6))
        (setq c (1+ c))))
    (if (/= c 1) (setq out (append out (list (list i c)))))
    (setq i (1+ i)))
  out)

;; --- συνεκτικότητα γράφου τόξων ---
(defun st-conn (arcs / pts seen stack k found n a p q)
  (if (null arcs) 0
    (progn
      (setq pts (list))
      (foreach a arcs
        (foreach p (list (car a) (cadr a))
          (setq found nil)
          (foreach q pts (if (< (distance p q) 1e-6) (setq found T)))
          (if (null found) (setq pts (append pts (list p))))))
      (setq seen (list (car pts)) stack (list (car pts)))
      (while stack
        (setq k (car stack) stack (cdr stack))
        (foreach a arcs
          (setq n nil)
          (if (< (distance k (car a)) 1e-6) (setq n (cadr a)))
          (if (< (distance k (cadr a)) 1e-6) (setq n (car a)))
          (if n
            (progn
              (setq found nil)
              (foreach q seen (if (< (distance n q) 1e-6) (setq found T)))
              (if (null found)
                (setq seen (append seen (list n)) stack (cons n stack)))))))
      (list (length seen) (length pts)))))

;; ===================== DCL =====================
(defun st-dcl ( / f path tp)
  (setq tp (getvar "TEMPPREFIX"))
  (if (or (null tp) (not (= (type tp) (quote STR)))) (setq tp ""))
  (setq path (strcat tp "stegh8.dcl"))
  (setq f (open path "w"))
  (if (null f) (setq path nil))
  (if (null f) nil (progn
  (write-line "stegh8 : dialog {" f)
  (write-line "  label = \"STEGH v8 \U+2014 \U+0395\U+03C0\U+03AF\U+03BB\U+03C5\U+03C3\U+03B7 \U+03A3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "    : column {" f)
  (write-line "      : boxed_radio_column { key = \"typ\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2\";" f)
  (write-line "        : radio_button { key = \"t_iso\"; label = \"\U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE\U+03C2 (\U+03BC\U+03B1\U+03C7\U+03B9\U+03AD\U+03C2 + \U+03BD\U+03C4\U+03B5\U+03C1\U+03AD\U+03B4\U+03B5\U+03C2)\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"t_gab\"; label = \"\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7 (\U+03BC\U+03CC\U+03BD\U+03BF \U+03BF\U+03C1\U+03B8\U+03BF\U+03B3\U+03CE\U+03BD\U+03B9\U+03BF)\"; }" f)
  (write-line "        : radio_button { key = \"t_mon\"; label = \"\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
  (write-line "      }" f)
  (write-line "      : boxed_column { label = \"\U+039A\U+03BB\U+03AF\U+03C3\U+03B7\";" f)
  (write-line "        : radio_row { key = \"pm\";" f)
  (write-line "          : radio_button { key = \"p_pct\"; label = \"%\"; value = \"1\"; }" f)
  (write-line "          : radio_button { key = \"p_deg\"; label = \"\U+039C\U+03BF\U+03AF\U+03C1\U+03B5\U+03C2\"; }" f)
  (write-line "        }" f)
  (write-line "        : edit_box { key = \"pit\"; label = \"\U+03A4\U+03B9\U+03BC\U+03AE:\"; edit_width = 8; }" f)
  (write-line "      }" f)
  (write-line "      : edit_box { key = \"ovh\"; label = \"\U+03A0\U+03C1\U+03BF\U+03B5\U+03BE\U+03BF\U+03C7\U+03AE \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\U+03C5 (m):\"; edit_width = 8; }" f)
  (write-line "      : edit_box { key = \"base\"; label = \"\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B2\U+03AC\U+03C3\U+03B7\U+03C2 (m):\"; edit_width = 8; }" f)
  (write-line "      : toggle { key = \"gei\"; label = \"\U+03A3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7 \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\U+03C5\"; value = \"1\"; }" f)
  (write-line "      : toggle { key = \"lab\"; label = \"\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 \U+03BA\U+03CC\U+03BC\U+03B2\U+03C9\U+03BD\"; value = \"1\"; }" f)
  (write-line "      : toggle { key = \"tomi\"; label = \"\U+039A\U+03B1\U+03B9 \U+03BB\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03AD\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2 (STEGHTOMI)\"; }" f)
  (write-line "    }" f)
  (write-line "    : column {" f)
  (write-line "      : image { key = \"prev\"; width = 30; aspect_ratio = 0.62; color = 0; }" f)
  (write-line "      : text { key = \"i1\"; width = 34; }" f)
  (write-line "      : text { key = \"i2\"; width = 34; }" f)
  (write-line "    }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)
  path)))

(defun st-prev ( / w h x0 x1 y0 y1 xm ym q deg)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev") (fill_image 0 0 w h 0)
  (setq x0 (fix (* w 0.10)) x1 (fix (* w 0.90))
        y0 (fix (* h 0.20)) y1 (fix (* h 0.80)))
  (setq xm (fix (/ (+ x0 x1) 2)) ym (fix (/ (+ y0 y1) 2)))
  (setq q (fix (/ (- y1 y0) 2)))
  (vector_image x0 y0 x1 y0 7) (vector_image x1 y0 x1 y1 7)
  (vector_image x1 y1 x0 y1 7) (vector_image x0 y1 x0 y0 7)
  (cond
    ((= *st-TYP* "ISO")
      (vector_image x0 y0 (+ x0 q) ym 1) (vector_image x0 y1 (+ x0 q) ym 1)
      (vector_image x1 y0 (- x1 q) ym 1) (vector_image x1 y1 (- x1 q) ym 1)
      (vector_image (+ x0 q) ym (- x1 q) ym 2))
    ((= *st-TYP* "GAB")
      (vector_image x0 ym x1 ym 2))
    (T
      (vector_image x0 (+ y0 3) x1 (+ y0 3) 4)
      (vector_image x0 y1 x1 y1 2)))
  (setq deg (if (= *st-PMODE* "PCT")
              (strcat (rtos (/ (atan (/ *st-PIT* 100.0)) (/ pi 180.0)) 2 1) "\U+00B0")
              (strcat (rtos *st-PIT* 2 1) "%")))
  (set_tile "i1" (strcat "\U+039A\U+03BB\U+03AF\U+03C3\U+03B7 " (rtos *st-PIT* 2 1)
    (if (= *st-PMODE* "PCT") "%" "\U+00B0") "  (= " deg ")"))
  (set_tile "i2" (strcat "\U+0393\U+03B5\U+03AF\U+03C3\U+03BF " (rtos *st-OVH* 2 2) " m  \U+00B7  \U+03B2\U+03AC\U+03C3\U+03B7 "
    (st-elev 0.0) " m"))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (setq *st-BASE* (atof (get_tile "base")))
  (st-prev))

;; ===================== ΕΝΤΟΛΗ STEGH =====================
(defun C:STEGH ( / *error* ent pts orig n dclpath dclid status
                   th ovh res arcs nodes lab gpts hmax i j
                   a b ia ib lyr txh hh cnt1 cnt2 cnt3
                   lowp bi bd pm dd pa pb eang p0 nds sumA nd p
                   xchk badv conn bv usedcl kw v pa2 pb2)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (progn
        (princ (strcat "\n*** \U+03A3\U+03A6\U+0391\U+039B\U+039C\U+0391 STEGH v8.3 ***"))
        (princ (strcat "\n    \U+039C\U+03AE\U+03BD\U+03C5\U+03BC\U+03B1: " msg))
        (princ (strcat "\n    \U+0392\U+0397\U+039C\U+0391 \U+03A0\U+039F\U+03A5 \U+0391\U+03A0\U+0395\U+03A4\U+03A5\U+03A7\U+0395: " *st-STEP*))
        (princ "\n    \U+03A3\U+03C4\U+03B5\U+03B9\U+03BB\U+03B5 \U+03BC\U+03BF\U+03C5 \U+03B1\U+03C5\U+03C4\U+03B7 \U+03C4\U+03B7 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B7.\n")))
    (princ))

  (setq *st-STEP* "1 - \U+03B4\U+03B7\U+03BC\U+03B9\U+03BF\U+03C5\U+03C1\U+03B3\U+03B9\U+03B1 layers")
  (st-layer "STEGH-PERIGR" 8)
  (st-layer "STEGH-MAXIA"  1)
  (st-layer "STEGH-NTERES" 4)
  (st-layer "STEGH-KORFIAS" 2)
  (st-layer "STEGH-GEISO"  3)
  (st-layer "STEGH-TXT"    6)

  (setq *st-STEP* "2 - \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03B7 polyline (entsel)")
  (princ "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+039A\U+039B\U+0395\U+0399\U+03A3\U+03A4\U+0397 polyline \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2:")
  (setq ent (entsel))
  (if (null ent) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq *st-STEP* "3 - \U+03B1\U+03BD\U+03B1\U+03B3\U+03BD\U+03C9\U+03C3\U+03B7 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03C9\U+03BD (st-getpts)")
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3)
    (progn (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 \U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD 3 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2.") (exit)))
  (setq *st-STEP* "4 - \U+03BA\U+03B1\U+03B8\U+03B1\U+03C1\U+03B9\U+03C3\U+03BC\U+03BF\U+03C2 \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 (st-clean)")
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
  (setq orig (st-clean pts) n (length orig))

  ;; --- ΕΛΕΓΧΟΣ 1: αυτοτέμνεται το περίγραμμα; ---
  (setq *st-STEP* (strcat "5 - \U+03B5\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 \U+03B1\U+03C5\U+03C4\U+03BF\U+03C4\U+03BF\U+03BC\U+03B7\U+03C2, " (itoa n) " \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03B5\U+03C2"))
  (setq xchk (st-selfx orig))
  (if xchk
    (progn
      (st-layer "STEGH-TXT" 6)
      (st-txt (list (car xchk) (cadr xchk)) (/ (st-span orig) 40.0) "X" "STEGH-TXT")
      (princ (strcat "\n*** \U+03A3\U+03A6\U+0391\U+039B\U+039C\U+0391: \U+03C4\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+0391\U+03A5\U+03A4\U+039F\U+03A4\U+0395\U+039C\U+039D\U+0395\U+03A4\U+0391\U+0399 \U+03C3\U+03C4\U+03BF ("
        (rtos (car xchk) 2 3) ", " (rtos (cadr xchk) 2 3) ")"
        "\n    \U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BC\U+03B5 X. \U+0394\U+03B9\U+03CC\U+03C1\U+03B8\U+03C9\U+03C3\U+03B5 \U+03C4\U+03B7\U+03BD polyline \U+03BA\U+03B1\U+03B9 \U+03BE\U+03B1\U+03BD\U+03B1\U+03C4\U+03C1\U+03AD\U+03BE\U+03B5.\n"))
      (exit)))

  (setq *st-STEP* "6 - \U+03B3\U+03C1\U+03B1\U+03C8\U+03B9\U+03BC\U+03BF \U+03B1\U+03C1\U+03C7\U+03B5\U+03B9\U+03BF\U+03C5 DCL")
  (setq dclpath (st-dcl))
  (setq usedcl 0)
  (if dclpath
    (progn
      (setq *st-STEP* "7 - load_dialog")
      (setq dclid (load_dialog dclpath))
      (if (and dclid (= (type dclid) (quote INT)) (> dclid 0))
        (progn
          (setq *st-STEP* "8 - new_dialog")
          (if (new_dialog "stegh8" dclid)
            (setq usedcl 1)
            (progn (unload_dialog dclid) (setq usedcl 0)))))))

  (if (= usedcl 1)
    (progn
      (setq *st-STEP* "9a - \U+03B1\U+03C1\U+03C7\U+03B9\U+03BA\U+03BF\U+03C0\U+03BF\U+03B9\U+03B7\U+03C3\U+03B7 \U+03C0\U+03B1\U+03C1\U+03B1\U+03B8\U+03C5\U+03C1\U+03BF\U+03C5")
      (set_tile "pit" (rtos *st-PIT* 2 1))
      (set_tile "ovh" (rtos *st-OVH* 2 2))
      (set_tile "base" (rtos *st-BASE* 2 2))
      (set_tile (cond ((= *st-TYP* "GAB") "t_gab") ((= *st-TYP* "MON") "t_mon") (T "t_iso")) "1")
      (set_tile (if (= *st-PMODE* "DEG") "p_deg" "p_pct") "1")
      (st-prev)
      (action_tile "t_iso" "(setq *st-TYP* \"ISO\") (st-prev)")
      (action_tile "t_gab" "(setq *st-TYP* \"GAB\") (st-prev)")
      (action_tile "t_mon" "(setq *st-TYP* \"MON\") (st-prev)")
      (action_tile "p_pct" "(setq *st-PMODE* \"PCT\") (st-upd)")
      (action_tile "p_deg" "(setq *st-PMODE* \"DEG\") (st-upd)")
      (action_tile "pit"   "(st-upd)")
      (action_tile "ovh"   "(st-upd)")
      (action_tile "base"  "(st-upd)")
      (action_tile "accept"
        "(st-upd) (setq *st-GEI* (get_tile \"gei\")) (setq *st-LAB* (get_tile \"lab\")) (setq *st-TOMI* (get_tile \"tomi\")) (done_dialog 1)")
      (action_tile "cancel" "(done_dialog 0)")
      (setq *st-STEP* "9b - \U+03B1\U+03BD\U+03BF\U+03B9\U+03C7\U+03C4\U+03BF \U+03C0\U+03B1\U+03C1\U+03B1\U+03B8\U+03C5\U+03C1\U+03BF")
      (setq status (start_dialog))
      (unload_dialog dclid))

    ;; ---------- ΕΦΕΔΡΙΚΗ ΛΕΙΤΟΥΡΓΙΑ: ΓΡΑΜΜΗ ΕΝΤΟΛΩΝ ----------
    (progn
      (setq *st-STEP* "9c - \U+03B5\U+03C6\U+03B5\U+03B4\U+03C1\U+03B9\U+03BA\U+03B5\U+03C2 \U+03B5\U+03C1\U+03C9\U+03C4\U+03B7\U+03C3\U+03B5\U+03B9\U+03C2 (\U+03C7\U+03C9\U+03C1\U+03B9\U+03C2 DCL)")
      (princ "\n>>> \U+03A4\U+03BF \U+03C0\U+03B1\U+03C1\U+03B1\U+03B8\U+03C5\U+03C1\U+03BF DCL \U+03B4\U+03B5\U+03BD \U+03C6\U+03BF\U+03C1\U+03C4\U+03C9\U+03C3\U+03B5 \U+2014 \U+03C3\U+03C5\U+03BD\U+03B5\U+03C7\U+03B9\U+03B6\U+03C9 \U+03BC\U+03B5 \U+03B5\U+03C1\U+03C9\U+03C4\U+03B7\U+03C3\U+03B5\U+03B9\U+03C2.")
      (initget "Isoklinis Dirrichti Monorrichti")
      (setq kw (getkword "\n\U+03A4\U+03C5\U+03C0\U+03BF\U+03C2 [Isoklinis/Dirrichti/Monorrichti] <Isoklinis>: "))
      (setq *st-TYP* (cond ((= kw "Dirrichti") "GAB") ((= kw "Monorrichti") "MON") (T "ISO")))
      (initget "Pososto Moires")
      (setq kw (getkword "\n\U+039C\U+03BF\U+03BD\U+03B1\U+03B4\U+03B1 \U+03BA\U+03BB\U+03B9\U+03C3\U+03B7\U+03C2 [Pososto/Moires] <Pososto>: "))
      (setq *st-PMODE* (if (= kw "Moires") "DEG" "PCT"))
      (setq v (getreal (strcat "\n\U+039A\U+03BB\U+03B9\U+03C3\U+03B7 <" (rtos *st-PIT* 2 1) ">: ")))
      (if (and v (> v 0.0)) (setq *st-PIT* v))
      (setq v (getreal (strcat "\n\U+03A0\U+03C1\U+03BF\U+03B5\U+03BE\U+03BF\U+03C7\U+03B7 \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF\U+03C5 \U+03C3\U+03B5 m <" (rtos *st-OVH* 2 2) ">: ")))
      (if (and v (>= v 0.0)) (setq *st-OVH* v))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+03A3\U+03C7\U+03B5\U+03B4\U+03B9\U+03B1\U+03C3\U+03B7 \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF\U+03C5 [Nai/Ochi] <Nai>: "))
      (setq *st-GEI* (if (= kw "Ochi") "0" "1"))
      (setq v (getreal (strcat "\n\U+03A5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B2\U+03B1\U+03C3\U+03B7\U+03C2 \U+03C3\U+03C4\U+03B5\U+03B3\U+03B7\U+03C2 \U+03C3\U+03B5 m <" (rtos *st-BASE* 2 2) ">: ")))
      (if v (setq *st-BASE* v))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+03A5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 \U+03BA\U+03BF\U+03BC\U+03B2\U+03C9\U+03BD [Nai/Ochi] <Nai>: "))
      (setq *st-LAB* (if (= kw "Ochi") "0" "1"))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+039D\U+03B1 \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03B1\U+03C3\U+03C4\U+03B5\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03BB\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03B5\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03B7\U+03C2 [Nai/Ochi] <Ochi>: "))
      (setq *st-TOMI* (if (= kw "Nai") "1" "0"))
      (setq status 1)))

  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))

  (setq *st-STEP* "10 - \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03BF\U+03C2 \U+03BA\U+03BB\U+03B9\U+03C3\U+03B7\U+03C2")
  (setq th (st-slope) ovh *st-OVH*)
  (setq txh (/ (st-span orig) 55.0))
  (if (< txh 0.05) (setq txh 0.05))
  (setq arcs (list) nodes (list))

  (cond
    ;; ---------- ΙΣΟΚΛΙΝΗΣ (straight skeleton) ----------
    ((= *st-TYP* "ISO")
      (setq *st-STEP* "11 - \U+0395\U+03A0\U+0399\U+039B\U+03A5\U+03A3\U+0397 \U+03A3\U+03A4\U+0395\U+0393\U+0397\U+03A3 (st-skel)")
      (setq res (st-skel orig))
      (setq arcs (st-arcclean (car res)) nodes (cadr res)))

    ;; ---------- ΔΙΡΡΙΧΤΗ ----------
    ((= *st-TYP* "GAB")
      (if (/= n 4)
        (progn (princ "\n\U+0397 \U+03B4\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7 \U+03B1\U+03C0\U+03B1\U+03B9\U+03C4\U+03B5\U+03AF \U+03BF\U+03C1\U+03B8\U+03BF\U+03B3\U+03CE\U+03BD\U+03B9\U+03BF (4 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2). \U+03A7\U+03C1\U+03B7\U+03C3\U+03B9\U+03BC\U+03BF\U+03C0\U+03BF\U+03AF\U+03B7\U+03C3\U+03B5 \U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE.") (exit))
        (progn
          (setq pa (st-mid2 (nth 0 orig) (nth 1 orig))
                pb (st-mid2 (nth 2 orig) (nth 3 orig)))
          (if (< (distance (nth 0 orig) (nth 1 orig))
                 (distance (nth 1 orig) (nth 2 orig)))
            (setq pa (st-mid2 (nth 0 orig) (nth 1 orig))
                  pb (st-mid2 (nth 2 orig) (nth 3 orig)))
            (setq pa (st-mid2 (nth 3 orig) (nth 0 orig))
                  pb (st-mid2 (nth 1 orig) (nth 2 orig))))
          (setq hh (* th (/ (min (distance (nth 0 orig) (nth 1 orig))
                                 (distance (nth 1 orig) (nth 2 orig))) 2.0)))
          (setq arcs (list (list pa pb)))
          (setq nodes (list (list pa (/ hh th)) (list pb (/ hh th)))))))

    ;; ---------- ΜΟΝΟΡΡΙΧΤΗ ----------
    (T
      (setq lowp (getpoint "\n\U+0394\U+03B5\U+03AF\U+03BE\U+03B5 \U+03C0\U+03C1\U+03BF\U+03C2 \U+03C4\U+03B7 \U+03A7\U+0391\U+039C\U+0397\U+039B\U+0397 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC (\U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03AE): "))
      (if (null lowp) (setq lowp (nth 0 orig)))
      (setq bi 0 bd nil i 0)
      (while (< i n)
        (setq pm (st-mid2 (nth i orig) (nth (rem (1+ i) n) orig)))
        (setq dd (distance (list (car lowp) (cadr lowp)) pm))
        (if (or (null bd) (< dd bd)) (setq bd dd bi i))
        (setq i (1+ i)))
      (setq pa (nth bi orig) pb (nth (rem (1+ bi) n) orig))
      (setq eang (angle pa pb) i 0 nds (list))
      (while (< i n)
        (setq p0 (nth i orig))
        (setq dd (abs (- (* (- (car p0) (car pa)) (sin eang))
                         (* (- (cadr p0) (cadr pa)) (cos eang)))))
        (if (> dd 1e-6) (setq nds (append nds (list (list p0 dd)))))
        (setq i (1+ i)))
      (setq nodes nds)
      (setq arcs (list (list pa pb)))))

  ;; --- ΕΛΕΓΧΟΣ 2: αυτοέλεγχος αποτελέσματος ---
  (if (= *st-TYP* "ISO")
    (progn
      (setq *st-STEP* "12 - \U+03B1\U+03C5\U+03C4\U+03BF\U+03B5\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C4\U+03B5\U+03BB\U+03B5\U+03C3\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2")
      (setq badv (st-badv orig arcs))
      (setq conn (st-conn arcs))
      (if (or badv (and conn (/= (car conn) (cadr conn))))
        (progn
          (princ "\n*** \U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03BF \U+03B1\U+03C5\U+03C4\U+03BF\U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 \U+03B2\U+03C1\U+03AE\U+03BA\U+03B5 \U+03C0\U+03C1\U+03CC\U+03B2\U+03BB\U+03B7\U+03BC\U+03B1 ***")
          (if badv
            (foreach bv badv
              (princ (strcat "\n    \U+039A\U+03BF\U+03C1\U+03C5\U+03C6\U+03AE " (itoa (1+ (car bv)))
                " ("  (rtos (car (nth (car bv) orig)) 2 3) ", "
                (rtos (cadr (nth (car bv) orig)) 2 3) "): "
                (itoa (cadr bv)) " \U+03BC\U+03B1\U+03C7\U+03B9\U+03AD\U+03C2 \U+03B1\U+03BD\U+03C4\U+03AF \U+03B3\U+03B9\U+03B1 1"))))
          (if (and conn (/= (car conn) (cadr conn)))
            (princ (strcat "\n    \U+0391\U+03C3\U+03CD\U+03BD\U+03B4\U+03B5\U+03C4\U+03BF\U+03C2 \U+03C3\U+03BA\U+03B5\U+03BB\U+03B5\U+03C4\U+03CC\U+03C2: " (itoa (car conn))
                           " \U+03B1\U+03C0\U+03CC " (itoa (cadr conn)) " \U+03BA\U+03CC\U+03BC\U+03B2\U+03BF\U+03C5\U+03C2")))
          (princ "\n    \U+03A0\U+03B9\U+03B8\U+03B1\U+03BD\U+03AD\U+03C2 \U+03B1\U+03B9\U+03C4\U+03AF\U+03B5\U+03C2: \U+03C3\U+03C7\U+03B5\U+03B4\U+03CC\U+03BD \U+03C3\U+03C5\U+03BD\U+03B5\U+03C5\U+03B8\U+03B5\U+03B9\U+03B1\U+03BA\U+03AD\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2, \U+03B4\U+03B9\U+03C0\U+03BB\U+03AC \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03B1,")
          (princ "\n    \U+03AE \U+03C0\U+03BF\U+03BB\U+03CD \U+03BB\U+03B5\U+03C0\U+03C4\U+03AD\U+03C2 \U+03B1\U+03C0\U+03BF\U+03BB\U+03AE\U+03BE\U+03B5\U+03B9\U+03C2. \U+03A3\U+03C4\U+03B5\U+03AF\U+03BB\U+03B5 \U+03C4\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03B3\U+03B9\U+03B1 \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF.\n")))))

  ;; ---------- ΣΧΕΔΙΑΣΗ ----------
  ;; --- πολύγωνο γείσου (υπολογίζεται ΠΡΙΝ, ώστε να επεκταθούν τα τόξα) ---
  (setq *st-STEP* "13 - \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03BF\U+03C2 \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF\U+03C5")
  (if (and (= *st-GEI* "1") (> ovh 0.001))
    (setq gpts (st-geiso orig ovh))
    (setq gpts nil))

  ;; ---------- ΣΧΕΔΙΑΣΗ ΤΟΞΩΝ ----------
  ;; Κάθε άκρο τόξου που πέφτει σε κορυφή του τοίχου μετακινείται στην
  ;; ΑΝΤΙΣΤΟΙΧΗ κορυφή του γείσου. Είναι ακριβές: η κορυφή του γείσου
  ;; βρίσκεται πάνω στην ΙΔΙΑ διχοτόμο με τη μαχιά/τον ντερέ.
  (setq *st-STEP* "14 - \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03B1\U+03C3\U+03B7 \U+03C4\U+03BF\U+03BE\U+03C9\U+03BD (\U+03BC\U+03B5 \U+03B5\U+03C0\U+03B5\U+03BA\U+03C4\U+03B1\U+03C3\U+03B7 \U+03C3\U+03C4\U+03BF \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF)")
  (setq cnt1 0 cnt2 0 cnt3 0)
  (foreach a arcs
    (setq ia (st-vidx (car a) orig) ib (st-vidx (cadr a) orig))
    (setq lyr
      (cond
        ((and ia (st-isrfx orig ia)) "STEGH-NTERES")
        ((and ib (st-isrfx orig ib)) "STEGH-NTERES")
        ((or ia ib)                  "STEGH-MAXIA")
        (T                           "STEGH-KORFIAS")))
    (cond ((= lyr "STEGH-NTERES") (setq cnt2 (1+ cnt2)))
          ((= lyr "STEGH-MAXIA")  (setq cnt1 (1+ cnt1)))
          (T                      (setq cnt3 (1+ cnt3))))
    (setq pa (if (and ia gpts) (nth ia gpts) (car a)))
    (setq pb (if (and ib gpts) (nth ib gpts) (cadr a)))
    (st-line pa pb lyr))

  (setq *st-STEP* "15 - \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 + \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF")
  (st-pline orig "STEGH-PERIGR")
  (if gpts (st-pline gpts "STEGH-GEISO"))

  (setq *st-STEP* "16 - \U+03C5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 / \U+03B5\U+03C4\U+03B9\U+03BA\U+03B5\U+03C4\U+03B5\U+03C2")
  (setq hmax 0.0)
  (foreach nd nodes
    (if (> (* (cadr nd) th) hmax) (setq hmax (* (cadr nd) th))))
  (if (= *st-LAB* "1")
    (progn
      ;; στάθμη τοίχου (πέλμα στέγης)
      (foreach p orig
        (st-txt (list (car p) (+ (cadr p) (* txh 0.7))) txh
          (st-elev 0.0) "STEGH-TXT"))
      ;; κόμβοι
      (foreach nd nodes
        (st-txt (list (car (car nd)) (+ (cadr (car nd)) (* txh 0.7))) txh
          (st-elev (* (cadr nd) th)) "STEGH-TXT"))
      ;; άκρο γείσου (υδρορροή) — χαμηλότερα κατά ovh*κλιση
      (if gpts
        (foreach p gpts
          (st-txt (list (car p) (- (cadr p) (* txh 1.6))) txh
            (st-elev (- 0.0 (* ovh th))) "STEGH-TXT")))))

  (setq *st-STEP* "17 - \U+03C4\U+03B5\U+03BB\U+03B9\U+03BA\U+03B7 \U+03B1\U+03BD\U+03B1\U+03C6\U+03BF\U+03C1\U+03B1")
  (setq sumA (/ (abs (/ (st-area2 (if (and (= *st-GEI* "1") (> ovh 0.001))
                                     (st-geiso orig ovh) orig)) 2.0))
                (cos (atan th))))
  (princ (strcat "\n--- STEGH v8.3 ---"
    "\n\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2: " (cond ((= *st-TYP* "ISO") "\U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE\U+03C2") ((= *st-TYP* "GAB") "\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7") (T "\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7"))
    "  |  \U+039A\U+03BB\U+03AF\U+03C3\U+03B7: " (rtos *st-PIT* 2 1) (if (= *st-PMODE* "PCT") "%" "\U+00B0")
    " (= " (rtos (/ (atan th) (/ pi 180.0)) 2 1) "\U+00B0)"
    "\n\U+039C\U+03B1\U+03C7\U+03B9\U+03AD\U+03C2: " (itoa cnt1) "  \U+039D\U+03C4\U+03B5\U+03C1\U+03AD\U+03B4\U+03B5\U+03C2: " (itoa cnt2) "  \U+039A\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03B4\U+03B5\U+03C2: " (itoa cnt3)
    "\n\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B2\U+03AC\U+03C3\U+03B7\U+03C2: " (st-elev 0.0) " m"
    "\n\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC: " (st-elev hmax) " m  (\U+03C3\U+03C7\U+03B5\U+03C4\U+03B9\U+03BA\U+03CC +" (rtos hmax 2 3) ")"
    (if gpts (strcat "\n\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03AE\U+03C2: " (st-elev (- 0.0 (* ovh th))) " m") "")
    "\n\U+0395\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (\U+03BC\U+03B5 \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF): " (rtos sumA 2 2) " m2"
    "\nLayers: STEGH-MAXIA / STEGH-NTERES / STEGH-KORFIAS / STEGH-GEISO / STEGH-PERIGR / STEGH-TXT"))
  (if (= *st-TOMI* "1")
    (progn
      (princ "\n\n>>> \U+039B\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03AD\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2...")
      (setq *tm-S* (/ (st-span orig) 2.0))
      (C:STEGHTOMI)))
  (princ))

(defun st-mid2 (a b)
  (list (/ (+ (car a) (car b)) 2.0) (/ (+ (cadr a) (cadr b)) 2.0)))

PLACEHOLDER
;; ===================== ΤΟΜΗ ΣΤΕΓΗΣ v2 =====================
;; Ζευκτό κατά ΤΕΙ Ηπείρου Σχ.7.1 / ΕΜΠ / Ευρωκώδικας 5
;;  ελκυστήρας(πέλμα/φτέρνα) · αμείβοντες(ψαλίδια) · αντηρίδες(ντεστέκια)
;;  ορθοστάτης(μπαμπάς) · τεγοστάτες · μηκίδα/στρωτήρας · κορυφοτεγίδα
;; ΠΡΟΣΟΧΗ: ο ορθοστάτης ΚΡΕΜΕΤΑΙ (κρεμαστή στέγη) — δεν πατάει στον
;; ελκυστήρα· συνδέεται με μεταλλική λάμα.

(setq *tm-S* 8.00 *tm-TYP* "GAB" *tm-ZEV* "KING"
      *tm-KER* 5.0 *tm-TTH* 10.0 *tm-PET* 2.0 *tm-EPI* 4.0
      *tm-TEG* 5.0 *tm-DZ* 0.30 *tm-AM* 16.0 *tm-AMB* 10.0
      *tm-EL* 18.0 *tm-ORT* 12.0 *tm-ANT* 10.0 *tm-STR* 12.0
      *tm-OVH* 0.60 *tm-WALL* 0.25 *tm-DIST* 0.80)

;; ---- γεωμετρικά βοηθητικά ----
(defun tm-adv (p ang d)
  (list (+ (car p) (* (cos ang) d)) (+ (cadr p) (* (sin ang) d))))
(defun tm-off (p ang d)
  (list (+ (car p) (* (- 0.0 (sin ang)) d)) (+ (cadr p) (* (cos ang) d))))
(defun tm-q (a b c d lyr) (st-pline (list a b c d) lyr))

;; ζώνη κατά μήκος ang, μήκος LL, από offset o1 έως o2
(defun tm-band (p ang LL o1 o2 lyr)
  (tm-q (tm-off p ang o1) (tm-off (tm-adv p ang LL) ang o1)
        (tm-off (tm-adv p ang LL) ang o2) (tm-off p ang o2) lyr))

;; δοκός πλάτους w με άξονα p1->p2
(defun tm-beam (p1 p2 w lyr / ang h)
  (if (> (distance p1 p2) 1e-6)
    (progn
      (setq ang (angle p1 p2) h (/ w 2.0))
      (tm-q (tm-off p1 ang h) (tm-off p2 ang h)
            (tm-off p2 ang (- 0.0 h)) (tm-off p1 ang (- 0.0 h)) lyr))))

;; κύκλος
(defun tm-circ (c r lyr)
  (entmake (list (cons 0 "CIRCLE") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbCircle")
                 (cons 10 (list (car c) (cadr c) 0.0)) (cons 40 r))))

;; κείμενο αριστερόστοιχο
(defun tm-txtl (p h str lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbText")
                 (cons 10 (list (car p) (cadr p) 0.0)) (cons 40 h)
                 (cons 1 str) (cons 72 0) (cons 73 0))))

;; ΜΠΑΛΑ ΑΝΑΦΟΡΑΣ: κουκκίδα στο στοιχείο A -> γραμμή -> κύκλος με αριθμό στο B
(defun tm-bub (A B num lh lyr / r)
  (setq r (* lh 1.05))
  (tm-circ A (* lh 0.16) lyr)
  (st-line A B lyr)
  (tm-circ B r lyr)
  (st-txt B lh (itoa num) lyr))

;; ---- DCL ----
(defun tm-dcl ( / f path tp)
  (setq tp (getvar "TEMPPREFIX"))
  (if (or (null tp) (not (= (type tp) (quote STR)))) (setq tp ""))
  (setq path (strcat tp "steghtomi2.dcl"))
  (setq f (open path "w"))
  (if (null f) nil
    (progn
      (write-line "steghtomi : dialog {" f)
      (write-line "  label = \"STEGHTOMI v2 \U+2014 \U+03A4\U+03BF\U+03BC\U+03AE \U+039E\U+03CD\U+03BB\U+03B9\U+03BD\U+03B7\U+03C2 \U+03A3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (HEXIS)\";" f)
      (write-line "  : row {" f)
      (write-line "    : column {" f)
      (write-line "      : boxed_radio_column { key = \"z\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03B6\U+03B5\U+03C5\U+03BA\U+03C4\U+03BF\U+03CD\";" f)
      (write-line "        : radio_button { key = \"z_apl\"; label = \"\U+0391\U+03C0\U+03BB\U+03CC \U+03C8\U+03B1\U+03BB\U+03AF\U+03B4\U+03B9 (\U+03AD\U+03C9\U+03C2 5 m)\"; }" f)
      (write-line "        : radio_button { key = \"z_kin\"; label = \"\U+039C\U+03B5 \U+03BF\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7 - \U+03BC\U+03C0\U+03B1\U+03BC\U+03C0\U+03AC (5-7 m)\"; value = \"1\"; }" f)
      (write-line "        : radio_button { key = \"z_qun\"; label = \"\U+039C\U+03B5 \U+03BF\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7 + \U+03C4\U+03B5\U+03B3\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B5\U+03C2 (7-12 m)\"; }" f)
      (write-line "      }" f)
      (write-line "      : boxed_radio_row { key = \"t\"; label = \"\U+039C\U+03BF\U+03C1\U+03C6\U+03AE\";" f)
      (write-line "        : radio_button { key = \"g\"; label = \"\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; value = \"1\"; }" f)
      (write-line "        : radio_button { key = \"m\"; label = \"\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
      (write-line "      }" f)
      (write-line "      : edit_box { key = \"s\";    label = \"\U+0386\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 (m):\"; edit_width = 7; }" f)
      (write-line "      : edit_box { key = \"pit\";  label = \"\U+039A\U+03BB\U+03AF\U+03C3\U+03B7 (%):\"; edit_width = 7; }" f)
      (write-line "      : edit_box { key = \"ovh\";  label = \"\U+03A0\U+03C1\U+03BF\U+03B5\U+03BE\U+03BF\U+03C7\U+03AE \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\U+03C5 (m):\"; edit_width = 7; }" f)
      (write-line "      : edit_box { key = \"wall\"; label = \"\U+03A0\U+03AC\U+03C7\U+03BF\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5 (m):\"; edit_width = 7; }" f)
      (write-line "      : edit_box { key = \"dist\"; label = \"\U+0391\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B6\U+03B5\U+03C5\U+03BA\U+03C4\U+03CE\U+03BD (m):\"; edit_width = 7; }" f)
      (write-line "    }" f)
      (write-line "    : column {" f)
      (write-line "      : boxed_column { label = \"\U+039E\U+03C5\U+03BB\U+03B5\U+03AF\U+03B1 (cm)\";" f)
      (write-line "        : edit_box { key = \"am\";  label = \"\U+0391\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2 h:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"amb\"; label = \"\U+0391\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2 b:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"el\";  label = \"\U+0395\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03AE\U+03C1\U+03B1\U+03C2 (\U+03C4\U+03B5\U+03C4\U+03C1.):\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"ort\"; label = \"\U+039F\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7\U+03C2:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"ant\"; label = \"\U+0391\U+03BD\U+03C4\U+03B7\U+03C1\U+03AF\U+03B4\U+03B5\U+03C2:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"str\"; label = \"\U+03A3\U+03C4\U+03C1\U+03C9\U+03C4\U+03AE\U+03C1\U+03B1\U+03C2:\"; edit_width = 5; }" f)
      (write-line "      }" f)
      (write-line "      : boxed_column { label = \"\U+03A3\U+03C4\U+03C1\U+03CE\U+03C3\U+03B5\U+03B9\U+03C2 (cm)\";" f)
      (write-line "        : edit_box { key = \"pet\"; label = \"\U+03A0\U+03AD\U+03C4\U+03C3\U+03C9\U+03BC\U+03B1:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"tth\"; label = \"\U+0398\U+03B5\U+03C1\U+03BC\U+03BF\U+03BC\U+03CC\U+03BD\U+03C9\U+03C3\U+03B7:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"epi\"; label = \"\U+0395\U+03C0\U+03B9\U+03C4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"teg\"; label = \"\U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2:\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"dz\";  label = \"\U+0392\U+03AE\U+03BC\U+03B1 \U+03C4\U+03B5\U+03B3\U+03AF\U+03B4\U+03C9\U+03BD (m):\"; edit_width = 5; }" f)
      (write-line "        : edit_box { key = \"ker\"; label = \"\U+039A\U+03B5\U+03C1\U+03B1\U+03BC\U+03AF\U+03B4\U+03B9:\"; edit_width = 5; }" f)
      (write-line "      }" f)
      (write-line "      : text { key = \"o1\"; width = 34; }" f)
      (write-line "      : text { key = \"o2\"; width = 34; }" f)
      (write-line "    }" f)
      (write-line "  }" f)
      (write-line "  ok_cancel;" f)
      (write-line "}" f)
      (close f) path)))

(defun tm-info ( / hh)
  (setq hh (* (st-slope) (if (= *tm-TYP* "GAB") (/ *tm-S* 2.0) *tm-S*)))
  (set_tile "o1" (strcat "\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC +" (rtos hh 2 3) " m  \U+00B7  \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 "
    (rtos (/ (atan (st-slope)) (/ pi 180.0)) 2 1) "\U+00B0"))
  (set_tile "o2" (strcat "\U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC \U+03B1\U+03BD\U+03AC " (rtos *tm-DIST* 2 2) " m  \U+00B7  \U+03AC\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 "
    (rtos *tm-S* 2 2) " m")))

(defun tm-upd ( / v)
  (setq v (atof (get_tile "s")))    (if (> v 0.5) (setq *tm-S* v))
  (setq v (atof (get_tile "pit")))  (if (> v 0.0) (setq *st-PIT* v *st-PMODE* "PCT"))
  (setq v (atof (get_tile "ovh")))  (if (>= v 0.0) (setq *tm-OVH* v))
  (setq v (atof (get_tile "wall"))) (if (> v 0.0) (setq *tm-WALL* v))
  (setq v (atof (get_tile "dist"))) (if (> v 0.1) (setq *tm-DIST* v))
  (foreach kv (list (list "am" 1) (list "amb" 2) (list "el" 3) (list "ort" 4)
                    (list "ant" 5) (list "str" 6) (list "pet" 7) (list "tth" 8)
                    (list "epi" 9) (list "teg" 10) (list "ker" 11))
    (setq v (atof (get_tile (car kv))))
    (if (> v 0.0)
      (cond ((= (cadr kv) 1) (setq *tm-AM* v))  ((= (cadr kv) 2) (setq *tm-AMB* v))
            ((= (cadr kv) 3) (setq *tm-EL* v))  ((= (cadr kv) 4) (setq *tm-ORT* v))
            ((= (cadr kv) 5) (setq *tm-ANT* v)) ((= (cadr kv) 6) (setq *tm-STR* v))
            ((= (cadr kv) 7) (setq *tm-PET* v)) ((= (cadr kv) 8) (setq *tm-TTH* v))
            ((= (cadr kv) 9) (setq *tm-EPI* v)) ((= (cadr kv) 10) (setq *tm-TEG* v))
            (T (setq *tm-KER* v)))))
  (setq v (atof (get_tile "dz"))) (if (> v 0.05) (setq *tm-DZ* v))
  (tm-info))

;; ---- ΜΙΑ ΚΛΙΣΗ: αμείβοντας + στρώσεις + τεγίδες ----
;; H0 = πόδι στη γραμμή του τοίχου, ang = γωνία ανόδου, LR = μήκος κλίσης
(defun tm-slope (H0 ang LR ovh am pet tth epi tg ker dz / P0 LT o1 o2 o3 o4 o5 s)
  ;; ΠΡΟΣΟΧΗ: στη δεξιά κλίση ang = pi-a, οπότε cos<0 -> abs
  (setq P0 (tm-adv H0 ang (- 0.0 (/ ovh (abs (cos ang))))))
  (setq LT (+ LR (/ ovh (abs (cos ang)))))
  ;; αμείβοντας (ψαλίδι)
  (tm-band P0 ang LT 0.0 am "TOMI-XYLO")
  (setq o1 am)                 ; πάνω παρειά αμείβοντα
  (setq o2 (+ o1 pet))         ; πέτσωμα
  (setq o3 (+ o2 tth))         ; θερμομόνωση
  (setq o4 (+ o3 epi))         ; επιτεγίδες
  (setq o5 (+ o4 tg))          ; τεγίδες
  (tm-band P0 ang LT o1 o2 "TOMI-PET")
  ;; φράγμα υδρατμών (γραμμή)
  (st-line (tm-off P0 ang o2) (tm-off (tm-adv P0 ang LT) ang o2) "TOMI-MEM")
  (tm-band P0 ang LT o2 o3 "TOMI-MON")
  ;; στεγανωτική διαπνέουσα μεμβράνη
  (st-line (tm-off P0 ang o3) (tm-off (tm-adv P0 ang LT) ang o3) "TOMI-MEM")
  ;; επιτεγίδες (κατά την κλίση -> συνεχής στην τομή)
  (tm-band P0 ang LT o3 o4 "TOMI-XYLO")
  ;; τεγίδες (εγκάρσιες -> διακριτές)
  (setq s 0.0)
  (while (< s LT)
    ;; το tg ερχεται ΑΡΝΗΤΙΚΟ στη δεξια κλιση (offset) - το ΜΗΚΟΣ θελει abs
    (tm-band (tm-adv P0 ang s) ang (abs tg) o4 o5 "TOMI-XYLO")
    (setq s (+ s dz)))
  ;; κεραμίδια
  (tm-band P0 ang LT o5 (+ o5 ker) "TOMI-KER")
  (list o1 o2 o3 o4 o5))

;; ---- ΕΝΤΟΛΗ ----
(defun C:STEGHTOMI ( / *error* dclpath dclid status ins th S half ang LR
                       am amb el ort ant str pet tth epi tg ker ovh ww dz
                       H0 HR A0 AR TOPL o kp kbot at1 at2 hh lx ly lh usedcl kw v
                       q1 q2 nteg wtot)
  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGHTOMI: " msg)))
    (princ))

  (st-layer "TOMI-XYLO"  3)
  (st-layer "TOMI-KER"   1)
  (st-layer "TOMI-MON"   4)
  (st-layer "TOMI-PET"   8)
  (st-layer "TOMI-MEM"   2)
  (st-layer "TOMI-METAL" 5)
  (st-layer "TOMI-TOIXOS" 250)
  (st-layer "TOMI-TXT"   6)

  (setq dclpath (tm-dcl) usedcl 0)
  (if dclpath
    (progn
      (setq dclid (load_dialog dclpath))
      (if (and dclid (= (type dclid) (quote INT)) (> dclid 0))
        (if (new_dialog "steghtomi" dclid)
          (setq usedcl 1)
          (progn (unload_dialog dclid) (setq usedcl 0))))))

  (if (= usedcl 1)
    (progn
      (set_tile "s"    (rtos *tm-S* 2 2))
      (set_tile "pit"  (rtos (if (= *st-PMODE* "PCT") *st-PIT* (* 100.0 (st-slope))) 2 1))
      (set_tile "ovh"  (rtos *tm-OVH* 2 2))
      (set_tile "wall" (rtos *tm-WALL* 2 2))
      (set_tile "dist" (rtos *tm-DIST* 2 2))
      (set_tile "am"  (rtos *tm-AM* 2 1))  (set_tile "amb" (rtos *tm-AMB* 2 1))
      (set_tile "el"  (rtos *tm-EL* 2 1))  (set_tile "ort" (rtos *tm-ORT* 2 1))
      (set_tile "ant" (rtos *tm-ANT* 2 1)) (set_tile "str" (rtos *tm-STR* 2 1))
      (set_tile "pet" (rtos *tm-PET* 2 1)) (set_tile "tth" (rtos *tm-TTH* 2 1))
      (set_tile "epi" (rtos *tm-EPI* 2 1)) (set_tile "teg" (rtos *tm-TEG* 2 1))
      (set_tile "dz"  (rtos *tm-DZ* 2 2))  (set_tile "ker" (rtos *tm-KER* 2 1))
      (set_tile (cond ((= *tm-ZEV* "APLO") "z_apl") ((= *tm-ZEV* "QUEEN") "z_qun") (T "z_kin")) "1")
      (set_tile (if (= *tm-TYP* "MON") "m" "g") "1")
      (tm-info)
      (action_tile "z_apl" "(setq *tm-ZEV* \"APLO\") (tm-info)")
      (action_tile "z_kin" "(setq *tm-ZEV* \"KING\") (tm-info)")
      (action_tile "z_qun" "(setq *tm-ZEV* \"QUEEN\") (tm-info)")
      (action_tile "g" "(setq *tm-TYP* \"GAB\") (tm-info)")
      (action_tile "m" "(setq *tm-TYP* \"MON\") (tm-info)")
      (foreach k (list "s" "pit" "ovh" "wall" "dist" "am" "amb" "el" "ort" "ant"
                       "str" "pet" "tth" "epi" "teg" "dz" "ker")
        (action_tile k "(tm-upd)"))
      (action_tile "accept" "(tm-upd) (done_dialog 1)")
      (action_tile "cancel" "(done_dialog 0)")
      (setq status (start_dialog))
      (unload_dialog dclid))
    (progn
      (princ "\n>>> \U+03A4\U+03BF \U+03C0\U+03B1\U+03C1\U+03B1\U+03B8\U+03C5\U+03C1\U+03BF DCL \U+03B4\U+03B5\U+03BD \U+03C6\U+03BF\U+03C1\U+03C4\U+03C9\U+03C3\U+03B5 \U+2014 \U+03C3\U+03C5\U+03BD\U+03B5\U+03C7\U+03B9\U+03B6\U+03C9 \U+03BC\U+03B5 \U+03B5\U+03C1\U+03C9\U+03C4\U+03B7\U+03C3\U+03B5\U+03B9\U+03C2.")
      (initget "Aplo Kingpost Queenpost")
      (setq kw (getkword "\n\U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03BF [Aplo/Kingpost/Queenpost] <Kingpost>: "))
      (setq *tm-ZEV* (cond ((= kw "Aplo") "APLO") ((= kw "Queenpost") "QUEEN") (T "KING")))
      (initget "Dirrichti Monorrichti")
      (setq kw (getkword "\n\U+039C\U+03BF\U+03C1\U+03C6\U+03B7 [Dirrichti/Monorrichti] <Dirrichti>: "))
      (setq *tm-TYP* (if (= kw "Monorrichti") "MON" "GAB"))
      (setq v (getreal (strcat "\n\U+0391\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 \U+03C3\U+03B5 m <" (rtos *tm-S* 2 2) ">: ")))
      (if (and v (> v 0.5)) (setq *tm-S* v))
      (setq v (getreal (strcat "\n\U+039A\U+03BB\U+03B9\U+03C3\U+03B7 % <" (rtos (* 100.0 (st-slope)) 2 1) ">: ")))
      (if (and v (> v 0.0)) (setq *st-PIT* v *st-PMODE* "PCT"))
      (setq v (getreal (strcat "\n\U+0393\U+03B5\U+03B9\U+03C3\U+03BF m <" (rtos *tm-OVH* 2 2) ">: ")))
      (if (and v (>= v 0.0)) (setq *tm-OVH* v))
      (setq status 1)))
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))

  (setq ins (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 (\U+03C0\U+03AC\U+03BD\U+03C9-\U+03B5\U+03BE\U+03C9\U+03C4. \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1 \U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03BF\U+03CD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5): "))
  (if (null ins) (exit))
  (setq ins (list (car ins) (cadr ins)))

  (setq th (st-slope) S *tm-S* ang (atan th))
  (setq half (if (= *tm-TYP* "GAB") (/ S 2.0) S))
  (setq LR (/ half (cos ang)))
  (setq am (/ *tm-AM* 100.0)  amb (/ *tm-AMB* 100.0) el (/ *tm-EL* 100.0)
        ort (/ *tm-ORT* 100.0) ant (/ *tm-ANT* 100.0) str (/ *tm-STR* 100.0)
        pet (/ *tm-PET* 100.0) tth (/ *tm-TTH* 100.0) epi (/ *tm-EPI* 100.0)
        tg (/ *tm-TEG* 100.0) ker (/ *tm-KER* 100.0)
        ovh *tm-OVH* ww *tm-WALL* dz *tm-DZ*)

  ;; --- ΤΟΙΧΟΙ + ΣΤΡΩΤΗΡΑΣ (μηκίδα) ---
  (tm-q ins (list (+ (car ins) ww) (cadr ins))
        (list (+ (car ins) ww) (- (cadr ins) 0.80))
        (list (car ins) (- (cadr ins) 0.80)) "TOMI-TOIXOS")
  (tm-q (list (car ins) (cadr ins)) (list (+ (car ins) str) (cadr ins))
        (list (+ (car ins) str) (+ (cadr ins) str))
        (list (car ins) (+ (cadr ins) str)) "TOMI-XYLO")
  (if (= *tm-TYP* "GAB")
    (progn
      (tm-q (list (+ (car ins) S) (cadr ins)) (list (+ (car ins) S (- 0.0 ww)) (cadr ins))
            (list (+ (car ins) S (- 0.0 ww)) (- (cadr ins) 0.80))
            (list (+ (car ins) S) (- (cadr ins) 0.80)) "TOMI-TOIXOS")
      (tm-q (list (+ (car ins) S) (cadr ins)) (list (+ (car ins) S (- 0.0 str)) (cadr ins))
            (list (+ (car ins) S (- 0.0 str)) (+ (cadr ins) str))
            (list (+ (car ins) S) (+ (cadr ins) str)) "TOMI-XYLO")))

  ;; --- ΕΛΚΥΣΤΗΡΑΣ (πέλμα/φτέρνα) — τετραγωνική διατομή ---
  (setq H0 (list (car ins) (+ (cadr ins) str el)))
  (setq HR (list (+ (car ins) S) (cadr H0)))
  (if (= *tm-TYP* "GAB")
    (tm-q (list (car H0) (- (cadr H0) el)) (list (car HR) (- (cadr HR) el))
          HR H0 "TOMI-XYLO"))

  ;; --- ΑΜΕΙΒΟΝΤΕΣ + ΣΤΡΩΣΕΙΣ ---
  (setq o (tm-slope H0 ang LR ovh am pet tth epi tg ker dz))
  (if (= *tm-TYP* "GAB")
    (tm-slope HR (- pi ang) LR ovh (- 0.0 am) (- 0.0 pet) (- 0.0 tth)
              (- 0.0 epi) (- 0.0 tg) (- 0.0 ker) dz))

  ;; --- ΕΣΩΤΕΡΙΚΑ ΖΕΥΚΤΟΥ (μόνο δίρριχτη) ---
  (setq A0 (list (+ (car H0) half) (+ (cadr H0) (* half th))))
  (if (and (= *tm-TYP* "GAB") (/= *tm-ZEV* "APLO"))
    (progn
      ;; ΟΡΘΟΣΤΑΤΗΣ (μπαμπάς) — ΚΡΕΜΕΤΑΙ: κενό 3 cm πάνω από τον ελκυστήρα
      (setq kbot (+ (cadr H0) 0.03))
      (tm-q (list (- (car A0) (/ ort 2.0)) kbot) (list (+ (car A0) (/ ort 2.0)) kbot)
            (list (+ (car A0) (/ ort 2.0)) (cadr A0)) (list (- (car A0) (/ ort 2.0)) (cadr A0))
            "TOMI-XYLO")
      ;; μεταλλική λάμα ορθοστάτη-ελκυστήρα (κρεμαστή στέγη)
      (tm-q (list (- (car A0) (/ ort 2.0) 0.02) (+ (cadr H0) 0.30))
            (list (+ (car A0) (/ ort 2.0) 0.02) (+ (cadr H0) 0.30))
            (list (+ (car A0) (/ ort 2.0) 0.02) (- (cadr H0) el))
            (list (- (car A0) (/ ort 2.0) 0.02) (- (cadr H0) el)) "TOMI-METAL")
      ;; ΑΝΤΗΡΙΔΕΣ (ντεστέκια)
      (setq at1 (list (+ (car H0) (/ half 2.0)) (+ (cadr H0) (* (/ half 2.0) th))))
      (setq at2 (list (- (car HR) (/ half 2.0)) (+ (cadr H0) (* (/ half 2.0) th))))
      (tm-beam (list (car A0) (+ kbot 0.06)) at1 ant "TOMI-XYLO")
      (tm-beam (list (car A0) (+ kbot 0.06)) at2 ant "TOMI-XYLO")
      ;; ΤΕΓΟΣΤΑΤΕΣ (μόνο QUEEN)
      (if (= *tm-ZEV* "QUEEN")
        (progn
          (tm-q (list (- (car at1) (/ ort 2.0)) (cadr H0))
                (list (+ (car at1) (/ ort 2.0)) (cadr H0))
                (list (+ (car at1) (/ ort 2.0)) (cadr at1))
                (list (- (car at1) (/ ort 2.0)) (cadr at1)) "TOMI-XYLO")
          (tm-q (list (- (car at2) (/ ort 2.0)) (cadr H0))
                (list (+ (car at2) (/ ort 2.0)) (cadr H0))
                (list (+ (car at2) (/ ort 2.0)) (cadr at2))
                (list (- (car at2) (/ ort 2.0)) (cadr at2)) "TOMI-XYLO")))))

  ;; --- ΚΟΡΥΦΟΤΕΓΙΔΑ ---
  (if (= *tm-TYP* "GAB")
    (tm-q (list (- (car A0) (/ tg 2.0)) (+ (cadr A0) (/ am (cos ang))))
          (list (+ (car A0) (/ tg 2.0)) (+ (cadr A0) (/ am (cos ang))))
          (list (+ (car A0) (/ tg 2.0)) (+ (cadr A0) (/ am (cos ang)) tg))
          (list (- (car A0) (/ tg 2.0)) (+ (cadr A0) (/ am (cos ang)) tg)) "TOMI-XYLO"))

  ;; --- ΜΠΑΛΕΣ ΑΝΑΦΟΡΑΣ ΜΕ LEADER ΠΑΝΩ ΣΤΑ ΣΤΟΙΧΕΙΑ ---
  (setq lh (/ S 70.0))
  (if (< lh 0.045) (setq lh 0.045))
  (setq q1 (tm-adv H0 ang (- 0.0 (/ ovh (abs (cos ang))))))   ; εξωτ. άκρο γείσου
  (setq q2 (+ LR (/ ovh (abs (cos ang)))))                    ; μήκος κλίσης
  (setq o1 (nth 0 o) o2 (nth 1 o) kp (nth 2 o) at1 (nth 3 o) at2 (nth 4 o))
  (setq wtot (+ at2 ker 0.55))                                ; ακτίνα μπαλών
  ;; οι τεγίδες ειναι ΔΙΑΚΡΙΤΕΣ ανα dz -> κεντραρε το βελος ΠΑΝΩ σε τεγιδα
  (setq nteg (/ (+ (* (fix (/ (* 0.70 q2) dz)) dz) (/ tg 2.0)) q2))

  ;; ΣΤΡΩΣΕΙΣ (1-8) — βεντάλια κατά μήκος της κλίσης
  (foreach it (list
      (list 1 (+ at2 (/ ker 2.0)) 0.80)
      (list 2 (/ (+ at1 at2) 2.0) nteg)
      (list 3 (/ (+ kp at1) 2.0)  0.60)
      (list 4 kp                  0.50)
      (list 5 (/ (+ o2 kp) 2.0)   0.41)
      (list 6 o2                  0.32)
      (list 7 (/ (+ o1 o2) 2.0)   0.24)
      (list 8 (/ o1 2.0)          0.16))
    (tm-bub (tm-off (tm-adv q1 ang (* (caddr it) q2)) ang (cadr it))
            (tm-off (tm-adv q1 ang (* (caddr it) q2)) ang wtot)
            (car it) lh "TOMI-TXT"))

  ;; ΔΟΜΙΚΑ ΣΤΟΙΧΕΙΑ (9-15)
  (if (and (= *tm-TYP* "GAB") (/= *tm-ZEV* "APLO"))
    (progn
      ;; 9 αντηρίδα — μέσο της διαγωνίου
      (tm-bub (list (- (car A0) (/ half 4.0)) (+ (cadr H0) (* (/ half 4.0) th) 0.10))
              (list (- (car A0) (* half 0.55)) (+ (cadr H0) (* half th 0.42)))
              9 lh "TOMI-TXT")
      ;; 10 ορθοστάτης
      (tm-bub (list (car A0) (+ (cadr H0) (* half th 0.55)))
              (list (+ (car A0) (* half 0.30)) (+ (cadr H0) (* half th 0.62)))
              10 lh "TOMI-TXT")
      ;; 11 μεταλλική λάμα ανάρτησης
      (tm-bub (list (car A0) (+ (cadr H0) 0.10))
              (list (+ (car A0) (* half 0.34)) (- (cadr H0) 0.55))
              11 lh "TOMI-TXT")))
  ;; 12 ελκυστήρας
  (if (= *tm-TYP* "GAB")
    (tm-bub (list (+ (car H0) (* S 0.30)) (- (cadr H0) (/ el 2.0)))
            (list (+ (car H0) (* S 0.30)) (- (cadr H0) 0.75))
            12 lh "TOMI-TXT"))
  ;; 13 στρωτήρας / μηκίδα
  (tm-bub (list (+ (car ins) (/ str 2.0)) (+ (cadr ins) (/ str 2.0)))
          (list (- (car ins) 0.75) (- (cadr ins) 0.30))
          13 lh "TOMI-TXT")
  ;; 14 κορυφοτεγίδα
  (if (= *tm-TYP* "GAB")
    (tm-bub (list (car A0) (+ (cadr A0) (/ am (cos ang)) (/ tg 2.0)))
            (list (car A0) (+ (cadr A0) (/ am (cos ang)) wtot))
            14 lh "TOMI-TXT"))
  ;; 15 τοιχοποιία
  (tm-bub (list (+ (car ins) (/ ww 2.0)) (- (cadr ins) 0.45))
          (list (- (car ins) 0.75) (- (cadr ins) 0.75))
          15 lh "TOMI-TXT")

  ;; --- ΥΠΟΜΝΗΜΑ (αριθμημένο, με μπάλες) ---
  (setq lx (+ (car ins) S 1.30) ly (+ (cadr A0) (* lh 4.0)))
  (st-txt (list (+ lx (* lh 9.0)) (+ ly (* lh 2.6))) (* lh 1.25)
          "\U+03A5\U+03A0\U+039F\U+039C\U+039D\U+0397\U+039C\U+0391 \U+03A5\U+039B\U+0399\U+039A\U+03A9\U+039D" "TOMI-TXT")
  (setq nteg 1)
  (foreach ln (list
    (strcat "\U+039A\U+0395\U+03A1\U+0391\U+039C\U+0399\U+0394\U+0399\U+0391 " (rtos *tm-KER* 2 1) " cm")
    (strcat "\U+03A4\U+0395\U+0393\U+0399\U+0394\U+0395\U+03A3 " (rtos *tm-TEG* 2 1) "x" (rtos *tm-TEG* 2 1) " cm \U+03B1\U+03BD\U+03AC " (rtos dz 2 2) " m")
    (strcat "\U+0395\U+03A0\U+0399\U+03A4\U+0395\U+0393\U+0399\U+0394\U+0395\U+03A3 " (rtos *tm-EPI* 2 1) " cm - \U+03B1\U+03B5\U+03C1\U+03B9\U+03B6\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03B4\U+03B9\U+03AC\U+03BA\U+03B5\U+03BD\U+03BF")
    "\U+03A3\U+03A4\U+0395\U+0393\U+0391\U+039D\U+03A9\U+03A4\U+0399\U+039A\U+0397 \U+0394\U+0399\U+0391\U+03A0\U+039D\U+0395\U+039F\U+03A5\U+03A3\U+0391 \U+039C\U+0395\U+039C\U+0392\U+03A1\U+0391\U+039D\U+0397"
    (strcat "\U+0398\U+0395\U+03A1\U+039C\U+039F\U+039C\U+039F\U+039D\U+03A9\U+03A3\U+0397 " (rtos *tm-TTH* 2 1) " cm")
    "\U+03A6\U+03A1\U+0391\U+0393\U+039C\U+0391 \U+03A5\U+0394\U+03A1\U+0391\U+03A4\U+039C\U+03A9\U+039D"
    (strcat "\U+03A0\U+0395\U+03A4\U+03A3\U+03A9\U+039C\U+0391 / \U+03A0\U+0395\U+03A4\U+0391\U+03A5\U+03A1\U+03A9\U+03A3\U+0397 " (rtos *tm-PET* 2 1) " cm")
    (strcat "\U+0391\U+039C\U+0395\U+0399\U+0392\U+039F\U+039D\U+03A4\U+0395\U+03A3 (\U+03A8\U+0391\U+039B\U+0399\U+0394\U+0399\U+0391) " (rtos *tm-AMB* 2 1) "x" (rtos *tm-AM* 2 1) " cm")
    (strcat "\U+0391\U+039D\U+03A4\U+0397\U+03A1\U+0399\U+0394\U+0395\U+03A3 (\U+039D\U+03A4\U+0395\U+03A3\U+03A4\U+0395\U+039A\U+0399\U+0391) " (rtos *tm-ANT* 2 1) " cm")
    (strcat "\U+039F\U+03A1\U+0398\U+039F\U+03A3\U+03A4\U+0391\U+03A4\U+0397\U+03A3 (\U+039C\U+03A0\U+0391\U+039C\U+03A0\U+0391\U+03A3) " (rtos *tm-ORT* 2 1) " cm - \U+039A\U+03A1\U+0395\U+039C\U+0391\U+03A3\U+03A4\U+039F\U+03A3")
    "\U+039C\U+0395\U+03A4\U+0391\U+039B\U+039B\U+0399\U+039A\U+0397 \U+039B\U+0391\U+039C\U+0391 \U+0391\U+039D\U+0391\U+03A1\U+03A4\U+0397\U+03A3\U+0397\U+03A3"
    (strcat "\U+0395\U+039B\U+039A\U+03A5\U+03A3\U+03A4\U+0397\U+03A1\U+0391\U+03A3 (\U+03A0\U+0395\U+039B\U+039C\U+0391) " (rtos *tm-EL* 2 1) "x" (rtos *tm-EL* 2 1) " cm")
    (strcat "\U+03A3\U+03A4\U+03A1\U+03A9\U+03A4\U+0397\U+03A1\U+0391\U+03A3 / \U+039C\U+0397\U+039A\U+0399\U+0394\U+0391 " (rtos *tm-STR* 2 1) " cm")
    (strcat "\U+039A\U+039F\U+03A1\U+03A5\U+03A6\U+039F\U+03A4\U+0395\U+0393\U+0399\U+0394\U+0391 " (rtos *tm-TEG* 2 1) " cm")
    (strcat "\U+03A4\U+039F\U+0399\U+03A7\U+039F\U+03A0\U+039F\U+0399\U+0399\U+0391 " (rtos ww 2 2) " m"))
    (tm-circ (list lx ly) (* lh 1.05) "TOMI-TXT")
    (st-txt (list lx ly) lh (itoa nteg) "TOMI-TXT")
    (tm-txtl (list (+ lx (* lh 1.9)) (- ly (* lh 0.5))) lh ln "TOMI-TXT")
    (setq nteg (1+ nteg))
    (setq ly (- ly (* lh 2.4))))

  (setq hh (* half th) nteg (fix (+ 1.0 (/ q2 dz))))
  (princ (strcat "\n--- STEGHTOMI v2 ---"
    "\n\U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03CC: " (cond ((= *tm-ZEV* "APLO") "\U+03B1\U+03C0\U+03BB\U+03CC \U+03C8\U+03B1\U+03BB\U+03AF\U+03B4\U+03B9")
                       ((= *tm-ZEV* "QUEEN") "\U+03BC\U+03B5 \U+03BF\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7 + \U+03C4\U+03B5\U+03B3\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B5\U+03C2")
                       (T "\U+03BC\U+03B5 \U+03BF\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7 (\U+03BC\U+03C0\U+03B1\U+03BC\U+03C0\U+03AC)"))
    "  \U+00B7  " (if (= *tm-TYP* "GAB") "\U+03B4\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7" "\U+03BC\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7")
    "\n\U+0386\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 " (rtos S 2 2) " m  \U+00B7  \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 "
    (rtos (/ ang (/ pi 180.0)) 2 1) "\U+00B0 (" (rtos (* th 100.0) 2 1) "%)"
    "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC +" (rtos hh 2 3) " m  \U+00B7  \U+03BC\U+03AE\U+03BA\U+03BF\U+03C2 \U+03B1\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1 "
    (rtos q2 2 3) " m"
    "\n\U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2 \U+03B1\U+03BD\U+03AC \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7: " (itoa nteg) "  \U+00B7  \U+03B6\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC \U+03B1\U+03BD\U+03AC " (rtos *tm-DIST* 2 2) " m"
    "\n\U+03A0\U+03B7\U+03B3\U+03AD\U+03C2: \U+03A4\U+0395\U+0399 \U+0397\U+03C0\U+03B5\U+03AF\U+03C1\U+03BF\U+03C5 \U+03A3\U+03C7.7.1 \U+00B7 \U+0395\U+039C\U+03A0 (\U+03BA\U+03C1\U+03B5\U+03BC\U+03B1\U+03C3\U+03C4\U+03AD\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B5\U+03C2) \U+00B7 \U+0395\U+03C5\U+03C1\U+03C9\U+03BA\U+03CE\U+03B4\U+03B9\U+03BA\U+03B1\U+03C2 5"))
  (princ))

(princ "\nSTEGH v8.3 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03B3\U+03B5\U+03B9\U+03C3\U+03BF + \U+03C5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B2\U+03B1\U+03C3\U+03B7\U+03C2 + \U+03C4\U+03BF\U+03BC\U+03B7).")
(princ "\n\U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: STEGH  \U+00B7  STEGHTOMI")
(princ)
