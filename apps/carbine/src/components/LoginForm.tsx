import { Component, createSignal } from "solid-js";
import { tryLogin } from "~/api/tryLogin";
import { AuthManager } from "@sureshot/api/src/auth/AuthManager";

const LoginForm: Component = () => {
  const [persistAuth, setPersistAuth] = createSignal(
    AuthManager.getInstance().getPersistAuth()
  );

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const deviceId = formData.get("deviceId") as string;
    const password = formData.get("password") as string;

    // 永続化設定を適用
    AuthManager.getInstance().setPersistAuth(persistAuth());

    const result = await tryLogin(deviceId, password);
    console.log("Login result:", result);
  };
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        "flex-direction": "column",
        width: "100%",
        height: "500px",
        gap: "1rem",
        "align-items": "center",
        "justify-content": "center",
      }}
    >
      <p>LOGIN</p>
      <label>
        <p class="form_label">Device ID:</p>
        <input class="form_input" type="text" name="deviceId" />
      </label>
      <label>
        <p class="form_label">Password:</p>
        <input class="form_input" type="password" name="password" />
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
        />
        <p class="form_label">Remember login (stay logged in after reload)</p>
      </label>
      <button type="submit">Login</button>
    </form>
  );
};

export default LoginForm;
