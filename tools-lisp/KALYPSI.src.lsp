;;; ===================================================================
;;; KALYPSI.LSP v2.0 - Διάγραμμα Κάλυψης, Ανάλυση Δόμησης & Προτάσεις
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

;; ---------------- μορφοποίηση ----------------
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
  (cond ((= m 1) "Εντός σχεδίου") ((= m 3) "Οικισμός <2.000 κατ.") (T "Εκτός σχεδίου")))

;; ---------------- ρυθμίσεις (μένουν μετά από επανεκκίνηση) ----------------
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

;; ---------------- κατάσταση στο σχέδιο (XRECORD) ----------------
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
;; (kaek plotH (covH..) p0 ((όνομα (dH..) (xH..)) ..))
;; κατάσταση v2: kaek ^ plotH ^ covHs ^ p0 ^ levels ^ H
;; επίπεδο: όνομα|τύπος|χρήση|dHs|κωδ:h,κωδ:h
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

;; ---------------- γεωμετρία ----------------
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
;; εμβαδόν με τόξα (bulge)
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

;; ---------------- οντότητες ----------------
(defun kal:layer (n c)
  (if (not (tblsearch "LAYER" n))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord")
                   (cons 2 n) (cons 70 0) (cons 62 c) (cons 6 "Continuous")))))
(defun kal:setup ()
  (foreach x (list (list "KAL_KALYPSI" 8) (list "KAL_KEIMENA" 7) (list "KAL_APOSTASEIS" 1)
                   (list "KAL_PINAKAS" 7) (list "KAL_PERIGRAMMATA" 5) (list "KAL_EKTOS_SD" 3) (list "KAL_XOROI" 3)
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

;; ---------------- εντολές CAD ----------------
(defun kal:cmd (args)
  (if vl-cmdf (apply 'vl-cmdf args) (apply 'command args))
  (while (> (getvar "CMDACTIVE") 0) (command "")))
(defun kal:newents (e0 / l e)
  (setq e (if e0 (entnext e0) (entnext)))
  (while e (setq l (cons e l) e (entnext e)))
  l)
;; κλειστές πολυγραμμές του BOUNDARY σε σημείο
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
;; εξωτερικό περίγραμμα από τοίχους: πλαίσιο γύρω από την επιλογή + BOUNDARY στο κενό
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
        (princ "\nΔεν βγήκε κλειστό περίγραμμα - κοίτα για ανοίγματα στους τοίχους ή σχεδίασε κλειστή πολυγραμμή."))
      pl)))
;; χώρος από κλικ μέσα του
(defun kal:space (pt lay / pl best ba a)
  (foreach e (kal:boundary pt)
    (setq a (kal:area (kal:verts e)))
    (if (or (null best) (> a ba)) (progn (if best (entdel best)) (setq best e ba a)) (entdel e)))
  (if best (kal:setlay best lay) (princ "\nΔεν βρέθηκε κλειστός χώρος εκεί."))
  best)

;; ---------------- επιλογές ----------------
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
      (if (kal:closedp (entget e)) (setq l (cons e l)) (princ "\nΜία ανοιχτή πολυγραμμή αγνοήθηκε."))))
  (reverse l))
(defun kal:fromwalls (msg / ss)
  (princ (strcat "\n" msg ": "))
  (if (setq ss (ssget))
    (if (kal:allclosed ss) (kal:ss2l ss) (kal:outline ss))))
(defun kal:defname (i)
  (nth (min i 7) (list "Ισόγειο" "Α' Όροφος" "Β' Όροφος" "Γ' Όροφος" "Δ' Όροφος" "Ε' Όροφος" "Δώμα" "Επίπεδο")))

;; ---------------- αναγνώριση οικοπέδου ----------------
(defun kal:ring (s / l c)
  (if (and s (/= s ""))
    (foreach p (kal:split s ";")
      (setq c (kal:split p ","))
      (if (= (length c) 2) (setq l (cons (list (atof (car c)) (atof (cadr c)) 0.0) l)))))
  (if (> (length l) 2) (reverse l)))
(defun kal:findplot (ring / best ba ra rc vl a lay)
  (if ring
    (progn
      (setq ra (kal:area ring) rc (kal:cent ring))
      (foreach e (kal:allpl)
        (setq vl (kal:verts e) a (kal:area vl))
        (if (and (< (abs (- a ra)) (* 0.03 ra)) (< (distance (kal:cent vl) rc) 5.0)) (setq best e)))))
  (if (null best)
    (foreach e (kal:allpl)
      (setq lay (strcase (cdr (assoc 8 (entget e)))))
      (if (wcmatch lay "TOPO_PROP,BOUND_IMPL,BOUND_UNIMPL,KAL_OIKOPEDO,KAL_KTIMATOLOGIO,*OIKOP*,*GHPED*,*PLOT*,*ΟΙΚΟΠ*,*ΓΗΠΕΔ*")
        (progn
          (setq a (kal:area (kal:verts e)))
          (if (or (null best) (> a ba)) (setq best e ba a))))))
  best)
(defun kal:askplot (ring / p ss vl a best ba)
  (if ring (initget "K"))
  (setq p (getpoint (strcat "\nΚλικ πάνω στο όριο ή μέσα στο οικόπεδο"
                            (if ring " [K = όριο από Κτηματολόγιο]" "") ": ")))
  (cond
    ((= p "K")
      (princ "\nΣχεδιάστηκε το όριο του Κτηματολογίου (layer KAL_KTIMATOLOGIO, ΕΓΣΑ87).")
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
          (if (null best) (princ "\nΔεν βρέθηκε κλειστή πολυγραμμή εκεί."))
          best)))))

;; ---------------- αναγνώριση κάλυψης ----------------
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
    (if (wcmatch (nth 4 c) "KAL_PERIGR*,*KTIR*,*KTHR*,*BUILD*,*WALL*,*TOIX*,*KATOP*,*PERIG*,*ΚΤΙΡ*,*ΚΤΗΡ*,*ΤΟΙΧ*,*ΚΑΤΟΨ*,*ΠΕΡΙΓ*")
      (setq pref (cons c pref))))
  (if pref (setq l pref))
  ;; κρατά μόνο τα εξωτερικά (όχι δωμάτια ή όροφοι μέσα σε άλλο περίγραμμα)
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
      (setq v (getint (strcat "\n" lab ": " (itoa (length lst)) " περίγραμμα/τα, Ε = "
                              (kal:fmt (kal:sumarea lst) 2) " τ.μ. (επισημασμένα).  Enter = σωστά,  1 = επιλογή,  2 = από τοίχους: ")))
      (kal:hl lst 4))
    (progn
      (setq v (getint (strcat "\n" lab ":  1 = επιλογή κλειστών πολυγραμμών,  2 = περίγραμμα από τοίχους <2>: ")))
      (if (null v) (setq v 2))))
  (cond ((= v 1) (kal:sslist "\nΕπίλεξε κλειστές πολυγραμμές: "))
        ((= v 2) (kal:fromwalls wmsg))
        (T lst)))

