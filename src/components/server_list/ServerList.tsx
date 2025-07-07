import { createEffect, createSignal, onMount, Show } from "solid-js";
import { globalStore } from "../../store/GlobalStore";
import { ServerInfo } from "../../types/generated/api-types";
import { updateServerList } from "../../inquiry/updateServerList";
import { updateNickname } from "../../api/nickname/update";

interface Props {
  targetIp?: string;
  onClick?: (server: ServerInfo | undefined) => void;
}

const ServerList = (props: Props) => {
  let nicknameInput: HTMLInputElement | undefined;

  const [editNickName, setEditNickname] = createSignal(false);
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
                <div
                  style={{
                    display: "flex",
                    "flex-direction": "column",
                    "flex-grow": 1,
                    gap: "4px",
                  }}
                >
                  <Show
                    when={editNickName()}
                    fallback={
                      <div
                        style={{
                          display: "flex",
                          "flex-direction": "row",
                          "flex-grow": 1,
                          "align-items": "center",
                        }}
                      >
                        <p
                          style={{
                            "font-weight": "bold",
                            color: status
                              ? is_self
                                ? "#ff8c00"
                                : "limegreen"
                              : "gray",
                            "flex-grow": 1,
                          }}
                        >
                          {status ? name : "-"}
                        </p>
                        <Show when={is_self}>
                          <img
                            src={"/pen.png"}
                            width={10}
                            height={10}
                            style={{
                              cursor: "pointer",
                              "pointer-events": "all",
                              "image-rendering": "pixelated",
                            }}
                            onClick={() => {
                              setEditNickname(true);
                              nicknameInput?.focus();
                            }}
                          />
                        </Show>
                      </div>
                    }
                  >
                    <input
                      ref={nicknameInput}
                      type="text"
                      value={name}
                      style={{ "font-size": "12px" }}
                      onChange={(e) => {}}
                      onBlur={() => setEditNickname(false)}
                      onKeyPress={async (e) => {
                        if (e.key === "Enter") {
                          await updateNickname(e.currentTarget.value, name);
                          setEditNickname(false);
                          updateServerList();
                        }
                      }}
                    />
                  </Show>
                  <p style={{ "font-size": "9px" }}>{ip}</p>
                </div>
              </div>
            );
          })}
        </Show>
      </Show>
    </div>
  );
};

export default ServerList;
