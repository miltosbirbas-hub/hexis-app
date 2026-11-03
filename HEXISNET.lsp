;;; ================================================================
;;; HEXISNET.LSP v1.2 - HEXIS-APP / BRB DEVELOPMENT MON. I.K.E.
;;; Σύνδεση AutoCAD / progeCAD με τον λογαριασμό HEXIS-APP:
;;; όροι δόμησης από ΚΑΕΚ (Ενιαίος Ψηφιακός Χάρτης + Κτηματολόγιο).
;;; Εντολές:  HEXISLOGIN   σύνδεση με email / κωδικό HEXIS-APP
;;;           HEXISLOGOUT  αποσύνδεση
;;;           OROIKAEK     όροι δόμησης από ΚΑΕΚ (γραμμή εντολών)
;;;           HEXISAPOSPASMA απόσπασμα ρυμοτομικού (γραμμές ΕΨΧ + ΚΑΕΚ) στο σχέδιο
;;;           HEXISFAKELOS Φάκελος Κτηματολογίου (απόσπασμα, φύλλο, τίτλοι
;;;                        κύριου + όμορων) — ανοίγει τη σελίδα στο hexis-app.gr
;;; Χρησιμοποιείται και από τα OROIDOM (επιλογή 5) και DILOSI.
;;; Ο κωδικός ΔΕΝ αποθηκεύεται. Κρατιέται μόνο το κλειδί συνεδρίας
;;; του λογαριασμού (μεταβλητή HEXIS_RT), που ανανεώνεται μόνο του.
;;; ================================================================
(vl-load-com)
(setq *HX-WEB* "https://hexis-app.gr")

(setq *HX-SB*   "https://oucqqudfdimccgowvpqp.supabase.co")
(setq *HX-ANON* "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y3FxdWRmZGltY2Nnb3d2cHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQyNjIsImV4cCI6MjA5Njg1MDI2Mn0.7Am1tSulJrkWlsm_Vv9xz5RlvpxoYGYSL3237UaQ8S8")
(setq *HX-FN*   (strcat *HX-SB* "/functions/v1/oroi-domisis"))
(if (null *HX-AT*) (setq *HX-AT* nil *HX-EXP* 0.0))

;; ---------------- HTTP ----------------
(defun hx:http (method url headers body / o r)
  (setq o (vl-catch-all-apply (function vlax-create-object) (list "MSXML2.ServerXMLHTTP.6.0")))
  (if (or (null o) (vl-catch-all-error-p o))
    (setq o (vl-catch-all-apply (function vlax-create-object) (list "WinHttp.WinHttpRequest.5.1"))))
  (if (or (null o) (vl-catch-all-error-p o))
    (list 0 "\U+0394\U+03B5\U+03BD \U+03C5\U+03C0\U+03AC\U+03C1\U+03C7\U+03B5\U+03B9 \U+03C5\U+03C0\U+03BF\U+03C3\U+03C4\U+03AE\U+03C1\U+03B9\U+03BE\U+03B7 HTTP (MSXML/WinHttp) \U+03C3\U+03B5 \U+03B1\U+03C5\U+03C4\U+03CC \U+03C4\U+03BF CAD.")
    (progn
      (setq r (vl-catch-all-apply
        (function (lambda ()
          (vlax-invoke-method o "open" method url :vlax-false)
          (foreach h headers (vlax-invoke-method o "setRequestHeader" (car h) (cdr h)))
          (vlax-invoke-method o "send" (if body body ""))
          (list (vlax-get-property o "status") (vlax-get-property o "responseText"))))))
      (vl-catch-all-apply (function vlax-release-object) (list o))
      (if (vl-catch-all-error-p r)
        (list 0 (strcat "\U+03A3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 \U+03C3\U+03CD\U+03BD\U+03B4\U+03B5\U+03C3\U+03B7\U+03C2: " (vl-catch-all-error-message r)))
        r))))

