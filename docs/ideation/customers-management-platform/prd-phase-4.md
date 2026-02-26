# PRD: Customers Management Platform - Phase 4

**Contract**: ./contract.md
**Phase**: 4 of 5
**Focus**: Customer Management Agent, Product Management Agent, chat integration, auto-routing

## Phase Overview

Phase 4 is the AI core of the Customers module. It introduces two specialized agents - the Customer Management Agent and the Product Management Agent - both accessible through a single chat panel per customer. The system auto-routes user messages to the appropriate agent based on intent detection. Both agents have full read/write access to all customer data (info, agreements, receivables, projects, artifacts).

This phase is sequenced fourth because it requires all customer data domains (Phases 1-3) to be functional. The agents need real data to be useful - they reference customer info when giving engagement advice, look at agreements when discussing pricing, check receivables when discussing financial health, and generate artifacts within projects.

After Phase 4, advisors can open a chat for any customer, ask questions or request work, and the appropriate agent responds with full customer context. The Customer Mgmt Agent helps with engagement, negotiation, and relationship management. The Product Mgmt Agent helps generate strategies, roadmaps, research, and other product deliverables.

The agent capabilities are modeled after the fractional PM agent's 27 capabilities across 9 operational modes, adapted for the NextUp chat interface.

## User Stories

1. As an advisor, I want to open a chat panel for a customer so that I can interact with AI agents about that customer.
2. As an advisor, I want to ask about engagement strategy and have the Customer Mgmt Agent respond with customer-context-aware advice.
3. As an advisor, I want to ask the Product Mgmt Agent to create a strategy document and have it generated as an artifact in a project.
4. As an advisor, I want the system to automatically route my message to the right agent (Customer Mgmt or Product Mgmt) so that I don't have to manually switch.
5. As an advisor, I want the agents to know my customer's full context (info, agreements, receivables, projects) so that responses are relevant and informed.
6. As an advisor, I want my chat history with each customer to persist so that I can reference past conversations.
7. As an advisor, I want the agents to be able to update customer data (status changes, info updates) through the chat so that I can manage customers conversationally.
8. As an advisor, I want the Product Mgmt Agent to generate different types of artifacts (strategy, research, roadmap, competitive analysis) based on my requests.

## Functional Requirements

### Chat Integration

- **FR-4.1**: Each customer detail page includes a chat panel (using the same `ChatPanel` component pattern as the Content Agent). The chat opens in the AppShell split-view layout.
- **FR-4.2**: Chat panel is accessible via a "Chat" button on the customer detail page header, consistent with how the Content Agent chat is triggered.
- **FR-4.3**: Chat context key uses `"customer:{customerId}"` pattern for per-customer conversation persistence.
- **FR-4.4**: Chat history persists per customer in the chatStore (sessionStorage) and optionally in the database for long-term persistence.
- **FR-4.5**: Screen context passed to backend includes: `currentPage: 'customer'`, `customerId`, `customerName`, `customerStatus`, `activeTab` (which tab the user is viewing).

### Auto-Routing

- **FR-4.6**: Backend implements intent detection to route messages to the appropriate agent. Routing rules:
  - **Customer Mgmt Agent**: Messages about engagement, relationships, communication, negotiation, pricing, status changes, follow-ups, customer health, sales pipeline, account management.
  - **Product Mgmt Agent**: Messages about strategy, roadmaps, research, product specs, user research, competitive analysis, prioritization, ideation, product metrics, artifact creation.
  - **Ambiguous**: Default to Customer Mgmt Agent. If the user mentions "strategy" or "roadmap" in a customer context without specifying product work, the Product Mgmt Agent handles it.
- **FR-4.7**: The active agent is indicated in the chat UI (subtle label or icon showing which agent is responding).
- **FR-4.8**: Users can override auto-routing by starting a message with a prefix or using a quick toggle (e.g., "@product" or "@customer" mentions).

### Customer Management Agent

