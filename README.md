# 🧾 SplitBill

Divide la cuenta del restaurante entre tus amigos sin dramas.

## ¿Qué hace?

1. **Foto → OCR** — Saca una foto de la boleta y GPT-4o extrae los ítems automáticamente
2. **Revisa ítems** — Edita nombres, precios o agrega ítems manuales
3. **Agrega participantes** — Quiénes van a pagar
4. **Asigna ítems** — Elige quién pidió qué. Para ítems con cantidad > 1 (ej. 3 cervezas) se asignan unidades individuales a cada persona
5. **Resumen y propina** — Vista por persona con toggle de propina 10%
6. **Comparte** — Link público o copia como texto para el grupo de WhatsApp

## Stack

- **Framework**: Next.js 15 (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **OCR**: OpenAI GPT-4o Vision
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel

## Variables de entorno

```env
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Rellena las variables en .env.local
npm run dev
```

## Estructura

```
src/
├── app/
│   ├── new/              # Captura de foto
│   ├── receipt/
│   │   ├── review/       # Revisión de ítems OCR
│   │   ├── participants/ # Agregar participantes
│   │   ├── assign/       # Asignar ítems
│   │   └── summary/      # Resumen final
│   ├── b/[id]/           # Vista pública compartible
│   └── api/
│       ├── analyze-receipt/  # Endpoint OCR
│       └── bills/            # CRUD cuentas
├── lib/
│   ├── calculations.ts   # Lógica de split
│   ├── store.ts          # Estado en sessionStorage
│   └── types.ts          # Tipos TypeScript
```

## Contribuir

**Todo PR debe incluir una entrada en `CHANGELOG.md`** — hay un check automático que lo verifica y bloquea el merge si no está actualizado.
