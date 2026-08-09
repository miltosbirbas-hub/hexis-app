;;; STEGH.LSP v8.4 — ΠΡΑΓΜΑΤΙΚΟΣ STRAIGHT SKELETON (wavefront propagation)
;;; Edge events + Split events -> μαχιές, ντερέδες, κορφιάδες, υψόμετρα κόμβων.
;;; Εντολές:  STEGH (κάτοψη στέγης)  ·  STEGHTOMI (τομή στρώσεων)
;;; HEXIS Platform — BRB DEVELOPMENT MON. I.K.E.
;;; ΠΡΟΣΟΧΗ: αρχείο σε Windows-1253. ΜΗΝ το μετατρέψεις σε UTF-8.

(setq *st-STEP* "0 - \U+03B1\U+03C6\U+03CC\U+03C1\U+03C4\U+03B9\U+03C3\U+03C4\U+03BF")
(setq *st-BASE* 0.00 *st-TOMI* "0")
;; --- δεδομένα που περνά η ΚΑΤΟΨΗ (STEGH) στην ΤΟΜΗ (STEGHTOMI) ---
(setq *st-ENG* "" *st-CONT* "" *st-PROJ* ""
      *ec-ON* "1" *ec-ZONE* 3 *ec-ALT* 100.0 *ec-VB0* 33.0 *ec-TERR* 2
      *ec-H* 8.0 *ec-CE* 1.0 *ec-CT* 1.0 *ec-SC* 2 *ec-FMK* 24.0
      *ec-GEXT* 0.15 *ec-RES* nil)
(setq *st-XYL* "0" *st-XMK* "1" *st-XSCH* nil *st-TRP* nil *st-DARCS* nil
      *st-EAV* nil *st-HOLES* nil *st-TXH* 0.10
      *st-AREA* 0.0 *st-PER* 0.0 *st-HMAX* 0.0 *st-LMAX* 0.0
      *st-LNT* 0.0 *st-LKOR* 0.0 *st-EAVE* 0.0 *st-TR* nil)
(setq *st-PIT* 35.0 *st-PMODE* "PCT" *st-OVH* 0.50 *st-TYP* "ISO" *st-HCAP* 0.0
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
(defun st-build (loops / n i ea eb b e0 v0 lp tot)
  ;; loops = λίστα βρόχων: (εξωτερικό CCW  τρύπα1 CW  τρύπα2 CW ...)
  ;; δέχεται και ΕΝΑ σκέτο περίγραμμα (το τυλίγει)
  (if (numberp (car (car loops))) (setq loops (list loops)))
  (setq *SK-E* (list) *SK-V* (list) tot 0)
  (foreach lp loops
    (setq n (length lp) e0 (length *SK-E*) v0 (length *SK-V*) i 0)
    (while (< i n)
      (setq *SK-E* (append *SK-E*
        (list (st-mkedge (nth i lp) (nth (rem (1+ i) n) lp)))))
      (setq i (1+ i)))
    (setq i 0)
    (while (< i n)
      (setq ea (+ e0 (rem (+ i (1- n)) n)) eb (+ e0 i))
      (setq b (st-bisect (nth ea *SK-E*) (nth eb *SK-E*)))
      (setq *SK-V* (append *SK-V* (list
        (list (car (nth i lp)) (cadr (nth i lp)) 0.0 ea eb
              (+ v0 (rem (+ i (1- n)) n)) (+ v0 (rem (1+ i) n)) 1 (car b) (cadr b)
              (if (st-reflexp (nth ea *SK-E*) (nth eb *SK-E*)) 1 0)))))
      (setq i (1+ i)))
    (setq tot (+ tot n)))
  tot)

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

(defun st-oppos (iv ie P tt / n cur best bestd AA BB ss LL dd e edx edy c)
  ;; ΚΑΘΟΛΙΚΗ αναζήτηση: η ακμή ie μπορεί να ανήκει σε ΑΛΛΟ βρόχο (τρύπα)
  ;; -> το split event γίνεται ΣΥΓΧΩΝΕΥΣΗ των δύο βρόχων
  (setq e (nth ie *SK-E*) edx (nth 4 e) edy (nth 5 e))
  (setq n (length *SK-V*) cur 0 best nil bestd nil)
  (while (< cur n)
    (setq c (nth cur *SK-V*))
    (if (and (/= cur iv) (= (nth 7 c) 1) (= (nth 4 c) ie) (>= (nth 6 c) 0)
             (= (nth 7 (nth (nth 6 c) *SK-V*)) 1))
      (progn
        (setq AA (st-vpos cur tt) BB (st-vpos (nth 6 c) tt))
        (setq ss (+ (* (- (car P) (car AA)) edx) (* (- (cadr P) (cadr AA)) edy)))
        (setq LL (+ (* (- (car BB) (car AA)) edx) (* (- (cadr BB) (cadr AA)) edy)))
        (if (and (>= ss -1e-6) (<= ss (+ LL 1e-6)))
          (progn (setq best cur) (setq cur n))
          (progn
            (setq dd (min (abs ss) (abs (- ss LL))))
            (if (or (null bestd) (< dd bestd)) (setq bestd dd best cur))))))
    (setq cur (1+ cur)))
  best)

;; ===================== ΚΥΡΙΟΣ ΒΡΟΧΟΣ =====================
;; -> (list arcs nodes)   arc = (p q)   node = (p t)
(defun st-skel (pts / n it arcs nodes bt bk bia bib bP bie i j r vv nv2
                     ip inx nv io iy v1 v2 o kk maxit loops h)
  ;; pts: είτε ένα περίγραμμα, είτε λίστα (περίγραμμα τρύπα1 τρύπα2 ...)
  (if (numberp (car (car pts)))
    (progn
      (if (< (st-area2 pts) 0.0) (setq pts (reverse pts)))
      (setq loops (list pts)))
    (progn
      (setq loops (list (if (> (st-area2 (car pts)) 0.0)
                          (car pts) (reverse (car pts)))))
      (foreach h (cdr pts)
        (setq loops (append loops
          (list (if (< (st-area2 h) 0.0) h (reverse h))))))))
  (setq n (st-build loops) arcs (list) nodes (list) it 0 maxit (+ 60 (* 16 n)))
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

(defun st-style ( / )
  ;; στυλ σταθερού πλάτους για στοιχισμένους πίνακες
  (if (null (tblsearch "STYLE" "HEXIS_MONO"))
    (entmake (list (cons 0 "STYLE") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbTextStyleTableRecord") (cons 2 "HEXIS_MONO")
                   (cons 70 0) (cons 40 0.0) (cons 41 1.0) (cons 50 0.0)
                   (cons 71 0) (cons 42 2.5) (cons 3 "consola.ttf") (cons 4 "")))))

;; MTEXT - ένα αντικείμενο, αλλαγή γραμμής με \\P
(defun st-mtext (p h wid str lyr sty / el)
  (setq el (list (cons 0 "MTEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbMText")
                 (cons 10 (list (car p) (cadr p) 0.0))
                 (cons 40 h) (cons 41 wid) (cons 71 1) (cons 72 5)
                 (cons 7 (if sty sty "Standard"))))
  (while (> (strlen str) 250)
    (setq el (append el (list (cons 3 (substr str 1 250)))))
    (setq str (substr str 251)))
  (entmake (append el (list (cons 1 str)))))

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

;; ελάχιστη απόσταση σημείου από τις ΑΚΜΕΣ πολυγώνου
(defun st-dedge (p pts / n i a b dm d dx dy L2 tt)
  (setq n (length pts) i 0 dm nil)
  (while (< i n)
    (setq a (nth i pts) b (nth (rem (1+ i) n) pts))
    (setq dx (- (car b) (car a)) dy (- (cadr b) (cadr a)))
    (setq L2 (+ (* dx dx) (* dy dy)))
    (if (< L2 1e-12)
      (setq d (distance p a))
      (progn
        (setq tt (/ (+ (* (- (car p) (car a)) dx)
                       (* (- (cadr p) (cadr a)) dy)) L2))
        (if (< tt 0.0) (setq tt 0.0))
        (if (> tt 1.0) (setq tt 1.0))
        (setq d (distance p (list (+ (car a) (* tt dx)) (+ (cadr a) (* tt dy)))))))
    (if (or (null dm) (< d dm)) (setq dm d))
    (setq i (1+ i)))
  dm)

;; ΜΕΓΙΣΤΗ απόσταση του χείλους τρύπας από το περίγραμμα (δειγματοληψία)
;; -> εκεί η στέγη θα ήταν ΨΗΛΟΤΕΡΑ αν δεν υπήρχε η τρύπα
(defun st-holemax (hp pts step / n i a b LL k np d dm)
  (setq n (length hp) i 0 dm 0.0)
  (while (< i n)
    (setq a (nth i hp) b (nth (rem (1+ i) n) hp))
    (setq LL (distance a b) k 0)
    (setq np (max 1 (fix (/ LL step))))
    (while (<= k np)
      (setq d (st-dedge
                (list (+ (car a) (* (/ (float k) np) (- (car b) (car a))))
                      (+ (cadr a) (* (/ (float k) np) (- (cadr b) (cadr a)))))
                pts))
      (if (> d dm) (setq dm d))
      (setq k (1+ k)))
    (setq i (1+ i)))
  dm)

;; κέντρο βάρους πολυγώνου
(defun st-cen (pts / n cx cy q)
  (setq n (length pts) cx 0.0 cy 0.0)
  (foreach q pts (setq cx (+ cx (car q)) cy (+ cy (cadr q))))
  (list (/ cx n) (/ cy n)))

;; ΧΕΙΡΟΚΙΝΗΤΗ επιλογή τρυπών (με έλεγχο ότι είναι εντός περιγράμματος)
(defun st-pickholes (mainent pts / ss i e hp out nsk)
  (setq out (list) nsk 0)
  (princ "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03C4\U+03B9\U+03C2 \U+03A4\U+03A1\U+03A5\U+03A0\U+0395\U+03A3 (\U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AD\U+03C2 polylines) - Enter \U+03CC\U+03C4\U+03B1\U+03BD \U+03C4\U+03B5\U+03BB\U+03B5\U+03B9\U+03CE\U+03C3\U+03B5\U+03B9\U+03C2:")
  (setq ss (ssget (list (cons 0 "LWPOLYLINE"))))
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq e (ssname ss i))
        (if (and e (not (equal e mainent)))
          (progn
            (setq hp (st-clean (st-getpts e)))
            (cond
              ((< (length hp) 3) (setq nsk (1+ nsk)))
              ((not (st-allin hp pts))
                (setq nsk (1+ nsk))
                (princ "\n    ! Polyline \U+0395\U+039A\U+03A4\U+039F\U+03A3 \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 - \U+03C0\U+03B1\U+03C1\U+03B1\U+03BB\U+03B5\U+03AF\U+03C0\U+03B5\U+03C4\U+03B1\U+03B9."))
              (T (setq out (append out (list hp)))))))
        (setq i (1+ i)))))
  (princ (strcat "\n    \U+0395\U+03C0\U+03B9\U+03BB\U+03AD\U+03C7\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD " (itoa (length out)) " \U+03C4\U+03C1\U+03CD\U+03C0\U+03B5\U+03C2"
                 (if (> nsk 0) (strcat " (" (itoa nsk) " \U+03C0\U+03B1\U+03C1\U+03B1\U+03BB\U+03B5\U+03AF\U+03C6\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD)") "")))
  out)

;; ================= ΕΥΡΩΚΩΔΙΚΑΣ 1: ΦΟΡΤΙΑ =================
;; ΕΛΟΤ EN 1991-1-3 (χιονι) + EN 1991-1-4 (ανεμος), Ελληνικο Εθνικο Προσαρτημα
;; ΖΩΝΕΣ ΧΙΟΝΙΟΥ: I=0.4 (Αρκαδια/Ηλεια/Λακωνια/Μεσσηνια + νησια πλην
;;   Σποραδων-Ευβοιας) · II=1.7 (Μαγνησια/Φθιωτιδα/Καρδιτσα/Τρικαλα/
;;   Λαρισα/Σποραδες/Ευβοια) · III=0.8 (υπολοιπη χωρα)
;; ΑΝΕΜΟΣ: vb,0 = 33 m/s νησια & παραλια <10km · 27 m/s υπολοιπη χωρα

(defun ec-sk0 (z)
  (cond ((= z 1) 0.4) ((= z 2) 1.7) (T 0.8)))

(defun ec-sk (z alt) (* (ec-sk0 z) (+ 1.0 (* (/ alt 917.0) (/ alt 917.0)))))

(defun ec-mu1 (adeg)
  (cond ((<= adeg 30.0) 0.8)
        ((< adeg 60.0) (* 0.8 (/ (- 60.0 adeg) 30.0)))
        (T 0.0)))

(defun ec-terr (k)
  (cond ((= k 0) (list 0.003 1.0)) ((= k 1) (list 0.01 1.0))
        ((= k 2) (list 0.05 2.0))  ((= k 3) (list 0.30 5.0))
        (T (list 1.0 10.0))))

(defun ec-qp (vb0 terr z / tp z0 zmn ze kr cr vm iv)
  (setq tp (ec-terr terr) z0 (car tp) zmn (cadr tp))
  (setq ze (max z zmn))
  (setq kr (* 0.19 (expt (/ z0 0.05) 0.07)))
  (setq cr (* kr (log (/ ze z0))))
  (setq vm (* cr 1.0 vb0))
  (setq iv (/ 1.0 (log (/ ze z0))))
  (list (/ (* (+ 1.0 (* 7.0 iv)) 0.5 1.25 vm vm) 1000.0) vm cr iv))

(defun ec-interp (a tbl / i n a1 a2 v1 v2 r)
  (setq n (length tbl) i 0 r (cadr (nth 0 tbl)))
  (if (>= a (car (nth (1- n) tbl))) (setq r (cadr (nth (1- n) tbl)))
    (while (< i (1- n))
      (setq a1 (car (nth i tbl)) a2 (car (nth (1+ i) tbl)))
      (if (and (>= a a1) (<= a a2))
        (progn
          (setq v1 (cadr (nth i tbl)) v2 (cadr (nth (1+ i) tbl)))
          (setq r (+ v1 (* (- v2 v1) (if (> (- a2 a1) 1e-9) (/ (- a a1) (- a2 a1)) 0.0))))
          (setq i n)))
      (setq i (1+ i))))
  r)

;; cpe,10 δικλινους στεγης, θ=0 (EN 1991-1-4 Πιν.7.4a) - ζωνες F/G/H
(defun ec-cpe (adeg)
  (list
    (ec-interp adeg (list (list 5.0 -1.7) (list 15.0 -0.9) (list 30.0 -0.5)
                          (list 45.0 0.0) (list 60.0 0.7) (list 75.0 0.8)))
    (ec-interp adeg (list (list 5.0 -1.2) (list 15.0 -0.8) (list 30.0 -0.5)
                          (list 45.0 0.0) (list 60.0 0.7) (list 75.0 0.8)))
    (ec-interp adeg (list (list 5.0 -0.6) (list 15.0 -0.3) (list 30.0 -0.2)
                          (list 45.0 0.0) (list 60.0 0.7) (list 75.0 0.8)))
    (ec-interp adeg (list (list 5.0 0.0) (list 15.0 0.2) (list 30.0 0.4)
                          (list 45.0 0.6) (list 60.0 0.7) (list 75.0 0.8)))))

;; ---- ΙΔΙΟ ΒΑΡΟΣ ΣΤΕΓΗΣ απο τις ΠΡΑΓΜΑΤΙΚΕΣ στρωσεις (kN/m2) ----
(defun ec-gk (adeg / g)
  (setq g 0.0)
  (setq g (+ g (* 0.11 *tm-KER*)))
  (setq g (+ g (* (/ (* (/ *tm-TEG* 100.0) (/ *tm-TEG* 100.0)) *tm-DZ*) 4.2)))
  (setq g (+ g (* (/ (* (/ *tm-EPI* 100.0) (/ *tm-EPI* 100.0)) *tm-DIST*) 4.2)))
  (setq g (+ g (* (/ *tm-TTH* 100.0) 1.2)))
  (setq g (+ g (* (/ *tm-PET* 100.0) 4.2)))
  (setq g (+ g (* (/ (* (/ *tm-AMB* 100.0) (/ *tm-AM* 100.0)) *tm-DIST*) 4.2)))
  (setq g (+ g *ec-GEXT*))
  g)

;; ---- EC1 φορτια + ΠΡΟΚΑΤΑΡΚΤΙΚΟΣ ελεγχος EC5 ----
(defun ec-calc (adeg Lraf e dz / ca sk mu s qpr qp cpe wF wH wHp gk
                 qd qup MEd W sig kmod fmk fmd util Iy defl dlim
                 qtg Mtg Wtg sigtg utiltg)
  (setq ca (cos (* adeg (/ pi 180.0))))
  (setq sk (ec-sk *ec-ZONE* *ec-ALT*))
  (setq mu (ec-mu1 adeg))
  (setq s (* mu *ec-CE* *ec-CT* sk))
  (setq qpr (ec-qp *ec-VB0* *ec-TERR* *ec-H*))
  (setq qp (car qpr))
  (setq cpe (ec-cpe adeg))
  (setq wF (* qp (nth 0 cpe)) wH (* qp (nth 2 cpe)) wHp (* qp (nth 3 cpe)))
  (setq gk (ec-gk adeg))
  (setq qd (* e (+ (* (* 1.35 gk) ca) (* (* 1.5 s) ca ca) (* 1.5 0.6 (max 0.0 wHp)))))
  (setq qup (* e (+ (* (* 1.0 gk) ca) (* 1.5 wF))))
  (setq MEd (/ (* qd Lraf Lraf) 8.0))
  (setq W (/ (* (/ *tm-AMB* 100.0) (/ *tm-AM* 100.0) (/ *tm-AM* 100.0)) 6.0))
  (setq sig (/ (/ MEd W) 1000.0))
  (setq kmod 0.90)
  (setq fmk *ec-FMK*)
  (setq fmd (/ (* kmod fmk) 1.30))
  (setq util (/ sig fmd))
  (setq Iy (/ (* (/ *tm-AMB* 100.0) (expt (/ *tm-AM* 100.0) 3)) 12.0))
  (setq defl (/ (* 5.0 (* e (+ (* gk ca) (* s ca ca))) (expt Lraf 4))
                (* 384.0 11000000.0 Iy)))
  (setq dlim (/ Lraf 300.0))
  (setq qtg (* dz (+ (* (* 1.35 gk) ca) (* (* 1.5 s) ca ca))))
  (setq Mtg (/ (* qtg *tm-DIST* *tm-DIST*) 8.0))
  (setq Wtg (/ (* (/ *tm-TEG* 100.0) (/ *tm-TEG* 100.0) (/ *tm-TEG* 100.0)) 6.0))
  (setq sigtg (/ (/ Mtg Wtg) 1000.0))
  (setq utiltg (/ sigtg fmd))
  (list sk mu s qp (car (cdr qpr)) wF wH wHp gk qd qup MEd sig fmd util
        defl dlim Mtg sigtg utiltg))

;; ---- ΟΜΑΔΟΠΟΙΗΣΗ ΜΕΛΩΝ ΑΝΑ ΜΗΚΟΣ -> ((μηκος πληθος) ...) ----
(defun xy-grp (mem step / lens m)
  (setq lens (list))
  (foreach m mem (setq lens (append lens (list (car m)))))
  (st-group lens step))

;; δείκτης ομάδας για μήκος L
(defun xy-gidx (L grp step / i n r)
  (setq n (length grp) i 0 r 1)
  (while (< i n)
    (if (< (abs (- L (car (nth i grp)))) (* step 0.6)) (setq r (1+ i)))
    (setq i (1+ i)))
  r)

;; ετικέτα ξύλου: κωδικός + διατομή, περιστραμμένη κατά μήκος του μέλους
(defun xy-lab (p1 p2 txt h lyr / a mp LL)
  (setq LL (distance p1 p2))
  (if (> LL (* h 1.0))
    (progn
      (setq a (angle p1 p2))
      (if (> a (* 0.5 pi)) (setq a (- a pi)))
      (if (< a (* -0.5 pi)) (setq a (+ a pi)))
      (setq mp (list (/ (+ (car p1) (car p2)) 2.0) (/ (+ (cadr p1) (cadr p2)) 2.0)))
      (tm-txtrot (tm-off mp a (* h 0.75)) h txt a lyr))))

