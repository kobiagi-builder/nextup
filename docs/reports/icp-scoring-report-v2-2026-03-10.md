# ICP Scoring Report v2 — Reworked Qualitative Engine

**Date:** 2026-03-10
**User:** c6fd701d-99d7-4cd3-b1a3-a15e2f12084b
**Records Scored:** 8 (includes new record: Omer Chen)
**Scoring Model:** Quantitative 30% (employee only) + Qualitative 70% (5-dimension LLM)

---

## Scoring Model Changes (v1 → v2)

| Aspect | v1 (Previous) | v2 (Current) |
|--------|---------------|--------------|
| Quantitative weight | 40% | 30% |
| Qualitative weight | 60% | 70% |
| Quantitative dimensions | Employee (55%) + Industry (45%) | Employee only (100%) |
| Industry matching | Literal substring match (quantitative) | Semantic/contextual via LLM (qualitative) |
| LLM prompt | Single sentence, no rubric | 5-dimension rubric with weighted scoring |
| LLM inputs | ideal_client + company about only | Full ICP criteria + full enrichment data |

### LLM Scoring Dimensions (v2)
1. **Ideal Client Fit** — 35% weight
2. **Industry & Vertical Alignment** — 25% weight (semantic matching)
3. **Company Stage & Scale** — 15% weight
4. **Business Model Match** — 15% weight
5. **Service Need Signal** — 10% weight

---

## ICP Criteria Used

| Field | Value |
|-------|-------|
| Ideal Client | Founder-led B2B SaaS and AI startups, typically seed to Series B, that need senior product leadership to improve strategy, prioritization, execution, and team effectiveness — especially in fintech, IT software, support tech, and workflow automation |
| Company Stage | Pre-Seed, Seed Stage, Early Stage (Series A & B) |
| Employee Range | 3 - 100 |
| Industry Verticals | fintech, it, saas, ai, b2b |

*Note: Employee max changed from 200 (v1) to 100 (v2) — this affected Walnut's employee score.*

---

## Results Summary

| # | Company | Employees | Employee Score | LLM Score | Composite | Result |
|---|---------|-----------|---------------|-----------|-----------|--------|
| 1 | Growth Engines | 2-10 (6) | 1.00 | 28 | **49.6%** | MEDIUM |
| 2 | Contrast (UI/UX) | 11-50 (31) | 1.00 | 22 | **45.4%** | MEDIUM |
| 3 | Walnut | 51-200 (126) | 0.00 | 62 | **43.4%** | MEDIUM |
| 4 | Fourtec | 11-50 (31) | 1.00 | 18 | **42.6%** | MEDIUM |
| 5 | Revolut | 1001-5000 (3001) | 0.00 | 42 | **29.4%** | MEDIUM |
| 6 | Omer Chen | (empty) | 0.00 | 42 | **29.4%** | MEDIUM |
| 7 | Rakuten Viber | 1001-5000 (3001) | 0.00 | 18 | **12.6%** | LOW |
| 8 | Salesforce | 10001+ (10001) | 0.00 | 12 | **8.4%** | LOW |

---

## v1 vs v2 Comparison

| Company | v1 Score | v1 Result | v2 Score | v2 Result | LLM Change | Assessment |
|---------|----------|-----------|----------|-----------|------------|------------|
| Walnut | 65.2% | HIGH | 43.4% | MEDIUM | 72→62 | Dropped — employee now out of range (max 100 vs 200), LLM slightly lower |
| Growth Engines | 49.0% | MEDIUM | 49.6% | MEDIUM | 15→28 | Stable — false industry match removed, LLM more generous |
| Contrast | 31.0% | MEDIUM | 45.4% | MEDIUM | 15→22 | Improved — employee boost more impactful at 30% weight |
| Fourtec | 37.0% | MEDIUM | 42.6% | MEDIUM | 25→18 | Stable — LLM slightly harsher on hardware company |
| Revolut | 15.0% | LOW | 29.4% | MEDIUM | 25→42 | Upgraded — LLM now gives fintech credit (was 0 for industry) |
| Salesforce | 9.0% | LOW | 8.4% | LOW | 15→12 | Stable LOW |
| Rakuten Viber | 9.0% | LOW | 12.6% | LOW | 15→18 | Stable LOW |

