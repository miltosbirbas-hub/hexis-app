;;; =====================================================================
;;;  XEROLITHIA.LSP  -  HEXIS-APP  (hexis-app.gr)
;;;  Xerolithies & Mantres se katopsi (i opsi) kata mikos grammis
;;;  AutoCAD / progeCAD / ZWCAD / BricsCAD / GstarCAD  (kathari AutoLISP,
;;;  xoris VLA/ActiveX - mono entmake, opote doulevei pantou)
;;;
;;;  Entoles:
;;;    XEROLITHIA  (syntomi: XER) - xerolithia me akanonistes petres
;;;    MANTRA      (syntomi: MAN) - mantra xoris kolonakia, apli i petrini
;;;
;;;  Diadromi: LINE, LWPOLYLINE (kai me toxa), ARC, CIRCLE
;;;            i simeia me klik [Simeia].
;;;  Oi rythmiseis kratiountai kai meta to kleisimo tou CAD.
;;;  powered by BRB Development KATASKEVASTIKI MON. I.K.E.
;;; =====================================================================

;;; ---------- tyxaioi arithmoi (Park-Miller, me reals - xoris overflow) --
(defun xl:seed ()
  (setq *xl:seed* (+ 1.0 (rem (* (getvar "DATE") 86400000.0) 2147483645.0))))
(defun xl:rnd ()
  (if (not *xl:seed*) (xl:seed))
  (setq *xl:seed* (rem (* 16807.0 *xl:seed*) 2147483647.0))
  (/ *xl:seed* 2147483647.0))
(defun xl:rr (a b) (+ a (* (- b a) (xl:rnd))))

;;; ---------- dianysmata 2D ---------------------------------------------
(defun xl:p2 (p) (list (float (car p)) (float (cadr p))))
(defun xl:add (a b) (list (+ (car a) (car b)) (+ (cadr a) (cadr b))))
(defun xl:sub (a b) (list (- (car a) (car b)) (- (cadr a) (cadr b))))
(defun xl:mul (a k) (list (* (car a) k) (* (cadr a) k)))
(defun xl:dot (a b) (+ (* (car a) (car b)) (* (cadr a) (cadr b))))
(defun xl:len (a) (sqrt (xl:dot a a)))
(defun xl:unit (a / l)
  (setq l (xl:len a))
  (if (> l 1e-12) (xl:mul a (/ 1.0 l)) (list 1.0 0.0)))
(defun xl:nrm (d) (list (- (cadr d)) (car d)))          ; aristero katheto
(defun xl:lerp (a b f) (xl:add a (xl:mul (xl:sub b a) f)))

;;; ---------- rythmiseis (monimes, getenv/setenv) ------------------------
(defun xl:getn (k d / v)
  (setq v (getenv (strcat "HEXIS_" k)))
  (if (and v (/= v "") (> (atof v) -1e-9)) (atof v) d))
(defun xl:setn (k v) (setenv (strcat "HEXIS_" k) (rtos v 2 4)))
(defun xl:gets (k d / v)
  (setq v (getenv (strcat "HEXIS_" k)))
  (if (and v (/= v "")) v d))
(defun xl:sets (k v) (setenv (strcat "HEXIS_" k) v))

(defun xl:askd (msg def bits / v)
  (initget bits)
  (setq v (getdist (strcat "\n" msg " <" (rtos def 2 3) ">: ")))
  (if v v def))
(defun xl:askk (msg kws def / v)
  (initget kws)
  (setq v (getkword (strcat "\n" msg " <" def ">: ")))
  (if v v def))

