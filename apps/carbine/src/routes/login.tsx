import { HostInfo } from '@sureshot/api/src';
import { Component, createSignal, onMount, Show } from 'solid-js';
import AppLayout from '~/components/layout/AppLayout';
import HostSetup from '~/components/setup/HostSetup';
import LoginForm from '~/components/setup/LoginForm';

import '@styles/main.css';
import { CarbineAnimLogo } from '@sureshot/ui/src';
import { isMobile } from '~/utils/PlatformUtils';
import { useAuthRedirect } from '~/utils/useAuthRedirect';

enum LoginStep {
  Host = 0,
  Login = 1,
}

const Login: Component = () => {
  const { validateAuth } = useAuthRedirect('preserve');

  const [step, setStep] = createSignal<LoginStep>(LoginStep.Host);
  const [selectedHost, setSelectedHost] = createSignal<HostInfo | null>(null);
  const isHostSetupDone = () => step() === LoginStep.Login && selectedHost() !== null;

  onMount(() => {
    validateAuth('preserve');
    setStep(LoginStep.Host);
    setSelectedHost(null);
  });

  const canBack = (toStep: LoginStep) => toStep >= 0 && step() > toStep;

  return (
    <AppLayout showConnectionStatus={false}>
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          width: '100%',
          height: '100%',
          'align-items': 'center',
          'justify-content': 'center',
          'padding-top': '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'box-sizing': 'border-box',
            margin: isMobile() ? '24px 12px' : '12px -12px',
            'align-items': 'center',
            'justify-content': 'center',
          }}
        >
          <CarbineAnimLogo scale={isMobile() ? 1 : 0.7} />
        </div>

        <div
          style={{
            display: 'flex',
            'flex-direction': 'column',
            'box-sizing': 'border-box',
            height: '100%',
            'align-items': 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              'flex-direction': 'row',
              gap: '20px',
              'box-sizing': 'border-box',
              'align-items': 'center',
            }}
          >
            {/* <p class="setup_header">SETUP</p> */}
            <p
              class='setup_subheader'
              onClick={() => {
                setSelectedHost(null);
                setStep(LoginStep.Host);
              }}
              style={{
                cursor: canBack(LoginStep.Host) ? 'pointer' : 'default',
                opacity: !isHostSetupDone() ? 1 : 0.5,
              }}
            >
              1. SELECT HOST
            </p>

            <p>&gt;</p>
            <p
              class='setup_subheader'
              onClick={() => {
                if (canBack(LoginStep.Login)) setStep(LoginStep.Login);
              }}
              style={{
                cursor: canBack(LoginStep.Login) ? 'pointer' : 'default',
                opacity: isHostSetupDone() ? 1 : 0.5,
              }}
            >
              2. LOGIN
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              'flex-grow': 1,
            }}
          >
            <Show
              when={isHostSetupDone()}
              fallback={
                <HostSetup
                  onProceed={(host) => {
                    setSelectedHost(host);
                    setStep(LoginStep.Login);
                  }}
                />
              }
            >
              <LoginForm host={selectedHost()!} />
            </Show>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Login;
