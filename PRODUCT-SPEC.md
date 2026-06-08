# Job Outreach Dashboard — Complete Feature & UI Specification

> Purpose of this document: a complete, build-ready description of every screen, tab, button, dropdown, input, and behavior in the app. Hand this to a designer / Claude Code to produce a working prototype and then a re-implementation. It describes **what exists and what each control does** — not the current visual styling (which you want redesigned).

---

## 1. Product overview

A personal, single-operator tool that automates **personalized cold-email outreach for job hunting**. Leads live in a **Notion** database ("Cold Email Outreach"). The app lets the operator review AI-drafted pitches, approve them, schedule or send them from their **own Gmail** (OAuth2, résumé attached + open-tracking pixel), and track replies/follow-ups through a CRM pipeline. Two **Claude scheduled jobs** fill the funnel daily (scrape leads + draft emails); **Vercel cron jobs** handle bulk generation, follow-ups, and reply scanning.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Notion API · Gmail OAuth2 (Nodemailer) · Vercel Blob (résumé) · AI: Anthropic Claude or Groq Llama 3.

**Single-user auth:** a username + password gate protects the whole app (no Google/Apple/SSO, no multi-user).

---

## 2. Core data model (Notion "Cold Email Outreach")

Every lead is one row. Fields the UI reads/writes:

| Field | Type | Used for |
|---|---|---|
| Company | title | Lead name (primary) |
| Role | text | Target job title |
| Email | email | Recruiter address (send target) |
| Contact Name | text | Recruiter first/last name |
| Contact Title | text | Recruiter role (HR, TA, Founder…) |
| Company Type | select: `Startup`, `Stable` | Maturity segment |
| Company Signal | select: `Hot`, `Caution` | Lead quality flag |
| Signal Reason / Signal Updated | text / date | Why a signal was set |
| Email Status | select (see pipeline below) | CRM stage (drives everything) |
| Email Subject | text | Generated/edited subject |
| Email Draft | text | Generated/edited body (HTML allowed) |
| Draft Notes | text | AI fit score + feedback |
| Emailed | checkbox | Auto-checked on send |
| Date Added | date | Lead created |
| Last Contacted | date | Set on send |
| Scheduled Send Time | date | For scheduled sends |
| Gmail Thread ID | text | Reply tracking |
| Follow-up Count | number | How many follow-ups sent |
| Reply Snippet | text | Captured recruiter reply preview |
| Location | text | City/area |
| Salary Range (LPA) | text | Comp range |
| Source | select: `LinkedIn`, `Naukri`, `Indeed`, `Career Page`, `Other` | Where found |
| Source URL / Job Description URL | url | Links |
| JD Keywords / Skills Gap | text | From JD analysis |

### CRM pipeline (Email Status values + UI label + meaning)

| Status value | Dashboard label | Meaning |
|---|---|---|
| `New` | New | Raw lead, no draft |
| `Draft Ready` | AI Drafts Ready | Pitch generated, awaiting review |
| `Approved` | Approved Outbox | Approved, ready to send |
| `Scheduled` | Scheduled | Timed delivery queued |
| `Sent` | Outreach Emailed | Email sent |
| `Follow-up Ready` | Follow-up Ready | Touchpoint bump ready |
| `Replied` | Recruiter Replied | Active response |
| `Interview` | Interview Stage | Rounds in progress |
| `Offer` | Job Offers | Offer received |
| `Rejected` | Rejected | Archived/not a fit |
| `No Response` | No Response | No reply after follow-ups |
| `Redo` | Redo AI | Needs regeneration |

Pipeline transitions: New → Draft Ready → Approved → (Scheduled →) Sent → Replied → Interview → Offer. Side paths: Draft Ready → Redo → Draft Ready; New/any → Rejected; Sent → No Response.

---

## 3. Global shell (every page)

**Top navbar** (persistent):
- Logo: "Outreach Platform".
- Primary nav links: **Dashboard** (`/`), **Companies** (`/company`), **Sent** (`/sent`), **Analytics** (`/analytics`), **Settings** (`/settings`). Active link highlighted.
- **Theme toggle** (light/dark) — sun/moon icon.
- **Sign Out** button (clears session cookie → returns to login).
- Environment/status badge (currently shows a small "Production" pill).

