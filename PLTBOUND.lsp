;;; ============================================================
;;; PLTBOUND.LSP
;;; Χωρίζει ένα κλειστό πολύγωνο (LWPOLYLINE) σε 2 τμήματα με
;;; ΚΟΙΝΟ ΟΡΙΟ μια τεθλασμένη (ή ευθεία) γραμμή που έχεις ήδη
;;; σχεδιάσει - π.χ. ρέμα, τοίχος, υπάρχουσα περίφραξη.
;;;
;;; Η γραμμή είναι ΣΤΑΘΕΡΗ (δεν μετατοπίζεται) - το εργαλείο απλά
;;; υπολογίζει τα 2 εμβαδά που προκύπτουν όποια κι αν είναι.
;;;
;;; Σχεδίασε τη γραμμή να προεξέχει καθαρά και στις δύο άκρες πέρα
;;; από το όριο του οικοπέδου (σαν γραμμή κατασκευής), ώστε να
;;; τέμνει το περίγραμμα ακριβώς 2 φορές.
;;;
;;; ΠΕΡΙΟΡΙΣΜΟΙ:
;;;  - Και τα δύο πολύγωνα/γραμμές πρέπει να έχουν ευθείες πλευρές
;;;    (χωρίς τόξα/bulge - αν έχει, βγάζει προειδοποίηση).
;;;  - Η γραμμή πρέπει να τέμνει το όριο ΑΚΡΙΒΩΣ 2 φορές.
;;;  - Στα 2 σημεία τομής, προσθέτει πραγματικές νέες κορυφές
;;;    (vertices) και στο ΑΡΧΙΚΟ πολύγωνο.
;;;
;;; BRB DEVELOPMENT MON. I.K.E. - Μ. Μπιρμπας
;;; Εντολή: PLTBOUND
;;; ============================================================

;; ---------- ΓΕΩΜΕΤΡΙΚΕΣ ΒΟΗΘΗΤΙΚΕΣ ----------

;; εμβαδόν κλειστού πολυγώνου (shoelace)
(defun KT:area (poly / n i s p1 p2)
  (setq s 0.0 n (length poly) i 0)
  (while (< i n)
    (setq p1 (nth i poly))
    (setq p2 (nth (rem (1+ i) n) poly))
    (setq s (+ s (- (* (car p1) (cadr p2)) (* (car p2) (cadr p1)))))
    (setq i (1+ i))
  )
  (abs (/ s 2.0))
)

;; κέντρο βάρους πολυγώνου (area-weighted centroid)
(defun KT:centroid (poly / n i s cx cy p1 p2 cr)
  (setq s 0.0 cx 0.0 cy 0.0 n (length poly) i 0)
  (while (< i n)
    (setq p1 (nth i poly))
    (setq p2 (nth (rem (1+ i) n) poly))
    (setq cr (- (* (car p1) (cadr p2)) (* (car p2) (cadr p1))))
    (setq s (+ s cr))
    (setq cx (+ cx (* (+ (car p1) (car p2)) cr)))
    (setq cy (+ cy (* (+ (cadr p1) (cadr p2)) cr)))
    (setq i (1+ i))
  )
  (setq s (/ s 2.0))
  (if (< (abs s) 1e-9)
    (car poly)
    (list (/ cx (* 6.0 s)) (/ cy (* 6.0 s)))
  )
)

