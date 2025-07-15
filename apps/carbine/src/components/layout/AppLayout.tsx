import { Component, JSX } from "solid-js";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  showConnectionStatus?: boolean;
  children: JSX.Element;
}

const AppLayout: Component<AppLayoutProps> = (props) => {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        padding: "1rem",
        "box-sizing": "border-box",
        "flex-direction": "column",
      }}
    >
      <AppHeader showConnectionStatus={props.showConnectionStatus} />

      <main
        style={{
          height: "100%",
          width: "100%",
          "flex-direction": "column",
          //   border: "1px solid #ddd",
          //   "background-color": "#f9f9f9",
          //   "border-radius": "4px",
        }}
      >
        {props.children}
      </main>
    </div>
  );
};

export default AppLayout;
