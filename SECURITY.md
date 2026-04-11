# Security Notes — Known Issues

## ZXP Signing Password (CRITICAL)

**File:** `fastfx-1.0.5/cep.config.ts` line 42

```typescript
password: 'TackZxpcert17!'
```

The Adobe CEP signing certificate password is hardcoded in plain text in the build config. This is the password to the ZXP signing certificate that proves these are official Tiny Tapes plugins.

**Followup work needed:**
1. Rotate the signing certificate (new keypair) and update the password
2. Move the new password to an environment variable: `process.env.ZXP_SIGN_PASSWORD`
3. Update `cep.config.ts` to read from env, with a `.env.local` (gitignored) for local builds
4. Document the new env var in the README
5. Consider using GitHub Secrets if/when CI/CD is added

## Hardcoded WooCommerce API credentials (HIGH PRIORITY)

**File:** `fastfx-1.0.5/src/js/hooks/useVerifyOnline.ts` lines 22-23

```typescript
const username = "ck_60bbfd050bb532fc54354a7cd5104f09a203b2d0";
const password = "cs_8ea328e5927e16aab8472579b122491cf4defcff";
```

Same credentials in Surveillance and Terminal — see those repos' SECURITY.md for the rotation plan.

## Static license encryption key (MEDIUM PRIORITY)

**File:** `fastfx-1.0.5/src/js/utils/license.utils.ts` line 119

```typescript
const key = CryptoJS.SHA256(appData.productAuthor); // = SHA256("TinyTapes")
```

The license encryption key is `SHA256("TinyTapes")` — deterministic and trivially derivable. If this key is changed, all cached licenses on customer machines invalidate.

**Followup work:** rotate to a non-deterministic key with a migration path (try old key first, fall back to new key, rewrite cache).

## Two source variants exist (NOT a security issue but worth knowing)

This repo currently includes only the active production source (`fastfx-1.0.5`, license-based). The original folder layout had a second variant (`FastFX_Sub_src` for a subscription model) which is a template that was never activated. It's not in this repo. If you ever need to revisit subscription support, the template lives in the original `Plugins Vladyslav/Source Code/_extracted/FastFX_Sub_src` folder.

## Multiple Premiere version installers were excluded

The original folder had `22-25/` and `26/` subfolders containing compiled installer ZIPs for different Premiere versions. These are release artifacts (not source) and were excluded from this repo. They live in `Plugins Vladyslav/FINAL Source Code to Check/_extracted/_unpacked/fastfx/22-25/` and `26/` on Jakob's machine. If you need them as release artifacts, attach them to GitHub Releases instead of committing.
