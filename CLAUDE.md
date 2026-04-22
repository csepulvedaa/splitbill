@AGENTS.md

# SplitBill — Context for Claude

Mobile-first web app to split restaurant bills. Owner photographs the receipt, AI extracts items, assigns to people, saves to Supabase, shares a link. Live at **splitbill.cl**.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| Database | Supabase (PostgreSQL, RLS) |
| OCR | Gemini Flash → OpenAI GPT-4o cascade |
| Styles | Tailwind CSS + shadcn/ui |
| Deploy | Vercel |
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
```

State between screens is stored in `sessionStorage` via `src/lib/store.ts` (`BillDraft`).

---

## Key files

```
src/
├── app/
│   ├── page.tsx                       # Home + bill history
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
│   └── api/
│       ├── analyze-receipt/route.ts   # OCR endpoint (rate limiting + cascade)
│       └── bills/
│           ├── route.ts               # GET history, POST new bill
│           └── [id]/route.ts          # PATCH: settle or full edit
├── lib/
│   ├── vision-client.ts               # OCR cascade: Gemini → OpenAI
│   ├── calculations.ts                # calculateSummary(), buildAssignments(), formatCurrency()
│   ├── store.ts                       # BillDraft sessionStorage state
│   ├── types.ts                       # All TypeScript types
│   ├── identity.ts                    # getDeviceId() — anonymous UUID in localStorage
│   ├── compress.ts                    # Canvas-based image compression
│   └── supabase.ts                    # supabaseAdmin (service role) + anon client
```

Duplicate files with " 2" suffix were deleted (PR #6). No stale artifacts remain.

---

## Database schema (Supabase)

```sql
bills         id, created_at, restaurant, currency, subtotal_declared,
              tip_included, tip_included_amount, total_declared,
              tip_manual_enabled, ocr_confidence, ocr_notes,
              status ('draft'|'liquidada'), device_id

items         id, bill_id, nombre, cantidad, precio_unitario,
              precio_total, confianza_item, nota_item

participants  id, bill_id, nombre

assignments   id, item_id, participant_id, fraccion, monto_asignado
```

RLS: public SELECT on all tables. INSERT/UPDATE/DELETE require service role key (server only).

Migration pending in production: `supabase/migrations/20260421_add_device_id.sql`
(adds `device_id TEXT` + index on `bills`). **Must be run manually in Supabase dashboard.**

---

## OCR cascade (`src/lib/vision-client.ts`)

1. **Gemini** — native `generateContent` API (`X-goog-api-key` via query param), model `gemini-flash-latest`.
2. **OpenAI** — `gpt-4o` via OpenAI SDK, fallback only.

Uses concrete JSON examples in system prompt (not TypeScript type annotations — models echo those literally). `maxOutputTokens: 8192` to avoid truncation.

Env vars: `GEMINI_API_KEY`, `OPENAI_API_KEY`. Both set in Vercel production and `.env.local`.

---

## Device identity

`src/lib/identity.ts` — `getDeviceId()` creates/reads a UUID from `localStorage` (`splitbill_device_id`).
- Bills are saved with `device_id` from `X-Device-Id` header.
- Home feed (`GET /api/bills`) filters by `device_id` so each device sees only its own bills.
- Future-proof: can link `device_id` to a real user account later.

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

## Implemented features (as of v0.7.0)

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
- [x] Bill history on home (last 20, filtered by device)
- [x] Mark bill as settled (status: 'liquidada')
- [x] Full bill editing (edit → re-enters flow → saves back)
- [x] Anonymous device identity (bills private per device)
- [x] PWA manifest + full favicon set + apple-touch-icon
- [x] Rate limiting: 10 req / 5 min per IP
- [x] **F24** `?para=Nombre` — personal link highlights that person's card, auto-scrolls, shows "Copiar mi monto"
- [x] **F25** Web Share API — native share sheet on iOS/Android; "Enviar por WhatsApp" fallback on desktop (PR #7, pending merge)

## PR history

| PR | Feature | Status |
|----|---------|--------|
| #1 | Theme, settle bill, full edit flow | Merged |
| #2 | Anonymous device identity | Merged |
| #3 | Favicon set | Merged |
| #4 | Webmanifest fix, domain splitbill.cl | Merged |
| #5 | OCR cascade (Gemini→OpenAI), English docs | Merged |
| #6 | Per-person share links (?para=Nombre) | Merged |
| #7 | Web Share API + WhatsApp fallback | **Open** |

---

## Pending / next features (from docs/Contexto.md)

**P1 — High value, next:**
- [ ] **F26** Mark individual transfers as received — owner marks each person as paid within the bill view
- [ ] **F27** Split item into N units — "3 cervezas" → assign per-unit; currently handled via +/− counters, but a "split into 3 items" shortcut would help
- [ ] **F28** Configurable link expiration — currently no expiry; add 24h / 7d / 30d / permanent option
- [ ] **F29** Multi-currency — OCR already detects currency; UI only formats CLP currently

**P2 — Nice to have:**
- [ ] **F30** Dark mode (Tailwind `dark:`)
- [ ] **F31** Login for public users — Clerk or NextAuth with magic link / Google
- [ ] **F32** Cost model for public users — freemium / subscription
- [ ] **F33** Multiple payers
- [ ] **F34** Export to image/PDF
- [ ] **F35** Payment link integration (Mercado Pago, etc.)

**Technical debt:**
- [ ] Run Supabase migration `20260421_add_device_id.sql` in production (manual step in Supabase dashboard)
- [ ] Rate limiting with Upstash Redis — current in-memory map resets on Vercel cold start
- [ ] Manual item entry fallback when OCR fails completely (currently only shows error message)

---

## Conventions

- All code comments in English.
- PR must include a `CHANGELOG.md` entry (enforced by GitHub Actions).
- `supabaseAdmin` (service role) for all writes — never expose to client.
- `crypto.randomUUID()` to remap OCR item IDs (which are "1", "2", ...) to valid UUIDs before DB insert.
- `suppressHydrationWarning` on date elements (locale-dependent `toLocaleDateString`).
