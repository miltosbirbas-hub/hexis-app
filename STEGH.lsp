;;; STEGH.LSP v8.0 — ΠΡΑΓΜΑΤΙΚΟΣ STRAIGHT SKELETON (wavefront propagation)
;;; Edge events + Split events -> μαχιές, ντερέδες, κορφιάδες, υψόμετρα κόμβων.
;;; Εντολές:  STEGH (κάτοψη στέγης)  ·  STEGHTOMI (τομή στρώσεων)
;;; HEXIS Platform — BRB DEVELOPMENT MON. I.K.E.
;;; ΠΡΟΣΟΧΗ: αρχείο σε Windows-1253. ΜΗΝ το μετατρέψεις σε UTF-8.

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
(defun st-dcl ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "stegh8.dcl"))
  (setq f (open path "w"))
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
  (write-line "      : toggle { key = \"gei\"; label = \"\U+03A3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7 \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\U+03C5\"; value = \"1\"; }" f)
  (write-line "      : toggle { key = \"lab\"; label = \"\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 \U+03BA\U+03CC\U+03BC\U+03B2\U+03C9\U+03BD\"; value = \"1\"; }" f)
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
  path)

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
  (set_tile "i2" (strcat "\U+0393\U+03B5\U+03AF\U+03C3\U+03BF " (rtos *st-OVH* 2 2) " m"))
  (end_image))

(defun st-upd ( / v)
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v))
  (setq v (atof (get_tile "ovh"))) (if (>= v 0.0) (setq *st-OVH* v))
  (st-prev))