;; ---------------- JSON (\U+03BC\U+03CC\U+03BD\U+03BF \U+03CC,\U+03C4\U+03B9 \U+03C7\U+03C1\U+03B5\U+03B9\U+03B1\U+03B6\U+03CC\U+03BC\U+03B1\U+03C3\U+03C4\U+03B5) ----------------
(defun hx:jesc (s / i c o)
  (setq o "" i 1)
  (while (<= i (strlen s))
    (setq c (substr s i 1))
    (setq o (strcat o (cond ((= c "\\") "\\\\") ((= c "\"") "\\\"") (T c))))
    (setq i (1+ i)))
  o)
(defun hx:jget (js key / p s e n)
  (setq p (vl-string-search (strcat "\"" key "\"") js))
  (if p
    (progn
      (setq s (+ p (strlen key) 2) n (strlen js))
      (while (and (< s n) (member (substr js (1+ s) 1) (list ":" " "))) (setq s (1+ s)))
      (if (= (substr js (1+ s) 1) "\"")
        (progn (setq e (vl-string-search "\"" js (1+ s))) (if e (substr js (+ s 2) (- e s 1)) nil))
        (progn (setq e s)
               (while (and (< e n) (not (member (substr js (1+ e) 1) (list "," "}")))) (setq e (1+ e)))
               (substr js (1+ s) (- e s)))))
    nil))

;; ---------------- \U+03C3\U+03C5\U+03BD\U+03B5\U+03B4\U+03C1\U+03AF\U+03B1 ----------------
(defun hx:now () (* (getvar "DATE") 86400.0))
(defun hx:take (res / js at rt ex)
  (setq js (cadr res))
  (if (and (= (car res) 200) (setq at (hx:jget js "access_token")))
    (progn
      (setq rt (hx:jget js "refresh_token") ex (hx:jget js "expires_in"))
      (setq *HX-AT* at *HX-EXP* (+ (hx:now) (- (if ex (atof ex) 3600.0) 120.0)))
      (if rt (setenv "HEXIS_RT" rt))
      T)
    (progn
      (setq *HX-AT* nil)
      (princ (strcat "\n" "HEXIS-APP: "
        (cond ((and js (vl-string-search "invalid_grant" js)) "\U+03BB\U+03AC\U+03B8\U+03BF\U+03C2 email \U+03AE \U+03BA\U+03C9\U+03B4\U+03B9\U+03BA\U+03CC\U+03C2 (\U+03AE \U+03B7 \U+03C3\U+03C5\U+03BD\U+03B5\U+03B4\U+03C1\U+03AF\U+03B1 \U+03AD\U+03BB\U+03B7\U+03BE\U+03B5).")
              ((= (car res) 0) (cadr res))
              (T (strcat "\U+03B7 \U+03C3\U+03CD\U+03BD\U+03B4\U+03B5\U+03C3\U+03B7 \U+03B1\U+03C0\U+03AD\U+03C4\U+03C5\U+03C7\U+03B5 (HTTP " (itoa (car res)) ").")))))
      nil)))
(defun hx:dcl ( / p f)
  (setq p (strcat (getvar "TEMPPREFIX") "hexis_login.dcl") f (open p "w"))
  (foreach s (list
    "hxlogin : dialog { label = \"HEXIS-APP - Σύνδεση\";"
    "  : text { label = \"Σύνδεση με τον λογαριασμό σου στο hexis-app.gr\"; }"
    "  : edit_box { key = \"em\"; label = \"Email :\"; edit_width = 36; }"
    "  : edit_box { key = \"pw\"; label = \"Κωδικός :\"; edit_width = 36; password_char = \"*\"; }"
    "  : text { label = \"Ο κωδικός δεν αποθηκεύεται.\"; }"
    "  ok_cancel;"
    "}") (write-line s f))
  (close f) p)
(defun hx:ask ( / id em pw r)
  (setq id (load_dialog (hx:dcl)))
  (if (and (> id 0) (new_dialog "hxlogin" id))
    (progn
      (set_tile "em" (if (getenv "HEXIS_EMAIL") (getenv "HEXIS_EMAIL") ""))
      (action_tile "accept" "(setq em (get_tile \"em\") pw (get_tile \"pw\")) (done_dialog 1)")
      (setq r (start_dialog)) (unload_dialog id)
      (if (and (= r 1) em (/= em "") pw (/= pw "")) (cons em pw) nil))
    nil))
