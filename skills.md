# Frontend Developer Agent Skills (skills.md)

This document defines specific coding skills, code templates, and design methodologies required to implement the **MSA Compliance Automation** frontend.

---

## Skill 1: Drag-and-Drop TXT File Loader

Coding agents should handle local file selections cleanly, strictly enforcing that only `.txt` files can be processed:

```typescript
// Example drag/drop and validation handler
const handleFileChange = (file: File) => {
  if (!file.name.endsWith('.txt')) {
    setError('Invalid file format. Only plain text (.txt) files are supported.');
    return;
  }
  
  if (file.size > 2 * 1024 * 1024) { // 2MB Limit
    setError('File size too large. Please select a file under 2MB.');
    return;
  }
  
  setError(null);
  setSelectedFile(file);
};
```

---

## Skill 2: Vanilla CSS UI Components & Glassmorphism

When creating cards and background layouts, agents must use a modern dark-slate color palette and glassmorphism:

```css
/* Color system variables defined in globals.css */
:root {
  --font-sans: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --bg-primary: #090d16;
  --bg-secondary: #0f1524;
  --border-color: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);
  
  /* Compliance outcome colors */
  --color-compliant: #10b981;       /* Emerald */
  --color-warning: #f59e0b;         /* Amber */
  --color-non-compliant: #ef4444;   /* Crimson */
  --color-not-found: #94a3b8;       /* Slate */
  
  /* Layout constraints */
  --sidebar-width: 280px;
}

/* Glassmorphism style template */
.glass-card {
  background: rgba(15, 21, 36, 0.6);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}
```

---

## Skill 3: REST API Connection client

API calls must be isolated in `src/utils/api.ts` and handle multipart forms dynamically for file uploads:

```typescript
const BASE_URL = 'http://localhost:8000/api';

export async function analyzeContractFile(file: File): Promise<AuditReport> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/analyze/file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorDetails = await response.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(errorDetails.detail || 'Network response was not ok');
  }

  return response.json();
}
```

---

## Skill 4: Radial Compliance Score Gauge (SVG based)

To present the compliance percentage dynamically, implement a responsive SVG circle element utilizing the `strokeDasharray` and `strokeDashoffset` properties:

```typescript
// SVG Radial Gauge formula:
// Circumference = 2 * PI * Radius
// Offset = Circumference - (percentage / 100) * Circumference

export const RadialGauge = ({ percentage }: { percentage: number }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {/* Background Track */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth="10"
      />
      {/* Active Indicator */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="transparent"
        stroke="var(--color-compliant)"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
      />
    </svg>
  );
};
```

---

## Skill 5: Icon Styling & Custom SVGs (No Emojis)

Rather than using basic text emojis, define structured SVG components that scale and change color depending on active state properties:

```tsx
// Compliant Icon Example
export const CompliantIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
```
