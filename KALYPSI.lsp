;;; ===================================================================
;;; KALYPSI.LSP v2.1 - Διάγραμμα Κάλυψης, Ανάλυση Δόμησης, Προτάσεις & Φύλλο 1:100
;;; HEXIS-APP | hexis-app.gr | BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε.
;;; -------------------------------------------------------------------
;;; Εντολή: KALYPSI          (μονάδες σχεδίου: μέτρα)
;;;
;;; ΕΠΙΤΡΕΠΟΜΕΝΑ: ΚΑΕΚ -> όροι από τον λογαριασμό HEXIS-APP (HEXISNET):
;;;   καθεστώς, κάλυψη %, ΣΔ, μέγιστη δόμηση, ύψος. Χωρίς ΚΑΕΚ: χειροκίνητοι.
;;; ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΑ - αναγνώριση πολυγώνων:
;;;   Οικόπεδο: ίδιο με το γεωτεμάχιο του Κτηματολογίου (ΕΓΣΑ87) ή layers
;;;     ορίων (TOPO_PROP, BOUND_*, *OIKOP*) - αλλιώς κλικ / K = Κτηματολόγιο.
;;;   Κάλυψη: κλειστά περιγράμματα μέσα στο οικόπεδο ή από τους τοίχους.
;;;   Επίπεδα: Υπέργειο / Υπόγειο / Σοφίτα / Υπόσκαφο - περίγραμμα από τους
;;;     τοίχους (παράθυρο) ή έτοιμη πολυγραμμή. Χώροι με κλικ μέσα τους:
;;;     H ημιυπαίθριος, X εξώστης, K κοινόχρηστη σκάλα, I ιδιωτική σκάλα,
;;;     A ανοικτή σκάλα, F φωταγωγός/φρεάτιο/αίθριο, P στάθμευση/Η-Μ.
;;; ΚΑΝΟΝΕΣ (ν.5306/2026, ΦΕΚ Α' 88/08.06.2026):
;;;   206 εξαιρέσεις ΣΔ (40%/20% ημιυπαίθριοι-εξώστες, σκάλες 30/40/25 τ.μ.,
;;;   ανοικτές σκάλες, φωταγωγοί/φρεάτια/αίθρια, υπόγεια, σοφίτα 1/2,
;;;   υπόσκαφα 50%/20%, πλατφόρμα ανελκυστήρα οχήματος 25 τ.μ.)
;;;   207 κάλυψη (προσαύξηση 120 τ.μ. έως 70%) · 198 Δ=3+0,10Η, δ=2,50+0,05Η
;;;   210 ύψος από ΣΔ · 221 χαμηλά κτίρια Δ=2,50 · 251 εκτός σχεδίου
;;;   Κτιριοδομικός 2023 (ΦΕΚ Β' 3985/2023): φύτευση, ύψη, κλίμακες,
;;;   φωτισμός/αερισμός, στηθαία · ΑμεΑ: άρθ. 223 & Κτιριοδομικός άρθ. 25.
;;; ΑΠΟΤΕΛΕΣΜΑ: διαγράμμιση, εμβαδά, αποστάσεις, πίνακας με έλεγχο στο
;;;   σχέδιο + αναφορά HTML (ανάλυση ανά άρθρο, ΠΡΟΤΑΣΕΙΣ εξοικονόμησης
;;;   δόμησης, έλεγχοι Κτιριοδομικού/ΑμεΑ, πηγές) που ανοίγει μόνη της.
;;;   Όλα μένουν στο σχέδιο - την επόμενη φορά ξαναϋπολογίζει με Enter.
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
;; \U+03BA\U+03B1\U+03C4\U+03AC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 v2: kaek ^ plotH ^ covHs ^ p0 ^ levels ^ H
;; \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF: \U+03CC\U+03BD\U+03BF\U+03BC\U+03B1|\U+03C4\U+03CD\U+03C0\U+03BF\U+03C2|\U+03C7\U+03C1\U+03AE\U+03C3\U+03B7|dHs|\U+03BA\U+03C9\U+03B4:h,\U+03BA\U+03C9\U+03B4:h
(defun kal:sget (/ o s p lv p0 sp)
  (if (setq o (dictsearch (namedobjdict) "HEXIS_KALYPSI"))
    (progn
      (setq s "")
      (foreach g o (if (= (car g) 1) (setq s (strcat s (cdr g)))))
      (setq p (kal:split s "^"))
      (if (>= (length p) 5)
        (progn
          (if (/= (nth 3 p) "")
            (setq p0 (mapcar 'atof (kal:split (nth 3 p) ","))))
          (if (/= (nth 4 p) "")
            (foreach x (kal:split (nth 4 p) "~")
              (setq x (kal:split x "|") sp nil)
              (cond
                ((= (length x) 5)
                  (foreach c (kal:split (nth 4 x) ",")
                    (if (= (substr c 2 1) ":") (setq sp (cons (cons (substr c 1 1) (substr c 3)) sp))))
                  (setq lv (cons (list (car x) (atoi (cadr x)) (atoi (caddr x)) (kal:split (nth 3 x) ",") (reverse sp)) lv)))
                ((= (length x) 3)
                  (foreach h (kal:split (caddr x) ",") (if (/= h "") (setq sp (cons (cons "F" h) sp))))
                  (setq lv (cons (list (car x) 1 0 (kal:split (cadr x) ",") (reverse sp)) lv))))))
          (list (nth 0 p) (nth 1 p) (kal:split (nth 2 p) ",") p0 (reverse lv)
                (if (> (length p) 5) (atof (nth 5 p)) 0.0)))))))
(defun kal:state (kaek plot cov p0 levels hg)
  (kal:sput
    (strcat kaek "^" (kal:h plot) "^" (kal:join (mapcar 'kal:h cov) ",") "^"
            (if p0 (strcat (rtos (car p0) 2 4) "," (rtos (cadr p0) 2 4)) "") "^"
            (kal:join (mapcar (function (lambda (lv)
                        (strcat (car lv) "|" (itoa (nth 1 lv)) "|" (itoa (nth 2 lv)) "|"
                                (kal:join (mapcar 'kal:h (nth 3 lv)) ",") "|"
                                (kal:join (mapcar (function (lambda (s) (strcat (car s) ":" (kal:h (cdr s))))) (nth 4 lv)) ","))))
                      levels) "~")
            "^" (rtos (if hg hg 0.0) 2 3))))

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

;; ---------------- \U+03BF\U+03BD\U+03C4\U+03CC\U+03C4\U+03B7\U+03C4\U+03B5\U+03C2 ----------------
(defun kal:layer (n c)
  (if (not (tblsearch "LAYER" n))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord")
                   (cons 2 n) (cons 70 0) (cons 62 c) (cons 6 "Continuous")))))
(defun kal:setup ()
  (foreach x (list (list "KAL_KALYPSI" 8) (list "KAL_KEIMENA" 7) (list "KAL_APOSTASEIS" 1)
                   (list "KAL_PINAKAS" 7) (list "KAL_PERIGRAMMATA" 5) (list "KAL_EKTOS_SD" 3) (list "KAL_XOROI" 3)
                   (list "KAL_KTIMATOLOGIO" 30) (list "KAL_KORYFES" 7))
    (kal:layer (car x) (cadr x)))
  (if (not (tblsearch "STYLE" "HEXIS_KAL"))
    (entmake (list (cons 0 "STYLE") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbTextStyleTableRecord")
                   (cons 2 "HEXIS_KAL") (cons 70 0) (cons 40 0.0) (cons 41 1.0) (cons 50 0.0)
                   (cons 71 0) (cons 42 2.5) (cons 3 "arial.ttf") (cons 4 ""))))
  (if (not (tblsearch "STYLE" "HEXIS_KAL_B"))
    (entmake (list (cons 0 "STYLE") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbTextStyleTableRecord")
                   (cons 2 "HEXIS_KAL_B") (cons 70 0) (cons 40 0.0) (cons 41 1.0) (cons 50 0.0)
                   (cons 71 0) (cons 42 2.5) (cons 3 "arialbd.ttf") (cons 4 ""))))
  (setq *kal-sty* (if (tblsearch "STYLE" "HEXIS_KAL") "HEXIS_KAL" (getvar "TEXTSTYLE"))
        *kal-styb* (if (tblsearch "STYLE" "HEXIS_KAL_B") "HEXIS_KAL_B" *kal-sty*)))
(defun kal:allpl (/ ss i l e)
  (if (setq ss (ssget "_X" (list (cons 0 "LWPOLYLINE") (cons 410 "Model"))))
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq e (ssname ss i) i (1+ i))
        (if (kal:closedp (entget e)) (setq l (cons e l))))))
  l)
(defun kal:psx () (if *kal-ps* (list (cons 67 1) (cons 410 *kal-ps*))))
(defun kal:mkpl (vl lay / l)
  (foreach v vl
    (setq l (cons (list 10 (car v) (cadr v)) l))
    (if (/= (caddr v) 0.0) (setq l (cons (cons 42 (caddr v)) l))))
  (entmake (append (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lay)) (kal:psx)
                   (list (cons 100 "AcDbPolyline") (cons 90 (length vl)) (cons 70 1))
                   (reverse l)))
  (entlast))
(defun kal:setlay (e lay / ed)
  (setq ed (entget e))
  (entmod (subst (cons 8 lay) (assoc 8 ed) ed)))
(defun kal:line (p q lay)
  (entmake (append (list (cons 0 "LINE") (cons 8 lay) (list 10 (car p) (cadr p) 0.0) (list 11 (car q) (cadr q) 0.0)) (kal:psx))))
(defun kal:txt (p h s ang ctr lay)
  (if (/= s "")
    (entmake (append (list (cons 0 "TEXT") (cons 8 lay) (cons 7 (if *kal-bold* *kal-styb* *kal-sty*))
                   (list 10 (car p) (cadr p) 0.0) (list 11 (car p) (cadr p) 0.0)
                   (cons 40 h) (cons 1 s) (cons 50 ang) (cons 72 (if ctr 1 0)) (cons 73 2)) (kal:psx)))))
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
      (if (= (length c) 2) (setq l (cons (list (atof (car c)) (atof (cadr c)) 0.0) l)))))
  (if (> (length l) 2) (reverse l)))
;; \U+03A4\U+03BF \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03A0\U+0391\U+039D\U+03A4\U+0391 \U+03C4\U+03BF \U+03B4\U+03B9\U+03BA\U+03CC \U+03C3\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03CC. \U+03A4\U+03BF \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03C4\U+03BF\U+03C5 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5
;; \U+03C7\U+03C1\U+03B7\U+03C3\U+03B9\U+03BC\U+03BF\U+03C0\U+03BF\U+03B9\U+03B5\U+03AF\U+03C4\U+03B1\U+03B9 \U+03BC\U+03CC\U+03BD\U+03BF \U+03B3\U+03B9\U+03B1 \U+03BD\U+03B1 \U+03B2\U+03C1\U+03B5\U+03B8\U+03B5\U+03AF \U+03B7 \U+03B4\U+03B9\U+03BA\U+03AE \U+03C3\U+03BF\U+03C5 \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03C3\U+03C4\U+03BF \U+03AF\U+03B4\U+03B9\U+03BF \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF.
(defun kal:findplot (ring / best ba ra rc vl a lay)
  (foreach e (kal:allpl)
    (setq lay (strcase (cdr (assoc 8 (entget e)))))
    (if (and (wcmatch lay "TOPO_PROP,BOUND_IMPL,BOUND_UNIMPL,KAL_OIKOPEDO,*OIKOP*,*GHPED*,*PLOT*,*\U+039F\U+0399\U+039A\U+039F\U+03A0*,*\U+0393\U+0397\U+03A0\U+0395\U+0394*")
             (not (wcmatch lay "HX_*,KAL_KTIMATOLOGIO")))
      (progn
        (setq a (kal:area (kal:verts e)))
        (if (or (null best) (> a ba)) (setq best e ba a)))))
  (if (and (null best) ring)
    (progn
      (setq ra (kal:area ring) rc (kal:cent ring))
      (foreach e (kal:allpl)
        (setq lay (strcase (cdr (assoc 8 (entget e)))))
        (if (not (wcmatch lay "HX_*,KAL_*"))
          (progn
            (setq vl (kal:verts e) a (kal:area vl))
            (if (and (< (abs (- a ra)) (* 0.05 ra)) (< (distance (kal:cent vl) rc) 10.0)) (setq best e)))))))
  best)