**Auth gate** (before any page): full-screen **Sign in** card with **Username** field, **Password** field, **Sign in** button, inline error on wrong credentials. On success → redirect to intended page. Logout returns here.

**Global feedback:**
- **Toast** (top-right): success (neutral) and error (red ⚠️) messages, auto-dismiss (4–8s).
- **Confetti** burst + chime sound on successful send.

---

## 4. Screen: Onboarding (`/onboarding`) — 5 steps

A multi-step wizard (single card, Next/Back), shown first-run. Steps:
1. **Welcome / intro.**
2. **Connect Gmail** — "Sign in to link Google Mail" → OAuth; shows "Gmail Inbox Linked" when done. (In single-user mode this is configured via env, so this step can become an info/confirmation step.)
3. **Connect Notion** — paste Notion Integration Token + Database ID; "Verify Connection Ping" test button; success state.
4. **Your Profile** — Full Name, Phone, LinkedIn, Bio, Target Roles.
5. **Upload Résumé** — drag-and-drop zone "Drag resume PDF here or click to browse" (PDF only, max 5MB); shows "Résumé Synced".
Finish → dashboard.

> For the redesign of a single-user app, onboarding can be simplified to an optional "Setup checklist," but keep all 5 capability areas.

---

## 5. Screen: Dashboard (`/`) — the core workspace

### 5.1 Morning Briefing header
- **Daily goal ring**: progress toward 5 sends/day (e.g. "2/5"; turns green ✓ at 5).
- **Streak counter** (e.g. "6-day streak").
- **Briefing insight line**: contextual tip (e.g. "You have N drafts ready for review. Press E to edit, approve for dispatch." / "Pipeline up to date — enter a company below.").

### 5.2 Recruiter Ingestion panel
- **Company** text input (placeholder "Company (e.g. Stripe)").
- **Target Role** input/select (default "Associate PM").
- **Discover Recruiter Lead** button → `POST /api/companies/ingest` (auto-discovers recruiter details, adds a lead). Shows loading state.

### 5.3 Search & Control Console
- **Fuzzy search** input (search by company, role, or contact). Keyboard `/` focuses it.
- **Date Extracted** filter/sort control.
- **Sort by** dropdown: Date, Company, Salary, Signal.
- **View toggle**: **List** ⟷ **Kanban** (segmented control).

### 5.4 CRM status filter (tabs / sidebar)
Filter chips/tabs for each pipeline status, each with label + short description + count:
`All`, AI Drafts Ready, Approved Outbox, Scheduled, Outreach Emailed, Follow-up Ready, Recruiter Replied, Interview Stage, Job Offers, Redo AI, Rejected, No Response. (Also a "Notion Draft Ready" alias.)

### 5.5 List view (company table)
Columns: **Company** (with colored avatar), **Target Role**, **Recruiter Contact** (name + title), **Source** (LinkedIn/etc. pill), **Telemetry** (open count, e.g. "👍 2 Opens" once sent), **Status** (colored pill; scheduled rows show a ⏳ countdown), **Actions** (revealed on row hover).

**Row hover actions depend on status:**
- Draft Ready → **Approve** button (→ status Approved) and open editor.
- Approved → **Send Now** split-button with a **▼ dropdown**:
  - ✨ **Send at Optimal Time** (computes best send time by location)
  - 🕐 **Send in 1 Hour**
  - 📅 **Send Tomorrow** (each → schedules via `/api/send/[id]/schedule`)
- Any row → click to open the **Review Drawer**.

Infinite scroll (loads 50 at a time). Empty state: "No leads match your filter."

### 5.6 Kanban view
Columns by pipeline status; lead cards draggable/clickable to open drawer. Same data, board layout.

### 5.7 Bulk actions
- **Approve All** (all Draft Ready → Approved).
- **Send All** (`POST /api/send/bulk` — sends all Approved; confetti + count toast).
- **Bulk Redo** (all Redo → Draft Ready).

