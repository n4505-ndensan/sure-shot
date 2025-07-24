import { Route, Router, useNavigate } from '@solidjs/router';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { onMount } from 'solid-js';
import { getLocalIp } from './api/getLocalIp';
import Home from './routes/home';
import Login from './routes/login';
import Setup from './routes/setup';
import { globalStore, setGlobalStore } from './store/GlobalStore';
import { getDeviceName } from './utils/getDeviceName';

import './App.css';
import { isMobile } from './utils/PlatformUtils';
import { getAuthStatus } from '@sureshot/api/src';
import { startBackgroundService } from 'tauri-plugin-carbine-notifications';

const App = () => {
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
      permissionGranted = permission === 'granted';
    }

    if (isMobile()) {
      const authStatus = getAuthStatus();
      console.log('Auth status on pause:', `http://${authStatus?.host?.ip}:${authStatus?.host?.port}`);
      if (authStatus && authStatus.isAuthenticated && authStatus.host) {
        await startBackgroundService({
          serverUrl: `http://${authStatus.host.ip}:${authStatus.host.port}`,
        });
      }
    }
  });

  return (
    <Router>
      <Route path='/setup' component={Setup} />
      <Route path='/login' component={Login} />
      <Route path='/home' component={Home} />
      <Route
        path='*'
        component={() => {
          // 未知のルートは setup にリダイレクト
          const navigate = useNavigate();
          navigate('/setup');
          return null;
        }}
      />
    </Router>
  );
};

export default App;
