"""
Content Studio - Core POC
Validates the hardest, most failure-prone parts in isolation before building the app:
  1. Multi-provider LLM text generation -> structured blog JSON (OpenAI, Anthropic, Gemini)
  2. Batch generation of 5 pieces concurrently (asyncio)
  3. Nano Banana image generation (returns base64 we can store/display)
  4. Quality scoring via LLM -> strict JSON (score + rubric + suggestions)
  5. Blog -> Newsletter transformation -> structured JSON

Run: python /app/tests/test_core.py
"""
import asyncio
import os
import json
import re
import base64
import time
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage

API_KEY = os.getenv("EMERGENT_LLM_KEY")

# Curated model picker (provider, model)
MODELS = {
    "openai": ("openai", "gpt-5"),
    "anthropic": ("anthropic", "claude-sonnet-4-6"),
    "gemini": ("gemini", "gemini-2.5-pro"),
}
IMAGE_MODEL = "gemini-3.1-flash-image-preview"


def extract_json(text: str):
    """Robustly extract a JSON object from an LLM response."""
    if not text:
        raise ValueError("Empty response")
    # Strip markdown code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        candidate = fenced.group(1)
    else:
        # Grab first { ... last }
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"No JSON found in: {text[:200]}")
        candidate = text[start:end + 1]
    return json.loads(candidate)


BLOG_SYSTEM = (
    "You are an expert content strategist and blog writer for a warm, playful, "
    "premium lifestyle brand (think date-night / relationship / experiences). "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)

BLOG_INSTRUCTION = """Write a complete blog article about: "{topic}".

Return ONLY a JSON object with EXACTLY these keys:
{{
  "title": "string, catchy SEO title",
  "slug": "string, url-safe-slug",
  "meta_description": "string, max 160 chars",
  "tags": ["3-6 short tags"],
  "excerpt": "string, 1-2 sentence summary suitable for a newsletter teaser",
  "body_markdown": "string, full article in markdown, 400-700 words with H2 headings",
  "image_prompts": ["2-3 vivid prompts for header + in-article images"]
}}
No prose outside the JSON."""


async def generate_blog(provider_key: str, topic: str) -> dict:
    provider, model = MODELS[provider_key]
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"poc-blog-{provider_key}-{int(time.time()*1000)}",
        system_message=BLOG_SYSTEM,
    ).with_model(provider, model)
    msg = UserMessage(text=BLOG_INSTRUCTION.format(topic=topic))
    resp = await chat.send_message(msg)
    data = extract_json(resp)
    # Validate schema
    required = ["title", "slug", "meta_description", "tags", "excerpt", "body_markdown", "image_prompts"]
    missing = [k for k in required if k not in data]
    if missing:
        raise ValueError(f"Missing keys {missing}")
    return data


SCORE_SYSTEM = (
    "You are a strict editorial quality reviewer. "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)
SCORE_INSTRUCTION = """Evaluate this blog article for quality.

TITLE: {title}
BODY:
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


async def score_blog(blog: dict) -> dict:
    provider, model = MODELS["openai"]
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"poc-score-{int(time.time()*1000)}",
        system_message=SCORE_SYSTEM,
    ).with_model(provider, model)
    msg = UserMessage(text=SCORE_INSTRUCTION.format(title=blog["title"], body=blog["body_markdown"][:4000]))
    resp = await chat.send_message(msg)
    data = extract_json(resp)
    if "overall_score" not in data or "breakdown" not in data:
        raise ValueError("Score JSON missing keys")
    return data


NL_SYSTEM = (
    "You are an email newsletter editor for a warm, playful lifestyle brand. "
    "You ALWAYS respond with a single valid JSON object and nothing else."
)
NL_INSTRUCTION = """Transform this blog article into a newsletter entry.

TITLE: {title}
EXCERPT: {excerpt}
BODY:
{body}

