#!/bin/bash
# Malicious Skill Detector - Automated Scanner
# Scans a skill directory for prompt injection and malicious patterns.
# Usage: bash scan-skill.sh <path-to-skill-directory>
#
# Outputs a JSON report to stdout with findings per category.

set -euo pipefail

SKILL_DIR="${1:?Usage: scan-skill.sh <path-to-skill-directory>}"

if [ ! -d "$SKILL_DIR" ]; then
  echo '{"error": "Directory not found: '"$SKILL_DIR"'"}' >&2
  exit 1
fi

SKILL_NAME=$(basename "$SKILL_DIR")
FINDINGS=""
FINDING_COUNT=0
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
FILES_SCANNED=0

add_finding() {
  local severity="$1"
  local category="$2"
  local file="$3"
  local line_num="$4"
  local evidence="$5"
  local description="$6"

  # Escape JSON special characters in evidence
  evidence=$(echo "$evidence" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ' | head -c 200)

  if [ -n "$FINDINGS" ]; then
    FINDINGS="$FINDINGS,"
  fi

  FINDINGS="$FINDINGS
    {
      \"severity\": \"$severity\",
      \"category\": \"$category\",
      \"file\": \"$file\",
      \"line\": $line_num,
      \"evidence\": \"$evidence\",
      \"description\": \"$description\"
    }"

  FINDING_COUNT=$((FINDING_COUNT + 1))

  case "$severity" in
    CRITICAL) CRITICAL_COUNT=$((CRITICAL_COUNT + 1)) ;;
    HIGH) HIGH_COUNT=$((HIGH_COUNT + 1)) ;;
    MEDIUM) MEDIUM_COUNT=$((MEDIUM_COUNT + 1)) ;;
    LOW) LOW_COUNT=$((LOW_COUNT + 1)) ;;
  esac
}

scan_file() {
  local file="$1"
  local relative_file="${file#$SKILL_DIR/}"
  FILES_SCANNED=$((FILES_SCANNED + 1))

  # --- Category 1: Instruction Override Attacks ---
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "CRITICAL" "instruction-override" "$relative_file" "$line_num" "$match" "Instruction override pattern detected"
  done < <(grep -inE '(ignore (all )?(previous|prior|above) instructions|disregard (all )?(above|previous)|forget everything|reset your context|you are now [a-z]|your new role|new instructions:|SYSTEM:|override:|from now on you (will|must|should|are))' "$file" 2>/dev/null | head -20 || true)

  # --- Category 2: Data Exfiltration ---
  # Check for suspicious URL construction with variables
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "data-exfiltration" "$relative_file" "$line_num" "$match" "Potential data exfiltration via URL construction with variables"
  done < <(grep -nE '(https?://[^"\s]*\$\{|fetch\(.*\+.*process\.env|curl.*\$\(|wget.*\$\(|\bsendBeacon\b)' "$file" 2>/dev/null | head -10 || true)

  # Check for base64 encoding of env/secret data
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "data-exfiltration" "$relative_file" "$line_num" "$match" "Base64 encoding of potentially sensitive data"
  done < <(grep -nE '(btoa|atob|Buffer\.from|base64.*encode).*(env|secret|key|token|password|credential)' "$file" 2>/dev/null | head -10 || true)

  # --- Category 3: Credential & Secret Access ---
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "credential-access" "$relative_file" "$line_num" "$match" "Suspicious credential/secret access pattern"
  done < <(grep -nE '(read|cat|type|Get-Content).*(\.env|credentials\.json|\.ssh/|\.aws/|\.config/gcloud|\.npmrc|\.pypirc|id_rsa|id_ed25519)' "$file" 2>/dev/null | head -10 || true)

  # Check for token/key logging
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "credential-access" "$relative_file" "$line_num" "$match" "Logging or printing credential values"
  done < <(grep -nE '(console\.(log|info|debug|warn)|print|echo|logger\.(info|debug)).*\b(token|api_key|apiKey|secret|password|credential|access_key|private_key)\b' "$file" 2>/dev/null | head -10 || true)

  # --- Category 4: Hidden & Encoded Content ---
  # Check for invisible unicode (zero-width chars, tags block)
  if LC_ALL=C grep -Pn '[\x{200B}\x{200C}\x{200D}\x{FEFF}\x{2060}\x{2061}\x{2062}\x{2063}\x{2064}]' "$file" 2>/dev/null | head -5 | while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "CRITICAL" "hidden-content" "$relative_file" "$line_num" "(invisible unicode characters)" "Invisible unicode characters detected — potential hidden instructions"
  done; then true; fi

  # Check for Tags block unicode (U+E0000-U+E007F) via hex dump
  if xxd -p "$file" 2>/dev/null | tr -d '\n' | grep -qi 'f3a08080\|f3a08081\|f3a08082'; then
    add_finding "CRITICAL" "hidden-content" "$relative_file" 0 "(Tags block U+E0000-U+E007F bytes)" "Unicode Tags block detected — likely invisible text attack"
  fi

  # Check for HTML comments with instruction-like content
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "hidden-content" "$relative_file" "$line_num" "$match" "HTML comment containing instruction-like content"
  done < <(grep -nE '<!--.*\b(ignore|override|system|instruction|forget|disregard|secret|hidden)\b.*-->' "$file" 2>/dev/null | head -10 || true)

  # Check for base64 in markdown files (unusual)
  if [[ "$file" == *.md ]]; then
    while IFS=: read -r line_num match; do
      [ -z "$line_num" ] && continue
      # Skip image data URIs which are legitimate
      if ! echo "$match" | grep -q 'data:image'; then
        add_finding "MEDIUM" "hidden-content" "$relative_file" "$line_num" "$match" "Base64-like string in markdown file"
      fi
    done < <(grep -nE '[A-Za-z0-9+/]{40,}={0,2}' "$file" 2>/dev/null | head -5 || true)
  fi

  # --- Category 5: Authority Impersonation ---
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "authority-impersonation" "$relative_file" "$line_num" "$match" "Authority impersonation pattern detected"
  done < <(grep -inE '(official anthropic|claude system message|anthropic instruction|development team (requires|instructs)|<\|im_start\|>system|\[SYSTEM\]|<system>.*instruction)' "$file" 2>/dev/null | head -10 || true)

  # --- Category 6: Dangerous Operations ---
  # rm -rf on non-temp dirs
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    # Allow rm -rf on /tmp/ paths
    if ! echo "$match" | grep -qE 'rm -rf /tmp/'; then
      add_finding "HIGH" "dangerous-operations" "$relative_file" "$line_num" "$match" "Destructive file operation on non-temp directory"
    fi
  done < <(grep -nE 'rm\s+-rf\s+[^/]|rm\s+-rf\s+/[^t]' "$file" 2>/dev/null | head -10 || true)

  # chmod 777, writing to system dirs
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "dangerous-operations" "$relative_file" "$line_num" "$match" "Dangerous system operation"
  done < <(grep -nE '(chmod\s+777|chmod\s+\+[sx].*/(etc|usr|bin)|write.*(\/etc\/|\/usr\/|~\/\.(bashrc|zshrc|profile|bash_profile)))' "$file" 2>/dev/null | head -10 || true)

  # Dynamic code execution
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "MEDIUM" "dangerous-operations" "$relative_file" "$line_num" "$match" "Dynamic code execution pattern"
  done < <(grep -nE '\beval\s*\(|new\s+Function\s*\(|exec\s*\(' "$file" 2>/dev/null | head -10 || true)

  # --- Category 7: Behavioral Manipulation ---
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "MEDIUM" "behavioral-manipulation" "$relative_file" "$line_num" "$match" "Instruction to hide behavior from user"
  done < <(grep -inE "(don.t (tell|inform|alert|notify|show) the user|silently|without (the user|telling|informing|notifying)|hide (this|from)|suppress (error|warning|output)|skip (safety|security|validation) check)" "$file" 2>/dev/null | head -10 || true)

  # --- Category 8: Supply Chain Red Flags ---
  # Check for remote code execution
  while IFS=: read -r line_num match; do
    [ -z "$line_num" ] && continue
    add_finding "HIGH" "supply-chain" "$relative_file" "$line_num" "$match" "Downloads and executes remote code"
  done < <(grep -nE '(curl|wget|fetch).*\|\s*(bash|sh|node|python|eval)|pipe.*shell' "$file" 2>/dev/null | head -10 || true)

  # npm preinstall/postinstall with suspicious commands
  if [[ "$file" == *package.json ]]; then
    while IFS=: read -r line_num match; do
      [ -z "$line_num" ] && continue
      add_finding "MEDIUM" "supply-chain" "$relative_file" "$line_num" "$match" "Package script hook that may execute arbitrary code"
    done < <(grep -nE '"(preinstall|postinstall|preuninstall)"' "$file" 2>/dev/null | head -5 || true)
  fi
}

