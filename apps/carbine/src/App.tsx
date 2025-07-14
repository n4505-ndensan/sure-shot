import { Component, onMount, Show } from "solid-js";
import MessageInput from "./components/messages/MessageInput";
import MessageList from "./components/messages/MessageList";
import { ConnectionStatus } from "./components/status/ConnectionStatus";

import "./App.scss";
import { globalStore, setGlobalStore } from "./store/GlobalStore";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { getLocalIp } from "./api/getLocalIp";
import { getDeviceName } from "./utils/getDeviceName";
import LoginForm from "./components/login/LoginForm";
import { getAuthStatus, logout } from "@sureshot/api/src/api/auth/login";

const App: Component = () => {
  onMount(async () => {
    const localIp = await getLocalIp();
    if (globalStore.localIp !== localIp) {
      setGlobalStore({ localIp });
    }
    const deviceName = await getDeviceName();
    if (globalStore.deviceName !== deviceName) {
      setGlobalStore({ deviceName });
    }

    const currentAuthStatus = await getAuthStatus();
    console.log("Current Auth Status:", currentAuthStatus);
    if (currentAuthStatus) {
      setGlobalStore({ authStatus: currentAuthStatus });
    }

    // Do you have permission to send a notification?
    let permissionGranted = await isPermissionGranted();

    // If not we need to request it
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }
  });

  return (
    <div
      style={{
        height: "100%",
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
            width: "100%",
            "align-items": "center",
            "flex-wrap": "wrap",
          }}
        >
          <p class="header" style={{ "margin-right": "0.5rem" }}>
            SURE-SHOT
          </p>

          <ConnectionStatus />

          {globalStore.authStatus?.authenticated && (
            <button
              onClick={() => {
                logout();
                setGlobalStore({ authStatus: undefined });
              }}
              style={{
                "border-color": "#ff4444",
                color: "#ff4444",
                "margin-left": "auto",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main
        style={{
          height: "100%",
          "flex-direction": "column",
          border: "1px solid #ddd",
          "background-color": "#f9f9f9",
          "border-radius": "4px",
        }}
      >
        <Show
          when={globalStore.authStatus?.authenticated}
          fallback={<LoginForm />}
        >
          <MessageList />

          <div
            style={{
              width: "100%",
              height: "1px",
              "background-color": "#ddd",
            }}
          />

          <MessageInput />
        </Show>
      </main>
    </div>
  );
};

export default App;