Return ONLY a JSON object with EXACTLY these keys:
{{
  "subject": "string, compelling email subject line",
  "preheader": "string, short preview text",
  "sections": [{{"heading": "string", "content": "string (markdown ok)"}}],
  "cta_text": "string, call to action button text",
  "cta_url": "string, placeholder url"
}}"""


async def transform_to_newsletter(blog: dict) -> dict:
    provider, model = MODELS["anthropic"]
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"poc-nl-{int(time.time()*1000)}",
        system_message=NL_SYSTEM,
    ).with_model(provider, model)
    msg = UserMessage(text=NL_INSTRUCTION.format(
        title=blog["title"], excerpt=blog["excerpt"], body=blog["body_markdown"][:4000]))
    resp = await chat.send_message(msg)
    data = extract_json(resp)
    if "subject" not in data or "sections" not in data:
        raise ValueError("Newsletter JSON missing keys")
    return data


async def generate_image(prompt: str) -> dict:
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"poc-img-{int(time.time()*1000)}",
        system_message="You are a helpful AI assistant that generates images.",
    ).with_model("gemini", IMAGE_MODEL).with_params(modalities=["image", "text"])
    msg = UserMessage(text=f"Generate a high-quality, professional blog image: {prompt}")
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        raise ValueError("No image returned")
    img = images[0]
    raw = base64.b64decode(img["data"])
    return {"mime_type": img["mime_type"], "bytes": len(raw), "data_head": img["data"][:10]}


async def main():
    results = {}
    print("=" * 60)
    print("CONTENT STUDIO - CORE POC")
    print("=" * 60)

    # TEST 1: Multi-provider text generation
    print("\n[1] Multi-provider blog generation...")
    sample_blog = None
    for pk in MODELS:
        try:
            t0 = time.time()
            blog = await generate_blog(pk, "Creative at-home date night ideas for couples on a budget")
            print(f"  ✅ {pk:10s} -> '{blog['title'][:50]}' ({len(blog['body_markdown'])} chars, {time.time()-t0:.1f}s)")
            results[f"text_{pk}"] = True
            if sample_blog is None:
                sample_blog = blog
        except Exception as e:
            print(f"  ❌ {pk:10s} -> {e}")
            results[f"text_{pk}"] = False

    # TEST 2: Batch generation (5 concurrent)
    print("\n[2] Batch generation (5 concurrent)...")
    topics = [
        "Romantic picnic ideas for spring",
        "Best board games for date night",
        "Cooking classes couples can do at home",
        "Stargazing date night guide",
        "DIY spa night for two",
    ]
    try:
        t0 = time.time()
        sem = asyncio.Semaphore(5)

        async def one(topic):
            async with sem:
                return await generate_blog("gemini", topic)

        batch = await asyncio.gather(*[one(t) for t in topics], return_exceptions=True)
        ok = sum(1 for b in batch if isinstance(b, dict))
        print(f"  {'✅' if ok == len(topics) else '⚠️'} {ok}/{len(topics)} succeeded in {time.time()-t0:.1f}s")
        for b in batch:
            if isinstance(b, dict):
                print(f"     - {b['title'][:50]}")
            else:
                print(f"     - ERROR: {b}")
        results["batch"] = ok == len(topics)
    except Exception as e:
        print(f"  ❌ batch failed: {e}")
        results["batch"] = False

    # TEST 3: Quality scoring
    print("\n[3] Quality scoring...")
    try:
        score = await score_blog(sample_blog)
        print(f"  ✅ overall={score['overall_score']} breakdown_keys={list(score['breakdown'].keys())} suggestions={len(score.get('suggestions', []))}")
        results["score"] = True
    except Exception as e:
        print(f"  ❌ scoring failed: {e}")
        results["score"] = False

    # TEST 4: Blog -> Newsletter transform
    print("\n[4] Blog -> Newsletter transform...")
    try:
        nl = await transform_to_newsletter(sample_blog)
        print(f"  ✅ subject='{nl['subject'][:50]}' sections={len(nl['sections'])}")
        results["newsletter"] = True
    except Exception as e:
        print(f"  ❌ transform failed: {e}")
        results["newsletter"] = False

    # TEST 5: Nano Banana image generation
    print("\n[5] Nano Banana image generation...")
    try:
        t0 = time.time()
        img = await generate_image("A cozy candlelit dinner table set for two with warm string lights, photorealistic")
        print(f"  ✅ image generated: {img['mime_type']} {img['bytes']} bytes ({time.time()-t0:.1f}s)")
        results["image"] = True
    except Exception as e:
        print(f"  ❌ image failed: {e}")
        results["image"] = False

    # SUMMARY
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    for k, v in results.items():
        print(f"  {'✅' if v else '❌'} {k}")
    print(f"\n  {passed}/{total} checks passed")
    print("=" * 60)
    return passed == total


if __name__ == "__main__":
    ok = asyncio.run(main())
    exit(0 if ok else 1)
