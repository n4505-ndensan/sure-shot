import { Component, createSignal, onMount } from "solid-js";
import {
  getCurrentHost,
  refreshHost,
  type ServerInfo,
} from "@sureshot/api";

export const HostStatus: Component = () => {
  const [host, setHost] = createSignal<ServerInfo | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const loadHost = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentHost = await getCurrentHost();
      setHost(currentHost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load host");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      await refreshHost();
      await loadHost();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh host");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadHost();
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "row",
        border: "1px solid #ccc",
        padding: "1rem",
        "border-radius": "8px",
        gap: "1rem",
        "align-items": "center",
      }}
    >
      <p style={{ "font-weight": "bold" }}>Host</p>

      {loading() && <p>Loading...</p>}

      {error() && (
        <div style={{ color: "red", "margin-bottom": "1rem" }}>
          <div>Error: {error()}</div>
          <button onClick={handleRefresh} disabled={loading()}>
            {loading() ? "Refreshing..." : "Retry"}
          </button>
        </div>
      )}

      {host() && !loading() && !error() && (
        <>
          <p style={{ "flex-grow": 1 }}>{host()!.name}</p>
          <button onClick={handleRefresh} disabled={loading()}>
            Refresh
          </button>
        </>
      )}

      {!host() && !loading() && !error() && (
        <div>
          <div style={{ color: "orange" }}>No host found</div>
          <button onClick={handleRefresh} disabled={loading()}>
            {loading() ? "Searching..." : "Search for Host"}
          </button>
        </div>
      )}
    </div>
  );
};
