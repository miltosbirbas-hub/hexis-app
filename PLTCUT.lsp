;;; ============================================================
;;; PLTCUT.LSP
;;; Κόβει από ένα κλειστό πολύγωνο (LWPOLYLINE, ευθύγραμμες πλευρές)
;;; ένα τεμάχιο συγκεκριμένου εμβαδού, ξεκινώντας από μια πλευρά -
;;; και επιστρέφει 2 πολύγωνα: το ΝΕΟ ΤΕΜΑΧΙΟ και το ΥΠΟΛΟΙΠΟ.
;;;
;;; Αν το τεμάχιο εφάπτεται σε δρόμο: δείχνεις την πλευρά του δρόμου
;;; (pick 2 σημείων πάνω σε αυτήν) και δίνεις την ελάχιστη πρόσοψη.
;;; Μπορείς επίσης να ζητήσεις ελάχιστο πλάτος (5μ εντός σχεδίου /
;;; 15μ εκτός σχεδίου, ή δικό σου νούμερο) - ο αλγόριθμος δοκιμάζει
;;; κλίση στην τομή (όχι μόνο κάθετη) ώστε το νέο τεμάχιο να έχει
;;; αυτό το πλάτος στο πιο στενό του σημείο.
;;;
;;; ΠΕΡΙΟΡΙΣΜΟΙ:
;;;  - Το πολύγωνο πρέπει να είναι κλειστό LWPOLYLINE με ευθείες
;;;    πλευρές (χωρίς τόξα/bulge - αν έχει, βγάζει προειδοποίηση).
;;;  - Δουλεύει σωστά και σε μη-κυρτά (concave) πολύγωνα.
;;;  - Στα σημεία της νέας τομής, προσθέτει πραγματικές νέες
;;;    κορυφές (vertices) και στο ΑΡΧΙΚΟ πολύγωνο.
;;;
;;; BRB DEVELOPMENT MON. I.K.E. - Μ. Μπιρμπας
;;; Εντολή: PLTCUT
;;; ============================================================

