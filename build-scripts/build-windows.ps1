#!/usr/bin/env pwsh
# Nanki Windows Build Script
# Creates a standalone Windows executable with installer

param(
    [string]$Version = "0.3.2",
    [switch]$SkipInstaller,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "=== Nanki Windows Build ===" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Gray

# Configuration
$APP_NAME = "Nanki"
$PUBLISHER = "Nanki Project"
$PYTHON_VERSION = "3.12"
$BUILD_DIR = "build-windows"
$DIST_DIR = "dist"
$ASSETS_DIR = "assets"

# Paths
$ROOT = Get-Location
$ICON_PATH = Join-Path $ASSETS_DIR "nanki-icon.ico"
$INSTALLER_PATH = "$APP_NAME-$Version-Windows-Setup.exe"

# Check prerequisites
Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Path $ICON_PATH)) {
    Write-Error "Missing icon: $ICON_PATH"
    Write-Host "Run: python assets/generate-icons.py" -ForegroundColor Gray
    exit 1
}

$pythonVersion = python --version 2>&1
Write-Host "  Python: $pythonVersion" -ForegroundColor Green

# Clean build directory
if ($Clean -and (Test-Path $BUILD_DIR)) {
    Write-Host "`n[2/6] Cleaning build directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $BUILD_DIR
}
if ($Clean -and (Test-Path $DIST_DIR)) {
    Remove-Item -Recurse -Force $DIST_DIR
}

# Install dependencies
Write-Host "`n[3/6] Installing dependencies..." -ForegroundColor Yellow
pip install -e . --quiet
pip install pyinstaller pyinstaller-hooks-contrib pywebview --quiet

# Build with PyInstaller
Write-Host "`n[4/6] Building executable..." -ForegroundColor Yellow
pyinstaller --noconfirm --clean `
    --name "$APP_NAME" `
    --windowed `
    --noconsole `
    --icon "$ICON_PATH" `
    --paths src `
    --add-data "src/noteforge_anki_studio/static;noteforge_anki_studio/static" `
    --add-data "src/noteforge_anki_studio/templates;noteforge_anki_studio/templates" `
    --add-data "assets;assets" `
    --hidden-import noteforge_anki_studio `
    --hidden-import noteforge_anki_studio.ai `
    --hidden-import noteforge_anki_studio.anki_connect `
    --hidden-import noteforge_anki_studio.config `
    --hidden-import noteforge_anki_studio.coverage `
    --hidden-import noteforge_anki_studio.exporters `
    --hidden-import noteforge_anki_studio.importers `
    --hidden-import noteforge_anki_studio.models `
    --hidden-import noteforge_anki_studio.prompts `
    --hidden-import noteforge_anki_studio.storage `
    --hidden-import noteforge_anki_studio.app `
    --hidden-import webview `
    --hidden-import webview.platforms.winforms `
    --hidden-import uvicorn.logging `
    --hidden-import uvicorn.loops.auto `
    --hidden-import uvicorn.protocols.http.auto `
    --hidden-import uvicorn.protocols.websockets.auto `
    --hidden-import uvicorn.lifespan.on `
    --collect-all uvicorn `
    --collect-all starlette `
    --collect-all fastapi `
    --collect-all mistune `
    --collect-all markdownify `
    --collect-all httpx `
    --collect-all pydantic `
    --collect-all jinja2 `
    --collect-all PyYAML `
    --collect-all fitz `
    launcher_webview.py

# Verify build
$EXE_PATH = Join-Path $DIST_DIR "$APP_NAME\$APP_NAME.exe"
if (-not (Test-Path $EXE_PATH)) {
    Write-Error "Build failed: $EXE_PATH not found"
    exit 1
}

$exeSize = (Get-Item $EXE_PATH).Length / 1MB
Write-Host "  Executable: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green

# Create installer
if (-not $SkipInstaller) {
    Write-Host "`n[5/6] Creating installer..." -ForegroundColor Yellow
    
    # Check for NSIS
    $nsisPath = "C:\Program Files (x86)\NSIS\makensis.exe"
    if (-not (Test-Path $nsisPath)) {
        Write-Host "  NSIS not found. Installing..." -ForegroundColor Yellow
        choco install nsis -y --no-progress
    }
    
    # Create NSIS script
    $nsisContent = @"