### 5.8 Keyboard shortcuts
`/` focus search · `J` next lead · `K` previous lead · `E` open editor drawer · `A` approve focused (if Draft Ready) · `S` send focused (if Approved). A "Keyboard Shortcuts" helper is shown.

---

## 6. Component: Review Drawer (slides in from right)

Opens for a selected lead. Header: company, role, contact, status. **Three tabs:**

### 6.1 Editor tab
- **Email Subject Line** input.
- **Personalized Body Pitch** textarea (the draft; HTML supported in send).
- **Draft Notes** (AI fit score/feedback, read or edit).
- Actions: **Save Edits** (`/api/companies` update), **Redo AI** (→ Redo / regenerate), **Reject** (→ Rejected), **Send Outreach Now** split-button with the same schedule dropdown (Optimal / 1 Hour / Tomorrow).
- **JD Intelligence** sub-panel (collapsible): paste **Job Description URL** or text → **Analyze** (`/api/jd/analyze`) → shows **Keywords Detected**, **Skills Gap**, and a suggested **pitch hook**.
- **Cover Letter** generation (drafting state "Drafting Cover Letter…").
- "Fit rating limit" / character/word counters on the body (e.g. "234 / 300 characters", word count guard).

### 6.2 Intelligence tab
- **AI Company Brief / Dossier** — `triggerAICompanyBrief` (`/api/generate`) builds a company intel brief (product, market, tech stack, news, fit score). "Consulting Claude brief…" loading state.
- **Recruiter Sentiment Analyzer** — paste a recruiter reply → **Classify** (`/api/replies/classify`) → returns sentiment score + a **Suggested Response** draft.

### 6.3 Tracking tab
- **Open-tracking telemetry**: "Total Recruiter Opens", live read-receipt count (via tracking pixel `/api/track/[id]/open`).
- **Follow-up timeline**: Day 0 Original Sent · Day 3 Follow-up 1 · Day 7 Follow-up 2 · Day 10 Follow-up 3 · Day 14 Archive if no reply (each shows scheduled/sent/archived state).
- **Generate Follow-up** button (`/api/followup/[id]`) — drafts the next threaded follow-up (escalating tone: soft check-in → reference original → lighter ask with portfolio/schedule → graceful exit).

---

