#!/usr/bin/env bash
# Wrapper — dùng deploy.sh thay thế
exec "$(cd "$(dirname "$0")" && pwd)/deploy.sh" "$@"