;; ---------------- επίπεδα δόμησης & χώροι ----------------
;; επίπεδο: (όνομα τύπος χρήση (περιγράμματα) ((κωδ . χώρος) ..))
;; τύπος: 1 Υπέργειο, 2 Υπόγειο, 3 Σοφίτα, 4 Υπόσκαφο
;; χρήση υπογείου: 1 βοηθητική, 2 στάθμευση/Η-Μ/νερό/πισίνα, 3 κύρια · υπόσκαφου: 1 κατοικία, 2 άλλη
(defun kal:typetxt (t1 u)
  (cond ((= t1 2) (cond ((= u 2) "Υπόγειο - στάθμευση/Η-Μ") ((= u 3) "Υπόγειο - κύρια χρήση") (T "Υπόγειο - βοηθητικό")))
        ((= t1 3) "Σοφίτα")
        ((= t1 4) (if (= u 2) "Υπόσκαφο - άλλη χρήση" "Υπόσκαφο - κατοικία"))
        (T "Υπέργειο")))
(defun kal:codetxt (c)
  (cond ((= c "H") "Ανοικτός ημιυπαίθριος") ((= c "X") "Ανοικτός εξώστης")
        ((= c "K") "Κοινόχρηστο κλιμακοστάσιο") ((= c "I") "Ιδιωτικό κλιμακοστάσιο")
        ((= c "A") "Ανοικτό κλιμακοστάσιο") ((= c "F") "Φωταγωγός / φρεάτιο / αίθριο")
        ((= c "P") "Στάθμευση / Η-Μ / πλατφόρμα οχήματος") (T c)))
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
  (cond ((wcmatch u "*ΥΠΟΓ*,*ΥΠΌΓ*,*YPOG*,*BASEM*") 2)
        ((wcmatch u "*ΣΟΦ*,*SOFIT*,*ATTIC*") 3)
        ((wcmatch u "*ΥΠΟΣΚ*,*ΥΠΌΣΚ*,*YPOSK*") 4)
        (T 1)))
(defun kal:asklevel (i / dn fname typ use v dl sp code p e)
  (setq dn (kal:defname i))
  (setq fname (getstring T (strcat "\nΕπίπεδο - όνομα <" dn ">  (0 = τέλος επιπέδων): ")))
  (if (= fname "0")
    'END
    (progn
      (if (= fname "") (setq fname dn))
      (setq fname (kal:clean fname) typ (kal:guess fname) use 0)
      (initget 6)
      (setq v (getint (strcat "\nΤύπος «" fname "»:  1 Υπέργειο,  2 Υπόγειο,  3 Σοφίτα,  4 Υπόσκαφο <" (itoa typ) ">: ")))
      (if (member v (list 1 2 3 4)) (setq typ v))
      (cond
        ((= typ 2)
          (initget 6)
          (setq use (getint "\nΧρήση υπογείου:  1 Βοηθητική (αποθήκες κ.λπ.),  2 Στάθμευση / Η-Μ / δεξαμενές / πισίνα,  3 Κύρια χρήση <1>: "))
          (if (not (member use (list 1 2 3))) (setq use 1)))
        ((= typ 4)
          (initget 6)
          (setq use (getint "\nΧρήση υπόσκαφου:  1 Κατοικία,  2 Άλλη χρήση <1>: "))
          (if (not (member use (list 1 2))) (setq use 1))))
      (setq dl (kal:fromwalls (strcat "Κάτοψη «" fname "»: παράθυρο γύρω από όλη την κάτοψη (ή επιλογή έτοιμων κλειστών πολυγραμμών)")))
      (if (null dl)
        (progn (princ "\nΤο επίπεδο δεν καταχωρήθηκε - δοκίμασε ξανά.") nil)
        (progn
          (kal:hl dl 3)
          (princ (strcat "\n«" fname "»: μικτό περίγραμμα Ε = " (kal:fmt (kal:sumarea dl) 2) " τ.μ."))
          (while (progn
                   (initget "H X K I A F P")
                   (setq code (getkword (strcat "\nΧώροι στο «" fname "»:  H ημιυπαίθριος · X εξώστης · K κοινόχρηστη σκάλα · I ιδιωτική σκάλα · A ανοικτή σκάλα · F φωταγωγός/φρεάτιο/αίθριο · P στάθμευση/Η-Μ  [H/X/K/I/A/F/P] <τέλος>: "))))
            (while (progn
                     (initget "E")
                     (setq p (getpoint (strcat "\n  " (kal:codetxt code) ": κλικ μέσα στον χώρο [E = επιλογή πολυγραμμής] <τέλος>: "))))
              (if (= p "E")
                (foreach e (kal:sslist "\nΕπίλεξε κλειστές πολυγραμμές: ")
                  (setq sp (append sp (list (cons code e)))))
                (if (setq e (kal:space p "KAL_XOROI"))
                  (progn
                    (setq sp (append sp (list (cons code e))))
                    (redraw e 3)
                    (princ (strcat "  Ε = " (kal:fmt (kal:area (kal:verts e)) 2) " τ.μ.")))))))
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

;; ---------------- μηχανή κανόνων (ν.5306/2026) ----------------
(defun kal:inany (p vls / in)
  (foreach v vls (if (kal:pip p v) (setq in T)))
  in)
;; ανά επίπεδο: (G tot ex hx h ((κωδ εμβ εξαιρ σημ) ..))
(defun kal:lcalc (lv entr / dvs G tot ex hx h c e a vl in x nt lst)
  (setq dvs (mapcar 'kal:verts (nth 3 lv)) G (kal:sumarea (nth 3 lv)) tot G ex 0.0 hx 0.0 h 0.0)
  (foreach s (nth 4 lv)
    (setq c (car s) vl (kal:verts (cdr s)) a (kal:area vl) nt "")
    (setq in (kal:inany (kal:cent vl) dvs))
    (if (not in) (setq tot (+ tot a)))
    (cond
      ((or (= c "H") (= c "X"))
        (setq hx (+ hx a) x 0.0 nt "όριο 40% / 20% στο σύνολο (206 παρ. 6α)")
        (if (= c "H") (setq h (+ h a))))
      ((= c "K")
        (setq x (min a (if entr 40.0 30.0)) nt (strcat "έως " (if entr "40" "30") " τ.μ. ανά επίπεδο (206 παρ. 6δ)")))
      ((= c "I")
        (setq x (min a 25.0) nt "έως 25 τ.μ. ανά επίπεδο (206 παρ. 6ε)"))
      ((= c "A")
        (setq *kal-ac* (1+ *kal-ac*))
        (if (<= *kal-ac* 2)
          (setq x a nt "έως 2 ανοικτά, στάθμη έως 7,50 μ. (206 παρ. 6στ)")
          (setq x 0.0 nt "3ο ανοικτό κλιμακοστάσιο: μετρά")))
      ((= c "F")
        (setq x a nt (if (< a 1.5) "ως φρεάτιο Η/Μ· φωταγωγός θέλει 1,50 τ.μ. (206 παρ. 6η)" "δεν φωτίζει κύριους χώρους (206 παρ. 6η)")))
      ((= c "P")
        (if (= (nth 1 lv) 1)
          (setq x (min a 25.0) nt "υπέργεια: μόνο πλατφόρμα ανελκυστήρα οχήματος έως 25 τ.μ. (206 κβ)")
          (setq x a nt "υπόγεια στάθμευση / Η-Μ (206 παρ. 6θ)")))
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
;; αποτέλεσμα: (Sd ((όνομα τύπος χρήση G ex hx Lc μετρά σημ χώροι) ..) HX H)
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
            ((= use 2) (setq nt "στάθμευση / Η-Μ / νερό / πισίνα: δεν μετρά (206 παρ. 6θ)") 0.0)
            ((= use 3) (setq nt "κύρια χρήση: μετρά") Lc)
            ((not b1) (setq b1 T nt "ένας βοηθητικός υπόγειος έως την κάλυψη, οροφή έως 1,20 μ. από το έδαφος (206 παρ. 6ι)") (max 0.0 (- Lc Sk)))
            (T (setq nt "2ος βοηθητικός υπόγειος: μετρά") Lc)))
        ((= typ 3)
          (setq ug (kal:under levels j))
          (if (and ug (<= G (+ (* 0.5 ug) 0.005)))
            (progn (setq nt (strcat "έως 1/2 του υποκείμενου ορόφου (" (kal:fmt (* 0.5 ug) 2) " τ.μ.) - δεν μετρά (206 ιδ)")) 0.0)
            (progn (setq nt (if ug (strcat "ξεπερνά το 1/2 του υποκείμενου (" (kal:fmt (* 0.5 ug) 2) " τ.μ.) - μετρά") "χωρίς υποκείμενο όροφο - μετρά")) Lc)))
        ((= typ 4)
          (setq nt (if (= use 2) "υπόσκαφο άλλης χρήσης: εξαιρείται 20% (206 κγ)" "υπόσκαφο κατοικίας: εξαιρείται 50% (206 κγ)"))
          (* Lc (if (= use 2) 0.8 0.5)))
        (T Lc)))
    (setq Dom (+ Dom cnt) HX (+ HX hxl) Hh (+ Hh h))
    (setq rl (cons (list (car lv) typ use G ex hxl Lc cnt nt (nth 5 r)) rl) j (1+ j)))
  (list Dom (reverse rl) HX Hh))
(defun kal:hmax210 (s)
  (cond ((<= s 0.0) nil) ((<= s 0.4) 10.75) ((<= s 0.8) 14.0) ((<= s 1.2) 17.25)
        ((<= s 1.6) 19.5) ((<= s 2.0) 22.75) ((<= s 2.6) 26.0)))

;; ---------------- ελάχιστες αποστάσεις από τα όρια ----------------
;; dw: απόσταση κάτω από την οποία σημειώνεται προειδοποίηση (ή nil)
;; επιστρέφει (ελάχιστη  πλήθος-προειδοποιήσεων  (αποστάσεις ανά πλευρά))
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
                     (strcat "Δ=" (kal:fmt bd 2) (if (and dw (> bd 0.05) (< bd (- dw 0.005))) " (<δ)" ""))
                     ang T "KAL_APOSTASEIS")))))
    (setq i (1+ i)))
  (list mn nw (reverse dl)))

