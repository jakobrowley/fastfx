/**
 * Sentry telemetry for FastFX.
 *
 * This module centralizes Sentry configuration so the entry point stays clean
 * and so we can easily disable or reconfigure telemetry in one place.
 *
 * Why this exists:
 *   - Automatically capture JavaScript errors from the React panel
 *   - Automatically capture ExtendScript errors bridged via bolt.ts
 *   - Give the Tiny Tapes support agent (Claud) real-time visibility into
 *     what's failing on customers' machines via the Sentry dashboard
 *   - Enable Sentry's Seer AI to auto-triage and draft fix PRs
 *
 * Privacy:
 *   - We do NOT send the customer's license key (we send a hash instead)
 *   - We do NOT enable Session Replay (could capture sensitive panel content)
 *   - We do NOT enable performance tracing in v1 (can add later if needed)
 *   - We DO send: stack traces, breadcrumbs, OS, Premiere version, plugin version, user email (from license)
 *
 * See also:
 *   - The SECURITY.md in the repo root documents the credentials-in-source issue
 *   - ~/Plugins/_shared/sentry-secrets.md for the DSN (not committed to source)
 */

import * as Sentry from '@sentry/react';
import pkg from '../../../package.json';

// The DSN is a public identifier — safe to embed in client code per Sentry's threat model.
// If someone abuses it, we can rotate from the Sentry dashboard.
const SENTRY_DSN =
  'https://05f5a6ee40156c355d7377ffb61fb588@o4511201510096896.ingest.us.sentry.io/4511201513111552';

let initialized = false;

/**
 * Initialize Sentry. Call this ONCE, as early as possible in the app lifecycle,
 * before any other code runs.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    release: `fastfx@${pkg.version}`,
    environment: 'production',

    // Keep v1 minimal: error tracking only, no tracing, no replay, no extras.
    // We can opt in to these later once we know the baseline error volume.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Do not send default PII (IPs, URLs). We only send what we explicitly tag.
    sendDefaultPii: false,

    // Tags every error will carry. Custom per-error tags can be added via setTag().
    initialScope: {
      tags: {
        plugin: 'fastfx',
        host_app: 'premiere',
      },
    },

    // Filter out noise before sending to Sentry.
    beforeSend(event) {
      // Drop events with no meaningful stack trace (usually ad blockers / extensions).
      if (
        event.exception?.values?.every((v) => !v.stacktrace || v.stacktrace.frames?.length === 0)
      ) {
        return null;
      }
      return event;
    },
  });
}

/**
 * Set the user context after the license has been verified. This lets Claud
 * search Sentry by customer email to find a specific customer's errors.
 *
 * We hash the license key instead of sending it raw so we never transmit
 * secrets — the hash is still stable per-customer so we can correlate errors.
 *
 * KNOWN ISSUE (detected by Sentry Seer during PR review):
 * useVerifyOnline.ts currently hardcodes the customer email to
 * "test@gmail.com" on lines 83 and 85. Until that pre-existing bug is fixed
 * in a separate PR, we defensively detect the known bad value and skip the
 * email field — the license hash still provides a stable per-customer ID so
 * error correlation works even without the real email. Once the upstream
 * bug is fixed, real emails will flow through here automatically.
 */
const KNOWN_PLACEHOLDER_EMAILS = new Set(['test@gmail.com', 'test@test.com', '']);

export function setSentryUser(email: string, licenseKey: string | undefined): void {
  if (!initialized) return;
  const isPlaceholder = KNOWN_PLACEHOLDER_EMAILS.has((email || '').toLowerCase().trim());
  Sentry.setUser({
    // Skip email if it's the known hardcoded placeholder from useVerifyOnline.ts.
    // The license hash below still gives us a stable per-customer ID.
    email: isPlaceholder ? undefined : email,
    id: licenseKey ? hashLicenseKey(licenseKey) : undefined,
  });
}

/**
 * Set host-app-specific context. Call once after CSInterface is ready so every
 * subsequent error is tagged with the customer's Premiere version and OS.
 */
export function setSentryHostContext(hostVersion: string, os: string): void {
  if (!initialized) return;
  Sentry.setTag('host_app_version', hostVersion);
  Sentry.setTag('os', os);
}

/**
 * Explicitly capture an error with an optional context message. Use this for
 * caught exceptions that you want Sentry to know about.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}

/**
 * Simple non-cryptographic hash for license keys. We never send raw keys to
 * Sentry — this hash is stable per-customer and lets Claud correlate errors
 * without exposing secrets.
 */
function hashLicenseKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return 'lic_' + Math.abs(hash).toString(36);
}

// Re-export Sentry so consumers can use <Sentry.ErrorBoundary> etc. without
// a separate import.
export { Sentry };
