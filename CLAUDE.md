@AGENTS.md

# SplitBill — Context for Claude

Mobile-first web app to split restaurant bills. Owner photographs the receipt, AI extracts items, assigns to people, saves to Supabase, shares a link. Live at **splitbill.cl**.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| Database | Supabase (PostgreSQL, RLS, Auth) |
| OCR | Gemini Flash → OpenAI GPT-4o cascade |
| Styles | Tailwind CSS + shadcn/ui |
| Deploy | Vercel |
| Email | Resend (custom SMTP, noreply@splitbill.cl) |
| Domain | splitbill.cl |

---

## App flow (screens in order)

```
/                        → Home: history of bills + "Nueva cuenta" button
/new                     → Photo capture (camera or gallery), compress + send to OCR
/receipt/review          → Edit extracted items (name, qty, unit price)
/receipt/participants    → Add/remove participants
/receipt/assign          → Assign each item to people (individual or shared)
/receipt/summary         → Per-person breakdown, 10% tip toggle, save → /b/[id]
/b/[id]                  → Public read-only view (shared via WhatsApp link)
/b/[id]/edit             → Owner edits a saved bill (loads into the same flow)
/login                   → Magic link + OTP code login (email, no password)
/auth/callback           → Supabase auth code exchange after magic link click
```

State between screens is stored in `sessionStorage` via `src/lib/store.ts` (`BillDraft`).

---

## Key files

```
src/
├── app/
│   ├── page.tsx                       # Home + bill history (auth-aware)
│   ├── new/page.tsx                   # Photo capture + OCR trigger
│   ├── receipt/
│   │   ├── review/page.tsx            # Edit OCR items; restaurant name input
│   │   ├── participants/page.tsx      # Manage participants
│   │   ├── assign/page.tsx            # Assign items to people
│   │   └── summary/page.tsx          # Final summary, tip toggle, save to DB
│   ├── b/[id]/
│   │   ├── page.tsx                   # Public bill view (SSR)
│   │   ├── PublicView.tsx             # Client component for public view
│   │   └── edit/
│   │       ├── page.tsx               # Edit entry point
│   │       └── EditLoader.tsx         # Loads bill from DB → populates BillDraft
│   ├── login/page.tsx                 # OTP login (email → 6-8 digit code)
│   ├── auth/callback/route.ts         # Exchanges ?code= for Supabase session
│   └── api/
│       ├── analyze-receipt/route.ts   # OCR endpoint (rate limiting + cascade)
│       └── bills/
│           ├── route.ts               # GET history, POST new bill (user_id aware)
│           ├── [id]/route.ts          # PATCH: settle, full edit, toggle_paid
│           └── claim/route.ts         # POST: links device_id bills to user on login
│       └── cron/
│           └── cleanup/route.ts       # GET: deletes anon bills >30 days (Vercel Cron)
├── lib/
│   ├── vision-client.ts               # OCR cascade: Gemini → OpenAI
│   ├── calculations.ts                # calculateSummary(), buildAssignments(), formatCurrency()
│   ├── store.ts                       # BillDraft sessionStorage state
│   ├── types.ts                       # All TypeScript types
│   ├── identity.ts                    # getDeviceId() — anonymous UUID in localStorage
│   ├── compress.ts                    # Canvas-based image compression
│   └── supabase.ts                    # supabaseAdmin + createSupabaseServerClient + getSupabaseBrowser
└── middleware.ts                      # Refreshes Supabase session JWT on every request
```

---

## Database schema (Supabase)

```sql
bills         id, created_at, restaurant, currency, subtotal_declared,
              tip_included, tip_included_amount, total_declared,
              tip_manual_enabled, ocr_confidence, ocr_notes,
              status ('draft'|'liquidada'), device_id, user_id

items         id, bill_id, nombre, cantidad, precio_unitario,
              precio_total, confianza_item, nota_item

participants  id, bill_id, nombre, paid (boolean, default false)

assignments   id, item_id, participant_id, fraccion, monto_asignado
```

RLS: public SELECT on all tables. INSERT/UPDATE/DELETE require service role key (server only).
All FK constraints use `ON DELETE CASCADE` — deleting a bill removes all related rows automatically.

