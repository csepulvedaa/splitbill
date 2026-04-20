# Changelog

Todos los cambios relevantes de SplitBill se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

## [0.3.1] - 2026-04-20

### Added
- **Nombre del restaurante editable**: campo de texto en la revisión de ítems para nombrar la cuenta. Se guarda en el draft y persiste al editar.

### Fixed
- **Pills de asignación**: estado no-seleccionado ahora es gris neutro para todos los participantes (antes cada uno tenía un color distinto del arcoíris).
- **Persistencia de asignaciones al editar**: al volver a la pantalla de participantes, las asignaciones ya existentes se conservan (se filtran si se elimina un participante, no se borran todas).
- **Nombre del restaurante en edición**: al entrar al flujo de edición, el nombre del restaurante se pre-carga desde la cuenta guardada.

## [0.3.0] - 2026-04-20

### Added
- **Marcar como liquidada**: botón en la vista pública para marcar una cuenta como pagada. Muestra badge "✅ Liquidada" en el header y en el historial de inicio.
- **Edición completa de cuenta**: botón "Editar" en la vista pública que carga la cuenta existente en el flujo de edición (ítems → participantes → asignaciones → resumen). Soporta reconstrucción de asignaciones por cantidad para ítems multi-unidad.
- Endpoint `PATCH /api/bills/[id]` para liquidar y para edición completa (delete + reinsert).
- Página `/b/[id]/edit` con `EditLoader` que hidrata el sessionStorage desde la BD.

### Changed
- Tema aplicado consistentemente en todas las páginas: gradiente rose→orange en headers, fondo `#FFF7F7`, CTAs con gradiente. Anteriormente solo assign y summary tenían el nuevo tema.
- Historial en home muestra badge verde "Liquidada" para cuentas con `status = 'liquidada'`.
- `revalidate = 0` en `/b/[id]` para reflejar cambios de estado inmediatamente.

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
