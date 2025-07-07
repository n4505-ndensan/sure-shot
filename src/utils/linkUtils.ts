/**
 * URL検出の正規表現（より正確な検出）
 */
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

/**
 * テキスト内のURLを検出
 */
export function detectUrls(
  text: string
): { url: string; start: number; end: number }[] {
  const matches = Array.from(text.matchAll(URL_REGEX));
  return matches.map((match) => ({
    url: match[0],
    start: match.index!,
    end: match.index! + match[0].length,
  }));
}

/**
 * URLを短縮表示用にフォーマット
 */
export function formatUrlForDisplay(
  url: string,
  maxLength: number = 50
): string {
  if (url.length <= maxLength) {
    return url;
  }

  const start = url.substring(0, maxLength / 2);
  const end = url.substring(url.length - maxLength / 2);
  return `${start}...${end}`;
}

/**
 * URLが安全かどうかを基本的にチェック
 */
export function isUrlSafe(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // HTTPSまたはHTTPのみ許可
    return urlObj.protocol === "https:" || urlObj.protocol === "http:";
  } catch {
    return false;
  }
}
