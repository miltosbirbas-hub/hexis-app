#!/usr/bin/env bash
# Χτίζει το HEXIS_MAPPING_Setup.exe σε Linux: Python 3.12 για Windows (conda-forge, micromamba --platform win-64),
# τα πακέτα ως wheels win_amd64 από το PyPI, και NSIS. Χρήση: mapping-setup/build.sh <φάκελος εργασίας> [έκδοση]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$(mkdir -p "${1:?φάκελος εργασίας}" && cd "$1" && pwd)"
VER="${2:-$(date +%Y.%m.%d)}"
B="$W/build"; rm -rf "$B"; mkdir -p "$B"
if [ ! -x "$W/mm/bin/micromamba" ]; then
  curl -sSL https://conda.anaconda.org/conda-forge/linux-64/micromamba-2.9.0-0.tar.bz2 -o "$W/mm.tar.bz2"
  mkdir -p "$W/mm" && tar -xjf "$W/mm.tar.bz2" -C "$W/mm"
fi
export MAMBA_ROOT_PREFIX="$W/mroot"
"$W/mm/bin/micromamba" create -y -q -p "$B/python" --platform win-64 -c conda-forge python=3.12 pip >/dev/null
mkdir -p "$W/whl"
python3 -m pip wheel -q --no-deps -w "$W/whl" proxy_tools          # καθαρά Python πακέτα χωρίς έτοιμο wheel
python3 -m pip download -q -d "$W/whl" --find-links "$W/whl" --platform win_amd64 --python-version 3.12 --implementation cp --only-binary=:all: -r "$HERE/requirements.txt"
python3 -m pip install -q --no-index --find-links "$W/whl" --target "$B/python/Lib/site-packages" --platform win_amd64 \
  --python-version 3.12 --implementation cp --only-binary=:all: --upgrade -r "$HERE/requirements.txt" 2>&1 | grep -v "dependency resolver\|requires\|root user" || true
rm -rf "$B/python/Lib/test" "$B/python/Lib/idlelib" "$B/python/Tools" "$B/python/Library/include" "$B/python/include" \
       "$B/python/python312.pdb" "$B/python/python.pdb" "$B/python/pythonw.pdb" "$B/python/Lib/site-packages/bin" "$B/python/Lib/site-packages/"*.whl
find "$B/python" -name __pycache__ -type d -prune -exec rm -rf {} +
RTVER="py312-$( (cat "$HERE/requirements.txt"; ls "$B/python/Lib/site-packages") | sha1sum | cut -c1-12)"
printf "%s" "$RTVER" > "$B/python/rtver.txt"
cd "$HERE"
makensis -V2 -DVERSION="$VER" -DRTVER="$RTVER" -DSRC="$B" -DOUT="$W/HEXIS_MAPPING_Setup.exe" hexis_mapping_setup.nsi
ls -la "$W/HEXIS_MAPPING_Setup.exe"
