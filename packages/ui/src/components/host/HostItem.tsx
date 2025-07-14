import { HostInfo } from "@sureshot/api/src";
import { Component, createEffect, createSignal, Show } from "solid-js";

interface Props {
  host: HostInfo;
  selected?: boolean;
  onSelect?: (host: HostInfo) => void;
}

const HostItem: Component<Props> = (props) => {
  const [selected, setSelected] = createSignal<boolean>(false);
  const { host } = props;

  createEffect(() => {
    setSelected(props.selected ?? false);
  });

  console.log(selected);
  return (
    <div
      onClick={() => props.onSelect?.(host)}
      style={{
        display: "flex",
        "flex-direction": "row",
        padding: "8px",
        "margin-bottom": "4px",
        border: "1px solid #ddd",
        "border-radius": "4px",
        cursor: "pointer",
        "align-items": "center",
        gap: "8px",
        "background-color": "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
        }}
      >
        <p
          style={{
            "font-weight": "bold",
            color: selected() ? "#007bff" : "#000",
          }}
        >
          {host.name}
        </p>
        <p>
          {host.ip}:{host.port}
        </p>
      </div>
    </div>
  );
};

export default HostItem;
