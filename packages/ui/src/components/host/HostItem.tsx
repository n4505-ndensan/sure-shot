import { HostInfo } from '@sureshot/api/src';
import { Component, createEffect, createSignal, Show } from 'solid-js';

interface Props {
  host: HostInfo;
  selected?: boolean;
  onSelect?: (host: HostInfo) => void;
}

const HostItem: Component<Props> = (props) => {
  const [host, setHost] = createSignal<HostInfo>(props.host);
  const [selected, setSelected] = createSignal<boolean>(false);


  createEffect(() => {
    setHost(props.host);
    setSelected(props.selected ?? false);
  });

  return (
    <div
      onClick={() => props.onSelect?.(host())}
      style={{
        display: 'flex',
        'flex-direction': 'row',
        padding: '8px',
        'margin-bottom': '4px',
        border: '1px solid #ddd',
        'border-radius': '4px',
        cursor: 'pointer',
        'align-items': 'center',
        gap: '8px',
        'background-color': '#FFFFFF',
      }}
    >
      <p
        style={{
          'font-size': '12px',
          'font-weight': 'bold',
          'flex-grow': 1,
          color: selected() ? '#007bff' : '#000',
        }}
      >
        {selected() ? '>  ' : ''}
        {host().name}
      </p>
      <p>
        {host().ip}:{host().port}
      </p>
    </div>
  );
};

export default HostItem;
