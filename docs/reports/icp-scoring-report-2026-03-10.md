# ICP Scoring Report

**Date:** 2026-03-10
**User:** c6fd701d-99d7-4cd3-b1a3-a15e2f12084b
**Records Scored:** 7
**Scoring Model:** Quantitative (40%) + Qualitative LLM (60%)

---

## ICP Criteria Used

| Field | Value |
|-------|-------|
| Ideal Client | Founder-led B2B SaaS and AI startups, typically seed to Series B, that need senior product leadership to improve strategy, prioritization, execution, and team effectiveness — especially in fintech, IT software, support tech, and workflow automation |
| Company Stage | Pre-Seed, Seed Stage, Early Stage (Series A & B) |
| Employee Range | 3 - 200 |
| Industry Verticals | fintech, it, saas, ai, b2b |

---

## Scoring Formula

```
Composite = (Quantitative * 0.4) + (Qualitative * 0.6)

Quantitative = (Employee Score * 0.55) + (Industry Score * 0.45)
  - Employee: 1.0 if midpoint in target range, 0.0 otherwise
  - Industry: 1.0 if enrichment industry matches a target vertical, 0.0 otherwise

Qualitative = LLM score (0-100) normalized to 0-1
  - Claude Haiku evaluates overall ICP fit based on company description vs. ideal client

Thresholds: very_high >= 75 | high >= 50 | medium >= 25 | low < 25
```

---

## Results Summary

| # | Company | Employee | Industry | Quant | Qual | Composite | Result |
|---|---------|----------|----------|-------|------|-----------|--------|
| 1 | Walnut | 1.00 | 0.00 | 0.55 | 0.72 | **65.2%** | **HIGH** |
| 2 | Growth Engines | 1.00 | 1.00 | 1.00 | 0.15 | **49.0%** | MEDIUM |
| 3 | Fourtec | 1.00 | 0.00 | 0.55 | 0.25 | **37.0%** | MEDIUM |
| 4 | Contrast (UI/UX) | 1.00 | 0.00 | 0.55 | 0.15 | **31.0%** | MEDIUM |
| 5 | Revolut | 0.00 | 0.00 | 0.00 | 0.25 | **15.0%** | LOW |
| 6 | Salesforce | 0.00 | 0.00 | 0.00 | 0.15 | **9.0%** | LOW |
| 7 | Rakuten Viber | 0.00 | 0.00 | 0.00 | 0.15 | **9.0%** | LOW |

---

## Detailed Breakdown Per Company

### 1. Walnut - HIGH (65.2%)

| Factor | Detail |
|--------|--------|
| **Industry** | Software Development |
| **Employees** | 51-200 (midpoint: 126) |
| **Description** | Sales Experience Platform enabling interactive product demos for conversion |

**Employee Score: 1.00** - Midpoint 126 is within target range 3-200.

**Industry Score: 0.00** - "Software Development" did not match any target vertical (fintech, it, saas, ai, b2b). This is a false negative - Walnut is clearly a B2B SaaS company, but the enrichment industry label "Software Development" doesn't literally match "saas" or "b2b".

**Qualitative Score: 0.72** - LLM correctly identified strong ICP fit: B2B SaaS startup, sales enablement platform, likely Series A/B stage, product-led growth company in the right employee range. This is the highest qualitative score in the batch.

**Assessment:** Correctly ranked highest overall. The qualitative score compensated for the industry matching gap. This is exactly the type of company the ICP describes.

---

### 2. Growth Engines - MEDIUM (49.0%)

| Factor | Detail |
|--------|--------|
| **Industry** | Digital Marketing |
| **Employees** | 11-50 (midpoint: 31) |
| **Description** | AI-native digital marketing agency, growth strategy, 16+ years expertise |

**Employee Score: 1.00** - Midpoint 31 is within target range 3-200.

**Industry Score: 1.00** - "Digital Marketing" matched target vertical "it". This is a false positive - the fuzzy matching incorrectly equated a marketing agency with "IT". Digital marketing is not IT/software.

