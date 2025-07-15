import { Route, Router, useNavigate } from "@solidjs/router";
import { getAuthStatus } from "@sureshot/api/src";
import { globalStore, setGlobalStore } from "./store/GlobalStore";
import { getDeviceName } from "./utils/getDeviceName";
import { getLocalIp } from "./api/getLocalIp";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import Setup from "./routes/setup";
import Home from "./routes/home";
import { onMount } from "solid-js";

import "./App.scss";

const App = () => {
  // check auth status
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
    <Router>
      <Route path="/setup" component={Setup} />
      <Route path="/home" component={Home} />
      <Route
        path="*"
        component={() => {
          // 未知のルートは setup にリダイレクト
          const navigate = useNavigate();
          navigate("/setup");
          return null;
        }}
      />
    </Router>
  );
};

export default App;
