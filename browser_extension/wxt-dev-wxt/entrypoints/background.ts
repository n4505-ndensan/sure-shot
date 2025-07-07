export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // 拡張機能がインストールされた時の処理
  browser.runtime.onInstalled.addListener(() => {
    // リンク用の右クリックメニューを作成
    browser.contextMenus.create({
      id: "send-link",
      title: "リンクを共有",
      contexts: ["link"],
    });

    console.log("Context menu created for links");
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
        const result = await sendMessageToLocalAPI(linkUrl);

        if (result.success) {
          console.log("✅ Link sent successfully!", result);
        } else {
          console.error("❌ Failed to send link:", result.message);
        }
      } else {
        console.error("❌ No link URL found in context menu info");
      }
    } else {
      console.log("Unknown menu item ID:", info.menuItemId);
    }
  });
});

// メッセージ送信用の関数
async function sendMessageToLocalAPI(linkUrl: string, message: string = "") {
  console.log("🚀 Starting API call to localhost:8000/send");

  const payload = {
    to: "", // 空にしてブロードキャスト送信
    message: message || `リンクを共有: ${linkUrl}`,
    message_type: "text",
    attachments: [],
  };

  console.log("📤 Sending payload:", payload);

  try {
    const response = await fetch("http://localhost:8000/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response ok:", response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Message sent successfully:", result);
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
