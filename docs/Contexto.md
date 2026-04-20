# Plan Completo de Producto y Técnico: SplitBill

**Aplicación web mobile-first para dividir gastos en restaurantes**

> **Última revisión:** Abril 2026
> Cambios respecto a versión anterior: MVP redefinido para uso personal (sin UI de API Key), persistencia con Supabase + link compartible, análisis de alternativas gratuitas a OpenAI.

---

# 1. DEFINICIÓN DEL PRODUCTO

## Qué problema resuelve

Cuando un grupo de amigos sale a comer, la persona que paga la cuenta enfrenta un proceso tedioso y propenso a errores: fotografiar o memorizar qué pidió cada quien, hacer cuentas mentales o en Excel, y luego perseguir a cada persona para que le transfiera la cantidad correcta. El proceso actual requiere varios minutos de trabajo manual, crea fricción social, y frecuentemente resulta en cálculos incorrectos o transferencias aproximadas que generan deudas pendientes.

SplitBill convierte ese proceso de 5-10 minutos en menos de 2 minutos: el usuario fotografía la cuenta, la aplicación extrae los ítems automáticamente, y en pocos toques cada persona sabe exactamente cuánto debe transferir. Dado que no siempre se transfiere en el momento, la cuenta queda guardada y accesible mediante un link compartible.

## Perfil de usuario

**Fase 1 — Usuario único (tú, el dueño de la app):**
El único que puede crear cuentas nuevas. Tiene acceso a la app desplegada, sabe que la clave API está configurada en el servidor. No necesita saber nada de OpenAI ni tokens. La app simplemente funciona.

**Fase 1 — Participantes (los amigos):**
Reciben un link por WhatsApp. Lo abren en su teléfono. Ven cuánto deben, a nombre de quién, y el detalle de qué pidieron. No crean cuenta, no instalan nada. Solo leen. El link persiste hasta que el dueño lo elimine.

**Fase 2+ — Usuarios públicos:**
Personas de entre 25 y 45 años que salen frecuentemente a comer. Tienen iPhone, usan apps de transferencia bancaria. Su nivel de tolerancia a la fricción tecnológica es bajo: si algo no funciona en los primeros 30 segundos, abandona. No saben qué es una API Key, ni deben necesitarlo.

## Flujo principal de uso

1. El dueño de la app (tú) abre la app desde el ícono en su pantalla de inicio (PWA).
2. Toca "Nueva cuenta" y fotografía la cuenta directamente con la cámara, o sube una foto existente.
3. La app envía la imagen al backend, que la procesa con el modelo de visión configurado en el servidor.
4. En 10-20 segundos se muestran los ítems extraídos con sus precios.
5. El dueño revisa los ítems y corrige cualquier error de lectura.
6. Ingresa los nombres de las personas en la mesa.
7. Asigna cada ítem a una persona o lo marca como "compartido" (entre todos o subgrupo).
8. Activa o desactiva la propina del 10%.
9. La app muestra el resumen y genera un link único (ej: `splitbill.vercel.app/b/abc123`).
10. El dueño comparte el link por WhatsApp. Los amigos lo abren y ven cuánto deben.
11. El link persiste hasta que el dueño lo elimine manualmente o expire (30 días).

## Casos borde

**Ítems sin precio visible:** La app los marca con advertencia visual y deja el campo en blanco para ingreso manual.

**Propina ya incluida en la cuenta:** OpenAI la detecta y marca el toggle de propina como desactivado por defecto.

**Ítems compartidos por un subgrupo:** La asignación compartida permite seleccionar un subgrupo, no solo "todos".

**Un ítem con múltiples unidades:** "3 cervezas" como una línea. El usuario puede editar y separar manualmente o asignar el total dividido.

**Varios pagadores:** Queda fuera del MVP. El usuario puede resolver la diferencia manualmente.

**Cuenta manuscrita:** La extracción puede ser parcial. Los resultados siempre se muestran como revisables.

**Descuentos o ítems negativos:** Aparecen como ítems con precio negativo y se asignan igual que los positivos.

**Sin conexión a internet:** MVP sin soporte offline. Error claro y mensaje para reintentar.

**Modelo de visión sin respuesta:** Reintentar automáticamente una vez. Si falla, ofrecer modo de ingreso manual.

---

# 2. MVP (redefinido)

## Contexto del MVP

El MVP está diseñado para **uso personal del dueño de la app**. No hay pantalla de configuración de API Key porque la clave está guardada como variable de entorno en el servidor (Vercel). Los amigos solo reciben un link y ven el resultado; nunca interactúan con la creación de la cuenta.

Esto simplifica enormemente el MVP: desaparece toda la complejidad de "el usuario trae su propia clave" y se reemplaza por "la app funciona y punto".

## Qué incluye el MVP

