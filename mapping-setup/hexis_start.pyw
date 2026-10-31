"""HEXIS MAPPING — εκκίνηση από το εικονίδιο της επιφάνειας εργασίας.

Το setup εγκαθιστά μόνο το περιβάλλον (Python + πακέτα) και αυτό το αρχείο.
- Αν η εφαρμογή είναι ήδη εγκατεστημένη (HEXIS_MAPPING\\local), την ανοίγει.
- Αλλιώς (πρώτη εκκίνηση): παράθυρο σύνδεσης με τον λογαριασμό HEXIS (email + κωδικός) ή με κωδικό δωρεάν δοκιμής,
  κατεβάζει την έκδοση που δικαιούται ο χρήστης, την εγκαθιστά δίπλα, κρατά τη σύνδεση (όχι τον κωδικό) και την ανοίγει.
"""
from __future__ import annotations

import io
import json
import os
import runpy
import shutil
import sys
import threading
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent                 # ...\HEXIS MAPPING
APP = ROOT / "HEXIS_MAPPING"
LAUNCH = APP / "local" / "hexis_launch.pyw"
SERVER = APP / "local" / "server.py"
SUPA = "https://oucqqudfdimccgowvpqp.supabase.co"
KEY = "sb_publishable_AjcKB0okxSvA9SUBazKEHQ_-HR0FMHP"     # δημόσιο κλειδί (όχι μυστικό)
FN = f"{SUPA}/functions/v1/mapping-gw"
HUB = "https://hexis-app.gr/mapping"


def data_dir() -> Path:                                 # ίδιος κανόνας με την εφαρμογή (datadir.py)
    if os.environ.get("HEXIS_DATA"):
        return Path(os.environ["HEXIS_DATA"]).expanduser()
    home = Path.home()
    for d in (home / "Documents", home / "OneDrive" / "Documents", home / "Έγγραφα"):
        if d.is_dir():
            return d / "HEXIS_MAPPING_DATA"
    return home / "HEXIS_MAPPING_DATA"


DATA = data_dir()
SESSION = DATA / "cloud.json"


def run_app():
    args = [a for a in sys.argv[1:] if a != "--reinstall"]
    if LAUNCH.exists():
        sys.argv = [str(LAUNCH)] + args
        runpy.run_path(str(LAUNCH), run_name="__main__")
        return
    # παλαιότερη έκδοση χωρίς hexis_launch.pyw: ίδια λογική εδώ (καταγραφή σε αρχείο, όχι κονσόλα)
    if sys.stdout is None or sys.stderr is None:
        (DATA / "logs").mkdir(parents=True, exist_ok=True)
        sys.stdout = sys.stderr = open(DATA / "logs" / "app.log", "a", encoding="utf-8", buffering=1)
    os.chdir(SERVER.parent); sys.path.insert(0, str(SERVER.parent))
    sys.argv = [str(SERVER)] + args
    runpy.run_path(str(SERVER), run_name="__main__")


def _vkey(v):
    import re
    return re.sub(r"\D", "", str(v or ""))[:12]


