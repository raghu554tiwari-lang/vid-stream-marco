// Generic upstream proxy for player pages (vidcloud, s2-cdn, etc.).
// Rewrites absolute upstream URLs to same-origin proxied paths and
// injects a hard navigation lock so nothing inside can escape the page.

export interface UpstreamConfig {
  upstream: string; // e.g. https://vidcloud.eu.org
  host: string; // e.g. vidcloud.eu.org
  prefix: string; // path prefix on our domain, e.g. /vidcloud
}

// Pre-hide CSS — injected into <head> so AI button never flashes before JS runs.
const HEAD_INJECT = String.raw`<style id="__apex_head">
[class*="ai-"],[class*="Ai"],[class*="AI"],[class*="assistant"],[class*="Assistant"],[class*="doubt"],[class*="Doubt"],[class*="genie"],[class*="Genie"],[class*="chatbot"],[class*="ChatBot"],[class*="avatar-btn"],[id*="ai-"],[id*="assistant"],[id*="doubt"],[id*="genie"],[data-ai],[data-assistant],[aria-label*="AI" i],[aria-label*="assistant" i],[aria-label*="doubt" i],[title*="AI" i],[title*="assistant" i],[title*="doubt" i]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;width:0!important;height:0!important}
#__apex_wm{display:none;position:fixed;right:14px;bottom:14px;z-index:2147483647;pointer-events:none;text-align:right;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.9)}
#__apex_wm .m{color:rgba(255,255,255,.9);font-weight:700;font-size:16px;letter-spacing:.3px}
#__apex_wm .s{color:rgba(255,255,255,.7);font-weight:500;font-size:11px;letter-spacing:.5px;margin-top:2px}
:fullscreen #__apex_wm,:-webkit-full-screen #__apex_wm{display:block!important}
</style>`;

const MEDIA_PROXY_INJECT = String.raw`<script>(function(){try{var hosts={"cloudfront.testwave.cc":1,"d1d34p8vz63oiq.cloudfront.net":1};function map(u){try{var x=new URL(String(u),location.href);if(x.protocol==='https:'&&hosts[x.hostname])return'/media/https/'+x.host+x.pathname+x.search+x.hash;}catch(e){}return null;}if(window.fetch){var nf=window.fetch.bind(window);window.fetch=function(input,init){try{var p=map(input&&input.url?input.url:input);if(p){if(input instanceof Request){input=new Request(p,input);}else{input=p;}}}catch(e){}return nf(input,init);};}if(window.XMLHttpRequest){var open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){var args=Array.prototype.slice.call(arguments);var p=map(url);if(p)args[1]=p;return open.apply(this,args);};}}catch(e){console.warn('[media-proxy]',e);}})();</script>`;

const WATERMARK_INJECT = String.raw`<script>(function(){function mount(){if(document.getElementById('__apex_wm'))return;var d=document.createElement('div');d.id='__apex_wm';d.innerHTML='<div class="m">ApexLectures</div><div class="s">Powered by MARCO</div>';(document.body||document.documentElement).appendChild(d);}function reattach(){var el=document.getElementById('__apex_wm');if(!el)return;var fs=document.fullscreenElement||document.webkitFullscreenElement;if(fs){if(el.parentNode!==fs){try{fs.appendChild(el);}catch(e){}}el.style.setProperty('display','block','important');}else{if(el.parentNode!==document.body){try{document.body.appendChild(el);}catch(e){}}el.style.setProperty('display','none','important');}}function killAi(){try{var sels=['[class*="ai-"]','[class*="Ai"]','[class*="AI"]','[class*="assistant" i]','[class*="doubt" i]','[class*="genie" i]','[class*="chatbot" i]','[id*="assistant" i]','[id*="doubt" i]','[id*="genie" i]','[data-ai]','[data-assistant]','[aria-label*="AI" i]','[aria-label*="assistant" i]','[aria-label*="doubt" i]','[title*="AI" i]','[title*="assistant" i]','[title*="doubt" i]'];sels.forEach(function(s){document.querySelectorAll(s).forEach(function(el){el.style.setProperty('display','none','important');});});document.querySelectorAll('button,a,div[role="button"]').forEach(function(el){var t=((el.innerText||el.textContent||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')).toLowerCase();if(/\b(ai|ai\s*assistant|assistant|doubt|genie|chatbot|ask\s*ai)\b/.test(t)){el.style.setProperty('display','none','important');}var img=el.querySelector&&el.querySelector('img');if(img){var alt=(img.getAttribute('alt')||'').toLowerCase();var src=(img.getAttribute('src')||'').toLowerCase();if(/ai|assistant|doubt|genie|avatar|bot/.test(alt+' '+src)){el.style.setProperty('display','none','important');}}});}catch(e){}}killAi();if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){mount();reattach();killAi();});}else{mount();reattach();killAi();}document.addEventListener('fullscreenchange',reattach,true);document.addEventListener('webkitfullscreenchange',reattach,true);setInterval(function(){mount();reattach();killAi();},800);})();</script>`;

