import { HostInfo } from '@sureshot/api/src';
import { AuthManager } from '@sureshot/api/src/auth/AuthManager';
import { message } from '@tauri-apps/plugin-dialog';
import { Component, createSignal } from 'solid-js';
import { tryLogin } from '~/api/tryLogin';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

import '@styles/login.css';

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
    <form onSubmit={onSubmit} class='content'>
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '1rem',
          width: '100%',
          'margin-bottom': '2rem',
        }}
      >
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
      </div>
    </form>
  );
};

export default LoginForm;