- Subir foto de la cuenta (desde cámara o galería) — solo para el dueño.
- Extracción automática de ítems vía modelo de visión (configurado en el servidor).
- Vista de revisión editable de ítems (nombre, precio, cantidad).
- Agregar participantes por nombre (sin registro).
- Asignación de ítems a una persona o a múltiples personas (split equitativo).
- Toggle de propina del 10%.
- **Persistencia de la cuenta en Supabase** (base de datos gratuita).
- **Link compartible único** (`/b/[id]`) que cualquiera puede abrir.
- Vista pública del resumen (solo lectura) para los participantes que reciben el link.
- Botón de copiar resumen como texto plano (para WhatsApp).
- Funciona como PWA agregable a pantalla de inicio.

## Qué queda fuera intencionalmente

- **Pantalla de configuración de API Key para el usuario:** El dueño de la app configura la clave directamente en Vercel. Los participantes nunca ven esto.
- **Login / cuentas de usuario:** El dueño accede directamente (puede proteger con un PIN simple si lo desea). Los participantes solo leen links.
- **Historial completo con búsqueda:** Suficiente con ver las últimas N cuentas en la pantalla principal.
- **Varios pagadores:** El 90% de los casos es un solo pagador.
- **Separar ítems en unidades:** El usuario puede editar manualmente.
- **Service Worker / modo offline:** Requiere internet para el OCR.
- **Integración directa con apps de pago:** El texto copiado y el link son suficientes.

## Por qué estas decisiones

**Persistencia en MVP (cambio respecto a versión anterior):** La gente no siempre transfiere en el momento. Horas o días después alguien pregunta "¿cuánto te debo?". El link compartible resuelve esto sin que el dueño tenga que recordar los montos o revisar capturas de pantalla. Supabase tiene tier gratuito suficiente para uso personal.

**Sin UI de API Key:** El dueño de la app sabe cómo configurar una variable de entorno en Vercel. No tiene sentido construir toda una pantalla de configuración para uso personal. Cuando se abra a más usuarios, se evaluará el modelo de monetización para cubrir el costo de la API.

---

# 3. FUNCIONALIDADES

## Funcionalidades MVP (P0)

1. **Captura de imagen de la cuenta** — Cámara nativa y galería. Solo accesible para el dueño.
2. **Extracción de ítems con modelo de visión** — Servidor llama al modelo configurado. Sin UI de API Key.
3. **Vista de revisión editable de ítems** — Todos los campos editables antes de asignar.
4. **Agregar/eliminar ítems manualmente** — Fallback para OCR incompleto.
5. **Gestión de participantes (nombre solamente)** — Mínimo 2, máximo ~10.
6. **Asignación de ítems a personas** — Individual o compartido entre subgrupo.
7. **Propina opcional del 10%** — Toggle, cálculo por persona individualmente.
8. **Resumen final por persona** — Desglose claro con total destacado.
9. **Persistencia en Supabase** — La cuenta se guarda al confirmar el resumen.
10. **Link compartible único** — `/b/[id]` accesible por cualquiera sin login.
11. **Vista pública de resumen** — Solo lectura para participantes que reciben el link.
12. **Copiar resumen al portapapeles** — Texto plano formateado para WhatsApp.
13. **Manifest PWA + íconos iOS** — Agregar a pantalla de inicio.
14. **Pantalla de inicio con historial** — Las últimas N cuentas del dueño (guardadas en Supabase).

## Funcionalidades futuras deseables (P1 y P2)

**P1 — Alto valor, próxima fase:**
1. **Web Share API** — Compartir directamente a WhatsApp sin copiar/pegar.
2. **Separar ítem en N unidades iguales** — "3 cervezas" → 3 ítems individuales.
3. **Expiración configurable del link** — 24h, 7 días, 30 días, o permanente.
4. **Marcar transferencia como recibida** — El dueño puede marcar a cada persona como "pagado".
5. **Notificación por WhatsApp cuando todos han visto el link** — Fase avanzada.
6. **Soporte de múltiples monedas con formato local** — CLP, MXN, USD, EUR.

**P2 — Mejora la experiencia, no es esencial:**
7. **Login para usuarios públicos** — Cuando se abra a más usuarios. Sin contraseñas: magic link o Google.
8. **Modelo de costos para usuarios públicos** — Suscripción, límite de cuentas gratis, o API key propia.
9. **Varios pagadores** — Modelo de datos más complejo.
10. **Link compartible con monto individual destacado** — Cada persona recibe un link donde su monto está resaltado.
11. **Exportar a imagen/PDF** — Para compartir visualmente.
12. **Integración con links de pago** — Mercado Pago, Bizum, etc.
13. **Modo oscuro** — Tailwind dark mode.

---

# 4. UX/UI

## Principios de diseño

- **Mobile-first absoluto:** Toda decisión de layout, tamaño, espaciado y flujo se toma pensando en una mano sosteniendo un iPhone.
- **Una acción por pantalla:** Cada pantalla debe tener una pregunta o acción primaria obvia.
- **Velocidad percibida sobre velocidad real:** Mientras el modelo procesa (10-20s), mostrar mensajes de estado cambiantes.
- **Confianza a través de la edición:** Siempre mostrar los resultados de OCR como "revisables".
- **Tap targets generosos:** Mínimo 44x44 puntos en todos los elementos interactivos.
- **Feedback inmediato:** Toda acción del usuario debe tener respuesta visual en menos de 100ms.

