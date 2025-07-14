import { Component, createEffect, createSignal, onMount, Show } from "solid-js";
import { getAuthStatus, type HostInfo } from "@sureshot/api";
import { globalStore } from "~/store/GlobalStore";

export const ConnectionStatus: Component = () => {
  const [host, setHost] = createSignal<HostInfo | null>(null);

  const loadHost = async () => {
    try {
      const currentHost = getAuthStatus()?.host;
      console.log("Current Host:", currentHost);
      if (!currentHost) {
        setHost(null);
        return;
      }
      setHost(currentHost);
    } catch (err) {
      console.log("Failed to load host:", err);
      setHost(null);
    }
  };

  createEffect(() => {
    globalStore.authStatus;
    loadHost();
  });

  onMount(() => {
    loadHost();
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "row",
        padding: "1rem",
        "border-radius": "8px",
        gap: "1rem",
        "align-items": "center",
      }}
    >
      <div
        style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
      >
        <p style={{ "font-weight": "bold" }}>Client</p>
        <p>
          {globalStore.authStatus?.authenticated
            ? `${globalStore.authStatus.name}`
            : "logged out"}
        </p>
      </div>

      <p>{host() !== null ? "----->" : "--/-->"}</p>

      <div
        style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
      >
        <p style={{ "font-weight": "bold" }}>Host</p>

        <Show
          when={host() !== null}
          fallback={<p style={{ color: "red" }}>No host</p>}
        >
          <p>{host()?.name}</p>
        </Show>
      </div>
    </div>
  );
};
