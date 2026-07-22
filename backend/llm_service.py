"""LLM service: multi-provider text generation, scoring, transform, image gen.
Reuses the patterns proven in /app/tests/test_core.py.
"""
import os
import re
import json
import time
import base64
import asyncio
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

API_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Curated, verified model picker: key -> (provider, model, label)
MODELS = {
    "gpt-5": ("openai", "gpt-5", "OpenAI GPT-5"),
    "gpt-5-mini": ("openai", "gpt-5-mini", "OpenAI GPT-5 Mini"),
    "gpt-4o": ("openai", "gpt-4o", "OpenAI GPT-4o"),
    "claude-sonnet-4-6": ("anthropic", "claude-sonnet-4-6", "Claude Sonnet 4.6"),
    "gemini-2.5-pro": ("gemini", "gemini-2.5-pro", "Gemini 2.5 Pro"),
    "gemini-2.5-flash": ("gemini", "gemini-2.5-flash", "Gemini 2.5 Flash"),
}
DEFAULT_MODEL = "gpt-5"
IMAGE_MODEL = "gemini-3.1-flash-image-preview"


def list_models():
    return [
        {"key": k, "provider": v[0], "model": v[1], "label": v[2]}
        for k, v in MODELS.items()
    ]


def _resolve(model_key: str):
    return MODELS.get(model_key, MODELS[DEFAULT_MODEL])


def extract_json(text: str):
    """Robustly extract a JSON object from an LLM response, with light repair."""
    if not text:
        raise ValueError("Empty LLM response")
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        candidate = fenced.group(1)
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"No JSON found in response: {text[:160]}")
        candidate = text[start:end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        # Light repair: remove trailing commas before } or ]
        repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)
        return json.loads(repaired)


def _new_chat(model_key: str, system_message: str):
    provider, model, _ = _resolve(model_key)
    return LlmChat(
        api_key=API_KEY,
        session_id=f"cs-{int(time.time()*1000)}-{os.urandom(3).hex()}",
        system_message=system_message,
    ).with_model(provider, model)


async def _chat_json(model_key: str, system_message: str, prompt: str, retries: int = 2) -> dict:
    """Send a prompt and parse a JSON object, retrying on malformed JSON."""
    last_err = None
    for attempt in range(retries + 1):
        chat = _new_chat(model_key, system_message)
        p = prompt
        if attempt > 0:
            p = prompt + ("\n\nIMPORTANT: Respond with STRICT, valid JSON only \u2014 "
                          "no trailing commas, no comments, no text before or after the JSON object.")
        resp = await chat.send_message(UserMessage(text=p))
        try:
            return extract_json(resp)
        except (json.JSONDecodeError, ValueError) as e:
            last_err = e
            continue
    raise last_err if last_err else ValueError("Failed to parse JSON")


BLOG_SYSTEM = (
    "You are an expert content strategist and blog writer for My Date Jar, a warm, "
    "playful, premium lifestyle brand about AI-curated date ideas and unforgettable "
    "experiences. Your tone is friendly, inspiring, and delightful. "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)

BLOG_TEMPLATE = """Write a complete, original blog article about: "{topic}".
Desired tone: {tone}.
Desired length: {length}.
{reference}
Return ONLY a JSON object with EXACTLY these keys:
{{
  "title": "catchy SEO title",
  "slug": "url-safe-slug",
  "meta_description": "max 160 chars",
  "tags": ["3-6 short tags"],
  "excerpt": "1-2 sentence summary suitable for a newsletter teaser",
  "body_markdown": "full article in markdown with H2 (##) headings",
  "image_prompts": ["2-3 vivid prompts for a header image and in-article images"]
}}
No prose outside the JSON."""

LENGTHS = {
    "short": "300-450 words",
    "medium": "500-750 words",
    "long": "900-1300 words",
}


async def generate_blog(topic: str, model_key: str = DEFAULT_MODEL, tone: str = "warm and engaging",
                        length: str = "medium", reference_context: str = "", focus_topics=None) -> dict:
    reference = ""
    if reference_context:
        reference = (
            "\nUse the following reference material to inspire style, structure, and angles "
            "(create original look-alike content, do NOT copy verbatim):\n\"\"\"\n"
            + reference_context[:6000] + "\n\"\"\"\n"
        )
    if focus_topics:
        reference += "\nWeave in and emphasize these focus topics/themes: " + ", ".join(focus_topics) + ".\n"
    prompt = BLOG_TEMPLATE.format(
        topic=topic, tone=tone, length=LENGTHS.get(length, LENGTHS["medium"]), reference=reference
    )
    data = await _chat_json(model_key, BLOG_SYSTEM, prompt)
    required = ["title", "slug", "meta_description", "tags", "excerpt", "body_markdown", "image_prompts"]
    for k in required:
        data.setdefault(k, "" if k not in ("tags", "image_prompts") else [])
    return data