## Flujo de pantallas

### Pantalla 1: Inicio / Historial de cuentas (`/`)
- Logo o nombre de la app en la parte superior.
- Botón grande: "Nueva cuenta" con ícono de cámara.
- Lista de cuentas recientes del dueño (fecha, total, número de personas).
- Tap en una cuenta del historial → va al resumen de esa cuenta.
- Ícono de ajustes (engrane) para configuración básica.

### Pantalla 2: Captura de imagen
- Dos opciones claras: "Tomar foto" y "Subir desde galería".
- Al seleccionar → va a procesando.

### Pantalla 3: Procesando imagen
- Preview de la foto tomada/subida.
- Spinner o animación de progreso.
- Texto de estado cambiante cada 3-4 segundos: "Leyendo la cuenta..." → "Identificando platos y precios..." → "Casi listo...".
- "Esto toma entre 10 y 20 segundos".
- Botón "Cancelar".

### Pantalla 4: Revisión de ítems extraídos
- Título: "Revisa los ítems de la cuenta".
- Banner de advertencia (amarillo/rojo según confianza OCR).
- Lista de ítems: nombre (editable), cantidad (editable), precio unitario (editable), precio total (calculado auto), botón eliminar.
- Botón "Agregar ítem manualmente".
- Sección de totales: subtotal detectado vs. suma de ítems (indicador de coincidencia).
- Si hay propina detectada: etiqueta "Propina incluida: $X".
- Botón primario: "Continuar".

### Pantalla 5: Participantes
- Título: "¿Quiénes están en la mesa?".
- Lista de participantes ya agregados (ícono de eliminar).
- Campo: "Nombre del participante" + botón "Agregar".
- Validación: mínimo 2 participantes para continuar.
- Botón primario: "Continuar".

### Pantalla 6: Asignación de ítems
- Lista de ítems. Por cada ítem: nombre, precio total, fila de botones de participantes (toggle), botón "Todos".
- Si ítem compartido entre N personas: "÷ N = $X por persona".
- Indicador visual si un ítem no tiene nadie asignado.
- Barra de progreso: "X ítems sin asignar".
- Botón "Ver resumen".

### Pantalla 7: Resumen final (dueño) (`/receipt/[id]/summary`)
- Toggle de propina 10% (recálculo en tiempo real).
- Por cada participante: nombre, desglose de ítems, subtotal, propina, **total en grande**.
- Validación: "Total cuenta: $X | Suma asignada: $X".
- **Botón primario: "Guardar y compartir"** → guarda en Supabase + genera link.
- Botón "Copiar resumen como texto".
- Botón "Editar asignación".

### Pantalla 8: Link generado
- Mensaje: "¡Cuenta guardada!"
- El link copiable/compartible: `splitbill.app/b/abc123`
- Botón "Compartir por WhatsApp" (Web Share API o link de WhatsApp).
- Botón "Copiar link".
- Botón "Volver al inicio".

### Pantalla 9: Vista pública del resumen (`/b/[id]`) — solo lectura
- Esta es la vista que ven los participantes al abrir el link.
- Nombre del lugar (si se detectó) + fecha.
- Por cada participante: nombre, desglose de ítems, total en grande.
- La persona que abre el link ve **su monto destacado** (si el link tiene un query param con su nombre, ej: `/b/abc123?para=Juan`).
- Botón "Copiar mi monto" (copia "Juan: $X — SplitBill").
- Sin opciones de edición. Solo lectura.
- Pie de página: "Generado con SplitBill".

## Consideraciones UX específicas para iOS Safari

- **Comportamiento del teclado:** Usar `visualViewport` API. Botones de acción primaria sobre el teclado cuando está activo. Evitar `position: fixed` con teclado abierto.
- **Bottom safe area:** `env(safe-area-inset-bottom)` en todos los botones y barras fijas. Crítico en modo standalone.
- **Gestos nativos:** No interferir con el swipe de "atrás". Usar History API correctamente (rutas diferentes por pantalla).
- **Tap targets mínimos:** 44x44 puntos CSS. Elementos táctiles separados por al menos 8px.
- **Input de imagen:** `<input type="file" accept="image/*" capture="environment">` para cámara. Sin `capture` para galería. No usar `getUserMedia` en MVP.

---

# 5. OCR + ANÁLISIS CON MODELOS DE VISIÓN

## Alternativas evaluadas (Abril 2026)

