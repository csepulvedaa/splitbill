# Changelog

All notable changes to SplitBill are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

## [0.9.5] - 2026-04-23

### Fixed
- **Claim timing**: bills claim now runs before the history fetch, so anonymous bills are linked to the account before the list loads. Previously both ran in parallel and the list returned empty.

## [0.9.4] - 2026-04-23

### Fixed
- **Claim anonymous bills on login**: when a user logs in for the first time, all bills created anonymously on that device (`device_id`) are now automatically linked to their account (`user_id`). No data loss on first login.
- **OTP UI text**: removed specific digit count ("6 dígitos") from the login screen — replaced with "código de acceso" to avoid confusion since Supabase sends an 8-digit token.

### Added
- `POST /api/bills/claim` endpoint: updates bills matching the current `device_id` to the authenticated `user_id` (only bills without an existing `user_id`).

## [0.9.3] - 2026-04-23

### Fixed
- **OTP code length**: Supabase sends an 8-digit token via `{{ .Token }}` in the Magic Link template. Input now accepts 6–8 digits (was hard-capped at 6).

### Config required
- Supabase → Authentication → URL Configuration → Redirect URLs: add `https://splitbill.cl/auth/callback`. Without this, Supabase ignores `emailRedirectTo` and redirects to the Site URL, skipping the code exchange and leaving the user logged out.

## [0.9.2] - 2026-04-23

### Fixed
- **OTP rate limit (429)**: detect HTTP 429 status from Supabase and show a clear message instead of the raw error string.
- **Cooldown timer**: after sending a code, the send/resend button is disabled for 60 seconds with a live countdown (`Reenviar en 42s`), preventing users from hitting the rate limit by retrying too quickly.

## [0.9.1] - 2026-04-23

### Fixed
- **Middleware crash**: skip Supabase session refresh if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, preventing "URL and Key are required" errors in logs.
- **OTP login for PWA**: login page now uses a two-step flow (email → 6-digit code via `verifyOtp`) so users inside the installed PWA never get redirected to an external browser to authenticate. Magic link still works on desktop.
- **Error messages**: show the real Supabase error (e.g. rate limit) instead of a generic string.

### Supabase dashboard config
- Authentication → Email Templates → Magic Link: add `{{ .Token }}` to the email body so the 6-digit code is included alongside the magic link.

## [0.9.0] - 2026-04-23

### Added
- **Magic link login**: new `/login` page lets users authenticate with their email — no passwords. Supabase sends a one-time link; clicking it exchanges the code for a cookie session via `/auth/callback`.
- **Auth-aware home page**: header shows the logged-in user's email prefix with a logout button. Anonymous users see an "Entrar" link and a "Entra para sincronizar →" hint in the history section.
- **Cross-device bill sync**: bills created while logged in are stored with `user_id`. The home feed filters by `user_id` for authenticated users, so the same account sees all its bills from any device.
- **Session middleware**: refreshes the Supabase JWT on every request to keep sessions alive across page loads.
- **Anonymous fallback preserved**: unauthenticated users still see their bills by `device_id` as before.

### Migration
- Run `supabase/migrations/20260423_add_user_id_to_bills.sql`: adds `user_id UUID REFERENCES auth.users(id)` and index to `bills`.

### Supabase dashboard config
- Authentication → URL Configuration → Redirect URLs: add `https://splitbill.cl/auth/callback`
- Authentication → Providers → Email: confirm magic links are enabled

## [0.8.0] - 2026-04-22

### Added
- **Mark transfer as received** (F26): each person card in the public view has a "Marcar como recibido" toggle button. When marked, the card turns green with a "Pagó ✓" badge and the avatar shows a checkmark.
- When all participants are marked as paid, the "Marcar como liquidada" button turns green and its label changes to "¡Todos pagaron! Liquidar cuenta".
- Paid state persists in the database (`participants.paid` column).
- Toggle is reversible — tapping again unmarks as paid.

### Migration
- Run `supabase/migrations/20260422_add_participant_paid.sql`: adds `paid boolean DEFAULT false` to `participants`.

## [0.7.0] - 2026-04-22

### Added
- **Web Share API**: "Compartir" button triggers the native OS share sheet on supported devices (iOS Safari, Chrome Android).
- **WhatsApp fallback**: on desktop or unsupported browsers the button label changes to "Enviar por WhatsApp" and opens `wa.me/?text=...` directly.
- Same fallback applied to per-person share icons: on desktop, tapping the icon opens WhatsApp with the personal message pre-filled instead of just copying to clipboard.

## [0.6.0] - 2026-04-22

### Added
- **Per-person share links** (`?para=Nombre`): each person card in the public view now has a share icon that copies/opens the bill URL with their name as a query param.
- **Highlighted personal view**: opening `/b/[id]?para=Juan` highlights Juan's card with the rose gradient header, auto-scrolls to it, and shows a "Copiar mi monto" button.
- **"Copiar mi monto"**: copies `"Juan: $X,XXX — SplitBill\n<link>"` to clipboard, ready to paste in a chat.

