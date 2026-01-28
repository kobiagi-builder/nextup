# Mock Configuration Guide

Complete guide for configuring AI tool mocking in the Product Consultant Helper application.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Configuration Scenarios](#configuration-scenarios)
3. [Available Mocks](#available-mocks)
4. [Environment Variables](#environment-variables)
5. [Testing Recommendations](#testing-recommendations)

---

## Overview

The mock system allows you to bypass real AI API calls during development and testing. This is particularly useful for:

- **Avoiding API quota limits** (especially Gemini free tier)
- **Faster development** (no network latency)
- **Deterministic testing** (consistent responses)
- **Cost savings** (no API charges)

### How It Works

1. **Master Toggle** (`MOCK_ALL_AI_TOOLS`) - Controls all services at once
2. **Individual Toggles** - Fine-grained control per service (when master = `PER_TOGGLE`)
3. **Mock Data Files** - JSON files in `backend/src/services/ai/mocks/data/`
4. **Dynamic Variables** - Support for `{{traceId}}`, `{{artifactId}}`, etc.

---

## Configuration Scenarios

### Scenario 1: Avoid Gemini Quota Limits (Recommended)

**Use Case:** You want to use real Claude and Tavily APIs but mock Gemini content writing to avoid quota exhaustion.

**`.env` Configuration:**
```bash
# Master toggle
MOCK_ALL_AI_TOOLS=PER_TOGGLE

# Individual toggles
MOCK_AI_SERVICE=API                    # Real Claude
MOCK_RESEARCH_TOOLS=API                # Real Tavily
MOCK_SKELETON_TOOLS=API                # Real Claude
MOCK_CONTENT_WRITING_TOOLS=MOCK        # Mock Gemini ← KEY SETTING
MOCK_HUMANITY_CHECK_TOOLS=API          # Real Claude
MOCK_TOPICS_RESEARCH_TOOLS=API         # Real Claude

# API keys needed
TAVILY_API_KEY=xxx                     # For research
# GOOGLE_GENERATIVE_AI_API_KEY not needed
```

**What You Get:**
- ✅ Real Claude agent with tools
- ✅ Real Tavily research
- ✅ Mock Gemini content (avoids quota)
- ✅ All 8 tones supported (professional, casual, conversational, formal, technical, friendly, authoritative, humorous)

---

### Scenario 2: Mock Everything (No API Keys)

**Use Case:** Pure frontend development, no backend API keys available.

**`.env` Configuration:**
```bash
# Master toggle - forces all to mock
MOCK_ALL_AI_TOOLS=MOCK

# Individual toggles ignored (master override)
# No API keys needed!
```

**What You Get:**
- ✅ All AI services return mock data
- ✅ No API keys required
- ✅ Fastest development speed
- ❌ No real AI interactions

---

### Scenario 3: Production (All Real APIs)

**Use Case:** Production deployment with all real AI services.

**`.env` Configuration:**
```bash
# Master toggle - forces all to real APIs
MOCK_ALL_AI_TOOLS=API

# Individual toggles ignored (master override)
# All API keys required
TAVILY_API_KEY=xxx
GOOGLE_GENERATIVE_AI_API_KEY=xxx
```

**What You Get:**
- ✅ All services use real APIs
- ✅ Production-grade responses
- ❌ API costs apply
- ❌ Subject to rate limits

---

### Scenario 4: Custom Mix (Advanced)

**Use Case:** Mix and match real and mock services based on your needs.

**`.env` Configuration:**
```bash
# Master toggle
MOCK_ALL_AI_TOOLS=PER_TOGGLE

# Individual toggles (customize as needed)
MOCK_AI_SERVICE=API                    # Real Claude
MOCK_RESEARCH_TOOLS=MOCK               # Mock Tavily (save quota)
MOCK_SKELETON_TOOLS=MOCK               # Mock Claude skeleton
MOCK_CONTENT_WRITING_TOOLS=MOCK        # Mock Gemini
MOCK_HUMANITY_CHECK_TOOLS=API          # Real Claude humanity check
MOCK_TOPICS_RESEARCH_TOOLS=MOCK        # Mock Claude topics
```

---

## Available Mocks

### ✅ Complete Mock Coverage

#### Content Writing Tools (Gemini)
**Location:** `backend/src/services/ai/mocks/data/contentWritingTools/`

**writeContentSection** (All 8 tones):
- ✅ `writeContentSection.professional.json` - Professional business tone
- ✅ `writeContentSection.casual.json` - Casual conversational tone
- ✅ `writeContentSection.conversational.json` - Conversational engaging tone
- ✅ `writeContentSection.formal.json` - Formal academic tone
- ✅ `writeContentSection.technical.json` - Technical detailed tone
- ✅ `writeContentSection.friendly.json` - Friendly supportive tone
- ✅ `writeContentSection.authoritative.json` - Authoritative expert tone
- ✅ `writeContentSection.humorous.json` - Humorous entertaining tone

**writeFullContent** (All artifact types):
- ✅ `writeFullContent.social_post.json` - Social media posts
- ✅ `writeFullContent.blog.json` - Blog articles
- ✅ `writeFullContent.showcase.json` - Portfolio showcases

#### Skeleton Tools (Claude)
**Location:** `backend/src/services/ai/mocks/data/skeletonTools/`

- ✅ `generateContentSkeleton.blog.json`
- ✅ `generateContentSkeleton.showcase.json`
- ✅ `generateContentSkeleton.social_post.json`

#### Research Tools (Tavily)
**Location:** `backend/src/services/ai/mocks/data/researchTools/`

- ✅ `conductDeepResearch.blog.json`
- ✅ `conductDeepResearch.showcase.json`
- ✅ `conductDeepResearch.social_post.json`

#### Topics Research Tools (Claude)
**Location:** `backend/src/services/ai/mocks/data/topicsResearchTools/`

- ✅ `topicsResearch.blog.json`
- ✅ `topicsResearch.showcase.json`
- ✅ `topicsResearch.social_post.json`

#### Humanity Check Tools (Claude)
**Location:** `backend/src/services/ai/mocks/data/humanityCheckTools/`

- ✅ `applyHumanityCheck.json`
- ✅ `checkContentHumanity.json`

#### AI Service (Claude)
**Location:** `backend/src/services/ai/mocks/data/aiService/`

- ✅ `streamChat.default.json`
- ✅ `generateResponse.default.json`

---

## Environment Variables

### Master Toggle

```bash
MOCK_ALL_AI_TOOLS=<value>
```

**Values:**
- `API` - All services use real APIs (production mode)
- `MOCK` - All services use mocks (pure mock mode)
- `PER_TOGGLE` - Respect individual toggle settings (flexible mode)

---

### Individual Toggles

Only used when `MOCK_ALL_AI_TOOLS=PER_TOGGLE`

```bash
MOCK_AI_SERVICE=<API|MOCK>                    # Claude main agent
MOCK_RESEARCH_TOOLS=<API|MOCK>                # Tavily web search
MOCK_SKELETON_TOOLS=<API|MOCK>                # Claude skeleton generation
MOCK_CONTENT_WRITING_TOOLS=<API|MOCK>         # Gemini content writing
MOCK_HUMANITY_CHECK_TOOLS=<API|MOCK>          # Claude humanity checking
MOCK_TOPICS_RESEARCH_TOOLS=<API|MOCK>         # Claude topics research
```

---

### Mock Behavior Settings

```bash
# Simulated delay range (makes mocks feel realistic)
MOCK_DELAY_MIN_MS=500                   # Minimum delay in milliseconds
MOCK_DELAY_MAX_MS=2000                  # Maximum delay in milliseconds

# Response capture (for creating new mocks)
MOCK_CAPTURE_RESPONSES=false            # Set to true to capture real responses
MOCK_CAPTURE_DIR=./logs/captured-responses  # Where captured responses are saved
```

---

## Testing Recommendations

### Unit Tests
```bash
# Mock everything for fast, isolated tests
MOCK_ALL_AI_TOOLS=MOCK
```

### Integration Tests
```bash
# Mock Gemini only to avoid quota, keep Claude/Tavily real
MOCK_ALL_AI_TOOLS=PER_TOGGLE
MOCK_CONTENT_WRITING_TOOLS=MOCK
MOCK_AI_SERVICE=API
MOCK_RESEARCH_TOOLS=API
```

### E2E Tests
```bash
# Use all real APIs for production-like testing
MOCK_ALL_AI_TOOLS=API
# Ensure all API keys are configured
```

---

## Verification

### Check Mock Status

The backend logs mock configuration on startup:

```bash
npm run dev:backend
```

Look for:
```
[MockService] Initialized {
  masterToggle: 'PER_TOGGLE',
  aiService: 'API',
  researchTools: 'API',
  skeletonTools: 'API',
  contentWritingTools: 'MOCK',  ← Should show MOCK
  humanityCheckTools: 'API',
  topicsResearchTools: 'API',
  captureEnabled: false
}
```

### Test Mock Content

Create a social post and verify:
1. Content generates quickly (~500-2000ms)
2. No Gemini API errors
3. Content matches tone (try all 8 tones!)
4. Backend logs show: `[MockService] Returning mock response`

---

## Troubleshooting

### Mock Not Working

**Issue:** Still hitting Gemini API despite `MOCK_CONTENT_WRITING_TOOLS=MOCK`

**Solution:**
1. Verify `MOCK_ALL_AI_TOOLS=PER_TOGGLE` (not `API`)
2. Restart backend server (env changes require restart)
3. Check backend logs for mock initialization

---

### Missing Mock File

**Issue:** Error: `Mock data file not found`

**Solution:**
1. Verify file exists in correct directory:
   ```bash
   ls backend/src/services/ai/mocks/data/contentWritingTools/
   ```
2. Check filename format: `toolName.variant.json`
3. Use correct variant name (e.g., `professional`, not `Professional`)

---

### Mock Returns Wrong Data

**Issue:** Mock response doesn't match expected format

**Solution:**
1. Check mock JSON file structure matches expected response type
2. Verify dynamic variables are replaced (check logs for missing context)
3. Clear mock cache: restart backend server

---

## Examples

### Example 1: Development with Gemini Quota Issues

```bash
# backend/.env
MOCK_ALL_AI_TOOLS=PER_TOGGLE
MOCK_CONTENT_WRITING_TOOLS=MOCK
TAVILY_API_KEY=your_real_tavily_key
# GOOGLE_GENERATIVE_AI_API_KEY not needed
```

**Result:** Real research and chat, mock content writing

---

### Example 2: Frontend-Only Development

```bash
# backend/.env
MOCK_ALL_AI_TOOLS=MOCK
# No API keys needed
```

**Result:** All AI services mocked, fast development

---

### Example 3: Production Deployment

```bash
# backend/.env (Railway)
MOCK_ALL_AI_TOOLS=API
TAVILY_API_KEY=your_production_key
GOOGLE_GENERATIVE_AI_API_KEY=your_production_key
```

**Result:** All real APIs, production quality

---

## Summary

**Quick Start for Gemini Quota Issues:**

1. Copy `.env.mock-example` to `.env`
2. Set `MOCK_ALL_AI_TOOLS=PER_TOGGLE`
3. Set `MOCK_CONTENT_WRITING_TOOLS=MOCK`
4. Restart backend
5. Create content with any of 8 tones - no quota limits!

**All 8 tones fully mocked and ready to use! 🎉**