(defun hx:login ( / cr ok em)
  (if (setq cr (hx:ask))
    (progn
      (princ "\nHEXIS-APP: \U+03C3\U+03CD\U+03BD\U+03B4\U+03B5\U+03C3\U+03B7...")
      (setq em (car cr))
      (setq ok (hx:take (hx:http "POST" (strcat *HX-SB* "/auth/v1/token?grant_type=password")
                 (list (cons "apikey" *HX-ANON*) (cons "Content-Type" "application/json"))
                 (strcat "{\"email\":\"" (hx:jesc em) "\",\"password\":\"" (hx:jesc (cdr cr)) "\"}"))))
      (setq cr nil)
      (if ok (progn (setenv "HEXIS_EMAIL" em) (princ " \U+03C3\U+03C5\U+03BD\U+03B4\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5\U+03C2.")))
      ok)
    nil))
(defun hx:refresh ( / rt)
  (setq rt (getenv "HEXIS_RT"))
  (if (and rt (/= rt ""))
    (hx:take (hx:http "POST" (strcat *HX-SB* "/auth/v1/token?grant_type=refresh_token")
               (list (cons "apikey" *HX-ANON*) (cons "Content-Type" "application/json"))
               (strcat "{\"refresh_token\":\"" rt "\"}")))
    nil))
(defun hx:token ()
  (cond ((and *HX-AT* (< (hx:now) *HX-EXP*)) *HX-AT*)
        ((hx:refresh) *HX-AT*)
        ((hx:login) *HX-AT*)
        (T nil)))

;; ---------------- \U+03CC\U+03C1\U+03BF\U+03B9 \U+03B1\U+03C0\U+03CC \U+039A\U+0391\U+0395\U+039A ----------------
(defun hx:split (s / p out)
  (setq out nil)
  (while (setq p (vl-string-search "\n" s))
    (setq out (cons (vl-string-trim "\r" (substr s 1 p)) out) s (substr s (+ p 2))))
  (if (/= s "") (setq out (cons (vl-string-trim "\r" s) out)))
  (reverse out))
(defun hx:lines (s / i p n out)
  (setq i 0 n (strlen s) out nil)
  (while (< i n)
    (setq p (vl-string-search "\n" s i))
    (if (null p) (setq p n))
    (setq out (cons (vl-string-trim "\r" (substr s (1+ i) (- p i))) out))
    (setq i (1+ p)))
  (reverse out))
(defun hx:fields (s sep / i p n out)
  (setq i 0 n (strlen s) out nil)
  (while (<= i n)
    (setq p (vl-string-search sep s i))
    (if (null p) (setq p n))
    (setq out (cons (substr s (1+ i) (- p i)) out))
    (setq i (+ p (strlen sep))))
  (reverse out))
(defun hx:parse (txt / d rows p k v q)
  (setq d nil rows nil)
  (foreach ln (hx:lines txt)
    (if (setq p (vl-string-search "=" ln))
      (progn
        (setq k (substr ln 1 p) v (substr ln (+ p 2)))
        (if (= k "ROW")
          (if (setq q (vl-string-search "|" v))
            (setq rows (cons (cons (substr v 1 q) (substr v (+ q 2))) rows)))
          (setq d (cons (cons k v) d))))))
  (cons (cons "ROWS" (reverse rows)) d))
