# Changelog

All notable changes to this project are documented here.

## 2.1.x - Project Cleanup, Refactor, and Hardening

- Test Infrastructure
  - Added `jest.setup.js` to initialize `@testing-library/jest-dom`, normalize `NODE_ENV`, and provide a `fetch` polyfill fallback.
  - Removed legacy duplicate tests under `__tests__/` that referenced non-existent modules and conflicted with `src/__tests__`:
    - Deleted `__tests__/components/LineupManager.test.tsx` (duplicate of `src/__tests__/components/LineupManager.test.tsx`).
    - Deleted `__tests__/lib/cache.test.ts` and `__tests__/utils/test-helpers.ts` (legacy files targeting removed APIs).

- Security
  - Eliminated hardcoded Sentry DSN by removing `src/instrumentation-client.ts`. The supported client instrumentation remains at `src/app/instrumentation-client.ts`, which reads DSN from environment.
  - Consolidated security configuration usage to `src/lib/security-config.ts`:
    - Removed duplicate and divergent `src/lib/security/security-config.ts`.
    - Updated `src/app/api/system/security/route.ts` to use `SecurityConfigHelpers` for CSP header generation.
    - Added `SecurityConfigHelpers.getSecurityHeaders()` helper for consistent API responses.

- API Routes
  - Moved health endpoint into the `src` application tree for consistency:
    - Added `src/app/api/health/route.ts`.
    - Deleted `app/api/health/route.ts`.

- Package Scripts
  - Removed stale `socket:dev` script that referenced a non-existent `server.js` in the repository (the production image correctly runs `.next/standalone/server.js`).

- Orchestration
  - Added `scripts/run-all.ps1` (Windows PowerShell) and `scripts/run-all.sh` (Unix/macOS) to install deps, run checks, build, optionally build+run Docker, and hit health endpoint.

## Notes

- Docker production image remains multi-stage and non-root; healthcheck is preserved via `/api/health`.
- Next.js configuration maintains strong security headers and CSP. CSP usage in middleware and API responses is now more consistent.
