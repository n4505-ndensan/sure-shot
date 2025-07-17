import { Component, Show } from "solid-js";
import { ConnectionStatus } from "./ConnectionStatus";

const HomeTitleBarContent: Component = () => {
  return (
    <div
      style={{
        "margin-right": "12px",
      }}
    >
      <ConnectionStatus />
    </div>
  );
};

export default HomeTitleBarContent;
