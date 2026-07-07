import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () => {
        const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ApexLectures - Powered by MARCO</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at top,#1a1a2e 0%,#0f0f1e 60%,#000 100%);color:#fff;-webkit-font-smoothing:antialiased}
  .wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 20px}
  .brand{font-size:clamp(38px,8vw,72px);font-weight:800;letter-spacing:-.02em;background:linear-gradient(135deg,#7c3aed 0%,#ec4899 50%,#f59e0b 100%);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:12px}
  .powered{font-size:clamp(14px,3vw,18px);color:#a1a1aa;letter-spacing:.15em;text-transform:uppercase;margin-bottom:48px}
  .powered b{color:#fff;font-weight:700}
  .cta{max-width:520px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px 24px;backdrop-filter:blur(10px)}
  .cta p{font-size:clamp(15px,3.5vw,17px);color:#d4d4d8;line-height:1.6;margin-bottom:24px}
  .btn{display:inline-flex;align-items:center;gap:10px;background:#229ED9;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:16px;transition:transform .15s,box-shadow .15s;box-shadow:0 8px 24px rgba(34,158,217,.35)}
  .btn:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(34,158,217,.5)}
  .btn svg{width:20px;height:20px;fill:currentColor}
  footer{margin-top:48px;font-size:12px;color:#52525b}
</style>
</head>
<body>
  <div class="wrap">
    <h1 class="brand">ApexLectures</h1>
    <div class="powered">Powered by <b>MARCO</b></div>
    <div class="cta">
      <p>If you want to use our player, contact us on Telegram.</p>
      <a class="btn" href="https://t.me/official_marco_22/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.9c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
        Join Telegram
      </a>
    </div>
    <footer>&copy; ApexLectures</footer>
  </div>
</body>
</html>`;
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