;; τομή ευθύγραμμων ΤΜΗΜΑΤΩΝ A-B και C-D (όχι απείρων ευθειών).
;; Επιστρέφει (σημείο τομής, παράμετρος t πάνω στο A-B) ή nil αν δεν τέμνονται.
(defun KT:segXt (A B C D / rx ry sx sy denom cax cay tt uu)
  (setq rx (- (car B) (car A)) ry (- (cadr B) (cadr A)))
  (setq sx (- (car D) (car C)) sy (- (cadr D) (cadr C)))
  (setq denom (- (* rx sy) (* ry sx)))
  (if (< (abs denom) 1e-12)
    nil
    (progn
      (setq cax (- (car C) (car A)) cay (- (cadr C) (cadr A)))
      (setq tt (/ (- (* cax sy) (* cay sx)) denom))
      (setq uu (/ (- (* cax ry) (* cay rx)) denom))
      (if (and (>= tt -1e-9) (<= tt 1.000000001) (>= uu -1e-9) (<= uu 1.000000001))
        (list (list (+ (car A) (* tt rx)) (+ (cadr A) (* tt ry))) tt)
        nil
      )
    )
  )
)

;; βρίσκει όλα τα σημεία όπου η ανοιχτή γραμμή curve τέμνει το κλειστό
;; πολύγωνο poly. Επιστρέφει λίστα (σημείο curveSegIdx tOnSeg polyEdgeIdx).
(defun KT:curveCrossings (curve poly / crossings i j m n c1 c2 p1 p2 res)
  (setq crossings nil)
  (setq m (1- (length curve)))
  (setq n (length poly))
  (setq i 0)
  (while (< i m)
    (setq c1 (nth i curve) c2 (nth (1+ i) curve))
    (setq j 0)
    (while (< j n)
      (setq p1 (nth j poly) p2 (nth (rem (1+ j) n) poly))
      (setq res (KT:segXt c1 c2 p1 p2))
      (if res
        (setq crossings (cons (list (nth 0 res) i (nth 1 res) j) crossings))
      )
      (setq j (1+ j))
    )
    (setq i (1+ i))
  )
  (reverse crossings)
)

;; ταξινομεί crossings κατά (curveSegIdx, tOnSeg) αύξουσα σειρά
(defun KT:sortCrossings (xs / remaining result best bestKey item key)
  (setq remaining xs result nil)
  (while remaining
    (setq best (car remaining))
    (setq bestKey (list (nth 1 best) (nth 2 best)))
    (foreach item (cdr remaining)
      (setq key (list (nth 1 item) (nth 2 item)))
      (if (or (< (car key) (car bestKey))
              (and (= (car key) (car bestKey)) (< (cadr key) (cadr bestKey))))
        (progn (setq best item) (setq bestKey key))
      )
    )
    (setq result (cons best result))
    (setq remaining (KT:removeExact remaining best))
  )
  (reverse result)
)

;; αφαιρεί ένα ακριβές στοιχείο (equal) από λίστα
(defun KT:removeExact (lst item / result x)
  (setq result nil)
  (foreach x lst (if (not (equal x item)) (setq result (cons x result))))
  (reverse result)
)

;; περπατάει πάνω στο πολύγωνο ΜΠΡΟΣΤΑ (φορά κορυφών) από το σημείο
;; startPt (πάνω στην πλευρά startEdge) μέχρι το endPt (στην πλευρά endEdge).
;; Επιστρέφει ανοιχτή λίστα σημείων: [startPt, ενδιάμεσες κορυφές, endPt]
(defun KT:walkForward (poly startPt startEdge endPt endEdge / n result idx)
  (setq n (length poly))
  (setq result (list startPt))
  (setq idx (rem (1+ startEdge) n))
  (while (/= idx (rem (1+ endEdge) n))
    (setq result (append result (list (nth idx poly))))
    (setq idx (rem (1+ idx) n))
  )
  (append result (list endPt))
)

;; εξαγωγή κορυφών LWPOLYLINE (κωδικός 10) από entget list
(defun KT:getVerts (edata / verts)
  (setq verts nil)
  (foreach pr edata
    (if (= (car pr) 10) (setq verts (cons (cdr pr) verts)))
  )
  (reverse verts)
)

;; εντοπισμός αν υπάρχουν τόξα (bulge <> 0)
(defun KT:hasBulge (edata / found)
  (setq found nil)
  (foreach pr edata
    (if (and (= (car pr) 42) (/= (cdr pr) 0.0)) (setq found T))
  )
  found
)

