;;; ============================================================================
;;; HEXIS - CHECK MY DXF  v2.1  (AutoLISP)
;;; Εντολες: HEXISCHECK (ελεγχος) - HEXISFIX (αυτοδιορθωσεις) - HEXISCLR (καθαρισμος σημανσεων)
;;; Ελεγχος διαγραμματων για Ηλεκτρονικη Υποβολη στο Ελληνικο Κτηματολογιο
;;; συμφωνα με το Τευχος Τεχνικων Προδιαγραφων ΕΚ (εκδ. 1.3/2024, ΠΙΝΑΚΑΣ Ι)
;;;
;;; Συμβατο: AutoCAD 2004+ και ProgeCAD (καθαρη AutoLISP, χωρις VLA/COM)
;;; Φορτωση: APPLOAD -> hexis_check_my_dxf.lsp
;;;
;;; Εντολες:
;;;   HEXISCHECK  Ελεγχος τρεχοντος σχεδιου (πριν το DXFOUT)
;;;   HEXISFIX    Αυτοματες διορθωσεις (Close, POLYLINE->LW, LINE->LW, MTEXT->TEXT, μετονομασιες layers)
;;;   HEXISCLR    Καθαρισμος σημανσεων σφαλματων (layer HEXIS_ERR)
;;;
;;; HEXIS - hexis-app.gr | BRB DEVELOPMENT MON. I.K.E. - www.birbas.gr
;;; ============================================================================

;;; ---------------------------------------------------------------- ρυθμισεις
(setq *HX-VER* "2.1")
(setq *HX-ERRLAY* "HEXIS_ERR")
(setq *HX-TOL* 0.005)      ; ανοχη ταυτισης κορυφων (m)
(setq *HX-SNAPTOL* 0.05)   ; ανοχη "πανω στο οριο" PST_KAEK (m)

;;; ΠΙΝΑΚΑΣ Ι: (ονομα τυπος) τυπος: PL=LWPolyline, PLC=Closed LWPolyline,
;;;            PLTX/PLCTX=+TEXT, TX=μονο TEXT, PT=POINT
(setq *HX-STD*
 '(("BOUND_IMPL"     "PL")   ("BOUND_UNIMPL"   "PL")
   ("DBOUND_RYM"     "PL")   ("DBOUND_AIG"     "PLTX")
   ("DBOUND_PRL"     "PLTX") ("DBOUND_PAIG"    "PLTX")
   ("DBOUND_REM"     "PLTX") ("DBOUND_APAL"    "PLTX")
   ("DBOUND_PROP"    "PLCTX")("ROAD"           "TX")
   ("OT"             "TX")   ("PST_KAEK"       "PLCTX")
   ("TOPO_PROP"      "PLC")  ("TOPO_PROP_NEW"  "PLC")
   ("BLD"            "PLCTX")("VST"            "PLCTX")
   ("EAS"            "PLCTX")("MINE"           "PLC")
   ("LINE_XM"        "PL")   ("LINE_XM_VST"    "PL")
   ("VST_FINAL"      "PLC")  ("EAS_FINAL"      "PLC")
   ("MINE_FINAL"     "PLC")  ("DGM_PROP_FINAL" "PLC")
   ("AREA_D"         "PLC")  ("AREA_A"         "PLC")
   ("OBJ"            "PT")))