(defun kal:askplot (ring / p ss vl a best ba)
  (setq p (getpoint "\n\U+039F\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF \U+03C4\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03BF\U+03CD: \U+03BA\U+03BB\U+03B9\U+03BA \U+03C0\U+03AC\U+03BD\U+03C9 \U+03C3\U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03AE \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03BF \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF: "))
  (if (and p (listp p))
    (progn
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
;; \U+03BC\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03C4\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03BF\U+03CD - \U+03AF\U+03B4\U+03B9\U+03BF\U+03B9 \U+03BA\U+03B1\U+03BD\U+03CC\U+03BD\U+03B5\U+03C2 \U+03BC\U+03B5 \U+03C4\U+03BF HEXIS-APP
(defun kal:oikmax (E) (cond ((<= E 200.0) E) ((< E 700.0) 240.0) (T 400.0)))
(defun kal:ektmax (E)
  (cond ((< E 4000.0) nil)
        ((<= E 8000.0) (+ 186.0 (* (- E 4000.0) 0.018)))
        (T (min 360.0 (+ 258.0 (* (- E 8000.0) 0.009))))))

;; ---------------- \U+03B1\U+03BD\U+03B1\U+03B3\U+03BD\U+03CE\U+03C1\U+03B9\U+03C3\U+03B7 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2 ----------------
(defun kal:findcov (plot pv / Ep l pref out lay vl a ok)
  (setq Ep (kal:area pv))
  (foreach e (kal:allpl)
    (if (not (equal e plot))
      (progn
        (setq lay (strcase (cdr (assoc 8 (entget e)))))
        (if (not (wcmatch lay "HX_*,TOPO_*,BOUND_*,KAL_EKTOS*,KAL_XOROI,KAL_KTIMATOLOGIO,KAL_OIKOPEDO"))
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

;; ---------------- \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 & \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9 ----------------
;; \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF: (\U+03CC\U+03BD\U+03BF\U+03BC\U+03B1 \U+03C4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7 (\U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03B1) ((\U+03BA\U+03C9\U+03B4 . \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2) ..))
;; \U+03C4\U+03CD\U+03C0\U+03BF\U+03C2: 1 \U+03A5\U+03C0\U+03AD\U+03C1\U+03B3\U+03B5\U+03B9\U+03BF, 2 \U+03A5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF, 3 \U+03A3\U+03BF\U+03C6\U+03AF\U+03C4\U+03B1, 4 \U+03A5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF
;; \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7 \U+03C5\U+03C0\U+03BF\U+03B3\U+03B5\U+03AF\U+03BF\U+03C5: 1 \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03AE, 2 \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7/\U+0397-\U+039C/\U+03BD\U+03B5\U+03C1\U+03CC/\U+03C0\U+03B9\U+03C3\U+03AF\U+03BD\U+03B1, 3 \U+03BA\U+03CD\U+03C1\U+03B9\U+03B1 \U+00B7 \U+03C5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF\U+03C5: 1 \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1, 2 \U+03AC\U+03BB\U+03BB\U+03B7
(defun kal:typetxt (t1 u)
  (cond ((= t1 2) (cond ((= u 2) "\U+03A5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF - \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7/\U+0397-\U+039C") ((= u 3) "\U+03A5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF - \U+03BA\U+03CD\U+03C1\U+03B9\U+03B1 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7") (T "\U+03A5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF - \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03CC")))
        ((= t1 3) "\U+03A3\U+03BF\U+03C6\U+03AF\U+03C4\U+03B1")
        ((= t1 4) (if (= u 2) "\U+03A5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF - \U+03AC\U+03BB\U+03BB\U+03B7 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7" "\U+03A5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF - \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1"))
        (T "\U+03A5\U+03C0\U+03AD\U+03C1\U+03B3\U+03B5\U+03B9\U+03BF")))
(defun kal:codetxt (c)
  (cond ((= c "H") "\U+0391\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03CC\U+03C2 \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03C2") ((= c "X") "\U+0391\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03CC\U+03C2 \U+03B5\U+03BE\U+03CE\U+03C3\U+03C4\U+03B7\U+03C2")
        ((= c "K") "\U+039A\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF") ((= c "I") "\U+0399\U+03B4\U+03B9\U+03C9\U+03C4\U+03B9\U+03BA\U+03CC \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF")
        ((= c "A") "\U+0391\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03CC \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF") ((= c "F") "\U+03A6\U+03C9\U+03C4\U+03B1\U+03B3\U+03C9\U+03B3\U+03CC\U+03C2 / \U+03C6\U+03C1\U+03B5\U+03AC\U+03C4\U+03B9\U+03BF / \U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF")
        ((= c "P") "\U+03A3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7 / \U+0397-\U+039C / \U+03C0\U+03BB\U+03B1\U+03C4\U+03C6\U+03CC\U+03C1\U+03BC\U+03B1 \U+03BF\U+03C7\U+03AE\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2") (T c)))
(defun kal:lvalid (lvs / l d sp e)
  (foreach lv lvs
    (if (setq d (kal:enames (nth 3 lv)))
      (progn
        (setq sp nil)
        (foreach s (nth 4 lv) (if (setq e (kal:ename (cdr s))) (setq sp (cons (cons (car s) e) sp))))
        (setq l (cons (list (nth 0 lv) (nth 1 lv) (nth 2 lv) d (reverse sp)) l)))))
  (reverse l))
(defun kal:guess (nm / u)
  (setq u (strcase nm))
  (cond ((wcmatch u "*\U+03A5\U+03A0\U+039F\U+0393*,*\U+03A5\U+03A0\U+038C\U+0393*,*YPOG*,*BASEM*") 2)
        ((wcmatch u "*\U+03A3\U+039F\U+03A6*,*SOFIT*,*ATTIC*") 3)
        ((wcmatch u "*\U+03A5\U+03A0\U+039F\U+03A3\U+039A*,*\U+03A5\U+03A0\U+038C\U+03A3\U+039A*,*YPOSK*") 4)
        (T 1)))
(defun kal:asklevel (i / dn fname typ use v dl sp code p e)
  (setq dn (kal:defname i))
  (setq fname (getstring T (strcat "\n\U+0395\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF - \U+03CC\U+03BD\U+03BF\U+03BC\U+03B1 <" dn ">  (0 = \U+03C4\U+03AD\U+03BB\U+03BF\U+03C2 \U+03B5\U+03C0\U+03B9\U+03C0\U+03AD\U+03B4\U+03C9\U+03BD): ")))
  (if (= fname "0")
    'END
    (progn
      (if (= fname "") (setq fname dn))
      (setq fname (kal:clean fname) typ (kal:guess fname) use 0)
      (initget 6)
      (setq v (getint (strcat "\n\U+03A4\U+03CD\U+03C0\U+03BF\U+03C2 \U+00AB" fname "\U+00BB:  1 \U+03A5\U+03C0\U+03AD\U+03C1\U+03B3\U+03B5\U+03B9\U+03BF,  2 \U+03A5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF,  3 \U+03A3\U+03BF\U+03C6\U+03AF\U+03C4\U+03B1,  4 \U+03A5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF <" (itoa typ) ">: ")))
      (if (member v (list 1 2 3 4)) (setq typ v))
      (cond
        ((= typ 2)
          (initget 6)
          (setq use (getint "\n\U+03A7\U+03C1\U+03AE\U+03C3\U+03B7 \U+03C5\U+03C0\U+03BF\U+03B3\U+03B5\U+03AF\U+03BF\U+03C5:  1 \U+0392\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03AE (\U+03B1\U+03C0\U+03BF\U+03B8\U+03AE\U+03BA\U+03B5\U+03C2 \U+03BA.\U+03BB\U+03C0.),  2 \U+03A3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7 / \U+0397-\U+039C / \U+03B4\U+03B5\U+03BE\U+03B1\U+03BC\U+03B5\U+03BD\U+03AD\U+03C2 / \U+03C0\U+03B9\U+03C3\U+03AF\U+03BD\U+03B1,  3 \U+039A\U+03CD\U+03C1\U+03B9\U+03B1 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7 <1>: "))
          (if (not (member use (list 1 2 3))) (setq use 1)))
        ((= typ 4)
          (initget 6)
          (setq use (getint "\n\U+03A7\U+03C1\U+03AE\U+03C3\U+03B7 \U+03C5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF\U+03C5:  1 \U+039A\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1,  2 \U+0386\U+03BB\U+03BB\U+03B7 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7 <1>: "))
          (if (not (member use (list 1 2))) (setq use 1))))
      (setq dl (kal:fromwalls (strcat "\U+039A\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7 \U+00AB" fname "\U+00BB: \U+03C0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF \U+03B3\U+03CD\U+03C1\U+03C9 \U+03B1\U+03C0\U+03CC \U+03CC\U+03BB\U+03B7 \U+03C4\U+03B7\U+03BD \U+03BA\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7 (\U+03AE \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE \U+03AD\U+03C4\U+03BF\U+03B9\U+03BC\U+03C9\U+03BD \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CE\U+03BD \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03CE\U+03BD)")))
      (if (null dl)
        (progn (princ "\n\U+03A4\U+03BF \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF \U+03B4\U+03B5\U+03BD \U+03BA\U+03B1\U+03C4\U+03B1\U+03C7\U+03C9\U+03C1\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5 - \U+03B4\U+03BF\U+03BA\U+03AF\U+03BC\U+03B1\U+03C3\U+03B5 \U+03BE\U+03B1\U+03BD\U+03AC.") nil)
        (progn
          (kal:hl dl 3)
          (princ (strcat "\n\U+00AB" fname "\U+00BB: \U+03BC\U+03B9\U+03BA\U+03C4\U+03CC \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+0395 = " (kal:fmt (kal:sumarea dl) 2) " \U+03C4.\U+03BC."))
          (while (progn
                   (initget "H X K I A F P")
                   (setq code (getkword (strcat "\n\U+03A7\U+03CE\U+03C1\U+03BF\U+03B9 \U+03C3\U+03C4\U+03BF \U+00AB" fname "\U+00BB:  H \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03C2 \U+00B7 X \U+03B5\U+03BE\U+03CE\U+03C3\U+03C4\U+03B7\U+03C2 \U+00B7 K \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03B7 \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1 \U+00B7 I \U+03B9\U+03B4\U+03B9\U+03C9\U+03C4\U+03B9\U+03BA\U+03AE \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1 \U+00B7 A \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03AE \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1 \U+00B7 F \U+03C6\U+03C9\U+03C4\U+03B1\U+03B3\U+03C9\U+03B3\U+03CC\U+03C2/\U+03C6\U+03C1\U+03B5\U+03AC\U+03C4\U+03B9\U+03BF/\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF \U+00B7 P \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7/\U+0397-\U+039C  [H/X/K/I/A/F/P] <\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2>: "))))
            (while (progn
                     (initget "E")
                     (setq p (getpoint (strcat "\n  " (kal:codetxt code) ": \U+03BA\U+03BB\U+03B9\U+03BA \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03BF\U+03BD \U+03C7\U+03CE\U+03C1\U+03BF [E = \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE\U+03C2] <\U+03C4\U+03AD\U+03BB\U+03BF\U+03C2>: "))))
              (if (= p "E")
                (foreach e (kal:sslist "\n\U+0395\U+03C0\U+03AF\U+03BB\U+03B5\U+03BE\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AD\U+03C2 \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2: ")
                  (setq sp (append sp (list (cons code e)))))
                (if (setq e (kal:space p "KAL_XOROI"))
                  (progn
                    (setq sp (append sp (list (cons code e))))
                    (redraw e 3)
                    (princ (strcat "  \U+0395 = " (kal:fmt (kal:area (kal:verts e)) 2) " \U+03C4.\U+03BC.")))))))
          (kal:hl dl 4)
          (kal:hl (mapcar 'cdr sp) 4)
          (list fname typ use dl sp)))))
  )
(defun kal:asklevels (l0 / i go r l)
  (setq l (reverse l0) i (length l0) go T)
  (while go
    (setq r (kal:asklevel i))
    (cond ((= r 'END) (setq go nil))
          (r (setq l (cons r l) i (1+ i)))))
  (reverse l))

;; ---------------- \U+03BC\U+03B7\U+03C7\U+03B1\U+03BD\U+03AE \U+03BA\U+03B1\U+03BD\U+03CC\U+03BD\U+03C9\U+03BD (\U+03BD.5306/2026) ----------------
(defun kal:inany (p vls / in)
  (foreach v vls (if (kal:pip p v) (setq in T)))
  in)
;; \U+03B1\U+03BD\U+03AC \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF: (G tot ex hx h ((\U+03BA\U+03C9\U+03B4 \U+03B5\U+03BC\U+03B2 \U+03B5\U+03BE\U+03B1\U+03B9\U+03C1 \U+03C3\U+03B7\U+03BC) ..))
(defun kal:lcalc (lv entr / dvs G tot ex hx h c e a vl in x nt lst)
  (setq dvs (mapcar 'kal:verts (nth 3 lv)) G (kal:sumarea (nth 3 lv)) tot G ex 0.0 hx 0.0 h 0.0)
  (foreach s (nth 4 lv)
    (setq c (car s) vl (kal:verts (cdr s)) a (kal:area vl) nt "")
    (setq in (kal:inany (kal:cent vl) dvs))
    (if (not in) (setq tot (+ tot a)))
    (cond
      ((or (= c "H") (= c "X"))
        (setq hx (+ hx a) x 0.0 nt "\U+03CC\U+03C1\U+03B9\U+03BF 40% / 20% \U+03C3\U+03C4\U+03BF \U+03C3\U+03CD\U+03BD\U+03BF\U+03BB\U+03BF (206 \U+03C0\U+03B1\U+03C1. 6\U+03B1)")
        (if (= c "H") (setq h (+ h a))))
      ((= c "K")
        (setq x (min a (if entr 40.0 30.0)) nt (strcat "\U+03AD\U+03C9\U+03C2 " (if entr "40" "30") " \U+03C4.\U+03BC. \U+03B1\U+03BD\U+03AC \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF (206 \U+03C0\U+03B1\U+03C1. 6\U+03B4)")))
      ((= c "I")
        (setq x (min a 25.0) nt "\U+03AD\U+03C9\U+03C2 25 \U+03C4.\U+03BC. \U+03B1\U+03BD\U+03AC \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF (206 \U+03C0\U+03B1\U+03C1. 6\U+03B5)"))
      ((= c "A")
        (setq *kal-ac* (1+ *kal-ac*))
        (if (<= *kal-ac* 2)
          (setq x a nt "\U+03AD\U+03C9\U+03C2 2 \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03AC, \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B7 \U+03AD\U+03C9\U+03C2 7,50 \U+03BC. (206 \U+03C0\U+03B1\U+03C1. 6\U+03C3\U+03C4)")
          (setq x 0.0 nt "3\U+03BF \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03CC \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF: \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC")))
      ((= c "F")
        (setq x a nt (if (< a 1.5) "\U+03C9\U+03C2 \U+03C6\U+03C1\U+03B5\U+03AC\U+03C4\U+03B9\U+03BF \U+0397/\U+039C\U+00B7 \U+03C6\U+03C9\U+03C4\U+03B1\U+03B3\U+03C9\U+03B3\U+03CC\U+03C2 \U+03B8\U+03AD\U+03BB\U+03B5\U+03B9 1,50 \U+03C4.\U+03BC. (206 \U+03C0\U+03B1\U+03C1. 6\U+03B7)" "\U+03B4\U+03B5\U+03BD \U+03C6\U+03C9\U+03C4\U+03AF\U+03B6\U+03B5\U+03B9 \U+03BA\U+03CD\U+03C1\U+03B9\U+03BF\U+03C5\U+03C2 \U+03C7\U+03CE\U+03C1\U+03BF\U+03C5\U+03C2 (206 \U+03C0\U+03B1\U+03C1. 6\U+03B7)")))
      ((= c "P")
        (if (= (nth 1 lv) 1)
          (setq x (min a 25.0) nt "\U+03C5\U+03C0\U+03AD\U+03C1\U+03B3\U+03B5\U+03B9\U+03B1: \U+03BC\U+03CC\U+03BD\U+03BF \U+03C0\U+03BB\U+03B1\U+03C4\U+03C6\U+03CC\U+03C1\U+03BC\U+03B1 \U+03B1\U+03BD\U+03B5\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03AE\U+03C1\U+03B1 \U+03BF\U+03C7\U+03AE\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 \U+03AD\U+03C9\U+03C2 25 \U+03C4.\U+03BC. (206 \U+03BA\U+03B2)")
          (setq x a nt "\U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7 / \U+0397-\U+039C (206 \U+03C0\U+03B1\U+03C1. 6\U+03B8)")))
      (T (setq x 0.0)))
    (if (not (or (= c "H") (= c "X"))) (setq ex (+ ex x)))
    (setq lst (cons (list c a x nt) lst)))
  (list G tot ex hx h (reverse lst)))
(defun kal:under (levels j / k g)
  (setq k (1- j))
  (while (and (>= k 0) (null g))
    (if (= (nth 1 (nth k levels)) 1) (setq g (kal:sumarea (nth 3 (nth k levels)))))
    (setq k (1- k)))
  (if (null g) (foreach lv levels (if (and (null g) (= (nth 1 lv) 1)) (setq g (kal:sumarea (nth 3 lv))))))
  g)
;; \U+03B1\U+03C0\U+03BF\U+03C4\U+03AD\U+03BB\U+03B5\U+03C3\U+03BC\U+03B1: (Sd ((\U+03CC\U+03BD\U+03BF\U+03BC\U+03B1 \U+03C4\U+03CD\U+03C0\U+03BF\U+03C2 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7 G ex hx Lc \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC \U+03C3\U+03B7\U+03BC \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9) ..) HX H)
(defun kal:calc (levels Sk / j entr b1 Dom HX Hh rl r G tot ex hxl h Lc cnt nt typ use ug)
  (setq j 0 Dom 0.0 HX 0.0 Hh 0.0 *kal-ac* 0)
  (foreach lv levels (if (and (null entr) (= (nth 1 lv) 1)) (setq entr j)) (setq j (1+ j)))
  (setq j 0)
  (foreach lv levels
    (setq r (kal:lcalc lv (= j entr))
          G (nth 0 r) tot (nth 1 r) ex (nth 2 r) hxl (nth 3 r) h (nth 4 r)
          Lc (- tot ex hxl) typ (nth 1 lv) use (nth 2 lv) nt "")
    (setq cnt
      (cond
        ((= typ 2)
          (cond
            ((= use 2) (setq nt "\U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7 / \U+0397-\U+039C / \U+03BD\U+03B5\U+03C1\U+03CC / \U+03C0\U+03B9\U+03C3\U+03AF\U+03BD\U+03B1: \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC (206 \U+03C0\U+03B1\U+03C1. 6\U+03B8)") 0.0)
            ((= use 3) (setq nt "\U+03BA\U+03CD\U+03C1\U+03B9\U+03B1 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7: \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC") Lc)
            ((not b1) (setq b1 T nt "\U+03AD\U+03BD\U+03B1\U+03C2 \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03CC\U+03C2 \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF\U+03C2 \U+03AD\U+03C9\U+03C2 \U+03C4\U+03B7\U+03BD \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7, \U+03BF\U+03C1\U+03BF\U+03C6\U+03AE \U+03AD\U+03C9\U+03C2 1,20 \U+03BC. \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03AD\U+03B4\U+03B1\U+03C6\U+03BF\U+03C2 (206 \U+03C0\U+03B1\U+03C1. 6\U+03B9)") (max 0.0 (- Lc Sk)))
            (T (setq nt "2\U+03BF\U+03C2 \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03CC\U+03C2 \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF\U+03C2: \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC") Lc)))
        ((= typ 3)
          (setq ug (kal:under levels j))
          (if (and ug (<= G (+ (* 0.5 ug) 0.005)))
            (progn (setq nt (strcat "\U+03AD\U+03C9\U+03C2 1/2 \U+03C4\U+03BF\U+03C5 \U+03C5\U+03C0\U+03BF\U+03BA\U+03B5\U+03AF\U+03BC\U+03B5\U+03BD\U+03BF\U+03C5 \U+03BF\U+03C1\U+03CC\U+03C6\U+03BF\U+03C5 (" (kal:fmt (* 0.5 ug) 2) " \U+03C4.\U+03BC.) - \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC (206 \U+03B9\U+03B4)")) 0.0)
            (progn (setq nt (if ug (strcat "\U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03AC \U+03C4\U+03BF 1/2 \U+03C4\U+03BF\U+03C5 \U+03C5\U+03C0\U+03BF\U+03BA\U+03B5\U+03AF\U+03BC\U+03B5\U+03BD\U+03BF\U+03C5 (" (kal:fmt (* 0.5 ug) 2) " \U+03C4.\U+03BC.) - \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC") "\U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03C5\U+03C0\U+03BF\U+03BA\U+03B5\U+03AF\U+03BC\U+03B5\U+03BD\U+03BF \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF - \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC")) Lc)))
        ((= typ 4)
          (setq nt (if (= use 2) "\U+03C5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF \U+03AC\U+03BB\U+03BB\U+03B7\U+03C2 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7\U+03C2: \U+03B5\U+03BE\U+03B1\U+03B9\U+03C1\U+03B5\U+03AF\U+03C4\U+03B1\U+03B9 20% (206 \U+03BA\U+03B3)" "\U+03C5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1\U+03C2: \U+03B5\U+03BE\U+03B1\U+03B9\U+03C1\U+03B5\U+03AF\U+03C4\U+03B1\U+03B9 50% (206 \U+03BA\U+03B3)"))
          (* Lc (if (= use 2) 0.8 0.5)))
        (T Lc)))
    (setq Dom (+ Dom cnt) HX (+ HX hxl) Hh (+ Hh h))
    (setq rl (cons (list (car lv) typ use G ex hxl Lc cnt nt (nth 5 r)) rl) j (1+ j)))
  (list Dom (reverse rl) HX Hh))
(defun kal:hmax210 (s)
  (cond ((<= s 0.0) nil) ((<= s 0.4) 10.75) ((<= s 0.8) 14.0) ((<= s 1.2) 17.25)
        ((<= s 1.6) 19.5) ((<= s 2.0) 22.75) ((<= s 2.6) 26.0)))

;; ---------------- \U+03B5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B5\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 ----------------
;; dw: \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03BA\U+03AC\U+03C4\U+03C9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03BF\U+03C0\U+03BF\U+03AF\U+03B1 \U+03C3\U+03B7\U+03BC\U+03B5\U+03B9\U+03CE\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C0\U+03C1\U+03BF\U+03B5\U+03B9\U+03B4\U+03BF\U+03C0\U+03BF\U+03AF\U+03B7\U+03C3\U+03B7 (\U+03AE nil)
;; \U+03B5\U+03C0\U+03B9\U+03C3\U+03C4\U+03C1\U+03AD\U+03C6\U+03B5\U+03B9 (\U+03B5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B7  \U+03C0\U+03BB\U+03AE\U+03B8\U+03BF\U+03C2-\U+03C0\U+03C1\U+03BF\U+03B5\U+03B9\U+03B4\U+03BF\U+03C0\U+03BF\U+03B9\U+03AE\U+03C3\U+03B5\U+03C9\U+03BD  (\U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B1\U+03BD\U+03AC \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC))
(defun kal:dists (pv covv th dw / n i a b bd best c d m j u w done dup ang mid mn nw dl)
  (setq n (length pv) i 0 nw 0)
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
    (if best (setq mn (if mn (min mn bd) bd) dl (cons bd dl)))
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
            (if (and dw (> bd 0.05) (< bd (- dw 0.005))) (setq nw (1+ nw)))
            (kal:line (car best) (cadr best) "KAL_APOSTASEIS")
            (setq ang (angle (car best) (cadr best)))
            (if (and (> ang (/ pi 2.0)) (<= ang (* 1.5 pi))) (setq ang (+ ang pi)))
            (setq mid (polar (list (/ (+ (car (car best)) (car (cadr best))) 2.0)
                                   (/ (+ (cadr (car best)) (cadr (cadr best))) 2.0))
                             (+ ang (/ pi 2.0)) (* th 0.7)))
            (kal:txt mid (* th 0.8)
                     (strcat "\U+0394=" (kal:fmt bd 2) (if (and dw (> bd 0.05) (< bd (- dw 0.005))) " (<\U+03B4)" ""))
                     ang T "KAL_APOSTASEIS")))))
    (setq i (1+ i)))
  (list mn nw (reverse dl)))

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
  (setq *kal-old* (mapcar 'getvar (list "CMDECHO" "DIMZIN" "OSMODE" "PLINETYPE" "CLAYER")))
  (setvar "CMDECHO" 0) (setvar "DIMZIN" 0) (setvar "OSMODE" 0) (setvar "PLINETYPE" 2)
  (command "_.UNDO" "_BEGIN")
  (setq *kal-undo* T))
(defun kal:end ()
  (if *kal-undo* (progn (command "_.UNDO" "_END") (setq *kal-undo* nil)))
  (if *kal-old*
    (progn
      (mapcar 'setvar (list "CMDECHO" "DIMZIN" "OSMODE" "PLINETYPE" "CLAYER") *kal-old*)
      (setq *kal-ps* nil *kal-bold* nil)
      (setq *kal-old* nil))))
(defun kal:fetch (k / f)
  (if (null hx:oroi)
    (foreach x *kal-net* (if (and (null hx:oroi) (setq f (findfile x))) (load f))))
  (if hx:oroi
    (hx:oroi k)
    (progn (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 \U+03C4\U+03BF HEXISNET (\U+03AF\U+03B4\U+03B9\U+03BF\U+03C2 \U+03C6\U+03AC\U+03BA\U+03B5\U+03BB\U+03BF\U+03C2 \U+03BC\U+03B5 \U+03C4\U+03BF KALYPSI) - \U+03C6\U+03CC\U+03C1\U+03C4\U+03C9\U+03C3\U+03AD \U+03C4\U+03BF \U+03BC\U+03B5 APPLOAD.") nil)))


;; ---------------- \U+03B1\U+03BD\U+03B1\U+03C6\U+03BF\U+03C1\U+03AC HTML ----------------
(defun kal:cp (c)
  (cond ((and (>= c 192) (<= c 254) (/= c 210)) (+ c 720))
        ((= c 162) 902) ((= c 184) 904) ((= c 185) 905) ((= c 186) 906) ((= c 188) 908)
        ((= c 190) 910) ((= c 191) 911) ((= c 180) 900) ((= c 161) 901)
        ((= c 150) 8211) ((= c 151) 8212) ((= c 133) 8230) ((= c 145) 8216) ((= c 146) 8217)
        ((= c 147) 8220) ((= c 148) 8221) ((= c 149) 8226) ((= c 128) 8364)
        (T c)))
(defun kal:ent (s / i n r ch c)
  (setq i 1 n (strlen s) r "")
  (while (<= i n)
    (setq ch (substr s i 1))
    (if (and (= ch "\\") (= (strcase (substr s (1+ i) 2)) "U+"))
      (setq r (strcat r "&#x" (substr s (+ i 3) 4) ";") i (+ i 7))
      (progn
        (setq c (ascii ch))
        (setq r (strcat r (if (< c 128) ch (strcat "&#" (itoa (if (> c 255) c (kal:cp c))) ";"))) i (1+ i)))))
  r)
(defun kal:r (s) (setq *kal-rep* (cons s *kal-rep*)))
(defun kal:sg (s) (setq *kal-sug* (cons s *kal-sug*)))
(defun kal:tr (cells tag / s)
  (setq s "<tr>")
  (foreach c cells (setq s (strcat s "<" tag ">" c "</" tag ">")))
  (kal:r (strcat s "</tr>")))
(defun kal:writerep (path / f)
  (if (setq f (open path "w"))
    (progn
      (foreach s (reverse *kal-rep*) (write-line (kal:ent s) f))
      (close f)
      path)))
(defun kal:open (path / sh r)
  (setq sh (vl-catch-all-apply 'vlax-create-object (list "Shell.Application")))
  (if (and sh (not (vl-catch-all-error-p sh)))
    (progn
      (setq r (vl-catch-all-apply 'vlax-invoke-method (list sh "ShellExecute" path)))
      (vl-catch-all-apply 'vlax-release-object (list sh))
      (not (vl-catch-all-error-p r)))))
(defun kal:today (/ s)
  (setq s (rtos (getvar "CDATE") 2 0))
  (strcat (substr s 7 2) "." (substr s 5 2) "." (substr s 1 4)))

;; ---------------- \U+03C0\U+03C1\U+03BF\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B5\U+03BE\U+03BF\U+03B9\U+03BA\U+03BF\U+03BD\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 ----------------
(defun kal:suggest (mode kp kpe pk E Sk Dom allow lim40 limH HX Hh HXc rl hg dmn nab / r40 rH n1 top hasK has2 has3 has4 hasA ug)
  (setq *kal-sug* nil n1 0)
  (foreach r rl
    (if (= (nth 1 r) 1) (setq n1 (1+ n1) top (nth 3 r)))
    (if (and (= (nth 1 r) 2) (= (nth 2 r) 1)) (setq has2 T))
    (if (= (nth 1 r) 3) (setq has3 T))
    (if (= (nth 1 r) 4) (setq has4 T))
    (foreach s (nth 9 r)
      (if (member (car s) (list "K" "I")) (setq hasK T))
      (if (= (car s) "A") (setq hasA T))
      (if (and (member (car s) (list "K" "I")) (> (cadr s) (+ (caddr s) 0.005)))
        (kal:sg (strcat "\U+0397 \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1 \U+03C3\U+03C4\U+03BF \U+00AB" (car r) "\U+00BB \U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03AC \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03B5\U+03BE\U+03B1\U+03AF\U+03C1\U+03B5\U+03C3\U+03B7\U+03C2 \U+03BA\U+03B1\U+03C4\U+03AC <b>" (kal:fmt (- (cadr s) (caddr s)) 2)
                        " \U+03C4.\U+03BC.</b>, \U+03C0\U+03BF\U+03C5 \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD. \U+039C\U+03B5 \U+03BC\U+03B9\U+03BA\U+03C1\U+03CC\U+03C4\U+03B5\U+03C1\U+03BF \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF (\U+03AE \U+03B4\U+03AE\U+03BB\U+03C9\U+03C3\U+03B7 \U+03C9\U+03C2 \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF, \U+03AD\U+03C9\U+03C2 30 \U+03C4.\U+03BC. / 40 \U+03C3\U+03C4\U+03B7\U+03BD \U+03B5\U+03AF\U+03C3\U+03BF\U+03B4\U+03BF) \U+03C4\U+03B1 \U+03C4.\U+03BC. \U+03B1\U+03C5\U+03C4\U+03AC \U+03B3\U+03BB\U+03B9\U+03C4\U+03CE\U+03BD\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B4-\U+03B5)"))))
    (cond
      ((and (= (nth 1 r) 2) (= (nth 2 r) 1) (> (nth 7 r) 0.005))
        (kal:sg (strcat "\U+03A4\U+03BF \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF \U+00AB" (car r) "\U+00BB \U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03AC \U+03C4\U+03B7\U+03BD \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 \U+03BA\U+03B1\U+03C4\U+03AC <b>" (kal:fmt (nth 7 r) 2)
                        " \U+03C4.\U+03BC.</b>, \U+03C0\U+03BF\U+03C5 \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD. \U+0391\U+03BD \U+03C4\U+03BF \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1 \U+03B1\U+03C5\U+03C4\U+03CC \U+03B3\U+03AF\U+03BD\U+03B5\U+03B9 \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7, \U+0397-\U+039C, \U+03B4\U+03B5\U+03BE\U+03B1\U+03BC\U+03B5\U+03BD\U+03AE \U+03BD\U+03B5\U+03C1\U+03BF\U+03CD \U+03AE \U+03C0\U+03B9\U+03C3\U+03AF\U+03BD\U+03B1, \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B8-\U+03B9)")))
      ((and (= (nth 1 r) 2) (= (nth 2 r) 3))
        (kal:sg (strcat "\U+03A4\U+03BF \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF \U+00AB" (car r) "\U+00BB \U+03BA\U+03CD\U+03C1\U+03B9\U+03B1\U+03C2 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7\U+03C2 \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC \U+03CC\U+03BB\U+03BF (" (kal:fmt (nth 7 r) 2) " \U+03C4.\U+03BC.). \U+03A9\U+03C2 \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03CC (\U+03BF\U+03C1\U+03BF\U+03C6\U+03AE \U+03AD\U+03C9\U+03C2 1,20 \U+03BC. \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03AD\U+03B4\U+03B1\U+03C6\U+03BF\U+03C2) \U+03B5\U+03BE\U+03B1\U+03B9\U+03C1\U+03B5\U+03AF\U+03C4\U+03B1\U+03B9 \U+03AD\U+03C9\U+03C2 <b>"
                        (kal:fmt (min (nth 6 r) Sk) 2) " \U+03C4.\U+03BC.</b> (\U+03CC\U+03C3\U+03BF \U+03B7 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7). (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B9)")))
      ((and (= (nth 1 r) 3) (> (nth 7 r) 0.005))
        (setq ug (kal:underr rl r))
        (kal:sg (strcat "\U+0397 \U+03C3\U+03BF\U+03C6\U+03AF\U+03C4\U+03B1 \U+00AB" (car r) "\U+00BB \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC \U+03CC\U+03BB\U+03B7 (" (kal:fmt (nth 7 r) 2) " \U+03C4.\U+03BC.) \U+03B5\U+03C0\U+03B5\U+03B9\U+03B4\U+03AE \U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03AC \U+03C4\U+03BF 1/2 \U+03C4\U+03BF\U+03C5 \U+03C5\U+03C0\U+03BF\U+03BA\U+03B5\U+03AF\U+03BC\U+03B5\U+03BD\U+03BF\U+03C5 \U+03BF\U+03C1\U+03CC\U+03C6\U+03BF\U+03C5."
                        (if ug (strcat " \U+0391\U+03BD \U+03C0\U+03B5\U+03C1\U+03B9\U+03BF\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03AF \U+03C3\U+03C4\U+03B1 <b>" (kal:fmt (* 0.5 ug) 2) " \U+03C4.\U+03BC.</b> \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC \U+03BA\U+03B1\U+03B8\U+03CC\U+03BB\U+03BF\U+03C5.") "")
                        " (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B5\U+03C1. \U+03B9\U+03B4)")))))
  ;; \U+03C5\U+03C0\U+03CC\U+03BB\U+03BF\U+03B9\U+03C0\U+03BF / \U+03C5\U+03C0\U+03AD\U+03C1\U+03B2\U+03B1\U+03C3\U+03B7
  (if allow
    (cond
      ((> (- allow Dom) 0.5)
        (kal:sg (strcat "\U+03A5\U+03C0\U+03CC\U+03BB\U+03BF\U+03B9\U+03C0\U+03BF \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2: <b>" (kal:fmt (- allow Dom) 2) " \U+03C4.\U+03BC.</b> \U+03B1\U+03BA\U+03CC\U+03BC\U+03B7 \U+03B1\U+03BE\U+03B9\U+03BF\U+03C0\U+03BF\U+03B9\U+03AE\U+03C3\U+03B9\U+03BC\U+03B1.")))
      ((< (- allow Dom) -0.005)
        (kal:sg (strcat "<b>\U+03A5\U+03C0\U+03AD\U+03C1\U+03B2\U+03B1\U+03C3\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 " (kal:fmt (- Dom allow) 2) " \U+03C4.\U+03BC.</b> \U+2014 \U+03BF\U+03B9 \U+03C0\U+03B1\U+03C1\U+03B1\U+03BA\U+03AC\U+03C4\U+03C9 \U+03C0\U+03C1\U+03BF\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B4\U+03B5\U+03AF\U+03C7\U+03BD\U+03BF\U+03C5\U+03BD \U+03C0\U+03BF\U+03CD \U+03BC\U+03C0\U+03BF\U+03C1\U+03B5\U+03AF \U+03BD\U+03B1 \U+03BA\U+03B1\U+03BB\U+03C5\U+03C6\U+03B8\U+03B5\U+03AF.")))))
  ;; \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 / \U+03B5\U+03BE\U+03CE\U+03C3\U+03C4\U+03B5\U+03C2
  (if allow
    (progn
      (setq r40 (- lim40 HX) rH (min r40 (- limH Hh)))
      (if (> r40 0.5)
        (kal:sg (strcat "\U+0391\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03BF\U+03AF \U+03B5\U+03BE\U+03CE\U+03C3\U+03C4\U+03B5\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9: \U+03C7\U+03C9\U+03C1\U+03AC\U+03BD\U+03B5 \U+03B1\U+03BA\U+03CC\U+03BC\U+03B7 <b>" (kal:fmt r40 2) " \U+03C4.\U+03BC.</b> \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03BD\U+03B1 \U+03BC\U+03B5\U+03C4\U+03C1\U+03AE\U+03C3\U+03BF\U+03C5\U+03BD"
                        (if (> rH 0.5) (strcat " (\U+03B1\U+03C0\U+03CC \U+03B1\U+03C5\U+03C4\U+03AC \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 \U+03AD\U+03C9\U+03C2 " (kal:fmt rH 2) " \U+03C4.\U+03BC.)") "")
                        ". \U+03A7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03C0\U+03BF\U+03C5 \U+03B8\U+03B1 \U+03AE\U+03C4\U+03B1\U+03BD \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC\U+03C2 \U+03BC\U+03C0\U+03BF\U+03C1\U+03B5\U+03AF \U+03BD\U+03B1 \U+03B3\U+03AF\U+03BD\U+03B5\U+03B9 \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03CC\U+03C2 \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03C2 \U+2014 \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD \U+03C3\U+03C4\U+03BF 35% \U+03C4\U+03B7\U+03C2 \U+03C0\U+03B5\U+03C1\U+03B9\U+03BC\U+03AD\U+03C4\U+03C1\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C5. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B1, \U+03BF\U+03C1\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+039D\U+039F\U+039A)")))
      (if (> HXc 0.005)
        (kal:sg (strcat "\U+039F\U+03B9 \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03BF\U+03AF \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9 \U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03BF\U+03CD\U+03BD \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF 40% / 20%: \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD <b>" (kal:fmt HXc 2) " \U+03C4.\U+03BC.</b> \U+039C\U+03B5\U+03AF\U+03C9\U+03C3\U+03AD \U+03C4\U+03BF\U+03C5\U+03C2 \U+03BA\U+03B1\U+03C4\U+03AC \U+03C4\U+03CC\U+03C3\U+03BF \U+03B3\U+03B9\U+03B1 \U+03BD\U+03B1 \U+03BC\U+03B7 \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 5, 6\U+03B1)")))))
  ;; \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03B1
  (if (and (>= n1 2) (not hasK) (not hasA))
    (kal:sg (strcat "\U+0394\U+03B5\U+03BD \U+03B4\U+03B7\U+03BB\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF: \U+03C3\U+03B5 \U+03BA\U+03AC\U+03B8\U+03B5 \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD \U+03AD\U+03C9\U+03C2 25 \U+03C4.\U+03BC. \U+03B9\U+03B4\U+03B9\U+03C9\U+03C4\U+03B9\U+03BA\U+03AE\U+03C2 \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1\U+03C2 \U+03AE 30 \U+03C4.\U+03BC. \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03B7\U+03C2 (40 \U+03C3\U+03C4\U+03BF \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF \U+03B5\U+03B9\U+03C3\U+03CC\U+03B4\U+03BF\U+03C5) \U+2014 \U+03C0\U+03B5\U+03C1\U+03AF\U+03C0\U+03BF\U+03C5 <b>"
                    (kal:fmt (* 25.0 n1) 2) " \U+03C4.\U+03BC.</b> \U+03C3\U+03C4\U+03B1 " (itoa n1) " \U+03C5\U+03C0\U+03AD\U+03C1\U+03B3\U+03B5\U+03B9\U+03B1 \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1. \U+0394\U+03AE\U+03BB\U+03C9\U+03C3\U+03AD \U+03C4\U+03BF \U+03BC\U+03B5 K \U+03AE I. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B4-\U+03B5)")))
  (if (and (not hasA) (> hg 0.0) (<= hg 7.5) (>= n1 2))
    (kal:sg "\U+0388\U+03C9\U+03C2 \U+03B4\U+03CD\U+03BF \U+03B1\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03AC \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03B1 \U+03C0\U+03BF\U+03C5 \U+03B5\U+03BE\U+03C5\U+03C0\U+03B7\U+03C1\U+03B5\U+03C4\U+03BF\U+03CD\U+03BD \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B7 \U+03AD\U+03C9\U+03C2 7,50 \U+03BC. \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD \U+03BA\U+03B1\U+03B8\U+03CC\U+03BB\U+03BF\U+03C5 \U+2014 \U+03C0.\U+03C7. \U+03B5\U+03BE\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03AE \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1 \U+03B1\U+03BD\U+03C4\U+03AF \U+03B3\U+03B9\U+03B1 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03AE. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03C3\U+03C4)"))
  ;; \U+03C3\U+03BF\U+03C6\U+03AF\U+03C4\U+03B1
  (if (and (not has3) top)
    (kal:sg (strcat "\U+03A3\U+03BF\U+03C6\U+03AF\U+03C4\U+03B1 \U+03BA\U+03AC\U+03C4\U+03C9 \U+03B1\U+03C0\U+03CC \U+03BA\U+03B5\U+03BA\U+03BB\U+03B9\U+03BC\U+03AD\U+03BD\U+03B7 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7, \U+03AD\U+03C9\U+03C2 <b>" (kal:fmt (* 0.5 top) 2)
                    " \U+03C4.\U+03BC.</b> (1/2 \U+03C4\U+03BF\U+03C5 \U+03C5\U+03C0\U+03BF\U+03BA\U+03B5\U+03AF\U+03BC\U+03B5\U+03BD\U+03BF\U+03C5 \U+03BF\U+03C1\U+03CC\U+03C6\U+03BF\U+03C5 \U+03BC\U+03B1\U+03B6\U+03AF \U+03BC\U+03B5 \U+03C4\U+03BF\U+03C5\U+03C2 \U+03C4\U+03BF\U+03AF\U+03C7\U+03BF\U+03C5\U+03C2), \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC. \U+0394\U+03B5\U+03BD \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03B4\U+03B5\U+03BD \U+03B3\U+03AF\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03B1\U+03BD\U+03B5\U+03BE\U+03AC\U+03C1\U+03C4\U+03B7\U+03C4\U+03B7 \U+03B9\U+03B4\U+03B9\U+03BF\U+03BA\U+03C4\U+03B7\U+03C3\U+03AF\U+03B1."
                    (if (/= mode 1) " \U+039C\U+03B5 \U+03BA\U+03B5\U+03BA\U+03BB\U+03B9\U+03BC\U+03AD\U+03BD\U+03B7 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7 \U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2 \U+03C0\U+03C1\U+03BF\U+03C3\U+03B1\U+03C5\U+03BE\U+03AC\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03BA\U+03B1\U+03C4\U+03AC 1,20 \U+03BC." "")
                    " (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B5\U+03C1. \U+03B9\U+03B4)")))
  ;; \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF
  (if (and (not has2) (> Sk 0.0))
    (kal:sg (strcat "\U+0388\U+03BD\U+03B1\U+03C2 \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03BF\U+03C2 \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF\U+03C2 \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03AE\U+03C2 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B7\U+03C2 \U+03AD\U+03C9\U+03C2 <b>" (kal:fmt Sk 2)
                    " \U+03C4.\U+03BC.</b> (\U+03CC\U+03C3\U+03BF \U+03B7 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7, \U+03BF\U+03C1\U+03BF\U+03C6\U+03AE \U+03AD\U+03C9\U+03C2 1,20 \U+03BC. \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03AD\U+03B4\U+03B1\U+03C6\U+03BF\U+03C2) \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC. \U+03A5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03B1 \U+03B3\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7, \U+0397-\U+039C, \U+03BD\U+03B5\U+03C1\U+03CC, \U+0391\U+03A0\U+0395 \U+03AE \U+03C0\U+03B9\U+03C3\U+03AF\U+03BD\U+03B1 \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD \U+03B1\U+03BD\U+03B5\U+03BE\U+03B1\U+03C1\U+03C4\U+03AE\U+03C4\U+03C9\U+03C2 \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03BF\U+03CD. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B8-\U+03B9)")))
  ;; \U+03C5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF
  (if (not has4)
    (kal:sg "\U+03A3\U+03B5 \U+03B5\U+03C0\U+03B9\U+03BA\U+03BB\U+03B9\U+03BD\U+03AD\U+03C2 \U+03B3\U+03AE\U+03C0\U+03B5\U+03B4\U+03BF: \U+03C5\U+03C0\U+03CC\U+03C3\U+03BA\U+03B1\U+03C6\U+03BF \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1 (\U+03BC\U+03AF\U+03B1 \U+03CC\U+03C8\U+03B7, \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03AF\U+03C7\U+03BD\U+03BF\U+03C2 \U+03C3\U+03C4\U+03B7\U+03BD \U+03BA\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7, \U+03C0\U+03C1\U+03BF\U+03C3\U+03B2\U+03AC\U+03C3\U+03B9\U+03BC\U+03B7 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7) \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC \U+03BC\U+03CC\U+03BD\U+03BF \U+03BA\U+03B1\U+03C4\U+03AC 50% \U+03B3\U+03B9\U+03B1 \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1 (\U+03B5\U+03BE\U+03B1\U+03AF\U+03C1\U+03B5\U+03C3\U+03B7 20% \U+03B3\U+03B9\U+03B1 \U+03AC\U+03BB\U+03BB\U+03B5\U+03C2 \U+03C7\U+03C1\U+03AE\U+03C3\U+03B5\U+03B9\U+03C2). (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B5\U+03C1. \U+03BA\U+03B3)"))
  ;; \U+03C6\U+03C9\U+03C4\U+03B1\U+03B3\U+03C9\U+03B3\U+03BF\U+03AF, \U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03B1, \U+03B5\U+03C3\U+03BF\U+03C7\U+03AD\U+03C2
  (kal:sg "\U+0391\U+03AF\U+03B8\U+03C1\U+03B9\U+03B1, \U+03C6\U+03C9\U+03C4\U+03B1\U+03B3\U+03C9\U+03B3\U+03BF\U+03AF \U+03B1\U+03C0\U+03CC 1,50 \U+03C4.\U+03BC., \U+03C6\U+03C1\U+03B5\U+03AC\U+03C4\U+03B9\U+03B1 \U+0397/\U+039C \U+03BA\U+03B1\U+03B9 \U+03B5\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B5\U+03C2 \U+03B1\U+03C0\U+03CC \U+03B5\U+03C3\U+03BF\U+03C7\U+03AD\U+03C2 \U+03C3\U+03C4\U+03BF \U+03C3\U+03CE\U+03BC\U+03B1 \U+03C4\U+03BF\U+03C5 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD \U+2014 \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD \U+03CC\U+03BC\U+03C9\U+03C2 \U+03BF\U+03CD\U+03C4\U+03B5 \U+03B3\U+03B9\U+03B1 \U+03C4\U+03BF\U+03BD \U+03C6\U+03C9\U+03C4\U+03B9\U+03C3\U+03BC\U+03CC \U+03C4\U+03C9\U+03BD \U+03BA\U+03CD\U+03C1\U+03B9\U+03C9\U+03BD \U+03C7\U+03CE\U+03C1\U+03C9\U+03BD. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B3, 6\U+03B7)")
  ;; \U+0391\U+03BC\U+03B5\U+0391
  (kal:sg "\U+0391\U+03BC\U+03B5\U+0391: \U+03BF \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B1\U+03BD\U+03B1\U+03BC\U+03BF\U+03BD\U+03AE\U+03C2 \U+0391\U+03BC\U+03B5\U+0391 \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03BF \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF \U+03C0\U+03B5\U+03C1\U+03B9\U+03BB\U+03B1\U+03BC\U+03B2\U+03AC\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C3\U+03C4\U+03B1 30 / 40 \U+03C4.\U+03BC. \U+03C0\U+03BF\U+03C5 \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD, \U+03BA\U+03B1\U+03B9 \U+03BF\U+03B9 \U+03BA\U+03B1\U+03C4\U+03B1\U+03C3\U+03BA\U+03B5\U+03C5\U+03AD\U+03C2 \U+03B3\U+03B9\U+03B1 \U+0391\U+03BC\U+03B5\U+0391 (\U+03C1\U+03AC\U+03BC\U+03C0\U+03B5\U+03C2 \U+03BA.\U+03BB\U+03C0.) \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03AD\U+03C0\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03B9\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+0394 / \U+03B4. (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B4, 211 \U+03C0\U+03B1\U+03C1. 8)")
  ;; \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7
  (if (> kpe (+ kp 0.001))
    (kal:sg (strcat "\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7: \U+03B9\U+03C3\U+03C7\U+03CD\U+03B5\U+03B9 \U+03B7 \U+03C0\U+03C1\U+03BF\U+03C3\U+03B1\U+03CD\U+03BE\U+03B7\U+03C3\U+03B7 \U+03AD\U+03C9\U+03C2 120 \U+03C4.\U+03BC. (\U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03BD\U+03B1 \U+03BE\U+03B5\U+03C0\U+03B5\U+03C1\U+03BD\U+03AC \U+03C4\U+03BF 70%) \U+2014 \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7 <b>" (kal:fz kpe) " %</b> \U+03B1\U+03BD\U+03C4\U+03AF " (kal:fz kp) " %. (\U+03AC\U+03C1\U+03B8. 207)")))
  (if (and (> kpe 0.0) (> (- kpe pk) 0.5))
    (kal:sg (strcat "\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7: \U+03C0\U+03B5\U+03C1\U+03B9\U+03B8\U+03CE\U+03C1\U+03B9\U+03BF \U+03B1\U+03BA\U+03CC\U+03BC\U+03B7 <b>" (kal:fmt (- kpe pk) 2) " %</b> \U+03C4\U+03BF\U+03C5 \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5.")))
  ;; \U+03CD\U+03C8\U+03BF\U+03C2 / \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2
  (if (= mode 1)
    (progn
      (cond
        ((and (> hg 8.5) (<= hg 10.0))
          (kal:sg (strcat "\U+039C\U+03B5 \U+03CD\U+03C8\U+03BF\U+03C2 \U+03AD\U+03C9\U+03C2 8,50 \U+03BC. (\U+03C3\U+03AE\U+03BC\U+03B5\U+03C1\U+03B1 " (kal:fz hg) " \U+03BC.) \U+03C4\U+03BF \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF \U+03B3\U+03AF\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C7\U+03B1\U+03BC\U+03B7\U+03BB\U+03CC: \U+0394 = 2,50 \U+03BC. \U+03C3\U+03C4\U+03B1\U+03B8\U+03B5\U+03C1\U+03CC \U+03B1\U+03BD\U+03C4\U+03AF 3 + 0,10\U+0397, \U+03BA\U+03B1\U+03B9 \U+03B5\U+03BB\U+03B5\U+03CD\U+03B8\U+03B5\U+03C1\U+03B7 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B8\U+03AD\U+03C4\U+03B7\U+03C3\U+03B7. (\U+03AC\U+03C1\U+03B8. 221)")))
        ((and (> hg 0.0) (<= hg 8.5))
          (kal:sg "\U+03A7\U+03B1\U+03BC\U+03B7\U+03BB\U+03CC \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF (\U+03CD\U+03C8\U+03BF\U+03C2 \U+03AD\U+03C9\U+03C2 8,50 \U+03BC.): \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03C0\U+03AF\U+03C3\U+03C9 \U+03BA\U+03B1\U+03B9 \U+03C0\U+03BB\U+03AC\U+03B3\U+03B9\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 \U+0394 = 2,50 \U+03BC. \U+03C3\U+03C4\U+03B1\U+03B8\U+03B5\U+03C1\U+03AE. (\U+03AC\U+03C1\U+03B8. 221)")))
      (kal:sg "\U+039A\U+03AF\U+03BD\U+03B7\U+03C4\U+03C1\U+03B1 \U+03B3\U+03B9\U+03B1 \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF \U+03C3\U+03C7\U+03B5\U+03B4\U+03CC\U+03BD \U+03BC\U+03B7\U+03B4\U+03B5\U+03BD\U+03B9\U+03BA\U+03AE\U+03C2 \U+03BA\U+03B1\U+03C4\U+03B1\U+03BD\U+03AC\U+03BB\U+03C9\U+03C3\U+03B7\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03C0\U+03B5\U+03C1\U+03B9\U+03B2\U+03B1\U+03BB\U+03BB\U+03BF\U+03BD\U+03C4\U+03B9\U+03BA\U+03AE\U+03C2 \U+03B1\U+03BD\U+03B1\U+03B2\U+03AC\U+03B8\U+03BC\U+03B9\U+03C3\U+03B7\U+03C2 (\U+03C0\U+03C1\U+03BF\U+03C3\U+03B1\U+03CD\U+03BE\U+03B7\U+03C3\U+03B7 \U+03A3\U+0394 / \U+03CD\U+03C8\U+03BF\U+03C5\U+03C2): \U+03AD\U+03BB\U+03B5\U+03B3\U+03BE\U+03B5 \U+03C4\U+03BF \U+03B9\U+03C3\U+03C7\U+03CD\U+03BF\U+03BD \U+03BA\U+03B1\U+03B8\U+03B5\U+03C3\U+03C4\U+03CE\U+03C2 \U+03BC\U+03B5\U+03C4\U+03AC \U+03C4\U+03B9\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C6\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03A3\U+03C4\U+0395 \U+03C0\U+03C1\U+03B9\U+03BD \U+03C4\U+03B1 \U+03C7\U+03C1\U+03B7\U+03C3\U+03B9\U+03BC\U+03BF\U+03C0\U+03BF\U+03B9\U+03AE\U+03C3\U+03B5\U+03B9\U+03C2. (\U+03AC\U+03C1\U+03B8. 204, 222)")))
  (if (and (= mode 2) dmn (< dmn 15.0))
    (kal:sg "\U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5: \U+03B3\U+03B9\U+03B1 \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1 \U+03C3\U+03B5 \U+03B3\U+03AE\U+03C0\U+03B5\U+03B4\U+03BF \U+03C0\U+03BF\U+03C5 \U+03C5\U+03C0\U+03AE\U+03C1\U+03C7\U+03B5 \U+03C3\U+03C4\U+03B9\U+03C2 15.4.1981, \U+03BF\U+03B9 \U+03C0\U+03BB\U+03AC\U+03B3\U+03B9\U+03B5\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B3\U+03AF\U+03BD\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 7,50 \U+03BC. \U+03B1\U+03BD \U+03B4\U+03B5\U+03BD \U+03C7\U+03C9\U+03C1\U+03AC\U+03B5\U+03B9 \U+03BC\U+03B5 15 \U+03BC. \U+2014 \U+03C4\U+03CC\U+03C4\U+03B5 \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 \U+03AD\U+03C9\U+03C2 10 \U+03BC. (\U+03AC\U+03C1\U+03B8. 251)"))
  (setq *kal-sug* (reverse *kal-sug*)))
(defun kal:underr (rl r / g stop)
  (foreach x rl
    (if (equal x r) (setq stop T))
    (if (and (not stop) (= (nth 1 x) 1)) (setq g (nth 3 x))))
  (if (null g) (foreach x rl (if (and (null g) (= (nth 1 x) 1)) (setq g (nth 3 x)))))
  g)

(defun kal:strip (s / r i ch in)
  (setq r "" i 1)
  (while (<= i (strlen s))
    (setq ch (substr s i 1))
    (cond ((= ch "<") (setq in T)) ((= ch ">") (setq in nil)) ((not in) (setq r (strcat r ch))))
    (setq i (1+ i)))
  r)
(defun kal:report (rows rl kaek mode E Sk pk allow lim40 limH HX Hh HXc hg hmax dreq Dbig dres trees nab res d / k bad)
  (setq *kal-rep* nil bad (vl-string-search "\U+03A5\U+03A0\U+0395\U+03A1\U+0392" res))
  (kal:r "<!DOCTYPE html><html lang=el><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\">")
  (kal:r "<title>KALYPSI - \U+0391\U+03BD\U+03AC\U+03BB\U+03C5\U+03C3\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2</title><style>")
  (kal:r "body{font:18px/1.6 'Segoe UI',Arial,sans-serif;background:#fff;color:#1F2836;max-width:980px;margin:22px auto;padding:0 18px}")
  (kal:r "h1{font-size:28px;margin:0 0 4px}h2{font-size:22px;margin:30px 0 10px;padding-bottom:5px;border-bottom:3px solid #F26B21}h3{font-size:19px;margin:18px 0 6px}")
  (kal:r "table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #D9DDE4;padding:8px 11px;text-align:left;vertical-align:top}th{background:#F3F5F8}")
  (kal:r ".ok{color:#1A7F4B;font-weight:700}.no{color:#B42318;font-weight:700}.sub{color:#4A5563;font-size:16px}li{margin:9px 0}.res{font-size:24px;padding:12px 16px;border-radius:10px;background:#F3F5F8;display:inline-block}")
  (kal:r "</style></head><body>")
  (kal:r "<h1>KALYPSI \U+2014 \U+0394\U+03B9\U+03AC\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2 &amp; \U+03B1\U+03BD\U+03AC\U+03BB\U+03C5\U+03C3\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2</h1>")
  (kal:r (strcat "<div class=sub>HEXIS-APP \U+00B7 " (kal:today) " \U+00B7 " (kal:modetxt mode) (if (/= kaek "") (strcat " \U+00B7 \U+039A\U+0391\U+0395\U+039A " kaek) "") "</div>"))
  (kal:r (strcat "<h2>\U+0391\U+03C0\U+03BF\U+03C4\U+03AD\U+03BB\U+03B5\U+03C3\U+03BC\U+03B1</h2><div class=\"res " (if bad "no" "ok") "\">" res "</div>"))
  ;; \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2
  (kal:r "<h2>\U+03A0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2 - \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2</h2><table>")
  (foreach r rows
    (if (cadr r)
      (kal:tr (list (nth 0 r) (nth 1 r) (nth 2 r)) (if (= (nth 1 r) "\U+0395\U+03A0\U+0399\U+03A4\U+03A1\U+0395\U+03A0\U+039F\U+039C\U+0395\U+039D\U+0391") "th" "td"))))
  (kal:r "</table>")
  ;; \U+03B1\U+03BD\U+03AC\U+03BB\U+03C5\U+03C3\U+03B7 \U+03A3\U+0394
  (kal:r "<h2>\U+0391\U+03BD\U+03AC\U+03BB\U+03C5\U+03C3\U+03B7 \U+03C3\U+03C5\U+03BD\U+03C4\U+03B5\U+03BB\U+03B5\U+03C3\U+03C4\U+03AE \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 \U+03B1\U+03BD\U+03AC \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03BF (\U+03AC\U+03C1\U+03B8. 206)</h2>")
  (foreach r rl
    (kal:r (strcat "<h3>" (car r) " \U+2014 " (kal:typetxt (nth 1 r) (nth 2 r)) "</h3><table>"))
    (kal:tr (list "\U+03A7\U+03CE\U+03C1\U+03BF\U+03C2" "\U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD" "\U+0394\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03AC" "\U+039A\U+03B1\U+03BD\U+03CC\U+03BD\U+03B1\U+03C2") "th")
    (kal:tr (list "\U+039C\U+03B9\U+03BA\U+03C4\U+03CC \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1" (strcat (kal:fmt (nth 3 r) 2) " \U+03C4.\U+03BC.") "" "") "td")
    (foreach s (nth 9 r)
      (kal:tr (list (kal:codetxt (car s)) (strcat (kal:fmt (cadr s) 2) " \U+03C4.\U+03BC.")
                    (if (member (car s) (list "H" "X")) "\U+03B2\U+03BB. \U+03CC\U+03C1\U+03B9\U+03BF 40%" (strcat (kal:fmt (caddr s) 2) " \U+03C4.\U+03BC."))
                    (nth 3 s)) "td"))
    (kal:tr (list "<b>\U+039C\U+03B5\U+03C4\U+03C1\U+03AC \U+03C3\U+03C4\U+03BF\U+03BD \U+03A3\U+0394</b>" (strcat "<b>" (kal:fmt (nth 7 r) 2) " \U+03C4.\U+03BC.</b>") "" (nth 8 r)) "td")
    (kal:r "</table>"))
  (kal:r (strcat "<p>\U+0391\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03BF\U+03AF \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 + \U+03B5\U+03BE\U+03CE\U+03C3\U+03C4\U+03B5\U+03C2: <b>" (kal:fmt HX 2) " \U+03C4.\U+03BC.</b> (\U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 " (kal:fmt Hh 2) " \U+03C4.\U+03BC.)"
                 (if allow
                   (strcat " \U+2014 \U+03CC\U+03C1\U+03B9\U+03BF 40% \U+03C4\U+03B7\U+03C2 \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 = " (kal:fmt lim40 2) " \U+03C4.\U+03BC., \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 \U+03AD\U+03C9\U+03C2 20% = " (kal:fmt limH 2)
                           " \U+03C4.\U+03BC. \U+2014 \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD <b>" (kal:fmt HXc 2) " \U+03C4.\U+03BC.</b>")
                   " \U+2014 \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF 40% \U+03B4\U+03B5\U+03BD \U+03B5\U+03BB\U+03AD\U+03B3\U+03C7\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03BB\U+03B5\U+03AF\U+03C0\U+03B5\U+03B9 \U+03A3\U+0394 / \U+03BC\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7)")
                 " (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 5, 6\U+03B1)</p>"))
  ;; \U+03C0\U+03C1\U+03BF\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2
  (kal:r "<h2>\U+03A0\U+03C1\U+03BF\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B5\U+03BE\U+03BF\U+03B9\U+03BA\U+03BF\U+03BD\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2</h2><ol>")
  (foreach s *kal-sug* (kal:r (strcat "<li>" s "</li>")))
  (kal:r "</ol>")
  ;; \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 & \U+03CD\U+03C8\U+03BF\U+03C2
  (kal:r "<h2>\U+0391\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 &amp; \U+03CD\U+03C8\U+03BF\U+03C2</h2><ul>")
  (if dres
    (progn
      (setq k 1)
      (foreach x (caddr dres)
        (kal:r (strcat "<li>\U+03A0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC " (itoa k) ": " (if (< x 0.05) "\U+03C3\U+03B5 \U+03B5\U+03C0\U+03B1\U+03C6\U+03AE" (strcat (kal:fmt x 2) " \U+03BC."))
                       (if (and dreq (> x 0.05) (< x (- dreq 0.005))) (strcat " <span class=no>\U+2014 \U+03BA\U+03AC\U+03C4\U+03C9 \U+03B1\U+03C0\U+03CC " (if (= mode 2) "\U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF" "\U+03B4") "</span>") "")
                       "</li>"))
        (setq k (1+ k)))))
  (if (= mode 1)
    (progn
      (if (and dreq Dbig)
        (kal:r (strcat "<li>\U+039C\U+03B5 \U+0397 = " (kal:fz hg) " \U+03BC.: \U+03B4 = 2,50 + 0,05\U+0397 = <b>" (kal:fmt dreq 2) " \U+03BC.</b>, \U+0394 = 3 + 0,10\U+0397 = <b>" (kal:fmt Dbig 2) " \U+03BC.</b>"
                       (if (<= hg 8.5) " \U+2014 \U+03C7\U+03B1\U+03BC\U+03B7\U+03BB\U+03CC \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF: \U+0394 = 2,50 \U+03BC. \U+03C3\U+03C4\U+03B1\U+03B8\U+03B5\U+03C1\U+03CC (\U+03AC\U+03C1\U+03B8. 221)" "") " (\U+03AC\U+03C1\U+03B8. 198)</li>")))
      (kal:r "<li>\U+0397 \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2 \U+03C3\U+03C4\U+03B7\U+03BD \U+03C0\U+03BB\U+03AE\U+03C1\U+03B7 \U+03B5\U+03BE\U+03AC\U+03BD\U+03C4\U+03BB\U+03B7\U+03C3\U+03B7 \U+03C4\U+03BF\U+03C5 \U+03A3\U+0394, \U+03CC\U+03C0\U+03C9\U+03C2 \U+03C6\U+03B1\U+03AF\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C3\U+03C4\U+03BF \U+03B4\U+03B9\U+03AC\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2 \U+2014 \U+03CC\U+03C7\U+03B9 \U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2 \U+03C0\U+03BF\U+03C5 \U+03C7\U+03C4\U+03AF\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C4\U+03CE\U+03C1\U+03B1. (\U+03AC\U+03C1\U+03B8. 198)</li>")
      (kal:r "<li>\U+03A0\U+03AF\U+03C3\U+03C9 \U+03CC\U+03C1\U+03B9\U+03BF: \U+0394. \U+03A0\U+03BB\U+03AC\U+03B3\U+03B9\U+03B1: \U+03B4 \U+03AE \U+03B5\U+03C0\U+03B1\U+03C6\U+03AE, \U+03B1\U+03BD\U+03AC\U+03BB\U+03BF\U+03B3\U+03B1 \U+03BC\U+03B5 \U+03C4\U+03BF \U+03C4\U+03B9 \U+03C5\U+03C0\U+03AC\U+03C1\U+03C7\U+03B5\U+03B9 \U+03C3\U+03C4\U+03BF \U+03CC\U+03BC\U+03BF\U+03C1\U+03BF \U+2014 \U+03B7 \U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7 \U+03B1\U+03BA\U+03BF\U+03BB\U+03BF\U+03C5\U+03B8\U+03B5\U+03AF \U+03C4\U+03B7\U+03BD \U+03BF\U+03B9\U+03BA\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03AE \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE. (\U+03AC\U+03C1\U+03B8. 209)</li>")))
  (if (= mode 2)
    (kal:r "<li>\U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5: \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 \U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD 15 \U+03BC., \U+03CD\U+03C8\U+03BF\U+03C2 7,50 \U+03BC. (+1,20 \U+03BC. \U+03BC\U+03B5 \U+03BA\U+03B5\U+03BA\U+03BB\U+03B9\U+03BC\U+03AD\U+03BD\U+03B7 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7), \U+03AD\U+03C9\U+03C2 2 \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF\U+03B9, \U+03B5\U+03BD\U+03B9\U+03B1\U+03AF\U+03BF \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03BF. (\U+03AC\U+03C1\U+03B8. 251)</li>"))
  (if hmax (kal:r (strcat "<li>\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2: " (kal:fz hmax) " \U+03BC. \U+2014 \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF: \U+0397 = " (if (> hg 0.0) (kal:fz hg) "-") " \U+03BC." (if (= mode 1) " (\U+03AC\U+03C1\U+03B8. 210: \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03BD \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03A3\U+0394)" "") "</li>")))
  (kal:r "</ul>")
  ;; \U+039A\U+03C4\U+03B9\U+03C1\U+03B9\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2
  (kal:r "<h2>\U+039A\U+03C4\U+03B9\U+03C1\U+03B9\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 \U+039A\U+03B1\U+03BD\U+03BF\U+03BD\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+2014 \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03B9 \U+03C3\U+03C4\U+03B7 \U+03BC\U+03B5\U+03BB\U+03AD\U+03C4\U+03B7</h2><ul>")
  (if trees (kal:r (strcat "<li>\U+03A6\U+03CD\U+03C4\U+03B5\U+03C5\U+03C3\U+03B7: \U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD <b>" (itoa trees) " \U+03B4\U+03AD\U+03BD\U+03C4\U+03C1\U+03B1</b> (1 \U+03B1\U+03BD\U+03AC 200 \U+03C4.\U+03BC. \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5, +1 \U+03B1\U+03BD \U+03C4\U+03BF \U+03C5\U+03C0\U+03CC\U+03BB\U+03BF\U+03B9\U+03C0\U+03BF \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03B1\U+03C0\U+03CC 100 \U+03C4.\U+03BC.)\U+00B7 \U+03C3\U+03C4\U+03BF \U+03C0\U+03C1\U+03BF\U+03BA\U+03AE\U+03C0\U+03B9\U+03BF 1 \U+03B1\U+03BD\U+03AC 25 \U+03C4.\U+03BC. (\U+03AC\U+03C1\U+03B8. 19)</li>")))
  (kal:r "<li>\U+0395\U+03BB\U+03B5\U+03CD\U+03B8\U+03B5\U+03C1\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2: \U+03BA\U+03CD\U+03C1\U+03B9\U+03BF\U+03B9 \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9 &ge; 2,50 \U+03BC., \U+03B2\U+03BF\U+03B7\U+03B8\U+03B7\U+03C4\U+03B9\U+03BA\U+03BF\U+03AF &ge; 2,20 \U+03BC., \U+03BA\U+03AC\U+03C4\U+03C9 \U+03B1\U+03C0\U+03CC \U+03B4\U+03BF\U+03BA\U+03BF\U+03CD\U+03C2 / \U+0397-\U+039C &ge; 2,00 \U+03BC. (\U+03AC\U+03C1\U+03B8. 7)</li>")
  (kal:r (strcat "<li>\U+039A\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B5\U+03C2: \U+03B5\U+03BB\U+03B5\U+03CD\U+03B8\U+03B5\U+03C1\U+03BF \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 1,20 \U+03BC." (if (<= nab 3) " \U+2014 0,90 \U+03BC. \U+03C3\U+03B5 \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B5\U+03C2 \U+03AD\U+03C9\U+03C2 3 \U+03BF\U+03C1\U+03CC\U+03C6\U+03C9\U+03BD, 0,60 \U+03BC. \U+03B5\U+03C3\U+03C9\U+03C4\U+03B5\U+03C1\U+03B9\U+03BA\U+03AE \U+03C3\U+03BA\U+03AC\U+03BB\U+03B1 \U+03B5\U+03BD\U+03B9\U+03B1\U+03AF\U+03B1\U+03C2 \U+03BA\U+03B1\U+03C4\U+03BF\U+03B9\U+03BA\U+03AF\U+03B1\U+03C2" "")
                 "\U+00B7 \U+03B2\U+03B1\U+03B8\U+03BC\U+03AF\U+03B4\U+03B1 0,13-0,18 \U+03BC., \U+03C0\U+03AC\U+03C4\U+03B7\U+03BC\U+03B1 &ge; 0,28 \U+03BC., 2\U+03C5+\U+03C0 = 0,60-0,66 \U+03BC.\U+00B7 \U+03B5\U+03BB\U+03B5\U+03CD\U+03B8\U+03B5\U+03C1\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2 &ge; 2,20 \U+03BC.\U+00B7 \U+03C0\U+03CC\U+03C1\U+03C4\U+03B1 \U+03CC\U+03C7\U+03B9 \U+03BA\U+03B1\U+03C4\U+03B5\U+03C5\U+03B8\U+03B5\U+03AF\U+03B1\U+03BD \U+03C3\U+03B5 \U+03B2\U+03B1\U+03B8\U+03BC\U+03AF\U+03B4\U+03B1 (\U+03AC\U+03C1\U+03B8. 11)</li>"))
  (kal:r "<li>\U+03A3\U+03C4\U+03B7\U+03B8\U+03B1\U+03AF\U+03B1 &ge; 1,00 \U+03BC. \U+03CC\U+03C0\U+03BF\U+03C5 \U+03C4\U+03BF \U+03B4\U+03AC\U+03C0\U+03B5\U+03B4\U+03BF \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03C0\U+03AC\U+03BD\U+03C9 \U+03B1\U+03C0\U+03CC 1,00 \U+03BC. \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03BD \U+03C0\U+03B5\U+03C1\U+03B9\U+03B2\U+03AC\U+03BB\U+03BB\U+03BF\U+03BD\U+03C4\U+03B1 \U+03C7\U+03CE\U+03C1\U+03BF\U+00B7 \U+03B4\U+03B9\U+03AC\U+03BA\U+03B5\U+03BD\U+03B1 \U+03AD\U+03C9\U+03C2 0,25 \U+03BC. \U+03BA\U+03B1\U+03C4\U+03B1\U+03BA\U+03CC\U+03C1\U+03C5\U+03C6\U+03B1 / 0,15 \U+03BC. \U+03BF\U+03C1\U+03B9\U+03B6\U+03CC\U+03BD\U+03C4\U+03B9\U+03B1 (\U+03AC\U+03C1\U+03B8. 13)</li>")
  (kal:r "<li>\U+03A6\U+03C5\U+03C3\U+03B9\U+03BA\U+03CC\U+03C2 \U+03C6\U+03C9\U+03C4\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2: \U+03B1\U+03BD\U+03BF\U+03AF\U+03B3\U+03BC\U+03B1\U+03C4\U+03B1 &ge; 10% \U+03C4\U+03BF\U+03C5 \U+03BA\U+03B1\U+03B8\U+03B1\U+03C1\U+03BF\U+03CD \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03BF\U+03CD \U+03BA\U+03AC\U+03B8\U+03B5 \U+03BA\U+03CD\U+03C1\U+03B9\U+03BF\U+03C5 \U+03C7\U+03CE\U+03C1\U+03BF\U+03C5 (\U+03AD\U+03BC\U+03BC\U+03B5\U+03C3\U+03BF\U+03C2 15%)\U+00B7 \U+03B1\U+03B5\U+03C1\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2: \U+03B1\U+03BD\U+03BF\U+03B9\U+03B3\U+03CC\U+03BC\U+03B5\U+03BD\U+03B1 &ge; 5% (\U+03AD\U+03BC\U+03BC\U+03B5\U+03C3\U+03BF\U+03C2 7%)\U+00B7 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF: \U+03AC\U+03BD\U+03BF\U+03B9\U+03B3\U+03BC\U+03B1 &ge; 0,50 \U+03C4.\U+03BC. \U+03B1\U+03BD\U+03AC \U+03CC\U+03C1\U+03BF\U+03C6\U+03BF (\U+03AC\U+03C1\U+03B8. 20-21)</li>")
  (kal:r "<li>\U+03A0\U+03C1\U+03BF\U+03C3\U+03C0\U+03AD\U+03BB\U+03B1\U+03C3\U+03B7: \U+03B1\U+03BD \U+03B7 \U+03B5\U+03AF\U+03C3\U+03BF\U+03B4\U+03BF\U+03C2 \U+03C4\U+03BF\U+03C5 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 \U+03B1\U+03C0\U+03AD\U+03C7\U+03B5\U+03B9 \U+03C0\U+03AC\U+03BD\U+03C9 \U+03B1\U+03C0\U+03CC 30 \U+03BC. \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03B5\U+03AF\U+03C3\U+03BF\U+03B4\U+03BF \U+03C4\U+03BF\U+03C5 \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5 \U+2014 \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 &ge; 3,50 \U+03BC., \U+03CD\U+03C8\U+03BF\U+03C2 &ge; 3,00 \U+03BC., \U+03BA\U+03BB\U+03AF\U+03C3\U+03B7 &le; 7% \U+03C3\U+03C4\U+03B1 \U+03C0\U+03C1\U+03CE\U+03C4\U+03B1 5 \U+03BC. (\U+03AC\U+03C1\U+03B8. 18)</li>")
  (kal:r "</ul>")
  ;; \U+0391\U+03BC\U+03B5\U+0391
  (kal:r "<h2>\U+03A0\U+03C1\U+03BF\U+03C3\U+03B2\U+03B1\U+03C3\U+03B9\U+03BC\U+03CC\U+03C4\U+03B7\U+03C4\U+03B1 \U+0391\U+03BC\U+03B5\U+0391</h2><ul>")
  (kal:r "<li>\U+039D\U+03AD\U+03B1 \U+03BA\U+03C4\U+03AF\U+03C1\U+03B9\U+03B1: \U+03C0\U+03C1\U+03BF\U+03C3\U+03B2\U+03AC\U+03C3\U+03B9\U+03BC\U+03B5\U+03C2 \U+03B5\U+03AF\U+03C3\U+03BF\U+03B4\U+03BF\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF\U+03B9 \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9, \U+03BF\U+03C1\U+03B9\U+03B6\U+03CC\U+03BD\U+03C4\U+03B9\U+03B1 \U+03BA\U+03B1\U+03B9 \U+03BA\U+03B1\U+03C4\U+03B1\U+03BA\U+03CC\U+03C1\U+03C5\U+03C6\U+03B7 \U+03C0\U+03C1\U+03BF\U+03C3\U+03B2\U+03B1\U+03C3\U+03B9\U+03BC\U+03CC\U+03C4\U+03B7\U+03C4\U+03B1 (\U+03B1\U+03BD\U+03B5\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03AE\U+03C1\U+03B1\U+03C2 / \U+03C1\U+03AC\U+03BC\U+03C0\U+03B5\U+03C2) \U+2014 \U+03AC\U+03C1\U+03B8. 223 \U+03BD.5306/2026 (\U+039D\U+039F\U+039A 26), \U+039A\U+03C4\U+03B9\U+03C1\U+03B9\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 \U+03AC\U+03C1\U+03B8. 25, \U+00AB\U+03A3\U+03C7\U+03B5\U+03B4\U+03B9\U+03AC\U+03B6\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2 \U+03B3\U+03B9\U+03B1 \U+038C\U+03BB\U+03BF\U+03C5\U+03C2\U+00BB</li>")
  (kal:r "<li>\U+03A1\U+03AC\U+03BC\U+03C0\U+03B5\U+03C2 &le; 5% (\U+03AD\U+03C9\U+03C2 8% \U+03C3\U+03B5 \U+03BC\U+03B9\U+03BA\U+03C1\U+03AC \U+03BC\U+03AE\U+03BA\U+03B7) \U+03BC\U+03B5 \U+03C0\U+03BB\U+03B1\U+03C4\U+03CD\U+03C3\U+03BA\U+03B1\U+03BB\U+03B1 \U+03BA\U+03B1\U+03B9 \U+03C7\U+03B5\U+03B9\U+03C1\U+03BF\U+03BB\U+03B9\U+03C3\U+03B8\U+03AE\U+03C1\U+03B5\U+03C2 (\U+03A5\U+0391 \U+03A5\U+03A0\U+0395\U+039D/\U+0394\U+039C\U+0395\U+0391\U+0391\U+03A0/124964/1561/2022)</li>")
  (kal:r "<li>\U+0391\U+03BD\U+03B5\U+03BB\U+03BA\U+03C5\U+03C3\U+03C4\U+03AE\U+03C1\U+03B1\U+03C2: \U+03C0\U+03CC\U+03C4\U+03B5 \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03C5\U+03C0\U+03BF\U+03C7\U+03C1\U+03B5\U+03C9\U+03C4\U+03B9\U+03BA\U+03CC\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03C0\U+03CC\U+03C4\U+03B5 \U+03C0\U+03C1\U+03BF\U+03C3\U+03B2\U+03AC\U+03C3\U+03B9\U+03BC\U+03BF\U+03C2 \U+0391\U+03BC\U+03B5\U+0391 \U+2014 \U+039A\U+03C4\U+03B9\U+03C1\U+03B9\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 \U+03AC\U+03C1\U+03B8. 30</li>")
  (kal:r "<li>\U+0391\U+03BE\U+03B9\U+03BF\U+03C0\U+03BF\U+03AF\U+03B7\U+03C3\U+03B7: \U+03BF \U+03C7\U+03CE\U+03C1\U+03BF\U+03C2 \U+03B1\U+03BD\U+03B1\U+03BC\U+03BF\U+03BD\U+03AE\U+03C2 \U+0391\U+03BC\U+03B5\U+0391 \U+03C3\U+03C4\U+03BF \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B9\U+03BF \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03B1 30 / 40 \U+03C4.\U+03BC. \U+03C0\U+03BF\U+03C5 \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD\U+00B7 \U+03BA\U+03B1\U+03C4\U+03B1\U+03C3\U+03BA\U+03B5\U+03C5\U+03AD\U+03C2 \U+03B3\U+03B9\U+03B1 \U+0391\U+03BC\U+03B5\U+0391 \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03AD\U+03C0\U+03BF\U+03BD\U+03C4\U+03B1\U+03B9 \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03B9\U+03C2 \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 \U+0394 / \U+03B4 (\U+03AC\U+03C1\U+03B8. 206 \U+03C0\U+03B1\U+03C1. 6\U+03B4, 211 \U+03C0\U+03B1\U+03C1. 8)</li>")
  (kal:r "</ul>")
  ;; \U+03C0\U+03B7\U+03B3\U+03AD\U+03C2
  (kal:r "<h2>\U+03A0\U+03B7\U+03B3\U+03AD\U+03C2</h2><ul class=sub>")
  (kal:r "<li>\U+03BD. 5306/2026 \U+00AB\U+039A\U+03CE\U+03B4\U+03B9\U+03BA\U+03B1\U+03C2 \U+03A7\U+03C9\U+03C1\U+03BF\U+03C4\U+03B1\U+03BE\U+03AF\U+03B1\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03A0\U+03BF\U+03BB\U+03B5\U+03BF\U+03B4\U+03BF\U+03BC\U+03AF\U+03B1\U+03C2\U+00BB (\U+03A6\U+0395\U+039A \U+0391' 88/08.06.2026) \U+2014 \U+03AC\U+03C1\U+03B8. 197, 198, 204, 206, 207, 209, 210, 211, 221, 222, 223, 251 (\U+039D\U+039F\U+039A \U+03BD. 4067/2012 \U+03BA\U+03C9\U+03B4\U+03B9\U+03BA\U+03BF\U+03C0\U+03BF\U+03B9\U+03B7\U+03BC\U+03AD\U+03BD\U+03BF\U+03C2 \U+03C3\U+03C4\U+03B1 \U+03AC\U+03C1\U+03B8. 195-225)</li>")
  (kal:r "<li>\U+039A\U+03C4\U+03B9\U+03C1\U+03B9\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 \U+039A\U+03B1\U+03BD\U+03BF\U+03BD\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+2014 \U+03A5\U+0391 \U+03A5\U+03A0\U+0395\U+039D/\U+0394\U+0391\U+039F\U+039A\U+0391/66006/2360 (\U+03A6\U+0395\U+039A \U+0392' 3985/2023), \U+03CC\U+03C0\U+03C9\U+03C2 \U+03C4\U+03C1\U+03BF\U+03C0\U+03BF\U+03C0\U+03BF\U+03B9\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03A6\U+0395\U+039A \U+0392' 6995/2025) \U+2014 \U+03AC\U+03C1\U+03B8. 7, 11, 13, 18, 19, 20, 21, 25, 30</li>")
  (kal:r "<li>\U+03A0\U+03C1\U+03BF\U+03B4\U+03B9\U+03B1\U+03B3\U+03C1\U+03B1\U+03C6\U+03AD\U+03C2 \U+03C0\U+03C1\U+03BF\U+03C3\U+03B2\U+03B1\U+03C3\U+03B9\U+03BC\U+03CC\U+03C4\U+03B7\U+03C4\U+03B1\U+03C2 \U+2014 \U+03A5\U+0391 \U+03A5\U+03A0\U+0395\U+039D/\U+0394\U+039C\U+0395\U+0391\U+0391\U+03A0/124964/1561/2022 \U+00B7 \U+039F\U+03B4\U+03B7\U+03B3\U+03AF\U+03B5\U+03C2 \U+00AB\U+03A3\U+03C7\U+03B5\U+03B4\U+03B9\U+03AC\U+03B6\U+03BF\U+03BD\U+03C4\U+03B1\U+03C2 \U+03B3\U+03B9\U+03B1 \U+038C\U+03BB\U+03BF\U+03C5\U+03C2\U+00BB</li>")
  (kal:r (strcat "<li>" (if d "\U+0395\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF\U+03B9 \U+03CC\U+03C1\U+03BF\U+03B9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF HEXIS-APP: \U+0395\U+03BD\U+03B9\U+03B1\U+03AF\U+03BF\U+03C2 \U+03A8\U+03B7\U+03C6\U+03B9\U+03B1\U+03BA\U+03CC\U+03C2 \U+03A7\U+03AC\U+03C1\U+03C4\U+03B7\U+03C2 (\U+03A4\U+0395\U+0395/\U+03A5\U+03A0\U+0395\U+039D), \U+0395\U+03BB\U+03BB\U+03B7\U+03BD\U+03B9\U+03BA\U+03CC \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03CC\U+03B3\U+03B9\U+03BF" "\U+0395\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF\U+03B9 \U+03CC\U+03C1\U+03BF\U+03B9: \U+03C7\U+03B5\U+03B9\U+03C1\U+03BF\U+03BA\U+03AF\U+03BD\U+03B7\U+03C4\U+03B7 \U+03BA\U+03B1\U+03C4\U+03B1\U+03C7\U+03CE\U+03C1\U+03B9\U+03C3\U+03B7") "</li>"))
  (kal:r "<li>\U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03AC \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5, \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03B5\U+03C0\U+03B9\U+03C0\U+03AD\U+03B4\U+03C9\U+03BD: \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03CC \U+03BA\U+03B1\U+03B9 \U+03C4\U+03B9\U+03C2 \U+03BA\U+03B1\U+03C4\U+03CC\U+03C8\U+03B5\U+03B9\U+03C2 \U+03C4\U+03BF\U+03C5 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5\U+00B7 \U+03B7 \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03C4\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03BF\U+03CD</li>")
  (kal:r "<li>\U+039F\U+03B9 \U+03AF\U+03B4\U+03B9\U+03BF\U+03B9 \U+03BA\U+03B1\U+03BD\U+03CC\U+03BD\U+03B5\U+03C2 \U+03BC\U+03B5 \U+03C4\U+03B7\U+03BD \U+03B5\U+03C6\U+03B1\U+03C1\U+03BC\U+03BF\U+03B3\U+03AE \U+039D\U+03BF\U+03BC\U+03BF\U+03B8\U+03B5\U+03C3\U+03AF\U+03B1 \U+03C4\U+03BF\U+03C5 HEXIS-APP (hexis-app.gr/nomothesia.html)</li></ul>")
  (kal:r "<p class=sub>HEXIS-APP \U+00B7 hexis-app.gr \U+00B7 powered by BRB Development \U+039A\U+0391\U+03A4\U+0391\U+03A3\U+039A\U+0395\U+03A5\U+0391\U+03A3\U+03A4\U+0399\U+039A\U+0397 \U+039C\U+039F\U+039D. \U+0399.\U+039A.\U+0395. \U+2014 \U+0395\U+03BD\U+03B7\U+03BC\U+03B5\U+03C1\U+03C9\U+03C4\U+03B9\U+03BA\U+03CC \U+03B5\U+03C1\U+03B3\U+03B1\U+03BB\U+03B5\U+03AF\U+03BF \U+03BC\U+03B5\U+03BB\U+03AD\U+03C4\U+03B7\U+03C2\U+00B7 \U+03B4\U+03B5\U+03BD \U+03C5\U+03C0\U+03BF\U+03BA\U+03B1\U+03B8\U+03B9\U+03C3\U+03C4\U+03AC \U+03C4\U+03BF\U+03BD \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF \U+03C4\U+03B7\U+03C2 \U+03A5\U+0394\U+039F\U+039C.</p></body></html>"))

;; ===================================================================
(defun c:KALYPSI (/ *error* cfg sc mode kp sd maxd dmin v th st kaek d ring Ekt sa plot pv E
                    cov covv covin Sk pk levels cr Dom rl HX Hh allow lim40 limH HXc kpe hmax hg nab
                    low dreq Dbig dres dmn dnw trees okK okD okKD okA okHt okY okHH fails res rows p0 y
                    rp path k tt cap man)
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
      (setq kp (atof (hx:v d "KALYPSI")) sd (atof (hx:v d "SD")) maxd 0.0
            Ekt (atof (hx:v d "EMBADON")) dmin (if (= mode 2) 15.0 0.0)
            ring (kal:ring (hx:v d "RING")))
      ;; \U+03CC\U+03C1\U+03B9\U+03BF \U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03BF\U+03CD <2.000 \U+03BA\U+03B1\U+03C4. \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03B5 \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF (\U+03C4\U+03BF HEXIS-APP \U+03AD\U+03BA\U+03BF\U+03C8\U+03B5 \U+03C4\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7)
      (setq cap (and (= mode 1) (> sd 0.0) (> (atof (hx:v d "MAX_DOMISI")) 0.0)
                     (< (atof (hx:v d "MAX_DOMISI")) (- (* sd Ekt) 0.5))))
      (if (and (= mode 3) (< Ekt 200.0) (= kp 70.0)) (setq kp 60.0)))
    (if (/= kaek "") (progn (princ "\n\U+039F\U+03B9 \U+03CC\U+03C1\U+03BF\U+03B9 \U+03B4\U+03B5\U+03BD \U+03AE\U+03C1\U+03B8\U+03B1\U+03BD - \U+03C3\U+03C5\U+03BD\U+03B5\U+03C7\U+03AF\U+03B6\U+03B5\U+03B9\U+03C2 \U+03BC\U+03B5 \U+03C7\U+03B5\U+03B9\U+03C1\U+03BF\U+03BA\U+03AF\U+03BD\U+03B7\U+03C4\U+03BF\U+03C5\U+03C2 \U+03CC\U+03C1\U+03BF\U+03C5\U+03C2.") (setq kaek ""))))
  (princ (strcat "\n" (if d "\U+038C\U+03C1\U+03BF\U+03B9 HEXIS-APP" "\U+038C\U+03C1\U+03BF\U+03B9") ":  " (kal:modetxt mode)
                 "  |  \U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 " (if (> kp 0.0) (strcat (kal:fz kp) " %") "-")
                 "  |  \U+03A3.\U+0394. " (if (> sd 0.0) (kal:fz sd) "-")
                 "  |  \U+039C\U+03AD\U+03B3. \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 " (cond ((> maxd 0.0) (strcat (kal:fmt maxd 2) " \U+03C4.\U+03BC.")) (d "\U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03C4\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03BF\U+03CD") (T "-"))
                 "  |  \U+0391\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03CC\U+03C1\U+03B9\U+03B1 " (if (> dmin 0.0) (strcat (kal:fz dmin) " \U+03BC.") "-")
                 "  |  \U+039A\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 1:100"))
  (initget 6)
  (if (= (getint "\n\U+0391\U+03BB\U+03BB\U+03B1\U+03B3\U+03AE;  1 = \U+039D\U+03B1\U+03B9,  Enter = \U+038C\U+03C7\U+03B9: ") 1)
    (progn
      (setq man T)
      (initget 6)
      (setq v (getint (strcat "\n\U+03A0\U+03B5\U+03C1\U+03B9\U+03BF\U+03C7\U+03AE:  1 = \U+0395\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5,  2 = \U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5,  3 = \U+039F\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 <" (itoa mode) ">: ")))
      (if (member v (list 1 2 3)) (setq mode v))
      (setq kp (kal:askr "\U+0395\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 %" kp)
            sd (kal:askr "\U+03A3\U+03C5\U+03BD\U+03C4\U+03B5\U+03BB\U+03B5\U+03C3\U+03C4\U+03AE\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2)" sd)
            maxd (kal:askr "\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 \U+03C4.\U+03BC. (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03CC\U+03C1\U+03B9\U+03BF)" maxd)
            dmin (kal:askr "\U+0395\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B7 \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 \U+03BC. (0 = \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF)" dmin))))
  (setq sc 100.0)
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

  ;; ---- 4. \U+03B5\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1 \U+03BA\U+03B1\U+03B9 \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9 ----
  (setq levels (if st (kal:lvalid (nth 4 st))))
  (if levels
    (progn
      (foreach lv levels
        (princ (strcat "\n   " (car lv) " (" (kal:typetxt (nth 1 lv) (nth 2 lv)) "): \U+03BC\U+03B9\U+03BA\U+03C4\U+03CC "
                       (kal:fmt (kal:sumarea (nth 3 lv)) 2) " \U+03C4.\U+03BC., " (itoa (length (nth 4 lv))) " \U+03C7\U+03CE\U+03C1\U+03BF\U+03B9")))
      (initget 6)
      (setq v (getint "\n\U+0395\U+03C0\U+03AF\U+03C0\U+03B5\U+03B4\U+03B1 \U+03CC\U+03C0\U+03C9\U+03C2 \U+03C0\U+03C1\U+03B9\U+03BD.  Enter = \U+03C3\U+03C9\U+03C3\U+03C4\U+03AC,  1 = \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7\U+03BD \U+03B1\U+03C1\U+03C7\U+03AE,  2 = \U+03C0\U+03C1\U+03BF\U+03C3\U+03B8\U+03AE\U+03BA\U+03B7 \U+03B5\U+03C0\U+03B9\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5: "))
      (cond ((= v 1) (setq levels (kal:asklevels nil)))
            ((= v 2) (setq levels (kal:asklevels levels)))))
    (setq levels (kal:asklevels nil)))

  ;; ---- 5. \U+03CD\U+03C8\U+03BF\U+03C2 \U+0397 (\U+03AC\U+03C1\U+03B8. 198: \U+03CD\U+03C8\U+03BF\U+03C2 \U+03B5\U+03BE\U+03AC\U+03BD\U+03C4\U+03BB\U+03B7\U+03C3\U+03B7\U+03C2 \U+03C4\U+03BF\U+03C5 \U+03A3\U+0394) ----
  (setq hmax (cond ((and d (> (atof (hx:v d "YPSOS")) 0.0)) (atof (hx:v d "YPSOS")))
                   ((= mode 1) (kal:hmax210 sd))
                   (T 7.5)))
  (setq hg (if (and st (> (nth 5 st) 0.0)) (nth 5 st) hmax))
  (initget 6)
  (setq v (getreal (strcat "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+0397 \U+03C4\U+03BF\U+03C5 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 \U+03C3\U+03B5 \U+03BC. (\U+03BC\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03BF, \U+03BC\U+03B5 \U+03B5\U+03BE\U+03B1\U+03BD\U+03C4\U+03BB\U+03B7\U+03BC\U+03AD\U+03BD\U+03BF \U+03A3\U+0394 - \U+03AC\U+03C1\U+03B8. 198)"
                           (if hg (strcat " <" (kal:fz hg) ">") "") ": ")))
  (if v (setq hg v))
  (if (null hg) (setq hg 0.0))
  (kal:state kaek plot cov (if st (nth 3 st)) levels hg)

  ;; ---- 6. \U+03BA\U+03B1\U+03BD\U+03CC\U+03BD\U+03B5\U+03C2 ----
  (setq cr (kal:calc levels Sk) Dom (nth 0 cr) rl (nth 1 cr) HX (nth 2 cr) Hh (nth 3 cr))
  ;; \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7: \U+03A0\U+0391\U+039D\U+03A4\U+0391 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+0395 \U+03C4\U+03BF\U+03C5 \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03BF\U+03CD
  (cond
    ((and d (not man))
      (cond
        ((= mode 1) (if (> sd 0.0) (setq allow (* E sd))) (if (and allow cap) (setq allow (min allow (kal:oikmax E)))))
        ((= mode 3) (setq allow (kal:oikmax E)) (if (< E 200.0) (setq kp (max kp 70.0))))
        (T (setq allow (kal:ektmax E))
           (if (null allow) (princ "\n\U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5: \U+03B3\U+03AE\U+03C0\U+03B5\U+03B4\U+03BF \U+03BA\U+03AC\U+03C4\U+03C9 \U+03B1\U+03C0\U+03CC 4.000 \U+03C4.\U+03BC. - \U+03BC\U+03B7 \U+03AC\U+03C1\U+03C4\U+03B9\U+03BF \U+03BA\U+03B1\U+03C4\U+03AC \U+03BA\U+03B1\U+03BD\U+03CC\U+03BD\U+03B1 (\U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 \U+03C0\U+03B1\U+03C1\U+03B5\U+03BA\U+03BA\U+03BB\U+03AF\U+03C3\U+03B5\U+03C9\U+03BD \U+03AC\U+03C1\U+03B8. 273).")))))
    (T
      (if (> sd 0.0) (setq allow (* E sd)))
      (if (> maxd 0.0) (setq allow (if allow (min allow maxd) maxd)))))
  (setq HXc 0.0)
  (if allow (setq lim40 (* 0.4 allow) limH (* 0.2 allow) HXc (max 0.0 (- HX lim40) (- Hh limH))))
  (setq Dom (+ Dom HXc))
  (setq kpe kp)
  (if (and (= mode 1) (> kp 0.0) (< (* kp E 0.01) 120.0))
    (setq kpe (max kp (* 100.0 (/ (min 120.0 (* 0.7 E)) E)))))
  (setq nab 0)
  (foreach r rl (if (= (nth 1 r) 1) (setq nab (1+ nab))))
  (setq low (and (= mode 1) (> hg 0.0) (<= hg 8.5)))
  (setq dreq (cond ((= mode 2) (if (> dmin 0.0) dmin))
                   ((and (= mode 1) (> hg 0.0)) (if low 2.5 (+ 2.5 (* 0.05 hg))))))
  (setq Dbig (if (and (= mode 1) (> hg 0.0)) (if low 2.5 (+ 3.0 (* 0.1 hg)))))
  (if (and (/= mode 2) (>= E 200.0))
    (setq trees (+ (fix (/ E 200.0)) (if (>= (rem E 200.0) 100.0) 1 0))))

  ;; ---- 7. \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03B1\U+03C3\U+03B7 ----
  (kal:clearout)
  ;; \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03AE\U+03C3\U+03B5\U+03B9\U+03C2 \U+03C3\U+03C4\U+03B9\U+03C2 \U+03BA\U+03B1\U+03C4\U+03CC\U+03C8\U+03B5\U+03B9\U+03C2
  (foreach lv levels
    (foreach ee (nth 3 lv)
      (setq v (kal:cent (kal:verts ee)))
      (kal:txt (list (car v) (+ (cadr v) (* th 0.8))) th (strcat (car lv) " - " (kal:typetxt (nth 1 lv) (nth 2 lv))) 0.0 T "KAL_KEIMENA")
      (kal:txt (list (car v) (- (cadr v) (* th 0.8))) th (strcat "\U+03BC\U+03B9\U+03BA\U+03C4\U+03CC \U+0395=" (kal:fmt (kal:area (kal:verts ee)) 2) " \U+03C4.\U+03BC.") 0.0 T "KAL_KEIMENA"))
    (foreach sp (nth 4 lv)
      (setq v (kal:cent (kal:verts (cdr sp))))
      (kal:txt (list (car v) (+ (cadr v) (* th 0.5))) (* th 0.8) (kal:codetxt (car sp)) 0.0 T "KAL_KEIMENA")
      (kal:txt (list (car v) (- (cadr v) (* th 0.5))) (* th 0.8) (strcat "\U+0395=" (kal:fmt (kal:area (kal:verts (cdr sp))) 2) " \U+03C4.\U+03BC.") 0.0 T "KAL_KEIMENA")))
  (foreach x covv
    (kal:hatch x (/ (* 2.0 sc) 1000.0))
    (setq v (kal:cent x))
    (kal:txt (list (car v) (+ (cadr v) (* th 0.8))) th "\U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397" 0.0 T "KAL_KEIMENA")
    (kal:txt (list (car v) (- (cadr v) (* th 0.8))) th (strcat "\U+0395=" (kal:fmt (kal:area x) 2) " \U+03C4.\U+03BC.") 0.0 T "KAL_KEIMENA")
    (if (kal:inside x pv) (setq covin (cons x covin))))
  (if covin (setq dres (kal:dists pv covin th dreq) dmn (car dres) dnw (cadr dres)))

  ;; ---- 8. \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF\U+03C2 ----
  (setq okK  (or (<= kpe 0.0) (<= pk (+ kpe 1e-6)))
        okD  (or (null allow) (<= Dom (+ allow 0.005)))
        okKD (or (/= mode 2) (null allow) (<= Sk (+ allow 0.005)))
        okA  (or (/= mode 2) (<= dmin 0.0) (null dmn) (>= dmn (- dmin 0.005)))
        okHt (or (null hmax) (<= hg 0.0) (<= hg (+ hmax 0.005)))
        okY  (or (= mode 1) (<= nab 2))
        okHH (or (null allow) (<= Hh (+ limH 0.005))))
  (setq fails nil)
  (if (not okK)  (setq fails (cons "\U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397" fails)))
  (if (not okKD) (setq fails (cons "\U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397 > \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397" fails)))
  (if (not okD)  (setq fails (cons "\U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397" fails)))
  (if (not okHH) (setq fails (cons "\U+0397\U+039C\U+0399\U+03A5\U+03A0\U+0391\U+0399\U+0398\U+03A1\U+0399\U+039F\U+0399 20%" fails)))
  (if (not okA)  (setq fails (cons "\U+0391\U+03A0\U+039F\U+03A3\U+03A4\U+0391\U+03A3\U+0395\U+0399\U+03A3" fails)))
  (if (not okHt) (setq fails (cons "\U+03A5\U+03A8\U+039F\U+03A3" fails)))
  (if (not okY)  (setq fails (cons "\U+039F\U+03A1\U+039F\U+03A6\U+039F\U+0399" fails)))
  (setq res (if fails
              (strcat "\U+03A5\U+03A0\U+0395\U+03A1\U+0392\U+0391\U+03A3\U+0397: " (kal:join (reverse fails) ", "))
              (if (and dnw (> dnw 0) (= mode 1)) "\U+0395\U+039D\U+03A4\U+0391\U+039E\U+0395\U+0399 - \U+03AD\U+03BB\U+03B5\U+03B3\U+03BE\U+03B5 \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2" "\U+0395\U+039D\U+03A4\U+0391\U+039E\U+0395\U+0399")))

  ;; ---- 9. \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF ----
  (setq rows
    (list
      (list "\U+03A0\U+0399\U+039D\U+0391\U+039A\U+0391\U+03A3 \U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397\U+03A3 - \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3" nil nil 1.3)
      (list (strcat (kal:modetxt mode)
                    (if (/= kaek "") (strcat "  -  \U+039A\U+0391\U+0395\U+039A " kaek) "")
                    (if (and d (/= (hx:v d "OT") "")) (strcat "  -  \U+039F.\U+03A4. " (hx:v d "OT")) ""))
            nil nil 0.9)
      (list "" "\U+0395\U+03A0\U+0399\U+03A4\U+03A1\U+0395\U+03A0\U+039F\U+039C\U+0395\U+039D\U+0391" "\U+03A0\U+03A1\U+0391\U+0393\U+039C\U+0391\U+03A4\U+039F\U+03A0\U+039F\U+0399\U+039F\U+03A5\U+039C\U+0395\U+039D\U+0391" 1.0)
      (list "\U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5 (\U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03CC)" "-" (strcat (kal:fmt E 2) " \U+03C4.\U+03BC.") 1.0)
      (list "\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7" (if (> kpe 0.0) (strcat (kal:fz kpe) " %" (if (> kpe (+ kp 0.001)) " (\U+03AC\U+03C1\U+03B8. 207)" "")) "-")
            (strcat (kal:fmt Sk 2) " \U+03C4.\U+03BC.  (" (kal:fmt pk 2) " %)") 1.0)
      (list "\U+03A3\U+03C5\U+03BD\U+03C4\U+03B5\U+03BB\U+03B5\U+03C3\U+03C4\U+03AE\U+03C2 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2" (if (> sd 0.0) (kal:fz sd) "-") (kal:fmt (/ Dom E) 3) 1.0)
      (list "\U+0394\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 (\U+03C3\U+03CD\U+03BD\U+03BF\U+03BB\U+03BF)" (if allow (strcat (kal:fmt allow 2) " \U+03C4.\U+03BC.") "-") (strcat (kal:fmt Dom 2) " \U+03C4.\U+03BC.") 1.0)))
  (foreach r rl
    (setq rows (append rows (list (list (strcat "   " (car r) (if (/= (nth 1 r) 1) (strcat " (" (kal:typetxt (nth 1 r) (nth 2 r)) ")") ""))
                                        "" (strcat (kal:fmt (nth 7 r) 2) " \U+03C4.\U+03BC.") 0.9))))
    (setq tt (+ (nth 6 r) (nth 4 r) (nth 5 r)))
    (if (> (abs (- tt (nth 7 r))) 0.005)
      (setq rows (append rows (list (list (strcat "      \U+03C3\U+03CD\U+03BD\U+03BF\U+03BB\U+03BF " (kal:fmt tt 2) " - \U+03B4\U+03B5\U+03BD \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD " (kal:fmt (- tt (nth 7 r)) 2) " \U+03C4.\U+03BC.")
                                          "" "" 0.8))))))
  (if (or (> HX 0.0) allow)
    (setq rows (append rows (list (list "\U+0391\U+03BD\U+03BF\U+03B9\U+03BA\U+03C4\U+03BF\U+03AF \U+03B7\U+03BC\U+03B9\U+03C5\U+03C0\U+03B1\U+03AF\U+03B8\U+03C1\U+03B9\U+03BF\U+03B9 + \U+03B5\U+03BE\U+03CE\U+03C3\U+03C4\U+03B5\U+03C2"
                                        (if allow (strcat "\U+03AD\U+03C9\U+03C2 " (kal:fmt lim40 2) " \U+03C4.\U+03BC. (40%)") "-")
                                        (strcat (kal:fmt HX 2) " \U+03C4.\U+03BC." (if (> HXc 0.005) (strcat " - \U+03BC\U+03B5\U+03C4\U+03C1\U+03BF\U+03CD\U+03BD " (kal:fmt HXc 2)) ""))
                                        1.0)))))
  (if (or hmax (> hg 0.0))
    (setq rows (append rows (list (list "\U+039C\U+03AD\U+03B3\U+03B9\U+03C3\U+03C4\U+03BF \U+03CD\U+03C8\U+03BF\U+03C2"
                                        (if hmax (strcat (kal:fz hmax) " \U+03BC." (if (/= mode 1) " (+1,20 \U+03BC\U+03B5 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7)" "")) "-")
                                        (if (> hg 0.0) (strcat (kal:fz hg) " \U+03BC.") "-") 1.0)))))
  (if (/= mode 1)
    (setq rows (append rows (list (list "\U+038C\U+03C1\U+03BF\U+03C6\U+03BF\U+03B9" "2" (itoa nab) 1.0)))))
  (if (or dreq dmn)
    (setq rows (append rows (list (list "\U+0395\U+03BB\U+03AC\U+03C7. \U+03B1\U+03C0\U+03CC\U+03C3\U+03C4\U+03B1\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03CC\U+03C1\U+03B9\U+03B1"
                                        (cond ((= mode 2) (if dreq (strcat (kal:fmt dreq 2) " \U+03BC.") "-"))
                                              ((and dreq Dbig) (strcat "\U+03B4=" (kal:fmt dreq 2) " / \U+0394=" (kal:fmt Dbig 2) " \U+03BC."))
                                              (T "-"))
                                        (if dmn (strcat (kal:fmt dmn 2) " \U+03BC.") "-") 1.0)))))
  (if trees
    (setq rows (append rows (list (list "\U+0394\U+03AD\U+03BD\U+03C4\U+03C1\U+03B1 (\U+039A\U+03C4\U+03B9\U+03C1\U+03B9\U+03BF\U+03B4\U+03BF\U+03BC\U+03B9\U+03BA\U+03CC\U+03C2 \U+03AC\U+03C1\U+03B8. 19)" (strcat "\U+03C4\U+03BF\U+03C5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF\U+03BD " (itoa trees)) "-" 1.0)))))
  (setq rows (append rows (list (list "\U+0395\U+039B\U+0395\U+0393\U+03A7\U+039F\U+03A3" "" res 1.3))))

  (setq p0 (getpoint (strcat "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1 (\U+03C0\U+03AC\U+03BD\U+03C9 \U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AE \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1)" (if (and st (nth 3 st)) " <\U+03AF\U+03B4\U+03B9\U+03BF \U+03BC\U+03B5 \U+03C0\U+03C1\U+03B9\U+03BD>" "") ": ")))
  (if (and (null p0) st) (setq p0 (nth 3 st)))
  (if p0
    (progn
      (setq y (kal:table p0 rows th))
      (kal:txt (list (car p0) (- y (* th 1.2))) (* th 0.7)
               (strcat "\U+039A\U+03B1\U+03BD\U+03CC\U+03BD\U+03B5\U+03C2: \U+03BD.5306/2026 (\U+03AC\U+03C1\U+03B8. 198, 206, 207, 210, 221, 251)"
                       (if d " - \U+0395\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B1: HEXIS-APP (\U+0395\U+03BD\U+03B9\U+03B1\U+03AF\U+03BF\U+03C2 \U+03A8\U+03B7\U+03C6\U+03B9\U+03B1\U+03BA\U+03CC\U+03C2 \U+03A7\U+03AC\U+03C1\U+03C4\U+03B7\U+03C2, \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03CC\U+03B3\U+03B9\U+03BF) - \U+03B5\U+03BD\U+03B7\U+03BC\U+03B5\U+03C1\U+03C9\U+03C4\U+03B9\U+03BA\U+03CC" ""))
               0.0 nil "KAL_PINAKAS")
      (kal:state kaek plot cov p0 levels hg)))

  ;; ---- 10. \U+03C0\U+03C1\U+03BF\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 & \U+03B1\U+03BD\U+03B1\U+03C6\U+03BF\U+03C1\U+03AC ----
  (kal:suggest mode kp kpe pk E Sk Dom allow lim40 limH HX Hh HXc rl hg dmn nab)
  (kal:report rows rl kaek mode E Sk pk allow lim40 limH HX Hh HXc hg hmax dreq Dbig dres trees nab res d)
  (setq rp (strcat (getvar "DWGPREFIX") "KALYPSI_" (vl-filename-base (getvar "DWGNAME")) ".html"))
  (setq path (kal:writerep rp))
  (if (null path) (setq path (kal:writerep (strcat (getvar "TEMPPREFIX") "KALYPSI_anafora.html"))))

  (princ (strcat "\n\n\U+039A\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7 " (kal:fmt pk 2) " %  |  \U+0394\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 " (kal:fmt Dom 2) " \U+03C4.\U+03BC."
                 (if allow (strcat " \U+03B1\U+03C0\U+03CC " (kal:fmt allow 2)) "") "  |  \U+0395\U+039B\U+0395\U+0393\U+03A7\U+039F\U+03A3: " res))
  (setq k 0)
  (foreach s *kal-sug*
    (if (< k 3) (princ (strcat "\n  \U+2022 " (kal:strip s))))
    (setq k (1+ k)))
  (if path
    (progn
      (princ (strcat "\n\U+0391\U+03BD\U+03B1\U+03C6\U+03BF\U+03C1\U+03AC \U+03BC\U+03B5 \U+03CC\U+03BB\U+03B5\U+03C2 \U+03C4\U+03B9\U+03C2 \U+03C0\U+03C1\U+03BF\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 (" (itoa (length *kal-sug*)) "): " path))
      (kal:open path)))
  (princ "\n\U+0393\U+03B9\U+03B1 \U+03C4\U+03BF \U+03C6\U+03CD\U+03BB\U+03BB\U+03BF \U+03C3\U+03B5 1:100 (\U+03C3\U+03C4\U+03AE\U+03C3\U+03B9\U+03BC\U+03BF \U+03C3\U+03B5\U+03BB\U+03AF\U+03B4\U+03B1\U+03C2): KALSELIDA")
  (kal:end)
  (princ))

;; ===================================================================
;; KALSELIDA - \U+03C3\U+03C4\U+03AE\U+03C3\U+03B9\U+03BC\U+03BF \U+03C3\U+03B5\U+03BB\U+03AF\U+03B4\U+03B1\U+03C2 \U+03C4\U+03BF\U+03C5 \U+03B4\U+03B9\U+03B1\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C2 \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2, \U+03C0\U+03AC\U+03BD\U+03C4\U+03B1 1:100
;; \U+03A0\U+03B5\U+03C1\U+03B9\U+03B5\U+03C7\U+03CC\U+03BC\U+03B5\U+03BD\U+03BF \U+03BA\U+03B1\U+03C4\U+03AC \U+03AC\U+03C1\U+03B8. 325 \U+03BD.5306/2026 (\U+03C0\U+03C1\U+03CE\U+03B7\U+03BD \U+03AC\U+03C1\U+03B8. 39 \U+03C0\U+03B1\U+03C1. 3 \U+03BD.4495/2017):
;;   \U+03B1) \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF + \U+03C0\U+03B5\U+03C1\U+03AF\U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 \U+03BC\U+03B5 \U+03C3\U+03C5\U+03BD\U+03C4\U+03B5\U+03C4\U+03B1\U+03B3\U+03BC\U+03AD\U+03BD\U+03B5\U+03C2 \U+0395\U+0393\U+03A3\U+039187
;;   \U+03B2) \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03BF\U+03AF \U+03BA\U+03AC\U+03BB\U+03C5\U+03C8\U+03B7\U+03C2, \U+03CD\U+03C8\U+03BF\U+03C5\U+03C2, \U+03B1\U+03C0\U+03BF\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03C9\U+03BD (+ \U+03CC\U+03B3\U+03BA\U+03BF\U+03C2, \U+03A3\U+039F, \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7 \U+03B1\U+03C0\U+03CC \U+03C4\U+03B7 \U+03BC\U+03B5\U+03BB\U+03AD\U+03C4\U+03B7)
;;   \U+03B3) \U+03C0\U+03B5\U+03C1\U+03B9\U+03B3\U+03C1\U+03AC\U+03BC\U+03BC\U+03B1\U+03C4\U+03B1 \U+03C5\U+03C0\U+03CC\U+03B3\U+03B5\U+03B9\U+03C9\U+03BD / \U+03C5\U+03C0\U+03AD\U+03C1\U+03B3\U+03B5\U+03B9\U+03C9\U+03BD \U+03B5\U+03C0\U+03B9\U+03C0\U+03AD\U+03B4\U+03C9\U+03BD
;;   \U+03B5-\U+03C3\U+03C4) \U+03C3\U+03C7\U+03B7\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03AE \U+03C4\U+03BF\U+03BC\U+03AE \U+03BC\U+03B5 \U+03B9\U+03B4\U+03B5\U+03B1\U+03C4\U+03CC \U+03C3\U+03C4\U+03B5\U+03C1\U+03B5\U+03CC, \U+03CC\U+03C8\U+03B5\U+03B9\U+03C2 \U+00B7 \U+03B6) \U+03B4\U+03B9\U+03B1\U+03BC\U+03CC\U+03C1\U+03C6\U+03C9\U+03C3\U+03B7, \U+03C6\U+03CD\U+03C4\U+03B5\U+03C5\U+03C3\U+03B7
;;   \U+03B7) \U+03C4\U+03C1\U+03B9\U+03C3\U+03B4\U+03B9\U+03AC\U+03C3\U+03C4\U+03B1\U+03C4\U+03B7 \U+03B1\U+03C0\U+03B5\U+03B9\U+03BA\U+03CC\U+03BD\U+03B9\U+03C3\U+03B7 / \U+03C6\U+03C9\U+03C4\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03AF\U+03B5\U+03C2 \U+00B7 \U+03C5\U+03C0\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03B7 \U+03B4\U+03AE\U+03BB\U+03C9\U+03C3\U+03B7 \U+03BD.1599/86
;; \U+03A3\U+03C4\U+03AE\U+03BB\U+03B5\U+03C2 \U+03CC\U+03C0\U+03C9\U+03C2 \U+03C3\U+03C4\U+03BF \U+03C0\U+03C1\U+03CC\U+03C4\U+03C5\U+03C0\U+03BF: \U+03A6\U+03A9\U+03A4\U+039F\U+03A1\U+0395\U+0391\U+039B\U+0399\U+03A3\U+03A4\U+0399\U+039A\U+0395\U+03A3 \U+0395\U+0399\U+039A\U+039F\U+039D\U+0395\U+03A3 | \U+039F\U+03A8\U+0395\U+0399\U+03A3-\U+03A4\U+039F\U+039C\U+0395\U+03A3 | \U+039F\U+03A1\U+039F\U+0399 \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3 |
;;   \U+0395\U+039C\U+0392\U+0391\U+0394\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0395\U+0399\U+03A3 | \U+03A4\U+039F\U+03A0\U+039F\U+0393\U+03A1\U+0391\U+03A6\U+0399\U+039A\U+039F \U+0394\U+0399\U+0391\U+0393\U+03A1\U+0391\U+039C\U+039C\U+0391 | \U+03A0\U+0399\U+039D\U+0391\U+039A\U+0395\U+03A3 \U+03A3\U+03A5\U+039D\U+03A4\U+0395\U+03A4\U+0391\U+0393\U+039C\U+0395\U+039D\U+03A9\U+039D + \U+03C0\U+03B9\U+03BD\U+03B1\U+03BA\U+03AF\U+03B4\U+03B1
;; \U+038E\U+03C8\U+03BF\U+03C2 \U+03C6\U+03CD\U+03BB\U+03BB\U+03BF\U+03C5 594 mm (A1) - 841 mm (A0) \U+03B1\U+03BD \U+03B4\U+03B5\U+03BD \U+03C7\U+03C9\U+03C1\U+03AC\U+03B5\U+03B9 \U+03C3\U+03B5 1:100. \U+03A0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 \U+03CC\U+03C3\U+03BF \U+03C7\U+03C1\U+03B5\U+03B9\U+03AC\U+03B6\U+03B5\U+03C4\U+03B1\U+03B9.
;; ===================================================================
(defun kal:bbl (l / x1 y1 x2 y2)
  (foreach v l
    (setq x1 (if x1 (min x1 (car v)) (car v)) y1 (if y1 (min y1 (cadr v)) (cadr v))
          x2 (if x2 (max x2 (car v)) (car v)) y2 (if y2 (max y2 (cadr v)) (cadr v))))
  (if x1 (list x1 y1 x2 y2)))
(defun kal:bbe (es / l) (foreach e es (setq l (append l (kal:verts e)))) (kal:bbl l))
(defun kal:bbgrow (b m) (list (- (nth 0 b) m) (- (nth 1 b) m) (+ (nth 2 b) m) (+ (nth 3 b) m)))
(defun kal:bw (b) (- (nth 2 b) (nth 0 b)))
(defun kal:bh (b) (- (nth 3 b) (nth 1 b)))
(defun kal:bc (b) (list (/ (+ (nth 0 b) (nth 2 b)) 2.0) (/ (+ (nth 1 b) (nth 3 b)) 2.0)))
(defun kal:rect (x1 y1 x2 y2 lay w)
  (entmake (append (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lay)) (kal:psx)
                   (list (cons 100 "AcDbPolyline") (cons 90 4) (cons 70 1) (cons 43 w)
                         (list 10 x1 y1) (list 10 x2 y1) (list 10 x2 y2) (list 10 x1 y2)))))
(defun kal:nums (s / i ch cur l)
  (setq i 1 cur "")
  (while (<= i (strlen s))
    (setq ch (substr s i 1))
    (if (or (wcmatch ch "#") (and (= ch ".") (/= cur "")))
      (setq cur (strcat cur ch))
      (progn (if (/= cur "") (setq l (cons (atof cur) l))) (setq cur "")))
    (setq i (1+ i)))
  (if (/= cur "") (setq l (cons (atof cur) l)))
  (reverse l))
(defun kal:mediafits (n W H / l a b)
  (setq l (kal:nums n))
  (if (and (>= (length l) 2) (wcmatch (strcase n) "*MM*"))
    (progn
      (setq a (nth (- (length l) 2) l) b (last l))
      (or (and (< (abs (- a W)) 1.0) (< (abs (- b H)) 1.0))
          (and (< (abs (- b W)) 1.0) (< (abs (- a H)) 1.0))))))
(defun kal:pagesetup (W H / lay r best ll ur)
  (setq lay (vl-catch-all-apply 'vla-get-ActiveLayout (list (vla-get-ActiveDocument (vlax-get-acad-object)))))
  (if (not (vl-catch-all-error-p lay))
    (progn
      (vl-catch-all-apply 'vla-put-ConfigName (list lay "DWG To PDF.pc3"))
      (vl-catch-all-apply 'vla-RefreshPlotDeviceInfo (list lay))
      (setq r (vl-catch-all-apply 'vla-GetCanonicalMediaNames (list lay)))
      (if (not (vl-catch-all-error-p r))
        (foreach n (vlax-safearray->list (vlax-variant-value r))
          (if (kal:mediafits n W H) (setq best n))))
      (if best (vl-catch-all-apply 'vla-put-CanonicalMediaName (list lay best)))
      (vl-catch-all-apply 'vla-put-PaperUnits (list lay 1))
      (setq ll (vlax-make-safearray vlax-vbDouble (cons 0 1)) ur (vlax-make-safearray vlax-vbDouble (cons 0 1)))
      (vlax-safearray-fill ll (list 0.0 0.0))
      (vlax-safearray-fill ur (list W H))
      (vl-catch-all-apply 'vla-SetWindowToPlot (list lay ll ur))
      (vl-catch-all-apply 'vla-put-PlotType (list lay 4))
      (vl-catch-all-apply 'vla-put-StandardScale (list lay 16))
      (vl-catch-all-apply 'vla-put-CenterPlot (list lay :vlax-true))))
  best)
;; \U+03C0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF \U+03C3\U+03C4\U+03BF \U+03C7\U+03B1\U+03C1\U+03C4\U+03AF: \U+03BA\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF pc, \U+03B4\U+03B9\U+03B1\U+03C3\U+03C4\U+03AC\U+03C3\U+03B5\U+03B9\U+03C2 w h (mm), \U+03BA\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF \U+03BC\U+03BF\U+03BD\U+03C4\U+03AD\U+03BB\U+03BF\U+03C5 mc, \U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 1:100 (10 mm \U+03B1\U+03BD\U+03AC \U+03BC.)
(defun kal:vport (pc w h mc / e0 e id)
  (setvar "CLAYER" "KAL_SEL_VP")
  (setq e0 (entlast))
  (kal:cmd (list "_.MVIEW" (list (- (car pc) (/ w 2.0)) (- (cadr pc) (/ h 2.0)))
                           (list (+ (car pc) (/ w 2.0)) (+ (cadr pc) (/ h 2.0)))))
  (setq e (entlast))
  (if (and e (not (equal e e0)) (= (cdr (assoc 0 (entget e))) "VIEWPORT"))
    (progn
      (setq id (cdr (assoc 69 (entget e))))
      (kal:cmd (list "_.MSPACE"))
      (if id (setvar "CVPORT" id))
      (kal:cmd (list "_.ZOOM" "_C" (list (car mc) (cadr mc)) "10XP"))
      (kal:cmd (list "_.PSPACE"))
      (vl-catch-all-apply 'vla-put-DisplayLocked (list (vlax-ename->vla-object e) :vlax-true))
      e)
    (progn (princ "\n\U+0394\U+03B5\U+03BD \U+03B4\U+03B7\U+03BC\U+03B9\U+03BF\U+03C5\U+03C1\U+03B3\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5 \U+03C0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF - \U+03C6\U+03C4\U+03B9\U+03AC\U+03BE' \U+03C4\U+03BF \U+03BC\U+03B5 MVIEW \U+03BA\U+03B1\U+03B9 ZOOM 10XP.") nil)))
(defun kal:selclear (nm / ss i)
  (if (setq ss (ssget "_X" (list (cons 410 nm) (cons 8 "KAL_SEL_*"))))
    (progn (setq i 0) (repeat (sslength ss) (entdel (ssname ss i)) (setq i (1+ i))))))
(defun kal:koryfes (cov th / ss i k vl n c a b u ang)
  (if (setq ss (ssget "_X" (list (cons 8 "KAL_KORYFES"))))
    (progn (setq i 0) (repeat (sslength ss) (entdel (ssname ss i)) (setq i (1+ i)))))
  (setq k 0)
  (foreach e cov
    (setq vl (kal:verts e) n (length vl) c (kal:cent vl) i 0)
    (repeat n
      (setq k (1+ k) a (nth i vl))
      (setq ang (angle c (kal:p2 a)))
      (kal:txt (polar (kal:p2 a) ang (* th 1.6)) th (strcat "K" (itoa k)) 0.0 T "KAL_KORYFES")
      (setq i (1+ i)))))
;; \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03C3\U+03C5\U+03BD\U+03C4\U+03B5\U+03C4\U+03B1\U+03B3\U+03BC\U+03AD\U+03BD\U+03C9\U+03BD \U+03C3\U+03C4\U+03BF \U+03C7\U+03B1\U+03C1\U+03C4\U+03AF - \U+03C0\U+03AC\U+03BD\U+03C9 \U+03B1\U+03C0\U+03CC 30 \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03B1 \U+03C3\U+03C0\U+03AC\U+03B5\U+03B9 \U+03C3\U+03B5 \U+03C3\U+03C4\U+03AE\U+03BB\U+03B5\U+03C2 \U+03B4\U+03AF\U+03C0\U+03BB\U+03B1-\U+03B4\U+03AF\U+03C0\U+03BB\U+03B1
(defun kal:coordtab (x0 y0 title pts / hr hrow w1 w2 w3 bw nb b r y x i k blk)
  (setq hr 5.85 w1 16.0 w2 36.0 w3 38.0 bw (+ w1 w2 w3) nb (1+ (/ (1- (length pts)) 30)) b 0 k 0)
  (setq *kal-bold* T)
  (kal:txt (list (+ x0 (/ (+ (* nb bw) (* (1- nb) 4.0)) 2.0)) (- y0 4.0)) 5.0 title 0.0 T "KAL_SEL_KEIMENA")
  (setq *kal-bold* nil)
  (repeat nb
    (setq x (+ x0 (* b (+ bw 4.0))) y (- y0 9.0))
    (setq blk nil i 0)
    (foreach p pts (if (and (>= i (* b 30)) (< i (* (1+ b) 30))) (setq blk (append blk (list p)))) (setq i (1+ i)))
    (kal:rect x (- y (* hr (1+ (length blk)))) (+ x bw) y "KAL_SEL_PLAISIO" 0.0)
    (kal:line (list (+ x w1) y) (list (+ x w1) (- y (* hr (1+ (length blk))))) "KAL_SEL_PLAISIO")
    (kal:line (list (+ x w1 w2) y) (list (+ x w1 w2) (- y (* hr (1+ (length blk))))) "KAL_SEL_PLAISIO")
    (kal:line (list x (- y hr)) (list (+ x bw) (- y hr)) "KAL_SEL_PLAISIO")
    (kal:txt (list (+ x (/ w1 2.0)) (- y (/ hr 2.0))) 4.2 "i" 0.0 T "KAL_SEL_KEIMENA")
    (kal:txt (list (+ x w1 (/ w2 2.0)) (- y (/ hr 2.0))) 4.2 "X (m)" 0.0 T "KAL_SEL_KEIMENA")
    (kal:txt (list (+ x w1 w2 (/ w3 2.0)) (- y (/ hr 2.0))) 4.2 "Y (m)" 0.0 T "KAL_SEL_KEIMENA")
    (setq r 1)
    (foreach p blk
      (setq k (1+ k))
      (kal:txt (list (+ x (/ w1 2.0)) (- y (* hr r) (/ hr 2.0))) 4.2 (car p) 0.0 T "KAL_SEL_KEIMENA")
      (kal:txt (list (+ x w1 (/ w2 2.0)) (- y (* hr r) (/ hr 2.0))) 4.2 (rtos (cadr p) 2 4) 0.0 T "KAL_SEL_KEIMENA")
      (kal:txt (list (+ x w1 w2 (/ w3 2.0)) (- y (* hr r) (/ hr 2.0))) 4.2 (rtos (caddr p) 2 4) 0.0 T "KAL_SEL_KEIMENA")
      (setq r (1+ r)))
    (setq b (1+ b)))
  (- y0 9.0 (* hr 31.0 (if (> nb 1) 1.0 (/ (+ (length pts) 1.0) 31.0))) 8.0))
(defun kal:selget (/ o s l)
  (if (setq o (dictsearch (namedobjdict) "HEXIS_KALSEL"))
    (progn
      (foreach g o (if (= (car g) 1) (setq s (cdr g))))
      (if s (setq l (mapcar 'atof (kal:split s ","))))
      (if (= (length l) 4) l))))
(defun kal:selput (b / d o)
  (setq d (namedobjdict))
  (if (setq o (dictsearch d "HEXIS_KALSEL")) (progn (dictremove d "HEXIS_KALSEL") (entdel (cdr (assoc -1 o)))))
  (if b (dictadd d "HEXIS_KALSEL"
          (entmakex (list (cons 0 "XRECORD") (cons 100 "AcDbXrecord")
                          (cons 1 (kal:join (mapcar (function (lambda (x) (rtos x 2 3))) b) ",")))))))

(defun c:KALSELIDA (/ *error* st plot cov levels kaek tb sec a b tpb lvl lb H0 head mg av need cols Wt x
                      c w sub sx sy sh sw y pc nm best k pts e vl n i yb rows th)
  (defun *error* (msg)
    (kal:end)
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*EXIT*,*BREAK*")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1: " msg)))
    (princ))
  (kal:begin)
  (kal:setup)
  (kal:layer "KAL_SEL_PLAISIO" 7)
  (kal:layer "KAL_SEL_KEIMENA" 7)
  (if (not (tblsearch "LAYER" "KAL_SEL_VP"))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord")
                   (cons 2 "KAL_SEL_VP") (cons 70 0) (cons 62 8) (cons 6 "Continuous") (cons 290 0))))
  (setq st (kal:sget) th 0.25)
  (if (null st) (progn (princ "\n\U+03A4\U+03C1\U+03AD\U+03BE\U+03B5 \U+03C0\U+03C1\U+03CE\U+03C4\U+03B1 \U+03C4\U+03BF KALYPSI \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF.") (exit)))
  (setq kaek (nth 0 st) plot (kal:ename (nth 1 st)) cov (kal:enames (nth 2 st)) levels (kal:lvalid (nth 4 st)))
  (if (null plot) (progn (princ "\n\U+0394\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 \U+03C4\U+03BF \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF - \U+03C4\U+03C1\U+03AD\U+03BE\U+03B5 \U+03BE\U+03B1\U+03BD\U+03AC \U+03C4\U+03BF KALYPSI.") (exit)))
  (setvar "TILEMODE" 1)
  ;; \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2 \U+03BA\U+03C4\U+03B9\U+03C1\U+03AF\U+03BF\U+03C5 \U+03C3\U+03C4\U+03BF \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03CC
  (kal:koryfes cov th)
  ;; \U+03CC\U+03C8\U+03B5\U+03B9\U+03C2 - \U+03C4\U+03BF\U+03BC\U+03AD\U+03C2: \U+03C0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03BF \U+03C3\U+03C4\U+03BF \U+03BC\U+03BF\U+03BD\U+03C4\U+03AD\U+03BB\U+03BF
  (setq sec (kal:selget))
  (setq a (getpoint (strcat "\n\U+038C\U+03C8\U+03B5\U+03B9\U+03C2-\U+03C4\U+03BF\U+03BC\U+03AD\U+03C2: \U+03C0\U+03C1\U+03CE\U+03C4\U+03B7 \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1 \U+03C0\U+03B1\U+03C1\U+03B1\U+03B8\U+03CD\U+03C1\U+03BF\U+03C5 \U+03B3\U+03CD\U+03C1\U+03C9 \U+03C4\U+03BF\U+03C5\U+03C2 \U+03C3\U+03C4\U+03BF \U+03BC\U+03BF\U+03BD\U+03C4\U+03AD\U+03BB\U+03BF"
                            (if sec " (Enter = \U+03AF\U+03B4\U+03B9\U+03BF \U+03BC\U+03B5 \U+03C0\U+03C1\U+03B9\U+03BD)" " (Enter = \U+03BA\U+03B5\U+03BD\U+03AE \U+03C3\U+03C4\U+03AE\U+03BB\U+03B7)") ": ")))
  (if a
    (progn
      (setq b (getcorner a "\n\U+0394\U+03B5\U+03CD\U+03C4\U+03B5\U+03C1\U+03B7 \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1: "))
      (if b (setq sec (list (min (car a) (car b)) (min (cadr a) (cadr b)) (max (car a) (car b)) (max (cadr a) (cadr b)))))))
  (kal:selput sec)
  ;; \U+03C0\U+03B5\U+03C1\U+03B9\U+03BF\U+03C7\U+03AD\U+03C2 \U+03BC\U+03BF\U+03BD\U+03C4\U+03AD\U+03BB\U+03BF\U+03C5 (\U+03BC.)
  (setq tpb (kal:bbgrow (kal:bbe (list plot)) 6.0))
  (setq lvl nil)
  (foreach lv levels
    (setq lb (kal:bbe (append (nth 3 lv) (mapcar 'cdr (nth 4 lv)))))
    (if lb (setq lvl (append lvl (list (list (car lv) (kal:bbgrow lb 2.0)))))))
  (if (setq tb (ssget "_X" (list (cons 8 "KAL_PINAKAS") (cons 410 "Model"))))
    (setq tb (kal:bbox tb)))
  (if tb (setq tb (kal:bbgrow tb 0.5)))
  ;; \U+03CD\U+03C8\U+03BF\U+03C2 \U+03C6\U+03CD\U+03BB\U+03BB\U+03BF\U+03C5
  (setq H0 594.0 head 17.0 mg 6.0 av (- H0 head mg mg))
  (setq need (max (* 10.0 (kal:bh tpb)) (if sec (* 10.0 (kal:bh sec)) 0.0)))
  (foreach l lvl (setq need (max need (+ 10.0 (* 10.0 (kal:bh (cadr l)))))))
  (if (> need av) (setq H0 841.0 av (- H0 head mg mg)))
  (if (> need av) (princ "\n\U+03A0\U+03C1\U+03BF\U+03C3\U+03BF\U+03C7\U+03AE: \U+03C3\U+03B5 1:100 \U+03BA\U+03AC\U+03C0\U+03BF\U+03B9\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03C8\U+03B7\U+03BB\U+03CC\U+03C4\U+03B5\U+03C1\U+03BF \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF A0 - \U+03B8\U+03B1 \U+03B2\U+03B3\U+03B5\U+03B9 \U+03AD\U+03BE\U+03C9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03C0\U+03BB\U+03B1\U+03AF\U+03C3\U+03B9\U+03BF."))
  ;; \U+03C3\U+03C4\U+03AE\U+03BB\U+03B5\U+03C2: (\U+03C4\U+03AF\U+03C4\U+03BB\U+03BF\U+03C2 \U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 \U+03B5\U+03AF\U+03B4\U+03BF\U+03C2)
  (setq sub nil sx nil sh 0.0 sw 0.0)
  (foreach l lvl
    (setq w (* 10.0 (kal:bw (cadr l))) c (+ (* 10.0 (kal:bh (cadr l))) 10.0))
    (if (and sub (> (+ sh c) av)) (setq sx (append sx (list (list sw sub))) sub nil sh 0.0 sw 0.0))
    (setq sub (append sub (list (list l c))) sh (+ sh c) sw (max sw w)))
  (if sub (setq sx (append sx (list (list sw sub)))))
  (setq w 0.0)
  (foreach s sx (setq w (+ w (car s) 10.0)))
  (setq cols
    (list (list "\U+03A6\U+03A9\U+03A4\U+039F\U+03A1\U+0395\U+0391\U+039B\U+0399\U+03A3\U+03A4\U+0399\U+039A\U+0395\U+03A3 \U+0395\U+0399\U+039A\U+039F\U+039D\U+0395\U+03A3" nil 200.0 'foto)
          (list "\U+039F\U+03A8\U+0395\U+0399\U+03A3-\U+03A4\U+039F\U+039C\U+0395\U+03A3" T (if sec (max 300.0 (+ (* 10.0 (kal:bw sec)) mg mg)) 300.0) 'sec)
          (list "\U+039F\U+03A1\U+039F\U+0399 \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3" nil (if tb (max 155.0 (+ (* 10.0 (kal:bw tb)) mg mg)) 155.0) 'oroi)
          (list "\U+0395\U+039C\U+0392\U+0391\U+0394\U+039F\U+039C\U+0395\U+03A4\U+03A1\U+0397\U+03A3\U+0395\U+0399\U+03A3" T (max 200.0 (+ w mg)) 'emb)
          (list "\U+03A4\U+039F\U+03A0\U+039F\U+0393\U+03A1\U+0391\U+03A6\U+0399\U+039A\U+039F \U+0394\U+0399\U+0391\U+0393\U+03A1\U+0391\U+039C\U+039C\U+0391 \U+0394\U+0399\U+0391\U+039C\U+039F\U+03A1\U+03A6\U+03A9\U+03A3\U+0395\U+03A9\U+039D \U+039A\U+0391\U+0399 \U+03A6\U+03A5\U+03A4\U+0395\U+03A5\U+03A3\U+0395\U+03A9\U+039D" T (max 250.0 (+ (* 10.0 (kal:bw tpb)) mg mg)) 'topo)
          (list "\U+03A0\U+0399\U+039D\U+0391\U+039A\U+0395\U+03A3 \U+03A3\U+03A5\U+039D\U+03A4\U+0395\U+03A4\U+0391\U+0393\U+039C\U+0395\U+039D\U+03A9\U+039D" nil 195.0 'syn)))
  (setq Wt 0.0)
  (foreach c cols (setq Wt (+ Wt (nth 2 c))))
  ;; \U+03B4\U+03B9\U+03AC\U+03C4\U+03B1\U+03BE\U+03B7 (layout)
  (setq nm "KALYPSI 1-100")
  (if (not (member nm (layoutlist)))
    (progn
      (kal:cmd (list "_.LAYOUT" "_N" nm))
      (setvar "CTAB" nm)
      (if (setq a (ssget "_X" (list (cons 0 "VIEWPORT") (cons 410 nm))))
        (progn (setq i 0)
               (repeat (sslength a)
                 (if (> (cdr (assoc 69 (entget (ssname a i)))) 1) (entdel (ssname a i)))
                 (setq i (1+ i))))))
    (setvar "CTAB" nm))
  (kal:cmd (list "_.PSPACE"))
  (kal:selclear nm)
  (setq *kal-ps* nm)
  ;; \U+03C0\U+03BB\U+03B1\U+03AF\U+03C3\U+03B9\U+03BF, \U+03C3\U+03C4\U+03AE\U+03BB\U+03B5\U+03C2, \U+03BA\U+03B5\U+03C6\U+03B1\U+03BB\U+03AF\U+03B4\U+03B5\U+03C2
  (kal:rect 0.0 0.0 Wt H0 "KAL_SEL_PLAISIO" 0.5)
  (kal:line (list 0.0 (- H0 head)) (list Wt (- H0 head)) "KAL_SEL_PLAISIO")
  (setq x 0.0)
  (foreach c cols
    (if (> x 0.0) (kal:line (list x 0.0) (list x H0) "KAL_SEL_PLAISIO"))
    (setq *kal-bold* T)
    (kal:txt (list (+ x 4.0) (- H0 (if (cadr c) 5.6 8.5))) 5.6 (car c) 0.0 nil "KAL_SEL_KEIMENA")
    (setq *kal-bold* nil)
    (if (cadr c) (kal:txt (list (+ x 4.0) (- H0 12.4)) 5.6 "\U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 1/100" 0.0 nil "KAL_SEL_KEIMENA"))
    (setq w (nth 2 c) y (- H0 head mg))
    (cond
      ((= (nth 3 c) 'sec)
        (if sec (kal:vport (list (+ x (/ w 2.0)) (- y (/ (* 10.0 (kal:bh sec)) 2.0)))
                           (* 10.0 (kal:bw sec)) (* 10.0 (kal:bh sec)) (kal:bc sec))))
      ((= (nth 3 c) 'oroi)
        (if tb
          (progn
            (kal:vport (list (+ x (/ w 2.0)) (- y (/ (* 10.0 (kal:bh tb)) 2.0))) (* 10.0 (kal:bw tb)) (* 10.0 (kal:bh tb)) (kal:bc tb))
            (setq y (- y (* 10.0 (kal:bh tb)) 12.0))))
        (setq *kal-bold* T)
        (kal:txt (list (+ x mg) y) 3.4 "\U+03A5\U+03A0\U+0395\U+03A5\U+0398\U+03A5\U+039D\U+0397 \U+0394\U+0397\U+039B\U+03A9\U+03A3\U+0397 [\U+0391\U+03A1\U+0398. 8 \U+03A4\U+039F\U+03A5 \U+039D. 1599/86 (\U+0391' 75)]" 0.0 nil "KAL_SEL_KEIMENA")
        (setq *kal-bold* nil k 1)
        (foreach t1 (list "\U+039F/\U+0397 \U+03C5\U+03C0\U+03BF\U+03B3\U+03C1\U+03AC\U+03C6\U+03C9\U+03BD/\U+03BF\U+03C5\U+03C3\U+03B1 \U+03BC\U+03B5\U+03BB\U+03B5\U+03C4\U+03B7\U+03C4\U+03AE\U+03C2 \U+03BC\U+03B7\U+03C7\U+03B1\U+03BD\U+03B9\U+03BA\U+03CC\U+03C2 \U+03B4\U+03B7\U+03BB\U+03CE\U+03BD\U+03C9 \U+03C5\U+03C0\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03B1 \U+03CC\U+03C4\U+03B9:"
                          "\U+03B1) \U+03BF \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+03C4\U+03B7\U+03C2 \U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03B5\U+03C0\U+03CC\U+03BC\U+03B5\U+03BD\U+03B7\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03C4\U+03B7\U+03C2 \U+03C0\U+03C1\U+03B1\U+03B3\U+03BC\U+03B1\U+03C4\U+03BF\U+03C0\U+03BF\U+03B9\U+03BF\U+03CD\U+03BC\U+03B5\U+03BD\U+03B7\U+03C2"
                          "    \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03BF\U+03C1\U+03B8\U+03CC\U+03C2,"
                          "\U+03B2) \U+03AD\U+03C7\U+03BF\U+03C5\U+03BD \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03C4\U+03B5\U+03AF \U+03CC\U+03BB\U+03B5\U+03C2 \U+03BF\U+03B9 \U+03BA\U+03B1\U+03C4\U+03B1\U+03C3\U+03BA\U+03B5\U+03C5\U+03AD\U+03C2 \U+03BA\U+03B1\U+03C4\U+03AC \U+03C4\U+03BF \U+03AC\U+03C1\U+03B8. 206"
                          "    \U+03BD. 5306/2026 (\U+03C0\U+03C1\U+03CE\U+03B7\U+03BD \U+03AC\U+03C1\U+03B8. 11 \U+03BD. 4067/2012),"
                          "\U+03B3) \U+03BF\U+03B9 \U+03B5\U+03C0\U+03B9\U+03C6\U+03AC\U+03BD\U+03B5\U+03B9\U+03B5\U+03C2 \U+03B3\U+03B9\U+03B1 \U+03C4\U+03B9\U+03C2 \U+03B1\U+03C0\U+03B1\U+03B9\U+03C4\U+03BF\U+03CD\U+03BC\U+03B5\U+03BD\U+03B5\U+03C2 \U+03B8\U+03AD\U+03C3\U+03B5\U+03B9\U+03C2 \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7\U+03C2"
                          "    \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03BF\U+03C1\U+03B8\U+03AD\U+03C2."
                          "" "\U+039F \U+0394\U+0397\U+039B\U+03A9\U+039D")
          (kal:txt (list (+ x mg) (- y (* 4.6 k))) 2.8 t1 0.0 nil "KAL_SEL_KEIMENA")
          (setq k (1+ k))))
      ((= (nth 3 c) 'emb)
        (setq sw (+ x mg))
        (foreach s sx
          (setq sy y)
          (foreach it (cadr s)
            (setq lb (cadr (car it)))
            (kal:vport (list (+ sw (/ (car s) 2.0)) (- sy (/ (* 10.0 (kal:bh lb)) 2.0)))
                       (* 10.0 (kal:bw lb)) (* 10.0 (kal:bh lb)) (kal:bc lb))
            (setq *kal-bold* T)
            (kal:txt (list (+ sw (/ (car s) 2.0)) (- sy (* 10.0 (kal:bh lb)) 4.0)) 3.1
                     (strcat "\U+039A\U+0391\U+03A4\U+039F\U+03A8\U+0397 " (car (car it))) 0.0 T "KAL_SEL_KEIMENA")
            (setq *kal-bold* nil)
            (setq sy (- sy (cadr it))))
          (setq sw (+ sw (car s) 10.0))))
      ((= (nth 3 c) 'topo)
        (kal:vport (list (+ x (/ w 2.0)) (- H0 head (/ (- H0 head) 2.0)))
                   (* 10.0 (kal:bw tpb)) (* 10.0 (kal:bh tpb)) (kal:bc tpb)))
      ((= (nth 3 c) 'syn)
        (setq k 0 yb y)
        (foreach e cov
          (setq vl (kal:verts e) pts nil)
          (foreach v vl (setq k (1+ k) pts (append pts (list (list (strcat "K" (itoa k)) (car v) (cadr v))))))
          (setq yb (kal:coordtab (+ x mg) yb
                                 (if (> (length cov) 1) "\U+03A3\U+03A5\U+039D\U+03A4/\U+039D\U+0395\U+03A3 \U+039A\U+039F\U+03A1\U+03A5\U+03A6\U+03A9\U+039D \U+03A0\U+0395\U+03A1\U+0399\U+0393\U+03A1\U+0391\U+039C\U+039C\U+0391\U+03A4\U+039F\U+03A3 \U+039A\U+03A4\U+0399\U+03A1\U+0399\U+039F\U+03A5" "\U+03A3\U+03A5\U+039D\U+03A4/\U+039D\U+0395\U+03A3 \U+039A\U+039F\U+03A1\U+03A5\U+03A6\U+03A9\U+039D \U+039A\U+03A4\U+0399\U+03A1\U+0399\U+039F\U+03A5") pts)))
        ;; \U+03C0\U+03B9\U+03BD\U+03B1\U+03BA\U+03AF\U+03B4\U+03B1
        (setq yb (min yb 300.0))
        (kal:rect (+ x mg) mg (- (+ x w) mg) yb "KAL_SEL_PLAISIO" 0.0)
        (setq rows (list (list "\U+0395\U+03A1\U+0393\U+039F:" "") (list "\U+0398\U+0395\U+03A3\U+0397:" "") (list "\U+039A\U+0391\U+0395\U+039A:" kaek) (list "\U+0399\U+0394\U+0399\U+039F\U+039A\U+03A4\U+0397\U+03A4\U+0397\U+03A3:" "")
                         (list "\U+03A3\U+03A7\U+0395\U+0394\U+0399\U+039F:" "\U+0394\U+0399\U+0391\U+0393\U+03A1\U+0391\U+039C\U+039C\U+0391 \U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397\U+03A3") (list "\U+039A\U+039B\U+0399\U+039C\U+0391\U+039A\U+0391:" "1:100")
                         (list "\U+0397\U+039C\U+0395\U+03A1\U+039F\U+039C\U+0397\U+039D\U+0399\U+0391:" (kal:today)) (list "\U+0391\U+03A1. \U+03A3\U+03A7\U+0395\U+0394\U+0399\U+039F\U+03A5:" "\U+0394-01")
                         (list "\U+039C\U+0395\U+039B\U+0395\U+03A4\U+0397\U+03A4\U+0397\U+03A3 / \U+03A5\U+03A0\U+039F\U+0393\U+03A1\U+0391\U+03A6\U+0397 - \U+03A3\U+03A6\U+03A1\U+0391\U+0393\U+0399\U+0394\U+0391:" "")))
        (setq sy yb k 0)
        (foreach r rows
          (setq k (1+ k) sy (- sy (if (= k (length rows)) 0.0 11.0)))
          (if (< k (length rows)) (kal:line (list (+ x mg) sy) (list (- (+ x w) mg) sy) "KAL_SEL_PLAISIO"))
          (kal:txt (list (+ x mg 3.0) (+ sy (if (< k (length rows)) 5.5 -6.0))) 3.4 (car r) 0.0 nil "KAL_SEL_KEIMENA")
          (setq *kal-bold* T)
          (kal:txt (list (+ x mg 48.0) (+ sy (if (< k (length rows)) 5.5 -6.0))) 3.6 (cadr r) 0.0 nil "KAL_SEL_KEIMENA")
          (setq *kal-bold* nil))))
    (setq x (+ x w)))
  (setq *kal-ps* nil)
  (setq best (kal:pagesetup Wt H0))
  (kal:cmd (list "_.ZOOM" "_E"))
  (princ (strcat "\n\U+03A6\U+03CD\U+03BB\U+03BB\U+03BF " (rtos Wt 2 0) " x " (rtos H0 2 0) " mm, \U+03CC\U+03BB\U+03B1 \U+03C4\U+03B1 \U+03C0\U+03B1\U+03C1\U+03AC\U+03B8\U+03C5\U+03C1\U+03B1 \U+03C3\U+03B5 1:100 \U+03BA\U+03BB\U+03B5\U+03B9\U+03B4\U+03C9\U+03BC\U+03AD\U+03BD\U+03B1 (layout \U+00AB" nm "\U+00BB)."))
  (princ (if best
           (strcat "\n\U+03A3\U+03B5\U+03BB\U+03AF\U+03B4\U+03B1: DWG To PDF, \U+03C7\U+03B1\U+03C1\U+03C4\U+03AF " best ", Window 1:1.")
           (strcat "\n\U+03A3\U+03B5\U+03BB\U+03AF\U+03B4\U+03B1: Window 1:1. \U+0393\U+03B9\U+03B1 \U+03B5\U+03BA\U+03C4\U+03CD\U+03C0\U+03C9\U+03C3\U+03B7 \U+03C0\U+03C1\U+03CC\U+03C3\U+03B8\U+03B5\U+03C3\U+03B5 \U+03BC\U+03AF\U+03B1 \U+03C6\U+03BF\U+03C1\U+03AC custom \U+03C7\U+03B1\U+03C1\U+03C4\U+03AF " (rtos Wt 2 0) " x " (rtos H0 2 0)
                   " mm \U+03C3\U+03C4\U+03BF DWG To PDF (Page Setup > Properties > Custom Paper Sizes) \U+03BA\U+03B1\U+03B9 \U+03C4\U+03C1\U+03AD\U+03BE\U+03B5 \U+03BE\U+03B1\U+03BD\U+03AC KALSELIDA.")))
  (princ "\n\U+03A3\U+03C5\U+03BC\U+03C0\U+03BB\U+03AE\U+03C1\U+03C9\U+03C3\U+03B5 \U+03B5\U+03C3\U+03CD: \U+03C6\U+03C9\U+03C4\U+03BF\U+03C1\U+03B5\U+03B1\U+03BB\U+03B9\U+03C3\U+03C4\U+03B9\U+03BA\U+03AD\U+03C2 \U+03B5\U+03B9\U+03BA\U+03CC\U+03BD\U+03B5\U+03C2 (\U+03C3\U+03C4\U+03AE\U+03BB\U+03B7 1), \U+03CC\U+03B3\U+03BA\U+03BF\U+03C2 / \U+03A3\U+039F / \U+03B8\U+03AD\U+03C3\U+03B5\U+03B9\U+03C2 \U+03C3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C5\U+03C3\U+03B7\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03C3\U+03C7\U+03B7\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03AE \U+03C4\U+03BF\U+03BC\U+03AE \U+03BC\U+03B5 \U+03B9\U+03B4\U+03B5\U+03B1\U+03C4\U+03CC \U+03C3\U+03C4\U+03B5\U+03C1\U+03B5\U+03CC (\U+03AC\U+03C1\U+03B8. 325 \U+03BD.5306/2026).")
  (kal:end)
  (princ))

(princ "\nKALYPSI v2.1 - HEXIS-APP: \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: KALYPSI, KALSELIDA (\U+03C6\U+03CD\U+03BB\U+03BB\U+03BF 1:100)")
(princ)
