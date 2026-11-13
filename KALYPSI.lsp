;;; ===================================================================
;;; KALYPSI.LSP v1.0 - Διάγραμμα Κάλυψης & Πίνακας Δόμησης
;;; HEXIS-APP | hexis-app.gr | BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε.
;;; -------------------------------------------------------------------
;;; Εντολή: KALYPSI          (μονάδες σχεδίου: μέτρα)
;;;
;;; ΕΠΙΤΡΕΠΟΜΕΝΑ: γράφεις ΚΑΕΚ και οι όροι έρχονται από τον λογαριασμό
;;;   HEXIS-APP μέσω HEXISNET (καθεστώς, κάλυψη %, ΣΔ, μέγιστη δόμηση,
;;;   ύψος). Χωρίς ΚΑΕΚ: χειροκίνητοι όροι που μένουν αποθηκευμένοι.
;;; ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΑ - αναγνώριση πολυγώνων:
;;;   Οικόπεδο: βρίσκεται μόνο του - ίδιο με το γεωτεμάχιο του Κτηματολογίου
;;;     (σχέδιο σε ΕΓΣΑ87) ή στα layers ορίων (TOPO_PROP, BOUND_*, *OIKOP*).
;;;     Αλλιώς κλικ μέσα στο οικόπεδο - ή K = σχεδίαση από Κτηματολόγιο.
;;;   Κάλυψη: βρίσκει μόνο του τα κλειστά περιγράμματα μέσα στο οικόπεδο
;;;     (κρατά τα εξωτερικά). Ή παράθυρο γύρω από το κτίριο: το
;;;     περίγραμμα βγαίνει από τους τοίχους.
;;;   Επίπεδα δόμησης: παράθυρο γύρω από κάθε κάτοψη - το εξωτερικό
;;;     περίγραμμα βγαίνει από τους τοίχους. Χώροι εκτός Σ.Δ.: κλικ μέσα
;;;     στον χώρο. Ή επιλογή έτοιμων κλειστών πολυγραμμών.
;;;   Όλα μένουν στο σχέδιο: την επόμενη φορά ξαναϋπολογίζει με Enter
;;;     (και αν άλλαξες τα περιγράμματα).
;;; ΑΠΟΤΕΛΕΣΜΑ: διαγράμμιση (KAL_KALYPSI), εμβαδά (KAL_KEIMENA),
;;;   ελάχιστες αποστάσεις από τα όρια (KAL_APOSTASEIS), πίνακας με
;;;   έλεγχο (KAL_PINAKAS). Κάθε νέα εκτέλεση αντικαθιστά τα παλιά.
;;;   Περιγράμματα: KAL_PERIGRAMMATA, KAL_EKTOS_SD. Ένα U αναιρεί όλη την εντολή.
;;; ===================================================================
(vl-load-com)
(setq *kal-net* (list "HEXISNET.lsp" "HEXISNET_ProgeCAD.lsp"))

;; ---------------- \U+03BC\U+03BF\U+03C1\U+03C6\U+03BF\U+03C0\U+03BF\U+03AF\U+03B7\U+03C3\U+03B7 ----------------
(defun kal:fmt (x d / s i r ch)
  (setq s (rtos x 2 d) r "" i 1)
  (while (<= i (strlen s))
    (setq ch (substr s i 1))
    (setq r (strcat r (if (= ch ".") "," ch)))
    (setq i (1+ i)))
  r)
(defun kal:fz (x / s)
  (setq s (kal:fmt x 2))
  (while (= (substr s (strlen s)) "0") (setq s (substr s 1 (1- (strlen s)))))
  (if (= (substr s (strlen s)) ",") (setq s (substr s 1 (1- (strlen s)))))
  s)
(defun kal:len (s / i n)
  (setq i 1 n 0)
  (while (<= i (strlen s))
    (if (and (= (substr s i 1) "\\") (= (strcase (substr s (1+ i) 2)) "U+"))
      (setq i (+ i 7))
      (setq i (1+ i)))
    (setq n (1+ n)))
  n)
(defun kal:split (s sep / p out)
  (while (setq p (vl-string-search sep s))
    (setq out (cons (substr s 1 p) out) s (substr s (+ p 1 (strlen sep)))))
  (reverse (cons s out)))
(defun kal:join (l sep / r)
  (setq r nil)
  (foreach x l (setq r (if r (strcat r sep x) x)))
  (if r r ""))
(defun kal:clean (s / r i ch)
  (setq r "" i 1)
  (while (<= i (strlen s))
    (setq ch (substr s i 1))
    (if (not (member ch (list "^" "|" "~"))) (setq r (strcat r ch)))
    (setq i (1+ i)))
  r)
(defun kal:modetxt (m)
  (cond ((= m 1) "\U+0395\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5") ((= m 3) "\U+039F\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 <2.000 \U+03BA\U+03B1\U+03C4.") (T "\U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5")))

;; ---------------- \U+03C1\U+03C5\U+03B8\U+03BC\U+03AF\U+03C3\U+03B5\U+03B9\U+03C2 (\U+03BC\U+03AD\U+03BD\U+03BF\U+03C5\U+03BD \U+03BC\U+03B5\U+03C4\U+03AC \U+03B1\U+03C0\U+03CC \U+03B5\U+03C0\U+03B1\U+03BD\U+03B5\U+03BA\U+03BA\U+03AF\U+03BD\U+03B7\U+03C3\U+03B7) ----------------
(defun kal:cfgfile ()
  (strcat (if (getenv "APPDATA") (getenv "APPDATA") (getvar "TEMPPREFIX")) "\\HEXIS_KALYPSI.cfg"))
(defun kal:load (/ f s r)
  (if (setq f (open (kal:cfgfile) "r"))
    (progn (while (setq s (read-line f)) (setq r (cons (atof s) r))) (close f)))
  (if (= (length r) 6) (reverse r) (list 200.0 2.0 10.0 0.0 0.0 15.0)))
(defun kal:save (l / f)
  (if (setq f (open (kal:cfgfile) "w"))
    (progn (foreach x l (write-line (rtos x 2 6) f)) (close f))))
(defun kal:askr (msg def / v)
  (initget 4)
  (setq v (getreal (strcat "\n" msg " <" (kal:fz def) ">: ")))
  (if v v def))

;; ---------------- \U+03BA\U+03B1\U+03C4\U+03AC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF (XRECORD) ----------------
(defun kal:h (e) (cdr (assoc 5 (entget e))))
(defun kal:ename (h / e)
  (if (and h (/= h "") (setq e (handent h)) (entget e)) e))
(defun kal:enames (hs / l e)
  (foreach h hs (if (setq e (kal:ename h)) (setq l (cons e l))))
  (reverse l))
(defun kal:sput (s / d o l)
  (setq d (namedobjdict))
  (if (setq o (dictsearch d "HEXIS_KALYPSI"))
    (progn (dictremove d "HEXIS_KALYPSI") (entdel (cdr (assoc -1 o)))))
  (while (> (strlen s) 200)
    (setq l (cons (cons 1 (substr s 1 200)) l) s (substr s 201)))
  (setq l (reverse (cons (cons 1 s) l)))
  (dictadd d "HEXIS_KALYPSI" (entmakex (append (list (cons 0 "XRECORD") (cons 100 "AcDbXrecord")) l))))
