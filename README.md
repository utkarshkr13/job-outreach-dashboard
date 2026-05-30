# 🚀 Apple HIG-Inspired Recruiter CRM & Job Outreach Dashboard

Welcome to the **Job Outreach Recruiter CRM**, an ultra-premium, enterprise-grade minimal dashboard designed strictly after Apple's Human Interface Guidelines (HIG). This platform acts as a one-stop automated cockpit for candidates targeting Associate Product Manager (APM) and Business Analyst (BA) roles, streamlining recruiter pitches, document routing, email delivery tracking, and cadence intervals.

---

## 🎨 Design Aesthetics & Visual Engineering

The platform prioritizes visual excellence and responsive interaction layers to feel like a native macOS/iOS application:
1. **Translucent Glassmorphism (`.glass-subpixel` & `.apple-toast-frosted`)**: Uses heavy saturation layers, backdrop filters, and fine border hairlines to establish depth profiles.
2. **Apple-Spring Physics (`.apple-spring` & `.apple-grid-spring`)**: Mimics organic spring physics on hover and click gestures using spring cubic-beziers.
3. **Cursor-Tracking Radial Auras (`.apple-glow-card`)**: Interactive card highlights tracking the client cursor, casting glowing backplate layers.
4. **Disciplined System Color Palette**:
   * *System Blue (`#0071e3`)*: Primary actions, focused inputs, and PM profile indices.
   * *System Green (`#34c759`)*: Approved outreaches, offers, and success status indicators.
   * *System Orange (`#ff9500`)*: Streaks, goals, and revision-redo warnings.
   * *System Violet/Indigo (`#af52de`)*: Scheduled interviews and telemetry badges.

---

## 🛠️ Architecture & Core Tech Stack

The architecture is designed to scale from zero-configuration local demo sandboxes to enterprise Notion integrations:
* **Core Framework**: [Next.js 16 (App Router)](https://nextjs.org/) utilizing high-velocity [Turbopack](https://nextjs.org/docs/app/api-reference/turbopack) for near-instant rendering.
* **Styling Engine**: [TailwindCSS v4](https://tailwindcss.com/) equipped with `@tailwindcss/postcss` for unified utility configurations.
* **Mock Database (`lib/mockDb.json`)**: An active file-backed JSON database tracking 10 seed recruiters (Stripe, Vercel, Slack, etc.) and global resume configurations.
* **Dual Integration Core (`lib/notion.ts`)**: Built with environment-aware routing that checks `NEXT_PUBLIC_APP_MODE` and `NOTION_API_KEY` to switch between mock database environments and actual production Notion tables.

---

## ⭐️ Deployed Elite Features

The CRM contains 20+ automated modules engineered from a candidate's workflow point of view:
1. **Morning Briefing Banner**: Integrated circular SVG goal indicator, streak tracking counters, and bulk send controllers.
2. **AI Recruiter Ingestion**: Custom form fields letting you discover targeted recruiter contacts dynamically using AI rules.
3. **Fuzzy Search & Control Console**: Segmented list/Kanban switcher, multi-column search, and sort filters.
4. **Drag-and-Drop Kanban Board**: Columns mapping status stages (New, Draft, Redo, Approved, Sent, Replied, Interview, Offer, Rejected) with drag overlays.
5. **Interactive Review Drawer**: Slide-over drawer detailing specific pitched recruiters:
   * *Pitch Editor*: Inline markdown editors with real-time word counters and gatekeeper evaluations.
   * *AI Recruiter Intel*: Live connection invite copyboards, company dossiers, and PDF cover letter generators.
   * *Receipts & Cadences*: Tracking pixel statistics, timezone advisors, alternate recruiter recommendations, and follow-up templates.

---

## 📂 Project Directories

```bash
├── app/
│   ├── analytics/      # Analytical visualization charts & performance telemetry
│   ├── api/            # API routing handlers (approve, send, resume upload/download, reset)
│   ├── company/        # Dynamic Target Company overview and detailed lead pages
│   │   ├── page.tsx    # [NEW] Overview list dashboard for all tracked accounts
│   │   └── [id]/       # Detailed lead preview, editor, and custom overrides
│   ├── sent/           # Outbox archive logs
│   ├── settings/       # Smart ingestion keyword routing & signature profile kits
│   ├── globals.css     # Tailwind imports, custom variant declarations, and keyframe animations
│   └── layout.tsx      # Root component wrapping sticky frosted navbar and active nav dock indicators
├── lib/
│   ├── mockDb.json     # Active local JSON database tracking seeded leads
│   ├── mockDb.ts       # Database read/write utility helpers and resume routing checks
│   └── notion.ts       # Notion Client wrapper backing live tables
└── package.json        # Unified dependencies & compilation scripts
```

---

## ⚙️ Development Installation & Setup

Follow these commands to deploy the Recruiter CRM locally:

### 1. Pre-requisites
Ensure you have [Node.js (v18+)](https://nodejs.org/) installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your web browser.

### 4. Dual Resume Routing Configuration
Place your default portfolios under the designated folders inside your workspace:
* `lib/resumes/global-resume.pdf`: Fallback document sent to general recruiters.
* `lib/resumes/pm-resume.pdf`: Product Management resume auto-routed to PM roles.
* `lib/resumes/ba-resume.pdf`: Business Analyst resume auto-routed to BA/Analytics roles.

*Note: You can configure company-specific override documents directly inside the Target Company card overview pages.*

---

## 🛠️ TailwindCSS v4 Selector-Based Dark Mode Implementation

In Tailwind CSS v4, manual toggling of the dark mode class (e.g. `.dark`) is configured using standard CSS `@variant` directives directly in the main stylesheet instead of JavaScript config files:

1. **Stylesheet Declaration (`app/globals.css`)**:
   ```css
   @variant dark (&:where(.dark, .dark *));
   ```
2. **State Application (`app/layout.tsx`)**:
   ```tsx
   const [theme, setTheme] = useState<'light' | 'dark'>('dark');
   
   const toggleTheme = () => {
     const newTheme = theme === 'dark' ? 'light' : 'dark';
     setTheme(newTheme);
     localStorage.setItem('crm-theme', newTheme);
     
     if (newTheme === 'dark') {
       document.documentElement.classList.add('dark');
     } else {
       document.documentElement.classList.remove('dark');
     }
   };
   
   return (
     <html lang="en" className={theme}>
       <body className="bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7]">
         ...
       </body>
     </html>
   );
   ```

---

## 🏁 Verification & Production Push

To run a production-ready sanity check and package optimization locally, execute:
```bash
npm run build
```

This compiles your pages with static and dynamic server-side rendering support:
* `○ (Static)`: Prerendered as static HTML/JSON.
* `ƒ (Dynamic)`: Rendered on-demand.

All verified code updates are automatically committed and pushed directly to the `main` production branch hosted at:
🔗 **Repository URL**: `https://github.com/utkarshkr13/job-outreach-dashboard.git`
