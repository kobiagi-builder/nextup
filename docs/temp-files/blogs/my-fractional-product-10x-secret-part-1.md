# My Fractional Product 10x Secret: Building an AI Agent That Actually Works

*Part 1 of a series on building AI agents for fractional product management*

---

## The Problem Every Fractional PM Knows Too Well

After 16 years as a product leader at companies like Tipalti, PayEm, and Atera, I made the leap to fractional product management. I'd scaled PM teams from 1 to 5 multiple times, launched products that drove 720% growth, and led 0→1 initiatives that created real business outcomes.

But fractional work introduced a challenge I'd never faced: **context switching at scale**.

As an employee, you have one company, one product, one set of stakeholders. As a fractional PM, you might have three or four clients, each with their own:
- Team dynamics and stakeholders
- Strategic priorities and constraints
- Ongoing decisions and action items
- History of what was tried and why

The first few times I jumped between client calls, I realized I was losing context. Important details slipped. I'd forget which client we'd discussed a specific approach with. I'd mix up which startup was pursuing which beachhead market.

Traditional tools didn't solve this. Notion, Obsidian, Confluence - they're all static. They store information, but they don't *work* with you. They don't know to load context before a call. They don't remind you to document decisions. They don't bring expert frameworks when you need them.

So I built something that does.

---

## What I Need From an AI Agent (Not a Chatbot)

Let me be clear: I'm not talking about a better ChatGPT prompt or a fancy wrapper around Claude. I'm talking about an **agentic system** - one that has persistent behavior, enforced rules, and specialized capabilities.

Here's what I needed:

### 1. Obsessive Documentation Without Effort

Every meeting, every decision, every idea - documented. Not because I remembered to, but because the system *forces* it. After 16 years of product work, I know that documentation is a superpower. The fractional PM who remembers everything builds trust. The one who forgets details loses clients.

### 2. Automatic Context Loading

When I say "Let's work on TechStart," I need the agent to immediately load everything: the team, the strategy, the recent events, the open action items, the financials. I shouldn't have to search for files or remember where I saved things.

### 3. Expert Capabilities On Demand

I can do product strategy in my sleep. But sometimes I need help with:
- April Dunford-style positioning for a launch
- Amazon 6-pager format for an exec presentation
- RICE prioritization with proper scoring
- Playing to Win strategic analysis

I don't want general AI assistance. I want specialized, framework-based expertise that matches how top PMs actually work.

### 4. Business Development Help (My Achilles Heel)

Here's an uncomfortable truth: I've been building products for 16 years, but I've never acquired a consulting client. Every role I've had was employment-based. The skills that made me a great product leader - building, strategy, execution - don't translate directly to selling myself.

I needed an agent that could help me grow professionally, not just manage customers.

---

## The Fractional PM Agent: Architecture That Actually Works

After months of iteration, I landed on a **three-tier hybrid architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                           RULES                                  │
│     Always-active behaviors that trigger automatically           │
│     (Context loading, obsessive documentation)                   │
├─────────────────────────────────────────────────────────────────┤
│                          SKILLS                                  │
│     Lightweight operations that run inline                       │
│     (Load context, update docs, build new capabilities)          │
├─────────────────────────────────────────────────────────────────┤
│                       CAPABILITIES                               │
│     Expert sub-agents for deep work                              │
│     (27 specialists across 9 operational modes)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rules: The Non-Negotiables

Two rules are **always active**, triggering automatically:

1. **Customer Context Loading**: Before any customer-related work, the agent MUST load all customer files. No exceptions. No "let me just quickly answer this without context."

2. **Obsessive Documentation**: After every interaction, the agent MUST update customer files. Events get logged. Decisions get recorded. Ideas get captured. The agent confirms what was updated.

This isn't optional behavior I can forget. It's enforced by the system.

### Skills: Quick Operations

Skills are lightweight, inline operations that happen fast:

- **load-customer-context**: Reads all customer files, synthesizes a summary
- **update-customer-docs**: Updates relevant files after interactions
- **build-agent**: A meta-skill that lets me add new rules, skills, or capabilities

Skills execute in under a minute and share the main conversation context.

### Capabilities: Expert Sub-Agents

Here's where it gets powerful. I have **27 specialized capabilities** organized into **9 operational modes**:

