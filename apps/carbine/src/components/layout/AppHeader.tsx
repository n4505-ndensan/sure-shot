import { Component, Show } from "solid-js";
import { logout } from "@sureshot/api/src/api/auth/login";
import { ConnectionStatus } from "~/components/status/ConnectionStatus";
import { globalStore, setGlobalStore } from "~/store/GlobalStore";

interface Props {
  showConnectionStatus?: boolean;
}
const AppHeader: Component<Props> = (props) => {
  return (
    <header>
      <div
        style={{
          gap: "1rem",
          display: "flex",
          "flex-direction": "row",
          width: "100%",
          height: "100%",
          "align-items": "center",
          "flex-wrap": "wrap",
          "border-bottom": "1px solid #ddd",
          "margin-bottom": "2rem",
        }}
      >
        <p class="header" style={{ "margin-right": "0.5rem" }}>
          SURE-SHOT
        </p>

        <Show when={props.showConnectionStatus}>
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
        </Show>
      </div>
    </header>
  );
};

export default AppHeader;