(defun hx:v (d k / a) (if (setq a (assoc k d)) (cdr a) ""))
;; \U+03B5\U+03C0\U+03B9\U+03C3\U+03C4\U+03C1\U+03AD\U+03C6\U+03B5\U+03B9 \U+03BB\U+03AF\U+03C3\U+03C4\U+03B1 (\U+039A\U+039B\U+0395\U+0399\U+0394\U+0399 . \U+03C4\U+03B9\U+03BC\U+03AE) \U+03AE nil
(defun hx:oroi (kaek / tk res d n)
  (setq kaek (strcase (vl-string-trim " " kaek)) n 0 d nil)
  (while (and (< n 2) (null d) (setq tk (hx:token)))
    (princ (strcat "\nHEXIS-APP: \U+03CC\U+03C1\U+03BF\U+03B9 \U+03B4\U+03CC\U+03BC\U+03B7\U+03C3\U+03B7\U+03C2 \U+03B3\U+03B9\U+03B1 \U+039A\U+0391\U+0395\U+039A " kaek "..."))
    (setq res (hx:http "POST" *HX-FN*
                (list (cons "Content-Type" "application/json") (cons "apikey" *HX-ANON*) (cons "Authorization" (strcat "Bearer " tk)))
                (strcat "{\"action\":\"lisp\",\"kaek\":\"" (hx:jesc kaek) "\"}")))
    (cond
      ((= (car res) 401) (setq *HX-AT* nil *HX-EXP* 0.0 n (1+ n)))
      ((= (car res) 200)
        (setq d (hx:parse (cadr res)))
        (if (/= (hx:v d "OK") "1")
          (progn (princ (strcat "\nHEXIS-APP: " (hx:v d "MSG"))) (setq d nil n 2))))
      (T (princ (strcat "\nHEXIS-APP: \U+03C3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 " (itoa (car res)) " " (if (= (car res) 0) (cadr res) ""))) (setq n 2))))
  (if d
    (setq *BRB-OROI* (list (cons "OT" (hx:v d "OT"))
                           (cons "PERIOXI" (if (/= (hx:v d "OIKISMOS") "") (hx:v d "OIKISMOS") (hx:v d "DIMOS")))
                           (cons "FEK" (hx:v d "FEK_OROI"))
                           (cons "KAEK" kaek))
          *HX-LAST* d))
  d)

;; ---------------- \U+03B5\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2 ----------------
(defun c:HEXISLOGIN () (setq *HX-AT* nil *HX-EXP* 0.0) (hx:login) (princ))
(defun c:HEXISLOGOUT ()
  (setenv "HEXIS_RT" "") (setq *HX-AT* nil *HX-EXP* 0.0)
  (princ "\nHEXIS-APP: \U+03B1\U+03C0\U+03BF\U+03C3\U+03C5\U+03BD\U+03B4\U+03AD\U+03B8\U+03B7\U+03BA\U+03B5\U+03C2 \U+03B1\U+03C0\U+03CC \U+03B1\U+03C5\U+03C4\U+03CC\U+03BD \U+03C4\U+03BF\U+03BD \U+03C5\U+03C0\U+03BF\U+03BB\U+03BF\U+03B3\U+03B9\U+03C3\U+03C4\U+03AE.") (princ))
(defun c:OROIKAEK ( / k d)
  (setq k (getstring (strcat "\n" "\U+039A\U+0391\U+0395\U+039A: ")))
  (if (and k (/= k "") (setq d (hx:oroi k)))
    (progn
      (princ (strcat "\n" "----------------------------------------"))
      (foreach r (hx:v d "ROWS") (princ (strcat "\n" (car r) ": " (cdr r))))
      (princ (strcat "\n" "----------------------------------------"))
      (princ (strcat "\n" "\U+0393\U+03B9\U+03B1 \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1 \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF: OROIDOM -> 5 (\U+03B1\U+03C0\U+03CC \U+039A\U+0391\U+0395\U+039A)."))))
  (princ))

