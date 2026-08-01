# Kenyt Ops — Login + Capture Interface

React + TypeScript + Tailwind, styled to a navy/gold manifest identity.

## Setup
npm install
npm run dev

## Structure
- src/pages/LoginPage.tsx      — split-panel login screen
- src/components/AppShell.tsx  — navy sidebar nav (Orders / Trucks / Drivers)
- src/pages/TruckForm.tsx      — truck + compliance (insurance/inspection/speed governor)
- src/pages/DriverForm.tsx     — driver + truck assignment
- src/pages/OrderForm.tsx      — order intake (BOL, load, container, consignee)
- src/types/models.ts          — shared types matching the Postgres schema

## Wiring to your existing DB/API
Each form's onSubmit prop currently console.logs the validated values (see App.tsx).
Replace loginRequest() and the three handleSave* functions in App.tsx with real
calls to your API (e.g. fetch("/api/trucks", { method: "POST", body: ... })).
