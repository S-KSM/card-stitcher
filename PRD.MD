# Card Stitcher — Product Requirements Document

**Platform:** Progressive Web App (installable on iOS, Android, macOS, Windows). Native wrappers (Tauri) considered for later phases.
**Version:** 2.0 — Web-First Edition
**Date:** April 2026
**Status:** Draft — supersedes v1.1 (React Native edition)
**Target Release:** Phase 1 — Q2 2026 (PWA public beta). Phase 2 — Q3 2026 (paywall + shareable links). Phase 3 — Q4 2026 (Tauri native wrappers if signal warrants).

---

## 0. Changelog

### v2.0 (this document)
- Platform pivoted from "React Native, App Store + Play Store launch" (v1.1) to **Web PWA first, native later**.
- Added LLM-powered autofill with **Bring-Your-Own-Key** across three providers: Anthropic (Claude), OpenAI (GPT), Google (Gemini).
- Added verbatim message-transcription field alongside the short "personal note".
- Expanded occasion taxonomy from 6 values to 16 (specific holidays: New Year, Valentine's, Easter, Mother's/Father's Day, Thanksgiving, Christmas, Hanukkah, Eid, Diwali, plus the original life-event categories).
- Documented implementation status against the shipped MVP (`src/`).
- Added monetization roadmap (Stripe / Paddle paywall, BYOK as free tier).

### v1.1 → v2.0 rationale
Building and launching a React Native app on both stores — PRD'd in v1.1 — is ~6 months of dual-platform engineering plus $99 + $25 developer fees, App Review risk, and a 15–30% IAP cut on any monetization. A PWA reaches the same four platforms (iOS, Android, macOS, Windows) from a single web codebase, deploys in minutes, skips App Review entirely, and keeps 100% of Stripe revenue. The PRD pivots to that path. Native wrappers via Tauri 2 remain on the roadmap for Phase 3 if store presence proves valuable.

---

## 1. Executive Summary

Card Stitcher is a privacy-first web app, installable on phone, tablet, and desktop, that solves an emotionally meaningful problem: when you scan a physical greeting card — birthday, wedding, sympathy, holiday — you end up with multiple disconnected image files. There is no delightful way to reassemble them into a single digital artifact that preserves the experience of owning and re-reading that card.

Card Stitcher lets users import 2–8 scanned pages, arrange them by drag-and-drop, optionally auto-fill rich metadata via an LLM of their choice, and produce a polished, re-readable digital card — complete with page-flip animation, title, occasion tag, sender, date, full text transcription, and export to PDF, animated GIF, or a ZIP of originals. Everything runs client-side; the user's API key and card images never leave their device.

> **North Star:** A person who receives a 30th-birthday card signed by 40 colleagues should be able to open Card Stitcher five years later and re-experience every page of that card — exactly as it felt to hold it.

---

## 2. Problem Statement

### 2.1 The Pain

Physical greeting cards are multi-page objects. A standard tri-fold card has 4 scannable surfaces. Cards with envelopes, inserts, or photo prints add further pages. Current solutions fail predictably:

- Scanning apps (Adobe Scan, Notes, CamScanner) produce multi-page PDFs with no card-specific viewer or flip metaphor.
- Photos app treats each scan as a separate image with no structural relationship between them.
- Users resort to stitching images manually in Keynote, Canva, or Google Slides — time-consuming, not shareable, not archivable.
- Shared albums lose the page-order meaning entirely.

### 2.2 Target Users (unchanged from v1.1)

| Segment | Description | Primary Need |
|---|---|---|
| **Memory Keepers** | Adults 28–55 who digitize physical mementos | Archive cards from milestone events permanently |
| **Gift Senders** | People who mail a physical card and want a digital twin | Share a digital version with faraway recipients |
| **Grief / Sympathy** | People preserving condolence cards after loss | Preserve handwritten messages from loved ones |
| **Event Organizers** | Office managers, party planners with group cards | Digitize and distribute large signed cards |

---

## 3. Goals & Success Metrics

### 3.1 Product Goals

1. Reduce time-to-digital-card from 10+ minutes (manual) to **under 90 seconds**.
2. Ship a single codebase that installs and feels native on iOS, Android, macOS, and Windows.
3. Run **entirely client-side** for the core flow. No server required to assemble, store, or export a card.
4. Autofill metadata from card photos using the user's own LLM key — zero inference cost to us, zero data sent to our infrastructure.
5. Deliver export fidelity suitable for archival and printing.

### 3.2 Success Metrics (6 months post-launch)

| Metric | Target | Measurement |
|---|---|---|
| Time-to-first-card-assembled | < 90 sec (p75) | Local analytics event |
| D30 retention | > 35% | Anonymous cohort analysis (privacy-preserving) |
| Install rate (installed / visited) | > 18% | `beforeinstallprompt` + `appinstalled` events |
| Export rate (exports / assembled card) | > 40% | Local event |
| Autofill adoption (cards with autofill used / cards) | > 25% | Local event |
| Lighthouse PWA score | 100 | CI on every deploy |

---

## 4. Feature Specifications

### 4.1 Import

Users bring pages into the app via:

- **File picker + drag-and-drop** — multi-select up to 8 images. `react-dropzone` handles both. JPG, PNG, HEIC (browser-converted), WebP, GIF.
- **Mobile camera roll** — the same `<input type="file" accept="image/*" multiple>` shows the native picker on iOS/Android, allowing camera capture too.

**In-app camera capture** with document detection is explicitly **out of scope** for Phase 1. Users scan with any app they prefer (Notes, Adobe Scan) and import the files. This simplification is a key reason the web path is viable.

> **Constraint:** Maximum 8 pages per card.

### 4.2 Arrange

Imported pages appear as thumbnails in a horizontal strip. Users can:

- Long-press or mouse-drag to reorder (`@dnd-kit/sortable`).
- Tap a thumbnail's X to remove.
- Tap the dropzone's "+" to add more pages.
- See auto-suggested spine labels under each thumb (**Front**, **Inside L**, **Inside R**, **Back**, etc.) based on page count.

### 4.3 Viewer

The assembled card viewer is the core experience:

- Click, tap, or swipe edges to advance pages.
- Arrow keys, space, Escape — keyboard navigation.
- **CSS 3D page-flip animation** — 520ms `cubic-bezier(0.6, 0.02, 0.3, 1)`, `rotateY` around a vertical hinge, opacity fade at 80%. The outgoing page renders as an absolute overlay on top of the incoming page; it animates once via a keyframe, then unmounts on `animationend`. This architecture avoids the double-flip bug common to naive React transitions.
- Pinch-to-zoom (up to 4×) on touch; Cmd/Ctrl + mouse wheel on desktop. Double-tap / double-click toggles 2× zoom.
- Auto-hiding overlay controls — title, page counter, prev/next, share.

### 4.4 Metadata

Each card carries:

| Field | Type | Notes |
|---|---|---|
| `title` | string (≤ 80) | "Mom's 60th", "Easter Wishes" |
| `occasion` | enum (16 values) | See §4.4.1 |
| `from` | string (≤ 80) | Sender(s), from signatures |
| `to` | string (≤ 80) | Recipient, from salutations |
| `dateReceived` | ISO date | Defaults to today |
| `note` | string (≤ 280) | Short summary / personal memory |
| `message` | string (≤ 2000) | **Verbatim transcription** of all text on the card |

#### 4.4.1 Occasion taxonomy (16 values)

Life events: `birthday`, `wedding`, `graduation`, `sympathy`.
Specific holidays: `new-year`, `valentines`, `easter`, `mothers-day`, `fathers-day`, `thanksgiving`, `christmas`, `hanukkah`, `eid`, `diwali`.
Generic: `holiday` (any holiday not listed), `other`.

The library filter pill row surfaces only the occasions present in the saved cards, so the UI stays tight even though the taxonomy is broad.

### 4.5 AI Autofill (new in v2.0)

A single "Autofill with AI" button on the editor analyzes the card pages via the user's chosen LLM and returns structured JSON that populates every metadata field above, including a verbatim transcription of the card's printed greeting and handwritten message.

#### 4.5.1 Provider support

| Provider | SDK | Default model | Structured-output mechanism |
|---|---|---|---|
| **Anthropic** (Claude) | `@anthropic-ai/sdk` | `claude-opus-4-7` | `messages.parse()` + `zodOutputFormat` |
| **OpenAI** (GPT) | `openai` | `gpt-4o` | `chat.completions.parse()` + `zodResponseFormat` |
| **Google** (Gemini) | `@google/genai` | `gemini-2.5-flash` | `generateContent` with `responseSchema` |

All three share a single Zod schema and system prompt (`src/lib/providers/types.ts`), so the output is schema-identical across providers. Each SDK is loaded via a dynamic `import()` so the main bundle does not carry unused provider code.

#### 4.5.2 Bring-Your-Own-Key (BYOK)

- Users paste their own API key into Settings. Key is stored in `localStorage`, never transmitted to Card Stitcher's servers.
- Per-provider key + model stored independently (`cs:anthropic-key`, `cs:openai-key`, `cs:gemini-key`, `cs:<id>-model`, `cs:provider`).
- Up to **4 pages** per card are sent as base64-inlined images to the provider.
- System prompt is prompt-cached on Anthropic (5-minute TTL) to reduce cost on repeat runs.

### 4.6 Export & Share

| Format | Description | Library | Use case |
|---|---|---|---|
| **PDF** | Multi-page, full-resolution, embeds title / occasion as PDF metadata | `pdf-lib` | Archive, email, print |
| **Animated GIF** | Each page rendered as one frame, configurable dimension and per-frame delay, worker-based encoding | `gif.js` | Share to Messages, WhatsApp, social |
| **ZIP of images** | Original JPEGs + `card.json` metadata file | `jszip` + `file-saver` | Re-import, edit elsewhere |

**Shareable hosted links** (72 hr TTL) are deferred to Phase 2 because they require a server component.

### 4.7 Library

- Grid of saved cards with cover thumbnail, title, occasion, page count, sender.
- **Filter pills** for occasion (auto-populated from saved cards only).
- **Text search** across title, from, to.
- Edit / delete actions per card.

### 4.8 Settings

- Provider picker (Anthropic / OpenAI / Google).
- API key input (password type, per provider).
- Model input (per provider, default suggested).
- Clear key button.

### 4.9 Install

- Chrome, Edge, and Android Chromium browsers: "Install app" button on the library header, triggered by captured `beforeinstallprompt`.
- iOS Safari: same button shows a modal with the Share → Add to Home Screen instructions.
- Once installed, the button disappears (`display-mode: standalone` detection).

---

## 5. Design Specifications

### 5.1 Principles

- **Physical metaphor first** — interactions evoke holding a card.
- **Warm, not clinical** — terracotta + slate-blue accent on a cream background, serif display typeface.
- **Invisible chrome** — viewer controls fade out after 2.5 s of no interaction.
- **Zero learning curve** — fully navigable by a first-time user within 60 s.
- **Platform-appropriate where it helps** — respect iOS safe-area insets, Android back-gesture behavior, desktop hover/focus states.

### 5.2 Design Tokens

Defined in `tailwind.config.js` and `src/index.css`.

| Token | Value | Usage |
|---|---|---|
| `bg.primary` | `#FAF8F4` | App background |
| `bg.viewer` | `#2B2B2B` | Viewer backdrop |
| `accent.primary` | `#C2603A` | CTAs, active states — terracotta |
| `accent.secondary` | `#4A7CA5` | Secondary actions — slate blue |
| `ink.primary` | `#1C1C1E` | Primary text |
| `ink.muted` | `#999999` | Captions |
| `surface.card` | `#FFFFFF` | Cards, modals |
| `border.subtle` | `#E5E0D8` | Dividers |

Typography stack: `New York` / `Noto Serif` / Georgia for display; system sans (`-apple-system`, `SF Pro Text`, Roboto) for body.

Dark mode is deferred to Phase 2 polish.

### 5.3 Animation

- **Page turn**: CSS keyframe `rotateY` 0° → −150° with opacity fade, 520 ms, one-shot, unmount on `animationend`. See `src/components/viewer/PageFlip.tsx`.
- **Thumbnail reorder**: `@dnd-kit` spring transforms.
- **Overlay fade**: 200 ms opacity.
- **Flip cadence** hits 60 fps on mid-range hardware (verified via mid-animation transform sampling).

---

## 6. Screen Inventory

| Screen ID | Screen Name | Route | Key Elements |
|---|---|---|---|
| SCR-01 | Library | `/` | Grid of saved cards, occasion filter pills, search, FAB, settings, install prompt |
| SCR-02 | Editor | `/edit/:cardId` | Dropzone, thumb strip with spine labels, metadata form, autofill button, export sheet |
| SCR-03 | Viewer | `/view/:cardId` | Full-screen page-flip reader, auto-hide overlay, page counter |
| SCR-04 | Settings modal | (modal, any screen) | Provider picker, API key, model |
| SCR-05 | Export sheet | (modal, editor / viewer) | PDF / GIF / ZIP options |
| SCR-06 | Install prompt | (modal on iOS) | Share → Add to Home Screen instructions |

Onboarding is deferred; the empty state on SCR-01 is the "first-time" surface.

---

## 7. Technical Specifications

### 7.1 Stack (shipped)

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 18 + TypeScript 5 (strict) | Vite 5 bundler |
| Styling | Tailwind CSS 3 + CSS custom properties | 8 pt grid via `spacing.*` tokens |
| Routing | React Router 6 | Browser history |
| State | Zustand | Library store, Editor store |
| Drag-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Accessible, keyboard-capable |
| File drop | `react-dropzone` | Multi-file import |
| Storage | `idb-keyval` over IndexedDB | Blobs + metadata, `navigator.storage.persist()` on first save |
| PDF export | `pdf-lib` | Pure JS, embeds originals |
| GIF export | `gif.js` | Web Worker encoding |
| ZIP export | `jszip` + `file-saver` | Originals + `card.json` |
| Forms + validation | Native + `zod` | Shared schema across AI providers |
| Icons | `lucide-react` | Tree-shakeable |
| PWA | `vite-plugin-pwa` (Workbox) | Auto-update service worker, manifest, precache |
| Icon generation | `@vite-pwa/assets-generator` | Single SVG → PNG set |
| Anthropic | `@anthropic-ai/sdk` | Dynamic import, `claude-opus-4-7` default |
| OpenAI | `openai` | Dynamic import, `gpt-4o` default |
| Gemini | `@google/genai` | Dynamic import, `gemini-2.5-flash` default |

### 7.2 Directory Structure (shipped)

```
src/
  main.tsx
  App.tsx
  index.css
  routes/
    LibraryPage.tsx
    EditorPage.tsx
    ViewerPage.tsx
  components/
    arrange/          ThumbStrip, SortablePage
    export/           ExportSheet, exporters/{pdf,gif,zip}Exporter.ts
    import/           DropZone
    metadata/         MetadataForm
    pwa/              InstallPrompt
    settings/         SettingsModal
    ui/               Button
    viewer/           CardViewer, PageFlip, ZoomPanLayer, ViewerOverlay
  lib/
    ai.ts             Provider dispatcher + settings helpers
    db.ts             idb-keyval CRUD
    imageUtils.ts     EXIF-orient, downscale, blob→URL
    providers/
      types.ts        Shared schema + prompt + occasion enum
      images.ts       Page → base64 loader
      anthropic.ts
      openai.ts
      gemini.ts
  store/
    useCardStore.ts
    useEditorStore.ts
  theme/              (reserved for v2.1 dark mode work)
  types/
    card.ts           Card, PageAsset, CardMetadata, DEFAULT_METADATA, OCCASIONS
public/
  icon.svg, pwa-*.png, apple-touch-icon-180x180.png, favicon.ico
```

### 7.3 Privacy & Data Flow

- Card images + metadata live in IndexedDB on the user's device.
- Exports are generated locally and downloaded directly.
- AI autofill sends up to 4 images and the system prompt directly to the user's chosen provider, using the user's own API key. Card Stitcher's servers are not involved.
- No analytics SDK, no telemetry, no tracking pixels in Phase 1. If analytics is added in Phase 2, it will be privacy-preserving (Plausible / aggregated Workers Analytics) and toggleable.

### 7.4 Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| Cold load → usable library | < 2.0 s | Lighthouse (fast 3G throttling) |
| Page-flip animation | 60 fps on mid-tier 2023 laptop + iPhone 12 | DevTools performance sampling |
| PDF export (8 pages, full res) | < 5 s | Local timing |
| GIF export (720 p, 8 frames) | < 8 s | Local timing |
| Main JS bundle (gzip) | < 340 KB | Build output |
| Lighthouse PWA score | 100 | CI |
| Lighthouse a11y score | ≥ 95 | CI |

Current shipped build: main bundle 333 KB gz; provider chunks load on demand (Claude 23 KB, GPT 38 KB, Gemini 56 KB gz).

---

## 8. Platform Decision: Web PWA

### 8.1 Why PWA first (supersedes the React Native decision in v1.1)

1. **One codebase, four platforms.** PWA installs on iOS Safari, Android Chrome, macOS Safari/Edge, Windows Edge/Chrome. Same JavaScript on all four.
2. **Ship in days, not months.** No App Review, no code signing ceremony, no dual Xcode/Gradle builds.
3. **Keep 100% of revenue.** Stripe / Paddle / Lemon Squeezy integrate directly. No 15–30% IAP cut.
4. **Instant updates.** A `git push` is the release channel. No OTA framework, no store review for bug fixes.
5. **User-trust story.** Privacy-first is credible when you can demonstrably inspect `devtools → network` and confirm nothing leaves the device.

### 8.2 Tradeoffs Accepted

| Cost | Mitigation |
|---|---|
| No App Store discovery | Ship Tauri wrappers in Phase 3 if growth warrants the 30% cut |
| No background tasks / push notifications on iOS | Not required for this product |
| No native camera with document detection | Users import pre-scanned images; defer to Tauri for capture |
| iOS install friction (3-step Add to Home Screen) | InstallPrompt modal walks the user through |
| Safari IndexedDB eviction after 7 days of inactivity | Call `navigator.storage.persist()`; offer ZIP export for backup |

### 8.3 Phase 3 Native Wrapper Candidate

If Phase 1/2 validate demand, wrap the existing web build with **Tauri 2** (not React Native, not Electron):
- Produces `.app`, `.exe`, `.dmg`, `.msi`, `.apk`, `.ipa` from one config.
- ~5 MB installers vs Electron's ~100 MB.
- Same JavaScript and DOM; no rewrite.
- Accepts the 30% store cut only on revenue flowing through store IAP; sideloaded downloads remain Stripe.

**Capacitor** remains the alternative if Tauri 2's mobile support is still maturing at decision time.

---

## 9. Monetization

### 9.1 Free Tier (Phase 1)

- Unlimited cards, unlimited pages, all exports, all three AI providers.
- **User supplies their own API key** (BYOK). Zero inference cost to Card Stitcher.

### 9.2 Pro Tier (Phase 2)

| Feature | Free | Pro |
|---|---|---|
| Card count | Unlimited | Unlimited |
| PDF + GIF + ZIP export | ✓ | ✓ |
| AI autofill with own key | ✓ | ✓ |
| Card Stitcher-hosted AI (no key needed) | — | ✓, monthly quota |
| Shareable hosted links (72 hr) | — | ✓ |
| Cloud sync across devices | — | ✓ (opt-in, end-to-end encrypted) |

Pricing target: $2.99 / month or $19.99 / year. Billed via Stripe (or Paddle / Lemon Squeezy for merchant-of-record VAT handling).

### 9.3 Why not ads

Unsuitable for the sympathy / memory-keeper segments. Never considered.

---

## 10. Roadmap

### Phase 1 — Web MVP (shipped)

- [x] Library, Editor, Viewer routes
- [x] Import → Arrange → Metadata → Export pipeline
- [x] CSS 3D page-flip viewer
- [x] IndexedDB persistence
- [x] PDF / GIF / ZIP export
- [x] Occasion taxonomy + filter pills + search
- [x] Verbatim message transcription field
- [x] Multi-provider AI autofill (Anthropic / OpenAI / Gemini)
- [x] Settings with BYOK
- [x] PWA manifest + service worker + install prompt
- [ ] Static deploy to Cloudflare Pages (next)

### Phase 2 — Monetization + Cloud Features (Q3 2026)

- Cloudflare Workers API for:
  - Stripe checkout + webhook
  - Shareable link uploads to R2 with 72 hr TTL signed URLs
  - Optional server-hosted AI (proxied Anthropic) for Pro quota
- Shareable viewer route (`/s/:linkId`)
- Viewer overlay showing message transcription + metadata
- Dark mode polish
- Pro tier gating via feature flags

### Phase 3 — Native Wrappers (Q4 2026, conditional)

Go/no-go gate: Phase 2 reaches 5K MAU and > 4% free-to-Pro conversion.

- Tauri 2 wrapper for macOS, Windows, iOS, Android
- App Store + Play Store listings
- In-app camera capture with document edge detection
- Native share sheet integration
- App-specific icons and platform-appropriate screenshots

### Phase 4 — Depth (2027+)

- Real-time collaborative signing (group cards)
- OCR fallback when AI autofill is disabled
- Home Screen widget (Android + iOS via native wrappers)
- Apple Watch / Wear OS companion
- Live Photo export on iOS (native only)
- Cloud sync with E2E encryption

---

## 11. Out of Scope (Phase 1)

- Server-side anything — shareable links, sync, hosted AI, analytics.
- Dark mode (Phase 2).
- Onboarding carousel — the empty state suffices.
- Tablet-optimized layouts — responsive defaults handle most cases.
- OCR (AI autofill replaces it).
- Native camera scanning.

---

## 12. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Safari IndexedDB 7-day eviction wipes user cards | **High** | Call `navigator.storage.persist()` on first save; prominent ZIP export CTA; migrate to Origin Private File System in Phase 2 |
| BYOK friction blocks autofill adoption | **Medium** | In-app explainer + link to provider console on the Settings modal; Phase 2 Pro quota removes this entirely |
| Large provider SDKs bloat bundle | **Medium** | Already mitigated — each SDK behind dynamic `import()`, only the selected one downloads |
| iOS Install confusion | **Medium** | Dedicated iOS modal with screenshots / icons walks user through Share → Add to Home Screen |
| Vision API prompt injection in card images ("ignore previous instructions…") | **Medium** | System prompt frames images as data only; output schema is strictly typed and enum-validated; worst case is a bad autofill, user edits |
| Page-flip perf on low-end Android | **Low** | CSS 3D transform + `backface-visibility: hidden` benchmarks clean at 60 fps; fallback to crossfade toggle in Phase 2 if reported |
| Gemini responseSchema enum handling quirks | **Low** | Zod `safeParse` validates final JSON; mismatches throw a readable error surfaced in the UI |

---

## 13. Open Questions

- **Hosted AI pricing model.** Pro quota vs. pay-per-card? Decision after Stripe MVP.
- **Shareable link auth.** Public-by-URL vs. email-gated vs. password-gated? Defaults to public + TTL; Pro add-on for gated.
- **E2E encryption scope for Phase 2 sync.** Symmetric key in local storage vs. password-derived? Needs a designer review.
- **App name.** "Card Stitcher" tests well but may be too literal. Candidates: *Keepsake*, *PageKeep*, *Fold*, *Cardboard*.
- **Desktop drag-and-drop UX for folders.** Recursive flatten vs. prompt?

---

## Appendix A — Glossary

| Term | Definition |
|---|---|
| **Card** | A collection of 1–8 ordered page images representing a single physical card |
| **Page** | A single scanned image representing one surface of a physical card |
| **Spine** | The visual grouping of pages into Front / Inside / Back sections |
| **BYOK** | Bring Your Own Key — the user supplies their own LLM API key |
| **PWA** | Progressive Web App — installable web app with offline support via a service worker |
| **Autofill** | Pipeline that sends card images to an LLM and returns structured metadata + verbatim transcription |
| **TTL** | Time-to-live — the duration a shareable link remains accessible before expiry |
| **Tauri** | Rust-based native-wrapper framework; alternative to Electron for Phase 3 |

---

*Card Stitcher — Proprietary & Confidential — v2.0 — April 2026*
