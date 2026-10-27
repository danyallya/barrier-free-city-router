# Active task

**ID:** ACCESSIBILITY-MAP-003
**Title:** Add PostgreSQL migrations and repository tests.

## Context

The first route-observation slice is a local prototype. Add durable storage without treating community reports as verified route accessibility.

## Acceptance criteria

- Add a versioned PostgreSQL schema for route-segment observations and freshness expiry.
- Add repository operations and integration tests against a disposable database.
- Document retention, deletion, provenance and the difference between report freshness and verified accessibility.
- Keep route generation and map-provider integration out of this task.

## Status

Not started. Use `map/accessibility-map-003-postgres-repository` after ACCESSIBILITY-MAP-001/002 are reviewed and merged.

## Completed on the day-1 branch

- ACCESSIBILITY-MAP-001 — Model a route segment with accessibility observation and expiry.
- ACCESSIBILITY-MAP-002 — Validate observations and add empty, error and deletion states.

Evidence: `docs/days/day-001.md`. Both tasks are complete locally, pending PR review and merge.
