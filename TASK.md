# Active task

**ID:** ACCESSIBILITY-MAP-001  
**Title:** Model a route segment with accessibility observation and expiry.

## Context

The technical shell exists; the product workflow does not. Build the first safe, end-to-end domain slice for Barrier-Free City Router.

## Acceptance criteria

- Type the route-segments domain record, validation rules and lifecycle.
- Add a create/review flow that works without a server round-trip.
- Persist a draft with Dexie and show saved, unsaved and sync state truthfully.
- Test valid/invalid input, date/order boundaries and serialization.
- Document retention, deletion and limitations of the offline slice.
- Respect this guardrail: Never promise a route is accessible without fresh evidence; show uncertainty and source time.

## Status

Not started. Use map/001-accessibility-map. After acceptance passes, update progress and set the next task.