**Qualitative Score: 0.15** - LLM correctly identified this as a poor ICP fit: it's a marketing agency, not a SaaS/AI startup needing product leadership. Not founder-led tech, not building software products.

**Assessment:** The quantitative score is inflated by the false industry match, but the low qualitative score (0.15) pulled the composite down to medium. The LLM acted as a good corrective here. Final result is reasonable but arguably should be LOW.

---

### 3. Fourtec - Fourier Technologies - MEDIUM (37.0%)

| Factor | Detail |
|--------|--------|
| **Industry** | Machinery Manufacturing |
| **Employees** | 11-50 (midpoint: 31) |
| **Description** | Data logging and monitoring solutions, 30+ years, cold chain/supply chain/industrial |

**Employee Score: 1.00** - Midpoint 31 is within target range 3-200.

**Industry Score: 0.00** - "Machinery Manufacturing" correctly did not match any target vertical. This is accurate - the company is hardware/industrial, not SaaS/fintech/AI.

**Qualitative Score: 0.25** - LLM gave a borderline score. The company does have some software components (monitoring software, data logging SaaS-like offerings) and is the right size, but it's fundamentally a hardware/manufacturing company, not a B2B SaaS startup.

**Assessment:** Medium is reasonable. Right size but wrong industry and business model.

---

### 4. Contrast - UI/UX Design Agency - MEDIUM (31.0%)

| Factor | Detail |
|--------|--------|
| **Industry** | Design Services |
| **Employees** | 11-50 (midpoint: 31) |
| **Description** | Performance UI/UX design agency, emotional UX frameworks, digital experiences for tech companies |

**Employee Score: 1.00** - Midpoint 31 is within target range 3-200.

**Industry Score: 0.00** - "Design Services" correctly did not match any target vertical. This is a services agency, not a SaaS/tech product company.

**Qualitative Score: 0.15** - LLM correctly identified poor fit: this is a design agency (services business), not a SaaS/AI startup building a product. They don't need fractional VP Product - they need design clients.

**Assessment:** Medium is slightly generous. Right employee count but fundamentally wrong business type. Borderline medium/low.

---

### 5. Revolut - LOW (15.0%)

| Factor | Detail |
|--------|--------|
| **Industry** | Financial Services |
| **Employees** | 1001-5000 (midpoint: 3,001) |
| **Description** | Fintech digital banking, money transfers, crypto trading, payment solutions |

**Employee Score: 0.00** - Midpoint 3,001 far exceeds target max of 200. Correct.

**Industry Score: 0.00** - "Financial Services" did not match "fintech". This is a notable false negative - Revolut is one of the world's most prominent fintech companies, but the enrichment label "Financial Services" doesn't literally match the target vertical "fintech".

**Qualitative Score: 0.25** - LLM gave some credit for fintech relevance but correctly penalized for being a massive, late-stage company (well past Series B, thousands of employees). Not founder-led in the target sense.

**Assessment:** LOW is correct. Despite being fintech, Revolut is far too large and mature for the ICP. The scoring got the right answer despite the industry matching miss.

---

### 6. Salesforce - LOW (9.0%)

| Factor | Detail |
|--------|--------|
| **Industry** | Software Development |
| **Employees** | 10001+ (midpoint: 10,001) |
| **Description** | #1 AI CRM platform, Customer 360, sales management, cloud computing |

**Employee Score: 0.00** - Midpoint 10,001 far exceeds target max of 200. Correct.

**Industry Score: 0.00** - "Software Development" did not match target verticals. Same pattern as Walnut - the generic enrichment label misses the actual business category (B2B SaaS, CRM, AI).

**Qualitative Score: 0.15** - LLM correctly identified poor fit: massive public company, not a startup, not founder-led in the relevant sense, far beyond Series B.

**Assessment:** LOW is correct. Enterprise-scale public company, completely outside ICP regardless of relevant technology space.

