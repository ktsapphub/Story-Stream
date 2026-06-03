"""Stock media search across Pexels, Pixabay, and Unsplash.

Keys are read from env vars (added by the user later):
  PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY
A provider with a missing/empty key is simply skipped/disabled.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

APP_NAME = "content_studio_mydatejar"

PROVIDERS = ["pexels", "pixabay", "unsplash"]


def _key(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def provider_status() -> dict:
    return {
        "pexels": bool(_key("PEXELS_API_KEY")),
        "pixabay": bool(_key("PIXABAY_API_KEY")),
        "unsplash": bool(_key("UNSPLASH_ACCESS_KEY")),
    }


def is_configured(provider: str) -> bool:
    return provider_status().get(provider, False)


def search_pexels(query: str, page: int = 1, per_page: int = 20, kind: str = "photo"):
    key = _key("PEXELS_API_KEY")
    if not key:
        return []
    headers = {"Authorization": key}
    if kind == "video":
        url = "https://api.pexels.com/videos/search"
    else:
        url = "https://api.pexels.com/v1/search"
    resp = requests.get(url, headers=headers, params={"query": query, "page": page, "per_page": per_page}, timeout=12)
    resp.raise_for_status()
    data = resp.json()
    out = []
    if kind == "video":
        for v in data.get("videos", []):
            files = sorted(v.get("video_files", []), key=lambda f: (f.get("width") or 0))
            mid = files[len(files) // 2] if files else {}
            out.append({
                "provider": "pexels", "type": "video", "id": str(v.get("id")),
                "thumbnail_url": v.get("image"),
                "full_url": mid.get("link"),
                "width": v.get("width"), "height": v.get("height"),
                "photographer_name": (v.get("user") or {}).get("name"),
                "source_page_url": v.get("url"),
            })
    else:
        for p in data.get("photos", []):
            src = p.get("src", {})
            out.append({
                "provider": "pexels", "type": "photo", "id": str(p.get("id")),
                "thumbnail_url": src.get("tiny") or src.get("small"),
                "full_url": src.get("large2x") or src.get("original") or src.get("large"),
                "width": p.get("width"), "height": p.get("height"),
                "photographer_name": p.get("photographer"),
                "source_page_url": p.get("url"),
            })
    return out


def search_pixabay(query: str, page: int = 1, per_page: int = 20, kind: str = "photo"):
    key = _key("PIXABAY_API_KEY")
    if not key:
        return []
    per_page = max(3, min(per_page, 200))
    if kind == "video":
        base = "https://pixabay.com/api/videos/"
        params = {"key": key, "q": query, "page": page, "per_page": per_page}
    else:
        base = "https://pixabay.com/api/"
        params = {"key": key, "q": query, "page": page, "per_page": per_page, "image_type": "photo"}
    resp = requests.get(base, params=params, timeout=12)
    resp.raise_for_status()
    data = resp.json()
    out = []
    for h in data.get("hits", []):
        if kind == "video":
            vids = h.get("videos", {})
            small = vids.get("small") or vids.get("tiny") or vids.get("medium") or {}
            out.append({
                "provider": "pixabay", "type": "video", "id": str(h.get("id")),
                "thumbnail_url": (vids.get("tiny") or {}).get("thumbnail") or h.get("userImageURL"),
                "full_url": small.get("url"),
                "width": small.get("width"), "height": small.get("height"),
                "photographer_name": h.get("user"),
                "source_page_url": h.get("pageURL"),
            })
        else:
            out.append({
                "provider": "pixabay", "type": "photo", "id": str(h.get("id")),
                "thumbnail_url": h.get("previewURL") or h.get("webformatURL"),
                "full_url": h.get("largeImageURL") or h.get("webformatURL"),
                "width": h.get("imageWidth"), "height": h.get("imageHeight"),
                "photographer_name": h.get("user"),
                "source_page_url": h.get("pageURL"),
            })
    return out


def search_unsplash(query: str, page: int = 1, per_page: int = 20, kind: str = "photo"):
    key = _key("UNSPLASH_ACCESS_KEY")
    if not key or kind == "video":
        return []
    headers = {"Authorization": f"Client-ID {key}"}
    resp = requests.get("https://api.unsplash.com/search/photos", headers=headers,
                        params={"query": query, "page": page, "per_page": per_page}, timeout=12)
    resp.raise_for_status()
    data = resp.json()
    utm = f"?utm_source={APP_NAME}&utm_medium=referral"
    out = []
    for p in data.get("results", []):
        urls = p.get("urls", {})
        user = p.get("user", {}) or {}
        links = p.get("links", {}) or {}
        html = links.get("html")
        out.append({
            "provider": "unsplash", "type": "photo", "id": str(p.get("id")),
            "thumbnail_url": urls.get("thumb") or urls.get("small"),
            "full_url": urls.get("regular") or urls.get("full"),
            "width": p.get("width"), "height": p.get("height"),
            "photographer_name": user.get("name"),
            "source_page_url": f"{html}{utm}" if html else None,
        })
    return out


_SEARCHERS = {"pexels": search_pexels, "pixabay": search_pixabay, "unsplash": search_unsplash}


def search(provider: str, query: str, page: int = 1, per_page: int = 20, kind: str = "photo"):
    """Search a single provider or 'all'. Returns list of normalized items."""
    if provider == "all":
        results = []
        for p in PROVIDERS:
            if is_configured(p):
                try:
                    results.extend(_SEARCHERS[p](query, page, per_page, kind))
                except Exception:
                    logger.exception("stock search failed: %s", p)
        return results
    fn = _SEARCHERS.get(provider)
    if not fn:
        raise ValueError(f"Unknown provider: {provider}")
    return fn(query, page, per_page, kind)
