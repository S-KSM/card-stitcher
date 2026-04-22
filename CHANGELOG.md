# Changelog

All notable changes to Card Stitcher are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org).

## [0.2.0] — 2026-04-22

### Added
- **LLM image-edit enhance backend** (`src/lib/enhance/llm.ts`). Two new options behind the existing `EnhanceBackend` interface: `llm-gemini` (`gemini-2.5-flash-image`) and `llm-openai` (`gpt-image-1`). Uses the user's existing BYOK provider keys — no new storage, no new server. Anthropic is skipped per PRD §B.5 (vision-in only, no image output). Non-destructive: originals stay in IDB and the enhance toggle still works.
- **Bound-card viewer feel.** `PageFlip.tsx` + `index.css` rewritten: stacked page edges beneath the active page, spine shadow down the left gutter, two-sided flipping page (front = old image, back = cream card paper), moving curl-shadow sweep across the revealed page, softer 720ms ease, deeper drop-shadow.
- **LLM progress cues in `EnhancePreviewModal`.** Shimmer placeholder on the preview panel, pulsing Sparkles icon, indeterminate terracotta progress bar, stage text that cycles with elapsed seconds ("Uploading…" → "Model is enhancing… (Xs)" → "Still working…").
- **API key guidance in Settings.** "Get key ↗" link per provider (Anthropic Console, OpenAI platform, Google AI Studio), per-provider hint about the required tier/plan, and a red "Needs a [provider] API key above" callout on the two LLM enhance backends when the matching key is missing.
- **Fidelity warning banner** on the enhance preview when an LLM backend is active — AI editing may redraw small details.

### Fixed
- **Classical / ONNX enhance crashed in dev** with `Uncaught SyntaxError: Unexpected token 'export'` in `cv-worker.ts`. Vite's `worker.format: 'iife'` only applied at build, so the dev server shipped the raw TS file — including the trailing `export {}` — to a classic Web Worker that can't parse ESM. `cv-client.ts` now imports the worker via Vite's `?worker` suffix, routing it through the worker plugin in both dev and prod.

### Changed
- `EnhanceBackendId` widened to `'classical' | 'onnx' | 'llm-gemini' | 'llm-openai'`. `ENHANCE_BACKENDS` gains entries for the new backends; `isLlmBackend()` helper exported from `src/lib/enhance`.
- Enhance preview modal hides "Adjust corners manually" when an LLM backend is selected (the model owns geometry) and shows the full backend label instead of the previous two-value ternary.
- `PROVIDERS` entries now include a `keyUrl` field pointing to each vendor's API-key creation page.

## [0.1.0] — initial web PWA

- React + Vite PWA shipping the core flow: import 2–8 scanned card pages, arrange via drag-and-drop, edit metadata, view with page-flip animation, export to PDF / animated GIF / ZIP.
- Client-side only: cards and blobs persisted via `idb-keyval`; no backend.
- BYOK LLM autofill across Anthropic, OpenAI, and Google Gemini.
- Enhance pipeline: `classical` (OpenCV.js via CDN in a Web Worker) and `onnx` (silueta via onnxruntime-web, ~45 MB first-use model download, cached by the service worker).
- Cloudflare Pages deploy via `wrangler pages deploy`.
