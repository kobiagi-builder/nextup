# Debug With Evidence Skill

**Description**: Evidence-based debugging workflow that prioritizes investigating existing logs before adding new ones, gathering concrete evidence, and forming hypotheses based on data rather than speculation.

**When to invoke**: When the user reports or ai detects a bug, error, or unexpected behavior that needs investigation.

---

## Skill Activation Instructions

You are now in **Evidence-Based Debugging Mode**. Follow this systematic workflow to diagnose and fix the issue.

## Core Principles

1. **NO SPECULATION**: Form conclusions only after gathering data and information. Never reach conclusions or start fixing without concrete evidence.
2. **ROOT CAUSE ANALYSIS**: Find and fix the underlying issue, not symptoms
3. **EXISTING LOGS FIRST**: Always check existing logs before adding new ones (saves testing iterations)

---

## Debugging Workflow

### Phase 1: Issue Understanding

1. **Answer the following questions**:
   - What is expected to happen?
   - What actually happened?
   - What are the steps to reproduce (if known)?
   - Are there any error messages or logs?

**In case of missiing informatio always ask the user to elabrate or clarify**

2. **Form multiple possible root cause hypotheses**:

   ```
   📊 EVIDENCE SUMMARY:
   - Log entry at [timestamp]: [relevant log]
   - Database query shows: [relevant data]
   - Error pattern: [observed pattern]

   🔍 HYPOTHESES :
   The issue occurs because:
   HYPOTHESIS 1 - [specific reasons].
   HYPOTHESIS 2 - [specific reasons].
   ...
   HYPOTHESIS n - [specific reasons].
   ```

### Phase 2: Existing Log Investigation (CRITICAL - DO THIS FIRST)

3. **Search for existing logs in the codebase**:
   - Use Grep to find existing `LoggerService` calls related to the issue
   - Look in relevant service files, controllers, and utilities
   - Check for logs in the execution path of the reported issue
   - Example: `grep -r "LoggerService" --include="*.ts" [relevant-directory]`

4. **If existing logs are found**:
   - Inspect the relevant part of the code and identify which logs would provide relevant information or evidence
   - Note the log statements that should appear when the issue occurs
   - Proceed to Phase 3 to fetch these logs

5. **If NO existing logs are found**:
   - Note where targeted logs should be added
   - Plan minimal, targeted logging statements
   - Add logs only in critical decision points
   - Skip to Phase 5 to add logs

### Phase 3: Evidence Gathering (Using Existing Logs)

6. **Reproduce the issue** (if possible):
   - Ask user to trigger the issue OR
   - Reproduce it yourself if you have the steps using the .claude/skills/playwright-skill skill

7. **Fetch DB logs immediately using MCP tools**:

   ```javascript
   // Application logs (backend)
   await mcp__supabase__get_logs({
     project_id: "[project-id]",
     service: "api",
   });

   // Database logs
   await mcp__supabase__get_logs({
     project_id: "[project-id]",
     service: "postgres",
   });

   // Auth logs (if auth-related)
   await mcp__supabase__get_logs({
     project_id: "[project-id]",
     service: "auth",
   });
   ```

8. **Query database for relevant data**:

   ```javascript
   await mcp__supabase__execute_sql({
     project_id: "[project-id]",
     query: "SELECT relevant_columns FROM relevant_table WHERE conditions",
   });
   ```

### Phase 4: Evidence Analysis

9. **Analyze collected evidence**:
   - Look for error messages
   - Check timestamps (sequence of events)
   - Identify anti-patterns or anomalies
   - Compare expected vs. actual behavior
   - Correlate logs with database state

10. **Form hypothesis BASED ON EVIDENCE ONLY**:

    ```
    📊 EVIDENCE SUMMARY:
    - Log entry at [timestamp]: [relevant log]
    - Database query shows: [relevant data]
    - Error pattern: [observed pattern]

    🔍 HYPOTHESIS (Based on Evidence Above):
    The issue occurs because [specific reason based on evidence].

    Root cause: [identified root cause]
    ```

11. **If evidence is insufficient**:

    ```
    ⚠️ INSUFFICIENT EVIDENCE:
    Current evidence shows: [what we know]

    Evidence needed to confirm:
    - [Specific log/data point 1]
    - [Specific log/data point 2]
    - [Specific log/data point 3]

    Recommendation: Add targeted logs at [specific locations]
    ```

