;;; ================================================================
;;; HEXISNET.LSP v1.1 - HEXIS-APP / BRB DEVELOPMENT MON. I.K.E.
;;; Σύνδεση AutoCAD / progeCAD με τον λογαριασμό HEXIS-APP:
;;; όροι δόμησης από ΚΑΕΚ (Ενιαίος Ψηφιακός Χάρτης + Κτηματολόγιο).
;;; Εντολές:  HEXISLOGIN   σύνδεση με email / κωδικό HEXIS-APP
;;;           HEXISLOGOUT  αποσύνδεση
;;;           OROIKAEK     όροι δόμησης από ΚΑΕΚ (γραμμή εντολών)
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
(defun hx:parse (txt / d rows p k v q)
  (setq d nil rows nil)
  (foreach ln (hx:split txt)
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

(princ "\nHEXISNET v1.1 \U+03C6\U+03BF\U+03C1\U+03C4\U+03CE\U+03B8\U+03B7\U+03BA\U+03B5. \U+0395\U+03BD\U+03C4\U+03BF\U+03BB\U+03AD\U+03C2: OROIKAEK, HEXISFAKELOS, HEXISLOGIN, HEXISLOGOUT")
(princ)
