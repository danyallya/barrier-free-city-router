# Barrier-Free City Router

A route planner for ramps, stairs, working lifts and temporary obstacles.

Choose routes from recently confirmed reports and expire stale observations.

> Status: foundation only. Product workflows are planned, not shipped.

## Start locally

- Node.js 24 LTS and Docker Desktop with Compose.
- Copy .env.example to .env and set a development password.
- Install with npm ci after package-lock.json is present.
- Start with docker compose up --build.
- App: http://localhost:3105 · PostgreSQL: localhost:5545

For lower-bandwidth installs, use [Offline Dev Vault](https://github.com/danyallya/offline-dev-vault); see docs/DEPENDENCIES.md.

## Foundation

Next.js App Router, TypeScript, React, Tailwind CSS, React Icons, PostgreSQL, Docker Compose, PWA manifest, conservative offline shell, Dexie/outbox starter, health endpoint, unit-test scaffold and CI. English interface.

The service worker caches only the public shell and versioned static files. It does not cache API responses or private data. Product workflows, accounts and data sync are still planned.

Read AGENTS.md, TASK.md and docs/PROGRESS.md before work.
