# OCR Cost Optimization

> Análisis realizado: Abril 2026
> Contexto: uso personal + posible apertura a usuarios públicos

---

## Situación actual (baseline)

| Proveedor | Requests | Costo | Costo/request |
|-----------|----------|-------|---------------|
| OpenAI GPT-4o | 18 | $0.22 | ~$0.012 |
| Gemini Flash | ~10 | $0.06 | ~$0.006 |

### Por qué cuesta lo que cuesta (GPT-4o)

Una request típica con imagen de cuenta (iPhone, 1280px, JPEG 85%):

| Componente | Tokens |
|------------|--------|
| Imagen 1280px — 6 tiles × 170 + 85 (detail: auto) | ~1,105 |
| System prompt | ~450 |
| User message | ~20 |
| **Total input** | **~1,575** |
| JSON response | ~400 |

**Precio GPT-4o:** $2.50/1M input + $10/1M output
→ $0.004 input + $0.004 output ≈ **$0.012/request**

---

## Optimizaciones identificadas

### 1. `gpt-4o` → `gpt-4o-mini` (impacto: ×16 más barato)

| Modelo | Input | Output | Costo/request estimado |
|--------|-------|--------|------------------------|
| gpt-4o | $2.50/1M | $10/1M | $0.012 |
| gpt-4o-mini | $0.15/1M | $0.60/1M | $0.00075 |

Para extracción estructurada de texto (OCR), mini tiene calidad comparable a gpt-4o.
El salto de calidad entre mini y full se nota más en razonamiento complejo, no en lectura de imágenes.

### 2. Reducir imagen de 1280px a 768px (impacto: ~30% menos tokens de imagen)

| Resolución | Tiles (OpenAI) | Tokens imagen |
|------------|---------------|---------------|
| 1280px | 6 tiles | ~1,105 |
| 768px | 4 tiles | ~765 |

768px es suficiente para leer precios y nombres en cuentas de restaurante.
El texto relevante en una cuenta típica ocupa >50px de altura → legible a 768px.

### 3. Gemini ya es más barato de base

Gemini Flash: ~$0.075/1M tokens (imagen incluida como tokens nativos).
A igualdad de resolución, Gemini cuesta ~10× menos que GPT-4o para esta tarea.
Con Gemini como primario y gpt-4o-mini como fallback, el costo es mínimo.

---

## Proyección de costos

### Con cambios aplicados (gpt-4o-mini + 768px)

| Escenario | Requests/mes | Costo actual | Costo optimizado | Ahorro |
|-----------|-------------|-------------|------------------|--------|
| Personal (solo dueño) | 30–50 | $0.36–0.60 | $0.02–0.04 | 95% |
| 10 usuarios activos | 300–500 | $3.60–6.00 | $0.23–0.38 | 94% |
| 100 usuarios activos | 3,000–5,000 | $36–60 | $2.25–3.75 | 94% |

### Umbral de rentabilidad si se cobra

Si el plan es cobrar $3/mes por usuario:
- Con gpt-4o (actual): necesitas <25 req/mes por usuario para tener margen
- Con gpt-4o-mini: prácticamente ilimitado en margen OCR

---

## Estado de implementación

- [ ] Cambiar `gpt-4o` → `gpt-4o-mini` en `src/lib/vision-client.ts`
- [ ] Bajar compresión de 1280px → 768px en `src/lib/compress.ts`
- [ ] Evaluar si bajar quality de 0.85 → 0.80 (ahorro marginal)

---

## Notas adicionales

- **Gemini free tier**: AI Studio ofrece tier gratuito (15 RPM, 1M tokens/día). Para uso personal es suficiente. Si la key actual es de Google Cloud (pagada), considerar migrar a AI Studio para desarrollo.
- **Rate limiting real**: el rate limiting actual es en memoria (se resetea en cold start de Vercel). Con Upstash Redis se puede limitar por usuario autenticado en vez de solo por IP, lo que da más control sobre costos en escenario multi-usuario.
- **Caché de OCR**: si el mismo usuario sube la misma imagen dos veces (reintento), se podría cachear el resultado por hash de imagen. Impacto bajo en uso personal.
