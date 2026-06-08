"""Connections registry + live testing for the Settings hub.

Each connection declares its category, fields (some secret), and whether it
supports live connection testing and live usage limits. Saved values live in
the `settings` MongoDB collection (owner-scoped). Secrets are returned in full
to the authenticated owner (so they can reveal them in the UI) and the frontend
masks them by default with a show/hide toggle.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

# Map (provider, field) -> env var for backward-compatible fallback values.
ENV_FALLBACK = {
    ("ai_llm", "api_key"): "EMERGENT_LLM_KEY",
    ("pexels", "api_key"): "PEXELS_API_KEY",
    ("pixabay", "api_key"): "PIXABAY_API_KEY",
    ("unsplash", "api_key"): "UNSPLASH_ACCESS_KEY",
}

# ----------------------- Connection registry -----------------------
CONNECTIONS = [
    {
        "key": "ai_llm",
        "name": "AI / LLM (Emergent Universal Key)",
        "category": "AI & Content",
        "icon": "sparkles",
        "description": "Powers text generation (OpenAI GPT, Anthropic Claude, Google Gemini) and image generation (Nano Banana).",
        "docs_url": "https://app.emergent.sh",
        "managed": True,  # read-only: provisioned by the platform
        "supports_test": True,
        "supports_live_usage": False,
        "fields": [
            {"key": "api_key", "label": "Universal Key", "type": "password", "secret": True, "required": True, "placeholder": "sk-emergent-..."},
        ],
    },
    {
        "key": "pexels",
        "name": "Pexels",
        "category": "Stock Images",
        "icon": "image",
        "description": "Free stock photos & videos. Add your Pexels API key to enable in-app stock search.",
        "docs_url": "https://www.pexels.com/api/",
        "supports_test": True,
        "supports_live_usage": True,
        "fields": [
            {"key": "api_key", "label": "API Key", "type": "password", "secret": True, "required": True, "placeholder": "Your Pexels API key"},
        ],
    },
    {
        "key": "pixabay",
        "name": "Pixabay",
        "category": "Stock Images",
        "icon": "image",
        "description": "Free images & videos. Add your Pixabay API key to enable stock search.",
        "docs_url": "https://pixabay.com/api/docs/",
        "supports_test": True,
        "supports_live_usage": True,
        "fields": [
            {"key": "api_key", "label": "API Key", "type": "password", "secret": True, "required": True, "placeholder": "Your Pixabay API key"},
        ],
    },
    {
        "key": "unsplash",
        "name": "Unsplash",
        "category": "Stock Images",
        "icon": "image",
        "description": "High-quality stock photos. Add your Unsplash Access Key to enable stock search.",
        "docs_url": "https://unsplash.com/developers",
        "supports_test": True,
        "supports_live_usage": True,
        "fields": [
            {"key": "api_key", "label": "Access Key", "type": "password", "secret": True, "required": True, "placeholder": "Your Unsplash Access Key"},
        ],
    },
    {
        "key": "wordpress",
        "name": "WordPress",
        "category": "Publishing",
        "icon": "globe",
        "description": "Publish content directly to your WordPress site. Connect with an application password (username + password) or an API key.",
        "docs_url": "https://wordpress.org/documentation/article/application-passwords/",
        "supports_test": True,
        "supports_live_usage": False,
        "fields": [
            {"key": "site_url", "label": "Site URL", "type": "text", "secret": False, "required": True, "placeholder": "https://yourblog.com"},
            {"key": "auth_method", "label": "Connection method", "type": "select", "secret": False, "required": True, "default": "app_password",
             "options": [
                 {"value": "app_password", "label": "Application Password (username + password)"},
                 {"value": "api_key", "label": "API Key (Bearer token)"},
             ]},
            {"key": "username", "label": "Username", "type": "text", "secret": False, "placeholder": "admin",
             "visible_when": {"field": "auth_method", "in": ["app_password", "api_key"]},
             "required_when": {"field": "auth_method", "in": ["app_password"]}},
            {"key": "app_password", "label": "Application Password", "type": "password", "secret": True, "required": True, "placeholder": "xxxx xxxx xxxx xxxx",
             "visible_when": {"field": "auth_method", "in": ["app_password"]}},
            {"key": "api_key", "label": "API Key", "type": "password", "secret": True, "required": True, "placeholder": "Your WordPress API key / token",
             "visible_when": {"field": "auth_method", "in": ["api_key"]}},
        ],
    },
    {
        "key": "zapier",
        "name": "Zapier",
        "category": "Automation & Email",
        "icon": "zap",
        "description": "Trigger Zaps via a Catch Hook webhook URL to automate downstream workflows.",
        "docs_url": "https://zapier.com/apps/webhook/integrations",
        "supports_test": True,
        "supports_live_usage": False,
        "fields": [
            {"key": "webhook_url", "label": "Catch Hook URL", "type": "password", "secret": True, "required": True, "placeholder": "https://hooks.zapier.com/hooks/catch/..."},
        ],
    },
    {
        "key": "sendgrid",
        "name": "SendGrid",
        "category": "Automation & Email",
        "icon": "mail",
        "description": "Send newsletters and transactional email through SendGrid.",
        "docs_url": "https://docs.sendgrid.com/api-reference",
        "supports_test": True,
        "supports_live_usage": False,
        "fields": [
            {"key": "api_key", "label": "API Key", "type": "password", "secret": True, "required": True, "placeholder": "SG.xxxxxxxx"},
            {"key": "from_email", "label": "From Email", "type": "text", "secret": False, "required": False, "placeholder": "hello@mydatejar.com"},
        ],
    },
    {
        "key": "reachinbox",
        "name": "ReachInbox",
        "category": "Automation & Email",
        "icon": "mail",
        "description": "Connect ReachInbox for cold email / outbound campaigns. Provide your API key and base URL.",
        "docs_url": "https://reachinbox.ai",
        "supports_test": True,
        "supports_live_usage": False,
        "fields": [
            {"key": "api_key", "label": "API Key", "type": "password", "secret": True, "required": True, "placeholder": "Your ReachInbox API key"},
            {"key": "base_url", "label": "Base URL", "type": "text", "secret": False, "required": False, "placeholder": "https://api.reachinbox.ai"},
        ],
    },
]

CONN_BY_KEY = {c["key"]: c for c in CONNECTIONS}


# ----------------------- Value resolution -----------------------
def env_value(provider: str, field_key: str) -> str:
    env = ENV_FALLBACK.get((provider, field_key))
    return (os.environ.get(env) or "").strip() if env else ""


def effective_value(provider: str, field_key: str, saved_values) -> str:
    """Saved DB value wins; otherwise fall back to env var (if any)."""
    saved_values = saved_values or {}
    v = saved_values.get(field_key)
    if isinstance(v, str) and v.strip():
        return v.strip()
    if v not in (None, "", []):
        return v
    return env_value(provider, field_key)


def effective_values(provider: str, saved_values) -> dict:
    c = CONN_BY_KEY.get(provider, {})
    out = {}
    for f in c.get("fields", []):
        v = effective_value(provider, f["key"], saved_values)
        if (v is None or v == "") and f.get("default") is not None:
            v = f["default"]
        out[f["key"]] = v
    return out


def field_visible(field: dict, values: dict) -> bool:
    cond = field.get("visible_when")
    if not cond:
        return True
    return (values or {}).get(cond.get("field")) in cond.get("in", [])


def field_required(field: dict, values: dict) -> bool:
    if field.get("required"):
        return True
    rw = field.get("required_when")
    if rw:
        return (values or {}).get(rw.get("field")) in rw.get("in", [])
    return False


def is_configured(provider: str, saved_values) -> bool:
    c = CONN_BY_KEY.get(provider)
    if not c:
        return False
    vals = effective_values(provider, saved_values)
    for f in c["fields"]:
        if field_visible(f, vals) and field_required(f, vals):
            if not str(vals.get(f["key"]) or "").strip():
                return False
    return True


# ----------------------- Usage helpers -----------------------
def _to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return v


def usage_from_headers(headers) -> dict | None:
    """Extract rate-limit info from response headers (case-insensitive)."""
    if headers is None:
        return None
    lim = headers.get("X-Ratelimit-Limit") or headers.get("X-RateLimit-Limit")
    rem = headers.get("X-Ratelimit-Remaining") or headers.get("X-RateLimit-Remaining")
    reset = headers.get("X-Ratelimit-Reset") or headers.get("X-RateLimit-Reset")
    if lim is None and rem is None:
        return None
    out = {}
    if lim is not None:
        out["limit"] = _to_int(lim)
    if rem is not None:
        out["remaining"] = _to_int(rem)
    if reset is not None:
        out["reset"] = reset
    return out


def _result(connected: bool, message: str, usage: dict | None = None) -> dict:
    return {"connected": connected, "message": message, "usage": usage}


# ----------------------- Per-provider tests -----------------------
TIMEOUT = 12


def _test_pexels(vals):
    key = (vals.get("api_key") or "").strip()
    if not key:
        return _result(False, "Add an API key first.")
    try:
        r = requests.get("https://api.pexels.com/v1/search", headers={"Authorization": key},
                         params={"query": "nature", "per_page": 1}, timeout=TIMEOUT)
        if r.status_code == 200:
            return _result(True, "Connected to Pexels.", usage_from_headers(r.headers))
        if r.status_code in (401, 403):
            return _result(False, "Invalid Pexels API key.")
        return _result(False, f"Pexels returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach Pexels: {e}")


def _test_pixabay(vals):
    key = (vals.get("api_key") or "").strip()
    if not key:
        return _result(False, "Add an API key first.")
    try:
        r = requests.get("https://pixabay.com/api/", params={"key": key, "q": "nature", "per_page": 3}, timeout=TIMEOUT)
        if r.status_code == 200:
            return _result(True, "Connected to Pixabay.", usage_from_headers(r.headers))
        if r.status_code in (400, 401, 403):
            return _result(False, "Invalid Pixabay API key.")
        return _result(False, f"Pixabay returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach Pixabay: {e}")


def _test_unsplash(vals):
    key = (vals.get("api_key") or "").strip()
    if not key:
        return _result(False, "Add an Access Key first.")
    try:
        r = requests.get("https://api.unsplash.com/search/photos",
                         headers={"Authorization": f"Client-ID {key}"},
                         params={"query": "nature", "per_page": 1}, timeout=TIMEOUT)
        if r.status_code == 200:
            return _result(True, "Connected to Unsplash.", usage_from_headers(r.headers))
        if r.status_code in (401, 403):
            return _result(False, "Invalid Unsplash Access Key.")
        return _result(False, f"Unsplash returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach Unsplash: {e}")


def _test_wordpress(vals):
    site = (vals.get("site_url") or "").strip().rstrip("/")
    if not site:
        return _result(False, "Provide your site URL.")
    if not site.startswith("http"):
        site = "https://" + site
    method = (vals.get("auth_method") or "app_password").strip()
    url = f"{site}/wp-json/wp/v2/users/me"
    try:
        if method == "api_key":
            key = (vals.get("api_key") or "").strip()
            if not key:
                return _result(False, "Add an API key first.")
            user = (vals.get("username") or "").strip()
            if user:
                # Plugin-style: username + key via Basic auth (e.g. Application Passwords)
                r = requests.get(url, params={"context": "edit"}, auth=(user, key), timeout=TIMEOUT)
            else:
                # Token-style: key as Bearer token
                r = requests.get(url, params={"context": "edit"},
                                 headers={"Authorization": f"Bearer {key}"}, timeout=TIMEOUT)
        else:
            user = (vals.get("username") or "").strip()
            pw = (vals.get("app_password") or "").strip()
            if not (user and pw):
                return _result(False, "Provide username and application password.")
            r = requests.get(url, params={"context": "edit"}, auth=(user, pw), timeout=TIMEOUT)
        if r.status_code == 200:
            name = ""
            try:
                name = r.json().get("name", "")
            except Exception:
                pass
            return _result(True, f"Connected as {name}." if name else "Connected to WordPress.")
        if r.status_code in (401, 403):
            return _result(False, "Invalid WordPress credentials.")
        return _result(False, f"WordPress returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach WordPress: {e}")


def _test_sendgrid(vals):
    key = (vals.get("api_key") or "").strip()
    if not key:
        return _result(False, "Add an API key first.")
    try:
        r = requests.get("https://api.sendgrid.com/v3/scopes",
                         headers={"Authorization": f"Bearer {key}"}, timeout=TIMEOUT)
        if r.status_code == 200:
            return _result(True, "Connected to SendGrid.", usage_from_headers(r.headers))
        if r.status_code in (401, 403):
            return _result(False, "Invalid SendGrid API key.")
        return _result(False, f"SendGrid returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach SendGrid: {e}")


def _test_zapier(vals):
    url = (vals.get("webhook_url") or "").strip()
    if not url:
        return _result(False, "Add a Catch Hook URL first.")
    try:
        r = requests.post(url, json={"event": "connection_test", "source": "Content Studio"}, timeout=TIMEOUT)
        if 200 <= r.status_code < 300:
            return _result(True, "Webhook reachable — test event sent.")
        return _result(False, f"Zapier webhook returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach Zapier webhook: {e}")


def _test_reachinbox(vals):
    key = (vals.get("api_key") or "").strip()
    base = (vals.get("base_url") or "").strip().rstrip("/")
    if not key:
        return _result(False, "Add an API key first.")
    if not base:
        return _result(True, "Key saved. Add a Base URL to verify connectivity.")
    try:
        r = requests.get(base, headers={"Authorization": f"Bearer {key}"}, timeout=TIMEOUT)
        if r.status_code < 500:
            return _result(True, f"Endpoint reachable (HTTP {r.status_code}).")
        return _result(False, f"ReachInbox returned HTTP {r.status_code}.")
    except Exception as e:
        return _result(False, f"Could not reach ReachInbox: {e}")


def _test_ai_llm(vals):
    key = (vals.get("api_key") or "").strip()
    if key:
        return _result(True, "Universal key is active and powering AI features.")
    return _result(False, "Universal key not found in environment.")


_TESTERS = {
    "ai_llm": _test_ai_llm,
    "pexels": _test_pexels,
    "pixabay": _test_pixabay,
    "unsplash": _test_unsplash,
    "wordpress": _test_wordpress,
    "sendgrid": _test_sendgrid,
    "zapier": _test_zapier,
    "reachinbox": _test_reachinbox,
}


def run_test(provider: str, values: dict) -> dict:
    """Run a live connection test for a provider. Blocking (run in a thread)."""
    fn = _TESTERS.get(provider)
    if not fn:
        return _result(False, "Testing is not supported for this connection.")
    return fn(values or {})


# ----------------------- Platform / tech stack -----------------------
def platform_info() -> dict:
    return {
        "name": "Content Studio",
        "brand": "My Date Jar",
        "description": "AI-powered blog & newsletter content generation studio.",
        "groups": [
            {
                "title": "Frontend",
                "icon": "monitor",
                "items": [
                    {"name": "React", "detail": "SPA UI framework"},
                    {"name": "React Router", "detail": "Client-side routing"},
                    {"name": "Tailwind CSS", "detail": "Utility-first styling"},
                    {"name": "shadcn/ui", "detail": "Accessible component library"},
                    {"name": "Axios", "detail": "HTTP client"},
                    {"name": "Lucide", "detail": "Icon set"},
                ],
            },
            {
                "title": "Backend",
                "icon": "server",
                "items": [
                    {"name": "FastAPI", "detail": "Python async API framework"},
                    {"name": "Motor", "detail": "Async MongoDB driver"},
                    {"name": "Pydantic", "detail": "Validation & serialization"},
                    {"name": "JWT Auth", "detail": "Token-based authentication"},
                    {"name": "fpdf2", "detail": "PDF export rendering"},
                ],
            },
            {
                "title": "Database & Storage",
                "icon": "database",
                "items": [
                    {"name": "MongoDB", "detail": "Primary data store (UUID keys)"},
                    {"name": "Object Storage", "detail": "Media & image assets"},
                ],
            },
            {
                "title": "AI & Generation",
                "icon": "sparkles",
                "items": [
                    {"name": "OpenAI GPT", "detail": "Text generation"},
                    {"name": "Anthropic Claude", "detail": "Text generation"},
                    {"name": "Google Gemini", "detail": "Text generation"},
                    {"name": "Nano Banana", "detail": "AI image generation"},
                    {"name": "Emergent Universal Key", "detail": "Single key across providers"},
                ],
            },
            {
                "title": "Infrastructure",
                "icon": "boxes",
                "items": [
                    {"name": "Kubernetes", "detail": "Container orchestration"},
                    {"name": "Supervisor", "detail": "Process management"},
                    {"name": "Nginx Ingress", "detail": "Routing /api → backend"},
                ],
            },
        ],
    }
