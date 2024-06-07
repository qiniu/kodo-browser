#!/bin/sh
set -e
WORKING_DIR=$(pwd)
THIS_PATH=$(readlink -f "$0")
THIS_BASE_PATH=$(dirname "${THIS_PATH}")
cd "$THIS_BASE_PATH"
FULL_PATH=$(pwd)
cd "${WORKING_DIR}"
cat <<EOS > "kodo-browser.desktop"
[Desktop Entry]
Name=Kodo Browser
Comment=Kodo Browser for Linux
Exec="${FULL_PATH}/Kodo Browser" %U
Terminal=false
Type=Application
MimeType=x-scheme-handler/kodobrowser
Icon=${FULL_PATH}/resources/app/renderer/static/brand/qiniu.png
Categories=Utility;Development;
EOS
chmod +x "Kodo Browser.desktop"
