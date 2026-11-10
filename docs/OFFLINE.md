# Offline behavior

The service worker stores only the public shell and versioned static assets; it never caches API responses or personalized records. ACCESSIBILITY-MAP-001/002 add browser-local Dexie drafts and route-segment observations, with no server write or cross-device sync. The local flow may work after its UI is loaded, but offline reload and recovery have not been verified. Do not claim reliable offline use until those checks pass.

Freshness expires six hours after the entered source time. Expired observations remain stored until the user deletes them or clears browser storage; stale records must never be treated as current route evidence. There is no conflict handling, encryption, backup or recovery.