;; σχεδίαση ενός τμήματος ως καινούργιο κλειστό LWPOLYLINE
(defun KT:drawPoly (poly layName / dxfList)
  (setq dxfList (list (cons 0 "LWPOLYLINE") (cons 8 layName)
                       (cons 90 (length poly)) (cons 70 1)))
  (foreach v poly (setq dxfList (append dxfList (list (cons 10 v)))))
  (entmake dxfList)
)

;; το σημείο με τη μικρότερη απόσταση από refPt μέσα σε μια λίστα σημείων
(defun KT:minByDist (pts refPt / best bestD p)
  (setq best (car pts) bestD (distance refPt (car pts)))
  (foreach p (cdr pts)
    (if (< (distance refPt p) bestD) (progn (setq best p) (setq bestD (distance refPt p))))
  )
  best
)

;; αφαιρεί ένα σημείο (με ανοχή) από λίστα σημείων
(defun KT:removeItem (lst item / result p)
  (setq result nil)
  (foreach p lst (if (not (equal p item 1e-6)) (setq result (cons p result))))
  (reverse result)
)

;; ταξινομεί σημεία κατά αύξουσα απόσταση από refPt
(defun KT:sortByDist (pts refPt / remaining result best)
  (setq remaining pts result nil)
  (while remaining
    (setq best (KT:minByDist remaining refPt))
    (setq result (cons best result))
    (setq remaining (KT:removeItem remaining best))
  )
  (reverse result)
)

;; χτίζει τη νέα πλήρη λίστα κορυφών του αρχικού πολυγώνου, εισάγοντας τα
;; νέα σημεία τομής στη σωστή θέση πάνω σε κάθε πλευρά
(defun KT:buildNewVertList (verts allCross / n i result grp)
  (setq n (length verts) result nil i 0)
  (while (< i n)
    (setq result (cons (nth i verts) result))
    (setq grp nil)
    (foreach c allCross (if (= (car c) i) (setq grp (cons (cdr c) grp))))
    (if grp
      (progn
        (setq grp (KT:sortByDist grp (nth i verts)))
        (foreach g grp (setq result (cons g result)))
      )
    )
    (setq i (1+ i))
  )
  (reverse result)
)

