# Notes Planner

A personal notes and planner web app — organize checklists, plan events on a calendar, and manage your profile, behind a simple email-based login. First full-stack project, built step by step.

## Status

Actively in development.

**Done:**
- Landing page (`index.html`) with language switcher UI
- Login flow (`login.html`): email validation, verification code generated/checked on the server, resend button with countdown
- Backend (`server.js`): Express server serving the site + `/request-code`, `/verify-code` endpoints
- Dashboard (`dashboard.html`):
  - **Overview** — stats, today's agenda, progress per list
  - **Notes** — multiple independent lists, each with full CRUD (add, complete, delete, clear completed); in-place DOM updates (no full re-render flicker)
  - **Glossary** — rich-text term explanations, custom categories with colors (picker tucked behind a palette icon), priority levels, image gallery, search/filter, sorting (default/A-Z/Z-A), learned/unlearned tracking with progress bar and a flashcard review mode
  - **Calendar** — redesigned month grid (rows adapt to the month, adjacent-month days shown blank, cells with events subtly grow), a day-detail modal listing existing events with one-click edit, full event form (title, date, start/end time stepper, free-text type with custom colors, location, note, reminder — reminder is saved but not yet emailed)
  - **Profile** — editable name/email, uploadable avatar photo, settings (notifications, hints, compact mode, theme toggle, language switcher — the last two are visual only for now)
- Data persistence via `localStorage` (lists, notes, events, profile, and settings survive page reloads)
- Responsive layout, basic semantic HTML / accessibility (`lang`, meta description, ARIA attributes)

**Planned:**
- Real database (SQLite) instead of `localStorage`
- Link notes/lists/events to the logged-in user account
- Real email sending (e.g. Resend) instead of a console log — for login codes and calendar reminders
- Working dark/light theme switch
- Full UA/EN translation
- Split `styles.css` further, mobile polish
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