---

### 7. Rakuten Viber - LOW (9.0%)

| Factor | Detail |
|--------|--------|
| **Industry** | Software Development |
| **Employees** | 201-500 (midpoint: 351) |
| **Description** | Global messaging and calling app, part of Rakuten Inc., consumer-focused communication |

**Employee Score: 0.00** - Midpoint 351 exceeds target max of 200. Correct.

**Industry Score: 0.00** - "Software Development" did not match target verticals. Correct in spirit - Viber is a B2C consumer app, not B2B SaaS.

**Qualitative Score: 0.15** - LLM correctly identified poor fit: consumer-facing product (B2C, not B2B), subsidiary of a large corporation (Rakuten), not a startup, messaging app not in target industries.

**Assessment:** LOW is correct. B2C consumer app, corporate subsidiary, wrong size and business model.

---

## Key Findings

### Scoring Accuracy

| Aspect | Assessment |
|--------|------------|
| **Overall ranking order** | Correct - Walnut (best fit) ranked #1, enterprise companies ranked lowest |
| **Threshold assignments** | Reasonable - no major misclassifications |
| **Qualitative-quantitative balance** | Working well - LLM corrected false positives (Growth Engines) and boosted genuine fits (Walnut) |

### Industry Matching Issues

The industry matching has a systemic problem: **LinkedIn enrichment industry labels are too generic** to match specific target verticals.

| Company | Enrichment Industry | Actual Category | Target Match | Result |
|---------|-------------------|-----------------|--------------|--------|
| Walnut | Software Development | B2B SaaS | None | **False Negative** |
| Revolut | Financial Services | Fintech | None | **False Negative** |
| Salesforce | Software Development | B2B SaaS/CRM | None | **False Negative** |
| Growth Engines | Digital Marketing | Marketing Agency | "it" | **False Positive** |

**Impact:** 3 false negatives and 1 false positive out of 7 records (57% error rate on industry matching).

**Root Cause:** The matching compares the enrichment `industry` field (e.g., "Software Development") against target verticals (e.g., "saas", "b2b"). These are different taxonomies. LinkedIn uses broad industry categories while user-defined verticals are more specific/colloquial.

**Recommendation:** Consider fuzzy/semantic matching for industry, or match against `specialties` array in addition to the `industry` field. For example, Walnut's specialties include "Sales Enablement" and "Business Productivity Software" which are clearly B2B SaaS signals.

### Employee Scoring

Employee scoring is working correctly as a binary in-range/out-of-range check. All 7 records were scored accurately:
- 4 companies in range (11-50, 51-200) → score 1.0
- 3 companies out of range (201-500, 1001-5000, 10001+) → score 0.0

**Consideration:** The binary scoring could be improved with graduated proximity scoring. Rakuten Viber (201-500, midpoint 351) is much closer to the target range than Salesforce (10001+), but both receive 0.0.

### LLM Qualitative Assessment

The LLM qualitative scoring performed well as a discriminator:
- **Walnut (0.72):** Correctly identified as strong ICP fit - B2B SaaS, right stage, product-focused
- **Growth Engines (0.15):** Correctly identified as poor fit despite right size - services agency, not a product company
- **Revolut (0.25):** Gave partial credit for fintech relevance but correctly penalized for scale
- **All large enterprises (0.15):** Correctly scored low regardless of industry relevance

The 60% qualitative weight is justified - the LLM is currently the most reliable discriminator, especially given industry matching limitations.

---

## Recommendations

1. **Improve industry matching** - Use semantic/fuzzy matching or incorporate `specialties` array for better vertical detection
2. **Consider graduated employee scoring** - Proximity-based scoring instead of binary in/out would better differentiate near-misses from far-misses
3. **Add company stage signal** - None of the scored companies had stage data factored in despite it being an ICP criterion
4. **Review "Digital Marketing" → "it" match** - The fuzzy matching that equated these is producing false positives
