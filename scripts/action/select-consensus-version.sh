#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

tags=$(git ls-remote --tags --refs https://github.com/hiero-ledger/hiero-consensus-node)
versions=$(printf '%s\n' "$tags" |
  awk '$2 ~ /^refs\/tags\/v?[0-9]+\.[0-9]+\.[0-9]+$/ { sub(/^refs\/tags\/v?/, "v", $2); print $2 }' |
  sort -Vru)

while IFS= read -r version; do
  [[ -n "$version" ]] || continue
  release_dir="${version%.*}"
  for extension in sha384 zip; do
    url="https://builds.hedera.com/node/software/$release_dir/build-$version.$extension"
    status=$(curl --silent --show-error --location --head --output /dev/null \
      --connect-timeout 10 --max-time 30 --retry 2 --write-out '%{http_code}' "$url")

    case "$status" in
      2??) ;;
      404) continue 2 ;;
      *)
        printf 'Unable to check %s (HTTP %s)\n' "$url" "$status" >&2
        exit 1
        ;;
    esac
  done

  printf '%s\n' "$version"
  exit 0
done <<< "$versions"

printf 'No stable consensus release has both Solo build artifacts.\n' >&2
exit 1
