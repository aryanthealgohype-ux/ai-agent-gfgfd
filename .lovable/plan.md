## AI Agent Fleet — Command Center

A real, multi-tenant control center for your 23 agents: every agent's role, system prompt, safety rating, permissions and escalation rules live in the database, run against a real LLM server-side, and every action is logged. No placeholder pages.

### Stack (locked)

TanStack Start + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Framer Motion + Lovable Cloud (Postgres, Auth, Storage) + Lovable AI for model calls. Note: Lovable runs TanStack Start, not Next.js — server functions replace Next route handlers. n8n is supported as an optional per-agent webhook target in a later phase.

Design: Clean light SaaS — background `#fbfbfd`, ink `#111827`, primary blue `#2563eb`, amber `#f59e0b` for warnings/approval, semantic tokens only (no hardcoded colors), full dark mode.

---

## Build order

### Phase 1 — Foundation + Auth (multi-tenant)

- Enable Lovable Cloud.
- Email/password + Google sign-in, `/auth` page, profiles table.
- Tables: `organizations`, `org_members`, `user_roles` (separate table, enum `admin | manager | employee | client`), `has_role()` and `is_org_member()` security-definer functions.
- Every table below carries `org_id`; RLS scopes all reads/writes to the caller's org + role. Grants issued per table.
- Protected app lives under `_authenticated/`; public landing at `/` with sign-in CTA. Org switcher in the top bar.

### Phase 2 — Agent registry (seeded, real)

- Tables: `agents` (slug, name, category, safety_rating 1–5, system_prompt, permissions[], escalation_rules, requires_approval, status active/paused, model, placeholders json), `agent_versions` (full prompt history + rollback), `agent_runs`, `run_logs`, `approvals`, `connectors`, `audit_logs`, `usage_costs`, `notifications`, `agent_memory` (short-term session + long-term vector-less summary rows).
- Migration seeds **all 23 agents** with your exact system prompts, safety ratings, permissions and escalation rules — plus `requires_approval = true` auto-set for every 4/5 and 5/5 agent.

### Phase 3 — Dashboard UI

- Fleet grid: `grid-cols-1 → sm:2 → lg:3`, category filter rail that scrolls horizontally on mobile, all touch targets ≥44px.
- Agent card: name, category icon, safety gauge (green 1–2 / amber 3 / red 4–5), active/paused toggle (persists to DB), copy-prompt button, expandable prompt, Run button.
- Agent detail page: prompt editor with placeholder fields ({business_name}, {user_name}, …) stored per org, permissions, escalation rules, version history + rollback, run history.
- Overview: fleet health, runs today, cost per agent, pending approvals, live log feed.

### Phase 4 — Real execution + safety gates

- Server function runs the agent's stored system prompt through Lovable AI, writes tokens/cost/latency to `agent_runs` + `usage_costs`, streams output into the run log.
- Hard gate: any agent with safety ≥4 creates an `approvals` row first; the run stays `pending_approval` until an admin/manager approves — approver id + timestamp logged. No bypass path in code.
- Short-term memory: last N turns per agent+user. Long-term: rolling summary row.
- Every run/write appends to `audit_logs` (agent, action, target, actor, timestamp). Secrets never enter prompts, logs or output.

### Phase 5 — Connectors panel

- `connectors` table with real per-org connection status and setup instructions for WhatsApp Business, Instagram/Facebook, Telegram, Gmail, LinkedIn, X, YouTube, Slack, Google Calendar, Sheets, GitHub.
- Credentials go into Lovable secrets (server-only), never the database or client. `.env.example` documents every key.
- Per-agent connector requirements shown on the card, with an honest "not connected — action disabled" state instead of a fake success.

### Phase 6 — Analytics, settings, security, testing

- AI usage analytics (cost/tokens/runs by agent, category, day), real-time log stream, notifications.
- Settings: org profile, team management (invite/role change), placeholder values, model choice per agent.
- Security scan pass, RLS review on every table, security memory documented.
- Vitest coverage on the approval gate, RBAC helpers, and cost accounting.

---

### Technical notes

