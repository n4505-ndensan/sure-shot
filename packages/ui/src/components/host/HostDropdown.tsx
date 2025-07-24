import { HostInfo } from '@sureshot/api/src';
import { Component, For } from 'solid-js';

import './HostDropdown.css';

interface Props {
  selectable?: boolean;
  hosts: HostInfo[];
  onHostSelected?: (host: HostInfo) => void;
}

const HostDropdown: Component<Props> = (props) => {
  let hostSelectRef: HTMLSelectElement | undefined;

  return (
    <div class='host_dropdown'>
      <select
        class='host_dropdown_select'
        ref={(ref) => (hostSelectRef = ref)}
        onChange={(e) => {
          const selectedHost = props.hosts.find((host) => host.ip === e.currentTarget.value);
          if (selectedHost) {
            props.onHostSelected?.(selectedHost);
          }
        }}
      >
        {/* <option value=''>--Select a host--</option> */}
        <For each={props.hosts}>
          {(host, index) => (
            <option value={host.ip} style={{ display: 'flex', 'flex-direction': 'row', 'justify-content': 'space-between' }}>
              {host.name} ({host.ip}:{host.port})
            </option>
          )}
        </For>
      </select>
    </div>
  );
};

export default HostDropdown;