## 7. Screen: Companies (`/company`)
A directory/list of all companies/leads (broader than the dashboard's filtered table). Clicking a company opens its detail (`/company/[id]`) with the lead's full record and draft.

---

## 8. Screen: Sent (`/sent`)
History of dispatched outreach. For each sent email: **Subject Line**, **Recruiter Details** (Contact, Title, Email Address), **Dispatched Date**, **Sent Email Body** (rendered), and **Live Read-Receipt Telemetry** ("Total Opens Registered"). Includes a "System Copy" of the message.

---

## 9. Screen: Analytics (`/analytics`)
KPI + insight dashboard ("Synthesizing CRM analytics…" loading state). Sections:
- **KPI cards**: Total Leads (Leads in CRM), Outreaches Sent, Open Rate (Recruiter Opens), Avg AI Score.
- **Conversion Funnel** + **Conversion Ratios** (key response efficiency indicators).
- **Outreach Velocity**: emails dispatched per day over the past week (chart).
- **Segment Demographics**: Target Role Split (APM vs BA), Company Maturity Split (Startup vs Stable), Company Funding Angle.
- **Best performers**: Best Send Day, Best Channel, Best Angle, Subject Format; comparative callouts ("2.1x More Replies", "31% Higher Opens").
- **Extraction Source Efficiency** (which sources yield best leads).

---

## 10. Screen: Settings (`/settings`)
Left section nav + content panel. Sections (with status indicators):
1. **Profile Information** — Full Name, Phone Number, LinkedIn URL, Professional Bio, Target Roles. Save button.
2. **Gmail Integration** — connect/confirm sending account; status "System Confirmed".
3. **Notion Database Integration** — Notion API Integration Token, Notion Database ID; test/save.
4. **AI LLM Engines** — Anthropic API Key, Groq API Key, **Preferred AI Engine** dropdown (Anthropic Claude 3.5 Sonnet — High Precision / Groq Llama 3.3 70B — Ultra-fast). Save.
5. **Resume Document Storage** — current résumé link ("View Current Uploaded PDF Resume" + synced date) or empty state; **Upload/Replace PDF Resume** (PDF only). This résumé is auto-attached on every send.
6. **Daily Summary Cron** — **Enable Morning Generation** toggle, **Trigger Hour** (local IST) selector. ("Triggers automatic daily pipeline scans.")
7. **Multi-Factor Authentication (2FA)** — Google Authenticator (TOTP) setup (security section).

All secrets are encrypted (AES-256) before storage. (For single-user mode most of these can be read from env, but keep the panels for visibility/edit.)

---

## 11. Résumé attachment logic (important behavior)
On send, the mailer attaches a résumé using the first available of:
1. Per-company custom résumé (`custom-<userId>-<notionId>.pdf`).
2. The operator's main résumé (`resume-<userId>.pdf`) — uploaded in Settings.
3. A global default (`resume.pdf`).
Plus an invisible 1×1 open-tracking pixel appended to the HTML body.

---

## 12. Automation (must be represented/documented in the product)

**Vercel cron jobs** (server, times UTC):
- `/api/cron/generate` (22:30) — bulk-generate AI drafts for New leads.
- `/api/followup/bulk` (22:45) — draft follow-ups for sent-no-reply leads.
- `/api/followup/archive` (22:50) — archive stale threads.
- `/api/replies/scan` (10:00) — scan Gmail for replies → update status to Replied + capture snippet.

**Claude scheduled jobs** (run from Claude desktop, fill the funnel):
- **job-hunt** (~08:30 daily): scrape 30–40 LinkedIn/Indeed leads (Apify), find real HR/TA contacts, add to Notion, draft Gmail drafts, email a daily summary.
- **notion-draft-emails** (~06:05 daily): fill empty draft fields across the Notion databases with personalized cold emails (≤15/run).

---

## 13. API endpoint reference (behaviors to preserve)
- `POST /api/auth/site-password` — username/password login (sets cookie). `POST /api/auth/logout` — clears it.
- `GET /api/companies` — list leads. `POST /api/companies` — update a lead (status/subject/body/notes). `POST /api/companies/ingest` — discover + add a lead. `/api/companies/export`, `/api/companies/reset`.
- `POST /api/generate` — AI company brief + draft. `/api/generate/bulk`, `/api/generate/followup`.
- `POST /api/send/[id]` — send one. `POST /api/send/[id]/schedule` — schedule one. `POST /api/send/bulk` — send all Approved.
- `POST /api/followup/[id]` — draft follow-up. `/api/followup/bulk`, `/api/followup/archive`.
- `POST /api/replies/scan` — detect replies. `POST /api/replies/classify` — sentiment + suggested reply.
- `POST /api/jd/analyze` — JD keywords/skills-gap/hook.
- `GET/POST /api/resume`, `/api/resume/upload`, `/api/resume/download` — résumé storage.
- `GET /api/track/[id]/open` — open-tracking pixel.
- `/api/signals/scan` — company signal (Hot/Caution) scoring.
- `/api/gmail/oauth` + callback, `/api/onboarding/*`, `/api/settings/credentials`, `/api/cron/*`.

---

## 14. Design direction for the prototype (your redesign brief)
- **Single coherent design language** (currently two overlapping passes exist — consolidate). Apple/Google-grade: generous spacing, an 8px spacing scale, one type scale, restrained palette, soft shadows, fully **symmetric buttons** (consistent height, padding, radius, centered icon+label), crisp keyboard-focus rings.
- **Primary surfaces to nail:** the dashboard company table + status filters, the Review Drawer (3 tabs), and Settings.
- **States to design for every control:** default, hover, active/pressed, focus, disabled, loading, empty, error.
- **Feedback:** success/error toasts and the confetti celebration on send.
- **Responsive:** works on a laptop; drawer becomes full-screen on narrow widths.
- Keep all functionality in this document; only the look/feel and layout change.

---

*Generated from the live codebase (utkarshkr13/job-outreach-dashboard, branch main). Hand this to Claude Code / a designer to produce the prototype, then implement screen-by-screen.*
