# APK署名自動化スクリプト
param(
    [string]$KeystorePath = $null,
    [string]$KeystorePassword = $null,
    [string]$KeyAlias = $null,
    [string]$KeyPassword = $null
)

# エンコーディングの明示的な設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# デフォルト値の設定（古いPowerShellでも動作）
if (-not $KeystorePath) {
    $KeystorePath = if ($env:ANDROID_KEYSTORE_PATH) { $env:ANDROID_KEYSTORE_PATH } else { "C:\Users\n4505\key.jks" }
}

if (-not $KeystorePassword) {
    $KeystorePassword = $env:ANDROID_KEYSTORE_PASSWORD
}

if (-not $KeyAlias) {
    $KeyAlias = if ($env:ANDROID_KEY_ALIAS) { $env:ANDROID_KEY_ALIAS } else { "my-upload-key" }
}

if (-not $KeyPassword) {
    $KeyPassword = $env:ANDROID_KEY_PASSWORD
}

Write-Host "APK signing started..." -ForegroundColor Cyan
Write-Host "Configuration:" -ForegroundColor Gray
Write-Host "  Keystore Path: $KeystorePath" -ForegroundColor Gray
Write-Host "  Key Alias: $KeyAlias" -ForegroundColor Gray
Write-Host "  Password provided: $(if ($KeystorePassword) { 'Yes' } else { 'No' })" -ForegroundColor Gray

# apksignerの存在確認
Write-Host ""
Write-Host "Checking apksigner availability..." -ForegroundColor Gray

try {
    $ApksignerVersion = & apksigner --version 2>&1
    Write-Host "apksigner found: $ApksignerVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: apksigner not found in PATH" -ForegroundColor Red
    Write-Host "Please ensure Android SDK Build Tools is installed and added to PATH" -ForegroundColor Yellow
    Write-Host "Typical locations:" -ForegroundColor Gray
    Write-Host "  - C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\build-tools\[VERSION]\" -ForegroundColor Gray
    Write-Host "  - C:\Android\Sdk\build-tools\[VERSION]\" -ForegroundColor Gray
    
    # 一般的な場所を検索
    $PossiblePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\build-tools",
        "C:\Android\Sdk\build-tools",
        "$env:ANDROID_HOME\build-tools"
    )
    
    Write-Host ""
    Write-Host "Searching for apksigner in common locations..." -ForegroundColor Gray
    
    foreach ($BasePath in $PossiblePaths) {
        if (Test-Path $BasePath) {
            $BuildToolsVersions = Get-ChildItem -Path $BasePath -Directory | Sort-Object Name -Descending
            foreach ($Version in $BuildToolsVersions) {
                $ApksignerPath = Join-Path $Version.FullName "apksigner.bat"
                if (Test-Path $ApksignerPath) {
                    Write-Host "Found apksigner at: $ApksignerPath" -ForegroundColor Green
                    Write-Host "Add this to your PATH: $($Version.FullName)" -ForegroundColor Yellow
                    break
                }
            }
        }
    }
    
    exit 1
}

# APKファイルのパスを探す
$ApkDir = "src-tauri\gen\android\app\build\outputs\apk\universal\release"
$UnsignedApkPattern = "*-unsigned.apk"

Write-Host "Looking for APK files in: $ApkDir" -ForegroundColor Gray

if (-not (Test-Path $ApkDir)) {
    Write-Host "Error: APK directory not found: $ApkDir" -ForegroundColor Red
    exit 1
}

$UnsignedApks = Get-ChildItem -Path $ApkDir -Name $UnsignedApkPattern

if ($UnsignedApks.Count -eq 0) {
    Write-Host "Error: No unsigned APK files found" -ForegroundColor Red
    Write-Host "Checked directory: $(Resolve-Path $ApkDir)" -ForegroundColor Gray
    exit 1
}

Write-Host "Found APK files: $($UnsignedApks.Count)" -ForegroundColor Green

