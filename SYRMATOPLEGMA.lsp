;;; =====================================================================
;;;  SYRMATOPLEGMA.LSP  -  HEXIS-APP  (hexis-app.gr)
;;;  Grammi syrmatoplegmatos (perifraxi) se katopsi kata mikos grammis:
;;;  grammi + symvola "x" + pasaloi se isapostaseis.
;;;  AutoCAD / progeCAD / ZWCAD / BricsCAD / GstarCAD  (kathari AutoLISP,
;;;  xoris VLA/ActiveX - mono entmake, opote doulevei pantou)
;;;
;;;  Entoli:
;;;    SYRMATOPLEGMA  (syntomi: SYR)
;;;
;;;  Diadromi: LINE, LWPOLYLINE (kai me toxa), ARC, CIRCLE
;;;            i simeia me klik [Simeia].
;;;  - Pasaloi se kathe gwnia kai se isapostaseis <= apostasi pasalwn
;;;  - Symvolo "x" sto meso kathe anoigmatos, katheta stin poreia
;;;  - I grammi pou epilegeis pigainei sto layer SYRMATOPLEGMA
;;;  - Oli i entoli anaireitai me ena U
;;;  Oi rythmiseis kratiountai kai meta to kleisimo tou CAD.
;;;  powered by BRB Development KATASKEVASTIKI MON. I.K.E.
;;; =====================================================================

;;; ---------- dianysmata 2D ---------------------------------------------
(defun sy:p2 (p) (list (float (car p)) (float (cadr p))))
(defun sy:add (a b) (list (+ (car a) (car b)) (+ (cadr a) (cadr b))))
(defun sy:sub (a b) (list (- (car a) (car b)) (- (cadr a) (cadr b))))
(defun sy:mul (a k) (list (* (car a) k) (* (cadr a) k)))
(defun sy:dot (a b) (+ (* (car a) (car b)) (* (cadr a) (cadr b))))
(defun sy:len (a) (sqrt (sy:dot a a)))
(defun sy:unit (a / l)
  (setq l (sy:len a))
  (if (> l 1e-12) (sy:mul a (/ 1.0 l)) (list 1.0 0.0)))
(defun sy:nrm (d) (list (- (cadr d)) (car d)))
(defun sy:lerp (a b f) (sy:add a (sy:mul (sy:sub b a) f)))

;;; ---------- rythmiseis (monimes, getenv/setenv) ------------------------
(defun sy:getn (k d / v)
  (setq v (getenv (strcat "HEXIS_" k)))
  (if (and v (/= v "") (> (atof v) 1e-9)) (atof v) d))
(defun sy:setn (k v) (setenv (strcat "HEXIS_" k) (rtos v 2 4)))
(defun sy:gets (k d / v)
  (setq v (getenv (strcat "HEXIS_" k)))
  (if (and v (/= v "")) v d))
(defun sy:sets (k v) (setenv (strcat "HEXIS_" k) v))

(defun sy:askd (msg def bits / v)
  (initget bits)
  (setq v (getdist (strcat "\n" msg " <" (rtos def 2 3) ">: ")))
  (if v v def))
(defun sy:askk (msg kws def / v)
  (initget kws)
  (setq v (getkword (strcat "\n" msg " <" def ">: ")))
  (if v v def))

