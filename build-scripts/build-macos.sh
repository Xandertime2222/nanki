#!/bin/bash
# Nanki macOS Build Script
# Creates a standalone macOS application bundle and DMG

set -euo pipefail

# Configuration
APP_NAME="Nanki"
VERSION="${1:-0.3.2}"
PUBLISHER="Nanki Project"
BUNDLE_ID="com.nanki.app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Nanki macOS Build ===${NC}"
echo -e "Version: ${VERSION}"

# Paths
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$ROOT/assets"
DIST_DIR="$ROOT/dist"
ICON_ICNS="$ASSETS_DIR/nanki-icon.icns"
DMG_NAME="$APP_NAME-$VERSION-macOS-arm64.dmg"

# Check prerequisites
echo -e "\n${YELLOW}[1/6] Checking prerequisites...${NC}"

if [[ ! -f "$ICON_ICNS" ]]; then
    echo -e "${RED}Missing icon: $ICON_ICNS${NC}"
    echo "Run: python assets/generate-icons.py"
    exit 1
fi

python3 --version
which pyinstaller >/dev/null || (echo "Installing PyInstaller..." && pip3 install pyinstaller)

# Clean build
echo -e "\n${YELLOW}[2/6] Cleaning build directory...${NC}"
rm -rf "$DIST_DIR" "$ROOT/build"

# Install dependencies
echo -e "\n${YELLOW}[3/6] Installing dependencies...${NC}"
pip3 install -e . -q
pip3 install pyinstaller pyinstaller-hooks-contrib pywebview pillow -q

# Build with PyInstaller
echo -e "\n${YELLOW}[4/6] Building application...${NC}"
cd "$ROOT"
pyinstaller --noconfirm --clean \
    --name "$APP_NAME" \
    --windowed \
    --noconsole \
    --target-architecture arm64 \
    --icon "$ICON_ICNS" \
    --add-data "src/noteforge_anki_studio/static:noteforge_anki_studio/static" \
    --add-data "src/noteforge_anki_studio/templates:noteforge_anki_studio/templates" \
    --add-data "assets:assets" \
    --hidden-import noteforge_anki_studio \
    --hidden-import noteforge_anki_studio.ai \
    --hidden-import noteforge_anki_studio.anki_connect \
    --hidden-import noteforge_anki_studio.config \
    --hidden-import noteforge_anki_studio.coverage \
    --hidden-import noteforge_anki_studio.exporters \
    --hidden-import noteforge_anki_studio.importers \
    --hidden-import noteforge_anki_studio.models \
    --hidden-import noteforge_anki_studio.prompts \
    --hidden-import noteforge_anki_studio.storage \
    --hidden-import noteforge_anki_studio.app \
    --hidden-import webview \
    --hidden-import webview.platforms.cocoa \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.lifespan.on \
    --collect-all uvicorn \
    --collect-all starlette \
    --collect-all fastapi \
    --collect-all mistune \
    --collect-all markdownify \
    --collect-all httpx \
    --collect-all pydantic \
    --collect-all jinja2 \
    --collect-all PyYAML \
    --collect-all fitz \
    launcher_webview.py

# Verify build
APP_PATH="$DIST_DIR/$APP_NAME.app"
if [[ ! -d "$APP_PATH" ]]; then
    echo -e "${RED}Build failed: $APP_PATH not found${NC}"
    exit 1
fi

app_size=$(du -sh "$APP_PATH" | cut -f1)
echo -e "  Application: ${GREEN}$app_size${NC}"

# Create DMG
echo -e "\n${YELLOW}[5/6] Creating DMG...${NC}"

STAGE_DIR="$ROOT/dmg_temp"
RW_DMG="$ROOT/$APP_NAME-temp.dmg"
FINAL_DMG="$ROOT/$DMG_NAME"
VOL_NAME="$APP_NAME"

rm -rf "$STAGE_DIR" "$RW_DMG" "$FINAL_DMG"
mkdir -p "$STAGE_DIR"

# Copy app to stage
cp -R "$APP_PATH" "$STAGE_DIR/"
ln -s /Applications "$STAGE_DIR/Applications"

# Create DMG
hdiutil create -srcfolder "$STAGE_DIR" -volname "$VOL_NAME" -fs HFS+ -format UDRW "$RW_DMG"

# Mount DMG
DEVICE=$(hdiutil attach -readwrite -noverify -noautoopen "$RW_DMG" | awk '/\/Volumes\// {print $1; exit}')
MOUNT_POINT="/Volumes/$VOL_NAME"

# Set custom icon
cp "$ICON_ICNS" "$MOUNT_POINT/.VolumeIcon.icns"
SetFile -c icnC "$MOUNT_POINT/.VolumeIcon.icns"
SetFile -a C "$MOUNT_POINT"

# Eject
sync
hdiutil detach "$DEVICE"

# Convert to compressed DMG
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$FINAL_DMG"
rm -f "$RW_DMG"
rm -rf "$STAGE_DIR"

dmg_size=$(du -sh "$FINAL_DMG" | cut -f1)
echo -e "  DMG: ${GREEN}$dmg_size${NC}"

# Code signing (optional, requires developer ID)
if [[ -n "${CODESIGN_IDENTITY:-}" ]]; then
    echo -e "\n${YELLOW}[6/6] Code signing...${NC}"
    codesign --deep --force --verify --verbose \
        --sign "$CODESIGN_IDENTITY" \
        --timestamp \
        --options runtime \
        "$APP_PATH"
    
    if [[ -n "${NOTARIZATION_PROFILE:-}" ]]; then
        echo "  Notarizing..."
        xcrun notarytool submit "$FINAL_DMG" \
            --keychain-profile "$NOTARIZATION_PROFILE" \
            --wait
        xcrun stapler staple "$APP_PATH"
    fi
else
    echo -e "\n${YELLOW}[6/6] Skipping code signing (set CODESIGN_IDENTITY to enable)${NC}"
fi

# Summary
echo -e "\n${GREEN}Build complete!${NC}"
echo -e "  Application: ${CYAN}$APP_PATH${NC}"
echo -e "  DMG: ${CYAN}$FINAL_DMG${NC}"
echo -e "\nTo install: open $FINAL_DMG"
