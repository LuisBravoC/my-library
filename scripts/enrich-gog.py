"""Enriquece la librería GOG del usuario con metadata oficial (api.gog.com/v2).

Uso:
    python3 scripts/enrich-gog.py

Entrada:
    data/gog-library-raw.json   (export de getFilteredProducts: {"products": [{id, title, ...}]}
                                 o {"owned": [ids]} o lista directa)

Salida:
    public/data/gog-library.json  (lista normalizada lista para la app)

Cache:
    %TEMP%/opencode/gog-v2/{id}.json  (para reanudar sin re-descargar)
"""
import json
import os
import sys
import tempfile
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS_PATH = os.path.join(ROOT, "data", "gog-ids.json")
OUT_PATH = os.path.join(ROOT, "public", "data", "gog-library.json")
CACHE_DIR = os.path.join(tempfile.gettempdir(), "opencode", "gog-v2")

UA = {"User-Agent": "MySteamLibrary/1.0 (personal library enrichment)"}
DELAY = 0.5


def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def load_ids():
    """Lee data/gog-ids.json -> [(gogId, {userTitle, gogTitle, thumb, unlisted})].

    Lista (no dict) para conservar entradas que comparten ID
    (ej. 'Quake II' y 'Quake II RTX').
    """
    with open(IDS_PATH, encoding="utf-8") as f:
        items = json.load(f)
    pairs = []
    for p in items:
        gid = p.get("gogId")
        if not gid:
            continue
        pairs.append((int(gid), {"userTitle": p.get("userTitle", ""),
                                "gogTitle": p.get("gogTitle", ""),
                                "thumb": p.get("thumb", ""),
                                "unlisted": bool(p.get("unlisted", False)),
                                "type": p.get("type", "Game")}))
    return pairs


def unmatched_titles():
    """Títulos sin ID (mods, packs Prime...) para incluirlos como solo-título."""
    review_path = os.path.join(ROOT, "data", "gog-review.json")
    if not os.path.exists(review_path):
        return []
    review = json.load(open(review_path, encoding="utf-8"))
    with open(IDS_PATH, encoding="utf-8") as f:
        resolved = {p["userTitle"] for p in json.load(f)}
    return [r["userTitle"] for r in review
            if r["issue"] == "no-results" and r["userTitle"] not in resolved]


def fetch_v2(gid):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{gid}.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f), True
    d = get(f"https://api.gog.com/v2/games/{gid}")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)
    return d, False


def norm(d, fallback):
    emb = d.get("_embedded", {}) or {}
    prod = emb.get("product", {}) or {}
    links = d.get("_links", {}) or {}
    store = ((links.get("store") or {}).get("href")
             or f"https://www.gog.com/game/{d.get('slug', '')}")
    if store.startswith("/"):
        store = "https://www.gog.com" + store

    def names(lst):
        out = []
        for x in lst or []:
            n = x.get("name") if isinstance(x, dict) else x
            if n and n not in out:
                out.append(n)
        return out

    os_names = {str((o.get("operatingSystem") or {}).get("name", "")).lower()
                for o in (emb.get("supportedOperatingSystems") or [])}
    rel = prod.get("globalReleaseDate") or d.get("globalReleaseDate") or ""
    rel = str(rel)[:10]

    images = {
        "cover": (links.get("boxArtImage") or {}).get("href", ""),
        "background": (links.get("backgroundImage") or {}).get("href", ""),
        "logo": (links.get("logo") or {}).get("href", ""),
        "icon": (links.get("icon") or {}).get("href", ""),
    }
    thumb = fallback.get("thumb", "")
    if thumb:
        images["tile"] = thumb if thumb.startswith("http") else "https:" + thumb

    title = prod.get("title") or d.get("title") or ""
    return {
        "id": prod.get("id") or d.get("id"),
        "title": title or fallback.get("gogTitle") or fallback.get("userTitle", ""),
        "userTitle": fallback.get("userTitle", ""),
        "slug": d.get("slug", ""),
        "unlisted": fallback.get("unlisted", False),
        "kind": fallback.get("type", "Game"),
        "storeUrl": store,
        "images": images,
        "genres": names(emb.get("tags")),
        "features": names(emb.get("properties")),
        "developers": names(emb.get("developers")),
        "publishers": names(emb.get("publishers")),
        "releaseDate": rel,
        "win": "windows" in os_names,
        "mac": "mac" in os_names or "osx" in os_names,
        "linux": "linux" in os_names,
    }


def main():
    if not os.path.exists(IDS_PATH):
        print(f"Falta {IDS_PATH}: ejecuta antes scripts/resolve-gog.py.")
        sys.exit(1)
    base = load_ids()
    print(f"Juegos a enriquecer: {len(base)}")
    out, cached, failed = [], 0, []
    for i, (gid, fb) in enumerate(base, 1):
        try:
            d, was_cached = fetch_v2(gid)
            cached += was_cached
            out.append(norm(d, fb))
        except Exception as e:  # noqa: BLE001
            failed.append(gid)
            print(f"  [{i}/{len(base)}] id={gid} FALLO: {e}")
            out.append({"id": gid, "title": fb.get("gogTitle") or fb.get("userTitle", ""),
                        "userTitle": fb.get("userTitle", ""), "slug": "",
                        "unlisted": fb.get("unlisted", False), "kind": fb.get("type", "Game"),
                        "storeUrl": "", "images": {"tile": fb.get("thumb", "")},
                        "genres": [], "features": [], "developers": [], "publishers": [],
                        "releaseDate": "", "win": False, "mac": False, "linux": False,
                        "noMetadata": True})
        if i % 25 == 0 or i == len(base):
            print(f"  [{i}/{len(base)}] ok={len(out)} cache={cached} fallos={len(failed)}")
        time.sleep(DELAY)
    for t in unmatched_titles():
        out.append({"id": 0, "title": t, "userTitle": t, "slug": "",
                    "unlisted": False, "kind": "External",
                    "storeUrl": "", "images": {},
                    "genres": [], "features": [], "developers": [], "publishers": [],
                    "releaseDate": "", "win": False, "mac": False, "linux": False,
                    "noMetadata": True})
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"Escrito {OUT_PATH} con {len(out)} juegos. Fallos: {failed}")


if __name__ == "__main__":
    main()
