# v10.0 — Real-World Validation & Trust

The governing rule of this release:

> **The AI is never the source of truth.**
>
> `REAL SYSTEM → TELEMETRY → DIAGNOSTIC ENGINE → EVIDENCE → CORRELATION ENGINE → FINDING MODEL → (UI / REPORT / AI ASSISTANT)`
>
> The assistant interprets structured evidence. It never invents a telemetry value.

Two corollaries are enforced in code, not in documentation:

1. **We never say "healthy" when we simply could not look.** A subsystem that lacked permission, hit a missing binary, or timed out reports `UNAVAILABLE` (⚪), and is excluded from the health score rather than counted as passing.
2. **We never present an estimate as a fact.** Every evidence item carries a quality grade, and estimates render as `~18% (estimated)` with the estimation method attached.

Status: **P0 (items 1–10) complete — 42 automated acceptance tests, all passing**, alongside the existing v8 and v9 suites.

---

## P0 — Must have

### 1. Real-device validation matrix
Diagnostics are pure functions of telemetry, so the same inputs produce the same *semantic* result on Apple Silicon and Intel, on the current and previous macOS, on developer Macs, low-storage Macs, battery-heavy Macs, multi-display setups, and corporate-managed Macs. Environment differences show up as **coverage**, never as a silently different verdict.

* `aggregateReports()` reports `coverage.coveragePct` separately from `healthScore`, plus a `scoreQualifier` — *"1 subsystem(s) could not be evaluated; this score describes only what was observable."*

### 2. macOS permission matrix
`server/core/permissions.js` — 23 features × 10 permission dimensions (none, user, admin, Full Disk Access, Accessibility, Screen Recording, Camera, Microphone, Developer Tools, Network). Every feature resolves to exactly one of `AVAILABLE | LIMITED | REQUIRES_PERMISSION | UNSUPPORTED | FAILED`.

`GET /api/permissions` **no longer hardcodes `isElevated: true`.** Elevation is now probed (`process.getuid()`), and Full Disk Access is probed by attempting to read the TCC directory. Anything undeterminable is reported *not granted* — the safe direction, because it downgrades availability instead of over-claiming health. MDM-blocked permissions are explained as policy ("cannot be granted locally") rather than as user error.

### 3. Evidence quality layer
`server/core/evidence.js` — every datum is `observed` / `inferred` / `estimated` / `stale` / `unavailable`, with trust weights `1.0 / 0.8 / 0.5 / 0.35 / 0.0`.

* Unavailable evidence **cannot** carry a value (`value === null`, enforced).
* Estimates render `~X (estimated)` and must declare an `estimationMethod`.
* Samples auto-demote to `stale` past their freshness budget.
* Confidence is **capped** by evidence quality: an all-estimated finding cannot claim high confidence.

### 4. Diagnostic confidence calibration
`server/core/calibration.js` tracks prediction vs. real experiment outcome per category (memory / network / battery / crash / storage / thermal / security / developer).

* A prediction **cannot be resolved without citing an evidence source**.
* Resolution is immutable — history cannot be rewritten.
* Sustained over-confidence damps future scores (a category running 95% predicted / 40% actual gets multiplied down).
* **A single experiment is never promoted to permanent causal truth**: a category stays `trustworthy: false` and the multiplier stays neutral until ≥ 5 resolved samples.

### 5. Chaos / fault injection
`server/chaos/fault-injector.js` — 11 scenarios: permission denied, missing binary, malformed output, corrupted JSON, timeout, process gone, file gone, insufficient space, subsystem down, privileged helper unavailable, network down.

Each is asserted to be **safe** (terminal `FAILED` state, no partial mutation), **explainable** (user-facing message + remediation), and **recoverable** (explicit `recoverable` flag + correct HTTP status). Disarmed by default.

### 6. API contract tests
`server/contracts/api-schemas.js` — dependency-free request, response and error schemas.

Malformed macOS output **cannot** produce a malformed API response: outbound payloads are validated, and a failing payload is *withheld* and replaced by a well-formed `CONTRACT_VIOLATION` envelope. Inbound, `port: "; rm -rf /"` is rejected with a 400 before anything touches the system. Live proof: `GET /api/v10/contracts/enforcement-demo`.

