# MSA Compliance Automation: Next.js Frontend Client

Welcome to the frontend user interface for the **MSA Compliance Automation** project. This is a high-fidelity **Next.js 15 (App Router)** single-page application built using **TypeScript** and **Vanilla CSS**.

It provides legal and compliance teams with an interactive, real-time dashboard to audit Master Service Agreements (MSAs) against corporate policy guidelines.

---

## Key Features

1.  **Header Navigation:** Swap cleanly between **Single Audit** mode (for detail analysis of one contract) and **Batch Audit** mode (for matrix review of multiple contracts).
2.  **Dynamic Policy Modification:** An in-app drawer manager (`RulesViewer`) to inspect, edit, or add compliance policy criteria (e.g. Liability Caps, Non-Competes) on the fly, saving updates directly to the backend.
3.  **Single Contract Auditing:** Drag-and-drop a `.txt` file to receive an overall compliance score ring (animated SVG radial meter) and see exact legal excerpt cards with risk explanations.
4.  **Batch Audits Table:** Upload multiple `.txt` contracts to process them sequentially. A results table tracks overall scores and lists warning/rejection badge counts. Clicking "View Details" opens a slide-over panel summarizing card findings.
5.  **No Emojis Policy:** Employs sleek, inline SVG vectors from the Google Material Symbols standard to represent compliance status without relying on system emojis.

---

## Directory layout

```
frontend/src/
├── app/
│   ├── layout.tsx         # Global font loading (Outfit), metadata, and HTML skeleton
│   ├── page.tsx           # Home page orchestrating Single Audit views
│   ├── batch/
│   │   └── page.tsx       # Batch matrix view (multi-file loader, results table, slide drawer)
│   └── globals.css        # Core reset, typography tokens, glassmorphism styles, & inputs
├── components/            # High-fidelity reusable UI components
│   ├── Header.tsx         # Connection status bar & navigation links
│   ├── Sidebar.tsx        # Left rules directory sidebar (for Single Audit)
│   ├── ContractUpload.tsx # Drag-and-drop file uploader zone (.txt only)
│   ├── ScoreMeter.tsx     # Animated SVG radial gauge showing compliance score
│   ├── ReportCards.tsx    # List of rules compliance results cards
│   └── RulesViewer.tsx    # Modal list and editor forms for policy criteria
├── hooks/
│   └── useCompliance.ts   # Central React state machine (manages API requests and active selections)
├── utils/
│   └── api.ts             # Native fetch REST API client wrapper pointing to backend
└── types/
    └── compliance.ts      # Structured TypeScript type interfaces (Rule, AuditReport)
```

---

## Quick Start (Run Locally)

Make sure the FastAPI backend is running on `http://localhost:8000`.

### 1. Install Dependencies
Navigate to the `frontend/` directory and install packages:
```bash
npm install
```

### 2. Launch Dev Server
Start the local Next.js dev server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to inspect the application.

### 3. Build for Production
To bundle the static, optimized application assets:
```bash
npm run build
```
To run the production bundle locally:
```bash
npm run start
```

---

## Technical Specifications

### A. API Connection Client
All frontend requests target the FastAPI host at `http://localhost:8000/api`. The requests are handled via native `fetch` wrappers inside `utils/api.ts`:
*   `getHealth()`: Checks backend status and hardware GPU MLX configuration.
*   `getRules()`: Fetches configured audit guidelines.
*   `saveRule(rule)`: Saves a new policy or edits an existing rule.
*   `analyzeFile(file)`: Uploads a text contract using a `Multipart/Form-Data` payload.

### B. Styling Guidelines (Vanilla CSS)
Styles are defined in `app/globals.css`. 
*   **Design Tokens:** Tailored HSL colors, border colors, shadows, and fonts are set as CSS variables on the `:root` element.
*   **Glassmorphism:** Visual blocks use the `.glass-card` class, which incorporates `backdrop-filter: blur(12px)` and subtle glowing borders.
*   **Transition Effects:** Clean transitions (`transition: all 0.3s ease`) are attached to buttons, rules lists, and forms.

### C. File Upload Rules
To prevent compilation or runtime errors during token chunking:
*   Only **plain text (`.txt`)** files are accepted.
*   File sizes must be **less than 2MB**.
*   Validations are checked client-side in the uploader component, triggering clear warning boxes on failure.