;; ---------------- \U+03B1\U+03C0\U+03CC\U+03C3\U+03C0\U+03B1\U+03C3\U+03BC\U+03B1 \U+03C1\U+03C5\U+03BC\U+03BF\U+03C4\U+03BF\U+03BC\U+03B9\U+03BA\U+03BF\U+03CD \U+03C3\U+03C4\U+03BF \U+03C3\U+03C7\U+03AD\U+03B4\U+03B9\U+03BF ----------------
;; \U+03A8\U+03B7\U+03C6\U+03B9\U+03BF\U+03C0\U+03BF\U+03B9\U+03B7\U+03BC\U+03AD\U+03BD\U+03B5\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03C4\U+03BF\U+03C5 \U+0395\U+03BD\U+03B9\U+03B1\U+03AF\U+03BF\U+03C5 \U+03A8\U+03B7\U+03C6\U+03B9\U+03B1\U+03BA\U+03BF\U+03CD \U+03A7\U+03AC\U+03C1\U+03C4\U+03B7 + \U+03B3\U+03B5\U+03C9\U+03C4\U+03B5\U+03BC\U+03AC\U+03C7\U+03B9\U+03B1 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5, \U+03C3\U+03B5 \U+03C0\U+03BB\U+03B1\U+03AF\U+03C3\U+03B9\U+03BF
;; \U+03C0\U+03BB\U+03AC\U+03C4\U+03BF\U+03C5\U+03C2 W (\U+03BC\U+03BF\U+03BD\U+03AC\U+03B4\U+03B5\U+03C2 \U+03C3\U+03C7\U+03B5\U+03B4\U+03AF\U+03BF\U+03C5) \U+03BA\U+03AC\U+03C4\U+03C9 \U+03B1\U+03C0\U+03CC \U+03C4\U+03BF\U+03BD \U+03C0\U+03AF\U+03BD\U+03B1\U+03BA\U+03B1 \U+03CC\U+03C1\U+03C9\U+03BD. \U+0393\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03AE \U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 \U+2014 \U+03BA\U+03BB\U+03B9\U+03BC\U+03B1\U+03BA\U+03CE\U+03BD\U+03B5\U+03C4\U+03B1\U+03B9 \U+03BC\U+03B5 \U+03C4\U+03BF h.
(defun hx:post (body / tk res n out)
  (setq n 0 out nil)
  (while (and (< n 2) (null out) (setq tk (hx:token)))
    (setq res (hx:http "POST" *HX-FN*
                (list (cons "Content-Type" "application/json") (cons "apikey" *HX-ANON*) (cons "Authorization" (strcat "Bearer " tk)))
                body))
    (cond
      ((= (car res) 401) (setq *HX-AT* nil *HX-EXP* 0.0 n (1+ n)))
      ((= (car res) 200) (setq out (cadr res)))
      (T (princ (strcat "\n" "HEXIS-APP: \U+03C3\U+03C6\U+03AC\U+03BB\U+03BC\U+03B1 " (itoa (car res)) " " (if (= (car res) 0) (cadr res) ""))) (setq n 2))))
  out)
(defun hx:lay (name col)
  (if (null (tblsearch "LAYER" name))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord")
                   (cons 2 name) (cons 70 0) (cons 62 col) (cons 6 "Continuous")))))
(defun hx:pl (lay pts closed w)
  (if (>= (length pts) 2)
    (entmake (append (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 lay) (cons 100 "AcDbPolyline")
                           (cons 90 (length pts)) (cons 70 (if closed 1 0)) (cons 43 w))
                     (mapcar (function (lambda (p) (cons 10 p))) pts)))))
(defun hx:tx (lay p th str cen)
  (entmake (append (list (cons 0 "TEXT") (cons 100 "AcDbEntity") (cons 8 lay) (cons 10 (list (car p) (cadr p) 0.0)) (cons 40 th) (cons 1 str))
                   (if cen (list (cons 72 1) (cons 73 2) (cons 11 (list (car p) (cadr p) 0.0))) (list (cons 72 0))))))