### 7. Operation IDs
Every mutative action gets `op_8f91a2` with a timestamped lifecycle: `REQUESTED → AUTHORIZED → EXECUTING → VERIFYING → COMPLETED`. Verification compares a **before** and **after** snapshot and fails honestly — *"Action executed but post-execution telemetry did NOT confirm the intended change. Treat as unresolved."* Sensitive parameters are redacted in the ledger. Query via `GET /api/v10/operations/:id`.

### 8. Action idempotency
`server/runtime/idempotency.js` — idempotency keys, resource locks, per-action cooldowns and rate limits.

Verified live: **five rapid POSTs to `/api/actions/kill-port` produced one execution and four deduplicated replies, all returning the same `op_5f3a15`.** `process.killPort` cannot run 20× on a double-click. Suppressed requests return 429 with `retryAfterMs` and confirmation that nothing changed.

### 9. Offline-first & degraded mode
`server/runtime/degraded-mode.js` — all 12 local capability groups work with no internet. The 6 online-only checks are explicitly optional and each declares an offline fallback. `runProbe()` converts any failure into a structured `UNAVAILABLE` result, so **one failing probe degrades a card, never the dashboard**; hanging probes are aborted on a timeout budget. Live proof: `GET /api/v10/runtime/resilience-demo`.

### 10. Privacy-preserving reports
`server/privacy/redactor.js` — 13 categories: usernames, home paths, emails, IPs, MACs, hostnames, SSH paths, tokens, API keys, URL credentials, env vars, serials, sensitive filenames.

* **Environment variables are never blindly exported.**
* Identity is redacted **by key as well as by pattern** — `"user": "jane.doe"` is redacted even when `jane.doe` is not the account running the server.
* Redaction is deterministic, so a report stays internally correlatable without revealing identity.
* The privacy panel shows a **count plus masked previews** (`jan***om`), never the raw value.
* Loopback (`127.0.0.1`) is preserved — it carries no identity and matters diagnostically.

---

## New endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v10/health` | Unified global health contract with coverage + self-validation |
| `GET /api/v10/permissions/matrix` | Feature × permission availability matrix |
| `GET /api/v10/permissions/scenarios` | All 10 permission scenarios resolved |
| `GET /api/v10/runtime/status` | Offline-first posture and optional online checks |
| `GET /api/v10/runtime/resilience-demo` | Proof that failing probes don't fail the page |
| `GET /api/v10/operations`, `/:id` | Operation ledger with full timelines |
| `GET /api/v10/calibration` | Per-category prediction accuracy |
| `POST /api/v10/calibration/resolve` | Resolve a prediction against a real outcome |
| `GET /api/v10/chaos/status`, `POST .../arm`, `.../disarm` | Fault injection control |
| `POST /api/v10/privacy/preview` | Redaction preview with counts |
| `GET /api/v10/contracts/schemas` | The published API contract |
| `GET /api/v10/contracts/enforcement-demo` | Proof malformed output can't escape |

## Changes to existing behaviour

* `GET /api/permissions` — probed, not hardcoded (was always `isElevated: true`).
* `POST /api/actions/kill-port` — guarded; verifies the port was bound before and is free after.
* `POST /api/actions/purge-ram` — guarded; **reclaimed memory is now measured** from real `os.freemem()` deltas (was a hardcoded 512 MB).
* `POST /api/actions/execute-cleanup` — guarded; **reclaimed space is now measured** via `statfs` before/after (was a hardcoded 11.8 GB). Where it can't be measured, it reports `"measurement": "unavailable"` rather than guessing.
* `server.js` — v10 banner, contract-shaped 404 and error handlers, boot-time runtime posture line.
* `server/models/finding.js` — v10 evidence schema, quality-capped confidence, calibration pass. v9 evidence still works and is projected to `legacyEvidence`.

## Running

```bash
npm test          # v8 + v9 + v10 suites
npm run test:v10  # 42 P0 acceptance tests
npm run server    # http://127.0.0.1:3131
```

## Not yet implemented

P1 (#11–18 incident pages, "Why NOT?" reasoning, experiments, attribution, histories), P2 (#19–26 support bundles, quarantine, hardware inventory, migrations, GC model) and P3 (#27–30 Windows providers). The P0 foundation these depend on — the contract, evidence layer, operation ledger and provider-neutral intelligence core — is in place.
