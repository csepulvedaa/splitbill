# Changelog

Todos los cambios relevantes de SplitBill se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

## [0.2.0] - 2026-04-20

### Added
- Asignación por cantidad para ítems con `cantidad > 1` (ej. "3 cervezas" → contador por persona)
- Paleta de colores nueva: gradiente rose-to-orange, avatares con colores únicos por persona
- Emojis en la UI para mejorar legibilidad visual
- Fuente Geist cargando correctamente (fix de variable CSS circular)

### Fixed
- Bug donde el precio total de cada ítem se cobraba a todos los participantes en lugar de dividirse
- Error `invalid input syntax for type uuid: "1"` al guardar — los IDs del OCR ahora se remapean a UUIDs válidos antes de insertar en Supabase
- Remapeo correcto de `item_id` en asignaciones al guardar

### Changed
- Página de asignación rediseñada con header degradado, cards con borde de color por estado
- Página de resumen rediseñada con cards por persona y totales destacados

---

## [0.1.0] - 2026-04-20

### Added
- Flujo completo: foto → OCR → revisión → participantes → asignación → resumen → link compartible
- OCR con GPT-4o Vision para extraer ítems de boletas
- Split equitativo de ítems entre participantes seleccionados
- Toggle de propina 10% en resumen
- Vista pública compartible por link (`/b/[id]`)
- Historial de cuentas en la página de inicio
- Rate limiting básico en endpoint OCR (10 requests / 5 min por IP)
- Soporte PWA (manifest, apple-touch-icon, viewport fit cover)
