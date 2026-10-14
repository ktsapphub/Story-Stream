// HTTP helpers and a tiny router. Error bodies keep FastAPI's shape: {"detail": ...}.

export class HttpError extends Error {
  constructor(status, detail) {
    super(String(detail));
    this.status = status;
    this.detail = detail;
  }
}

const API_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: API_HEADERS });

// shortcut: JSON bodies capped at 1 MB; raise per route if a feature needs more (Worker request limit is 100 MB).
const MAX_JSON_BYTES = 1_000_000;

export async function readJson(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_JSON_BYTES) throw new HttpError(413, "Request body too large");
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new HttpError(413, "Request body too large");
  if (!text.trim()) return {};
  try {
    const body = JSON.parse(text);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(422, "Body must be a JSON object");
    }
    return body;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, "Invalid JSON body");
  }
}

// Routes: [METHOD, "/api/x/:id", handler]. ":name" = one segment, "*name" = rest of path.
// handler({ request, env, url, params }) -> Response
export function createRouter(routes) {
  const table = routes.map(([method, path, handler]) => {
    const names = [];
    const pattern = path.replace(/\/([:*])(\w+)/g, (_, kind, name) => {
      names.push(name);
      return kind === ":" ? "/([^/]+)" : "/(.+)";
    });
    return { method, re: new RegExp(`^${pattern}$`), names, handler };
  });

  return (request, env) => {
    const url = new URL(request.url);
    let pathMatched = false;
    for (const route of table) {
      const match = route.re.exec(url.pathname);
      if (!match) continue;
      pathMatched = true;
      if (route.method !== request.method) continue;
      const params = Object.fromEntries(
        route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]),
      );
      return route.handler({ request, env, url, params });
    }
    throw pathMatched ? new HttpError(405, "Method Not Allowed") : new HttpError(404, "Not Found");
  };
}
