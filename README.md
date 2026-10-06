# GarageHub — Garage Workflow & Service Management

A modern, role-based auto-service management web app. Manage job cards, multi-stage
service workflows, photo documentation, reminders, attendance, inventory and status tracking.

## Tech Stack

- **React 18 + TypeScript** (strict mode) via **Vite**
- **ASP.NET Core 8** REST API with JWT authentication
- **EF Core** with SQLite for local development and PostgreSQL for production
- **Tailwind CSS** + **lucide-react** icons
- **Zustand** for state management
- **React Hook Form + Zod** for the intake form
- **qrcode.react** for printable job-card QR codes

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5080 and Swagger is
available at http://localhost:5080/swagger.

Development mode can seed local actors for UI exploration. Production disables demo
seeding and bootstraps one owner from environment variables; that owner creates real
organization accounts from **Staff & Access**.

Local data is stored in `server/GarageHub.Api/garagehub-v3.db`, resolved from the API
content root so it remains stable regardless of the terminal working directory. Startup
applies additive EF Core migrations and never recreates or deletes this database. Use a
separate `ConnectionStrings__GarageHub=Data Source=<test-file>.db` for disposable tests;
never run test cleanup against the default database.

Other scripts:

```bash
npm run build     # type-check + production build
npm run build:api # restore and build the .NET API
npm run dev:web   # frontend only
npm run dev:api   # API only
npm run preview   # preview the production build
```

## Role Portals

| Role | Views |
| --- | --- |
| **Owner** | Secure command center, approvals, audit, Express Intake, Job Cards, Vehicle History and Pickup & Drop |
| **Workshop Manager** | Dashboard, Service Board, Staff & Reports, Express Intake, Job Cards, Vehicle History and Pickup & Drop |
| **Driver** | Pickup/delivery queue and handover requirements |
| **Mechanic** | Mobile task view — checklist, stage updates, camera photo capture, parts & notes |
| **Head Mechanic** | Quality/trial queue |
| **Accountant** | Inventory, parts approvals, billing, payment, Express Intake, Job Cards, Vehicle History and Pickup & Drop |
| **Washing / WA-WB** | Department completion queues |
| **CRM Executive** | Customer reminder and campaign queue |
| **Customer** | Live service tracker (pizza-tracker style), approvals & itemized invoice / payment |

## Service Pipeline

`Entry → Inspection → In Progress → Quality Check → Ready → Delivered`

Services are grouped into Body & Paint, Detailing & Care, Maintenance & Electrical,
and Commercial & Value-Add — each with its own workflow.

## Features

- Global instant search (vehicle no. / customer / job ID)
- Light & dark mode (industrial-chic theme)
- **Organization-shared persistence** — authentication, portal state, actor queues,
  inventory, documents, attendance, notifications, reminders, invoices and audit data
  are stored by EF Core. Business data is no longer sourced from browser mock data.
- Fully responsive / mobile-friendly: sidebar on desktop, bottom action bar on
  mobile, swipeable Kanban columns, bottom-sheet dialogs, and safe-area insets.
- Print-ready job card (`@media print`) with letterhead, QR code & signatures
- Interactive damage/scratch diagram
- Camera/gallery photo capture with milestone tags (Entry / WIP / Final). Images are
  resized before authenticated upload and stored privately in Supabase in production.
- Versioned portal snapshots synchronize organization data across role sessions and
  reject stale writes with HTTP `409`.

## Structure

```
src/
  components/   ui primitives, layout, shared widgets
  portals/      manager · intake operations · mechanic · customer
  store/        Zustand store + selectors
  lib/          workflows, nav, roles, helpers
  types/        domain types
```

## Production configuration

Set `ConnectionStrings__GarageHub` to the Supabase PostgreSQL Session pooler,
`Jwt__Key` to a long random secret, and configure the private Supabase Storage adapter.
See [docs/SUPABASE_DEPLOYMENT.md](docs/SUPABASE_DEPLOYMENT.md) for the complete runbook.
Production refuses to start with SQLite, preventing a deployment from silently writing
business data into an ephemeral container filesystem.

Authenticated users receive their organization identity from the server. Workflow
reads and versioned writes are scoped from that trusted JWT claim; clients poll for
newer versions and resolve concurrent edits by loading the latest saved state.

The implementation gap analysis is maintained in
[docs/requirements/implementation-status.md](docs/requirements/implementation-status.md).
