"""Segunda pasada: reintenta los 'no-results' con variantes de búsqueda.

Solo acepta coincidencias EXACTAS (normalizadas) para no meter falsos positivos.
Lo que siga sin aparecer quedará como entrada solo-título (mods, packs Prime, freebies no-GOG).
"""
import html
import json
import os
import re
import tempfile
import time
import unicodedata
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS_PATH = os.path.join(ROOT, "data", "gog-ids.json")
REVIEW_PATH = os.path.join(ROOT, "data", "gog-review.json")
CACHE_DIR = os.path.join(tempfile.gettempdir(), "opencode", "gogdb-search")

UA = {"User-Agent": "MySteamLibrary/1.0 (personal library matching, polite)"}
DELAY = 1.2
TRAILING = re.compile(r"\s+(\(19|20\d{2}\)|hd|demo|prologue|teaser|alpha(\s+version)?)\s*$", re.I)
PAREN = re.compile(r"\s*\((19|20)\d{2}\)\s*")

ROW_RE = re.compile(
    r'<tr>\s*<td class="col-thumb">.*?<img[^>]*src="([^"]+)"[^>]*>.*?'
    r'<td class="col-id[^"]*">\s*<a[^>]*href="/product/(\d+)".*?'
    r'<td class="col-name([^"]*)">\s*<a[^>]*>(.*?)</a>.*?<td class="col-type">([^<]*)</td>',
    re.S,
)


def norm(s):
    s = unicodedata.normalize("NFKD", (s or "").replace("�", "")).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
    return re.sub(r"\s+", " ", s)


def variants(t):
    out = [t]
    no_paren = PAREN.sub("", t).strip(" -:")
    if no_paren and no_paren != t:
        out.append(no_paren)
    no_trail = TRAILING.sub("", t).strip(" -:")
    if no_trail and no_trail not in out:
        out.append(no_trail)
    no_trail2 = TRAILING.sub("", no_paren).strip(" -:")
    if no_trail2 and no_trail2 not in out:
        out.append(no_trail2)
    # primer chunk significativo antes de ":" o " - " (para "Dagon: by H. P. Lovecraft" -> "Dagon")
    for sep in [":", " - "]:
        if sep in t:
            head = t.split(sep)[0].strip()
            if len(head) >= 4 and head not in out:
                out.append(head)
    # primera palabra (último recurso, ej. "Drekirkr" roto por encoding)
    first = re.sub(r"[^A-Za-z0-9 ]", "", t).split()
    if first and len(first[0]) >= 5 and first[0] not in out:
        out.append(first[0])
    return out


def fetch(title, idx):
    path = os.path.join(CACHE_DIR, f"pass2-{idx}.html")
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


def main():
    ids = json.load(open(IDS_PATH, encoding="utf-8"))
    by_title = {p["userTitle"]: p for p in ids}
    review = json.load(open(REVIEW_PATH, encoding="utf-8"))
    pending = [r["userTitle"] for r in review if r["issue"] == "no-results"
               and r["userTitle"] not in by_title]
    print(f"Reintentando: {len(pending)}")
    still = []
    for i, t in enumerate(pending):
        targets = {norm(v) for v in variants(t)}
        # también el normalizado "relajado" (sin marcador final demo/hd/prologue)
        targets.add(norm(TRAILING.sub("", t)))
        found = None
        for vi, v in enumerate(variants(t)):
            try:
                page, cached = fetch(v, i)
            except Exception as e:  # noqa: BLE001
                print(f"  {t} [{v}] FALLO red: {e}")
                continue
            cands = []
            for thumb, pid, extra_cls, name, typ in ROW_RE.findall(page):
                name = html.unescape(" ".join(name.split())).strip()
                cands.append({"id": int(pid), "title": name,
                              "type": typ.strip(), "thumb": thumb,
                              "unlisted": "prod-unlisted" in (extra_cls or "")})
            hits = [c for c in cands if norm(c["title"]) in targets]
            if hits:
                games = [c for c in hits if c["type"].lower() == "game"]
                found = (games or hits)[0]
                break
            if not cached:
                time.sleep(0.4)
        if found:
            by_title[t] = {"userTitle": t, "gogId": found["id"],
                           "gogTitle": found["title"], "type": found["type"],
                           "thumb": found["thumb"], "method": "pass2-exact",
                           "unlisted": found.get("unlisted", False)}
            print(f"  OK {t} => {found['id']} {found['title']}")
        else:
            still.append(t)
        time.sleep(DELAY)

    with open(IDS_PATH, "w", encoding="utf-8") as f:
        json.dump(list(by_title.values()), f, ensure_ascii=False, indent=1)
    print(f"Rescatados: {len(pending) - len(still)} · Sin resolver: {len(still)}")
    for t in still:
        print("  -", t)


if __name__ == "__main__":
    main()
