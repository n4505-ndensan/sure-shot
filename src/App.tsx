import "./App.scss";

import { Component, createSignal, onMount } from "solid-js";
import { fetchSelf } from "./fetchSelf";


const App: Component = () => {
  const [ports, setPorts] = createSignal<{ [key: string]: string }>({
    "Loading...": "",
  });

  const searchPorts = () => {
    setPorts({ "Loading...": "" });
    fetchSelf(`/find`)
      .then((response) => response.json())
      .then((json) => {
        console.log("Response from server:", json);
        setPorts(json);
      })
      .catch((error) => {
        console.error("Error fetching from server:", error);
      });
  };

  onMount(() => {
    searchPorts();
  });

  return (
    <div>
      <div style={{ padding: "2rem" }}>
        <h1 class="header">search ports</h1>

        <button onClick={searchPorts}>retry</button>

        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            "margin-top": "1rem",
          }}
        >
          {Object.entries(ports()).map(([port, status]) => {
            return (
              <div
                style={{
                  display: "flex",
                  "flex-direction": "row",
                  gap: "1rem",
                }}
              >
                <p>{port}:</p>
                <p
                  style={{
                    "font-weight": "bold",
                    color: status ? "limegreen" : "gray",
                  }}
                >
                  {status ? "USED" : "-"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;
