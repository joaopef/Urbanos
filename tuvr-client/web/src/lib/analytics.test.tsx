// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); localStorage.clear(); vi.stubEnv("PROD", true); vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123"); });
afterEach(() => { vi.unstubAllEnvs(); document.querySelectorAll("script[data-urbanos-analytics]").forEach((script) => script.remove()); document.body.innerHTML = ""; localStorage.clear(); });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("não carrega a Google antes de consentir nem depois de recusar", async () => {
  const { AnalyticsConsentControl } = await import("../components/analytics-consent");
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  try {
    await act(async () => root.render(<AnalyticsConsentControl />));
    expect(document.querySelector("script[data-urbanos-analytics]")).toBeNull();
    const refuse = [...document.querySelectorAll("button")].find((button) => button.textContent === "Recusar")!;
    await act(async () => refuse.click());
    expect(document.querySelector(".analytics-banner")).toBeNull();
    expect(document.querySelector("script[data-urbanos-analytics]")).toBeNull();
    expect(localStorage.getItem("urbanos:analytics-consent:v1")).toBe("declined");
  } finally { await act(async () => root.unmount()); }
});

it("carrega uma única tag após aceitar mesmo em StrictMode e permite reabrir as preferências", async () => {
  const { AnalyticsConsentControl } = await import("../components/analytics-consent");
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  try {
    await act(async () => root.render(<StrictMode><AnalyticsConsentControl /></StrictMode>));
    await act(async () => [...document.querySelectorAll("button")].find((button) => button.textContent === "Aceitar estatísticas")!.click());
    expect(document.querySelectorAll("script[data-urbanos-analytics]")).toHaveLength(1);
    expect(document.querySelector("script[data-urbanos-analytics]")?.getAttribute("src")).toContain("G-TEST123");
    await act(async () => document.querySelector<HTMLButtonElement>(".analytics-preferences")!.click());
    expect(document.querySelector(".analytics-banner")).not.toBeNull();
  } finally { await act(async () => root.unmount()); }
});

it("conserva a campanha QR sem enviar paragens, fragmentos ou parâmetros arbitrários", async () => {
  const { analyticsPageUrl, validMeasurementId } = await import("./analytics");
  expect(analyticsPageUrl("https://joaopef.github.io/Urbanos/?from=1018&to=1009&utm_source=qr&utm_medium=offline&utm_campaign=divulgacao&email=x#private")).toBe("https://joaopef.github.io/Urbanos/?utm_source=qr&utm_medium=offline&utm_campaign=divulgacao");
  expect(validMeasurementId("G-TEST123")).toBe("G-TEST123");
  expect(validMeasurementId("G-bad<script>")).toBeUndefined();
});

it("falhas no armazenamento não autorizam automaticamente estatísticas", async () => {
  const { readAnalyticsConsent, saveAnalyticsConsent } = await import("./analytics");
  const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readAnalyticsConsent()).toBeUndefined(); spy.mockRestore();
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(() => saveAnalyticsConsent("declined")).not.toThrow(); write.mockRestore();
});

it("não apresenta o aviso sem ID configurado", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
  const { AnalyticsConsentControl } = await import("../components/analytics-consent");
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  try { await act(async () => root.render(<AnalyticsConsentControl />)); expect(document.querySelector(".analytics-banner")).toBeNull(); expect(document.querySelector(".analytics-preferences")).toBeNull(); }
  finally { await act(async () => root.unmount()); }
});

it("desativa a medição e limpa cookies ao retirar consentimento", async () => {
  const { startAnalytics, revokeAnalytics } = await import("./analytics");
  startAnalytics("G-TEST123");
  document.cookie = "_ga=example; path=/";
  expect(revokeAnalytics()).toBe(true);
  expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST123"]).toBe(true);
  expect(document.cookie).not.toContain("_ga=");
});