(defun hx:apospasma (kaek x0 ytop W h / txt lns bb ew eh f wd hd fy xy lay pts p q L y ot feks)
  (setq kaek (strcase (vl-string-trim " " kaek)))
  (princ (strcat "\n" "HEXIS-APP: \U+03B1\U+03C0\U+03CC\U+03C3\U+03C0\U+03B1\U+03C3\U+03BC\U+03B1 \U+03C1\U+03C5\U+03BC\U+03BF\U+03C4\U+03BF\U+03BC\U+03B9\U+03BA\U+03BF\U+03CD \U+03B3\U+03B9\U+03B1 \U+039A\U+0391\U+0395\U+039A " kaek "..."))
  (setq txt (hx:post (strcat "{\"action\":\"lisp_extract\",\"kaek\":\"" (hx:jesc kaek) "\"}")))
  (if (null txt) (progn (princ "\nHEXIS-APP: \U+03B4\U+03B5\U+03BD \U+03AE\U+03C1\U+03B8\U+03B5 \U+03B1\U+03C0\U+03CC\U+03C3\U+03C0\U+03B1\U+03C3\U+03BC\U+03B1.") nil)
   (progn
    (setq lns (hx:lines txt) bb nil ot "" feks "")
    (foreach ln lns
      (cond ((= (substr ln 1 5) "BBOX=") (setq bb (mapcar (function atof) (hx:fields (substr ln 6) "|"))))
            ((= (substr ln 1 3) "OT=") (setq ot (substr ln 4)))
            ((= (substr ln 1 5) "FEKS=") (setq feks (substr ln 6)))
            ((= (substr ln 1 4) "MSG=") (princ (strcat "\nHEXIS-APP: " (substr ln 5))))))
    (if (null bb) nil
     (progn
      (setq ew (- (nth 2 bb) (nth 0 bb)) eh (- (nth 3 bb) (nth 1 bb)))
      (setq f (/ W ew))
      (if (> (* eh f) (* 0.85 W)) (setq f (/ (* 0.85 W) eh)))
      (setq wd (* ew f) hd (* eh f))
      (foreach c (list (list "HX_APOSPASMA" 7) (list "HX_KT_GEOTEMAXIA" 8) (list "HX_ORIO_OIKISMOU" 3) (list "HX_KOINOXRISTA" 94)
                       (list "HX_OT" 4) (list "HX_POL_GRAMMES" 6) (list "HX_OIKODOMIKI" 5) (list "HX_RYMOTOMIKI" 1)
                       (list "HX_PST_KAEK" 30) (list "HX_OT_ARITHMOS" 7))
        (hx:lay (car c) (cadr c)))
      ;; \U+03C4\U+03AF\U+03C4\U+03BB\U+03BF\U+03C2
      (hx:tx "HX_APOSPASMA" (list x0 (- ytop (* h 1.2))) (* h 1.2)
             (strcat "\U+0391\U+03A0\U+039F\U+03A3\U+03A0\U+0391\U+03A3\U+039C\U+0391 \U+03A1\U+03A5\U+039C\U+039F\U+03A4\U+039F\U+039C\U+0399\U+039A\U+039F\U+03A5 \U+2014 \U+039A\U+0391\U+0395\U+039A " kaek (if (/= ot "") (strcat " (\U+039F.\U+03A4. " ot ")") "")) nil)
      (if (/= feks "") (hx:tx "HX_APOSPASMA" (list x0 (- ytop (* h 2.5))) (* h 0.75) (strcat "\U+03A6\U+0395\U+039A: " feks) nil))
      (setq fy (- ytop (* h 3.3)))
      (defun xy (s / c) (setq c (vl-string-search "," s))
        (list (+ x0 (* f (atof (substr s 1 c)))) (+ (- fy hd) (* f (atof (substr s (+ c 2)))))))
      ;; \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+03BA\U+03B1\U+03B9 \U+03BA\U+03B5\U+03AF\U+03BC\U+03B5\U+03BD\U+03B1
      (foreach ln lns
        (cond
          ((= (substr ln 1 2) "G=")
            (setq p (vl-string-search "|" ln) lay (substr ln 3 (- p 2)))
            (setq pts (mapcar (function xy) (hx:fields (substr ln (+ p 2)) ";")))
            (hx:pl lay pts nil (if (= lay "HX_PST_KAEK") (* h 0.14) 0.0)))
          ((= (substr ln 1 2) "T=")
            (setq q (hx:fields (substr ln 3) "|") lay (car q))
            (hx:tx lay (xy (cadr q)) (if (= lay "HX_PST_KAEK") (* h 0.6) (* h 0.9)) (caddr q) T))))
      ;; \U+03C0\U+03BB\U+03B1\U+03AF\U+03C3\U+03B9\U+03BF
      (hx:pl "HX_APOSPASMA" (list (list x0 fy) (list (+ x0 wd) fy) (list (+ x0 wd) (- fy hd)) (list x0 (- fy hd))) T 0.0)
      ;; \U+03B2\U+03BF\U+03C1\U+03C1\U+03AC\U+03C2
      (setq p (list (- (+ x0 wd) (* h 2.5)) (- fy (* h 5.0))))
      (hx:pl "HX_APOSPASMA" (list (list (- (car p) (* h 0.8)) (cadr p)) (list (car p) (+ (cadr p) (* h 2.6))) (list (+ (car p) (* h 0.8)) (cadr p)) (list (car p) (+ (cadr p) (* h 0.7)))) T 0.0)
      (hx:tx "HX_APOSPASMA" (list (car p) (+ (cadr p) (* h 3.4))) h "\U+0392" T)
      ;; \U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03AE \U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1
      (setq L nil)
      (foreach L0 (list 1 2 5 10 20 25 50 100 200 250 500) (if (<= (* L0 f) (* 0.3 wd)) (setq L L0)))
      (if (null L) (setq L 1))
      (setq y (- fy hd (* h 1.6)))
      (hx:pl "HX_APOSPASMA" (list (list x0 y) (list (+ x0 (* L f)) y)) nil (* h 0.25))
      (hx:pl "HX_APOSPASMA" (list (list x0 (+ y (* h 0.5))) (list x0 (- y (* h 0.5)))) nil 0.0)
      (hx:pl "HX_APOSPASMA" (list (list (+ x0 (* L f)) (+ y (* h 0.5))) (list (+ x0 (* L f)) (- y (* h 0.5)))) nil 0.0)
      (hx:tx "HX_APOSPASMA" (list (+ x0 (* L f) (* h 0.8)) (- y (* h 0.35))) (* h 0.7) (strcat (itoa L) " \U+03BC.") nil)
      (hx:tx "HX_APOSPASMA" (list x0 (- y (* h 1.8))) (* h 0.6)
             "\U+03A8\U+03B7\U+03C6\U+03B9\U+03BF\U+03C0\U+03BF\U+03B9\U+03B7\U+03BC\U+03AD\U+03BD\U+03B5\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03AD\U+03C2 \U+0395\U+03BD\U+03B9\U+03B1\U+03AF\U+03BF\U+03C5 \U+03A8\U+03B7\U+03C6\U+03B9\U+03B1\U+03BA\U+03BF\U+03CD \U+03A7\U+03AC\U+03C1\U+03C4\U+03B7 (\U+03A4\U+0395\U+0395/\U+03A5\U+03A0\U+0395\U+039D) \U+00B7 \U+03B3\U+03B5\U+03C9\U+03C4\U+03B5\U+03BC\U+03AC\U+03C7\U+03B9\U+03B1 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5 \U+00B7 \U+03B5\U+03BD\U+03B7\U+03BC\U+03B5\U+03C1\U+03C9\U+03C4\U+03B9\U+03BA\U+03CC, \U+03B3\U+03C1\U+03B1\U+03C6\U+03B9\U+03BA\U+03AE \U+03BA\U+03BB\U+03AF\U+03BC\U+03B1\U+03BA\U+03B1 \U+00B7 HEXIS-APP" nil)
      (princ (strcat "\n" "HEXIS-APP: \U+03C4\U+03BF \U+03B1\U+03C0\U+03CC\U+03C3\U+03C0\U+03B1\U+03C3\U+03BC\U+03B1 \U+03BC\U+03C0\U+03AE\U+03BA\U+03B5 (layers HX_*)."))
      (- y (* h 2.2)))))))