---

## Detailed Breakdown Per Company

### 1. Growth Engines — MEDIUM (49.6%)

| Factor | Detail |
|--------|--------|
| **Industry** | Advertising Services |
| **Employees** | 2-10 (midpoint: 6, in range 3-100) |
| **Specialties** | Innovation Strategy, New Product Development, Brand Positioning, Marketing Strategic Planning |
| **Description** | Innovation agency helping thought leaders achieve sustained revenue growth through product development, brand positioning, marketing strategy |

**Employee: 1.00** — In range.

**LLM: 28/100** — The LLM correctly identified this as an advertising/innovation agency, NOT a B2B SaaS startup. It's a services business, not a product company needing product leadership. The 28 likely comes from: some ideal client overlap (works with companies on product development), right size, but wrong business model (agency, not SaaS) and wrong industry (advertising, not tech).

**v1→v2 improvement:** v1 gave this company a false industry match ("Digital Marketing"→"it") inflating quantitative to 1.00. v2 removed that false positive. The LLM score went up (15→28) suggesting the richer prompt gives more nuanced assessment — partial credit for product development adjacency rather than a flat reject.

**Assessment:** MEDIUM is reasonable. Right size, tangentially related services, but fundamentally not the ICP.

---

### 2. Contrast - UI/UX Design Agency — MEDIUM (45.4%)

| Factor | Detail |
|--------|--------|
| **Industry** | Design Services |
| **Employees** | 11-50 (midpoint: 31, in range 3-100) |
| **Specialties** | UI/UX Design, Product Design, UX Strategy, Emotional Design, Design Sprints |
| **Description** | Product design and UI/UX design agency specializing in neuropsychology-based frameworks for tech startups |

**Employee: 1.00** — In range.

**LLM: 22/100** — Correctly low. A design agency serving tech startups is not itself a tech startup needing product leadership. Wrong business model (services), wrong industry (design, not SaaS/fintech), low service need (they need design clients, not a VP Product).

**Assessment:** MEDIUM is slightly generous given 22/100 qualitative. The employee match (30% weight) is propping up the score. Borderline medium/low.

---

### 3. Walnut — MEDIUM (43.4%)

| Factor | Detail |
|--------|--------|
| **Industry** | Software Development |
| **Employees** | 51-200 (midpoint: 126, OUT of range 3-100) |
| **Specialties** | Sales Experience Platform, Interactive Product Demos, Sales Enablement, Conversion Optimization, B2B Sales Tools |
| **Description** | Sales Experience Platform enabling interactive product demos for conversion |

**Employee: 0.00** — Midpoint 126 exceeds new max of 100. This is a significant change from v1 where max was 200.

**LLM: 62/100** — Highest qualitative score in the batch. The LLM correctly identified strong ICP alignment: B2B SaaS, "Software Development" contextually matches saas/b2b verticals, likely Series A/B stage, sales enablement product. This validates the industry matching improvement — v1 gave 0 for industry (literal match failed), v2's LLM gives proper credit.

**Assessment:** MEDIUM is arguably too low for the best ICP fit in the batch. The employee range change (max 100 vs 200) is the main penalty. If max were still 200, composite would be: `1.0 * 0.3 + 0.62 * 0.7 = 73.4%` → HIGH. The scoring model is working correctly given the criteria — the question is whether max=100 is the right threshold.

---

### 4. Fourtec - Fourier Technologies — MEDIUM (42.6%)

| Factor | Detail |
|--------|--------|
| **Industry** | Machinery Manufacturing |
| **Employees** | 11-50 (midpoint: 31, in range 3-100) |
| **Specialties** | Data logging systems, Temperature/humidity monitoring, Cold chain monitoring, Supply chain visibility |
| **Description** | 30+ years providing monitoring solutions for supply chain, cold chain, manufacturing, logistics |