- Agent runs use `createServerFn` with `requireSupabaseAuth`; `LOVABLE_API_KEY` read inside handlers only. n8n webhook mode can be added per-agent later without schema changes (a `webhook_url` column ships in Phase 2, unused until then).
- Billing/subscriptions and agent marketplace/plugin system are deliberately out of scope for this build; the schema leaves room for both.
- Deployment is Lovable hosting (not Vercel) — publish from the editor.

### Honest scope note

Phase 4 makes **LLM reasoning real** for every agent. Side-effecting actions (actually sending a WhatsApp message, placing a call, deploying) need each provider's credentials and an execution layer; those turn on per connector in Phase 5 as you add tokens. Until a connector is live, the agent produces the drafted action and logs it rather than pretending it sent.  
5:---

## Future Roadmap (Post V1)

The architecture is intentionally modular and extensible. The following capabilities are planned for future releases and should be considered during the initial architecture design, even if they are not fully implemented in V1.

### Phase 7 — Enterprise AI OS Expansion

- Master AI CEO Agent (central orchestration and task routing)

- Multi-model routing (OpenAI, Claude, Gemini, Groq, OpenRouter, Ollama, Nano Banana)

- Agent-to-Agent communication

- Long-term memory with semantic search

- Knowledge Base (PDF, DOCX, CSV, Excel, Images, Audio, Video, Websites, GitHub, Notion, Google Drive)

- MCP (Model Context Protocol) client/server support

- Visual AI Workflow Builder (drag & drop)

- Human approval workflows

- AI Chat Command Center

- AI Marketplace

- Prompt Marketplace

- Workflow Marketplace

- Plugin System

- Team Workspaces

- Multi-tenant organizations

- Advanced RBAC

- Audit Logs

- Cost Tracking

- Token Analytics

- Billing & Subscription Management

- Notification Center

- Real-time Monitoring

- Live Activity Logs

- Agent Health Dashboard

- Queue & Retry Management

- API Gateway

- REST API

- GraphQL API

- SDK Support

- Webhooks

- Developer Console

- Secret Vault

- Prompt Injection Protection

- Session Management

- MFA & SSO

- Backup & Disaster Recovery

- Version History

- Rollback System

### Social Media Hub

The platform architecture should support future native integrations with:

- WhatsApp

- Instagram

- Facebook

- LinkedIn

- X (Twitter)

- YouTube

- TikTok

- Threads

- Telegram

- Discord

- Slack

- Reddit

- Pinterest

Each connector should support, where available:

- OAuth Authentication

- Publishing

- Scheduling

- Analytics

- Comments

- Direct Messages

- AI Auto Replies

- Trend Detection

- Competitor Tracking

### Engineering Principles

This project must always follow:

- Production-ready architecture

- Clean Architecture

- Modular design

- Fully typed TypeScript

- Responsive UI

- Accessibility best practices

- Secure by default

- No fake business logic

- No hidden placeholder pages

- Scalable database design

- Reusable components

- Server-side security

- Enterprise-grade code quality

The codebase should be designed so every mocked connector can later be replaced with a real provider integration without changing the UI, database schema, or business logic.  
Never sacrifice architecture quality for speed. If a feature cannot be fully implemented because external credentials or third-party services are unavailable, build the complete production-ready UI, database schema, server functions, validation, permission system, logging, and integration interfaces so that adding the real provider later only requires configuring credentials—not rewriting the application.  
  
6:1. AI CEO Agent (Master Brain)

Sabse upar ek Master AI hona chahiye.

```

```

```
AI CEO

↓

Task Router

↓

Research
↓

Sales
↓

Marketing
↓

Developer
↓

Support
↓

Analytics
↓

Security
```

Ye decide karega kaunsa AI Agent use hoga.

---

# 2. Multi Model Router

Abhi sirf Lovable AI likha hai.

Add:

```

```

```
OpenAI

Claude

Gemini

Groq

OpenRouter

Ollama

Nano Banana

Automatic model selection
```

Har Agent apna model choose kare.

---

# 3. AI Memory

Current memory simple hai.

Replace with

```

```

```
Long Memory

Short Memory

Project Memory

Conversation Memory

Company Memory

Client Memory

Semantic Search

Knowledge Graph
```

---

# 4. MCP

Add

```

```

```
Model Context Protocol

MCP Client

MCP Server

External Tools

Remote MCP

Local MCP
```

---

# 5. Workflow Builder