def auto_update():
    """Σε κάθε εκκίνηση: αν υπάρχει νεότερη έκδοση για τον λογαριασμό, κατεβαίνει και μπαίνει ΠΡΙΝ ανοίξει η εφαρμογή
    (μικρό παράθυρο προόδου). Χωρίς διαδίκτυο ή με οποιοδήποτε σφάλμα: ανοίγει η έκδοση που υπάρχει."""
    try:
        import requests
        import urllib.request
        try:                                               # η εφαρμογή τρέχει ήδη: δεν αλλάζουμε αρχεία κάτω από τα πόδια της
            urllib.request.urlopen("http://127.0.0.1:8765/api/version", timeout=1.5)
            return
        except Exception:
            pass
        sess = json.loads(SESSION.read_text(encoding="utf-8"))
        tok = sess.get("access_token")
        if not tok:
            return
        if sess.get("expires_at", 0) < time.time() and sess.get("refresh_token"):
            r = requests.post(f"{SUPA}/auth/v1/token?grant_type=refresh_token", json={"refresh_token": sess["refresh_token"]},
                              headers={"apikey": KEY}, timeout=8)
            if r.status_code != 200:
                return
            d = r.json(); tok = d["access_token"]
            sess.update(access_token=tok, refresh_token=d["refresh_token"], expires_at=time.time() + int(d.get("expires_in", 3600)) - 60)
            tmp = SESSION.with_name(SESSION.name + ".tmp"); tmp.write_text(json.dumps(sess, ensure_ascii=False, indent=1), encoding="utf-8")
            os.replace(tmp, SESSION)
        dev = {}
        try:
            dev = json.loads((DATA / "device.json").read_text(encoding="utf-8"))
        except Exception:
            pass
        r = requests.post(FN, json={"action": "app_url", "device": dev.get("id")}, headers={"Authorization": f"Bearer {tok}", "apikey": KEY}, timeout=8)
        if r.status_code != 200:
            return
        d = r.json()
        try:
            cur = (APP / "local" / "VERSION").read_text(encoding="utf-8").strip()
        except Exception:
            cur = ""
        latest = d.get("version")
        if not (latest and d.get("url") and len(_vkey(latest)) == 12 and (len(_vkey(cur)) < 12 or _vkey(latest) > _vkey(cur))):
            return
        import tkinter as tk
        from tkinter import ttk
        w = tk.Tk(); w.title("HEXIS MAPPING"); w.configure(bg="#f6f8fc"); w.resizable(False, False)
        try:
            w.iconbitmap(str(ROOT / "HEXIS_MAPPING.ico"))
        except Exception:
            pass
        tk.Label(w, text=f"Νέα έκδοση {latest}", font=("Segoe UI", 12, "bold"), bg="#f6f8fc", fg="#0a1430").pack(padx=24, pady=(18, 4))
        lab = tk.Label(w, text="Λήψη…", font=("Segoe UI", 10), bg="#f6f8fc", fg="#4a5876"); lab.pack(padx=24)
        bar = ttk.Progressbar(w, length=320, maximum=1.0); bar.pack(padx=24, pady=(8, 18))
        w.update_idletasks(); w.geometry(f"+{(w.winfo_screenwidth() - w.winfo_width()) // 2}+{(w.winfo_screenheight() - w.winfo_height()) // 3}")
        res = {}

        def job():
            try:
                with requests.get(d["url"], stream=True, timeout=60) as g:
                    g.raise_for_status(); n = int(g.headers.get("content-length") or 0); buf = io.BytesIO(); got = 0
                    for ch in g.iter_content(1 << 16):
                        buf.write(ch); got += len(ch)
                        if n:
                            res["p"] = got / n * 0.9; res["t"] = f"Λήψη… {got / 1e6:.1f} / {n / 1e6:.1f} MB"
                res["t"] = "Εγκατάσταση…"; res["p"] = 0.95
                tmp = ROOT / "HEXIS_MAPPING.new"; shutil.rmtree(tmp, ignore_errors=True)
                with zipfile.ZipFile(buf) as z:
                    z.extractall(tmp)
                src = tmp / "HEXIS_MAPPING" if (tmp / "HEXIS_MAPPING").is_dir() else tmp
                if not (src / "local" / "server.py").exists():
                    raise RuntimeError("ημιτελής λήψη")
                old = ROOT / "HEXIS_MAPPING.old"; shutil.rmtree(old, ignore_errors=True)
                if APP.exists():
                    os.replace(APP, old)
                os.replace(src, APP)
                shutil.rmtree(old, ignore_errors=True); shutil.rmtree(tmp, ignore_errors=True)
                res["ok"] = True
            except Exception as e:
                res["err"] = str(e)
                if not APP.exists() and (ROOT / "HEXIS_MAPPING.old").exists():
                    os.replace(ROOT / "HEXIS_MAPPING.old", APP)
            res["done"] = True

        threading.Thread(target=job, daemon=True).start()

        def tick():
            if "p" in res:
                bar["value"] = res["p"]
            if "t" in res:
                lab.config(text=res["t"])
            if res.get("done"):
                w.destroy(); return
            w.after(150, tick)
        tick(); w.mainloop()
    except Exception:
        pass


