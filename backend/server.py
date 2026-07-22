from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import uuid
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import storage as storage_mod
import llm_service as llm
import knowledge as kb
import exporters
import auth
import stock
import connections as conns

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "mydatejar@gmail.com").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Test1234")
AUTH_BYPASS = os.environ.get("ENABLE_TEST_BYPASS", "false").lower() == "true"
BYPASS_TOKEN = "cs-test-bypass"

app = FastAPI(title="Content Studio API")
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def public_user(u):
    if not u:
        return u
    u = dict(u)
    u.pop("_id", None)
    u.pop("password_hash", None)
    return u


# ----------------------- Auth dependency -----------------------
async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    token = creds.credentials if creds else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if AUTH_BYPASS and token == BYPASS_TOKEN:
        u = await db.users.find_one({"email": ADMIN_EMAIL})
        if u:
            return public_user(u)
    payload = auth.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    u = await db.users.find_one({"id": payload["sub"]})
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return public_user(u)


# ----------------------- Models -----------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GenerateBlogRequest(BaseModel):
    topic: str
    model_key: str = llm.DEFAULT_MODEL
    tone: str = "warm and engaging"
    length: str = "medium"
    reference_source_ids: List[str] = []
    topics: List[str] = []
    save: bool = True


class BatchRequest(BaseModel):
    topics: List[str]
    model_key: str = llm.DEFAULT_MODEL
    tone: str = "warm and engaging"
    length: str = "medium"
    reference_source_ids: List[str] = []
    focus_topics: List[str] = []


class ScoreRequest(BaseModel):
    content_id: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    model_key: str = llm.DEFAULT_MODEL


class NewsletterFromBlogRequest(BaseModel):
    blog_content_id: str
    model_key: str = llm.DEFAULT_MODEL
    save: bool = True


class NewsletterFromPromptRequest(BaseModel):
    topic: str
    model_key: str = llm.DEFAULT_MODEL
    tone: str = "warm and engaging"
    reference_source_ids: List[str] = []
    topics: List[str] = []
    save: bool = True


class GenerateImageRequest(BaseModel):
    prompt: str
    content_id: Optional[str] = None
    as_header: bool = False
    title: Optional[str] = None


class MediaFromUrlRequest(BaseModel):
    url: str
    title: Optional[str] = None
    media_type: Optional[str] = None
    source: Optional[str] = None
    source_page_url: Optional[str] = None


class KnowledgeUrlRequest(BaseModel):
    url: str


class TopicCreate(BaseModel):
    name: str
    description: str = ""


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TopicDerive(BaseModel):
    source_id: Optional[str] = None
    text: Optional[str] = None
    count: int = 8


class TopicDescribe(BaseModel):
    source_id: Optional[str] = None


class ConnectionSave(BaseModel):
    values: dict = {}
    enabled: Optional[bool] = None
    manual_limit: Optional[str] = None


class TemplateSave(BaseModel):
    name: str
    brand_name: str = ""
    logo_url: str = ""
    colors: dict = {}
    heading_font: str = ""
    body_font: str = ""
    footer_text: str = ""


class RankOrderRequest(BaseModel):
    items: List[dict] = []
    model_key: str = llm.DEFAULT_MODEL


class SaveContentRequest(BaseModel):
    id: Optional[str] = None
    type: str = "blog"
    title: str = ""
    slug: str = ""
    meta_description: str = ""
    tags: List[str] = []
    excerpt: str = ""
    body_markdown: str = ""
    image_prompts: List[str] = []
    header_image: Optional[dict] = None
    inline_media: List[dict] = []
    newsletter: Optional[dict] = None
    status: str = "draft"
    model_used: Optional[str] = None
    quality_score: Optional[dict] = None
    source_blog_id: Optional[str] = None


