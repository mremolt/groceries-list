#!/bin/sh
# Summarises implementation-timing.tsv: seconds per category, per milestone, and the 15 largest single parts.
f="$(cd "$(dirname "$0")/.." && pwd)/implementation-timing.tsv"
echo "== by category =="; awk -F'\t' 'NR>1{s[$4]+=$2}END{for(k in s)printf "%8d s  %5.1f min  %s\n",s[k],s[k]/60,k}' "$f" | sort -rn
echo "== by milestone =="; awk -F'\t' 'NR>1{s[$3]+=$2}END{for(k in s)printf "%8d s  %5.1f min  %s\n",s[k],s[k]/60,k}' "$f" | sort -rn
echo "== 15 largest parts =="; awk -F'\t' 'NR>1{printf "%8d s  %s | %s | %s\n",$2,$3,$4,$5}' "$f" | sort -rn | head -15
