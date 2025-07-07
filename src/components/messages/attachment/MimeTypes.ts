export const fallBackMimeType = "application/octet-stream";

export const mimeTypes: { [key: string]: string } = {
  // 画像
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",

  // 文書
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // テキスト
  txt: "text/plain",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  ts: "text/typescript",
  jsx: "text/jsx",
  tsx: "text/tsx",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",
  md: "text/markdown",

  // アーカイブ
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",

  // 音声
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",

  // 動画
  mp4: "video/mp4",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  webm: "video/webm",

  // フォント
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  eot: "application/vnd.ms-fontobject",

  // プログラミング言語
  py: "text/x-python",
  rb: "text/x-ruby",
  php: "text/x-php",
  java: "text/x-java-source",
  cpp: "text/x-c++src",
  c: "text/x-csrc",
  h: "text/x-chdr",
  rs: "text/x-rust",
  go: "text/x-go",

  // 設定ファイル
  ini: "text/plain",
  cfg: "text/plain",
  conf: "text/plain",
  toml: "application/toml",
  yaml: "application/x-yaml",
  yml: "application/x-yaml",
};
