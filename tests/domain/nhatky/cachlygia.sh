#!/usr/bin/env bash
# Entry point — chạy full suite cách ly gia đình
exec bash "$(cd "$(dirname "$0")" && pwd)/cachlygia/cachlygia.sh" "$@"
