import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { readAnalyticsConsent, revokeAnalytics, saveAnalyticsConsent, startAnalytics, validMeasurementId, type AnalyticsConsent } from "../lib/analytics";

export function AnalyticsConsentControl() {
  const id = import.meta.env.PROD ? validMeasurementId(import.meta.env.VITE_GA_MEASUREMENT_ID) : undefined;
  const [consent, setConsent] = useState(readAnalyticsConsent);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (id && consent === "accepted") startAnalytics(id); }, [id, consent]);
  if (!id) return null;
  const choose = (value: AnalyticsConsent) => {
    saveAnalyticsConsent(value); setConsent(value); setOpen(false);
    if (value === "declined" && revokeAnalytics()) window.location.reload();
  };
  return <>
    <button type="button" className="analytics-preferences" onClick={() => setOpen(true)}>Preferências de estatísticas</button>
    {(!consent || open) && createPortal(<section className="analytics-banner" aria-label="Estatísticas de utilização">
      <strong>Podemos medir as visitas?</strong>
      <p>Com a tua autorização, o Google Analytics usa cookies para contar visitas e acessos pelo QR code. Não enviamos as paragens escolhidas nem as posições dos autocarros. Podes mudar a escolha em “Sobre os dados”. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacidade da Google</a>.</p>
      <div><button type="button" onClick={() => choose("declined")}>Recusar</button><button type="button" onClick={() => choose("accepted")}>Aceitar estatísticas</button></div>
    </section>, document.body)}
  </>;
}
