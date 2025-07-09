import { Component, onMount, createSignal } from "solid-js";
import MessageInput from "./components/messages/MessageInput";
import MessageList from "./components/messages/MessageList";
import { HostStatus } from "./components/host/HostStatus";

import "./App.scss";
import { getDeviceName, getLocalIp } from "@sureshot/api";
import { globalStore, setGlobalStore } from "./store/GlobalStore";
import {
  createChannel,
  Importance,
  isPermissionGranted,
  requestPermission,
  Visibility,
} from "@tauri-apps/plugin-notification";

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
    
    // Do you have permission to send a notification?
    let permissionGranted = await isPermissionGranted();

    // If not we need to request it
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    await createChannel({
      id: "messages",
      name: "Messages",
      description: "Notifications for new messages",
      importance: Importance.High,
      visibility: Visibility.Private,
      lights: true,
      lightColor: "#ff0000",

      vibration: true,
      sound: "notification_sound",
    });
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
            width: "100%",
            "align-items": "center",
            "justify-content": "space-between",
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

        <MessageInput />
      </main>
    </div>
  );
};

export default App;
