;;; =====================================================================
;;;  SYRMATOPLEGMA.LSP  -  HEXIS-APP  (hexis-app.gr)
;;;  Grammi syrmatoplegmatos (perifraxi) se katopsi kata mikos grammis:
;;;  grammi + symvola "x" + pasaloi stis apotypwmenes koryfes.
;;;  AutoCAD / progeCAD / ZWCAD / BricsCAD / GstarCAD  (kathari AutoLISP,
;;;  xoris VLA/ActiveX - mono entmake, opote doulevei pantou)
;;;
;;;  Entoli:
;;;    SYRMATOPLEGMA  (syntomi: SYR)
;;;
;;;  Diadromi: LINE, LWPOLYLINE (kai me toxa), ARC, CIRCLE
;;;            i simeia me klik [Simeia].
;;;  - Pasalos se KATHE koryfi (ta simeia einai oi apotypwmenoi pasaloi)
;;;  v1.2
;;;  - Ta "x" einai pleon TYPOS GRAMMIS (linetype SYRMATOPLEGMA):
;;;    mia grammi, pou menei idia me copy-paste se allo sxedio.
;;;    O typos grammis ftiaxnetai aytomata sto sxedio (kai yparxei kai
;;;    sto arxeio HEXIS.lin gia LINETYPE > Load).
;;;  - Megethi analoga me tin klimaka sxediasis (1:N), sxedio se metra:
;;;      x = ~2 mm, pasalos = 1 mm, apostasi x = 15 mm sto xarti
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

;; gemati koukida (donut) diametrou dd - pasalos
(defun sy:dot2 (c dd lay / q)
  (setq q (/ dd 4.0))
  (entmake
    (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lay)
          '(100 . "AcDbPolyline") '(90 . 2) '(70 . 1) (cons 43 (/ dd 2.0))
          (cons 10 (list (- (car c) q) (cadr c))) '(42 . 1.0)
          (cons 10 (list (+ (car c) q) (cadr c))) '(42 . 1.0))))

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
  (list res cl pts))

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
      (setq pts (mapcar '(lambda (x) (sy:p2 (trans x 1 0))) (reverse pts)))
      (list pts cl pts))))

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
                done T *sy:ent* en)
          (setq res (list (car res) nil (car res))))
         ((= typ "ARC")
          (setq a0 (cdr (assoc 50 ed)) a1 (cdr (assoc 51 ed)) sw (- a1 a0))
          (if (<= sw 0.0) (setq sw (+ sw (* 2.0 pi))))
          (setq res (sy:arcpts en a0 sw nil) done T *sy:ent* en)
          (setq res (list (car res) nil (list (car (car res)) (last (car res))))))
         ((= typ "CIRCLE")
          (setq res (sy:arcpts en 0.0 (* 2.0 pi) T) done T *sy:ent* en))
         (T (princ (strcat "\n" typ " den ypostirizetai - LINE/LWPOLYLINE/ARC/CIRCLE.")))))))
  res)

;; katharismos diplwn simeion, kleisimo
(defun sy:clean (path / pts cl res vs)
  (setq pts (car path) cl (cadr path))
  (foreach v (caddr path)
    (if (or (null vs) (> (distance v (car vs)) 1e-6)) (setq vs (cons v vs))))
  (setq vs (reverse vs))
  (if (and (cdr vs) (< (distance (car vs) (last vs)) 1e-6))
    (setq vs (reverse (cdr (reverse vs)))))
  (foreach p pts
    (if (or (null res) (> (distance p (car res)) 1e-6)) (setq res (cons p res))))
  (setq res (reverse res))
  (if (and (> (length res) 2) (< (distance (car res) (last res)) 1e-6)) (setq cl T))
  (if (and cl (> (distance (car res) (last res)) 1e-6))
    (setq res (append res (list (car res)))))
  (if (>= (length res) 2) (list res cl vs)))

(defun sy:runlen (pts / L)
  (setq L 0.0)
  (while (cdr pts)
    (setq L (+ L (distance (car pts) (cadr pts))) pts (cdr pts)))
  L)

;; (simeio dieythynsi) se stathmo s panw sto run
;;; =====================================================================
;;;  SYRMATOPLEGMA
;;; =====================================================================
(defun sy:load ()
  (setq *sy:K*  (sy:getn "SY_SCALE" 200.0)
        *sy:TY* (sy:gets "SY_TYPE" "Ola")))

(defun sy:show ()
  (princ (strcat "\nSYRMATOPLEGMA:  Klimaka=1:" (rtos *sy:K* 2 0)
                 "  (x=" (rtos (* *sy:K* 0.002) 2 2) " m, pasalos="
                 (rtos (* *sy:K* 0.001) 2 2) " m)  Symvola=" *sy:TY*)))

(defun sy:set ( / v)
  (initget 6)
  (setq v (getreal (strcat "\nKlimaka sxediasis 1:<" (rtos *sy:K* 2 0) ">: ")))
  (if v (setq *sy:K* v))
  (setq *sy:TY* (sy:askk "Symvola [Ola/X/Pasaloi]" "Ola X Pasaloi" *sy:TY*))
  (sy:setn "SY_SCALE" *sy:K*) (sy:sets "SY_TYPE" *sy:TY*))


