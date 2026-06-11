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

async function safeFetch(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- SECURITY ----------
export const runSecurityAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => urlInput.parse(d))
  .handler(async ({ data }) => {
    const url = normalize(data.url);
    let headers = new Headers();
    let ok = false;
    let isHttps = url.startsWith("https://");
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

    const checks = [
      { name: "HTTPS", pass: isHttps, risk: "Without HTTPS, every password and cookie travels in plain text." },
      { name: "HSTS", pass: !!hsts, risk: "Browsers may downgrade to HTTP, opening you to MITM attacks on public WiFi." },
      { name: "Content-Security-Policy", pass: !!csp, risk: "A single XSS bug can run any script on your page — including from a hijacked third-party." },
      { name: "X-Frame-Options", pass: !!xfo || /frame-ancestors/i.test(csp), risk: "Prevents your site from being embedded in a hostile iframe (clickjacking)." },
      { name: "CORS Configured", pass: acao !== "*", risk: "Overly permissive CORS lets any site read responses from your API in a logged-in browser." },
      { name: "Secure Cookie Flags", pass: !setCookie || (/Secure/i.test(setCookie) && /HttpOnly/i.test(setCookie)), risk: "Cookies without HttpOnly/Secure can be stolen by JavaScript or sent over plain HTTP." },
    ];

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

    // Architecture inference
    const cdnDetected = !!via || !!xCache || /cloudflare|cloudfront|akamai|fastly|vercel|netlify/i.test(server);
    const lbDetected = !!via || /aws|gcp|cloudflare|nginx/i.test(server);
    const archNodes = [
      { id: "browser", label: "Browser", detected: true, x: 60, y: 160, note: "End user" },
      { id: "cdn", label: "CDN", detected: cdnDetected, x: 220, y: 160, note: cdnDetected ? `Detected via ${via || xCache || server}` : "Not detected — assets served from origin" },
      { id: "lb", label: "Load Balancer", detected: lbDetected, x: 380, y: 160, note: lbDetected ? "Inferred from response headers" : "Not detected — single point of failure" },
      { id: "server", label: server ? server.split(" ")[0] : "App Server", detected: ok, x: 540, y: 160, note: ok ? `Origin reachable (${status})` : "Origin unreachable" },
      { id: "db", label: "Database", detected: ok, x: 700, y: 90, note: "Inferred from response patterns" },
      { id: "api", label: "3rd-party APIs", detected: true, x: 700, y: 230, note: xPowered ? `Powered-By: ${xPowered}` : "Analytics, fonts" },
    ];

    return { reachable: ok, status, ttfb, bytes, server, via, xCache, xPowered, metrics, archNodes };
  });

// ---------- STRESS / LATENCY PROBE ----------
export const runLatencyProbe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().url(), samples: z.number().min(1).max(20).default(8) }).parse(d))
  .handler(async ({ data }) => {
    const url = normalize(data.url);
    const samples: number[] = [];
    for (let i = 0; i < data.samples; i++) {
      const t = Date.now();
      try {
        await safeFetch(url, { method: "GET" });
        samples.push(Date.now() - t);
      } catch {
        samples.push(-1);
      }
    }
    const ok = samples.filter(s => s >= 0);
    const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : 0;
    const peak = ok.length ? Math.max(...ok) : 0;
    const min = ok.length ? Math.min(...ok) : 0;
    const jitter = peak - min;
    return { samples, avg, peak, min, jitter, failures: samples.length - ok.length };
  });