### Phase 5: Adding New Logs (ONLY IF NEEDED)

12. **If existing logs were insufficient**, add targeted logs:
    - Add ONLY at critical decision points
    - Include relevant context (IDs, values, states)
    - Use appropriate log levels (error, warn, info, debug)
    - Example:
      ```typescript
      LoggerService.info("Processing action item", {
        actionItemId,
        status,
        userId,
        timestamp: new Date().toISOString(),
      });
      ```

13. **After adding logs**:
    - Reproduce the issue again
    - Fetch new logs using MCP tools
    - Analyze the new evidence
    - Update hypothesis

### Phase 6: Root Cause Fix

14. **Implement the fix**:
    - Fix the ROOT CAUSE, not symptoms
    - If current architecture is not feasible, explain why with evidence
    - Suggest new architecture if needed
    - Get user approval before major changes

15. **Test the fix**:
    - Verify the fix resolves the issue
    - Check logs to confirm expected behavior
    - Ensure no regression (test related functionality)

### Phase 7: Verification

16. **Final verification**:
    - Reproduce the original issue scenario
    - Confirm the issue is resolved
    - Check logs show expected behavior
    - Document the fix and root cause

---

## Evidence Format Template

Use this format when presenting evidence:

```
## 🔍 Evidence-Based Analysis

### Evidence Collected:
1. **Application Logs** ([timestamp range]):
   - [Key log entry 1]
   - [Key log entry 2]

2. **Database State**:
   - Query: [SQL query]
   - Result: [Relevant data]

3. **Error Messages**:
   - [Error 1]
   - [Error 2]

### Analysis:
- Pattern observed: [description]
- Timeline: [sequence of events]
- Anomaly: [unexpected behavior]

### Hypothesis (Based on Evidence Above):
[Your hypothesis with specific references to evidence]

### Root Cause:
[Identified root cause based on evidence]

### Proposed Fix:
[Fix that addresses root cause]
```

---

## When Evidence is Unavailable

If you cannot gather sufficient evidence, use this format:

```
⚠️ HYPOTHESIS (No Direct Evidence Available):
Based on [code inspection/architecture/similar patterns], I believe X might be happening.

Evidence needed to confirm:
- [Specific log entry showing behavior Y]
- [Database query result for table Z]
- [Service logs from component A]

Next Steps:
1. [Action to gather evidence 1]
2. [Action to gather evidence 2]

Would you like me to proceed with gathering this evidence?
```

---

## Critical Reminders

✅ **ALWAYS check existing logs FIRST** before adding new ones
✅ **Use MCP tools** to fetch logs and query database
✅ **Base conclusions on evidence**, not assumptions
✅ **Fix root causes**, not symptoms
✅ **Document the fix** with evidence that confirms it works

❌ **NEVER speculate** without labeling it as hypothesis
❌ **NEVER add logs** without checking for existing ones first
❌ **NEVER apply bandaid fixes** without understanding root cause

---

## Example Usage

**User**: "Action items are not executing. The status stays 'pending' even after the n8n workflow runs."

**AI Response**:

```
I'll help debug this using evidence-based analysis. Let me start by checking for existing logs in the action item execution flow.

[Searches codebase for existing logs in ActionItemService, n8n webhook handlers]

I found existing logs in:
- ActionItemService.ts line 245: "Processing action item execution"
- ActionItemService.ts line 312: "Action item status updated"
- n8n webhook handler line 89: "Received execution complete webhook"

Let me fetch these logs to see what's happening...

[Uses MCP to fetch logs, database queries, etc.]

📊 EVIDENCE SUMMARY:
- Log shows webhook received at 10:23:45 with actionItemId: abc123
- Database query shows status still 'pending' for actionItemId: abc123
- No "Action item status updated" log found (execution didn't reach that point)

🔍 HYPOTHESIS (Based on Evidence):
The webhook is being received, but the status update logic is not executing.
The missing "status updated" log suggests the code path is exiting early.

Root cause: [continues with diagnosis...]
```

---

## Skill Completion

When the issue is resolved, provide a summary:

```
✅ DEBUGGING COMPLETE

Issue: [Original issue description]
Root Cause: [Identified root cause with evidence]
Fix Applied: [Description of fix]
Verification: [Evidence that fix works]

Logs checked: [List of logs examined]
Evidence sources: [Application logs, database queries, etc.]
```