const NAV_LOCK_SCRIPT = String.raw`<script>

(function(){
  try {
    // Kill window.open so player cannot spawn new tabs.
    window.open = function(){ return null; };
    // Prevent leaving the iframe.
    window.addEventListener('beforeunload', function(e){ e.preventDefault(); e.returnValue=''; return ''; });
    // Force any link/form target to stay inside the iframe (never _top/_parent/_blank).
    function fixTarget(el){
      if(!el || !el.getAttribute) return;
      var t = (el.getAttribute('target')||'').toLowerCase();
      if(t === '_top' || t === '_parent' || t === '_blank') el.setAttribute('target','_self');
    }
    document.addEventListener('click', function(ev){
      var a = ev.target && ev.target.closest ? ev.target.closest('a,button,[role="button"]') : null;
      if(!a) return;
      // Detect known "back to batch" / navigation intent and cancel it.
      var txt = (a.innerText||a.textContent||'').toLowerCase();
      var href = a.getAttribute && a.getAttribute('href') || '';
      if (/back\s*to\s*batch|go\s*back|back|home|batch|course|lecture\s*list|classes/i.test(txt) || /batch|home|index|course|classes|subjects|topics/i.test(href)) {
        ev.preventDefault(); ev.stopPropagation();
        return false;
      }
      if (a.tagName === 'A') {
        fixTarget(a);
        // Block links that leave the current page unless they are hash / javascript / same-page.
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            var u = new URL(href, location.href);
            // Same-origin, same path: allow (query change); otherwise cancel.
            if (u.origin !== location.origin || (u.pathname !== location.pathname && !/play\.php$/i.test(u.pathname))) {
              ev.preventDefault(); ev.stopPropagation();
              return false;
            }
          } catch(e) { ev.preventDefault(); ev.stopPropagation(); return false; }
        }
      }
    }, true);
    document.addEventListener('submit', function(ev){
      fixTarget(ev.target);
    }, true);
    // Neutralize video-unavailable auto-redirects: some players call location.replace/assign.
    try {
      var _assign = location.assign.bind(location);
      var _replace = location.replace.bind(location);
      location.assign = function(u){
        try { var uu = new URL(u, location.href); if (uu.origin === location.origin && /play\.php$/i.test(uu.pathname)) return _assign(u); } catch(e){}
        console.warn('[player] blocked navigation', u);
      };
      location.replace = function(u){
        try { var uu = new URL(u, location.href); if (uu.origin === location.origin && /play\.php$/i.test(uu.pathname)) return _replace(u); } catch(e){}
        console.warn('[player] blocked navigation', u);
      };
    } catch(e){}
    // Watch DOM for injected "Back to Batch" buttons and disable them.
    var kill = function(root){
      root.querySelectorAll && root.querySelectorAll('a,button').forEach(function(el){
        var t = (el.innerText||el.textContent||'').toLowerCase();
        var h = (el.getAttribute('href')||'').toLowerCase();
        if (/back\s*to\s*batch|go\s*back|back|home|batch|course|lecture\s*list|classes/i.test(t) || /batch|home|index|course|classes|subjects|topics/i.test(h)) {
          if (el.tagName === 'A') el.setAttribute('href', 'javascript:void(0)');
          el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); return false; }, true);
        }
      });
    };
    var mo = new MutationObserver(function(muts){ muts.forEach(function(m){ m.addedNodes && m.addedNodes.forEach(function(n){ if(n.nodeType===1) kill(n); }); }); });
    document.addEventListener('DOMContentLoaded', function(){ kill(document); mo.observe(document.documentElement,{childList:true,subtree:true}); });
  } catch(e){ console.error('[player nav-lock]', e); }
})();
</script>`;

function rewriteText(body: string, cfg: UpstreamConfig, contentType: string): string {
  const abs = new RegExp(
    `https?://${cfg.host.replace(/\./g, "\\.")}`,
    "g",
  );
  let out = body.replace(abs, cfg.prefix);
  // Rewrite protocol-relative //host references too.
  const proto = new RegExp(`//${cfg.host.replace(/\./g, "\\.")}`, "g");
  out = out.replace(proto, cfg.prefix);

  const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
  if (!isHtml) return out;

  // Inject pre-hide CSS as the FIRST head child so the AI button never flashes,
  // without patching Shaka/fetch/XHR playback requests.
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}${HEAD_INJECT}${MEDIA_PROXY_INJECT}`);
  } else {
    out = `${HEAD_INJECT}${MEDIA_PROXY_INJECT}${out}`;
  }
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${WATERMARK_INJECT}${NAV_LOCK_SCRIPT}</body>`);
  }
  return out;
}

export async function proxyUpstream(
  request: Request,
  splat: string,
  cfg: UpstreamConfig,
): Promise<Response> {
  const url = new URL(request.url);
  const cleanSplat = splat.replace(/^\/+/, "");
  const upstreamUrl = `${cfg.upstream}/${cleanSplat}${url.search}`;

  const headers = new Headers();
  const forward = [
    "accept",
    "accept-language",
    "content-type",
    "range",
    "user-agent",
    "cookie",
  ];
  for (const h of forward) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("referer", cfg.upstream + "/");
  headers.set("origin", cfg.upstream);
  headers.set("host", cfg.host);

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch (err) {
    return new Response(`Upstream fetch failed: ${(err as Error).message}`, {
      status: 502,
    });
  }

  const respHeaders = new Headers();
  const passThrough = [
    "content-type",
    "cache-control",
    "etag",
    "last-modified",
    "expires",
    "accept-ranges",
    "content-range",
  ];
  for (const h of passThrough) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  // Strip frame-blocking headers so the player embeds inside our iframe wrapper.
  respHeaders.delete("x-frame-options");
  respHeaders.delete("content-security-policy");

  const location = upstream.headers.get("location");
  if (location) {
    respHeaders.set(
      "location",
      location
        .replace(new RegExp(`^https?://${cfg.host.replace(/\./g, "\\.")}`), cfg.prefix),
    );
  }

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    respHeaders.append(
      "set-cookie",
      c.replace(/;\s*Domain=[^;]+/gi, "").replace(/;\s*Secure/gi, ""),
    );
  }

  const ct = upstream.headers.get("content-type") || "";
  const isText =
    /text\/|application\/(json|javascript|xml|xhtml|manifest\+json|ld\+json)/i.test(
      ct,
    );

  if (isText) {
    const body = await upstream.text();
    return new Response(rewriteText(body, cfg, ct), {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