!define PRODUCT_NAME "$APP_NAME"
!define PRODUCT_VERSION "$Version"
!define PRODUCT_PUBLISHER "$PUBLISHER"
!define PRODUCT_ICON "$ICON_PATH"
!define PRODUCT_EXE "$APP_NAME.exe"

!include "MUI2.nsh"

Name "${PRODUCT_NAME}"
OutFile "$INSTALLER_PATH"
InstallDir "`$PROGRAMFILES64\$APP_NAME"
InstallDirRegKey HKLM "Software\$APP_NAME" "Install_Dir"
RequestExecutionLevel admin

!define MUI_ICON "${PRODUCT_ICON}"
!define MUI_UNICON "${PRODUCT_ICON}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "`$INSTDIR\$APP_NAME.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch $APP_NAME"
!define MUI_FINISHPAGE_RUN_NOTCHECKED "Run $APP_NAME now"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ReadRegStr `$0 HKLM "Software\$APP_NAME" "Install_Dir"
  StrCmp `$0 "" done
  IfFileExists "`$0\Uninstall.exe" 0 done
  ExecWait '"`$0\Uninstall.exe" /S _?=`$0'
  done:
FunctionEnd

Section "Install" SecInstall
  SetOutPath "`$INSTDIR"
  File /r "dist\$APP_NAME\*.*"
  
  CreateDirectory "`$SMPROGRAMS\$APP_NAME"
  CreateShortcut "`$SMPROGRAMS\$APP_NAME\$APP_NAME.lnk" "`$INSTDIR\$APP_NAME.exe" "" "`$INSTDIR\$APP_NAME.exe" 0
  CreateShortcut "`$DESKTOP\$APP_NAME.lnk" "`$INSTDIR\$APP_NAME.exe" "" "`$INSTDIR\$APP_NAME.exe" 0
  
  WriteUninstaller "`$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\$APP_NAME" "Install_Dir" "`$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "DisplayName" "$APP_NAME"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "UninstallString" "`$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "DisplayIcon" "`$INSTDIR\$APP_NAME.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "Publisher" "$PUBLISHER"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "DisplayVersion" "$Version"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "URLInfoAbout" "https://github.com/Xandertime2222/nanki"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME" "HelpLink" "https://github.com/Xandertime2222/nanki/issues"
SectionEnd

Section "Uninstall" SecUninstall
  RMDir /r "`$INSTDIR"
  Delete "`$DESKTOP\$APP_NAME.lnk"
  Delete "`$SMPROGRAMS\$APP_NAME\$APP_NAME.lnk"
  RMDir "`$SMPROGRAMS\$APP_NAME"
  DeleteRegKey HKLM "Software\$APP_NAME"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$APP_NAME"
SectionEnd
"@

    Set-Content -Path "build.nsi" -Value $nsisContent -Encoding UTF8
    & $nsisPath build.nsi
    
    if (-not (Test-Path $INSTALLER_PATH)) {
        Write-Error "Installer creation failed"
        exit 1
    }
    
    $installerSize = (Get-Item $INSTALLER_PATH).Length / 1MB
    Write-Host "  Installer: $([math]::Round($installerSize, 2)) MB" -ForegroundColor Green
}

# Summary
Write-Host "`n[6/6] Build complete!" -ForegroundColor Green
Write-Host "  Executable: $EXE_PATH" -ForegroundColor Gray
if (-not $SkipInstaller) {
    Write-Host "  Installer:  $INSTALLER_PATH" -ForegroundColor Gray
}

Write-Host "`nTo install: .\$INSTALLER_PATH" -ForegroundColor Cyan