def ensure_shortcut():
    """Εικονίδιο στην επιφάνεια εργασίας (και στο OneDrive\\Desktop): αν λείπει, ξαναμπαίνει· πάντα με το εικονίδιο HEXIS."""
    if not sys.platform.startswith("win"):
        return
    try:
        import subprocess
        pyw = Path(sys.executable).with_name("pythonw.exe")
        ico = ROOT / "HEXIS_MAPPING.ico"
        ps = ("$d=[Environment]::GetFolderPath('Desktop'); if(-not $d){$d=Join-Path $env:USERPROFILE 'Desktop'}; "
              "$l=Join-Path $d 'HEXIS MAPPING.lnk'; $w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut($l); "
              f"$s.TargetPath='{pyw}'; $s.Arguments='\"{ROOT / 'hexis_start.pyw'}\"'; $s.WorkingDirectory='{ROOT}'; "
              f"$s.IconLocation='{ico},0'; $s.Description='HEXIS MAPPING'; $s.Save()")
        subprocess.Popen(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
                         creationflags=0x08000000, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


if SERVER.exists() and "--reinstall" not in sys.argv:
    ensure_shortcut()
    auto_update()
    run_app()
    sys.exit(0)

# ---------------------------------------------------------------- πρώτη εκκίνηση: σύνδεση + λήψη της εφαρμογής
import requests  # noqa: E402
import tkinter as tk  # noqa: E402
from tkinter import ttk  # noqa: E402


class Fail(Exception):
    pass


def _json(r):
    try:
        return r.json()
    except ValueError:
        return {}


def login(email, password):
    r = requests.post(f"{SUPA}/auth/v1/token?grant_type=password", json={"email": email.strip(), "password": password},
                      headers={"apikey": KEY}, timeout=30)
    d = _json(r)
    if r.status_code != 200:
        m = d.get("error_description") or d.get("msg") or d.get("error") or f"Σφάλμα {r.status_code}"
        raise Fail("Λάθος email ή κωδικός." if "Invalid login" in str(m) else str(m))
    return {"email": d["user"]["email"], "access_token": d["access_token"], "refresh_token": d["refresh_token"],
            "expires_at": time.time() + int(d.get("expires_in", 3600)) - 60}


def trial_login(code):
    r = requests.post(FN, json={"action": "demo_login", "key": code.strip()}, headers={"apikey": KEY}, timeout=60)
    d = _json(r)
    if r.status_code >= 400:
        raise Fail(d.get("error") or f"Σφάλμα {r.status_code}")
    return {"email": d.get("email") or "Δοκιμή", "access_token": d["access_token"], "refresh_token": d["refresh_token"],
            "expires_at": time.time() + int(d.get("expires_in", 3600)) - 60, "guest": True, "license": d.get("license")}


def refresh(s):
    r = requests.post(f"{SUPA}/auth/v1/token?grant_type=refresh_token", json={"refresh_token": s["refresh_token"]},
                      headers={"apikey": KEY}, timeout=30)
    if r.status_code != 200:
        return None
    d = r.json()
    s.update(access_token=d["access_token"], refresh_token=d["refresh_token"], expires_at=time.time() + int(d.get("expires_in", 3600)) - 60)
    return s


def save_session(s):
    DATA.mkdir(parents=True, exist_ok=True)
    tmp = SESSION.with_name(SESSION.name + ".tmp")
    tmp.write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, SESSION)


def device():
    """Ταυτότητα του υπολογιστή (ίδια με της εφαρμογής): ένας λογαριασμός δουλεύει σε ΕΝΑΝ υπολογιστή κάθε φορά."""
    import platform, uuid
    f = DATA / "device.json"
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
        if d.get("id"):
            return d
    except Exception:
        pass
    d = {"id": str(uuid.uuid4()), "name": platform.node() or "Υπολογιστής"}
    DATA.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    return d


def gw(s, action, **kw):
    dv = device()
    r = requests.post(FN, json={"action": action, "device": dv["id"], "device_name": dv["name"], **kw},
                      headers={"Authorization": f"Bearer {s['access_token']}", "apikey": KEY}, timeout=60)
    d = _json(r)
    if r.status_code >= 400:
        raise Fail(d.get("error") or f"Σφάλμα {r.status_code}")
    return d


def install_app(s, progress):
    r = requests.post(FN, json={"action": "app_url", "device": device()["id"]}, headers={"Authorization": f"Bearer {s['access_token']}", "apikey": KEY}, timeout=60)
    d = _json(r)
    if r.status_code >= 400:
        raise Fail(d.get("error") or f"Σφάλμα {r.status_code}")
    progress(0, f"Λήψη HEXIS MAPPING {d.get('version') or ''}…")
    with requests.get(d["url"], stream=True, timeout=60) as g:
        g.raise_for_status()
        n = int(g.headers.get("content-length") or 0); buf = io.BytesIO(); got = 0
        for ch in g.iter_content(1 << 16):
            buf.write(ch); got += len(ch)
            if n:
                progress(got / n * 0.9, f"Λήψη… {got / 1e6:.1f} / {n / 1e6:.1f} MB")
    progress(0.92, "Εγκατάσταση…")
    tmp = ROOT / "HEXIS_MAPPING.new"
    shutil.rmtree(tmp, ignore_errors=True)
    with zipfile.ZipFile(buf) as z:
        z.extractall(tmp)
    src = tmp / "HEXIS_MAPPING" if (tmp / "HEXIS_MAPPING").is_dir() else tmp
    if APP.exists():
        shutil.rmtree(APP, ignore_errors=True)
    shutil.move(str(src), str(APP))
    shutil.rmtree(tmp, ignore_errors=True)
    if not SERVER.exists():
        raise Fail("Η έκδοση που κατέβηκε δεν είναι πλήρης. Δοκίμασε ξανά.")
    progress(1, "Έτοιμο!")