async def generate_blog_batch(topics, model_key=DEFAULT_MODEL, tone="warm and engaging",
                              length="medium", reference_context="", concurrency=5,
                              on_item=None, focus_topics=None):
    """Generate multiple blogs concurrently. on_item(index, result_or_exc) callback."""
    sem = asyncio.Semaphore(concurrency)

    async def one(idx, topic):
        async with sem:
            try:
                res = await generate_blog(topic, model_key, tone, length, reference_context, focus_topics)
                if on_item:
                    await on_item(idx, res, None)
                return res
            except Exception as e:
                logger.exception("Batch item failed")
                if on_item:
                    await on_item(idx, None, e)
                return e

    return await asyncio.gather(*[one(i, t) for i, t in enumerate(topics)])


SCORE_SYSTEM = (
    "You are a strict editorial quality reviewer. "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)
SCORE_TEMPLATE = """Evaluate this content for quality.

TITLE: {title}
CONTENT:
{body}

Return ONLY a JSON object with EXACTLY these keys:
{{
  "overall_score": number 0-100,
  "breakdown": {{
    "readability": number 0-100,
    "seo": number 0-100,
    "engagement": number 0-100,
    "originality": number 0-100,
    "structure": number 0-100
  }},
  "suggestions": ["3-5 concrete improvement suggestions"]
}}"""


async def score_content(title: str, body: str, model_key: str = DEFAULT_MODEL) -> dict:
    prompt = SCORE_TEMPLATE.format(title=title, body=body[:5000])
    data = await _chat_json(model_key, SCORE_SYSTEM, prompt)
    data.setdefault("overall_score", 0)
    data.setdefault("breakdown", {})
    data.setdefault("suggestions", [])
    return data


NL_SYSTEM = (
    "You are an email newsletter editor for My Date Jar, a warm, playful lifestyle brand. "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)
NL_FROM_BLOG = """Transform this blog article into a newsletter entry.

TITLE: {title}
EXCERPT: {excerpt}
BODY:
{body}

Return ONLY a JSON object with EXACTLY these keys:
{{
  "subject": "compelling email subject line",
  "preheader": "short preview text",
  "sections": [{{"heading": "string", "content": "string (markdown ok)"}}],
  "cta_text": "call to action button text",
  "cta_url": "https://mydatejar.com"
}}"""

NL_FROM_PROMPT = """Write an email newsletter about: "{topic}".
Desired tone: {tone}.
{reference}
Return ONLY a JSON object with EXACTLY these keys:
{{
  "subject": "compelling email subject line",
  "preheader": "short preview text",
  "title": "newsletter title",
  "excerpt": "1-2 sentence summary",
  "sections": [{{"heading": "string", "content": "string (markdown ok)"}}],
  "cta_text": "call to action button text",
  "cta_url": "https://mydatejar.com"
}}"""


async def transform_to_newsletter(blog: dict, model_key: str = DEFAULT_MODEL) -> dict:
    prompt = NL_FROM_BLOG.format(
        title=blog.get("title", ""), excerpt=blog.get("excerpt", ""),
        body=(blog.get("body_markdown", "") or "")[:5000])
    data = await _chat_json(model_key, NL_SYSTEM, prompt)
    data.setdefault("sections", [])
    return data


async def generate_newsletter(topic: str, model_key: str = DEFAULT_MODEL,
                              tone: str = "warm and engaging", reference_context: str = "", focus_topics=None) -> dict:
    reference = ""
    if reference_context:
        reference = ("\nUse this reference material for inspiration (original look-alike, no copying):\n\"\"\"\n"
                     + reference_context[:6000] + "\n\"\"\"\n")
    if focus_topics:
        reference += "\nWeave in and emphasize these focus topics/themes: " + ", ".join(focus_topics) + ".\n"
    prompt = NL_FROM_PROMPT.format(topic=topic, tone=tone, reference=reference)
    data = await _chat_json(model_key, NL_SYSTEM, prompt)
    data.setdefault("sections", [])
    return data