Not only n8n.

Create

```

```

```
Visual Workflow Builder

Drag Drop

Conditions

Loops

Switch

Approval

Delay

Schedule

Webhook

API

Human Approval

AI Decision
```

---

# 6. Knowledge Hub

Add

```

```

```
Upload PDF

Word

Excel

CSV

Images

Audio

Video

Youtube

Website

GitHub

Notion

Google Docs

Google Drive
```

Automatically searchable.

---

# 7. Social Hub

Not only connectors.

Create complete

```

```

```
Instagram

Facebook

LinkedIn

Twitter X

Threads

TikTok

Pinterest

Reddit

Telegram

Discord

Slack

Youtube
```

Every platform has

```

```

```
Analytics

Messages

Comments

Posts

Scheduler

AI Reply

Trend Analysis
```

---

# 8. Mobile Dashboard

Current mobile is basic.

Need

```

```

```
Bottom Navigation

Floating AI Button

Swipe Cards

Touch Animation

PWA

Offline Mode

Notification Center
```

---

# 9. AI Marketplace

Future Ready

```

```

```
Install Agent

Share Agent

Templates

Community

Prompt Store

Workflow Store
```

---

# 10. Team Dashboard

Need

```

```

```
Owner

Admin

Manager

Employee

Client

Guest
```

Permissions

```

```

```
Read

Write

Delete

Approve

Deploy

Billing
```

---

# 11. Billing

Missing

```

```

```
Subscription

Credits

Token Usage

Invoices

Payments

Usage History
```

---

# 12. Monitoring

Need

```

```

```
Live Logs

CPU

Memory

Latency

Failures

Retries

Queue

Cost

Health
```

---

# 13. AI Chat

One global chat

```

```

```
ChatGPT Style

Attach Files

Voice

Images

Code

Search

Memory

Run Agent
```

---

# 14. Automation

Need

```

```

```
Cron

Webhooks

Triggers

Events

API

Email

WhatsApp

Telegram

Slack
```

---

# 15. Developer Mode

Need

```

```

```
API Keys

Logs

Secrets

SDK

REST API

GraphQL

CLI

Webhooks
```

---

# 16. Security

Enterprise

```

```

```
RBAC

MFA

SSO

Audit Logs

Encryption

Secret Vault

Rate Limit

IP Whitelist

Session Control

Prompt Injection Protection
```

---

# 17. Dashboard Pages

Instead of

```

```

```
Dashboard
Agents
Analytics
Settings
```

Create

```

```

```
Dashboard

AI Chat

AI Agents

Workflows

Automation

Knowledge

Projects

Clients

CRM

Tasks

Calendar

Meetings

Email

WhatsApp

Calls

Documents

Slides

Sheets

Media

Research

Analytics

Reports

Notifications

Team

Security

Billing

Marketplace

Integrations

Developer

Settings
```

---

# 18. UI

Tell Lovable

```

```

```
Apple Level

Linear.app

Raycast

Notion

Vercel

Stripe

Glassmorphism

Motion

Premium

No Bootstrap Look

Ultra Smooth Animation

Responsive

Dark Mode

Light Mode
```

---

# 19. Folder Structure

```

```

```
apps/

components/

features/

agents/

workflows/

integrations/

server/

database/

hooks/

types/

lib/

store/

styles/

public/

tests/

docs/
```

---

# 20. Final Instruction

At the very top of the prompt, add this:

> **Build this as a production-grade AI Operating System for businesses, not as a demo. Every page, workflow, AI agent, database schema, API, and UI component must be fully functional, scalable, type-safe, responsive, secure, and production-ready. Do not generate placeholder pages, fake data, mock business logic, or incomplete features unless explicitly requested. Follow clean architecture, modular design, RBAC, audit logging, approval workflows, and enterprise security best practices.**

## Final Rating

With these additions, your specification would be around **9.9/10** for a production-ready AI Operating System.

One important note: avoid asking Lovable to make **everything** fully functional immediately (e.g., WhatsApp, phone calls, LinkedIn, deployments, billing, and every connector at once). Building the **core platform first** (auth, agent framework, dashboard, workflows, security, and knowledge base) and then enabling integrations incrementally will produce a much more reliable and maintainable application.

&nbsp;