"""HEXIS-APP Νομοθεσία — συλλογή ΠΛΗΡΟΥΣ κειμένου άρθρων (ενοποιημένο, όπως ισχύει).
Πηγή: taxheaven.gr (σελίδες άρθρων νόμου). Γράφει nomothesia-fulltext/<key>.json.
Τρέχει από το workflow nomo-fulltext.yml (εβδομαδιαία + χειροκίνητα)."""
import os, re, json, time, html, datetime, urllib.parse, sys
import requests
from bs4 import BeautifulSoup

H = {'User-Agent': 'Mozilla/5.0 (HEXIS-APP legal index bot; brb.develop@gmail.com)'}
BASE = 'https://www.taxheaven.gr/law/'
# key καρτέλας : [(νόμος/έτος, τίτλος)]
LAWS = {
  'tagaras': [('5306/2026', 'ν. 5306/2026 — Κώδικας Χωροταξίας-Πολεοδομίας «Νικόλαος Ταγαράς»')],
  'nok':     [('4067/2012', 'ν. 4067/2012 — Νέος Οικοδομικός Κανονισμός')],
  'n4495':   [('4495/2017', 'ν. 4495/2017 — Έλεγχος και προστασία του δομημένου περιβάλλοντος')],
  'aig':     [('2971/2001', 'ν. 2971/2001 — Αιγιαλός, παραλία'), ('5092/2024', 'ν. 5092/2024 — Αιγιαλός, παραλία'), ('4258/2014', 'ν. 4258/2014 — Οριοθέτηση ρεμάτων')],
  'das':     [('998/1979', 'ν. 998/1979 — Προστασία δασών')],
  'ktim':    [('2664/1998', 'ν. 2664/1998 — Εθνικό Κτηματολόγιο'), ('5142/2024', 'ν. 5142/2024 — Κτηματολόγιο (διορθώσεις, γεωμετρικά στοιχεία)')],
}
OUT = 'nomothesia-fulltext'
os.makedirs(OUT, exist_ok=True)
S = requests.Session(); S.headers.update(H)

def get(u, tries=4):
    for i in range(tries):
        try:
            r = S.get(u, timeout=60)
            if r.status_code == 200: return r.text
            if r.status_code in (404, 410): return None
        except Exception as e:
            print('  retry', u, e)
        time.sleep(3 * (i + 1))
    return None

def txt(el):
    for br in el.find_all('br'): br.replace_with('\n')
    t = el.get_text('')
    t = html.unescape(t)
    t = re.sub(r'[ \t\r\f\v]+', ' ', t)
    t = re.sub(r' *\n *', '\n', t)
    # σπασμένες γραμμές μέσα σε πρόταση (παλαιοί νόμοι): ενώνονται όταν η επόμενη ξεκινά με πεζό
    t = re.sub(r'(?<![.:;·])\n(?![α-ωa-z]{1,3}[).]\s)(?=[α-ωάέήίόύώϊϋΐΰa-z])', ' ', t)
    t = re.sub(r'\n(\d{3,5}/\d{4})\n', r' \1 ', t)
    return t.strip()

def toc(law):
    page = get(BASE + law)
    if not page: return []
    seen, out = set(), []
    for h in re.findall(r'href="(https://www\.taxheaven\.gr/law/' + re.escape(law) + r'/arthro/[^"#?]+)"', page):
        if h in seen: continue
        seen.add(h); out.append(h)
    return out

def article(u):
    page = get(u)
    if not page: return None
    soup = BeautifulSoup(page, 'lxml')
    card = soup.select_one('.lawt-artview-card') or soup
    num = card.select_one('.lawt-artview-art-number')
    tit = card.select_one('.lawt-artview-art-title')
    paras = []
    for p in card.select('.lawt-artview-para'):
        lab = p.select_one('.lawt-artview-para-label')
        body = p.select_one('.lawt-artview-para-text')
        if not body: continue
        t = txt(body)
        if t: paras.append(t)
    if not paras:
        body = card.select_one('.lawt-artview-body')
        if body:
            t = txt(body)
            if t: paras.append(t)
    n = urllib.parse.unquote(u.rsplit('/', 1)[1]).replace('+', ' ')
    return {'n': n, 'l': (num.get_text(' ', strip=True) if num else 'Άρθρο ' + n),
            't': (tit.get_text(' ', strip=True) if tit else ''), 'p': paras}

only = sys.argv[1:]  # προαιρετικά: μόνο συγκεκριμένα keys
today = datetime.date.today().isoformat()
summary = []
for key, laws in LAWS.items():
    if only and key not in only: continue
    fn = f'{OUT}/{key}.json'
    old = {}
    if os.path.exists(fn):
        try: old = json.load(open(fn, encoding='utf8'))
        except Exception: old = {}
    data = {'key': key, 'src': 'taxheaven.gr — ενοποιημένο κείμενο (όπως ισχύει)', 'fetched': today, 'laws': []}
    for law, title in laws:
        links = toc(law)
        print(key, law, 'άρθρα:', len(links), flush=True)
        arts = []
        for u in links:
            a = article(u)
            if a and a['p']: arts.append(a)
            time.sleep(0.6)
        if not arts:
            # κράτα την προηγούμενη έκδοση αν η λήψη απέτυχε
            prev = [x for x in old.get('laws', []) if x.get('law') == law]
            if prev: data['laws'].append(prev[0]); print('  ⚠ κράτησα προηγούμενη έκδοση'); continue
            print('  ⚠ χωρίς άρθρα'); continue
        data['laws'].append({'law': law, 'title': title, 'url': BASE + law, 'arts': arts})
        summary.append(f'{key} {law}: {len(arts)} άρθρα')
    if data['laws']:
        json.dump(data, open(fn, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        print('  →', fn, os.path.getsize(fn) // 1024, 'KB')
open(f'{OUT}/index.json', 'w', encoding='utf8').write(json.dumps({'updated': today, 'summary': summary,
    'files': sorted(f[:-5] for f in os.listdir(OUT) if f.endswith('.json') and f != 'index.json')}, ensure_ascii=False, indent=1))
print('\n'.join(summary))