# Check if SKILL.md has valid YAML frontmatter
SKILL_MD="$SKILL_DIR/SKILL.md"
if [ -f "$SKILL_MD" ]; then
  if ! head -1 "$SKILL_MD" | grep -q '^---'; then
    add_finding "MEDIUM" "supply-chain" "SKILL.md" 1 "Missing YAML frontmatter delimiter" "SKILL.md missing YAML frontmatter — structural anomaly"
  fi

  # Check for overly broad permissions
  if grep -q 'allowed-tools.*\*' "$SKILL_MD" 2>/dev/null; then
    add_finding "MEDIUM" "supply-chain" "SKILL.md" 0 "allowed-tools: [*]" "Overly broad tool permissions — skill requests access to all tools"
  fi
else
  add_finding "LOW" "supply-chain" "SKILL.md" 0 "No SKILL.md found" "Skill directory has no SKILL.md file"
fi

# Scan all files in the skill directory
while IFS= read -r -d '' file; do
  # Skip binary files (but not shell scripts or other text executables)
  if file "$file" | grep -qiE '\b(binary|image|font|compiled|ELF|Mach-O)\b' && ! file "$file" | grep -qi 'text'; then
    continue
  fi
  scan_file "$file"
done < <(find "$SKILL_DIR" -type f -print0 2>/dev/null)

# Determine verdict
VERDICT="SAFE"
if [ "$CRITICAL_COUNT" -gt 0 ]; then
  VERDICT="MALICIOUS"
elif [ "$HIGH_COUNT" -ge 2 ]; then
  VERDICT="SUSPICIOUS"
elif [ "$HIGH_COUNT" -ge 1 ]; then
  VERDICT="CAUTION"
elif [ "$MEDIUM_COUNT" -ge 2 ]; then
  VERDICT="CAUTION"
fi

# Output JSON report
cat <<EOF
{
  "skill_name": "$SKILL_NAME",
  "scan_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files_scanned": $FILES_SCANNED,
  "verdict": "$VERDICT",
  "summary": {
    "total": $FINDING_COUNT,
    "critical": $CRITICAL_COUNT,
    "high": $HIGH_COUNT,
    "medium": $MEDIUM_COUNT,
    "low": $LOW_COUNT
  },
  "findings": [$FINDINGS
  ]
}
EOF