Migrations applied in production (in order):
1. `20260421_add_device_id.sql`
2. `20260422_add_participant_paid.sql`
3. `20260423_add_user_id_to_bills.sql`
4. `20260424_cascade_deletes_and_cleanup.sql`

---

## Auth (Supabase Auth + @supabase/ssr)

- **Login**: `signInWithOtp({ email })` sends an email with a magic link + 8-digit OTP code via Resend (noreply@splitbill.cl).
- **OTP verify**: `verifyOtp({ email, token, type: 'email' })` — user types the code in the app, no redirect needed (PWA-friendly).
- **Magic link**: still works on desktop via `/auth/callback?code=...` → `exchangeCodeForSession`.
- **Session**: cookie-based via `@supabase/ssr`. Middleware refreshes JWT on every request.
- **Claim**: on `SIGNED_IN`, `POST /api/bills/claim` links all device_id bills to the user_id (runs before history fetch).
- **Cooldown**: 60s client-side timer after OTP send to avoid rate limit (Supabase free: 2 emails/hour — bypassed with custom Resend SMTP).

Supabase dashboard config:
- Site URL: `https://splitbill.cl`
- Redirect URLs: `https://splitbill.cl/auth/callback`
- Email template (Magic Link): includes `{{ .Token }}` for the 8-digit code

---

## OCR cascade (`src/lib/vision-client.ts`)

1. **Gemini** — native `generateContent` API, model `gemini-flash-latest`.
2. **OpenAI** — `gpt-4o` via OpenAI SDK, fallback only.

Uses concrete JSON examples in system prompt (not TypeScript type annotations). `maxOutputTokens: 8192` to avoid truncation.

Cost: ~$0.012/request with GPT-4o. See `docs/OCR-cost-optimization.md` for optimization plan (gpt-4o-mini + 768px → 16× cheaper, not yet implemented).

---

## Device identity

`src/lib/identity.ts` — `getDeviceId()` creates/reads a UUID from `localStorage` (`splitbill_device_id`).
- Anonymous bills stored with `device_id`.
- Authenticated bills stored with `user_id` (and `device_id` for the claim migration).
- On login: `POST /api/bills/claim` upgrades all matching device bills to `user_id`.

---

## Data retention

- **Anonymous bills**: deleted after 30 days by Vercel Cron (`0 4 * * *` UTC) hitting `GET /api/cron/cleanup`.
- **Authenticated bills**: kept indefinitely.
- **Disclaimer**: anonymous bill views show an orange banner with days remaining + link to `/login`.
- Cron protected by `CRON_SECRET` env var (set in Vercel).

---

## Assignment logic (`src/lib/calculations.ts`)

- **Equal split**: `fraccion = 1/n`, remainder cent goes to first participant.
- **Proportional split** (items with `cantidad > 1`): uses `AssignmentDraft.quantities` (per-person unit counts). `EditLoader` always reconstructs `quantities` for multi-unit items so +/− counters load correctly on edit.
- `totalDeclared` is stored in `BillDraft` to survive the edit flow (since `ocrResult` is null when editing a saved bill).

---

## Favicon / PWA

- Custom favicon set generated with RealFaviconGenerator.
- **Critical**: `src/app/favicon.ico` takes precedence over `public/favicon.ico` in App Router. Always update both.
- `metadataBase: new URL('https://splitbill.cl')` in `src/app/layout.tsx`.
- `public/site.webmanifest` — name: "SplitBill", theme_color: "#f43f5e", background_color: "#FFF7F7".

---

## Implemented features (as of v0.10.0)

