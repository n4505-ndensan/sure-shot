# APK署名自動化設定

このプロジェクトでは、AndroidのAPKビルド後に自動で署名を行う機能が実装されています。

## 使用方法

### 1. 基本的な使用方法

```powershell
# ビルドと署名を一度に実行
pnpm run android:build-signed

# または、個別に実行
pnpm run android:build
pnpm run android:sign
```

### 2. 環境変数の設定（推奨）

セキュリティのため、環境変数を使用してキーストア情報を設定することを推奨します。

```powershell
# PowerShellで環境変数を設定
$env:ANDROID_KEYSTORE_PATH = "C:\Users\n4505\key.jks"
$env:ANDROID_KEYSTORE_PASSWORD = "your_keystore_password"
$env:ANDROID_KEY_ALIAS = "my-upload-key"
$env:ANDROID_KEY_PASSWORD = "your_key_password"

# 設定後にビルド・署名実行
pnpm run android:build-signed
```

### 3. 一時的なパラメータ指定

```powershell
# スクリプトに直接パラメータを渡す場合
powershell -ExecutionPolicy Bypass -File scripts/sign-apk.ps1 -KeystorePath "C:\path\to\your\keystore.jks"
```

## 出力ファイル

- 署名前: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`
- 署名後: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-signed.apk`

## トラブルシューティング

### apksignerが見つからない場合

Android SDK Build Toolsのパスが通っていることを確認してください：

```powershell
# Android SDK Build Toolsのパスを追加
$env:PATH += ";C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\build-tools\[VERSION]"
```

### PowerShell実行ポリシーエラー

```powershell
# 実行ポリシーを一時的に変更
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

## セキュリティ注意事項

- キーストアファイルとパスワードは安全に管理してください
- 環境変数を使用する場合、システム全体ではなくユーザー単位での設定を推奨します
- バージョン管理システム（Git）にキーストアファイルやパスワードをコミットしないでください