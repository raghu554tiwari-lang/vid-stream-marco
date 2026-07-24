import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = new Set([
  "cloudfront.testwave.cc",
  "d1d34p8vz63oiq.cloudfront.net",
]);

const STREAM_HEADERS = [
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "expires",
  "accept-ranges",
  "content-range",
];

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "range, content-type, accept, origin, referer",
    "access-control-expose-headers": "content-length, content-range, accept-ranges",
    "cross-origin-resource-policy": "cross-origin",
  };
}

function resolveMediaUrl(request: Request, splat: string): URL | Response {
  const clean = splat.replace(/^\/+/, "");
  const slash = clean.indexOf("/");
  if (slash < 0) return new Response("Bad media URL", { status: 400, headers: corsHeaders() });

  const protocol = clean.slice(0, slash);
  const rest = clean.slice(slash + 1);
  const hostEnd = rest.indexOf("/");
  const host = hostEnd >= 0 ? rest.slice(0, hostEnd) : rest;
  const path = hostEnd >= 0 ? rest.slice(hostEnd) : "/";

  if (protocol !== "https" || !ALLOWED_HOSTS.has(host)) {
    return new Response("Media host not allowed", { status: 403, headers: corsHeaders() });
  }

  const incoming = new URL(request.url);
  return new URL(`https://${host}${path}${incoming.search}`);
}

function sourceOrigin(request: Request): string {
  const ref = request.headers.get("referer") || "";
  if (ref.includes("/s2cdn/")) return "https://s2-cdn.studyratna.cc";
  return "https://vidcloud.eu.org";
}

async function proxyMedia(request: Request, splat: string): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const target = resolveMediaUrl(request, splat);
  if (target instanceof Response) return target;

  const origin = sourceOrigin(request);
  const headers = new Headers();
  for (const h of ["accept", "accept-language", "range", "user-agent"]) {
    const value = request.headers.get(h);
    if (value) headers.set(h, value);
  }
  headers.set("origin", origin);
  headers.set("referer", `${origin}/`);
  headers.set("host", target.host);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      redirect: "manual",
    });
  } catch (err) {
    return new Response(`Media fetch failed: ${(err as Error).message}`, {
      status: 502,
      headers: corsHeaders(),
    });
  }

  const respHeaders = new Headers(corsHeaders());
  for (const h of STREAM_HEADERS) {
    const value = upstream.headers.get(h);
    if (value) respHeaders.set(h, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const Route = createFileRoute("/media/$")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: ({ request, params }) => proxyMedia(request, params._splat ?? ""),
        HEAD: ({ request, params }) => proxyMedia(request, params._splat ?? ""),
        OPTIONS: ({ request, params }) => proxyMedia(request, params._splat ?? ""),
      }),
  },
});