import { HostInfo } from "@sureshot/api/src";
import { Component, createSignal } from "solid-js";
import HostItem from "./HostItem";

interface Props {
  selectable?: boolean;
  hosts: HostInfo[];
  onHostSelected?: (host: HostInfo) => void;
}

const HostList: Component<Props> = (props) => {
  const [selected, setSelected] = createSignal<number | null>(null);

  const handleSelect = (host: HostInfo, index: number) => {
    props.onHostSelected?.(host);
    setSelected(index);
  };

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        "background-color": "#fafafa",
        "min-width": "150px",
      }}
    >
      {props.hosts.map((host, index) => (
        <HostItem
          host={host}
          selected={
            props.selectable && selected() !== null && selected() === index
          }
          onSelect={(host) => {
            handleSelect(host, index);
          }}
        />
      ))}
    </div>
  );
};

export default HostList;