| Proveedor | Modelo | Free tier | RPM | Req/día | Latencia | OCR calidad | OpenAI-compatible |
|-----------|--------|-----------|-----|---------|----------|-------------|-------------------|
| **Groq** | Llama 4 Scout | Sí, sin tarjeta | 30 | 14.400 | 50-200ms | Buena | SDK similar |
| **Google Gemini** | Gemini 2.5 Flash | Sí, limitado | 10 | ~50 | 500-1000ms | Excelente (96%) | **Sí (nativo)** |
| **Mistral** | Pixtral 12B | 1B tokens/mes | 2 | Alto | 200-500ms | Buena | No |
| **OpenAI** | GPT-4o | No | — | — | 1-3s | Excelente | — |

## Decisión para el MVP

**Modelo principal: Groq + Llama 4 Scout**
- Tier gratuito más generoso para uso personal: 14.400 requests/día, 30 RPM.
- Latencia excelente (50-200ms): la respuesta más rápida disponible.
- Sin tarjeta de crédito requerida.
- Suficiente para decenas de cenas por día sin gastar nada.

**Fallback: Google Gemini 2.5 Flash**
- Si Groq falla o llega al límite, Gemini entra automáticamente.
- Compatible con el SDK de OpenAI (cambio mínimo de código): solo cambiar `baseURL` y `apiKey`.
- Free tier limitado (50 req/día post-Abril 2026), suficiente como respaldo.
- Mayor precisión OCR documentada (96%).

**Fallback final: OpenAI GPT-4o**
- Tu API Key personal, configurada como variable de entorno adicional.
- Solo se usa si Groq y Gemini fallan.
- Costo: ~$0.001-0.005 por imagen. Para uso personal es irrelevante.

Esta estrategia de cascada hace que el costo sea **$0 en el 99% de los casos** para uso personal, con OpenAI como red de seguridad.

## Arquitectura de procesamiento

```
Frontend (iPhone)
  ↓  Captura imagen
  ↓  Comprime con Canvas API (max 1280px, JPEG 85%)
  ↓  Envía base64 a /api/analyze-receipt (POST)

Servidor (Vercel API Route)
  ↓  Valida imagen (tamaño, tipo, magic bytes)
  ↓  Rate limiting por IP
  ↓  Intenta Groq → si falla, intenta Gemini → si falla, intenta OpenAI
  ↓  Parsea y valida JSON de respuesta
  ↓  Retorna JSON estructurado al cliente
```

