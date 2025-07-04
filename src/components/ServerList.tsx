import { createEffect, createSignal, onMount, Show } from "solid-js";
import { globalStore } from "../store/GlobalStore";
import { ServerInfo } from "../types/generated/api-types";
import { updateServerList } from "../inquiry/updateServerList";

interface Props {
  targetIp?: string;
  onClick?: (server: ServerInfo | undefined) => void;
}

const ServerList = (props: Props) => {
  const [targetIp, setTargetIp] = createSignal("");
  // propsからtargetIpが渡されたら、内部状態を更新
  createEffect(() => {
    if (props.targetIp !== undefined) {
      setTargetIp(props.targetIp);
    }
  });

  onMount(() => {
    updateServerList();
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "margin-top": "1rem",
      }}
    >
      <Show
        when={globalStore.servers !== undefined}
        fallback={<p>Loading...</p>}
      >
        <Show when={globalStore.servers?.length === 0}>
          <p>No servers found.</p>
        </Show>

        <Show when={globalStore.servers.length > 0}>
          {globalStore.servers.map((server) => {
            const { ip, name, port, status, is_self } = server;
            const selected = targetIp() === ip;
            return (
              <div
                style={{
                  display: "flex",
                  "flex-direction": "row",
                  gap: "1rem",
                  padding: "0.5rem",
                  "border-radius": "4px",
                  cursor: status && !is_self ? "pointer" : "default",
                  "background-color": is_self
                    ? "#fff9e6"
                    : status
                    ? "#f0f8ff"
                    : "transparent",
                  "border-width": "1px",
                  "border-style": "solid",
                  "border-color": selected
                    ? "red"
                    : is_self
                    ? "#ffc107"
                    : "#e0e8f0",
                  opacity: is_self ? 0.8 : 1,
                  "align-items": "center",
                }}
                onClick={() => props.onClick?.(selected ? undefined : server)}
                title={
                  is_self
                    ? "This is your server"
                    : status
                    ? `Click to select ${name} (${ip})`
                    : ""
                }
              >
                <p>{ip}</p>
                <p
                  style={{
                    "font-weight": "bold",
                    color: status
                      ? is_self
                        ? "#ff8c00"
                        : "limegreen"
                      : "gray",
                  }}
                >
                  {status ? name : "-"}
                </p>
              </div>
            );
          })}
        </Show>
      </Show>
    </div>
  );
};

export default ServerList;
