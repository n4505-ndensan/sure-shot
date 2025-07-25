import { HostInfo } from '@sureshot/api/src';
import { AuthManager } from '@sureshot/api/src/auth/AuthManager';
import { message } from '@tauri-apps/plugin-dialog';
import { Component, createSignal } from 'solid-js';
import { tryLogin } from '~/api/tryLogin';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

interface Props {
  host: HostInfo;
}

const LoginForm: Component<Props> = (props) => {
  const { validateAuth } = useAuthRedirect();

  const [persistAuth, setPersistAuth] = createSignal(AuthManager.getInstance().getPersistAuth());
  const [isLoading, setIsLoading] = createSignal(false);

  // フォームの値を管理するためのsignals
  const [password, setPassword] = createSignal('');

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);

    // FormDataの代わりにsignalsの値を直接使用
    const passwordValue = password();

    if (!passwordValue) {
      await message('Please enter a password', { title: 'Login Failed', kind: 'error' });
      setIsLoading(false);
      return;
    }

    // 永続化設定を適用
    AuthManager.getInstance().setPersistAuth(persistAuth());

    try {
      const result = await tryLogin(props.host, passwordValue);

      if (result) {
        validateAuth('preserve');
      } else {
        await message(`Invalid password`, { title: 'Login Failed', kind: 'error' });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await message(`${errorMsg}`, { title: 'Login Failed', kind: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        'flex-direction': 'column',
        height: '100%',
        width: '100%',
        'align-items': 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '1rem',
        }}
      >
        {/* <label class='form_label_container'>
          <p class='form_label'>ID</p>
          <input
            class='form_input'
            type='text'
            name='deviceId'
            autocomplete='off'
            value={deviceId()}
            onInput={(e) => setDeviceId(e.target.value)}
            disabled={isLoading()}
          />
        </label> */}
        <p>
          Login to <span style={{ color: '#007bff' }}>{props.host.name}</span>
        </p>
        <label class='form_label_container'>
          <p class='form_label'>Key</p>
          <input
            class='form_input'
            type='password'
            name='password'
            autocomplete='off'
            autocorrect='off'
            value={password()}
            onInput={(e) => setPassword(e.target.value)}
            disabled={isLoading()}
          />
        </label>
        <div style={{ display: 'flex', 'flex-direction': 'row', 'justify-content': 'space-between' }}>
          <label
            style={{
              display: 'flex',
              'flex-direction': 'row',
              'align-items': 'center',
              gap: '0.5rem',
            }}
          >
            <input type='checkbox' checked={persistAuth()} onChange={(e) => setPersistAuth(e.target.checked)} disabled={isLoading()} />
            <p>Save Password</p>
          </label>
          <button type='submit' disabled={isLoading()}>
            {isLoading() ? 'ログイン中...' : 'Login'}
          </button>
        </div>
        {/* デバッグメッセージ表示 */}
        {/* {debugMessages().length > 0 && (
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
        )} */}
      </div>
    </form>
  );
};

export default LoginForm;
