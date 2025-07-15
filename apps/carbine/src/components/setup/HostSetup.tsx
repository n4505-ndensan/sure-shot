import { HostInfo } from "@sureshot/api/src";
import { HostList } from "@sureshot/ui/src";
import { Component, createSignal, onMount, Show } from "solid-js";
import { findHosts } from "~/api/hostApi";

import "@styles/setup.scss";

interface Props {
  onSelect: (host: HostInfo) => void;
}

const HostSetup: Component<Props> = (props) => {
  const [hosts, setHosts] = createSignal<HostInfo[]>([]);

  onMount(async () => {
    await loadHosts();
  });

  const loadHosts = async () => {
    setHosts([]);
    const hosts = await findHosts();
    setHosts(hosts);
  };

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        width: "100%",
        height: "500px",
        "align-items": "center",
        "justify-content": "center",
      }}
    >
      <p class="setup_header">SELECT A HOST</p>

      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "min-height": "200px",
          "align-items": "center",
          "margin-top": "1rem",
        }}
      >
        <Show when={hosts().length === 0}>
          <p>ホストが見つかりません。ホストを追加してください。</p>
        </Show>
        <Show when={hosts().length > 0}>
          <HostList
            hosts={hosts()}
            selectable
            onHostSelected={(host) => {
              props.onSelect(host);
            }}
          />
        </Show>
      </div>
      <button
        style={{ width: "fit-content", "margin-top": "1rem" }}
        onClick={loadHosts}
      >
        RELOAD
      </button>
    </div>
  );
};

export default HostSetup;
