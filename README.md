# Notes Planner

A personal notes and planner web app — organize checklists, plan events on a calendar, and manage your profile, behind a simple email-based login. First full-stack project, built step by step.

## Status

Actively in development.

**Done:**
- Landing page (`index.html`, own stylesheet `landing.css`) — full redesign: hero with animated product-preview mockups, features/why/FAQ (accordion, no-JS-details-free custom implementation with smooth height animation and glow-on-open border) and CTA sections, sticky nav with scroll-spy-free anchor links, footer. Fully responsive from 320px to desktop, with a compact icon-only logo and a globe-icon language dropdown replacing the full controls on narrow screens. Semantic landmarks (`<main>`, one `<h1>`), ARIA on the FAQ accordion and language toggle, decorative elements marked `aria-hidden`. Language selection (UI-only) persists via `localStorage`.
- Login flow (`login.html`, own dark-theme stylesheet `login.css` matching the landing page/dashboard): name + email step with a verification code generated/checked on the server, resend button with countdown, clear (×) buttons on both fields that scale/rotate on hover, Enter in the name field moves focus to email, segmented UA/EN toggle synced with the landing page via `localStorage`. A "remember me" checkbox stores a 10-day timestamp in `localStorage`; while it's valid, visiting `/login` redirects straight to `/dashboard` without showing the form. A returning user (already logged in once on this browser) who clicks "Увійти" gets a shorter sign-in form — no name field, no "remember me" — while "Реєстрація" always shows the full form. Name/email are saved into the same `localStorage` state the dashboard reads, without overwriting an already-saved name when the sign-in form (which has no name field) is used.
- Backend (`server.js`): Express server serving the site + `/request-code`, `/verify-code` endpoints
- Dashboard (`dashboard.html`) — black/white/gray theme (recolored from an earlier purple accent); logo links back to the landing page; the "+ List" quick-add button in the topbar only shows on views that actually use it (Notes/Glossary/Calendar), with responsive sizing down to icon-only on narrow screens:
  - **Overview** — stats, today's agenda, progress per list
  - **Notes** — multiple independent lists, each with full CRUD (add, complete, delete, clear completed); in-place DOM updates (no full re-render flicker); optional compact display density
  - **Glossary** — rich-text term explanations, custom categories with muted colors (a small dot carries the color, card backgrounds stay neutral), priority levels, image gallery, search/filter, sorting (default/A-Z/Z-A), learned/unlearned tracking with progress bar and a flashcard review mode
  - **Calendar** — month grid (rows adapt to the month, adjacent-month days shown blank, cells with events grow capped to a single level, overflow days show a count badge), sliding month-to-month transition, a day-detail modal listing existing events, clicking an event opens a compact preview (edit/delete icons) before the full edit form, full event form (title, date, start/end time stepper, free-text type with custom colors, location, note, reminder — reminder is saved but not yet emailed)
  - **Profile** — editable name/email, uploadable avatar photo, settings ("show hints" and "compact mode" are functional now; notifications, theme toggle, and language switcher are still visual-only), toggle states now correctly restore on reload
- Data persistence via `localStorage` (lists, notes, events, profile, and settings survive page reloads)
- Responsive layout, basic semantic HTML / accessibility (`lang`, meta description, ARIA attributes)

**Planned:**
- Real database (SQLite) instead of `localStorage`
- Link notes/lists/events to the logged-in user account
- Real email sending (e.g. Resend) instead of a console log — for login codes and calendar reminders
- Real server-side sessions to replace the current client-side-only "remember me" (a `localStorage` timestamp, easily bypassed — not real security)
- Working dark/light theme switch
- Full UA/EN translation
- Mobile polish for the rest of the dashboard (only the Glossary, the landing page, and the login page have been checked properly)
- Remove the now-unused `styles.css` (old light-theme login styles, replaced by `login.css`)
- Deploy

## Tech stack

- Frontend: HTML, CSS, JavaScript (vanilla, no frameworks)
- Backend: Node.js, Express
- Data: browser `localStorage` for now (SQLite planned)

## Running locally

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.
