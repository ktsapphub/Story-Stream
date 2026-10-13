// Direct provider calls (OpenAI, Anthropic, Gemini) replacing the old Emergent universal-key client.
// Prompts and post-processing match backend/llm_service.py.
import { ApiError } from "./http.js";

export const MODELS = {
  "gpt-5": ["openai", "gpt-5", "OpenAI GPT-5"],
  "gpt-5-mini": ["openai", "gpt-5-mini", "OpenAI GPT-5 Mini"],
  "gpt-4o": ["openai", "gpt-4o", "OpenAI GPT-4o"],
  "claude-sonnet-4-6": ["anthropic", "claude-sonnet-4-6", "Claude Sonnet 4.6"],
  "gemini-2.5-pro": ["gemini", "gemini-2.5-pro", "Gemini 2.5 Pro"],
  "gemini-2.5-flash": ["gemini", "gemini-2.5-flash", "Gemini 2.5 Flash"],
};
export const DEFAULT_MODEL = "gpt-5";
export const FAST_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const TIMEOUT_MS = 90_000;

export const listModels = () => Object.entries(MODELS).map(([key, [provider, model, label]]) => ({ key, provider, model, label }));
export const isModelKey = (k) => Object.prototype.hasOwnProperty.call(MODELS, k);

const KEY_VAR = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY" };
export const aiConfigured = (env) => Object.values(KEY_VAR).some((v) => (env[v] || "").trim());

function keyFor(env, provider) {
  const k = (env[KEY_VAR[provider]] || "").trim();
  if (!k) throw new ApiError(503, "not_configured", `${provider} is not configured: set ${KEY_VAR[provider]}`);
  return k;
}

async function post(url, headers, body) {
  let r;
  try {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new Error(`LLM request failed: ${e.message}`);
  }
  if (!r.ok) throw new Error(`LLM provider returned HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function complete(env, modelKey, system, prompt) {
  const [provider, model] = MODELS[modelKey] || MODELS[DEFAULT_MODEL];
  const key = keyFor(env, provider);
  if (provider === "openai") {
    const d = await post("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${key}` },
      { model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] });
    return d.choices?.[0]?.message?.content || "";
  }
  if (provider === "anthropic") {
    const d = await post("https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" },
      { model, max_tokens: 8192, system, messages: [{ role: "user", content: prompt }] });
    return (d.content || []).map((c) => c.text || "").join("");
  }
  const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { "x-goog-api-key": key },
    { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] });
  return (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
}

export function extractJson(text) {
  if (!text) throw new Error("Empty LLM response");
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  let candidate;
  if (fenced) candidate = fenced[1];
  else {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(`No JSON found in response: ${text.slice(0, 160)}`);
    candidate = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return JSON.parse(candidate.replace(/,(\s*[}\]])/g, "$1")); // light repair: trailing commas
  }
}

