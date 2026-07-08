// Generic cross-origin proxy for DRM / CDN URLs (pw.live, cloudfront, etc.)
// Forwards the request with an upstream (vidcloud.eu.org) Origin/Referer so
// origin-locked endpoints (license servers, signed CDNs) accept the call.
// Path shape: /xp/<base64url-encoded-URL>[?extra=passthrough]
import { createFileRoute } from "@tanstack/react-router";

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

const ALLOWED_HOSTS = [
  /(^|\.)pw\.live$/i,
  /(^|\.)cloudfront\.net$/i,
  /(^|\.)penpencil\.co$/i,
  /(^|\.)penpencil\.xyz$/i,
];

async function handle(request: Request, splat: string): Promise<Response> {
  const url = new URL(request.url);
  const reqOrigin = request.headers.get("origin") || "*";

  const corsHeaders = new Headers({
    "access-control-allow-origin": reqOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS,HEAD",
    "access-control-allow-headers":
      request.headers.get("access-control-request-headers") ||
      "content-type,authorization,range,x-requested-with,accept",
    "access-control-expose-headers":
      "content-length,content-range,accept-ranges,content-type",
    "access-control-max-age": "86400",
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let target: string;
  try {
    target = b64urlDecode(splat.replace(/^\/+/, ""));
  } catch {
    return new Response("bad target", { status: 400, headers: corsHeaders });
  }
  if (!/^https?:\/\//i.test(target)) {
    return new Response("bad scheme", { status: 400, headers: corsHeaders });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("bad url", { status: 400, headers: corsHeaders });
  }
  if (!ALLOWED_HOSTS.some((rx) => rx.test(parsed.hostname))) {
    return new Response("host not allowed", { status: 403, headers: corsHeaders });
  }

  // Append any additional query params (some players sign URLs with extras).
  for (const [k, v] of url.searchParams) parsed.searchParams.append(k, v);

  const fwd = new Headers();
  for (const h of ["accept", "accept-language", "content-type", "range", "user-agent"]) {
    const v = request.headers.get(h);
    if (v) fwd.set(h, v);
  }
  // Pretend to be the upstream player so origin-locked endpoints accept.
  fwd.set("origin", "https://vidcloud.eu.org");
  fwd.set("referer", "https://vidcloud.eu.org/");

  const init: RequestInit = {
    method: request.method,
    headers: fwd,
    redirect: "follow",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), init);
  } catch (err) {
    return new Response(`upstream fetch failed: ${(err as Error).message}`, {
      status: 502,
      headers: corsHeaders,
    });
  }

  const out = new Headers(corsHeaders);
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified",
  ]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const Route = createFileRoute("/xp/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handle(request, params._splat ?? ""),
      HEAD: async ({ request, params }) => handle(request, params._splat ?? ""),
      POST: async ({ request, params }) => handle(request, params._splat ?? ""),
      OPTIONS: async ({ request, params }) => handle(request, params._splat ?? ""),
    },
  },
});
