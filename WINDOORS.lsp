;;; WINDOORS.LSP v2.0 — Κουφώματα κάτοψης
;;; Παράθυρα, μπαλκονόπορτες, πόρτες (εσωτ/εξωτ), συρόμενα επάλληλα
;;; Αποθηκεύει XData (τύπος, πλάτος, ύψος, ποδιά) για αυτόματες τομές (TOMES)
;;; Εντολή: WINDOORS | HEXIS — BRB DEVELOPMENT

(setq *wd-TYP* "WIN" *wd-W* 1.20 *wd-T* 0.25 *wd-HOP* 1.20 *wd-SILL* 0.90)

(defun wd-layer (nm col)
  (if (null (tblsearch "LAYER" nm))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord")
                   (cons 100 "AcDbLayerTableRecord") (cons 2 nm)
                   (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))

(defun wd-line (p1 p2)
  (entmake (list (cons 0 "LINE") (cons 100 "AcDbEntity") (cons 8 "WINDOORS")
                 (cons 10 p1) (cons 11 p2))))

; ορθογώνιο από 4 γωνίες (όχι axis-aligned) + XData στο τελευταίο
(defun wd-rect4 (pa pb pc pd xd / el)
  (setq el (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 "WINDOORS")
                 (cons 100 "AcDbPolyline") (cons 90 4) (cons 70 1)
                 (cons 10 (list (car pa) (cadr pa)))
                 (cons 10 (list (car pb) (cadr pb)))
                 (cons 10 (list (car pc) (cadr pc)))
                 (cons 10 (list (car pd) (cadr pd)))))
  (if xd (setq el (append el (list xd))))
  (entmake el))

; τόξο (κέντρο, ακτίνα, γωνία αρχής, γωνία τέλους)
(defun wd-arc (cen r a1 a2)
  (entmake (list (cons 0 "ARC") (cons 100 "AcDbEntity") (cons 8 "WINDOORS")
                 (cons 100 "AcDbCircle") (cons 10 cen) (cons 40 r)
                 (cons 100 "AcDbArc") (cons 50 a1) (cons 51 a2))))

; XData block
(defun wd-xdata (typ w hop sill)
  (if (null (tblsearch "APPID" "HEXIS_WD")) (regapp "HEXIS_WD"))
  (list -3 (list "HEXIS_WD"
    (cons 1000 typ) (cons 1040 w) (cons 1040 hop) (cons 1040 sill))))

;; -- Σχεδίαση τύπων --
; Κοινά: p1 αρχή ανοίγματος (παρειά τοίχου), ang διεύθυνση, w πλάτος,
;        t πάχος τοίχου, s πλευρά εσωτερικού (+1/-1)

; Λαμπάδες (jambs) στα δύο άκρα
(defun wd-jambs (p1 ang w wt s / p2)
  (setq p2 (polar p1 ang w))
  (wd-line p1 (polar p1 (+ ang (* s (/ pi 2))) wt))
  (wd-line p2 (polar p2 (+ ang (* s (/ pi 2))) wt)))

; ΠΑΡΑΘΥΡΟ / ΜΠΑΛΚΟΝΟΠΟΡΤΑ σταθερό σχέδιο: πλαίσιο + 2 γραμμές τζάμι
(defun wd-window (p1 ang w wt s typ hop sill / p2 g1 g2)
  (wd-jambs p1 ang w wt s)
  ;; πλαίσιο: ορθογώνιο σε όλο το άνοιγμα (με XData)
  (wd-rect4 p1 (polar p1 ang w)
            (polar (polar p1 ang w) (+ ang (* s (/ pi 2))) wt)
            (polar p1 (+ ang (* s (/ pi 2))) wt)
            (wd-xdata typ w hop sill))
  ;; τζάμι: 2 γραμμές στο μέσο του πάχους
  (setq g1 (polar p1 (+ ang (* s (/ pi 2))) (* wt 0.45)))
  (setq g2 (polar p1 (+ ang (* s (/ pi 2))) (* wt 0.55)))
  (wd-line g1 (polar g1 ang w))
  (wd-line g2 (polar g2 ang w)))