;; ---- ΚΥΡΙΑ ΣΥΝΑΡΤΗΣΗ ΞΥΛΟΤΥΠΟΥ ----
;; eav = πολύγωνο υδρορροής (γείσο ή τοίχος), holes = τρύπες,
;; darcs = σχεδιασμένα τόξα σκελετού, dx/dy = μετατόπιση, dist/dz = βήματα
(defun st-xylo (eav holes darcs dx dy dist dz txh / segs esg n i a b LL dr nv
                 sst pp tt m u k q1 q2 nam nte hp lyr cnt
                 mA mT mD mS mZ gA gT gD gS gZ hh sec1 sec2 sec3 sec4 sec5 stp
                 fcs fseg)
  (st-layer "XYLO-PERIGR" 8)
  (st-layer "XYLO-AMEIB"  3)
  (st-layer "XYLO-TEGID"  4)
  (st-layer "XYLO-DOKOI"  1)
  (st-layer "XYLO-STROT"  2)
  (st-layer "XYLO-TXT"    6)
  (setq segs (list))
  (foreach a darcs (setq segs (append segs (list (list (car a) (cadr a))))))
  ;; ΕΔΡΕΣ: καθε αμειβοντας/τεγιδα ΠΡΕΠΕΙ να μενει μεσα στην εδρα του,
  ;; αλλιως οι δοκοι περνανε απο εδρα σε εδρα (λαθος ξυλοτυπος).
  (setq fcs (an-faces eav segs))
  (setq mA (list) mT (list) mD (list) mS (list) mZ (list) stp 0.05)
  (setq hh (* txh 0.62))
  (setq sec1 (strcat (rtos *tm-AMB* 2 0) "x" (rtos *tm-AM* 2 0)))
  (setq sec2 (strcat (rtos *tm-TEG* 2 0) "x" (rtos *tm-TEG* 2 0)))
  (setq sec3 (strcat (rtos *tm-KOR* 2 0) "x" (rtos *tm-KORH* 2 0)))
  (setq sec4 (strcat (rtos *tm-STR* 2 0) "x" (rtos *tm-STR* 2 0)))
  (setq sec5 (strcat (rtos *tm-EL* 2 0) "x" (rtos *tm-EL* 2 0)))

  ;; ---------- ΦΑΣΗ 1: ΣΥΛΛΟΓΗ ΜΕΛΩΝ ----------
  ;; δοκοί σκελετού
  (foreach a darcs
    (setq mD (append mD (list (list (distance (car a) (cadr a)) (car a) (cadr a))))))
  ;; περίγραμμα -> στρωτήρες
  (setq n (length eav) i 0)
  (while (< i n)
    (setq a (nth i eav) b (nth (rem (1+ i) n) eav))
    (setq mS (append mS (list (list (distance a b) a b))))
    (setq i (1+ i)))
  ;; αμείβοντες + τεγίδες
  (setq n (length eav) i 0)
  (while (< i n)
    (setq a (nth i eav) b (nth (rem (1+ i) n) eav) LL (distance a b))
    (if (> LL 1e-6)
      (progn
        (setq dr (list (/ (- (car b) (car a)) LL) (/ (- (cadr b) (cadr a)) LL)))
        (setq nv (list (- 0.0 (cadr dr)) (car dr)))
        ;; ακτινοβολια ΜΟΝΟ στο περιγραμμα της εδρας
        (setq fseg (an-pick fcs a b))
        (setq fseg (if fseg (xy-segs fseg) segs))
        (setq sst (/ dist 2.0))
        (while (< sst LL)
          (setq pp (list (+ (car a) (* (car dr) sst)) (+ (cadr a) (* (cadr dr) sst))))
          (setq tt (xy-near pp nv fseg))
          (if (and tt (> tt 0.01))
            (setq mA (append mA (list (list tt pp
              (list (+ (car pp) (* (car nv) tt)) (+ (cadr pp) (* (cadr nv) tt))))))))
          (setq sst (+ sst dist)))
        (setq m (list (/ (+ (car a) (car b)) 2.0) (/ (+ (cadr a) (cadr b)) 2.0)))
        (setq tt (xy-near m nv fseg))
        (if tt
          (progn
            (setq u dz)
            (while (< u tt)
              (setq pp (list (+ (car m) (* (car nv) u)) (+ (cadr m) (* (cadr nv) u))))
              (setq q1 (xy-near pp dr fseg))
              (setq q2 (xy-near pp (list (- 0.0 (car dr)) (- 0.0 (cadr dr))) fseg))
              (if (and q1 q2)
                (setq mT (append mT (list (list (+ q1 q2)
                  (list (+ (car pp) (* (car dr) q1)) (+ (cadr pp) (* (cadr dr) q1)))
                  (list (- (car pp) (* (car dr) q2)) (- (cadr pp) (* (cadr dr) q2))))))))
              (setq u (+ u dz)))))))
    (setq i (1+ i)))
  ;; ελκυστήρες ζευκτών
  (setq esg (xy-segs eav))
  (foreach hp holes (setq esg (append esg (xy-segs hp))))
  (foreach q1 *st-TRP*
    (setq pp (car q1) nv (cadr q1))
    (setq tt (xy-near pp nv esg)
          q2 (xy-near pp (list (- 0.0 (car nv)) (- 0.0 (cadr nv))) esg))
    (if (and tt q2)
      (setq mZ (append mZ (list (list (+ tt q2)
        (list (+ (car pp) (* (car nv) tt)) (+ (cadr pp) (* (cadr nv) tt)))
        (list (- (car pp) (* (car nv) q2)) (- (cadr pp) (* (cadr nv) q2)))))))))

  ;; ---------- ΦΑΣΗ 2: ΟΜΑΔΟΠΟΙΗΣΗ ----------
  (setq gA (xy-grp mA stp) gT (xy-grp mT stp) gD (xy-grp mD stp)
        gS (xy-grp mS stp) gZ (xy-grp mZ stp))
  (setq *st-XSCH* (list (list "A" sec1 gA) (list "T" sec2 gT)
                        (list "D" sec3 gD) (list "S" sec4 gS) (list "Z" sec5 gZ)))

  ;; ---------- ΦΑΣΗ 3: ΣΧΕΔΙΑΣΗ ----------
  (setq q1 (list))
  (foreach pp eav (setq q1 (append q1 (list (xy-mv pp dx dy)))))
  (st-pline q1 "XYLO-PERIGR")
  (foreach hp holes
    (setq q2 (list))
    (foreach pp hp (setq q2 (append q2 (list (xy-mv pp dx dy)))))
    (st-pline q2 "XYLO-PERIGR"))

  (foreach a (list (list mA gA "A" sec1 "XYLO-AMEIB")
                   (list mT gT "T" sec2 "XYLO-TEGID")
                   (list mD gD "D" sec3 "XYLO-DOKOI")
                   (list mS gS "S" sec4 "XYLO-STROT")
                   (list mZ gZ "Z" sec5 "XYLO-STROT"))
    (foreach m (car a)
      (setq pp (xy-mv (cadr m) dx dy) q2 (xy-mv (caddr m) dx dy))
      (st-line pp q2 (nth 4 a))
      (if (= *st-XMK* "1")
        (xy-lab pp q2
          (strcat (caddr a) (itoa (xy-gidx (car m) (cadr a) stp)) " " (nth 3 a))
          hh "XYLO-TXT"))))

  ;; --- ΔΗΛΩΣΗ ΟΡΙΩΝ ΠΑΝΩ ΣΤΟΝ ΞΥΛΟΤΥΠΟ ---
  (st-style)
  (setq pp (list (car (car eav)) (cadr (car eav))))
  (foreach q2 eav
    (if (< (car q2) (car pp)) (setq pp (list (car q2) (cadr pp))))
    (if (< (cadr q2) (cadr pp)) (setq pp (list (car pp) (cadr q2)))))
  (st-mtext (xy-mv (list (car pp) (- (cadr pp) (* txh 3.0))) dx dy)
    (* txh 0.8) (* txh 0.8 90.0)
    (strcat "{\\C1;\U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3 \U+03A3\U+03A4\U+0395\U+0393\U+0397\U+03A3 - \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 / \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397}\\P"
            "\U+039F\U+03B9 \U+03B4\U+03B9\U+03B1\U+03C4\U+03BF\U+03BC\U+03B5\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03C4\U+03B1 \U+03BC\U+03B7\U+03BA\U+03B7 \U+03B5\U+03B9\U+03BD\U+03B1\U+03B9 \U+03A0\U+03A1\U+039F\U+039A\U+0391\U+03A4\U+0391\U+03A1\U+039A\U+03A4\U+0399\U+039A\U+0391 \U+03BA\U+03B1\U+03B9 \U+03B1\U+03C6\U+03BF\U+03C1\U+03BF\U+03C5\U+03BD \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397.\\P"
            "\U+0394\U+0395\U+039D \U+03A5\U+03A0\U+039F\U+039A\U+0391\U+0398\U+0399\U+03A3\U+03A4\U+0391 \U+03A4\U+0397 \U+03A3\U+03A4\U+0391\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397, \U+03B7 \U+03BF\U+03C0\U+03BF\U+03B9\U+03B1 \U+03B5\U+03BA\U+03C0\U+03BF\U+03BD\U+03B5\U+03B9\U+03C4\U+03B1\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03C5\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B5\U+03C4\U+03B1\U+03B9\\P"
            "\U+03B1\U+03C0\U+03BF \U+03B5\U+03BE\U+03BF\U+03C5\U+03C3\U+03B9\U+03BF\U+03B4\U+03BF\U+03C4\U+03B7\U+03BC\U+03B5\U+03BD\U+03BF \U+03A0\U+03BF\U+03BB\U+03B9\U+03C4\U+03B9\U+03BA\U+03BF \U+039C\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03BF, \U+03BC\U+03B5\U+03BB\U+03BF\U+03C2 \U+03A4.\U+0395.\U+0395., \U+03BA\U+03B1\U+03C4\U+03B1 EN 1995-1-1.")
    "XYLO-TXT" "HEXIS_MONO")
  (setq nam (length mA) nte (length mT) cnt (length mZ))
  (list nam nte cnt))

;; ================= ΞΥΛΟΤΥΠΟΣ =================

;; τομή ημιευθείας (p,v) με τμήμα (a,b) -> παράμετρος t ή nil
(defun xy-hit (p v a b / dx2 dy2 det ax ay tt ss)
  (setq dx2 (- (car b) (car a)) dy2 (- (cadr b) (cadr a)))
  (setq det (- (* (car v) dy2) (* (cadr v) dx2)))
  (if (< (abs det) 1e-12) nil
    (progn
      (setq ax (- (car a) (car p)) ay (- (cadr a) (cadr p)))
      (setq tt (/ (- (* ax dy2) (* ay dx2)) det))
      (setq ss (/ (- (* ax (cadr v)) (* ay (car v))) det))
      (if (and (> tt 1e-7) (> ss -1e-6) (< ss 1.000001)) tt nil))))

;; πλησιέστερη τομή με λίστα τμημάτων
(defun xy-near (p v segs / best t2 a)
  (setq best nil)
  (foreach a segs
    (setq t2 (xy-hit p v (car a) (cadr a)))
    (if (and t2 (or (null best) (< t2 best))) (setq best t2)))
  best)

;; πολύγωνο -> λίστα τμημάτων
(defun xy-segs (pts / n i out)
  (setq n (length pts) i 0 out (list))
  (while (< i n)
    (setq out (append out (list (list (nth i pts) (nth (rem (1+ i) n) pts)))))
    (setq i (1+ i)))
  out)

;; μετατόπιση σημείου
(defun xy-mv (p dx dy) (list (+ (car p) dx) (+ (cadr p) dy)))

;; σημείο ΕΝΤΟΣ πολυγώνου (ray casting)
(defun st-inpoly (p pts / n i a b c x y ya yb xx dy)
  (setq n (length pts) i 0 c nil x (car p) y (cadr p))
  (while (< i n)
    (setq a (nth i pts) b (nth (rem (1+ i) n) pts))
    (setq ya (> (cadr a) y) yb (> (cadr b) y))
    (if (or (and ya (not yb)) (and yb (not ya)))
      (progn
        (setq dy (- (cadr b) (cadr a)))
        (if (> (abs dy) 1e-12)
          (progn
            (setq xx (+ (car a) (/ (* (- (car b) (car a)) (- y (cadr a))) dy)))
            (if (< x xx) (setq c (not c)))))))
    (setq i (1+ i)))
  c)

;; όλες οι κορυφές του hp είναι μέσα στο pts;
(defun st-allin (hp pts / r q)
  (setq r T)
  (foreach q hp (if (not (st-inpoly q pts)) (setq r nil)))
  r)

;; είναι το p κορυφή κάποιας ΤΡΥΠΑΣ;
(defun st-hidx (p holes / r hp q)
  (setq r nil)
  (foreach hp holes
    (foreach q hp
      (if (and (null r) (< (distance p q) 1e-6)) (setq r T))))
  r)

(defun st-isrfx (pts i / n a c b)
  (setq n (length pts))
  (setq a (nth (rem (+ i (1- n)) n) pts) c (nth i pts) b (nth (rem (1+ i) n) pts))
  (< (- (* (- (car c) (car a)) (- (cadr b) (cadr c)))
        (* (- (cadr c) (cadr a)) (- (car b) (car c)))) -1e-9))

;; ταξινόμηση αριθμών (αύξουσα)
(defun st-sortn (lst / out mn rest found x)
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

;; ομαδοποίηση ανοιγμάτων ανά βήμα -> ((άνοιγμα πλήθος) ...)
(defun st-group (lst step / srt out cur cnt v key)
  (setq srt (st-sortn lst) out (list) cur nil cnt 0)
  (foreach v srt
    (setq key (* step (fix (+ 0.5 (/ v step)))))
    (if (and cur (< (abs (- key cur)) (* step 0.4)))
      (setq cnt (1+ cnt))
      (progn
        (if cur (setq out (append out (list (list cur cnt)))))
        (setq cur key cnt 1))))
  (if cur (setq out (append out (list (list cur cnt)))))
  out)

;; παράμετρος t (=ύψος/κλίση) κόμβου στη θέση P
(defun st-tnode (P nodes / r nd)
  (setq r nil)
  (foreach nd nodes
    (if (and (null r) (< (distance P (car nd)) 1e-4)) (setq r (cadr nd))))
  r)

;; περίμετρος κλειστού πολυγώνου
(defun st-perim (pts / n i a)
  (setq n (length pts) a 0.0 i 0)
  (while (< i n)
    (setq a (+ a (distance (nth i pts) (nth (rem (1+ i) n) pts))))
    (setq i (1+ i)))
  a)

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
  (write-line "      : edit_box { key = \"hcap\"; label = \"\U+039C\U+03AD\U+03B3. \U+03C5\U+03C8\U+03CC\U+03BC. \U+03A4\U+0395\U+039B\U+0395\U+0399\U+03A9\U+039C. \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC (0=\U+03C7\U+03C9\U+03C1\U+03AF\U+03C2):\"; edit_width = 8; }" f)
  (write-line "      : toggle { key = \"gei\"; label = \"\U+03A3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7 \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF\U+03C5\"; value = \"1\"; }" f)
  (write-line "      : toggle { key = \"lab\"; label = \"\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 \U+03BA\U+03CC\U+03BC\U+03B2\U+03C9\U+03BD\"; value = \"1\"; }" f)
  (write-line "      : toggle { key = \"tomi\"; label = \"\U+039A\U+03B1\U+03B9 \U+03BB\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03AD\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2 (STEGHTOMI)\"; }" f)
  (write-line "      : toggle { key = \"xyl\"; label = \"\U+039A\U+03B1\U+03B9 \U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3 (\U+03B1\U+03BD\U+03AC\U+03C0\U+03C4\U+03C5\U+03BE\U+03B7 \U+03BE\U+03CD\U+03BB\U+03C9\U+03BD)\"; }" f)
  (write-line "      : toggle { key = \"xmk\"; label = \"\U+03A3\U+03AE\U+03BC\U+03B1\U+03BD\U+03C3\U+03B7 \U+03BE\U+03CD\U+03BB\U+03C9\U+03BD (\U+03BA\U+03C9\U+03B4\U+03B9\U+03BA\U+03CC\U+03C2 + \U+03B4\U+03B9\U+03B1\U+03C4\U+03BF\U+03BC\U+03AE)\"; value = \"1\"; }" f)
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
  (setq *st-HCAP* (atof (get_tile "hcap")))
  (st-prev))