;;; layers με υποχρεωτικο TEXT εντος πολυγωνου
(setq *HX-TEXTIN* '("PST_KAEK" "BLD" "VST" "EAS"))

;;; ---------------------------------------------------------------- βοηθητικα
(defun hx-p (s) (princ s) (if *hx-file* (princ s *hx-file*)) (princ))
;; γραμμη ΜΟΝΟ στην αναφορα (αρχειο)
(defun hx-wl (s) (if *hx-file* (progn (princ s *hx-file*) (princ "\n" *hx-file*))))

;; Τα ευρηματα ΔΕΝ τυπωνονται αμεσα - μαζευονται και βγαινουν οργανωμενα στο τελος
(defun hx-err (ref msg fix)
  (setq *hx-errs* (1+ *hx-errs*))
  (setq *hx-elist* (cons (list ref msg fix) *hx-elist*)))

(defun hx-wrn (ref msg fix)
  (setq *hx-wrns* (1+ *hx-wrns*))
  (setq *hx-wlist* (cons (list ref msg fix) *hx-wlist*)))

(defun hx-inf (msg) (setq *hx-ilist* (cons msg *hx-ilist*)))

;; σημανση σφαλματος με κυκλο στο layer HEXIS_ERR
(defun hx-marklay ()
  (if (not (tblsearch "LAYER" *HX-ERRLAY*))
    (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord")
                   '(100 . "AcDbLayerTableRecord") (cons 2 *HX-ERRLAY*)
                   '(70 . 0) '(62 . 1) '(6 . "CONTINUOUS")))))
(defun hx-mark (pt)
  (if (and pt *hx-mr*)
    (progn (hx-marklay)
      (entmake (list '(0 . "CIRCLE") (cons 8 *HX-ERRLAY*) '(62 . 1)
                     (cons 10 (list (car pt) (cadr pt) 0.0)) (cons 40 *hx-mr*)))
      (setq *hx-marks* (1+ *hx-marks*)))))

;; σημεια LWPOLYLINE απο entget
(defun hx-lwpts (ed / pts)
  (foreach g ed
    (if (= 10 (car g)) (setq pts (cons (list (cadr g) (caddr g)) pts))))
  (reverse pts))

;; σημεια παλαιας POLYLINE (VERTEX...SEQEND)
(defun hx-oldpts (en / e ed pts)
  (setq e (entnext en))
  (while (and e (= "VERTEX" (cdr (assoc 0 (setq ed (entget e))))))
    (if (assoc 10 ed)
      (setq pts (cons (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed))) pts)))
    (setq e (entnext e)))
  (reverse pts))

;; καθαρισμος διαδοχικων διπλων κορυφων
(defun hx-clean (pts / out p)
  (foreach p pts
    (if (or (null out)
            (> (distance p (car out)) *HX-TOL*))
      (setq out (cons p out))))
  (reverse out))

;; κλειστο; (flag η ταυτιση ακρων)
(defun hx-closedp (flag pts)
  (or (= 1 (logand 1 flag))
      (and (> (length pts) 2)
           (< (distance (car pts) (last pts)) *HX-TOL*))))

;; δακτυλιος χωρις διπλη τελικη κορυφη
(defun hx-ring (pts / p)
  (setq p (hx-clean pts))
  (if (and (> (length p) 2) (< (distance (car p) (last p)) *HX-TOL*))
    (reverse (cdr (reverse p)))
    p))

;; εμβαδον (shoelace)
(defun hx-area (poly / n i a p q)
  (setq a 0.0 n (length poly) i 0)
  (while (< i n)
    (setq p (nth i poly) q (nth (rem (1+ i) n) poly))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  (/ (abs a) 2.0))

;; κεντρο βαρους κορυφων
(defun hx-cen (poly / x y p)
  (setq x 0.0 y 0.0)
  (foreach p poly (setq x (+ x (car p)) y (+ y (cadr p))))
  (list (/ x (length poly)) (/ y (length poly))))

;; σημειο εντος πολυγωνου (ray casting)
(defun hx-pinp (p poly / n i j ins xi yi xj yj px py)
  (setq px (car p) py (cadr p) n (length poly) ins nil j (1- n) i 0)
  (while (< i n)
    (setq xi (car (nth i poly)) yi (cadr (nth i poly))
          xj (car (nth j poly)) yj (cadr (nth j poly)))
    (if (and (/= (> yi py) (> yj py))
             (< px (+ xi (/ (* (- xj xi) (- py yi)) (- yj yi)))))
      (setq ins (not ins)))
    (setq j i i (1+ i)))
  ins)

;; αποσταση σημειου απο ευθυγραμμο τμημα
(defun hx-d2s (p a b / dx dy l2 tt qx qy)
  (setq dx (- (car b) (car a)) dy (- (cadr b) (cadr a))
        l2 (+ (* dx dx) (* dy dy)))
  (if (< l2 1e-12)
    (distance p a)
    (progn
      (setq tt (/ (+ (* (- (car p) (car a)) dx) (* (- (cadr p) (cadr a)) dy)) l2))
      (if (< tt 0.0) (setq tt 0.0))
      (if (> tt 1.0) (setq tt 1.0))
      (setq qx (+ (car a) (* tt dx)) qy (+ (cadr a) (* tt dy)))
      (distance p (list qx qy)))))

;; αποσταση σημειου απο δακτυλιο
(defun hx-d2r (p ring / n i d dd)
  (setq n (length ring) i 0 d 1e99)
  (while (< i n)
    (setq dd (hx-d2s p (nth i ring) (nth (rem (1+ i) n) ring)))
    (if (< dd d) (setq d dd))
    (setq i (1+ i)))
  d)

;; περιμετρος κλειστου πολυγωνου
(defun hx-perim (poly / n i s)
  (setq n (length poly) i 0 s 0.0)
  (while (< i n)
    (setq s (+ s (distance (nth i poly) (nth (rem (1+ i) n) poly))) i (1+ i)))
  s)

;; πυκνωση περιγραμματος ανα step μετρα (με ανω οριο σημειων)
(defun hx-dens (poly step cap / n i out p q L m k)
  (setq n (length poly) i 0 out nil)
  (while (and (< i n) (< (length out) cap))
    (setq p (nth i poly) q (nth (rem (1+ i) n) poly) L (distance p q))
    (setq m (max 1 (fix (+ 0.999 (/ L step)))) k 0)
    (while (< k m)
      (setq out (cons (list (+ (car p)  (* (- (car q)  (car p))  (/ (float k) m)))
                            (+ (cadr p) (* (- (cadr q) (cadr p)) (/ (float k) m)))) out))
      (setq k (1+ k)))
    (setq i (1+ i)))
  out)

;; συμμετρικη αποσταση οριων δυο πολυγωνων: (max mean χειροτερο-σημειο)
(defun hx-rdist (pa2 pb2 / pa pb mx sum n d w p)
  (setq pa (hx-dens pa2 2.0 400) pb (hx-dens pb2 2.0 400)
        mx 0.0 sum 0.0 n 0 w nil)
  (foreach p pa
    (setq d (hx-d2r p pb2) sum (+ sum d) n (1+ n))
    (if (> d mx) (setq mx d w p)))
  (foreach p pb
    (setq d (hx-d2r p pa2) sum (+ sum d) n (1+ n))
    (if (> d mx) (setq mx d w p)))
  (list mx (/ sum (max 1 n)) w))

;; εντος καποιου PST_KAEK (η πανω στο οριο του)
(defun hx-inpst (p / ok r)
  (foreach r *hx-pst*
    (if (and (not ok)
             (or (hx-pinp p (car r)) (< (hx-d2r p (car r)) *HX-SNAPTOL*)))
      (setq ok T)))
  ok)

;; μη λατινικοι χαρακτηρες σε ονομα layer;
;; μεταγραφη ελληνικων χαρακτηρων-σωσιων σε λατινικους (Α->A, Ρ->P κλπ, cp1253)
(setq *HX-LATMAP*
 '((193 . "A")(194 . "B")(197 . "E")(198 . "Z")(199 . "H")(201 . "I")(202 . "K")
   (204 . "M")(205 . "N")(207 . "O")(209 . "P")(212 . "T")(213 . "Y")(215 . "X")
   (225 . "A")(226 . "B")(229 . "E")(230 . "Z")(231 . "H")(233 . "I")(234 . "K")
   (236 . "M")(237 . "N")(239 . "O")(241 . "P")(244 . "T")(245 . "Y")(247 . "X")))
(defun hx-lat (s / i c r m)
  (setq i 1 r "")
  (while (<= i (strlen s))
    (setq c (ascii (substr s i 1)))
    (setq m (cdr (assoc c *HX-LATMAP*)))
    (setq r (strcat r (if m m (substr s i 1))))
    (setq i (1+ i)))
  r)

(defun hx-nonlatin (s / i ok c)
  (setq i 1 ok nil)
  (while (<= i (strlen s))
    (setq c (ascii (substr s i 1)))
    (if (> c 127) (setq ok T))
    (setq i (1+ i)))
  ok)

;; υπαρχει το std layer με περιεχομενο;
(defun hx-has (name) (cdr (assoc name *hx-cnt*)))

;; ενημερωση bbox
(defun hx-bb (p)
  (if (null *hx-min*) (setq *hx-min* p *hx-max* p))
  (setq *hx-min* (list (min (car *hx-min*) (car p)) (min (cadr *hx-min*) (cadr p)))
        *hx-max* (list (max (car *hx-max*) (car p)) (max (cadr *hx-max*) (cadr p)))))


;; p εντος καποιου απο τα polys;
(defun hx-inany (p polys / ok pr)
  (foreach pr polys (if (and (not ok) (hx-pinp p (car pr))) (setq ok T)))
  ok)
;; υπαρχει text εντος του πολυγωνου pr;
(defun hx-anytx (pr texts / ok tt)
  (foreach tt texts (if (and (not ok) (hx-pinp (car tt) (car pr))) (setq ok T)))
  ok)

;;; --------------------------------------------------------- σαρωση ενος layer
(defun hx-scan (name spec / ss i en ed typ flag pts ring closed cnt
                 polys texts nbadl nmtx nline nbad badnames startpt txv)
  (setq ss (ssget "_X" (list (cons 8 name) (cons 410 (getvar "CTAB")))))
  (if (null ss) (setq ss (ssget "_X" (list (cons 8 name)))))
  (setq cnt 0 polys nil texts nil nmtx 0 nline 0 nbad 0 badnames "")
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq en (ssname ss i) ed (entget en) typ (cdr (assoc 0 ed)) cnt (1+ cnt))
        (cond
          ;; --- πολυγραμμες
          ((or (= typ "LWPOLYLINE") (= typ "POLYLINE"))
           (if (wcmatch spec "PL*")
             (progn
               (if (= typ "POLYLINE")
                 (progn (setq pts (hx-oldpts en))
                        (setq *hx-oldpl* (1+ *hx-oldpl*)))
                 (setq pts (hx-lwpts ed)))
               (setq flag (if (assoc 70 ed) (cdr (assoc 70 ed)) 0))
               (foreach p pts (hx-bb p))
               (setq closed (hx-closedp flag pts))
               (setq startpt (car pts))
               ;; απαιτειται κλειστο;
               (if (and (wcmatch spec "PLC*") (not closed))
                 (if (member name '("DGM_PROP_FINAL" "VST_FINAL" "EAS_FINAL" "MINE_FINAL" "AREA_D" "AREA_A"))
                   (progn
                     (hx-err "[Πιν.Ι]"
                       (strcat "Layer " name ": ΑΝΟΙΚΤΗ πολυγραμμη ("
                               (itoa (length pts)) " κορυφες). Στα τελικα layers ενημερωσης βασης το κλειστο πολυγωνο ειναι υποχρεωτικο.")
                       "PEDIT -> Close. Σημανθηκε με κυκλο.")
                     (hx-mark startpt))
                   (hx-wrn "[Πιν.Ι]"
                     (strcat "Layer " name ": ανοικτη πολυγραμμη (" (itoa (length pts)) " κορυφες)"
                             (if (= name "PST_KAEK") " - συχνα ορια ομορων, γινεται δεκτο." "."))
                     "Αν προκειται για πληρες πολυγωνο: PEDIT -> Close η HEXISFIX.")))
               (if closed
                 (progn
                   (setq ring (hx-ring pts))
                   (if (> (length ring) 2)
                     (setq polys (cons (list ring (hx-area ring) startpt) polys)))))
               ;; κλεινει με διπλη κορυφη αντι flag;
               (if (and (wcmatch spec "PLC*") closed (/= 1 (logand 1 flag)))
                 (setq *hx-noflag* (1+ *hx-noflag*)))))
           (if (not (wcmatch spec "PL*"))
             (progn (setq nbad (1+ nbad))
                    (hx-mark (car (hx-lwpts ed))))))
          ;; --- TEXT
          ((= typ "TEXT")
           (setq txv (cdr (assoc 1 ed)))
           (if (assoc 10 ed)
             (progn (setq startpt (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed))))
                    (hx-bb startpt)
                    (setq texts (cons (cons startpt (if txv txv "")) texts))))
           (if (not (wcmatch spec "*TX*"))
             (progn (setq nbad (1+ nbad)) (hx-mark startpt))))
          ;; --- MTEXT: απαγορευεται παντου στα std layers
          ((= typ "MTEXT")
           (setq nmtx (1+ nmtx))
           (if (assoc 10 ed)
             (hx-mark (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed))))))
          ;; --- LINE: πρεπει LWPOLYLINE
          ((= typ "LINE")
           (setq nline (1+ nline))
           (if (assoc 10 ed)
             (progn (hx-bb (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed))))
                    (hx-mark (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed)))))))
          ;; --- POINT
          ((= typ "POINT")
           (if (assoc 10 ed)
             (progn (setq startpt (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed))))
                    (hx-bb startpt)))
           (if (not (wcmatch spec "*PT*"))
             (progn (setq nbad (1+ nbad)) (hx-mark startpt))
             (setq texts (cons (cons startpt "POINT") texts))))
          ;; --- λοιπες μη επιτρεπτες
          (T
           (setq nbad (1+ nbad))
           (if (not (wcmatch badnames (strcat "*" typ "*")))
             (setq badnames (strcat badnames typ " ")))
           (if (assoc 10 ed)
             (hx-mark (list (cadr (assoc 10 ed)) (caddr (assoc 10 ed)))))))
        (setq i (1+ i)))))
  (if (> nmtx 0)
    (hx-wrn "[§4.4.2]"
      (strcat "Layer " name ": " (itoa nmtx) " MTEXT (το Τευχος ζηταει TEXT, συνηθως γινεται δεκτο).")
      "Για πληρη συμμορφωση: HEXISFIX η EXPLODE στο MTEXT."))
  (if (> nline 0)
    (hx-wrn "[§4.4.2]"
      (strcat "Layer " name ": " (itoa nline) " οντοτητες LINE (το Τευχος ζηταει LWPOLYLINE, συνηθως γινεται δεκτο).")
      "Για πληρη συμμορφωση: HEXISFIX η PEDIT -> Join."))
  (if (> nbad 0)
    (hx-wrn "[§4.4.2/§4.5.1]"
      (strcat "Layer " name ": " (itoa nbad) " μη επιτρεπτες οντοτητες "
              (if (> (strlen badnames) 0) (strcat "(" badnames "- INSERT=block: EXPLODE, "
              "CIRCLE/ARC/SPLINE -> LWPOLYLINE, IMAGE/HATCH: αφαιρεση)") ""))
      "Σημανθηκαν με κυκλο στο layer HEXIS_ERR."))
  ;; αποθηκευση συλλογων
  (setq *hx-cnt*   (cons (cons name cnt) *hx-cnt*))
  (setq *hx-polys* (cons (cons name (reverse polys)) *hx-polys*))
  (setq *hx-texts* (cons (cons name (reverse texts)) *hx-texts*))
  cnt)

