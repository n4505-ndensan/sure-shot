import { Component, onMount, createSignal } from "solid-js";
import MessageInput from "./components/messages/MessageInput";
import MessageList from "./components/messages/MessageList";
import { HostStatus } from "./components/host/HostStatus";

import "./App.scss";
import { getLocalIp } from "./api/host/getLocalIp";

const App: Component = () => {
  const [targetIp, setTargetIp] = createSignal("");

  onMount(() => {
    getLocalIp();
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <header>
        <div
          style={{
            gap: "1rem",
            display: "flex",
            "flex-direction": "row",
            "align-items": "center",
            "flex-wrap": "wrap",
          }}
        >
          <p class="header">SURE-SHOT</p>

          {/* Host Status Section */}
          <HostStatus />
        </div>
      </header>

      <main
        style={{
          display: "flex",
          "flex-direction": "column",
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
      </main>
    </div>
  );
};

export default App;