;; ---------- ΓΕΩΜΕΤΡΙΚΕΣ ΒΟΗΘΗΤΙΚΕΣ ----------

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
(defun KT:sd (pt linePt dir)
  (+ (* (- (car pt) (car linePt)) (car dir)) (* (- (cadr pt) (cadr linePt)) (cadr dir)))
)
(defun KT:lineX (p1 p2 linePt dir / d1 d2 tt)
  (setq d1 (KT:sd p1 linePt dir))
  (setq d2 (KT:sd p2 linePt dir))
  (setq tt (/ d1 (- d1 d2)))
  (list (+ (car p1) (* tt (- (car p2) (car p1))))
        (+ (cadr p1) (* tt (- (cadr p2) (cadr p1)))))
)
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
(defun KT:rotVec (v ang / c s)
  (setq c (cos ang) s (sin ang))
  (list (- (* (car v) c) (* (cadr v) s)) (+ (* (car v) s) (* (cadr v) c)))
)
(defun KT:maxPairDist (pts / m a b)
  (setq m 0.0)
  (foreach a pts (foreach b pts (if (> (distance a b) m) (setq m (distance a b)))))
  m
)
(defun KT:pieceWidth (piece dirU nSamples / pmin pmax i tt linePt cross widths v proj refPt)
  (if (< (length piece) 3)
    0.0
    (progn
      (setq refPt (car piece))
      (setq pmin nil pmax nil)
      (foreach v piece
        (setq proj (KT:sd v refPt dirU))
        (if (or (not pmin) (< proj pmin)) (setq pmin proj))
        (if (or (not pmax) (> proj pmax)) (setq pmax proj))
      )
      (setq widths nil i 1)
      (while (<= i nSamples)
        (setq tt (+ pmin (* (/ (float i) (1+ nSamples)) (- pmax pmin))))
        (setq linePt (list (+ (car refPt) (* tt (car dirU))) (+ (cadr refPt) (* tt (cadr dirU)))))
        (setq cross (KT:crossingsIdx piece linePt dirU))
        (if (>= (length cross) 2)
          (setq widths (cons (KT:maxPairDist (mapcar (function cdr) cross)) widths))
        )
        (setq i (1+ i))
      )
      (if widths (apply 'min widths) 0.0)
    )
  )
)
(defun KT:getVerts (edata / verts)
  (setq verts nil)
  (foreach pr edata
    (if (= (car pr) 10) (setq verts (cons (cdr pr) verts)))
  )
  (reverse verts)
)
(defun KT:hasBulge (edata / found)
  (setq found nil)
  (foreach pr edata
    (if (and (= (car pr) 42) (/= (cdr pr) 0.0)) (setq found T))
  )
  found
)
(defun KT:drawPoly (poly layName / dxfList)
  (setq dxfList (list (cons 0 "LWPOLYLINE") (cons 8 layName)
                       (cons 90 (length poly)) (cons 70 1)))
  (foreach v poly (setq dxfList (append dxfList (list (cons 10 v)))))
  (entmake dxfList)
)
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
(defun KT:minByDist (pts refPt / best bestD p)
  (setq best (car pts) bestD (distance refPt (car pts)))
  (foreach p (cdr pts)
    (if (< (distance refPt p) bestD) (progn (setq best p) (setq bestD (distance refPt p))))
  )
  best
)
(defun KT:removeItem (lst item / result p)
  (setq result nil)
  (foreach p lst (if (not (equal p item 1e-6)) (setq result (cons p result))))
  (reverse result)
)
(defun KT:sortByDist (pts refPt / remaining result best)
  (setq remaining pts result nil)
  (while remaining
    (setq best (KT:minByDist remaining refPt))
    (setq result (cons best result))
    (setq remaining (KT:removeItem remaining best))
  )
  (reverse result)
)
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
(defun KT:findCut (remaining dirU originPt loT hiT target minWidth nSamples angleList /
                    angDeg angRad cutNormal lo hi mid areaMid tCut linePt piece wid
                    satPiece satRemaining satTCut satLinePt satNormal satWidth
                    fbPiece fbRemaining fbTCut fbLinePt fbNormal fbWidth)
  (setq satPiece nil fbPiece nil fbWidth -1.0)
  (foreach angDeg angleList
    (princ ".")
    (setq angRad (* pi (/ angDeg 180.0)))
    (setq cutNormal (KT:rotVec dirU angRad))
    (setq lo loT hi hiT)
    (repeat 25
      (setq mid (/ (+ lo hi) 2.0))
      (setq linePt (list (+ (car originPt) (* mid (car dirU))) (+ (cadr originPt) (* mid (cadr dirU)))))
      (setq areaMid (KT:area (KT:clip remaining linePt cutNormal T)))
      (if (< areaMid target) (setq lo mid) (setq hi mid))
    )
    (setq tCut (/ (+ lo hi) 2.0))
    (setq linePt (list (+ (car originPt) (* tCut (car dirU))) (+ (cadr originPt) (* tCut (cadr dirU)))))
    (setq piece (KT:clip remaining linePt cutNormal T))
    (setq wid (if (and minWidth (> minWidth 0.0)) (KT:pieceWidth piece dirU nSamples) 1e9))

    (if (> wid fbWidth)
      (progn
        (setq fbWidth wid fbPiece piece fbTCut tCut fbLinePt linePt fbNormal cutNormal)
        (setq fbRemaining (KT:clip remaining linePt cutNormal nil))
      )
    )
    (if (and (not satPiece) minWidth (> minWidth 0.0) (>= wid minWidth))
      (progn
        (setq satPiece piece satTCut tCut satLinePt linePt satNormal cutNormal satWidth wid)
        (setq satRemaining (KT:clip remaining linePt cutNormal nil))
      )
    )
  )
  (if satPiece
    (list satPiece satRemaining satTCut satLinePt satNormal satWidth)
    (list fbPiece fbRemaining fbTCut fbLinePt fbNormal fbWidth)
  )
)
;; ---------- ΜΙΑ ΤΟΜΗ ΣΥΓΚΕΚΡΙΜΕΝΟΥ ΕΜΒΑΔΟΥ (για PLTCUT) ----------
;; Κόβει από το poly ένα κομμάτι με εμβαδόν = targetArea, ξεκινώντας από
;; την πλευρά F1-F2. Επιστρέφει (list newPiece remainderPiece allCross).
(defun KT:cutOne (poly totalArea targetArea F1 F2 minSide minWidth /
                   dirV dirLen dirU pmin pmax originPt sweepLen v proj
                   loT hiT nSamples angleList cutResult
                   chosenPiece chosenRemaining chosenLinePt chosenNormal chosenWidth allCross)

  (setq nSamples 7)
  (setq dirV (list (- (car F2) (car F1)) (- (cadr F2) (cadr F1))))
  (setq dirLen (distance F1 F2))
  (setq dirU (list (/ (car dirV) dirLen) (/ (cadr dirV) dirLen)))

  (setq pmin nil pmax nil)
  (foreach v poly
    (setq proj (KT:sd v F1 dirU))
    (if (or (not pmin) (< proj pmin)) (setq pmin proj))
    (if (or (not pmax) (> proj pmax)) (setq pmax proj))
  )
  (setq originPt (list (+ (car F1) (* pmin (car dirU))) (+ (cadr F1) (* pmin (cadr dirU)))))
  (setq sweepLen (- pmax pmin))

  (setq angleList
    (if (and minWidth (> minWidth 0.0))
      (list 0.0 -5.0 5.0 -10.0 10.0 -15.0 15.0 -20.0 20.0 -25.0 25.0 -30.0 30.0 -35.0 35.0 -40.0 40.0)
      (list 0.0)
    )
  )

  (setq loT (if minSide minSide 0.0))
  (setq hiT (- sweepLen (if minSide minSide 0.0)))
  (if (> loT hiT) (setq loT hiT))

  (princ "\n\U+03A5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+03C4\U+03BF\U+03BC\U+03AE\U+03C2 ")
  (setq cutResult (KT:findCut poly dirU originPt loT hiT targetArea minWidth nSamples angleList))
  (setq chosenPiece (nth 0 cutResult) chosenRemaining (nth 1 cutResult)
        chosenLinePt (nth 3 cutResult) chosenNormal (nth 4 cutResult) chosenWidth (nth 5 cutResult))
  (princ " OK")

  (if (and minWidth (> minWidth 0.0) (< chosenWidth minWidth))
    (princ (strcat "\n\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03C4\U+03BF \U+03BD\U+03AD\U+03BF \U+03C4\U+03B5\U+03BC\U+03AC\U+03C7\U+03B9\U+03BF \U+03B4\U+03B5\U+03BD \U+03C0\U+03B5\U+03C4\U+03C5\U+03C7\U+03B1\U+03AF\U+03BD\U+03B5\U+03B9 \U+03C4\U+03BF \U+03B5\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 \U+03C3\U+03B5 \U+03CC\U+03BB\U+03BF \U+03C4\U+03BF \U+03BC\U+03AE\U+03BA\U+03BF\U+03C2 \U+03C4\U+03BF\U+03C5 ("
                    (rtos chosenWidth 2 2) " \U+03BC. \U+03B1\U+03BD\U+03C4\U+03AF " (rtos minWidth 2 2) " \U+03BC. \U+03B6\U+03B7\U+03C4\U+03BF\U+03CD\U+03BC\U+03B5\U+03BD\U+03B1)."))
  )

  (setq allCross (KT:crossingsIdx poly chosenLinePt chosenNormal))
  (list chosenPiece chosenRemaining allCross)
)

;; ελεγχος αν το σημειο pt βρισκεται μεσα στο πολυγωνο poly (ray casting)
(defun KT:pointInPoly (pt poly / n i j inside xi yi xj yj px py c1 c2)
  (setq inside nil n (length poly))
  (setq px (car pt) py (cadr pt))
  (setq j (1- n) i 0)
  (while (< i n)
    (setq xi (car (nth i poly)) yi (cadr (nth i poly)))
    (setq xj (car (nth j poly)) yj (cadr (nth j poly)))
    (setq c1 (> yi py) c2 (> yj py))
    (if (and (or (and c1 (not c2)) (and (not c1) c2))
             (< px (+ xi (/ (* (- xj xi) (- py yi)) (- yj yi)))))
      (setq inside (not inside))
    )
    (setq j i)
    (setq i (1+ i))
  )
  inside
)

;; ιδιο με KT:cutOne, αλλα εγγυαται οτι το σημειο-ενδειξη indPt καταληγει
;; μεσα στο ΝΕΟ ΤΕΜΑΧΙΟ (οχι στο υπολοιπο) - δοκιμαζει και τις 2 πλευρες.
(defun KT:cutOriented (poly totalArea targetArea F1 F2 minSide minWidth indPt /
                        res1 piece1 rem1 cross1 res2 piece2 rem2 cross2)
  (setq res1 (KT:cutOne poly totalArea targetArea F1 F2 minSide minWidth))
  (setq piece1 (nth 0 res1) rem1 (nth 1 res1) cross1 (nth 2 res1))
  (cond
    ((KT:pointInPoly indPt piece1) (list piece1 rem1 cross1))
    ((KT:pointInPoly indPt rem1)
      (setq res2 (KT:cutOne poly totalArea (- totalArea targetArea) F1 F2 minSide minWidth))
      (setq piece2 (nth 0 res2) rem2 (nth 1 res2) cross2 (nth 2 res2))
      (list rem2 piece2 cross2)
    )
    (T
      (princ "\n\U+03A0\U+03A1\U+039F\U+03A3\U+039F\U+03A7\U+0397: \U+03C4\U+03BF \U+03C3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF-\U+03AD\U+03BD\U+03B4\U+03B5\U+03B9\U+03BE\U+03B7 \U+03B4\U+03B5\U+03BD \U+03B2\U+03C1\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5 \U+03BA\U+03B1\U+03B8\U+03B1\U+03C1\U+03AC \U+03C3\U+03B5 \U+03BA\U+03B1\U+03BC\U+03AF\U+03B1 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC - \U+03BA\U+03C1\U+03B1\U+03C4\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5 \U+03B7 \U+03C0\U+03C1\U+03BF\U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE.")
      (list piece1 rem1 cross1)
    )
  )
)

;; ================================================================
;; ΕΝΤΟΛΗ PLTCUT — αποκοπή τμήματος συγκεκριμένου εμβαδού από πλευρά
;; ================================================================
(defun c:PLTCUT ( / *error* oldosmode oldcmdecho oldlayer
                     sel ent edata verts totalArea targetArea
                     roadAns pk1 pk2 edgeAB F1 F2 minSide minWidth rawW indPt
                     cutRes newPiece remPiece newCross newVertList
                     layName txtH cen txt )

  (defun *error* (msg)
    (if oldosmode (setvar "OSMODE" oldosmode))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if oldlayer (setvar "CLAYER" oldlayer))
    (if (and msg (/= msg "Function cancelled") (/= msg "quit / exit abort"))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 PLTCUT: " msg))
    )
    (princ)
  )

  (setq oldosmode  (getvar "OSMODE"))
  (setq oldcmdecho (getvar "CMDECHO"))
  (setq oldlayer   (getvar "CLAYER"))
  (setvar "CMDECHO" 0)

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

  ;; ---------------- ΕΜΒΑΔΟΝ ΝΕΟΥ ΤΕΜΑΧΙΟΥ ----------------
  (setq targetArea (getreal (strcat "\n\U+0395\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03BD\U+03AD\U+03BF\U+03C5 \U+03C4\U+03B5\U+03BC\U+03B1\U+03C7\U+03AF\U+03BF\U+03C5 \U+03C3\U+03B5 \U+03C4.\U+03BC. (\U+03C3\U+03C5\U+03BD\U+03BF\U+03BB\U+03B9\U+03BA\U+03CC \U+03BF\U+03B9\U+03BA\U+03BF\U+03C0\U+03AD\U+03B4\U+03BF\U+03C5 "
                                    (rtos totalArea 2 2) " \U+03C4.\U+03BC.): ")))
  (if (or (not targetArea) (<= targetArea 0.0)) (exit))
  (if (>= targetArea totalArea)
    (progn (princ "\n\U+03A4\U+03BF \U+03B6\U+03B7\U+03C4\U+03BF\U+03CD\U+03BC\U+03B5\U+03BD\U+03BF \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03B5\U+03AF\U+03BD\U+03B1\U+03B9 \U+03BC\U+03B5\U+03B3\U+03B1\U+03BB\U+03CD\U+03C4\U+03B5\U+03C1\U+03BF \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF \U+03C3\U+03C5\U+03BD\U+03BF\U+03BB\U+03B9\U+03BA\U+03CC \U+03BF\U+03B9\U+03BA\U+03CC\U+03C0\U+03B5\U+03B4\U+03BF.") (exit)))

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
      (setq minSide (getreal "\n\U+0395\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03B7 \U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7 \U+03BD\U+03AD\U+03BF\U+03C5 \U+03C4\U+03B5\U+03BC\U+03B1\U+03C7\U+03AF\U+03BF\U+03C5 (\U+03BC.): "))
      (if (not minSide) (setq minSide 0.0))
    )
    (progn
      (setq pk1 (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF 1 (\U+03BA\U+03B1\U+03C4\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03C3\U+03B7 \U+03B4\U+03B9\U+03B1\U+03C7\U+03C9\U+03C1\U+03B9\U+03C3\U+03BC\U+03BF\U+03CD): "))
      (setq pk2 (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF 2 (\U+03BA\U+03B1\U+03C4\U+03B5\U+03CD\U+03B8\U+03C5\U+03BD\U+03C3\U+03B7 \U+03B4\U+03B9\U+03B1\U+03C7\U+03C9\U+03C1\U+03B9\U+03C3\U+03BC\U+03BF\U+03CD): "))
      (setq F1 pk1 F2 pk2)
      (setq minSide nil)
    )
  )

  ;; ---------------- ΣΗΜΕΙΟ-ΕΝΔΕΙΞΗ ΝΕΟΥ ΤΕΜΑΧΙΟΥ ----------------
  ;; Υποχρεωτικο: δειχνεις ενα σημειο που πρεπει να καταληξει ΜΕΣΑ στο
  ;; νεο τεμαχιο (π.χ. υπαρχον δεντρο, πασσαλος, ή απλα προς τα που θες
  ;; να "κοιταει" το κομματι). Ετσι ο αλγοριθμος ξερει ΠΟΙΑ απο τις 2
  ;; πλευρες του πολυγωνου να κρατησει ως νεο τεμαχιο.
  (setq indPt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03BC\U+03AD\U+03C3\U+03B1 \U+03C3\U+03C4\U+03BF \U+039D\U+0395\U+039F \U+03C4\U+03B5\U+03BC\U+03AC\U+03C7\U+03B9\U+03BF - \U+03C0.\U+03C7. \U+03B4\U+03AF\U+03C0\U+03BB\U+03B1 \U+03C3\U+03B5 \U+03B4\U+03AD\U+03BD\U+03C4\U+03C1\U+03BF, \U+03C0\U+03AC\U+03C3\U+03C3\U+03B1\U+03BB\U+03BF \U+03AE \U+03CC\U+03C1\U+03B9\U+03BF \U+03C0\U+03BF\U+03C5 \U+03BE\U+03AD\U+03C1\U+03B5\U+03B9\U+03C2 (\U+03B4\U+03B5\U+03AF\U+03C7\U+03BD\U+03B5\U+03B9 \U+03A0\U+039F\U+0399\U+0391 \U+03C0\U+03BB\U+03B5\U+03C5\U+03C1\U+03AC \U+03BA\U+03C1\U+03B1\U+03C4\U+03AC\U+03BC\U+03B5): "))
  (if (not indPt) (progn (setvar "OSMODE" oldosmode) (setvar "CMDECHO" oldcmdecho) (exit)))

  ;; ---------------- ΕΛΑΧΙΣΤΟ ΠΛΑΤΟΣ ΤΕΜΑΧΙΟΥ ----------------
  (initget "E K")
  (setq rawW (getreal "\n\U+0395\U+03BB\U+03AC\U+03C7\U+03B9\U+03C3\U+03C4\U+03BF \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C2 \U+03C4\U+03B5\U+03BC\U+03B1\U+03C7\U+03AF\U+03BF\U+03C5 (\U+03BC.) \U+03AE [E=\U+0395\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5=5/K=\U+0395\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5=15] <0=\U+03C7\U+03C9\U+03C1\U+03AF\U+03C2 \U+03AD\U+03BB\U+03B5\U+03B3\U+03C7\U+03BF>: "))
  (cond
    ((= rawW "E") (setq minWidth 5.0))
    ((= rawW "K") (setq minWidth 15.0))
    ((not rawW) (setq minWidth 0.0))
    (T (setq minWidth rawW))
  )

  ;; ---------------- ΑΠΟΚΟΠΗ (σεβεται το σημειο-ενδειξη) ----------------
  (setq cutRes (KT:cutOriented verts totalArea targetArea F1 F2 minSide minWidth indPt))
  (setq newPiece (nth 0 cutRes) remPiece (nth 1 cutRes) newCross (nth 2 cutRes))

  ;; ---------------- ΕΝΗΜΕΡΩΣΗ ΑΡΧΙΚΟΥ ΠΟΛΥΓΩΝΟΥ ΜΕ ΝΕΕΣ ΚΟΡΥΦΕΣ ----------------
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
  (setq layName "BRB-PLTCUT")
  (command "_.-LAYER" "_M" layName "")
  (setvar "CLAYER" layName)

  ;; ---------------- ΥΨΟΣ ΓΡΑΜΜΑΤΩΝ ΕΤΙΚΕΤΑΣ ----------------
  (setq txtH (getreal "\n\U+038E\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AC\U+03C4\U+03C9\U+03BD \U+03B5\U+03C4\U+03B9\U+03BA\U+03AD\U+03C4\U+03B1\U+03C2 (\U+03BC.) <2.0>: "))
  (if (not txtH) (setq txtH 2.0))

  ;; ---------------- ΣΧΕΔΙΑΣΗ + ΕΤΙΚΕΤΕΣ ----------------
  (command "_.UNDO" "_BEGIN")
  (princ "\n--- \U+0391\U+03C0\U+03BF\U+03C4\U+03AD\U+03BB\U+03B5\U+03C3\U+03BC\U+03B1 \U+03B1\U+03C0\U+03BF\U+03BA\U+03BF\U+03C0\U+03AE\U+03C2 ---")

  (KT:drawPoly newPiece layName)
  (setq cen (KT:centroid newPiece))
  (setq txt (strcat "\U+039D\U+03AD\U+03BF \U+03C4\U+03B5\U+03BC\U+03AC\U+03C7\U+03B9\U+03BF: " (rtos (KT:area newPiece) 2 2) " \U+03C4.\U+03BC."))
  (if (and minSide (> minSide 0.0))
    (setq txt (strcat txt " (\U+03C0\U+03C1\U+03CC\U+03C3\U+03BF\U+03C8\U+03B7 " (rtos minSide 2 2) " \U+03BC.)")))
  (command "_.TEXT" "_J" "_MC" cen txtH 0 txt)
  (princ (strcat "\n" txt))

  (KT:drawPoly remPiece layName)
  (setq cen (KT:centroid remPiece))
  (setq txt (strcat "\U+03A5\U+03C0\U+03CC\U+03BB\U+03BF\U+03B9\U+03C0\U+03BF: " (rtos (KT:area remPiece) 2 2) " \U+03C4.\U+03BC."))
  (command "_.TEXT" "_J" "_MC" cen txtH 0 txt)
  (princ (strcat "\n" txt))

  (command "_.UNDO" "_END")

  (setvar "OSMODE" oldosmode)
  (setvar "CMDECHO" oldcmdecho)
  (princ "\n\U+039F\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5.")
  (princ)
)

(princ "\nPLTCUT.LSP \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+03A0\U+03BB\U+03B7\U+03BA\U+03C4\U+03C1\U+03BF\U+03BB\U+03CC\U+03B3\U+03B7\U+03C3\U+03B5 PLTCUT \U+03B3\U+03B9\U+03B1 \U+03B1\U+03C0\U+03BF\U+03BA\U+03BF\U+03C0\U+03AE \U+03C4\U+03B5\U+03BC\U+03B1\U+03C7\U+03AF\U+03BF\U+03C5 \U+03C3\U+03C5\U+03B3\U+03BA\U+03B5\U+03BA\U+03C1\U+03B9\U+03BC\U+03AD\U+03BD\U+03BF\U+03C5 \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03BF\U+03CD.")
(princ)