- [x] Photo capture + Canvas compression
- [x] OCR with Gemini Flash → OpenAI GPT-4o cascade (native Gemini API)
- [x] Editable item review (name, qty, price)
- [x] Manual item add/delete
- [x] Restaurant name input
- [x] Participant management
- [x] Item assignment: individual and shared (equal or proportional by units)
- [x] 10% tip toggle (per-person, based on individual subtotal)
- [x] Tip auto-detected from OCR (toggle pre-set accordingly)
- [x] ÷N display shows item total: "÷3 de $9.000"
- [x] Per-person summary with full breakdown
- [x] Save to Supabase + shareable `/b/[id]` link
- [x] Public read-only view
- [x] Copy summary as plain text
- [x] Bill history on home (last 20, filtered by device or user)
- [x] Mark bill as settled (status: 'liquidada')
- [x] Full bill editing (edit → re-enters flow → saves back)
- [x] Anonymous device identity (bills private per device)
- [x] PWA manifest + full favicon set + apple-touch-icon
- [x] Rate limiting: 10 req / 5 min per IP
- [x] **F24** `?para=Nombre` — personal link highlights that person's card, auto-scrolls, shows "Copiar mi monto"
- [x] **F25** Web Share API — native share sheet on iOS/Android; "Enviar por WhatsApp" fallback on desktop
- [x] **F26** Mark individual transfers as received — per-person "Marcar como recibido" toggle, persisted to DB
- [x] **F31** Magic link + OTP login — Supabase Auth, cookie sessions, cross-device sync
- [x] Anonymous bill retention — 30-day expiry, daily cron cleanup, disclaimer banner
- [x] Claim anonymous bills on login — device bills auto-linked to account on first login
- [x] Custom SMTP via Resend (noreply@splitbill.cl) — bypasses Supabase free tier rate limit

## PR history

| PR | Feature | Status |
|----|---------|--------|
| #1 | Theme, settle bill, full edit flow | Merged |
| #2 | Anonymous device identity | Merged |
| #3 | Favicon set | Merged |
| #4 | Webmanifest fix, domain splitbill.cl | Merged |
| #5 | OCR cascade (Gemini→OpenAI), English docs | Merged |
| #6 | Per-person share links (?para=Nombre) | Merged |
| #7 | Web Share API + WhatsApp fallback | Merged |
| #8 | Mark transfers as received (F26) | Merged |
| #9 | Supabase Auth — magic link login | Merged |
| #10 | Middleware env guard + OTP login for PWA | Merged |
| #11 | OTP rate limit cooldown timer | Merged |
| #12 | Accept 6–8 digit OTP token | Merged |
| #13 | Claim anonymous bills on login | Merged |
| #14 | Await bill claim before fetching history | Merged |
| #15 | Anonymous bill retention + expiry disclaimer | **Open** |

---

## Pending / next features

**P1 — High value, low effort:**
- [ ] **OCR cost optimization** — `gpt-4o` → `gpt-4o-mini` + 768px images → 16× cheaper. Documented in `docs/OCR-cost-optimization.md`.
- [ ] **Manual item entry fallback** — when OCR fails, offer manual entry instead of just showing an error.

**P1 — High value, medium effort:**
- [ ] **Export to image** — generate a shareable image of the per-person breakdown (canvas or html2canvas). High demand in WhatsApp-heavy markets.
- [ ] **Multiple payers** — one person covers the full bill, others owe them directly (different flow from current).

**P2 — Nice to have:**
- [ ] **F27** Split item shortcut — "3 cervezas" → quick-split into 3 individual items.
- [ ] **Suggested participant names** — autocomplete from previously used names.
- [ ] **F28** Configurable link expiration — 24h / 7d / 30d / permanent per bill.
- [ ] **F30** Dark mode (Tailwind `dark:`).
- [ ] **F33** Multiple payers.
- [ ] **F34** Export to image/PDF.
- [ ] **F35** Payment link integration (Mercado Pago).

**Technical debt:**
- [ ] Rate limiting with Upstash Redis — current in-memory map resets on Vercel cold start.
- [ ] OCR cost optimization (see above, documented but not implemented).

---

## Conventions

- All code comments in English.
- PR must include a `CHANGELOG.md` entry (enforced by GitHub Actions).
- `supabaseAdmin` (service role) for all writes — never expose to client.
- `createSupabaseServerClient(cookieStore)` for reading auth in API routes.
- `getSupabaseBrowser()` singleton for client components.
- `crypto.randomUUID()` to remap OCR item IDs (which are "1", "2", ...) to valid UUIDs before DB insert.
- `suppressHydrationWarning` on `<html>` element (Next.js 15 metadata boundary mismatch).
- New branches from `main`, one feature per PR, always include CHANGELOG entry.
