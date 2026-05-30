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

// Cost
export function costBreakdown(monthlyVisitors: number) {
  const gbPerVisit = 0.004;
  const bandwidthGb = monthlyVisitors * gbPerVisit;
  const bandwidth = bandwidthGb * 0.09;
  const computeUnoptimized = monthlyVisitors * 0.00012;
  const computeOptimized = monthlyVisitors * 0.00003;
  return {
    bandwidth,
    computeUnoptimized,
    computeOptimized,
    savings: (computeUnoptimized - computeOptimized) + bandwidth * 0.6,
  };
}

// Architecture
export interface ArchNode {
  id: string;
  label: string;
  detected: boolean;
  x: number;
  y: number;
  note: string;
}

export const archNodes: ArchNode[] = [
  { id: "browser", label: "Browser", detected: true, x: 60, y: 160, note: "End user" },
  { id: "cdn", label: "CDN", detected: false, x: 220, y: 160, note: "Not detected — assets served from origin" },
  { id: "lb", label: "Load Balancer", detected: false, x: 380, y: 160, note: "Not detected — single point of failure" },
  { id: "server", label: "App Server", detected: true, x: 540, y: 160, note: "Origin reachable" },
  { id: "db", label: "Database", detected: true, x: 700, y: 90, note: "Inferred from response patterns" },
  { id: "api", label: "3rd-party APIs", detected: true, x: 700, y: 230, note: "Analytics, fonts" },
];

export const archEdges: [string, string][] = [
  ["browser", "cdn"],
  ["cdn", "lb"],
  ["lb", "server"],
  ["server", "db"],
  ["server", "api"],
];