- **FR-4.9**: System prompt includes the customer's full context: info, status, agreements summary, receivables summary, recent projects, and event history.
- **FR-4.10**: Agent capabilities (modeled from fractional PM agent's CONSULTANT and NAVIGATOR modes):
  - Engagement strategy advice (relationship health, next steps, follow-up recommendations)
  - Negotiation guidance (pricing recommendations based on agreement history, competitive positioning)
  - Status management (recommend status transitions, explain implications)
  - Communication drafting (email templates, meeting agendas, follow-up notes)
  - Account health assessment (based on receivables, agreement status, recent activity)
  - Stakeholder mapping advice (team dynamics, decision-maker identification)
- **FR-4.11**: Agent tools (callable functions):
  - `updateCustomerStatus` - Change customer status
  - `updateCustomerInfo` - Update customer information fields
  - `createEventLogEntry` - Log an interaction/event to customer history
  - `getCustomerSummary` - Retrieve full customer context
  - `getAgreementsSummary` - Get agreements overview
  - `getReceivablesSummary` - Get financial summary
- **FR-4.12**: Agent uses structured response cards for actionable outputs (similar to Content Agent's `ArtifactSuggestionCard` pattern).

### Product Management Agent

- **FR-4.13**: System prompt includes the customer's context PLUS product-specific context: product details from customer info, existing project artifacts, ICP, persona, competitive landscape.
- **FR-4.14**: Agent capabilities (modeled from fractional PM agent's BUILDER, STRATEGIST, MEASUREMENT, RESEARCH, and LAUNCH modes):
  - Strategy creation (product strategy, go-to-market strategy, positioning)
  - Roadmap development (feature prioritization, timeline planning, milestone definition)
  - User research synthesis (interview guides, persona development, JTBD analysis)
  - Competitive analysis (competitor mapping, feature comparison, positioning gaps)
  - Product spec writing (PRDs, feature specs, technical requirements)
  - Prioritization frameworks (RICE scoring, opportunity sizing, impact mapping)
  - Success measurement (KPI definition, metric frameworks, dashboard recommendations)
  - Ideation facilitation (brainstorming, idea evaluation, opportunity assessment)
  - Launch planning (launch checklists, GTM strategy, rollout plans)
- **FR-4.15**: Agent tools (callable functions):
  - `createProject` - Create a new product workflow project
  - `createArtifact` - Generate an artifact within a project
  - `updateArtifact` - Update existing artifact content
  - `listProjects` - List customer's projects
  - `listArtifacts` - List artifacts in a project or across all projects
  - `getCustomerContext` - Retrieve full customer context for informed generation
  - `getProductDetails` - Get product-specific info (from customer_info)
  - `getCompetitorInfo` - Get competitive landscape data
- **FR-4.16**: When creating artifacts, the agent writes content to the `customer_artifacts` table and returns a structured card with link to the artifact.

### Backend - AI Integration

- **FR-4.17**: New AI route: `POST /api/ai/customer/chat/stream` - Customer-context-aware chat streaming endpoint.
- **FR-4.18**: Route accepts: messages, customerId, screenContext. Fetches customer data, determines agent, constructs system prompt, streams response.
- **FR-4.19**: System prompts are constructed dynamically by combining: base system prompt + agent-specific prompt + customer context + recent conversation summary.
- **FR-4.20**: Tool definitions follow existing Vercel AI SDK v6 `tool()` pattern with Zod schemas.
- **FR-4.21**: Agent routing logic implemented as a classifier that analyzes the user's latest message + conversation context to determine which agent should respond.
- **FR-4.22**: Both agents share the same streaming infrastructure (AIService, DefaultChatTransport) as the Content Agent.

### Frontend - Chat Hooks

- **FR-4.23**: Create `useCustomerChat` hook that wraps `useAIChat` with customer-specific configuration (endpoint, context key, screen context).
- **FR-4.24**: `useStructuredChat` extended or adapted for customer agent structured responses (tool result parsing for customer-specific cards).
- **FR-4.25**: Chat state managed in `chatStore` under `"customer:{customerId}"` context keys.

### Event Log

- **FR-4.26**: Create `customer_events` table (or JSONB log on customer) to record significant interactions: meetings, calls, decisions, deliveries, feedback. This is the database-backed equivalent of the fractional PM agent's `event-log.md`.
- **FR-4.27**: Customer Mgmt Agent can create event log entries through its `createEventLogEntry` tool.
- **FR-4.28**: Event log displayed in the Overview tab as a chronological timeline.

## Non-Functional Requirements

- **NFR-4.1**: Chat streaming response starts within 2 seconds of message submission.
- **NFR-4.2**: Agent routing decision takes under 100ms (intent classification should be fast).
- **NFR-4.3**: Customer context injection into system prompt stays under 4000 tokens to leave room for conversation.
- **NFR-4.4**: Agent tools execute with same security model as existing Content Agent tools (per-request Supabase client via AsyncLocalStorage).
- **NFR-4.5**: No PII/tokens logged in agent interactions (follows production logging security rules).
- **NFR-4.6**: Agent can handle up to 10 agentic steps per request (consistent with existing `stopWhen: stepCountIs(10)`).

## Dependencies

### Prerequisites

- Phase 1 complete (customer CRUD, detail page)
- Phase 2 complete (agreements, receivables data accessible)
- Phase 3 complete (projects, artifacts CRUD + editor)
- Existing AI infrastructure (AIService, chat transport, streaming)
- Existing chat UI components (ChatPanel, ChatInput, StructuredChatMessage)

### Outputs for Next Phase

- Two functional AI agents with customer data access
- Chat panel integrated into customer detail page
- Agent tools that can read/write customer data
- Event log system for tracking interactions
- Auto-routing between agents

## Acceptance Criteria

- [ ] Chat panel opens on customer detail page using split-view layout
- [ ] Messages are routed to the correct agent based on intent
- [ ] Customer Mgmt Agent responds with customer context awareness
- [ ] Product Mgmt Agent responds with product/strategy context awareness
- [ ] Customer Mgmt Agent can update customer status via tool
- [ ] Customer Mgmt Agent can update customer info via tool
- [ ] Product Mgmt Agent can create projects via tool
- [ ] Product Mgmt Agent can create artifacts via tool with content
- [ ] Created artifacts appear in the Projects tab
- [ ] Chat history persists per customer across page navigations
- [ ] Active agent indicator shows in chat UI
- [ ] User can override agent routing with @mentions
- [ ] Event log entries created by agent appear in Overview timeline
- [ ] System prompts include full customer context
- [ ] Streaming works end-to-end (same infrastructure as Content Agent)
- [ ] No PII/tokens in agent logs
- [ ] Unit tests for intent routing logic
- [ ] Integration tests for customer chat endpoint

---

*Review this PRD and provide feedback before spec generation.*
