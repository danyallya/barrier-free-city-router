# Decision log

## 0001 — Independent repository

Each product owns its history, task queue and release boundary.

## 0002 — Shell cache is not offline product data

The service worker stores public shell only. Records need an explicit local schema, conflict policy and recovery review.

## 0003 — Verify provider terms before integration

External sources require verified official terms, attribution, server-side credentials and visible source timestamps.

## 0004 — Expire observation freshness without erasing its history

The local prototype gives a segment observation a six-hour freshness window measured from source time. Expiry changes how recent the report is; it does not verify accessibility or delete the report. Records remain on the device until explicitly deleted or browser storage is cleared.
