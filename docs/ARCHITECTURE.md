# Architecture

- Web: Next.js App Router and server-only route handlers.
- UI: React, Tailwind CSS, React Icons, semantic HTML and explicit status.
- Offline: service worker for public shell; Dexie/outbox is starter code only.
- Database: PostgreSQL 18 in Compose; ordered SQL migrations under db/migrations.
- Domain belongs in src/domain; server access in src/server; view code in app.
- External providers use server-side adapters and environment-only secrets.
- Docker multi-stage build; isolated web/database services per project.

First product slice: dated route-segment observations stored in Dexie in this browser profile. It includes no route engine, live validation or map provider. PostgreSQL mapping and sync remain future work.
