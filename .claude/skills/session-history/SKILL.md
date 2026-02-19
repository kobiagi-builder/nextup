---
name: session-history
description: Access and search your own past conversation history across sessions. Browse recent sessions, search by keywords, recall what was discussed, find decisions made, and retrieve context from previous work. Use when you need to remember what happened in a past session or find a previous discussion.
---

# Session History Skill

You now have access to your own conversation history stored on disk. Use it to recall past discussions, find decisions, and build on previous work.

## Data Locations

### Sessions Index (structured metadata)
- **Path**: `~/.claude/projects/-Users-kobiagi-Desktop-Development-Product-Consultant-Helper/sessions-index.json`
- **Format**: JSON with `entries` array
- **Fields per entry**: `sessionId`, `firstPrompt`, `messageCount`, `created`, `modified`, `gitBranch`, `projectPath`, `isSidechain`

### Individual Session Transcripts
- **Path**: `~/.claude/projects/-Users-kobiagi-Desktop-Development-Product-Consultant-Helper/{sessionId}.jsonl`
- **Format**: JSONL (one JSON object per line)
- **Message types**: `queue-operation`, `user`, `assistant`, `result`
- **Message structure**: Each line with `type: "user"|"assistant"` has a `message` field containing `role` and `content`
  - `content` can be a string (user messages) or an array of content blocks (assistant messages with text/tool_use)

### Global History Index
- **Path**: `~/.claude/history.jsonl`
- **Format**: JSONL with `display`, `timestamp`, `project` per line
- **Scope**: All projects, all prompts — useful for cross-project search

## Available Operations

### 1. List Recent Sessions

Read the sessions index and present a summary table:

```bash
# Read sessions index
Read ~/.claude/projects/-Users-kobiagi-Desktop-Development-Product-Consultant-Helper/sessions-index.json

# Parse and display as table: Date | First Prompt (truncated) | Messages | Branch | Session ID
```

**Output format** — present as a markdown table sorted by most recent first:

| # | Date | Topic (from firstPrompt) | Messages | Branch | Session ID |
|---|------|--------------------------|----------|--------|------------|

### 2. Search Sessions by Keyword

Search across session transcripts for specific keywords, decisions, or topics:

```bash
# Search session content using Grep
Grep({
  pattern: "<keyword>",
  path: "~/.claude/projects/-Users-kobiagi-Desktop-Development-Product-Consultant-Helper/",
  glob: "*.jsonl",
  output_mode: "content",
  "-C": 0
})
```

Then parse matching lines to extract the session ID (from filename) and relevant text content.

### 3. Read a Specific Session

Load and summarize a full session transcript:

```bash
# Read session JSONL file
Read ~/.claude/projects/-Users-kobiagi-Desktop-Development-Product-Consultant-Helper/{sessionId}.jsonl
```

**Parsing rules:**
- Skip lines where `type` is `queue-operation` or `result`
- For `type: "user"`: extract `message.content` (string) — this is what the user said
- For `type: "assistant"`: extract text blocks from `message.content` array where `content[].type === "text"` — this is what Claude said
- Skip `tool_use` and `tool_result` blocks (these are internal tool calls)

**Output format** — present as a clean conversation:

```
**User**: [message text]
**Claude**: [response text, truncated to key points]
...
```

### 4. Find Decisions & Outcomes

When the user asks "what did we decide about X" or "what was the outcome of Y":

1. First search sessions index `firstPrompt` fields for topic keywords
2. Then grep session JSONL files for specific terms
3. Read matching sessions and extract the relevant decision/outcome passages
4. Present findings with session date and ID for reference

### 5. Cross-Project Search

Search the global history for prompts across all projects:

```bash
Grep({
  pattern: "<keyword>",
  path: "~/.claude/history.jsonl",
  output_mode: "content"
})
```

## Usage Patterns

### "What did we work on recently?"
→ List Recent Sessions (operation 1)

### "Did we discuss X before?"
→ Search Sessions by Keyword (operation 2)

### "Show me session abc-123"
→ Read a Specific Session (operation 3)

### "What did we decide about the auth approach?"
→ Find Decisions & Outcomes (operation 4)

### "Have I asked about this in any project?"
→ Cross-Project Search (operation 5)

## Important Notes

- Session files can be large. For long sessions (50+ messages), summarize rather than dump everything.
- When presenting search results, always include the **session date** and **session ID** so the user can resume with `claude --resume {sessionId}`.
- The `firstPrompt` field in the sessions index is often the best quick summary of what a session was about.
- Truncate long content blocks to ~200 chars with "..." to keep output readable.
- Sort results by date (most recent first) unless the user asks otherwise.
- The actual paths use the project path with slashes replaced by dashes as the directory name.
