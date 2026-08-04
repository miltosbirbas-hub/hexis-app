;;; ============================================================
;;; STATHMES.LSP
;;; Μια εντολη - STATHMES - με μενου επιλογων:
;;;
;;;  1. Σταθμη Κατοψης  -> συμβολο Στάθμης Τελικού Δαπέδου (Σ.Τ.Δ.)
;;;                        ή Στάθμης Μπετόν (Σ.Μ.) με την τιμη που δινεις.
;;;
;;;  2. Σταθμες Τομης   -> οριζεις ενα σημειο ως απολυτο μηδεν
;;;                        (σταθμη 0.00), και μετα καθε σημειο που
;;;                        πατας στο σχεδιο βγαζει αυτοματα τη
;;;                        σχετικη σταθμη του απο το μηδεν (+Υ/-Υ),
;;;                        μεχρι να πατησεις Enter. Προαιρετικα και
;;;                        με το πραγματικο υψομετρο σε παρενθεση.
;;;
;;; BRB DEVELOPMENT MON. I.K.E. - Μ. Μπιρμπας
;;; Εντολη: STATHMES
;;; ============================================================

(defun ST:layer () "BRB-STATHMES")

;; 0.00 -> "\U+00B10.00" | θετικη -> "+x.xx" | αρνητικη -> "-x.xx"
(defun ST:fmt (val)
  (cond
    ((< (abs val) 0.0005) "\U+00B10.00")
    ((> val 0.0) (strcat "+" (rtos val 2 2)))
    (T (strcat "-" (rtos (abs val) 2 2)))
  )
)

;; ---------- ΚΟΙΝΟ: ΕΠΙΛΟΓΗ ΚΛΙΜΑΚΑΣ -> factor (παντα σε μετρα) ----------
(defun ST:getFactor ( / scaleList sel scaleDen)
  (setq scaleList (list 50 100 200 500 1000))
  (initget "1 2 3 4 5")
  (setq sel (getkword "\n\U+039A\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03B1 \U+03B5\U+03BA\U+03C4\U+03C5\U+03C0\U+03C9\U+03C3\U+03B7\U+03C2 [1=1:50/2=1:100/3=1:200/4=1:500/5=1:1000] <2>: "))
  (if (not sel) (setq sel "2"))
  (setq scaleDen (nth (1- (atoi sel)) scaleList))
  (/ scaleDen 1000.0)
)

