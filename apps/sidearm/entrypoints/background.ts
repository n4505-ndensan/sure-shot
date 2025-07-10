import { sendMessage } from "@sureshot/api";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // 拡張機能がインストールされた時の処理
  browser.runtime.onInstalled.addListener(() => {
    // リンク用の右クリックメニューを作成
    browser.contextMenus.create({
      id: "send-link",
      title: "Shot This Link!",
      contexts: ["link"],
    });

    browser.contextMenus.create({
      id: "send-page",
      title: "Shot This Page!",
      contexts: ["page"],
    });

    console.log("Context menu created");
  });

  // 右クリックメニューのクリック処理
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log("Context menu clicked! Info:", info);
    console.log("Menu item ID:", info.menuItemId);
    console.log("Link URL:", info.linkUrl);

    if (info.menuItemId === "send-link") {
      const linkUrl = info.linkUrl;
      if (linkUrl) {
        console.log("🔗 Sending link:", linkUrl);
        const result = await sendURL(linkUrl);

        if (result.success) {
          console.log("✅ Link sent successfully!", result);
        } else {
          console.error("❌ Failed to send link:", result.message);
        }
      } else {
        console.error("❌ No link URL found in context menu info");
      }
    }

    if (info.menuItemId === "send-page") {
      const pageUrl = info.pageUrl;
      if (pageUrl) {
        console.log("🔗 Sending page:", pageUrl);
        const result = await sendURL(pageUrl);

        if (result.success) {
          console.log("✅ Page sent successfully!", result);
        } else {
          console.error("❌ Failed to send page:", result.message);
        }
      } else {
        console.error("❌ No page URL found in context menu info");
      }
    }
  });
});

// メッセージ送信用の関数
async function sendURL(url: string, message: string = "") {
  try {
    const result = await sendMessage(
      "SIDE_ARM",
      "sidearm",
      message || `リンクを共有: ${url}`,
      "text",
      []
    );
    return result;
  } catch (error) {
    console.error("❌ Failed to send message:", error);
    return {
      success: false,
      message: `Failed to send message: ${error}`,
      timestamp: new Date().toISOString(),
    };
  }
}
