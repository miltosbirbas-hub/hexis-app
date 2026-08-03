;;; ============================================================
;;; BORRAS.LSP
;;; Μοντερνο συμβολο Βορρα: κυκλος + βελονα πυξιδας (μισο γεματο /
;;; μισο περιγραμμα) + γραμμα "\U+0392" απο πανω. Κλασικο minimal
;;; στυλ αρχιτεκτονικων/τοπογραφικων σχεδιων.
;;;
;;; Το πραγματικο μεγεθος στο σχεδιο υπολογιζεται αυτοματα ωστε
;;; στο τυπωμενο χαρτι να βγαινει παντα ιδιο μεγεθος, οσο κι αν
;;; αλλαζει η κλιμακα εκτυπωσης.
;;;
;;; BRB DEVELOPMENT MON. I.K.E. - Μ. Μπιρμπας
;;; Εντολη: BORRAS
;;;
;;; Ροη:
;;;  1. Επιλογη κλιμακας (1:50, 1:100, 1:200, 1:500, 1:1000)
;;;  2. Επιλογη μοναδων σχεδιου (Μετρα ή Χιλιοστα)
;;;  3. Σημειο εισαγωγης (κεντρο κυκλου)
;;;  4. Γωνια περιστροφης (0 = Βορρας προς τα πανω)
;;; ============================================================

;; ---------- ΡΥΘΜΙΖΟΜΕΝΕΣ ΔΙΑΣΤΑΣΕΙΣ (σε mm χαρτιου, πριν την κλιμακωση) ----------
(defun BR:R        () 5.0)   ; ακτινα εξωτερικου κυκλου
(defun BR:needleW  () 0.24)  ; μιση-πλατος βελονας (ποσοστο της ακτινας R)
(defun BR:dotR     () 0.14)  ; ακτινα κεντρικης κουκιδας (ποσοστο της ακτινας R)
(defun BR:textH    () 4.0)   ; υψος γραμματος "\U+0392"
(defun BR:textGap  () 1.6)   ; κενο μεταξυ κυκλου και κειμενου

;; ---------- ΒΟΗΘΗΤΙΚΗ: περιστροφη σημειου (x y) κατα γωνια ang (rad) ----------
(defun BR:rot (pt ang / x y)
  (setq x (car pt) y (cadr pt))
  (list (- (* x (cos ang)) (* y (sin ang)))
        (+ (* x (sin ang)) (* y (cos ang))))
)

;; ---------- ΒΟΗΘΗΤΙΚΗ: τοπικο σημειο -> παγκοσμιο (κλιμακωση+περιστροφη+μετατοπιση) ----------
(defun BR:xform (pt factor rotAng insPt / sc rp)
  (setq sc (list (* (car pt) factor) (* (cadr pt) factor)))
  (setq rp (BR:rot sc rotAng))
  (list (+ (car insPt) (car rp)) (+ (cadr insPt) (cadr rp)))
)

