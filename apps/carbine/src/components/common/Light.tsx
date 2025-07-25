import { type Component, createEffect, createSignal, Show } from 'solid-js';

interface LightProps {
  class?: string;
  on?: boolean;
  color?: string;
}

const Light: Component<LightProps> = (props: LightProps) => {
  const [lightColor, setLightColor] = createSignal<string>(props.color || 'limegreen');
  const width = 8;
  const height = 8;
  const radius = 2;

  createEffect(() => {
    setLightColor(props.color || 'limegreen');
  });

  return (
    <svg
      class={props.class}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${width} ${height}`}
      xmlns='http://www.w3.org/2000/svg'
    >
      <Show when={true}>
        <g
          style={{
            filter: `drop-shadow(0 0 ${props.on ? '1px' : '0'} ${lightColor()})`,
            opacity: props.on ? 1 : 0,
            transition: props.on ? 'opacity 0.2s ease' : 'none',
          }}
        >
          <circle cx={width / 2} cy={height / 2} r={radius} fill={lightColor()} />
        </g>
      </Show>
    </svg>
  );
};

export default Light;