async def generate_image(prompt: str) -> dict:
    """Generate an image via Nano Banana. Returns {data(base64), mime_type, ext}."""
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"cs-img-{int(time.time()*1000)}-{os.urandom(3).hex()}",
        system_message="You are a helpful AI assistant that generates beautiful, professional images.",
    ).with_model("gemini", IMAGE_MODEL).with_params(modalities=["image", "text"])
    msg = UserMessage(text=f"Generate a high-quality, professional, photorealistic blog image: {prompt}")
    _text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        raise ValueError("No image was generated")
    img = images[0]
    mime = img.get("mime_type", "image/png")
    ext = "png" if "png" in mime else ("jpg" if "jpeg" in mime or "jpg" in mime else "png")
    return {"data": img["data"], "mime_type": mime, "ext": ext, "bytes": base64.b64decode(img["data"])}


async def summarize_source(text: str) -> dict:
    """Summarize reference source text into summary + topics."""
    chat = _new_chat("gemini-2.5-flash", (
        "You analyze content for a content team. "
        "You ALWAYS respond with a single valid JSON object and nothing else."))
    prompt = (
        "Analyze the following source content and return ONLY JSON:\n"
        '{"summary": "3-4 sentence summary", "topics": ["5-8 key topics/keywords"], '
        '"tone": "short description of tone/style"}\n\nCONTENT:\n' + text[:6000]
    )
    resp = await chat.send_message(UserMessage(text=prompt))
    try:
        data = extract_json(resp)
    except Exception:
        data = {"summary": text[:300], "topics": [], "tone": ""}
    data.setdefault("summary", "")
    data.setdefault("topics", [])
    data.setdefault("tone", "")
    return data



TOPIC_SYSTEM = (
    "You build a topic knowledge base for a warm lifestyle/date-ideas brand. "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)


async def derive_topics(text: str, count: int = 8) -> list:
    """Derive a list of {name, description} topics from source text."""
    prompt = (
        f"From the following content, extract up to {count} distinct, reusable content TOPICS. "
        "For each topic give a short name (2-4 words) and a 1-2 sentence description explaining the topic "
        "and why it makes good content.\n"
        'Return ONLY JSON: {"topics": [{"name": "string", "description": "string"}]}\n\n'
        "CONTENT:\n" + (text or "")[:6000]
    )
    try:
        data = await _chat_json("gemini-2.5-flash", TOPIC_SYSTEM, prompt)
    except Exception:
        return []
    out = []
    for t in data.get("topics", []) or []:
        name = (t.get("name") or "").strip()
        if name:
            out.append({"name": name, "description": (t.get("description") or "").strip()})
    return out


async def describe_topic(name: str, context: str = "") -> str:
    """Generate a concise description for a single topic, optionally using context."""
    ctx = f"\nReference context:\n{context[:3000]}\n" if context else ""
    prompt = (
        f'Write a concise 1-2 sentence description for the content topic: "{name}".{ctx}'
        '\nReturn ONLY JSON: {"description": "string"}'
    )
    try:
        data = await _chat_json("gemini-2.5-flash", TOPIC_SYSTEM, prompt)
        return (data.get("description") or "").strip()
    except Exception:
        return ""


async def rank_newsletter_order(items, model_key: str = "gemini-2.5-flash") -> dict:
    """Rank the CURRENT order of newsletter sections for reader experience.
    items: list of {title, excerpt, score}. Returns readability/appeal/overall + suggested_order (1-based) + rationale.
    """
    listing = "\n".join(
        f"{i+1}. {it.get('title','')} — {(it.get('excerpt') or '')[:160]} (quality {it.get('score', 'n/a')})"
        for i, it in enumerate(items)
    )
    prompt = (
        "You are an expert email newsletter editor. Evaluate the CURRENT order of the story sections "
        "below for overall reader experience (strong hook first, good flow, varied appeal). "
        "Return ONLY a JSON object with EXACTLY these keys:\n"
        '{"readability": number 0-100, "appeal": number 0-100, "overall": number 0-100, '
        '"suggested_order": [array of 1-based indices in the ideal order], '
        '"rationale": "1-2 sentence explanation"}\n\n'
        "SECTIONS (current order):\n" + listing
    )
    data = await _chat_json(model_key, NL_SYSTEM, prompt)
    n = len(items)
    order = data.get("suggested_order") or list(range(1, n + 1))
    # sanitize order: valid 1-based unique indices covering all items
    clean = []
    seen = set()
    for x in order:
        try:
            xi = int(x)
        except (TypeError, ValueError):
            continue
        if 1 <= xi <= n and xi not in seen:
            seen.add(xi)
            clean.append(xi)
    for i in range(1, n + 1):
        if i not in seen:
            clean.append(i)
    return {
        "readability": data.get("readability", 0),
        "appeal": data.get("appeal", 0),
        "overall": data.get("overall", 0),
        "suggested_order": clean,
        "rationale": data.get("rationale", ""),
    }
