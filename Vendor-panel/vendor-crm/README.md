# Vendor CRM Dashboard

A pixel-close recreation of the Vendor CRM dashboard design, built with React 18, Vite, React Router, Recharts, Framer Motion, react-calendar, and XLSX/file-saver — no Tailwind, no UI kits, plain CSS per component.

## Getting Started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

Login screen accepts any email + password (demo mode, no real backend).

## Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  assets/
  components/       -> one folder per component, each with its own .jsx + .css
  context/          -> ToastContext for global action feedback
  data/             -> mockData.js, the in-memory "backend" for the demo
  layouts/          -> DashboardLayout (sidebar + navbar shell)
  pages/            -> one folder per route, each with its own .jsx + .css
  App.jsx           -> routes
  main.jsx          -> entry point
  index.css         -> design tokens / theme variables
  App.css           -> app shell layout
```

## Functional features

- Sidebar navigation with collapse + active states, badge counts, mobile drawer
- Navbar search, calendar/notification/profile dropdowns (all interactive)
- Dashboard: 8 KPI cards, revenue area chart, payment donut chart, renewal calendar,
  recent users + payment summary tables, top services, quick actions, notifications, backup overview
- Reports: searchable, filterable, paginated table with CSV/Excel export + print
- Services: card grid with password reveal toggle
- Payments: tabbed invoice table (All / Pending / Completed / Overdue)
- Excel Manager: real file import (parses uploaded .xlsx/.csv with a live preview),
  template download, and Excel exports — all produce real downloadable files
- Backup: create/restore/download backup, backup history log
- Notifications: category filters, mark-as-read
- Settings: company profile, password change, preferences — all local state forms

## Notes for production use

This is a frontend-only demo wired to mock data in `src/data/mockData.js`.
To connect a real backend, replace the imports from that file with API calls
(e.g. via `fetch`/`axios`) inside each page/component, and swap the demo
login in `App.jsx` for real authentication.
