;;; OROIDOM.LSP  v2.0
;;; Πίνακας Όρων Δόμησης σε CAD
;;; Βάση νομοθεσίας:
;;;   - ΠΔ 24.4/3.5.1985 ΦΕΚ Δ'181 (οικισμοί <2000 κατ.)
;;;   - ΠΔ 4.11.2011 ΦΕΚ 289/ΑΑΠ (τροποποίηση ΣΔ/κάλυψης)
;;;   - ν.5306/2026 (Ταγαράς) άρθρα 237-243, 247§3, 249-251
;;; Εντολή: OROIDOM
;;; HEXIS Platform - BRB DEVELOPMENT MON. I.K.E.

(defun C:OROIDOM ( / *error* od-layer od-rect od-vline od-txt
                     mode fek onom
                     emin epros emin-par epros-par
                     sd-txt kaly ypsos aposta gramd stegi
                     pt h rh cw1 cw2 px py cy tit rows row )

  (defun *error* (msg)
    (if (not (member msg '("Function cancelled" "quit / exit abort")))
      (princ (strcat "\n\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1: " msg)))
    (princ))

  (defun od-layer (nm col)
    (if (null (tblsearch "LAYER" nm))
      (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord")
                     '(100 . "AcDbLayerTableRecord") (cons 2 nm)
                     '(70 . 0) (cons 62 col) '(6 . "Continuous")))))

  (defun od-rect (x1 y1 x2 y2 lyr)
    (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lyr)
                   '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
                   (cons 10 (list x1 y1)) (cons 10 (list x2 y1))
                   (cons 10 (list x2 y2)) (cons 10 (list x1 y2)))))

  (defun od-vline (x y1 y2 lyr)
    (entmake (list '(0 . "LINE") '(100 . "AcDbEntity") (cons 8 lyr)
                   (cons 10 (list x y1 0.0)) (cons 11 (list x y2 0.0)))))

  (defun od-txt (x y h lyr str)
    (entmake (list '(0 . "TEXT") '(100 . "AcDbEntity") (cons 8 lyr)
                   (cons 10 (list x y 0.0)) (cons 40 h) (cons 1 str) '(72 . 0))))

  ;; ════ ΕΡΩΤΗΜΑΤΑ ════════════════════════════════════

  (initget 1 "1 2 3 4")
  (setq mode
    (getkword
      (strcat
        "\n\U+0395\U+03AF\U+03B4\U+03BF\U+03C2:"
        "\n  1  \u03b5\u03bd\u03c4\u03cc\u03c2 \u03c3\u03c7\u03b5\u03b4\u03af\u03bf\u03c5 \u03c0\u03cc\u03bb\u03b7\u03c2"
        "\n  2  \u03bf\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2 <2000 \u03ba\u03b1\u03c4. (\u03a0\u0394 24.4/1985 + \u03a6\u0395\u039a 289\u0391\u0391\u03a0/2011)"
        "\n  3  \u03bf\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2 \u03c0\u03c1\u03bf '23 (\u03af\u03b4\u03b9\u03bf\u03b9 \u03cc\u03c1\u03bf\u03b9 \u03bc\u03b5 mode 2)"
        "\n  4  \u03b5\u03ba\u03c4\u03cc\u03c2 \u03c3\u03c7\u03b5\u03b4\u03af\u03bf\u03c5"
        "\n[1/2/3/4]: ")))

  (if (member mode '("2" "3"))
    (progn
      (setq fek (getstring T
        "\n\u03a6\u0395\u039a \u03b1\u03c0\u03cc\u03c6. \u039d\u03bf\u03bc\u03ac\u03c1\u03c7\u03b7 (Enter=\u03ba\u03b1\u03bd\u03ad\u03bd\u03b1\u03c2): "))
      (if (= fek "") (setq fek "")))
    (setq fek ""))

  (setq onom (getstring T "\n\u039f\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2/\u03a0\u03b5\u03c1\u03b9\u03bf\u03c7\u03ae: "))
  (if (= onom "") (setq onom "---"))

  ;; ════ ΤΙΜΕΣ ΑΝΑ MODE ═══════════════════════════════

  (cond

    ;; ── 1: ΕΝΤΟΣ ΣΧΕΔΙΟΥ ──────────────────────────
    ((= mode "1")
      (setq emin      "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03cc\u03c1\u03c9\u03bd \u03b4\u03cc\u03bc\u03b7\u03c3\u03b7\u03c2 (\u03a1\u03a3\u0395)")
      (setq epros     "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03cc\u03c1\u03c9\u03bd \u03b4\u03cc\u03bc\u03b7\u03c3\u03b7\u03c2 (\u03a1\u03a3\u0395)")
      (setq emin-par  "---")
      (setq epros-par "---")
      (setq sd-txt    "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03a1\u03a3\u0395")
      (setq kaly      "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03a1\u03a3\u0395")
      (setq ypsos     "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03a1\u03a3\u0395")
      (setq aposta    "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03a1\u03a3\u0395")
      (setq gramd     "\u03b5\u03c0\u03af \u03c1\u03c5\u03bc\u03bf\u03c4\u03bf\u03bc\u03b9\u03ba\u03ae\u03c2 \u03b3\u03c1\u03b1\u03bc\u03bc\u03ae\u03c2")
      (setq stegi     "\u03b2\u03ac\u03c3\u03b5\u03b9 \u03a1\u03a3\u0395"))

    ;; ── 2 & 3: ΟΙΚΙΣΜΟΣ <2000 / ΠΡΟ '23 ──────────
    ;; ΣΔ βάσει ΦΕΚ 289/ΑΑΠ/4-11-2011:
    ;;   Ε < 200 m²  → ΣΔ=1,0  (κάλυψη έως 70%)
    ;;   200 ≤ Ε < 700 m²  → μέγ. δόμηση 240 m² (+40 m² πατάρι)
    ;;   Ε ≥ 700 m²  → μέγ. δόμηση 400 m²
    ;; Κάλυψη γενικά 60% (εκτός <200 m²)
    ;; Ύψος 7,50 m (ΦΕΚ 289/ΑΑΠ αρ.1§4α)
    ;; Πρόσωπο: ≥10 m για Ε≤500, ≥15 m για Ε>500 (ΦΕΚ 289 αρ.1§1)
    ;; (νέα γήπεδα μετά 4-11-2011· παλαιά: ό,τι έχουν)
    ((member mode '("2" "3"))
      (setq emin      "2.000 m\u00b2")
      (setq epros     "25 m")
      (setq emin-par  "\u03cc\u03c0\u03bf\u03b9\u03bf \u03b5\u03bc\u03b2\u03b1\u03b4\u03cc\u03bd \u03ad\u03c7\u03bf\u03c5\u03bd (\u03b3\u03ae\u03c0\u03b5\u03b4\u03b1 \u03c0\u03c1\u03b9\u03bd 4.11.2011)")
      (setq epros-par "4 m \u03c3\u03b5 \u03ba\u03bf\u03b9\u03bd\u03cc\u03c7\u03c1\u03b7\u03c3\u03c4\u03bf (\u03b3\u03ae\u03c0\u03b5\u03b4\u03b1 \u03c0\u03c1\u03b9\u03bd 4.11.2011)")
      (setq sd-txt
        (strcat
          "\u0395<200\u03bc\u00b2 \u2192 \u03a3\u0394=1,0 (max 200\u03bc\u00b2, \u03ba\u03ac\u03bb.\u03ad\u03c9\u03c2 70%)  |  "
          "200-699\u03bc\u00b2 \u2192 max \u03b4\u03cc\u03bc\u03b7\u03c3\u03b7 240\u03bc\u00b2 (+40\u03bc\u00b2 \u03c0\u03b1\u03c4\u03ac\u03c1\u03b9)  |  "
          "\u0395\u226a700\u03bc\u00b2 \u2192 max \u03b4\u03cc\u03bc\u03b7\u03c3\u03b7 400\u03bc\u00b2"))
      (setq kaly      "60%  (\u03b5\u03ba\u03c4\u03cc\u03c2 \u03b1\u03bd \u0395<200\u03bc\u00b2: \u03ad\u03c9\u03c2 70%)")
      (setq ypsos     "7,50 m  (+2,00 m \u03b3\u03b9\u03b1 \u03c3\u03c4\u03ad\u03b3\u03b7)")
      (setq aposta    "\u22652,50 m \u03b1\u03c0\u03cc \u03c0\u03bb\u03ac\u03b3\u03b9\u03b1 & \u03bf\u03c0\u03af\u03c3\u03b8\u03b9\u03b1 \u03cc\u03c1\u03b9\u03b1 (\u03ae \u03b5\u03c0\u03b1\u03c6\u03ae)")
      (setq gramd     "\u03b5\u03c0\u03af \u03c1\u03c5\u03bc/\u03ba\u03ae\u03c2 \u03ae \u03bf\u03c1\u03af\u03bf\u03c5 \u03ba\u03bf\u03b9\u03bd\u03cc\u03c7\u03c1\u03b7\u03c3\u03c4\u03bf\u03c5 \u03c7\u03ce\u03c1\u03bf\u03c5")
      (setq stegi     "\u03c5\u03c0\u03bf\u03c7\u03c1. \u03c3\u03b5 2\u03c9\u03c1\u03bf\u03c6\u03b1 \u03ae \u03bc\u03b5 \u03b5\u03be\u03ac\u03bd\u03c4\u03bb\u03b7\u03c3\u03b7 \u03a3\u0394"))

    ;; ── 4: ΕΚΤΟΣ ΣΧΕΔΙΟΥ ──────────────────────────
    ((= mode "4")
      (setq emin      "4.000 m\u00b2")
      (setq epros     "45 m")
      (setq emin-par  "2.000 m\u00b2")
      (setq epros-par "25 m")
      (setq sd-txt    "0,20  (max 200 m\u00b2)")
      (setq kaly      "20%")
      (setq ypsos     "7,50 m  (+2,00 m \u03b3\u03b9\u03b1 \u03c3\u03c4\u03ad\u03b3\u03b7)")
      (setq aposta    "\u03b2\u03bb. \u03bd.5306/2026 \u03ac\u03c1.251")
      (setq gramd     "\u03b2\u03bb. \u03bd.5306/2026 \u03ac\u03c1.251")
      (setq stegi     "\u03b5\u03c0\u03b9\u03c4\u03c1\u03ad\u03c0\u03b5\u03c4\u03b1\u03b9"))
  )

  ;; ════ ΣΗΜΕΙΟ & ΥΨΟΣ ════════════════════════════════

  (setq pt (getpoint "\n\u03a3\u03b7\u03bc\u03b5\u03af\u03bf \u03b5\u03b9\u03c3\u03b1\u03b3\u03c9\u03b3\u03ae\u03c2: "))
  (if (null pt) (exit))
  (setq h (getdist pt "\n\u038d\u03c8\u03bf\u03c2 \u03b3\u03c1\u03b1\u03bc\u03bc\u03b1\u03c4\u03bf\u03c3\u03b5\u03b9\u03c1\u03ac\u03c2 <2.5>: "))
  (if (null h) (setq h 2.5))

  ;; ════ ΓΕΩΜΕΤΡΙΑ ════════════════════════════════════

  (setq rh  (* h 2.2))
  (setq cw1 (* h 14.0))
  (setq cw2 (* h 24.0))
  (setq px  (* h 0.4))
  (setq py  (* h 0.35))

  ;; ════ LAYERS ═══════════════════════════════════════

  (od-layer "OD-FRAME" 5)
  (od-layer "OD-TXT"   2)
  (od-layer "OD-HDR"   3)

  ;; ════ ΤΙΤΛΟΣ ═══════════════════════════════════════

  (setq tit
    (strcat
      "\u039f\u03a1\u039f\u0399 \u0394\u039f\u039c\u0397\u03a3\u0397\u03a3  "
      (cond
        ((= mode "1") "\u03b5\u03bd\u03c4\u03cc\u03c2 \u03c3\u03c7\u03b5\u03b4\u03af\u03bf\u03c5 \u03c0\u03cc\u03bb\u03b7\u03c2 | \u03bd.5306/2026")
        ((= mode "2")
          (if (= fek "")
            "\u03bf\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2 <2000 \u03ba\u03b1\u03c4. | \u03a0\u0394 24.4/1985 + \u03a6\u0395\u039a 289\u0391\u0391\u03a0/2011"
            (strcat "\u03bf\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2 <2000 \u03ba\u03b1\u03c4. | \u03a0\u0394 24.4/1985 + \u03a6\u0395\u039a 289\u0391\u0391\u03a0/2011 | \u03b1\u03c0\u03cc\u03c6. \u039d\u03bf\u03bc.: " fek)))
        ((= mode "3")
          (if (= fek "")
            "\u03bf\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2 \u03c0\u03c1\u03bf '23 | \u03bd.5306/2026 \u03ac\u03c1.226\u03b5\u03c0."
            (strcat "\u03bf\u03b9\u03ba\u03b9\u03c3\u03bc\u03cc\u03c2 \u03c0\u03c1\u03bf '23 | \u03bd.5306/2026 \u03ac\u03c1.226\u03b5\u03c0. | \u03b1\u03c0\u03cc\u03c6. \u039d\u03bf\u03bc.: " fek)))
        ((= mode "4") "\u03b5\u03ba\u03c4\u03cc\u03c2 \u03c3\u03c7\u03b5\u03b4\u03af\u03bf\u03c5 | \u03bd.5306/2026 \u03ac\u03c1.249-251"))))

  (setq cy (cadr pt))

  ;; τίτλος
  (od-rect (car pt) cy (+ (car pt) cw1 cw2) (+ cy rh) "OD-FRAME")
  (od-txt  (+ (car pt) px) (+ cy py) (* h 1.1) "OD-HDR" tit)
  (setq cy (+ cy rh))

  ;; γραμμή ονόματος
  (od-rect (car pt) cy (+ (car pt) cw1 cw2) (+ cy rh) "OD-FRAME")
  (od-vline (+ (car pt) cw1) cy (+ cy rh) "OD-FRAME")
  (od-txt (+ (car pt) px) (+ cy py) h "OD-TXT" "\u039f\u0399\u039a\u0399\u03a3\u039c\u039f\u03a3 / \u03a0\u0395\u03a1\u0399\u039f\u03a7\u0397")
  (od-txt (+ (car pt) cw1 px) (+ cy py) h "OD-TXT" onom)
  (setq cy (+ cy rh))

  ;; γραμμές παραμέτρων
  (setq rows
    (list
      (cons "\u0391\u03a1\u03a4\u0399\u039f\u03a4\u0397\u03a4\u0391 \u039a\u0391\u03a4\u0391 \u039a\u0391\u039d\u039f\u039d\u0391"
            (strcat emin "  /  " epros " \u03c0\u03c1\u03cc\u03c3\u03c9\u03c0\u03bf"))
      (cons "\u0391\u03a1\u03a4\u0399\u039f\u03a4\u0397\u03a4\u0391 \u039a\u0391\u03a4. \u03a0\u0391\u03a1\u0395\u039a\u039a\u039b\u0399\u03a3\u0397"
            (strcat emin-par "  /  " epros-par " \u03c0\u03c1\u03cc\u03c3\u03c9\u03c0\u03bf"))
      (cons "\u03a3\u03a5\u039d\u03a4. \u0394\u039f\u039c\u0397\u03a3\u0397\u03a3 / \u039c\u0395\u0393. \u0394\u039f\u039c\u0397\u03a3\u0397" sd-txt)
      (cons "\u039c\u0395\u0393. \u03a0\u039f\u03a3\u039f\u03a3\u03a4\u039f \u039a\u0391\u039b\u03a5\u03a8\u0397\u03a3" kaly)
      (cons "\u039c\u0395\u0393. \u03a5\u03a8\u039f\u03a3 \u039a\u03a4\u0399\u03a1\u0399\u039f\u03a5" ypsos)
      (cons "\u0391\u03a0\u039f\u03a3\u03a4\u0391\u03a3\u0395\u0399\u03a3 \u0391\u03a0\u039f \u039f\u03a1\u0399\u0391" aposta)
      (cons "\u0393\u03a1\u0391\u039c\u039c\u0397 \u0394\u039f\u039c\u0397\u03a3\u0397\u03a3" gramd)
      (cons "\u03a3\u03a4\u0395\u0393\u0397" stegi)))

  (foreach row rows
    (od-rect (car pt) cy (+ (car pt) cw1 cw2) (+ cy rh) "OD-FRAME")
    (od-vline (+ (car pt) cw1) cy (+ cy rh) "OD-FRAME")
    (od-txt (+ (car pt) px) (+ cy py) h "OD-TXT" (car row))
    (od-txt (+ (car pt) cw1 px) (+ cy py) h "OD-TXT" (cdr row))
    (setq cy (+ cy rh)))

  ;; υποσημείωση
  (od-txt (car pt) (+ cy (* h 0.25)) (* h 0.8) "OD-TXT"
    (cond
      ((= mode "1") "\u039d\u039f\u039a \u03bd.4067/2012 \u03c9\u03c2 \u03b9\u03c3\u03c7. | \u03bd.5306/2026")
      ((member mode '("2" "3"))
        "\u03a0\u0394 24.4/1985 \u03bc\u03b5\u03c4\u03b1\u03b2. \u03b9\u03c3\u03c7\u03cd\u03b5\u03b9 \u03b2\u03ac\u03c3\u03b5\u03b9 \u03bd.5306/2026 \u03ac\u03c1.247\u00a73 | \u03a4\u03c1\u03bf\u03c0. \u03a3\u0394: \u03a6\u0395\u039a 289/\u0391\u0391\u03a0/4-11-2011")
      ((= mode "4")
        "\u03bd.5306/2026 \u03ac\u03c1.249-251 | \u03a0\u0394 6/17.10.1978 \u03a6\u0395\u039a \u0394'538")))

  (princ "\n\u2714 OROIDOM v2.0: \u03a0\u03af\u03bd\u03b1\u03ba\u03b1\u03c2 \u03b5\u03b9\u03c3\u03ae\u03c7\u03b8\u03b7\u03ba\u03b5. Layers: OD-FRAME / OD-HDR / OD-TXT")
  (princ))

(princ "\n\u039f\u03a1\u039f\u0399\u0394\u039f\u039c v2.0 \u03c6\u03bf\u03c1\u03c4\u03ce\u03b8\u03b7\u03ba\u03b5. \u0395\u03bd\u03c4\u03bf\u03bb\u03ae: OROIDOM")
(princ)