;;; ---------- layers, polylines -----------------------------------------
(defun xl:layer (nm col)
  (if (not (tblsearch "LAYER" nm))
    (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord")
                   '(100 . "AcDbLayerTableRecord") (cons 2 nm) '(70 . 0)
                   (cons 62 col) '(6 . "Continuous")))))

(defun xl:pline (pts cl lay)
  (if (> (length pts) 1)
    (entmake
      (append
        (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lay)
              '(100 . "AcDbPolyline") (cons 90 (length pts))
              (cons 70 (if cl 1 0)) '(43 . 0.0))
        (mapcar '(lambda (p) (cons 10 p)) pts)))))

;;; ---------- undo / sfalmata -------------------------------------------
(defun xl:err (msg)
  (if (and msg
           (not (member (strcase msg T)
                        '("function cancelled" "quit / exit abort" "console break"))))
    (princ (strcat "\nHEXIS: " msg)))
  (if command-s (command-s "_.UNDO" "_END") (command "_.UNDO" "_END"))
  (if *xl:ce* (setvar "CMDECHO" *xl:ce*))
  (setq *error* *xl:olderr*)
  (princ))
(defun xl:begin ()
  (setq *xl:olderr* *error* *error* xl:err *xl:ce* (getvar "CMDECHO"))
  (setvar "CMDECHO" 0)
  (command "_.UNDO" "_BEGIN")
  (xl:seed))
(defun xl:end ()
  (command "_.UNDO" "_END")
  (setvar "CMDECHO" *xl:ce*)
  (setq *error* *xl:olderr*))

;;; ---------- diavasma diadromis ----------------------------------------
;; simeia toxou apo bulge (xoris to p1, me to p2), vima 5 moires
(defun xl:bulgepts (p1 p2 b / th d r c a1 n i res)
  (if (< (abs b) 1e-9)
    (list p2)
    (progn
      (setq th (* 4.0 (atan b))
            d  (distance p1 p2)
            r  (/ d (* 2.0 (sin (/ th 2.0))))
            c  (polar p1 (+ (angle p1 p2) (- (/ pi 2.0) (/ th 2.0))) r)
            a1 (angle c p1)
            n  (max 2 (fix (+ 0.999 (/ (abs th) (/ pi 36.0)))))
            i  1)
      (while (< i n)
        (setq res (cons (xl:p2 (polar c (+ a1 (* th (/ (float i) n))) (abs r))) res)
              i (1+ i)))
      (reverse (cons p2 res)))))

(defun xl:lwpts (en / ed el cl pts bul flip res i n z)
  (setq ed (entget en)
        el (cond ((cdr (assoc 38 ed))) (0.0))
        cl (= 1 (logand 1 (cdr (assoc 70 ed))))
        z  (cdr (assoc 210 ed))
        flip (and z (< (caddr z) 0.0)))
  (foreach g ed
    (cond ((= (car g) 10)
           (setq pts (cons (xl:p2 (trans (list (cadr g) (caddr g) el) en 0)) pts)
                 bul (cons 0.0 bul)))
          ((= (car g) 42)
           (setq bul (cons (if flip (- (cdr g)) (cdr g)) (cdr bul))))))
  (setq pts (reverse pts) bul (reverse bul) n (length pts) i 0 res (list (car pts)))
  (while (< i (1- n))
    (setq res (append res (xl:bulgepts (nth i pts) (nth (1+ i) pts) (nth i bul))) i (1+ i)))
  (if cl (setq res (append res (xl:bulgepts (last pts) (car pts) (last bul)))))
  (list res cl))

(defun xl:arcpts (en a0 sw cl / ed c r z n i res)
  (setq ed (entget en) c (cdr (assoc 10 ed)) r (cdr (assoc 40 ed))
        n (max 2 (fix (+ 0.999 (/ sw (/ pi 36.0))))) i 0)
  (while (<= i n)
    (setq res (cons (xl:p2 (trans (polar c (+ a0 (* sw (/ (float i) n))) r) en 0)) res)
          i (1+ i)))
  (list (reverse res) cl))

(defun xl:pickpts ( / p q pts cl go)
  (setq p (getpoint "\nProto simeio: "))
  (if p
    (progn
      (setq pts (list p) go T)
      (while go
        (initget "Kleisto")
        (setq q (getpoint p "\nEpomeno simeio [Kleisto] <Telos>: "))
        (cond ((= q "Kleisto") (setq cl T go nil))
              (q (grdraw p q 1 1) (setq pts (cons q pts) p q))
              (T (setq go nil))))
      (redraw)
      (list (mapcar '(lambda (x) (xl:p2 (trans x 1 0))) (reverse pts)) cl))))

;; epistrefei (pts closed), i to keyword, i nil
(defun xl:getpath (kws / es en typ ed a0 a1 sw done res)
  (while (not done)
    (setvar "ERRNO" 0)
    (initget (strcat kws " Simeia"))
    (setq es (entsel "\nEpilexte LINE/PLINE/ARC/CIRCLE i [Rythmiseis/Simeia] <Simeia>: "))
    (cond
      ((and (null es) (= (getvar "ERRNO") 7)) (princ "\nDen epilexthike tipota."))
      ((null es) (setq res (xl:pickpts) done T))
      ((= es "Simeia") (setq res (xl:pickpts) done T))
      ((= (type es) 'STR) (setq res es done T))
      (T
       (setq en (car es) ed (entget en) typ (cdr (assoc 0 ed)))
       (cond
         ((= typ "LWPOLYLINE") (setq res (xl:lwpts en) done T))
         ((= typ "LINE")
          (setq res (list (list (xl:p2 (cdr (assoc 10 ed))) (xl:p2 (cdr (assoc 11 ed)))) nil)
                done T))
         ((= typ "ARC")
          (setq a0 (cdr (assoc 50 ed)) a1 (cdr (assoc 51 ed)) sw (- a1 a0))
          (if (<= sw 0.0) (setq sw (+ sw (* 2.0 pi))))
          (setq res (xl:arcpts en a0 sw nil) done T))
         ((= typ "CIRCLE") (setq res (xl:arcpts en 0.0 (* 2.0 pi) T) done T))
         (T (princ (strcat "\n" typ " den ypostirizetai - LINE/LWPOLYLINE/ARC/CIRCLE.")))))))
  res)

;; katharismos diplwn simeion, kleisimo
(defun xl:clean (path / pts cl res)
  (setq pts (car path) cl (cadr path))
  (foreach p pts
    (if (or (null res) (> (distance p (car res)) 1e-6)) (setq res (cons p res))))
  (setq res (reverse res))
  (if (and (> (length res) 2) (< (distance (car res) (last res)) 1e-6)) (setq cl T))
  (if (and cl (> (distance (car res) (last res)) 1e-6))
    (setq res (append res (list (car res)))))
  (if (>= (length res) 2) (list res cl)))

;;; ---------- gewmetria: miter kai "runs" -------------------------------
;; dianysma miter: simeio offset = P + M*o  (o>0 aristera tis poreias)
(defun xl:miter (d1 d2 / n1 n2 m c)
  (cond ((null d1) (xl:nrm d2))
        ((null d2) (xl:nrm d1))
        (T (setq n1 (xl:nrm d1) n2 (xl:nrm d2) m (xl:add n1 n2))
           (if (< (xl:len m) 1e-6)
             n2
             (progn (setq m (xl:unit m) c (xl:dot m n1))
                    (if (< c 0.25) (setq c 0.25))
                    (xl:mul m (/ 1.0 c)))))))

;; spaei ti diadromi se "runs" stis aixmires gwnies (>20 moires).
;; run = lista tmimatwn (S0 S1 P0 M0 P1 M1)
(defun xl:runs (pts cl / n ns i dirs Ms dprev dnext runs cur S L)
  (setq n (length pts) i 0)
  (while (< i (1- n))
    (setq dirs (cons (xl:unit (xl:sub (nth (1+ i) pts) (nth i pts))) dirs) i (1+ i)))
  (setq dirs (reverse dirs) ns (length dirs) i 0)
  (while (< i n)
    (setq dprev (cond ((> i 0) (nth (1- i) dirs)) (cl (last dirs)) (T nil))
          dnext (cond ((< i ns) (nth i dirs)) (cl (car dirs)) (T nil))
          Ms (cons (xl:miter dprev dnext) Ms)
          i (1+ i)))
  (setq Ms (reverse Ms) i 0 S 0.0)
  (while (< i ns)
    (setq L (distance (nth i pts) (nth (1+ i) pts))
          cur (cons (list S (+ S L) (nth i pts) (nth i Ms) (nth (1+ i) pts) (nth (1+ i) Ms)) cur)
          S (+ S L))
    (if (or (= i (1- ns)) (< (xl:dot (nth i dirs) (nth (1+ i) dirs)) 0.94))
      (setq runs (cons (reverse cur) runs) cur nil S 0.0))
    (setq i (1+ i)))
  (reverse runs))

(defun xl:runlen (run) (cadr (last run)))

(defun xl:segat (run s)
  (while (and (cdr run) (> s (cadr (car run)))) (setq run (cdr run)))
  (car run))

;; (stathmos s, offset o) -> simeio WCS
;; Kanoniko offset sto meso tou tmimatos; i lokseeosi tou miter
;; ginetai mono mesa se zwni *xl:z* konta stis gwnies (xoris "gerimeno" toixo).
;; *xl:oref* = offset anaforas (axonas toixou), oi stathmoi metrountai panw tou.
(defun xl:map (run s o / r L u d n a b z oR ss)
  (setq r (xl:segat run s)
        L (max 1e-9 (- (cadr r) (car r)))
        u (- s (car r))
        d (xl:unit (xl:sub (nth 4 r) (nth 2 r)))
        n (xl:nrm d)
        a (xl:dot (nth 3 r) d)
        b (xl:dot (nth 5 r) d)
        z (min (/ L 2.0) (if *xl:z* *xl:z* (/ L 2.0)))
        oR (if *xl:oref* *xl:oref* 0.0)
        ss (+ u
              (* oR (+ a (* (- b a) (/ u L))))
              (* (- o oR) (+ (* a (max 0.0 (- 1.0 (/ u z))))
                             (* b (max 0.0 (- 1.0 (/ (- L u) z))))))))
  (xl:add (xl:add (nth 2 r) (xl:mul d ss)) (xl:mul n o)))

(defun xl:dirat (run s / r)
  (setq r (xl:segat run s))
  (xl:unit (xl:sub (nth 4 r) (nth 2 r))))

;; grammi se offset o apo stathmo sA ews sB (me tis endiameses koryfes)
(defun xl:edge (run sA sB o / res)
  (setq res (list (xl:map run sA o)))
  (foreach r run
    (if (and (> (car r) (+ sA 1e-6)) (< (car r) (- sB 1e-6)))
      (setq res (cons (xl:map run (car r) o) res))))
  (reverse (cons (xl:map run sB o) res)))

;;; ---------- petres ----------------------------------------------------
;; endiamesa simeia akmis (xoris ta akra)
(defun xl:mids (a b sz / k i res)
  (setq k (min 3 (fix (/ (distance a b) (* 0.4 sz)))) i 1)
  (while (<= i k)
    (setq res (cons (xl:lerp a b (/ (+ i (xl:rr -0.25 0.25)) (+ k 1.0))) res) i (1+ i)))
  (reverse res))

;; mia akanonisti petra mesa sto keli [s0,s1]x[o0,o1]
(defun xl:stone (run s0 s1 o0 o1 g sz lay / a0 a1 b0 b1 w h c q loc cen)
  (setq a0 (+ s0 (/ g 2.0)) a1 (- s1 (/ g 2.0))
        b0 (+ o0 (/ g 2.0)) b1 (- o1 (/ g 2.0))
        w (- a1 a0) h (- b1 b0))
  (if (and (> w (* 0.2 g)) (> h (* 0.2 g)))
    (progn
      (setq c (min w h)
            q (list (list (+ a0 (* c (xl:rr 0.10 0.30))) b0)       ; katw
                    (list (- a1 (* c (xl:rr 0.10 0.30))) b0)
                    (list a1 (+ b0 (* c (xl:rr 0.10 0.30))))       ; dexia
                    (list a1 (- b1 (* c (xl:rr 0.10 0.30))))
                    (list (- a1 (* c (xl:rr 0.10 0.30))) b1)       ; panw
                    (list (+ a0 (* c (xl:rr 0.10 0.30))) b1)
                    (list a0 (- b1 (* c (xl:rr 0.10 0.30))))       ; aristera
                    (list a0 (+ b0 (* c (xl:rr 0.10 0.30))))))
      ;; corner cuts + endiamesa simeia stis akmes
      (setq loc (append (list (nth 0 q)) (xl:mids (nth 0 q) (nth 1 q) sz)
                        (list (nth 1 q) (nth 2 q)) (xl:mids (nth 2 q) (nth 3 q) sz)
                        (list (nth 3 q) (nth 4 q)) (xl:mids (nth 4 q) (nth 5 q) sz)
                        (list (nth 5 q) (nth 6 q)) (xl:mids (nth 6 q) (nth 7 q) sz)
                        (list (nth 7 q)))
            cen (list (/ (+ a0 a1) 2.0) (/ (+ b0 b1) 2.0)))
      ;; kathe simeio "trabietai" tyxaia pros ta mesa -> akanonisto sxima
      (setq loc (mapcar '(lambda (p) (xl:lerp p cen (xl:rr 0.0 0.14))) loc))
      (xl:pline (mapcar '(lambda (p) (xl:map run (car p) (cadr p))) loc) T lay)
      1)
    0))

;; gemisma lwridas [sA,sB] x [oA, oA+W] me petres; epistrefei plithos
(defun xl:lay (run sA sB oA W sz g lay / L nr h r bnds o0 o1 s len cnt)
  (setq L (- sB sA) nr (max 1 (fix (+ 0.5 (/ W sz)))) h (/ W nr) r 1
        bnds (list oA) cnt 0)
  (while (< r nr)
    (setq bnds (cons (+ oA (* r h) (* h (xl:rr -0.15 0.15))) bnds) r (1+ r)))
  (setq bnds (reverse (cons (+ oA W) bnds)) r 0)
  (while (< r nr)
    (setq o0 (nth r bnds) o1 (nth (1+ r) bnds) s sA)
    (while (< s (- sB 1e-6))
      (setq len (* sz (xl:rr 0.7 1.5)))
      (if (< (- sB (+ s len)) (* 0.45 sz)) (setq len (- sB s)))
      (setq cnt (+ cnt (xl:stone run s (+ s len) o0 o1 g sz lay))
            s (+ s len)))
    (setq r (1+ r)))
  cnt)

(defun xl:oA (side W)
  (cond ((= side "Aristera") 0.0)
        ((= side "Dexia") (- W))
        (T (/ W -2.0))))

;;; =====================================================================
;;;  XEROLITHIA
;;; =====================================================================
(defun xl:loadxl ()
  (setq *xl:W*  (xl:getn "XL_W" 0.50)  *xl:SZ* (xl:getn "XL_SZ" 0.30)
        *xl:G*  (xl:getn "XL_G" 0.02)  *xl:SIDE* (xl:gets "XL_SIDE" "Kentro")
        *xl:OR* (xl:gets "XL_ORIA" "Ochi")))

(defun xl:showxl ()
  (princ (strcat "\nXEROLITHIA:  Platos=" (rtos *xl:W* 2 2)
                 "  Petra=" (rtos *xl:SZ* 2 2) "  Armos=" (rtos *xl:G* 2 3)
                 "  Thesi=" *xl:SIDE* "  Perigramma=" *xl:OR*)))

(defun xl:setxl ()
  (setq *xl:W*  (xl:askd "Platos toixou (i ypsos gia opsi)" *xl:W* 6)
        *xl:SZ* (xl:askd "Meso megethos petras" *xl:SZ* 6)
        *xl:G*  (xl:askd "Armos (keno metaxy petrwn)" *xl:G* 4)
        *xl:SIDE* (xl:askk "Thesi ws pros ti grammi [Kentro/Aristera/Dexia]"
                           "Kentro Aristera Dexia" *xl:SIDE*)
        *xl:OR* (xl:askk "Perigramma (eythies akmes) [Nai/Ochi]" "Nai Ochi" *xl:OR*))
  (xl:setn "XL_W" *xl:W*) (xl:setn "XL_SZ" *xl:SZ*) (xl:setn "XL_G" *xl:G*)
  (xl:sets "XL_SIDE" *xl:SIDE*) (xl:sets "XL_ORIA" *xl:OR*))

(defun c:XEROLITHIA ( / path runs oA cnt)
  (xl:begin)
  (xl:loadxl)
  (while (progn (xl:showxl) (= (setq path (xl:getpath "Rythmiseis")) "Rythmiseis"))
    (xl:setxl))
  (if (and path (setq path (xl:clean path)))
    (progn
      (xl:layer "XEROLITHIA" 32)
      (setq runs (xl:runs (car path) (cadr path))
            oA (xl:oA *xl:SIDE* *xl:W*) cnt 0
            *xl:oref* (+ oA (/ *xl:W* 2.0))
            *xl:z* (max *xl:W* (* 1.2 *xl:SZ*)))
      (foreach run runs
        (setq cnt (+ cnt (xl:lay run 0.0 (xl:runlen run) oA *xl:W* *xl:SZ* *xl:G* "XEROLITHIA")))
        (if (= *xl:OR* "Nai")
          (progn
            (xl:layer "XEROLITHIA_ORIA" 8)
            (xl:pline (xl:edge run 0.0 (xl:runlen run) oA) nil "XEROLITHIA_ORIA")
            (xl:pline (xl:edge run 0.0 (xl:runlen run) (+ oA *xl:W*)) nil "XEROLITHIA_ORIA"))))
      (princ (strcat "\nXEROLITHIA: " (itoa cnt) " petres sto layer XEROLITHIA."))))
  (xl:end)
  (princ))
(defun c:XER () (c:XEROLITHIA))

;;; =====================================================================
;;;  MANTRA
;;; =====================================================================
(defun xl:loadmn ()
  (setq *mn:T* (xl:getn "MN_T" 0.25)  *mn:P* 0.0
        *mn:D* (xl:getn "MN_D" 3.00)  *mn:SIDE* (xl:gets "MN_SIDE" "Kentro")
        *mn:TY* (xl:gets "MN_TYPE" "Apli") *mn:SZ* (xl:getn "MN_SZ" 0.20)))

(defun xl:showmn ()
  (princ (strcat "\nMANTRA:  Paxos=" (rtos *mn:T* 2 2)
                 "  Thesi=" *mn:SIDE*
                 "  Typos=" *mn:TY*
                 (if (= *mn:TY* "Petrini") (strcat "  Petra=" (rtos *mn:SZ* 2 2)) ""))))

(defun xl:setmn ()
  (setq *mn:T* (xl:askd "Paxos toixou" *mn:T* 6) *mn:P* 0.0)
  (setq *mn:SIDE* (xl:askk "Thesi ws pros ti grammi [Kentro/Aristera/Dexia]"
                           "Kentro Aristera Dexia" *mn:SIDE*)
        *mn:TY* (xl:askk "Typos toixou [Apli/Petrini]" "Apli Petrini" *mn:TY*))
  (if (= *mn:TY* "Petrini")
    (setq *mn:SZ* (xl:askd "Meso megethos petras" *mn:SZ* 6)))
  (xl:setn "MN_T" *mn:T*) (xl:setn "MN_P" *mn:P*) (xl:setn "MN_D" *mn:D*)
  (xl:sets "MN_SIDE" *mn:SIDE*) (xl:sets "MN_TYPE" *mn:TY*) (xl:setn "MN_SZ" *mn:SZ*))

;; tetragwniki kolona, kentro c, dieythynsi u, plevra p
(defun xl:pillar (c u p lay / n hu hn)
  (setq n (xl:nrm u) hu (xl:mul u (/ p 2.0)) hn (xl:mul n (/ p 2.0)))
  (xl:pline (list (xl:sub (xl:sub c hu) hn) (xl:sub (xl:add c hu) hn)
                  (xl:add (xl:add c hu) hn) (xl:add (xl:sub c hu) hn)) T lay))

(defun c:MANTRA ( / path runs oA oB oM nr k run L n i S sts sA sB np cl first lastrun)
  (xl:begin)
  (xl:loadmn)
  (while (progn (xl:showmn) (= (setq path (xl:getpath "Rythmiseis")) "Rythmiseis"))
    (xl:setmn))
  (if (and path (setq path (xl:clean path)))
    (progn
      (xl:layer "MANTRA_TOIXOS" 7)
      (if (> *mn:P* 0.0) (xl:layer "MANTRA_KOLONES" 4))
      (if (= *mn:TY* "Petrini") (xl:layer "MANTRA_PETRES" 32))
      (setq runs (xl:runs (car path) (cadr path)) cl (cadr path)
            oA (xl:oA *mn:SIDE* *mn:T*) oB (+ oA *mn:T*) oM (+ oA (/ *mn:T* 2.0))
            nr (length runs) k 0 np 0
            *xl:oref* oM
            *xl:z* (if (> *mn:P* 0.0) (/ *mn:P* 2.0) *mn:T*))
      (foreach run runs
        (setq L (xl:runlen run) lastrun (= k (1- nr)))
        ;; stathmoi kolonwn: isapostaseis, <= megisti apostasi
        (setq n (if (> *mn:P* 0.0) (max 1 (fix (+ 0.999999 (/ L *mn:D*)))) 1)
              i 0 sts nil)
        (while (<= i n) (setq sts (cons (* L (/ (float i) n)) sts) i (1+ i)))
        (setq sts (reverse sts))
        ;; kolones (i teleftaia mono sto telos anoixtis diadromis)
        (if (> *mn:P* 0.0)
          (progn
            (setq i 0)
            (while (<= i n)
              (if (or (< i n) (and lastrun (not cl)))
                (progn
                  (xl:pillar (xl:map run (nth i sts) oM)
                             (xl:dirat run (if (< i n) (+ (nth i sts) 1e-6) (nth i sts)))
                             *mn:P* "MANTRA_KOLONES")
                  (setq np (1+ np))))
              (setq i (1+ i)))))
        ;; toixos metaxy kolonwn
        (setq i 0)
        (while (< i n)
          (setq sA (+ (nth i sts) (/ *mn:P* 2.0))
                sB (- (nth (1+ i) sts) (/ *mn:P* 2.0)))
          (if (> sB (+ sA 1e-4))
            (progn
              (xl:pline (xl:edge run sA sB oA) nil "MANTRA_TOIXOS")
              (xl:pline (xl:edge run sA sB oB) nil "MANTRA_TOIXOS")
              (if (= *mn:TY* "Petrini")
                (xl:lay run sA sB oA *mn:T* *mn:SZ* 0.015 "MANTRA_PETRES"))))
          (setq i (1+ i)))
        ;; kleisimo akrwn xoris kolones
        (if (and (= *mn:P* 0.0) (not cl))
          (progn
            (if (= k 0)
              (xl:pline (list (xl:map run 0.0 oA) (xl:map run 0.0 oB)) nil "MANTRA_TOIXOS"))
            (if lastrun
              (xl:pline (list (xl:map run L oA) (xl:map run L oB)) nil "MANTRA_TOIXOS"))))
        (setq k (1+ k)))
      (princ "\nMANTRA: etoimi, layer MANTRA_TOIXOS.")))
  (xl:end)
  (princ))
(defun c:MAN () (c:MANTRA))

(princ "\nHEXIS-APP XEROLITHIA.lsp: XEROLITHIA (XER), MANTRA (MAN)")
(princ)