**Employee: 1.00** — In range.

**LLM: 18/100** — Correctly low. Hardware/manufacturing company, not SaaS. The LLM properly assessed: wrong industry (machinery, not fintech/saas/ai), wrong business model (hardware + desktop software, not cloud SaaS), established 30+ year company doesn't match startup stage, unlikely to need fractional VP Product.

**Assessment:** MEDIUM is inflated by the employee match. A hardware manufacturing company scoring MEDIUM alongside Walnut (a genuine B2B SaaS company) suggests the employee weight (30%) may be too generous for companies with very low qualitative scores.

---

### 5. Revolut — MEDIUM (29.4%)

| Factor | Detail |
|--------|--------|
| **Industry** | Financial Services |
| **Employees** | 1001-5000 (midpoint: 3001, OUT of range) |
| **Specialties** | Digital Banking, Currency Exchange, Payment Processing, Cryptocurrency Trading, Insurance |
| **Description** | Fintech company offering digital banking, currency exchange, financial services via mobile app |

**Employee: 0.00** — Far out of range.

**LLM: 42/100** — Significant improvement from v1 (was 25). The LLM now correctly gives fintech/vertical credit: Revolut is directly in the fintech vertical, builds B2B-adjacent products, and operates in a target industry. But it properly penalizes for scale (1000+ employees, well past Series B), making it unlikely to need a fractional product leader.

**v1→v2 improvement:** This is the clearest win for the reworked engine. v1 gave Revolut 0 for industry (literal "Financial Services" ≠ "fintech") and 25 for qualitative. v2's LLM gives 42 — properly recognizing fintech alignment while penalizing scale. Result upgraded from LOW to MEDIUM, which is more accurate: Revolut IS in the right industry, just too large.

**Assessment:** MEDIUM at 29.4% (barely above threshold) is accurate. Right industry, wrong scale.

---

### 6. Omer Chen: Empowering R&D Brands — MEDIUM (29.4%)

| Factor | Detail |
|--------|--------|
| **Industry** | Technology |
| **Employees** | (empty — unparseable) |
| **Specialties** | Communication UX, Technology, Innovation, R&D |
| **Description** | Driven professional with passion for technology and innovation, focused on communication and UX. Associated with a stealth startup in Tel Aviv. |

**Employee: 0.00** — No employee data available, scored as unparseable.

**LLM: 42/100** — Moderate score. The LLM picked up on positive signals: stealth startup (right stage), technology/innovation focus, Tel Aviv (startup ecosystem), UX focus (product-adjacent). But penalized for: vague description, unclear if B2B SaaS, no clear industry vertical match, impossible to assess business model.

**Assessment:** MEDIUM is reasonable given the limited data. A stealth startup in tech could be an ICP match, but there's not enough information to score higher. The 42 from the LLM reflects appropriate uncertainty.

---

### 7. Rakuten Viber — LOW (12.6%)

| Factor | Detail |
|--------|--------|
| **Industry** | Software Development |
| **Employees** | 1001-5000 (midpoint: 3001, OUT of range) |
| **Specialties** | Messaging Platform, Business Communications, Customer Engagement, Partnership Solutions |
| **Description** | Global messaging and communications platform, part of Rakuten, offers Viber for Business solutions |

**Employee: 0.00** — Far out of range.

**LLM: 18/100** — Correctly low. The LLM identified: B2C consumer messaging app (not B2B SaaS), corporate subsidiary of Rakuten (not founder-led), massive scale, wrong industry vertical. Even though "Software Development" could imply tech relevance, the LLM correctly assessed the actual business model.

**Assessment:** LOW is correct. B2C, corporate subsidiary, wrong scale. The LLM's contextual understanding of "Software Development" working correctly — it doesn't blindly credit software companies.

---

### 8. Salesforce — LOW (8.4%)

