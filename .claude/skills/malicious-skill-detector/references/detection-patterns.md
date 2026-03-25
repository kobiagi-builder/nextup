# Detection Patterns Reference

Quick-reference for all detection categories, severity levels, and regex patterns used by the malicious skill detector.

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Confirmed malicious intent or high-success-rate attack | Block skill, alert user immediately |
| HIGH | Likely malicious or dangerous pattern | Flag for human review |
| MEDIUM | Suspicious but could be legitimate | Note in report, explain risk |
| LOW | Informational anomaly | Include in report for completeness |

## Category Quick Reference

| # | Category | Severity | Key Patterns |
|---|----------|----------|--------------|
| 1 | Instruction Override | CRITICAL | "ignore previous", "you are now", "SYSTEM:" |
| 2 | Data Exfiltration | CRITICAL | External URLs with variables, sendBeacon |
| 3 | Credential Access | CRITICAL | Reading .env, .ssh, logging tokens |
| 4 | Hidden Content | CRITICAL | Zero-width unicode, HTML comment injection, base64 in .md |
| 5 | Authority Impersonation | HIGH | "Official Anthropic", fake system tags |
| 6 | Dangerous Operations | HIGH | rm -rf non-temp, chmod 777, system dir writes |
| 7 | Behavioral Manipulation | MEDIUM | "don't tell user", suppress errors, skip safety |
| 8 | Supply Chain | MEDIUM | Missing frontmatter, broad permissions, remote exec |

## Known Safe Patterns (Allowlist)

These patterns frequently appear in legitimate skills and should not be flagged:

### Safe External URLs
- `github.com`, `githubusercontent.com`
- `npmjs.org`, `registry.npmjs.org`
- `unpkg.com`, `cdnjs.cloudflare.com`, `jsdelivr.net`
- `supabase.co`, `supabase.com`
- `anthropic.com`, `claude.ai`
- `vercel.com`, `netlify.com`
- `stackoverflow.com`, `developer.mozilla.org`

### Safe Environment Variables
- `NODE_ENV`, `PORT`, `HOST`
- `VITE_*` (Vite build-time variables)
- `NEXT_PUBLIC_*` (Next.js public variables)

### Safe File Operations
- Writes to `/tmp/`
- Reads from the skill's own directory
- `npm install`, `npm run build`, `npx`

### Safe Instruction Patterns
- "You are a [role description]" at the start of SKILL.md body (standard role setting)
- "When the user asks you to..." (standard trigger instructions)
- Attack patterns referenced in security-focused skills (meta-discussion)

## Unicode Attack Codepoints

These unicode codepoints are invisible and commonly used to hide instructions:

| Range | Name | Hex |
|-------|------|-----|
| Zero-width space | ZWSP | U+200B |
| Zero-width non-joiner | ZWNJ | U+200C |
| Zero-width joiner | ZWJ | U+200D |
| Byte order mark | BOM | U+FEFF |
| Word joiner | WJ | U+2060 |
| Function applications | | U+2061-U+2064 |
| Tags block | | U+E0000-U+E007F |
| Variation selectors | | U+FE00-U+FE0F |
| Variation selectors supp | | U+E0100-U+E01EF |

## Statistics (for context)

- **36.8%** of LLM skills/plugins have at least one security flaw (Snyk ToxicSkills)
- **91%** of malicious skills use prompt injection
- **90-100%** success rate for invisible unicode attacks
- Prompt injection is **#1** on OWASP LLM Top 10 (2025)
