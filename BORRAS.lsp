;;; ============================================================
;;; BORRAS.LSP
;;; Συμβολο Βορρα (βελος + φτερωμα, οπως στο πρωτοτυπο borras.dxf)
;;; - ΑΥΤΟΝΟΜΟ αρχειο: η γεωμετρια ειναι ενσωματωμενη στον κωδικα
;;;   με entmake (arcs + lines). Δεν χρειαζεται κανενα αλλο αρχειο.
;;;
;;; Το πραγματικο μεγεθος στο σχεδιο υπολογιζεται αυτοματα ωστε
;;; στο τυπωμενο χαρτι να βγαινει παντα ιδιο (~10mm), οσο κι αν
;;; αλλαζει η κλιμακα εκτυπωσης.
;;;
;;; BRB DEVELOPMENT MON. I.K.E. - Μ. Μπιρμπας
;;; Εντολη: BORRAS
;;;
;;; Ροη:
;;;  1. Επιλογη κλιμακας (1:50, 1:100, 1:200, 1:500, 1:1000)
;;;  2. Επιλογη μοναδων σχεδιου (Μετρα ή Χιλιοστα)
;;;  3. Σημειο εισαγωγης
;;;  4. Γωνια περιστροφης (0 = ιδιος προσανατολισμος με το πρωτοτυπο)
;;; ============================================================

(defun BR:baseSize () 10.0)   ; mm χαρτιου στο 1:1 (βασικο μεγεθος συμβολου)
(defun BR:baseRot  () 90.0)   ; ενσωματωμενη περιστροφη του πρωτοτυπου (Βορρας-πανω)
(defun BR:layer    () "BRB-BORRAS")

;; τοξα του συμβολου: (ακτινα, γωνια-αρχης, γωνια-τελους) σε τοπικες μοναδες/μοιρες
;; (κεντρο ολων παντα στο τοπικο (0,0))
(setq BR:ARCS (list
    (list 0.5 165.49054 194.50946)
    (list 0.5 196.608354 354.812832)
    (list 0.5 5.187168 163.391646)
))

;; γραμμες του συμβολου (περιγραμμα βελους + γραμμες φτερωματος): (x1 y1 x2 y2)
(setq BR:LINES (list
    (list -0.55 -0.15 0.95 0.0)
    (list -0.15 0.0 -0.55 -0.15)
    (list -0.55 0.15 -0.15 0.0)
    (list 0.95 0.0 -0.55 0.15)
    (list -0.163333 -0.005 0.9 -0.005)
    (list -0.176667 0.01 0.85 0.01)
    (list -0.216667 0.025 0.7 0.025)
    (list -0.256667 0.04 0.55 0.04)
    (list -0.296667 0.055 0.4 0.055)
    (list -0.336667 0.07 0.25 0.07)
    (list -0.376667 0.085 0.1 0.085)
    (list -0.416667 0.1 -0.05 0.1)
    (list -0.456667 0.115 -0.2 0.115)
    (list -0.496667 0.13 -0.35 0.13)
    (list -0.536667 0.145 -0.5 0.145)
    (list -0.203333 -0.02 0.75 -0.02)
    (list -0.243333 -0.035 0.6 -0.035)
    (list -0.283333 -0.05 0.45 -0.05)
    (list -0.323333 -0.065 0.3 -0.065)
    (list -0.363333 -0.08 0.15 -0.08)
    (list -0.403333 -0.095 -0.0 -0.095)
    (list -0.443333 -0.11 -0.15 -0.11)
    (list -0.483333 -0.125 -0.3 -0.125)
    (list -0.523333 -0.14 -0.45 -0.14)
))

;; ---------- ΒΟΗΘΗΤΙΚΕΣ ----------
(defun BR:d2r (deg) (* pi (/ deg 180.0)))
(defun BR:norm360 (deg) (rem (+ deg 720.0) 360.0))

;; τοπικο σημειο (lx ly) -> παγκοσμιο, με κλιμακωση+περιστροφη+μετατοπιση
(defun BR:xform (lx ly scale rotRad insPt / rx ry)
  (setq rx (- (* lx (cos rotRad)) (* ly (sin rotRad))))
  (setq ry (+ (* lx (sin rotRad)) (* ly (cos rotRad))))
  (list (+ (car insPt) (* scale rx)) (+ (cadr insPt) (* scale ry)) 0.0)
)