;; ---------------- πίνακας ----------------
;; γραμμές: (στήλη1 στήλη2 στήλη3 συντελ.ύψους) - στήλη2 = nil: ενιαία γραμμή σε όλο το πλάτος
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

;; ---------------- περιβάλλον ----------------
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
    (progn (princ "\nΔεν βρέθηκε το HEXISNET (ίδιος φάκελος με το KALYPSI) - φόρτωσέ το με APPLOAD.") nil)))


;; ---------------- αναφορά HTML ----------------
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

;; ---------------- προτάσεις εξοικονόμησης δόμησης ----------------
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
        (kal:sg (strcat "Η σκάλα στο «" (car r) "» ξεπερνά το όριο εξαίρεσης κατά <b>" (kal:fmt (- (cadr s) (caddr s)) 2)
                        " τ.μ.</b>, που μετρούν. Με μικρότερο κλιμακοστάσιο (ή δήλωση ως κοινόχρηστο, έως 30 τ.μ. / 40 στην είσοδο) τα τ.μ. αυτά γλιτώνονται. (άρθ. 206 παρ. 6δ-ε)"))))
    (cond
      ((and (= (nth 1 r) 2) (= (nth 2 r) 1) (> (nth 7 r) 0.005))
        (kal:sg (strcat "Το υπόγειο «" (car r) "» ξεπερνά την κάλυψη κατά <b>" (kal:fmt (nth 7 r) 2)
                        " τ.μ.</b>, που μετρούν. Αν το τμήμα αυτό γίνει στάθμευση, Η-Μ, δεξαμενή νερού ή πισίνα, δεν μετρά. (άρθ. 206 παρ. 6θ-ι)")))
      ((and (= (nth 1 r) 2) (= (nth 2 r) 3))
        (kal:sg (strcat "Το υπόγειο «" (car r) "» κύριας χρήσης μετρά όλο (" (kal:fmt (nth 7 r) 2) " τ.μ.). Ως βοηθητικό (οροφή έως 1,20 μ. από το έδαφος) εξαιρείται έως <b>"
                        (kal:fmt (min (nth 6 r) Sk) 2) " τ.μ.</b> (όσο η κάλυψη). (άρθ. 206 παρ. 6ι)")))
      ((and (= (nth 1 r) 3) (> (nth 7 r) 0.005))
        (setq ug (kal:underr rl r))
        (kal:sg (strcat "Η σοφίτα «" (car r) "» μετρά όλη (" (kal:fmt (nth 7 r) 2) " τ.μ.) επειδή ξεπερνά το 1/2 του υποκείμενου ορόφου."
                        (if ug (strcat " Αν περιοριστεί στα <b>" (kal:fmt (* 0.5 ug) 2) " τ.μ.</b> δεν μετρά καθόλου.") "")
                        " (άρθ. 206 περ. ιδ)")))))
  ;; υπόλοιπο / υπέρβαση
  (if allow
    (cond
      ((> (- allow Dom) 0.5)
        (kal:sg (strcat "Υπόλοιπο δόμησης: <b>" (kal:fmt (- allow Dom) 2) " τ.μ.</b> ακόμη αξιοποιήσιμα.")))
      ((< (- allow Dom) -0.005)
        (kal:sg (strcat "<b>Υπέρβαση δόμησης " (kal:fmt (- Dom allow) 2) " τ.μ.</b> — οι παρακάτω προτάσεις δείχνουν πού μπορεί να καλυφθεί.")))))
  ;; ημιυπαίθριοι / εξώστες
  (if allow
    (progn
      (setq r40 (- lim40 HX) rH (min r40 (- limH Hh)))
      (if (> r40 0.5)
        (kal:sg (strcat "Ανοικτοί εξώστες και ημιυπαίθριοι: χωράνε ακόμη <b>" (kal:fmt r40 2) " τ.μ.</b> χωρίς να μετρήσουν"
                        (if (> rH 0.5) (strcat " (από αυτά ημιυπαίθριοι έως " (kal:fmt rH 2) " τ.μ.)") "")
                        ". Χώρος που θα ήταν κλειστός μπορεί να γίνει ανοικτός ημιυπαίθριος — ανοικτός τουλάχιστον στο 35% της περιμέτρου του. (άρθ. 206 παρ. 6α, ορισμός ΝΟΚ)")))
      (if (> HXc 0.005)
        (kal:sg (strcat "Οι ανοικτοί χώροι ξεπερνούν το όριο 40% / 20%: μετρούν <b>" (kal:fmt HXc 2) " τ.μ.</b> Μείωσέ τους κατά τόσο για να μη μετρούν. (άρθ. 206 παρ. 5, 6α)")))))
  ;; κλιμακοστάσια
  (if (and (>= n1 2) (not hasK) (not hasA))
    (kal:sg (strcat "Δεν δηλώθηκε κλιμακοστάσιο: σε κάθε επίπεδο δεν μετρούν έως 25 τ.μ. ιδιωτικής σκάλας ή 30 τ.μ. κοινόχρηστης (40 στο επίπεδο εισόδου) — περίπου <b>"
                    (kal:fmt (* 25.0 n1) 2) " τ.μ.</b> στα " (itoa n1) " υπέργεια επίπεδα. Δήλωσέ το με K ή I. (άρθ. 206 παρ. 6δ-ε)")))
  (if (and (not hasA) (> hg 0.0) (<= hg 7.5) (>= n1 2))
    (kal:sg "Έως δύο ανοικτά κλιμακοστάσια που εξυπηρετούν στάθμη έως 7,50 μ. δεν μετρούν καθόλου — π.χ. εξωτερική σκάλα αντί για κλειστή. (άρθ. 206 παρ. 6στ)"))
  ;; σοφίτα
  (if (and (not has3) top)
    (kal:sg (strcat "Σοφίτα κάτω από κεκλιμένη στέγη, έως <b>" (kal:fmt (* 0.5 top) 2)
                    " τ.μ.</b> (1/2 του υποκείμενου ορόφου μαζί με τους τοίχους), δεν μετρά. Δεν είναι όροφος και δεν γίνεται ανεξάρτητη ιδιοκτησία."
                    (if (/= mode 1) " Με κεκλιμένη στέγη το ύψος προσαυξάνεται κατά 1,20 μ." "")
                    " (άρθ. 206 περ. ιδ)")))
  ;; υπόγειο
  (if (and (not has2) (> Sk 0.0))
    (kal:sg (strcat "Ένας υπόγειος όροφος βοηθητικής χρήσης έως <b>" (kal:fmt Sk 2)
                    " τ.μ.</b> (όσο η κάλυψη, οροφή έως 1,20 μ. από το έδαφος) δεν μετρά. Υπόγεια για στάθμευση, Η-Μ, νερό, ΑΠΕ ή πισίνα δεν μετρούν ανεξαρτήτως εμβαδού. (άρθ. 206 παρ. 6θ-ι)")))
  ;; υπόσκαφο
  (if (not has4)
    (kal:sg "Σε επικλινές γήπεδο: υπόσκαφο τμήμα (μία όψη, χωρίς ίχνος στην κάτοψη, προσβάσιμη στέγη) μετρά μόνο κατά 50% για κατοικία (εξαίρεση 20% για άλλες χρήσεις). (άρθ. 206 περ. κγ)"))
  ;; φωταγωγοί, αίθρια, εσοχές
  (kal:sg "Αίθρια, φωταγωγοί από 1,50 τ.μ., φρεάτια Η/Μ και επιφάνειες από εσοχές στο σώμα του κτιρίου δεν μετρούν — δεν μετρούν όμως ούτε για τον φωτισμό των κύριων χώρων. (άρθ. 206 παρ. 6γ, 6η)")
  ;; ΑμεΑ
  (kal:sg "ΑμεΑ: ο χώρος αναμονής ΑμεΑ μέσα στο κοινόχρηστο κλιμακοστάσιο περιλαμβάνεται στα 30 / 40 τ.μ. που δεν μετρούν, και οι κατασκευές για ΑμεΑ (ράμπες κ.λπ.) επιτρέπονται μέσα στις αποστάσεις Δ / δ. (άρθ. 206 παρ. 6δ, 211 παρ. 8)")
  ;; κάλυψη
  (if (> kpe (+ kp 0.001))
    (kal:sg (strcat "Κάλυψη: ισχύει η προσαύξηση έως 120 τ.μ. (χωρίς να ξεπερνά το 70%) — επιτρεπόμενη <b>" (kal:fz kpe) " %</b> αντί " (kal:fz kp) " %. (άρθ. 207)")))
  (if (and (> kpe 0.0) (> (- kpe pk) 0.5))
    (kal:sg (strcat "Κάλυψη: περιθώριο ακόμη <b>" (kal:fmt (- kpe pk) 2) " %</b> του οικοπέδου.")))
  ;; ύψος / αποστάσεις
  (if (= mode 1)
    (progn
      (cond
        ((and (> hg 8.5) (<= hg 10.0))
          (kal:sg (strcat "Με ύψος έως 8,50 μ. (σήμερα " (kal:fz hg) " μ.) το κτίριο γίνεται χαμηλό: Δ = 2,50 μ. σταθερό αντί 3 + 0,10Η, και ελεύθερη τοποθέτηση. (άρθ. 221)")))
        ((and (> hg 0.0) (<= hg 8.5))
          (kal:sg "Χαμηλό κτίριο (ύψος έως 8,50 μ.): απόσταση από πίσω και πλάγια όρια Δ = 2,50 μ. σταθερή. (άρθ. 221)")))
      (kal:sg "Κίνητρα για κτίριο σχεδόν μηδενικής κατανάλωσης και περιβαλλοντικής αναβάθμισης (προσαύξηση ΣΔ / ύψους): έλεγξε το ισχύον καθεστώς μετά τις αποφάσεις ΣτΕ πριν τα χρησιμοποιήσεις. (άρθ. 204, 222)")))
  (if (and (= mode 2) dmn (< dmn 15.0))
    (kal:sg "Εκτός σχεδίου: για κατοικία σε γήπεδο που υπήρχε στις 15.4.1981, οι πλάγιες αποστάσεις γίνονται 7,50 μ. αν δεν χωράει με 15 μ. — τότε πλάτος κτιρίου έως 10 μ. (άρθ. 251)"))
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
  (setq *kal-rep* nil bad (vl-string-search "ΥΠΕΡΒ" res))
  (kal:r "<!DOCTYPE html><html lang=el><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\">")
  (kal:r "<title>KALYPSI - Ανάλυση δόμησης</title><style>")
  (kal:r "body{font:18px/1.6 'Segoe UI',Arial,sans-serif;background:#fff;color:#1F2836;max-width:980px;margin:22px auto;padding:0 18px}")
  (kal:r "h1{font-size:28px;margin:0 0 4px}h2{font-size:22px;margin:30px 0 10px;padding-bottom:5px;border-bottom:3px solid #F26B21}h3{font-size:19px;margin:18px 0 6px}")
  (kal:r "table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #D9DDE4;padding:8px 11px;text-align:left;vertical-align:top}th{background:#F3F5F8}")
  (kal:r ".ok{color:#1A7F4B;font-weight:700}.no{color:#B42318;font-weight:700}.sub{color:#4A5563;font-size:16px}li{margin:9px 0}.res{font-size:24px;padding:12px 16px;border-radius:10px;background:#F3F5F8;display:inline-block}")
  (kal:r "</style></head><body>")
  (kal:r "<h1>KALYPSI — Διάγραμμα κάλυψης &amp; ανάλυση δόμησης</h1>")
  (kal:r (strcat "<div class=sub>HEXIS-APP · " (kal:today) " · " (kal:modetxt mode) (if (/= kaek "") (strcat " · ΚΑΕΚ " kaek) "") "</div>"))
  (kal:r (strcat "<h2>Αποτέλεσμα</h2><div class=\"res " (if bad "no" "ok") "\">" res "</div>"))
  ;; πίνακας
  (kal:r "<h2>Πίνακας κάλυψης - δόμησης</h2><table>")
  (foreach r rows
    (if (cadr r)
      (kal:tr (list (nth 0 r) (nth 1 r) (nth 2 r)) (if (= (nth 1 r) "ΕΠΙΤΡΕΠΟΜΕΝΑ") "th" "td"))))
  (kal:r "</table>")
  ;; ανάλυση ΣΔ
  (kal:r "<h2>Ανάλυση συντελεστή δόμησης ανά επίπεδο (άρθ. 206)</h2>")
  (foreach r rl
    (kal:r (strcat "<h3>" (car r) " — " (kal:typetxt (nth 1 r) (nth 2 r)) "</h3><table>"))
    (kal:tr (list "Χώρος" "Εμβαδόν" "Δεν μετρά" "Κανόνας") "th")
    (kal:tr (list "Μικτό περίγραμμα" (strcat (kal:fmt (nth 3 r) 2) " τ.μ.") "" "") "td")
    (foreach s (nth 9 r)
      (kal:tr (list (kal:codetxt (car s)) (strcat (kal:fmt (cadr s) 2) " τ.μ.")
                    (if (member (car s) (list "H" "X")) "βλ. όριο 40%" (strcat (kal:fmt (caddr s) 2) " τ.μ."))
                    (nth 3 s)) "td"))
    (kal:tr (list "<b>Μετρά στον ΣΔ</b>" (strcat "<b>" (kal:fmt (nth 7 r) 2) " τ.μ.</b>") "" (nth 8 r)) "td")
    (kal:r "</table>"))
  (kal:r (strcat "<p>Ανοικτοί ημιυπαίθριοι + εξώστες: <b>" (kal:fmt HX 2) " τ.μ.</b> (ημιυπαίθριοι " (kal:fmt Hh 2) " τ.μ.)"
                 (if allow
                   (strcat " — όριο 40% της επιτρεπόμενης δόμησης = " (kal:fmt lim40 2) " τ.μ., ημιυπαίθριοι έως 20% = " (kal:fmt limH 2)
                           " τ.μ. — μετρούν <b>" (kal:fmt HXc 2) " τ.μ.</b>")
                   " — το όριο 40% δεν ελέγχθηκε (λείπει ΣΔ / μέγιστη δόμηση)")
                 " (άρθ. 206 παρ. 5, 6α)</p>"))
  ;; προτάσεις
  (kal:r "<h2>Προτάσεις εξοικονόμησης δόμησης</h2><ol>")
  (foreach s *kal-sug* (kal:r (strcat "<li>" s "</li>")))
  (kal:r "</ol>")
  ;; αποστάσεις & ύψος
  (kal:r "<h2>Αποστάσεις &amp; ύψος</h2><ul>")
  (if dres
    (progn
      (setq k 1)
      (foreach x (caddr dres)
        (kal:r (strcat "<li>Πλευρά " (itoa k) ": " (if (< x 0.05) "σε επαφή" (strcat (kal:fmt x 2) " μ."))
                       (if (and dreq (> x 0.05) (< x (- dreq 0.005))) (strcat " <span class=no>— κάτω από " (if (= mode 2) "το όριο" "δ") "</span>") "")
                       "</li>"))
        (setq k (1+ k)))))
  (if (= mode 1)
    (progn
      (if (and dreq Dbig)
        (kal:r (strcat "<li>Με Η = " (kal:fz hg) " μ.: δ = 2,50 + 0,05Η = <b>" (kal:fmt dreq 2) " μ.</b>, Δ = 3 + 0,10Η = <b>" (kal:fmt Dbig 2) " μ.</b>"
                       (if (<= hg 8.5) " — χαμηλό κτίριο: Δ = 2,50 μ. σταθερό (άρθ. 221)" "") " (άρθ. 198)</li>")))
      (kal:r "<li>Η είναι το ύψος στην πλήρη εξάντληση του ΣΔ, όπως φαίνεται στο διάγραμμα κάλυψης — όχι το ύψος που χτίζεται τώρα. (άρθ. 198)</li>")
      (kal:r "<li>Πίσω όριο: Δ. Πλάγια: δ ή επαφή, ανάλογα με το τι υπάρχει στο όμορο — η πρόσοψη ακολουθεί την οικοδομική γραμμή. (άρθ. 209)</li>")))
  (if (= mode 2)
    (kal:r "<li>Εκτός σχεδίου: αποστάσεις από τα όρια τουλάχιστον 15 μ., ύψος 7,50 μ. (+1,20 μ. με κεκλιμένη στέγη), έως 2 όροφοι, ενιαίο κτίριο. (άρθ. 251)</li>"))
  (if hmax (kal:r (strcat "<li>Μέγιστο ύψος: " (kal:fz hmax) " μ. — σχέδιο: Η = " (if (> hg 0.0) (kal:fz hg) "-") " μ." (if (= mode 1) " (άρθ. 210: από τον επιτρεπόμενο ΣΔ)" "") "</li>")))
  (kal:r "</ul>")
  ;; Κτιριοδομικός
  (kal:r "<h2>Κτιριοδομικός Κανονισμός — έλεγχοι στη μελέτη</h2><ul>")
  (if trees (kal:r (strcat "<li>Φύτευση: τουλάχιστον <b>" (itoa trees) " δέντρα</b> (1 ανά 200 τ.μ. οικοπέδου, +1 αν το υπόλοιπο είναι από 100 τ.μ.)· στο προκήπιο 1 ανά 25 τ.μ. (άρθ. 19)</li>")))
  (kal:r "<li>Ελεύθερο ύψος: κύριοι χώροι &ge; 2,50 μ., βοηθητικοί &ge; 2,20 μ., κάτω από δοκούς / Η-Μ &ge; 2,00 μ. (άρθ. 7)</li>")
  (kal:r (strcat "<li>Κλίμακες: ελεύθερο πλάτος 1,20 μ." (if (<= nab 3) " — 0,90 μ. σε κατοικίες έως 3 ορόφων, 0,60 μ. εσωτερική σκάλα ενιαίας κατοικίας" "")
                 "· βαθμίδα 0,13-0,18 μ., πάτημα &ge; 0,28 μ., 2υ+π = 0,60-0,66 μ.· ελεύθερο ύψος &ge; 2,20 μ.· πόρτα όχι κατευθείαν σε βαθμίδα (άρθ. 11)</li>"))
  (kal:r "<li>Στηθαία &ge; 1,00 μ. όπου το δάπεδο είναι πάνω από 1,00 μ. από τον περιβάλλοντα χώρο· διάκενα έως 0,25 μ. κατακόρυφα / 0,15 μ. οριζόντια (άρθ. 13)</li>")
  (kal:r "<li>Φυσικός φωτισμός: ανοίγματα &ge; 10% του καθαρού εμβαδού κάθε κύριου χώρου (έμμεσος 15%)· αερισμός: ανοιγόμενα &ge; 5% (έμμεσος 7%)· κλειστό κλιμακοστάσιο: άνοιγμα &ge; 0,50 τ.μ. ανά όροφο (άρθ. 20-21)</li>")
  (kal:r "<li>Προσπέλαση: αν η είσοδος του κτιρίου απέχει πάνω από 30 μ. από την είσοδο του οικοπέδου — πλάτος &ge; 3,50 μ., ύψος &ge; 3,00 μ., κλίση &le; 7% στα πρώτα 5 μ. (άρθ. 18)</li>")
  (kal:r "</ul>")
  ;; ΑμεΑ
  (kal:r "<h2>Προσβασιμότητα ΑμεΑ</h2><ul>")
  (kal:r "<li>Νέα κτίρια: προσβάσιμες είσοδοι και κοινόχρηστοι χώροι, οριζόντια και κατακόρυφη προσβασιμότητα (ανελκυστήρας / ράμπες) — άρθ. 223 ν.5306/2026 (ΝΟΚ 26), Κτιριοδομικός άρθ. 25, «Σχεδιάζοντας για Όλους»</li>")
  (kal:r "<li>Ράμπες &le; 5% (έως 8% σε μικρά μήκη) με πλατύσκαλα και χειρολισθήρες (ΥΑ ΥΠΕΝ/ΔΜΕΑΑΠ/124964/1561/2022)</li>")
  (kal:r "<li>Ανελκυστήρας: πότε είναι υποχρεωτικός και πότε προσβάσιμος ΑμεΑ — Κτιριοδομικός άρθ. 30</li>")
  (kal:r "<li>Αξιοποίηση: ο χώρος αναμονής ΑμεΑ στο κοινόχρηστο κλιμακοστάσιο είναι μέσα στα 30 / 40 τ.μ. που δεν μετρούν· κατασκευές για ΑμεΑ επιτρέπονται μέσα στις αποστάσεις Δ / δ (άρθ. 206 παρ. 6δ, 211 παρ. 8)</li>")
  (kal:r "</ul>")
  ;; πηγές
  (kal:r "<h2>Πηγές</h2><ul class=sub>")
  (kal:r "<li>ν. 5306/2026 «Κώδικας Χωροταξίας και Πολεοδομίας» (ΦΕΚ Α' 88/08.06.2026) — άρθ. 197, 198, 204, 206, 207, 209, 210, 211, 221, 222, 223, 251 (ΝΟΚ ν. 4067/2012 κωδικοποιημένος στα άρθ. 195-225)</li>")
  (kal:r "<li>Κτιριοδομικός Κανονισμός — ΥΑ ΥΠΕΝ/ΔΑΟΚΑ/66006/2360 (ΦΕΚ Β' 3985/2023), όπως τροποποιήθηκε (ΦΕΚ Β' 6995/2025) — άρθ. 7, 11, 13, 18, 19, 20, 21, 25, 30</li>")
  (kal:r "<li>Προδιαγραφές προσβασιμότητας — ΥΑ ΥΠΕΝ/ΔΜΕΑΑΠ/124964/1561/2022 · Οδηγίες «Σχεδιάζοντας για Όλους»</li>")
  (kal:r (strcat "<li>" (if d "Επιτρεπόμενοι όροι από το HEXIS-APP: Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ), Ελληνικό Κτηματολόγιο" "Επιτρεπόμενοι όροι: χειροκίνητη καταχώριση") "</li>"))
  (kal:r "<li>Οι ίδιοι κανόνες με την εφαρμογή Νομοθεσία του HEXIS-APP (hexis-app.gr/nomothesia.html)</li></ul>")
  (kal:r "<p class=sub>HEXIS-APP · hexis-app.gr · powered by BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε. — Ενημερωτικό εργαλείο μελέτης· δεν υποκαθιστά τον έλεγχο της ΥΔΟΜ.</p></body></html>"))

