import "./App.scss";

import { Component, onMount } from "solid-js";
import { updateServerList } from "./inquiry/updateServerList";
import { globalStore } from "./store/GlobalStore";

const App: Component = () => {
  onMount(() => {
    updateServerList();
  });

  const portList = () => {
    if (!globalStore.ports) {
      return <p>Loading...</p>;
    } else if (globalStore.ports.length === 0) {
      return <p>No ports found.</p>;
    }

    return (
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "margin-top": "1rem",
        }}
      >
        {globalStore.ports.map(({ message, ip, name, port, status }) => {
          return (
            <div
              style={{
                display: "flex",
                "flex-direction": "row",
                gap: "1rem",
              }}
            >
              <p>
                {ip}:{port}
              </p>
              <p
                style={{
                  "font-weight": "bold",
                  color: status ? "limegreen" : "gray",
                }}
              >
                {status ? name : "-"}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div style={{ padding: "2rem" }}>
        <h1 class="header">search ports</h1>

        <button onClick={updateServerList}>retry</button>

        {portList()}
      </div>
    </div>
  );
};

export default App;