(defun c:HEXISAPOSPASMA ( / k d pt h)
  (setq d (if *HX-LAST* (hx:v *HX-LAST* "KAEK") ""))
  (setq k (getstring (strcat "\n" "\U+039A\U+0391\U+0395\U+039A" (if (/= d "") (strcat " <" d ">") "") ": ")))
  (if (and (= k "") (/= d "")) (setq k d))
  (if (and (/= k "") (setq pt (getpoint (strcat "\n" "\U+03A3\U+03B7\U+03BC\U+03B5\U+03AF\U+03BF \U+03B5\U+03B9\U+03C3\U+03B1\U+03B3\U+03C9\U+03B3\U+03AE\U+03C2 (\U+03C0\U+03AC\U+03BD\U+03C9-\U+03B1\U+03C1\U+03B9\U+03C3\U+03C4\U+03B5\U+03C1\U+03AE \U+03B3\U+03C9\U+03BD\U+03AF\U+03B1): "))))
    (progn
      (setq h (getdist pt (strcat "\n" "\U+038E\U+03C8\U+03BF\U+03C2 \U+03B3\U+03C1\U+03B1\U+03BC\U+03BC\U+03B1\U+03C4\U+03BF\U+03C3\U+03B5\U+03B9\U+03C1\U+03AC\U+03C2 <2.5>: ")))
      (if (null h) (setq h 2.5))
      (hx:apospasma k (car pt) (cadr pt) (* h 60.0) h)))
  (princ))

