import { Component, createSignal, Show } from "solid-js";
import LoginForm from "~/components/setup/LoginForm";
import AppLayout from "~/components/layout/AppLayout";
import { useAuthRedirect } from "~/utils/useAuthRedirect";
import HostSetup from "~/components/setup/HostSetup";
import { HostInfo } from "@sureshot/api/src";

import "@styles/setup.scss";

enum SetupSteps {
  Host = 0,
  Login = 1,
}

const Setup: Component = () => {
  useAuthRedirect();

  const [step, setStep] = createSignal<SetupSteps>(SetupSteps.Host);

  const [selectedHost, setSelectedHost] = createSignal<HostInfo | null>(null);

  const isHostSetupDone = () =>
    step() === SetupSteps.Login && selectedHost() !== null;

  const canBack = (toStep: SetupSteps) => step() > toStep;

  return (
    <AppLayout showConnectionStatus={false}>
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
          gap: "2rem",
          "align-items": "center",
        }}
      >
        <p class="setup_header">SETUP</p>
        <p
          class="setup_subheader"
          onClick={() => {
            if (canBack(SetupSteps.Host)) {
              setSelectedHost(null);
              setStep(SetupSteps.Host);
            }
          }}
          style={{
            cursor: canBack(SetupSteps.Host) ? "pointer" : "default",
            opacity: !isHostSetupDone() ? 1 : 0.5,
          }}
        >
          1. HOST SELECTION
        </p>

        <p>&gt;</p>
        <p
          class="setup_subheader"
          onClick={() => {
            if (canBack(SetupSteps.Login)) setStep(SetupSteps.Login);
          }}
          style={{
            cursor: canBack(SetupSteps.Login) ? "pointer" : "default",
            opacity: isHostSetupDone() ? 1 : 0.5,
          }}
        >
          2. LOGIN
        </p>
      </div>
      <Show
        when={isHostSetupDone()}
        fallback={
          <HostSetup
            onSelect={(host) => {
              setSelectedHost(host);
              setStep(SetupSteps.Login);
            }}
          />
        }
      >
        <LoginForm host={selectedHost()!} />
      </Show>
    </AppLayout>
  );
};

export default Setup;
