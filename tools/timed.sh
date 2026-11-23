#!/bin/sh
# Usage: tools/timed.sh <milestone> <category> <label> -- <command...>
# Runs the command and appends one TSV row to implementation-timing.tsv at the repository root:
# start (ISO), duration in seconds, milestone, category, label, exit code.
# Categories: read-docs | design | code | test-run | build-gate | e2e | infra | debug | docs | other
root="$(cd "$(dirname "$0")/.." && pwd)"
ms="$1"; cat="$2"; label="$3"; shift 4
start="$(date -Is)"; t0="$(date +%s)"
"$@"; rc=$?
t1="$(date +%s)"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$start" "$((t1-t0))" "$ms" "$cat" "$label" "$rc" >> "$root/implementation-timing.tsv"
exit $rc