async function chatJson(env, modelKey, system, prompt, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const p = attempt > 0 ? `${prompt}\n\nIMPORTANT: Respond with STRICT, valid JSON only — no trailing commas, no comments, no text before or after the JSON object.` : prompt;
    try {
      return extractJson(await complete(env, modelKey, system, p));
    } catch (e) {
      if (e instanceof ApiError || !(e instanceof SyntaxError || /JSON|Empty LLM/.test(e.message))) throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

const BLOG_SYSTEM = "You are an expert content strategist and blog writer for Story Stream, a warm, playful, premium lifestyle brand about AI-curated date ideas and unforgettable experiences. Your tone is friendly, inspiring, and delightful. You ALWAYS respond with a single valid JSON object and nothing else.";

const LENGTHS = {
  short: "50-500 words (short-form: quick tips, brief announcements, short newsletters)",
  medium: "500-1500 words (medium-form: standard blog posts, guides, opinion pieces)",
  long: "1500-3000+ words (long-form: in-depth guides, SEO pillar articles, research-backed posts)",
};

const referenceBlock = (ref, focus, lead) => {
  let out = "";
  if (ref) out = `\n${lead}\n"""\n${ref.slice(0, 6000)}\n"""\n`;
  if (focus?.length) out += `\nWeave in and emphasize these focus topics/themes: ${focus.join(", ")}.\n`;
  return out;
};

export async function generateBlog(env, topic, modelKey = DEFAULT_MODEL, tone = "warm and engaging", length = "medium", ref = "", focus = []) {
  const reference = referenceBlock(ref, focus, "Use the following reference material to inspire style, structure, and angles (create original look-alike content, do NOT copy verbatim):");
  const prompt = `Write a complete, original blog article about: "${topic}".
Desired tone: ${tone}.
Desired length: ${LENGTHS[length] || LENGTHS.medium}.
${reference}
Return ONLY a JSON object with EXACTLY these keys:
{
  "title": "catchy SEO title",
  "slug": "url-safe-slug",
  "meta_description": "max 160 chars",
  "tags": ["3-6 short tags"],
  "excerpt": "1-2 sentence summary suitable for a newsletter teaser",
  "body_markdown": "full article in markdown with H2 (##) headings",
  "image_prompts": ["2-3 vivid prompts for a header image and in-article images"]
}
No prose outside the JSON.`;
  const data = await chatJson(env, modelKey, BLOG_SYSTEM, prompt);
  for (const k of ["title", "slug", "meta_description", "tags", "excerpt", "body_markdown", "image_prompts"]) {
    data[k] ??= k === "tags" || k === "image_prompts" ? [] : "";
  }
  return data;
}

// Runs `worker(item, index)` over items with bounded concurrency. Never throws.
export async function pool(items, concurrency, worker) {
  let next = 0;
  const run = async () => { while (next < items.length) { const i = next++; await worker(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

const SCORE_SYSTEM = "You are a strict editorial quality reviewer. You ALWAYS respond with a single valid JSON object and nothing else.";

export async function scoreContent(env, title, body, modelKey = DEFAULT_MODEL) {
  const prompt = `Evaluate this content for quality.

TITLE: ${title}
CONTENT:
${body.slice(0, 5000)}

Return ONLY a JSON object with EXACTLY these keys:
{
  "overall_score": number 0-100,
  "breakdown": {
    "readability": number 0-100,
    "seo": number 0-100,
    "engagement": number 0-100,
    "originality": number 0-100,
    "structure": number 0-100
  },
  "suggestions": ["3-5 concrete improvement suggestions"]
}`;
  const data = await chatJson(env, modelKey, SCORE_SYSTEM, prompt);
  data.overall_score ??= 0;
  data.breakdown ??= {};
  data.suggestions ??= [];
  return data;
}

const NL_SYSTEM = "You are an email newsletter editor for Story Stream, a warm, playful lifestyle brand. You ALWAYS respond with a single valid JSON object and nothing else.";

export async function transformToNewsletter(env, blog, modelKey = DEFAULT_MODEL) {
  const prompt = `Transform this blog article into a newsletter entry.

TITLE: ${blog.title || ""}
EXCERPT: ${blog.excerpt || ""}
BODY:
${(blog.body_markdown || "").slice(0, 5000)}

Return ONLY a JSON object with EXACTLY these keys:
{
  "subject": "compelling email subject line",
  "preheader": "short preview text",
  "sections": [{"heading": "string", "content": "string (markdown ok)"}],
  "cta_text": "call to action button text",
  "cta_url": "https://mydatejar.com"
}`;
  const data = await chatJson(env, modelKey, NL_SYSTEM, prompt);
  data.sections ??= [];
  return data;
}

export async function generateNewsletter(env, topic, modelKey = DEFAULT_MODEL, tone = "warm and engaging", ref = "", focus = []) {
  const reference = referenceBlock(ref, focus, "Use this reference material for inspiration (original look-alike, no copying):");
  const prompt = `Write an email newsletter about: "${topic}".
Desired tone: ${tone}.
${reference}
Return ONLY a JSON object with EXACTLY these keys:
{
  "subject": "compelling email subject line",
  "preheader": "short preview text",
  "title": "newsletter title",
  "excerpt": "1-2 sentence summary",
  "sections": [{"heading": "string", "content": "string (markdown ok)"}],
  "cta_text": "call to action button text",
  "cta_url": "https://mydatejar.com"
}`;
  const data = await chatJson(env, modelKey, NL_SYSTEM, prompt);
  data.sections ??= [];
  return data;
}

export async function generateImage(env, prompt) {
  const model = env.IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { "x-goog-api-key": keyFor(env, "gemini") }, {
    contents: [{ role: "user", parts: [{ text: `Generate a high-quality, professional, photorealistic blog image: ${prompt}` }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  });
  const part = (d.candidates?.[0]?.content?.parts || []).find((p) => (p.inlineData || p.inline_data)?.data);
  if (!part) throw new Error("No image was generated");
  const inline = part.inlineData || part.inline_data;
  const mime = inline.mimeType || inline.mime_type || "image/png";
  const bin = atob(inline.data);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return { bytes, mime_type: mime, ext: mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png" };
}

export async function summarizeSource(env, text) {
  const prompt = `Analyze the following source content and return ONLY JSON:
{"summary": "3-4 sentence summary", "topics": ["5-8 key topics/keywords"], "tone": "short description of tone/style"}

CONTENT:
${text.slice(0, 6000)}`;
  let data;
  try {
    data = extractJson(await complete(env, FAST_MODEL, "You analyze content for a content team. You ALWAYS respond with a single valid JSON object and nothing else.", prompt));
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw e;
    data = { summary: text.slice(0, 300), topics: [], tone: "" };
  }
  data.summary ??= "";
  data.topics ??= [];
  data.tone ??= "";
  return data;
}

const TOPIC_SYSTEM = "You build a topic knowledge base for a warm lifestyle/date-ideas brand. You ALWAYS respond with a single valid JSON object and nothing else.";

export async function deriveTopics(env, text, count = 8) {
  const prompt = `From the following content, extract up to ${count} distinct, reusable content TOPICS. For each topic give a short name (2-4 words) and a 1-2 sentence description explaining the topic and why it makes good content.
Return ONLY JSON: {"topics": [{"name": "string", "description": "string"}]}

CONTENT:
${(text || "").slice(0, 6000)}`;
  let data;
  try { data = await chatJson(env, FAST_MODEL, TOPIC_SYSTEM, prompt); } catch (e) {
    if (e instanceof ApiError) throw e;
    return [];
  }
  return (data.topics || []).map((t) => ({ name: String(t?.name || "").trim(), description: String(t?.description || "").trim() })).filter((t) => t.name);
}

export async function describeTopic(env, name, context = "") {
  const ctx = context ? `\nReference context:\n${context.slice(0, 3000)}\n` : "";
  const prompt = `Write a concise 1-2 sentence description for the content topic: "${name}".${ctx}\nReturn ONLY JSON: {"description": "string"}`;
  try { return String((await chatJson(env, FAST_MODEL, TOPIC_SYSTEM, prompt)).description || "").trim(); } catch (e) {
    if (e instanceof ApiError) throw e;
    return "";
  }
}

export async function rankNewsletterOrder(env, items, modelKey = FAST_MODEL) {
  const listing = items.map((it, i) => `${i + 1}. ${it.title || ""} — ${(it.excerpt || "").slice(0, 160)} (quality ${it.score ?? "n/a"})`).join("\n");
  const prompt = `You are an expert email newsletter editor. Evaluate the CURRENT order of the story sections below for overall reader experience (strong hook first, good flow, varied appeal). Return ONLY a JSON object with EXACTLY these keys:
{"readability": number 0-100, "appeal": number 0-100, "overall": number 0-100, "suggested_order": [array of 1-based indices in the ideal order], "rationale": "1-2 sentence explanation"}

SECTIONS (current order):
${listing}`;
  const data = await chatJson(env, modelKey, NL_SYSTEM, prompt);
  return sanitizeRanking(data, items.length);
}

// Keep only valid, unique 1-based indices and append any that are missing.
export function sanitizeRanking(data, n) {
  const seen = new Set();
  const order = [];
  for (const x of Array.isArray(data.suggested_order) && data.suggested_order.length ? data.suggested_order : Array.from({ length: n }, (_, i) => i + 1)) {
    const xi = Number.parseInt(x, 10);
    if (xi >= 1 && xi <= n && !seen.has(xi)) { seen.add(xi); order.push(xi); }
  }
  for (let i = 1; i <= n; i++) if (!seen.has(i)) order.push(i);
  return { readability: data.readability ?? 0, appeal: data.appeal ?? 0, overall: data.overall ?? 0, suggested_order: order, rationale: data.rationale ?? "" };
}
