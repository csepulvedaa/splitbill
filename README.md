# 🧾 SplitBill

Split restaurant bills with friends — no drama. Live at **[splitbill.cl](https://splitbill.cl)**.

## What it does

1. **Photo → OCR** — Take a photo of the receipt; AI extracts items automatically (Gemini Flash → GPT-4o cascade)
2. **Review items** — Edit names, prices, or add items manually
3. **Add participants** — Who's paying
4. **Assign items** — Choose who ordered what. Items with quantity > 1 (e.g. 3 beers) are assigned per unit per person
5. **Summary & tip** — Per-person breakdown with a 10% tip toggle
6. **Share** — Native share sheet (iOS/Android) or WhatsApp link; per-person links highlight that person's card
7. **Account** — Magic link login (email OTP). Bills sync across devices; anonymous bills auto-claim on first login

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL + Auth) |
| OCR | Gemini Flash (primary) → OpenAI GPT-4o (fallback) |
| UI | Tailwind CSS + shadcn/ui |
| Deploy | Vercel |
| Email | Resend (custom SMTP via splitbill.cl) |

## Environment variables

```env
# OCR providers — cascade: Gemini (primary) → OpenAI (fallback)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cron job auth (any random string, e.g. openssl rand -hex 32)
CRON_SECRET=
```

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill in the variables in .env.local
npm run dev
```

## Project structure

```
src/
├── app/
│   ├── new/                  # Photo capture + compression
│   ├── receipt/
│   │   ├── review/           # OCR item review & editing
│   │   ├── participants/     # Add participants
│   │   ├── assign/           # Assign items to people
│   │   └── summary/          # Final summary + save
│   ├── b/[id]/               # Public shareable bill view
│   ├── login/                # Magic link / OTP login
│   ├── auth/callback/        # Supabase auth code exchange
│   └── api/
│       ├── analyze-receipt/  # OCR endpoint (rate limited)
│       ├── bills/            # Bills CRUD + anonymous claim
│       └── cron/cleanup/     # Daily anon bill cleanup (Vercel Cron)
├── lib/
│   ├── vision-client.ts      # OCR cascade: Gemini → OpenAI
│   ├── calculations.ts       # Split & tip calculation logic
│   ├── store.ts              # sessionStorage draft state
│   ├── supabase.ts           # Supabase clients (admin, server, browser)
│   ├── identity.ts           # Anonymous device ID (localStorage)
│   └── types.ts              # TypeScript types
└── middleware.ts             # Supabase session refresh
```

## Data retention

Anonymous bills (no account) are deleted after **30 days** by a daily Vercel Cron job. Bills linked to an account are kept indefinitely. Users see an expiry countdown banner on anonymous bill views.

## Supabase setup

Required migrations (run in Supabase SQL Editor in order):

| File | Description |
|------|-------------|
| `20260421_add_device_id.sql` | `device_id` column on bills |
| `20260422_add_participant_paid.sql` | `paid` boolean on participants |
| `20260423_add_user_id_to_bills.sql` | `user_id` FK to auth.users on bills |
| `20260424_cascade_deletes_and_cleanup.sql` | CASCADE deletes on all FK constraints |

Auth config in Supabase dashboard:
- Authentication → URL Configuration → Site URL: `https://splitbill.cl`
- Authentication → URL Configuration → Redirect URLs: `https://splitbill.cl/auth/callback`
- Authentication → Email Templates → Magic Link: include `{{ .Token }}` for OTP code

## Contributing

**Every PR must include an entry in `CHANGELOG.md`** — an automated GitHub Actions check blocks the merge if it is missing.
