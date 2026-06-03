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
    """Robustly extract a JSON object from an LLM response."""
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
    return json.loads(candidate)


def _new_chat(model_key: str, system_message: str):
    provider, model, _ = _resolve(model_key)
    return LlmChat(
        api_key=API_KEY,
        session_id=f"cs-{int(time.time()*1000)}-{os.urandom(3).hex()}",
        system_message=system_message,
    ).with_model(provider, model)


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
    chat = _new_chat(model_key, BLOG_SYSTEM)
    prompt = BLOG_TEMPLATE.format(
        topic=topic, tone=tone, length=LENGTHS.get(length, LENGTHS["medium"]), reference=reference
    )
    resp = await chat.send_message(UserMessage(text=prompt))
    data = extract_json(resp)
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
    chat = _new_chat(model_key, SCORE_SYSTEM)
    resp = await chat.send_message(UserMessage(text=SCORE_TEMPLATE.format(title=title, body=body[:5000])))
    data = extract_json(resp)
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
    chat = _new_chat(model_key, NL_SYSTEM)
    prompt = NL_FROM_BLOG.format(
        title=blog.get("title", ""), excerpt=blog.get("excerpt", ""),
        body=(blog.get("body_markdown", "") or "")[:5000])
    resp = await chat.send_message(UserMessage(text=prompt))
    data = extract_json(resp)
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
    chat = _new_chat(model_key, NL_SYSTEM)
    prompt = NL_FROM_PROMPT.format(topic=topic, tone=tone, reference=reference)
    resp = await chat.send_message(UserMessage(text=prompt))
    data = extract_json(resp)
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
