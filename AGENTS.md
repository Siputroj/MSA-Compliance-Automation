# Frontend Developer Agent Instructions (AGENTS.md)

This file guides AI coding agents to write high-quality, modern, and performant Next.js code for the **MSA Compliance Automation** project.

---

## 1. Project Tech Stack
*   **Framework**: Next.js 15+ (App Router)
*   **Language**: TypeScript (strict mode)
*   **Styling**: Vanilla CSS (custom properties/variables, CSS modules, CSS grid/flexbox)
*   **HTTP Client**: Standard native `fetch` (no external request libraries unless required)

---

## 2. Directory Layout & Architecture

Maintain clean separation of layout, pages, and components inside the `src/` directory:
```
frontend/src/
├── app/
│   ├── layout.tsx         # Global fonts, metadata, and body layout
│   ├── page.tsx           # Home/Dashboard orchestrator page
│   └── globals.css        # Global CSS variables, reset styles, utility properties
├── components/            # Reusable UI components
│   ├── Header.tsx         # Top bar with backend connectivity status
│   ├── Sidebar.tsx        # Left sidebar with loaded compliance rules list
│   ├── ContractUpload.tsx # Drag-and-drop file uploader (.txt only)
│   ├── ScoreMeter.tsx     # Animated SVG radial gauge showing compliance score
│   ├── ReportCards.tsx    # List of rule compliance outcomes
│   └── RulesViewer.tsx    # Modal/drawer browsing active rules
├── hooks/                 # Custom React hooks for business logic
│   └── useCompliance.ts   # Central frontend state machine hook
├── utils/                 # Client utilities and wrappers
│   └── api.ts             # API client methods pointing to FastAPI backend
└── types/                 # Pure TypeScript types/interfaces
    └── compliance.ts      # Backend response model types
```

---

## 3. Strict Rules & Constraints

### A. Emojis and Visual Presentation
*   **NO emojis in the user interface**. Avoid using standard system emojis (like ✅, ❌, ⚠️, ℹ️).
*   Use inline SVG icons or premium web icon font libraries (e.g. Google Material Symbols) styled with matching state colors.

### B. Styling Guidelines (Vanilla CSS)
*   Do NOT install or write Tailwind CSS.
*   Styling must use Vanilla CSS rules inside `globals.css` or CSS Modules (`*.module.css`).
*   Define design system values (colors, shadows, blur radii, border widths, transitions) via CSS variables on the `:root` element.
*   Ensure all components look premium, incorporating glassmorphism (`backdrop-filter`), subtle borders, glowing active states, and custom transitions on hover.

### C. File Upload Rules
*   Only plain text (`.txt`) files are allowed.
*   Validate the file type (extension check) on the client side inside the upload component.
*   Reject PDF, docx, image, or other formats with clear UI error states.

### D. TypeScript Usage
*   Do not use `any`. Always declare exact interface types for component props, API payloads, and state containers.
*   Handle optional fields using optional type parameters (e.g. `field?: string`) to avoid runtime crashes.

### E. API Communication
*   Point all requests to the FastAPI backend API host `http://localhost:8000`.
*   Support state wrappers indicating when a request is in-flight (`loading`), completed (`data`), or failed (`error`).
