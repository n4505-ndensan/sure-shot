import { Component, For } from "solid-js";
import { detectUrls, isUrlSafe } from "../../utils/linkUtils";

interface Props {
  text: string;
  style?: any;
}

const LinkifiedText: Component<Props> = (props) => {
  const parsedText = () => {
    const urls = detectUrls(props.text);

    if (urls.length === 0) {
      return [{ type: "text", content: props.text }];
    }

    const parts: Array<{ type: "text" | "link"; content: string }> = [];
    let lastIndex = 0;

    for (const url of urls) {
      // URL前のテキストを追加
      if (url.start > lastIndex) {
        parts.push({
          type: "text",
          content: props.text.substring(lastIndex, url.start),
        });
      }

      // URLを追加
      parts.push({
        type: "link",
        content: url.url,
      });

      lastIndex = url.end;
    }

    // 残りのテキストを追加
    if (lastIndex < props.text.length) {
      parts.push({
        type: "text",
        content: props.text.substring(lastIndex),
      });
    }

    return parts;
  };

  const handleLinkClick = (url: string) => {
    if (!isUrlSafe(url)) {
      alert("安全でないURLです。");
      return;
    }

    // if (confirm(`以下のリンクを開きますか？\n${url}`)) {
    //   window.open(url, "_blank", "noopener,noreferrer");
    // }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <span style={props.style}>
      <For each={parsedText()}>
        {(part) => {
          if (part.type === "link") {
            return (
              <a
                href="#"
                style={{
                  color: "#007bff",
                  "text-decoration": "underline",
                  "word-break": "break-all",
                  cursor: "pointer",
                  "font-weight": "500",
                  "background-color": "rgba(0, 123, 255, 0.1)",
                  padding: "1px 4px",
                  "border-radius": "3px",
                  transition: "background-color 0.2s ease",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(part.content);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(0, 123, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(0, 123, 255, 0.1)";
                }}
              >
                {part.content}
              </a>
            );
          } else {
            return part.content;
          }
        }}
      </For>
    </span>
  );
};

export default LinkifiedText;
