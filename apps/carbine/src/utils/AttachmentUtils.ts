const shouldUseBase64 = (file: File, maxSizeForBase64: number): boolean => {
  // 小さなファイルや特定のファイル形式はBase64を使用
  if (file.size <= maxSizeForBase64) return true;

  // 画像は表示のためBase64が便利
  if (file.type.startsWith('image/')) return true;

  // テキストファイルは可読性のためBase64
  if (file.type.startsWith('text/')) return true;

  return false;
};
