import { Component, createSignal, For, onMount } from "solid-js";
import { tryLogin } from "~/api/tryLogin";
import { AuthManager } from "@sureshot/api/src/auth/AuthManager";
import { findHosts } from "~/api/hostApi";
import { HostInfo } from "@sureshot/api/src";
import { HostList } from "@sureshot/ui/src";

const LoginForm: Component = () => {
  const [persistAuth, setPersistAuth] = createSignal(
    AuthManager.getInstance().getPersistAuth()
  );
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>("");
  const [debugMessages, setDebugMessages] = createSignal<string[]>([]);

  const [hosts, setHosts] = createSignal<HostInfo[]>([]);
  const [selectedHost, setSelectedHost] = createSignal<HostInfo | null>(null);

  // フォームの値を管理するためのsignals
  const [deviceId, setDeviceId] = createSignal("");
  const [password, setPassword] = createSignal("");

  onMount(async () => {
    await loadHosts();
  });

  const loadHosts = async () => {
    setHosts([]);
    const hosts = await findHosts();
    setHosts(hosts);
  };

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setDebugMessages([]);

    addDebugMessage("Login form submitted - starting login process");

    // FormDataの代わりにsignalsの値を直接使用
    const deviceIdValue = deviceId();
    const passwordValue = password();

    addDebugMessage(
      `Platform info: ${
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
      }`
    );
    addDebugMessage(
      `Signals values: deviceId="${deviceIdValue}", passwordLength=${passwordValue?.length}`
    );

    // FormDataも試行してデバッグ情報を収集
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const formDeviceId = formData.get("deviceId") as string;
      const formPassword = formData.get("password") as string;
      addDebugMessage(
        `FormData values: deviceId="${formDeviceId}", passwordLength=${formPassword?.length}`
      );
    } catch (formError) {
      addDebugMessage(`FormData error: ${formError}`);
    }

    if (!deviceIdValue || !passwordValue) {
      setErrorMessage("デバイスIDとパスワードを入力してください");
      setIsLoading(false);
      return;
    }

    // 永続化設定を適用
    AuthManager.getInstance().setPersistAuth(persistAuth());

    try {
      addDebugMessage("Calling tryLogin...");
      const host = selectedHost();
      if (!host) {
        setErrorMessage("現在のホスト情報が取得できませんでした。");
        throw new Error("No host information available");
      }
      const result = await tryLogin(
        host,
        deviceIdValue,
        passwordValue,
        addDebugMessage
      );
      addDebugMessage(`Login result: ${result}`);

      if (!result) {
        setErrorMessage(
          "ログインに失敗しました。デバイスIDとパスワードを確認してください。"
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addDebugMessage(`Login error: ${errorMsg}`);
      setErrorMessage(`エラーが発生しました: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        width: "100%",
        height: "500px",
        gap: "2rem",
        "align-items": "center",
        "justify-content": "center",
      }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
          gap: "2rem",
          "flex-wrap": "wrap",
          "align-items": "center",
        }}
      >
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            height: "100%",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              "flex-direction": "row",
              "align-items": "center",
              "justify-content": "space-between",
            }}
          >
            <p>HOSTS</p>
            <button onClick={loadHosts}>reload</button>
          </div>
          <HostList
            hosts={hosts()}
            selectable
            onHostSelected={(host) => {
              setSelectedHost(host);
            }}
          />
        </div>

        <p>--&gt;</p>

        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            "flex-direction": "column",
            height: "100%",
            gap: "0.5rem",
            opacity: selectedHost() ? 1 : 0.4,
            "pointer-events": selectedHost() ? "auto" : "none",
            "user-select": selectedHost() ? "auto" : "none",
          }}
        >
          <p>LOGIN</p>

          {/* エラーメッセージ表示 */}
          {errorMessage() && (
            <p
              style={{
                color: "red",
                "background-color": "#ffebee",
                padding: "0.5rem",
                "border-radius": "4px",
                border: "1px solid red",
                "max-width": "300px",
                "text-align": "center",
              }}
            >
              {errorMessage()}
            </p>
          )}

          <label>
            <p class="form_label">Device ID:</p>
            <input
              class="form_input"
              type="text"
              name="deviceId"
              value={deviceId()}
              onInput={(e) => setDeviceId(e.target.value)}
              disabled={isLoading()}
            />
          </label>
          <label>
            <p class="form_label">Password:</p>
            <input
              class="form_input"
              type="password"
              name="password"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              disabled={isLoading()}
            />
          </label>
          <label
            style={{
              display: "flex",
              "flex-direction": "row",
              "align-items": "center",
              gap: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              checked={persistAuth()}
              onChange={(e) => setPersistAuth(e.target.checked)}
              disabled={isLoading()}
            />
            <p class="form_label">Remember Me</p>
          </label>
          <button type="submit" disabled={isLoading()}>
            {isLoading() ? "ログイン中..." : "Login"}
          </button>

          {/* デバッグメッセージ表示 */}
          {debugMessages().length > 0 && (
            <div
              style={{
                "margin-top": "1rem",
                "max-width": "400px",
                "max-height": "200px",
                "overflow-y": "auto",
                "background-color": "#f5f5f5",
                padding: "0.5rem",
                "border-radius": "4px",
                border: "1px solid #ccc",
                "font-family": "monospace",
                "font-size": "0.8rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0", "font-weight": "bold" }}>
                Debug Log:
              </p>
              <For each={debugMessages()}>
                {(msg) => <p style={{ "margin-bottom": "0.2rem" }}>{msg}</p>}
              </For>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