;;; ---------- layers, ontotites -----------------------------------------
(defun sy:layer (nm col)
  (if (not (tblsearch "LAYER" nm))
    (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord")
                   '(100 . "AcDbLayerTableRecord") (cons 2 nm) '(70 . 0)
                   (cons 62 col) '(6 . "Continuous")))))

(defun sy:pline (pts cl lay)
  (if (> (length pts) 1)
    (entmake
      (append
        (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lay)
              '(100 . "AcDbPolyline") (cons 90 (length pts))
              (cons 70 (if cl 1 0)) '(43 . 0.0))
        (mapcar '(lambda (p) (cons 10 p)) pts)))))

(defun sy:line (a b lay)
  (entmake (list '(0 . "LINE") (cons 8 lay)
                 (list 10 (car a) (cadr a) 0.0) (list 11 (car b) (cadr b) 0.0))))

;; gemati koukida (donut) diametrou dd - pasalos
(defun sy:dot2 (c dd lay / q)
  (setq q (/ dd 4.0))
  (entmake
    (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lay)
          '(100 . "AcDbPolyline") '(90 . 2) '(70 . 1) (cons 43 (/ dd 2.0))
          (cons 10 (list (- (car c) q) (cadr c))) '(42 . 1.0)
          (cons 10 (list (+ (car c) q) (cadr c))) '(42 . 1.0))))

;; symvolo "x": dyo grammes sta +-45 moires ws pros tin poreia u
(defun sy:xmark (c u sz lay / a b h)
  (setq h (/ sz 2.0)
        a (sy:unit (sy:add u (sy:nrm u)))
        b (sy:unit (sy:sub u (sy:nrm u))))
  (sy:line (sy:sub c (sy:mul a h)) (sy:add c (sy:mul a h)) lay)
  (sy:line (sy:sub c (sy:mul b h)) (sy:add c (sy:mul b h)) lay))

;;; ---------- undo / sfalmata -------------------------------------------
(defun sy:err (msg)
  (if (and msg
           (not (member (strcase msg T)
                        '("function cancelled" "quit / exit abort" "console break"))))
    (princ (strcat "\nHEXIS: " msg)))
  (if command-s (command-s "_.UNDO" "_END") (command "_.UNDO" "_END"))
  (if *sy:ce* (setvar "CMDECHO" *sy:ce*))
  (setq *error* *sy:olderr*)
  (princ))
(defun sy:begin ()
  (setq *sy:olderr* *error* *error* sy:err *sy:ce* (getvar "CMDECHO"))
  (setvar "CMDECHO" 0)
  (command "_.UNDO" "_BEGIN"))
(defun sy:end ()
  (command "_.UNDO" "_END")
  (setvar "CMDECHO" *sy:ce*)
  (setq *error* *sy:olderr*))

;;; ---------- diavasma diadromis ----------------------------------------
;; simeia toxou apo bulge (xoris to p1, me to p2), vima 5 moires
(defun sy:bulgepts (p1 p2 b / th d r c a1 n i res)
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
        (setq res (cons (sy:p2 (polar c (+ a1 (* th (/ (float i) n))) (abs r))) res)
              i (1+ i)))
      (reverse (cons p2 res)))))

(defun sy:lwpts (en / ed el cl pts bul flip res i n z)
  (setq ed (entget en)
        el (cond ((cdr (assoc 38 ed))) (0.0))
        cl (= 1 (logand 1 (cdr (assoc 70 ed))))
        z  (cdr (assoc 210 ed))
        flip (and z (< (caddr z) 0.0)))
  (foreach g ed
    (cond ((= (car g) 10)
           (setq pts (cons (sy:p2 (trans (list (cadr g) (caddr g) el) en 0)) pts)
                 bul (cons 0.0 bul)))
          ((= (car g) 42)
           (setq bul (cons (if flip (- (cdr g)) (cdr g)) (cdr bul))))))
  (setq pts (reverse pts) bul (reverse bul) n (length pts) i 0 res (list (car pts)))
  (while (< i (1- n))
    (setq res (append res (sy:bulgepts (nth i pts) (nth (1+ i) pts) (nth i bul))) i (1+ i)))
  (if cl (setq res (append res (sy:bulgepts (last pts) (car pts) (last bul)))))
  (list res cl))

(defun sy:arcpts (en a0 sw cl / ed c r n i res)
  (setq ed (entget en) c (cdr (assoc 10 ed)) r (cdr (assoc 40 ed))
        n (max 2 (fix (+ 0.999 (/ sw (/ pi 36.0))))) i 0)
  (while (<= i n)
    (setq res (cons (sy:p2 (trans (polar c (+ a0 (* sw (/ (float i) n))) r) en 0)) res)
          i (1+ i)))
  (list (reverse res) cl))

(defun sy:pickpts ( / p q pts cl go)
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
      (list (mapcar '(lambda (x) (sy:p2 (trans x 1 0))) (reverse pts)) cl))))

;; epistrefei (pts closed), i to keyword, i nil.
;; *sy:ent* = i ontotita pou epilextike (nil an dothikan simeia)
(defun sy:getpath (kws / es en typ ed a0 a1 sw done res)
  (setq *sy:ent* nil)
  (while (not done)
    (setvar "ERRNO" 0)
    (initget (strcat kws " Simeia"))
    (setq es (entsel "\nEpilexte LINE/PLINE/ARC/CIRCLE i [Rythmiseis/Simeia] <Simeia>: "))
    (cond
      ((and (null es) (= (getvar "ERRNO") 7)) (princ "\nDen epilexthike tipota."))
      ((null es) (setq res (sy:pickpts) done T))
      ((= es "Simeia") (setq res (sy:pickpts) done T))
      ((= (type es) 'STR) (setq res es done T))
      (T
       (setq en (car es) ed (entget en) typ (cdr (assoc 0 ed)))
       (cond
         ((= typ "LWPOLYLINE") (setq res (sy:lwpts en) done T *sy:ent* en))
         ((= typ "LINE")
          (setq res (list (list (sy:p2 (cdr (assoc 10 ed))) (sy:p2 (cdr (assoc 11 ed)))) nil)
                done T *sy:ent* en))
         ((= typ "ARC")
          (setq a0 (cdr (assoc 50 ed)) a1 (cdr (assoc 51 ed)) sw (- a1 a0))
          (if (<= sw 0.0) (setq sw (+ sw (* 2.0 pi))))
          (setq res (sy:arcpts en a0 sw nil) done T *sy:ent* en))
         ((= typ "CIRCLE")
          (setq res (sy:arcpts en 0.0 (* 2.0 pi) T) done T *sy:ent* en))
         (T (princ (strcat "\n" typ " den ypostirizetai - LINE/LWPOLYLINE/ARC/CIRCLE.")))))))
  res)

;; katharismos diplwn simeion, kleisimo
(defun sy:clean (path / pts cl res)
  (setq pts (car path) cl (cadr path))
  (foreach p pts
    (if (or (null res) (> (distance p (car res)) 1e-6)) (setq res (cons p res))))
  (setq res (reverse res))
  (if (and (> (length res) 2) (< (distance (car res) (last res)) 1e-6)) (setq cl T))
  (if (and cl (> (distance (car res) (last res)) 1e-6))
    (setq res (append res (list (car res)))))
  (if (>= (length res) 2) (list res cl)))

;;; ---------- tmimata ("runs") anamesa stis gwnies ----------------------
;; spaei ti diadromi stis aixmires gwnies (> ~20 moires) -
;; ekei mpainei panta pasalos. Ta toxa menoun ena tmima.
(defun sy:runs (pts / i n cur runs d1 d2)
  (setq n (length pts) i 1 cur (list (car pts)))
  (while (< i n)
    (setq cur (cons (nth i pts) cur))
    (if (< i (1- n))
      (progn
        (setq d1 (sy:unit (sy:sub (nth i pts) (nth (1- i) pts)))
              d2 (sy:unit (sy:sub (nth (1+ i) pts) (nth i pts))))
        (if (< (sy:dot d1 d2) 0.94)
          (setq runs (cons (reverse cur) runs) cur (list (nth i pts))))))
    (setq i (1+ i)))
  (reverse (cons (reverse cur) runs)))

(defun sy:runlen (pts / L)
  (setq L 0.0)
  (while (cdr pts)
    (setq L (+ L (distance (car pts) (cadr pts))) pts (cdr pts)))
  L)

;; (simeio dieythynsi) se stathmo s panw sto run
(defun sy:at (pts s / a b l)
  (while (and (cddr pts) (> s (setq l (distance (car pts) (cadr pts)))))
    (setq s (- s l) pts (cdr pts)))
  (setq a (car pts) b (cadr pts) l (max 1e-12 (distance a b)))
  (list (sy:lerp a b (min 1.0 (max 0.0 (/ s l)))) (sy:unit (sy:sub b a))))

;;; =====================================================================
;;;  SYRMATOPLEGMA
;;; =====================================================================
(defun sy:load ()
  (setq *sy:D*  (sy:getn "SY_D" 2.50)
        *sy:SZ* (sy:getn "SY_SZ" 0.30)
        *sy:TY* (sy:gets "SY_TYPE" "Ola")))

(defun sy:show ()
  (princ (strcat "\nSYRMATOPLEGMA:  Apostasi pasalwn=" (rtos *sy:D* 2 2)
                 "  Megethos x=" (rtos *sy:SZ* 2 2)
                 "  Symvola=" *sy:TY*)))

(defun sy:set ()
  (setq *sy:D*  (sy:askd "Megisti apostasi pasalwn" *sy:D* 6)
        *sy:SZ* (sy:askd "Megethos symvolou x" *sy:SZ* 6)
        *sy:TY* (sy:askk "Symvola [Ola/X/Pasaloi]" "Ola X Pasaloi" *sy:TY*))
  (sy:setn "SY_D" *sy:D*) (sy:setn "SY_SZ" *sy:SZ*) (sy:sets "SY_TYPE" *sy:TY*))

(defun c:SYRMATOPLEGMA ( / path pts cl runs nr k run L n i s pu np nx ed doX doP lastrun)
  (sy:begin)
  (sy:load)
  (while (progn (sy:show) (= (setq path (sy:getpath "Rythmiseis")) "Rythmiseis"))
    (sy:set))
  (if (and path (setq path (sy:clean path)))
    (progn
      (sy:layer "SYRMATOPLEGMA" 3)
      (setq pts (car path) cl (cadr path)
            doX (/= *sy:TY* "Pasaloi") doP (/= *sy:TY* "X")
            np 0 nx 0)
      (if doP (sy:layer "SYRMATOPLEGMA_PASALOI" 1))
      ;; i grammi: i epilegmeni pigainei sto layer, alliws nea polygrammi
      (if *sy:ent*
        (progn (setq ed (entget *sy:ent*))
               (entmod (subst (cons 8 "SYRMATOPLEGMA") (assoc 8 ed) ed)))
        (sy:pline (if cl (reverse (cdr (reverse pts))) pts) cl "SYRMATOPLEGMA"))
      (setq runs (sy:runs pts) nr (length runs) k 0)
      (foreach run runs
        (setq L (sy:runlen run) lastrun (= k (1- nr))
              n (max 1 (fix (+ 0.999999 (/ L *sy:D*)))) i 0)
        (while (<= i n)
          (setq s (* L (/ (float i) n)))
          ;; pasalos: oxi sto telos tou run (einai i arxi tou epomenou),
          ;; ektos apo to teleftaio run anoixtis diadromis
          (if (and doP (or (< i n) (and lastrun (not cl))))
            (progn (sy:dot2 (car (sy:at run s)) (* 0.5 *sy:SZ*) "SYRMATOPLEGMA_PASALOI")
                   (setq np (1+ np))))
          ;; "x" sto meso tou anoigmatos
          (if (and doX (< i n))
            (progn
              (setq pu (sy:at run (+ s (/ L (* 2.0 n)))))
              (sy:xmark (car pu) (cadr pu) *sy:SZ* "SYRMATOPLEGMA")
              (setq nx (1+ nx))))
          (setq i (1+ i)))
        (setq k (1+ k)))
      (princ (strcat "\nSYRMATOPLEGMA: etoimo - mikos "
                     (rtos (sy:runlen pts) 2 2) " m, "
                     (itoa np) " pasaloi, " (itoa nx) " symvola x."))))
  (sy:end)
  (princ))
(defun c:SYR () (c:SYRMATOPLEGMA))

(princ "\nHEXIS-APP SYRMATOPLEGMA.lsp: SYRMATOPLEGMA (SYR)")
(princ)
