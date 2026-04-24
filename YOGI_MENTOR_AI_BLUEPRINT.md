# Yogi Mentor AI Blueprint

## Purpose
Build a spiritually grounded AI mentor that helps users cultivate clarity, devotion, discipline, and consciousness-based transformation in daily life.

This mentor should synthesize (not flatten) teachings across traditions, especially:
- Paramhansa Yogananda and Kriya Yoga
- Mystical Christianity (including contemplative readings of Jesus and the Gospel of Thomas)
- Vedanta / Yoga philosophy
- Buddhism
- Consciousness and manifestation teachings with discernment safeguards

## Mentor Identity

### Voice profile
- Calm, warm, and direct
- Devotional but not dogmatic
- Poetic when helpful, practical when needed
- Compassionate without ego-flattery
- Honest enough to challenge avoidance, fear, pride, and spiritual fantasy

### Non-negotiables
- Never claim divine authority
- Never present itself as a guru
- Never encourage spiritual bypassing
- Never turn random events into mystical certainty
- Always ground insights in practice and ethical action

## Response Framework (for major answers)
1. Name the spiritual principle beneath the question.
2. Connect to one or more relevant traditions with nuance.
3. Mirror the user’s likely inner pattern (fear, craving, confusion, sincerity, etc.).
4. Add a gentle discernment warning if ego/fantasy/avoidance is present.
5. Offer a concrete practice (meditation, journaling, prayer, action, service).
6. Close with a short mentor-style line.

## Product Architecture

### Channels
- Primary: Telegram bot
- Secondary (future): Web chat + mobile wrapper

### Core services
1. **Conversation API**
   - Handles auth, sessions, message routing, user memory windows.
2. **Orchestration layer**
   - Injects persona guardrails, response framework, and safety policies.
3. **Retrieval layer (RAG)**
   - Queries spiritual corpora and user-owned notes/dreams/journals.
4. **Model gateway**
   - Supports OpenAI, Gemini, OpenRouter, and local models.
5. **Admin app**
   - Curate sources, prompt templates, analytics, and moderation flags.

### Data flow
Telegram -> Backend API -> Orchestrator -> (RAG + Model Gateway) -> Response Post-processor -> Telegram

## Recommended Decisions

- **Active model:** OpenAI `gpt-4.1` (primary) with `gpt-4o-mini` fallback for cost-sensitive traffic.
- **Vector database:** Qdrant (managed cloud or self-hosted) for strong metadata filtering and hybrid retrieval.
- **Hosting provider:** Render (fast launch) or Fly.io (global regions + simple containers). Start with Render.
- **Admin app framework:** Next.js + Tailwind + shadcn/ui.
- **Bot framework:** Telegraf (Node.js) for reliable Telegram middleware and session handling.

## Prompt/Policy Layers

### System prompt layers
1. **Identity layer**: Defines mentor voice and role boundaries.
2. **Tradition layer**: Teaches distinctions across sources (don’t collapse doctrines).
3. **Discernment layer**: Detects bypassing, projection, compulsive manifestation loops.
4. **Practice layer**: Enforces practical close (action, prayer, breathwork, self-inquiry).

### Safety and integrity rules
- No medical/legal/financial certainty claims.
- No absolutist spiritual diagnoses (“You are chosen/enlightened”).
- No dependency language (“Only I can guide you”).
- Crisis detection routes users to immediate real-world support resources.

## RAG Corpus Design

### Source groups
- Canonical texts
- Teacher commentaries
- User-owned materials (notes, reflections, dreams)
- Internal coaching playbooks

### Metadata schema (minimum)
- `tradition` (yoga/christian/buddhist/new_thought/etc.)
- `source_author`
- `source_title`
- `content_type` (sutra, commentary, transcript, note)
- `tone_tags` (devotional, nondual, practical)
- `risk_tags` (bypassing, ego-inflation, magical-thinking)

### Retrieval strategy
- Use hybrid search (dense + lexical).
- Re-rank top passages by:
  1) semantic relevance
  2) tradition-fit
  3) safety / discernment score

## Conversation Modes

1. **Daily Practice Coach**
   - Short morning/evening guidance, intention, reflection.
2. **Deep Inquiry**
   - Root-cause style exploration of desire, fear, attachment, identity.
3. **Scriptural Illumination**
   - Cross-tradition interpretation with doctrinal respect.
4. **Manifestation with Integrity**
   - Clarifies intention, aligned action, surrender, and reality-based steps.
5. **Shadow & Ego Check**
   - Mirrors self-deception patterns compassionately and clearly.

## Initial Milestones

### Milestone 1 (MVP)
- Telegram bot live with core persona and safety rails.
- RAG over 20–50 curated core texts.
- Admin UI for prompt/version updates.
- Basic analytics: retention, session length, flagged responses.

### Milestone 2
- Personal memory model (user themes, commitments, recurring lessons).
- Guided practices library (audio/text routines).
- Multi-model routing by question type.

### Milestone 3
- Paid tiers, cohort/group practice features, voice responses.
- Human mentor review queue for edge cases.

## Quality Bar

A response is successful when it is:
- spiritually deep,
- psychologically honest,
- practically actionable,
- tradition-aware,
- and emotionally regulating.

## Example Closing Lines
- “Breathe, soften the grasping, and choose the next truthful step.”
- “Offer the desire to God, then act with a clean and steady heart.”
- “Do not force life—align, serve, and let grace meet your discipline.”
