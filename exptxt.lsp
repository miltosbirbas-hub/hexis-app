;;; ===============================================================
;;; EXPTXT - Εξαγωγή σημείων σε αρχείο TXT (Α/Α,Χ,Υ,Ζ)
;;; BRB Development - για ProgeCAD / AutoCAD
;;; Φόρτωση: APPLOAD -> exptxt.lsp  |  Εντολή: EXPTXT
;;; Διαλέγει οντότητες POINT και INSERT (μπλοκ σημείων)
;;; ===============================================================

(defun c:EXPTXT (/ ss fn f i e ed p n sep)
  (setq sep ",")                                          ; διαχωριστικό - άλλαξε σε "\t" ή " " αν θες
  (princ "\nΕπίλεξε σημεία (POINT ή μπλοκ): ")
  (setq ss (ssget '((0 . "POINT,INSERT"))))
  (if ss
    (progn
      (setq fn (getfiled "Αποθήκευση σημείων σε TXT" "" "txt" 1))
      (if fn
        (progn
          (setq f (open fn "w") n 1 i 0)
          (repeat (sslength ss)
            (setq e  (ssname ss i)
                  ed (entget e)
                  p  (cdr (assoc 10 ed)))                 ; συντεταγμένες
            (write-line
              (strcat (itoa n) sep
                      (rtos (car p)   2 3) sep            ; X - 3 δεκαδικά
                      (rtos (cadr p)  2 3) sep            ; Y - 3 δεκαδικά
                      (rtos (caddr p) 2 2))               ; Z - 2 δεκαδικά
              f)
            (setq n (1+ n) i (1+ i)))
          (close f)
          (princ (strcat "\n>> Εξήχθησαν " (itoa (1- n)) " σημεία στο: " fn)))
        (princ "\nΑκυρώθηκε.")))
    (princ "\nΔεν επιλέχθηκαν σημεία."))
  (princ))

;;; ---------------------------------------------------------------
;;; EXPTXTA - Ίδιο αλλά παίρνει ΟΛΑ τα σημεία του σχεδίου αυτόματα
;;; ---------------------------------------------------------------
(defun c:EXPTXTA (/ ss fn f i e ed p n sep)
  (setq sep ","
        ss  (ssget "X" '((0 . "POINT"))))                 ; όλα τα POINT
  (if ss
    (progn
      (setq fn (getfiled "Αποθήκευση σημείων σε TXT" "" "txt" 1))
      (if fn
        (progn
          (setq f (open fn "w") n 1 i 0)
          (repeat (sslength ss)
            (setq e (ssname ss i) ed (entget e) p (cdr (assoc 10 ed)))
            (write-line
              (strcat (itoa n) sep (rtos (car p) 2 3) sep
                      (rtos (cadr p) 2 3) sep (rtos (caddr p) 2 2)) f)
            (setq n (1+ n) i (1+ i)))
          (close f)
          (princ (strcat "\n>> Εξήχθησαν " (itoa (1- n)) " σημεία στο: " fn)))))
    (princ "\nΔεν υπάρχουν οντότητες POINT στο σχέδιο."))
  (princ))

(princ "\nΦορτώθηκαν: EXPTXT (επιλογή) | EXPTXTA (όλα τα POINT)")
(princ)