;;; --------------------------------------------------------- κυρια εντολη
(defun c:HEXISCHECK (/ dgt ktima lay lname lnames std map actual spec cnt
                      polys texts p tt out empt kaekbad d1 d2 aPST aDGM diff
                      pr nn f dwgn typ2 lst same a b res s
                      zon uo tp tring cenT host EE PP EM SQ AV AL DEV kaek nums
                      cenK ddx ddy dc bd bmax bmean bw geo)
  (setq *hx-errs* 0 *hx-wrns* 0 *hx-marks* 0 *hx-oldpl* 0 *hx-noflag* 0
        *hx-cnt* nil *hx-polys* nil *hx-texts* nil *hx-pst* nil
        *hx-min* nil *hx-max* nil *hx-mr* nil *hx-file* nil
        *hx-elist* nil *hx-wlist* nil *hx-ilist* nil)

  (setq dwgn (strcat (getvar "DWGPREFIX") "HEXIS_CHECK_REPORT.txt"))
  (princ (strcat "\n=== HEXIS - CHECK MY DXF v" *HX-VER* " ===  " (getvar "DWGNAME")))

  ;; ειδος διαγραμματος
  (initget "TD PRAXI DIORTHOSI")
  (setq dgt (getkword "\nΕιδος διαγραμματος [TD=Τοπογραφικο / PRAXI=ΔΓΜ πραξης / DIORTHOSI=ΔΓΜ διορθωσης-ΤΔΓΜ] <TD>: "))
  (if (null dgt) (setq dgt "TD"))
  (setq ktima T)
  (if (= dgt "TD")
    (progn
      (initget "NAI OXI")
      (setq ktima (getkword "\nΠεριοχη λειτουργουντος Κτηματολογιου (απαιτειται PST_KAEK); [NAI/OXI] <NAI>: "))
      (setq ktima (or (null ktima) (= ktima "NAI")))))
  (princ (strcat "\nΕιδος: " (cond ((= dgt "TD") "Τοπογραφικο Διαγραμμα")
                                  ((= dgt "PRAXI") "ΔΓΜ Εγγραπτεας Πραξης")
                                  (T "ΔΓΜ Διορθωσης / ΤΔΓΜ")) "\n"))

  ;; ονοματα layers σχεδιου + αντιστοιχιση με std (case-insensitive)
  (setq lay (tblnext "LAYER" T) lnames nil)
  (while lay
    (setq lnames (cons (cdr (assoc 2 lay)) lnames))
    (setq lay (tblnext "LAYER")))
  (setq map nil)
  (foreach lname lnames
    (foreach std *HX-STD*
      (if (= (strcase lname) (car std))
        (progn
          (setq map (cons (cons (car std) lname) map))
          (if (/= lname (car std))
            (hx-wrn "[§4.5.1]"
              (strcat "Layer \"" lname "\" με πεζα γραμματα.")
              (strcat "Μετονομασε σε " (car std) " (κεφαλαια λατινικα).")))))))
  ;; μη λατινικοι χαρακτηρες: ΣΦΑΛΜΑ μονο αν το ονομα "μοιαζει" με layer του Πινακα Ι
  ;; (τα ελευθερα layers §4.4.1.ii μπορουν να εχουν ελληνικη ονομασια - δεν ελεγχονται)
  (setq typ2 nil)
  (foreach lname lnames
    (if (and (hx-nonlatin lname) (/= lname "0") (/= (strcase lname) *HX-ERRLAY*))
      (if (assoc (strcase (hx-lat lname))
                 (mapcar '(lambda (x) (cons (car x) (cadr x))) *HX-STD*))
        (hx-wrn "[§4.5.1]"
          (strcat "Layer \"" lname "\": ελληνικοι χαρακτηρες που μοιαζουν λατινικοι - η πλατφορμα θα το αγνοησει (δεν θα το δει ως "
                  (strcase (hx-lat lname)) ").")
          "Αν το εννοεις ως layer του Πινακα Ι: HEXISFIX το μετονομαζει αυτοματα.")
        (setq typ2 (cons lname typ2)))))
  (if typ2
    (hx-inf (strcat "Ελευθερα layers με ελληνικη ονομασια (αποδεκτα, εκτος Πινακα Ι): "
                    (itoa (length typ2)) " layers.")))

  ;; σαρωση std layers
  (foreach std *HX-STD*
    (setq actual (cdr (assoc (car std) map)))
    (if actual
      (progn
        (setq cnt (hx-scan actual (cadr std)))
        ;; προσωρινη ακτινα σημανσης απο bbox οταν οριστει
        (if (and *hx-min* (null *hx-mr*))
          (setq *hx-mr* (max 0.5 (/ (distance *hx-min* *hx-max*) 150.0))))
        (if (= cnt 0)
          (hx-wrn "[§5.2.1]"
            (strcat "Layer " (car std) " υπαρχει αλλα ειναι ΚΕΝΟ.")
            "Προσθεσε περιεχομενο η διαγραψε το.")))))
  (if (null *hx-mr*) (setq *hx-mr* 2.0))
  (if (> *hx-oldpl* 0)
    (hx-wrn "[§4.4.2]"
      (strcat (itoa *hx-oldpl*) " παλαιου τυπου POLYLINE στο σχεδιο.")
      "Μετατροπη σε LWPOLYLINE: CONVERTPOLY -> Light."))
  (if (> *hx-noflag* 0)
    (hx-wrn "[Πιν.Ι]"
      (strcat (itoa *hx-noflag*) " πολυγωνα κλεινουν με διπλη κορυφη αντι Closed flag.")
      "Προτιμησε PEDIT -> Close."))

  ;; PST_KAEK ρινγκς για τοπολογικους
  (setq *hx-pst* (mapcar '(lambda (x) (list (car x) (cadr x)))
                         (cdr (assoc "PST_KAEK" *hx-polys*))))

  ;; ------- ελαχιστα απαιτουμενα layers ανα ειδος (§4.5.2)
  (cond
    ((= dgt "TD")
     (if (not (or (hx-has "BOUND_IMPL") (hx-has "BOUND_UNIMPL")))
       (hx-err "[§4.5.2.α]" "Λειπει BOUND_IMPL η BOUND_UNIMPL (ορια ιδιοκτησιας)."
         "Βαλε τα ορια σε BOUND_IMPL (υλοποιημενα) η/και BOUND_UNIMPL, ως LWPOLYLINE."))
     (if (and ktima (not (hx-has "PST_KAEK")))
       (hx-err "[§4.5.2.α]" "Λειπει το layer PST_KAEK."
         "Ορια εμπλεκομενων γεωτεμαχιων (Closed LWPOLYLINE) + ΚΑΕΚ ως TEXT εντος πολυγωνου."))
     (if (not (hx-has "TOPO_PROP"))
       (hx-err "[§4.5.2.α]" "Λειπει το layer TOPO_PROP."
         "Ορια ιδιοκτησιας ως Closed LWPOLYLINE (συνθεση των BOUND_IMPL+BOUND_UNIMPL)."))
     (if (and (hx-has "TOPO_PROP_NEW") (not (hx-has "TOPO_PROP")))
       (hx-err "[§4.5.2.α]" "Υπαρχει TOPO_PROP_NEW χωρις TOPO_PROP."
         "Προσθεσε και το TOPO_PROP.")))
    ((= dgt "PRAXI")
     (if (not (or (hx-has "BOUND_IMPL") (hx-has "BOUND_UNIMPL")))
       (hx-err "[§4.5.2.β]" "Λειπει BOUND_IMPL η BOUND_UNIMPL." nil))
     (if (not (hx-has "PST_KAEK"))
       (hx-err "[§4.5.2.β]" "Λειπει το layer PST_KAEK." nil))
     (if (not (or (hx-has "TOPO_PROP") (hx-has "TOPO_PROP_NEW")))
       (hx-err "[§4.5.2.β]" "Λειπει TOPO_PROP η TOPO_PROP_NEW." nil))
     (if (not (or (hx-has "LINE_XM") (hx-has "LINE_XM_VST") (hx-has "VST_FINAL")
                  (hx-has "EAS_FINAL") (hx-has "MINE_FINAL") (hx-has "DGM_PROP_FINAL")))
       (hx-err "[§4.5.2.β]" "Λειπει τουλαχιστον ενα απο τα layers 19-24 (LINE_XM..DGM_PROP_FINAL)."
         "Π.χ. LINE_XM + DGM_PROP_FINAL για κατατμηση/συνενωση."))
     (if (/= (if (hx-has "LINE_XM") 1 0) (if (hx-has "DGM_PROP_FINAL") 1 0))
       (hx-wrn "[§4.5.2.β]" "Τα LINE_XM και DGM_PROP_FINAL το Τευχος τα ζηταει σε ζευγη - η πλατφορμα συνηθως δεν το μπλοκαρει." nil))
     (if (/= (if (hx-has "LINE_XM_VST") 1 0) (if (hx-has "VST_FINAL") 1 0))
       (hx-wrn "[§4.5.2.β]" "Τα LINE_XM_VST και VST_FINAL το Τευχος τα ζηταει σε ζευγη - η πλατφορμα συνηθως δεν το μπλοκαρει." nil)))
    (T ; DIORTHOSI
     (if (not (hx-has "PST_KAEK"))
       (hx-err "[§4.5.2.γ]" "Λειπει το layer PST_KAEK." nil))
     (if (not (hx-has "TOPO_PROP"))
       (hx-err "[§4.5.2.γ]" "Λειπει το layer TOPO_PROP." nil))
     (if (not (or (hx-has "LINE_XM_VST") (hx-has "VST_FINAL") (hx-has "EAS_FINAL")
                  (hx-has "MINE_FINAL") (hx-has "DGM_PROP_FINAL") (hx-has "AREA_D")
                  (hx-has "AREA_A") (hx-has "OBJ")))
       (hx-err "[§4.5.2.γ]" "Λειπει τουλαχιστον ενα απο τα layers 20-27."
         "Για διορθωση οριων: DGM_PROP_FINAL + AREA_D/AREA_A."))
     (setq typ2 (or (hx-has "LINE_XM_VST") (hx-has "VST_FINAL") (hx-has "EAS_FINAL")
                    (hx-has "MINE_FINAL") (hx-has "OBJ")))
     (if (and (hx-has "TOPO_PROP") (not typ2))
       (progn
         (if (not (hx-has "DGM_PROP_FINAL"))
           (hx-err "[§4.5.2.γ]" "Υπαρχει TOPO_PROP χωρις DGM_PROP_FINAL."
             "Προσθεσε τα τελικα πολυγωνα ολων των γεωτεμαχιων. Περιμετρικα ορια = PST_KAEK."))
         (if (not (or (hx-has "AREA_D") (hx-has "AREA_A")))
           (hx-err "[§4.5.2.γ]" "Λειπει AREA_D η AREA_A."
             "AREA_D: προσαρτωμενες επιφανειες, AREA_A: αποκοπτομενες."))))
     (if (and (hx-has "TOPO_PROP")
              (not (or (hx-has "BOUND_IMPL") (hx-has "BOUND_UNIMPL"))))
       (hx-err "[§4.5.2.γ]" "Υπαρχει TOPO_PROP χωρις BOUND_IMPL/BOUND_UNIMPL." nil))
     (if (/= (if (hx-has "LINE_XM_VST") 1 0) (if (hx-has "VST_FINAL") 1 0))
       (hx-wrn "[§4.5.2.γ]" "Τα LINE_XM_VST και VST_FINAL το Τευχος τα ζηταει σε ζευγη - η πλατφορμα συνηθως δεν το μπλοκαρει." nil))))

  ;; ------- TEXT εντος πολυγωνου + ΚΑΕΚ
  (foreach nn *HX-TEXTIN*
    (setq polys (cdr (assoc nn *hx-polys*))
          texts (cdr (assoc nn *hx-texts*)))
    (if (and polys (null texts))
      (hx-wrn "[Πιν.Ι]" (strcat "Layer " nn ": πολυγωνα χωρις κανενα TEXT.")
        (if (= nn "PST_KAEK") "Προσθεσε το ΚΑΕΚ ως TEXT εντος καθε πολυγωνου."
                              "Προσθεσε την αριθμηση ως TEXT εντος καθε πολυγωνου.")))
    (if (and polys texts)
      (progn
        ;; TEXT εκτος πολυγωνων
        (setq out 0)
        (foreach tt texts
          (setq p (car tt))
          (if (not (hx-inany p polys))
            (setq out (1+ out))))
        (if (> out 0)
          (hx-wrn "[§4.5.1]"
            (strcat "Layer " nn ": " (itoa out) " TEXT με σημειο εισαγωγης εκτος πολυγωνου.")
            (if (= nn "PST_KAEK")
              "Αν ειναι ΚΑΕΚ ΟΜΟΡΩΝ γεωτεμαχιων χωρις σχεδιασμενο πολυγωνο ειναι συνηθες και γινεται δεκτο. Αλλιως μετακινησε το insertion point εντος."
              "Κατα το Τευχος το insertion point πρεπει να ειναι εντος του πολυγωνου.")))
        ;; πολυγωνα χωρις TEXT (PST_KAEK)
        (if (= nn "PST_KAEK")
          (progn
            (setq empt 0)
            (foreach pr polys
              (if (not (hx-anytx pr texts))
                (setq empt (1+ empt))))
            (if (> empt 0)
              (hx-wrn "[Πιν.Ι]"
                (strcat "PST_KAEK: " (itoa empt) " πολυγωνα χωρις ΚΑΕΚ (TEXT) στο εσωτερικο.")
                "Συστηνεται καθε σχεδιασμενο γεωτεμαχιο να εχει το ΚΑΕΚ του ως TEXT εντος του πολυγωνου."))
            ;; μορφη ΚΑΕΚ 12 ψηφια
            (setq kaekbad 0)
            (foreach tt texts
              (if (not (wcmatch (cdr tt) "############,############/*"))
                (setq kaekbad (1+ kaekbad))))
            (if (> kaekbad 0)
              (hx-wrn "[Πιν.Ι]"
                (strcat "PST_KAEK: " (itoa kaekbad) " TEXT χωρις μορφη 12ψηφιου ΚΑΕΚ.")
                "Μονο ο 12ψηφιος ΚΑΕΚ στο TEXT, χωρις προθεμα.")))))))

  ;; ------- πιθανα διπλα πολυγωνα ανα layer
  (foreach std *HX-STD*
    (setq lst (cdr (assoc (car std) *hx-polys*)) same 0)
    (while (and lst (cdr lst))
      (setq a (car lst))
      (foreach b (cdr lst)
        (if (and (= (length (car a)) (length (car b)))
                 (< (abs (- (cadr a) (cadr b))) 0.01)
                 (< (distance (caddr a) (caddr b)) *HX-TOL*))
          (setq same (1+ same))))
      (setq lst (cdr lst)))
    (if (> same 0)
      (hx-wrn "[§4.5.1]"
        (strcat "Layer " (car std) ": " (itoa same) " πιθανα ΔΙΠΛΑ πολυγωνα (ιδιες κορυφες/εμβαδον).")
        "Καθαρισμος με OVERKILL.")))

  ;; ------- ορια ΕΓΣΑ 87
  (if *hx-min*
    (if (and (>= (car *hx-min*) 94000.0) (<= (car *hx-max*) 1010000.0)
             (>= (cadr *hx-min*) 3850000.0) (<= (cadr *hx-max*) 4630000.0))
      (hx-inf (strcat "Συντεταγμενες εντος οριων ΕΓΣΑ 87. bbox X: "
                      (rtos (car *hx-min*) 2 1) " - " (rtos (car *hx-max*) 2 1)
                      "  Y: " (rtos (cadr *hx-min*) 2 1) " - " (rtos (cadr *hx-max*) 2 1)))
      (hx-err "[§3.4-3.5]"
        (strcat "Συντεταγμενες ΕΚΤΟΣ οριων ΕΓΣΑ 87 (X:94000-1010000, Y:3850000-4630000). bbox X: "
                (rtos (car *hx-min*) 2 1) " - " (rtos (car *hx-max*) 2 1)
                "  Y: " (rtos (cadr *hx-min*) 2 1) " - " (rtos (cadr *hx-max*) 2 1))
        "Μετασχηματισε το σχεδιο σε ΕΓΣΑ 87 (GGRS87/EPSG:2100), μοναδες μετρα."))
    (hx-err "[§4.4]" "Δεν βρεθηκε γεωμετρια στα layers του Πινακα Ι." nil))

  ;; ------- τοπολογικοι ΔΓΜ (§4.5.3)
  (if (and (/= dgt "TD") *hx-pst*)
    (foreach nn '("LINE_XM" "LINE_XM_VST" "VST_FINAL" "EAS_FINAL" "DGM_PROP_FINAL")
      (setq out 0)
      (foreach pr (cdr (assoc nn *hx-polys*))
        (foreach p (car pr)
          (if (not (hx-inpst p)) (setq out (1+ out)))))
      (if (> out 0)
        (hx-wrn "[§4.5.3]"
          (strcat "Layer " nn ": " (itoa out) " κορυφες εκτος των πολυγωνων του PST_KAEK (ενδεικτικος ελεγχος, ανοχη 5 cm).")
          "Οι οντοτητες πρεπει να περιοριζονται εντος του PST_KAEK - snap στα ορια του κτηματογραφικου."))))
  (if (and (= dgt "DIORTHOSI") *hx-pst* (cdr (assoc "DGM_PROP_FINAL" *hx-polys*)))
    (progn
      (setq aPST 0.0 aDGM 0.0)
      (foreach pr *hx-pst* (setq aPST (+ aPST (cadr pr))))
      (foreach pr (cdr (assoc "DGM_PROP_FINAL" *hx-polys*)) (setq aDGM (+ aDGM (cadr pr))))
      (setq diff (abs (- aPST aDGM)))
      (if (and (> diff 1.0) (> (/ diff (max aPST 1.0)) 0.005))
        (hx-wrn "[§4.5.3]"
          (strcat "ΣΕμβ. DGM_PROP_FINAL " (rtos aDGM 2 1) " m2 <> ΣΕμβ. PST_KAEK "
                  (rtos aPST 2 1) " m2 (διαφορα " (rtos diff 2 1) " m2).")
          "Τα περιμετρικα ορια του DGM_PROP_FINAL πρεπει να ταυτιζονται με του PST_KAEK.")
        (hx-inf (strcat "Ελεγχος εμβαδων διορθωσης ΟΚ: PST " (rtos aPST 2 1)
                        " m2 ~ DGM_FINAL " (rtos aDGM 2 1) " m2")))))

  ;; ------- Τοπογραφικο σε λειτουργουν Κτηματολογιο:
  ;; αποδεκτη αποκλιση εμβαδου (αρθ.13α ν.2664/98, πιλοτικα ΟΚΧΕ 475/08/2009, μεγ. 10%)
  ;; + συμβατοτητα θεσης & σχηματος (αρθ.5 παρ.3 ν.651/77)
  (if (and (= dgt "TD") ktima *hx-pst* (cdr (assoc "TOPO_PROP" *hx-polys*)))
    (progn
      (initget "ASTIKI AGROTIKI")
      (setq zon (getkword "\nΠεριοχη [ASTIKI=αστικη Uo=0.50μ / AGROTIKI=αγροτικη Uo=2.00μ] <ASTIKI>: "))
      (setq uo (if (= zon "AGROTIKI") 2.0 0.5))
      (foreach tp (cdr (assoc "TOPO_PROP" *hx-polys*))
        (setq tring (car tp) EM (cadr tp) cenT (hx-cen tring) host nil)
        (foreach pr *hx-pst*
          (if (and (null host) (hx-pinp cenT (car pr))) (setq host pr)))
        (if (null host)
          (hx-wrn "[ν.2664/98 αρθ.13α]"
            (strcat "TOPO_PROP " (rtos EM 2 1) " m2: δεν εμπιπτει σε πολυγωνο PST_KAEK - ο ελεγχος αποκλισης παραλειφθηκε.")
            "Ελεγξε τη θεση/γεωαναφορα του κτηματογραφικου αποσπασματος (PST_KAEK).")
          (progn
            ;; --- εμβαδον ---
            (setq EE (cadr host) PP (hx-perim (car host)) SQ (sqrt EE))
            (setq AV (* (- (expt (+ SQ (* 2.0 uo)) 2) EE) (/ PP (* 4.0 SQ))))
            (setq AL (min AV (* 0.10 EE)) DEV (abs (- EM EE)))
            (setq kaek "-")
            (foreach tt (cdr (assoc "PST_KAEK" *hx-texts*))
              (if (and (= kaek "-") (hx-pinp (car tt) (car host))) (setq kaek (cdr tt))))
            (setq nums (strcat "ΚΑΕΚ " kaek ": Ε κτημ. " (rtos EE 2 1) " m2, Π " (rtos PP 2 1)
                               " m, Ε τοπογρ. " (rtos EM 2 1) " m2, ΔΕ=" (rtos DEV 2 1)
                               " m2, οριο Α=" (rtos AL 2 1) " m2 ("
                               (if (= uo 2.0) "αγροτικη Uo=2.00" "αστικη Uo=0.50") ")"))
            (if (<= DEV AL)
              (hx-inf (strcat "Αποδεκτη αποκλιση εμβαδου ΟΚ - " nums
                              " [Α=((sqrtΕ+2Uo)^2-Ε)xΠ/4sqrtΕ, πιλοτικα ΟΚΧΕ 475/08/2009, μεγ. ανοχη 10%]"))
              (hx-wrn "[ν.2664/98 αρθ.13α]"
                (strcat "ΕΚΤΟΣ οριου ανοχης εμβαδου - " nums ".")
                "Πιθανως απαιτειται ΔΓΜ διορθωσης (αρθ.19 ν.2664/98) - τεκμηριωσε τη διαφορα στη βεβαιωση συμβατοτητας."))
            ;; --- θεση & σχημα ---
            (setq cenK (hx-cen (car host))
                  ddx (- (car cenT) (car cenK)) ddy (- (cadr cenT) (cadr cenK))
                  dc (sqrt (+ (* ddx ddx) (* ddy ddy))))
            (setq bd (hx-rdist tring (car host))
                  bmax (car bd) bmean (cadr bd) bw (caddr bd))
            (setq geo (strcat "ΚΑΕΚ " kaek ": μετατοπιση κεντροειδων ΔΧ=" (rtos ddx 2 2)
                              " ΔΥ=" (rtos ddy 2 2) " (|Δ|=" (rtos dc 2 2)
                              " m), αποκλιση οριων max " (rtos bmax 2 2)
                              " / μεση " (rtos bmean 2 2) " m, περιμετροι τοπογρ. "
                              (rtos (hx-perim tring) 2 1) " / κτημ. " (rtos PP 2 1)
                              " m, ανοχη Uo=" (rtos uo 2 2) " m"))
            (cond
              ((and (<= bmax uo) (<= dc uo))
               (hx-inf (strcat "Συμβατοτητα θεσης & σχηματος ΟΚ - " geo)))
              ((<= bmax (* 2.0 uo))
               (hx-wrn "[ν.651/77 αρθ.5 παρ.3]"
                 (strcat "Οριακη συμβατοτητα θεσης/σχηματος - " geo ".")
                 "Συνηθως αποδεκτο ως ακριβεια της κτημ. βασης - ελεγξε τη γεωαναφορα του PST_KAEK και τεκμηριωσε στη βεβαιωση συμβατοτητας."))
              (T
               (hx-wrn "[ν.651/77 αρθ.5 παρ.3]"
                 (strcat "ΑΣΥΜΒΑΤΟΤΗΤΑ θεσης/σχηματος - " geo
                         (if bw (strcat " - χειροτερο σημειο (" (rtos (car bw) 2 2) ", " (rtos (cadr bw) 2 2) ") [κυκλος στο HEXIS_ERR]") "") ".")
                 "Λαθος γεωαναφορα του PST_KAEK ή πραγματικη γεωμετρικη μεταβολη που απαιτει ΔΓΜ διορθωσης (αρθ.19 ν.2664/98) - αποτυπωσε ρητα την ασυμβατοτητα στη βεβαιωση του τοπογραφικου.")
               (if bw (hx-mark bw)))))))))

  ;; =============== ΣΥΝΤΑΞΗ ΑΝΑΦΟΡΑΣ (αρχειο) ===============
  (setq *hx-file* (open dwgn "w"))
  (setq typ2 (cond ((= dgt "TD") "Τοπογραφικο Διαγραμμα")
                   ((= dgt "PRAXI") "ΔΓΜ Εγγραπτεας Πραξης")
                   (T "ΔΓΜ Διορθωσης / ΤΔΓΜ")))
  (hx-wl "==========================================================")
  (hx-wl (strcat " HEXIS - CHECK MY DXF v" *HX-VER* "   ΑΝΑΦΟΡΑ ΕΛΕΓΧΟΥ"))
  (hx-wl "==========================================================")
  (hx-wl (strcat " Σχεδιο : " (getvar "DWGNAME")))
  (hx-wl (strcat " Ειδος  : " typ2))
  (hx-wl "")
  (setq res (cond ((> *hx-errs* 0) "ΔΕΝ ΠΕΡΝΑΕΙ")
                  ((> *hx-wrns* 0) "ΠΕΡΝΑΕΙ (με επισημανσεις)")
                  (T "ΠΕΡΝΑΕΙ")))
  (hx-wl (strcat " ΑΠΟΤΕΛΕΣΜΑ : " res))
  (hx-wl (strcat " Σφαλματα: " (itoa *hx-errs*)
                 "   Επισημανσεις: " (itoa *hx-wrns*)))
  (hx-wl "==========================================================")
  (hx-wl "")
  (if *hx-elist*
    (progn
      (hx-wl "ΣΦΑΛΜΑΤΑ  —  ΠΡΕΠΕΙ να διορθωθουν για να περασει:")
      (hx-wl "----------------------------------------------------------")
      (setq nn 0)
      (foreach pr (reverse *hx-elist*)
        (setq nn (1+ nn))
        (hx-wl (strcat " " (itoa nn) ". " (cadr pr) "  " (car pr)))
        (if (caddr pr) (hx-wl (strcat "    ΔΙΟΡΘΩΣΗ: " (caddr pr))))
        (hx-wl ""))))
  (if *hx-wlist*
    (progn
      (hx-wl "ΕΠΙΣΗΜΑΝΣΕΙΣ  —  δεν κοβουν την υποβολη, ελεγξε τις:")
      (hx-wl "----------------------------------------------------------")
      (setq nn 0)
      (foreach pr (reverse *hx-wlist*)
        (setq nn (1+ nn))
        (hx-wl (strcat " " (itoa nn) ". " (cadr pr) "  " (car pr)))
        (if (caddr pr) (hx-wl (strcat "    ΤΙ ΝΑ ΚΑΝΕΙΣ: " (caddr pr))))
        (hx-wl ""))))
  (if *hx-ilist*
    (progn
      (hx-wl "ΠΛΗΡΟΦΟΡΙΕΣ:")
      (hx-wl "----------------------------------------------------------")
      (foreach s (reverse *hx-ilist*) (hx-wl (strcat " - " s)))
      (hx-wl "")))
  (hx-wl "LAYERS ΠΙΝΑΚΑ Ι ΣΤΟ ΣΧΕΔΙΟ:")
  (hx-wl "----------------------------------------------------------")
  (foreach std *HX-STD*
    (setq cnt (hx-has (car std)))
    (if (and cnt (> cnt 0))
      (progn
        (setq aPST 0.0)
        (foreach pr (cdr (assoc (car std) *hx-polys*)) (setq aPST (+ aPST (cadr pr))))
        (hx-wl (strcat " " (car std) "   οντοτητες:" (itoa cnt)
                       "  πολυγωνα:" (itoa (length (cdr (assoc (car std) *hx-polys*))))
                       (if (> aPST 0.0) (strcat "  ΣΕμβαδον:" (rtos aPST 2 1) " m2") ""))))))
  (hx-wl "")
  (hx-wl "ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
  (hx-wl " 1. Αυτοματες διορθωσεις: εντολη HEXISFIX")
  (hx-wl " 2. Επαληθευση: HEXISCHECK ξανα")
  (hx-wl " 3. Εξαγωγη: SAVEAS/DXFOUT -> DXF ASCII, εκδοση 2000 εως 2018")
  (hx-wl "    ονομα εως 15 λατινικους χαρακτηρες, π.χ. topo_name_v01.dxf")
  (hx-wl " 4. Τελικος ελεγχος DXF & PDF: web εφαρμογη HEXIS Check My DXF")
  (hx-wl " 5. Ψηφιακη υπογραφη DXF & PDF με την εφαρμογη υπογραφης σου -> υποβολη ΕΚ")
  (hx-wl "")
  (hx-wl (strcat "Εκδοση εργαλειου: v" *HX-VER* " - Ελεγχος ενημερωσεων & νεο LISP: hexis-app.gr/checkmydxf.html"))
  (close *hx-file*)
  (setq *hx-file* nil)

  ;; =============== ΟΘΟΝΗ: μονο το ζουμι ===============
  (princ "\n\n==============================================")
  (cond
    ((> *hx-errs* 0)
     (princ (strcat "\n   ΑΠΟΤΕΛΕΣΜΑ:  ΔΕΝ ΠΕΡΝΑΕΙ  (" (itoa *hx-errs*) " σφαλματα)"))
     (princ "\n==============================================")
     (setq nn 0)
     (foreach pr (reverse *hx-elist*)
       (setq nn (1+ nn))
       (princ (strcat "\n ΣΦΑΛΜΑ " (itoa nn) ": " (cadr pr)))
       (if (caddr pr) (princ (strcat "\n    -> " (caddr pr)))))
     (if (> *hx-marks* 0)
       (princ (strcat "\n Κοκκινοι κυκλοι στο σχεδιο: " (itoa *hx-marks*)
                      " (σβησιμο: HEXISCLR)")))
     (if (> *hx-wrns* 0)
       (princ (strcat "\n Επισημανσεις: " (itoa *hx-wrns*) " — στην αναφορα (Notepad)."))))
    (T
     (princ (strcat "\n   ΑΠΟΤΕΛΕΣΜΑ:  ΠΕΡΝΑΕΙ"
                    (if (> *hx-wrns* 0)
                      (strcat "  (" (itoa *hx-wrns*) " επισημανσεις — δες Notepad)") "")))
     (princ "\n==============================================")
     (princ "\n Επομενο: DXFOUT σε DXF ASCII (2000-2018), web ελεγχος, ψηφιακη υπογραφη.")))
  (princ "\n Η πληρης αναφορα ανοιξε σε Notepad.")
  (princ "\n==============================================\n")
  (startapp "notepad.exe" (strcat "\"" dwgn "\""))
  (princ))

;;; ------------------------------------------------ καθαρισμος σημανσεων
(defun c:HEXISCLR (/ ss)
  (setq ss (ssget "_X" (list (cons 8 *HX-ERRLAY*))))
  (if ss
    (progn (command "_.ERASE" ss "")
           (princ (strcat "\nΔιαγραφηκαν " (itoa (sslength ss)) " σημανσεις.")))
    (princ "\nΔεν υπαρχουν σημανσεις."))
  (princ))

(princ (strcat "\nHEXIS - CHECK MY DXF v" *HX-VER*
               " φορτωθηκε. Εντολες: HEXISCHECK, HEXISFIX, HEXISCLR\n"))
(princ)

;;; =========================================================== HEXISFIX v2.1
;;; Αυτοματες διορθωσεις: 1) μετονομασια layers (πεζα / ελληνικοι σωσιες -> Πινακας Ι)
;;;                       2) LINE -> LWPOLYLINE με αλυσιδωση ακρων στα standard layers
(defun hx-same (a b) (and a b (< (distance (list (car a) (cadr a)) (list (car b) (cadr b))) 0.0005)))

(defun hx-mkpl (lname pts closed / d p)
  (setq d (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lname)
                '(100 . "AcDbPolyline") (cons 90 (length pts)) (cons 70 (if closed 1 0))))
  (foreach p pts (setq d (append d (list (cons 10 (list (car p) (cadr p)))))))
  (entmake d))

(defun hx-movelay (old new / ss i en ed cnt)
  (setq cnt 0 ss (ssget "_X" (list (cons 8 old))))
  (if ss
    (progn (setq i 0)
      (while (< i (sslength ss))
        (setq en (ssname ss i) ed (entget en))
        (entmod (subst (cons 8 new) (assoc 8 ed) ed))
        (setq cnt (1+ cnt) i (1+ i)))))
  cnt)

(defun hx-renlay (old new / e ed r)
  (cond
    ;; ιδιο layer με διαφορα μονο πεζων/κεφαλαιων -> RENAME (τα ονοματα ειναι case-insensitive)
    ((= (strcase old) (strcase new))
     (command "_.-RENAME" "_LA" old new)
     -1)
    ;; υπαρχει ηδη το σωστο layer -> μεταφορα οντοτητων
    ((tblsearch "LAYER" new) (hx-movelay old new))
    ;; μετονομασια στον πινακα layers (με fallback δημιουργιας+μεταφορας)
    (T
     (setq e (tblobjname "LAYER" old))
     (setq r (if e (entmod (subst (cons 2 new) (assoc 2 (setq ed (entget e))) ed))))
     (if r
       -1
       (progn
         (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord")
                        '(100 . "AcDbLayerTableRecord") (cons 2 new)
                        '(70 . 0) '(62 . 7) '(6 . "Continuous")))
         (hx-movelay old new))))))

(defun c:HEXISFIX (/ lay lnames lname std tgt nren nmov npl ndel segs ss i en ed
                     seg pts ents grew rest s2 closed r n2)
  (princ "\n=== HEXIS FIX v2.1 - αυτοματες διορθωσεις DXF (ΚΗΔ) ===")
  (setq lay (tblnext "LAYER" T) lnames nil)
  (while lay
    (setq lnames (cons (cdr (assoc 2 lay)) lnames))
    (setq lay (tblnext "LAYER")))
  (setq nren 0 nmov 0)
  ;; --- 1α. πεζα/μικτα ονοματα standard layers -> ΚΕΦΑΛΑΙΑ
  (foreach lname lnames
    (foreach std *HX-STD*
      (if (and (= (strcase lname) (car std)) (/= lname (car std)))
        (progn
          (setq r (hx-renlay lname (car std)))
          (if (= r -1)
            (progn (setq nren (1+ nren))
                   (princ (strcat "\n  μετονομασια: " lname " -> " (car std))))
            (progn (setq nmov (+ nmov r))
                   (princ (strcat "\n  συγχωνευση: " lname " -> " (car std) " (" (itoa r) " οντοτητες)"))))))))
  ;; --- 1β. ελληνικοι χαρακτηρες-σωσιες -> λατινικο ονομα Πινακα Ι
  (setq lay (tblnext "LAYER" T) lnames nil)
  (while lay
    (setq lnames (cons (cdr (assoc 2 lay)) lnames))
    (setq lay (tblnext "LAYER")))
  (foreach lname lnames
    (if (and (hx-nonlatin lname) (/= lname "0"))
      (progn
        (setq tgt (strcase (hx-lat lname)))
        (if (and (assoc tgt *HX-STD*) (/= tgt (strcase lname)))
          (progn
            (setq r (hx-renlay lname tgt))
            (if (= r -1)
              (progn (setq nren (1+ nren))
                     (princ (strcat "\n  μετονομασια (ελληνικα->λατινικα): " lname " -> " tgt)))
              (progn (setq nmov (+ nmov r))
                     (princ (strcat "\n  συγχωνευση: " lname " -> " tgt " (" (itoa r) " οντοτητες)")))))))))
  ;; --- 2. LINE -> LWPOLYLINE με αλυσιδωση, ανα standard layer
  (setq npl 0 ndel 0)
  (foreach std *HX-STD*
    (setq ss (ssget "_X" (list '(0 . "LINE") (cons 8 (car std)))))
    (if ss
      (progn
        (setq segs nil i 0)
        (while (< i (sslength ss))
          (setq en (ssname ss i) ed (entget en))
          (setq segs (cons (list (cdr (assoc 10 ed)) (cdr (assoc 11 ed)) en) segs))
          (setq i (1+ i)))
        (while segs
          (setq seg (car segs) segs (cdr segs))
          (setq pts (list (cadr seg) (car seg)) ents (list (caddr seg)) grew T)
          (while grew
            (setq grew nil rest nil)
            (foreach s2 segs
              (cond
                ((hx-same (car s2) (car pts))
                 (setq pts (cons (cadr s2) pts) ents (cons (caddr s2) ents) grew T))
                ((hx-same (cadr s2) (car pts))
                 (setq pts (cons (car s2) pts) ents (cons (caddr s2) ents) grew T))
                ((hx-same (car s2) (last pts))
                 (setq pts (append pts (list (cadr s2))) ents (cons (caddr s2) ents) grew T))
                ((hx-same (cadr s2) (last pts))
                 (setq pts (append pts (list (car s2))) ents (cons (caddr s2) ents) grew T))
                (T (setq rest (cons s2 rest)))))
            (setq segs rest))
          (setq closed (and (> (length pts) 3) (hx-same (car pts) (last pts))))
          (if closed (setq pts (cdr pts)))       ; κλειστη: χωρις διπλη κορυφη
          (hx-mkpl (car std) pts closed)
          (setq npl (1+ npl))
          (foreach en ents (entdel en) (setq ndel (1+ ndel)))))))
  (princ (strcat "\n--- HEXISFIX: " (itoa nren) " μετονομασιες, " (itoa nmov)
                 " μεταφορες οντοτητων, " (itoa npl) " νεες LWPOLYLINE απο " (itoa ndel)
                 " LINE.\n    Τρεξε ξανα HEXISCHECK για επαληθευση."))
  (princ))