;; ===================================================================
(defun c:KALYPSI (/ *error* cfg sc mode kp sd maxd dmin v th st kaek d ring Ekt sa plot pv E
                    cov covv covin Sk pk levels cr Dom rl HX Hh allow lim40 limH HXc kpe hmax hg nab
                    low dreq Dbig dres dmn dnw trees okK okD okKD okA okHt okY okHH fails res rows p0 y
                    rp path k tt)
  (defun *error* (msg)
    (kal:end)
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*EXIT*,*BREAK*")))
      (princ (strcat "\nΣφάλμα: " msg)))
    (princ))
  (kal:begin)
  (kal:setup)
  (setq cfg (kal:load) sc (nth 0 cfg) mode (fix (nth 1 cfg)) kp (nth 2 cfg)
        sd (nth 3 cfg) maxd (nth 4 cfg) dmin (nth 5 cfg))
  (if (not (member mode (list 1 2 3))) (setq mode 2))
  (setq st (kal:sget))

  ;; ---- 1. επιτρεπόμενα: ΚΑΕΚ -> HEXIS-APP ----
  (setq kaek (if st (car st) ""))
  (setq v (getstring (strcat "\nΚΑΕΚ για τους όρους από HEXIS-APP"
                             (if (/= kaek "") (strcat " <" kaek ">") "") "  (0 = χωρίς ΚΑΕΚ): ")))
  (cond ((= v "0") (setq kaek "")) ((/= v "") (setq kaek (strcase (vl-string-trim " " v)))))
  (if (/= kaek "") (setq d (kal:fetch kaek)))
  (if d
    (progn
      (setq sa (hx:v d "KATASTASI"))
      (setq mode (cond ((= sa "sxedio") 1) ((= sa "oikismos") 3) (T 2)))
      (setq kp (atof (hx:v d "KALYPSI")) sd (atof (hx:v d "SD")) maxd (atof (hx:v d "MAX_DOMISI"))
            Ekt (atof (hx:v d "EMBADON")) dmin (if (= mode 2) 15.0 0.0)
            ring (kal:ring (hx:v d "RING"))))
    (if (/= kaek "") (progn (princ "\nΟι όροι δεν ήρθαν - συνεχίζεις με χειροκίνητους όρους.") (setq kaek ""))))
  (princ (strcat "\n" (if d "Όροι HEXIS-APP" "Όροι") ":  " (kal:modetxt mode)
                 "  |  Κάλυψη " (if (> kp 0.0) (strcat (kal:fz kp) " %") "-")
                 "  |  Σ.Δ. " (if (> sd 0.0) (kal:fz sd) "-")
                 "  |  Μέγ. δόμηση " (if (> maxd 0.0) (strcat (kal:fmt maxd 2) " τ.μ.") "-")
                 "  |  Απόσταση από όρια " (if (> dmin 0.0) (strcat (kal:fz dmin) " μ.") "-")
                 "  |  Κλίμακα 1:" (itoa (fix sc))))
  (initget 6)
  (if (= (getint "\nΑλλαγή;  1 = Ναι,  Enter = Όχι: ") 1)
    (progn
      (initget 6)
      (if (setq v (getint (strcat "\nΚλίμακα σχεδίου 1:<" (itoa (fix sc)) ">: "))) (setq sc (float v)))
      (initget 6)
      (setq v (getint (strcat "\nΠεριοχή:  1 = Εντός σχεδίου,  2 = Εκτός σχεδίου,  3 = Οικισμός <" (itoa mode) ">: ")))
      (if (member v (list 1 2 3)) (setq mode v))
      (setq kp (kal:askr "Επιτρεπόμενη κάλυψη %" kp)
            sd (kal:askr "Συντελεστής δόμησης (0 = χωρίς)" sd)
            maxd (kal:askr "Μέγιστη δόμηση τ.μ. (0 = χωρίς όριο)" maxd)
            dmin (kal:askr "Ελάχιστη απόσταση από τα όρια μ. (0 = χωρίς έλεγχο)" dmin))))
  (kal:save (list sc (float mode) kp sd maxd dmin))
  (setq th (/ (* 2.5 sc) 1000.0))

  ;; ---- 2. οικόπεδο ----
  (setq plot (if st (kal:ename (nth 1 st))))
  (if (null plot) (setq plot (kal:findplot ring)))
  (if plot
    (progn
      (redraw plot 3)
      (setq v (getint (strcat "\nΟικόπεδο: βρέθηκε, Ε = " (kal:fmt (kal:area (kal:verts plot)) 2)
                              " τ.μ. (επισημασμένο).  Enter = σωστό,  1 = άλλο: ")))
      (redraw plot 4)
      (if (= v 1) (setq plot nil))))
  (while (null plot) (setq plot (kal:askplot ring)))
  (setq pv (kal:verts plot) E (kal:area pv))
  (if (> E 2e7) (progn (princ "\nΤο σχέδιο φαίνεται σε χιλιοστά - το KALYPSI δουλεύει σε μέτρα.") (exit)))
  (if (and Ekt (> Ekt 0.0) (> (abs (- E Ekt)) (* 0.02 Ekt)))
    (princ (strcat "\nΠροσοχή: εμβαδόν σχεδίου " (kal:fmt E 2) " τ.μ. - Κτηματολόγιο " (kal:fmt Ekt 2) " τ.μ.")))

  ;; ---- 3. κάλυψη ----
  (setq cov (if st (kal:enames (nth 2 st))))
  (if (null cov) (setq cov (kal:findcov plot pv)))
  (setq cov (kal:confirm cov "Κάλυψη" "Παράθυρο γύρω από το κτίριο στο τοπογραφικό"))
  (while (null cov)
    (setq cov (kal:confirm nil "Κάλυψη" "Παράθυρο γύρω από το κτίριο στο τοπογραφικό")))
  (setq covv (mapcar 'kal:verts cov) Sk (kal:sumarea cov) pk (* 100.0 (/ Sk E)))
  (princ (strcat "\nΚάλυψη: " (kal:fmt Sk 2) " τ.μ.  (" (kal:fmt pk 2) " %)"))

  ;; ---- 4. επίπεδα και χώροι ----
  (setq levels (if st (kal:lvalid (nth 4 st))))
  (if levels
    (progn
      (foreach lv levels
        (princ (strcat "\n   " (car lv) " (" (kal:typetxt (nth 1 lv) (nth 2 lv)) "): μικτό "
                       (kal:fmt (kal:sumarea (nth 3 lv)) 2) " τ.μ., " (itoa (length (nth 4 lv))) " χώροι")))
      (initget 6)
      (setq v (getint "\nΕπίπεδα όπως πριν.  Enter = σωστά,  1 = από την αρχή,  2 = προσθήκη επιπέδου: "))
      (cond ((= v 1) (setq levels (kal:asklevels nil)))
            ((= v 2) (setq levels (kal:asklevels levels)))))
    (setq levels (kal:asklevels nil)))

  ;; ---- 5. ύψος Η (άρθ. 198: ύψος εξάντλησης του ΣΔ) ----
  (setq hmax (cond ((and d (> (atof (hx:v d "YPSOS")) 0.0)) (atof (hx:v d "YPSOS")))
                   ((= mode 1) (kal:hmax210 sd))
                   (T 7.5)))
  (setq hg (if (and st (> (nth 5 st) 0.0)) (nth 5 st) hmax))
  (initget 6)
  (setq v (getreal (strcat "\nΎψος Η του κτιρίου σε μ. (μέγιστο, με εξαντλημένο ΣΔ - άρθ. 198)"
                           (if hg (strcat " <" (kal:fz hg) ">") "") ": ")))
  (if v (setq hg v))
  (if (null hg) (setq hg 0.0))
  (kal:state kaek plot cov (if st (nth 3 st)) levels hg)

  ;; ---- 6. κανόνες ----
  (setq cr (kal:calc levels Sk) Dom (nth 0 cr) rl (nth 1 cr) HX (nth 2 cr) Hh (nth 3 cr))
  (if (> sd 0.0) (setq allow (* E sd)))
  (if (> maxd 0.0) (setq allow (if allow (min allow maxd) maxd)))
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

  ;; ---- 7. σχεδίαση ----
  (kal:clearout)
  (foreach x covv
    (kal:hatch x (/ (* 2.0 sc) 1000.0))
    (setq v (kal:cent x))
    (kal:txt (list (car v) (+ (cadr v) (* th 0.8))) th "ΚΑΛΥΨΗ" 0.0 T "KAL_KEIMENA")
    (kal:txt (list (car v) (- (cadr v) (* th 0.8))) th (strcat "Ε=" (kal:fmt (kal:area x) 2) " τ.μ.") 0.0 T "KAL_KEIMENA")
    (if (kal:inside x pv) (setq covin (cons x covin))))
  (if covin (setq dres (kal:dists pv covin th dreq) dmn (car dres) dnw (cadr dres)))

  ;; ---- 8. έλεγχος ----
  (setq okK  (or (<= kpe 0.0) (<= pk (+ kpe 1e-6)))
        okD  (or (null allow) (<= Dom (+ allow 0.005)))
        okKD (or (/= mode 2) (null allow) (<= Sk (+ allow 0.005)))
        okA  (or (/= mode 2) (<= dmin 0.0) (null dmn) (>= dmn (- dmin 0.005)))
        okHt (or (null hmax) (<= hg 0.0) (<= hg (+ hmax 0.005)))
        okY  (or (= mode 1) (<= nab 2))
        okHH (or (null allow) (<= Hh (+ limH 0.005))))
  (setq fails nil)
  (if (not okK)  (setq fails (cons "ΚΑΛΥΨΗ" fails)))
  (if (not okKD) (setq fails (cons "ΚΑΛΥΨΗ > ΔΟΜΗΣΗ" fails)))
  (if (not okD)  (setq fails (cons "ΔΟΜΗΣΗ" fails)))
  (if (not okHH) (setq fails (cons "ΗΜΙΥΠΑΙΘΡΙΟΙ 20%" fails)))
  (if (not okA)  (setq fails (cons "ΑΠΟΣΤΑΣΕΙΣ" fails)))
  (if (not okHt) (setq fails (cons "ΥΨΟΣ" fails)))
  (if (not okY)  (setq fails (cons "ΟΡΟΦΟΙ" fails)))
  (setq res (if fails
              (strcat "ΥΠΕΡΒΑΣΗ: " (kal:join (reverse fails) ", "))
              (if (and dnw (> dnw 0) (= mode 1)) "ΕΝΤΑΞΕΙ - έλεγξε αποστάσεις" "ΕΝΤΑΞΕΙ")))

  ;; ---- 9. πίνακας στο σχέδιο ----
  (setq rows
    (list
      (list "ΠΙΝΑΚΑΣ ΚΑΛΥΨΗΣ - ΔΟΜΗΣΗΣ" nil nil 1.3)
      (list (strcat (kal:modetxt mode)
                    (if (/= kaek "") (strcat "  -  ΚΑΕΚ " kaek) "")
                    (if (and d (/= (hx:v d "OT") "")) (strcat "  -  Ο.Τ. " (hx:v d "OT")) ""))
            nil nil 0.9)
      (list "" "ΕΠΙΤΡΕΠΟΜΕΝΑ" "ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΑ" 1.0)
      (list "Εμβαδόν οικοπέδου" (if (and Ekt (> Ekt 0.0)) (strcat "Κτηματολόγιο " (kal:fmt Ekt 2) " τ.μ.") "-")
            (strcat (kal:fmt E 2) " τ.μ.") 1.0)
      (list "Κάλυψη" (if (> kpe 0.0) (strcat (kal:fz kpe) " %" (if (> kpe (+ kp 0.001)) " (άρθ. 207)" "")) "-")
            (strcat (kal:fmt Sk 2) " τ.μ.  (" (kal:fmt pk 2) " %)") 1.0)
      (list "Συντελεστής δόμησης" (if (> sd 0.0) (kal:fz sd) "-") (kal:fmt (/ Dom E) 3) 1.0)
      (list "Δόμηση (σύνολο)" (if allow (strcat (kal:fmt allow 2) " τ.μ.") "-") (strcat (kal:fmt Dom 2) " τ.μ.") 1.0)))
  (foreach r rl
    (setq rows (append rows (list (list (strcat "   " (car r) (if (/= (nth 1 r) 1) (strcat " (" (kal:typetxt (nth 1 r) (nth 2 r)) ")") ""))
                                        "" (strcat (kal:fmt (nth 7 r) 2) " τ.μ.") 0.9))))
    (setq tt (+ (nth 6 r) (nth 4 r) (nth 5 r)))
    (if (> (abs (- tt (nth 7 r))) 0.005)
      (setq rows (append rows (list (list (strcat "      σύνολο " (kal:fmt tt 2) " - δεν μετρούν " (kal:fmt (- tt (nth 7 r)) 2) " τ.μ.")
                                          "" "" 0.8))))))
  (if (or (> HX 0.0) allow)
    (setq rows (append rows (list (list "Ανοικτοί ημιυπαίθριοι + εξώστες"
                                        (if allow (strcat "έως " (kal:fmt lim40 2) " τ.μ. (40%)") "-")
                                        (strcat (kal:fmt HX 2) " τ.μ." (if (> HXc 0.005) (strcat " - μετρούν " (kal:fmt HXc 2)) ""))
                                        1.0)))))
  (if (or hmax (> hg 0.0))
    (setq rows (append rows (list (list "Μέγιστο ύψος"
                                        (if hmax (strcat (kal:fz hmax) " μ." (if (/= mode 1) " (+1,20 με στέγη)" "")) "-")
                                        (if (> hg 0.0) (strcat (kal:fz hg) " μ.") "-") 1.0)))))
  (if (/= mode 1)
    (setq rows (append rows (list (list "Όροφοι" "2" (itoa nab) 1.0)))))
  (if (or dreq dmn)
    (setq rows (append rows (list (list "Ελάχ. απόσταση από όρια"
                                        (cond ((= mode 2) (if dreq (strcat (kal:fmt dreq 2) " μ.") "-"))
                                              ((and dreq Dbig) (strcat "δ=" (kal:fmt dreq 2) " / Δ=" (kal:fmt Dbig 2) " μ."))
                                              (T "-"))
                                        (if dmn (strcat (kal:fmt dmn 2) " μ.") "-") 1.0)))))
  (if trees
    (setq rows (append rows (list (list "Δέντρα (Κτιριοδομικός άρθ. 19)" (strcat "τουλάχιστον " (itoa trees)) "-" 1.0)))))
  (setq rows (append rows (list (list "ΕΛΕΓΧΟΣ" "" res 1.3))))

  (setq p0 (getpoint (strcat "\nΣημείο πίνακα (πάνω αριστερή γωνία)" (if (and st (nth 3 st)) " <ίδιο με πριν>" "") ": ")))
  (if (and (null p0) st) (setq p0 (nth 3 st)))
  (if p0
    (progn
      (setq y (kal:table p0 rows th))
      (kal:txt (list (car p0) (- y (* th 1.2))) (* th 0.7)
               (strcat "Κανόνες: ν.5306/2026 (άρθ. 198, 206, 207, 210, 221, 251)"
                       (if d " - Επιτρεπόμενα: HEXIS-APP (Ενιαίος Ψηφιακός Χάρτης, Κτηματολόγιο) - ενημερωτικό" ""))
               0.0 nil "KAL_PINAKAS")
      (kal:state kaek plot cov p0 levels hg)))

  ;; ---- 10. προτάσεις & αναφορά ----
  (kal:suggest mode kp kpe pk E Sk Dom allow lim40 limH HX Hh HXc rl hg dmn nab)
  (kal:report rows rl kaek mode E Sk pk allow lim40 limH HX Hh HXc hg hmax dreq Dbig dres trees nab res d)
  (setq rp (strcat (getvar "DWGPREFIX") "KALYPSI_" (vl-filename-base (getvar "DWGNAME")) ".html"))
  (setq path (kal:writerep rp))
  (if (null path) (setq path (kal:writerep (strcat (getvar "TEMPPREFIX") "KALYPSI_anafora.html"))))

  (princ (strcat "\n\nΚάλυψη " (kal:fmt pk 2) " %  |  Δόμηση " (kal:fmt Dom 2) " τ.μ."
                 (if allow (strcat " από " (kal:fmt allow 2)) "") "  |  ΕΛΕΓΧΟΣ: " res))
  (setq k 0)
  (foreach s *kal-sug*
    (if (< k 3) (princ (strcat "\n  • " (kal:strip s))))
    (setq k (1+ k)))
  (if path
    (progn
      (princ (strcat "\nΑναφορά με όλες τις προτάσεις (" (itoa (length *kal-sug*)) "): " path))
      (kal:open path)))
  (kal:end)
  (princ))

(princ "\nKALYPSI v2.0 - HEXIS-APP: φορτώθηκε. Εντολή: KALYPSI")
(princ)
