import shotLogo from '@/assets/icon.png';
import { HostInfo } from '@sureshot/api/src';
import { createSignal, For, onMount, Show } from 'solid-js';
import { findHostsInBrowser } from '../../src/api/browserHostApi';
import { ChromeAuthManager } from '../../src/utils/ChromeAuthManager';
import { getDiscoveredHosts, saveDiscoveredHosts } from '../../src/utils/storage';
import './App.css';

type AppState = 'loading' | 'no-auth' | 'scanning' | 'host-selection' | 'login' | 'authenticated';

function App() {
  const [state, setState] = createSignal<AppState>('loading');
  const [hosts, setHosts] = createSignal<HostInfo[]>([]);
  const [selectedHost, setSelectedHost] = createSignal<HostInfo | null>(null);
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [isScanning, setIsScanning] = createSignal(false);

  onMount(async () => {
    const authManager = ChromeAuthManager.getInstance();

    // 初期化
    await authManager.initialize();

    // 既存の認証情報をチェック
    const authStatus = authManager.getAuthStatus();
    if (authStatus && authStatus.host && authManager.getToken()) {
      // トークンが有効かチェック
      const isValid = await authManager.validateToken();
      if (isValid) {
        setSelectedHost(authStatus.host);
        setState('authenticated');
        return;
      } else {
        await authManager.clearAuthStatus();
      }
    } // キャッシュされたホスト情報を取得
    const cachedHosts = await getDiscoveredHosts();
    if (cachedHosts.length > 0) {
      setHosts(cachedHosts);
      setState('host-selection');
    } else {
      setState('no-auth');
    }
  });

  const scanForHosts = async () => {
    setIsScanning(true);
    setState('scanning');
    setError('');

    try {
      const discoveredHosts = await findHostsInBrowser();
      setHosts(discoveredHosts);
      await saveDiscoveredHosts(discoveredHosts);

      if (discoveredHosts.length > 0) {
        setState('host-selection');
      } else {
        setError('No servers found on local network');
        setState('no-auth');
      }
    } catch (err) {
      setError('Failed to scan for hosts');
      setState('no-auth');
    } finally {
      setIsScanning(false);
    }
  };

  const selectHost = (host: HostInfo) => {
    setSelectedHost(host);
    setState('login');
  };

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    const host = selectedHost();
    if (!host || !username() || !password()) return;

    const authManager = ChromeAuthManager.getInstance();
    const success = await authManager.login(host, {
      name: username(),
      password: password(),
    });

    if (success) {
      setState('authenticated');
    } else {
      setError('Login failed. Please check your credentials.');
      setState('login');
    }
  };

  const logout = async () => {
    const authManager = ChromeAuthManager.getInstance(); // backgroundの初期化はされない
    await authManager.clearAuthStatus();
    setSelectedHost(null);
    setUsername('');
    setPassword('');
    setState('no-auth');
  };

  return (
    <div style={{ padding: '12px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          'flex-direction': 'row',
          'align-items': 'center',
          gap: '8px',
          'margin-bottom': '16px',
        }}
      >
        <img src={shotLogo} alt='sure-shot logo' width={16} height={16} />
        <p
          style={{
            'font-size': '12px',
            'font-weight': 'bold',
            margin: 0,
          }}
        >
          sure-shot
        </p>
      </div>

      {/* Error Display */}
      <Show when={error()}>
        <div
          style={{
            color: 'red',
            'font-size': '12px',
            'margin-bottom': '8px',
            padding: '8px',
            'background-color': '#ffe6e6',
            'border-radius': '4px',
          }}
        >
          {error()}
        </div>
      </Show>

      {/* Loading State */}
      <Show when={state() === 'loading'}>
        <div>Loading...</div>
      </Show>

      {/* No Auth State */}
      <Show when={state() === 'no-auth'}>
        <div>
          <p style={{ 'font-size': '12px', 'margin-bottom': '12px' }}>Connect to a sure-shot server to start messaging</p>
          <button
            onClick={scanForHosts}
            disabled={isScanning()}
            style={{
              width: '100%',
              padding: '8px',
              'background-color': '#007acc',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
            }}
          >
            {isScanning() ? 'Scanning...' : 'Scan for Servers'}
          </button>
        </div>
      </Show>

      {/* Scanning State */}
      <Show when={state() === 'scanning'}>
        <div style={{ 'text-align': 'center' }}>
          <p>Scanning local network for servers...</p>
          <div
            style={{
              margin: '16px auto',
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              'border-top': '2px solid #007acc',
              'border-radius': '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </Show>

      {/* Host Selection State */}
      <Show when={state() === 'host-selection'}>
        <div>
          <p style={{ 'font-size': '12px', 'margin-bottom': '12px' }}>Select a server:</p>
          <For each={hosts()}>
            {(host) => (
              <div
                onClick={() => selectHost(host)}
                style={{
                  padding: '8px',
                  'margin-bottom': '4px',
                  border: '1px solid #ddd',
                  'border-radius': '4px',
                  cursor: 'pointer',
                  'background-color': '#f9f9f9',
                }}
              >
                <strong>{host.name}</strong>
                <br />
                <small>
                  {host.ip}:{host.port}
                </small>
              </div>
            )}
          </For>
          <button
            onClick={scanForHosts}
            style={{
              width: '100%',
              padding: '6px',
              'margin-top': '8px',
              'background-color': '#f0f0f0',
              border: '1px solid #ddd',
              'border-radius': '4px',
              cursor: 'pointer',
            }}
          >
            Rescan
          </button>
        </div>
      </Show>

      {/* Login State */}
      <Show when={state() === 'login' && selectedHost()}>
        <div>
          <p style={{ 'font-size': '12px', 'margin-bottom': '12px' }}>Login to {selectedHost()?.name}</p>
          <form onSubmit={handleLogin}>
            <input
              type='text'
              placeholder='Username'
              value={username()}
              onInput={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                'margin-bottom': '8px',
                border: '1px solid #ddd',
                'border-radius': '4px',
                'box-sizing': 'border-box',
              }}
            />
            <input
              type='password'
              placeholder='Password'
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                'margin-bottom': '12px',
                border: '1px solid #ddd',
                'border-radius': '4px',
                'box-sizing': 'border-box',
              }}
            />
            <button
              type='submit'
              style={{
                width: '100%',
                padding: '8px',
                'background-color': '#007acc',
                color: 'white',
                border: 'none',
                'border-radius': '4px',
                cursor: 'pointer',
              }}
            >
              Login
            </button>
          </form>
          <button
            onClick={() => setState('host-selection')}
            style={{
              width: '100%',
              padding: '6px',
              'margin-top': '8px',
              'background-color': '#f0f0f0',
              border: '1px solid #ddd',
              'border-radius': '4px',
              cursor: 'pointer',
            }}
          >
            Back to Server Selection
          </button>
        </div>
      </Show>

      {/* Authenticated State */}
      <Show when={state() === 'authenticated' && selectedHost()}>
        <div>
          <p
            style={{
              'font-size': '12px',
              'margin-bottom': '12px',
              color: 'green',
            }}
          >
            ✓ Connected to {selectedHost()?.name}
          </p>
          <p
            style={{
              'font-size': '11px',
              color: '#666',
              'margin-bottom': '12px',
            }}
          >
            {selectedHost()?.ip}:{selectedHost()?.port}
          </p>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              'background-color': '#dc3545',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </div>
      </Show>
    </div>
  );
}

export default App;
