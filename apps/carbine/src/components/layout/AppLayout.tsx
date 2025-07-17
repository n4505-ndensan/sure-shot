import { Component, JSX } from "solid-js";
import TitleBar from "./TitleBar";

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
        "flex-direction": "column",
        "box-sizing": "border-box",
      }}
    >
      <TitleBar />
      {/* <AppHeader showConnectionStatus={props.showConnectionStatus} /> */}

      <main
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          "flex-grow": 1,
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
