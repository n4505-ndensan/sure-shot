import { HostInfo } from '@sureshot/api/src';
import { HostList } from '@sureshot/ui/src';
import { Component, createSignal, onMount, Show } from 'solid-js';
import { findHosts } from '~/api/hostApi';

interface Props {
  onSelect: (host: HostInfo) => void;
}

const HostSetup: Component<Props> = (props) => {
  const [hosts, setHosts] = createSignal<HostInfo[] | undefined>(undefined);

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
      </div>
    </div>
  );
};

export default HostSetup;
