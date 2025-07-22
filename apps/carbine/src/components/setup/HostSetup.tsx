import { HostInfo } from '@sureshot/api/src';
import { HostList } from '@sureshot/ui/src';
import { Component, createSignal, onMount, Show } from 'solid-js';
import { findHosts } from '~/api/hostApi';

interface Props {
  onSelect: (host: HostInfo) => void;
}

const HostSetup: Component<Props> = (props) => {
  const [hosts, setHosts] = createSignal<HostInfo[] | undefined>(undefined);

  const [customFormShown, setCustomFormShown] = createSignal(false);

  const [customIp, setCustomIp] = createSignal('');
  const [customPort, setCustomPort] = createSignal(8000);

  const [customConnectResult, setCustomConnectResult] = createSignal('');

  onMount(async () => {
    await loadHosts();
  });

  const loadHosts = async () => {
    setHosts(undefined);
    const hosts = await findHosts();
    setHosts(hosts);
  };

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        height: '100%',
        margin: '0 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          'flex-grow': 1,
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <p>{hosts() ? `found ${hosts()?.length} hosts.` : 'Loading...'}</p>
          <a style={{ width: 'fit-content' }} onClick={loadHosts}>
            RELOAD
          </a>
        </div>
        <Show when={hosts()?.length ?? 0 > 0}>
          <HostList
            hosts={hosts()!}
            selectable
            onHostSelected={(host) => {
              props.onSelect(host);
            }}
          />
        </Show>

        <a
          onClick={() => {
            setCustomFormShown(!customFormShown());
          }}
        >
          {customFormShown() ? 'Hide custom host' : 'Use custom host'}
        </a>

        <Show when={customFormShown()}>
          <form
            style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '8px',
              width: '100%',
            }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!customIp() || !customPort()) {
                alert('Please enter both IP and Port');
                return;
              }
              if (hosts()?.some((h) => h.ip === customIp() && h.port === customPort())) {
                alert('This host is already in the list');
                return;
              }

              // pingをフェッチ
              const result = await fetch(`http://${customIp()}:${customPort()}/ping`, {
                method: 'GET',
              });
              if (result.ok) {
                const data = await result.json();
                if (data.name) {
                  const host: HostInfo = {
                    ip: customIp(),
                    port: customPort(),
                    name: (data.name as string) || 'Custom Host',
                    status: result.status.toString(),
                    message: (data.message as string) || 'no message',
                    is_self: data.is_self,
                  };
                  setHosts([...(hosts() || []), host]);
                  props.onSelect(host);

                  setCustomConnectResult('successfully ping to ' + data.name);
                  return;
                }
              }
              setCustomConnectResult('Failed to connect');
            }}
          >
            <label style={{ display: 'flex', 'flex-direction': 'row' }}>
              <p style={{ width: '40px' }}>IP:</p>
              <input type='text' value={customIp()} onInput={(e) => setCustomIp(e.currentTarget.value.toString().trim())} />
            </label>
            <label style={{ display: 'flex', 'flex-direction': 'row' }}>
              <p style={{ width: '40px' }}>Port:</p>
              <input type='number' value={customPort()} onInput={(e) => setCustomPort(Number(e.currentTarget.value.toString().trim()))} />
            </label>
            <div style={{ display: 'flex', 'flex-direction': 'row', gap: '8px' }}>
              <button type='submit' style={{ width: 'fit-content' }}>
                Connect
              </button>
              <p>{customConnectResult()}</p>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
};

export default HostSetup;