;; (kaek plotH (covH..) p0 ((\U+03CC\U+03BD\U+03BF\U+03BC\U+03B1 (dH..) (xH..)) ..))
(defun kal:sget (/ o s p lv p0)
  (if (setq o (dictsearch (namedobjdict) "HEXIS_KALYPSI"))
    (progn
      (setq s "")
      (foreach g o (if (= (car g) 1) (setq s (strcat s (cdr g)))))
      (setq p (kal:split s "^"))
      (if (= (length p) 5)
        (progn
          (if (/= (nth 3 p) "")
            (setq p0 (mapcar 'atof (kal:split (nth 3 p) ","))))
          (if (/= (nth 4 p) "")
            (foreach x (kal:split (nth 4 p) "~")
              (setq x (kal:split x "|"))
              (if (= (length x) 3)
                (setq lv (cons (list (car x) (kal:split (cadr x) ",") (kal:split (caddr x) ",")) lv)))))
          (list (nth 0 p) (nth 1 p) (kal:split (nth 2 p) ",") p0 (reverse lv)))))))
(defun kal:state (kaek plot cov p0 levels)
  (kal:sput
    (strcat kaek "^" (kal:h plot) "^" (kal:join (mapcar 'kal:h cov) ",") "^"
            (if p0 (strcat (rtos (car p0) 2 4) "," (rtos (cadr p0) 2 4)) "") "^"
            (kal:join (mapcar (function (lambda (lv)
                        (strcat (car lv) "|" (kal:join (mapcar 'kal:h (cadr lv)) ",")
                                "|" (kal:join (mapcar 'kal:h (caddr lv)) ","))))
                      levels) "~"))))

;; ---------------- \U+03B3\U+03B5\U+03C9\U+03BC\U+03B5\U+03C4\U+03C1\U+03AF\U+03B1 ----------------
(defun kal:p2 (v) (list (car v) (cadr v)))
(defun kal:closedp (ed / l)
  (foreach g ed (if (= (car g) 10) (setq l (cons (cdr g) l))))
  (and (= (cdr (assoc 0 ed)) "LWPOLYLINE")
       (> (length l) 2)
       (or (= 1 (logand 1 (cdr (assoc 70 ed))))
           (< (distance (car l) (last l)) 1e-6))))
(defun kal:verts (en / ed l)
  (setq ed (entget en))
  (foreach g ed
    (cond
      ((= (car g) 10) (setq l (cons (list (cadr g) (caddr g) 0.0) l)))
      ((and (= (car g) 42) l)
       (setq l (cons (list (car (car l)) (cadr (car l)) (cdr g)) (cdr l))))))
  (setq l (reverse l))
  (if (and (> (length l) 3) (< (distance (kal:p2 (car l)) (kal:p2 (last l))) 1e-6))
    (setq l (reverse (cdr (reverse l)))))
  l)
;; \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03BC\U+03B5 \U+03C4\U+03CC\U+03BE\U+03B1 (bulge)
(defun kal:area (vl / n i p q s s2 b c th r seg)
  (setq n (length vl) i 0 s 0.0 s2 0.0)
  (repeat n
    (setq p (nth i vl) q (nth (rem (1+ i) n) vl))
    (setq s (+ s (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq b (caddr p))
    (if (/= b 0.0)
      (progn
        (setq c (distance (kal:p2 p) (kal:p2 q))
              th (* 4.0 (atan (abs b)))
              r (/ c (* 2.0 (sin (/ th 2.0))))
              seg (* 0.5 r r (- th (sin th))))
        (setq s2 (+ s2 (if (> b 0.0) seg (- seg))))))
    (setq i (1+ i)))
  (abs (+ (/ s 2.0) s2)))
(defun kal:cent (vl / n i p q c a cx cy)
  (setq n (length vl) i 0 a 0.0 cx 0.0 cy 0.0)
  (repeat n
    (setq p (nth i vl) q (nth (rem (1+ i) n) vl)
          c (- (* (car p) (cadr q)) (* (car q) (cadr p)))
          a (+ a c)
          cx (+ cx (* (+ (car p) (car q)) c))
          cy (+ cy (* (+ (cadr p) (cadr q)) c))
          i (1+ i)))
  (if (< (abs a) 1e-9)
    (list (/ (apply '+ (mapcar 'car vl)) n) (/ (apply '+ (mapcar 'cadr vl)) n))
    (list (/ cx (* 3.0 a)) (/ cy (* 3.0 a)))))
(defun kal:ptseg (p a b / dx dy l2 tt)
  (setq dx (- (car b) (car a)) dy (- (cadr b) (cadr a)) l2 (+ (* dx dx) (* dy dy)))
  (if (< l2 1e-12)
    (kal:p2 a)
    (progn
      (setq tt (/ (+ (* (- (car p) (car a)) dx) (* (- (cadr p) (cadr a)) dy)) l2)
            tt (max 0.0 (min 1.0 tt)))
      (list (+ (car a) (* tt dx)) (+ (cadr a) (* tt dy))))))
(defun kal:pip (p vl / n i j in xi yi xj yj)
  (setq n (length vl) i 0 j (1- n))
  (repeat n
    (setq xi (car (nth i vl)) yi (cadr (nth i vl)) xj (car (nth j vl)) yj (cadr (nth j vl)))
    (if (and (/= (> yi (cadr p)) (> yj (cadr p)))
             (< (car p) (+ xi (/ (* (- xj xi) (- (cadr p) yi)) (- yj yi)))))
      (setq in (not in)))
    (setq j i i (1+ i)))
  in)
(defun kal:dpoly (p vl / n i d a b)
  (setq n (length vl) i 0 d 1e99)
  (repeat n
    (setq a (kal:p2 (nth i vl)) b (kal:p2 (nth (rem (1+ i) n) vl))
          d (min d (distance (kal:p2 p) (kal:ptseg p a b)))
          i (1+ i)))
  d)
(defun kal:inside (vl pv / ok)
  (setq ok T)
  (foreach v vl (if (not (or (kal:pip v pv) (< (kal:dpoly v pv) 0.05))) (setq ok nil)))
  ok)
(defun kal:sumarea (l / s)
  (setq s 0.0)
  (foreach e l (setq s (+ s (kal:area (kal:verts e)))))
  s)
(defun kal:lnet (lv) (- (kal:sumarea (cadr lv)) (kal:sumarea (caddr lv))))

;; ---------------- \U+03BF\U+03BD\U+03C4\U+03CC\U+03C4\U+03B7\U+03C4\U+03B5\U+03C2 ----------------
(defun kal:layer (n c)
  (if (not (tblsearch "LAYER" n))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord")
                   (cons 2 n) (cons 70 0) (cons 62 c) (cons 6 "Continuous")))))
(defun kal:setup ()
  (foreach x (list (list "KAL_KALYPSI" 8) (list "KAL_KEIMENA" 7) (list "KAL_APOSTASEIS" 1)
                   (list "KAL_PINAKAS" 7) (list "KAL_PERIGRAMMATA" 5) (list "KAL_EKTOS_SD" 3)
                   (list "KAL_KTIMATOLOGIO" 30))
    (kal:layer (car x) (cadr x)))
  (if (not (tblsearch "STYLE" "HEXIS_KAL"))
    (entmake (list (cons 0 "STYLE") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbTextStyleTableRecord")
                   (cons 2 "HEXIS_KAL") (cons 70 0) (cons 40 0.0) (cons 41 1.0) (cons 50 0.0)
                   (cons 71 0) (cons 42 2.5) (cons 3 "arial.ttf") (cons 4 ""))))
  (setq *kal-sty* (if (tblsearch "STYLE" "HEXIS_KAL") "HEXIS_KAL" (getvar "TEXTSTYLE"))))
(defun kal:allpl (/ ss i l e)
  (if (setq ss (ssget "_X" (list (cons 0 "LWPOLYLINE") (cons 410 "Model"))))
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq e (ssname ss i) i (1+ i))
        (if (kal:closedp (entget e)) (setq l (cons e l))))))
  l)
(defun kal:mkpl (vl lay / l)
  (foreach v vl
    (setq l (cons (list 10 (car v) (cadr v)) l))
    (if (/= (caddr v) 0.0) (setq l (cons (cons 42 (caddr v)) l))))
  (entmake (append (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lay) (cons 100 "AcDbPolyline")
                         (cons 90 (length vl)) (cons 70 1))
                   (reverse l)))
  (entlast))
(defun kal:setlay (e lay / ed)
  (setq ed (entget e))
  (entmod (subst (cons 8 lay) (assoc 8 ed) ed)))
(defun kal:line (p q lay)
  (entmake (list (cons 0 "LINE") (cons 8 lay) (list 10 (car p) (cadr p) 0.0) (list 11 (car q) (cadr q) 0.0))))
(defun kal:txt (p h s ang ctr lay)
  (if (/= s "")
    (entmake (list (cons 0 "TEXT") (cons 8 lay) (cons 7 *kal-sty*)
                   (list 10 (car p) (cadr p) 0.0) (list 11 (car p) (cadr p) 0.0)
                   (cons 40 h) (cons 1 s) (cons 50 ang) (cons 72 (if ctr 1 0)) (cons 73 2)))))
(defun kal:hatch (vl d / hasb l a)
  (foreach v vl (if (/= (caddr v) 0.0) (setq hasb T)))
  (foreach v vl
    (setq l (cons (list 10 (car v) (cadr v)) l))
    (if hasb (setq l (cons (cons 42 (caddr v)) l))))
  (setq a (/ pi 4.0))
  (entmake
    (append
      (list (cons 0 "HATCH") (cons 100 "AcDbEntity") (cons 8 "KAL_KALYPSI") (cons 100 "AcDbHatch")
            (list 10 0.0 0.0 0.0) (list 210 0.0 0.0 1.0) (cons 2 "ANSI31") (cons 70 0) (cons 71 0)
            (cons 91 1) (cons 92 3) (cons 72 (if hasb 1 0)) (cons 73 1) (cons 93 (length vl)))
      (reverse l)
      (list (cons 97 0) (cons 75 0) (cons 76 1) (cons 52 0.0) (cons 41 (/ d 3.175)) (cons 77 0)
            (cons 78 1) (cons 53 a) (cons 43 0.0) (cons 44 0.0)
            (cons 45 (- (* d (sin a)))) (cons 46 (* d (cos a))) (cons 79 0)
            (cons 98 1) (list 10 (car (car vl)) (cadr (car vl)) 0.0)))))
(defun kal:hl (l m) (foreach e l (if (entget e) (redraw e m))))
(defun kal:clearout (/ ss i)
  (if (setq ss (ssget "_X" (list (cons 8 "KAL_KALYPSI,KAL_KEIMENA,KAL_APOSTASEIS,KAL_PINAKAS"))))
    (progn (setq i 0) (repeat (sslength ss) (entdel (ssname ss i)) (setq i (1+ i))))))

;; ---------------- \U+03B5\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2 CAD ----------------
(defun kal:cmd (args)
  (if vl-cmdf (apply 'vl-cmdf args) (apply 'command args))
  (while (> (getvar "CMDACTIVE") 0) (command "")))
(defun kal:newents (e0 / l e)
  (setq e (if e0 (entnext e0) (entnext)))
  (while e (setq l (cons e l) e (entnext e)))
  l)
;; \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AD\U+03C2 \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03C4\U+03BF\U+03C5 BOUNDARY \U+03C3\U+03B5 \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF
(defun kal:boundary (pt / e0 l)
  (setq e0 (entlast))
  (kal:cmd (list "_.-BOUNDARY" pt ""))
  (foreach e (kal:newents e0)
    (if (and (entget e) (kal:closedp (entget e))) (setq l (cons e l)) (entdel e)))
  l)
(defun kal:bbox (ss / i o mn mx r a b x1 y1 x2 y2)
  (setq i 0)
  (repeat (sslength ss)
    (setq o (vlax-ename->vla-object (ssname ss i)) i (1+ i))
    (setq r (vl-catch-all-apply 'vla-getboundingbox (list o 'mn 'mx)))
    (if (not (vl-catch-all-error-p r))
      (progn
        (setq a (vlax-safearray->list mn) b (vlax-safearray->list mx))
        (setq x1 (if x1 (min x1 (car a)) (car a)) y1 (if y1 (min y1 (cadr a)) (cadr a))
              x2 (if x2 (max x2 (car b)) (car b)) y2 (if y2 (max y2 (cadr b)) (cadr b))))))
  (if x1 (list x1 y1 x2 y2)))
;; \U+03B5\U+03BE\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03CC \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\U+03C2: \U+03C0\U+03BB\U+03B1\U+03AF\U+03C3\U+03B9\U+03BF \U+03B3\U+03CD\U+03C1\U+03C9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE + BOUNDARY \U+03C3\U+03C4\U+03BF \U+03BA\U+03B5\U+03BD\U+03CC
(defun kal:outline (ss / bb w h m r pl ra keep big a)
  (if (setq bb (kal:bbox ss))
    (progn
      (setq w (- (nth 2 bb) (nth 0 bb)) h (- (nth 3 bb) (nth 1 bb))
            m (+ 0.3 (* 0.03 (max w h))))
      (setq r (kal:mkpl (list (list (- (nth 0 bb) m) (- (nth 1 bb) m) 0.0) (list (+ (nth 2 bb) m) (- (nth 1 bb) m) 0.0)
                              (list (+ (nth 2 bb) m) (+ (nth 3 bb) m) 0.0) (list (- (nth 0 bb) m) (+ (nth 3 bb) m) 0.0))
                        "KAL_PERIGRAMMATA"))
      (kal:cmd (list "_.ZOOM" "_W" (list (- (nth 0 bb) (* 3.0 m)) (- (nth 1 bb) (* 3.0 m)))
                                   (list (+ (nth 2 bb) (* 3.0 m)) (+ (nth 3 bb) (* 3.0 m)))))
      (setq pl (kal:boundary (list (- (nth 0 bb) (/ m 2.0)) (/ (+ (nth 1 bb) (nth 3 bb)) 2.0))))
      (entdel r)
      (kal:cmd (list "_.ZOOM" "_P"))
      (setq ra (* (+ w m m) (+ h m m)) big 0.0)
      (foreach e pl
        (setq a (kal:area (kal:verts e)))
        (if (> a (* 0.97 ra)) (entdel e) (setq keep (cons (cons e a) keep) big (max big a))))
      (setq pl nil)
      (foreach x keep
        (if (and (>= (cdr x) 1.0) (>= (cdr x) (* 0.05 big)))
          (progn (kal:setlay (car x) "KAL_PERIGRAMMATA") (setq pl (cons (car x) pl)))
          (entdel (car x))))
      (if (null pl)
        (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03B3\U+03AE\U+03BA\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 - \U+03BA\U+03BF\U+03AF\U+03C4\U+03B1 \U+03B3\U+03B9\U+03B1 \U+03B1\U+03BD\U+03BF\U+03AF\U+03B3\U+03BC\U+03B1\U+03C4\U+03B1 \U+03C3\U+03C4\U+03BF\U+03C5\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\U+03C2 \U+03AE \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AE \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE."))
      pl)))
;; \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B1\U+03C0\U+03CC \U+03BA\U+03BB\U+03B9\U+03BA \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C4\U+03BF\U+03C5
(defun kal:space (pt lay / pl best ba a)
  (foreach e (kal:boundary pt)
    (setq a (kal:area (kal:verts e)))
    (if (or (null best) (> a ba)) (progn (if best (entdel best)) (setq best e ba a)) (entdel e)))
  (if best (kal:setlay best lay) (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC\U+03C2 \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B5\U+03BA\U+03B5\U+03AF."))
  best)

;; ---------------- \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AD\U+03C2 ----------------
(defun kal:ss2l (ss / i l)
  (setq i 0)
  (repeat (sslength ss) (setq l (cons (ssname ss i) l) i (1+ i)))
  (reverse l))
(defun kal:allclosed (ss / ok)
  (setq ok T)
  (foreach e (kal:ss2l ss) (if (not (kal:closedp (entget e))) (setq ok nil)))
  ok)
(defun kal:sslist (msg / ss l)
  (princ msg)
  (if (setq ss (ssget (list (cons 0 "LWPOLYLINE"))))
    (foreach e (kal:ss2l ss)
      (if (kal:closedp (entget e)) (setq l (cons e l)) (princ "\n\U+039C\U+03AF\U+03B1 \U+03B1\U+03BD\U+03BF\U+03B9\U+03C7\U+03C4\U+03AE \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03B1\U+03B3\U+03BD\U+03BF\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5."))))
  (reverse l))
(defun kal:fromwalls (msg / ss)
  (princ (strcat "\n" msg ": "))
  (if (setq ss (ssget))
    (if (kal:allclosed ss) (kal:ss2l ss) (kal:outline ss))))
(defun kal:defname (i)
  (nth (min i 7) (list "\U+0399\U+03C3\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF" "\U+0391' \U+038C\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2" "\U+0392' \U+038C\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2" "\U+0393' \U+038C\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2" "\U+0394' \U+038C\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2" "\U+0395' \U+038C\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2" "\U+0394\U+03CE\U+03BC\U+03B1" "\U+0395\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF")))

;; ---------------- \U+03B1\U+03BD\U+03B1\U+03B3\U+03BD\U+03CE\U+03C1\U+03B9\U+03C3\U+03B7 \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5 ----------------
(defun kal:ring (s / l c)
  (if (and s (/= s ""))
    (foreach p (kal:split s ";")
      (setq c (kal:split p ","))
      (if (= (length c) 2) (setq l (cons (list (atof (car c)) (atof (cadr c)) 0.0) l))))))
  (if (> (length l) 2) (reverse l)))
(defun kal:findplot (ring / best ba ra rc vl a lay)
  (if ring
    (progn
      (setq ra (kal:area ring) rc (kal:cent ring))
      (foreach e (kal:allpl)
        (setq vl (kal:verts e) a (kal:area vl))
        (if (and (< (abs (- a ra)) (* 0.03 ra)) (< (distance (kal:cent vl) rc) 5.0)) (setq best e))))))
  (if (null best)
    (foreach e (kal:allpl)
      (setq lay (strcase (cdr (assoc 8 (entget e)))))
      (if (wcmatch lay "TOPO_PROP,BOUND_IMPL,BOUND_UNIMPL,KAL_OIKOPEDO,KAL_KTIMATOLOGIO,*OIKOP*,*GHPED*,*PLOT*,*\U+039F\U+0399\U+039A\U+039F\U+03A0*,*\U+0393\U+0397\U+03A0\U+0395\U+0394*")
        (progn
          (setq a (kal:area (kal:verts e)))
          (if (or (null best) (> a ba)) (setq best e ba a))))))
  best)
(defun kal:askplot (ring / p ss vl a best ba)
  (if ring (initget "K"))
  (setq p (getpoint (strcat "\n\U+039A\U+03BB\U+03B9\U+03BA \U+03C0\U+03AC\U+03BD\U+03C9 \U+03C3\U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03AE \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03BF \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF"
                            (if ring " [K = \U+03CC\U+03C1\U+03B9\U+03BF \U+03B1\U+03C0\U+03CC \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03CC\U+03B3\U+03B9\U+03BF]" "") ": ")))
  (cond
    ((= p "K")
      (princ "\n\U+03A3\U+03C7\U+03B5\U+03B4\U+03B9\U+03AC\U+03C3\U+03C4\U+03B7\U+03BA\U+03B5 \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03C4\U+03BF\U+03C5 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5 (layer KAL_KTIMATOLOGIO, \U+0395\U+0393\U+03A3\U+039187).")
      (kal:mkpl ring "KAL_KTIMATOLOGIO"))
    ((and p (listp p))
      (setq ss (ssget p (list (cons 0 "LWPOLYLINE"))))
      (if (and ss (kal:closedp (entget (ssname ss 0))))
        (ssname ss 0)
        (progn
          (foreach e (kal:allpl)
            (setq vl (kal:verts e))
            (if (kal:pip p vl)
              (progn (setq a (kal:area vl)) (if (or (null best) (< a ba)) (setq best e ba a)))))
          (if (null best) (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AE \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03B5\U+03BA\U+03B5\U+03AF."))
          best)))))

;; ---------------- \U+03B1\U+03BD\U+03B1\U+03B3\U+03BD\U+03CE\U+03C1\U+03B9\U+03C3\U+03B7 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2 ----------------
(defun kal:findcov (plot pv / Ep l pref out lay vl a ok)
  (setq Ep (kal:area pv))
  (foreach e (kal:allpl)
    (if (not (equal e plot))
      (progn
        (setq lay (strcase (cdr (assoc 8 (entget e)))))
        (if (not (wcmatch lay "HX_*,TOPO_*,BOUND_*,KAL_EKTOS*,KAL_KTIMATOLOGIO,KAL_OIKOPEDO"))
          (progn
            (setq vl (kal:verts e) a (kal:area vl))
            (if (and (>= a 4.0) (< a (* 0.9 Ep)) (kal:inside vl pv))
              (setq l (cons (list e a (kal:cent vl) vl lay) l))))))))
  (foreach c l
    (if (wcmatch (nth 4 c) "KAL_PERIGR*,*KTIR*,*KTHR*,*BUILD*,*WALL*,*TOIX*,*KATOP*,*PERIG*,*\U+039A\U+03A4\U+0399\U+03A1*,*\U+039A\U+03A4\U+0397\U+03A1*,*\U+03A4\U+039F\U+0399\U+03A7*,*\U+039A\U+0391\U+03A4\U+039F\U+03A8*,*\U+03A0\U+0395\U+03A1\U+0399\U+0393*")
      (setq pref (cons c pref))))
  (if pref (setq l pref))
  ;; \U+03BA\U+03C1\U+03B1\U+03C4\U+03AC \U+03BC\U+03CC\U+03BD\U+03BF \U+03C4\U+03B1 \U+03B5\U+03BE\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03AC (\U+03CC\U+03C7\U+03B9 \U+03B4\U+03C9\U+03BC\U+03AC\U+03C4\U+03B9\U+03B1 \U+03AE \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF\U+03B9 \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03B5 \U+03AC\U+03BB\U+03BB\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1)
  (setq l (vl-sort l (function (lambda (x y) (> (cadr x) (cadr y))))))
  (foreach c l
    (setq ok T)
    (foreach k out (if (kal:pip (nth 2 c) (nth 3 k)) (setq ok nil)))
    (if ok (setq out (append out (list c)))))
  (mapcar 'car out))
(defun kal:confirm (lst lab wmsg / v)
  (if lst
    (progn
      (kal:hl lst 3)
      (setq v (getint (strcat "\n" lab ": " (itoa (length lst)) " \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1/\U+03C4\U+03B1, \U+0395 = "
                              (kal:fmt (kal:sumarea lst) 2) " \U+03C4.\U+03BC. (\U+03B5\U+03C0\U+03B9\U+03C3\U+03B7\U+03BC\U+03B1\U+03C3\U+03BC\U+03AD\U+03BD\U+03B1).  Enter = \U+03C3\U+03C9\U+03C3\U+03C4\U+03AC,  1 = \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE,  2 = \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\U+03C2: ")))
      (kal:hl lst 4))
    (progn
      (setq v (getint (strcat "\n" lab ":  1 = \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CE\U+03BD \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03CE\U+03BD,  2 = \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\U+03C2 <2>: ")))
      (if (null v) (setq v 2))))
  (cond ((= v 1) (kal:sslist "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AD\U+03C2 \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2: "))
        ((= v 2) (kal:fromwalls wmsg))
        (T lst)))

;; ---------------- \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 ----------------
(defun kal:lvalid (lvs / l d)
  (foreach lv lvs
    (if (setq d (kal:enames (cadr lv)))
      (setq l (cons (list (car lv) d (kal:enames (caddr lv))) l))))
  (reverse l))
(defun kal:asklevels (/ i go dn fname ss dl xl p e l)
  (setq i 0 go T)
  (while go
    (setq dn (kal:defname i))
    (setq fname (getstring T (strcat "\n\U+0395\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 - \U+03CC\U+03BD\U+03BF\U+03BC\U+03B1 <" dn ">  (0 = \U+03C4\U+03AD\U+03BB\U+03BF\U+03C2 \U+03B5\U+03C0\U+03B9\U+03C0\U+03AD\U+03B4\U+03C9\U+03BD): ")))
    (if (= fname "0")
      (setq go nil)
      (progn
        (if (= fname "") (setq fname dn))
        (setq fname (kal:clean fname))
        (setq dl (kal:fromwalls (strcat "\U+039A\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7 \U+00AB" fname "\U+00BB: \U+03C0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF \U+03B3\U+03CD\U+03C1\U+03C9 \U+03B1\U+03C0\U+03CC \U+03CC\U+03BB\U+03B7 \U+03C4\U+03B7\U+03BD \U+03BA\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7 (\U+03AE \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE \U+03AD\U+03C4\U+03BF\U+03B9\U+03BC\U+03C9\U+03BD \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CE\U+03BD \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03CE\U+03BD)")))
        (if (null dl)
          (princ "\n\U+03A4\U+03BF \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF \U+03B4\U+03B5\U+03BD \U+03BA\U+03B1\U+03C4\U+03B1\U+03C7\U+03C9\U+03C1\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5 - \U+03B4\U+03BF\U+03BA\U+03AF\U+03BC\U+03B1\U+03C3\U+03B5 \U+03BE\U+03B1\U+03BD\U+03AC.")
          (progn
            (kal:hl dl 3)
            (princ (strcat "\n\U+00AB" fname "\U+00BB: \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+0395 = " (kal:fmt (kal:sumarea dl) 2) " \U+03C4.\U+03BC."))
            (setq xl nil)
            (while (progn
                     (initget "E")
                     (setq p (getpoint (strcat "\n\U+03A7\U+03CE\U+03C1\U+03BF\U+03B9 \U+0395\U+039A\U+03A4\U+039F\U+03A3 \U+03A3.\U+0394. \U+03C3\U+03C4\U+03BF \U+00AB" fname "\U+00BB (\U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 \U+03BA.\U+03BB\U+03C0.): \U+03BA\U+03BB\U+03B9\U+03BA \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03B5 \U+03BA\U+03AC\U+03B8\U+03B5 \U+03C7\U+03CE\U+03C1\U+03BF [E = \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03CE\U+03BD] <\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2>: "))))
              (if (= p "E")
                (setq xl (append xl (kal:sslist "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AD\U+03C2 \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03C7\U+03CE\U+03C1\U+03C9\U+03BD \U+03B5\U+03BA\U+03C4\U+03CC\U+03C2 \U+03A3.\U+0394.: ")))
                (if (setq e (kal:space p "KAL_EKTOS_SD"))
                  (progn
                    (setq xl (append xl (list e)))
                    (redraw e 3)
                    (princ (strcat "  \U+0395 = " (kal:fmt (kal:area (kal:verts e)) 2) " \U+03C4.\U+03BC."))))))
            (kal:hl dl 4) (kal:hl xl 4)
            (setq l (cons (list fname dl xl) l) i (1+ i))
            (princ (strcat "\n\U+00AB" fname "\U+00BB: \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 " (kal:fmt (kal:lnet (car l)) 2) " \U+03C4.\U+03BC.")))))))
  (reverse l))

;; ---------------- \U+03B5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B5\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 ----------------
(defun kal:dists (pv covv th / n i a b bd best c d m j u w done dup ang mid mn)
  (setq n (length pv) i 0)
  (repeat n
    (setq a (kal:p2 (nth i pv)) b (kal:p2 (nth (rem (1+ i) n) pv)) bd 1e99 best nil)
    (foreach cv covv
      (foreach v cv
        (setq c (kal:ptseg v a b) d (distance c (kal:p2 v)))
        (if (< d bd) (setq bd d best (list c (kal:p2 v)))))
      (setq m (length cv) j 0)
      (repeat m
        (setq u (kal:p2 (nth j cv)) w (kal:p2 (nth (rem (1+ j) m) cv)))
        (foreach e (list a b)
          (setq c (kal:ptseg e u w) d (distance e c))
          (if (< d bd) (setq bd d best (list e c))))
        (setq j (1+ j))))
    (if best (setq mn (if mn (min mn bd) bd)))
    (if (and best (> bd 0.005))
      (progn
        (setq dup nil)
        (foreach x done
          (if (or (and (< (distance (car x) (car best)) 0.01) (< (distance (cadr x) (cadr best)) 0.01))
                  (and (< (distance (car x) (cadr best)) 0.01) (< (distance (cadr x) (car best)) 0.01)))
            (setq dup T)))
        (if (not dup)
          (progn
            (setq done (cons best done))
            (kal:line (car best) (cadr best) "KAL_APOSTASEIS")
            (setq ang (angle (car best) (cadr best)))
            (if (and (> ang (/ pi 2.0)) (<= ang (* 1.5 pi))) (setq ang (+ ang pi)))
            (setq mid (polar (list (/ (+ (car (car best)) (car (cadr best))) 2.0)
                                   (/ (+ (cadr (car best)) (cadr (cadr best))) 2.0))
                             (+ ang (/ pi 2.0)) (* th 0.7)))
            (kal:txt mid (* th 0.8) (strcat "\U+0394=" (kal:fmt bd 2)) ang T "KAL_APOSTASEIS")))))
    (setq i (1+ i)))
  mn)

;; ---------------- \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 ----------------
;; \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2: (\U+03C3\U+03C4\U+03AE\U+03BB\U+03B71 \U+03C3\U+03C4\U+03AE\U+03BB\U+03B72 \U+03C3\U+03C4\U+03AE\U+03BB\U+03B73 \U+03C3\U+03C5\U+03BD\U+03C4\U+03B5\U+03BB.\U+03CD\U+03C8\U+03BF\U+03C5\U+03C2) - \U+03C3\U+03C4\U+03AE\U+03BB\U+03B72 = nil: \U+03B5\U+03BD\U+03B9\U+03B1\U+03AF\U+03B1 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03C3\U+03B5 \U+03CC\U+03BB\U+03BF \U+03C4\U+03BF \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2
(defun kal:tw (s th f) (+ (* (kal:len s) th f 0.9) (* 2.0 th)))
(defun kal:table (p0 rows th / w1 w2 w3 wt x0 y f rh ym lay tw)
  (setq w1 0.0 w2 0.0 w3 0.0 lay "KAL_PINAKAS")
  (foreach r rows
    (if (cadr r)
      (setq f (nth 3 r)
            w1 (max w1 (kal:tw (nth 0 r) th f))
            w2 (max w2 (kal:tw (nth 1 r) th f))
            w3 (max w3 (kal:tw (nth 2 r) th f)))))
  (setq wt (+ w1 w2 w3))
  (foreach r rows
    (if (null (cadr r))
      (progn (setq tw (kal:tw (car r) th (nth 3 r))) (if (> tw wt) (setq w1 (+ w1 (- tw wt)) wt tw)))))
  (setq x0 (car p0) y (cadr p0))
  (kal:line (list x0 y) (list (+ x0 wt) y) lay)
  (foreach r rows
    (setq f (nth 3 r) rh (* th f 2.2) ym (- y (/ rh 2.0)))
    (kal:line (list x0 (- y rh)) (list (+ x0 wt) (- y rh)) lay)
    (kal:line (list x0 y) (list x0 (- y rh)) lay)
    (kal:line (list (+ x0 wt) y) (list (+ x0 wt) (- y rh)) lay)
    (if (cadr r)
      (progn
        (kal:line (list (+ x0 w1) y) (list (+ x0 w1) (- y rh)) lay)
        (kal:line (list (+ x0 w1 w2) y) (list (+ x0 w1 w2) (- y rh)) lay)
        (kal:txt (list (+ x0 th) ym) (* th f) (nth 0 r) 0.0 nil lay)
        (kal:txt (list (+ x0 w1 (/ w2 2.0)) ym) (* th f) (nth 1 r) 0.0 T lay)
        (kal:txt (list (+ x0 w1 w2 (/ w3 2.0)) ym) (* th f) (nth 2 r) 0.0 T lay))
      (kal:txt (list (+ x0 (/ wt 2.0)) ym) (* th f) (car r) 0.0 T lay))
    (setq y (- y rh)))
  y)

;; ---------------- \U+03C0\U+03B5\U+03C1\U+03B9\U+03B2\U+03AC\U+03BB\U+03BB\U+03BF\U+03BD ----------------
(defun kal:begin ()
  (setq *kal-old* (mapcar 'getvar (list "CMDECHO" "DIMZIN" "OSMODE" "PLINETYPE")))
  (setvar "CMDECHO" 0) (setvar "DIMZIN" 0) (setvar "OSMODE" 0) (setvar "PLINETYPE" 2)
  (command "_.UNDO" "_BEGIN")
  (setq *kal-undo* T))
(defun kal:end ()
  (if *kal-undo* (progn (command "_.UNDO" "_END") (setq *kal-undo* nil)))
  (if *kal-old*
    (progn
      (mapcar 'setvar (list "CMDECHO" "DIMZIN" "OSMODE" "PLINETYPE") *kal-old*)
      (setq *kal-old* nil))))
(defun kal:fetch (k / f)
  (if (null hx:oroi)
    (foreach x *kal-net* (if (and (null hx:oroi) (setq f (findfile x))) (load f))))
  (if hx:oroi
    (hx:oroi k)
    (progn (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 \U+03C4\U+03BF HEXISNET (\U+03AF\U+03B4\U+03B9\U+03BF\U+03C2 \U+03C6\U+03AC\U+03BA\U+03B5\U+03BB\U+03BF\U+03C2 \U+03BC\U+03B5 \U+03C4\U+03BF KALYPSI) - \U+03C6\U+03CC\U+03C1\U+03C4\U+03C9\U+03C3\U+03AD \U+03C4\U+03BF \U+03BC\U+03B5 APPLOAD.") nil)))

;; ===================================================================
(defun c:KALYPSI (/ *error* cfg sc mode kp sd maxd dmin v th st kaek d ring Ekt sa plot pv E
                    cov covv covin Sk pk levels Sd allow dmn okK okD okKD okA res rows p0 y yp)
  (defun *error* (msg)
    (kal:end)
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*EXIT*,*BREAK*")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1: " msg)))
    (princ))
  (kal:begin)
  (kal:setup)
  (setq cfg (kal:load) sc (nth 0 cfg) mode (fix (nth 1 cfg)) kp (nth 2 cfg)
        sd (nth 3 cfg) maxd (nth 4 cfg) dmin (nth 5 cfg))
  (if (not (member mode (list 1 2 3))) (setq mode 2))
  (setq st (kal:sget))

  ;; ---- 1. \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B1: \U+039A\U+0391\U+0395\U+039A -> HEXIS-APP ----
  (setq kaek (if st (car st) ""))
  (setq v (getstring (strcat "\n\U+039A\U+0391\U+0395\U+039A \U+03B3\U+03B9\U+03B1 \U+03C4\U+03BF\U+03C5\U+03C2 \U+03CC\U+03C1\U+03BF\U+03C5\U+03C2 \U+03B1\U+03C0\U+03CC HEXIS-APP"
                             (if (/= kaek "") (strcat " <" kaek ">") "") "  (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+039A\U+0391\U+0395\U+039A): ")))
  (cond ((= v "0") (setq kaek "")) ((/= v "") (setq kaek (strcase (vl-string-trim " " v)))))
  (if (/= kaek "") (setq d (kal:fetch kaek)))
  (if d
    (progn
      (setq sa (hx:v d "KATASTASI"))
      (setq mode (cond ((= sa "sxedio") 1) ((= sa "oikismos") 3) (T 2)))
      (setq kp (atof (hx:v d "KALYPSI")) sd (atof (hx:v d "SD")) maxd (atof (hx:v d "MAX_DOMISI"))
            Ekt (atof (hx:v d "EMBADON")) dmin (if (= mode 2) 15.0 0.0)
            ring (kal:ring (hx:v d "RING"))))
    (if (/= kaek "") (progn (princ "\n\U+039F\U+03B9 \U+03CC\U+03C1\U+03BF\U+03B9 \U+03B4\U+03B5\U+03BD \U+03AE\U+03C1\U+03B8\U+03B1\U+03BD - \U+03C3\U+03C5\U+03BD\U+03B5\U+03C7\U+03AF\U+03B6\U+03B5\U+03B9\U+03C2 \U+03BC\U+03B5 \U+03C7\U+03B5\U+03B9\U+03C1\U+03BF\U+03BA\U+03AF\U+03BD\U+03B7\U+03C4\U+03BF\U+03C5\U+03C2 \U+03CC\U+03C1\U+03BF\U+03C5\U+03C2.") (setq kaek ""))))
  (princ (strcat "\n" (if d "\U+038C\U+03C1\U+03BF\U+03B9 HEXIS-APP" "\U+038C\U+03C1\U+03BF\U+03B9") ":  " (kal:modetxt mode)
                 "  |  \U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 " (if (> kp 0.0) (strcat (kal:fz kp) " %") "-")
                 "  |  \U+03A3.\U+0394. " (if (> sd 0.0) (kal:fz sd) "-")
                 "  |  \U+039C\U+03AD\U+03B3. \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 " (if (> maxd 0.0) (strcat (kal:fmt maxd 2) " \U+03C4.\U+03BC.") "-")
                 "  |  \U+0391\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03CC\U+03C1\U+03B9\U+03B1 " (if (> dmin 0.0) (strcat (kal:fz dmin) " \U+03BC.") "-")
                 "  |  \U+039A\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 1:" (itoa (fix sc))))
  (initget 6)
  (if (= (getint "\n\U+0391\U+03BB\U+03BB\U+03B1\U+03B3\U+03AE;  1 = \U+039D\U+03B1\U+03B9,  Enter = \U+038C\U+03C7\U+03B9: ") 1)
    (progn
      (initget 6)
      (if (setq v (getint (strcat "\n\U+039A\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5 1:<" (itoa (fix sc)) ">: "))) (setq sc (float v)))
      (initget 6)
      (setq v (getint (strcat "\n\U+03A0\U+03B5\U+03C1\U+03B9\U+03BF\U+03C7\U+03AE:  1 = \U+0395\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5,  2 = \U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5,  3 = \U+039F\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 <" (itoa mode) ">: ")))
      (if (member v (list 1 2 3)) (setq mode v))
      (setq kp (kal:askr "\U+0395\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 %" kp)
            sd (kal:askr "\U+03A3\U+03C5\U+03BD\U+03C4\U+03B5\U+03BB\U+03B5\U+03C3\U+03C4\U+03AE\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2)" sd)
            maxd (kal:askr "\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 \U+03C4.\U+03BC. (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03CC\U+03C1\U+03B9\U+03BF)" maxd)
            dmin (kal:askr "\U+0395\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B7 \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 \U+03BC. (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF)" dmin))))
  (kal:save (list sc (float mode) kp sd maxd dmin))
  (setq th (/ (* 2.5 sc) 1000.0))

  ;; ---- 2. \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF ----
  (setq plot (if st (kal:ename (nth 1 st))))
  (if (null plot) (setq plot (kal:findplot ring)))
  (if plot
    (progn
      (redraw plot 3)
      (setq v (getint (strcat "\n\U+039F\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF: \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5, \U+0395 = " (kal:fmt (kal:area (kal:verts plot)) 2)
                              " \U+03C4.\U+03BC. (\U+03B5\U+03C0\U+03B9\U+03C3\U+03B7\U+03BC\U+03B1\U+03C3\U+03BC\U+03AD\U+03BD\U+03BF).  Enter = \U+03C3\U+03C9\U+03C3\U+03C4\U+03CC,  1 = \U+03AC\U+03BB\U+03BB\U+03BF: ")))
      (redraw plot 4)
      (if (= v 1) (setq plot nil))))
  (while (null plot) (setq plot (kal:askplot ring)))
  (setq pv (kal:verts plot) E (kal:area pv))
  (if (> E 2e7) (progn (princ "\n\U+03A4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF \U+03C6\U+03B1\U+03AF\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C3\U+03B5 \U+03C7\U+03B9\U+03BB\U+03B9\U+03BF\U+03C3\U+03C4\U+03AC - \U+03C4\U+03BF KALYPSI \U+03B4\U+03BF\U+03C5\U+03BB\U+03B5\U+03CD\U+03B5\U+03B9 \U+03C3\U+03B5 \U+03BC\U+03AD\U+03C4\U+03C1\U+03B1.") (exit)))
  (if (and Ekt (> Ekt 0.0) (> (abs (- E Ekt)) (* 0.02 Ekt)))
    (princ (strcat "\n\U+03A0\U+03C1\U+03BF\U+03C3\U+03BF\U+03C7\U+03AE: \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5 " (kal:fmt E 2) " \U+03C4.\U+03BC. - \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03CC\U+03B3\U+03B9\U+03BF " (kal:fmt Ekt 2) " \U+03C4.\U+03BC.")))

  ;; ---- 3. \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 ----
  (setq cov (if st (kal:enames (nth 2 st))))
  (if (null cov) (setq cov (kal:findcov plot pv)))
  (setq cov (kal:confirm cov "\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7" "\U+03A0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF \U+03B3\U+03CD\U+03C1\U+03C9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF \U+03C3\U+03C4\U+03BF \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03CC"))
  (while (null cov)
    (setq cov (kal:confirm nil "\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7" "\U+03A0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF \U+03B3\U+03CD\U+03C1\U+03C9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF \U+03C3\U+03C4\U+03BF \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03CC")))
  (setq covv (mapcar 'kal:verts cov) Sk (kal:sumarea cov) pk (* 100.0 (/ Sk E)))
  (princ (strcat "\n\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7: " (kal:fmt Sk 2) " \U+03C4.\U+03BC.  (" (kal:fmt pk 2) " %)"))

  ;; ---- 4. \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 ----
  (setq levels (if st (kal:lvalid (nth 4 st))))
  (if levels
    (progn
      (foreach lv levels (princ (strcat "\n   " (car lv) ": " (kal:fmt (kal:lnet lv) 2) " \U+03C4.\U+03BC.")))
      (if (= (getint "\n\U+0395\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 \U+03CC\U+03C0\U+03C9\U+03C2 \U+03C0\U+03C1\U+03B9\U+03BD.  Enter = \U+03C3\U+03C9\U+03C3\U+03C4\U+03AC,  1 = \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03B1\U+03C1\U+03C7\U+03AE: ") 1)
        (setq levels nil))))
  (if (null levels) (setq levels (kal:asklevels)))
  (kal:state kaek plot cov (if st (nth 3 st)) levels)

  ;; ---- 5. \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03BF\U+03AF ----
  (setq Sd 0.0)
  (foreach lv levels (setq Sd (+ Sd (kal:lnet lv))))
  (if (> sd 0.0) (setq allow (* E sd)))
  (if (> maxd 0.0) (setq allow (if allow (min allow maxd) maxd)))

  ;; ---- 6. \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7 ----
  (kal:clearout)
  (foreach x covv
    (kal:hatch x (/ (* 2.0 sc) 1000.0))
    (setq v (kal:cent x))
    (kal:txt (list (car v) (+ (cadr v) (* th 0.8))) th "\U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397" 0.0 T "KAL_KEIMENA")
    (kal:txt (list (car v) (- (cadr v) (* th 0.8))) th (strcat "\U+0395=" (kal:fmt (kal:area x) 2) " \U+03C4.\U+03BC.") 0.0 T "KAL_KEIMENA")
    (if (kal:inside x pv) (setq covin (cons x covin))))
  (if covin (setq dmn (kal:dists pv covin th)))

  (setq okK  (or (<= kp 0.0) (<= pk (+ kp 1e-6)))
        okD  (or (null allow) (<= Sd (+ allow 0.005)))
        okKD (or (/= mode 2) (null allow) (<= Sk (+ allow 0.005)))
        okA  (or (<= dmin 0.0) (null dmn) (>= dmn (- dmin 0.005))))
  (setq res (if (and okK okD okKD okA)
              "\U+0395\U+039D\U+03A4\U+0391\U+039E\U+0395\U+0399"
              (strcat "\U+03A5\U+03A0\U+0395\U+03A1\U+0392\U+0391\U+03A3\U+0397"
                      (if (or (not okK) (not okKD)) " \U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397\U+03A3" "")
                      (if (not okD) " \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3" "")
                      (if (not okA) " \U+0391\U+03A0\U+039F\U+03A3\U+03A4\U+0391\U+03A3\U+0395\U+03A9\U+039D" ""))))

  (setq rows
    (list
      (list "\U+03A0\U+0399\U+039D\U+0391\U+039A\U+0391\U+03A3 \U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397\U+03A3 - \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3" nil nil 1.3)
      (list (strcat (kal:modetxt mode)
                    (if (/= kaek "") (strcat "  -  \U+039A\U+0391\U+0395\U+039A " kaek) "")
                    (if (and d (/= (hx:v d "OT") "")) (strcat "  -  \U+039F.\U+03A4. " (hx:v d "OT")) ""))
            nil nil 0.9)
      (list "" "\U+0395\U+03A0\U+0399\U+03A4\U+03A1\U+0395\U+03A0\U+039F\U+039C\U+0395\U+039D\U+0391" "\U+03A0\U+03A1\U+0391\U+0393\U+039C\U+0391\U+03A4\U+039F\U+03A0\U+039F\U+0399\U+039F\U+03A5\U+039C\U+0395\U+039D\U+0391" 1.0)
      (list "\U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5" (if (and Ekt (> Ekt 0.0)) (strcat "\U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03CC\U+03B3\U+03B9\U+03BF " (kal:fmt Ekt 2) " \U+03C4.\U+03BC.") "-")
            (strcat (kal:fmt E 2) " \U+03C4.\U+03BC.") 1.0)
      (list "\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7" (if (> kp 0.0) (strcat (kal:fz kp) " %") "-")
            (strcat (kal:fmt Sk 2) " \U+03C4.\U+03BC.  (" (kal:fmt pk 2) " %)") 1.0)
      (list "\U+03A3\U+03C5\U+03BD\U+03C4\U+03B5\U+03BB\U+03B5\U+03C3\U+03C4\U+03AE\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2" (if (> sd 0.0) (kal:fz sd) "-") (kal:fmt (/ Sd E) 3) 1.0)
      (list "\U+0394\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 (\U+03C3\U+03CD\U+03BD\U+03BF\U+03BB\U+03BF)" (if allow (strcat (kal:fmt allow 2) " \U+03C4.\U+03BC.") "-") (strcat (kal:fmt Sd 2) " \U+03C4.\U+03BC.") 1.0)))
  (foreach lv levels
    (setq rows (append rows (list (list (strcat "   " (car lv)) "" (strcat (kal:fmt (kal:lnet lv) 2) " \U+03C4.\U+03BC.") 0.9))))
    (if (caddr lv)
      (setq rows (append rows (list (list (strcat "   " (car lv) " - \U+03B5\U+03BA\U+03C4\U+03CC\U+03C2 \U+03A3.\U+0394.") ""
                                          (strcat (kal:fmt (kal:sumarea (caddr lv)) 2) " \U+03C4.\U+03BC.") 0.9))))))
  (if (and d (/= (hx:v d "YPSOS") ""))
    (setq rows (append rows (list (list "\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2"
                                        (strcat (kal:fz (atof (hx:v d "YPSOS"))) " \U+03BC."
                                                (if (/= (hx:v d "OROFOI") "") (strcat " - " (hx:v d "OROFOI") " \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF\U+03B9") ""))
                                        "-" 1.0)))))
  (if (or (> dmin 0.0) dmn)
    (setq rows (append rows (list (list "\U+0395\U+03BB\U+03AC\U+03C7. \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03CC\U+03C1\U+03B9\U+03B1"
                                        (if (> dmin 0.0) (strcat (kal:fmt dmin 2) " \U+03BC.") "-")
                                        (if dmn (strcat (kal:fmt dmn 2) " \U+03BC.") "-") 1.0)))))
  (setq rows (append rows (list (list "\U+0395\U+039B\U+0395\U+0393\U+03A7\U+039F\U+03A3" "" res 1.3))))

  (setq p0 (getpoint (strcat "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1 (\U+03C0\U+03AC\U+03BD\U+03C9 \U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AE \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1)" (if (and st (nth 3 st)) " <\U+03AF\U+03B4\U+03B9\U+03BF \U+03BC\U+03B5 \U+03C0\U+03C1\U+03B9\U+03BD>" "") ": ")))
  (if (and (null p0) st) (setq p0 (nth 3 st)))
  (if p0
    (progn
      (setq y (kal:table p0 rows th))
      (if d (kal:txt (list (car p0) (- y (* th 1.2))) (* th 0.7)
                     "\U+0395\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B1: HEXIS-APP - \U+0395\U+03BD\U+03B9\U+03B1\U+03AF\U+03BF\U+03C2 \U+03A8\U+03B7\U+03C6\U+03B9\U+03B1\U+03BA\U+03CC\U+03C2 \U+03A7\U+03AC\U+03C1\U+03C4\U+03B7\U+03C2 (\U+03A4\U+0395\U+0395/\U+03A5\U+03A0\U+0395\U+039D), \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03CC\U+03B3\U+03B9\U+03BF - \U+03B5\U+03BD\U+03B7\U+03BC\U+03B5\U+03C1\U+03C9\U+03C4\U+03B9\U+03BA\U+03CC"
                     0.0 nil "KAL_PINAKAS"))
      (kal:state kaek plot cov p0 levels)))

  (princ (strcat "\n\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 " (kal:fmt pk 2) " %  |  \U+0394\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 " (kal:fmt Sd 2) " \U+03C4.\U+03BC.  |  \U+0395\U+039B\U+0395\U+0393\U+03A7\U+039F\U+03A3: " res))
  (kal:end)
  (princ))

(princ "\nKALYPSI v1.0 - HEXIS-APP: \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE: KALYPSI")
(princ)
