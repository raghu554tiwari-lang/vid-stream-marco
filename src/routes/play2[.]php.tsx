import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/play2.php")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = `https://s2-cdn.studyratna.cc/play.php${url.search}`;
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Player</title><style>html,body,iframe{margin:0;padding:0;border:0;width:100%;height:100%;background:#000;overflow:hidden}</style></head><body><iframe src="${target.replace(/"/g, "&quot;")}" allow="encrypted-media; autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></body></html>`;
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
