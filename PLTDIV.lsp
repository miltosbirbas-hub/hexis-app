;;; ============================================================
;;; PLTDIV.LSP
;;; Χωρίζει ένα κλειστό πολύγωνο (LWPOLYLINE, ευθύγραμμες πλευρές)
;;; σε Ν τμήματα ίσου εμβαδού.
;;;
;;; Αν το οικόπεδο εφάπτεται σε δρόμο: δείχνεις την πλευρά του
;;; δρόμου (pick 2 σημείων πάνω σε αυτήν), δίνεις την ελάχιστη
;;; πρόσοψη ανά τμήμα, και ο αλγόριθμος υπολογίζει τις τομές έτσι
;;; ώστε κάθε τμήμα να έχει τουλάχιστον αυτή την πρόσοψη -
;;; αναπροσαρμόζοντας αυτόματα τα εμβαδά των υπόλοιπων τμημάτων
;;; όποτε η ελάχιστη πρόσοψη "\U+03C4\U+03C1\U+03CE\U+03B5\U+03B9" εμβαδόν από ένα τμήμα.
;;;
;;; Αν δεν εφάπτεται σε δρόμο: δείχνεις απλά 2 σημεία που ορίζουν
;;; την κατεύθυνση διαχωρισμού, χωρίς περιορισμό ελάχιστου μήκους.
;;;
;;; ΠΕΡΙΟΡΙΣΜΟΙ:
;;;  - Το πολύγωνο πρέπει να είναι κλειστό LWPOLYLINE με ευθείες
;;;    πλευρές (χωρίς τόξα/bulge - αν έχει, βγάζει προειδοποίηση).
;;;  - Δουλεύει σωστά και σε μη-κυρτά (concave) πολύγωνα.
;;;  - Δεν διαγράφει το αρχικό πολύγωνο - βάζει τα νέα τμήματα σε
;;;    ξεχωριστό layer, το αρχικό μένει άθικτο.
;;;
;;; BRB DEVELOPMENT MON. I.K.E. - Μ. Μπιρμπας
;;; Εντολή: PLTDIV
;;; ============================================================

(defun KT:layer () "BRB-PLTDIV")

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

;; προβολή (x-y) σημείου πάνω σε κατεύθυνση dir από σημείο αναφοράς linePt
(defun KT:sd (pt linePt dir)
  (+ (* (- (car pt) (car linePt)) (car dir)) (* (- (cadr pt) (cadr linePt)) (cadr dir)))
)

;; τομή ευθύγραμμου τμήματος p1-p2 με ευθεία (linePt, κάθετη στο dir)
(defun KT:lineX (p1 p2 linePt dir / d1 d2 tt)
  (setq d1 (KT:sd p1 linePt dir))
  (setq d2 (KT:sd p2 linePt dir))
  (setq tt (/ d1 (- d1 d2)))
  (list (+ (car p1) (* tt (- (car p2) (car p1))))
        (+ (cadr p1) (* tt (- (cadr p2) (cadr p1)))))
)

;; κόψιμο πολυγώνου με ημιεπίπεδο (Sutherland-Hodgman, 1 επίπεδο - ισχύει
;; και για μη-κυρτά πολύγωνα). keepNeg=T κρατάει το κομμάτι με sd<=0.
(defun KT:clip (poly linePt dir keepNeg / result n i cur prev dCur dPrev curIn prevIn)
  (setq result nil n (length poly) i 0)
  (while (< i n)
    (setq cur (nth i poly))
    (setq prev (nth (if (= i 0) (1- n) (1- i)) poly))
    (setq dCur (KT:sd cur linePt dir))
    (setq dPrev (KT:sd prev linePt dir))
    (setq curIn (if keepNeg (<= dCur 1e-9) (>= dCur -1e-9)))
    (setq prevIn (if keepNeg (<= dPrev 1e-9) (>= dPrev -1e-9)))
    (cond
      ((and prevIn curIn) (setq result (cons cur result)))
      ((and prevIn (not curIn))
        (setq result (cons (KT:lineX prev cur linePt dir) result)))
      ((and (not prevIn) curIn)
        (setq result (cons (KT:lineX prev cur linePt dir) result))
        (setq result (cons cur result)))
    )
    (setq i (1+ i))
  )
  (reverse result)
)