# ---------------------------------------------------------------- παράθυρο
BG, INK, MUT, ACC, ERR = "#f6f8fc", "#0a1430", "#4a5876", "#2563eb", "#b3271e"
root = tk.Tk()
root.title("HEXIS MAPPING")
root.configure(bg=BG)
root.resizable(False, False)
try:
    root.iconbitmap(str(ROOT / "HEXIS_MAPPING.ico"))
except Exception:
    pass
F = ("Segoe UI", 10)
st = ttk.Style(root)
try:
    st.theme_use("vista")
except Exception:
    pass
st.configure("H.TButton", font=("Segoe UI", 10, "bold"), padding=(14, 6))

wrap = tk.Frame(root, bg=BG, padx=26, pady=20); wrap.pack()
try:
    logo = tk.PhotoImage(file=str(ROOT / "HEXIS_MAPPING.png")).subsample(4, 4)
    tk.Label(wrap, image=logo, bg=BG).grid(row=0, column=0, rowspan=2, sticky="nw", padx=(0, 14))
except Exception:
    pass
tk.Label(wrap, text="HEXIS MAPPING", font=("Segoe UI", 16, "bold"), fg=INK, bg=BG).grid(row=0, column=1, sticky="w")
sub = tk.Label(wrap, text="Πρώτη εκκίνηση: σύνδεση με τον λογαριασμό HEXIS", font=F, fg=MUT, bg=BG)
sub.grid(row=1, column=1, sticky="w")

form = tk.Frame(wrap, bg=BG, pady=12); form.grid(row=2, column=0, columnspan=2, sticky="we")
mode = tk.StringVar(value="acct")
v_email, v_pw, v_code = tk.StringVar(), tk.StringVar(), tk.StringVar()
try:
    old = json.loads(SESSION.read_text(encoding="utf-8"))
    v_email.set(old.get("email") or "")
except Exception:
    old = None

rows = {}


def lbl(t, r):
    w = tk.Label(form, text=t, font=F, fg=INK, bg=BG); w.grid(row=r, column=0, sticky="w", pady=4); return w


def ent(var, r, show=None):
    e = ttk.Entry(form, textvariable=var, width=34, font=F, show=show); e.grid(row=r, column=1, sticky="we", pady=4, padx=(10, 0)); return e


rows["acct"] = [lbl("Email", 0), ent(v_email, 0), lbl("Κωδικός", 1), ent(v_pw, 1, "•")]
rows["trial"] = [lbl("Κωδικός δοκιμής", 2), ent(v_code, 2)]


def show_mode():
    for k, ws in rows.items():
        for w in ws:
            (w.grid() if k == mode.get() else w.grid_remove())
    sw.config(text="Έχω λογαριασμό (email και κωδικό)" if mode.get() == "trial" else "Έχω κωδικό δωρεάν δοκιμής")
    sub.config(text="Πρώτη εκκίνηση: κωδικός δωρεάν δοκιμής" if mode.get() == "trial" else "Πρώτη εκκίνηση: σύνδεση με τον λογαριασμό HEXIS")


