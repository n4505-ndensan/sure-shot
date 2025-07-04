import { Component, createSignal, onMount } from "solid-js";
import { GetNicknameResponse, UpdateNicknameRequest, UpdateNicknameResponse } from "../types/generated/api-types";

interface Props {
  className?: string;
}

const NicknameSettings: Component<Props> = (props) => {
  const [currentNickname, setCurrentNickname] = createSignal("");
  const [newNickname, setNewNickname] = createSignal("");
  const [isEditing, setIsEditing] = createSignal(false);
  const [status, setStatus] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  // 現在のニックネームを取得
  const loadNickname = async () => {
    try {
      const response = await fetch("http://localhost:8000/nickname");
      if (response.ok) {
        const data: GetNicknameResponse = await response.json();
        setCurrentNickname(data.nickname);
        setNewNickname(data.nickname);
      }
    } catch (error) {
      console.error("Failed to load nickname:", error);
      setStatus("❌ Failed to load nickname");
    }
  };

  // ニックネームを更新
  const updateNickname = async () => {
    if (!newNickname().trim()) {
      setStatus("❌ Nickname cannot be empty");
      return;
    }

    if (newNickname().trim() === currentNickname()) {
      setIsEditing(false);
      setStatus("");
      return;
    }

    setIsLoading(true);
    setStatus("🔄 Updating nickname...");

    try {
      const request: UpdateNicknameRequest = {
        nickname: newNickname().trim(),
      };

      const response = await fetch("http://localhost:8000/update-nickname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data: UpdateNicknameResponse = await response.json();
        if (data.success) {
          setCurrentNickname(data.new_nickname);
          setIsEditing(false);
          setStatus("✅ Nickname updated successfully!");
          setTimeout(() => setStatus(""), 3000);
        } else {
          setStatus(`❌ ${data.message}`);
        }
      } else {
        setStatus("❌ Failed to update nickname");
      }
    } catch (error) {
      console.error("Failed to update nickname:", error);
      setStatus("❌ Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setNewNickname(currentNickname());
    setIsEditing(false);
    setStatus("");
  };

  onMount(() => {
    loadNickname();
  });

  return (
    <div class={props.className}>
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "0.5rem",
          padding: "1rem",
          border: "1px solid #ddd",
          "border-radius": "8px",
          "background-color": "#f9f9f9",
        }}
      >
        <h3 style={{ margin: "0", "font-size": "14px", "font-weight": "bold" }}>
          Nickname Settings
        </h3>

        {!isEditing() ? (
          <div
            style={{
              display: "flex",
              "justify-content": "space-between",
              "align-items": "center",
            }}
          >
            <div>
              <span style={{ "font-size": "12px", color: "#6c757d" }}>
                Current nickname:
              </span>
              <div style={{ "font-size": "14px", "font-weight": "500" }}>
                {currentNickname() || "Loading..."}
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: "0.25rem 0.5rem",
                "font-size": "12px",
                "background-color": "#007bff",
                color: "white",
                border: "none",
                "border-radius": "4px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}>
            <input
              type="text"
              value={newNickname()}
              onInput={(e) => setNewNickname(e.currentTarget.value)}
              placeholder="Enter new nickname"
              disabled={isLoading()}
              style={{
                padding: "0.5rem",
                "font-size": "12px",
                border: "1px solid #ccc",
                "border-radius": "4px",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading()) {
                  updateNickname();
                }
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={updateNickname}
                disabled={isLoading()}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  "font-size": "12px",
                  "background-color": isLoading() ? "#ccc" : "#28a745",
                  color: "white",
                  border: "none",
                  "border-radius": "4px",
                  cursor: isLoading() ? "not-allowed" : "pointer",
                }}
              >
                {isLoading() ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={isLoading()}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  "font-size": "12px",
                  "background-color": "#6c757d",
                  color: "white",
                  border: "none",
                  "border-radius": "4px",
                  cursor: isLoading() ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status() && (
          <div
            style={{
              padding: "0.5rem",
              "border-radius": "4px",
              "background-color": status().includes("✅")
                ? "#d4edda"
                : status().includes("🔄")
                ? "#f8f9fa"
                : "#f8d7da",
              color: status().includes("✅")
                ? "#155724"
                : status().includes("🔄")
                ? "#6c757d"
                : "#721c24",
              "font-size": "12px",
            }}
          >
            {status()}
          </div>
        )}
      </div>
    </div>
  );
};

export default NicknameSettings;
