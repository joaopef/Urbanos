export const ANALYTICS_CONSENT_KEY = "urbanos:analytics-consent:v1";
export type AnalyticsConsent = "accepted" | "declined";
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined };
let started = false;
let activeId: string | undefined;

export function validMeasurementId(value: string | undefined): string | undefined {
  const id = value?.trim();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : undefined;
}

export function readAnalyticsConsent(): AnalyticsConsent | undefined {
  try { const value = localStorage.getItem(ANALYTICS_CONSENT_KEY); return value === "accepted" || value === "declined" ? value : undefined; } catch { return undefined; }
}

// Keep campaign attribution, but do not send shared trip stop IDs or arbitrary
// URL parameters to Analytics. No bus positions or planner events are tracked.
export function analyticsPageUrl(href: string): string {
  const url = new URL(href);
  const clean = new URL(url.origin + url.pathname);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_id"]) {
    const value = url.searchParams.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) clean.searchParams.set(key, value);
  }
  return clean.href;
}

export function startAnalytics(id: string): void {
  if (started || !validMeasurementId(id)) return;
  started = true;
  activeId = id;
  const analyticsWindow = window as unknown as AnalyticsWindow;
  analyticsWindow.dataLayer ??= [];
  analyticsWindow.gtag = function () { analyticsWindow.dataLayer!.push(arguments); };
  const gtag = analyticsWindow.gtag;
  gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("js", new Date());
  gtag("config", id, {
    page_location: analyticsPageUrl(window.location.href),
    page_referrer: document.referrer ? new URL(document.referrer).origin + new URL(document.referrer).pathname : "",
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_path: import.meta.env.BASE_URL,
    cookie_domain: window.location.hostname,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.urbanosAnalytics = "true";
  document.head.append(script);
}

export function saveAnalyticsConsent(consent: AnalyticsConsent): void {
  try { localStorage.setItem(ANALYTICS_CONSENT_KEY, consent); } catch { /* Choice applies to this page if storage is unavailable. */ }
}

export function revokeAnalytics(): boolean {
  if (!started) return false;
  (window as unknown as AnalyticsWindow)[`ga-disable-${activeId}`] = true;
  // Reload after clearing cookies to stop the already loaded third-party script.
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const path of ["/", import.meta.env.BASE_URL]) {
      for (const domain of ["", window.location.hostname, `.${window.location.hostname}`]) {
        document.cookie = `${name}=; Max-Age=0; path=${path}${domain ? `; domain=${domain}` : ""}; SameSite=Lax`;
      }
    }
  }
  return true;
}
