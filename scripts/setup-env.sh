#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="v20.18.0"
ARCH="linux-x64"
NODE_DIST="node-${NODE_VERSION}-${ARCH}"
INSTALL_DIR="$HOME/.local/node"
BIN_DIR="$INSTALL_DIR/bin"

echo "=== Setting up User-Space Node.js ($NODE_VERSION) ==="

if command -v node >/dev/null 2>&1; then
    echo "Node.js is already installed at: $(which node) ($(node -v))"
else
    mkdir -p "$HOME/.local"
    mkdir -p "$HOME/.local/bin"

    if [ ! -d "$INSTALL_DIR" ]; then
        echo "Downloading Node.js $NODE_VERSION ($ARCH)..."
        TMP_TAR="/tmp/${NODE_DIST}.tar.xz"
        curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/${NODE_DIST}.tar.xz" -o "$TMP_TAR"
        echo "Extracting Node.js to $INSTALL_DIR..."
        mkdir -p "$INSTALL_DIR"
        tar -xJf "$TMP_TAR" --strip-components=1 -C "$INSTALL_DIR"
        rm -f "$TMP_TAR"
    fi

    # Create symlinks into ~/.local/bin
    ln -sf "$BIN_DIR/node" "$HOME/.local/bin/node"
    ln -sf "$BIN_DIR/npm" "$HOME/.local/bin/npm"
    ln -sf "$BIN_DIR/npx" "$HOME/.local/bin/npx"

    # Add to PATH in ~/.bashrc if not present
    PROFILE_FILES=("$HOME/.bashrc" "$HOME/.profile")
    for PFILE in "${PROFILE_FILES[@]}"; do
        if [ -f "$PFILE" ]; then
            if ! grep -q 'export PATH="$HOME/.local/node/bin:$PATH"' "$PFILE"; then
                echo 'export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"' >> "$PFILE"
                echo "Added Node to PATH in $PFILE"
            fi
        fi
    done
fi

export PATH="$BIN_DIR:$HOME/.local/bin:$PATH"

echo "Node.js setup complete:"
echo "Node: $(node -v) -> $(which node)"
echo "NPM:  $(npm -v) -> $(which npm)"

