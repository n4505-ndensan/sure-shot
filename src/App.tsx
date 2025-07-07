import "./App.scss";

import { Component, onMount, createSignal } from "solid-js";
import { updateServerList } from "./inquiry/updateServerList";
import ServerList from "./components/server_list/ServerList";
import MessageInput from "./components/MessageInput";
import MessageList from "./components/MessageList";

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

          <div style={{ "flex-grow": 1, "min-width": "400px" }}>
            <MessageList />
          </div>
        </div>

        <MessageInput
          targetIp={targetIp()}
          onIpChange={(ip) => setTargetIp(ip)}
        />
      </div>
    </div>
  );
};

export default App;
