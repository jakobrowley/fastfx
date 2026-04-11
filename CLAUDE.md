# CLAUDE.md — FastFX

> **For Claude Code:** This file is loaded automatically when you open any session in this folder. Always also load `~/Plugins/_shared/CUSTOMER_BUG_INVESTIGATION.md` for the bug-fix mental model.
>
> **For Claud (the support agent):** This is your reference for everything about FastFX. You don't need to memorize it — just know it's here so you can ask Claude Code to look things up.

---

## What FastFX Is

FastFX is an **Adobe Premiere Pro CEP extension** that gives editors one-click access to a curated library of effect presets — film looks, glitches, B&W, CRT, thermal, night vision, etc. The user clicks a preset thumbnail in the panel and FastFX applies the corresponding effect to the selected clip in their Premiere sequence.

It's the **highest-volume plugin** in the catalog (~1,500+ customers), so bugs here have the broadest impact and bug fixes here have the highest payback.

---

## Technology Stack (verified by source inspection)

| Component | Technology |
|---|---|
| **Plugin framework** | CEP 9 (Common Extensibility Platform), CSXS manifest version 6.0, RequiredRuntime 9.0 |
| **Host app** | **Premiere Pro only** (`HostList: PPRO, version [0.0,99.9]` — works on every Premiere version) |
| **Panel UI** | React 18.2 + TypeScript + Mantine UI 7.12 component library |
| **Build tool** | Vite 4.5 + `vite-cep-plugin` (custom CEP bundler) |
| **ExtendScript** | Compiled from TypeScript via Rollup, output as `.jsxbin` (binary) for production |
| **Package manager** | npm (also has `yarn.lock` as fallback) |
| **Current version** | 1.0.5 (defined in `package.json:3`) |

**Important:** the folders `Premiere Pro 2022-2025/` and `Premiere Pro 2026/` in the distribution **contain identical code**. There is no version-specific code branching. The same FastFX 1.0.5 build works on every Premiere version from 2022 onward.

---

## File Structure

```
fastfx-1.0.5/
├── src/
│   ├── js/                          # React/TypeScript panel UI
│   │   ├── main/
│   │   │   ├── index.html           # CEP panel entry point
│   │   │   ├── index.tsx            # React root + license verification
│   │   │   ├── main.tsx             # Main UI component
│   │   │   └── theme.ts             # Mantine theme
│   │   ├── components/              # 13 React components
│   │   │   ├── LicenseForm.tsx       # ⚠️ OFF-LIMITS — license gate
│   │   │   ├── Preview.tsx
│   │   │   ├── CategoryPanel.tsx
│   │   │   ├── PresetsList.tsx
│   │   │   └── [...]
│   │   ├── context/
│   │   │   ├── license.context.tsx  # ⚠️ OFF-LIMITS — license state
│   │   │   └── main.context.tsx     # Application state (settings, sliders)
│   │   ├── hooks/
│   │   │   ├── useApply.ts          # Effect application logic ✅ SAFE
│   │   │   ├── useVerifyOffline.ts  # ⚠️ OFF-LIMITS — license verify
│   │   │   └── useVerifyOnline.ts   # ⚠️ OFF-LIMITS — license verify
│   │   ├── lib/
│   │   │   ├── cep/
│   │   │   │   ├── csinterface.js   # Adobe CEP API wrapper (don't modify)
│   │   │   │   ├── vulcan.js        # Inter-app communication
│   │   │   │   └── node.ts          # Node.js filesystem access
│   │   │   └── utils/
│   │   │       ├── bolt.ts          # 🔧 CRITICAL — CEP↔ExtendScript bridge
│   │   │       ├── ppro.ts          # Premiere Pro utility functions
│   │   │       └── cep.ts           # General CEP utilities
│   │   ├── utils/
│   │   │   ├── license.utils.ts     # ⚠️ OFF-LIMITS — encryption/decryption
│   │   │   └── presets.utils.ts     # ✅ SAFE — preset loading
│   │   └── config/                  # ✅ SAFE — config files
│   │       ├── button.config.ts     # UI button definitions
│   │       ├── categories.config.ts # Effect category metadata
│   │       ├── error.config.ts      # Error code mapping (401-423)
│   │       └── slider.config.ts     # Editable slider definitions
│   ├── jsx/                         # ExtendScript code (runs INSIDE Premiere)
│   │   ├── index.ts                 # Entry — registers module namespace
│   │   ├── ppro/
│   │   │   ├── ppro.ts              # 🔧 ~500 lines, main effect application
│   │   │   ├── ppro-utils.ts        # Premiere API helpers
│   │   │   └── globals.ts           # Premiere constants
│   │   ├── utils/utils.ts
│   │   ├── assets/                  # Effect preset .prproj files
│   │   │   ├── b&w/, crt/, film-accent-lines/, film-flickers/, night/, punch-holes/, thermal/
│   │   └── lib/json2.js             # JSON polyfill for ExtendScript
│   └── shared/shared.ts             # ⚠️ OFF-LIMITS — license patterns
├── cep.config.ts                    # ⚠️ OFF-LIMITS — contains signing password
├── vite.config.ts                   # Vite bundle config
├── vite.es.config.ts                # ExtendScript bundle config
└── package.json                     # v1.0.5
```

