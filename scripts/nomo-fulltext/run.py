# Φάση 1: δείγματα για να δούμε τη μορφή των πηγών
import os, requests, time
os.makedirs('out-raw', exist_ok=True)
H={'User-Agent':'Mozilla/5.0 (HEXIS-APP legal index; contact brb.develop@gmail.com)'}
urls={
 'th_5306_1.html':'https://www.taxheaven.gr/law/5306/2026/arthro/1',
 'th_5306_220.html':'https://www.taxheaven.gr/law/5306/2026/arthro/220',
 'th_5306_251.html':'https://www.taxheaven.gr/law/5306/2026/arthro/251',
 'th_5306_law.html':'https://www.taxheaven.gr/law/5306/2026',
 'th_2664_19.html':'https://www.taxheaven.gr/law/2664/1998/arthro/19',
 'fek_a88.pdf':'https://ia37rg02wpsa01.blob.core.windows.net/fek/01/2026/20260100088.pdf',
}
for fn,u in urls.items():
    try:
        r=requests.get(u,headers=H,timeout=60)
        open('out-raw/'+fn,'wb').write(r.content)
        print(fn,r.status_code,len(r.content))
    except Exception as e: print(fn,'ERR',e)
    time.sleep(1.5)
if os.path.exists('out-raw/fek_a88.pdf') and os.path.getsize('out-raw/fek_a88.pdf')>100000:
    os.system('pdftotext out-raw/fek_a88.pdf out-raw/fek_a88.txt')
    os.remove('out-raw/fek_a88.pdf')
