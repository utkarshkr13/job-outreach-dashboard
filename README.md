# 🚀 Job Outreach Dashboard

An end-to-end system that automates **personalized cold-email outreach for job hunting**. It pulls target companies from a **Notion** CRM, drafts tailored pitches with **Claude AI (or Groq Llama 3)**, and sends approved emails straight from **your own Gmail** (OAuth2) with your résumé attached and an open-tracking pixel embedded.

It has two halves that work together:

1. **The web app** (this repo, hosted on Vercel) — the dashboard you click through to review, approve, schedule, and send pitches.
2. **Two Claude scheduled jobs** (run from the Claude desktop app) — they *fill the top of the funnel* every morning: one scrapes fresh leads, the other writes draft emails into Notion. See [Claude Scheduled Jobs](#-claude-scheduled-jobs) — these are essential and easy to miss.

> **Live app:** https://job-outreach-dashboard.vercel.app

---

## 📑 Table of Contents

- [How it all fits together](#-how-it-all-fits-together)
- [CRM pipeline](#-crm-pipeline)
- [What happens when you click "Send"](#-what-happens-when-you-click-send)
- [Tech stack](#-tech-stack)
- [Project structure](#-project-structure)
- [Setup](#-setup)
  - [1. Environment variables](#1-environment-variables)
  - [2. Notion](#2-notion)
  - [3. Gmail OAuth2 (important: publish to production)](#3-gmail-oauth2-important-publish-to-production)
  - [4. Firebase / Firestore](#4-firebase--firestore)
  - [5. Run locally](#5-run-locally)
  - [6. Deploy to Vercel](#6-deploy-to-vercel)
- [Vercel cron jobs (server-side automation)](#-vercel-cron-jobs-server-side-automation)
- [Claude Scheduled Jobs](#-claude-scheduled-jobs)
- [Troubleshooting](#-troubleshooting)

---

## 🧭 How it all fits together

```mermaid
flowchart TD
    subgraph CLAUDE["🤖 Claude Desktop · Scheduled Jobs (run daily on your machine)"]
        J1["job-hunt\nScrapes 30-40 leads via Apify\nfinds real HR/TA contacts"]
        J2["notion-draft-emails\nWrites cold-email drafts\ninto empty Notion rows"]
    end

    subgraph NOTION["🗂️ Notion · Job Hunt HQ"]
        DB[("Cold Email Tracker\n+ Startups / Premium / App Tracker")]
    end

    subgraph APP["▲ Vercel · Next.js Dashboard (this repo)"]
        UI["Dashboard UI\nreview · approve · schedule · send"]
        API["API routes\n/api/companies /api/generate\n/api/send /api/followup ..."]
        CRON["Vercel Cron\ngenerate · follow-ups · reply-scan"]
    end

    subgraph EXT["External services"]
        AI["Claude / Groq\n(draft generation)"]
        GMAIL["Gmail API (OAuth2)\nsends from YOUR address"]
        BLOB["Vercel Blob\n(résumé PDF)"]
        FS["Firebase / Firestore\n(auth + encrypted secrets)"]
    end

    J1 -->|adds leads| DB
    J2 -->|writes drafts| DB
    DB <-->|read/write| API
    UI <--> API
    API --> AI
    API --> GMAIL
    API --> BLOB
    API --> FS
    CRON --> API
    GMAIL -->|tracking pixel open| API
```

**The mental model:** Claude jobs feed Notion overnight → you open the dashboard in the morning → review/approve → send. The app never invents contacts; it only acts on what's in Notion.

---

## 🔄 CRM pipeline

Each lead flows through these statuses (the `Email Status` select in Notion):

```mermaid
stateDiagram-v2
    [*] --> New
    New --> DraftReady: AI drafts pitch
    DraftReady --> Approved: you approve
    Approved --> Scheduled: "Send at optimal time"
    Approved --> Sent: "Send Now"
    Scheduled --> Sent: cron fires at scheduled time
    Sent --> Replied: recruiter replies (reply-scan cron)
    Replied --> Interview
    Interview --> Offer
    DraftReady --> Redo: you reject / request changes
    Redo --> DraftReady: regenerate
    New --> Rejected: not a fit
```

---

## ✉️ What happens when you click "Send"

```mermaid
sequenceDiagram
    participant U as You (UI)
    participant A as /api/send/[id]
    participant Au as auth-middleware
    participant N as Notion
    participant G as Gmail API
    U->>A: POST (Firebase ID token)
    A->>Au: verify token, decrypt user secrets
    Au-->>A: Notion + Gmail creds
    A->>N: fetch company row (email, subject, body)
    A->>G: refresh OAuth token → send email + résumé + tracking pixel
    G-->>A: messageId
    A->>G: resolve Gmail threadId (for reply tracking)
    A->>N: set Email Status = Sent, lastContacted = today
    A-->>U: { success: true } → 🎉 confetti + toast
```

If anything fails, the UI now shows a **red error toast** with the exact message (e.g. an expired Gmail token), instead of silently doing nothing.

---

## 🛠️ Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.6** (App Router, TypeScript) |
| UI | React **19.2.4**, Tailwind CSS **v4**, custom design-system layer (`app/design-system.css`) |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) or Groq Llama 3 (`PREFERRED_LLM_PROVIDER`) |
| Leads DB | Notion API (`@notionhq/client`) |
| Auth + secrets | Firebase Auth + Firestore (secrets stored AES-encrypted) |
| Email | Nodemailer + Gmail OAuth2 (sends from your own address) |
| File storage | Vercel Blob (`@vercel/blob`) for the résumé PDF |
| Hosting | Vercel (serverless + cron) |

---

## 📂 Project structure

```
job-outreach-dashboard/
├── app/
│   ├── page.tsx                 # Main dashboard (lead grid + review drawer)
│   ├── layout.tsx               # Root layout; imports globals + ui-fixes + design-system
│   ├── globals.css              # Base styles + animations
│   ├── ui-fixes.css             # Overlay/animation fixes (confetti + toasts)
│   ├── design-system.css        # App-wide buttons/inputs/focus/scrollbars
│   ├── login / password / onboarding / settings / sent / analytics
│   └── api/
│       ├── companies/route.ts   # Read/update Notion leads
│       ├── generate/route.ts    # AI pitch generation
│       ├── send/[id]/route.ts   # Send one email + mark Sent
│       ├── send/bulk/route.ts   # Send all Approved
│       ├── followup/…           # Follow-up drafting/sending + archive
│       ├── replies/…            # Reply scan + sentiment classify
│       ├── track/…              # Open-tracking pixel
│       └── cron/generate/route.ts
├── lib/
│   ├── notion.ts                # Notion helpers
│   ├── agents.ts                # AI generation pipeline
│   ├── mailer.ts                # Gmail OAuth2 sender (+ résumé tiers + pixel)
│   ├── gmail.ts                 # Token refresh + thread/reply parsing
│   ├── auth-middleware.ts       # Verify Firebase token, decrypt secrets
│   └── crypto.ts                # AES-256 encrypt/decrypt
├── vercel.json                  # Vercel cron schedule
└── types/index.ts
```

---

## ⚙️ Setup

### 1. Environment variables

Create `.env.local` in the project root. **Generate your own secrets — never reuse the examples below.**

```env
# Mode: 'demo' bypasses Firebase/Notion on localhost; unset/other = production
NEXT_PUBLIC_APP_MODE=demo

# AI
ANTHROPIC_API_KEY=
GROQ_API_KEY=
PREFERRED_LLM_PROVIDER=anthropic

# Notion
NOTION_API_KEY=
NOTION_DB_ID=

# Password gate + security  (generate random values, e.g. `openssl rand -hex 16`)
SITE_PASSWORD=choose-a-strong-password
AUTH_SECRET=generate-a-random-32-char-hex
CRON_SECRET=generate-a-random-32-char-hex

# Gmail OAuth2  (see section 3)
GMAIL_USER=you@gmail.com
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# Vercel Blob (résumé upload)
BLOB_READ_WRITE_TOKEN=

# Firebase Admin (server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Default sender profile (used as fallback / demo)
SENDER_NAME=Your Full Name
SENDER_PHONE=+91 XXXXXXXXXX
SENDER_LINKEDIN=linkedin.com/in/your-profile
SENDER_BIO=One-line elevator pitch.
TARGET_ROLES=Associate PM or Business Analyst
```

> 🔐 **Security note:** earlier versions of this README committed the real site password and secret hex values. Those have been removed. Rotate any secret that was ever committed, and add `.env.local` to `.gitignore` (it already is). For production, set every variable in **Vercel → Settings → Environment Variables**.

### 2. Notion

1. Create an integration at [notion.so/my-integrations](https://notion.so/my-integrations) → copy the **Internal Integration Token** → `NOTION_API_KEY`.
2. Create a database with these properties (case-sensitive):

| Property | Type | Notes |
|---|---|---|
| Company | title | Company name (main column) |
| Role | rich_text | Target job title |
| Email | email | Recruiter email |
| Contact Name | rich_text | Recruiter name |
| Company Type | select | `Startup` / `Stable` |
| Email Status | select | `New`, `Draft Ready`, `Approved`, `Scheduled`, `Sent`, `Replied`, `Interview`, `Offer`, `Rejected`, `Redo` |
| Email Subject | rich_text | Generated/edited subject |
| Email Draft | rich_text | Generated/edited body |
| Draft Notes | rich_text | AI score/feedback |
| Emailed | checkbox | Auto-checked on send |
| Date Added | date | |
| Source / Source URL | select / url | Where the lead came from |

3. Share the DB with your integration (**•••  → Add connections**).
4. The **Database ID** is the 32-char string in the DB URL → `NOTION_DB_ID`.

### 3. Gmail OAuth2 (important: publish to production)

1. [console.cloud.google.com](https://console.cloud.google.com) → new project → **Enable Gmail API**.
2. **OAuth consent screen** → External → add yourself as a user.
3. **Credentials → OAuth client ID → Web application** → add redirect URI `https://developers.google.com/oauthplayground` → save **Client ID** + **Client Secret**.
4. ⭐ **Click "PUBLISH APP" to move the consent screen from *Testing* to *In production*.** In *Testing* mode Google **expires the refresh token every 7 days** (`invalid_grant: Token has been expired or revoked`). Publishing makes the token permanent. *(This was the #1 recurring failure — don't skip it.)*
5. [OAuth Playground](https://developers.google.com/oauthplayground) → gear icon → "Use your own OAuth credentials" → enter Client ID/Secret → select scope `https://mail.google.com/` → Authorize → Exchange code → copy the **Refresh Token** (`1//...`) → `GMAIL_REFRESH_TOKEN`.

### 4. Firebase / Firestore

1. Create a Firebase project → enable **Firestore**.
2. Each user is a doc in the `users` collection (doc ID = Firebase UID). The settings page encrypts and writes these for you:

```json
{
  "name": "Your Name",
  "credentials": { "notionApiKey": "AES...", "notionDbId": "AES...", "gmailUser": "you@gmail.com", "gmailClientId": "AES...", "gmailClientSecret": "AES...", "gmailRefreshToken": "AES..." },
  "profile": { "senderName": "Your Name", "phone": "...", "linkedin": "...", "bio": "...", "targetRoles": "Associate PM or Business Analyst" },
  "resumeBlobUrl": "https://....public.blob.vercel-storage.com/resume.pdf"
}
```

3. **Project Settings → Service accounts → Generate new private key** → use `client_email` and `private_key` for `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.

### 5. Run locally

```bash
npm install
npm run dev
# open http://localhost:3000  → enter your SITE_PASSWORD
```

### 6. Deploy to Vercel

1. Push to GitHub → import the repo in Vercel.
2. Copy every `.env.local` variable into Vercel env settings.
3. Vercel auto-reads `vercel.json` and registers the cron jobs.

---

## ⏰ Vercel cron jobs (server-side automation)

Defined in `vercel.json` (times are UTC):

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/generate` | `30 22 * * *` | Bulk-generate AI drafts for `New` leads |
| `/api/followup/bulk` | `45 22 * * *` | Draft follow-ups for sent-but-no-reply leads |
| `/api/followup/archive` | `50 22 * * *` | Archive stale threads |
| `/api/replies/scan` | `0 10 * * *` | Scan Gmail for recruiter replies → update status |

These are protected by `CRON_SECRET`.

---

## 🤖 Claude Scheduled Jobs

> These run from the **Claude desktop app** (Scheduled Tasks), *not* on Vercel. They populate Notion so the dashboard always has fresh leads and drafts to work with. **If you skip these, the dashboard will have nothing to send.** Recreate them in Claude → *Scheduled tasks* → *New*, pasting the prompt and setting the schedule.

### Job 1 — `job-hunt` (lead generation) · daily ~08:30

**What it does:** scrapes 30–40 live job listings, finds **real** HR/TA contacts, and writes leads into the Notion *Cold Email Tracker*.

- **Schedule:** `30 8 * * *` (daily, with small random jitter)
- **Tools required:** Apify MCP (`curious_coder/linkedin-jobs-scraper`, `curious_coder/indeed-scraper`, `apify/rag-web-browser`), Notion MCP, Gmail MCP, WebSearch.
- **Flow:**
  1. Alternate city daily (Mumbai ↔ Bengaluru), rotate areas (no repeat within 7 days).
  2. Two Apify scrapes — APM roles and BA/analyst roles — ~40 each.
  3. Filter to 30–40 clean, unique, in-target leads (drop senior/eng-mgr/out-of-city; dedupe).
  4. **Contact discovery (strict): never invent a name or email.** Use the scraper's `jobPosterName` if it's a TA/HR title, else LinkedIn/web search. No real person ⇒ no draft.
  5. Add all leads to Notion (`HR Name = "Not Found"`, `Email Status = "Not Started"` when no contact).
  6. For leads with a real contact, create a **Gmail draft** (never auto-send) and set `Email Status = "Drafted"`.
  7. Email a daily summary to the owner.
- **Guardrails:** no em dashes; one CTA; 120–140 words; fixed intro line; zero invented contacts; prefer <200 applicants.

### Job 2 — `notion-draft-emails` (draft writer) · daily ~06:05

**What it does:** fills empty `Draft` / `Email Draft` fields across the Job Hunt HQ databases with personalized cold emails (up to 15 per run, for speed).

- **Schedule:** `0 6 * * *` (daily)
- **Tools required:** Notion MCP, WebSearch.
- **Databases processed (in priority order):** Cold Email Outreach → Startups → Premium 14+ LPA → Application Tracker.
- **Flow:**
  1. Find entries with an empty draft (skip rows that already have one and any `⛔ DELETE ME` test rows).
  2. Research the company via WebSearch before writing.
  3. Write a 120–140 word email using the master template (company-specific opening + fixed intro line + single CTA). Use `Hi Team,` if no contact name.
  4. Write back: `Draft` (or `Email Draft` + `Email Subject`), and for *Cold Email Outreach* set `Email Status = "Draft Ready"`.
  5. Print a run summary (drafts written, companies processed, remaining backlog).

> **To adapt for yourself:** change the target cities/areas, the two target roles, the fixed intro line, and your signature/contact block inside each job's prompt. Both jobs reference a personal signature and a fixed intro line you should replace with your own.

---

## 🧯 Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `invalid_grant: Token has been expired or revoked` | OAuth app still in **Testing** mode (7-day token expiry). **Publish to production** (section 3) and regenerate the refresh token. |
| Send button "does nothing", no error | Fixed: error toasts now render reliably and show the real message. If a send fails, read the red toast. |
| No confetti on send | Fixed in `app/ui-fixes.css` (overlays were trapped by a transformed ancestor + positioned off-screen). |
| Dashboard is empty | The Claude scheduled jobs haven't populated Notion yet, or the Notion integration isn't shared with the database. |
| Build fails on Vercel | TS/ESLint errors are ignored via `next.config.ts`; a hard compile error will still fail — check the build logs. The previous good deployment stays live. |

---

*Last updated: June 7, 2026.*