---

## Build Pipeline

```bash
# Install dependencies (one-time, after cloning)
npm install

# Development mode — opens local CEP debugger on http://localhost:3000
npm run dev

# Production build (unsigned, for testing)
npm run build

# Production build (signed ZXP — what gets shipped)
npm run zxp

# Production build (zip alternative)
npm run zip
```

**Output locations:**
- `npm run build` → `dist/cep/` (unpackaged plugin folder)
- `npm run zxp` → `dist/zxp/` (signed `.zxp` installer)
- `npm run zip` → `dist/zip/` (zipped plugin folder)

**To install the just-built version into Premiere for testing:**
1. Run `npm run dev` (or `npm run build`)
2. The build output is auto-symlinked to Premiere's CEP extensions folder via `vite-cep-plugin`
3. Restart Premiere Pro
4. Window → Extensions → FastFX

---

## Core Architecture

### Entry point flow

1. Premiere loads `dist/cep/index.html`
2. React mounts in `src/js/main/index.tsx`
3. `useVerifyOffline()` runs immediately to check cached license
4. If licensed → renders `<Main />`. If not → renders `<LicenseForm />`.

### State management

**License state** (`src/js/context/license.context.tsx`):
- `il` = isLicensed (boolean)
- `lec` = licenseErrorCode (number)
- `slk` = savedLicenseKey (string)
- `sa` = savedActivation (number | null)
- `e` = email (string)

**App state** (`src/js/context/main.context.tsx`):
- `settings` = current effect selection (category, preset, fx array)
- `sliders` = editable slider values (intensity, etc.)

### How the panel talks to Premiere

The panel JS (running in Chromium webview) communicates with Premiere's ExtendScript engine via a wrapper called `bolt.ts`:

```typescript
// Type-safe call from React → ExtendScript:
evalTS('apply', settings, sliders, isMac)
// Translates to:
//   csInterface.evalScript("host.fastfx.apply(...)", callback)
// Which runs inside Premiere as:
//   src/jsx/ppro/ppro.ts → export const apply(...)
```

`bolt.ts` is the **most important file** for understanding how this plugin works. When debugging anything related to "the panel calls Premiere but nothing happens," start there.

---

## ⚠️ OFF-LIMITS FILES — NEVER MODIFY

These files contain license validation, payment, or signing infrastructure. Modifying them risks breaking the license system or exposing security secrets.

| File | Why it's off-limits |
|---|---|
| `src/js/hooks/useVerifyOnline.ts` | Contains hardcoded WooCommerce API credentials at lines 22-23. Calls `tinytapes.com/wp-json/lmfwc/v2/licenses/activate/` and `/validate/`. |
| `src/js/hooks/useVerifyOffline.ts` | Decrypts the cached license file. |
| `src/js/utils/license.utils.ts` | License key pattern validation, encryption (AES via CryptoJS, key derived from `SHA256("TinyTapes")`), error codes (base64-obfuscated). |
| `src/js/context/license.context.tsx` | License React Context provider. |
| `src/js/components/LicenseForm.tsx` | License entry UI. |
| `src/shared/shared.ts` | License key regex patterns and product metadata. |
| `cep.config.ts` | **Contains the ZXP signing password in plain text** at line 42 (`password: 'TackZxpcert17!'`). Treat this file as a vault — never paste its contents anywhere. |

**If a customer's bug seems related to license activation, license validation, or "license invalid" errors → escalate immediately. Do not attempt to fix.**

---

## Common Bug Categories (where bugs actually live)

### 1. Effect application bugs (most common)
The customer applies a preset and either nothing happens or the wrong thing happens.

**Where to look first:**
- `src/jsx/ppro/ppro.ts` — the `apply()` function and any helpers it calls
- `src/jsx/ppro/ppro-utils.ts` — Premiere API helpers
- `src/js/hooks/useApply.ts` — the React hook that triggers the apply

**Common causes:**
- Premiere version-specific API differences (the same call works on Premiere 2024 but not 2025)
- Asset path issues — `src/jsx/ppro/ppro.ts:99` hardcodes `Folder(File($.fileName).parent.fsName + '/assets')` — if assets are missing, effects break silently
- Selection state issues (no clip selected, wrong track type, etc.)

### 2. UI / preset display bugs
The panel doesn't show a preset, shows the wrong thumbnail, or has a broken layout.

**Where to look first:**
- `src/js/components/PresetsList.tsx`
- `src/js/components/CategoryPanel.tsx`
- `src/js/config/categories.config.ts` — preset metadata
- `src/js/config/button.config.ts` — button definitions

### 3. Slider / parameter bugs
The user moves a slider and the effect doesn't change as expected.

**Where to look first:**
- `src/js/config/slider.config.ts` — slider definitions
- `src/js/context/main.context.tsx` — slider state
- `src/jsx/ppro/ppro.ts` — how slider values get applied to the effect