;; απόσταση σημείου από ευθύγραμμο τμήμα a-b
(defun KT:ptLineDist (pt a b / dx dy len tt px py)
  (setq dx (- (car b) (car a)) dy (- (cadr b) (cadr a)))
  (setq len (sqrt (+ (* dx dx) (* dy dy))))
  (if (< len 1e-9)
    (distance pt a)
    (progn
      (setq tt (/ (+ (* (- (car pt) (car a)) dx) (* (- (cadr pt) (cadr a)) dy)) (* len len)))
      (if (< tt 0.0) (setq tt 0.0))
      (if (> tt 1.0) (setq tt 1.0))
      (setq px (+ (car a) (* tt dx)) py (+ (cadr a) (* tt dy)))
      (distance pt (list px py))
    )
  )
)

;; βρίσκει την πλευρά (ζεύγος διαδοχικών κορυφών) του πολυγώνου που είναι
;; πιο κοντά στα 2 σημεία που έδειξε ο χρήστης
(defun KT:nearestEdge (poly pk1 pk2 / n i a b bestI bestD dtot)
  (setq n (length poly) bestI 0 bestD nil i 0)
  (while (< i n)
    (setq a (nth i poly))
    (setq b (nth (rem (1+ i) n) poly))
    (setq dtot (+ (KT:ptLineDist pk1 a b) (KT:ptLineDist pk2 a b)))
    (if (or (not bestD) (< dtot bestD)) (progn (setq bestD dtot) (setq bestI i)))
    (setq i (1+ i))
  )
  (list (nth bestI poly) (nth (rem (1+ bestI) n) poly))
)

;; εξαγωγή κορυφών LWPOLYLINE (κωδικός 10) από entget list
(defun KT:getVerts (edata / verts)
  (setq verts nil)
  (foreach pr edata
    (if (= (car pr) 10) (setq verts (cons (cdr pr) verts)))
  )
  (reverse verts)
)

;; εντοπισμός αν υπάρχουν τόξα (bulge <> 0) στο LWPOLYLINE
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

