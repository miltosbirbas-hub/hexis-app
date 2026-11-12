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
;;;  - Symvola "x" se kathe anoigma, stramena kata tin poreia
;;;  v1.1
;;;  - Megethi symvolwn analoga me tin klimaka sxediasis (1:N):
;;;      x = 2 mm, pasalos = 1 mm, apostasi x = 15 mm sto xarti
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

;;; ---------- anoigmata metaxy pasalwn ------------------------------------
(defun sy:isv (p vs / r)
  (foreach v vs (if (< (distance p v) 1e-6) (setq r T)))
  r)
;; spaei ti diadromi se anoigmata stis koryfes (pasalous)
(defun sy:spans (pts vs / cur res)
  (setq cur (list (car pts)) pts (cdr pts))
  (foreach p pts
    (setq cur (cons p cur))
    (if (sy:isv p vs) (setq res (cons (reverse cur) res) cur (list p))))
  (if (cdr cur) (setq res (cons (reverse cur) res)))
  (reverse res))

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

(defun c:SYRMATOPLEGMA ( / path pts cl vs L n i pu np nx ed doX doP sz dp dx)
  (sy:begin)
  (sy:load)
  (while (progn (sy:show) (= (setq path (sy:getpath "Rythmiseis")) "Rythmiseis"))
    (sy:set))
  (if (and path (setq path (sy:clean path)))
    (progn
      (sy:layer "SYRMATOPLEGMA" 3)
      (setq pts (car path) cl (cadr path) vs (caddr path)
            doX (/= *sy:TY* "Pasaloi") doP (/= *sy:TY* "X")
            sz (* *sy:K* 0.002)        ; x: 2 mm sto xarti
            dp (* *sy:K* 0.001)        ; pasalos: 1 mm
            dx (* *sy:K* 0.015)        ; apostasi x: 15 mm
            np 0 nx 0)
      ;; i grammi: i epilegmeni pigainei sto layer, alliws nea polygrammi
      (if *sy:ent*
        (progn (setq ed (entget *sy:ent*))
               (entmod (subst (cons 8 "SYRMATOPLEGMA") (assoc 8 ed) ed)))
        (sy:pline (if cl (reverse (cdr (reverse pts))) pts) cl "SYRMATOPLEGMA"))
      ;; pasalos se kathe koryfi
      (if doP
        (progn
          (sy:layer "SYRMATOPLEGMA_PASALOI" 1)
          (foreach v vs
            (sy:dot2 v dp "SYRMATOPLEGMA_PASALOI")
            (setq np (1+ np)))))
      ;; symvola x se kathe anoigma
      (if doX
        (foreach sp (sy:spans pts vs)
          (setq L (sy:runlen sp))
          (if (> L (* 1.5 sz))
            (progn
              (setq n (max 1 (fix (+ 0.5 (/ L dx)))) i 0)
              (while (< i n)
                (setq pu (sy:at sp (* L (/ (+ i 0.5) n))))
                (sy:xmark (car pu) (cadr pu) sz "SYRMATOPLEGMA")
                (setq nx (1+ nx) i (1+ i)))))))
      (princ (strcat "\nSYRMATOPLEGMA: etoimo - mikos "
                     (rtos (sy:runlen pts) 2 2) " m, "
                     (itoa np) " pasaloi, " (itoa nx) " symvola x."))))
  (sy:end)
  (princ))
(defun c:SYR () (c:SYRMATOPLEGMA))

(princ "\nHEXIS-APP SYRMATOPLEGMA.lsp: SYRMATOPLEGMA (SYR)")
(princ)
