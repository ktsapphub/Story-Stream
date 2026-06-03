// Semantic UI helpers mapping data -> color-coded badge classes / accents.

export const providerOf = (modelKey = "") => {
  if (modelKey.startsWith("claude")) return "anthropic";
  if (modelKey.startsWith("gemini")) return "gemini";
  return "openai";
};
export const providerLabel = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini" };

export const typeBadgeClass = (t) => (t === "newsletter" ? "badge-newsletter" : "badge-blog");
export const statusBadgeClass = (s) => (s === "published" ? "badge-published" : "badge-draft");
export const providerBadgeClass = (modelKey) => `badge-${providerOf(modelKey)}`;
export const itemStatusClass = (s) =>
  ({ queued: "badge-queued", generating: "badge-generating", complete: "badge-complete", failed: "badge-failed" }[s] || "badge-draft");
export const mediaBadgeClass = (m) => ({ image: "badge-image", gif: "badge-gif", video: "badge-video" }[m] || "badge-image");
export const exportBadgeClass = (f) => `badge-export-${f}`;

export const scoreTier = (n) => (n >= 85 ? "excellent" : n >= 70 ? "good" : "needs_work");
export const scoreTierLabel = { excellent: "Excellent", good: "Good", needs_work: "Needs work" };
export const scoreVar = (n) => `hsl(var(--accent-score-${scoreTier(n).replace("_", "-")}))`;

export const navAccentVar = {
  "/": "--accent-dashboard",
  "/blog": "--accent-blog",
  "/newsletter": "--accent-newsletter",
  "/library": "--accent-content-library",
  "/media": "--accent-media-library",
  "/knowledge": "--accent-knowledge-base",
};