;; ===================== ΕΝΤΟΛΗ STEGH =====================
(defun C:STEGH ( / *error* ent pts orig n dclpath dclid status
                   th ovh res arcs nodes lab gpts hmax i j
                   a b ia ib lyr txh hh cnt1 cnt2 cnt3
                   lowp bi bd pm dd pa pb eang p0 nds sumA nd p
                   xchk badv conn bv)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGH: " msg)))
    (princ))

  (st-layer "STEGH-PERIGR" 8)
  (st-layer "STEGH-MAXIA"  1)
  (st-layer "STEGH-NTERES" 4)
  (st-layer "STEGH-KORFIAS" 2)
  (st-layer "STEGH-GEISO"  3)
  (st-layer "STEGH-TXT"    6)

  (princ "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+039A\U+039B\U+0395\U+0399\U+03A3\U+03A4\U+0397 polyline \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2:")
  (setq ent (entsel))
  (if (null ent) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3)
    (progn (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 \U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD 3 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2.") (exit)))
  (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
  (setq orig (st-clean pts) n (length orig))

  ;; --- ΕΛΕΓΧΟΣ 1: αυτοτέμνεται το περίγραμμα; ---
  (setq xchk (st-selfx orig))
  (if xchk
    (progn
      (st-layer "STEGH-TXT" 6)
      (st-txt (list (car xchk) (cadr xchk)) (/ (st-span orig) 40.0) "X" "STEGH-TXT")
      (princ (strcat "\n*** \U+03A3\U+03A6\U+0391\U+039B\U+039C\U+0391: \U+03C4\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+0391\U+03A5\U+03A4\U+039F\U+03A4\U+0395\U+039C\U+039D\U+0395\U+03A4\U+0391\U+0399 \U+03C3\U+03C4\U+03BF ("
        (rtos (car xchk) 2 3) ", " (rtos (cadr xchk) 2 3) ")"
        "\n    \U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BC\U+03B5 X. \U+0394\U+03B9\U+03CC\U+03C1\U+03B8\U+03C9\U+03C3\U+03B5 \U+03C4\U+03B7\U+03BD polyline \U+03BA\U+03B1\U+03B9 \U+03BE\U+03B1\U+03BD\U+03B1\U+03C4\U+03C1\U+03AD\U+03BE\U+03B5.\n"))
      (exit)))

  (setq dclpath (st-dcl))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 DCL.") (exit)))
  (if (not (new_dialog "stegh8" dclid))
    (progn (unload_dialog dclid) (princ "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 dialog.") (exit)))
  (set_tile "pit" (rtos *st-PIT* 2 1))
  (set_tile "ovh" (rtos *st-OVH* 2 2))
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
  (action_tile "accept"
    "(st-upd) (setq *st-GEI* (get_tile \"gei\")) (setq *st-LAB* (get_tile \"lab\")) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))

  (setq th (st-slope) ovh *st-OVH*)
  (setq txh (/ (st-span orig) 55.0))
  (if (< txh 0.05) (setq txh 0.05))
  (setq arcs (list) nodes (list))

  (cond
    ;; ---------- ΙΣΟΚΛΙΝΗΣ (straight skeleton) ----------
    ((= *st-TYP* "ISO")
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
    (st-line (car a) (cadr a) lyr))

  (st-pline orig "STEGH-PERIGR")

  (if (and (= *st-GEI* "1") (> ovh 0.001))
    (progn
      (setq gpts (st-geiso orig ovh))
      (st-pline gpts "STEGH-GEISO")))

  ;; ---------- ΥΨΟΜΕΤΡΑ ----------
  (setq hmax 0.0)
  (foreach nd nodes
    (if (> (* (cadr nd) th) hmax) (setq hmax (* (cadr nd) th))))
  (if (= *st-LAB* "1")
    (progn
      (foreach p orig
        (st-txt (list (car p) (+ (cadr p) (* txh 0.7))) txh "+0.00" "STEGH-TXT"))
      (foreach nd nodes
        (st-txt (list (car (car nd)) (+ (cadr (car nd)) (* txh 0.7))) txh
          (strcat "+" (rtos (* (cadr nd) th) 2 2)) "STEGH-TXT"))
      (if (and (= *st-GEI* "1") (> ovh 0.001))
        (foreach p (st-geiso orig ovh)
          (st-txt (list (car p) (- (cadr p) (* txh 1.6))) txh
            (strcat "-" (rtos (* ovh th) 2 2)) "STEGH-TXT")))))

  ;; ---------- ΑΝΑΦΟΡΑ ----------
  (setq sumA (/ (abs (/ (st-area2 (if (and (= *st-GEI* "1") (> ovh 0.001))
                                     (st-geiso orig ovh) orig)) 2.0))
                (cos (atan th))))
  (princ (strcat "\n--- STEGH v8.0 ---"
    "\n\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2: " (cond ((= *st-TYP* "ISO") "\U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE\U+03C2") ((= *st-TYP* "GAB") "\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7") (T "\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7"))
    "  |  \U+039A\U+03BB\U+03AF\U+03C3\U+03B7: " (rtos *st-PIT* 2 1) (if (= *st-PMODE* "PCT") "%" "\U+00B0")
    " (= " (rtos (/ (atan th) (/ pi 180.0)) 2 1) "\U+00B0)"
    "\n\U+039C\U+03B1\U+03C7\U+03B9\U+03AD\U+03C2: " (itoa cnt1) "  \U+039D\U+03C4\U+03B5\U+03C1\U+03AD\U+03B4\U+03B5\U+03C2: " (itoa cnt2) "  \U+039A\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03B4\U+03B5\U+03C2: " (itoa cnt3)
    "\n\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC: +" (rtos hmax 2 3) " m"
    "\n\U+0395\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (\U+03BC\U+03B5 \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF): " (rtos sumA 2 2) " m2"
    "\nLayers: STEGH-MAXIA / STEGH-NTERES / STEGH-KORFIAS / STEGH-GEISO / STEGH-PERIGR / STEGH-TXT"))
  (princ))

(defun st-mid2 (a b)
  (list (/ (+ (car a) (car b)) 2.0) (/ (+ (cadr a) (cadr b)) 2.0)))

PLACEHOLDER
;; ===================== ΤΟΜΗ ΣΤΡΩΣΕΩΝ =====================
(setq *tm-S* 8.00 *tm-TYP* "GAB" *tm-KER* 5.0 *tm-TTH* 8.0 *tm-PET* 2.5
      *tm-TEG* 10.0 *tm-DZ* 0.80 *tm-AM* 16.0 *tm-EL* 16.0)

(defun tm-dcl ( / f path)
  (setq path (strcat (getvar "TEMPPREFIX") "steghtomi.dcl"))
  (setq f (open path "w"))
  (write-line "steghtomi : dialog {" f)
  (write-line "  label = \"STEGHTOMI \U+2014 \U+03A4\U+03BF\U+03BC\U+03AE \U+039E\U+03CD\U+03BB\U+03B9\U+03BD\U+03B7\U+03C2 \U+03A3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "    : column {" f)
  (write-line "      : boxed_radio_row { key = \"t\"; label = \"\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2\";" f)
  (write-line "        : radio_button { key = \"g\"; label = \"\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; value = \"1\"; }" f)
  (write-line "        : radio_button { key = \"m\"; label = \"\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7\"; }" f)
  (write-line "      }" f)
  (write-line "      : edit_box { key = \"s\";   label = \"\U+0386\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 (m):\"; edit_width = 8; }" f)
  (write-line "      : edit_box { key = \"pit\"; label = \"\U+039A\U+03BB\U+03AF\U+03C3\U+03B7 (%):\"; edit_width = 8; }" f)
  (write-line "      : boxed_column { label = \"\U+03A3\U+03C4\U+03C1\U+03CE\U+03C3\U+03B5\U+03B9\U+03C2 (cm)\";" f)
  (write-line "        : edit_box { key = \"ker\"; label = \"1. \U+039A\U+03B5\U+03C1\U+03B1\U+03BC\U+03AF\U+03B4\U+03B9:\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"tth\"; label = \"3. \U+0398\U+03B5\U+03C1\U+03BC\U+03BF\U+03BC\U+03CC\U+03BD\U+03C9\U+03C3\U+03B7:\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"pet\"; label = \"4. \U+03A0\U+03AD\U+03C4\U+03C3\U+03C9\U+03BC\U+03B1:\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"teg\"; label = \"5. \U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B1 (\U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC):\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"dz\";  label = \"   \U+0392\U+03AE\U+03BC\U+03B1 \U+03C4\U+03B5\U+03B3\U+03AF\U+03B4\U+03C9\U+03BD (m):\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"am\";  label = \"6. \U+0391\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2 (\U+03CD\U+03C8\U+03BF\U+03C2):\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"el\";  label = \"7. \U+0395\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03AE\U+03C1\U+03B1\U+03C2 (\U+03CD\U+03C8\U+03BF\U+03C2):\"; edit_width = 6; }" f)
  (write-line "      }" f)
  (write-line "    }" f)
  (write-line "    : column {" f)
  (write-line "      : image { key = \"pv\"; width = 28; aspect_ratio = 0.55; color = 0; }" f)
  (write-line "      : text { key = \"o1\"; width = 32; }" f)
  (write-line "      : text { key = \"o2\"; width = 32; }" f)
  (write-line "    }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f) path)

(defun tm-prev ( / w h x0 x1 yb ya xm th)
  (setq w (dimx_tile "pv") h (dimy_tile "pv"))
  (start_image "pv") (fill_image 0 0 w h 0)
  (setq x0 (fix (* w 0.08)) x1 (fix (* w 0.92))
        yb (fix (* h 0.72)) xm (fix (/ (+ x0 x1) 2)))
  (setq th (st-slope))
  (setq ya (fix (- yb (* (- xm x0) th))))
  (if (< ya (fix (* h 0.08))) (setq ya (fix (* h 0.08))))
  (if (= *tm-TYP* "GAB")
    (progn
      (vector_image x0 yb xm ya 1) (vector_image x1 yb xm ya 1)
      (vector_image x0 (- yb 2) xm (- ya 2) 2) (vector_image x1 (- yb 2) xm (- ya 2) 2))
    (progn
      (vector_image x0 yb x1 ya 1) (vector_image x0 (- yb 2) x1 (- ya 2) 2)))
  (vector_image x0 yb x1 yb 3)
  (set_tile "o1" (strcat "\U+0386\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 " (rtos *tm-S* 2 2) " m  \U+00B7  \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 "
    (rtos (/ (atan (st-slope)) (/ pi 180.0)) 2 1) "\U+00B0"))
  (set_tile "o2" (strcat "\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC +" (rtos
    (* (st-slope) (if (= *tm-TYP* "GAB") (/ *tm-S* 2.0) *tm-S*)) 2 3) " m"))
  (end_image))

(defun tm-upd ( / v)
  (setq v (atof (get_tile "s")))   (if (> v 0.1) (setq *tm-S* v))
  (setq v (atof (get_tile "pit"))) (if (> v 0.0) (setq *st-PIT* v *st-PMODE* "PCT"))
  (setq v (atof (get_tile "ker"))) (if (> v 0.0) (setq *tm-KER* v))
  (setq v (atof (get_tile "tth"))) (if (>= v 0.0) (setq *tm-TTH* v))
  (setq v (atof (get_tile "pet"))) (if (> v 0.0) (setq *tm-PET* v))
  (setq v (atof (get_tile "teg"))) (if (> v 0.0) (setq *tm-TEG* v))
  (setq v (atof (get_tile "dz")))  (if (> v 0.05) (setq *tm-DZ* v))
  (setq v (atof (get_tile "am")))  (if (> v 0.0) (setq *tm-AM* v))
  (setq v (atof (get_tile "el")))  (if (> v 0.0) (setq *tm-EL* v))
  (tm-prev))

;; ορθογώνιο κατά μήκος διεύθυνσης ang, από p, μήκος L, από offset o1 έως o2
(defun tm-band (p ang L o1 o2 lyr / ux uy vx vy a b c d)
  (setq ux (cos ang) uy (sin ang) vx (- 0.0 (sin ang)) vy (cos ang))
  (setq a (list (+ (car p) (* vx o1)) (+ (cadr p) (* vy o1))))
  (setq b (list (+ (car a) (* ux L)) (+ (cadr a) (* uy L))))
  (setq c (list (+ (car p) (* vx o2) (* ux L)) (+ (cadr p) (* vy o2) (* uy L))))
  (setq d (list (+ (car p) (* vx o2)) (+ (cadr p) (* vy o2))))
  (st-pline (list a b c d) lyr))

(defun C:STEGHTOMI ( / *error* dclpath dclid status ins th S half
                       ang LL o tk tt tp tg am el j xx yy P0 apex hh lx ly lh k)
  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGHTOMI: " msg)))
    (princ))

  (st-layer "TOMI-XYLO"  3)
  (st-layer "TOMI-KER"   1)
  (st-layer "TOMI-MON"   4)
  (st-layer "TOMI-PET"   8)
  (st-layer "TOMI-TXT"   6)

  (setq dclpath (tm-dcl))
  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 DCL.") (exit)))
  (if (not (new_dialog "steghtomi" dclid))
    (progn (unload_dialog dclid) (princ "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 dialog.") (exit)))
  (set_tile "s"   (rtos *tm-S* 2 2))
  (set_tile "pit" (rtos (if (= *st-PMODE* "PCT") *st-PIT*
                          (* 100.0 (st-slope))) 2 1))
  (set_tile "ker" (rtos *tm-KER* 2 1))
  (set_tile "tth" (rtos *tm-TTH* 2 1))
  (set_tile "pet" (rtos *tm-PET* 2 1))
  (set_tile "teg" (rtos *tm-TEG* 2 1))
  (set_tile "dz"  (rtos *tm-DZ* 2 2))
  (set_tile "am"  (rtos *tm-AM* 2 1))
  (set_tile "el"  (rtos *tm-EL* 2 1))
  (set_tile (if (= *tm-TYP* "MON") "m" "g") "1")
  (tm-prev)
  (action_tile "g" "(setq *tm-TYP* \"GAB\") (tm-prev)")
  (action_tile "m" "(setq *tm-TYP* \"MON\") (tm-prev)")
  (foreach k (list "s" "pit" "ker" "tth" "pet" "teg" "dz" "am" "el")
    (action_tile k "(tm-upd)"))
  (action_tile "accept" "(tm-upd) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))

  (setq ins (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2 (\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AE \U+03AD\U+03B4\U+03C1\U+03B1\U+03C3\U+03B7): "))
  (if (null ins) (exit))
  (setq ins (list (car ins) (cadr ins)))

  (setq th (st-slope) S *tm-S*)
  (setq half (if (= *tm-TYP* "GAB") (/ S 2.0) S))
  (setq ang (atan th))
  (setq LL (/ half (cos ang)))
  (setq tk (/ *tm-KER* 100.0) tt (/ *tm-TTH* 100.0) tp (/ *tm-PET* 100.0)
        tg (/ *tm-TEG* 100.0) am (/ *tm-AM* 100.0) el (/ *tm-EL* 100.0))
  (setq apex (list (+ (car ins) half) (+ (cadr ins) (* half th))))

  ;; --- ΕΛΚΥΣΤΗΡΑΣ ---
  (st-pline (list ins
                  (list (+ (car ins) S) (cadr ins))
                  (list (+ (car ins) S) (- (cadr ins) el))
                  (list (car ins) (- (cadr ins) el))) "TOMI-XYLO")

  ;; --- ΑΡΙΣΤΕΡΗ ΚΛΙΣΗ ---
  (tm-band ins ang LL (- 0.0 am) 0.0 "TOMI-XYLO")            ; αμείβοντας
  (tm-band ins ang LL tg (+ tg tp) "TOMI-PET")                ; πέτσωμα
  (tm-band ins ang LL (+ tg tp) (+ tg tp tt) "TOMI-MON")      ; θερμομόνωση
  (st-line (list (- (car ins) (* (sin ang) (+ tg tp tt)))
                 (+ (cadr ins) (* (cos ang) (+ tg tp tt))))
           (list (- (car apex) (* (sin ang) (+ tg tp tt)))
                 (+ (cadr apex) (* (cos ang) (+ tg tp tt)))) "TOMI-MON")
  (tm-band ins ang LL (+ tg tp tt) (+ tg tp tt tk) "TOMI-KER") ; κεραμίδι
  ;; τεγίδες
  (setq j 0)
  (while (< (* j *tm-DZ*) LL)
    (setq xx (+ (car ins) (* (* j *tm-DZ*) (cos ang))))
    (setq yy (+ (cadr ins) (* (* j *tm-DZ*) (sin ang))))
    (tm-band (list xx yy) ang tg 0.0 tg "TOMI-XYLO")
    (setq j (1+ j)))

  ;; --- ΔΕΞΙΑ ΚΛΙΣΗ (μόνο δίρριχτη) ---
  (if (= *tm-TYP* "GAB")
    (progn
      (setq P0 (list (+ (car ins) S) (cadr ins)))
      (setq ang (- pi (atan th)))
      (tm-band P0 ang LL am 0.0 "TOMI-XYLO")
      (tm-band P0 ang LL (- 0.0 tg) (- 0.0 (+ tg tp)) "TOMI-PET")
      (tm-band P0 ang LL (- 0.0 (+ tg tp)) (- 0.0 (+ tg tp tt)) "TOMI-MON")
      (tm-band P0 ang LL (- 0.0 (+ tg tp tt)) (- 0.0 (+ tg tp tt tk)) "TOMI-KER")
      (setq j 0)
      (while (< (* j *tm-DZ*) LL)
        (setq xx (+ (car P0) (* (* j *tm-DZ*) (cos ang))))
        (setq yy (+ (cadr P0) (* (* j *tm-DZ*) (sin ang))))
        (tm-band (list xx yy) ang tg 0.0 (- 0.0 tg) "TOMI-XYLO")
        (setq j (1+ j)))))

  ;; --- ΕΤΙΚΕΤΕΣ ---
  (setq lh (/ S 45.0))
  (if (< lh 0.04) (setq lh 0.04))
  (setq lx (- (car ins) (* S 0.30)) ly (+ (cadr ins) (* S 0.42)))
  (st-txt (list lx (+ ly (* lh 12.0))) lh
    (strcat "1. \U+039A\U+0395\U+03A1\U+0391\U+039C\U+0399\U+0394\U+0399 " (rtos *tm-KER* 2 1) " cm") "TOMI-TXT")
  (st-txt (list lx (+ ly (* lh 10.5))) lh "2. \U+03A5\U+0393\U+03A1\U+039F\U+039C\U+039F\U+039D\U+03A9\U+03A3\U+0397 (\U+03BC\U+03B5\U+03BC\U+03B2\U+03C1\U+03AC\U+03BD\U+03B7)" "TOMI-TXT")
  (st-txt (list lx (+ ly (* lh 9.0))) lh
    (strcat "3. \U+0398\U+0395\U+03A1\U+039C\U+039F\U+039C\U+039F\U+039D\U+03A9\U+03A3\U+0397 " (rtos *tm-TTH* 2 1) " cm") "TOMI-TXT")
  (st-txt (list lx (+ ly (* lh 7.5))) lh
    (strcat "4. \U+03A0\U+0395\U+03A4\U+03A3\U+03A9\U+039C\U+0391 " (rtos *tm-PET* 2 1) " cm") "TOMI-TXT")
  (st-txt (list lx (+ ly (* lh 6.0))) lh
    (strcat "5. \U+03A4\U+0395\U+0393\U+0399\U+0394\U+0395\U+03A3 " (rtos *tm-TEG* 2 1) "x" (rtos *tm-TEG* 2 1)
            " \U+03B1\U+03BD\U+03AC " (rtos *tm-DZ* 2 2) " m") "TOMI-TXT")
  (st-txt (list lx (+ ly (* lh 4.5))) lh
    (strcat "6. \U+0391\U+039C\U+0395\U+0399\U+0392\U+039F\U+039D\U+03A4\U+0395\U+03A3 (\U+03A8\U+0391\U+039B\U+0399\U+0394\U+0399) h=" (rtos *tm-AM* 2 1) " cm") "TOMI-TXT")
  (st-txt (list lx (+ ly (* lh 3.0))) lh
    (strcat "7. \U+0395\U+039B\U+039A\U+03A5\U+03A3\U+03A4\U+0397\U+03A1\U+0391\U+03A3 h=" (rtos *tm-EL* 2 1) " cm") "TOMI-TXT")

  (setq hh (* half th))
  (princ (strcat "\n--- STEGHTOMI ---"
    "\n\U+0386\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 " (rtos S 2 2) " m  \U+00B7  \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 "
    (rtos (/ (atan th) (/ pi 180.0)) 2 1) "\U+00B0 (" (rtos (* th 100.0) 2 1) "%)"
    "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC: +" (rtos hh 2 3) " m"
    "\n\U+039C\U+03AE\U+03BA\U+03BF\U+03C2 \U+03B1\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1: " (rtos LL 2 3) " m"
    "\n\U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2 \U+03B1\U+03BD\U+03AC \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7: " (itoa (fix (+ 1 (/ LL *tm-DZ*))))))
  (princ))

(princ "\nSTEGH v8.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03C0\U+03C1\U+03B1\U+03B3\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03CC\U+03C2 straight skeleton).")
(princ "\n\U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: STEGH  \U+00B7  STEGHTOMI")
(princ)
