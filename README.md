# Notes Planner

A personal notes and planner web app — organize checklists, plan events on a calendar, and manage your profile, behind a simple email-based login. First full-stack project, built step by step.

## Status

Actively in development.

**Done:**
- Landing page (`index.html`, own stylesheet `landing.css`) — full redesign: hero with animated product-preview mockups, features/why/FAQ (accordion, no-JS-details-free custom implementation with smooth height animation and glow-on-open border) and CTA sections, sticky nav with scroll-spy-free anchor links, footer. Fully responsive from 320px to desktop, with a compact icon-only logo and a globe-icon language dropdown replacing the full controls on narrow screens. Semantic landmarks (`<main>`, one `<h1>`), ARIA on the FAQ accordion and language toggle, decorative elements marked `aria-hidden`. Language selection (UI-only) persists via `localStorage`.
- Login flow (`login.html`): email validation, verification code generated/checked on the server, resend button with countdown
- Backend (`server.js`): Express server serving the site + `/request-code`, `/verify-code` endpoints
- Dashboard (`dashboard.html`) — black/white/gray theme (recolored from an earlier purple accent):
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
- Working dark/light theme switch
- Full UA/EN translation
- Bring `login.html` in line with the new dark theme and logo (still on the old light `styles.css`)
- Mobile polish for the rest of the dashboard (only the Glossary and the new landing page have been checked properly)
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