# ----------------------- Helpers -----------------------
async def build_reference_context(source_ids: List[str], owner: str) -> str:
    if not source_ids:
        return ""
    docs = await db.knowledge.find({"id": {"$in": source_ids}, "owner": owner, "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(50)
    parts = []
    for d in docs:
        parts.append(f"SOURCE: {d.get('title','')}\nSUMMARY: {d.get('summary','')}\nCONTENT:\n{d.get('content','')[:3000]}")
    return "\n\n---\n\n".join(parts)


def make_content_doc(data: dict, ctype: str, model_key: str, owner: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "owner": owner,
        "type": ctype,
        "title": data.get("title", ""),
        "slug": data.get("slug", ""),
        "meta_description": data.get("meta_description", ""),
        "tags": data.get("tags", []) or [],
        "excerpt": data.get("excerpt", ""),
        "body_markdown": data.get("body_markdown", ""),
        "image_prompts": data.get("image_prompts", []) or [],
        "header_image": data.get("header_image"),
        "inline_media": data.get("inline_media", []) or [],
        "newsletter": data.get("newsletter"),
        "status": "draft",
        "model_used": model_key,
        "quality_score": data.get("quality_score"),
        "source_blog_id": data.get("source_blog_id"),
        "is_deleted": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


async def store_image_bytes(img_bytes: bytes, ext: str, mime: str, source: str, owner: str, prompt: str = "") -> dict:
    path = f"{storage_mod.APP_NAME}/media/{uuid.uuid4()}.{ext}"
    result = await asyncio.to_thread(storage_mod.put_object, path, img_bytes, mime)
    stored_path = result["path"]
    media = {
        "id": str(uuid.uuid4()),
        "owner": owner,
        "storage_path": stored_path,
        "url": f"/api/files/{stored_path}",
        "original_filename": f"{source}.{ext}",
        "content_type": mime,
        "size": result.get("size", len(img_bytes)),
        "media_type": "image",
        "source": source,
        "prompt": prompt,
        "external_url": None,
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.media.insert_one(dict(media))
    return clean(media)


# ----------------------- Auth routes -----------------------
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": auth.hash_password(req.password),
        "name": req.name or email.split("@")[0],
        "role": "user",
        "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    token = auth.create_access_token(user["id"], email)
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not auth.verify_password(req.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(u["id"], email)
    return {"token": token, "user": public_user(u)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}


# ----------------------- Meta -----------------------
@api_router.get("/")
async def root():
    return {"message": "Content Studio API", "status": "ok"}


@api_router.get("/models")
async def get_models(user: dict = Depends(get_current_user)):
    return {"models": llm.list_models(), "default": llm.DEFAULT_MODEL}


# ----------------------- Generation -----------------------
@api_router.post("/generate/blog")
async def generate_blog(req: GenerateBlogRequest, user: dict = Depends(get_current_user)):
    try:
        ref = await build_reference_context(req.reference_source_ids, user["id"])
        data = await llm.generate_blog(req.topic, req.model_key, req.tone, req.length, ref, req.topics)
    except Exception as e:
        logger.exception("blog generation failed")
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")
    doc = make_content_doc(data, "blog", req.model_key, user["id"])
    if req.save:
        await db.content.insert_one(dict(doc))
    return clean(doc)


@api_router.post("/generate/blog/batch")
async def generate_blog_batch(req: BatchRequest, user: dict = Depends(get_current_user)):
    topics = [t for t in req.topics if t and t.strip()][:10]
    if not topics:
        raise HTTPException(status_code=400, detail="Provide at least one topic")
    owner = user["id"]
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "owner": owner,
        "status": "running",
        "total": len(topics),
        "completed": 0,
        "model_key": req.model_key,
        "items": [{"index": i, "topic": t, "status": "queued", "content_id": None, "title": None, "error": None}
                  for i, t in enumerate(topics)],
        "created_at": now_iso(),
    }
    await db.jobs.insert_one(dict(job))

    async def run():
        ref = await build_reference_context(req.reference_source_ids, owner)

        async def on_item(idx, result, exc):
            if exc is not None:
                update = {f"items.{idx}.status": "failed", f"items.{idx}.error": str(exc)[:200]}
            else:
                doc = make_content_doc(result, "blog", req.model_key, owner)
                await db.content.insert_one(dict(doc))
                update = {f"items.{idx}.status": "complete", f"items.{idx}.content_id": doc["id"], f"items.{idx}.title": doc["title"]}
            await db.jobs.update_one({"id": job_id}, {"$set": update, "$inc": {"completed": 1}})

        await db.jobs.update_one({"id": job_id}, {"$set": {f"items.{i}.status": "generating" for i in range(len(topics))}})
        try:
            await llm.generate_blog_batch(topics, req.model_key, req.tone, req.length, ref, concurrency=5, on_item=on_item, focus_topics=req.focus_topics)
        finally:
            await db.jobs.update_one({"id": job_id}, {"$set": {"status": "done"}})

    asyncio.create_task(run())
    return clean(job)


@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id, "owner": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@api_router.post("/score")
async def score(req: ScoreRequest, user: dict = Depends(get_current_user)):
    title, body = req.title, req.body
    if req.content_id:
        content = await db.content.find_one({"id": req.content_id, "owner": user["id"]}, {"_id": 0})
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        title = content.get("title", "")
        body = exporters.content_to_markdown(content) if content.get("type") == "newsletter" else content.get("body_markdown", "")
    if not body:
        raise HTTPException(status_code=400, detail="No content to score")
    try:
        result = await llm.score_content(title or "", body, req.model_key)
    except Exception as e:
        logger.exception("scoring failed")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {e}")
    if req.content_id:
        await db.content.update_one({"id": req.content_id, "owner": user["id"]}, {"$set": {"quality_score": result, "updated_at": now_iso()}})
    return result


@api_router.post("/generate/newsletter/from-blog")
async def newsletter_from_blog(req: NewsletterFromBlogRequest, user: dict = Depends(get_current_user)):
    blog = await db.content.find_one({"id": req.blog_content_id, "owner": user["id"]}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    try:
        nl = await llm.transform_to_newsletter(blog, req.model_key)
    except Exception as e:
        logger.exception("newsletter transform failed")
        raise HTTPException(status_code=500, detail=f"Transform failed: {e}")
    doc = make_content_doc({
        "title": nl.get("subject", blog.get("title", "")),
        "excerpt": blog.get("excerpt", ""),
        "newsletter": nl,
        "header_image": blog.get("header_image"),
        "source_blog_id": blog["id"],
        "tags": blog.get("tags", []),
    }, "newsletter", req.model_key, user["id"])
    if req.save:
        await db.content.insert_one(dict(doc))
    return clean(doc)


@api_router.post("/generate/newsletter")
async def newsletter_from_prompt(req: NewsletterFromPromptRequest, user: dict = Depends(get_current_user)):
    try:
        ref = await build_reference_context(req.reference_source_ids, user["id"])
        nl = await llm.generate_newsletter(req.topic, req.model_key, req.tone, ref, req.topics)
    except Exception as e:
        logger.exception("newsletter generation failed")
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")
    doc = make_content_doc({
        "title": nl.get("title", nl.get("subject", "")),
        "excerpt": nl.get("excerpt", ""),
        "newsletter": nl,
    }, "newsletter", req.model_key, user["id"])
    if req.save:
        await db.content.insert_one(dict(doc))
    return clean(doc)


@api_router.post("/generate/image")
async def generate_image(req: GenerateImageRequest, user: dict = Depends(get_current_user)):
    try:
        img = await llm.generate_image(req.prompt)
    except Exception as e:
        logger.exception("image generation failed")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")
    media = await store_image_bytes(img["bytes"], img["ext"], img["mime_type"], "generated", user["id"], req.prompt)
    if req.content_id and req.as_header:
        await db.content.update_one(
            {"id": req.content_id, "owner": user["id"]},
            {"$set": {"header_image": {"media_id": media["id"], "url": media["url"]}, "updated_at": now_iso()}},
        )
    return media


# ----------------------- Media -----------------------
@api_router.post("/media/upload")
async def media_upload(file: UploadFile = File(...), title: str = Form(None), user: dict = Depends(get_current_user)):
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    ct = file.content_type or storage_mod.MIME_TYPES.get(ext, "application/octet-stream")
    path = f"{storage_mod.APP_NAME}/media/{uuid.uuid4()}.{ext}"
    try:
        result = await asyncio.to_thread(storage_mod.put_object, path, data, ct)
    except Exception as e:
        logger.exception("upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    media = {
        "id": str(uuid.uuid4()),
        "owner": user["id"],
        "storage_path": result["path"],
        "url": f"/api/files/{result['path']}",
        "original_filename": file.filename,
        "content_type": ct,
        "size": result.get("size", len(data)),
        "media_type": storage_mod.guess_media_type(ct, ext),
        "source": "upload",
        "prompt": title or "",
        "external_url": None,
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.media.insert_one(dict(media))
    return clean(media)


@api_router.post("/media/from-url")
async def media_from_url(req: MediaFromUrlRequest, user: dict = Depends(get_current_user)):
    url = req.url.strip()
    mtype = req.media_type
    if not mtype:
        low = url.lower()
        if "youtube.com" in low or "youtu.be" in low:
            mtype = "video"
        elif low.endswith(".gif") or "giphy.com" in low:
            mtype = "gif"
        elif any(low.endswith(e) for e in (".mp4", ".webm", ".mov")):
            mtype = "video"
        else:
            mtype = "image"
    media = {
        "id": str(uuid.uuid4()),
        "owner": user["id"],
        "storage_path": None,
        "url": url,
        "original_filename": req.title or url,
        "content_type": None,
        "size": 0,
        "media_type": mtype,
        "source": req.source or "url",
        "prompt": req.title or "",
        "external_url": url,
        "source_page_url": req.source_page_url,
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.media.insert_one(dict(media))
    return clean(media)


@api_router.get("/media")
async def list_media(media_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"owner": user["id"], "is_deleted": {"$ne": True}}
    if media_type and media_type != "all":
        q["media_type"] = media_type
    return await db.media.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.delete("/media/{media_id}")
async def delete_media(media_id: str, user: dict = Depends(get_current_user)):
    await db.media.update_one({"id": media_id, "owner": user["id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    """Public file serving so <img> tags work (paths are unguessable UUIDs)."""
    record = await db.media.find_one({"storage_path": path, "is_deleted": {"$ne": True}}, {"_id": 0})
    try:
        data, content_type = await asyncio.to_thread(storage_mod.get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    ct = (record or {}).get("content_type") or content_type
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})


# ----------------------- Knowledge base -----------------------
@api_router.post("/knowledge/url")
async def knowledge_add_url(req: KnowledgeUrlRequest, user: dict = Depends(get_current_user)):
    try:
        scraped = await asyncio.to_thread(kb.scrape_url, req.url)
    except Exception as e:
        logger.exception("scrape failed")
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {e}")
    analysis = await llm.summarize_source(scraped["content"])
    doc = {
        "id": str(uuid.uuid4()),
        "owner": user["id"],
        "type": "url",
        "title": scraped["title"],
        "source_url": req.url,
        "original_filename": None,
        "content": scraped["content"],
        "summary": analysis.get("summary", ""),
        "topics": analysis.get("topics", []),
        "tone": analysis.get("tone", ""),
        "status": "ready",
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.knowledge.insert_one(dict(doc))
    return clean(doc)


@api_router.post("/knowledge/upload")
async def knowledge_upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    data = await file.read()
    text = await asyncio.to_thread(kb.extract_document, file.filename, data)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from document")
    analysis = await llm.summarize_source(text)
    doc = {
        "id": str(uuid.uuid4()),
        "owner": user["id"],
        "type": "document",
        "title": file.filename,
        "source_url": None,
        "original_filename": file.filename,
        "content": text,
        "summary": analysis.get("summary", ""),
        "topics": analysis.get("topics", []),
        "tone": analysis.get("tone", ""),
        "status": "ready",
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.knowledge.insert_one(dict(doc))
    return clean(doc)


@api_router.get("/knowledge")
async def list_knowledge(user: dict = Depends(get_current_user)):
    return await db.knowledge.find({"owner": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/knowledge/topics")
async def knowledge_topics(user: dict = Depends(get_current_user)):
    seen = {}
    # managed topics first
    managed = await db.kb_topics.find({"owner": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0, "name": 1}).to_list(500)
    for d in managed:
        key = str(d.get("name", "")).strip()
        if key and key.lower() not in seen:
            seen[key.lower()] = key
    # source-derived topics
    docs = await db.knowledge.find({"owner": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0, "topics": 1}).to_list(500)
    for d in docs:
        for t in (d.get("topics") or []):
            key = str(t).strip()
            if key and key.lower() not in seen:
                seen[key.lower()] = key
    return {"topics": sorted(seen.values(), key=str.lower)}


# ----------------------- Managed Topics repository -----------------------
def make_topic_doc(name: str, description: str, owner: str, source: str = "user", source_id=None) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "owner": owner,
        "name": name.strip(),
        "description": (description or "").strip(),
        "source": source,
        "source_id": source_id,
        "is_deleted": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


@api_router.get("/topics")
async def list_topics(user: dict = Depends(get_current_user)):
    return await db.kb_topics.find({"owner": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0}).sort("name", 1).to_list(1000)


@api_router.post("/topics")
async def create_topic(req: TopicCreate, user: dict = Depends(get_current_user)):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Topic name is required")
    existing = await db.kb_topics.find_one({"owner": user["id"], "name": {"$regex": f"^{name}$", "$options": "i"}, "is_deleted": {"$ne": True}})
    if existing:
        raise HTTPException(status_code=400, detail="That topic already exists")
    doc = make_topic_doc(name, req.description, user["id"], "user")
    await db.kb_topics.insert_one(dict(doc))
    return clean(doc)


@api_router.put("/topics/{topic_id}")
async def update_topic(topic_id: str, req: TopicUpdate, user: dict = Depends(get_current_user)):
    existing = await db.kb_topics.find_one({"id": topic_id, "owner": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Topic not found")
    patch = {"updated_at": now_iso()}
    if req.name is not None and req.name.strip():
        patch["name"] = req.name.strip()
    if req.description is not None:
        patch["description"] = req.description.strip()
    await db.kb_topics.update_one({"id": topic_id, "owner": user["id"]}, {"$set": patch})
    return await db.kb_topics.find_one({"id": topic_id}, {"_id": 0})


@api_router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, user: dict = Depends(get_current_user)):
    await db.kb_topics.update_one({"id": topic_id, "owner": user["id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api_router.post("/topics/derive")
async def derive_topics(req: TopicDerive, user: dict = Depends(get_current_user)):
    text = req.text or ""
    source_id = req.source_id
    if source_id:
        src = await db.knowledge.find_one({"id": source_id, "owner": user["id"]}, {"_id": 0})
        if not src:
            raise HTTPException(status_code=404, detail="Source not found")
        text = src.get("content", "") or src.get("summary", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Provide a source or text to derive topics from")
    derived = await llm.derive_topics(text, max(1, min(req.count, 15)))
    if not derived:
        raise HTTPException(status_code=502, detail="Could not derive topics. Try again.")
    # existing names (lowercase) to dedupe
    existing = await db.kb_topics.find({"owner": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0, "name": 1}).to_list(1000)
    have = {e["name"].lower() for e in existing}
    added = []
    for t in derived:
        if t["name"].lower() in have:
            continue
        have.add(t["name"].lower())
        doc = make_topic_doc(t["name"], t.get("description", ""), user["id"], "derived", source_id)
        await db.kb_topics.insert_one(dict(doc))
        added.append(clean(doc))
    return {"added": added, "skipped": len(derived) - len(added)}


@api_router.post("/topics/{topic_id}/describe")
async def describe_topic(topic_id: str, req: TopicDescribe, user: dict = Depends(get_current_user)):
    topic = await db.kb_topics.find_one({"id": topic_id, "owner": user["id"]}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    context = ""
    if req.source_id:
        src = await db.knowledge.find_one({"id": req.source_id, "owner": user["id"]}, {"_id": 0})
        if src:
            context = src.get("content", "") or src.get("summary", "")
    desc = await llm.describe_topic(topic["name"], context)
    if not desc:
        raise HTTPException(status_code=502, detail="Could not generate a description. Try again.")
    await db.kb_topics.update_one({"id": topic_id, "owner": user["id"]}, {"$set": {"description": desc, "source": "derived", "updated_at": now_iso()}})
    return await db.kb_topics.find_one({"id": topic_id}, {"_id": 0})


@api_router.get("/knowledge/{source_id}")
async def get_knowledge(source_id: str, user: dict = Depends(get_current_user)):
    doc = await db.knowledge.find_one({"id": source_id, "owner": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Source not found")
    return doc


@api_router.delete("/knowledge/{source_id}")
async def delete_knowledge(source_id: str, user: dict = Depends(get_current_user)):
    await db.knowledge.update_one({"id": source_id, "owner": user["id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# ----------------------- Content CRUD -----------------------
@api_router.get("/content")
async def list_content(type: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"owner": user["id"], "is_deleted": {"$ne": True}}
    if type and type != "all":
        q["type"] = type
    if status and status != "all":
        q["status"] = status
    return await db.content.find(q, {"_id": 0}).sort("updated_at", -1).to_list(1000)


@api_router.get("/content/{content_id}")
async def get_content(content_id: str, user: dict = Depends(get_current_user)):
    doc = await db.content.find_one({"id": content_id, "owner": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    return doc


@api_router.post("/content")
async def save_content(req: SaveContentRequest, user: dict = Depends(get_current_user)):
    payload = req.model_dump()
    cid = payload.get("id")
    if cid:
        existing = await db.content.find_one({"id": cid, "owner": user["id"]})
        if existing:
            payload["updated_at"] = now_iso()
            payload.pop("id", None)
            await db.content.update_one({"id": cid, "owner": user["id"]}, {"$set": payload})
            return await db.content.find_one({"id": cid}, {"_id": 0})
    doc = {**payload, "id": str(uuid.uuid4()), "owner": user["id"], "is_deleted": False, "created_at": now_iso(), "updated_at": now_iso()}
    await db.content.insert_one(dict(doc))
    return clean(doc)


@api_router.put("/content/{content_id}")
async def update_content(content_id: str, req: SaveContentRequest, user: dict = Depends(get_current_user)):
    existing = await db.content.find_one({"id": content_id, "owner": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Content not found")
    payload = req.model_dump()
    payload.pop("id", None)
    payload["updated_at"] = now_iso()
    await db.content.update_one({"id": content_id, "owner": user["id"]}, {"$set": payload})
    return await db.content.find_one({"id": content_id}, {"_id": 0})


@api_router.post("/content/{content_id}/status")
async def set_status(content_id: str, status: str = Query(...), user: dict = Depends(get_current_user)):
    await db.content.update_one({"id": content_id, "owner": user["id"]}, {"$set": {"status": status, "updated_at": now_iso()}})
    return {"ok": True}


@api_router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(get_current_user)):
    await db.content.update_one({"id": content_id, "owner": user["id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# ----------------------- Export -----------------------
@api_router.get("/export/{content_id}")
async def export(content_id: str, format: str = Query("html"), user: dict = Depends(get_current_user)):
    content = await db.content.find_one({"id": content_id, "owner": user["id"]}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    try:
        data, content_type, ext = exporters.export_content(content, format)
    except Exception as e:
        logger.exception("export failed")
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")
    slug = content.get("slug") or content.get("title", "content")
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in (slug or "content"))[:60] or "content"
    return Response(content=data, media_type=content_type,
                    headers={"Content-Disposition": f'attachment; filename="{safe}.{ext}"'})


# ----------------------- Settings / Connections -----------------------
async def resolve_stock_keys(owner: str) -> dict:
    """Per-user stock provider keys: DB value (if enabled) wins, else env fallback."""
    keys = {}
    for p in ("pexels", "pixabay", "unsplash"):
        s = await db.settings.find_one({"owner": owner, "provider": p}, {"_id": 0})
        if s and s.get("enabled") is False:
            keys[p] = ""
        else:
            keys[p] = conns.effective_value(p, "api_key", (s or {}).get("values"))
    return keys


async def _connection_view(owner: str, c: dict) -> dict:
    s = await db.settings.find_one({"owner": owner, "provider": c["key"]}, {"_id": 0})
    saved_values = (s or {}).get("values")
    values = conns.effective_values(c["key"], saved_values)
    configured = conns.is_configured(c["key"], saved_values)
    enabled = (s or {}).get("enabled")
    if enabled is None:
        enabled = configured
    return {
        **c,
        "values": values,
        "configured": configured,
        "enabled": bool(enabled),
        "manual_limit": (s or {}).get("manual_limit", ""),
        "status": (s or {}).get("status"),
    }


@api_router.get("/settings/platform")
async def settings_platform(user: dict = Depends(get_current_user)):
    return conns.platform_info()


@api_router.get("/settings/connections")
async def list_connections(user: dict = Depends(get_current_user)):
    out = []
    for c in conns.CONNECTIONS:
        out.append(await _connection_view(user["id"], c))
    return {"connections": out, "categories": list(dict.fromkeys(c["category"] for c in conns.CONNECTIONS))}


@api_router.put("/settings/connections/{provider}")
async def save_connection(provider: str, req: ConnectionSave, user: dict = Depends(get_current_user)):
    c = conns.CONN_BY_KEY.get(provider)
    if not c:
        raise HTTPException(status_code=404, detail="Unknown connection")
    existing = await db.settings.find_one({"owner": user["id"], "provider": provider}, {"_id": 0})
    values = dict((existing or {}).get("values") or {})
    if not c.get("managed"):
        for f in c["fields"]:
            fk = f["key"]
            if fk in req.values:
                v = req.values.get(fk)
                values[fk] = v.strip() if isinstance(v, str) else v
    patch = {"owner": user["id"], "provider": provider, "values": values, "updated_at": now_iso()}
    if req.enabled is not None:
        patch["enabled"] = req.enabled
    if req.manual_limit is not None:
        patch["manual_limit"] = req.manual_limit
    # auto-test on save when configured
    if c.get("supports_test") and conns.is_configured(provider, values):
        result = await asyncio.to_thread(conns.run_test, provider, conns.effective_values(provider, values))
        patch["status"] = {**result, "checked_at": now_iso()}
    await db.settings.update_one({"owner": user["id"], "provider": provider}, {"$set": patch}, upsert=True)
    return await _connection_view(user["id"], c)


@api_router.post("/settings/connections/{provider}/test")
async def test_connection(provider: str, user: dict = Depends(get_current_user)):
    c = conns.CONN_BY_KEY.get(provider)
    if not c:
        raise HTTPException(status_code=404, detail="Unknown connection")
    s = await db.settings.find_one({"owner": user["id"], "provider": provider}, {"_id": 0})
    values = conns.effective_values(provider, (s or {}).get("values"))
    result = await asyncio.to_thread(conns.run_test, provider, values)
    status = {**result, "checked_at": now_iso()}
    await db.settings.update_one(
        {"owner": user["id"], "provider": provider},
        {"$set": {"owner": user["id"], "provider": provider, "status": status, "updated_at": now_iso()}},
        upsert=True,
    )
    return status


@api_router.delete("/settings/connections/{provider}")
async def disconnect_connection(provider: str, user: dict = Depends(get_current_user)):
    if provider not in conns.CONN_BY_KEY:
        raise HTTPException(status_code=404, detail="Unknown connection")
    await db.settings.delete_one({"owner": user["id"], "provider": provider})
    return {"ok": True}


# ----------------------- Stock media -----------------------
@api_router.get("/stock/providers")
async def stock_providers(user: dict = Depends(get_current_user)):
    keys = await resolve_stock_keys(user["id"])
    return {"providers": stock.provider_status(keys)}


@api_router.get("/stock/search")
async def stock_search(
    query: str = Query(..., min_length=1),
    provider: str = Query("all"),
    kind: str = Query("photo"),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
):
    keys = await resolve_stock_keys(user["id"])
    status = stock.provider_status(keys)
    if provider != "all" and not status.get(provider):
        raise HTTPException(status_code=400, detail=f"{provider.capitalize()} is not configured. Add its API key in Settings to enable search.")
    if provider == "all" and not any(status.values()):
        raise HTTPException(status_code=400, detail="No stock providers configured yet. Add a Pexels, Pixabay, or Unsplash API key in Settings to enable search.")
    try:
        results = await asyncio.to_thread(stock.search, provider, query, page, 24, kind, keys)
    except Exception as e:
        logger.exception("stock search failed")
        raise HTTPException(status_code=502, detail=f"Stock search failed: {e}")
    return {"provider": provider, "kind": kind, "results": results}


# ----------------------- Newsletter templates & builder -----------------------
DEFAULT_TEMPLATE = {
    "id": "default",
    "name": "My Date Jar (Default)",
    "brand_name": "My Date Jar",
    "logo_url": "",
    "colors": {"primary": "#835ef5", "accent": "#5b3fd6", "background": "#fffbf6", "text": "#24170f"},
    "heading_font": "Playfair Display",
    "body_font": "Montserrat",
    "footer_text": "You are receiving this because you subscribed to My Date Jar.",
    "is_default": True,
}


@api_router.get("/newsletter-templates")
async def list_templates(user: dict = Depends(get_current_user)):
    docs = await db.newsletter_templates.find({"owner": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"templates": [DEFAULT_TEMPLATE] + docs}


@api_router.post("/newsletter-templates")
async def create_template(req: TemplateSave, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "owner": user["id"],
        **req.model_dump(),
        "is_deleted": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.newsletter_templates.insert_one(dict(doc))
    return clean(doc)


@api_router.put("/newsletter-templates/{template_id}")
async def update_template(template_id: str, req: TemplateSave, user: dict = Depends(get_current_user)):
    existing = await db.newsletter_templates.find_one({"id": template_id, "owner": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.newsletter_templates.update_one({"id": template_id, "owner": user["id"]}, {"$set": {**req.model_dump(), "updated_at": now_iso()}})
    return await db.newsletter_templates.find_one({"id": template_id}, {"_id": 0})


@api_router.delete("/newsletter-templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    await db.newsletter_templates.update_one({"id": template_id, "owner": user["id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api_router.post("/newsletter/rank-order")
async def rank_newsletter_order(req: RankOrderRequest, user: dict = Depends(get_current_user)):
    items = req.items[:20]
    if not items:
        raise HTTPException(status_code=400, detail="Provide at least one section to rank")
    try:
        result = await llm.rank_newsletter_order(items, req.model_key)
    except Exception as e:
        logger.exception("rank order failed")
        raise HTTPException(status_code=502, detail=f"Could not analyze order: {e}")
    return result


# ----------------------- Stats -----------------------
@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    base = {"owner": user["id"], "is_deleted": {"$ne": True}}
    blogs = await db.content.count_documents({**base, "type": "blog"})
    newsletters = await db.content.count_documents({**base, "type": "newsletter"})
    published = await db.content.count_documents({**base, "status": "published"})
    media_count = await db.media.count_documents({"owner": user["id"], "is_deleted": {"$ne": True}})
    sources = await db.knowledge.count_documents({"owner": user["id"], "is_deleted": {"$ne": True}})
    scored = await db.content.find({**base, "quality_score": {"$ne": None}}, {"_id": 0, "quality_score": 1}).to_list(1000)
    avg = 0
    if scored:
        vals = [s["quality_score"].get("overall_score", 0) for s in scored if s.get("quality_score")]
        avg = round(sum(vals) / len(vals)) if vals else 0
    return {"blogs": blogs, "newsletters": newsletters, "published": published, "media": media_count, "sources": sources, "avg_score": avg}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin_and_migrate():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": ADMIN_EMAIL,
            "password_hash": auth.hash_password(ADMIN_PASSWORD),
            "name": "My Date Jar", "role": "admin", "created_at": now_iso(),
        })
        logger.info("Seed admin user created")
    else:
        uid = existing["id"]
        if not auth.verify_password(ADMIN_PASSWORD, existing["password_hash"]):
            await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": auth.hash_password(ADMIN_PASSWORD)}})
    # Migrate pre-auth orphan documents to the seed user
    for coll in (db.content, db.media, db.knowledge):
        await coll.update_many({"owner": {"$exists": False}}, {"$set": {"owner": uid}})


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"index: {e}")
    try:
        await asyncio.to_thread(storage_mod.init_storage)
        logger.info("Storage initialized at startup")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    try:
        await seed_admin_and_migrate()
    except Exception as e:
        logger.error(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