(defun c:BORRAS ( / *error* oldosmode oldcmdecho oldlayer
                    scaleList sel scaleDen unitMode factor
                    insPt rotDeg totalScale totalRotDeg totalRotRad
                    layName a l )

  (defun *error* (msg)
    (if oldosmode (setvar "OSMODE" oldosmode))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if oldlayer (setvar "CLAYER" oldlayer))
    (if (and msg
             (/= msg "Function cancelled")
             (/= msg "quit / exit abort"))
      (princ (strcat "\n\U+03A3\U+03C6\U+03B1\U+03BB\U+03BC\U+03B1 BORRAS: " msg))
    )
    (princ)
  )

  (setq oldosmode  (getvar "OSMODE"))
  (setq oldcmdecho (getvar "CMDECHO"))
  (setq oldlayer   (getvar "CLAYER"))
  (setvar "CMDECHO" 0)
  (setvar "OSMODE" 0)

  ;; ---------------- ΕΠΙΛΟΓΗ ΚΛΙΜΑΚΑΣ ----------------
  (setq scaleList (list 50 100 200 500 1000))
  (initget "1 2 3 4 5")
  (setq sel (getkword "\n\U+039A\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03B1 \U+03B5\U+03BA\U+03C4\U+03C5\U+03C0\U+03C9\U+03C3\U+03B7\U+03C2 [1=1:50/2=1:100/3=1:200/4=1:500/5=1:1000] <2>: "))
  (if (not sel) (setq sel "2"))
  (setq scaleDen (nth (1- (atoi sel)) scaleList))

  ;; ---------------- ΜΟΝΑΔΕΣ ΣΧΕΔΙΟΥ ----------------
  (initget "M X")
  (setq unitMode (getkword "\n\U+039C\U+03BF\U+03BD\U+03B1\U+03B4\U+03B5\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03BF\U+03C5 - \U+039C\U+03B5\U+03C4\U+03C1\U+03B1/\U+03A7\U+03B9\U+03BB\U+03B9\U+03BF\U+03C3\U+03C4\U+03B1 [M/X] <M>: "))
  (if (not unitMode) (setq unitMode "M"))
  (setq factor (if (= unitMode "M") (/ scaleDen 1000.0) (float scaleDen)))

  ;; ---------------- ΣΗΜΕΙΟ & ΓΩΝΙΑ ----------------
  (setq insPt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03B7\U+03C2 \U+03C3\U+03C5\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF\U+03C5 \U+0392\U+03BF\U+03C1\U+03C1\U+03B1: "))
  (if (not insPt) (progn (setvar "OSMODE" oldosmode) (setvar "CMDECHO" oldcmdecho) (exit)))

  (setq rotDeg (getreal "\n\U+0393\U+03C9\U+03BD\U+03B9\U+03B1 \U+03C0\U+03B5\U+03C1\U+03B9\U+03C3\U+03C4\U+03C1\U+03BF\U+03C6\U+03B7\U+03C2 \U+03C3\U+03B5 \U+03BC\U+03BF\U+03B9\U+03C1\U+03B5\U+03C2 (0 = \U+0392\U+03BF\U+03C1\U+03C1\U+03B1\U+03C2 \U+03C0\U+03C1\U+03BF\U+03C2 \U+03C4\U+03B1 \U+03C0\U+03B1\U+03BD\U+03C9) <0>: "))
  (if (not rotDeg) (setq rotDeg 0.0))

  ;; ---------------- ΣΥΝΟΛΙΚΗ ΚΛΙΜΑΚΑ / ΠΕΡΙΣΤΡΟΦΗ ----------------
  (setq totalScale   (* (BR:baseSize) factor))
  (setq totalRotDeg  (+ rotDeg (BR:baseRot)))
  (setq totalRotRad  (BR:d2r totalRotDeg))

  ;; ---------------- LAYER ----------------
  (setq layName (BR:layer))
  (command "_.-LAYER" "_M" layName "")
  (setvar "CLAYER" layName)

  ;; ---------------- ΣΧΕΔΙΑΣΗ (entmake, χωρις εξωτερικο αρχειο) ----------------
  (command "_.UNDO" "_BEGIN")

  (foreach a BR:ARCS
    (entmake (list '(0 . "ARC")
                    (cons 8 layName)
                    (cons 10 (list (car insPt) (cadr insPt) 0.0))
                    (cons 40 (* totalScale (nth 0 a)))
                    (cons 50 (BR:d2r (BR:norm360 (+ (nth 1 a) totalRotDeg))))
                    (cons 51 (BR:d2r (BR:norm360 (+ (nth 2 a) totalRotDeg))))
            )
    )
  )

  (foreach l BR:LINES
    (entmake (list '(0 . "LINE")
                    (cons 8 layName)
                    (cons 10 (BR:xform (nth 0 l) (nth 1 l) totalScale totalRotRad insPt))
                    (cons 11 (BR:xform (nth 2 l) (nth 3 l) totalScale totalRotRad insPt))
            )
    )
  )

  (command "_.UNDO" "_END")

  ;; ---------------- ΕΠΑΝΑΦΟΡΑ ΡΥΘΜΙΣΕΩΝ ----------------
  (setvar "OSMODE" oldosmode)
  (setvar "CMDECHO" oldcmdecho)

  (princ (strcat "\n\U+03A3\U+03CD\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF \U+0392\U+03BF\U+03C1\U+03C1\U+03B1 \U+03B4\U+03B7\U+03BC\U+03B9\U+03BF\U+03C5\U+03C1\U+03B3\U+03AE\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 1:" (itoa scaleDen) ")."))
  (princ)
)

(princ "\nBORRAS.LSP \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+03A0\U+03BB\U+03B7\U+03BA\U+03C4\U+03C1\U+03BF\U+03BB\U+03CC\U+03B3\U+03B7\U+03C3\U+03B5 BORRAS \U+03B3\U+03B9\U+03B1 \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE \U+03C3\U+03C5\U+03BC\U+03B2\U+03CC\U+03BB\U+03BF\U+03C5 \U+0392\U+03BF\U+03C1\U+03C1\U+03AC.")
(princ)
