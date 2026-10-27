# Progress log

## 2026-10-27 — foundation

**Done:** localized Next/TypeScript/Tailwind/React Icons/PostgreSQL/Docker/PWA shell, Dexie/outbox starter, health route, metadata test, CI, product brief, task/backlog and operations/security notes.

**Not done:** product workflow, auth, domain tables, sync, release security review, provider, dependency install and lockfile.

**Next:** Model a route segment with accessibility observation and expiry.

**Delivery:** Public repository created and foundation pushed to main. The latest handoff is committed locally; push it when the cache/Docker blocker is cleared.


## Environment check — 2026-10-27

**Update:** Compose now passes PostgreSQL host, database, user and password as separate environment fields so local password characters do not break a connection URL. docker compose config --quiet passes for all 30 projects; runtime verification is pending Docker access.

Docker service com.docker.service is stopped; Start-Service cannot open it with current permissions. The npm cache registry at localhost:4873 is unavailable. Offline lockfile generation returned ETARGET for eslint-config-next@16.4.3 from the host cache. No dependency install, tests or production build ran; CI reports a warning and skips dependency installation, tests, lint and build until a lockfile is committed.

## 2026-10-28 — day 1, ACCESSIBILITY-MAP-001/002

**Done:** Added a typed route-segment observation with public labels, source time/source type and structured step-free, lift and obstruction reports. The six-hour freshness window is derived from source time; stale reports remain visible as expired and can be deleted. Added a review-before-save flow, local Dexie draft/record storage, truthful local-only status, empty/error states and confirmed local deletion. The UI repeatedly says that reports are unverified and do not certify routes.

**Environment and verification:** Docker Engine 29.6.2 was available; Offline Dev Vault `npm ping` returned `PONG`; PostgreSQL 18.6 was healthy on port 5545. `npm ci` added 403 packages; `npm audit` found 0 vulnerabilities; `npm run verify` passed (typecheck, 6 tests, lint with 0 errors and one existing `postcss.config.mjs` warning, Next production build). The local `/api/health` endpoint returned `{"ok":true,"database":"ready"}`. Browser smoke confirmed empty-form validation and focus, with no console errors. `docker compose --progress plain build app` is blocked because BuildKit does not support the configured `offline-dev-vault_vault` network mode.

**Limits:** No route recommendations, map provider, live verification, identity, sync, backup, encryption or access control. Source timestamps use the device clock. Expiry changes freshness, not record retention. Offline reload and manual keyboard/screen-reader checks are pending.

**Next:** ACCESSIBILITY-MAP-003 — add PostgreSQL migrations and repository tests with a disposable database. PR #7 is stacked on prep PR #6; retarget it to `main` only after #6 merges.
