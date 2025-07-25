import { HostInfo } from '@sureshot/api/src';
import { HostDropdown } from '@sureshot/ui/src';
import { message } from '@tauri-apps/plugin-dialog';
import { Component, createSignal, onMount, Show } from 'solid-js';
import { findHosts } from '~/api/hostApi';
import { globalStore } from '~/store/GlobalStore';

import '@styles/login.css';

interface Props {
  onProceed: (selectedHost: HostInfo) => void;
}

const HostSetup: Component<Props> = (props) => {
  const [hosts, setHosts] = createSignal<HostInfo[] | undefined>(undefined);
  const [selectedHost, setSelectedHost] = createSignal<HostInfo | null>(null);

  const [customFormShown, setCustomFormShown] = createSignal(false);

  const [customIp, setCustomIp] = createSignal('');

  onMount(async () => {
    await loadHosts();
  });

  const loadHosts = async () => {
    setHosts(undefined);
    const hosts = await findHosts();
    setHosts(hosts);
  };

  const [customHostLoading, setCustomHostLoading] = createSignal(false);

  const addCustomHost = async () => {
    if (!customIp()) {
      alert('Please enter both IP and Port');
      return;
    }
    if (hosts()?.some((h) => h.ip === customIp())) {
      alert('This host is already in the list');
      return;
    }

    setCustomHostLoading(true);

    try {
      // pingをフェッチ
      const result = await fetch(`http://${customIp()}:8000/ping`, {
        method: 'GET',
      });
      if (result.ok) {
        const data = await result.json();
        if (data.name) {
          const host: HostInfo = {
            ip: customIp(),
            port: 8000,
            name: (data.name as string) || 'Custom Host',
            status: result.status.toString(),
            message: (data.message as string) || 'no message',
            is_self: data.is_self,
          };
          setHosts([...(hosts() || []), host]);
          await message(`Host "${data.name}" found.`, { title: 'carbine', kind: 'info' });
        } else {
          await message(`Host "${customIp()}" responsed invalid response.`, { title: 'carbine', kind: 'warning' });
        }
      } else {
        await message(`Host "${customIp()}" not found.`, { title: 'carbine', kind: 'warning' });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await message(`Error: ${errorMsg} ("${customIp()}")`, { title: 'carbine', kind: 'error' });
    } finally {
      setCustomHostLoading(false);
    }
    setCustomHostLoading(false);
  };

  const localIpMask = () => {
    const localIp = globalStore.localIp;
    return localIp ? localIp.split('.').slice(0, 3).join('.') + '.0/24' : '';
  };

  return (
    <div class='content'>
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          width: '100%',
          gap: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'align-items': 'center',
            width: '100%',
            'justify-content': 'space-between',
          }}
        >
          <p>{hosts() ? `found ${hosts()?.length} hosts.` : 'Loading...'}</p>
          <a style={{ width: 'fit-content' }} onClick={loadHosts}>
            RELOAD
          </a>
        </div>

        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
          }}
        >
          <HostDropdown
            hosts={hosts() ?? []}
            onHostSelected={(host) => {
              setSelectedHost(host);
            }}
          />
        </div>

        <button
          style={{ width: 'fit-content', 'margin-left': 'auto' }}
          onClick={() => {
            props.onProceed(selectedHost()!);
            setSelectedHost(null);
          }}
          disabled={!selectedHost()}
        >
          Give A Shot!
        </button>

        <Show when={hosts()?.length === 0}>
          <p style={{ color: '#559955' }}>Make sure that host server (server.exe) is running in your local LAN ({localIpMask()}).</p>
        </Show>

        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'align-items': 'center',
            height: '32px',
          }}
        >
          <a
            onClick={() => {
              setCustomFormShown(!customFormShown());
            }}
            style={{
              width: 'fit-content',
              'margin-right': 'auto',
              color: 'gray',
            }}
          >
            {customFormShown() ? 'Hide' : 'Use custom host'}
          </a>

          <Show when={customFormShown()}>
            <form
              style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '8px',
              }}
              onSubmit={async (e) => {
                e.preventDefault();
                addCustomHost();
              }}
            >
              <div style={{ display: 'flex', 'flex-direction': 'row', gap: '2px' }}>
                <input
                  type='text'
                  value={customIp()}
                  placeholder='e.g. 192.168.X.X'
                  onInput={(e) => setCustomIp(e.currentTarget.value.toString().trim())}
                />
                <button type='submit' style={{ width: 'fit-content' }} disabled={customHostLoading()}>
                  {customHostLoading() ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default HostSetup;
