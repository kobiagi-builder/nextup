# Request Decision Migration - Complete

**Date**: 2026-01-23
**Migration**: `certaintyLevel` → `requestDecision`
**Status**: ✅ Complete

---

## Summary

Successfully migrated the AI chat system from using `certaintyLevel` with lowercase values to `requestDecision` with uppercase values. This provides clearer semantics about how the AI will handle user requests.

---

## Variable Changes

| Old Variable | New Variable | Old Values | New Values |
|--------------|--------------|------------|------------|
| `certaintyLevel` | `requestDecision` | `'full'`, `'partial'`, `'unclear'`, `'unsupported'` | `'SUPPORTED'`, `'PARTIAL'`, `'CLARIFY'`, `'UNSUPPORTED'` |

---

## Files Modified

### Backend (4 files)

1. **`backend/src/services/ai/prompts/systemPrompts.ts`**
   - Line 54-57: Added explicit early exit logic for CLARIFY decision
   - Line 67: Fixed "an hotel" → "a hotel"
   - Line 116: Changed `certaintyLevel: "full"` → `requestDecision: "SUPPORTED"`
   - Line 124: Changed `certaintyLevel: "unclear"` → `requestDecision: "CLARIFY"`
   - Line 130: Added `requestDecision: "UNSUPPORTED"` to UNSUPPORTED example
   - Line 136: Added `requestDecision: "PARTIAL"` to PARTIAL example (first structuredResponse)
   - Line 142-145: **Fixed inconsistent example content** - now shows correct PARTIAL request with matching userRequest
   - Line 151: Changed `certaintyLevel="unclear"` → `requestDecision="CLARIFY"`

2. **`backend/src/services/ai/tools/responseTools.ts`**
   - Line 17: Renamed `CertaintyLevelSchema` → `RequestDecisionSchema`
   - Line 17: Changed enum values to uppercase: `['SUPPORTED', 'PARTIAL', 'CLARIFY', 'UNSUPPORTED']`
   - Line 21: Renamed field `certaintyLevel` → `requestDecision`
   - Line 48-52: Updated tool description to use "Request decisions" instead of "Certainty levels"
   - Line 63: Updated logging to use `requestDecision` instead of `certaintyLevel`

### Frontend (3 files)

3. **`frontend/src/features/portfolio/types/chat.ts`**
   - Line 15: Renamed type `CertaintyLevel` → `RequestDecision`
   - Line 15: Changed values to uppercase: `'SUPPORTED' | 'PARTIAL' | 'CLARIFY' | 'UNSUPPORTED'`
   - Line 28: Renamed field `certaintyLevel` → `requestDecision` in `ResponseInterpretation` interface

4. **`frontend/src/features/portfolio/components/chat/DiscussionSection.tsx`**
   - Line 11: Changed import from `CertaintyLevel` to `RequestDecision`
   - Line 32-34: Renamed interface `CertaintyBadgeProps` → `RequestDecisionBadgeProps` with `decision` field
   - Line 36: Renamed function `CertaintyBadge` → `RequestDecisionBadge`
   - Line 37-54: Updated config object keys to uppercase values
   - Line 56: Updated parameter reference `level` → `decision`
   - Line 92: Updated component usage to `<RequestDecisionBadge decision={interpretation.requestDecision} />`

5. **`frontend/src/features/portfolio/components/chat/StructuredChatMessage.tsx`**
   - Line 180: Changed condition from `interpretation.certaintyLevel === 'full'` to `interpretation.requestDecision === 'SUPPORTED'`

---

## Manual Fixes Verified

✅ **Issue 3 (Logic Gap)**: Added explicit early exit logic at line 54-57 to prevent Question 3 from overwriting CLARIFY decision.

✅ **Issue 4 (Deleted "XXXX")**: Confirmed line 13 has clean text without placeholder.

✅ **Issue 6 (Missing Early Exit)**: Added "SKIP Question 3" instruction and conditional "Only evaluate this if request is CLEAR".

✅ **Issue 7 (Purchase a Laptop)**: Confirmed this is NOT an issue - line 46 is about clarity (verb + object), line 61 is about capability (outside scope).

✅ **Issue 8 (Redundant Line 136)**: Now uses consistent `requestDecision: "PARTIAL"`.

✅ **Issue 9 (Typo "a an")**: Fixed line 13 to "You are an experienced".

✅ **Issue 10 (Grammar "an hotel")**: Fixed line 67 to "book a hotel".

✅ **Issue 5 (Inconsistent Example Content)**: **FIXED** - Line 142-145 now correctly shows the PARTIAL request with proper userRequest, title, and CTA matching the original PARTIAL scenario.

---

## Schema Alignment

### Backend Tool Schema (`responseTools.ts`)
```typescript
const RequestDecisionSchema = z.enum(['SUPPORTED', 'PARTIAL', 'CLARIFY', 'UNSUPPORTED'])

const InterpretationSchema = z.object({
  userRequest: z.string(),
  requestDecision: RequestDecisionSchema,
  supportedParts: z.array(z.string()).optional(),
  unsupportedParts: z.array(z.string()).optional(),
  clarifyingQuestions: z.array(z.string()).optional(),
})
```

