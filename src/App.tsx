import "./App.scss";

import { Component, onMount, createSignal } from "solid-js";
import { updateServerList } from "./inquiry/updateServerList";
import ServerList from "./components/server_list/ServerList";
import MessageInput from "./components/messages/MessageInput";
import MessageList from "./components/messages/MessageList";

const App: Component = () => {
  const [targetIp, setTargetIp] = createSignal("");

  onMount(() => {
    updateServerList();
  });

  return (
    <div>
      <div style={{ padding: "2rem" }}>
        <p class="header">SURE-SHOT</p>

        <div
          style={{
            display: "flex",
            gap: "2rem",
            "flex-wrap": "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              width: "200px",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  "flex-direction": "row",
                  "align-items": "center",
                }}
              >
                <p
                  style={{
                    "flex-grow": 1,
                    "font-size": "12px",
                    "font-weight": "bold",
                  }}
                >
                  SERVERS
                </p>
                <button onClick={updateServerList}>RELOAD</button>
              </div>

              <ServerList
                targetIp={targetIp()}
                onClick={(server) => {
                  if (server === undefined) {
                    setTargetIp("");
                  } else if (server.status && !server.is_self) {
                    setTargetIp(server.ip);
                  }
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              width: "700px",
              border: "1px solid #ddd",
              "background-color": "#f9f9f9",
              "border-radius": "4px",
            }}
          >
            <MessageList />

            <div
              style={{
                width: "100%",
                height: "1px",
                "background-color": "#ddd",
              }}
            />

            <MessageInput
              targetIp={targetIp()}
              onIpChange={(ip) => setTargetIp(ip)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
