import { HostInfo } from '@sureshot/api/src';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';

import './HostDropdown.css';

interface Props {
  hosts: HostInfo[];
  onHostSelected?: (host: HostInfo) => void;
}

const HostDropdown: Component<Props> = (props) => {
  let hostSelectRef: HTMLSelectElement | undefined;
  const [hosts, setHosts] = createSignal<HostInfo[]>(props.hosts);

  createEffect(() => {
    setHosts(props.hosts);
    if (props.hosts.length > 0) {
      props.onHostSelected?.(hosts()[0]);
    }
  });

  return (
    <div class='host_dropdown'>
      <select
        class='host_dropdown_select'
        disabled={hosts().length === 0}
        onChange={(e) => {
          const selectedHost = props.hosts.find((host) => host.ip === e.currentTarget.value);
          if (selectedHost) {
            props.onHostSelected?.(selectedHost);
          }
        }}
      >
        {/* <option value=''>--Select a host--</option> */}
        <Show when={hosts()?.length === 0}>
          <option value='' disabled selected>
            No hosts available
          </option>
        </Show>
        <For each={hosts()}>
          {(host) => (
            <option value={host.ip}>
              {host.name} ({host.ip}:{host.port})
            </option>
          )}
        </For>
      </select>
    </div>
  );
};

export default HostDropdown;