### 4. Error message bugs
The user sees a generic or unhelpful error.

**Where to look:**
- `src/js/config/error.config.ts` — error codes 401–423 mapped to user-facing messages

### 5. CEP↔ExtendScript bridge bugs
The panel shows "loading" forever, or buttons don't seem to do anything.

**Where to look:**
- `src/js/lib/utils/bolt.ts` — the bridge
- Open Chrome DevTools via `localhost:8088` (Adobe CEP debugging) and watch the console for evalScript errors

---

## Versioning

Current version: **1.0.5** (set in `package.json:3` and auto-propagated to the CEP manifest at build time via `cep.config.ts`).

**Two source variants exist:**
- `FastFX_License_src/` — **active production code**, one-time license model. This is what's shipped.
- `FastFX_Sub_src/` — **template only**, intended for a future subscription model. Not currently active. Don't modify unless explicitly working on subscription support.

When in doubt about which source to use → **always use `FastFX_License_src/`** (or the most recent versioned zip in `FINAL Source Code to Check/_extracted/TinyTapes/FastFX/`).

---

## Adobe API Reference

When debugging code that calls into Premiere Pro:

```
~/Plugins/_shared/api-reference/PR.md       # Premiere Pro ExtendScript API
~/Plugins/_shared/api-reference/CEP.md      # CEP framework, CSInterface.js, Vulcan.js
```

**Mandatory workflow:** before guessing at any Premiere API call, grep `PR.md` for the function or object name. Adobe APIs change between Premiere versions and have many version-specific gotchas — `PR.md` documents them. Run `/lookup <api-name>` for one-keystroke access.

---

## Diagnostic Tools

### Adobe CEP Remote Debugging (the killer tool)

Once enabled, you can use full Chrome DevTools on the live FastFX panel running inside Premiere — including the React tree, console, network, and breakpoints.

**One-time setup:**
1. Mac: open Terminal → `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
2. Windows: `regedit` → `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` → new String entry `PlayerDebugMode = 1`
3. (Use the CSXS version matching the customer's Premiere — CSXS.11 for 2023+, CSXS.12 for 2024+, etc.)

**Per-session usage:**
1. Verify `.debug` file exists at the FastFX extension root with port 8088 and Host ID `PPRO`
2. Launch Premiere → open FastFX panel
3. Open Chrome → `http://localhost:8088/`
4. Click the FastFX entry → full Chrome DevTools opens
5. Set breakpoints, inspect React state, watch network calls

### Sentry telemetry

If Sentry is wired up (see plan Component L), check the Sentry dashboard for any errors tagged with this customer's email or license ID before doing anything else. Often Sentry already has the answer.

Run `/sentry-check <customer-email>` in Claude Code to query Sentry directly.

---

## Hard Rules (no exceptions)

1. **NEVER touch the OFF-LIMITS files listed above.** If a fix would require it → escalate.
2. **NEVER modify `cep.config.ts`** — it contains the signing password. If signing config needs changing → escalate.
3. **NEVER push a build that hasn't passed `/smoketest`.**
4. **One-customer beta is mandatory** — every source change goes to ONE customer first via the unguessable `/beta/<random-id>/` URL before broad release.
5. **2-hour budget** — if you've spent 2 hours on a ticket and aren't at the fix-and-test stage, escalate via `/escalate`.
6. **Sentry first** — always check `/sentry-check` before doing anything else.
7. **Run `/learn` at ticket close** — every closed ticket teaches the system something.

---

## Known Tech Debt / Gotchas

1. **License signing password is hardcoded** in `cep.config.ts:42`. Cannot fix without re-signing infrastructure — escalate any signing-related bugs.
2. **WooCommerce API credentials are exposed** in `useVerifyOnline.ts:22-23`. Same credentials are in Surveillance, Terminal — they all need to be revoked and replaced (separate project from bug fixing).
3. **License encryption key** is `SHA256("TinyTapes")` — deterministic. If you change "TinyTapes" anywhere, all cached licenses invalidate.
4. **Offline grace period** is 3 days (set in `useVerifyOnline.ts:114`). After 3 days without internet, customers get error 504.
5. **Error 510** = "plugin is unlicensed" → customer sees the LicenseForm. This is the most common license-related support ticket.
6. **`useVerifyOffline.ts:28`** has a commented-out line `// remove me` — leftover from a refactor. Don't be confused by it.
7. **No actual code differences** between the "Premiere Pro 2022-2025" and "Premiere Pro 2026" distribution folders — same build, same code.

---

## Escalation Tripwires (auto-escalate immediately, no judgment call)

Run `/escalate` and STOP if any of these apply:

- The bug touches any file in the OFF-LIMITS list
- The bug involves license activation, validation, or the `tinytapes.com` API
- The bug requires changing `cep.config.ts` (signing config)
- The bug requires more than ~30 lines changed across more than 3 files
- The build pipeline fails twice in a row in a way you don't understand
- Code signing or notarization breaks
- The customer is a high-value account (Jakob will flag these in advance)
