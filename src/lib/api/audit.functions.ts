import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const urlInput = z.object({ url: z.string().url() });

function normalize(u: string) {
  try {
    return new URL(u).toString();
  } catch {
    return u;
  }
}

async function safeFetch(url: string, init?: RequestInit, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

// Per-check education content
const securityEducation: Record<string, { simple: string; risk: string; fix: string }> = {
  "HTTPS": {
    simple: "HTTPS encrypts traffic between the browser and your server so nobody on the network can read it.",
    risk: "Without HTTPS, passwords, cookies, and personal data travel in plain text and can be stolen by anyone on the same network.",
    fix: "Get a free TLS certificate (e.g. Let's Encrypt) and redirect all HTTP traffic to HTTPS at the server or CDN.",
  },
  "HSTS": {
    simple: "HTTP Strict Transport Security forces a user's browser to always connect using HTTPS, ignoring any unencrypted HTTP request.",
    risk: "If a user types your URL on public Wi-Fi, an attacker can intercept the initial HTTP request before it switches to HTTPS and steal unencrypted data.",
    fix: "Add this header in production:\nStrict-Transport-Security: max-age=31536000; includeSubDomains; preload",
  },
  "Content-Security-Policy": {
    simple: "Think of CSP as a strict bouncer for your website. It controls exactly which external scripts, images, or assets are allowed to load on your page.",
    risk: "Without it, a hacker could inject a malicious script into your site to steal user passwords or track keystrokes without your knowledge.",
    fix: "Add a Content-Security-Policy header (or <meta> tag) such as:\nContent-Security-Policy: default-src 'self'; script-src 'self' https://trustedscripts.com;",
  },
  "X-Frame-Options": {
    simple: "This stops other websites from framing or embedding your webpage inside theirs.",
    risk: "Attackers use a trick called \"Clickjacking\". They load your real website inside an invisible frame on a malicious page, tricking users into clicking buttons they didn't intend to.",
    fix: "Send this HTTP header from your server:\nX-Frame-Options: DENY  (or SAMEORIGIN)\nOr use CSP: frame-ancestors 'none';",
  },
  "CORS Configured": {
    simple: "CORS decides which other websites are allowed to read responses from your API in a logged-in user's browser.",
    risk: "Wildcard CORS (Access-Control-Allow-Origin: *) lets any site read responses from your API on behalf of a logged-in visitor.",
    fix: "Restrict the header to your own origins, e.g.:\nAccess-Control-Allow-Origin: https://yourapp.com",
  },
  "Secure Cookie Flags": {
    simple: "Cookie flags tell the browser to keep cookies away from JavaScript and only send them over HTTPS.",
    risk: "Cookies without HttpOnly/Secure can be stolen by injected JavaScript or sniffed over plain HTTP.",
    fix: "Set cookies with the Secure, HttpOnly and SameSite=Lax flags from your server.",
  },
};

// ---------- SECURITY ----------
export const runSecurityAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => urlInput.parse(d))
  .handler(async ({ data }) => {
    const url = normalize(data.url);
    let headers = new Headers();
    let ok = false;
    const isHttps = url.startsWith("https://");
    try {
      const res = await safeFetch(url, { method: "GET" });
      headers = res.headers;
      ok = true;
    } catch {
      ok = false;
    }

    const get = (h: string) => headers.get(h) ?? "";
    const setCookie = get("set-cookie");
    const csp = get("content-security-policy");
    const hsts = get("strict-transport-security");
    const xfo = get("x-frame-options");
    const acao = get("access-control-allow-origin");

    const raw = [
      { name: "HTTPS", pass: isHttps },
      { name: "HSTS", pass: !!hsts },
      { name: "Content-Security-Policy", pass: !!csp },
      { name: "X-Frame-Options", pass: !!xfo || /frame-ancestors/i.test(csp) },
      { name: "CORS Configured", pass: acao !== "*" },
      { name: "Secure Cookie Flags", pass: !setCookie || (/Secure/i.test(setCookie) && /HttpOnly/i.test(setCookie)) },
    ];

    const checks = raw.map(c => ({
      ...c,
      simple: securityEducation[c.name]?.simple ?? "",
      risk: securityEducation[c.name]?.risk ?? "",
      fix: securityEducation[c.name]?.fix ?? "",
    }));

    return { reachable: ok, checks };
  });

