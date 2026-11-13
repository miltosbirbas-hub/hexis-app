# Χτίζει KALYPSI.lsp (AutoCAD, \U+XXXX) και KALYPSI_ProgeCAD.lsp (ANSI 1253) από το KALYPSI.src.lsp
import os
R = os.path.dirname(os.path.abspath(__file__)) + "/.."
def U(s): return "".join(c if ord(c) < 128 else "\\U+%04X" % ord(c) for c in s)
def wr(p, s): open(p, "wb").write(s.replace("\n", "\r\n").encode("cp1253"))
src = open(R + "/tools-lisp/KALYPSI.src.lsp", encoding="utf-8").read()
wr(R + "/KALYPSI.lsp", "\n".join(ln if ln.lstrip().startswith(";;;") else U(ln) for ln in src.split("\n")))
prog = src.replace('(list "HEXISNET.lsp" "HEXISNET_ProgeCAD.lsp")', '(list "HEXISNET_ProgeCAD.lsp" "HEXISNET.lsp")', 1)
prog = prog.replace("(vl-load-com)", ";;; Έκδοση για progeCAD - κωδικοποίηση ANSI Windows-1253 (Ελληνικά)\n(vl-load-com)", 1)
wr(R + "/KALYPSI_ProgeCAD.lsp", prog)
print("KALYPSI ok")