;;; ---------- typos grammis SYRMATOPLEGMA -------------------------------
;; motivo se mm xartiou: grammi 13, keno 1, "x", keno 1  (periodos 15 mm)
(defun sy:ltwrite (fn / f)
  (if (setq f (open fn "w"))
    (progn
      (write-line "*SYRMATOPLEGMA,Syrmatoplegma ----x----x----" f)
      (write-line "A,13.0,-1.0,[\"x\",STANDARD,S=2.5,R=0.0,X=-0.85,Y=-0.85],-1.0" f)
      (close f)
      fn)))

(defun sy:ltype ( / st fn fd)
  (if (not (tblsearch "LTYPE" "SYRMATOPLEGMA"))
    (progn
      ;; 1) apeytheias entmake (xoris erwtiseis)
      (if (setq st (tblobjname "STYLE" "STANDARD"))
        (entmake
          (list '(0 . "LTYPE") '(100 . "AcDbSymbolTableRecord")
                '(100 . "AcDbLinetypeTableRecord") '(2 . "SYRMATOPLEGMA") '(70 . 0)
                '(3 . "Syrmatoplegma ----x----x----") '(72 . 65) '(73 . 3) '(40 . 15.0)
                '(49 . 13.0) '(74 . 0)
                '(49 . -1.0) '(74 . 2) '(75 . 0) (cons 340 st) '(46 . 2.5) '(50 . 0.0)
                '(44 . -0.85) '(45 . -0.85) '(9 . "x")
                '(49 . -1.0) '(74 . 0))))
      ;; 2) an den egine, fortwsi apo arxeio .lin (LINETYPE Load)
      (if (and (not (tblsearch "LTYPE" "SYRMATOPLEGMA"))
               (setq fn (sy:ltwrite (strcat (getvar "TEMPPREFIX") "HEXIS_SYR.lin"))))
        (progn
          (setq fd (getvar "FILEDIA"))
          (setvar "FILEDIA" 0)
          (command "_.-LINETYPE" "_Load" "SYRMATOPLEGMA" fn "")
          (while (> (getvar "CMDACTIVE") 0) (command ""))
          (setvar "FILEDIA" fd)))))
  (tblsearch "LTYPE" "SYRMATOPLEGMA"))

;; vazei layer / typo grammis / klimaka typou se mia ontotita
(defun sy:put (ed k v)
  (if (assoc k ed) (subst (cons k v) (assoc k ed) ed) (append ed (list (cons k v)))))
(defun sy:style (ed lt sc)
  (setq ed (sy:put ed 8 "SYRMATOPLEGMA"))
  (if lt (setq ed (sy:put (sy:put ed 6 lt) 48 sc)))
  (if (= (cdr (assoc 0 ed)) "LWPOLYLINE")
    (setq ed (sy:put ed 70 (logior 128 (cdr (assoc 70 ed))))))
  ed)

(defun c:SYRMATOPLEGMA ( / path pts cl vs np ed doX doP dp lt sc)
  (sy:begin)
  (sy:load)
  (while (progn (sy:show) (= (setq path (sy:getpath "Rythmiseis")) "Rythmiseis"))
    (sy:set))
  (if (and path (setq path (sy:clean path)))
    (progn
      (sy:layer "SYRMATOPLEGMA" 3)
      (setq pts (car path) cl (cadr path) vs (caddr path)
            doX (/= *sy:TY* "Pasaloi") doP (/= *sy:TY* "X")
            dp (* *sy:K* 0.001)        ; pasalos: 1 mm sto xarti
            np 0)
      ;; typos grammis: motivo se mm -> klimaka N/1000 (sxedio se metra)
      (if doX
        (if (sy:ltype)
          (setq lt "SYRMATOPLEGMA"
                sc (/ (* *sy:K* 0.001) (max 1e-9 (getvar "LTSCALE"))))
          (princ "\nO typos grammis SYRMATOPLEGMA den fortwthike - i grammi menei synexis.")))
      ;; i grammi: i epilegmeni pairnei layer + typo grammis, alliws nea polygrammi
      (if *sy:ent*
        (entmod (sy:style (entget *sy:ent*) lt sc))
        (entmake
          (append
            (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "SYRMATOPLEGMA"))
            (if lt (list (cons 6 lt) (cons 48 sc)))
            (list '(100 . "AcDbPolyline")
                  (cons 90 (length (if cl (cdr pts) pts)))
                  (cons 70 (+ 128 (if cl 1 0))) '(43 . 0.0))
            (mapcar '(lambda (p) (cons 10 p)) (if cl (reverse (cdr (reverse pts))) pts)))))
      ;; pasalos se kathe koryfi
      (if doP
        (progn
          (sy:layer "SYRMATOPLEGMA_PASALOI" 1)
          (foreach v vs
            (sy:dot2 v dp "SYRMATOPLEGMA_PASALOI")
            (setq np (1+ np)))))
      (princ (strcat "\nSYRMATOPLEGMA: etoimo - mikos "
                     (rtos (sy:runlen pts) 2 2) " m, "
                     (itoa np) " pasaloi"
                     (if lt ", typos grammis SYRMATOPLEGMA." ".")))))
  (sy:end)
  (princ))
(defun c:SYR () (c:SYRMATOPLEGMA))

(princ "\nHEXIS-APP SYRMATOPLEGMA.lsp: SYRMATOPLEGMA (SYR)")
(princ)
