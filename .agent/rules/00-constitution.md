---
trigger: always_on
---

---
description: "Global constraints for AI Film Studio. Enforces TypeScript strictness, Atomic Commits, Architecture standards, and Financial Control."
globs: ["**/*"]
---

# 🏛️ AI FILM STUDIO: GLOBAL CONSTITUTION

**Version:** 1.2.0 (Financial Amendment)
**Status:** ENFORCED
**Applies to:** All Agents (Showrunner, Director, FinOps, Backend, Frontend), Human Developers, and API Integrations.

---

## I. THE GOLDEN RULE OF "ANTIGRAVITY"
> **"Complexity is the enemy of execution."**

1.  **Atomic Commits:** Never commit broken code. Every commit must be buildable and testable.
2.  **Modular Design:** No file should exceed 300 lines of code. If it does, refactor it into smaller, logical sub-modules.
3.  **Strict Typing:** TypeScript `any` type is strictly forbidden. Use Zod schemas for all data validation (API inputs, environment variables, database responses).

---

## II. TECHNICAL STANDARDS

### 🖥️ Frontend (Client)
1.  **Framework:** React (Vite) + TailwindCSS + Radix UI. No other UI libraries without COO approval.
2.  **State Management:**
    * **Server State:** Must use `trpc.useQuery` / `trpc.useMutation`.
    * **Local State:** Use `useState` or `useReducer`.
    * **Global Client State:** Use `Zustand` (if absolutely necessary).
3.  **Components:**
    * Place all shared UI components in `/client/src/components/ui`.
    * Place feature-specific logic in `/client/src/features`.
    * Do not hardcode colors. Use Tailwind classes (e.g., `bg-slate-900`, `text-primary`).

### ⚙️ Backend (Server)
1.  **Framework:** Node.js + Express + tRPC.
2.  **Database:**
    * **Schema First:** Changes to the DB must start in `/drizzle/schema.ts`.
    * **Migrations:** Never edit migration SQL files manually. Use `drizzle-kit generate`.
3.  **API Structure:**
    * **Routers:** One router per domain (e.g., `projectRouter`, `sceneRouter`, `aiRouter`).
    * **Services:** Heavy logic (AI calls, file processing) belongs in `/server/src/services`, not in the router itself.

### 🤖 AI Integration (Replicate & Others)
1.  **Abstraction:** Never call AI APIs (Replicate, Gemini, Veo) directly from the frontend. Always proxy through a tRPC endpoint.
2.  **Model Agnosticism:** The system must support switching models via configuration (e.g., swapping Flux for SDXL). Do not hardcode model IDs.
3.  **Asset Ownership:** Replicate hosts images temporarily. The system **MUST** strictly follow the pipeline: `Generate -> Download -> Upload to GCS -> Save GCS Link to DB`.
4.  **Failure Handling:** All AI calls must have a `try/catch` block and a retry mechanism (max 3 retries).

---

## III. AGENT PROTOCOLS

### 1. The Showrunner (Project Lead)
* **Mandate:** Maintains the "Project Bible" (JSON state).
* **Workflow:** User Idea -> Showrunner Spec -> Specialist Execution (Script/Cine/PD).

### 2. The FinOps Controller
* **Mandate:** "No Surprises."
* **Protocol:** Intercept every generation request. If cost > $0.01, require explicit user approval via UI.

### 3. The QA Auditor
* **Mandate:** "Trust, but verify."
* **Checklist:**
    * [ ] Does it build?
    * [ ] Is there a Zod schema?
    * [ ] Are sensitive keys exposed?
    * [ ] Is the `usage_ledger` being updated?

---

## IV. WORKFLOW & DEPLOYMENT

1.  **Environment Variables:**
    * Locals: `.env` (Never commit this).
    * Template: `.env.example` (Always commit this).
2.  **Deployment (GCP):**
    * Deployment is automated via `./scripts/deploy.ps1`.
    * Manual deployments are forbidden in production.
3.  **Documentation:**
    * If you add a feature, you **MUST** update `docs/architecture/ALL_IN_ONE_IMPLEMENTATION.md`.
    * Code must be self-documenting. Use meaningful variable names over comments.

---

## V. FINANCIAL CONTROL (NEW)

1.  **Visibility:** The "Total Project Spend" ticker must be visible on all creative screens (Script, Storyboard, Video).
2.  **Cost Guard:** No AI generation can occur without a pre-flight cost estimate check.
3.  **Logging:** Every API call to Replicate or Gemini must log a row in the `usage_ledger` table.

---

## VI. ETHICAL & SAFETY GUIDELINES (AI)

1.  **Content Safety:**
    * All AI inputs must be sanitized.
    * All AI outputs must be checked for safety violations before displaying to the user.
2.  **User Data:**
    * Respect user privacy. Do not use user data to train models without explicit consent.
    * Store generated assets in secure, private buckets (GCS).

---

**Signed & Ratified:**
* **Showrunner:** [Active]
* **FinOps:** [Active]
* **Backend Architect:** [Active]
* **Frontend Specialist:** [Active]
* **User:** [You]