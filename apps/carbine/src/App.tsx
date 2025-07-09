import { Component, onMount, createSignal } from "solid-js";
import { updateServerList } from "./inquiry/updateServerList";
import MessageInput from "./components/messages/MessageInput";
import MessageList from "./components/messages/MessageList";
import { HostStatus } from "./components/host/HostStatus";

import "./App.scss";

const App: Component = () => {
  const [targetIp, setTargetIp] = createSignal("");

  onMount(() => {
    updateServerList();
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        padding: "2rem",
        gap: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
          gap: "1rem",
          "align-items": "center",
          "flex-wrap": "wrap",
        }}
      >
        <p class="header">SURE-SHOT</p>

        {/* Host Status Section */}
        <HostStatus />
      </div>

      <div
        style={{
          display: "flex",
          "flex-wrap": "wrap",
          "flex-grow": 1,
        }}
      >
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
  );
};

export default App;