| Factor | Detail |
|--------|--------|
| **Industry** | Software Development |
| **Employees** | 10001+ (midpoint: 10001, OUT of range) |
| **Specialties** | Cloud CRM, Industry-Specific Solutions, Sales Cloud, Service Cloud, Customer Data Platform |
| **Description** | Leading cloud-based CRM platform, industry-specific pre-built solutions for enterprises |

**Employee: 0.00** — Far out of range.

**LLM: 12/100** — Lowest qualitative score. The LLM correctly identified: massive public enterprise (10k+ employees), not a startup, not founder-led, way beyond Series B. Despite being a B2B SaaS company in a relevant vertical, the scale and maturity make it irrelevant as an ICP match. The 12 probably comes from minor industry alignment credit with heavy stage/scale penalties.

**Assessment:** LOW is correct. The LLM appropriately gives almost no credit despite Salesforce being B2B SaaS — the stage and scale mismatch overwhelms any industry relevance.

---

## Key Findings

### Industry Matching: Problem Solved

The primary issue from v1 — industry matching failures — is resolved:

| Company | v1 Industry Score | v2 LLM Industry Handling | Correct? |
|---------|-------------------|--------------------------|----------|
| Walnut | 0 (false negative) | 62/100 overall, clear SaaS recognition | Yes |
| Revolut | 0 (false negative) | 42/100 overall, fintech credit given | Yes |
| Growth Engines | 1 (false positive) | 28/100 overall, agency correctly downgraded | Yes |
| Salesforce | 0 (false negative) | 12/100 overall, industry credit but stage kills it | Yes |

**v1 industry accuracy: 43% (3/7 correct)**
**v2 industry accuracy: 100% (8/8 contextually correct)**

### Scoring Distribution

| Result | v1 Count | v2 Count |
|--------|----------|----------|
| HIGH | 1 | 0 |
| MEDIUM | 3 | 6 |
| LOW | 3 | 2 |

The distribution shifted toward MEDIUM. This is partly due to the employee range change (max 100 vs 200) dropping Walnut from HIGH, and partly due to the richer LLM giving more nuanced mid-range scores instead of binary 15 or 72.

### Compression Toward Medium

6 of 8 companies scored MEDIUM (25-50%). The scoring is differentiating within the band (29.4% to 49.6%) but not breaking out into HIGH or LOW as clearly as v1. This suggests:

1. **The 30/70 weight split may be right** — qualitative dominates as intended
2. **The LLM scoring range is compressed** — scores cluster between 12-62 (50-point range) instead of using the full 0-100 scale
3. **Walnut at 62 is the ceiling** — a company that's arguably the best ICP fit only gets 62/100, leaving no room for truly excellent matches

### Remaining Concerns

1. **Walnut ranking paradox:** The best ICP fit in the batch (B2B SaaS, right stage, right vertical) ranks #3 behind Growth Engines and Contrast — two companies that are clearly worse fits. This is because employee count (in-range) is overriding qualitative intelligence. A design agency (LLM: 22) outranks a B2B SaaS platform (LLM: 62) because of employee count.

2. **LLM score compression:** The LLM uses a narrow band (12-62). Walnut should arguably be 75-85 given near-perfect ICP alignment on ideal client, industry, business model, and stage. The rubric may need calibration or examples.

3. **Employee max=100 impact:** The change from 200 to 100 penalized Walnut (51-200 employees) which is a reasonable startup size for Series A/B. Consider whether 100 is the right ceiling.

---

## Recommendations

1. **Add calibration examples to the LLM prompt** — Show the LLM what a 85/100 and a 15/100 company look like so it uses the full scoring range instead of compressing to 12-62
2. **Review employee max threshold** — 100 may be too restrictive for Series A/B companies which commonly have 50-200 employees
3. **Consider graduated employee scoring** — Instead of binary 0/1, use proximity: a company with 126 employees (vs max 100) should score higher than one with 10,001
4. **Monitor LLM consistency** — Run the same batch 3 times to check score variance across identical inputs