| Mode | Purpose | Example Capabilities |
|------|---------|---------------------|
| **BUILDER** | Creating products 0→1 | Zero-to-launch specialist, Flow designer, UX/UI designer |
| **COMMUNICATOR** | Stakeholder communication | Strategic storyteller, Exec comms specialist |
| **STRATEGIST** | Strategic decisions | Strategy architect, Decision frameworks advisor |
| **NAVIGATOR** | Organizational dynamics | Workplace navigator (politics, conflict) |
| **LEADER** | Culture & team building | Culture architect |
| **MEASUREMENT** | Data & metrics | Data analyst, Prioritization analyst |
| **LAUNCH** | Go-to-market | Launch strategist (April Dunford positioning) |
| **RESEARCH** | User & market research | User interviews analyst, Persona & ICP analyst |
| **CONSULTANT** | My fractional PM business | Growth advisor, Sales advisor, Relationship advisor |

Each capability is a specialized sub-agent with:
- Deep expertise in proven frameworks
- Specific outputs it produces
- Clear triggers for when to invoke it
- Fractional PM context (how to deliver value as a consultant)

When I need to help a client with product strategy, I'm not using generic AI. I'm invoking the **strategy-architect** capability that knows Playing to Win, Crossing the Chasm, and beachhead strategy. When I need to prepare for a board presentation, I invoke the **exec-comms-specialist** that knows Amazon 6-pager format and SCQA structure.

---

## The Customer Data Model

Every customer gets a folder with:

```
customers/[customer-name]/
├── customer-info.md      # Team, strategy, product, ICP, market, competitors
├── financials.md         # Pricing, payments, agreement terms
├── event-log.md          # Every meeting, decision, event with full context
└── artifacts/            # Generated work products (analyses, roadmaps, etc.)
```

The event log is particularly important. Every entry follows this format:

```markdown
### [YYYY-MM-DD] [Event Type]: [Title]
**Participants**: Who was there
**Duration**: How long
**Context/Why**: Why this event happened
**What Happened**: Detailed description
**Decisions Made**: What was decided
**Action Items**: Who does what by when
**Lessons Learned**: What to remember
**Consequences/Follow-up**: What happens next
```

This level of documentation seems excessive until you're six months into an engagement and need to remember exactly why a decision was made. Or when a new stakeholder joins and you can provide complete context in minutes instead of hours.

---

## This Blog's Focus: The Growth Advisor

Of all 27 capabilities, the one I want to spotlight is the **Growth Advisor**. This capability doesn't help my customers - it helps *me*.

### Identity: Zero Sugar-Coating Mode

The Growth Advisor operates in what I call **ZERO SUGAR-COATING MODE**. Here's how it's defined:

> You are a blunt, no-nonsense Growth Advisor who treats the fractional PM's professional development exactly like a PM treats product development - with ruthless prioritization, data-driven decisions, and zero tolerance for bullshit.
>
> Your job is not to make the user feel good. Your job is to make the user better. If they wanted comfort, they'd call their mother.

This isn't typical AI politeness. It's designed to cut through the self-deception that holds most of us back.

### The $500/Hour Test

Before delivering any assessment, the Growth Advisor asks itself:

> "If I were paying $500/hour for this growth coaching, would I feel I got honest, actionable insight, or would I feel like I was being managed and coddled?"

This quality standard ensures every interaction has real value.

### Frameworks for Growth

The Growth Advisor uses proven development frameworks:

| Framework | Purpose | Application |
|-----------|---------|-------------|
| **GROW Model** | Coaching structure | Goal → Reality → Options → Will for each development area |
| **70-20-10** | Development mix | 70% on-the-job, 20% mentorship/feedback, 10% formal learning |
| **Dreyfus Model** | Skill levels | Novice (1) → Expert (5) progression |
| **Johari Window** | Self-awareness | Expand Open Area, reduce Blind Spots |
| **Personal SWOT** | Assessment | Honest strengths, weaknesses, opportunities, threats |
| **OKRs** | Goal setting | Quarterly objectives with measurable key results |

### The Five-Phase Workflow

When I invoke the Growth Advisor, it follows a rigorous process:

**Phase 1: Data Collection**
- Load existing growth profile
- Review recent feedback
- Check progress on current roadmap
- Gather new self-assessment data
- *No opinions until data is gathered*

