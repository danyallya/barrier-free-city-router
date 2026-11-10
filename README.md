# Barrier-Free City Router

A route planner for ramps, stairs, working lifts and temporary obstacles.

Choose routes from recently confirmed reports and expire stale observations.

> Status: local prototype. It stores dated, structured reports for one public segment; it does not plan routes or verify live accessibility.

## Start locally

- Node.js 24 LTS and Docker Desktop with Compose.
- Copy .env.example to .env and set a development password.
- Install dependencies with `npm ci`.
- Start with docker compose up --build.
- App: http://localhost:3105 · PostgreSQL: localhost:5545

For lower-bandwidth installs, use [Offline Dev Vault](https://github.com/danyallya/offline-dev-vault); see docs/DEPENDENCIES.md.

## Foundation

Next.js App Router, TypeScript, React, Tailwind CSS, React Icons, PostgreSQL, Docker Compose, PWA manifest, conservative offline shell, Dexie/outbox starter, health endpoint, unit-test scaffold and CI. English interface.

The service worker caches only the public shell and versioned static files. Segment reports and one draft stay in this browser profile and do not sync. Reports expire for freshness after six hours but remain stored until deleted. Conditions may change at any time; reports are not guarantees. Do not enter private addresses or sensitive travel details.

Read AGENTS.md, TASK.md and docs/PROGRESS.md before work.
