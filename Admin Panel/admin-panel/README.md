# H TWO Cloud Solutions — Admin Dashboard

A pixel-matched React admin dashboard (dark navy sidebar + white content area) built with React 18, React Router, Recharts, React Calendar, Framer Motion and plain CSS Modules-style files (no Tailwind/Bootstrap/MUI).

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Login

The whole dashboard now sits behind a login screen at `/login`.

- Toggle between **User Login** and **Vendor Login** at the top of the form — each has its own heading, subtext and demo email.
- Enter any email + a password of 4+ characters (or tap **"Use demo … credentials"** to auto-fill) and submit.
- On success you're redirected to the page you originally tried to open (or the dashboard by default).
- Session is kept in `localStorage` (`h2_auth` key), so refreshing stays logged in. Logout (via the navbar profile dropdown) clears it and sends you back to `/login`.
- Every dashboard route is wrapped in `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) — visiting any URL while logged out bounces you to `/login`.
- The navbar's avatar name/role and the "Welcome back, …" greeting are pulled live from whoever is logged in (`src/context/AuthContext.jsx`).

This is a front-end-only demo auth — swap the `setTimeout` in `src/pages/Login/Login.jsx`'s `handleSubmit` for a real API call whenever you connect a backend.

## What's interactive

- **Sidebar** — every menu item is a real route (`react-router-dom`). Active item gets the blue gradient. Hamburger in the navbar collapses the sidebar to icons only.
- **Upgrade Now** — shows a toast confirmation.
- **Navbar search** — controlled input, ready to wire to real filtering.
- **Calendar icon** — opens a live `react-calendar` mini calendar.
- **Notification bell** — opens a dropdown with mock notifications; "Mark all read" clears the badge count.
- **Profile avatar** — opens a profile dropdown (My Profile / Account Settings / Logout).
- **Payment Status donut** — click a legend row to hide/show that slice (Recharts).
- **Renewal Calendar** — click any date to select it; colored dots mark renewal-heavy days; "View Calendar" routes to the Renewal Center page.
- **"View All" / "View details"** buttons on every card and table — route to their matching page.
- All other sidebar destinations (Customers, Vendors, Services, etc.) render as a clean placeholder page ready for you to fill in with real data/tables.

## Project structure

```
src/
  components/
    Sidebar/  Navbar/  Layout/
    DashboardCards/  RevenueCards/  PaymentChart/  RenewalCalendar/
    UpcomingRenewals/  OverduePayments/  RecentInvoices/  TopVendors/
  pages/
    Dashboard/
    Login/
    Placeholder.jsx
  context/
    AuthContext.jsx   <- login/logout state, persisted to localStorage
  data/
    mockData.js   <- swap this out for your real API calls
  App.jsx
  main.jsx
  index.css       <- all theme tokens (colors, radius, shadow) live here as CSS variables
```

## Theme tokens (src/index.css)

| Token | Value |
|---|---|
| Primary | `#4F6BFF` |
| Sidebar background | `#081122` |
| Sidebar hover | `#112447` |
| Active menu | gradient `#4F6BFF → #2F55FF` |
| Main background | `#F5F7FB` |
| Card background | `#FFFFFF` |
| Border | `#E8EDF5` |
| Radius | `16px` |
| Card shadow | `0 10px 35px rgba(15,23,42,.06)` |
| Font | Inter |