;; \U+03A6\U+03AC\U+03BA\U+03B5\U+03BB\U+03BF\U+03C2 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5: \U+03B1\U+03BD\U+03BF\U+03AF\U+03B3\U+03B5\U+03B9 \U+03C4\U+03BF\U+03BD browser. \U+039F\U+03B9 \U+03BA\U+03C9\U+03B4\U+03B9\U+03BA\U+03BF\U+03AF \U+03A4\U+0395\U+0395 \U+03BC\U+03C0\U+03B1\U+03AF\U+03BD\U+03BF\U+03C5\U+03BD \U+039C\U+039F\U+039D\U+039F \U+03C3\U+03C4\U+03BF site \U+03C4\U+03BF\U+03C5 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5.
(defun hx:open-url (url / sh r)
  (setq sh (vl-catch-all-apply (function vlax-create-object) (list "Shell.Application")))
  (if (and sh (not (vl-catch-all-error-p sh)))
    (progn
      (setq r (vl-catch-all-apply (function vlax-invoke-method) (list sh "ShellExecute" url)))
      (vl-catch-all-apply (function vlax-release-object) (list sh))
      (not (vl-catch-all-error-p r)))
    (not (vl-catch-all-error-p (vl-catch-all-apply (function startapp) (list "explorer" url))))))
(defun c:HEXISFAKELOS ( / k d)
  (setq d (if *HX-LAST* (hx:v *HX-LAST* "KAEK") ""))
  (setq k (getstring (strcat "\n" "\U+039A\U+0391\U+0395\U+039A" (if (/= d "") (strcat " <" d ">") "") ": ")))
  (if (and (= k "") (/= d "")) (setq k d))
  (setq k (strcase (vl-string-trim " " k)))
  (if (and (= (strlen k) 12) (wcmatch k "############"))
    (progn
      (hx:open-url (strcat *HX-WEB* "/fakelos.html?kaek=" k "&src=lisp"))
      (princ (strcat "\n" "HEXIS-APP: \U+03AC\U+03BD\U+03BF\U+03B9\U+03BE\U+03B5 \U+03BF \U+03A6\U+03AC\U+03BA\U+03B5\U+03BB\U+03BF\U+03C2 \U+039A\U+03C4\U+03B7\U+03BC\U+03B1\U+03C4\U+03BF\U+03BB\U+03BF\U+03B3\U+03AF\U+03BF\U+03C5 \U+03B3\U+03B9\U+03B1 \U+039A\U+0391\U+0395\U+039A " k " \U+03C3\U+03C4\U+03BF\U+03BD browser.")))
    (princ (strcat "\n" "HEXIS-APP: \U+03B4\U+03CE\U+03C3\U+03B5 \U+039A\U+0391\U+0395\U+039A 12 \U+03C8\U+03B7\U+03C6\U+03AF\U+03C9\U+03BD.")))
  (princ))

(princ "\nHEXISNET v1.2 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: OROIKAEK, HEXISAPOSPASMA, HEXISFAKELOS, HEXISLOGIN, HEXISLOGOUT")
(princ)