(defun c:BORRAS ( / *error* oldosmode oldcmdecho oldlayer
                    scaleList sel scaleDen unitMode factor
                    insPt rotDeg rotAng
                    R needleW dotR textH textGap
                    tipL rightL bottomL leftL textPtL
                    tipW rightW bottomW leftW textPtW
                    Rw dotRw textHW layName )

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
  (princ "\n--- \U+03A3\U+03C5\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF \U+0392\U+03BF\U+03C1\U+03C1\U+03B1 ---")
  (princ "\n  1.  1:50")
  (princ "\n  2.  1:100")
  (princ "\n  3.  1:200")
  (princ "\n  4.  1:500")
  (princ "\n  5.  1:1000")
  (initget "1 2 3 4 5")
  (setq sel (getkword "\n\U+0395\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03B7 \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03B1\U+03C2 \U+03B5\U+03BA\U+03C4\U+03C5\U+03C0\U+03C9\U+03C3\U+03B7\U+03C2 (1-5) <2>: "))
  (if (not sel) (setq sel "2"))
  (setq scaleDen (nth (1- (atoi sel)) scaleList))
  (princ (strcat "\n\U+039A\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03B1: 1:" (itoa scaleDen)))

  ;; ---------------- ΜΟΝΑΔΕΣ ΣΧΕΔΙΟΥ ----------------
  (initget "M X")
  (setq unitMode (getkword "\n\U+039C\U+03BF\U+03BD\U+03B1\U+03B4\U+03B5\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03B9\U+03BF\U+03C5 - \U+039C\U+03B5\U+03C4\U+03C1\U+03B1/\U+03A7\U+03B9\U+03BB\U+03B9\U+03BF\U+03C3\U+03C4\U+03B1 [M/X] <M>: "))
  (if (not unitMode) (setq unitMode "M"))
  (setq factor (if (= unitMode "M") (/ scaleDen 1000.0) (float scaleDen)))

  ;; ---------------- ΣΗΜΕΙΟ ΕΙΣΑΓΩΓΗΣ ----------------
  (setq insPt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03B7\U+03C2 (\U+03BA\U+03B5\U+03BD\U+03C4\U+03C1\U+03BF \U+03C3\U+03C5\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF\U+03C5): "))
  (if (not insPt) (progn (setvar "OSMODE" oldosmode) (setvar "CMDECHO" oldcmdecho) (exit)))

  ;; ---------------- ΓΩΝΙΑ ΠΕΡΙΣΤΡΟΦΗΣ ----------------
  (setq rotDeg (getreal "\n\U+0393\U+03C9\U+03BD\U+03B9\U+03B1 \U+03C0\U+03B5\U+03C1\U+03B9\U+03C3\U+03C4\U+03C1\U+03BF\U+03C6\U+03B7\U+03C2 \U+03C3\U+03B5 \U+03BC\U+03BF\U+03B9\U+03C1\U+03B5\U+03C2 (0 = \U+0392\U+03BF\U+03C1\U+03C1\U+03B1\U+03C2 \U+03C0\U+03C1\U+03BF\U+03C2 \U+03C4\U+03B1 \U+03C0\U+03B1\U+03BD\U+03C9) <0>: "))
  (if (not rotDeg) (setq rotDeg 0.0))
  (setq rotAng (* pi (/ rotDeg 180.0)))

  ;; ---------------- ΓΕΩΜΕΤΡΙΑ (τοπικες συντεταγμενες, κεντρο (0,0), κορυφη προς +Y) ----------------
  (setq R       (BR:R))
  (setq needleW (* R (BR:needleW)))
  (setq dotR    (* R (BR:dotR)))
  (setq textH   (BR:textH))
  (setq textGap (BR:textGap))

  (setq tipL    (list 0.0 R))                 ; κορυφη βελονας (πανω στον κυκλο)
  (setq bottomL (list 0.0 (- R)))              ; ουρα βελονας (κατω στον κυκλο)
  (setq rightL  (list needleW 0.0))            ; δεξια απολυξη στο κεντρο
  (setq leftL   (list (- needleW) 0.0))        ; αριστερη απολυξη στο κεντρο
  (setq textPtL (list 0.0 (+ R textGap)))      ; βαση κειμενου, πανω απο τον κυκλο

  ;; ---------------- ΜΕΤΑΣΧΗΜΑΤΙΣΜΟΣ ΣΤΟΝ ΠΡΑΓΜΑΤΙΚΟ ΧΩΡΟ ----------------
  (setq tipW    (BR:xform tipL    factor rotAng insPt))
  (setq bottomW (BR:xform bottomL factor rotAng insPt))
  (setq rightW  (BR:xform rightL  factor rotAng insPt))
  (setq leftW   (BR:xform leftL   factor rotAng insPt))
  (setq textPtW (BR:xform textPtL factor rotAng insPt))
  (setq Rw      (* R factor))
  (setq dotRw   (* dotR factor))
  (setq textHW  (* textH factor))

  ;; ---------------- LAYER ----------------
  (setq layName "BRB-BORRAS")
  (command "_.-LAYER" "_M" layName "_C" "7" layName "")
  (setvar "CLAYER" layName)

  ;; ---------------- ΣΧΕΔΙΑΣΗ ----------------
  (command "_.UNDO" "_BEGIN")

  ;; εξωτερικος κυκλος
  (command "_.CIRCLE" insPt Rw)

  ;; γεματο πανω μισο της βελονας (η μυτη που δειχνει Βορρα)
  (command "_.SOLID" tipW rightW leftW leftW "")

  ;; πληρες περιγραμμα βελονας (ρομβος): κορυφη-δεξια-ουρα-αριστερα
  (command "_.PLINE" tipW rightW bottomW leftW "_C")

  ;; κεντρικη κουκιδα (αξονας περιστροφης)
  (command "_.CIRCLE" insPt dotRw)
  (command "_.HATCH" "_S" (entlast) "" "_SOLID" "")

  ;; γραμμα "\U+0392" πανω απο τον κυκλο
  (command "_.TEXT" "_J" "_BC" textPtW textHW rotDeg "\U+0392")

  (command "_.UNDO" "_END")

  ;; ---------------- ΕΠΑΝΑΦΟΡΑ ΡΥΘΜΙΣΕΩΝ ----------------
  (setvar "OSMODE" oldosmode)
  (setvar "CMDECHO" oldcmdecho)

  (princ (strcat "\n\U+03A3\U+03C5\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF \U+0392\U+03BF\U+03C1\U+03C1\U+03B1 \U+03B4\U+03B7\U+03BC\U+03B9\U+03BF\U+03C5\U+03C1\U+03B3\U+03B7\U+03B8\U+03B7\U+03BA\U+03B5 (\U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03B1 1:" (itoa scaleDen) ")."))
  (princ)
)

(princ "\nBORRAS.LSP \U+03C6\U+03BF\U+03C1\U+03C4\U+03C9\U+03B8\U+03B7\U+03BA\U+03B5. \U+03A0\U+03BB\U+03B7\U+03BA\U+03C4\U+03C1\U+03BF\U+03BB\U+03BF\U+03B3\U+03B7\U+03C3\U+03B5 BORRAS \U+03B3\U+03B9\U+03B1 \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03B7 \U+03C3\U+03C5\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF\U+03C5 \U+0392\U+03BF\U+03C1\U+03C1\U+03B1.")
(princ)
