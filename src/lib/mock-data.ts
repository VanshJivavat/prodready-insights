// Mock data for ProdReady audit modules
export type Status = "good" | "warn" | "bad";

export interface ModuleStatus {
  id: string;
  label: string;
  status: Status;
  score: number;
}

export const moduleList: ModuleStatus[] = [
  { id: "speed", label: "Page Speed", status: "warn", score: 62 },
  { id: "security", label: "Security", status: "bad", score: 38 },
  { id: "stress", label: "Stress Test", status: "warn", score: 55 },
  { id: "balancer", label: "Load Balancer", status: "bad", score: 25 },
  { id: "cost", label: "Cost Projection", status: "good", score: 78 },
  { id: "architecture", label: "Architecture", status: "warn", score: 50 },
];

export const overallScore = Math.round(
  moduleList.reduce((s, m) => s + m.score, 0) / moduleList.length
);

// Speed
export const speedMetrics = [
  { label: "LCP", value: "3.2s", status: "warn" as Status, hint: "Largest Contentful Paint — time until the biggest element loads. Google flags anything over 2.5s." },
  { label: "FCP", value: "1.4s", status: "good" as Status, hint: "First Contentful Paint — time until users see anything on screen." },
  { label: "TTFB", value: "820ms", status: "warn" as Status, hint: "Time To First Byte — how long your server took to start replying." },
  { label: "Page Size", value: "4.2 MB", status: "bad" as Status, hint: "Total bytes downloaded. Mobile users on 4G feel anything over 1.5MB." },
];

export const waterfall = [
  { name: "index.html", start: 0, duration: 220, type: "doc" },
  { name: "app.bundle.js", start: 220, duration: 680, type: "js" },
  { name: "vendor.js", start: 240, duration: 920, type: "js" },
  { name: "styles.css", start: 230, duration: 180, type: "css" },
  { name: "hero.jpg", start: 900, duration: 1400, type: "img" },
  { name: "logo.svg", start: 410, duration: 80, type: "img" },
  { name: "analytics.js", start: 1200, duration: 540, type: "js" },
  { name: "fonts.woff2", start: 420, duration: 310, type: "font" },
  { name: "tracker.js", start: 1500, duration: 720, type: "js" },
];

// Security
export const securityChecks = [
  { name: "HTTPS", pass: true, risk: "Without HTTPS, every password and cookie travels in plain text." },
  { name: "HSTS", pass: false, risk: "Browsers may downgrade to HTTP, opening you to man-in-the-middle attacks on public WiFi." },
  { name: "Content-Security-Policy", pass: false, risk: "A single XSS bug can run any script on your page — including from a hijacked third-party." },
  { name: "X-Frame-Options", pass: true, risk: "Prevents your site from being embedded in a hostile iframe (clickjacking)." },
  { name: "CORS Configured", pass: false, risk: "Overly permissive CORS lets any site read responses from your API in a logged-in browser." },
  { name: "Secure Cookie Flags", pass: false, risk: "Cookies without HttpOnly/Secure can be stolen by JavaScript or sent over plain HTTP." },
];

// Cost — driven by real page size discovered in the Speed audit.
// pageSizeKb defaults to 50 KB if no audit has run yet (lightweight baseline page).
export function costBreakdown(monthlyVisitors: number, pageSizeKb = 50) {
  const EGRESS_PER_GB = 0.08;            // standard cloud egress rate
  const COMPUTE_UNOPT_BASE = 60;         // origin-bound high-tier runtime ($/mo)
  const COMPUTE_OPT_BASE = 15;           // edge-cached, 10% origin hit ($/mo)
  const ORIGIN_HIT_RATIO = 0.10;         // 90% absorbed at edge cache

  const bytesPerVisit = pageSizeKb * 1024;
  const totalGb = (monthlyVisitors * bytesPerVisit) / (1024 ** 3);
  const bandwidth = totalGb * EGRESS_PER_GB;

  // Unoptimized: every request hits origin → high-tier runtime plus per-visit overhead.
  const computeUnoptimized = COMPUTE_UNOPT_BASE + monthlyVisitors * 0.00012;
  // Optimized: only 10% reach origin → small runtime tier + reduced per-visit overhead.
  const computeOptimized = COMPUTE_OPT_BASE + monthlyVisitors * 0.00012 * ORIGIN_HIT_RATIO;

  const optimizedBandwidth = bandwidth * 0.4; // CDN cuts egress ~60%
  const savings = (computeUnoptimized - computeOptimized) + (bandwidth - optimizedBandwidth);

  return {
    pageSizeKb,
    totalGb,
    bandwidth,
    optimizedBandwidth,
    computeUnoptimized,
    computeOptimized,
    savings,
    rates: { egressPerGb: EGRESS_PER_GB, computeUnoptBase: COMPUTE_UNOPT_BASE, computeOptBase: COMPUTE_OPT_BASE, originHitRatio: ORIGIN_HIT_RATIO },
  };
}

// Architecture edges (node positions come from runSpeedAudit so they reflect detected infra).
export const archEdges: [string, string][] = [
  ["browser", "cdn"],
  ["cdn", "lb"],
  ["lb", "server"],
  ["server", "db"],
  ["server", "api"],
];
