# SplitBill — Roadmap

> Última actualización: Abril 2026
> Estado actual: v0.8.0 — uso personal, sin login, dominio splitbill.cl

---

## Estado del MVP

El flujo core está completo y funcionando:
foto → OCR → revisar → participantes → asignar → resumen → link compartible

Features implementados: F01–F23 (MVP completo) + F24, F25, F26.

---

## Próximas fases

---

### FASE 2 — Pulir experiencia (sin login)

Estas mejoras no requieren auth y agregan valor inmediato.

#### 2A — Optimización de costos OCR ⚡ (30 min)
**Impacto: ahorro del 95% en costo de API**
- `gpt-4o` → `gpt-4o-mini` en `vision-client.ts`
- Imagen 1280px → 768px en `compress.ts`
- Ver análisis completo en `docs/OCR-cost-optimization.md`

#### 2B — Rate limiting real con Upstash Redis (2h)
**Impacto: el límite actual (in-memory) se resetea en cada cold start de Vercel**
- Instalar `@upstash/ratelimit` + `@upstash/redis`
- 10 req / 5 min por IP persiste entre instancias
- Requiere cuenta Upstash (free tier suficiente)

#### 2C — Fallback de ingreso manual cuando OCR falla (3h)
**Impacto: el flujo no queda roto si Gemini y OpenAI fallan**
- Botón "Ingresar ítems manualmente" en la pantalla de error
- Lleva al usuario directo a `/receipt/review` con lista vacía
- Actualmente solo muestra mensaje de error

#### 2D — Eliminar cuenta del historial (1h)
**Impacto: el dueño no puede borrar cuentas del historial todavía**
- Botón de eliminar en el historial del home (swipe o long-press)
- `DELETE /api/bills/[id]` con cascada en Supabase

---

### FASE 3 — Login y cuentas de usuario

#### Por qué hacer login ahora

El `device_id` actual resuelve el caso básico (un iPhone = tus cuentas), pero falla en:
- El dueño cambia de teléfono → pierde el historial
- El dueño quiere revisar una cuenta desde el computador
- Escalar a otros usuarios que quieran crear sus propias cuentas

#### Stack recomendado: **Supabase Auth**

Ya usamos Supabase. Auth está incluido sin costo adicional.
- Magic link (email) — sin contraseñas, muy simple
- Google OAuth — un tap en móvil
- No requiere instalar Clerk ni NextAuth

#### Qué implica técnicamente

```
1. Activar Supabase Auth en el dashboard
2. Agregar user_id a tabla bills (nullable para bills anónimas existentes)
3. Actualizar RLS: INSERT/UPDATE solo si auth.uid() = bills.user_id
4. Client: useUser() hook de @supabase/ssr
5. Página /login con magic link + Google button
6. Middleware Next.js: proteger /new y /receipt/* si no autenticado
7. Migrar device_id → user_id al hacer login por primera vez
```

#### Flujo propuesto

```
Usuario nuevo:
  Abre splitbill.cl → ve historial vacío → toca "Nueva cuenta"
  → si no logueado: modal "Para guardar tu historial, entra con email o Google"
  → login → vuelve al flujo normal

Usuario existente (tiene bills con device_id):
  Al loguearse por primera vez → se migran sus bills anónimas a su cuenta
```

#### Decisión: ¿login obligatorio o opcional?

**Recomendación: opcional para crear cuentas, obligatorio para ver el historial.**
- Cualquiera puede crear y compartir una cuenta (igual que hoy)
- El historial en el home solo se muestra si está logueado
- Sin login → historial por device_id (igual que hoy, como fallback)

Esto permite escalar sin romper el uso actual.

---

### FASE 4 — Apertura a otros usuarios

Una vez que login esté funcionando, se puede abrir la app a más personas.

#### Modelo de negocio sugerido

| Tier | Precio | Límite | OCR |
|------|--------|--------|-----|
| Free | $0 | 5 cuentas/mes | Gemini Flash (free tier) |
| Pro | $3–5/mes | Ilimitado | Gemini + GPT-4o-mini fallback |

Con los costos optimizados (~$0.001/OCR), el free tier de 5 cuentas/mes cuesta <$0.005 por usuario.
El tier Pro se vuelve rentable desde el primer usuario.

#### Qué más requiere esta fase
- Página de precios / upgrade
- Stripe o Mercado Pago para suscripciones
- Dashboard de uso (cuántas cuentas has creado este mes)
- Rate limiting por usuario autenticado (no solo por IP)

---

### FASE 5 — Features sociales y de producto

Una vez que hay usuarios reales usando la app:

| Feature | Valor | Complejidad |
|---------|-------|-------------|
| Notificación por email cuando todos pagaron | Alto | Media |
| Historial con búsqueda por restaurante | Medio | Baja |
| Exportar cuenta como imagen/PDF | Medio | Media |
| Recordatorio automático a los que no han pagado | Alto | Alta |
| Integración links de pago (Mercado Pago, etc.) | Alto | Alta |

---

## Backlog priorizado

| Prioridad | Feature | Fase | Esfuerzo |
|-----------|---------|------|----------|
| 🔴 Inmediato | Optimización OCR (gpt-4o-mini + 768px) | 2A | 30 min |
| 🔴 Inmediato | Eliminar cuenta del historial | 2D | 1h |
| 🟡 Próximo | Fallback ingreso manual | 2C | 3h |
| 🟡 Próximo | **Login con Supabase Auth** | 3 | 1–2 días |
| 🟡 Próximo | Rate limiting con Upstash Redis | 2B | 2h |
| 🟢 Después | Modelo freemium + Stripe | 4 | 3–5 días |
| 🟢 Después | Notificación por email | 5 | 1 día |
| 🟢 Después | Exportar a imagen | 5 | 1 día |

---

## Deuda técnica pendiente

- [ ] Correr migración `20260421_add_device_id.sql` en Supabase production
- [ ] Correr migración `20260422_add_participant_paid.sql` en Supabase production
- [ ] Aplicar optimizaciones OCR (2A)
