#!/usr/bin/env bash
# NK-SES-F* — Test function family session (family-api.js)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../common.sh
source "${SCRIPT_DIR}/../../common.sh"

TEST_FILE="${SCRIPT_DIR}/familysession-function.test.mjs"

bold "=== Phiên gia đình — FUNCTION ==="
node --test "$TEST_FILE"
print_summary
