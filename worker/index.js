// Single Worker: /api/* routes. Everything else is served by the static assets binding (SPA fallback in wrangler.jsonc).
import { HttpError, createRouter, json } from "./lib/http.js";
import { routes as authRoutes } from "./routes/auth.js";
import { routes as contentRoutes } from "./routes/content.js";
import { routes as topicRoutes } from "./routes/topics.js";
import { routes as knowledgeRoutes } from "./routes/knowledge.js";
import { routes as generateRoutes } from "./routes/generate.js";
import { routes as mediaRoutes } from "./routes/media.js";
import { routes as settingsRoutes } from "./routes/settings.js";
import { routes as stockRoutes } from "./routes/stock.js";

const route = createRouter([
  ...authRoutes,
  ...contentRoutes,
  ...topicRoutes,
  ...knowledgeRoutes,
  ...generateRoutes,
  ...mediaRoutes,
  ...settingsRoutes,
  ...stockRoutes,
]);

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/") && pathname !== "/api") {
      return env.ASSETS.fetch(request);
    }
    try {
      return await route(request, env);
    } catch (err) {
      if (err instanceof HttpError) return json({ detail: err.detail }, err.status);
      console.error(err);
      return json({ detail: "Internal Server Error" }, 500);
    }
  },
};
