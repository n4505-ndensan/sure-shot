import { Component, createEffect, createSignal, onMount, Show } from "solid-js";
import MessageInput from "./components/messages/MessageInput";
import MessageList from "./components/messages/MessageList";
import { HostStatus } from "./components/host/HostStatus";

import "./App.scss";
import { globalStore, setGlobalStore } from "./store/GlobalStore";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { getLocalIp } from "./api/getLocalIp";
import { getDeviceName } from "./utils/getDeviceName";
import LoginForm from "./components/LoginForm";
import { AuthStatus, getAuthStatus } from "@sureshot/api/src";

const App: Component = () => {
  const [status, setStatus] = createSignal<AuthStatus | undefined>();

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

    // await createChannel({
    //   id: "messages",
    //   name: "Messages",
    //   description: "Notifications for new messages",
    //   importance: Importance.High,
    //   visibility: Visibility.Private,
    //   lights: true,
    //   lightColor: "#ff0000",

    //   vibration: true,
    //   sound: "notification_sound",
    // });
  });

  createEffect(async () => {
    globalStore.authStatus;
    const authStatus = await getAuthStatus();
    setStatus(authStatus);
    0;
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
          <div
            style={{
              gap: "1rem",
              display: "flex",
              "flex-direction": "row",
              "align-items": "center",
            }}
          >
            <p class="header">SURE-SHOT</p>

            <p>
              {status()?.authenticated
                ? `logged in as ${status()?.name}`
                : "logged out"}
            </p>
          </div>

          {/* Host Status Section */}
          <HostStatus />
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
          when={globalStore.authStatus === "authenticated"}
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
