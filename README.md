# 🧾 SplitBill

Split restaurant bills with friends — no drama.

## What it does

1. **Photo → OCR** — Take a photo of the receipt; the AI extracts items automatically (Groq → Gemini → OpenAI cascade)
2. **Review items** — Edit names, prices, or add items manually
3. **Add participants** — Who's paying
4. **Assign items** — Choose who ordered what. Items with quantity > 1 (e.g. 3 beers) are assigned per unit per person
5. **Summary & tip** — Per-person breakdown with a 10% tip toggle
6. **Share** — Public link or copy as plain text for the WhatsApp group

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| OCR | Groq (Llama 4 Scout) → Gemini 2.5 Flash → OpenAI GPT-4o |
| UI | Tailwind CSS + shadcn/ui |
| Deploy | Vercel |

## Environment variables

```env
# OCR providers — cascade: Groq (primary) → Gemini (fallback 1) → OpenAI (fallback 2)
GROQ_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
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
│   ├── new/                  # Photo capture
│   ├── receipt/
│   │   ├── review/           # OCR item review & editing
│   │   ├── participants/     # Add participants
│   │   ├── assign/           # Assign items to people
│   │   └── summary/          # Final summary + save
│   ├── b/[id]/               # Public shareable bill view
│   └── api/
│       ├── analyze-receipt/  # OCR endpoint (provider cascade)
│       └── bills/            # Bills CRUD
├── lib/
│   ├── vision-client.ts      # OCR cascade: Groq → Gemini → OpenAI
│   ├── calculations.ts       # Split & tip calculation logic
│   ├── store.ts              # sessionStorage draft state
│   └── types.ts              # TypeScript types
```

## Contributing

**Every PR must include an entry in `CHANGELOG.md`** — an automated GitHub Actions check blocks the merge if it is missing.
