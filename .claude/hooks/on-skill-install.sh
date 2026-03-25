#!/bin/bash
# Hook: Detect new skill file writes and prompt security scan
# Triggered by PostToolUse on Write|Edit events
# Reads tool input from stdin to check if file is in .claude/skills/

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)

# Only trigger for files in .claude/skills/ directories
if [[ "$FILE_PATH" == *".claude/skills/"* ]]; then
  # Extract skill directory name
  SKILL_DIR=$(echo "$FILE_PATH" | sed -n 's|.*\.claude/skills/\([^/]*\).*|\1|p')

  # Don't trigger for the malicious-skill-detector itself (avoid infinite loop)
  if [[ "$SKILL_DIR" == "malicious-skill-detector" ]]; then
    exit 0
  fi

  echo ""
  echo "** SKILL FILE CHANGE DETECTED **"
  echo "Skill: $SKILL_DIR"
  echo "File: $FILE_PATH"
  echo ""
  echo "A skill file was just created or modified. For security, run the malicious-skill-detector:"
  echo "  Use the malicious-skill-detector skill to scan .claude/skills/$SKILL_DIR"
  echo ""
fi

exit 0