sw = tk.Label(wrap, text="", font=("Segoe UI", 9, "underline"), fg=ACC, bg=BG, cursor="hand2")
sw.grid(row=3, column=0, columnspan=2, sticky="w")
sw.bind("<Button-1>", lambda e: (mode.set("trial" if mode.get() == "acct" else "acct"), show_mode()))
bar = ttk.Progressbar(wrap, length=360, maximum=1.0); bar.grid(row=4, column=0, columnspan=2, sticky="we", pady=(14, 4)); bar.grid_remove()
msg = tk.Label(wrap, text="", font=F, fg=MUT, bg=BG, wraplength=380, justify="left"); msg.grid(row=5, column=0, columnspan=2, sticky="w")
btns = tk.Frame(wrap, bg=BG); btns.grid(row=6, column=0, columnspan=2, sticky="e", pady=(10, 0))
go = ttk.Button(btns, text="Σύνδεση και εγκατάσταση", style="H.TButton"); go.pack(side="right")
help_ = tk.Label(wrap, text="Δεν έχεις λογαριασμό; hexis-app.gr/mapping", font=("Segoe UI", 9), fg=MUT, bg=BG, cursor="hand2")
help_.grid(row=7, column=0, columnspan=2, sticky="w", pady=(10, 0))
help_.bind("<Button-1>", lambda e: __import__("webbrowser").open(HUB))
show_mode()


def ui(fn):
    root.after(0, fn)


def set_progress(p, t):
    ui(lambda: (bar.grid(), bar.configure(value=p), msg.config(text=t, fg=MUT)))


def worker():
    try:
        if mode.get() == "trial":
            if not v_code.get().strip():
                raise Fail("Γράψε τον κωδικό δοκιμής.")
            set_progress(0, "Έλεγχος κωδικού δοκιμής…")
            s = trial_login(v_code.get())
        elif old and old.get("refresh_token") and old.get("email") == v_email.get().strip() and not v_pw.get():
            set_progress(0, "Σύνδεση…")
            s = refresh(dict(old))
            if not s:
                raise Fail("Η προηγούμενη σύνδεση έληξε. Γράψε τον κωδικό σου.")
        else:
            if not v_email.get().strip() or not v_pw.get():
                raise Fail("Γράψε email και κωδικό.")
            set_progress(0, "Σύνδεση…")
            s = login(v_email.get(), v_pw.get())
        save_session(s)
        me = gw(s, "me")
        if not me.get("member"):
            raise Fail("Ο λογαριασμός δεν έχει ενεργή άδεια HEXIS MAPPING. Ζήτησε κλειδί άδειας ή κωδικό δοκιμής από το hexis-app.gr/mapping.")
        dv = me.get("device") or {}
        if not dv.get("mine", True):                     # ένας υπολογιστής κάθε φορά: μεταφορά εδώ;
            nm = (dv.get("active") or {}).get("name")
            ans = []
            ev = threading.Event()
            ui(lambda: (ans.append(__import__("tkinter.messagebox").messagebox.askyesno("HEXIS MAPPING",
                (f"Ο λογαριασμός σου δουλεύει τώρα στον υπολογιστή «{nm}»." if nm else "Αποδέσμευσες αυτόν τον υπολογιστή.")
                + "\n\nΈνας υπολογιστής κάθε φορά. Να μεταφερθεί σε αυτόν τον υπολογιστή;\n"
                  "(Ο άλλος σταματά να δουλεύει και τα έργα σου έρχονται εδώ.)", parent=root)), ev.set()))
            ev.wait()
            if not ans or not ans[0]:
                raise Fail("Δεν έγινε μεταφορά. Στον άλλον υπολογιστή πάτα «Αποδέσμευση» και ξαναδοκίμασε εδώ.")
            gw(s, "device_claim", force=True)
        elif not dv.get("exempt"):
            gw(s, "device_claim")                         # δέσμευση αυτού του υπολογιστή από την αρχή
        install_app(s, set_progress)
        ensure_shortcut()
        ui(lambda: root.after(600, lambda: (root.destroy(), _launch())))
    except requests.RequestException:
        ui(lambda: fail("Δεν υπάρχει σύνδεση στο διαδίκτυο. Έλεγξε τη σύνδεση και δοκίμασε ξανά."))
    except Fail as e:
        ui(lambda e=e: fail(str(e)))
    except Exception as e:
        ui(lambda e=e: fail(f"Κάτι πήγε στραβά: {e}"))


def fail(t):
    bar.grid_remove(); msg.config(text=t, fg=ERR); go.state(["!disabled"])


def start(*_):
    go.state(["disabled"]); msg.config(text="", fg=MUT)
    threading.Thread(target=worker, daemon=True).start()


_go = []


def _launch():
    _go.append(1)


go.config(command=start)
root.bind("<Return>", start)
root.update_idletasks()
root.geometry(f"+{(root.winfo_screenwidth() - root.winfo_width()) // 2}+{(root.winfo_screenheight() - root.winfo_height()) // 3}")
root.mainloop()
if _go:
    run_app()