;; ===================== ΕΝΤΟΛΗ STEGH =====================
(defun C:STEGH ( / *error* ent pts orig n dclpath dclid status
                   th ovh res arcs nodes lab gpts hmax i j
                   htmx havl hlo hhi hkk hmm hfin
                   a b ia ib lyr txh hh cnt1 cnt2 cnt3
                   lowp bi bd pm dd pa pb eang p0 nds sumA nd p
                   xchk badv conn bv usedcl kw v pa2 pb2 lmx lnt lkr
                   t1 t2 ll kk ff holes hss hi he hp ha hb cnt4 ltr
                   hcand hed hkw bldup hmarg hn hdm hstru hsti hc
                   xp xx0 yy0 xres)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (progn
        (princ (strcat "\n*** \U+03A3\U+03A6\U+0391\U+039B\U+039C\U+0391 STEGH v8.4 ***"))
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
  (st-layer "STEGH-TRYPA"  30)

  (setq *st-STEP* "2 - \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03B7 polyline (entsel)")
  (princ "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+039A\U+039B\U+0395\U+0399\U+03A3\U+03A4\U+0397 polyline \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2:")
  (setq ent (entsel))
  (if (null ent) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq *st-STEP* "3 - \U+03B1\U+03BD\U+03B1\U+03B3\U+03BD\U+03C9\U+03C3\U+03B7 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03C9\U+03BD (st-getpts)")
  (setq pts (st-getpts (car ent)))
  (if (< (length pts) 3)
    (progn (princ "\n\U+03A7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 \U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD 3 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2.") (exit)))
  ;; --- ΤΡΥΠΕΣ: ΑΥΤΟΜΑΤΗ ανίχνευση κλειστών polylines ΜΕΣΑ στο περίγραμμα ---
  (setq *st-STEP* "3b - \U+03B1\U+03C5\U+03C4\U+03BF\U+03BC\U+03B1\U+03C4\U+03B7 \U+03B1\U+03BD\U+03B9\U+03C7\U+03BD\U+03B5\U+03C5\U+03C3\U+03B7 \U+03C4\U+03C1\U+03C5\U+03C0\U+03C9\U+03BD")
  (setq holes (list) hcand (list))
  (setq hss (ssget "X" (list (cons 0 "LWPOLYLINE"))))
  (if hss
    (progn
      (setq hi 0)
      (while (< hi (sslength hss))
        (setq he (ssname hss hi))
        (if (and he (not (equal he (car ent))))
          (progn
            (setq hed (entget he))
            ;; μόνο ΚΛΕΙΣΤΕΣ
            (if (and (assoc 70 hed) (= 1 (logand 1 (cdr (assoc 70 hed)))))
              (progn
                (setq hp (st-clean (st-getpts he)))
                (if (and (>= (length hp) 3) (st-allin hp pts))
                  (setq hcand (append hcand (list hp))))))))
        (setq hi (1+ hi)))))
  (if hcand
    (progn
      (princ (strcat "\n>>> \U+0392\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03B1\U+03C5\U+03C4\U+03CC\U+03BC\U+03B1\U+03C4\U+03B1 " (itoa (length hcand))
                     " \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AD\U+03C2 polylines \U+039C\U+0395\U+03A3\U+0391 \U+03C3\U+03C4\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1."))
      (initget "Ola Kamia Epilogi")
      (setq hkw (getkword
        "\n\U+03A4\U+03C1\U+03CD\U+03C0\U+03B5\U+03C2 (\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF/\U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF) [Ola/Kamia/Epilogi] <Ola>: "))
      (cond
        ((= hkw "Kamia") (princ "\n    \U+0391\U+03B3\U+03BD\U+03BF\U+03BF\U+03CD\U+03BD\U+03C4\U+03B1\U+03B9 - \U+03C0\U+03BB\U+03AE\U+03C1\U+03B7\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7."))
        ((= hkw "Epilogi") (setq holes (st-pickholes (car ent) pts)))
        (T (setq holes hcand)
           (princ (strcat "\n    \U+03A7\U+03C1\U+03B7\U+03C3\U+03B9\U+03BC\U+03BF\U+03C0\U+03BF\U+03B9\U+03BF\U+03CD\U+03BD\U+03C4\U+03B1\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03BF\U+03B9 "
                          (itoa (length hcand)) ".")))))
    (progn
      (initget "Nai Ochi")
      (setq hkw (getkword
        "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03C4\U+03C1\U+03CD\U+03C0\U+03B5\U+03C2 \U+03B1\U+03C5\U+03C4\U+03CC\U+03BC\U+03B1\U+03C4\U+03B1. \U+03A7\U+03B5\U+03B9\U+03C1\U+03BF\U+03BA\U+03AF\U+03BD\U+03B7\U+03C4\U+03B7 \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE [Nai/Ochi] <Ochi>: "))
      (if (= hkw "Nai") (setq holes (st-pickholes (car ent) pts)))))

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
      (set_tile "hcap" (rtos (if *st-HCAP* *st-HCAP* 0.0) 2 2))
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
      (action_tile "hcap"  "(st-upd)")
      (action_tile "accept"
        "(st-upd) (setq *st-GEI* (get_tile \"gei\")) (setq *st-LAB* (get_tile \"lab\")) (setq *st-TOMI* (get_tile \"tomi\")) (setq *st-XYL* (get_tile \"xyl\")) (setq *st-XMK* (get_tile \"xmk\")) (done_dialog 1)")
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
      (setq v (getreal (strcat "\n\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03BF \U+03C5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03A4\U+0395\U+039B\U+0395\U+0399\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A5 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03CC\U+03C1\U+03B9\U+03BF) <" (rtos (if *st-HCAP* *st-HCAP* 0.0) 2 2) ">: ")))
      (if v (setq *st-HCAP* v))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+03A5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 \U+03BA\U+03BF\U+03BC\U+03B2\U+03C9\U+03BD [Nai/Ochi] <Nai>: "))
      (setq *st-LAB* (if (= kw "Ochi") "0" "1"))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+039D\U+03B1 \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03B1\U+03C3\U+03C4\U+03B5\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03BB\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03B5\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03B7\U+03C2 [Nai/Ochi] <Ochi>: "))
      (setq *st-TOMI* (if (= kw "Nai") "1" "0"))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+039D\U+03B1 \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03B1\U+03C3\U+03C4\U+03B5\U+03B9 \U+03BA\U+03B1\U+03B9 \U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3 [Nai/Ochi] <Ochi>: "))
      (setq *st-XYL* (if (= kw "Nai") "1" "0"))
      (if (= *st-XYL* "1")
        (progn
          (initget "Nai Ochi")
          (setq kw (getkword "\n\U+03A3\U+03B7\U+03BC\U+03B1\U+03BD\U+03C3\U+03B7 \U+03BE\U+03C5\U+03BB\U+03C9\U+03BD \U+03C3\U+03C4\U+03BF\U+03BD \U+03BE\U+03C5\U+03BB\U+03BF\U+03C4\U+03C5\U+03C0\U+03BF [Nai/Ochi] <Nai>: "))
          (setq *st-XMK* (if (= kw "Ochi") "0" "1"))))
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
      (setq *st-STEP* (strcat "11 - \U+0395\U+03A0\U+0399\U+039B\U+03A5\U+03A3\U+0397 \U+03A3\U+03A4\U+0395\U+0393\U+0397\U+03A3 ("
                              (itoa (length holes)) " \U+03C4\U+03C1\U+03C5\U+03C0\U+03B5\U+03C2)"))
      (setq res (st-skel (if holes (append (list orig) holes) orig)))
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

  ;; --- ΜΕΓΙΣΤΟ ΥΨΟΣ ΤΕΛΕΙΩΜΕΝΟΥ ΚΟΡΦΙΑ: ελεύθερη προσαρμογή κλίσης ---
  ;; Τελειωμένος κορφιάς = ΒΑΣΗ + tmax*κλίση + 0.42/συν(α), όπου 0.42 m η
  ;; επικάλυψη κάθετα στην έδρα (ίδια παραδοχή με τα στηθαία). Το tmax
  ;; (απόσταση κορφιά-υδρορροής στην κάτοψη) εξαρτάται ΜΟΝΟ από τη
  ;; γεωμετρία, όχι από την κλίση -> η μέγιστη κλίση λύνεται με διχοτόμηση
  ;; και στρογγυλεύεται ΠΡΟΣ ΤΑ ΚΑΤΩ στο 0.1% ώστε να μην ξεπερνιέται ποτέ.
  (if (and *st-HCAP* (> *st-HCAP* 0.0) nodes)
    (progn
      (setq htmx 0.0)
      (foreach nd nodes (if (> (cadr nd) htmx) (setq htmx (cadr nd))))
      (setq havl (- *st-HCAP* *st-BASE*))
      (if (<= havl (+ (* htmx 0.02) (* 0.42 (sqrt 1.0004))))
        (progn
          (princ (strcat "\n*** \U+03A3\U+03A6\U+0391\U+039B\U+039C\U+0391: \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC " (rtos *st-HCAP* 2 2)
                         " \U+03B4\U+03B5\U+03BD \U+03B5\U+03C0\U+03B1\U+03C1\U+03BA\U+03B5\U+03AF \U+03BF\U+03CD\U+03C4\U+03B5 \U+03B3\U+03B9\U+03B1 \U+03B5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B7 \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 \U+2014 \U+03BC\U+03CC\U+03BD\U+03BF \U+03B7 \U+03B5\U+03C0\U+03B9\U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 \U+03B8\U+03AD\U+03BB\U+03B5\U+03B9 ~0.42 m. \U+0391\U+03BD\U+03AD\U+03B2\U+03B1\U+03C3\U+03B5 \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03AE \U+03AC\U+03BB\U+03BB\U+03B1\U+03BE\U+03B5 \U+03B3\U+03B5\U+03C9\U+03BC\U+03B5\U+03C4\U+03C1\U+03AF\U+03B1."))
          (exit))
        (if (> (+ (* htmx th) (* 0.42 (sqrt (+ 1.0 (* th th))))) (+ havl 1e-9))
          (progn
            (setq hlo 0.02 hhi th hkk 0)
            (while (< hkk 60)
              (setq hmm (/ (+ hlo hhi) 2.0))
              (if (<= (+ (* htmx hmm) (* 0.42 (sqrt (+ 1.0 (* hmm hmm))))) havl)
                (setq hlo hmm) (setq hhi hmm))
              (setq hkk (1+ hkk)))
            (setq th (/ (float (fix (* hlo 1000.0))) 1000.0))
            (setq *st-PIT* (if (= *st-PMODE* "PCT") (* 100.0 th)
                             (/ (atan th) (/ pi 180.0))))
            (princ (strcat "\n>>> \U+039A\U+03BB\U+03AF\U+03C3\U+03B7 \U+03C0\U+03C1\U+03BF\U+03C3\U+03B1\U+03C1\U+03BC\U+03CC\U+03C3\U+03C4\U+03B7\U+03BA\U+03B5 \U+03C3\U+03B5 " (rtos (* 100.0 th) 2 1)
                           "% \U+03CE\U+03C3\U+03C4\U+03B5 \U+03BF \U+03A4\U+0395\U+039B\U+0395\U+0399\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A3 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03C2 (\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC + \U+03B5\U+03C0\U+03B9\U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 0.42/\U+03C3\U+03C5\U+03BD\U+03B1) \U+03BD\U+03B1 \U+03BC\U+03B7\U+03BD \U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03AC \U+03C4\U+03BF +"
                           (rtos *st-HCAP* 2 2))))))))

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
  (setq cnt1 0 cnt2 0 cnt3 0 cnt4 0 lmx 0.0 lnt 0.0 lkr 0.0 ltr 0.0)
  (setq *st-DARCS* (list))
  (foreach a arcs
    (setq ia (st-vidx (car a) orig) ib (st-vidx (cadr a) orig))
    (setq ha (st-hidx (car a) holes) hb (st-hidx (cadr a) holes))
    (setq lyr
      (cond
        ((and ia (st-isrfx orig ia)) "STEGH-NTERES")
        ((and ib (st-isrfx orig ib)) "STEGH-NTERES")
        ((or ha hb)                  "STEGH-TRYPA")
        ((or ia ib)                  "STEGH-MAXIA")
        (T                           "STEGH-KORFIAS")))
    (cond ((= lyr "STEGH-NTERES") (setq cnt2 (1+ cnt2)))
          ((= lyr "STEGH-MAXIA")  (setq cnt1 (1+ cnt1)))
          ((= lyr "STEGH-TRYPA")  (setq cnt4 (1+ cnt4)))
          (T                      (setq cnt3 (1+ cnt3))))
    (setq pa (if (and ia gpts) (nth ia gpts) (car a)))
    (setq pb (if (and ib gpts) (nth ib gpts) (cadr a)))
    ;; μήκη ανά είδος -> προμέτρηση ειδικών τεμαχίων
    (cond ((= lyr "STEGH-NTERES") (setq lnt (+ lnt (distance pa pb))))
          ((= lyr "STEGH-MAXIA")  (setq lmx (+ lmx (distance pa pb))))
          ((= lyr "STEGH-TRYPA")  (setq ltr (+ ltr (distance pa pb))))
          (T                      (setq lkr (+ lkr (distance pa pb)))))
    (setq *st-DARCS* (append *st-DARCS* (list (list pa pb lyr))))
    (st-line pa pb lyr))

  (setq *st-STEP* "15 - \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 + \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF")
  (st-pline orig "STEGH-PERIGR")
  (if gpts (st-pline gpts "STEGH-GEISO"))
  (foreach hp holes (st-pline hp "STEGH-TRYPA"))

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
  (princ (strcat "\n--- STEGH v8.4 ---"
    "\n\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2: " (cond ((= *st-TYP* "ISO") "\U+0399\U+03C3\U+03BF\U+03BA\U+03BB\U+03B9\U+03BD\U+03AE\U+03C2") ((= *st-TYP* "GAB") "\U+0394\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7") (T "\U+039C\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7"))
    "  |  \U+039A\U+03BB\U+03AF\U+03C3\U+03B7: " (rtos *st-PIT* 2 1) (if (= *st-PMODE* "PCT") "%" "\U+00B0")
    " (= " (rtos (/ (atan th) (/ pi 180.0)) 2 1) "\U+00B0)"
    "\n\U+039C\U+03B1\U+03C7\U+03B9\U+03AD\U+03C2: " (itoa cnt1) "  \U+039D\U+03C4\U+03B5\U+03C1\U+03AD\U+03B4\U+03B5\U+03C2: " (itoa cnt2)
    "  \U+039A\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03B4\U+03B5\U+03C2: " (itoa cnt3) "  \U+03A4\U+03C1\U+03CD\U+03C0\U+03B5\U+03C2: " (itoa (length holes))
    " (" (itoa cnt4) " \U+03B1\U+03BA\U+03BC\U+03AD\U+03C2)"
    "\n\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B2\U+03AC\U+03C3\U+03B7\U+03C2: " (st-elev 0.0) " m"
    "\n\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC: " (st-elev hmax) " m  (\U+03C3\U+03C7\U+03B5\U+03C4\U+03B9\U+03BA\U+03CC +" (rtos hmax 2 3) ")"
    "\n\U+039A\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03C2 \U+03A4\U+0395\U+039B\U+0395\U+0399\U+03A9\U+039C\U+0395\U+039D\U+039F\U+03A3 (+\U+03B5\U+03C0\U+03B9\U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 0.42/\U+03C3\U+03C5\U+03BD\U+03B1): " (st-elev (+ hmax (/ 0.42 (cos (atan th))))) " m"
    (if gpts (strcat "\n\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03AE\U+03C2: " (st-elev (- 0.0 (* ovh th))) " m") "")
    "\n\U+0395\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (\U+03BC\U+03B5 \U+03B3\U+03B5\U+03AF\U+03C3\U+03BF): " (rtos sumA 2 2) " m2"
    "\nLayers: STEGH-MAXIA / STEGH-NTERES / STEGH-KORFIAS / STEGH-GEISO / STEGH-PERIGR / STEGH-TXT"
    "\n\n*** \U+03A4\U+03B1 \U+03C5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 \U+03BA\U+03B1\U+03B9 \U+03BF\U+03B9 \U+03C0\U+03BF\U+03C3\U+03CC\U+03C4\U+03B7\U+03C4\U+03B5\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C4\U+03B5\U+03BB\U+03BF\U+03CD\U+03BD \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 - \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397."
    "\n    \U+0394\U+0395\U+039D \U+03C5\U+03C0\U+03BF\U+03BA\U+03B1\U+03B8\U+03B9\U+03C3\U+03C4\U+03BF\U+03CD\U+03BD \U+03C3\U+03C4\U+03B1\U+03C4\U+03B9\U+03BA\U+03AE \U+03BC\U+03B5\U+03BB\U+03AD\U+03C4\U+03B7 \U+03B1\U+03C0\U+03CC \U+03B5\U+03BE\U+03BF\U+03C5\U+03C3\U+03B9\U+03BF\U+03B4\U+03BF\U+03C4\U+03B7\U+03BC\U+03AD\U+03BD\U+03BF \U+03A0\U+03BF\U+03BB\U+03B9\U+03C4\U+03B9\U+03BA\U+03CC"
    "\n    \U+039C\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03CC, \U+03BC\U+03AD\U+03BB\U+03BF\U+03C2 \U+03A4.\U+0395.\U+0395."))
  ;; --- ΕΛΑΧΙΣΤΟ ΣΤΗΘΑΙΟ ΤΡΥΠΩΝ ---
  ;; Ύψος στο οποίο θα έφτανε η στέγη αν ΔΕΝ υπήρχε η τρύπα, στο ψηλότερο
  ;; σημείο του χείλους, + πάχος στρώσεων + περιθώριο στεγάνωσης.
  (if holes
    (progn
      (setq bldup (/ (/ (+ *tm-AM* *tm-PET* *tm-TTH* *tm-EPI* *tm-TEG* *tm-KER*) 100.0)
                     (cos (atan th))))
      (setq hmarg 0.15)
      (princ "\n\n>>> \U+0395\U+039B\U+0391\U+03A7\U+0399\U+03A3\U+03A4\U+039F \U+03A3\U+03A4\U+0397\U+0398\U+0391\U+0399\U+039F \U+0393\U+03A5\U+03A1\U+03A9 \U+0391\U+03A0\U+039F \U+03A4\U+0399\U+03A3 \U+03A4\U+03A1\U+03A5\U+03A0\U+0395\U+03A3")
      (princ (strcat "\n    (\U+03CD\U+03C8\U+03BF\U+03C2 \U+03C3\U+03BA\U+03B5\U+03BB\U+03B5\U+03C4\U+03BF\U+03CD + \U+03C3\U+03C4\U+03C1\U+03CE\U+03C3\U+03B5\U+03B9\U+03C2 " (rtos bldup 2 3)
                     " m + \U+03C0\U+03B5\U+03C1\U+03B9\U+03B8\U+03CE\U+03C1\U+03B9\U+03BF " (rtos hmarg 2 2) " m)"))
      (setq hn 1)
      (foreach hp holes
        (setq hdm (st-holemax hp orig 0.20))
        (setq hstru (* hdm th))
        (setq hsti (+ hstru bldup hmarg))
        (setq hc (st-cen hp))
        (princ (strcat "\n    \U+03A4\U+03C1\U+03CD\U+03C0\U+03B1 " (itoa hn)
          ":  \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 " (rtos hdm 2 2) " m"
          "  ->  \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7 +" (rtos hstru 2 3)
          "  ->  \U+03A3\U+03A4\U+0397\U+0398\U+0391\U+0399\U+039F >= " (st-elev hsti) " m  (h=" (rtos hsti 2 2) " m)"))
        (if (= *st-LAB* "1")
          (progn
            (st-txt (list (car hc) (+ (cadr hc) (* txh 0.8))) txh
              (strcat "\U+03A3\U+03A4\U+0397\U+0398\U+0391\U+0399\U+039F >= " (rtos hsti 2 2)) "STEGH-TRYPA")
            (st-txt (list (car hc) (- (cadr hc) (* txh 0.8))) (* txh 0.85)
              (strcat "(" (st-elev hsti) ")") "STEGH-TRYPA")))
        (setq hn (1+ hn)))
      (princ "\n    \U+0399\U+03C3\U+03C7\U+03CD\U+03B5\U+03B9 \U+03B3\U+03B9\U+03B1 \U+039A\U+039B\U+0395\U+0399\U+03A3\U+03A4\U+039F \U+03BA\U+03BF\U+03C5\U+03C4\U+03AF (\U+03B1\U+03C0\U+03CC\U+03BB\U+03B7\U+03BE\U+03B7 \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03B1\U+03C3\U+03AF\U+03BF\U+03C5).")
      (princ "\n    \U+0393\U+03B9\U+03B1 \U+03B1\U+03BD\U+03BF\U+03B9\U+03C7\U+03C4\U+03CC \U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF: \U+03C4\U+03BF \U+03C7\U+03B5\U+03AF\U+03BB\U+03BF\U+03C2 \U+03B5\U+03B9\U+03BD\U+03B1\U+03B9 \U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03AE \U+03C3\U+03C4\U+03BF "
             )
      (princ (strcat (st-elev 0.0) " - \U+03C7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03BB\U+03BF\U+03CD\U+03BA\U+03B9."))))

  ;; --- ΠΡΟΓΡΑΜΜΑ ΖΕΥΚΤΩΝ: κατά μήκος κάθε κορφιά, άνοιγμα = 2t ---
  (setq *st-TR* (list) *st-TRP* (list))
  (if (and (= *st-TYP* "ISO") (> *tm-DIST* 0.05))
    (foreach a arcs
      (setq ia (st-vidx (car a) orig) ib (st-vidx (cadr a) orig))
      (if (and (null ia) (null ib))            ; μόνο κορφιάδες
        (progn
          (setq t1 (st-tnode (car a) nodes) t2 (st-tnode (cadr a) nodes))
          (if (and t1 t2)
            (progn
              (setq ll (distance (car a) (cadr a)) kk 0)
              (while (<= (* kk *tm-DIST*) (+ ll 1e-9))
                (setq ff (if (> ll 1e-9) (/ (* kk *tm-DIST*) ll) 0.0))
                (setq *st-TR* (cons (* 2.0 (+ t1 (* (- t2 t1) ff))) *st-TR*))
                ;; θέση + κάθετη διεύθυνση για τον ξυλότυπο
                (setq *st-TRP* (append *st-TRP* (list (list
                  (list (+ (car (car a)) (* ff (- (car (cadr a)) (car (car a)))))
                        (+ (cadr (car a)) (* ff (- (cadr (cadr a)) (cadr (car a))))))
                  (list (- 0.0 (/ (- (cadr (cadr a)) (cadr (car a))) ll))
                        (/ (- (car (cadr a)) (car (car a))) ll))))))
                (setq kk (1+ kk))))))))) 

  ;; --- ΔΕΔΟΜΕΝΑ ΓΙΑ ΤΗΝ ΤΟΜΗ (πραγματική γεωμετρία κάτοψης) ---
  (setq *st-AREA* (abs (/ (st-area2 (if gpts gpts orig)) 2.0)))
  (setq *st-PER*  (st-perim (if gpts gpts orig)))
  (foreach hp holes
    (setq *st-AREA* (- *st-AREA* (abs (/ (st-area2 hp) 2.0))))
    (setq *st-PER*  (+ *st-PER* (st-perim hp))))
  (setq *st-EAVE* *st-PER*)
  (setq *st-HMAX* hmax *st-LMAX* lmx *st-LNT* lnt *st-LKOR* lkr)
  (princ (strcat "\n\n>>> \U+0394\U+03B5\U+03B4\U+03BF\U+03BC\U+03AD\U+03BD\U+03B1 \U+03B3\U+03B9\U+03B1 \U+03C0\U+03C1\U+03BF\U+03BC\U+03AD\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7 (\U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03BA\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7):"
    "\n    \U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03BA\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7\U+03C2: " (rtos *st-AREA* 2 2) " m2"
    "  \U+00B7  \U+0395\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2: " (rtos (/ *st-AREA* (cos (atan th))) 2 2) " m2"
    "\n    \U+03A0\U+03B5\U+03C1\U+03AF\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03C2 (\U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03AE): " (rtos *st-PER* 2 2) " m"
    "\n    \U+039A\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03B4\U+03B5\U+03C2: " (rtos lkr 2 2) " m  \U+00B7  \U+039C\U+03B1\U+03C7\U+03B9\U+03AD\U+03C2: " (rtos lmx 2 2)
    " m  \U+00B7  \U+039D\U+03C4\U+03B5\U+03C1\U+03AD\U+03B4\U+03B5\U+03C2: " (rtos lnt 2 2) " m"
    "\n    \U+0399\U+03C3\U+03BF\U+03B4\U+03CD\U+03BD\U+03B1\U+03BC\U+03BF \U+03AC\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 (2h/\U+03BA\U+03BB\U+03AF\U+03C3\U+03B7): " (rtos (if (> th 0.0) (/ (* 2.0 hmax) th) 0.0) 2 2) " m"
    "\n    \U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC \U+03BA\U+03B1\U+03C4\U+03AC \U+03BC\U+03AE\U+03BA\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC\U+03B4\U+03C9\U+03BD: " (itoa (length *st-TR*))
    " (\U+03B1\U+03BD\U+03AC " (rtos *tm-DIST* 2 2) " m)"))
  ;; ---------- ΔΕΔΟΜΕΝΑ ΓΙΑ ΞΕΧΩΡΙΣΤΟ ΞΥΛΟΤΥΠΟ ----------
  (setq *st-EAV* (if gpts gpts orig) *st-HOLES* holes *st-TXH* txh)

  ;; ---------- ΞΥΛΟΤΥΠΟΣ ----------
  (if (= *st-XYL* "1")
    (progn
      (princ "\n\n>>> \U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3 - \U+03B1\U+03BD\U+03AC\U+03C0\U+03C4\U+03C5\U+03BE\U+03B7 \U+03BE\U+03CD\U+03BB\U+03C9\U+03BD")
      (setq xp (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 \U+03BE\U+03C5\U+03BB\U+03BF\U+03C4\U+03CD\U+03C0\U+03BF\U+03C5 (\U+03BA\U+03AC\U+03C4\U+03C9-\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AC): "))
      (if (null xp) (princ "\n    \U+03A0\U+03B1\U+03C1\U+03B1\U+03BB\U+03B5\U+03AF\U+03C6\U+03B8\U+03B7\U+03BA\U+03B5 - \U+03C4\U+03C1\U+03AD\U+03BE\U+03B5 \U+03C4\U+03B7\U+03BD \U+03B5\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE STEGHXYLO \U+03B1\U+03C1\U+03B3\U+03CC\U+03C4\U+03B5\U+03C1\U+03B1."))
      (if xp
        (progn
          (setq xx0 (car (car orig)) yy0 (cadr (car orig)))
          (foreach p (if gpts gpts orig)
            (if (< (car p) xx0) (setq xx0 (car p)))
            (if (< (cadr p) yy0) (setq yy0 (cadr p))))
          (setq xres (st-xylo (if gpts gpts orig) holes *st-DARCS*
                              (- (car xp) xx0) (- (cadr xp) yy0)
                              *tm-DIST* *tm-DZ* txh))
          (princ (strcat "\n    \U+0391\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2: " (itoa (car xres))
                         "  \U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2: " (itoa (cadr xres))
                         "  \U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC: " (itoa (caddr xres))
                         "\n    Layers: XYLO-AMEIB / XYLO-TEGID / XYLO-DOKOI"
                         " / XYLO-STROT / XYLO-PERIGR / XYLO-TXT"))))))

  (if (= *st-TOMI* "1")
    (progn
      (princ "\n\n>>> \U+039B\U+03B5\U+03C0\U+03C4\U+03BF\U+03BC\U+03AD\U+03C1\U+03B5\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2...")
      (if (> th 0.0) (setq *tm-S* (/ (* 2.0 hmax) th)))
      (setq *tm-OVH* ovh)
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
      *tm-OVH* 0.60 *tm-WALL* 0.25 *tm-DIST* 0.80
      *tm-KOR* 10.0 *tm-KORH* 20.0 *tm-KAV* 18.0 *tm-KAVH* 6.0
      *tm-TXTH* 0.0 *tm-LR* 10.00 *tm-MK* "0" *tm-PM* "1"
      *tm-KM2* 13.0 *tm-KAVL* 0.33 *tm-KAT* "1" *tm-GLUE* "0"
      *tm-OUT* "ARXEIO" *tm-ROWS* nil)

;; ---- γεωμετρικά βοηθητικά ----
(defun tm-adv (p ang d)
  (list (+ (car p) (* (cos ang) d)) (+ (cadr p) (* (sin ang) d))))
(defun tm-off (p ang d)
  (list (+ (car p) (* (- 0.0 (sin ang)) d)) (+ (cadr p) (* (cos ang) d))))
(defun tm-q (a b c d lyr) (st-pline (list a b c d) lyr))

;; ζώνη κατά μήκος ang, μήκος LL, από offset o1 έως o2
;; vc=1 -> ΚΑΤΑΚΟΡΥΦΗ κοπή στο μακρινό άκρο (κορφιάς): κάθε παρειά
;;         επιμηκύνεται κατά o*tan(ang) ώστε να πέσουν στην ΙΔΙΑ κατακόρυφο
(defun tm-band (p ang LL o1 o2 lyr vc / L1 L2 tn)
  (if (= vc 1)
    (progn
      (setq tn (/ (sin ang) (cos ang)))
      (setq L1 (+ LL (* o1 tn)) L2 (+ LL (* o2 tn))))
    (setq L1 LL L2 LL))
  (tm-q (tm-off p ang o1) (tm-off (tm-adv p ang L1) ang o1)
        (tm-off (tm-adv p ang L2) ang o2) (tm-off p ang o2) lyr))

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

;; κείμενο με στροφή (γωνία σε ακτίνια)
(defun tm-txtrot (p h str ang lyr)
  (entmake (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lyr)
                 (cons 100 "AcDbText")
                 (cons 10 (list (car p) (cadr p) 0.0)) (cons 40 h)
                 (cons 1 str) (cons 50 ang) (cons 72 1) (cons 73 2)
                 (cons 11 (list (car p) (cadr p) 0.0)))))

;; ετικέτα μήκους πάνω σε μέλος p1->p2
(defun tm-mklen (p1 p2 h lyr / a LL mp)
  (setq LL (distance p1 p2))
  (if (> LL (* h 6.0))
    (progn
      (setq a (angle p1 p2))
      (if (or (> a (* 0.5 pi)) (< a (* -0.5 pi))) (setq a (+ a pi)))
      (if (> a pi) (setq a (- a pi)))
      (setq mp (list (/ (+ (car p1) (car p2)) 2.0) (/ (+ (cadr p1) (cadr p2)) 2.0)))
      (tm-txtrot (tm-off mp a (* h 0.9)) h (strcat "L=" (rtos LL 2 2)) a lyr))))

;; ---- ΒΕΛΤΙΣΤΗ ΚΟΠΗ ΑΠΟ ΕΜΠΟΡΙΚΑ ΜΗΚΗ ----
;; Μασίφ: 2.50 / 4.00 / 6.00 m   ·   Πολυκολλητή: + 8 / 10 / 12 m
;; Επιστρέφει (εμπ.μήκος δοκοί αγορά_m φύρα_m) ή nil αν δεν χωράει
(defun tm-cut (npc L glue / lst best s k nb w)
  (setq lst (if (= glue 1) (list 2.5 4.0 6.0 8.0 10.0 12.0) (list 2.5 4.0 6.0)))
  (setq best nil)
  (foreach s lst
    (setq k (fix (/ (+ s 1e-6) L)))
    (if (> k 0)
      (progn
        (setq nb (fix (+ 0.9999 (/ (float npc) (float k)))))
        (setq w (- (* nb s) (* npc L)))
        (if (or (null best) (< w (nth 3 best)))
          (setq best (list s nb (* nb s) w))))))
  best)

;; συνεχές μέλος (επιτρέπεται μάτισμα): αγορά με τη ΜΕΓΑΛΥΤΕΡΗ δοκό
(defun tm-cutrun (Ltot glue / s nb)
  (setq s (if (= glue 1) 12.0 6.0))
  (setq nb (fix (+ 0.9999 (/ Ltot s))))
  (list s nb (* nb s) (- (* nb s) Ltot)))

;; ---- ΣΥΛΛΟΓΗ ΓΡΑΜΜΩΝ ΠΙΝΑΚΑ ----
;; τύποι: "T"=τίτλος  "H"=κεφαλίδα  "D"=δεδομένα  "S"=σύνολο  "N"=σημείωση  "B"=κενό
(defun rr (ty c1 c2 c3 c4 c5 c6 c7)
  (setq *tm-ROWS* (append *tm-ROWS* (list (list ty c1 c2 c3 c4 c5 c6 c7)))))

;; γέμισμα με κενά ως πλάτος w
(defun rpad (s2 w / o)
  (setq o s2)
  (while (< (strlen o) w) (setq o (strcat o " ")))
  o)
(defun lpad (s2 w / o)
  (setq o s2)
  (while (< (strlen o) w) (setq o (strcat " " o)))
  o)

;; ---- ΑΠΟΔΟΣΗ ΣΕ ΑΡΧΕΙΟ: .txt (στηλοθετημένο) + .rtf (Word) ----
(defun tm-writefiles (base / f g r ty ln)
  ;; --- TXT ---
  (setq f (open (strcat base ".txt") "w"))
  (if f
    (progn
      (foreach r *tm-ROWS*
        (setq ty (nth 0 r))
        (cond
          ((= ty "B") (write-line "" f))
          ((= ty "T")
            (write-line "" f)
            (write-line (nth 1 r) f)
            (write-line "=================================================================" f))
          ((= ty "N") (write-line (nth 1 r) f))
          (T
            (setq ln (strcat (rpad (nth 1 r) 34) (rpad (nth 2 r) 11)
                             (lpad (nth 3 r) 7) (lpad (nth 4 r) 12)
                             (lpad (nth 5 r) 12) (lpad (nth 6 r) 12)
                             (lpad (nth 7 r) 14)))
            (write-line ln f)
            (if (= ty "H")
              (write-line "-----------------------------------------------------------------" f)))))
      (close f)))
  ;; --- RTF (ανοίγει απευθείας σε Word, ελληνικά cp1253) ---
  (setq g (open (strcat base ".rtf") "w"))
  (if g
    (progn
      (write-line "{\rtf1\ansi\ansicpg1253\deff0" g)
      (write-line "{\fonttbl{\f0\fnil Calibri;}{\f1\fmodern Consolas;}}" g)
      (write-line "{\colortbl;\red31\green78\blue156;}" g)
      (write-line "\margl720\margr720\margt720\margb720" g)
      (foreach r *tm-ROWS*
        (setq ty (nth 0 r))
        (cond
          ((= ty "B") (write-line "\par" g))
          ((= ty "T")
            (write-line (strcat "\pard\sa60\sb160\f0\fs28\b\cf1 "
                                (nth 1 r) "\b0\cf0\par") g))
          ((= ty "N")
            (write-line (strcat "\pard\f0\fs16\i " (nth 1 r) "\i0\par") g))
          (T
            (write-line (strcat
              "\pard\f1\fs16" (if (or (= ty "H") (= ty "S")) "\b" "")
              "\tx3400\tx4500\tqr\tx5400\tqr\tx6700\tqr\tx8000\tqr\tx9300\tqr\tx10900 "
              (nth 1 r) "\tab" (nth 2 r) "\tab" (nth 3 r) "\tab" (nth 4 r)
              "\tab" (nth 5 r) "\tab" (nth 6 r) "\tab" (nth 7 r)
              (if (or (= ty "H") (= ty "S")) "\b0" "") "\par") g))))
      (write-line "}" g)
      (close g)))
  (and f g))

;; ---- ΑΠΟΔΟΣΗ ΣΤΟ ΣΧΕΔΙΟ: ΕΝΑ MTEXT ----
(defun tm-drawrows (px py lh / r ty txt ln)
  (st-style)
  (setq txt "")
  (foreach r *tm-ROWS*
    (setq ty (nth 0 r))
    (cond
      ((= ty "B") (setq ln " "))
      ((= ty "T") (setq ln (strcat "{\\C1;" (nth 1 r) "}")))
      ((= ty "N") (setq ln (strcat "  " (nth 1 r))))
      (T
        (setq ln (strcat (rpad (nth 1 r) 34) (rpad (nth 2 r) 11)
                         (lpad (nth 3 r) 7) (lpad (nth 4 r) 12)
                         (lpad (nth 5 r) 12) (lpad (nth 6 r) 12)
                         (lpad (nth 7 r) 14)))
        (if (or (= ty "H") (= ty "S")) (setq ln (strcat "{\\C2;" ln "}")))))
    (setq txt (if (= txt "") ln (strcat txt "\\P" ln))))
  (st-mtext (list px py) (* lh 0.85) (* lh 0.85 95.0) txt "TOMI-TXT" "HEXIS_MONO")
  py)

;; γραμμή πίνακα: 7 στήλες
(defun tm-row7 (x y h c1 c2 c3 c4 c5 c6 c7 lyr)
  (tm-txtl (list x y) h c1 lyr)
  (tm-txtl (list (+ x (* h 17.0)) y) h c2 lyr)
  (tm-txtl (list (+ x (* h 24.0)) y) h c3 lyr)
  (tm-txtl (list (+ x (* h 31.0)) y) h c4 lyr)
  (tm-txtl (list (+ x (* h 37.0)) y) h c5 lyr)
  (tm-txtl (list (+ x (* h 44.0)) y) h c6 lyr)
  (tm-txtl (list (+ x (* h 51.0)) y) h c7 lyr))

;; γραμμή πίνακα: 5 στήλες
(defun tm-row (x y h c1 c2 c3 c4 c5 lyr)
  (tm-txtl (list x y) h c1 lyr)
  (tm-txtl (list (+ x (* h 17.0)) y) h c2 lyr)
  (tm-txtl (list (+ x (* h 25.0)) y) h c3 lyr)
  (tm-txtl (list (+ x (* h 32.0)) y) h c4 lyr)
  (tm-txtl (list (+ x (* h 41.0)) y) h c5 lyr))

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
      (write-line "      : edit_box { key = \"lroof\"; label = \"\U+039C\U+03AE\U+03BA\U+03BF\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2 (m):\"; edit_width = 7; }" f)
      (write-line "      : edit_box { key = \"txth\"; label = \"\U+038E\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AC\U+03C4\U+03C9\U+03BD (m, 0=auto):\"; edit_width = 7; }" f)
      (write-line "      : edit_box { key = \"km2\"; label = \"\U+039A\U+03B5\U+03C1\U+03B1\U+03BC\U+03AF\U+03B4\U+03B9\U+03B1 (\U+03C4\U+03B5\U+03BC/m2):\"; edit_width = 7; }" f)
      (write-line "      : boxed_column { label = \"\U+03A3\U+03C4\U+03BF\U+03B9\U+03C7\U+03B5\U+03AF\U+03B1 \U+03B3\U+03B9\U+03B1 \U+03C4\U+03B7\U+03BD \U+03B1\U+03BD\U+03B1\U+03C6\U+03BF\U+03C1\U+03AC\";" f)
      (write-line "        : edit_box { key = \"eng\";  label = \"\U+039C\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03CC\U+03C2:\"; edit_width = 26; }" f)
      (write-line "        : edit_box { key = \"cont\"; label = \"\U+0395\U+03C0\U+03B9\U+03BA\U+03BF\U+03B9\U+03BD\U+03C9\U+03BD\U+03AF\U+03B1:\"; edit_width = 26; }" f)
      (write-line "        : edit_box { key = \"proj\"; label = \"\U+0388\U+03C1\U+03B3\U+03BF:\"; edit_width = 26; }" f)
      (write-line "      }" f)
  (write-line "      : boxed_column { label = \"\U+0395\U+03C5\U+03C1\U+03C9\U+03BA\U+03CE\U+03B4\U+03B9\U+03BA\U+03B1\U+03C2 1 - \U+03C6\U+03BF\U+03C1\U+03C4\U+03AF\U+03B1\";" f)
  (write-line "        : toggle { key = \"ec\"; label = \"\U+03A5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+03C6\U+03BF\U+03C1\U+03C4\U+03AF\U+03C9\U+03BD EC1 + \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 EC5\"; value = \"1\"; }" f)
  (write-line "        : radio_row { key = \"zn\";" f)
  (write-line "          : radio_button { key = \"z1\"; label = \"\U+03A7\U+03B9\U+03CC\U+03BD\U+03B9 \U+0399\"; }" f)
  (write-line "          : radio_button { key = \"z2\"; label = \"\U+0399\U+0399\"; }" f)
  (write-line "          : radio_button { key = \"z3\"; label = \"\U+0399\U+0399\U+0399\"; value = \"1\"; }" f)
  (write-line "        }" f)
  (write-line "        : edit_box { key = \"alt\"; label = \"\U+03A5\U+03C8\U+03CC\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF (m):\"; edit_width = 6; }" f)
  (write-line "        : radio_row { key = \"vb\";" f)
  (write-line "          : radio_button { key = \"v33\"; label = \"\U+0386\U+03BD\U+03B5\U+03BC\U+03BF\U+03C2 33 m/s\"; value = \"1\"; }" f)
  (write-line "          : radio_button { key = \"v27\"; label = \"27 m/s\"; }" f)
  (write-line "        }" f)
  (write-line "        : edit_box { key = \"terr\"; label = \"\U+039A\U+03B1\U+03C4\U+03B7\U+03B3. \U+03B5\U+03B4\U+03AC\U+03C6\U+03BF\U+03C5\U+03C2 0-4:\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"hb\"; label = \"\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 z (m):\"; edit_width = 6; }" f)
  (write-line "        : edit_box { key = \"fmk\"; label = \"\U+039E\U+03C5\U+03BB\U+03B5\U+03AF\U+03B1 fm,k (C24=24):\"; edit_width = 6; }" f)
  (write-line "      }" f)
      (write-line "      : toggle { key = \"mk\"; label = \"\U+039C\U+03AE\U+03BA\U+03B7 \U+03BE\U+03CD\U+03BB\U+03C9\U+03BD \U+03C0\U+03AC\U+03BD\U+03C9 \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF\"; }" f)
      (write-line "      : toggle { key = \"pm\"; label = \"\U+03A0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03C0\U+03C1\U+03BF\U+03BC\U+03AD\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7\U+03C2\"; value = \"1\"; }" f)
      (write-line "      : boxed_radio_row { key = \"out\"; label = \"\U+03A0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03C3\U+03B5\";" f)
      (write-line "        : radio_button { key = \"o_ar\"; label = \"\U+0391\U+03C1\U+03C7\U+03B5\U+03AF\U+03BF (Word)\"; value = \"1\"; }" f)
      (write-line "        : radio_button { key = \"o_sx\"; label = \"\U+03A3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF\"; }" f)
      (write-line "        : radio_button { key = \"o_bo\"; label = \"\U+039A\U+03B1\U+03B9 \U+03C4\U+03B1 \U+03B4\U+03CD\U+03BF\"; }" f)
      (write-line "      }" f)
      (write-line "      : toggle { key = \"kat\"; label = \"\U+03A0\U+03BF\U+03C3\U+03CC\U+03C4\U+03B7\U+03C4\U+03B5\U+03C2 \U+0391\U+03A0\U+039F \U+03A4\U+0397\U+039D \U+039A\U+0391\U+03A4\U+039F\U+03A8\U+0397 (STEGH)\"; value = \"1\"; }" f)
      (write-line "      : toggle { key = \"glue\"; label = \"\U+03A0\U+03BF\U+03BB\U+03C5\U+03BA\U+03BF\U+03BB\U+03BB\U+03B7\U+03C4\U+03AE \U+03BE\U+03C5\U+03BB\U+03B5\U+03AF\U+03B1 (\U+03BC\U+03AE\U+03BA\U+03B7 \U+03AD\U+03C9\U+03C2 12 m)\"; }" f)
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
  (setq v (atof (get_tile "lroof"))) (if (> v 0.5) (setq *tm-LR* v))
  (setq v (atof (get_tile "txth")))  (if (>= v 0.0) (setq *tm-TXTH* v))
  (setq v (atof (get_tile "km2")))   (if (> v 0.0) (setq *tm-KM2* v))
  (setq v (atof (get_tile "alt")))   (if (>= v 0.0) (setq *ec-ALT* v))
  (setq v (atof (get_tile "terr")))  (if (and (>= v 0.0) (<= v 4.0)) (setq *ec-TERR* (fix v)))
  (setq v (atof (get_tile "hb")))    (if (> v 1.0) (setq *ec-H* v))
  (setq v (atof (get_tile "fmk")))   (if (> v 5.0) (setq *ec-FMK* v))
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

;; ---- ΜΙΑ ΚΛΙΣΗ ----
;; LR  = μήκος ΣΤΡΩΣΕΩΝ (φτάνουν ως τον άξονα, περνούν πάνω από τον κορφιά)
;; LRr = μήκος ΑΜΕΙΒΟΝΤΑ (ΣΚΑΕΙ στην παρειά του κορφιά - πιο κοντό)
(defun tm-slope (H0 ang LR LRr ovh am pet tth epi tg ker dz / P0 LT LTr ext o1 o2 o3 o4 o5 s)
  ;; ΠΡΟΣΟΧΗ: στη δεξιά κλίση ang = pi-a, οπότε cos<0 -> abs
  (setq ext (/ ovh (abs (cos ang))))
  (setq P0 (tm-adv H0 ang (- 0.0 ext)))
  (setq LT (+ LR ext) LTr (+ LRr ext))
  ;; αμείβοντας (ψαλίδι) - σταματάει στον κορφιά
  (tm-band P0 ang LTr 0.0 am "TOMI-XYLO" 1)
  (setq o1 am)
  (setq o2 (+ o1 pet))
  (setq o3 (+ o2 tth))
  (setq o4 (+ o3 epi))
  (setq o5 (+ o4 tg))
  ;; οι στρώσεις συνεχίζουν ΠΑΝΩ από τον κορφιά ως τον άξονα
  (tm-band P0 ang LT o1 o2 "TOMI-PET" 1)
  (st-line (tm-off P0 ang o2) (tm-off (tm-adv P0 ang (+ LT (* o2 (/ (sin ang) (cos ang))))) ang o2) "TOMI-MEM")
  (tm-band P0 ang LT o2 o3 "TOMI-MON" 1)
  (st-line (tm-off P0 ang o3) (tm-off (tm-adv P0 ang (+ LT (* o3 (/ (sin ang) (cos ang))))) ang o3) "TOMI-MEM")
  (tm-band P0 ang LT o3 o4 "TOMI-XYLO" 1)
  (setq s 0.0)
  (while (< s LT)
    ;; το tg ερχεται ΑΡΝΗΤΙΚΟ στη δεξια κλιση (offset) - το ΜΗΚΟΣ θελει abs
    (tm-band (tm-adv P0 ang s) ang (abs tg) o4 o5 "TOMI-XYLO" 0)
    (setq s (+ s dz)))
  (tm-band P0 ang LT o5 (+ o5 ker) "TOMI-KER" 1)
  (list o1 o2 o3 o4 o5))

;; ---- ΚΑΒΑΛΛΑΡΗΣ (κορυφοκέραμο) ----
;; τόξο πάνω από την κορυφή, εδράζεται στα κεραμίδια των δύο κλίσεων
(defun tm-kav (cx cy0 th2 dk hk tk / n i x u yb yo out inn)
  (setq n 8 out (list) inn (list) i 0)
  (while (<= i n)
    (setq x (+ (- cx dk) (* (/ (float i) n) (* 2.0 dk))))
    (setq u (/ (- x cx) dk))
    (setq yb (- cy0 (* (abs (- x cx)) th2)))          ; επιφάνεια κεραμιδιών
    (setq yo (+ yb (* hk (- 1.0 (* u u)))))           ; παραβολικό τόξο
    (setq out (append out (list (list x yo))))
    (setq inn (append inn (list (list x (- yo tk)))))
    (setq i (1+ i)))
  (st-pline (append out (reverse inn)) "TOMI-KER"))

;; ---- ΕΝΤΟΛΗ ----
(defun C:STEGHTOMI ( / *error* dclpath dclid status ins th S half ang LR
                       am amb el ort ant strw pet tth epi tg ker ovh ww dz
                       H0 HR A0 AR TOPL o kp kbot at1 at2 hh lx ly lh usedcl kw v
                       kor korh LRr
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
      (set_tile "lroof" (rtos *tm-LR* 2 2))
      (set_tile "txth" (rtos *tm-TXTH* 2 3))
      (set_tile "km2"  (rtos *tm-KM2* 2 1))
      (set_tile "alt"  (rtos *ec-ALT* 2 1))
      (set_tile "terr" (itoa *ec-TERR*))
      (set_tile "hb"   (rtos *ec-H* 2 2))
      (set_tile "fmk"  (rtos *ec-FMK* 2 1))
      (set_tile "eng"  *st-ENG*)
      (set_tile "cont" *st-CONT*)
      (set_tile "proj" *st-PROJ*)
      (if (= *ec-ON* "1") (set_tile "ec" "1"))
      (set_tile (cond ((= *ec-ZONE* 1) "z1") ((= *ec-ZONE* 2) "z2") (T "z3")) "1")
      (set_tile (if (< *ec-VB0* 30.0) "v27" "v33") "1")
      (action_tile "z1" "(setq *ec-ZONE* 1)")
      (action_tile "z2" "(setq *ec-ZONE* 2)")
      (action_tile "z3" "(setq *ec-ZONE* 3)")
      (action_tile "v33" "(setq *ec-VB0* 33.0)")
      (action_tile "v27" "(setq *ec-VB0* 27.0)")
      (if (= *tm-MK* "1") (set_tile "mk" "1"))
      (if (= *tm-PM* "1") (set_tile "pm" "1"))
      (if (<= *st-AREA* 0.0) (mode_tile "kat" 1))
      (if (= *tm-GLUE* "1") (set_tile "glue" "1"))
      (set_tile (cond ((= *tm-OUT* "SXEDIO") "o_sx") ((= *tm-OUT* "BOTH") "o_bo")
                      (T "o_ar")) "1")
      (action_tile "o_ar" "(setq *tm-OUT* \"ARXEIO\")")
      (action_tile "o_sx" "(setq *tm-OUT* \"SXEDIO\")")
      (action_tile "o_bo" "(setq *tm-OUT* \"BOTH\")")
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
                       "str" "pet" "tth" "epi" "teg" "dz" "ker" "lroof" "txth" "km2"
                       "alt" "terr" "hb" "fmk")
        (action_tile k "(tm-upd)"))
      (action_tile "accept"
        "(tm-upd) (setq *tm-MK* (get_tile \"mk\")) (setq *tm-PM* (get_tile \"pm\")) (setq *tm-KAT* (get_tile \"kat\")) (setq *tm-GLUE* (get_tile \"glue\")) (setq *ec-ON* (get_tile \"ec\")) (setq *st-ENG* (get_tile \"eng\")) (setq *st-CONT* (get_tile \"cont\")) (setq *st-PROJ* (get_tile \"proj\")) (done_dialog 1)")
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
      (initget "Arxeio Sxedio Both")
      (setq kw (getkword "\n\U+03A0\U+03B9\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03C0\U+03C1\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7\U+03C2 \U+03C3\U+03B5 [Arxeio/Sxedio/Both] <Arxeio>: "))
      (setq *tm-OUT* (cond ((= kw "Sxedio") "SXEDIO") ((= kw "Both") "BOTH") (T "ARXEIO")))
      (setq v (getreal (strcat "\n\U+039C\U+03B7\U+03BA\U+03BF\U+03C2 \U+03C3\U+03C4\U+03B5\U+03B3\U+03B7\U+03C2 m <" (rtos *tm-LR* 2 2) ">: ")))
      (if (and v (> v 0.5)) (setq *tm-LR* v))
      (setq v (getreal (strcat "\n\U+03A5\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1\U+03C4\U+03C9\U+03BD m (0=auto) <" (rtos *tm-TXTH* 2 3) ">: ")))
      (if (and v (>= v 0.0)) (setq *tm-TXTH* v))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+039C\U+03B7\U+03BA\U+03B7 \U+03BE\U+03C5\U+03BB\U+03C9\U+03BD \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03BF [Nai/Ochi] <Ochi>: "))
      (setq *tm-MK* (if (= kw "Nai") "1" "0"))
      (initget "Nai Ochi")
      (setq kw (getkword "\n\U+03A0\U+03B9\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03C0\U+03C1\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7\U+03C2 [Nai/Ochi] <Nai>: "))
      (setq *tm-PM* (if (= kw "Ochi") "0" "1"))
      (setq status 1)))
  (if (/= status 1) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))

  (setq ins (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 (\U+03C0\U+03AC\U+03BD\U+03C9-\U+03B5\U+03BE\U+03C9\U+03C4. \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1 \U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03BF\U+03CD \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5): "))
  (if (null ins) (exit))
  (setq ins (list (car ins) (cadr ins)))

  (setq th (st-slope) S *tm-S* ang (atan th))
  (setq half (if (= *tm-TYP* "GAB") (/ S 2.0) S))
  (setq LR (/ half (cos ang)))
  (setq am (/ *tm-AM* 100.0)  amb (/ *tm-AMB* 100.0) el (/ *tm-EL* 100.0)
        ort (/ *tm-ORT* 100.0) ant (/ *tm-ANT* 100.0) strw (/ *tm-STR* 100.0)
        pet (/ *tm-PET* 100.0) tth (/ *tm-TTH* 100.0) epi (/ *tm-EPI* 100.0)
        tg (/ *tm-TEG* 100.0) ker (/ *tm-KER* 100.0)
        ovh *tm-OVH* ww *tm-WALL* dz *tm-DZ*)

  ;; --- ΤΟΙΧΟΙ + ΣΤΡΩΤΗΡΑΣ (μηκίδα) ---
  (tm-q ins (list (+ (car ins) ww) (cadr ins))
        (list (+ (car ins) ww) (- (cadr ins) 0.80))
        (list (car ins) (- (cadr ins) 0.80)) "TOMI-TOIXOS")
  (tm-q (list (car ins) (cadr ins)) (list (+ (car ins) strw) (cadr ins))
        (list (+ (car ins) strw) (+ (cadr ins) strw))
        (list (car ins) (+ (cadr ins) strw)) "TOMI-XYLO")
  (if (= *tm-TYP* "GAB")
    (progn
      (tm-q (list (+ (car ins) S) (cadr ins)) (list (+ (car ins) S (- 0.0 ww)) (cadr ins))
            (list (+ (car ins) S (- 0.0 ww)) (- (cadr ins) 0.80))
            (list (+ (car ins) S) (- (cadr ins) 0.80)) "TOMI-TOIXOS")
      (tm-q (list (+ (car ins) S) (cadr ins)) (list (+ (car ins) S (- 0.0 strw)) (cadr ins))
            (list (+ (car ins) S (- 0.0 strw)) (+ (cadr ins) strw))
            (list (+ (car ins) S) (+ (cadr ins) strw)) "TOMI-XYLO")))

  ;; --- ΕΛΚΥΣΤΗΡΑΣ (πέλμα/φτέρνα) — τετραγωνική διατομή ---
  (setq H0 (list (car ins) (+ (cadr ins) strw el)))
  (setq HR (list (+ (car ins) S) (cadr H0)))
  (if (= *tm-TYP* "GAB")
    (tm-q (list (car H0) (- (cadr H0) el)) (list (car HR) (- (cadr HR) el))
          HR H0 "TOMI-XYLO"))

  ;; --- ΚΟΡΦΙΑΣ: διατομή & ελάχιστο ύψος ώστε να ΣΚΑΝΕ πλήρως τα ψαλίδια ---
  (setq kor (/ *tm-KOR* 100.0))
  (setq korh (max (/ *tm-KORH* 100.0) (+ (/ am (cos ang)) 0.03)))
  (setq LRr (if (= *tm-TYP* "GAB") (/ (- half (/ kor 2.0)) (cos ang)) LR))

  ;; --- ΑΜΕΙΒΟΝΤΕΣ + ΣΤΡΩΣΕΙΣ ---
  (setq o (tm-slope H0 ang LR LRr ovh am pet tth epi tg ker dz))
  (if (= *tm-TYP* "GAB")
    (tm-slope HR (- pi ang) LR LRr ovh (- 0.0 am) (- 0.0 pet) (- 0.0 tth)
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

  ;; --- ΚΟΡΦΙΑΣ (ΚΟΡΥΦΟΤΕΓΙΔΑ) ---
  ;; πεντάγωνο με φαλτσαρισμένη κορυφή: τα ψαλίδια σκάνε στις παρειές του
  (setq q1 (+ (cadr H0) (* (- half (/ kor 2.0)) th) (/ am (cos ang))))  ; παρειά
  (setq q2 (+ (cadr H0) (* half th) (/ am (cos ang))))                  ; κορυφή
  (if (= *tm-TYP* "GAB")
    (st-pline (list
        (list (- (car A0) (/ kor 2.0)) (- q1 korh))
        (list (+ (car A0) (/ kor 2.0)) (- q1 korh))
        (list (+ (car A0) (/ kor 2.0)) q1)
        (list (car A0) q2)
        (list (- (car A0) (/ kor 2.0)) q1)) "TOMI-XYLO"))

  ;; --- ΚΑΒΑΛΛΑΡΗΣ (κορυφοκέραμο) πάνω από την κορυφή ---
  (if (= *tm-TYP* "GAB")
    (tm-kav (car A0)
            (+ (cadr H0) (* half th)
               (/ (+ am pet tth epi tg ker) (cos ang)))
            th (/ *tm-KAV* 100.0) (/ *tm-KAVH* 100.0) (/ ker 2.0)))

  ;; --- ΜΠΑΛΕΣ ΑΝΑΦΟΡΑΣ ΜΕ LEADER ΠΑΝΩ ΣΤΑ ΣΤΟΙΧΕΙΑ ---
  (if (> *tm-TXTH* 0.0)
    (setq lh *tm-TXTH*)
    (progn (setq lh (/ S 70.0)) (if (< lh 0.045) (setq lh 0.045))))
  (setq kp (tm-adv H0 ang (- 0.0 (/ ovh (abs (cos ang))))))   ; εξωτ. άκρο γείσου
  (setq kbot (+ LR (/ ovh (abs (cos ang)))))                  ; μήκος στρώσεων
  (setq o1 (nth 0 o) o2 (nth 1 o) at1 (nth 3 o) at2 (nth 4 o))
  (setq wtot (+ at2 ker 0.55))
  (setq nteg (/ (+ (* (fix (/ (* 0.70 kbot) dz)) dz) (/ tg 2.0)) kbot))

  ;; ΣΤΡΩΣΕΙΣ — βεντάλια κατά μήκος της κλίσης
  (foreach it (list
      (list 1 (+ at2 (/ ker 2.0))      0.80)
      (list 3 (/ (+ at1 at2) 2.0)      nteg)
      (list 4 (/ (+ (nth 2 o) at1) 2.0) 0.60)
      (list 5 (nth 2 o)                0.50)
      (list 6 (/ (+ o2 (nth 2 o)) 2.0) 0.41)
      (list 7 o2                       0.32)
      (list 8 (/ (+ o1 o2) 2.0)        0.24)
      (list 9 (/ o1 2.0)               0.16))
    (tm-bub (tm-off (tm-adv kp ang (* (caddr it) kbot)) ang (cadr it))
            (tm-off (tm-adv kp ang (* (caddr it) kbot)) ang wtot)
            (car it) lh "TOMI-TXT"))

  ;; 2 ΚΑΒΑΛΛΑΡΗΣ + 10 ΚΟΡΦΙΑΣ
  (if (= *tm-TYP* "GAB")
    (progn
      (tm-bub (list (car A0)
                    (+ (cadr H0) (* half th)
                       (/ (+ am pet tth epi tg ker) (cos ang))
                       (* (/ *tm-KAVH* 100.0) 0.5)))
              (list (+ (car A0) (* half 0.42)) (+ (cadr A0) wtot))
              2 lh "TOMI-TXT")
      (tm-bub (list (+ (car A0) (/ kor 4.0)) (- q1 (/ korh 2.0)))
              (list (+ (car A0) (* half 0.62)) (- q2 (* half th 0.18)))
              10 lh "TOMI-TXT")))

  ;; ΔΟΜΙΚΑ ΣΤΟΙΧΕΙΑ
  (if (and (= *tm-TYP* "GAB") (/= *tm-ZEV* "APLO"))
    (progn
      (tm-bub (list (- (car A0) (/ half 4.0)) (+ (cadr H0) (* (/ half 4.0) th) 0.10))
              (list (- (car A0) (* half 0.55)) (+ (cadr H0) (* half th 0.42)))
              11 lh "TOMI-TXT")
      (tm-bub (list (car A0) (+ (cadr H0) (* half th 0.50)))
              (list (+ (car A0) (* half 0.30)) (+ (cadr H0) (* half th 0.58)))
              12 lh "TOMI-TXT")
      (tm-bub (list (car A0) (+ (cadr H0) 0.10))
              (list (+ (car A0) (* half 0.34)) (- (cadr H0) 0.55))
              13 lh "TOMI-TXT")))
  (if (= *tm-TYP* "GAB")
    (tm-bub (list (+ (car H0) (* S 0.30)) (- (cadr H0) (/ el 2.0)))
            (list (+ (car H0) (* S 0.30)) (- (cadr H0) 0.75))
            14 lh "TOMI-TXT"))
  (tm-bub (list (+ (car ins) (/ strw 2.0)) (+ (cadr ins) (/ strw 2.0)))
          (list (- (car ins) 0.75) (- (cadr ins) 0.30))
          15 lh "TOMI-TXT")
  (tm-bub (list (+ (car ins) (/ ww 2.0)) (- (cadr ins) 0.45))
          (list (- (car ins) 0.75) (- (cadr ins) 0.75))
          16 lh "TOMI-TXT")

  ;; --- ΥΠΟΜΝΗΜΑ: ΕΝΑ MTEXT ---
  (st-style)
  (setq lx (+ (car ins) S 1.30) ly (+ (cadr A0) (* lh 4.0)))
  (setq ltxt "{\\C1;\\L \U+03A5\U+03A0\U+039F\U+039C\U+039D\U+0397\U+039C\U+0391 \U+03A5\U+039B\U+0399\U+039A\U+03A9\U+039D\\l}\\P ")
  (setq nteg 1)
  (foreach ln (list
    (strcat "\U+039A\U+0395\U+03A1\U+0391\U+039C\U+0399\U+0394\U+0399\U+0391 " (rtos *tm-KER* 2 1) " cm")
    (strcat "\U+039A\U+0391\U+0392\U+0391\U+039B\U+039B\U+0391\U+03A1\U+0397\U+03A3 (\U+039A\U+039F\U+03A1\U+03A5\U+03A6\U+039F\U+039A\U+0395\U+03A1\U+0391\U+039C\U+039F) \U+03C0\U+03BB. " (rtos (* 2.0 *tm-KAV*) 2 0) " cm")
    (strcat "\U+03A4\U+0395\U+0393\U+0399\U+0394\U+0395\U+03A3 " (rtos *tm-TEG* 2 1) "x" (rtos *tm-TEG* 2 1) " cm \U+03B1\U+03BD\U+03AC " (rtos dz 2 2) " m")
    (strcat "\U+0395\U+03A0\U+0399\U+03A4\U+0395\U+0393\U+0399\U+0394\U+0395\U+03A3 " (rtos *tm-EPI* 2 1) " cm - \U+03B1\U+03B5\U+03C1\U+03B9\U+03B6\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03B4\U+03B9\U+03AC\U+03BA\U+03B5\U+03BD\U+03BF")
    "\U+03A3\U+03A4\U+0395\U+0393\U+0391\U+039D\U+03A9\U+03A4\U+0399\U+039A\U+0397 \U+0394\U+0399\U+0391\U+03A0\U+039D\U+0395\U+039F\U+03A5\U+03A3\U+0391 \U+039C\U+0395\U+039C\U+0392\U+03A1\U+0391\U+039D\U+0397"
    (strcat "\U+0398\U+0395\U+03A1\U+039C\U+039F\U+039C\U+039F\U+039D\U+03A9\U+03A3\U+0397 " (rtos *tm-TTH* 2 1) " cm")
    "\U+03A6\U+03A1\U+0391\U+0393\U+039C\U+0391 \U+03A5\U+0394\U+03A1\U+0391\U+03A4\U+039C\U+03A9\U+039D"
    (strcat "\U+03A0\U+0395\U+03A4\U+03A3\U+03A9\U+039C\U+0391 / \U+03A0\U+0395\U+03A4\U+0391\U+03A5\U+03A1\U+03A9\U+03A3\U+0397 " (rtos *tm-PET* 2 1) " cm")
    (strcat "\U+0391\U+039C\U+0395\U+0399\U+0392\U+039F\U+039D\U+03A4\U+0395\U+03A3 (\U+03A8\U+0391\U+039B\U+0399\U+0394\U+0399\U+0391) " (rtos *tm-AMB* 2 1) "x" (rtos *tm-AM* 2 1) " cm")
    (strcat "\U+039A\U+039F\U+03A1\U+03A6\U+0399\U+0391\U+03A3 (\U+039A\U+039F\U+03A1\U+03A5\U+03A6\U+039F\U+03A4\U+0395\U+0393\U+0399\U+0394\U+0391) " (rtos *tm-KOR* 2 1) "x"
            (rtos (* korh 100.0) 2 1) " cm - \U+03C3\U+03BA\U+03AC\U+03BD\U+03B5 \U+03C4\U+03B1 \U+03C8\U+03B1\U+03BB\U+03AF\U+03B4\U+03B9\U+03B1")
    (strcat "\U+0391\U+039D\U+03A4\U+0397\U+03A1\U+0399\U+0394\U+0395\U+03A3 (\U+039D\U+03A4\U+0395\U+03A3\U+03A4\U+0395\U+039A\U+0399\U+0391) " (rtos *tm-ANT* 2 1) " cm")
    (strcat "\U+039F\U+03A1\U+0398\U+039F\U+03A3\U+03A4\U+0391\U+03A4\U+0397\U+03A3 (\U+039C\U+03A0\U+0391\U+039C\U+03A0\U+0391\U+03A3) " (rtos *tm-ORT* 2 1) " cm - \U+039A\U+03A1\U+0395\U+039C\U+0391\U+03A3\U+03A4\U+039F\U+03A3")
    "\U+039C\U+0395\U+03A4\U+0391\U+039B\U+039B\U+0399\U+039A\U+0397 \U+039B\U+0391\U+039C\U+0391 \U+0391\U+039D\U+0391\U+03A1\U+03A4\U+0397\U+03A3\U+0397\U+03A3"
    (strcat "\U+0395\U+039B\U+039A\U+03A5\U+03A3\U+03A4\U+0397\U+03A1\U+0391\U+03A3 (\U+03A0\U+0395\U+039B\U+039C\U+0391) " (rtos *tm-EL* 2 1) "x" (rtos *tm-EL* 2 1) " cm")
    (strcat "\U+03A3\U+03A4\U+03A1\U+03A9\U+03A4\U+0397\U+03A1\U+0391\U+03A3 / \U+039C\U+0397\U+039A\U+0399\U+0394\U+0391 " (rtos *tm-STR* 2 1) " cm")
    (strcat "\U+03A4\U+039F\U+0399\U+03A7\U+039F\U+03A0\U+039F\U+0399\U+0399\U+0391 " (rtos ww 2 2) " m"))
    (setq ltxt (strcat ltxt "\\P" (lpad (itoa nteg) 2) ".  " ln))
    (setq nteg (1+ nteg)))
  (st-mtext (list lx ly) lh (* lh 42.0) ltxt "TOMI-TXT" "HEXIS_MONO")

  ;; ================= ΜΗΚΗ ΞΥΛΩΝ + ΠΡΟΜΕΤΡΗΣΗ =================
  (setq hh (* half th) nteg (fix (+ 1.0 (/ kbot dz))))
  (setq Lraf kbot)                                   ; μήκος αμείβοντα με γείσο
  (setq Lort (- (* half th) 0.03))                   ; ορθοστάτης
  (setq Lant (distance (list (car A0) (+ (cadr H0) 0.09))
                       (list (+ (car H0) (/ half 2.0))
                             (+ (cadr H0) (* (/ half 2.0) th)))))
  (setq Lteg (* (/ half 2.0) th))                    ; τεγοστάτης
  ;; ΠΟΣΟΤΗΤΕΣ: αν έτρεξε η ΚΑΤΟΨΗ, χρησιμοποιούμε την ΠΡΑΓΜΑΤΙΚΗ γεωμετρία
  (setq usekat (if (and (= *tm-KAT* "1") (> *st-AREA* 0.0)) 1 0))
  (if (= usekat 1)
    (progn
      (setq Aslope (/ *st-AREA* (cos ang)))          ; πραγματική επιφάνεια στέγης
      (setq Peave *st-PER*)                          ; πραγματική υδρορροή
      (setq Lkor *st-LKOR* Lmax *st-LMAX* Lnt *st-LNT*)
      (setq nz (fix (+ 0.999 (/ Aslope (* *tm-DIST* Lraf))))))
    (progn
      (setq Aslope (* 2.0 Lraf *tm-LR*))
      (setq Peave (* 2.0 *tm-LR*))
      (setq Lkor (if (= *tm-TYP* "GAB") *tm-LR* 0.0) Lmax 0.0 Lnt 0.0)
      (setq nz (+ 1 (fix (/ *tm-LR* *tm-DIST*))))))

  ;; --- ΜΗΚΗ ΠΑΝΩ ΣΤΟ ΣΧΕΔΙΟ ---
  (if (= *tm-MK* "1")
    (progn
      (tm-mklen (tm-off kp ang (/ am 2.0))
                (tm-off (tm-adv kp ang Lraf) ang (/ am 2.0)) (* lh 0.85) "TOMI-TXT")
      (if (= *tm-TYP* "GAB")
        (progn
          (tm-mklen (list (car H0) (- (cadr H0) (/ el 2.0)))
                    (list (car HR) (- (cadr HR) (/ el 2.0))) (* lh 0.85) "TOMI-TXT")
          (if (/= *tm-ZEV* "APLO")
            (progn
              (tm-mklen (list (+ (car A0) 0.02) (+ (cadr H0) 0.03))
                        (list (+ (car A0) 0.02) (+ (cadr H0) Lort)) (* lh 0.85) "TOMI-TXT")
              (tm-mklen (list (car A0) (+ (cadr H0) 0.09))
                        (list (+ (car H0) (/ half 2.0))
                              (+ (cadr H0) (* (/ half 2.0) th))) (* lh 0.85) "TOMI-TXT")))))))

  ;; --- ΠΙΝΑΚΑΣ ΠΡΟΜΕΤΡΗΣΗΣ (χτίζεται ΜΙΑ φορά, αποδίδεται όπου ζητηθεί) ---
  (if (= *tm-PM* "1")
    (progn
      (setq *tm-ROWS* (list) vol 0.0 items (list))
      (defun addrow (nm b h qty len cont / tot v)
        (setq tot (* qty len) v (* (/ b 100.0) (/ h 100.0) tot))
        (setq vol (+ vol v))
        (setq items (append items (list (list nm b h qty len cont))))
        (rr "D" nm (strcat (rtos b 2 0) "x" (rtos h 2 0))
            (itoa (fix (+ 0.4999 qty))) (rtos len 2 2)
            (rtos tot 2 2) (rtos v 2 3) ""))

      (rr "T" "\U+03A0\U+0399\U+039D\U+0391\U+039A\U+0391\U+03A3 \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397\U+03A3 \U+03A3\U+03A4\U+0395\U+0393\U+0397\U+03A3" "" "" "" "" "" "")
      (if (/= *st-ENG* "")  (rr "N" *st-ENG* "" "" "" "" "" ""))
      (if (/= *st-CONT* "") (rr "N" *st-CONT* "" "" "" "" "" ""))
      (if (/= *st-PROJ* "") (rr "N" (strcat "\U+0395\U+03C1\U+03B3\U+03BF: " *st-PROJ*) "" "" "" "" "" ""))
      (if (or (/= *st-ENG* "") (/= *st-PROJ* "")) (rr "B" "" "" "" "" "" "" ""))
      (rr "N" "*** \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 - \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397 ***" "" "" "" "" "" "")
      (rr "N" "\U+039F \U+03C0\U+03B1\U+03C1\U+03C9\U+03BD \U+03C0\U+03B9\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C4\U+03B5\U+03BB\U+03B5\U+03B9 \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 \U+03A0\U+039F\U+03A3\U+039F\U+03A4\U+0397\U+03A4\U+03A9\U+039D \U+03BA\U+03B1\U+03B9 \U+03A0\U+03A1\U+039F\U+039A\U+0391\U+03A4\U+0391\U+03A1\U+039A\U+03A4\U+0399\U+039A\U+0397"
          "" "" "" "" "" "")
      (rr "N" "\U+03B4\U+03B9\U+03B1\U+03C3\U+03C4\U+03B1\U+03C3\U+03B9\U+03BF\U+03BB\U+03BF\U+03B3\U+03B7\U+03C3\U+03B7. \U+0394\U+0395\U+039D \U+03A5\U+03A0\U+039F\U+039A\U+0391\U+0398\U+0399\U+03A3\U+03A4\U+0391 \U+03C4\U+03B7 \U+03A3\U+03A4\U+0391\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397, \U+03B7 \U+03BF\U+03C0\U+03BF\U+03B9\U+03B1"
          "" "" "" "" "" "")
      (rr "N" "\U+03B5\U+03BA\U+03C0\U+03BF\U+03BD\U+03B5\U+03B9\U+03C4\U+03B1\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03C5\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03B1\U+03C0\U+03BF \U+03B5\U+03BE\U+03BF\U+03C5\U+03C3\U+03B9\U+03BF\U+03B4\U+03BF\U+03C4\U+03B7\U+03BC\U+03B5\U+03BD\U+03BF \U+03A0\U+03BF\U+03BB\U+03B9\U+03C4\U+03B9\U+03BA\U+03BF \U+039C\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03BF,"
          "" "" "" "" "" "")
      (rr "N" "\U+03BC\U+03B5\U+03BB\U+03BF\U+03C2 \U+03C4\U+03BF\U+03C5 \U+03A4.\U+0395.\U+0395., \U+03BC\U+03B5 \U+03C0\U+03BB\U+03B7\U+03C1\U+03B7 \U+03B1\U+03BD\U+03B1\U+03BB\U+03C5\U+03C3\U+03B7 \U+03BA\U+03B1\U+03C4\U+03B1 EN 1990/1991/1995." "" "" "" "" "" "")
      (rr "B" "" "" "" "" "" "" "")
      (rr "N" (if (= usekat 1)
          (strcat "\U+0391\U+03C0\U+03BF \U+03BA\U+03B1\U+03C4\U+03BF\U+03C8\U+03B7 - \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03BF\U+03BD " (rtos *st-AREA* 2 2)
                  " m2 | \U+03B5\U+03C0\U+03B9\U+03C6\U+03B1\U+03BD\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03B5\U+03B3\U+03B7\U+03C2 " (rtos Aslope 2 2)
                  " m2 | \U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03B7 " (rtos Peave 2 2)
                  " m | \U+03BA\U+03BB\U+03B9\U+03C3\U+03B7 " (rtos (/ ang (/ pi 180.0)) 2 1)
                  " deg | \U+03B3\U+03B5\U+03B9\U+03C3\U+03BF " (rtos ovh 2 2) " m")
          (strcat "\U+0391\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 " (rtos S 2 2) " m | \U+039C\U+03B7\U+03BA\U+03BF\U+03C2 " (rtos *tm-LR* 2 2)
                  " m | \U+039A\U+03BB\U+03B9\U+03C3\U+03B7 " (rtos (/ ang (/ pi 180.0)) 2 1)
                  " deg | \U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03B1 " (itoa nz) " \U+03B1\U+03BD\U+03B1 " (rtos *tm-DIST* 2 2) " m"))
          "" "" "" "" "" "")
      (rr "B" "" "" "" "" "" "" "")
      (rr "H" "1. \U+039E\U+03A5\U+039B\U+0395\U+0399\U+0391" "\U+0394\U+0399\U+0391\U+03A4\U+039F\U+039C\U+0397" "\U+03A4\U+0395\U+039C." "\U+039C\U+0397\U+039A\U+039F\U+03A3/\U+03C4\U+03B5\U+03BC" "\U+03A3\U+03A5\U+039D\U+039F\U+039B\U+039F m" "\U+039F\U+0393\U+039A\U+039F\U+03A3 m3" "")

      (if (= usekat 1)
        (addrow "\U+0391\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2 (\U+03C8\U+03B1\U+03BB\U+03B9\U+03B4\U+03B9\U+03B1)" *tm-AMB* *tm-AM*
                (/ Aslope (* *tm-DIST* Lraf)) Lraf 0)
        (addrow "\U+0391\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2 (\U+03C8\U+03B1\U+03BB\U+03B9\U+03B4\U+03B9\U+03B1)" *tm-AMB* *tm-AM*
                (if (= *tm-TYP* "GAB") (* 2.0 nz) (float nz)) Lraf 0))
      (if (and (= usekat 1) *st-TR*)
        (progn
          (setq Selk 0.0 Sort 0.0 Sant 0.0 Steg 0.0)
          (foreach sp *st-TR*
            (setq Selk (+ Selk sp))
            (setq Sort (+ Sort (max 0.0 (- (* (/ sp 2.0) th) 0.03))))
            (setq Sant (+ Sant (* 2.0 (distance (list 0.0 0.09)
                          (list (/ sp 4.0) (* (/ sp 4.0) th))))))
            (setq Steg (+ Steg (* 2.0 (* (/ sp 4.0) th)))))
          (addrow "\U+0395\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03B7\U+03C1\U+03B5\U+03C2 (\U+03C0\U+03B5\U+03BB\U+03BC\U+03B1)" *tm-EL* *tm-EL* (float (length *st-TR*))
                  (/ Selk (float (length *st-TR*))) 0)
          (if (/= *tm-ZEV* "APLO")
            (progn
              (addrow "\U+039F\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03B1\U+03C4\U+03B5\U+03C2 (\U+03BC\U+03C0\U+03B1\U+03BC\U+03C0\U+03B1\U+03C2)" *tm-ORT* *tm-ORT*
                      (float (length *st-TR*)) (/ Sort (float (length *st-TR*))) 0)
              (addrow "\U+0391\U+03BD\U+03C4\U+03B7\U+03C1\U+03B9\U+03B4\U+03B5\U+03C2 (\U+03BD\U+03C4\U+03B5\U+03C3\U+03C4\U+03B5\U+03BA\U+03B9\U+03B1)" *tm-ANT* *tm-ANT*
                      (* 2.0 (length *st-TR*)) (/ Sant (* 2.0 (length *st-TR*))) 0)))
          (if (= *tm-ZEV* "QUEEN")
            (addrow "\U+03A4\U+03B5\U+03B3\U+03BF\U+03C3\U+03C4\U+03B1\U+03C4\U+03B5\U+03C2" *tm-ORT* *tm-ORT*
                    (* 2.0 (length *st-TR*)) (/ Steg (* 2.0 (length *st-TR*))) 0)))
        (progn
          (if (= *tm-TYP* "GAB")
            (addrow "\U+0395\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03B7\U+03C1\U+03B5\U+03C2 (\U+03C0\U+03B5\U+03BB\U+03BC\U+03B1)" *tm-EL* *tm-EL* (float nz) S 0))
          (if (and (= *tm-TYP* "GAB") (/= *tm-ZEV* "APLO"))
            (progn
              (addrow "\U+039F\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03B1\U+03C4\U+03B5\U+03C2 (\U+03BC\U+03C0\U+03B1\U+03BC\U+03C0\U+03B1\U+03C2)" *tm-ORT* *tm-ORT* (float nz) Lort 0)
              (addrow "\U+0391\U+03BD\U+03C4\U+03B7\U+03C1\U+03B9\U+03B4\U+03B5\U+03C2 (\U+03BD\U+03C4\U+03B5\U+03C3\U+03C4\U+03B5\U+03BA\U+03B9\U+03B1)" *tm-ANT* *tm-ANT* (* 2.0 nz) Lant 0)))
          (if (and (= *tm-TYP* "GAB") (= *tm-ZEV* "QUEEN"))
            (addrow "\U+03A4\U+03B5\U+03B3\U+03BF\U+03C3\U+03C4\U+03B1\U+03C4\U+03B5\U+03C2" *tm-ORT* *tm-ORT* (* 2.0 nz) Lteg 0))))
      (if (> Lkor 0.0)
        (addrow "\U+039A\U+03BF\U+03C1\U+03C6\U+03B9\U+03B1\U+03C2 (\U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03BF\U+03C4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B1)" *tm-KOR* (* korh 100.0) 1.0 Lkor 1))
      (if (> Lmax 0.0)
        (addrow "\U+039C\U+03B1\U+03C7\U+03B9\U+03B1\U+03B4\U+03B5\U+03C2 (\U+03BA\U+03B5\U+03BA\U+03BB\U+03B9\U+03BC\U+03B5\U+03BD\U+03BF\U+03B9 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03B1\U+03B4\U+03B5\U+03C2)" *tm-KOR* (* korh 100.0) 1.0 Lmax 1))
      (if (> Lnt 0.0)
        (addrow "\U+039D\U+03C4\U+03B5\U+03C1\U+03B5\U+03B4\U+03B5\U+03C2 (\U+03BB\U+03BF\U+03C5\U+03BA\U+03B9\U+03B1)" *tm-KOR* (* korh 100.0) 1.0 Lnt 1))
      (addrow "\U+03A3\U+03C4\U+03C1\U+03C9\U+03C4\U+03B7\U+03C1\U+03B5\U+03C2 / \U+03BC\U+03B7\U+03BA\U+03B9\U+03B4\U+03B5\U+03C2" *tm-STR* *tm-STR* 1.0 Peave 1)
      (addrow "\U+03A4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B5\U+03C2" *tm-TEG* *tm-TEG* 1.0 (/ Aslope dz) 1)
      (addrow "\U+0395\U+03C0\U+03B9\U+03C4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B5\U+03C2" *tm-EPI* *tm-EPI* (/ Aslope (* *tm-DIST* Lraf)) Lraf 0)
      (rr "S" "\U+03A3\U+03A5\U+039D\U+039F\U+039B\U+039F \U+039E\U+03A5\U+039B\U+0395\U+0399\U+0391\U+03A3" "" "" "" "" (strcat (rtos vol 2 3) " m3") "")
      (rr "N" "(*) \U+0391\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2/\U+03C4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B5\U+03C2/\U+03B5\U+03C0\U+03B9\U+03C4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B5\U+03C2: \U+03B1\U+03C0\U+03BF \U+03B5\U+03C0\U+03B9\U+03C6\U+03B1\U+03BD\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03B5\U+03B3\U+03B7\U+03C2." "" "" "" "" "" "")
      (if (= usekat 1)
        (rr "N" (if *st-TR*
              (strcat "(*) \U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03B1: \U+0391\U+039D\U+0391\U+039B\U+03A5\U+03A4\U+0399\U+039A\U+0391 \U+03B1\U+03C0\U+03BF \U+03C4\U+03B7\U+03BD \U+03BA\U+03B1\U+03C4\U+03BF\U+03C8\U+03B7 - "
                      (itoa (length *st-TR*))
                      " \U+03B8\U+03B5\U+03C3\U+03B5\U+03B9\U+03C2 \U+03BA\U+03B1\U+03C4\U+03B1 \U+03BC\U+03B7\U+03BA\U+03BF\U+03C2 \U+03C4\U+03C9\U+03BD \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03B1\U+03B4\U+03C9\U+03BD, \U+03B1\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 = 2t. \U+03A3\U+03C4\U+03B9\U+03C2 \U+03B6\U+03C9\U+03BD\U+03B5\U+03C2"
                      " \U+03C4\U+03C9\U+03BD \U+03BC\U+03B1\U+03C7\U+03B9\U+03C9\U+03BD \U+03C0\U+03C1\U+03BF\U+03C3\U+03C4\U+03B9\U+03B8\U+03B5\U+03BD\U+03C4\U+03B1\U+03B9 \U+03BA\U+03BF\U+03BD\U+03C4\U+03B1 \U+03B6\U+03C5\U+03B3\U+03C9\U+03BC\U+03B1\U+03C4\U+03B1 \U+03BA\U+03B1\U+03C4\U+03B1 \U+03C4\U+03B7\U+03BD \U+03B5\U+03C6\U+03B1\U+03C1\U+03BC\U+03BF\U+03B3\U+03B7.")
              "(*) \U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03B1: \U+03B5\U+03BA\U+03C4\U+03B9\U+03BC\U+03B7\U+03C3\U+03B7.") "" "" "" "" "" ""))
      (rr "B" "" "" "" "" "" "" "")

      ;; --- 2. ΑΓΟΡΑ / ΦΥΡΕΣ ---
      (rr "H" "2. \U+0391\U+0393\U+039F\U+03A1\U+0391 \U+039E\U+03A5\U+039B\U+0395\U+0399\U+0391\U+03A3" "\U+0394\U+0399\U+0391\U+03A4\U+039F\U+039C\U+0397" "\U+03A4\U+0395\U+039C." "\U+039C\U+0397\U+039A\U+039F\U+03A3/\U+03C4\U+03B5\U+03BC" "\U+0395\U+039C\U+03A0.\U+0394\U+039F\U+039A\U+039F\U+03A3" "\U+0391\U+0393\U+039F\U+03A1\U+0391 m" "\U+03A6\U+03A5\U+03A1\U+0391")
      (setq Tbuy 0.0 Tnet 0.0)
      (foreach it items
        (setq inm (nth 0 it) ib2 (nth 1 it) ih2 (nth 2 it)
              iq (nth 3 it) il (nth 4 it) ic (nth 5 it))
        (setq inet (* iq il))
        (setq cut (if (= ic 1) (tm-cutrun inet (if (= *tm-GLUE* "1") 1 0))
                    (tm-cut (fix (+ 0.9999 iq)) il (if (= *tm-GLUE* "1") 1 0))))
        (if (null cut)
          (rr "D" inm (strcat (rtos ib2 2 0) "x" (rtos ih2 2 0))
              (itoa (fix (+ 0.9999 iq))) (rtos il 2 2)
              "\U+03A0\U+039F\U+039B\U+03A5\U+039A\U+039F\U+039B\U+039B\U+0397\U+03A4\U+0397" "-" "\U+03BC\U+03B7\U+03BA\U+03BF\U+03C2>6m")
          (progn
            (setq Tbuy (+ Tbuy (nth 2 cut)) Tnet (+ Tnet inet))
            (rr "D" inm (strcat (rtos ib2 2 0) "x" (rtos ih2 2 0))
                (if (= ic 1) "-" (itoa (fix (+ 0.9999 iq))))
                (if (= ic 1) (strcat "\U+03C3\U+03C5\U+03BD." (rtos inet 2 2)) (rtos il 2 2))
                (strcat (rtos (nth 0 cut) 2 2) "x" (itoa (nth 1 cut)))
                (rtos (nth 2 cut) 2 2)
                (strcat (rtos (nth 3 cut) 2 2) " ("
                        (rtos (if (> inet 0.0) (* 100.0 (/ (nth 3 cut) inet)) 0.0) 2 1)
                        "%)")))))
      (rr "S" "\U+03A3\U+03A5\U+039D\U+039F\U+039B\U+039F \U+0391\U+0393\U+039F\U+03A1\U+0391\U+03A3" "" "" (strcat "\U+03BA\U+03B1\U+03B8." (rtos Tnet 2 2)) ""
          (rtos Tbuy 2 2)
          (strcat (rtos (- Tbuy Tnet) 2 2) " ("
                  (rtos (if (> Tnet 0.0) (* 100.0 (/ (- Tbuy Tnet) Tnet)) 0.0) 2 1) "%)"))
      (rr "N" (strcat "\U+0395\U+03BC\U+03C0\U+03BF\U+03C1\U+03B9\U+03BA\U+03B1 \U+03BC\U+03B7\U+03BA\U+03B7: "
                (if (= *tm-GLUE* "1") "2.50/4.00/6.00/8.00/10.00/12.00 m (\U+03C0\U+03BF\U+03BB\U+03C5\U+03BA\U+03BF\U+03BB\U+03BB\U+03B7\U+03C4\U+03B7)"
                  "2.50/4.00/6.00 m (\U+03BC\U+03B1\U+03C3\U+03B9\U+03C6)")
                " - \U+03B5\U+03C0\U+03B9\U+03BB\U+03B5\U+03B3\U+03B5\U+03C4\U+03B1\U+03B9 \U+03B1\U+03C5\U+03C4\U+03BF \U+03BC\U+03B5 \U+03C4\U+03B7 \U+039C\U+0399\U+039A\U+03A1\U+039F\U+03A4\U+0395\U+03A1\U+0397 \U+03C6\U+03C5\U+03C1\U+03B1.") "" "" "" "" "" "")
      (rr "B" "" "" "" "" "" "" "")

      ;; --- 3. ΠΡΟΓΡΑΜΜΑ ΖΕΥΚΤΩΝ ---
      (if (and (= usekat 1) *st-TR*)
        (progn
          (rr "H" "3. \U+03A0\U+03A1\U+039F\U+0393\U+03A1\U+0391\U+039C\U+039C\U+0391 \U+0396\U+0395\U+03A5\U+039A\U+03A4\U+03A9\U+039D" "\U+0391\U+039D\U+039F\U+0399\U+0393\U+039C\U+0391" "\U+03A4\U+0395\U+039C." "\U+0391\U+039C\U+0395\U+0399\U+0392./\U+03C4\U+03B5\U+03BC" "\U+03A5\U+03A8\U+039F\U+03A3" "" "")
          (setq kk 1)
          (foreach g (st-group *st-TR* 0.10)
            (rr "D" (strcat "\U+0396" (itoa kk)) (strcat (rtos (car g) 2 2) " m")
                (itoa (cadr g)) (rtos (/ (+ (/ (car g) 2.0) ovh) (cos ang)) 2 2)
                (strcat "+" (rtos (* (/ (car g) 2.0) th) 2 2)) "" "")
            (setq kk (1+ kk)))
          (rr "S" "\U+03A3\U+03A5\U+039D\U+039F\U+039B\U+039F \U+0396\U+0395\U+03A5\U+039A\U+03A4\U+03A9\U+039D" "" (itoa (length *st-TR*)) "" "" "" "")
          (rr "B" "" "" "" "" "" "" "")))

      ;; --- ΕΥΡΩΚΩΔΙΚΑΣ: ΦΟΡΤΙΑ ΚΑΙ ΕΛΕΓΧΟΙ ---
      (if (= *ec-ON* "1")
        (progn
          (setq ecr (ec-calc (/ ang (/ pi 180.0)) Lraf *tm-DIST* dz))
          (rr "H" "3b. \U+0395\U+03A5\U+03A1\U+03A9\U+039A\U+03A9\U+0394\U+0399\U+039A\U+0391\U+03A3 1 - \U+03A6\U+039F\U+03A1\U+03A4\U+0399\U+0391" "" "" "\U+03A4\U+0399\U+039C\U+0397" "" "" "")
          (foreach r (list
            (list (strcat "\U+0396\U+03C9\U+03BD\U+03B7 \U+03C7\U+03B9\U+03BF\U+03BD\U+03B9\U+03BF\U+03C5 " (cond ((= *ec-ZONE* 1) "I") ((= *ec-ZONE* 2) "II") (T "III"))
                          " - sk,0 = " (rtos (ec-sk0 *ec-ZONE*) 2 2) " kN/m2") "")
            (list (strcat "\U+03A5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF " (rtos *ec-ALT* 2 0) " m -> sk")
                  (strcat (rtos (nth 0 ecr) 2 3) " kN/m2"))
            (list (strcat "\U+03A3\U+03C5\U+03BD\U+03C4. \U+03BC\U+03BF\U+03C1\U+03C6\U+03B7\U+03C2 \U+03BC1 (\U+03BA\U+03BB\U+03B9\U+03C3\U+03B7 " (rtos (/ ang (/ pi 180.0)) 2 1) " deg)")
                  (rtos (nth 1 ecr) 2 2))
            (list "\U+03A7\U+0399\U+039F\U+039D\U+0399 s = \U+03BC1*Ce*Ct*sk" (strcat (rtos (nth 2 ecr) 2 3) " kN/m2"))
            (list (strcat "\U+0391\U+03BD\U+03B5\U+03BC\U+03BF\U+03C2 vb,0 = " (rtos *ec-VB0* 2 0) " m/s, \U+03B5\U+03B4\U+03B1\U+03C6\U+03BF\U+03C2 \U+03BA\U+03B1\U+03C4. " (itoa *ec-TERR*)
                          ", z = " (rtos *ec-H* 2 2) " m") "")
            (list "\U+039C\U+03B5\U+03C3\U+03B7 \U+03C4\U+03B1\U+03C7\U+03C5\U+03C4\U+03B7\U+03C4\U+03B1 vm" (strcat (rtos (nth 4 ecr) 2 2) " m/s"))
            (list "\U+03A0\U+0399\U+0395\U+03A3\U+0397 \U+0391\U+0399\U+03A7\U+039C\U+0397\U+03A3 qp(z)" (strcat (rtos (nth 3 ecr) 2 3) " kN/m2"))
            (list "\U+0391\U+03BD\U+03B5\U+03BC\U+03BF\U+03C2 \U+03B6\U+03C9\U+03BD\U+03B7 F (\U+03BC\U+03B5\U+03B3. \U+03C5\U+03C0\U+03BF\U+03C0\U+03B9\U+03B5\U+03C3\U+03B7)" (strcat (rtos (nth 5 ecr) 2 3) " kN/m2"))
            (list "\U+0391\U+03BD\U+03B5\U+03BC\U+03BF\U+03C2 \U+03B6\U+03C9\U+03BD\U+03B7 H (\U+03C0\U+03B9\U+03B5\U+03C3\U+03B7)" (strcat (rtos (nth 7 ecr) 2 3) " kN/m2"))
            (list "\U+0399\U+0394\U+0399\U+039F \U+0392\U+0391\U+03A1\U+039F\U+03A3 gk (\U+03B1\U+03C0\U+03BF \U+03C4\U+03B9\U+03C2 \U+03C3\U+03C4\U+03C1\U+03C9\U+03C3\U+03B5\U+03B9\U+03C2)" (strcat (rtos (nth 8 ecr) 2 3) " kN/m2")))
            (rr "D" (car r) "" "" (cadr r) "" "" ""))
          (rr "B" "" "" "" "" "" "" "")
          (rr "H" "3c. \U+03A0\U+03A1\U+039F\U+039A\U+0391\U+03A4\U+0391\U+03A1\U+039A\U+03A4\U+0399\U+039A\U+039F\U+03A3 \U+0395\U+039B\U+0395\U+0393\U+03A7\U+039F\U+03A3 EC5" "" "" "\U+03A4\U+0399\U+039C\U+0397" "\U+039F\U+03A1\U+0399\U+039F" "\U+0392\U+0391\U+0398\U+039C\U+039F\U+03A3" "")
          (rr "D" "1.35G+1.5S+0.9W -> qd \U+03B1\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1" "" ""
              (strcat (rtos (nth 9 ecr) 2 3) " kN/m") "" "" "")
          (rr "D" "\U+0391\U+03BD\U+03B1\U+03C3\U+03B7\U+03BA\U+03C9\U+03C3\U+03B7 1.0G+1.5W" "" ""
              (strcat (rtos (nth 10 ecr) 2 3) " kN/m")
              (if (< (nth 10 ecr) 0.0) "\U+0391\U+039D\U+0391\U+03A3\U+0397\U+039A\U+03A9\U+03A3\U+0397!" "OK") "" "")
          (rr "D" (strcat "\U+0391\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2 " (rtos *tm-AMB* 2 1) "x" (rtos *tm-AM* 2 1)
                          " - \U+03C3m,d / fm,d") "" ""
              (strcat (rtos (nth 12 ecr) 2 2) " MPa")
              (strcat (rtos (nth 13 ecr) 2 2) " MPa")
              (strcat (rtos (* 100.0 (nth 14 ecr)) 2 0) "%")
              (if (<= (nth 14 ecr) 1.0) "OK" "\U+0391\U+039D\U+0395\U+03A0\U+0391\U+03A1\U+039A\U+0397\U+03A3"))
          (rr "D" "\U+0391\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2 - \U+03B2\U+03B5\U+03BB\U+03BF\U+03C2 w / L/300" "" ""
              (strcat (rtos (* 1000.0 (nth 15 ecr)) 2 1) " mm")
              (strcat (rtos (* 1000.0 (nth 16 ecr)) 2 1) " mm")
              (strcat (rtos (* 100.0 (/ (nth 15 ecr) (nth 16 ecr))) 2 0) "%")
              (if (<= (nth 15 ecr) (nth 16 ecr)) "OK" "\U+03A5\U+03A0\U+0395\U+03A1\U+0392\U+0391\U+03A3\U+0397"))
          (rr "D" (strcat "\U+03A4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B1 " (rtos *tm-TEG* 2 1) "x" (rtos *tm-TEG* 2 1)
                          " - \U+03C3m,d / fm,d") "" ""
              (strcat (rtos (nth 18 ecr) 2 2) " MPa")
              (strcat (rtos (nth 13 ecr) 2 2) " MPa")
              (strcat (rtos (* 100.0 (nth 19 ecr)) 2 0) "%")
              (if (<= (nth 19 ecr) 1.0) "OK" "\U+0391\U+039D\U+0395\U+03A0\U+0391\U+03A1\U+039A\U+0397\U+03A3"))
          (rr "N" (strcat "\U+039E\U+03C5\U+03BB\U+03B5\U+03B9\U+03B1 fm,k = " (rtos *ec-FMK* 2 1)
                          " MPa, kmod = 0.90 (\U+03B2\U+03C1\U+03B1\U+03C7\U+03C5\U+03C7\U+03C1\U+03BF\U+03BD\U+03B9\U+03B1), \U+03B3\U+039C = 1.30 -> fm,d = "
                          (rtos (nth 13 ecr) 2 2) " MPa") "" "" "" "" "" "")
          (rr "N" "\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03A0\U+03A1\U+039F\U+039A\U+0391\U+03A4\U+0391\U+03A1\U+039A\U+03A4\U+0399\U+039A\U+0397 \U+03B4\U+03B9\U+03B1\U+03C3\U+03C4\U+03B1\U+03C3\U+03B9\U+03BF\U+03BB\U+03BF\U+03B3\U+03B7\U+03C3\U+03B7 (\U+03B1\U+03BC\U+03C6\U+03B9\U+03B5\U+03C1\U+03B5\U+03B9\U+03C3\U+03C4\U+03BF\U+03C2 \U+03B1\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2,"
              "" "" "" "" "" "")
          (rr "N" "\U+03BC\U+03BF\U+03BD\U+03BF \U+03BA\U+03B1\U+03BC\U+03C8\U+03B7). \U+0394\U+0395\U+039D \U+03B1\U+03BD\U+03C4\U+03B9\U+03BA\U+03B1\U+03B8\U+03B9\U+03C3\U+03C4\U+03B1 \U+03C3\U+03C4\U+03B1\U+03C4\U+03B9\U+03BA\U+03B7 \U+03BC\U+03B5\U+03BB\U+03B5\U+03C4\U+03B7: \U+03BB\U+03C5\U+03B3\U+03B9\U+03C3\U+03BC\U+03BF\U+03C2, \U+03B4\U+03B9\U+03B1\U+03C4\U+03BC\U+03B7\U+03C3\U+03B7,"
              "" "" "" "" "" "")
          (rr "N" "\U+03C3\U+03C5\U+03BD\U+03B4\U+03B5\U+03C3\U+03B5\U+03B9\U+03C2, \U+03C3\U+03C5\U+03C3\U+03C3\U+03C9\U+03C1\U+03B5\U+03C5\U+03C3\U+03B7 \U+03C7\U+03B9\U+03BF\U+03BD\U+03B9\U+03BF\U+03C5, \U+03C3\U+03B5\U+03B9\U+03C3\U+03BC\U+03BF\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03B1\U+03BD\U+03B5\U+03BC\U+03BF\U+03C2 \U+03BA\U+03B1\U+03C4\U+03B1 \U+03B8=90 \U+03B8\U+03B5\U+03BB\U+03BF\U+03C5\U+03BD"
              "" "" "" "" "" "")
          (rr "N" "\U+03C0\U+03BB\U+03B7\U+03C1\U+03B7 \U+03B1\U+03BD\U+03B1\U+03BB\U+03C5\U+03C3\U+03B7 \U+03BA\U+03B1\U+03C4\U+03B1 EN 1995-1-1." "" "" "" "" "" "")
          (rr "B" "" "" "" "" "" "" "")))

      ;; --- ΠΙΝΑΚΑΣ ΞΥΛΩΝ ΞΥΛΟΤΥΠΟΥ (ταιριαζει με τη σημανση στο σχεδιο) ---
      (if *st-XSCH*
        (progn
          (rr "H" "3d. \U+03A0\U+0399\U+039D\U+0391\U+039A\U+0391\U+03A3 \U+039E\U+03A5\U+039B\U+03A9\U+039D (\U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3)" "\U+0394\U+0399\U+0391\U+03A4\U+039F\U+039C\U+0397" "\U+03A4\U+0395\U+039C." "\U+039C\U+0397\U+039A\U+039F\U+03A3"
              "\U+03A3\U+03A5\U+039D\U+039F\U+039B\U+039F m" "" "")
          (foreach xg *st-XSCH*
            (if (caddr xg)
              (progn
                (setq kk 1 sp 0.0)
                (foreach g (caddr xg)
                  (rr "D" (strcat (car xg) (itoa kk)
                            (cond ((= (car xg) "A") "  \U+0391\U+03BC\U+03B5\U+03B9\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2")
                                  ((= (car xg) "T") "  \U+03A4\U+03B5\U+03B3\U+03B9\U+03B4\U+03B1")
                                  ((= (car xg) "D") "  \U+0394\U+03BF\U+03BA\U+03BF\U+03C2 \U+03C3\U+03BA\U+03B5\U+03BB\U+03B5\U+03C4\U+03BF\U+03C5")
                                  ((= (car xg) "S") "  \U+03A3\U+03C4\U+03C1\U+03C9\U+03C4\U+03B7\U+03C1\U+03B1\U+03C2")
                                  (T "  \U+0395\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03B7\U+03C1\U+03B1\U+03C2 \U+03B6\U+03B5\U+03C5\U+03BA\U+03C4\U+03BF\U+03C5")))
                      (cadr xg) (itoa (cadr g)) (rtos (car g) 2 2)
                      (rtos (* (car g) (cadr g)) 2 2) "" "")
                  (setq sp (+ sp (* (car g) (cadr g))))
                  (setq kk (1+ kk)))
                (rr "S" (strcat "  \U+03A3\U+03C5\U+03BD\U+03BF\U+03BB\U+03BF " (car xg)) (cadr xg) "" ""
                    (rtos sp 2 2) "" ""))))
          (rr "N" "\U+039F\U+03B9 \U+03BA\U+03C9\U+03B4\U+03B9\U+03BA\U+03BF\U+03B9 A/T/D/S/Z \U+03B1\U+03BD\U+03C4\U+03B9\U+03C3\U+03C4\U+03BF\U+03B9\U+03C7\U+03BF\U+03C5\U+03BD \U+03C3\U+03C4\U+03B7 \U+03C3\U+03B7\U+03BC\U+03B1\U+03BD\U+03C3\U+03B7 \U+03C0\U+03B1\U+03BD\U+03C9 \U+03C3\U+03C4\U+03BF\U+03BD \U+03BE\U+03C5\U+03BB\U+03BF\U+03C4\U+03C5\U+03C0\U+03BF."
              "" "" "" "" "" "")
          (rr "B" "" "" "" "" "" "" "")))

      ;; --- 4. ΕΠΙΦΑΝΕΙΕΣ ---
      (rr "H" "4. \U+0395\U+03A0\U+0399\U+03A6\U+0391\U+039D\U+0395\U+0399\U+0395\U+03A3" "" "" "\U+0395\U+039C\U+0392\U+0391\U+0394\U+039F\U+039D" "" "" "")
      (foreach r (list
        (list (strcat "\U+03A0\U+03B5\U+03C4\U+03C3\U+03C9\U+03BC\U+03B1 / \U+03C0\U+03B5\U+03C4\U+03B1\U+03C5\U+03C1\U+03C9\U+03C3\U+03B7 " (rtos *tm-PET* 2 1) " cm") Aslope)
        (list (strcat "\U+0398\U+03B5\U+03C1\U+03BC\U+03BF\U+03BC\U+03BF\U+03BD\U+03C9\U+03C3\U+03B7 " (rtos *tm-TTH* 2 1) " cm") Aslope)
        (list "\U+03A6\U+03C1\U+03B1\U+03B3\U+03BC\U+03B1 \U+03C5\U+03B4\U+03C1\U+03B1\U+03C4\U+03BC\U+03C9\U+03BD (+10% \U+03B5\U+03C0\U+03B9\U+03BA\U+03B1\U+03BB\U+03C5\U+03C8\U+03B7)" (* Aslope 1.10))
        (list "\U+03A3\U+03C4\U+03B5\U+03B3\U+03B1\U+03BD\U+03C9\U+03C4\U+03B9\U+03BA\U+03B7 \U+03BC\U+03B5\U+03BC\U+03B2\U+03C1\U+03B1\U+03BD\U+03B7 (+10%)" (* Aslope 1.10)))
        (rr "D" (car r) "" "" (strcat (rtos (cadr r) 2 2) " m2") "" "" ""))
      (rr "B" "" "" "" "" "" "" "")

      ;; --- 5. ΕΠΙΚΑΛΥΨΗ ---
      (rr "H" "5. \U+0395\U+03A0\U+0399\U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397 / \U+0395\U+0399\U+0394\U+0399\U+039A\U+0391 \U+03A4\U+0395\U+039C\U+0391\U+03A7\U+0399\U+0391" "" "" "\U+03A0\U+039F\U+03A3\U+039F\U+03A4\U+0397\U+03A4\U+0391" "" "" "")
      (foreach r (list
        (list "\U+0395\U+03C0\U+03B9\U+03C6\U+03B1\U+03BD\U+03B5\U+03B9\U+03B1 \U+03B5\U+03C0\U+03B9\U+03BA\U+03B1\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2" (strcat (rtos Aslope 2 2) " m2"))
        (list (strcat "\U+039A\U+03B5\U+03C1\U+03B1\U+03BC\U+03B9\U+03B4\U+03B9\U+03B1 " (rtos *tm-KM2* 2 1) " \U+03C4\U+03B5\U+03BC/m2")
              (strcat (itoa (fix (+ 0.999 (* Aslope *tm-KM2*)))) " \U+03C4\U+03B5\U+03BC"))
        (list (strcat "\U+039A\U+03B1\U+03B2\U+03B1\U+03BB\U+03BB\U+03B1\U+03C1\U+03B7\U+03B4\U+03B5\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03B1 (" (rtos Lkor 2 2) " m)")
              (strcat (itoa (fix (+ 0.999 (/ Lkor *tm-KAVL*)))) " \U+03C4\U+03B5\U+03BC"))
        (list (strcat "\U+039A\U+03B1\U+03B2\U+03B1\U+03BB\U+03BB\U+03B1\U+03C1\U+03B7\U+03B4\U+03B5\U+03C2 \U+03BC\U+03B1\U+03C7\U+03B9\U+03C9\U+03BD (" (rtos Lmax 2 2) " m)")
              (if (> Lmax 0.0) (strcat (itoa (fix (+ 0.999 (/ Lmax *tm-KAVL*)))) " \U+03C4\U+03B5\U+03BC") "-"))
        (list (strcat "\U+039B\U+03B1\U+03BC\U+03B1\U+03C1\U+03B9\U+03BD\U+03B1 \U+03BD\U+03C4\U+03B5\U+03C1\U+03B5\U+03B4\U+03C9\U+03BD (" (rtos Lnt 2 2) " m)")
              (if (> Lnt 0.0) (strcat (rtos (* Lnt 1.10) 2 2) " m") "-"))
        (list (strcat "\U+0391\U+03BA\U+03C1\U+03BF\U+03BA\U+03B5\U+03C1\U+03B1\U+03BC\U+03B1 \U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03B7\U+03C2 (" (rtos Peave 2 2) " m)")
              (strcat (itoa (fix (+ 0.999 (/ Peave 0.25)))) " \U+03C4\U+03B5\U+03BC"))
        (list "\U+0391\U+03B5\U+03C1\U+03B9\U+03C3\U+03C4\U+03B7\U+03C1\U+03B5\U+03C2 (1 \U+03B1\U+03BD\U+03B1 25 m2)"
              (strcat (itoa (max 2 (fix (+ 0.999 (/ Aslope 25.0))))) " \U+03C4\U+03B5\U+03BC"))
        (list "\U+03A4\U+03B5\U+03C1\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03B1 \U+03BA\U+03B1\U+03B2\U+03B1\U+03BB\U+03BB\U+03B1\U+03C1\U+03B7" (if (= *tm-TYP* "GAB") "2 \U+03C4\U+03B5\U+03BC" "-")))
        (rr "D" (car r) "" "" (cadr r) "" "" ""))
      (rr "B" "" "" "" "" "" "" "")
      (rr "T" "\U+0394\U+0397\U+039B\U+03A9\U+03A3\U+0397 \U+039F\U+03A1\U+0399\U+03A9\U+039D \U+03A7\U+03A1\U+0397\U+03A3\U+0397\U+03A3" "" "" "" "" "" "")
      (rr "N" "1. \U+03A4\U+03B1 \U+03B1\U+03BD\U+03C9\U+03C4\U+03B5\U+03C1\U+03C9 \U+03B1\U+03C0\U+03BF\U+03C4\U+03B5\U+03BB\U+03BF\U+03C5\U+03BD \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 \U+03A0\U+039F\U+03A3\U+039F\U+03A4\U+0397\U+03A4\U+03A9\U+039D (\U+03C0\U+03C1\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7) \U+03B2\U+03B1\U+03C3\U+03B5\U+03B9 \U+03C4\U+03B7\U+03C2"
          "" "" "" "" "" "")
      (rr "N" "   \U+03B3\U+03B5\U+03C9\U+03BC\U+03B5\U+03C4\U+03C1\U+03B9\U+03B1\U+03C2 \U+03C4\U+03B7\U+03C2 \U+03BA\U+03B1\U+03C4\U+03B1\U+03C8\U+03B7\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03C4\U+03C9\U+03BD \U+03C0\U+03B1\U+03C1\U+03B1\U+03BC\U+03B5\U+03C4\U+03C1\U+03C9\U+03BD \U+03C0\U+03BF\U+03C5 \U+03B5\U+03B9\U+03C3\U+03B7\U+03B3\U+03B1\U+03B3\U+03B5 \U+03BF \U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03B7\U+03C2."
          "" "" "" "" "" "")
      (rr "N" "2. \U+039F\U+03B9 \U+03B5\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03B9 \U+03BA\U+03B1\U+03C4\U+03B1 EN 1995-1-1 \U+03B5\U+03B9\U+03BD\U+03B1\U+03B9 \U+03A0\U+03A1\U+039F\U+039A\U+0391\U+03A4\U+0391\U+03A1\U+039A\U+03A4\U+0399\U+039A\U+039F\U+0399 (\U+03BA\U+03B1\U+03BC\U+03C8\U+03B7 \U+03BA\U+03B1\U+03B9 \U+03B2\U+03B5\U+03BB\U+03BF\U+03C2"
          "" "" "" "" "" "")
      (rr "N" "   \U+03B1\U+03BC\U+03C6\U+03B9\U+03B5\U+03C1\U+03B5\U+03B9\U+03C3\U+03C4\U+03BF\U+03C5 \U+03BC\U+03B5\U+03BB\U+03BF\U+03C5\U+03C2). \U+0394\U+03B5\U+03BD \U+03BA\U+03B1\U+03BB\U+03C5\U+03C0\U+03C4\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 \U+03BB\U+03C5\U+03B3\U+03B9\U+03C3\U+03BC\U+03BF\U+03C2, \U+03B4\U+03B9\U+03B1\U+03C4\U+03BC\U+03B7\U+03C3\U+03B7, \U+03C3\U+03C5\U+03BD\U+03B4\U+03B5\U+03C3\U+03B5\U+03B9\U+03C2,"
          "" "" "" "" "" "")
      (rr "N" "   \U+03C3\U+03C5\U+03C3\U+03C3\U+03C9\U+03C1\U+03B5\U+03C5\U+03C3\U+03B7 \U+03C7\U+03B9\U+03BF\U+03BD\U+03B9\U+03BF\U+03C5, \U+03C3\U+03B5\U+03B9\U+03C3\U+03BC\U+03B9\U+03BA\U+03B5\U+03C2 \U+03B4\U+03C1\U+03B1\U+03C3\U+03B5\U+03B9\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03B1\U+03BD\U+03B5\U+03BC\U+03BF\U+03C2 \U+03BA\U+03B1\U+03C4\U+03B1 \U+03B8=90 \U+03BC\U+03BF\U+03B9\U+03C1\U+03B5\U+03C2."
          "" "" "" "" "" "")
      (rr "N" "3. \U+03A4\U+039F \U+03A0\U+0391\U+03A1\U+039F\U+039D \U+0394\U+0395\U+039D \U+03A5\U+03A0\U+039F\U+039A\U+0391\U+0398\U+0399\U+03A3\U+03A4\U+0391 \U+03A4\U+0397 \U+03A3\U+03A4\U+0391\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397. \U+0397 \U+03BC\U+03B5\U+03BB\U+03B5\U+03C4\U+03B7 \U+03C4\U+03BF\U+03C5 \U+03C6\U+03B5\U+03C1\U+03BF\U+03BD\U+03C4\U+03BF\U+03C2"
          "" "" "" "" "" "")
      (rr "N" "   \U+03BF\U+03C1\U+03B3\U+03B1\U+03BD\U+03B9\U+03C3\U+03BC\U+03BF\U+03C5 \U+03B5\U+03BA\U+03C0\U+03BF\U+03BD\U+03B5\U+03B9\U+03C4\U+03B1\U+03B9, \U+03C5\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03C3\U+03C6\U+03C1\U+03B1\U+03B3\U+03B9\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03B1\U+03C0\U+03BF \U+03B5\U+03BE\U+03BF\U+03C5\U+03C3\U+03B9\U+03BF\U+03B4\U+03BF\U+03C4\U+03B7\U+03BC\U+03B5\U+03BD\U+03BF"
          "" "" "" "" "" "")
      (rr "N" "   \U+03A0\U+03BF\U+03BB\U+03B9\U+03C4\U+03B9\U+03BA\U+03BF \U+039C\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03BF, \U+03BC\U+03B5\U+03BB\U+03BF\U+03C2 \U+03C4\U+03BF\U+03C5 \U+03A4\U+03B5\U+03C7\U+03BD\U+03B9\U+03BA\U+03BF\U+03C5 \U+0395\U+03C0\U+03B9\U+03BC\U+03B5\U+03BB\U+03B7\U+03C4\U+03B7\U+03C1\U+03B9\U+03BF\U+03C5 \U+0395\U+03BB\U+03BB\U+03B1\U+03B4\U+03BF\U+03C2 (\U+03A4.\U+0395.\U+0395.)."
          "" "" "" "" "" "")
      (rr "N" "4. \U+039F \U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03B7\U+03C2 \U+03BF\U+03C6\U+03B5\U+03B9\U+03BB\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03B5\U+03BB\U+03B5\U+03B3\U+03BE\U+03B5\U+03B9 \U+03BF\U+03BB\U+03B5\U+03C2 \U+03C4\U+03B9\U+03C2 \U+03C4\U+03B9\U+03BC\U+03B5\U+03C2 \U+03C0\U+03C1\U+03B9\U+03BD \U+03B1\U+03C0\U+03BF \U+03BF\U+03C0\U+03BF\U+03B9\U+03B1\U+03B4\U+03B7\U+03C0\U+03BF\U+03C4\U+03B5 \U+03C7\U+03C1\U+03B7\U+03C3\U+03B7"
          "" "" "" "" "" "")
      (rr "N" "   \U+03C3\U+03B5 \U+03BC\U+03B5\U+03BB\U+03B5\U+03C4\U+03B7, \U+03C0\U+03C1\U+03BF\U+03C3\U+03C6\U+03BF\U+03C1\U+03B1 \U+03AE \U+03BA\U+03B1\U+03C4\U+03B1\U+03C3\U+03BA\U+03B5\U+03C5\U+03B7." "" "" "" "" "" "")
      (rr "B" "" "" "" "" "" "" "")
      (rr "N" "\U+03A0\U+03B1\U+03C1\U+03B1\U+03C7\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BC\U+03B5 HEXIS STEGH" "" "" "" "" "" "")

      ;; ---------- ΑΠΟΔΟΣΗ ----------
      (if (/= *tm-OUT* "ARXEIO")
        (progn
          ;; ΚΑΤΩ απο το υπομνημα (17 γραμμες x 1.7 + περιθωριο)
          (setq px (+ (car ins) S 1.30)
                py (- (+ (cadr A0) (* lh 4.0)) (* lh 36.0)))
          (tm-drawrows px py lh)))
      (if (/= *tm-OUT* "SXEDIO")
        (progn
          ;; ΔΙΑΛΟΓΟΣ ΑΠΟΘΗΚΕΥΣΗΣ - διαλέγεις ΕΣΥ πού θα πάει
          (setq fbase (getfiled "\U+0391\U+03C0\U+03BF\U+03B8\U+03AE\U+03BA\U+03B5\U+03C5\U+03C3\U+03B7 \U+03C0\U+03C1\U+03BF\U+03BC\U+03AD\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2"
                                "PROMETRISI_STEGIS" "rtf" 1))
          (if fbase
            (if (> (strlen fbase) 4)
              (setq fbase (substr fbase 1 (- (strlen fbase) 4))))
            (progn
              (setq fbase (getvar "DWGPREFIX"))
              (if (or (null fbase) (not (= (type fbase) (quote STR))) (= fbase ""))
                (setq fbase (getvar "TEMPPREFIX")))
              (if (or (null fbase) (not (= (type fbase) (quote STR)))) (setq fbase ""))
              (setq fbase (strcat fbase "PROMETRISI_STEGIS"))))
          (if (tm-writefiles fbase)
            (princ (strcat "\n\n>>> \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397 \U+0393\U+03A1\U+0391\U+03A6\U+03A4\U+0397\U+039A\U+0395:"
              "\n    " fbase ".rtf   <-- \U+03B1\U+03BD\U+03BF\U+03B9\U+03B3\U+03B5\U+03B9 \U+03B1\U+03C0\U+03B5\U+03C5\U+03B8\U+03B5\U+03B9\U+03B1\U+03C2 \U+03C3\U+03B5 WORD"
              "\n    " fbase ".txt   <-- \U+03B1\U+03C0\U+03BB\U+03BF \U+03BA\U+03B5\U+03B9\U+03BC\U+03B5\U+03BD\U+03BF"))
            (princ "\n*** \U+0394\U+03B5\U+03BD \U+03B7\U+03C4\U+03B1\U+03BD \U+03B4\U+03C5\U+03BD\U+03B1\U+03C4\U+03B7 \U+03B7 \U+03B5\U+03B3\U+03B3\U+03C1\U+03B1\U+03C6\U+03B7 \U+03C4\U+03C9\U+03BD \U+03B1\U+03C1\U+03C7\U+03B5\U+03B9\U+03C9\U+03BD \U+03C0\U+03C1\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03B7\U+03C3\U+03B7\U+03C2."))))))

  (princ (strcat "\n--- STEGHTOMI v2 ---"
    "\n\U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03CC: " (cond ((= *tm-ZEV* "APLO") "\U+03B1\U+03C0\U+03BB\U+03CC \U+03C8\U+03B1\U+03BB\U+03AF\U+03B4\U+03B9")
                       ((= *tm-ZEV* "QUEEN") "\U+03BC\U+03B5 \U+03BF\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7 + \U+03C4\U+03B5\U+03B3\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B5\U+03C2")
                       (T "\U+03BC\U+03B5 \U+03BF\U+03C1\U+03B8\U+03BF\U+03C3\U+03C4\U+03AC\U+03C4\U+03B7 (\U+03BC\U+03C0\U+03B1\U+03BC\U+03C0\U+03AC)"))
    "  \U+00B7  " (if (= *tm-TYP* "GAB") "\U+03B4\U+03AF\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7" "\U+03BC\U+03BF\U+03BD\U+03CC\U+03C1\U+03C1\U+03B9\U+03C7\U+03C4\U+03B7")
    "\n\U+0386\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 " (rtos S 2 2) " m  \U+00B7  \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 "
    (rtos (/ ang (/ pi 180.0)) 2 1) "\U+00B0 (" (rtos (* th 100.0) 2 1) "%)"
    "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C6\U+03B9\U+03AC +" (rtos hh 2 3) " m  \U+00B7  \U+03BC\U+03AE\U+03BA\U+03BF\U+03C2 \U+03B1\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B1 "
    (rtos kbot 2 3) " m"
    "\n\U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2 \U+03B1\U+03BD\U+03AC \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7: " (itoa nteg) "  \U+00B7  \U+03B6\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC \U+03B1\U+03BD\U+03AC " (rtos *tm-DIST* 2 2) " m"
    "\n\U+03A0\U+03B7\U+03B3\U+03AD\U+03C2: \U+03A4\U+0395\U+0399 \U+0397\U+03C0\U+03B5\U+03AF\U+03C1\U+03BF\U+03C5 \U+03A3\U+03C7.7.1 \U+00B7 \U+0395\U+039C\U+03A0 (\U+03BA\U+03C1\U+03B5\U+03BC\U+03B1\U+03C3\U+03C4\U+03AD\U+03C2 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B5\U+03C2) \U+00B7 \U+0395\U+03C5\U+03C1\U+03C9\U+03BA\U+03CE\U+03B4\U+03B9\U+03BA\U+03B1\U+03C2 5"
    "\n\n*** \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 / \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397 - \U+0394\U+0395\U+039D \U+03A5\U+03A0\U+039F\U+039A\U+0391\U+0398\U+0399\U+03A3\U+03A4\U+0391 \U+03A3\U+03A4\U+0391\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397 ***"
    "\n    \U+0397 \U+03BC\U+03B5\U+03BB\U+03AD\U+03C4\U+03B7 \U+03C4\U+03BF\U+03C5 \U+03C6\U+03AD\U+03C1\U+03BF\U+03BD\U+03C4\U+03BF\U+03C2 \U+03BF\U+03C1\U+03B3\U+03B1\U+03BD\U+03B9\U+03C3\U+03BC\U+03BF\U+03CD \U+03B5\U+03BA\U+03C0\U+03BF\U+03BD\U+03B5\U+03AF\U+03C4\U+03B1\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03C5\U+03C0\U+03BF\U+03B3\U+03C1\U+03AC\U+03C6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03B1\U+03C0\U+03CC"
    "\n    \U+03B5\U+03BE\U+03BF\U+03C5\U+03C3\U+03B9\U+03BF\U+03B4\U+03BF\U+03C4\U+03B7\U+03BC\U+03AD\U+03BD\U+03BF \U+03A0\U+03BF\U+03BB\U+03B9\U+03C4\U+03B9\U+03BA\U+03CC \U+039C\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03CC, \U+03BC\U+03AD\U+03BB\U+03BF\U+03C2 \U+03A4.\U+0395.\U+0395."))
  (princ))

;; ===================== ΑΝΑΠΤΥΓΜΑ ΕΔΡΩΝ =====================
;; Οι εδρες εξαγονται απο τον ΓΡΑΦΟ (πλευρες + τοξα σκελετου) με
;; διασχιση "επομενη ακμη = η αμεσως ΔΕΞΙΟΣΤΡΟΦΑ μετα την αντιστροφη".
;; Δινει ΑΚΡΙΒΩΣ μια εδρα ανα πλευρα - αθροισμα = εμβαδον καταψης.
;; Το ξεδιπλωμα τεντωνει ΚΑΘΕΤΑ στην υδρορροη κατα 1/cos(κλισης).

;; --- λιστα κομβων: μοναδικα σημεια ---
(defun an-nid (p nodes / i n r)
  (setq n (length nodes) i 0 r nil)
  (while (< i n)
    (if (and (null r) (< (distance p (nth i nodes)) 1e-6)) (setq r i))
    (setq i (1+ i)))
  r)

;; --- γειτονες κομβου, ταξινομημενοι κατα γωνια (αυξουσα) ---
(defun an-nb (k nodes edg / out e o a i n sorted mn mi rest)
  (setq out (list))
  (foreach e edg
    (setq o nil)
    (if (= (car e) k) (setq o (cadr e)))
    (if (= (cadr e) k) (setq o (car e)))
    (if (and o (not (member o out))) (setq out (append out (list o)))))
  ;; ταξινομηση κατα γωνια
  (setq sorted (list))
  (while out
    (setq mn nil mi nil)
    (foreach o out
      (setq a (angle (nth k nodes) (nth o nodes)))
      (if (or (null mn) (< a mn)) (setq mn a mi o)))
    (setq sorted (append sorted (list mi)))
    (setq rest (list))
    (foreach o out (if (/= o mi) (setq rest (append rest (list o)))))
    (setq out rest))
  sorted)

;; --- ΕΞΑΓΩΓΗ ΕΔΡΩΝ -> λιστα πολυγωνων (λιστες σημειων) ---
(defun an-faces (pts arcs / nodes edg n i a b k1 k2 e cu cv f out seen
                  nbl idx g key p q ar)
  (setq nodes (list) edg (list))
  (defun an-add (p / r)
    (setq r (an-nid p nodes))
    (if (null r)
      (progn (setq nodes (append nodes (list p))) (setq r (1- (length nodes)))))
    r)
  (setq n (length pts) i 0)
  (while (< i n)
    (setq k1 (an-add (nth i pts)) k2 (an-add (nth (rem (1+ i) n) pts)))
    (setq edg (append edg (list (list k1 k2))))
    (setq i (1+ i)))
  (foreach a arcs
    (setq k1 (an-add (car a)) k2 (an-add (cadr a)))
    (setq edg (append edg (list (list k1 k2)))))
  ;; προϋπολογισμος γειτονων
  (setq nbl (list) i 0)
  (while (< i (length nodes))
    (setq nbl (append nbl (list (an-nb i nodes edg))))
    (setq i (1+ i)))
  ;; διασχιση
  (setq seen (list) out (list) i 0)
  (while (< i (length nodes))
    (foreach q (nth i nbl)
      (setq key (+ (* i 10000) q))
      (if (not (member key seen))
        (progn
          (setq f (list) cu i cv q g 0)
          (while (and (not (member (+ (* cu 10000) cv) seen)) (< g 4000))
            (setq g (1+ g))
            (setq seen (append seen (list (+ (* cu 10000) cv))))
            (setq f (append f (list (nth cu nodes))))
            (setq p (nth cv nbl))
            (setq idx (- (length p) (length (member cu p))))
            (setq k1 cv k2 (nth (rem (+ idx (1- (length p))) (length p)) p))
            (setq cu k1 cv k2))
          (if (>= (length f) 3)
            (progn
              (setq ar (/ (st-area2 f) 2.0))
              (if (> ar 1e-6) (setq out (append out (list f)))))))))
    (setq i (1+ i)))
  out)

;; --- ΞΕΔΙΠΛΩΜΑ ΕΔΡΑΣ πανω στην πλευρα (a,b) ---
;; -> (πολυγωνο εμβαδον μηκος_υδρορροης)
(defun an-unfold (f a b ca / LL dr nv out p u v ar)
  (setq LL (distance a b))
  (if (< LL 1e-9) nil
    (progn
      (setq dr (list (/ (- (car b) (car a)) LL) (/ (- (cadr b) (cadr a)) LL)))
      (setq nv (list (- 0.0 (cadr dr)) (car dr)))
      (setq out (list))
      (foreach p f
        (setq u (+ (* (- (car p) (car a)) (car dr)) (* (- (cadr p) (cadr a)) (cadr dr))))
        (setq v (+ (* (- (car p) (car a)) (car nv)) (* (- (cadr p) (cadr a)) (cadr nv))))
        (setq out (append out (list (list u (/ v ca))))))
      (setq ar (abs (/ (st-area2 out) 2.0)))
      (list out ar LL))))

;; --- βρες την εδρα που περιεχει την πλευρα (a,b) ---
(defun an-pick (faces a b / r f n i p q m dx dy L2 tt)
  (setq r nil)
  ;; 1. ακριβης αντιστοιχια ακμης
  (foreach f faces
    (if (null r)
      (progn
        (setq n (length f) i 0)
        (while (< i n)
          (setq p (nth i f) q (nth (rem (1+ i) n) f))
          (if (and (< (distance p a) 1e-6) (< (distance q b) 1e-6)) (setq r f))
          (setq i (1+ i))))))
  ;; 2. εφεδρικο: το ΜΕΣΟ της πλευρας πανω σε ακμη της εδρας
  ;;    (χρειαζεται σε εκφυλισμενους σκελετους, οπου δυο πλευρες
  ;;     μοιραζονται εδρα και η ακριβης αντιστοιχια αποτυγχανει)
  (if (null r)
    (progn
      (setq m (list (/ (+ (car a) (car b)) 2.0) (/ (+ (cadr a) (cadr b)) 2.0)))
      (foreach f faces
        (if (null r)
          (progn
            (setq n (length f) i 0)
            (while (< i n)
              (setq p (nth i f) q (nth (rem (1+ i) n) f))
              (setq dx (- (car q) (car p)) dy (- (cadr q) (cadr p)))
              (setq L2 (+ (* dx dx) (* dy dy)))
              (if (> L2 1e-12)
                (progn
                  (setq tt (/ (+ (* (- (car m) (car p)) dx) (* (- (cadr m) (cadr p)) dy)) L2))
                  (if (< tt 0.0) (setq tt 0.0))
                  (if (> tt 1.0) (setq tt 1.0))
                  (if (< (distance m (list (+ (car p) (* tt dx)) (+ (cadr p) (* tt dy)))) 1e-6)
                    (setq r f))))
              (setq i (1+ i))))))))
  r)

;; ===================== ΕΝΤΟΛΗ STEGHXYLO =====================
;; Ξυλότυπος από τα δεδομένα της τελευταίας εκτέλεσης του STEGH
(defun C:STEGHXYLO ( / *error* xp xx0 yy0 xres p)
  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGHXYLO: " msg)))
    (princ))
  (if (null *st-DARCS*)
    (progn
      (princ "\n*** \U+0394\U+03B5\U+03BD \U+03C5\U+03C0\U+03AC\U+03C1\U+03C7\U+03BF\U+03C5\U+03BD \U+03B4\U+03B5\U+03B4\U+03BF\U+03BC\U+03AD\U+03BD\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2.")
      (princ "\n    \U+03A4\U+03C1\U+03AD\U+03BE\U+03B5 \U+03C0\U+03C1\U+03CE\U+03C4\U+03B1 \U+03C4\U+03B7\U+03BD \U+03B5\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE STEGH \U+03C3\U+03C4\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1.")
      (exit)))
  (princ (strcat "\n>>> \U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03C4\U+03B5\U+03BB\U+03B5\U+03C5\U+03C4\U+03B1\U+03AF\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7 ("
                 (itoa (length *st-DARCS*)) " \U+03B4\U+03BF\U+03BA\U+03BF\U+03AF \U+03C3\U+03BA\U+03B5\U+03BB\U+03B5\U+03C4\U+03BF\U+03CD, "
                 (itoa (length *st-TRP*)) " \U+03B6\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC)"))
  (initget "Nai Ochi")
  (setq p (getkword "\n\U+03A3\U+03AE\U+03BC\U+03B1\U+03BD\U+03C3\U+03B7 \U+03BE\U+03CD\U+03BB\U+03C9\U+03BD [Nai/Ochi] <Nai>: "))
  (setq *st-XMK* (if (= p "Ochi") "0" "1"))
  (setq xp (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 \U+03BE\U+03C5\U+03BB\U+03BF\U+03C4\U+03CD\U+03C0\U+03BF\U+03C5 (\U+03BA\U+03AC\U+03C4\U+03C9-\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AC): "))
  (if (null xp) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq xx0 (car (car *st-EAV*)) yy0 (cadr (car *st-EAV*)))
  (foreach p *st-EAV*
    (if (< (car p) xx0) (setq xx0 (car p)))
    (if (< (cadr p) yy0) (setq yy0 (cadr p))))
  (setq xres (st-xylo *st-EAV* *st-HOLES* *st-DARCS*
                      (- (car xp) xx0) (- (cadr xp) yy0)
                      *tm-DIST* *tm-DZ* *st-TXH*))
  (princ (strcat "\n--- \U+039E\U+03A5\U+039B\U+039F\U+03A4\U+03A5\U+03A0\U+039F\U+03A3 ---"
    "\n\U+0391\U+03BC\U+03B5\U+03AF\U+03B2\U+03BF\U+03BD\U+03C4\U+03B5\U+03C2: " (itoa (car xres))
    "  \U+03A4\U+03B5\U+03B3\U+03AF\U+03B4\U+03B5\U+03C2: " (itoa (cadr xres))
    "  \U+0396\U+03B5\U+03C5\U+03BA\U+03C4\U+03AC: " (itoa (caddr xres))
    "\n\U+0392\U+03AE\U+03BC\U+03B1 \U+03B1\U+03BC\U+03B5\U+03B9\U+03B2\U+03CC\U+03BD\U+03C4\U+03C9\U+03BD " (rtos *tm-DIST* 2 2) " m  \U+00B7  \U+03C4\U+03B5\U+03B3\U+03AF\U+03B4\U+03C9\U+03BD " (rtos *tm-DZ* 2 2) " m"
    "\nLayers: XYLO-AMEIB / XYLO-TEGID / XYLO-DOKOI / XYLO-STROT / XYLO-PERIGR / XYLO-TXT"
    "\n\n*** \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 / \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397 - \U+0394\U+0395\U+039D \U+03A5\U+03A0\U+039F\U+039A\U+0391\U+0398\U+0399\U+03A3\U+03A4\U+0391 \U+03A3\U+03A4\U+0391\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397 ***"))
  (princ))

;; ===================== ΕΝΤΟΛΗ STEGHANAPT =====================
(defun C:STEGHANAPT ( / *error* xp ca segs i n a b fc gap x0 y0 j q fcs
                        tot totp nf h lab p)
  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 STEGHANAPT: " msg)))
    (princ))
  (if (null *st-DARCS*)
    (progn
      (princ "\n*** \U+0394\U+03B5\U+03BD \U+03C5\U+03C0\U+03AC\U+03C1\U+03C7\U+03BF\U+03C5\U+03BD \U+03B4\U+03B5\U+03B4\U+03BF\U+03BC\U+03AD\U+03BD\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7\U+03C2. \U+03A4\U+03C1\U+03AD\U+03BE\U+03B5 \U+03C0\U+03C1\U+03CE\U+03C4\U+03B1 STEGH.")
      (exit)))
  (st-layer "ANAPT-PERIGR" 3)
  (st-layer "ANAPT-TXT"    6)
  (setq ca (cos (atan (st-slope))))
  (setq segs (list))
  (foreach a *st-DARCS* (setq segs (append segs (list (list (car a) (cadr a))))))
  (princ "\n\U+0395\U+03BE\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE \U+03B5\U+03B4\U+03C1\U+03CE\U+03BD \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03BD \U+03C3\U+03BA\U+03B5\U+03BB\U+03B5\U+03C4\U+03CC...")
  (setq fcs (an-faces *st-EAV* segs))
  (princ (strcat " " (itoa (length fcs)) " \U+03AD\U+03B4\U+03C1\U+03B5\U+03C2."))
  (setq xp (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 \U+03B1\U+03BD\U+03B1\U+03C0\U+03C4\U+03CD\U+03B3\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 (\U+03BA\U+03AC\U+03C4\U+03C9-\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AC): "))
  (if (null xp) (progn (princ "\n\U+0391\U+03BA\U+03CD\U+03C1\U+03C9\U+03C3\U+03B7.") (exit)))
  (setq h *st-TXH*)
  (if (or (null h) (< h 0.01)) (setq h 0.10))
  (setq x0 (car xp) y0 (cadr xp) gap (* h 6.0) tot 0.0 totp 0.0 nf 0)
  (setq n (length *st-EAV*) i 0)
  (princ (strcat "\n\n>>> \U+0391\U+039D\U+0391\U+03A0\U+03A4\U+03A5\U+0393\U+039C\U+0391 \U+03A3\U+03A4\U+0395\U+0393\U+0397\U+03A3 - \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 "
    (rtos (/ (atan (st-slope)) (/ pi 180.0)) 2 1) " deg, 1/cos = "
    (rtos (/ 1.0 ca) 2 4)))
  (while (< i n)
    (setq a (nth i *st-EAV*) b (nth (rem (1+ i) n) *st-EAV*))
    (setq q (an-pick fcs a b))
    (setq fc (if q (an-unfold q a b ca) nil))
    (if (and fc (> (cadr fc) 0.01))
      (progn
        (setq nf (1+ nf))
        (setq q (list))
        (foreach p (car fc)
          (setq q (append q (list (list (+ x0 (car p)) (+ y0 (cadr p)))))))
        (st-pline q "ANAPT-PERIGR")
        (st-txt (list (+ x0 (/ (caddr fc) 2.0)) (- y0 (* h 1.4))) h
          (strcat "E" (itoa nf)) "ANAPT-TXT")
        (st-txt (list (+ x0 (/ (caddr fc) 2.0)) (- y0 (* h 2.8))) (* h 0.8)
          (strcat (rtos (cadr fc) 2 2) " m2") "ANAPT-TXT")
        (st-txt (list (+ x0 (/ (caddr fc) 2.0)) (- y0 (* h 4.0))) (* h 0.8)
          (strcat "\U+03C5\U+03B4\U+03C1. " (rtos (caddr fc) 2 2) " m") "ANAPT-TXT")
        (princ (strcat "\n    E" (itoa nf) ": \U+03C5\U+03B4\U+03C1\U+03BF\U+03C1\U+03C1\U+03BF\U+03AE " (rtos (caddr fc) 2 2)
          " m  \U+00B7  \U+03C0\U+03C1\U+03B1\U+03B3\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03CC \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD " (rtos (cadr fc) 2 2) " m2"))
        (setq tot (+ tot (cadr fc)))
        (setq totp (+ totp (* (cadr fc) ca)))
        (setq x0 (+ x0 (caddr fc) gap))))
    (setq i (1+ i)))
  (st-txt (list (car xp) (+ y0 (* h 3.0))) (* h 1.3)
    (strcat "\U+0391\U+039D\U+0391\U+03A0\U+03A4\U+03A5\U+0393\U+039C\U+0391 \U+03A3\U+03A4\U+0395\U+0393\U+0397\U+03A3 - " (itoa nf) " \U+0395\U+0394\U+03A1\U+0395\U+03A3 - \U+03A0\U+03A1\U+0391\U+0393\U+039C\U+0391\U+03A4\U+0399\U+039A\U+039F \U+039C\U+0395\U+0393\U+0395\U+0398\U+039F\U+03A3") "ANAPT-TXT")
  (princ (strcat "\n    ------------------------------------------"
    "\n    \U+03A3\U+03A5\U+039D\U+039F\U+039B\U+039F \U+03C0\U+03C1\U+03B1\U+03B3\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03AE\U+03C2 \U+03B5\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B1\U+03C2: " (rtos tot 2 2) " m2"
    "\n    \U+0388\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 (\U+03C0\U+03C1\U+03BF\U+03B2\U+03BF\U+03BB\U+03AE = \U+03A3 x cos \U+03B1):  " (rtos totp 2 2) " m2"
    "\n    \U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03BA\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7\U+03C2 \U+03B1\U+03C0\U+03BF STEGH:      " (rtos *st-AREA* 2 2) " m2"
    "\n    Layers: ANAPT-PERIGR / ANAPT-TXT"
    "\n\n*** \U+0395\U+039A\U+03A4\U+0399\U+039C\U+0397\U+03A3\U+0397 / \U+03A0\U+03A1\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0397 - \U+0394\U+0395\U+039D \U+03A5\U+03A0\U+039F\U+039A\U+0391\U+0398\U+0399\U+03A3\U+03A4\U+0391 \U+03A3\U+03A4\U+0391\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397 ***"))
  (princ))

(princ "\nSTEGH v8.4 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03B3\U+03B5\U+03B9\U+03C3\U+03BF + \U+03C5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B2\U+03B1\U+03C3\U+03B7\U+03C2 + \U+03C4\U+03BF\U+03BC\U+03B7).")
(princ "\n\U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: STEGH \U+00B7 STEGHXYLO \U+00B7 STEGHANAPT \U+00B7 STEGHTOMI")
(princ)
