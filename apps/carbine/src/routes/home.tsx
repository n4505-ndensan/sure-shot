import { Component } from "solid-js";
import MessageList from "~/components/messages/MessageList";
import MessageInput from "~/components/messages/MessageInput";
import AppLayout from "~/components/layout/AppLayout";
import { useAuthRedirect } from "~/utils/useAuthRedirect";

const Home: Component = () => {
  useAuthRedirect();

  return (
    <AppLayout showConnectionStatus={true}>
      <MessageList />

      <div
        style={{
          width: "100%",
          height: "1px",
          "background-color": "#ddd",
        }}
      />

      <MessageInput />
    </AppLayout>
  );
};

export default Home;