; ΠΟΡΤΑ ανοιγόμενη: λαμπάδες + φύλλο ανοιχτό 90 + τόξο
; hinge1: T=μεντεσές στο p1, nil=στο p2 · sw: +1 άνοιγμα προς s, -1 αντίθετα
(defun wd-door (p1 ang w wt s typ hinge1 sw / hp fp swang)
  (wd-jambs p1 ang w wt s)
  ;; XData σε αόρατο-λεπτό πλαίσιο κατωφλιού
  (wd-rect4 p1 (polar p1 ang w)
            (polar (polar p1 ang w) (+ ang (* s (/ pi 2))) wt)
            (polar p1 (+ ang (* s (/ pi 2))) wt)
            (wd-xdata typ w 2.20 0.0))
  ;; μεντεσές & φορά
  (setq swang (* sw s (/ pi 2)))
  (if hinge1
    (progn
      (setq hp (if (> (* sw s) 0) (polar p1 (+ ang (* s (/ pi 2))) wt) p1))
      (setq fp (polar hp (+ ang swang) w))
      (wd-line hp fp)
      (if (> swang 0)
        (wd-arc hp w ang (+ ang swang))
        (wd-arc hp w (+ ang swang) ang)))
    (progn
      (setq hp (if (> (* sw s) 0)
                 (polar (polar p1 ang w) (+ ang (* s (/ pi 2))) wt)
                 (polar p1 ang w)))
      (setq fp (polar hp (+ (+ ang pi) (- swang)) w))
      (wd-line hp fp)
      (if (> (- swang) 0)
        (wd-arc hp w (+ ang pi) (+ (+ ang pi) (- swang)))
        (wd-arc hp w (+ (+ ang pi) (- swang)) (+ ang pi))))))

; ΣΥΡΟΜΕΝΟ επάλληλο: 2 φύλλα με επικάλυψη στο μέσο
(defun wd-slide (p1 ang w wt s typ hop sill / ov leafw a b)
  (wd-jambs p1 ang w wt s)
  (wd-rect4 p1 (polar p1 ang w)
            (polar (polar p1 ang w) (+ ang (* s (/ pi 2))) wt)
            (polar p1 (+ ang (* s (/ pi 2))) wt)
            (wd-xdata typ w hop sill))
  (setq ov (* w 0.05) leafw (+ (/ w 2.0) ov))
  ;; φύλλο 1: εσωτερική τροχιά (t*0.35-0.48)
  (setq a (polar p1 (+ ang (* s (/ pi 2))) (* wt 0.35)))
  (wd-rect4 a (polar a ang leafw)
            (polar (polar a ang leafw) (+ ang (* s (/ pi 2))) (* wt 0.13))
            (polar a (+ ang (* s (/ pi 2))) (* wt 0.13)) nil)
  ;; φύλλο 2: εξωτερική τροχιά (t*0.52-0.65), από το μέσο
  (setq b (polar (polar p1 ang (- (/ w 2.0) ov)) (+ ang (* s (/ pi 2))) (* wt 0.52)))
  (wd-rect4 b (polar b ang leafw)
            (polar (polar b ang leafw) (+ ang (* s (/ pi 2))) (* wt 0.13))
            (polar b (+ ang (* s (/ pi 2))) (* wt 0.13)) nil))

;; -- Preview κάτοψης τύπου στο image tile --
(defun wd-prev ( / w h x0 x1 yw1 yw2 gy1 gy2 mx i aa px py qx qy hx hy)
  (setq w (dimx_tile "prev") h (dimy_tile "prev"))
  (start_image "prev")
  (fill_image 0 0 w h 0)
  (setq x0 (fix (* w 0.10)) x1 (fix (* w 0.90)))
  (setq yw1 (fix (* h 0.42)) yw2 (fix (* h 0.58)))
  ;; τοίχος αριστερά-δεξιά με κενό στο άνοιγμα (25%-75%)
  (setq ja (fix (* w 0.30)) jb (fix (* w 0.70)))
  (vector_image x0 yw1 ja yw1 7) (vector_image x0 yw2 ja yw2 7)
  (vector_image jb yw1 x1 yw1 7) (vector_image jb yw2 x1 yw2 7)
  ;; λαμπάδες
  (vector_image ja yw1 ja yw2 7) (vector_image jb yw1 jb yw2 7)
  (cond
    ;; παράθυρο/μπαλκονόπορτα: διπλή γραμμή τζάμι
    ((member *wd-TYP* (list "WIN" "BAL"))
      (setq gy1 (fix (* h 0.47)) gy2 (fix (* h 0.53)))
      (vector_image ja gy1 jb gy1 4)
      (vector_image ja gy2 jb gy2 4)
      (set_tile "pinfo"
        (if (= *wd-TYP* "WIN") "Παράθυρο: τζάμι + ποδιά 0.90"
                               "Μπαλκονόπορτα: τζάμι έως δάπεδο")))
    ;; συρόμενα: 2 επάλληλα φύλλα
    ((member *wd-TYP* (list "SLW" "SLB"))
      (setq mx (fix (/ (+ ja jb) 2)))
      (vector_image ja (fix (* h 0.44)) (+ mx 4) (fix (* h 0.44)) 4)
      (vector_image ja (fix (* h 0.47)) (+ mx 4) (fix (* h 0.47)) 4)
      (vector_image ja (fix (* h 0.44)) ja (fix (* h 0.47)) 4)
      (vector_image (+ mx 4) (fix (* h 0.44)) (+ mx 4) (fix (* h 0.47)) 4)
      (vector_image (- mx 4) (fix (* h 0.53)) jb (fix (* h 0.53)) 4)
      (vector_image (- mx 4) (fix (* h 0.56)) jb (fix (* h 0.56)) 4)
      (vector_image (- mx 4) (fix (* h 0.53)) (- mx 4) (fix (* h 0.56)) 4)
      (vector_image jb (fix (* h 0.53)) jb (fix (* h 0.56)) 4)
      (set_tile "pinfo" "Συρόμενο επάλληλο: 2 φύλλα με επικάλυψη"))
    ;; πόρτες: φύλλο + τόξο
    ((member *wd-TYP* (list "DIN" "DEX"))
      ;; φύλλο κατακόρυφο από τον μεντεσέ (ja) προς τα πάνω
      (setq px ja py yw1)
      (setq hy (- yw1 (- jb ja)))
      (if (< hy 4) (setq hy 4))
      (vector_image px py px hy 4)
      ;; τόξο 90 μοιρών με 12 τμήματα από το φύλλο έως το jb
      (setq i 0 qx px qy hy)
      (while (< i 12)
        (setq aa (* (/ (float (1+ i)) 12.0) (/ pi 2.0)))
        (setq hx (+ ja (fix (* (- jb ja) (sin aa)))))
        (setq hy (- yw1 (fix (* (- jb ja) (cos aa)))))
        (vector_image qx qy hx hy 1)
        (setq qx hx qy hy)
        (setq i (1+ i)))
      (set_tile "pinfo"
        (if (= *wd-TYP* "DIN") "Πόρτα εσωτερική: φύλλο + τόξο 90"
                               "Πόρτα εξωτερική: φύλλο + τόξο 90"))))
  (end_image))

