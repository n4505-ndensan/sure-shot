import { useNavigate, useLocation } from "@solidjs/router";
import { createEffect } from "solid-js";
import { globalStore } from "~/store/GlobalStore";

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 認証状態に応じた自動リダイレクト
  createEffect(() => {
    const isAuthenticated = globalStore.authStatus?.authenticated;
    const currentPath = location.pathname;

    // 認証済みユーザーがsetupページにいる場合、homeに移動
    if (isAuthenticated && currentPath === "/setup") {
      navigate("/home");
    }
    // 未認証ユーザーがhomeページにいる場合、setupに移動
    else if (!isAuthenticated && currentPath === "/home") {
      navigate("/setup");
    }
  });

  return null;
};
