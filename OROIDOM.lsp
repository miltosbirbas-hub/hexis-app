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
        "\n  1  \U+03B5\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5 \U+03C0\U+03CC\U+03BB\U+03B7\U+03C2"
        "\n  2  \U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 <2000 \U+03BA\U+03B1\U+03C4. (\U+03A0\U+0394 24.4/1985 + \U+03A6\U+0395\U+039A 289\U+0391\U+0391\U+03A0/2011)"
        "\n  3  \U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+03C0\U+03C1\U+03BF '23 (\U+03AF\U+03B4\U+03B9\U+03BF\U+03B9 \U+03CC\U+03C1\U+03BF\U+03B9 \U+03BC\U+03B5 mode 2)"
        "\n  4  \U+03B5\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5"
        "\n[1/2/3/4]: ")))

  (if (member mode '("2" "3"))
    (progn
      (setq fek (getstring T
        "\n\U+03A6\U+0395\U+039A \U+03B1\U+03C0\U+03CC\U+03C6. \U+039D\U+03BF\U+03BC\U+03AC\U+03C1\U+03C7\U+03B7 (Enter=\U+03BA\U+03B1\U+03BD\U+03AD\U+03BD\U+03B1\U+03C2): "))
      (if (= fek "") (setq fek "")))
    (setq fek ""))

  (setq onom (getstring T "\n\U+039F\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2/\U+03A0\U+03B5\U+03C1\U+03B9\U+03BF\U+03C7\U+03AE: "))
  (if (= onom "") (setq onom "---"))

  ;; ════ ΤΙΜΕΣ ΑΝΑ MODE ═══════════════════════════════

  (cond

    ;; ── 1: ΕΝΤΟΣ ΣΧΕΔΙΟΥ ──────────────────────────
    ((= mode "1")
      (setq emin      "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03CC\U+03C1\U+03C9\U+03BD \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 (\U+03A1\U+03A3\U+0395)")
      (setq epros     "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03CC\U+03C1\U+03C9\U+03BD \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 (\U+03A1\U+03A3\U+0395)")
      (setq emin-par  "---")
      (setq epros-par "---")
      (setq sd-txt    "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03A1\U+03A3\U+0395")
      (setq kaly      "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03A1\U+03A3\U+0395")
      (setq ypsos     "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03A1\U+03A3\U+0395")
      (setq aposta    "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03A1\U+03A3\U+0395")
      (setq gramd     "\U+03B5\U+03C0\U+03AF \U+03C1\U+03C5\U+03BC\U+03BF\U+03C4\U+03BF\U+03BC\U+03B9\U+03BA\U+03AE\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AE\U+03C2")
      (setq stegi     "\U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03A1\U+03A3\U+0395"))

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
      (setq emin      "2.000 m\U+00B2")
      (setq epros     "25 m")
      (setq emin-par  "\U+03CC\U+03C0\U+03BF\U+03B9\U+03BF \U+03B5\U+03BC\U+03B2\U+03B1\U+03B4\U+03CC\U+03BD \U+03AD\U+03C7\U+03BF\U+03C5\U+03BD (\U+03B3\U+03AE\U+03C0\U+03B5\U+03B4\U+03B1 \U+03C0\U+03C1\U+03B9\U+03BD 4.11.2011)")
      (setq epros-par "4 m \U+03C3\U+03B5 \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF (\U+03B3\U+03AE\U+03C0\U+03B5\U+03B4\U+03B1 \U+03C0\U+03C1\U+03B9\U+03BD 4.11.2011)")
      (setq sd-txt
        (strcat
          "\U+0395<200\U+03BC\U+00B2 \U+2192 \U+03A3\U+0394=1,0 (max 200\U+03BC\U+00B2, \U+03BA\U+03AC\U+03BB.\U+03AD\U+03C9\U+03C2 70%)  |  "
          "200-699\U+03BC\U+00B2 \U+2192 max \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 240\U+03BC\U+00B2 (+40\U+03BC\U+00B2 \U+03C0\U+03B1\U+03C4\U+03AC\U+03C1\U+03B9)  |  "
          "\U+0395\U+226A700\U+03BC\U+00B2 \U+2192 max \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7 400\U+03BC\U+00B2"))
      (setq kaly      "60%  (\U+03B5\U+03BA\U+03C4\U+03CC\U+03C2 \U+03B1\U+03BD \U+0395<200\U+03BC\U+00B2: \U+03AD\U+03C9\U+03C2 70%)")
      (setq ypsos     "7,50 m  (+2,00 m \U+03B3\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7)")
      (setq aposta    "\U+22652,50 m \U+03B1\U+03C0\U+03CC \U+03C0\U+03BB\U+03AC\U+03B3\U+03B9\U+03B1 & \U+03BF\U+03C0\U+03AF\U+03C3\U+03B8\U+03B9\U+03B1 \U+03CC\U+03C1\U+03B9\U+03B1 (\U+03AE \U+03B5\U+03C0\U+03B1\U+03C6\U+03AE)")
      (setq gramd     "\U+03B5\U+03C0\U+03AF \U+03C1\U+03C5\U+03BC/\U+03BA\U+03AE\U+03C2 \U+03AE \U+03BF\U+03C1\U+03AF\U+03BF\U+03C5 \U+03BA\U+03BF\U+03B9\U+03BD\U+03CC\U+03C7\U+03C1\U+03B7\U+03C3\U+03C4\U+03BF\U+03C5 \U+03C7\U+03CE\U+03C1\U+03BF\U+03C5")
      (setq stegi     "\U+03C5\U+03C0\U+03BF\U+03C7\U+03C1. \U+03C3\U+03B5 2\U+03C9\U+03C1\U+03BF\U+03C6\U+03B1 \U+03AE \U+03BC\U+03B5 \U+03B5\U+03BE\U+03AC\U+03BD\U+03C4\U+03BB\U+03B7\U+03C3\U+03B7 \U+03A3\U+0394"))

    ;; ── 4: ΕΚΤΟΣ ΣΧΕΔΙΟΥ ──────────────────────────
    ((= mode "4")
      (setq emin      "4.000 m\U+00B2")
      (setq epros     "45 m")
      (setq emin-par  "2.000 m\U+00B2")
      (setq epros-par "25 m")
      (setq sd-txt    "0,20  (max 200 m\U+00B2)")
      (setq kaly      "20%")
      (setq ypsos     "7,50 m  (+2,00 m \U+03B3\U+03B9\U+03B1 \U+03C3\U+03C4\U+03AD\U+03B3\U+03B7)")
      (setq aposta    "\U+03B2\U+03BB. \U+03BD.5306/2026 \U+03AC\U+03C1.251")
      (setq gramd     "\U+03B2\U+03BB. \U+03BD.5306/2026 \U+03AC\U+03C1.251")
      (setq stegi     "\U+03B5\U+03C0\U+03B9\U+03C4\U+03C1\U+03AD\U+03C0\U+03B5\U+03C4\U+03B1\U+03B9"))
  )

  ;; ════ ΣΗΜΕΙΟ & ΥΨΟΣ ════════════════════════════════

  (setq pt (getpoint "\n\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2: "))
  (if (null pt) (exit))
  (setq h (getdist pt "\n\U+038D\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C3\U+03B5\U+03B9\U+03C1\U+03AC\U+03C2 <2.5>: "))
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
      "\U+039F\U+03A1\U+039F\U+0399 \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3  "
      (cond
        ((= mode "1") "\U+03B5\U+03BD\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5 \U+03C0\U+03CC\U+03BB\U+03B7\U+03C2 | \U+03BD.5306/2026")
        ((= mode "2")
          (if (= fek "")
            "\U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 <2000 \U+03BA\U+03B1\U+03C4. | \U+03A0\U+0394 24.4/1985 + \U+03A6\U+0395\U+039A 289\U+0391\U+0391\U+03A0/2011"
            (strcat "\U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 <2000 \U+03BA\U+03B1\U+03C4. | \U+03A0\U+0394 24.4/1985 + \U+03A6\U+0395\U+039A 289\U+0391\U+0391\U+03A0/2011 | \U+03B1\U+03C0\U+03CC\U+03C6. \U+039D\U+03BF\U+03BC.: " fek)))
        ((= mode "3")
          (if (= fek "")
            "\U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+03C0\U+03C1\U+03BF '23 | \U+03BD.5306/2026 \U+03AC\U+03C1.226\U+03B5\U+03C0."
            (strcat "\U+03BF\U+03B9\U+03BA\U+03B9\U+03C3\U+03BC\U+03CC\U+03C2 \U+03C0\U+03C1\U+03BF '23 | \U+03BD.5306/2026 \U+03AC\U+03C1.226\U+03B5\U+03C0. | \U+03B1\U+03C0\U+03CC\U+03C6. \U+039D\U+03BF\U+03BC.: " fek)))
        ((= mode "4") "\U+03B5\U+03BA\U+03C4\U+03CC\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5 | \U+03BD.5306/2026 \U+03AC\U+03C1.249-251"))))

  (setq cy (cadr pt))

  ;; τίτλος
  (od-rect (car pt) cy (+ (car pt) cw1 cw2) (+ cy rh) "OD-FRAME")
  (od-txt  (+ (car pt) px) (+ cy py) (* h 1.1) "OD-HDR" tit)
  (setq cy (+ cy rh))

  ;; γραμμή ονόματος
  (od-rect (car pt) cy (+ (car pt) cw1 cw2) (+ cy rh) "OD-FRAME")
  (od-vline (+ (car pt) cw1) cy (+ cy rh) "OD-FRAME")
  (od-txt (+ (car pt) px) (+ cy py) h "OD-TXT" "\U+039F\U+0399\U+039A\U+0399\U+03A3\U+039C\U+039F\U+03A3 / \U+03A0\U+0395\U+03A1\U+0399\U+039F\U+03A7\U+0397")
  (od-txt (+ (car pt) cw1 px) (+ cy py) h "OD-TXT" onom)
  (setq cy (+ cy rh))

  ;; γραμμές παραμέτρων
  (setq rows
    (list
      (cons "\U+0391\U+03A1\U+03A4\U+0399\U+039F\U+03A4\U+0397\U+03A4\U+0391 \U+039A\U+0391\U+03A4\U+0391 \U+039A\U+0391\U+039D\U+039F\U+039D\U+0391"
            (strcat emin "  /  " epros " \U+03C0\U+03C1\U+03CC\U+03C3\U+03C9\U+03C0\U+03BF"))
      (cons "\U+0391\U+03A1\U+03A4\U+0399\U+039F\U+03A4\U+0397\U+03A4\U+0391 \U+039A\U+0391\U+03A4. \U+03A0\U+0391\U+03A1\U+0395\U+039A\U+039A\U+039B\U+0399\U+03A3\U+0397"
            (strcat emin-par "  /  " epros-par " \U+03C0\U+03C1\U+03CC\U+03C3\U+03C9\U+03C0\U+03BF"))
      (cons "\U+03A3\U+03A5\U+039D\U+03A4. \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3 / \U+039C\U+0395\U+0393. \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397" sd-txt)
      (cons "\U+039C\U+0395\U+0393. \U+03A0\U+039F\U+03A3\U+039F\U+03A3\U+03A4\U+039F \U+039A\U+0391\U+039B\U+03A5\U+03A8\U+0397\U+03A3" kaly)
      (cons "\U+039C\U+0395\U+0393. \U+03A5\U+03A8\U+039F\U+03A3 \U+039A\U+03A4\U+0399\U+03A1\U+0399\U+039F\U+03A5" ypsos)
      (cons "\U+0391\U+03A0\U+039F\U+03A3\U+03A4\U+0391\U+03A3\U+0395\U+0399\U+03A3 \U+0391\U+03A0\U+039F \U+039F\U+03A1\U+0399\U+0391" aposta)
      (cons "\U+0393\U+03A1\U+0391\U+039C\U+039C\U+0397 \U+0394\U+039F\U+039C\U+0397\U+03A3\U+0397\U+03A3" gramd)
      (cons "\U+03A3\U+03A4\U+0395\U+0393\U+0397" stegi)))

  (foreach row rows
    (od-rect (car pt) cy (+ (car pt) cw1 cw2) (+ cy rh) "OD-FRAME")
    (od-vline (+ (car pt) cw1) cy (+ cy rh) "OD-FRAME")
    (od-txt (+ (car pt) px) (+ cy py) h "OD-TXT" (car row))
    (od-txt (+ (car pt) cw1 px) (+ cy py) h "OD-TXT" (cdr row))
    (setq cy (+ cy rh)))

  ;; υποσημείωση
  (od-txt (car pt) (+ cy (* h 0.25)) (* h 0.8) "OD-TXT"
    (cond
      ((= mode "1") "\U+039D\U+039F\U+039A \U+03BD.4067/2012 \U+03C9\U+03C2 \U+03B9\U+03C3\U+03C7. | \U+03BD.5306/2026")
      ((member mode '("2" "3"))
        "\U+03A0\U+0394 24.4/1985 \U+03BC\U+03B5\U+03C4\U+03B1\U+03B2. \U+03B9\U+03C3\U+03C7\U+03CD\U+03B5\U+03B9 \U+03B2\U+03AC\U+03C3\U+03B5\U+03B9 \U+03BD.5306/2026 \U+03AC\U+03C1.247\U+00A73 | \U+03A4\U+03C1\U+03BF\U+03C0. \U+03A3\U+0394: \U+03A6\U+0395\U+039A 289/\U+0391\U+0391\U+03A0/4-11-2011")
      ((= mode "4")
        "\U+03BD.5306/2026 \U+03AC\U+03C1.249-251 | \U+03A0\U+0394 6/17.10.1978 \U+03A6\U+0395\U+039A \U+0394'538")))

  (princ "\n\U+2714 OROIDOM v2.0: \U+03A0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1\U+03C2 \U+03B5\U+03B9\U+03C3\U+03AE\U+03C7\U+03B8\U+03B7\U+03BA\U+03B5. Layers: OD-FRAME / OD-HDR / OD-TXT")
  (princ))

(princ "\n\U+039F\U+03A1\U+039F\U+0399\U+0394\U+039F\U+039C v2.0 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AE: OROIDOM")
(princ)