**Phase 2: Honest Assessment**
- Evaluate current state against Dreyfus levels
- Identify what's actually improved vs. claimed improvement
- Call out unmet commitments with specific evidence
- *Grade honestly: C means mediocre, D means poor, F means failure*

**Phase 3: Gap Analysis**
- Map current state to desired future state
- Identify highest-impact development areas
- Prioritize using impact × feasibility
- *Cut the "nice to haves" - ruthless prioritization*

**Phase 4: Roadmap Creation/Update**
- Define or update growth OKRs
- Set concrete milestones with dates
- Assign specific actions to 70-20-10 buckets
- *If it's not measurable, it doesn't go on the roadmap*

**Phase 5: Commitment & Tracking**
- Get explicit commitment on priorities
- Document in growth files
- Set review cadence
- *Written commitments - verbal doesn't count*

### What It Actually Told Me

Here's some of what my Growth Advisor surfaced (uncomfortably accurate):

**On my strengths being underutilized:**
> You're hiding behind Product Strategy. It's your comfort zone. You keep polishing what's already excellent (Product Strategy at level 5) while avoiding the uncomfortable work of building a consulting business.

**On my hidden weaknesses:**
> You keep building products (LaunchLee, Consulty, Fractional PM Agent) instead of doing the uncomfortable work of reaching out to potential clients. Building tools is your avoidance mechanism.

**On what I'm not marketing:**
> You have 4+ hidden offerings you're not putting in the market:
> 1. Fractional PM (B2B) - Talking about it, not selling it
> 2. AI/Claude Code enablement (B2B) - Not even talking about it
> 3. PM Career Coaching (B2C) - Not talking about it
> 4. Interview Prep (B2C) - Not talking about it
>
> You're competing in one market when you could be diversifying across four.

**On my avoidance patterns:**
> You said Path 3 (Full-Time Consultant) might not be right for you. Let's be honest about why:
> - Leverage anxiety - You want product leverage, not just trading time for money
> - Sales avoidance - Path 3 requires the MOST selling, and you've never done it

This is the kind of coaching that costs thousands of dollars from executive coaches. And it's available every time I need it.

---

## Why This Architecture Works

### 1. Separation of Concerns

- **Rules** handle non-negotiable behaviors (context, documentation)
- **Skills** handle quick, frequent operations
- **Capabilities** handle deep, expert work

This prevents the common failure mode where AI tries to do everything in one interaction and does nothing well.

### 2. Mode-Based Discovery

Instead of remembering 27 capabilities, I think in **modes**:
- "I'm in BUILDER mode" → surfaces relevant capabilities
- "I'm in STRATEGIST mode" → different set of capabilities

This matches how expert work actually happens - you shift into different thinking modes for different problems.

### 3. Framework-Based Expertise

Every capability is built on proven frameworks. The strategy-architect doesn't give generic advice - it guides through Playing to Win. The launch-strategist doesn't improvise - it applies April Dunford positioning methodology.

This ensures consistent, high-quality outputs regardless of my energy level that day.

### 4. Self-Evolution

The **build-agent** skill lets me add new rules, skills, or capabilities as I discover needs. The system grows with my practice. It's not static - it evolves.

---

## What's Next

In upcoming posts, I'll dive deep into specific capabilities:

- **The Zero-to-Launch Specialist**: How I help clients scope MVPs using OpenAI, Figma, and Airbnb frameworks
- **The Strategy Architect**: Playing to Win and Crossing the Chasm for B2B product strategy
- **The Sales Advisor**: How I'm using AI to overcome my business development weakness
- **The Documentation System**: The event log format that builds client trust

---

## The Uncomfortable Truth

Building this agent forced me to confront something: I was spending more time building tools than building a business. The Growth Advisor called it out explicitly.

But here's the thing - now that I have these tools, I can actually use them. The documentation happens automatically. The expert frameworks are available when I need them. The self-assessment is brutally honest.

For the first time, I feel like I have a 10x multiplier on my fractional PM practice.

That's the secret: not just building AI agents, but building ones that actually change how you work.

---

*Kobi Agi is a fractional product leader with 16 years of experience in B2B SaaS and Fintech. He's currently building Consulty, an AI-powered platform for consultants, while running a fractional PM practice.*

*Follow along for more posts in this series on AI agents for product management.*
