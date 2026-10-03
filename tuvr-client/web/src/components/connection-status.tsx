import type { ConnectionState } from "../lib/types";

interface Props {
  state: ConnectionState;
  lastUpdatedAt?: number;
  error?: Error | null;
  onReconnect?: () => void;
  reconnecting?: boolean;
}

export function ConnectionStatus({ state, lastUpdatedAt, error, onReconnect, reconnecting }: Props) {
  const labels: Record<ConnectionState, string> = {
    loading: "A carregar posições…",
    success: "Atualização ativa",
    empty: "Sem veículos disponíveis",
    stale: "Dados desatualizados",
    error: "Atualização interrompida",
  };
  return (
    <div className={`connection connection-${state}`} role={error ? "alert" : "status"}>
      <span className="connection-dot" aria-hidden="true" />
      <div className="connection-copy">
        <strong>{labels[state]}</strong>
        {lastUpdatedAt ? <span>Última consulta: {formatTime(lastUpdatedAt)}</span> : null}
        {state === "error" && error ? <span>{error.message}</span> : null}
      </div>
      {(state === "error" || state === "stale") && onReconnect ? (
        <button className="button button-small" onClick={onReconnect} disabled={reconnecting}>
          {reconnecting ? "A ligar…" : "Reconectar"}
        </button>
      ) : null}
    </div>
  );
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(value);
}