foreach ($ApkFile in $UnsignedApks) {
    $UnsignedApkPath = Join-Path $ApkDir $ApkFile
    $SignedApkPath = $UnsignedApkPath -replace '-unsigned', '-signed'
    
    Write-Host ""
    Write-Host "Signing: $ApkFile" -ForegroundColor Yellow
    Write-Host "Input:  $UnsignedApkPath" -ForegroundColor Gray
    Write-Host "Output: $SignedApkPath" -ForegroundColor Gray
    Write-Host "Keystore: $KeystorePath" -ForegroundColor Gray
    
    # キーストアファイルの存在確認
    if (-not (Test-Path $KeystorePath)) {
        Write-Host "Error: Keystore file not found: $KeystorePath" -ForegroundColor Red
        Write-Host "Set ANDROID_KEYSTORE_PATH environment variable or specify parameter" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Keystore file exists: OK" -ForegroundColor Green
    
    try {
        # 署名コマンドを構築（パスを引用符で囲む）
        $SignArgs = @(
            "sign"
            "--ks"
            "`"$KeystorePath`""
            "--out"
            "`"$SignedApkPath`""
        )
        
        # パスワードが指定されている場合は追加
        if ($KeystorePassword) {
            $SignArgs += "--ks-pass"
            $SignArgs += "pass:$KeystorePassword"
        }
        
        if ($KeyAlias) {
            $SignArgs += "--ks-key-alias"
            $SignArgs += $KeyAlias
        }
        
        if ($KeyPassword) {
            $SignArgs += "--key-pass"
            $SignArgs += "pass:$KeyPassword"
        }
        
        $SignArgs += "`"$UnsignedApkPath`""
        
        Write-Host "Command: apksigner sign --ks `"[KEYSTORE]`" --in `"[INPUT]`" --out `"[OUTPUT]`"" -ForegroundColor Gray
        Write-Host "Executing apksigner..." -ForegroundColor Yellow
        
        # APK署名実行（パスに問題がある場合のフォールバック）
        $ApksignerExe = "apksigner"
        
        # まず通常のapksignerを試行
        try {
            & $ApksignerExe --version | Out-Null
        }
        catch {
            # 見つからない場合は.batを試行
            $ApksignerExe = "apksigner.bat"
            try {
                & $ApksignerExe --version | Out-Null
            }
            catch {
                Write-Host "Error: Cannot find apksigner executable" -ForegroundColor Red
                continue
            }
        }
        
        Write-Host "Using apksigner: $ApksignerExe" -ForegroundColor Gray
        
        # ProcessStartInfoを使用してより安全に実行
        $ProcessStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $ProcessStartInfo.FileName = $ApksignerExe
        $ProcessStartInfo.Arguments = $SignArgs -join " "
        $ProcessStartInfo.UseShellExecute = $false
        $ProcessStartInfo.RedirectStandardOutput = $true
        $ProcessStartInfo.RedirectStandardError = $true
        $ProcessStartInfo.RedirectStandardInput = $true
        $ProcessStartInfo.CreateNoWindow = $true
        
        $Process = New-Object System.Diagnostics.Process
        $Process.StartInfo = $ProcessStartInfo
        
        Write-Host "Starting process..." -ForegroundColor Gray
        $Process.Start() | Out-Null
        
        # パスワードが設定されていない場合は、標準入力でパスワードを要求される可能性がある
        if (-not $KeystorePassword) {
            Write-Host "Note: You may need to enter keystore password interactively" -ForegroundColor Yellow
        }
        
        $Process.WaitForExit()
        
        $StdOut = $Process.StandardOutput.ReadToEnd()
        $StdErr = $Process.StandardError.ReadToEnd()
        
        if ($StdOut) {
            Write-Host "Output: $StdOut" -ForegroundColor Gray
        }
        
        if ($StdErr) {
            Write-Host "Error Output: $StdErr" -ForegroundColor Yellow
        }
        
        if ($Process.ExitCode -eq 0) {
            Write-Host "Success: APK signed successfully" -ForegroundColor Green
            
            # 署名されたAPKのファイルサイズを表示
            if (Test-Path $SignedApkPath) {
                $FileSize = (Get-Item $SignedApkPath).Length
                $FileSizeMB = [math]::Round($FileSize / 1MB, 2)
                Write-Host "  File size: $FileSizeMB MB" -ForegroundColor Green
                
                # 相対パスで表示
                $RelativePath = Resolve-Path $SignedApkPath -Relative
                Write-Host "  Location: $RelativePath" -ForegroundColor Green
            }
        }
        else {
            Write-Host "Error: APK signing failed for $ApkFile (Exit code: $($Process.ExitCode))" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
        
        # フォールバック: 直接コマンドライン実行を試行
        Write-Host "Trying fallback method..." -ForegroundColor Yellow
        try {
            $FallbackCommand = "apksigner sign --ks `"$KeystorePath`" --out `"$SignedApkPath`" `"$UnsignedApkPath`""
            Write-Host "Fallback command: $FallbackCommand" -ForegroundColor Gray
            
            Invoke-Expression $FallbackCommand
            
            if ($LASTEXITCODE -eq 0 -and (Test-Path $SignedApkPath)) {
                Write-Host "Success: APK signed using fallback method" -ForegroundColor Green
                $FileSize = (Get-Item $SignedApkPath).Length
                $FileSizeMB = [math]::Round($FileSize / 1MB, 2)
                Write-Host "  File size: $FileSizeMB MB" -ForegroundColor Green
            }
            else {
                Write-Host "Fallback method also failed" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "Fallback method error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "APK signing process completed." -ForegroundColor Cyan