;; ================================================================
;; 1. ΣΤΑΘΜΗ ΚΑΤΟΨΗΣ (Σ.Τ.Δ. / Σ.Μ.)
;; ================================================================
(defun ST:doKatopsi ( / typ prefix lvl lvlStr factor insPt
                        R crossExt textH gap layName
                        p1 p2 p3 top bottom left crL crR crT crB tp )

  ;; ---------------- ΤΥΠΟΣ ΣΤΑΘΜΗΣ ----------------
  (initget "D B")
  (setq typ (getkword "\n\U+03A4\U+03C5\U+03C0\U+03BF\U+03C2 \U+03C3\U+03C4\U+03B1\U+03B8\U+03BC\U+03B7\U+03C2 [D=\U+0394\U+03B1\U+03C0\U+03B5\U+03B4\U+03BF/B=\U+039C\U+03C0\U+03B5\U+03C4\U+03BF\U+03BD] <D>: "))
  (if (not typ) (setq typ "D"))
  (setq prefix (if (= typ "D") "\U+03A3.\U+03A4.\U+0394." "\U+03A3.\U+039C."))

  ;; ---------------- ΤΙΜΗ ΣΤΑΘΜΗΣ ----------------
  (setq lvl (getreal "\n\U+03A3\U+03C4\U+03B1\U+03B8\U+03BC\U+03B7 \U+03C3\U+03B5 \U+03BC\U+03B5\U+03C4\U+03C1\U+03B1 (\U+03C0.\U+03C7. 0.15 \U+03AE -0.10) <0.00>: "))
  (if (not lvl) (setq lvl 0.0))
  (setq lvlStr (ST:fmt lvl))

  ;; ---------------- ΚΛΙΜΑΚΑ / ΜΟΝΑΔΕΣ ----------------
  (setq factor (ST:getFactor))

  ;; ---------------- ΣΗΜΕΙΟ ΕΙΣΑΓΩΓΗΣ ----------------
  (setq insPt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03B7\U+03C2 \U+03C3\U+03C5\U+03BC\U+03B2\U+03BF\U+03BB\U+03BF\U+03C5 \U+03C3\U+03C4\U+03B1\U+03B8\U+03BC\U+03B7\U+03C2: "))
  (if (not insPt) (exit))

  ;; ---------------- ΔΙΑΣΤΑΣΕΙΣ (mm χαρτιου -> μοναδες σχεδιου) ----------------
  (setq R        (* 1.5 factor))   ; ακτινα κυκλου
  (setq crossExt (* 1.95 factor))  ; μηκος σταυρονηματος (ακρη προς ακρη)
  (setq textH    (* 2.5 factor))
  (setq gap      (* 1.0 factor))

  ;; ---------------- LAYER ----------------
  (setq layName (ST:layer))
  (command "_.-LAYER" "_M" layName "")
  (setvar "CLAYER" layName)

  ;; ---------------- ΣΧΕΔΙΑΣΗ ----------------
  (command "_.UNDO" "_BEGIN")

  ;; σημεια
  (setq top    (list (car insPt) (+ (cadr insPt) R)))
  (setq bottom (list (car insPt) (- (cadr insPt) R)))
  (setq left   (list (- (car insPt) R) (cadr insPt)))
  (setq crL (list (- (car insPt) crossExt) (cadr insPt)))
  (setq crR (list (+ (car insPt) crossExt) (cadr insPt)))
  (setq crT (list (car insPt) (+ (cadr insPt) crossExt)))
  (setq crB (list (car insPt) (- (cadr insPt) crossExt)))

  ;; κυκλος + σταυρονημα
  (command "_.CIRCLE" insPt R)
  (command "_.LINE" crL crR "")
  (command "_.LINE" crT crB "")

  ;; αριστερο μισο του κυκλου γεματο (D-σχημα μεσω τοξου)
  (command "_.PLINE" top "_A" "_S" left bottom "_L" top "")
  (command "_.HATCH" "_S" (entlast) "" "_SOLID" "")

  ;; κειμενο δεξια απο το σταυρονημα
  (setq tp (list (+ (car insPt) crossExt gap) (cadr insPt)))
  (command "_.TEXT" "_J" "_ML" tp textH 0 (strcat prefix " " lvlStr))
  (command "_.UNDO" "_END")

  (princ (strcat "\n\U+03A4\U+03BF\U+03C0\U+03BF\U+03B8\U+03B5\U+03C4\U+03B7\U+03B8\U+03B7\U+03BA\U+03B5 " prefix " " lvlStr "."))
)

;; ================================================================
;; 2. ΣΧΕΤΙΚΕΣ ΣΤΑΘΜΕΣ ΤΟΜΗΣ, ΑΠΟ ΑΠΟΛΥΤΟ ΜΗΔΕΝ
;; ================================================================
(defun ST:doTomi ( / factor zeroPt pt dy lvlStr
                     textH tick gap layName cont
                     absZero absElev zeroLabel )

  ;; ---------------- ΚΛΙΜΑΚΑ / ΜΟΝΑΔΕΣ ----------------
  (setq factor (ST:getFactor))
  (setq textH (* 2.5 factor))
  (setq tick  (* 1.2 factor))
  (setq gap   (* 1.0 factor))

  ;; ---------------- ΑΠΟΛΥΤΟ ΜΗΔΕΝ ----------------
  (setq zeroPt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03BF \U+03B1\U+03C0\U+03BF\U+03BB\U+03C5\U+03C4\U+03BF\U+03C5 \U+03BC\U+03B7\U+03B4\U+03B5\U+03BD (\U+03C3\U+03C4\U+03B1\U+03B8\U+03BC\U+03B7 0.00): "))
  (if (not zeroPt) (exit))

  ;; προαιρετικο πραγματικο υψομετρο (απο τοπογραφικο) για το σημειο του μηδεν
  (setq absZero (getreal "\n\U+03A0\U+03C1\U+03B1\U+03B3\U+03BC\U+03B1\U+03C4\U+03B9\U+03BA\U+03BF \U+03C5\U+03C8\U+03BF\U+03BC\U+03B5\U+03C4\U+03C1\U+03BF \U+03B1\U+03C0\U+03BF\U+03BB\U+03C5\U+03C4\U+03BF\U+03C5 \U+03BC\U+03B7\U+03B4\U+03B5\U+03BD, \U+03B1\U+03C0\U+03BF \U+03C4\U+03BF\U+03C0\U+03BF\U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03BF (Enter \U+03B1\U+03BD \U+03B4\U+03B5\U+03BD \U+03B5\U+03C7\U+03B5\U+03B9\U+03C2): "))

  ;; ---------------- LAYER ----------------
  (setq layName (ST:layer))
  (command "_.-LAYER" "_M" layName "")
  (setvar "CLAYER" layName)

  ;; σημαδι + ετικετα στο σημειο του μηδεν (+πραγματικο υψομετρο αν δοθηκε)
  (setq zeroLabel
    (if absZero
      (strcat "\U+00B10.00 (" (rtos absZero 2 2) ")")
      "\U+00B10.00"
    )
  )
  (command "_.UNDO" "_BEGIN")
  (command "_.LINE" (list (- (car zeroPt) tick) (cadr zeroPt))
                     (list (+ (car zeroPt) tick) (cadr zeroPt)) "")
  (command "_.TEXT" "_J" "_ML"
           (list (+ (car zeroPt) tick gap) (cadr zeroPt)) textH 0 zeroLabel)
  (command "_.UNDO" "_END")

  ;; ---------------- ΔΙΑΔΟΧΙΚΑ ΣΗΜΕΙΑ ----------------
  (setq cont T)
  (while cont
    (setq pt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03B9\U+03BF \U+03C3\U+03C4\U+03B1\U+03B8\U+03BC\U+03B7\U+03C2 (Enter \U+03B3\U+03B9\U+03B1 \U+03B5\U+03BE\U+03BF\U+03B4\U+03BF): "))
    (if pt
      (progn
        (setq dy (- (cadr pt) (cadr zeroPt)))
        (setq lvlStr (ST:fmt dy))
        (if absZero
          (progn
            (setq absElev (+ absZero dy))
            (setq lvlStr (strcat lvlStr " (" (rtos absElev 2 2) ")"))
          )
        )
        (command "_.UNDO" "_BEGIN")
        (command "_.LINE" (list (- (car pt) tick) (cadr pt))
                           (list (+ (car pt) tick) (cadr pt)) "")
        (command "_.TEXT" "_J" "_ML"
                 (list (+ (car pt) tick gap) (cadr pt)) textH 0 lvlStr)
        (command "_.UNDO" "_END")
        (princ (strcat "  -> " lvlStr))
      )
      (setq cont nil)
    )
  )
  (princ "\n\U+039F\U+03BB\U+03BF\U+03BA\U+03BB\U+03B7\U+03C1\U+03C9\U+03B8\U+03B7\U+03BA\U+03B5.")
)

;; ================================================================
;; ΕΝΤΟΛΗ STATHMES — ΜΕΝΟΥ ΕΠΙΛΟΓΩΝ
;; ================================================================
(defun c:STATHMES ( / *error* oldosmode oldcmdecho oldlayer choice)

  (defun *error* (msg)
    (if oldosmode (setvar "OSMODE" oldosmode))
    (if oldcmdecho (setvar "CMDECHO" oldcmdecho))
    (if oldlayer (setvar "CLAYER" oldlayer))
    (if (and msg (/= msg "Function cancelled") (/= msg "quit / exit abort"))
      (princ (strcat "\n\U+03A3\U+03C6\U+03B1\U+03BB\U+03BC\U+03B1 STATHMES: " msg))
    )
    (princ)
  )

  (setq oldosmode  (getvar "OSMODE"))
  (setq oldcmdecho (getvar "CMDECHO"))
  (setq oldlayer   (getvar "CLAYER"))
  (setvar "CMDECHO" 0)
  (setvar "OSMODE" 0)

  ;; ---------------- ΜΕΝΟΥ ΕΠΙΛΟΓΩΝ ----------------
  (initget "1 2")
  (setq choice (getkword "\n\U+0395\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03AE [1=\U+03A3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B7 \U+039A\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7\U+03C2/2=\U+03A3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C2 \U+03A4\U+03BF\U+03BC\U+03AE\U+03C2] <1>: "))
  (if (not choice) (setq choice "1"))

  (cond
    ((= choice "1") (ST:doKatopsi))
    ((= choice "2") (ST:doTomi))
  )

  (setvar "OSMODE" oldosmode)
  (setvar "CMDECHO" oldcmdecho)
  (princ)
)

(princ "\nSTATHMES.LSP \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+03A0\U+03BB\U+03B7\U+03BA\U+03C4\U+03C1\U+03BF\U+03BB\U+03CC\U+03B3\U+03B7\U+03C3\U+03B5 STATHMES \U+03B3\U+03B9\U+03B1 \U+03BC\U+03B5\U+03BD\U+03BF\U+03CD \U+03B5\U+03C0\U+03B9\U+03BB\U+03BF\U+03B3\U+03CE\U+03BD (\U+03A3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B7 \U+039A\U+03AC\U+03C4\U+03BF\U+03C8\U+03B7\U+03C2 / \U+03A3\U+03C4\U+03AC\U+03B8\U+03BC\U+03B5\U+03C2 \U+03A4\U+03BF\U+03BC\U+03AE\U+03C2).")
(princ)