;; ξαναφτιάχνει τη λίστα DXF μιας LWPOLYLINE με νέα λίστα κορυφών,
;; κρατώντας layer/χρώμα/κλειστό κλπ ίδια
(defun KT:rebuildEntity (edata newVerts / preList postList found pr)
  (setq preList nil postList nil found nil)
  (foreach pr edata
    (cond
      ((member (car pr) '(10 40 41 42 91)) nil)
      ((= (car pr) 90)
        (setq preList (cons (cons 90 (length newVerts)) preList))
        (setq found T)
      )
      ((and found (member (car pr) '(70 43 38 39)))
        (setq preList (cons pr preList))
      )
      (found (setq postList (cons pr postList)))
      (T (setq preList (cons pr preList)))
    )
  )
  (setq preList (reverse preList))
  (setq postList (reverse postList))
  (append preList (mapcar (function (lambda (p) (cons 10 p))) newVerts) postList)
)

;; ================================================================
;; ΕΝΤΟΛΗ PLTBOUND
;; ================================================================
(defun c:PLTBOUND ( / *error* oldosmode oldcmdecho oldlayer
                      sel1 ent1 edata1 verts sel2 ent2 edata2 curve
                      crossings X1 X2 i1 e1 i2 e2 chain1 chain2
                      effMid piece1 piece2 area1 area2
                      newVertList layName txtH cen txt )

  (defun *error* (msg)
    (if oldosmode (setvar "OSMODE" oldosmode))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if oldlayer (setvar "CLAYER" oldlayer))
    (if (and msg (/= msg "Function cancelled") (/= msg "quit / exit abort"))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 PLTBOUND: " msg))
    )
    (princ)
  )

  (setq oldosmode  (getvar "OSMODE"))
  (setq oldcmdecho (getvar "CMDECHO"))
  (setq oldlayer   (getvar "CLAYER"))
  (setvar "CMDECHO" 0)

  ;; ---------------- ΕΠΙΛΟΓΗ ΠΟΛΥΓΩΝΟΥ ----------------
  (setvar "OSMODE" 511)
  (setq sel1 (entsel "\n\U+0395\U+03C0\U+03B9\U+03BB\U+03AD\U+03BE\U+03C4\U+03B5 \U+03C4\U+03BF \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF \U+03C4\U+03BF\U+03C5 \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5 (LWPOLYLINE): "))
  (setvar "OSMODE" 0)
  (if (not sel1) (exit))
  (setq ent1 (car sel1))
  (setq edata1 (entget ent1))
  (if (/= (cdr (assoc 0 edata1)) "LWPOLYLINE")
    (progn (princ "\n\U+03A0\U+03C1\U+03AD\U+03C0\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03B5\U+03C0\U+03B9\U+03BB\U+03AD\U+03BE\U+03B5\U+03C4\U+03B5 LWPOLYLINE.") (exit)))
  (if (= (logand (cdr (assoc 70 edata1)) 1) 0)
    (progn (princ "\n\U+03A4\U+03BF \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF \U+03C0\U+03C1\U+03AD\U+03C0\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC.") (exit)))
  (if (KT:hasBulge edata1)
    (princ "\n\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03C4\U+03BF \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF \U+03AD\U+03C7\U+03B5\U+03B9 \U+03C4\U+03BF\U+03BE\U+03C9\U+03C4\U+03AD\U+03C2 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AD\U+03C2 - \U+03B8\U+03B1 \U+03B1\U+03B3\U+03BD\U+03BF\U+03B7\U+03B8\U+03BF\U+03CD\U+03BD (\U+03B8\U+03B5\U+03C9\U+03C1\U+03BF\U+03CD\U+03BD\U+03C4\U+03B1\U+03B9 \U+03B5\U+03C5\U+03B8\U+03B5\U+03AF\U+03B5\U+03C2)."))
  (setq verts (KT:getVerts edata1))
  (if (< (length verts) 3) (progn (princ "\n\U+039C\U+03B7 \U+03AD\U+03B3\U+03BA\U+03C5\U+03C1\U+03BF \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF.") (exit)))

  ;; ---------------- ΕΠΙΛΟΓΗ ΓΡΑΜΜΗΣ ΚΟΙΝΟΥ ΟΡΙΟΥ ----------------
  (setvar "OSMODE" 511)
  (setq sel2 (entsel "\n\U+0395\U+03C0\U+03B9\U+03BB\U+03AD\U+03BE\U+03C4\U+03B5 \U+03C4\U+03B7 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03C4\U+03BF\U+03C5 \U+03BA\U+03BF\U+03B9\U+03BD\U+03BF\U+03CD \U+03BF\U+03C1\U+03AF\U+03BF\U+03C5 (\U+03C0\U+03C1\U+03AD\U+03C0\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03C0\U+03C1\U+03BF\U+03B5\U+03BE\U+03AD\U+03C7\U+03B5\U+03B9 \U+03BA\U+03B1\U+03B9 \U+03C3\U+03C4\U+03B9\U+03C2 \U+03B4\U+03CD\U+03BF \U+03AC\U+03BA\U+03C1\U+03B5\U+03C2): "))
  (setvar "OSMODE" 0)
  (if (not sel2) (exit))
  (setq ent2 (car sel2))
  (setq edata2 (entget ent2))
  (if (/= (cdr (assoc 0 edata2)) "LWPOLYLINE")
    (progn (princ "\n\U+03A0\U+03C1\U+03AD\U+03C0\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03B5\U+03C0\U+03B9\U+03BB\U+03AD\U+03BE\U+03B5\U+03C4\U+03B5 LWPOLYLINE.") (exit)))
  (if (KT:hasBulge edata2)
    (princ "\n\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03B7 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03AD\U+03C7\U+03B5\U+03B9 \U+03C4\U+03BF\U+03BE\U+03C9\U+03C4\U+03AC \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1\U+03C4\U+03B1 - \U+03B8\U+03B1 \U+03B1\U+03B3\U+03BD\U+03BF\U+03B7\U+03B8\U+03BF\U+03CD\U+03BD (\U+03B8\U+03B5\U+03C9\U+03C1\U+03BF\U+03CD\U+03BD\U+03C4\U+03B1\U+03B9 \U+03B5\U+03C5\U+03B8\U+03B5\U+03AF\U+03B5\U+03C2)."))
  (setq curve (KT:getVerts edata2))
  (if (< (length curve) 2) (progn (princ "\n\U+039C\U+03B7 \U+03AD\U+03B3\U+03BA\U+03C5\U+03C1\U+03B7 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE.") (exit)))

  ;; ---------------- ΕΥΡΕΣΗ ΤΟΜΩΝ ----------------
  (setq crossings (KT:sortCrossings (KT:curveCrossings curve verts)))
  (if (/= (length crossings) 2)
    (progn
      (princ (strcat "\n\U+0397 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE \U+03C4\U+03AD\U+03BC\U+03BD\U+03B5\U+03B9 \U+03C4\U+03BF \U+03CC\U+03C1\U+03B9\U+03BF \U+03C4\U+03BF\U+03C5 \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5 " (itoa (length crossings))
                      " \U+03C6\U+03BF\U+03C1\U+03AD\U+03C2 \U+03B1\U+03BD\U+03C4\U+03AF \U+03B3\U+03B9\U+03B1 2. \U+03A4\U+03C1\U+03AC\U+03B2\U+03B7\U+03BE\U+03AD \U+03C4\U+03B7\U+03BD \U+03BD\U+03B1 \U+03C0\U+03C1\U+03BF\U+03B5\U+03BE\U+03AD\U+03C7\U+03B5\U+03B9 \U+03BA\U+03B1\U+03B8\U+03B1\U+03C1\U+03AC \U+03BA\U+03B1\U+03B9 \U+03C3\U+03C4\U+03B9\U+03C2 \U+03B4\U+03CD\U+03BF \U+03AC\U+03BA\U+03C1\U+03B5\U+03C2, \U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03AC\U+03BB\U+03BB\U+03B5\U+03C2 \U+03C4\U+03BF\U+03BC\U+03AD\U+03C2, \U+03BA\U+03B1\U+03B9 \U+03BE\U+03B1\U+03BD\U+03B1\U+03B4\U+03BF\U+03BA\U+03AF\U+03BC\U+03B1\U+03C3\U+03B5."))
      (setvar "OSMODE" oldosmode) (setvar "CMDECHO" oldcmdecho)
      (exit)
    )
  )
  (setq X1 (nth 0 crossings) X2 (nth 1 crossings))

  ;; ---------------- ΧΤΙΣΙΜΟ ΤΩΝ 2 ΤΜΗΜΑΤΩΝ ----------------
  (setq chain1 (KT:walkForward verts (nth 0 X1) (nth 3 X1) (nth 0 X2) (nth 3 X2)))
  (setq chain2 (KT:walkForward verts (nth 0 X2) (nth 3 X2) (nth 0 X1) (nth 3 X1)))

  ;; ενδιάμεσα σημεία της γραμμής ανάμεσα στις 2 τομές (φορά προς τα εμπρος)
  (setq effMid nil)
  (setq i1 (1+ (nth 1 X1)))
  (setq i2 (nth 1 X2))
  (while (<= i1 i2)
    (setq effMid (append effMid (list (nth i1 curve))))
    (setq i1 (1+ i1))
  )

  (setq piece1 (append chain1 (reverse effMid)))
  (setq piece2 (append chain2 effMid))
  (setq area1 (KT:area piece1))
  (setq area2 (KT:area piece2))

  ;; ---------------- ΕΝΗΜΕΡΩΣΗ ΑΡΧΙΚΟΥ ΠΟΛΥΓΩΝΟΥ ΜΕ ΝΕΕΣ ΚΟΡΥΦΕΣ ----------------
  (setq newVertList (KT:buildNewVertList verts (list (cons (nth 3 X1) (nth 0 X1)) (cons (nth 3 X2) (nth 0 X2)))))
  (entmod (KT:rebuildEntity edata1 newVertList))
  (entupd ent1)
  (princ "\n\U+03A0\U+03C1\U+03BF\U+03C3\U+03C4\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD 2 \U+03BD\U+03AD\U+03B5\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2 (\U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03B1 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2) \U+03C3\U+03C4\U+03BF \U+03B1\U+03C1\U+03C7\U+03B9\U+03BA\U+03CC \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF.")

  ;; ---------------- LAYER ----------------
  (setq layName "BRB-PLTBOUND")
  (command "_.-LAYER" "_M" layName "")
  (setvar "CLAYER" layName)

  ;; ---------------- ΥΨΟΣ ΓΡΑΜΜΑΤΩΝ ΕΤΙΚΕΤΑΣ ----------------
  (setq txtH (getreal "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AC\U+03C4\U+03C9\U+03BD \U+03B5\U+03C4\U+03B9\U+03BA\U+03AD\U+03C4\U+03B1\U+03C2 (\U+03BC.) <2.0>: "))
  (if (not txtH) (setq txtH 2.0))

  ;; ---------------- ΣΧΕΔΙΑΣΗ + ΕΤΙΚΕΤΕΣ ----------------
  (command "_.UNDO" "_BEGIN")
  (princ "\n--- \U+0391\U+03C0\U+03BF\U+03C4\U+03AD\U+03BB\U+03B5\U+03C3\U+03BC\U+03B1 ---")

  (KT:drawPoly piece1 layName)
  (setq cen (KT:centroid piece1))
  (setq txt (strcat "\U+03A4\U+03BC\U+03AE\U+03BC\U+03B1 \U+0391: " (rtos area1 2 2) " \U+03C4.\U+03BC."))
  (command "_.TEXT" "_J" "_MC" cen txtH 0 txt)
  (princ (strcat "\n" txt))

  (KT:drawPoly piece2 layName)
  (setq cen (KT:centroid piece2))
  (setq txt (strcat "\U+03A4\U+03BC\U+03AE\U+03BC\U+03B1 \U+0392: " (rtos area2 2 2) " \U+03C4.\U+03BC."))
  (command "_.TEXT" "_J" "_MC" cen txtH 0 txt)
  (princ (strcat "\n" txt))

  (command "_.UNDO" "_END")

  (setvar "OSMODE" oldosmode)
  (setvar "CMDECHO" oldcmdecho)
  (princ "\n\U+039F\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5.")
  (princ)
)

(princ "\nPLTBOUND.LSP \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+03A0\U+03BB\U+03B7\U+03BA\U+03C4\U+03C1\U+03BF\U+03BB\U+03CC\U+03B3\U+03B7\U+03C3\U+03B5 PLTBOUND \U+03B3\U+03B9\U+03B1 \U+03BA\U+03B1\U+03C4\U+03AC\U+03C4\U+03BC\U+03B7\U+03C3\U+03B7 \U+03BC\U+03B5 \U+03C4\U+03B5\U+03B8\U+03BB\U+03B1\U+03C3\U+03BC\U+03AD\U+03BD\U+03BF \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC \U+03CC\U+03C1\U+03B9\U+03BF.")
(princ)
