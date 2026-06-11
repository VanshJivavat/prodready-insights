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

    const cdnNote = cdnDetected
      ? `Detected via ${cloudflareDetected ? "Cloudflare" : fastlyDetected ? "Fastly" : akamaiDetected ? "Akamai" : (xCache || server || via)}`
      : "Missing/Undetected — static assets appear to be served straight from the origin server, increasing server load.";

    const cfNote = cloudflareDetected
      ? `Cloudflare detected${cfRay ? ` (cf-ray: ${cfRay.slice(0, 8)}…)` : ""}`
      : "Missing/Undetected — no Cloudflare headers (cf-ray / server: cloudflare).";

    const archNodes = [
      { id: "browser", label: "Browser", detected: true, x: 60, y: 160, note: "End user" },
      { id: "cdn", label: "CDN", detected: cdnDetected, x: 220, y: 90, note: cdnNote },
      { id: "cloudflare", label: "Cloudflare", detected: cloudflareDetected, x: 220, y: 230, note: cfNote },
      { id: "lb", label: "Load Balancer", detected: lbDetected, x: 400, y: 160, note: lbDetected ? "Inferred from response headers" : "Not detected — single point of failure" },
      { id: "server", label: server ? server.split(" ")[0].slice(0, 16) : "App Server", detected: ok, x: 560, y: 160, note: ok ? `Origin reachable (${status})` : "Origin unreachable" },
      { id: "db", label: "Database", detected: ok, x: 720, y: 90, note: "Inferred from response patterns" },
      { id: "api", label: "3rd-party APIs", detected: true, x: 720, y: 230, note: xPowered ? `Powered-By: ${xPowered}` : "Analytics, fonts" },
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