La API Key nunca va al frontend. Todas las claves viven como variables de entorno en Vercel (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`).

## Estructura JSON de salida

```typescript
{
  items: [
    {
      id: string,
      nombre: string,
      cantidad: number,
      precio_unitario: number | null,
      precio_total: number | null,
      confianza_item: "alta" | "media" | "baja",
      nota_item: string | null
    }
  ],
  subtotal: number | null,
  impuestos: {
    detectados: boolean,
    monto: number | null,
    descripcion: string | null      // ej: "IVA 16%"
  },
  propina_detectada: {
    incluida: boolean,
    monto: number | null,
    porcentaje: number | null,
    descripcion: string | null      // ej: "Service charge 10%"
  },
  total: number | null,
  moneda: string,                   // ISO 4217: "CLP", "MXN", "USD"
  confianza_general: "alta" | "media" | "baja",
  notas_ocr: string[],
  idioma_cuenta: string
}
```

## Manejo de errores OCR

- **Ítems con confianza baja:** Indicador visual (borde amarillo). Impedir continuar hasta que el usuario confirme.
- **Extracción fallida:** Mensaje específico ("No pudimos leer la cuenta. Prueba con mejor iluminación.") + opción de ingresar ítems manualmente.
- **Banners:** Rojo si `confianza_general: "baja"`, amarillo si `"media"`.

## Validaciones post-extracción

- Suma de ítems vs subtotal declarado: si diferencia > $0.50 o > 1%, mostrar advertencia.
- Total negativo o cero = extracción fallida.
- Diferencias < $1 entre subtotal+propina y total = aceptadas sin advertencia (redondeo).

---

# 6. REGLAS DE NEGOCIO

## Asignación de ítems

**Individual (1→1):** El `precio_total` completo del ítem va al subtotal de esa persona.

**Compartida (1→N):** El `precio_total` se divide en partes iguales. Diferencia de centavos por redondeo: el centavo extra va al primer participante en la lista (orden de creación). Regla arbitraria pero consistente.

**Sin asignar:** El dueño puede continuar con advertencia. En el resumen aparece sección "Sin asignar" con el monto total. Afecta la validación de totales.

**Asignación predeterminada:** Ninguna. El usuario asigna explícitamente.

## Propina

- **Toggle en pantalla de resumen.** Estado inicial: activado si `propina_detectada.incluida = false`.
- **Base de cálculo:** Sobre el subtotal de cada persona individualmente.
  - María: $50 → propina $5. Juan: $30 → propina $3. Total propina $8 = 10% de $80.
- **Propina ya incluida:** Toggle desactivado con nota: "Esta cuenta ya incluye propina ($X)." El dueño puede activarlo si fue un error de lectura.

## Cálculo final

```
subtotal_persona   = Σ (precio_item × fraccion_asignada)
propina_persona    = subtotal_persona × 0.10  (si toggle activo)
total_persona      = subtotal_persona + propina_persona
```

Cálculos intermedios con precisión completa. Redondeo a 2 decimales solo en presentación.

Validación: `Σ total_personas ≈ total_cuenta`. Diferencia aceptable: ±$1.00. Si supera $1.00, mostrar advertencia.

## Persistencia de la cuenta

- La cuenta se guarda en Supabase al tocar "Guardar y compartir".
- Cada cuenta tiene un ID único generado en el servidor (UUID v4).
- El link público es `splitbill.app/b/[id]`.
- La cuenta persiste 30 días por defecto (configurable).
- El dueño puede eliminar una cuenta desde el historial.
- Los participantes no pueden modificar la cuenta, solo verla.

## Edición manual

- **Revisión:** Nombre, cantidad, precio unitario editables. Precio total recalcula automáticamente.
- **Asignación:** Selección de personas por ítem.
- **Resumen:** Toggle de propina.
- **Editar cuenta guardada:** Solo el dueño puede editar. Al editar, el link existente se actualiza (misma URL, datos nuevos).
- **Recálculo:** Inmediato al cambiar cualquier valor. Sin botón "Recalcular".

## Discrepancias

- **Diferencia < $1.00:** Nota informativa "Diferencia de $X por redondeo."
- **Diferencia ≥ $1.00:** Banner de advertencia. No bloquear el flujo.
- **Causa más común:** Ítems sin asignar. Mostrar monto de ítems sin asignar como parte de la explicación.

---

# 7. ARQUITECTURA TÉCNICA

## Stack

| Capa | Tecnología | Justificación |
|------|-----------|--------------|
| Frontend | Next.js 15 (App Router) | Incluye API Routes; un solo proyecto y deployment |
| Estilos | Tailwind CSS | Desarrollo rápido mobile-first |
| Componentes | shadcn/ui + Lucide React | Accesibles, sin overhead, copiados al proyecto |
| Backend | Next.js API Routes | Un solo endpoint principal; mismo repositorio |
| Base de datos | **Supabase (tier gratuito)** | Persistencia + links compartibles. 500MB gratis, suficiente |
| ORM / queries | Supabase JS Client | Directo, sin ORM adicional |
| Modelo visión (primario) | **Groq + Llama 4 Scout** | Free tier generoso (14.4K req/día) |
| Modelo visión (fallback 1) | **Google Gemini 2.5 Flash** | OpenAI-compatible, free tier de respaldo |
| Modelo visión (fallback 2) | **OpenAI GPT-4o** | API key personal del dueño, red de seguridad |
| Despliegue | Vercel | HTTPS automático, CI/CD desde GitHub, plan gratuito suficiente |

## Autenticación en MVP

**Sin autenticación formal para el dueño:** La app vive en una URL que solo tú conoces. Si quieres protección básica, agregar un PIN hardcodeado como variable de entorno (`OWNER_PIN=1234`) que se pide al entrar a la pantalla de creación. Los participantes no necesitan PIN para ver el link.

Si se abre a más usuarios en Fase 2: Clerk o NextAuth con magic link (sin contraseñas).

## Diagrama de arquitectura

```
┌──────────────────────────────────────────────────┐
│                DISPOSITIVO iOS                    │
│                                                  │
│  Safari / PWA (modo standalone)                  │
│  Next.js Frontend (React)                        │
│  Estado React en memoria durante el flujo        │
│                                                  │
│  Captura → Canvas (resize) → base64              │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS POST
                       │ Body: { image: base64 }
                       ▼
┌──────────────────────────────────────────────────┐
│                   VERCEL                         │
│                                                  │
│  POST /api/analyze-receipt                       │
│  ├─ Valida imagen (tamaño, tipo)                 │
│  ├─ Rate limiting por IP                         │
│  ├─ Intenta Groq (Llama 4 Scout)                 │
│  ├─ Si falla → Gemini 2.5 Flash                  │
│  ├─ Si falla → OpenAI GPT-4o                     │
│  └─ Retorna JSON estructurado                    │
│                                                  │
│  POST /api/bills                                 │
│  └─ Guarda cuenta en Supabase                    │
│     Retorna { id, url }                          │
│                                                  │
│  GET /b/[id]                                     │
│  └─ Lee cuenta de Supabase                       │
│     Renderiza vista pública (solo lectura)       │
└──────────────────────┬───────────────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
┌───────────────────┐   ┌──────────────────────────┐
│   GROQ / GEMINI   │   │       SUPABASE            │
│   OPENAI APIs     │   │  tabla: bills             │
│                   │   │  tabla: items             │
│  Vars de entorno: │   │  tabla: participants      │
│  GROQ_API_KEY     │   │  tabla: assignments       │
│  GEMINI_API_KEY   │   │                           │
│  OPENAI_API_KEY   │   │  Free tier: 500MB, 50K    │
└───────────────────┘   │  requests/mes             │
                        └──────────────────────────┘
```

## Rutas de la aplicación

```
/                              → Inicio + historial de cuentas (dueño)
/new                           → Crear nueva cuenta (dueño)
/receipt/[id]/review           → Revisión de ítems
/receipt/[id]/participants     → Participantes
/receipt/[id]/assign           → Asignación de ítems
/receipt/[id]/summary          → Resumen final + guardar
/b/[id]                        → Vista pública del resumen (participantes)
/b/[id]?para=Juan              → Vista pública con monto de Juan destacado
```

Las rutas `/new` y `/receipt/*` son acceso del dueño. La ruta `/b/[id]` es pública, sin autenticación, accesible para cualquiera con el link.

---

# 8. MODELO DE DATOS (Supabase)

## Tablas

### `bills`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
created_at   timestamptz DEFAULT now()
restaurant   text
currency     text DEFAULT 'CLP'
subtotal     numeric
tip_included boolean DEFAULT false
tip_included_amount numeric
total_declared numeric
tip_manual_enabled boolean DEFAULT true
ocr_confidence text   -- 'alta' | 'media' | 'baja'
ocr_notes    text[]
status       text DEFAULT 'draft'  -- 'draft' | 'complete'
expires_at   timestamptz DEFAULT now() + interval '30 days'
```

### `items`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
bill_id         uuid REFERENCES bills(id) ON DELETE CASCADE
nombre          text NOT NULL
cantidad        integer DEFAULT 1
precio_unitario numeric
precio_total    numeric
confianza_item  text    -- 'alta' | 'media' | 'baja'
nota_item       text
is_manually_added boolean DEFAULT false
orden           integer -- para mantener el orden de la lista
```

### `participants`
```sql
id       uuid PRIMARY KEY DEFAULT gen_random_uuid()
bill_id  uuid REFERENCES bills(id) ON DELETE CASCADE
nombre   text NOT NULL
orden    integer  -- para desempate en redondeo
```

### `assignments`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
item_id         uuid REFERENCES items(id) ON DELETE CASCADE
participant_id  uuid REFERENCES participants(id) ON DELETE CASCADE
fraccion        numeric NOT NULL  -- 0 a 1
monto_asignado  numeric NOT NULL
```

## Row Level Security (Supabase RLS)

- La tabla `bills` y sus relacionadas son de lectura pública (SELECT para cualquiera que tenga el ID).
- Las operaciones INSERT/UPDATE/DELETE requieren la `SERVICE_ROLE_KEY` de Supabase, que vive en el servidor de Vercel y nunca se expone al frontend.
- Esto garantiza que cualquiera pueda ver el link, pero nadie puede crear o modificar cuentas sin pasar por el backend.

---

# 9. CONSIDERACIONES iOS

## Cámara y galería

- `<input type="file" accept="image/*" capture="environment">` → abre cámara trasera directamente.
- `<input type="file" accept="image/*">` sin `capture` → abre selector de galería/cámara nativo.
- Ambos inputs ocultos visualmente, activados programáticamente desde los botones de la UI.
- No usar `getUserMedia` en MVP; el input nativo es más confiable en Safari iOS.
- Tamaño máximo aceptado: 10MB. Objetivo post-compresión: < 1MB.

## Comportamiento PWA

- `manifest.json` con `display: "standalone"` → experiencia sin chrome del navegador.
- **Crítico:** iOS ignora el manifest para íconos. Requiere `<link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png">` en el `<head>`.
- Cada pantalla debe ser una ruta diferente para que el swipe de "atrás" de iOS funcione correctamente.
- localStorage solo para preferencias no críticas (no hay API Key que persistir en MVP).

## Vista pública (`/b/[id]`)

- Esta ruta la abren los participantes en cualquier navegador (no necesariamente Safari PWA).
- Debe funcionar perfectamente en Chrome Android, Safari iOS, y desktop.
- Sin instalación, sin registro, carga inmediata.
- Si se incluye `?para=Juan` en el link, el nombre de Juan se resalta en la vista.

## Compartir resultado

- **Web Share API:** `navigator.share({ title, text, url })` disponible en Safari iOS 12.2+.
- **Fallback:** Link de WhatsApp directo (`https://wa.me/?text=...`) como botón alternativo.
- **Fallback 2:** `navigator.clipboard.writeText()` para copiar el link.

---

# 10. SEGURIDAD Y COSTOS

## Claves API (sin exposición al usuario)

- `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` → variables de entorno en Vercel. Nunca al frontend.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` → variables de entorno en Vercel. Nunca al frontend.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → estas sí son públicas (solo permiten SELECT con RLS).
- Ningún usuario (ni el dueño de la app) necesita saber que existen estas claves.

## Control de costos

**Estrategia de cascada (costo esperado: $0):**
1. **Groq (primario):** 14.400 req/día gratis. Para uso personal (decenas de cenas/mes) es virtualmente ilimitado.
2. **Gemini Flash (fallback 1):** ~50 req/día gratis. Respaldo para días de mucho uso o caída de Groq.
3. **OpenAI (fallback 2):** Tu API key personal. Costo estimado: $0.001-0.005/imagen. Para uso personal: < $0.50/mes incluso en uso intensivo.

**Supabase (base de datos):** Tier gratuito: 500MB, 50.000 requests/mes. Suficiente para cientos de cuentas guardadas.

**Vercel:** Tier gratuito: suficiente para uso personal. 100GB bandwidth/mes.

**Costo total esperado para uso personal: $0/mes.**

## Rate limiting

- 10 requests al endpoint de análisis por IP en 5 minutos (en memoria, MVP).
- Fase futura: Upstash Redis para rate limiting real entre instancias.

## Validaciones básicas

- Tamaño máximo: 10MB en cliente, 5MB en servidor.
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`.
- React escapa automáticamente los strings del JSON al renderizarlos en JSX.
- El link `/b/[id]` solo expone datos de esa cuenta específica; no hay forma de enumerar todas las cuentas desde el cliente.

## Riesgos de abuso

- Sin auth: cualquier persona que encuentre la URL de la app podría intentar crear cuentas (consumir el OCR).
- Mitigación MVP: rate limiting por IP + el servidor solo puede ser usado por quien tenga la URL.
- Si se abre a usuarios públicos: agregar auth antes.

---

# 11. BACKLOG PRIORIZADO

| ID | Funcionalidad | Prioridad | Fase |
|----|--------------|-----------|------|
| F01 | Captura de imagen (cámara + galería) | P0 | 1 |
| F02 | Compresión de imagen en cliente (Canvas API) | P0 | 1 |
| F03 | Endpoint POST /api/analyze-receipt con cascada de modelos | P0 | 1 |
| F04 | Integración Groq (Llama 4 Scout) como modelo primario | P0 | 1 |
| F05 | Fallback a Gemini 2.5 Flash | P0 | 1 |
| F06 | Fallback a OpenAI GPT-4o | P0 | 1 |
| F07 | Pantalla de procesamiento con progreso y mensajes cambiantes | P0 | 1 |
| F08 | Vista de revisión de ítems editable | P0 | 1 |
| F09 | Agregar/eliminar ítems manualmente | P0 | 1 |
| F10 | Gestión de participantes (nombre) | P0 | 1 |
| F11 | Pantalla de asignación de ítems | P0 | 1 |
| F12 | Asignación individual (1→1) | P0 | 1 |
| F13 | Asignación compartida (1→N, equitativa) | P0 | 1 |
| F14 | Toggle propina 10% | P0 | 1 |
| F15 | Pantalla de resumen final | P0 | 1 |
| F16 | Persistencia en Supabase (guardar cuenta) | P0 | 1 |
| F17 | Link compartible único (/b/[id]) | P0 | 1 |
| F18 | Vista pública del resumen (solo lectura) | P0 | 1 |
| F19 | Copiar resumen al portapapeles | P0 | 1 |
| F20 | Historial de cuentas en pantalla de inicio | P0 | 1 |
| F21 | Manifest PWA + íconos iOS | P0 | 1 |
| F22 | Validación OCR (suma vs subtotal) | P0 | 1 |
| F23 | Rate limiting por IP | P0 | 1 |
| F24 | Vista pública con ?para=Nombre (monto resaltado) | P1 | 1 |
| F25 | Web Share API + fallback link WhatsApp | P1 | 2 |
| F26 | Marcar transferencia como recibida | P1 | 2 |
| F27 | Separar ítem en N unidades | P1 | 2 |
| F28 | Expiración configurable del link | P1 | 2 |
| F29 | Soporte de formato de moneda local | P1 | 2 |
| F30 | Modo oscuro | P2 | 2 |
| F31 | Login para usuarios públicos (magic link) | P2 | 3 |
| F32 | Modelo de costos para usuarios públicos | P2 | 3 |
| F33 | Varios pagadores | P2 | 3 |
| F34 | Exportar a imagen/PDF | P2 | 3 |
| F35 | Integración links de pago | P2 | 4 |

---

# 12. CRITERIOS DE ACEPTACIÓN MVP

**F01-F02 — Captura y compresión de imagen**
- "Tomar foto" → abre cámara trasera del iPhone.
- "Subir desde galería" → abre selector de fotos nativo.
- Imagen > 10MB → error antes de procesar.
- Imagen post-compresión enviada al servidor < 1MB.

**F03-F06 — Análisis con modelo de visión**
- Imagen válida → JSON con al menos un ítem con nombre y precio.
- Si Groq falla → intenta automáticamente con Gemini.
- Si Gemini falla → intenta automáticamente con OpenAI.
- Si todos fallan → mensaje de error claro con opción de ingresar manualmente.
- Timeout > 60s → HTTP 504.

**F08 — Revisión de ítems**
- Todos los ítems visibles con cantidad y precio.
- Ítems con confianza baja → indicador amarillo + banner de advertencia.
- Tap en nombre/cantidad/precio → edición inline.
- Cambio en cantidad o precio unitario → precio total recalculado automáticamente.

**F11-F13 — Asignación de ítems**
- Ítem asignado a 3 personas → precio dividido en 3 partes iguales.
- Diferencia de centavos → primer participante recibe el centavo extra.
- Ítems sin asignar al tocar "Ver resumen" → diálogo de advertencia.

**F14 — Propina 10%**
- Activar toggle → totales de todos los participantes recalculados inmediatamente.
- Propina detectada → toggle desactivado por defecto con nota informativa.

**F16-F17 — Persistencia y link compartible**
- Al tocar "Guardar y compartir" → cuenta guardada en Supabase.
- Link generado accesible desde cualquier dispositivo y navegador.
- Si se accede al link 24 horas después, la cuenta sigue disponible.
- Solo el servidor (con SERVICE_ROLE_KEY) puede crear o modificar cuentas.

**F18 — Vista pública**
- La vista `/b/[id]` muestra el resumen correctamente en Chrome Android y Safari iOS.
- Sin pantalla de login, sin instalación requerida.
- Si URL incluye `?para=Juan`, el monto de Juan aparece resaltado.

---

# 13. RIESGOS TÉCNICOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| OCR insuficiente en cuentas manuscritas | Alta | Alto | Edición manual completa; tres modelos en cascada |
| Groq cambia o elimina su free tier | Media | Medio | Cascada a Gemini → OpenAI automáticamente |
| Supabase free tier insuficiente | Baja | Medio | 500MB para uso personal es más que suficiente; escala a $25/mes si necesario |
| Safari iOS sin cámara en HTTP | Media | Alto | Vercel garantiza HTTPS automáticamente |
| Timeout 60s Vercel plan gratuito | Media | Alto | Compresión agresiva de imagen; cascada de modelos más rápidos (Groq < 200ms) |
| JSON malformado del modelo | Media | Medio | Validación robusta del schema; retry automático una vez |
| Link público accedido por persona no deseada | Baja | Bajo | El link tiene ID opaco (UUID); no hay listado público de links |
| Abuso del endpoint sin auth | Baja | Bajo | Rate limiting por IP; costo recae en free tiers de los proveedores |

---

# 14. ROADMAP POR FASES

### Fase 1: MVP Personal
**Objetivo:** Reemplazar el Excel manual para uso propio. Fotografiar, asignar, guardar, compartir link.
**Usuarios:** Solo tú (creación) + tus amigos (visualización del link).
**Incluye:** F01–F23. Next.js + Tailwind + Supabase + Vercel. Sin auth.
**Costo:** $0/mes.
**Criterio de éxito:** Flujo completo en < 3 minutos. Link funcionando en WhatsApp. ≥ 80% de ítems extraídos correctamente en cuentas impresas.

### Fase 2: Mejoras de UX y funcionalidades sociales
**Objetivo:** Pulir la experiencia y agregar las funcionalidades más pedidas post-uso real.
**Incluye:** F24–F29. Web Share API, marcar pagos recibidos, separar ítems en unidades, formatos de moneda, mejoras al prompt de OCR.
**Criterio de éxito:** Flujo completo en < 2 minutos. Tasa de errores OCR < 10%.

### Fase 3: Apertura a usuarios públicos
**Objetivo:** Que otras personas puedan crear cuentas sin necesitar acceso especial.
**Decisiones previas a esta fase:**
- ¿Cómo se cubre el costo de la API (suscripción, límite gratis, freemium)?
- ¿Login con magic link o Google?
- ¿El usuario trae su propia API key o la app la gestiona?
**Incluye:** F31–F34. Auth, modelo de precios, exportar a imagen.
**Costo:** Depende del modelo de negocio elegido. Con Groq free tier puede sostenerse por bastante tiempo sin costo.

### Fase 4: Monetización y escala
**Objetivo:** Sostenibilidad económica si la adopción lo justifica.
**Opciones:** Suscripción ($2-5/mes), integración con apps de pago, partnerships con restaurantes.
**Criterio de evaluación:** Iniciar solo si hay > 500 usuarios activos mensuales.

---

## Archivos críticos para la implementación

- `src/app/api/analyze-receipt/route.ts` — Endpoint principal: cascada de modelos, validación, rate limiting.
- `src/app/api/bills/route.ts` — Endpoint para guardar cuentas en Supabase.
- `src/app/b/[id]/page.tsx` — Vista pública del resumen (participantes). Server-side rendering desde Supabase.
- `src/app/receipt/[id]/assign/page.tsx` — Pantalla más compleja: lógica de asignación.
- `src/app/receipt/[id]/summary/page.tsx` — Motor de cálculo, toggle de propina, guardar y compartir.
- `src/lib/vision-client.ts` — Abstracción de la cascada de modelos (Groq → Gemini → OpenAI).
- `src/lib/supabase.ts` — Cliente de Supabase (server y client).
- `public/manifest.json` — Configuración PWA para iOS.