;; βρίσκει τα σημεία όπου μια ευθεία (linePt, κάθετη στο dir) τέμνει τις
;; πλευρές του πολυγώνου. Επιστρέφει λίστα (edgeIndex . point).
(defun KT:crossingsIdx (poly linePt dir / n i a b da db pts)
  (setq pts nil n (length poly) i 0)
  (while (< i n)
    (setq a (nth i poly) b (nth (rem (1+ i) n) poly))
    (setq da (KT:sd a linePt dir))
    (setq db (KT:sd b linePt dir))
    (if (< (* da db) 0.0)
      (setq pts (cons (cons i (KT:lineX a b linePt dir)) pts))
    )
    (setq i (1+ i))
  )
  (reverse pts)
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

;; ---------- ΚΥΡΙΟΣ ΑΛΓΟΡΙΘΜΟΣ ΚΑΤΑΤΜΗΣΗΣ ----------
;; Επιστρέφει (list results allCross):
;;  results  = λίστα από (piece frontageLen pieceArea), Ν στοιχεία
;;  allCross = λίστα (edgeIndex . point) - σημεία τομής πάνω στο ΑΡΧΙΚΟ όριο
;; minSide = nil -> χωρίς περιορισμό ελάχιστου μήκους.
(defun KT:split (poly totalArea nParts F1 F2 minSide /
                  dirV dirLen dirU projs pmin pmax originPt sweepLen
                  remaining remArea remParts prevT k target
                  loT hiT lo hi mid areaMid tCut linePt piece frLen results v proj
                  allCross)

  (setq dirV (list (- (car F2) (car F1)) (- (cadr F2) (cadr F1))))
  (setq dirLen (distance F1 F2))
  (setq dirU (list (/ (car dirV) dirLen) (/ (cadr dirV) dirLen)))

  ;; πραγματικό εύρος σάρωσης: προβολή όλων των κορυφών πάνω στο dirU
  (setq pmin nil pmax nil)
  (foreach v poly
    (setq proj (KT:sd v F1 dirU))
    (if (or (not pmin) (< proj pmin)) (setq pmin proj))
    (if (or (not pmax) (> proj pmax)) (setq pmax proj))
  )
  (setq originPt (list (+ (car F1) (* pmin (car dirU))) (+ (cadr F1) (* pmin (cadr dirU)))))
  (setq sweepLen (- pmax pmin))

  (setq remaining poly)
  (setq remArea totalArea)
  (setq remParts nParts)
  (setq prevT 0.0)
  (setq results nil)
  (setq allCross nil)
  (setq k 1)
  (while (< k nParts)
    (setq target (/ remArea remParts))
    (setq loT (+ prevT (if minSide minSide 0.0)))
    (setq hiT (- sweepLen (* (if minSide minSide 0.0) (1- remParts))))
    (if (> loT hiT) (setq loT hiT))
    (setq lo loT hi hiT)
    (repeat 40
      (setq mid (/ (+ lo hi) 2.0))
      (setq linePt (list (+ (car originPt) (* mid (car dirU))) (+ (cadr originPt) (* mid (cadr dirU)))))
      (setq areaMid (KT:area (KT:clip remaining linePt dirU T)))
      (if (< areaMid target) (setq lo mid) (setq hi mid))
    )
    (setq tCut (/ (+ lo hi) 2.0))
    (setq linePt (list (+ (car originPt) (* tCut (car dirU))) (+ (cadr originPt) (* tCut (cadr dirU)))))
    ;; σημεία όπου η ΤΟΜΗ αγγίζει το ΑΡΧΙΚΟ όριο (για vertex insertion)
    (setq allCross (append allCross (KT:crossingsIdx poly linePt dirU)))
    (setq piece (KT:clip remaining linePt dirU T))
    (setq remaining (KT:clip remaining linePt dirU nil))
    (setq frLen (- tCut prevT))
    (setq results (cons (list piece frLen (KT:area piece)) results))
    (setq remArea (- remArea (KT:area piece)))
    (setq remParts (1- remParts))
    (setq prevT tCut)
    (setq k (1+ k))
  )
  (setq frLen (- sweepLen prevT))
  (setq results (cons (list remaining frLen (KT:area remaining)) results))
  (list (reverse results) allCross)
)

;; ================================================================
;; ΕΝΤΟΛΗ PLTDIV
;; ================================================================
(defun c:PLTDIV ( / *error* oldosmode oldcmdecho oldlayer
                       sel ent edata verts totalArea nParts
                       roadAns pk1 pk2 edgeAB F1 F2 minSide
                       sweepCheck pieces layName idx item piece frLen ar
                       cen txtH txt totCheck splitResult newCross newVertList )

  (defun *error* (msg)
    (if oldosmode (setvar "OSMODE" oldosmode))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if oldlayer (setvar "CLAYER" oldlayer))
    (if (and msg (/= msg "Function cancelled") (/= msg "quit / exit abort"))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 PLTDIV: " msg))
    )
    (princ)
  )

  (setq oldosmode  (getvar "OSMODE"))
  (setq oldcmdecho (getvar "CMDECHO"))
  (setq oldlayer   (getvar "CLAYER"))
  (setvar "CMDECHO" 0)
  (setvar "OSMODE" 0)

  ;; ---------------- ΕΠΙΛΟΓΗ ΠΟΛΥΓΩΝΟΥ ----------------
  (setvar "OSMODE" 511)
  (setq sel (entsel "\n\U+0395\U+03C0\U+03B9\U+03BB\U+03AD\U+03BE\U+03C4\U+03B5 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF (LWPOLYLINE): "))
  (setvar "OSMODE" 0)
  (if (not sel) (exit))
  (setq ent (car sel))
  (setq edata (entget ent))
  (if (/= (cdr (assoc 0 edata)) "LWPOLYLINE")
    (progn (princ "\n\U+03A0\U+03C1\U+03AD\U+03C0\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03B5\U+03C0\U+03B9\U+03BB\U+03AD\U+03BE\U+03B5\U+03C4\U+03B5 LWPOLYLINE.") (exit)))
  (if (= (logand (cdr (assoc 70 edata)) 1) 0)
    (progn (princ "\n\U+03A4\U+03BF \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF \U+03C0\U+03C1\U+03AD\U+03C0\U+03B5\U+03B9 \U+03BD\U+03B1 \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03BA\U+03BB\U+03B5\U+03B9\U+03C3\U+03C4\U+03CC.") (exit)))
  (if (KT:hasBulge edata)
    (princ "\n\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03C4\U+03BF \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF \U+03AD\U+03C7\U+03B5\U+03B9 \U+03C4\U+03BF\U+03BE\U+03C9\U+03C4\U+03AD\U+03C2 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AD\U+03C2 - \U+03B8\U+03B1 \U+03B1\U+03B3\U+03BD\U+03BF\U+03B7\U+03B8\U+03BF\U+03CD\U+03BD (\U+03B8\U+03B5\U+03C9\U+03C1\U+03BF\U+03CD\U+03BD\U+03C4\U+03B1\U+03B9 \U+03B5\U+03C5\U+03B8\U+03B5\U+03AF\U+03B5\U+03C2)."))

  (setq verts (KT:getVerts edata))
  (if (< (length verts) 3) (progn (princ "\n\U+039C\U+03B7 \U+03AD\U+03B3\U+03BA\U+03C5\U+03C1\U+03BF \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF.") (exit)))
  (setq totalArea (KT:area verts))

  ;; ---------------- ΑΡΙΘΜΟΣ ΤΜΗΜΑΤΩΝ ----------------
  (initget 7)
  (setq nParts (getint (strcat "\n\U+03A3\U+03B5 \U+03C0\U+03CC\U+03C3\U+03B1 \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1\U+03C4\U+03B1 \U+03BD\U+03B1 \U+03C7\U+03C9\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03AF (\U+03C3\U+03C5\U+03BD\U+03BF\U+03BB\U+03B9\U+03BA\U+03CC \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD "
                                (rtos totalArea 2 2) " \U+03C4.\U+03BC.): ")))
  (if (or (not nParts) (< nParts 2)) (exit))

  ;; ---------------- ΕΦΑΠΤΕΤΑΙ ΣΕ ΔΡΟΜΟ; ----------------
  (initget "N O")
  (setq roadAns (getkword "\n\U+0395\U+03C6\U+03AC\U+03C0\U+03C4\U+03B5\U+03C4\U+03B1\U+03B9 \U+03C3\U+03B5 \U+03B4\U+03C1\U+03CC\U+03BC\U+03BF; [N=\U+039D\U+03B1\U+03B9/O=\U+039F\U+03C7\U+03B9] <O>: "))
  (if (not roadAns) (setq roadAns "O"))

  (if (= roadAns "N")
    (progn
      (setq pk1 (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF 1 \U+03C0\U+03AC\U+03BD\U+03C9 \U+03C3\U+03C4\U+03B7\U+03BD \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC \U+03C4\U+03BF\U+03C5 \U+03B4\U+03C1\U+03CC\U+03BC\U+03BF\U+03C5: "))
      (setq pk2 (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF 2 \U+03C0\U+03AC\U+03BD\U+03C9 \U+03C3\U+03C4\U+03B7\U+03BD \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC \U+03C4\U+03BF\U+03C5 \U+03B4\U+03C1\U+03CC\U+03BC\U+03BF\U+03C5: "))
      (setq edgeAB (KT:nearestEdge verts pk1 pk2))
      (setq F1 (nth 0 edgeAB) F2 (nth 1 edgeAB))
      (setq minSide (getreal "\n\U+0395\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF \U+03BC\U+03AE\U+03BA\U+03BF\U+03C2 \U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7\U+03C2 \U+03B1\U+03BD\U+03AC \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1 (\U+03BC.): "))
      (if (not minSide) (setq minSide 0.0))
    )
    (progn
      (setq pk1 (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF 1 (\U+03BA\U+03B1\U+03C4\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03C3\U+03B7 \U+03B4\U+03B9\U+03B1\U+03C7\U+03C9\U+03C1\U+03B9\U+03C3\U+03BC\U+03BF\U+03CD): "))
      (setq pk2 (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF 2 (\U+03BA\U+03B1\U+03C4\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03C3\U+03B7 \U+03B4\U+03B9\U+03B1\U+03C7\U+03C9\U+03C1\U+03B9\U+03C3\U+03BC\U+03BF\U+03CD): "))
      (setq F1 pk1 F2 pk2)
      (setq minSide nil)
    )
  )

  ;; ---------------- ΕΛΕΓΧΟΣ ΕΦΙΚΤΟΤΗΤΑΣ ΕΛΑΧΙΣΤΗΣ ΠΡΟΣΟΨΗΣ ----------------
  (if (and minSide (> minSide 0.0))
    (progn
      (setq sweepCheck (distance F1 F2))
      ;; πραγματικό εύρος σαρωσης (ιδιο με μεσα στο KT:split) για σωστο ελεγχο
      (setq totCheck
        (- (apply 'max (mapcar '(lambda (v) (KT:sd v F1 (list (/ (- (car F2)(car F1)) sweepCheck) (/ (- (cadr F2)(cadr F1)) sweepCheck)))) verts))
           (apply 'min (mapcar '(lambda (v) (KT:sd v F1 (list (/ (- (car F2)(car F1)) sweepCheck) (/ (- (cadr F2)(cadr F1)) sweepCheck)))) verts))
        )
      )
      (if (> (* minSide nParts) totCheck)
        (progn
          (setq nParts (max 1 (fix (/ totCheck minSide))))
          (princ (strcat "\n\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03B4\U+03B5\U+03BD \U+03C7\U+03C9\U+03C1\U+03AC\U+03BD\U+03B5 \U+03C4\U+03CC\U+03C3\U+03B1 \U+03C4\U+03BC\U+03AE\U+03BC\U+03B1\U+03C4\U+03B1 \U+03BC\U+03B5 \U+03B1\U+03C5\U+03C4\U+03AE \U+03C4\U+03B7\U+03BD \U+03B5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B7 \U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7 - \U+03BC\U+03B5\U+03B9\U+03CE\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD \U+03C3\U+03B5 "
                          (itoa nParts) "."))
        )
      )
    )
  )

  ;; ---------------- ΚΑΤΑΤΜΗΣΗ ----------------
  (setq splitResult (KT:split verts totalArea nParts F1 F2 minSide))
  (setq pieces   (nth 0 splitResult))
  (setq newCross (nth 1 splitResult))

  ;; ---------------- ΕΝΗΜΕΡΩΣΗ ΑΡΧΙΚΟΥ ΠΟΛΥΓΩΝΟΥ ΜΕ ΝΕΕΣ ΚΟΡΥΦΕΣ ----------------
  ;; Τα σημεία όπου δημιουργείται κάθε κοινό όριο μπαίνουν ως πραγματικές
  ;; vertices στο ΑΡΧΙΚΟ πολύγωνο, ώστε να συμμετέχουν σε μελλοντικό
  ;; υπολογισμό εμβαδού/λίστα συντεταγμένων του.
  (if newCross
    (progn
      (setq newVertList (KT:buildNewVertList verts newCross))
      (entmod (KT:rebuildEntity edata newVertList))
      (entupd ent)
      (princ (strcat "\n\U+03A0\U+03C1\U+03BF\U+03C3\U+03C4\U+03AD\U+03B8\U+03B7\U+03BA\U+03B1\U+03BD " (itoa (length newCross))
                      " \U+03BD\U+03AD\U+03B5\U+03C2 \U+03BA\U+03BF\U+03C1\U+03C5\U+03C6\U+03AD\U+03C2 \U+03C3\U+03C4\U+03BF \U+03B1\U+03C1\U+03C7\U+03B9\U+03BA\U+03CC \U+03C0\U+03BF\U+03BB\U+03CD\U+03B3\U+03C9\U+03BD\U+03BF."))
    )
  )

  ;; ---------------- LAYER ----------------
  (setq layName (KT:layer))
  (command "_.-LAYER" "_M" layName "")
  (setvar "CLAYER" layName)

  ;; ---------------- ΥΨΟΣ ΓΡΑΜΜΑΤΩΝ ΕΤΙΚΕΤΑΣ ----------------
  (setq txtH (getreal "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AC\U+03C4\U+03C9\U+03BD \U+03B5\U+03C4\U+03B9\U+03BA\U+03AD\U+03C4\U+03B1\U+03C2 (\U+03BC.) <2.0>: "))
  (if (not txtH) (setq txtH 2.0))

  ;; ---------------- ΣΧΕΔΙΑΣΗ + ΕΤΙΚΕΤΕΣ ----------------
  (command "_.UNDO" "_BEGIN")
  (setq idx 1)
  (princ "\n--- \U+0391\U+03C0\U+03BF\U+03C4\U+03B5\U+03BB\U+03AD\U+03C3\U+03BC\U+03B1\U+03C4\U+03B1 \U+03BA\U+03B1\U+03C4\U+03AC\U+03C4\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 ---")
  (foreach item pieces
    (setq piece (nth 0 item) frLen (nth 1 item) ar (nth 2 item))
    (KT:drawPoly piece layName)
    (setq cen (KT:centroid piece))
    (setq txt (strcat "\U+03A4\U+03BC\U+03AE\U+03BC\U+03B1 " (itoa idx) ": " (rtos ar 2 2) " \U+03C4.\U+03BC."))
    (if (and minSide (> minSide 0.0))
      (setq txt (strcat txt " (\U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7 " (rtos frLen 2 2) " \U+03BC.)")))
    (command "_.TEXT" "_J" "_MC" cen txtH 0 txt)
    (princ (strcat "\n" txt))
    (setq idx (1+ idx))
  )
  (command "_.UNDO" "_END")

  (setvar "OSMODE" oldosmode)
  (setvar "CMDECHO" oldcmdecho)
  (princ "\n\U+039F\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5.")
  (princ)
)

(princ "\nPLTDIV.LSP \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+03A0\U+03BB\U+03B7\U+03BA\U+03C4\U+03C1\U+03BF\U+03BB\U+03CC\U+03B3\U+03B7\U+03C3\U+03B5 PLTDIV \U+03B3\U+03B9\U+03B1 \U+03BA\U+03B1\U+03C4\U+03AC\U+03C4\U+03BC\U+03B7\U+03C3\U+03B7 \U+03C0\U+03BF\U+03BB\U+03C5\U+03B3\U+03CE\U+03BD\U+03BF\U+03C5.")
(princ)
