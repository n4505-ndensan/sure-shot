import { HostInfo } from '@sureshot/api/src';
import { HostDropdown } from '@sureshot/ui/src';
import { message } from '@tauri-apps/plugin-dialog';
import { Component, createSignal, onMount, Show } from 'solid-js';
import { findHosts } from '~/api/hostApi';

interface Props {
  onSelect: (host: HostInfo) => void;
}

const HostSetup: Component<Props> = (props) => {
  const [hosts, setHosts] = createSignal<HostInfo[] | undefined>(undefined);

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

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'box-sizing': 'border-box',
        height: '100%',
        width: '100%',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          'flex-grow': 1,
          width: '100%',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            width: '100%',
            'align-items': 'center',
            'justify-content': 'space-between',
          }}
        >
          <p>{hosts() ? `found ${hosts()?.length} hosts.` : 'Loading...'}</p>
          <a style={{ width: 'fit-content' }} onClick={loadHosts}>
            RELOAD
          </a>
        </div>
        <Show when={hosts()?.length}>
          <HostDropdown
            hosts={hosts()!}
            onHostSelected={(host) => {
              props.onSelect(host);
            }}
          />
          {/* <HostList
            hosts={hosts()!}
            selectable
            onHostSelected={(host) => {
              props.onSelect(host);
            }}
          /> */}
        </Show>

        <a
          onClick={() => {
            setCustomFormShown(!customFormShown());
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
              width: '100%',
            }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!customIp()) {
                alert('Please enter both IP and Port');
                return;
              }
              if (hosts()?.some((h) => h.ip === customIp())) {
                alert('This host is already in the list');
                return;
              }

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
                  props.onSelect(host);

                  await message(`Host "${data.name}" found.`, { title: 'carbine', kind: 'info' });
                  return;
                }
              }
              await message(`Host not found.`, { title: 'carbine', kind: 'warning' });
            }}
          >
            <div style={{ display: 'flex', 'flex-direction': 'row', gap: '2px' }}>
              <input type='text' value={customIp()} placeholder='IP' onInput={(e) => setCustomIp(e.currentTarget.value.toString().trim())} />
              <button type='submit' style={{ width: 'fit-content' }}>
                Connect
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
};

export default HostSetup;
