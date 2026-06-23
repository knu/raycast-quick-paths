#!/bin/sh
set -eu

repo=knu/qpath
release=${1:-latest}
assets_dir=assets
tmp_dir=.tmp/qpath-assets

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        printf 'missing required command: %s\n' "$1" >&2
        exit 1
    fi
}

download_asset() {
    tag=$1
    target=$2
    destination=$3
    archive=qpath-"$target".tar.xz
    checksum=$archive.sha256
    release_dir=$tmp_dir/"$tag"/"$target"

    mkdir -p "$release_dir"

    gh release download "$tag" \
        --repo "$repo" \
        --pattern "$archive" \
        --pattern "$checksum" \
        --dir "$release_dir" \
        --clobber

    (
        cd "$release_dir"
        awk 'NF { print }' "$checksum" >"$checksum.check"
        shasum -a 256 -c "$checksum.check"
        tar -xJf "$archive"
    )

    cp "$release_dir/qpath-$target/qpath" "$destination"
    chmod 755 "$destination"
}

require_command gh
require_command jq
require_command shasum
require_command tar

mkdir -p "$tmp_dir" "$assets_dir"

release_json=$tmp_dir/release.json
if [ "$release" = latest ]; then
    gh release view --repo "$repo" --json tagName,assets >"$release_json"
else
    gh release view "$release" --repo "$repo" --json tagName,assets >"$release_json"
fi
tag=$(jq -r '.tagName' "$release_json")

download_asset "$tag" aarch64-apple-darwin "$assets_dir/qpath"
download_asset "$tag" x86_64-apple-darwin "$assets_dir/qpath-x64"

printf 'Updated qpath assets to %s\n' "$tag"
