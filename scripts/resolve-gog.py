"""Resuelve los títulos de la librería GOG del usuario a IDs oficiales vía GOGDB.

Uso:
    python3 scripts/resolve-gog.py [start] [end]     (índices sobre la lista, para ir por tramos)
    python3 scripts/resolve-gog.py                   (todo)

Entrada:
    data/gog-library-raw.json   (lista [{"Titulo": "..."}])

Salida:
    data/gog-ids.json           (lista [{"userTitle","gogId","gogTitle","type","thumb","method"}])
    data/gog-review.json        (casos sin resultado o ambiguos, para revisión manual)

Cache:
    %TEMP%/opencode/gogdb-search/<n>.html
"""
import html
import json
import os
import re
import sys
import tempfile
import time
import unicodedata
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH = os.path.join(ROOT, "data", "gog-library-raw.json")
OUT_PATH = os.path.join(ROOT, "data", "gog-ids.json")
REVIEW_PATH = os.path.join(ROOT, "data", "gog-review.json")
CACHE_DIR = os.path.join(tempfile.gettempdir(), "opencode", "gogdb-search")

UA = {"User-Agent": "MySteamLibrary/1.0 (personal library matching, polite 1.2s delay)"}
DELAY = 1.2

ROW_RE = re.compile(
    r'<tr>\s*<td class="col-thumb">.*?<img[^>]*src="([^"]+)"[^>]*>.*?'
    r'<td class="col-id[^"]*">\s*<a[^>]*href="/product/(\d+)".*?'
    r'<td class="col-name([^"]*)">\s*<a[^>]*>(.*?)</a>.*?<td class="col-type">([^<]*)</td>',
    re.S,
)


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
    return re.sub(r"\s+", " ", s)


def search(title, idx):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{idx}.html")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read(), True
    q = urllib.parse.quote(title)
    req = urllib.request.Request(f"https://www.gogdb.org/products?search={q}", headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        page = r.read().decode("utf-8", errors="replace")
    with open(path, "w", encoding="utf-8") as f:
        f.write(page)
    return page, False


def pick(user_title, page):
    cands = []
    for thumb, pid, extra_cls, name, typ in ROW_RE.findall(page):
        name = html.unescape(" ".join(name.split()))
        cands.append({"id": int(pid), "title": name.strip(),
                      "type": typ.strip(), "thumb": thumb,
                      "unlisted": "prod-unlisted" in (extra_cls or "")})
    if not cands:
        return None, "no-results", []
    want = norm(user_title)
    exact = [c for c in cands if norm(c["title"]) == want]
    pool = exact or cands
    games = [c for c in pool if c["type"].lower() == "game"]
    chosen = (games or pool)[0]
    method = "exact-game" if exact and games else ("exact" if exact else "first-result")
    return chosen, method, [c for c in cands if c["id"] != chosen["id"]][:5]


def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end = int(sys.argv[2]) if len(sys.argv) > 2 else None
    with open(RAW_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    titles = [r.get("Titulo", "") for r in raw if r.get("Titulo")]
    if end is None:
        end = len(titles)

    prev = []
    if os.path.exists(OUT_PATH):
        with open(OUT_PATH, encoding="utf-8") as f:
            prev = json.load(f)
    by_title = {p["userTitle"]: p for p in prev}

    review = []
    if os.path.exists(REVIEW_PATH):
        with open(REVIEW_PATH, encoding="utf-8") as f:
            review = json.load(f)
    review_titles = {r["userTitle"] for r in review}

    done = cached = 0
    for idx in range(start, min(end, len(titles))):
        t = titles[idx]
        if t in by_title:
            done += 1
            continue
        try:
            page, was_cached = search(t, idx)
            cached += was_cached
            chosen, method, alts = pick(t, page)
            if chosen is None:
                if t not in review_titles:
                    review.append({"userTitle": t, "issue": "no-results"})
                    review_titles.add(t)
            else:
                by_title[t] = {"userTitle": t, "gogId": chosen["id"],
                               "gogTitle": chosen["title"], "type": chosen["type"],
                               "thumb": chosen["thumb"], "method": method,
                               "unlisted": chosen.get("unlisted", False)}
                if method == "first-result" and t not in review_titles:
                    review.append({"userTitle": t, "issue": "non-exact-match",
                                   "chosen": chosen,
                                   "alternatives": alts})
                    review_titles.add(t)
            done += 1
        except Exception as e:  # noqa: BLE001
            print(f"  [{idx}] {t} FALLO: {e}")
            was_cached = False
        if done % 20 == 0:
            print(f"  [{idx}] avance={done} cache={cached} revision={len(review)}")
        if not was_cached:
            time.sleep(DELAY)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump([by_title[t] for t in titles if t in by_title], f, ensure_ascii=False, indent=1)
    with open(REVIEW_PATH, "w", encoding="utf-8") as f:
        json.dump(review, f, ensure_ascii=False, indent=1)
    resolved = len(by_title)
    print(f"Resueltos: {resolved}/{len(titles)} · Revisar: {len(review)}")


if __name__ == "__main__":
    main()