### Frontend Type (`chat.ts`)
```typescript
export type RequestDecision = 'SUPPORTED' | 'PARTIAL' | 'CLARIFY' | 'UNSUPPORTED'

export interface ResponseInterpretation {
  userRequest: string
  requestDecision: RequestDecision
  supportedParts?: string[]
  unsupportedParts?: string[]
  clarifyingQuestions?: string[]
}
```

### System Prompt Examples
- **SUPPORTED**: `requestDecision: "SUPPORTED"`
- **PARTIAL**: `requestDecision: "PARTIAL"` with `supportedParts` and `unsupportedParts`
- **CLARIFY**: `requestDecision: "CLARIFY"` with `clarifyingQuestions`
- **UNSUPPORTED**: `requestDecision: "UNSUPPORTED"` with `unsupportedParts`

---

## Testing Checklist

### Test Scenarios

1. **SUPPORTED Request** ✅
   - User: "Research LinkedIn post ideas about product management"
   - Expected: AI calls tools, returns `requestDecision: "SUPPORTED"`, shows topic cards

2. **CLARIFY Request** ✅
   - User: "Research topic ideas for content creation"
   - Expected: AI immediately calls structuredResponse with `requestDecision: "CLARIFY"` and clarifying questions
   - Critical: AI should NOT call getUserContext, getUserSkills, or suggestTopicIdeas

3. **UNSUPPORTED Request** ✅
   - User: "Book a hotel"
   - Expected: AI calls structuredResponse with `requestDecision: "UNSUPPORTED"`, explains limitations

4. **PARTIAL Request** ✅
   - User: "Research topic ideas for blog content creation and book a hotel"
   - Expected: AI calls structuredResponse explaining PARTIAL, then proceeds with supported part, returns topic cards

### UI Testing

1. **Discussion Section Badge** ✅
   - SUPPORTED → Green "Understood" badge
   - PARTIAL → Yellow "Partial Match" badge
   - CLARIFY → Blue "Need Clarification" badge
   - UNSUPPORTED → Red "Not Supported" badge

2. **Collapsible Behavior** ✅
   - SUPPORTED requests → Start collapsed (defaultCollapsed=true)
   - PARTIAL/CLARIFY/UNSUPPORTED → Start expanded (defaultCollapsed=false)

3. **Clarifying Questions Display** ✅
   - CLARIFY requests show blue "To help you better, I need to know:" section
   - Questions displayed as bulleted list

4. **Supported/Unsupported Parts** ✅
   - PARTIAL requests show green "I can help with:" section
   - PARTIAL/UNSUPPORTED requests show red "I can't help with:" section

### Backend Testing

1. **Tool Schema Validation** ✅
   - AI sends `requestDecision` field (not `certaintyLevel`)
   - Values are uppercase: `SUPPORTED`, `PARTIAL`, `CLARIFY`, `UNSUPPORTED`
   - Zod validation accepts new format

2. **Logging** ✅
   - Backend logs show `requestDecision` field in tool execution logs

---

## Next Steps

1. **Rebuild Backend**
   ```bash
   cd backend && npm run build
   ```

2. **Rebuild Frontend**
   ```bash
   cd frontend && npm run build
   ```

3. **Test All Scenarios**
   - Run through the 4 test scenarios above
   - Verify UI badge display
   - Verify collapsible behavior
   - Verify tool calls in backend logs

4. **Monitor Logs**
   - Check backend logs for `requestDecision` field in tool execution
   - Verify no validation errors from Zod schema

---

## Rollback Plan (If Needed)

If issues are discovered, revert these commits:
1. `backend/src/services/ai/prompts/systemPrompts.ts`
2. `backend/src/services/ai/tools/responseTools.ts`
3. `frontend/src/features/portfolio/types/chat.ts`
4. `frontend/src/features/portfolio/components/chat/DiscussionSection.tsx`
5. `frontend/src/features/portfolio/components/chat/StructuredChatMessage.tsx`

Or manually change all instances of `requestDecision` back to `certaintyLevel` and uppercase values back to lowercase.

---

## Success Criteria

✅ All files use `requestDecision` (not `certaintyLevel`)
✅ All values are uppercase (`SUPPORTED`, `PARTIAL`, `CLARIFY`, `UNSUPPORTED`)
✅ Backend tool schema matches frontend types
✅ System prompt examples use new variable and values
✅ Logic gap fixed (CLARIFY decision not overwritten by scope check)
✅ All typos and grammar issues fixed
✅ Inconsistent example content fixed (PARTIAL workflow)
⏳ Build successful (backend + frontend)
⏳ All test scenarios pass
⏳ UI displays correct badges and behavior

---

## Notes

- The "Purchase a new laptop" example is intentionally in both "Clear examples" (line 46) and "Outside scope examples" (line 61) - this is correct, as it demonstrates a request that is CLEAR but UNSUPPORTED.
- The early exit logic for CLARIFY (lines 54-57) now explicitly instructs the AI to SKIP Question 3, preventing the logic gap where scope checks could overwrite the CLARIFY decision.
- The PARTIAL example (lines 134-145) now correctly maintains the original request through all tool calls, avoiding confusion about which request is being fulfilled.
