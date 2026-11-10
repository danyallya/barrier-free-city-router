# Security and data policy

- Collect the minimum data; treat user content as private by default.
- No authentication, authorization, encryption-at-rest or production backup policy exists yet. Do not enter real sensitive data.
- Keep secrets in untracked .env; never expose DB/provider keys to browsers.
- Never cache APIs, authenticated pages or personal records in the service worker.
- Define export, deletion, retention, access logs and incident response before launch.
- Domain guardrail: Never promise a route is accessible without fresh evidence; show uncertainty and source time.
- Review threat model, roles and offline-device recovery before launch.

## ACCESSIBILITY-MAP-001/002 local observations

- Store only public segment labels, an entered source time, report source and structured step-free/lift/obstacle observations. Do not enter home addresses, personal names, coordinates, private travel plans or free-text notes.
- The report source is a user statement and is not verified. The app has no live condition check, route engine or map-provider integration; it never certifies a route as accessible.
- A report's six-hour freshness window starts at source time. Expiry does not delete the record; the user can delete it at any time. Remaining records stay in browser-local IndexedDB until deletion or browser-storage clearing.
- Timestamps use the device clock and may be inaccurate. This prototype has no identity verification, encryption, access control, backup or sync; do not store sensitive travel information.
