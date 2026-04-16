# Forge Dynamics AI Ops

**AI Weekly COO for B2B SaaS founders.** Deterministic financials. Memory flywheel. Human-in-the-loop governance.

[![Tests](https://img.shields.io/badge/tests-1%2C276%20passing-brightgreen)](https://github.com/forgedynamicsai/forge-dynamics-executive-crew)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)](./LICENSE)

**Live dashboard:** [forge-dynamics-executive-crew.vercel.app](https://forge-dynamics-executive-crew.vercel.app)
**Security:** [/security](https://forge-dynamics-executive-crew.vercel.app/security.html)

---

## The Problem

Most AI ops tools send your MRR and churn data through a language model and return whatever the model says. That is a bad idea. LLMs hallucinate numbers, round to convenient figures, and invent subscription counts. You cannot debug a confidence interval when your CFO report is wrong.

Forge Dynamics takes a different approach: **no LLM ever touches your financial calculations.**

MRR, churn rate, saved MRR, dunning detection, unit economics — these are computed by deterministic Python code that is auditable, testable, and exact. The LLM only sees the output of those calculations — formatted summaries, not raw ledger data — and is used only for narrative synthesis and prioritization judgment.

Your numbers are math. Not inference.

---

## How It Works

```
Stripe (read-only)          GitHub (read-only)
        │                           │
        └──────────┬────────────────┘
                   │
         ┌─────────▼──────────┐
         │   CFO Agent         │  ← Pure Python. Zero LLM.
         │  (deterministic)    │    MRR · Churn · Unit Economics
         └─────────┬──────────┘
                   │ verified financial metrics
         ┌─────────▼──────────┐
         │  Evaluation Regime  │  ← Layer 1.5: risk posture engine
         │  (signal engine)    │    ThresholdCurve · SafetyFloor · RiskVector
         └─────────┬──────────┘
                   │ regime signals
         ┌─────────▼──────────┐
         │   CEO Agent         │  ← Operational planning
         └─────────┬──────────┘    Weekly priority recommendation
                   │
         ┌─────────▼──────────┐
         │   PM Agent          │  ← Engineering velocity
         └─────────┬──────────┘    Issue triage · blocked items
                   │
         ┌─────────▼──────────┐
         │   Advisor Agent     │  ← Cross-domain synthesis
         └─────────┬──────────┘    Memory-grounded judgment
                   │
         ┌─────────▼──────────┐
         │  Librarian Agent    │  ← Entity resolution
         └─────────┬──────────┘    World context triage
                   │
         ┌─────────▼──────────┐
         │  Memory Flywheel    │  ← Compiled truth per week
         │  (Supabase + vec)   │    Vector search · pgvector(768)
         └─────────┬──────────┘    Playbook matching
                   │
         ┌─────────▼──────────┐
         │  HITL Gate          │  ← T2 actions require approval
         └─────────┬──────────┘    T1 = draft-only · T0 = read
                   │
              Weekly Digest
         (Slack or dashboard)
```

### Action Tier System

All agent tools are classified by risk before execution:

| Tier | Description | Approval Required |
|------|-------------|------------------|
| **T0** | Read-only (Stripe metadata, GitHub issues) | No |
| **T1** | Draft outputs (reports, playbook candidates) | No |
| **T2** | Write actions in external systems | Yes — explicit human approval |

The system never takes a write action without your explicit approval. This is enforced architecturally, not by convention.

---

## Evaluation Regime System

Between deterministic financial calculations and LLM narrative synthesis sits a new layer: the **Evaluation Regime**.

The regime answers: "Given this company's current risk posture, what thresholds should govern escalation, intervention, and reporting?"

Key components:

**ThresholdCurve** — interpolates conservative/aggressive bounds across three curve shapes: LINEAR, SIGMOID (k∈[2,8] for smooth acceleration), and LOG (compressed sensitivity at scale). Every threshold adapts to the operator's risk tolerance.

**RiskVector** — three-axis posture (financial · growth · operational), each ∈ [0.0, 0.95]. A single α scalar weights the blend. Conservative operators see tighter thresholds, earlier warnings. Aggressive operators get wider bands, fewer false positives.

**SafetyFloor** — five α-independent hard limits. These never relax regardless of risk posture:
- Churn rate ≥ 15%: escalate always
- MRR decline ≥ 25%: escalate always
- Cash runway < 6 weeks: escalate always
- Failed payments > 30%: escalate always
- Activation rate < 20%: escalate always

**Signal Engine** — separates raw metric storage from signal computation. Snapshots are written once; signals are computed at read time from the active CalculatorConfig. SHA-256 keyed cache prevents redundant re-computation when posture is unchanged.

**Dual-Track Evaluation** — escalation fires if the CEO's LLM judgment raises `requires_approval` OR a safety floor is breached. Either track is sufficient.

The regime never touches Layer 1 financial formulas. It never affects action tiers. It is a read layer, not a write layer. (ADRs 010–013)

---

## Memory Flywheel

Every weekly run produces a memory page — a structured record of what happened, what was recommended, and what the outcome was. These pages:

- Persist across weeks as **compiled truth** (not raw LLM transcripts)
- Are searchable via hybrid vector + full-text search (70/30 weighting)
- Feed confidence calibration: was the recommendation correct?
- Ground the Advisor with citation chains back to prior weeks

The Advisor in week 8 has 7 weeks of verified outcomes to reason from. That is the flywheel. The system gets more accurate over time because it has memory of what it got right and wrong — not because the base model changed.

---

## Scenario Runner

Before connecting a single customer's Stripe, we validated the system against 8 adversarial business scenarios — each spanning 13 weeks of simulated operational history.

| Scenario | Description | Pass Rate |
|----------|-------------|-----------|
| The Dunning Spiral | Cascading payment failures, churn escalation | 80% |
| The Velocity Crash | Engineering slowdown, blocked sprints | 73% |
| The Growth Rocket | Rapid MRR expansion, hiring signals | 80% |
| The Silent Churn | Passive churn with no support signals | 73% |
| The Flat Line | Zero growth, zero churn — operational stasis | 100% |
| The Onboarding Black Hole | New accounts failing activation | 73% |
| The Pricing Shockwave | Mid-year price increase with mixed response | 73% |
| The Noisy Data Week | Conflicting signals, disputed metrics | 87% |

**Overall: 96/120 criteria passing (80%)** — with the mock LLM provider (deterministic, no API calls).

Each scenario evaluates 15 specific behavioral criteria: memory recall accuracy, playbook match precision, confidence calibration, escalation timing, recommendation quality, and output contract compliance.

---

## Security

Forge Dynamics handles Stripe OAuth tokens, GitHub OAuth tokens, and business financial data.

The short version:
- All data in transit: TLS/HTTPS
- All data at rest: AES-256 (Supabase)
- 28 database tables, all with row-level security
- Read-only OAuth scopes for Stripe and GitHub — we cannot initiate charges or write to your repos
- Adversarial red team testing across 8 attack vectors before any customer data was connected

Full details at [forge-dynamics-executive-crew.vercel.app/security.html](https://forge-dynamics-executive-crew.vercel.app/security.html)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Orchestration | LangGraph (state machine, checkpoints, HITL) |
| Financial calculations | Python 3.11, Pydantic v2 |
| Evaluation Regime | ThresholdCurve, RiskVector, SafetyFloor, Signal Engine |
| Database | Supabase (PostgreSQL + pgvector) |
| LLM inference | Google Gemini (Paid Services — not used for model training) |
| Embeddings | Gemini gemini-embedding-001 (768-dim) |
| Dashboard | React 18 + Vite, deployed on Vercel |
| Agent compute | Railway |
| Test suite | pytest — 1,276 tests, 0 failing |

---

## Test Suite

```
pytest
```

1,276 tests. Covers: CFO financial calculations, memory search, scenario runner framework, Stripe audit pipeline, confidence calibration, world context ingestion, entity resolution, LangGraph orchestration, output contract validation, adversarial red team scenarios, and Evaluation Regime math (threshold curves, safety floors, signal/snapshot separation, audit layer, breakpoint solver).

Test runtime: ~8 minutes. All tests run in mock mode — no external API calls required.

---

## Dashboard

The live dashboard shows a running Dunning Spiral scenario (no Stripe or GitHub connection required to view):

[forge-dynamics-executive-crew.vercel.app](https://forge-dynamics-executive-crew.vercel.app)

Features:
- CEO weekly briefing card with confidence score and trend
- CFO metrics: MRR delta, churn rate, saved MRR by tier (3-tier dunning classification)
- PM velocity: issues closed, blocked items, GitHub integration health
- Advisor citations linked to prior memory pages
- 13-week Attribution chart
- Audit log with every agent action and approval record
- Dark/light theme, mobile responsive

---

## Legal

- [Privacy Policy](https://forge-dynamics-executive-crew.vercel.app/legal/privacy)
- [Terms of Service](https://forge-dynamics-executive-crew.vercel.app/legal/terms)

Questions: privacy@forgedynamicsai.com

---

## Contact

- X/Twitter: [@forgedynamicsai](https://x.com/forgedynamicsai)
- Legal: legal@forgedynamicsai.com
- Privacy: privacy@forgedynamicsai.com

---

*Forge Dynamics AI Ops — Phase 11 (Evaluation Regime System)*
