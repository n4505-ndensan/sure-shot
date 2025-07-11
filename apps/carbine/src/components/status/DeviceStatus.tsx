import { Component } from "solid-js";
import { logout } from "@sureshot/api";
import { globalStore, setGlobalStore } from "~/store/GlobalStore";

export const DeviceStatus: Component = () => {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "row",
        border: "1px solid #ccc",
        padding: "1rem",
        "border-radius": "8px",
        gap: "1rem",
        "align-items": "center",
      }}
    >
      <p style={{ "font-weight": "bold" }}>Device</p>

      <p>
        {globalStore.authStatus?.authenticated
          ? `logged in as ${globalStore.authStatus.name}`
          : "logged out"}
      </p>
      {globalStore.authStatus?.authenticated && (
        <button
          onClick={() => {
            logout();
            setGlobalStore({ authStatus: undefined });
          }}
          style={{
            "border-color": "#ff4444",
            color: "#ff4444",
          }}
        >
          Logout
        </button>
      )}
    </div>
  );
};