### Removed
- Stale duplicate source files (`route 2.ts`, `EditLoader 2.tsx`, `page 2.tsx`, `identity 2.ts`) that were never tracked by git.

## [0.5.0] - 2026-04-21

### Added
- **OCR provider cascade**: Gemini Flash (primary, `gemini-flash-latest`) → OpenAI GPT-4o (fallback). Uses native Gemini API (`generateContent`) to avoid OpenAI-compat layer issues.
- `src/lib/vision-client.ts`: abstraction layer that tries each provider in order and returns the first successful result.
- `GEMINI_API_KEY` environment variable.

### Changed
- All Spanish code comments translated to English.
- `README.md` and `CHANGELOG.md` translated to English (international portfolio).
- System prompt uses concrete JSON examples instead of TypeScript type annotations to prevent model from echoing type syntax literally.

## [0.4.2] - 2026-04-21

### Fixed
- `site.webmanifest`: corrected name ("SplitBill"), `theme_color` (#f43f5e) and `background_color` (#FFF7F7) — not included in previous merge.
- Home banner: replaced generic `Receipt` icon with `favicon.svg`.
- `metadataBase` points to `https://splitbill.cl` for correct absolute URLs in metadata.

## [0.4.1] - 2026-04-21

### Added
- **Full favicon set**: SVG icon, PNG 96×96, ICO, apple-touch-icon, and PWA manifests (192×192 and 512×512) generated with RealFaviconGenerator.

## [0.4.0] - 2026-04-21

### Added
- **Anonymous device identity**: a UUID is generated in `localStorage` as `device_id`. Each new bill is associated with that ID, and the home feed only shows bills from the current device. Ready to be linked to a real user in the future.

### Migration
- Run `supabase/migrations/20260421_add_device_id.sql` in Supabase: adds `device_id TEXT` column and index to the `bills` table.

## [0.3.2] - 2026-04-20

### Fixed
- **Summary ÷N**: now shows the item total (`÷5 of $12,000`) so it is clear what is being divided.
- **Multi-unit assignments on edit**: when editing an existing bill, the +/- counters are now pre-loaded with the saved quantities (previously always showed 0).
- **Home total after edit**: `total_declared` is preserved in the draft during edit so it is not lost on save.

## [0.3.1] - 2026-04-20

### Added
- **Editable restaurant name**: text field in the item review screen to name the bill. Saved in draft and persisted on edit.

### Fixed
- **Assignment pills**: unselected state is now a neutral gray for all participants (previously each had a different rainbow color).
- **Assignment persistence on edit**: when returning to the participants screen, existing assignments are preserved (filtered if a participant is removed, not fully cleared).
- **Restaurant name on edit**: entering the edit flow pre-loads the restaurant name from the saved bill.

## [0.3.0] - 2026-04-20

### Added
- **Mark as settled**: button in the public view to mark a bill as paid. Shows "✅ Settled" badge in the header and in the home history.
- **Full bill editing**: "Edit" button in the public view loads the existing bill into the editing flow (items → participants → assignments → summary). Supports assignment reconstruction by quantity for multi-unit items.
- `PATCH /api/bills/[id]` endpoint for settling and full editing (delete + reinsert).
- `/b/[id]/edit` page with `EditLoader` that hydrates sessionStorage from the DB.

### Changed
- Theme applied consistently across all pages: rose→orange gradient in headers, `#FFF7F7` background, gradient CTAs.
- Home history shows green "Settled" badge for bills with `status = 'liquidada'`.
- `revalidate = 0` on `/b/[id]` to reflect status changes immediately.

## [0.2.0] - 2026-04-20

### Added
- Per-quantity assignment for items with `cantidad > 1` (e.g. "3 beers" → counter per person)
- New color palette: rose-to-orange gradient, unique avatar colors per person
- Emojis in UI for improved visual readability
- Geist font loading correctly (fix for circular CSS variable)

### Fixed
- Bug where each item's total price was charged to all participants instead of being split
- `invalid input syntax for type uuid: "1"` error on save — OCR item IDs are now remapped to valid UUIDs before inserting into Supabase
- Correct remapping of `item_id` in assignments on save

### Changed
- Assignment page redesigned with gradient header, color-bordered cards by state
- Summary page redesigned with per-person cards and highlighted totals

---

## [0.1.0] - 2026-04-20

### Added
- Full flow: photo → OCR → review → participants → assignment → summary → shareable link
- OCR with GPT-4o Vision to extract items from receipts
- Equal split of items among selected participants
- 10% tip toggle in summary
- Public shareable view via link (`/b/[id]`)
- Bill history on home screen
- Basic rate limiting on OCR endpoint (10 requests / 5 min per IP)
- PWA support (manifest, apple-touch-icon, viewport fit cover)
