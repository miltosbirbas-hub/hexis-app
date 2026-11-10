#!/usr/bin/env bash
# Χτίζει το HEXIS_TRAVERSE_Setup.exe με NSIS. Χρήση: traverse-setup/build.sh <φάκελος εξόδου> [έκδοση]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$(mkdir -p "${1:?φάκελος εξόδου}" && cd "$1" && pwd)"
VER="${2:-$(date +%Y.%m.%d)}"
cd "$HERE"
makensis -V2 -DVERSION="$VER" -DOUT="$W/HEXIS_TRAVERSE_Setup.exe" hexis_traverse_setup.nsi
ls -la "$W/HEXIS_TRAVERSE_Setup.exe"