;; ========== ΚΥΡΙΑ ΕΝΤΟΛΗ ==========
(defun C:WINDOORS ( / *error* dclpath dclid status f
    p1 pdir ang wt pside cross s w hop sill typ
    hingep hinge1 swp sw mid)

  (defun *error* (msg)
    (if (not (member msg (list "Function cancelled" "quit / exit abort")))
      (princ (strcat "\nΣφάλμα WINDOORS: " msg)))
    (princ))

  (wd-layer "WINDOORS" 4)

  ;; -- DCL --
  (setq dclpath (strcat (getvar "TEMPPREFIX") "windoors.dcl"))
  (setq f (open dclpath "w"))
  (write-line "windoors_dlg : dialog {" f)
  (write-line "  label = \"WINDOORS — Κουφώματα (HEXIS)\";" f)
  (write-line "  : row {" f)
  (write-line "  : column {" f)
  (write-line "  : radio_column { key = \"typ\"; label = \"Τύπος κουφώματος\";" f)
  (write-line "    : radio_button { key = \"t_win\"; label = \"Παράθυρο ανοιγόμενο\"; value = \"1\"; }" f)
  (write-line "    : radio_button { key = \"t_bal\"; label = \"Μπαλκονόπορτα ανοιγόμενη\"; }" f)
  (write-line "    : radio_button { key = \"t_din\"; label = \"Πόρτα εσωτερική\"; }" f)
  (write-line "    : radio_button { key = \"t_dex\"; label = \"Πόρτα εξωτερική / εισόδου\"; }" f)
  (write-line "    : radio_button { key = \"t_slw\"; label = \"Συρόμενο επάλληλο παράθυρο\"; }" f)
  (write-line "    : radio_button { key = \"t_slb\"; label = \"Συρόμενη επάλληλη μπαλκονόπορτα\"; }" f)
  (write-line "  }" f)
  (write-line "  : edit_box { key = \"w\"; label = \"Πλάτος ανοίγματος (m):\"; edit_width = 8; }" f)
  (write-line "  : edit_box { key = \"t\"; label = \"Πάχος τοίχου (m):\"; edit_width = 8; }" f)
  (write-line "  : edit_box { key = \"hop\"; label = \"Ύψος κουφώματος (m):\"; edit_width = 8; }" f)
  (write-line "  : edit_box { key = \"sill\"; label = \"Ποδιά - στάθμη κάτω (m):\"; edit_width = 8; }" f)
  (write-line "  }" f)
  (write-line "  : column {" f)
  (write-line "  : image { key = \"prev\"; width = 34; aspect_ratio = 0.65; color = 0; }" f)
  (write-line "  : text { key = \"pinfo\"; width = 36; }" f)
  (write-line "  }" f)
  (write-line "  }" f)
  (write-line "  ok_cancel;" f)
  (write-line "}" f)
  (close f)

  (setq dclid (load_dialog dclpath))
  (if (< dclid 0) (progn (princ "\nΑποτυχία DCL.") (exit)))
  (if (not (new_dialog "windoors_dlg" dclid)) (progn (princ "\nΑποτυχία διαλόγου.") (exit)))

  (set_tile "w" (rtos *wd-W* 2 2))
  (set_tile "t" (rtos *wd-T* 2 2))
  (set_tile "hop" (rtos *wd-HOP* 2 2))
  (set_tile "sill" (rtos *wd-SILL* 2 2))
  (wd-prev)

  ;; προεπιλογές ανά τύπο
  (action_tile "t_win" "(setq *wd-TYP* \"WIN\") (wd-prev) (set_tile \"hop\" \"1.20\") (set_tile \"sill\" \"0.90\")")
  (action_tile "t_bal" "(setq *wd-TYP* \"BAL\") (wd-prev) (set_tile \"hop\" \"2.20\") (set_tile \"sill\" \"0.00\")")
  (action_tile "t_din" "(setq *wd-TYP* \"DIN\") (wd-prev) (set_tile \"hop\" \"2.20\") (set_tile \"sill\" \"0.00\") (set_tile \"w\" \"0.90\")")
  (action_tile "t_dex" "(setq *wd-TYP* \"DEX\") (wd-prev) (set_tile \"hop\" \"2.20\") (set_tile \"sill\" \"0.00\") (set_tile \"w\" \"1.00\")")
  (action_tile "t_slw" "(setq *wd-TYP* \"SLW\") (wd-prev) (set_tile \"hop\" \"1.20\") (set_tile \"sill\" \"0.90\") (set_tile \"w\" \"1.60\")")
  (action_tile "t_slb" "(setq *wd-TYP* \"SLB\") (wd-prev) (set_tile \"hop\" \"2.20\") (set_tile \"sill\" \"0.00\") (set_tile \"w\" \"2.00\")")
  (action_tile "accept" "(setq *wd-W* (atof (get_tile \"w\"))) (setq *wd-T* (atof (get_tile \"t\"))) (setq *wd-HOP* (atof (get_tile \"hop\"))) (setq *wd-SILL* (atof (get_tile \"sill\"))) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dclid)
  (if (/= status 1) (progn (princ "\nΑκύρωση.") (exit)))

  (setq w *wd-W* wt *wd-T* hop *wd-HOP* sill *wd-SILL* typ *wd-TYP*)

  ;; -- Τοποθέτηση --
  (setq p1 (getpoint "\nΑρχή ανοίγματος (πάνω στην παρειά τοίχου): "))
  (if (null p1) (exit))
  (setq pdir (getpoint p1 "\nΚατεύθυνση κατά μήκος του τοίχου: "))
  (if (null pdir) (exit))
  (setq ang (angle p1 pdir))
  (setq pside (getpoint "\nΔείξε προς το ΕΣΩΤΕΡΙΚΟ (μέσα στον τοίχο/δωμάτιο): "))
  (if (null pside) (exit))
  (setq cross (- (* (cos ang) (- (cadr pside) (cadr p1)))
                 (* (sin ang) (- (car pside) (car p1)))))
  (setq s (if (>= cross 0.0) 1.0 -1.0))

  (cond
    ((member typ (list "WIN" "BAL"))
      (wd-window p1 ang w wt s typ hop sill))
    ((member typ (list "SLW" "SLB"))
      (wd-slide p1 ang w wt s typ hop sill))
    ((member typ (list "DIN" "DEX"))
      ;; μεντεσές: pick κοντά στο άκρο
      (setq hingep (getpoint "\nΔείξε κοντά στο άκρο με τον ΜΕΝΤΕΣΕ: "))
      (setq hinge1 (or (null hingep)
                       (< (distance hingep p1)
                          (distance hingep (polar p1 ang w)))))
      ;; φορά ανοίγματος
      (setq swp (getpoint "\nΔείξε προς τα ΠΟΥ ανοίγει η πόρτα: "))
      (if (null swp) (setq swp pside))
      (setq cross (- (* (cos ang) (- (cadr swp) (cadr p1)))
                     (* (sin ang) (- (car swp) (car p1)))))
      (setq sw (if (>= (* cross s) 0.0) 1.0 -1.0))
      (wd-door p1 ang w wt s typ hinge1 sw)))

  (princ (strcat "\nWINDOORS: " typ " πλάτος " (rtos w 2 2)
    " m, ύψος " (rtos hop 2 2) ", ποδιά " (rtos sill 2 2)
    " — layer WINDOORS (+XData για TOMES)."))
  (princ))

(princ "\nWINDOORS v2.0 φορτώθηκε. Εντολή: WINDOORS")
(princ)