// ---------- SPEED + ARCHITECTURE ----------
export const runSpeedAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => urlInput.parse(d))
  .handler(async ({ data }) => {
    const url = normalize(data.url);
    const start = Date.now();
    let ttfb = 0;
    let downloadMs = 0;
    let bytes = 0;
    let server = "";
    let via = "";
    let xCache = "";
    let xPowered = "";
    let cfRay = "";
    let ok = false;
    let status = 0;
    try {
      const res = await safeFetch(url);
      ttfb = Date.now() - start;
      status = res.status;
      server = res.headers.get("server") ?? "";
      via = res.headers.get("via") ?? "";
      xCache = res.headers.get("x-cache") ?? res.headers.get("cf-cache-status") ?? "";
      xPowered = res.headers.get("x-powered-by") ?? "";
      cfRay = res.headers.get("cf-ray") ?? "";
      const body = await res.arrayBuffer();
      bytes = body.byteLength;
      downloadMs = Date.now() - start - ttfb;
      ok = true;
    } catch {
      ok = false;
    }

    const sizeMb = bytes / (1024 * 1024);
    const status_ttfb: "good" | "warn" | "bad" = ttfb < 300 ? "good" : ttfb < 800 ? "warn" : "bad";
    const status_size: "good" | "warn" | "bad" = sizeMb < 0.5 ? "good" : sizeMb < 2 ? "warn" : "bad";
    const estLcp = ttfb + downloadMs + 600;
    const status_lcp: "good" | "warn" | "bad" = estLcp < 2500 ? "good" : estLcp < 4000 ? "warn" : "bad";
    const estFcp = ttfb + 400;
    const status_fcp: "good" | "warn" | "bad" = estFcp < 1800 ? "good" : estFcp < 3000 ? "warn" : "bad";

    const metrics = [
      { label: "LCP", value: `${(estLcp / 1000).toFixed(1)}s`, status: status_lcp, hint: "Largest Contentful Paint — time until the biggest element loads. Google flags anything over 2.5s." },
      { label: "FCP", value: `${(estFcp / 1000).toFixed(1)}s`, status: status_fcp, hint: "First Contentful Paint — time until users see anything on screen." },
      { label: "TTFB", value: `${ttfb}ms`, status: status_ttfb, hint: "Time To First Byte — how long the server took to start replying." },
      { label: "Page Size", value: sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`, status: status_size, hint: "Bytes downloaded for the HTML document only." },
    ];

    // CDN / infra inference
    const cloudflareDetected = !!cfRay || /cloudflare/i.test(server) || /cloudflare/i.test(via);
    const fastlyDetected = /fastly/i.test(server) || /fastly/i.test(via) || /fastly/i.test(xCache);
    const akamaiDetected = /akamai/i.test(server) || /akamai/i.test(via);
    const otherCdn = /cloudfront|vercel|netlify|bunny|keycdn|stackpath/i.test(server + via + xCache);
    const cdnDetected = cloudflareDetected || fastlyDetected || akamaiDetected || otherCdn || !!xCache;
    const lbDetected = cdnDetected || /aws|gcp|nginx|envoy|haproxy/i.test(server) || !!via;

    const cdnLabel = cloudflareDetected ? "Cloudflare CDN/WAF"
      : fastlyDetected ? "Fastly CDN"
      : akamaiDetected ? "Akamai CDN"
      : "CDN / Edge Cache";

    const cdnNote = cdnDetected
      ? `Detected via ${cloudflareDetected ? "cf-ray header" : fastlyDetected ? "Fastly headers" : akamaiDetected ? "Akamai headers" : (xCache || server || via)}. Edge caching absorbs traffic before it reaches your origin.`
      : "No CDN headers found. Every asset request travels to your origin, multiplying load and latency for distant users.";

    const lbNote = cdnDetected
      ? "Edge load balancing handled by your CDN provider — traffic distributed across global PoPs."
      : lbDetected
      ? "Reverse proxy / load balancer inferred from response headers."
      : "No load balancer detected — your origin is a single point of failure.";

    const archNodes = [
      // EDGE zone — actually detected from headers
      { id: "browser", label: "Browser", detected: true, inferred: false, zone: "edge",
        x: 80, y: 110, note: "End user device.",
        cause: "Every visitor starts here.", impact: "Slow networks mean every wasted byte costs real seconds.", solution: "Optimize for the slowest 25% of users, not the fastest." },
      { id: "cdn", label: cdnLabel, detected: cdnDetected, inferred: false, zone: "edge",
        x: 260, y: 110, note: cdnNote,
        cause: cdnDetected ? "A CDN sits between visitors and your server, serving cached copies from a nearby city." : "A visitor in Tokyo and one in São Paulo both wait for your single origin server.",
        impact: cdnDetected ? "Lower latency worldwide, reduced origin bandwidth, automatic DDoS absorption." : "Sluggish pages for international users; one viral moment can knock the origin offline.",
        solution: cdnDetected ? "Already in place — keep cache TTLs high for static assets." : "Put Cloudflare (free tier) or Fastly in front of your origin. Setup is ~15 minutes." },
      { id: "lb", label: "Edge Load Balancer", detected: lbDetected, inferred: false, zone: "edge",
        x: 440, y: 110, note: lbNote,
        cause: lbDetected ? "A load balancer routes each request to a healthy backend instance." : "All traffic funnels into one server with no fallback.",
        impact: lbDetected ? "Zero-downtime deploys, automatic failover when an instance dies." : "If the origin restarts or crashes, the entire site goes dark until a human intervenes.",
        solution: lbDetected ? "Healthy — periodically test failover." : "Run at least two app instances behind a managed load balancer (AWS ALB, Cloudflare LB, Fly.io)." },

      // BACKEND zone — inferred, not detectable from outside
      { id: "server", label: server ? server.split(" ")[0].slice(0, 18) : "Application Server", detected: ok, inferred: true, zone: "backend",
        x: 260, y: 240, note: ok ? `Origin reachable (HTTP ${status})${server ? ` · ${server}` : ""}` : "Origin unreachable from probe.",
        cause: "Your app code runs here, handling requests and rendering pages.", impact: "Slow code or memory leaks cascade into every user request.", solution: "Add an APM (Sentry, Datadog) to surface slow endpoints in production." },
      { id: "db", label: "Database", detected: true, inferred: true, zone: "backend",
        x: 440, y: 240, note: "Standard production pattern — exact engine cannot be detected from outside.",
        cause: "Most slow pages are actually slow database queries hiding behind a fast-looking API.", impact: "An un-indexed query on a 1M-row table can stall every concurrent visitor.", solution: "Enable slow query logs; add indexes for any query over 100ms." },
      { id: "api", label: "3rd-party APIs", detected: true, inferred: true, zone: "backend",
        x: 620, y: 240, note: xPowered ? `Powered-By: ${xPowered} · plus likely analytics, payments, fonts.` : "Likely: analytics, payments, fonts, email.",
        cause: "Your page secretly waits on Google Analytics, Stripe, fonts, etc.", impact: "If one third-party slows down, your whole page slows down with it.", solution: "Load non-critical scripts with async/defer; self-host fonts." },
    ];

    return { reachable: ok, status, ttfb, bytes, server, via, xCache, xPowered, cfRay, cloudflareDetected, cdnDetected, metrics, archNodes };
  });

// ---------- STRESS / LATENCY PROBE ----------
export const runLatencyProbe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().url(), samples: z.number().min(1).max(20).default(8) }).parse(d))
  .handler(async ({ data }) => {
    const url = normalize(data.url);
    const samples: number[] = [];
    const statuses: number[] = [];
    let wafBlocks = 0;
    let connectionDrops = 0;
    for (let i = 0; i < data.samples; i++) {
      const t = Date.now();
      try {
        const res = await safeFetch(url, { method: "GET" }, 6000);
        const ms = Date.now() - t;
        samples.push(ms);
        statuses.push(res.status);
        if (res.status === 429 || res.status === 403 || res.status === 503) {
          wafBlocks++;
        }
      } catch {
        samples.push(-1);
        statuses.push(0);
        connectionDrops++;
      }
    }
    const ok = samples.filter(s => s >= 0);
    const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : 0;
    const peak = ok.length ? Math.max(...ok) : 0;
    const min = ok.length ? Math.min(...ok) : 0;
    const jitter = peak - min;
    const wafDetected = wafBlocks + connectionDrops >= Math.max(1, Math.ceil(data.samples / 3));
    return {
      samples, statuses, avg, peak, min, jitter,
      failures: samples.length - ok.length,
      wafBlocks, connectionDrops, wafDetected,
    };
  });
